import { NextResponse } from 'next/server';
import { characterCdnTag, purgeCharacterCdn } from '@/lib/purge-cdn';

// GET 요청을 처리하는 함수
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const characterName = searchParams.get('characterName');
  // 명시적 갱신(마이페이지 갱신·캐릭터 등록 등): 응답을 캐시하지 않아 항상 최신을 보장.
  // 호출부가 캐시버스터를 기억할 필요 없도록 라우트 계약으로 처리한다.
  const refresh = searchParams.get('refresh') === '1';

  if (!characterName) {
    return NextResponse.json({ message: '캐릭터명을 입력해주세요.' }, { status: 400 });
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

  try {
    // 프로필 정보, 형제 캐릭터 정보, 장비 정보를 동시에 요청합니다.
    const [profileResponse, siblingsResponse, equipmentResponse] = await Promise.all([
      fetch(profileUrl, options),
      fetch(siblingsUrl, options),
      fetch(equipmentUrl, options),
    ]);

    if (!profileResponse.ok || !siblingsResponse.ok || !equipmentResponse.ok) {
      const errorStatus = !profileResponse.ok ? profileResponse.status :
                          !siblingsResponse.ok ? siblingsResponse.status :
                          equipmentResponse.status;
      const errorResponse = !profileResponse.ok ? profileResponse :
                            !siblingsResponse.ok ? siblingsResponse :
                            equipmentResponse;
      const errorData = await errorResponse.json().catch(() => ({}));

      return NextResponse.json(
        { message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
        { status: errorStatus }
      );
    }

    // 세 데이터를 합쳐서 클라이언트에 전달합니다.
    const [profileData, siblingsData, equipmentData] = await Promise.all([
      profileResponse.json(),
      siblingsResponse.json(),
      equipmentResponse.json(),
    ]);

    const responseData = {
      profile: profileData,
      siblings: siblingsData,
      equipment: equipmentData,
    };

    // 같은 캐릭터를 짧은 시간 안에 여러 사용자가 조회하면 CDN이 흡수한다.
    // 요청당 Lostark API 3회 호출이라 짧은 TTL로도 절감 효과가 크다.
    if (refresh) {
      // 갱신: 이 캐릭터로 CDN에 남아 있던 캐시(이 라우트 + 캐릭터 상세 라우트, 같은 태그)를
      // 지워서 이후 조회가 전부 최신을 받게 한다. 서버리스 freeze 대비 반드시 await.
      await purgeCharacterCdn(characterName).catch(() => {});
      return NextResponse.json(responseData, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'Netlify-Vary': 'query',
        // 갱신 시 태그 퍼지로 지울 수 있도록 캐릭터별 태그를 단다
        'Netlify-Cache-Tag': characterCdnTag(characterName),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}
