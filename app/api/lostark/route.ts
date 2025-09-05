
import { NextResponse } from 'next/server';
import axios from 'axios';

// GET 요청을 처리하는 함수
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const characterName = searchParams.get('characterName');

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

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
  };

  try {
    // 프로필 정보와 형제 캐릭터 정보를 동시에 요청합니다.
    const [profileResponse, siblingsResponse] = await Promise.all([
      axios.get(profileUrl, options),
      axios.get(siblingsUrl, options),
    ]);

    // 두 데이터를 합쳐서 클라이언트에 전달합니다.
    const responseData = {
      profile: profileResponse.data,
      siblings: siblingsResponse.data,
    };

    // [진단용 로그] 받은 데이터를 서버 콘솔에 출력합니다.
    console.log('Lost Ark API Response:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData);

  } catch (error: any) {
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
        { status: error.response.status }
      );
    } else {
      return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
    }
  }
}
