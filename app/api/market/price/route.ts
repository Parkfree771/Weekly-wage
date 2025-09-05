import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json({ message: '아이템 ID를 입력해주세요.' }, { status: 400 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: '서버에 API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const apiUrl = `https://developer-lostark.game.onstove.com/markets/items/${itemId}`;

  const options = {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
  };

  try {
    const response = await axios.get(apiUrl, options);
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const itemData = response.data[0];
      
      // Get latest average price from Stats array (index 0 is today/latest)
      let averagePrice = 0;
      if (itemData.Stats && itemData.Stats.length > 0) {
        averagePrice = itemData.Stats[0].AvgPrice;
      }
      
      return NextResponse.json({ itemId, averagePrice });
    } else {
      // Return a 0 price if item has no market data
      return NextResponse.json({ itemId, averagePrice: 0 });
    }

  } catch (error: any) {
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.Message || '아이템 가격 정보를 가져오는 데 실패했습니다.' },
        { status: error.response.status }
      );
    } else {
      return NextResponse.json({ message: 'API 요청 중 알 수 없는 오류가 발생했습니다.' }, { status: 500 });
    }
  }
}
