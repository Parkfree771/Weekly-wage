import { NextResponse } from 'next/server';
import { getCharacterFromDb, upsertCharacter, isParsedCacheShape } from '@/lib/character-cache';
import { parseCharacterData } from '@/lib/characterData';
import { characterCdnTag, purgeCharacterCdn } from '@/lib/purge-cdn';

// 일반 조회는 CDN이 흡수(캐릭터당 5분). 같은 캐릭터를 여러 명이 봐도 DB 왕복은 5분에 1회.
// refresh=1(갱신 버튼)은 no-store + 태그 퍼지로 즉시 최신이 반영된다.
function cdnCacheHeaders(...names: string[]): Record<string, string> {
  const tags = Array.from(new Set(names.filter(Boolean).map(characterCdnTag)));
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    'Netlify-Vary': 'query',
    'Netlify-Cache-Tag': tags.join(','),
  };
}

async function fetchFromLostark(characterName: string): Promise<any> {
  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    throw new Response(JSON.stringify({ message: '서버에 API 키가 설정되지 않았습니다.' }), { status: 500 });
  }

  const encodedName = encodeURIComponent(characterName);
  const baseUrl = 'https://developer-lostark.game.onstove.com';
  const armoryBase = `${baseUrl}/armories/characters/${encodedName}`;

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
  };

  const [
    profileRes,
    equipmentRes,
    engravingsRes,
    gemsRes,
    cardsRes,
    arkpassiveRes,
    arkgridRes,
    siblingsRes,
  ] = await Promise.all([
    fetch(`${armoryBase}/profiles`, options),
    fetch(`${armoryBase}/equipment`, options),
    fetch(`${armoryBase}/engravings`, options),
    fetch(`${armoryBase}/gems`, options),
    fetch(`${armoryBase}/cards`, options),
    fetch(`${armoryBase}/arkpassive`, options),
    fetch(`${armoryBase}/arkgrid`, options),
    fetch(`${baseUrl}/characters/${encodedName}/siblings`, options),
  ]);

  if (!profileRes.ok) {
    const errorData = await profileRes.json().catch(() => ({}));
    throw new Response(
      JSON.stringify({ message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' }),
      { status: profileRes.status }
    );
  }

  const profile = await profileRes.json();
  // 프로필 본문이 null인 경우 (존재하지 않는 캐릭터 등)
  if (!profile || !profile.CharacterName) {
    throw new Response(
      JSON.stringify({ message: '캐릭터를 찾을 수 없습니다.' }),
      { status: 404 }
    );
  }

  const equipment = equipmentRes.ok ? await equipmentRes.json() : null;
  const engravings = engravingsRes.ok ? await engravingsRes.json() : null;
  const gems = gemsRes.ok ? await gemsRes.json() : null;
  const cards = cardsRes.ok ? await cardsRes.json() : null;
  const arkpassive = arkpassiveRes.ok ? await arkpassiveRes.json() : null;
  const arkgrid = arkgridRes.ok ? await arkgridRes.json() : null;
  const siblings = siblingsRes.ok ? await siblingsRes.json() : null;

  return {
    profile,
    equipment,
    engravings,
    gems,
    cards,
    arkpassive,
    arkgrid,
    siblings,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const characterName = searchParams.get('characterName');
  const refresh = searchParams.get('refresh') === '1';

  if (!characterName) {
    return NextResponse.json({ message: '캐릭터명을 입력해주세요.' }, { status: 400 });
  }

  try {
    // 1) refresh가 아니라면 DB 우선 조회 (파싱 결과 형식만 캐시 인정)
    if (!refresh) {
      const cached = await getCharacterFromDb(characterName);
      if (cached && cached.data && isParsedCacheShape(cached.data)) {
        return NextResponse.json({
          ...cached.data,
          _meta: {
            fromCache: true,
            fetchedAt: cached.fetchedAt,
            titlesHistory: cached.titlesHistory,
          },
          // 요청 표기와 정식 표기 태그를 모두 달아, 어느 쪽으로 갱신해도 퍼지가 닿게 한다
        }, { headers: cdnCacheHeaders(characterName, cached.data.profile?.characterName) });
      }
      // 구 raw 캐시는 무시하고 fetch 흘려보냄 (다음 단계에서 파싱 결과로 덮어씀)
    }

    // 2) miss / refresh / 구 raw 캐시 → 로아 API 호출 후 서버 파싱
    const apiData = await fetchFromLostark(characterName);
    const parsed = parseCharacterData(apiData);
    if (!parsed) {
      throw new Response(
        JSON.stringify({ message: '캐릭터 데이터를 파싱할 수 없습니다.' }),
        { status: 500 }
      );
    }

    // 3) DB upsert (인덱스 컬럼 + 파싱 결과)
    // 캐릭터명은 파싱된 정식 표기 사용
    const canonicalName = parsed.profile.characterName || characterName;
    let titlesHistory: any[] = [];
    try {
      // upsert가 최종 titles_history를 반환하므로 재조회 불필요 (DB 왕복 1회 절감)
      titlesHistory = await upsertCharacter(canonicalName, parsed);
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('[character-api] DB upsert 실패:', dbErr);
      // DB 실패해도 응답은 정상 반환
    }

    if (refresh) {
      // 갱신: 요청자에겐 캐시 없이 최신 응답, CDN에 남은 이전 캐시는 태그 퍼지로 무효화
      // → 다른 방문자도 다음 조회부터 갱신된 데이터를 본다.
      // 반드시 await — 서버리스는 응답 반환 직후 인스턴스가 얼 수 있어
      // fire-and-forget이면 퍼지가 실행되지 않은 채 5분간 낡은 캐시가 남는다.
      await Promise.all([
        purgeCharacterCdn(characterName),
        canonicalName !== characterName ? purgeCharacterCdn(canonicalName) : Promise.resolve(),
      ]).catch(() => {});
    }

    return NextResponse.json({
      ...parsed,
      _meta: {
        fromCache: false,
        fetchedAt: new Date().toISOString(),
        titlesHistory,
      },
    }, {
      headers: refresh
        ? { 'Cache-Control': 'no-store' }
        : cdnCacheHeaders(characterName, canonicalName),
    });
  } catch (error: any) {
    if (error instanceof Response) {
      const body = await error.text();
      return new NextResponse(body, {
        status: error.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    // eslint-disable-next-line no-console
    console.error('[character-api] error:', error);
    return NextResponse.json(
      { message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
