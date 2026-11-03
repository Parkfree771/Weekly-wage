import { NextResponse } from 'next/server';
import { characterCdnTag, purgeCharacterCdn } from '@/lib/purge-cdn';
import { isLostArkMaintenance } from '@/lib/lostark-maintenance';

// GET 요청을 처리하는 함수
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const characterName = searchParams.get('characterName');
  // 명시적 갱신(마이페이지 갱신·캐릭터 등록 등): 응답을 캐시하지 않아 항상 최신을 보장.
  // 호출부가 캐시버스터를 기억할 필요 없도록 라우트 계약으로 처리한다.
  const refresh = searchParams.get('refresh') === '1';
  // 원정대 목록을 안 쓰는 호출부(재련 시뮬)는 siblings=0 으로 외부 API 호출을 하나 아낀다.
  const skipSiblings = searchParams.get('siblings') === '0';
  // 원정대 검색은 siblings 만 쓴다 — 프로필·장비를 부르지 않아 외부 API 호출이 3회에서 1회로 준다.
  const siblingsOnly = searchParams.get('siblingsOnly') === '1';

  if (!characterName) {
    return NextResponse.json({ message: '캐릭터명을 입력해주세요.' }, { status: 400 });
  }
  // 수요일 점검(06:00~10:00 KST) — 로아 API 가 응답하지 않으니 부르지 않고 바로 알린다
  if (isLostArkMaintenance()) {
    return NextResponse.json(
      { message: '로아 서버 점검 중(수요일 06:00~10:00)이라 캐릭터 정보를 가져올 수 없습니다.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const encodedCharacterName = encodeURIComponent(characterName);
  const profileUrl = `https://developer-lostark.game.onstove.com/armories/characters/${encodedCharacterName}/profiles`;
  const siblingsUrl = `https://developer-lostark.game.onstove.com/characters/${encodedCharacterName}/siblings`;
  const equipmentUrl = `https://developer-lostark.game.onstove.com/armories/characters/${encodedCharacterName}/equipment`;

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
  };

  // 같은 캐릭터를 짧은 시간 안에 여러 사용자가 조회하면 CDN이 흡수한다.
  // 시뮬 캐릭터 불러오기는 방금 재련한 결과가 보여야 하므로 TTL을 길게 잡지 않는다.
  const cdnHeaders = {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    // durable: 엣지 노드마다 따로 캐시하지 않고 전 세계가 한 사본을 쓴다 (태그 퍼지는 그대로 동작)
    'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=120, stale-while-revalidate=300',
    'Netlify-Vary': 'query',
    // 갱신 시 태그 퍼지로 지울 수 있도록 캐릭터별 태그를 단다
    'Netlify-Cache-Tag': characterCdnTag(characterName),
  };

  try {
    if (siblingsOnly) {
      const response = await fetch(siblingsUrl, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
          { status: response.status },
        );
      }
      return NextResponse.json({ siblings: await response.json() }, { headers: cdnHeaders });
    }

    let profileData: unknown;
    let siblingsData: unknown = null;
    let equipmentData: unknown;

    if (skipSiblings) {
      // 원정대가 필요 없으면(재련 시뮬) 프로필·장비를 로아 API 1회로 받는다.
      // ?filters=profiles+equipment 의 ArmoryProfile·ArmoryEquipment 는 /profiles·/equipment 응답과
      // 같은 내용이다(2026-11-03 실측 대조, 없는 캐릭터면 둘 다 null 인 것까지 같다) — 응답 형태는 그대로.
      const res = await fetch(
        `https://developer-lostark.game.onstove.com/armories/characters/${encodedCharacterName}?filters=profiles%2Bequipment`,
        options,
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
          { status: res.status },
        );
      }
      const raw = (await res.json()) as { ArmoryProfile?: unknown; ArmoryEquipment?: unknown } | null;
      profileData = raw?.ArmoryProfile ?? null;
      equipmentData = raw?.ArmoryEquipment ?? null;
    } else {
      // 프로필 정보, 형제 캐릭터 정보, 장비 정보를 동시에 요청합니다.
      const [profileResponse, siblingsResponse, equipmentResponse] = await Promise.all([
        fetch(profileUrl, options),
        fetch(siblingsUrl, options),
        fetch(equipmentUrl, options),
      ]);

      if (!profileResponse.ok || !siblingsResponse.ok || !equipmentResponse.ok) {
        const errorResponse = !profileResponse.ok ? profileResponse :
                              !siblingsResponse.ok ? siblingsResponse :
                              equipmentResponse;
        const errorData = await errorResponse.json().catch(() => ({}));

        return NextResponse.json(
          { message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
          { status: errorResponse.status }
        );
      }

      // 세 데이터를 합쳐서 클라이언트에 전달합니다.
      [profileData, siblingsData, equipmentData] = await Promise.all([
        profileResponse.json(),
        siblingsResponse.json(),
        equipmentResponse.json(),
      ]);
    }

    const responseData = {
      profile: profileData,
      siblings: siblingsData,
      equipment: equipmentData,
    };

    if (refresh) {
      // 갱신: 이 캐릭터로 CDN에 남아 있던 캐시(이 라우트 + 캐릭터 상세 라우트, 같은 태그)를
      // 지워서 이후 조회가 전부 최신을 받게 한다. 서버리스 freeze 대비 반드시 await.
      await purgeCharacterCdn(characterName).catch(() => {});
      return NextResponse.json(responseData, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json(responseData, { headers: cdnHeaders });

  } catch {
    return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}
