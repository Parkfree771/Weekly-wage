import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';

/**
 * 경매장 아이템 히스토리 수습용 API
 * 1. latest_prices.json의 _raw 배열 평균 → history_all.json에 저장 (어제 날짜)
 * 2. 경매장 API 호출해서 현재 가격 가져오기
 * 3. _raw 초기화 후 새 가격을 오늘 첫 배열로 저장
 *
 * 사용법: GET /api/admin/fix-auction-history?historyDate=2026-02-04&todayDate=2026-02-05
 */
export async function GET(request: Request) {
  // 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: '인증되지 않은 요청입니다.' },
      { status: 401 }
    );
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  // 쿼리 파라미터
  const { searchParams } = new URL(request.url);
  const historyDate = searchParams.get('historyDate') || '2026-02-04'; // _raw 평균을 저장할 날짜
  const todayDate = searchParams.get('todayDate') || '2026-02-05'; // 새 가격을 저장할 날짜

  const results: any[] = [];
  const errors: any[] = [];

  try {
    // Firebase Storage bucket
    const storage = getAdminStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }
    const bucket = storage.bucket(bucketName);

    // 1. latest_prices.json 읽기
    console.log('[fix-auction] latest_prices.json 읽기...');
    const latestFile = bucket.file('latest_prices.json');
    const [latestContents] = await latestFile.download();
    const latestData = JSON.parse(latestContents.toString());

    console.log('[fix-auction] _meta:', latestData._meta);
    console.log('[fix-auction] _raw 아이템 수:', Object.keys(latestData._raw || {}).length);

    // 2. history_all.json 읽기
    console.log('[fix-auction] history_all.json 읽기...');
    const historyFile = bucket.file('history_all.json');
    const [historyContents] = await historyFile.download();
    const historyData = JSON.parse(historyContents.toString());

    // 3. 경매장 아이템 필터링
    const auctionItems = TRACKED_ITEMS.filter(item => item.type === 'auction');
    console.log(`[fix-auction] 경매장 아이템 ${auctionItems.length}개 처리...`);

    // 4. _raw 데이터 평균 계산 후 history에 저장
    const raw = latestData._raw || {};
    const historySaved: any[] = [];

    for (const [itemId, prices] of Object.entries(raw) as [string, number[]][]) {
      if (prices && prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // history에 추가
        if (!historyData[itemId]) {
          historyData[itemId] = [];
        }

        // 중복 확인 후 추가/업데이트
        const existingIndex = historyData[itemId].findIndex((entry: any) => entry.date === historyDate);
        if (existingIndex >= 0) {
          historyData[itemId][existingIndex].price = avgPrice;
        } else {
          historyData[itemId].push({ date: historyDate, price: avgPrice });
        }

        // 날짜순 정렬
        historyData[itemId].sort((a: any, b: any) => a.date.localeCompare(b.date));

        const itemInfo = auctionItems.find(i => i.id === itemId);
        historySaved.push({
          itemId,
          itemName: itemInfo?.name || itemId,
          date: historyDate,
          priceCount: prices.length,
          avgPrice: Math.round(avgPrice),
        });

        console.log(`[History] ${itemInfo?.name || itemId} - ${prices.length}개 평균 = ${Math.round(avgPrice)}G → ${historyDate}`);
      }
    }

    results.push({
      step: '1. _raw 평균 → history 저장',
      date: historyDate,
      savedCount: historySaved.length,
      items: historySaved,
    });

    // 5. 새로운 _raw 초기화
    latestData._raw = {};

    // 6. 경매장 API 호출해서 현재 가격 가져오기
    console.log('[fix-auction] 경매장 API 호출 시작...');
    const newPrices: any[] = [];

    for (const item of auctionItems) {
      try {
        const requestBody: any = {
          ItemName: item.searchName || '',
          CategoryCode: item.categoryCode || null,
          PageNo: 0,
          SortCondition: 'ASC',
          Sort: 'BUY_PRICE',
          ...item.filters
        };

        const response = await fetch(
          'https://developer-lostark.game.onstove.com/auctions/items',
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          }
        );

        if (!response.ok) {
          errors.push({ itemId: item.id, itemName: item.name, error: `API 오류: ${response.status}` });
          continue;
        }

        const auctionData = await response.json();
        const items = auctionData?.Items || [];

        if (items.length > 0) {
          const lowestPriceItem = items[0];
          const auctionInfo = lowestPriceItem.AuctionInfo;
          const currentPrice = auctionInfo.BuyPrice || auctionInfo.BidStartPrice || 0;

          if (currentPrice > 0) {
            // _raw에 첫 가격으로 추가
            latestData._raw[item.id] = [currentPrice];
            // 평균가도 업데이트
            latestData[item.id] = currentPrice;

            newPrices.push({
              itemId: item.id,
              itemName: item.name,
              price: currentPrice,
            });

            console.log(`[Auction] ${item.name} - 새 가격: ${currentPrice}G`);
          } else {
            errors.push({ itemId: item.id, itemName: item.name, error: '유효한 가격 없음' });
          }
        } else {
          errors.push({ itemId: item.id, itemName: item.name, error: '경매장에 아이템 없음' });
        }

        // API 요청 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error: any) {
        errors.push({ itemId: item.id, itemName: item.name, error: error.message });
      }
    }

    results.push({
      step: '2. 경매장 API → 새 _raw 저장',
      date: todayDate,
      savedCount: newPrices.length,
      items: newPrices,
    });

    // 7. _meta 업데이트
    latestData._meta = {
      date: todayDate,
      updatedAt: new Date().toISOString(),
    };

    // 8. JSON 파일 저장
    console.log('[fix-auction] latest_prices.json 저장...');
    await latestFile.save(JSON.stringify(latestData, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate',
      },
    });
    await latestFile.makePublic();

    console.log('[fix-auction] history_all.json 저장...');
    await historyFile.save(JSON.stringify(historyData, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate',
      },
    });
    await historyFile.makePublic();

    console.log('[fix-auction] 완료!');

    return NextResponse.json({
      success: true,
      message: `경매장 수습 완료`,
      historyDate,
      todayDate,
      timestamp: new Date().toISOString(),
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[fix-auction] 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        results,
        errors,
      },
      { status: 500 }
    );
  }
}
