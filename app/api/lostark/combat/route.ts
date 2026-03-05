import { NextResponse } from 'next/server';

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

  const encodedName = encodeURIComponent(characterName);
  const baseUrl = 'https://developer-lostark.game.onstove.com';
  const armoryBase = `${baseUrl}/armories/characters/${encodedName}`;

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
  };

  try {
    const [
      profileRes,
      equipmentRes,
      engravingsRes,
      gemsRes,
      cardsRes,
      arkpassiveRes,
      arkgridRes,
    ] = await Promise.all([
      fetch(`${armoryBase}/profiles`, options),
      fetch(`${armoryBase}/equipment`, options),
      fetch(`${armoryBase}/engravings`, options),
      fetch(`${armoryBase}/gems`, options),
      fetch(`${armoryBase}/cards`, options),
      fetch(`${armoryBase}/arkpassive`, options),
      fetch(`${armoryBase}/arkgrid`, options),
    ]);

    // 프로필은 필수
    if (!profileRes.ok) {
      const errorData = await profileRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData?.Message || '캐릭터 정보를 가져오는 데 실패했습니다.' },
        { status: profileRes.status }
      );
    }

    // 나머지는 실패해도 null로 처리 (일부 캐릭터는 데이터 없을 수 있음)
    const profile = await profileRes.json();
    const equipment = equipmentRes.ok ? await equipmentRes.json() : null;
    const engravings = engravingsRes.ok ? await engravingsRes.json() : null;
    const gems = gemsRes.ok ? await gemsRes.json() : null;
    const cards = cardsRes.ok ? await cardsRes.json() : null;
    const arkpassive = arkpassiveRes.ok ? await arkpassiveRes.json() : null;
    const arkgrid = arkgridRes.ok ? await arkgridRes.json() : null;

    return NextResponse.json({
      profile,
      equipment,
      engravings,
      gems,
      cards,
      arkpassive,
      arkgrid,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
