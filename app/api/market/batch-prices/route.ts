import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// 단일 아이템 가격 조회 함수
async function fetchSingleItemPrice(itemId: string, apiKey: string): Promise<{ itemId: string; price: number; statsDate?: string; error?: string }> {
  try {
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
      return { itemId, price: 0, error: `API 오류: ${response.status}` };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { itemId, price: 0, error: '아이템 정보 없음' };
    }

    const itemData = data[0];
    let price = 0;
    let statsDate: string | undefined;

    // Stats에서 날짜 추출
    if (itemData.Stats && itemData.Stats.length > 0 && itemData.Stats[0].Date) {
      statsDate = itemData.Stats[0].Date;
    }

    // 가격 우선순위: YDayAvgPrice > Stats[0].AvgPrice > CurrentMinPrice
    if (itemData.YDayAvgPrice && itemData.YDayAvgPrice > 0) {
      price = itemData.YDayAvgPrice;
      // YDayAvgPrice는 묶음 단위 가격이므로 개당 가격으로 환산
      switch (itemId) {
        case '66102106': // 수호석 (100개 단위)
        case '66102006': // 파괴석 (100개 단위)
          price /= 100;
          break;
        case '66130143': // 운명파편 (API에서는 1000개 단위 주머니)
          price /= 1000;
          break;
        // 목재 아이템은 100개 묶음 가격 그대로 반환 (CraftingCalculator에서 처리)
      }
    } else if (itemData.Stats && itemData.Stats.length > 0 && itemData.Stats[0].AvgPrice > 0) {
      price = itemData.Stats[0].AvgPrice; // 이미 개당 가격
    } else if (itemData.CurrentMinPrice && itemData.CurrentMinPrice > 0) {
      price = itemData.CurrentMinPrice; // 이미 개당 가격
    }

    return { itemId, price, statsDate };
  } catch (error: any) {
    return { itemId, price: 0, error: error.message };
  }
}

// 배치 가격 조회 함수 (rate limiting 포함)
const getBatchPrices = unstable_cache(
  async (itemIds: string[], apiKey: string) => {
    console.log(`[Batch API] Fetching prices for ${itemIds.length} items`);

    const results: Array<{ itemId: string; price: number; statsDate?: string; error?: string }> = [];

    // Rate limiting: 300ms 간격으로 순차 호출
    for (const itemId of itemIds) {
      const result = await fetchSingleItemPrice(itemId, apiKey);
      results.push(result);

      // 마지막 아이템이 아니면 300ms 대기
      if (itemId !== itemIds[itemIds.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return results;
  },
  ['batch-prices'],
  {
    revalidate: 300, // 5분간 캐싱
    tags: ['batch-prices']
  }
);

export async function POST(request: Request) {
  try {
    const { itemIds } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { message: 'itemIds 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 최대 20개 아이템으로 제한 (과도한 API 호출 방지)
    if (itemIds.length > 20) {
      return NextResponse.json(
        { message: '한 번에 최대 20개 아이템까지만 조회 가능합니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 캐시된 배치 조회
    const results = await getBatchPrices(itemIds, apiKey);

    // 첫 번째 유효한 statsDate 추출
    const statsDate = results.find(r => r.statsDate)?.statsDate || null;

    console.log(`[Batch API] Returning ${results.length} price results, statsDate: ${statsDate}`);
    return NextResponse.json({
      success: true,
      count: results.length,
      prices: results,
      statsDate, // 가격 기준 날짜
    });
  } catch (error: any) {
    console.error('[Batch API] 배치 가격 조회 오류:', error);
    return NextResponse.json(
      { message: '배치 가격 조회 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
