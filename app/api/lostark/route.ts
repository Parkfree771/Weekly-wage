import { NextResponse } from 'next/server';
import { characterCdnTag, purgeCharacterCdn } from '@/lib/purge-cdn';

// GET 요청을 처리하는 함수
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const characterName = searchParams.get('characterName');
  // 명시적 갱신(마이페이지 갱신·캐릭터 등록 등): 응답을 캐시하지 않아 항상 최신을 보장.
  // 호출부가 캐시버스터를 기억할 필요 없도록 라우트 계약으로 처리한다.
  const refresh = searchParams.get('refresh') === '1';
  // 아바타·보석은 재련 시뮬의 전투력 계산에서만 필요해서, 요청한 호출부에만 붙인다.
  //   아바타 = 주스탯 %,  보석 = 기본 공격력 % (완갑 등급이 바뀔 때 약분되지 않는다)
  // 대신 그 호출부는 siblings 를 안 쓰므로 skipSiblings 로 빼서 외부 API 호출 수를 아낀다.
  const withAvatars = searchParams.get('avatars') === '1';
  const withGems = searchParams.get('gems') === '1';
  const skipSiblings = searchParams.get('siblings') === '0';

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
  const avatarsUrl = `https://developer-lostark.game.onstove.com/armories/characters/${encodedCharacterName}/avatars`;
  const gemsUrl = `https://developer-lostark.game.onstove.com/armories/characters/${encodedCharacterName}/gems`;

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
  };

  try {
    // 프로필 정보, 형제 캐릭터 정보, 장비 정보를 동시에 요청합니다.
    const [profileResponse, siblingsResponse, equipmentResponse, avatarsResponse, gemsResponse] = await Promise.all([
      fetch(profileUrl, options),
      skipSiblings ? Promise.resolve(null) : fetch(siblingsUrl, options),
      fetch(equipmentUrl, options),
      withAvatars ? fetch(avatarsUrl, options) : Promise.resolve(null),
      withGems ? fetch(gemsUrl, options) : Promise.resolve(null),
    ]);

    const siblingsFailed = !skipSiblings && !siblingsResponse!.ok;
    if (!profileResponse.ok || siblingsFailed || !equipmentResponse.ok) {
      const errorResponse = !profileResponse.ok ? profileResponse :
                            siblingsFailed ? siblingsResponse! :
                            equipmentResponse;
      const errorData = await errorResponse.json().catch(() => ({}));

      return NextResponse.json(
        { message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
        { status: errorResponse.status }
      );
    }

    // 세 데이터를 합쳐서 클라이언트에 전달합니다.
    const [profileData, siblingsData, equipmentData] = await Promise.all([
      profileResponse.json(),
      siblingsResponse ? siblingsResponse.json() : Promise.resolve(null),
      equipmentResponse.json(),
    ]);

    // 아바타·보석은 없어도 계산이 되는 보조 정보라, 실패해도 본 응답을 막지 않는다.
    const [avatarsData, gemsData] = await Promise.all([
      avatarsResponse?.ok ? avatarsResponse.json().catch(() => null) : Promise.resolve(null),
      gemsResponse?.ok ? gemsResponse.json().catch(() => null) : Promise.resolve(null),
    ]);

    const responseData = {
      profile: profileData,
      siblings: siblingsData,
      equipment: equipmentData,
      ...(withAvatars ? { avatars: avatarsData } : {}),
      ...(withGems ? { gems: gemsData } : {}),
    };

    // 같은 캐릭터를 짧은 시간 안에 여러 사용자가 조회하면 CDN이 흡수한다.
    // 시뮬 캐릭터 불러오기는 방금 재련한 결과가 보여야 하므로 TTL을 길게 잡지 않는다.
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

  } catch {
    return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
}
