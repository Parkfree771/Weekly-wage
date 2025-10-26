import { NextResponse } from 'next/server';
import { savePriceData } from '@/lib/firestore-admin';

// 특정 아이템의 현재 가격을 가져와서 Firestore에 저장
export async function POST(request: Request) {
  try {
    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { message: 'itemId가 필요합니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: '서버에 API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 로스트아크 API에서 현재 가격 가져오기
    const response = await fetch(
      `https://developer-lostark.game.onstove.com/markets/items/${itemId}`,
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: '아이템 정보를 가져오는데 실패했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { message: '아이템 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const itemData = data[0];
    let currentPrice = 0;

    // 가격 우선순위: 전날 평균가 > 통계 평균가 > 현재 최저가
    if (itemData.YDayAvgPrice && itemData.YDayAvgPrice > 0) {
      currentPrice = itemData.YDayAvgPrice;
    } else if (itemData.Stats && itemData.Stats.length > 0 && itemData.Stats[0].AvgPrice > 0) {
      currentPrice = itemData.Stats[0].AvgPrice;
    } else if (itemData.CurrentMinPrice && itemData.CurrentMinPrice > 0) {
      currentPrice = itemData.CurrentMinPrice;
    }

    if (currentPrice === 0) {
      return NextResponse.json(
        { message: '유효한 가격 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Firestore에 저장
    await savePriceData(itemId, currentPrice, itemData.Name);

    return NextResponse.json({
      success: true,
      message: '가격 수집 및 저장 완료',
      data: {
        itemId,
        itemName: itemData.Name,
        price: currentPrice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('가격 수집 오류:', error);
    return NextResponse.json(
      { message: '가격 수집 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
