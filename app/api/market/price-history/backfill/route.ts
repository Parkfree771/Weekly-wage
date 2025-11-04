import { NextResponse } from 'next/server';
import { saveHistoricalPrice, updateMarketTodayPrice } from '@/lib/firestore-admin';

// 새로운 거래소 아이템의 과거 2주 데이터를 가져와서 DB에 저장
// 과거 데이터 (10/22 ~ 11/3) → dailyPrices
// 오늘 데이터 (11/4) → todayTemp
export async function POST(request: Request) {
  try {
    const { itemIds } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { message: 'itemIds 배열이 필요합니다.' },
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

    const results = [];
    const errors = [];

    // 각 아이템에 대해 데이터 수집
    for (const itemId of itemIds) {
      try {
        // 로스트아크 API에서 아이템 정보 가져오기
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
          errors.push({ itemId, error: `API 호출 실패 (상태: ${response.status})` });
          continue;
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
          errors.push({ itemId, error: '아이템 정보를 찾을 수 없습니다.' });
          continue;
        }

        const itemData = data[0];
        const itemName = itemData.Name;
        const savedPrices = [];

        // Stats 배열에서 데이터 추출
        // Stats[0] = 오늘 (11/4) → todayTemp
        // Stats[1] = 어제 (11/3) → dailyPrices
        // Stats[2] = 그저께 (11/2) → dailyPrices
        // ...
        if (itemData.Stats && Array.isArray(itemData.Stats)) {
          for (let i = 0; i < itemData.Stats.length; i++) {
            const stat = itemData.Stats[i];

            if (stat.AvgPrice && stat.AvgPrice > 0 && stat.Date) {
              if (i === 0) {
                // 오늘 데이터 (Stats[0]) → todayTemp
                await updateMarketTodayPrice(itemId, stat.AvgPrice, itemName);
                savedPrices.push({
                  date: stat.Date,
                  price: stat.AvgPrice,
                  collection: 'todayTemp'
                });
              } else {
                // 과거 데이터 (Stats[1] 이후) → dailyPrices
                await saveHistoricalPrice(itemId, stat.AvgPrice, stat.Date, itemName);
                savedPrices.push({
                  date: stat.Date,
                  price: stat.AvgPrice,
                  collection: 'dailyPrices'
                });
              }
            }
          }
        }

        results.push({
          itemId,
          itemName,
          savedCount: savedPrices.length,
          prices: savedPrices
        });

        // API 레이트 리밋을 피하기 위한 딜레이 (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        errors.push({ itemId, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: '과거 데이터 수집 완료',
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalItems: itemIds.length,
        successCount: results.length,
        errorCount: errors.length
      }
    });

  } catch (error: any) {
    console.error('과거 데이터 수집 오류:', error);
    return NextResponse.json(
      { message: '과거 데이터 수집 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
