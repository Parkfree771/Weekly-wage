import { NextResponse } from 'next/server';
import { getCharacterFromDb, upsertCharacter, getTitlesHistory } from '@/lib/character-cache';

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
    // 1) refresh가 아니라면 DB 우선 조회
    if (!refresh) {
      const cached = await getCharacterFromDb(characterName);
      if (cached && cached.data) {
        return NextResponse.json({
          ...cached.data,
          _meta: {
            fromCache: true,
            fetchedAt: cached.fetchedAt,
            titlesHistory: cached.titlesHistory,
          },
        });
      }
    }

    // 2) miss 또는 refresh → API 호출
    const apiData = await fetchFromLostark(characterName);

    // 3) DB upsert (인덱스 컬럼 + raw)
    // 캐릭터명은 API가 돌려준 정식 표기 사용
    const canonicalName = apiData.profile?.CharacterName || characterName;
    let titlesHistory: any[] = [];
    try {
      await upsertCharacter(canonicalName, apiData);
      titlesHistory = await getTitlesHistory(canonicalName);
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('[character-api] DB upsert 실패:', dbErr);
      // DB 실패해도 응답은 정상 반환
    }

    return NextResponse.json({
      ...apiData,
      _meta: {
        fromCache: false,
        fetchedAt: new Date().toISOString(),
        titlesHistory,
      },
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
