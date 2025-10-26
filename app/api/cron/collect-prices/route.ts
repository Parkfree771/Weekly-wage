import { NextResponse } from 'next/server';
import { saveYesterdayPrice, addTodayTempPrice, finalizeYesterdayData, saveHistoricalPrice } from '@/lib/firestore-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';

// 자동 가격 수집 엔드포인트 (GitHub Actions용)
export async function GET(request: Request) {
  // 프로덕션에서만 인증 확인
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

  const results = [];
  const errors = [];

  const now = new Date();
  const isAt6AM = now.getHours() === 6 && now.getMinutes() < 30;
  // const isAt6AM = true; // 테스트용: 항상 전날 평균가 저장

  // 오전 6시: 전날 데이터 확정
  if (isAt6AM) {
    try {
      // 경매장 아이템의 전날 임시 데이터를 평균내서 확정
      await finalizeYesterdayData();
      results.push({ message: '전날 데이터 확정 완료 (경매장 아이템 평균 계산)' });
    } catch (error: any) {
      errors.push({ message: '전날 데이터 확정 실패', error: error.message });
    }
  }

  // 각 아이템의 가격 수집
  for (const item of TRACKED_ITEMS) {
    try {
      if (item.type === 'market') {
        // 거래소 아이템
        console.log(`[Market] Fetching ${item.name} (${item.id})...`);

        const response = await fetch(
          `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
          {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (!response.ok) {
          errors.push({ itemId: item.id, itemName: item.name, error: `API 오류: ${response.status}` });
          continue;
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
          errors.push({ itemId: item.id, itemName: item.name, error: '아이템 정보를 찾을 수 없음' });
          continue;
        }

        // 거래 가능한 버전 찾기 (TradeRemainCount가 null이 아니거나 Stats에 데이터가 있는 것)
        let itemData = null;
        for (const variant of data) {
          if (variant.Stats && variant.Stats.length > 0 && variant.Stats[0].AvgPrice > 0) {
            itemData = variant;
            break;
          }
        }

        if (!itemData) {
          errors.push({ itemId: item.id, itemName: item.name, error: '거래 가능한 아이템 버전 없음' });
          continue;
        }

        console.log(`[Market] ${item.name} - Stats 배열 개수: ${itemData.Stats?.length || 0}`);
        console.log(`[Market] ${item.name} - 첫번째 날짜: ${itemData.Stats?.[0]?.Date}, 마지막 날짜: ${itemData.Stats?.[itemData.Stats.length - 1]?.Date}`);

        // 1) 30분마다: 오늘의 최저가를 todayTemp에 저장
        // CurrentMinPrice가 없으면 Stats[0].AvgPrice 사용
        let currentPrice = itemData.CurrentMinPrice || 0;
        if (currentPrice === 0 && itemData.Stats && itemData.Stats.length > 0) {
          currentPrice = itemData.Stats[0].AvgPrice || 0;
        }

        console.log(`[Market] ${item.name} Current Price:`, currentPrice);

        if (currentPrice > 0) {
          // 오늘 가격을 임시 데이터로 저장
          await addTodayTempPrice(item.id, currentPrice, item.name);

          results.push({
            itemId: item.id,
            itemName: item.name,
            type: item.type,
            price: currentPrice,
            timestamp: new Date().toISOString(),
            dataType: 'market_current_price'
          });
        } else {
          errors.push({ itemId: item.id, itemName: item.name, error: '현재 가격 없음' });
        }

        // 2) 오전 6시에만: 과거 거래 평균가들을 dailyPrices에 저장
        if (isAt6AM && itemData.Stats && itemData.Stats.length > 1) {
          console.log(`[Market] ${item.name} - Saving ${itemData.Stats.length - 1} historical prices`);

          // Stats[0]은 오늘이므로 Stats[1]부터 저장 (전날 ~ 최대 30일 전까지)
          for (let i = 1; i < itemData.Stats.length; i++) {
            const stat = itemData.Stats[i];
            const historicalPrice = stat.AvgPrice || 0;

            if (historicalPrice > 0 && stat.Date) {
              // Stats의 Date를 그대로 사용
              await saveHistoricalPrice(item.id, historicalPrice, stat.Date, item.name);

              console.log(`  [${i}] ${stat.Date}: ${historicalPrice}G`);
            }
          }

          results.push({
            itemId: item.id,
            itemName: item.name,
            type: item.type,
            count: itemData.Stats.length - 1,
            timestamp: new Date().toISOString(),
            dataType: 'market_historical_prices'
          });
        }

      } else if (item.type === 'auction') {
        // 경매장 아이템
        // 30분마다: 현재 최저가를 todayTemp에 저장
        // 오전 6시가 되면 finalizeYesterdayData()에서 전날 데이터를 평균 계산
        const response = await fetch(
          'https://developer-lostark.game.onstove.com/auctions/items',
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ItemName: item.searchName,
              CategoryCode: item.categoryCode || null,
              PageNo: 0,
              SortCondition: 'ASC',
              Sort: 'BUY_PRICE'
            })
          }
        );

        if (!response.ok) {
          errors.push({ itemId: item.id, error: `경매장 API 오류: ${response.status}` });
          continue;
        }

        const auctionData = await response.json();
        const items = auctionData?.Items || [];
        if (items.length > 0) {
          const lowestPriceItem = items[0];
          const auctionInfo = lowestPriceItem.AuctionInfo;

          console.log(`[Auction] ${item.name} AuctionInfo:`, JSON.stringify({
            BuyPrice: auctionInfo.BuyPrice,
            BidStartPrice: auctionInfo.BidStartPrice,
            BidPrice: auctionInfo.BidPrice,
            EndDate: auctionInfo.EndDate,
            TradeAllowCount: auctionInfo.TradeAllowCount
          }));

          const currentPrice = auctionInfo.BuyPrice || auctionInfo.BidStartPrice || 0;

          if (currentPrice > 0) {
            await addTodayTempPrice(item.id, currentPrice, item.name);

            results.push({
              itemId: item.id,
              itemName: item.name,
              type: item.type,
              price: currentPrice,
              timestamp: new Date().toISOString(),
              dataType: 'auction_current_price'
            });
          } else {
            errors.push({ itemId: item.id, error: '유효한 가격 정보 없음' });
          }
        } else {
          errors.push({ itemId: item.id, error: '경매장에 아이템 없음' });
        }
      }

      // API 요청 사이에 짧은 딜레이 (rate limit 방지)
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error: any) {
      console.error(`아이템 ${item.id} 수집 오류:`, error.message);
      errors.push({ itemId: item.id, error: error.message });
    }
  }

  return NextResponse.json({
    success: true,
    message: `가격 수집 완료: ${results.length}개 성공, ${errors.length}개 실패`,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
