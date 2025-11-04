import { NextResponse } from 'next/server';
import { addTodayTempPrice, finalizeYesterdayData, saveHistoricalPrice, updateMarketTodayPrice } from '@/lib/firestore-admin';
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

  // 쿼리 파라미터로 타입 필터링 지원 (market, auction, 또는 전체)
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type'); // 'market' | 'auction' | null (전체)

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const results = [];
  const errors = [];

  // 한국 시간(KST) 기준으로 오전 6시인지 확인
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const kstTime = now.getTime() + kstOffset;
  const kstDate = new Date(kstTime);
  const isAt6AM = kstDate.getUTCHours() === 6 && kstDate.getUTCMinutes() < 30;
  // const isAt6AM = true; // 테스트용: 항상 전날 평균가 저장

  // 수요일(3) 여부 확인 - 로스트아크 업데이트 날
  const isWednesday = kstDate.getUTCDay() === 3;

  // 수요일 오전 10시인지 확인 (업데이트 이후 시간)
  const isWednesdayAt10AM = isWednesday && kstDate.getUTCHours() === 10 && kstDate.getUTCMinutes() < 30;

  // 거래소 아이템 전날 평균가 저장 타이밍
  // - 수요일: 오전 10시 (업데이트 이후)
  // - 기타 요일: 오전 6시
  const shouldSaveMarketYesterday = isWednesdayAt10AM || (!isWednesday && isAt6AM);

  // 오전 6시: 경매장 전날 데이터 확정 (수요일 포함 매일)
  if (isAt6AM) {
    try {
      // 경매장 아이템의 전날 임시 데이터를 평균내서 확정
      await finalizeYesterdayData();
      results.push({ message: '전날 데이터 확정 완료 (경매장 아이템 평균 계산)' });
    } catch (error: any) {
      errors.push({ message: '전날 데이터 확정 실패', error: error.message });
    }
  }

  // 타입 필터링 적용
  const itemsToProcess = typeFilter
    ? TRACKED_ITEMS.filter(item => item.type === typeFilter)
    : TRACKED_ITEMS;

  console.log(`[Collect Prices] 처리할 아이템: ${itemsToProcess.length}개 (타입 필터: ${typeFilter || '전체'})`);

  // 각 아이템의 가격 수집
  for (const item of itemsToProcess) {
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

        // 거래 가능한 버전 찾기
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

        // === 거래소 전날 평균가 저장: 수요일은 10시, 기타 요일은 6시 ===
        if (shouldSaveMarketYesterday) {
          // Stats[1]은 어제 데이터 (이미 확정된 평균가)
          if (itemData.Stats && itemData.Stats.length > 1) {
            const yesterdayStat = itemData.Stats[1];
            const yesterdayPrice = yesterdayStat.AvgPrice || 0;

            if (yesterdayPrice > 0 && yesterdayStat.Date) {
              await saveHistoricalPrice(item.id, yesterdayPrice, yesterdayStat.Date, item.name);
              const timeInfo = isWednesday ? '10시 (수요일 업데이트 고려)' : '6시';
              console.log(`[Market] ${item.name} - 전날 평균가 저장 (${timeInfo}): ${yesterdayStat.Date} = ${yesterdayPrice}G`);

              results.push({
                itemId: item.id,
                itemName: item.name,
                type: item.type,
                date: yesterdayStat.Date,
                price: yesterdayPrice,
                timestamp: new Date().toISOString(),
                dataType: 'market_yesterday_avg'
              });
            }
          }
        }

        // === 1시간마다: 오늘 평균가를 todayTemp에 덮어쓰기 ===
        const todayAvgPrice = itemData.Stats?.[0]?.AvgPrice || 0;

        if (todayAvgPrice > 0) {
          await updateMarketTodayPrice(item.id, todayAvgPrice, item.name);
          console.log(`[Market] ${item.name} - 오늘 평균가: ${todayAvgPrice}G`);

          results.push({
            itemId: item.id,
            itemName: item.name,
            type: item.type,
            price: todayAvgPrice,
            timestamp: new Date().toISOString(),
            dataType: 'market_today_avg'
          });
        } else {
          errors.push({ itemId: item.id, itemName: item.name, error: '오늘 평균가 없음' });
        }

      } else if (item.type === 'auction') {
        // 경매장 아이템
        // 1시간마다: 현재 최저가를 todayTemp에 저장
        // 오전 6시가 되면 finalizeYesterdayData()에서 전날 데이터를 평균 계산

        // 필터 옵션 적용 (있으면)
        const requestBody: any = {
          ItemName: item.searchName || '',
          CategoryCode: item.categoryCode || null,
          PageNo: 0,
          SortCondition: 'ASC',
          Sort: 'BUY_PRICE',
          ...item.filters // filters가 있으면 병합 (ItemUpgradeLevel, EtcOptions 포함)
        };

        // API에서 직접 필터링하므로 1페이지만 조회
        const pagesToFetch = 1;

        console.log(`[Auction] ${item.name} 검색 조건:`, JSON.stringify(requestBody));

        // 여러 페이지 조회 (옵션 필터가 있는 경우)
        let allItems: any[] = [];
        for (let page = 0; page < pagesToFetch; page++) {
          const pageRequestBody = { ...requestBody, PageNo: page };

          const response = await fetch(
            'https://developer-lostark.game.onstove.com/auctions/items',
            {
              method: 'POST',
              headers: {
                accept: 'application/json',
                authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(pageRequestBody)
            }
          );

          if (!response.ok) {
            if (page === 0) {
              errors.push({ itemId: item.id, error: `경매장 API 오류: ${response.status}` });
            }
            break;
          }

          const auctionData = await response.json();
          const pageItems = auctionData?.Items || [];

          if (pageItems.length === 0) break; // 더 이상 아이템 없으면 중단

          allItems = allItems.concat(pageItems);

          // API 요청 사이 딜레이
          if (page < pagesToFetch - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        if (allItems.length === 0 && pagesToFetch > 0) {
          errors.push({ itemId: item.id, error: '경매장에 아이템 없음' });
          continue;
        }

        console.log(`[Auction] ${item.name} - 총 ${allItems.length}개 아이템 조회됨`);

        // EtcOptions로 API에서 이미 필터링되었으므로 클라이언트 필터링 불필요
        const items = allItems;

        if (items.length > 0) {
          const lowestPriceItem = items[0];
          const auctionInfo = lowestPriceItem.AuctionInfo;

          console.log(`[Auction] ${item.name} AuctionInfo:`, JSON.stringify({
            Name: lowestPriceItem.Name,
            BuyPrice: auctionInfo.BuyPrice,
            BidStartPrice: auctionInfo.BidStartPrice,
            BidPrice: auctionInfo.BidPrice,
            EndDate: auctionInfo.EndDate,
            TradeAllowCount: auctionInfo.TradeAllowCount,
            Options: lowestPriceItem.Options
          }, null, 2));

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
          errors.push({ itemId: item.id, error: '경매장에 아이템 없음 (필터 조건 미충족)' });
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
