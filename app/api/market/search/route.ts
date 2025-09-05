import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  const body = await request.json();
  const itemName = body.itemName;

  if (!itemName) {
    return NextResponse.json({ message: '아이템 이름을 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const apiUrl = 'https://developer-lostark.game.onstove.com/markets/items';

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  // 재련 재료 카테고리 코드 (카테고리 50010 = 재련 재료)
  const requestBody = {
    Sort: 'GRADE',
    CategoryCode: 50010,
    ItemName: itemName,
    PageNo: 1,
    SortCondition: 'ASC',
  };

  try {
    const response = await axios.post(apiUrl, requestBody, options);
    return NextResponse.json(response.data);

  } catch (error: any) {
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.Message || '아이템 검색에 실패했습니다.' },
        { status: error.response.status }
      );
    } else {
      return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
    }
  }
}