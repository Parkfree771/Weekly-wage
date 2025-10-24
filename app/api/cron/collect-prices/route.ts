import { NextResponse } from 'next/server';
import axios from 'axios';
import { saveYesterdayPrice, addTodayTempPrice, finalizeYesterdayData } from '@/lib/firestore-admin';
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

        const response = await axios.get(
          `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
          {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
          errors.push({ itemId: item.id, itemName: item.name, error: '아이템 정보를 찾을 수 없음' });
          continue;
        }

        // 거래 가능한 버전 찾기 (TradeRemainCount가 null이 아니거나 Stats에 데이터가 있는 것)
        let itemData = null;
        for (const variant of response.data) {
          if (variant.Stats && variant.Stats.length > 0 && variant.Stats[0].AvgPrice > 0) {
            itemData = variant;
            break;
          }
        }

        if (!itemData) {
          errors.push({ itemId: item.id, itemName: item.name, error: '거래 가능한 아이템 버전 없음' });
          continue;
        }

        // 1) 30분마다: 오늘의 평균가를 todayTemp에 저장
        const todayStats = itemData.Stats[0]; // 가장 최근 날짜
        const currentPrice = Math.round(todayStats.AvgPrice || 0);

        console.log(`[Market] ${item.name} Today AvgPrice:`, currentPrice, `(${todayStats.Date})`);

        if (currentPrice > 0) {
          // 오늘 평균가를 임시 데이터로 저장
          await addTodayTempPrice(item.id, currentPrice, item.name);

          results.push({
            itemId: item.id,
            itemName: item.name,
            type: item.type,
            price: currentPrice,
            timestamp: new Date().toISOString(),
            dataType: 'market_current_avg_price'
          });
        } else {
          errors.push({ itemId: item.id, itemName: item.name, error: '현재 평균가 없음' });
        }

        // 2) 오전 6시: 전날 평균가를 dailyPrices에 저장
        if (isAt6AM && itemData.Stats.length >= 2) {
          const yesterdayStats = itemData.Stats[1]; // 전날
          const yesterdayPrice = Math.round(yesterdayStats.AvgPrice || 0);
          console.log(`[Market] ${item.name} Yesterday AvgPrice:`, yesterdayPrice, `(${yesterdayStats.Date})`);

          if (yesterdayPrice > 0) {
            await saveYesterdayPrice(item.id, yesterdayPrice, item.name);

            results.push({
              itemId: item.id,
              itemName: item.name,
              type: item.type,
              price: yesterdayPrice,
              timestamp: new Date().toISOString(),
              dataType: 'market_yesterday_average'
            });
          } else {
            errors.push({ itemId: item.id, itemName: item.name, error: '전날 평균가 없음' });
          }
        }

      } else if (item.type === 'auction') {
        // 경매장 아이템
        // 30분마다: 현재 최저가를 todayTemp에 저장
        // 오전 6시가 되면 finalizeYesterdayData()에서 전날 데이터를 평균 계산
        const response = await axios.post(
          'https://developer-lostark.game.onstove.com/auctions/items',
          {
            ItemName: item.searchName,
            CategoryCode: item.categoryCode || null,
            PageNo: 0,
            SortCondition: 'ASC',
            Sort: 'BUY_PRICE'
          },
          {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const items = response.data?.Items || [];
        if (items.length > 0) {
          const lowestPriceItem = items[0];
          const auctionInfo = lowestPriceItem.AuctionInfo;
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
