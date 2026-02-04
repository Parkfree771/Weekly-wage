import { NextResponse } from 'next/server';
import { addTodayTempPrice, finalizeYesterdayData, saveHistoricalPrice, updateMarketTodayPrice, generateAndUploadPriceJson, appendYesterdayToHistory } from '@/lib/firestore-admin';
import { TRACKED_ITEMS, getItemsByCategory, ItemCategory } from '@/lib/items-to-track';

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

  // 쿼리 파라미터로 타입 및 카테고리 필터링 지원
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type'); // 'market' | 'auction' | null (전체)
  const categoryFilter = searchParams.get('category'); // 'refine' | 'gem' | 'engraving' | etc...

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const results = [];
  const errors = [];

  // 한국 시간(KST) 기준으로 시간 확인
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const kstTime = now.getTime() + kstOffset;
  const kstDate = new Date(kstTime);
  const currentKSTHour = kstDate.getUTCHours();
  const currentKSTMinute = kstDate.getUTCMinutes();

  // 시간대 확인 (GitHub Actions 지연 고려하여 00:00~01:59로 확장)
  const isAt0AM = currentKSTHour === 0 || currentKSTHour === 1; // 00:00-01:59 (날짜 변경 시점, 지연 대비)
  const isWednesday = kstDate.getUTCDay() === 3; // 수요일

  // 수요일 점검 시간 확인 (06:00~09:59)
  const isWednesdayMaintenance = isWednesday && currentKSTHour >= 6 && currentKSTHour < 10;

  // ========================================================================
  // 수요일 점검 시간 처리
  // ========================================================================

  // 수요일 06:00~09:59: 서버 점검으로 API 응답 없음, 수집 건너뛰기
  if (isWednesdayMaintenance) {
    console.log(`[수요일 점검] ${currentKSTHour}시 - API 요청 건너뜀 (점검 시간: 06:00~09:59)`);
    return NextResponse.json({
      success: true,
      message: `수요일 점검 시간 (${currentKSTHour}:${currentKSTMinute.toString().padStart(2, '0')}) - 수집 건너뜀`,
      timestamp: new Date().toISOString(),
      skipped: true,
      reason: 'Wednesday maintenance (06:00-09:59 KST)'
    });
  }

  // ========================================================================
  // 전날 데이터 저장 타이밍 (00시~01시대, GitHub Actions 지연 대비)
  // ========================================================================

  // === 거래소 아이템 전날 평균가 저장 타이밍 ===
  // - 매일 오전 0시~1시대에 Stats[1] (전날 확정 평균가) 저장
  // - GitHub Actions 지연으로 1시를 넘어갈 수 있어 00:00~01:59로 확장
  // - 중복 저장 시 날짜 기준으로 덮어씀 (문제없음)
  const shouldSaveMarketYesterday = isAt0AM;

  // === 경매장 전날 데이터 확정 타이밍 ===
  // - 매일 오전 0시~1시대에 전날 수집 데이터 평균 계산하여 확정
  // - GitHub Actions 지연 대비 00:00~01:59로 확장
  // - 경매장 크론(accessory, jewel)에서만 실행, 거래소 크론에서는 실행 안함
  const isAuctionCron = categoryFilter?.includes('accessory') || categoryFilter?.includes('jewel') || typeFilter === 'auction';
  const shouldFinalizeAuctionYesterday = isAt0AM && isAuctionCron;

  // ========================================================================

  // 타입 및 카테고리 필터링 적용
  let itemsToProcess = TRACKED_ITEMS;

  // 카테고리 필터가 있으면 카테고리로 필터링 (쉼표로 구분된 여러 카테고리 지원)
  if (categoryFilter) {
    const categories = categoryFilter.split(',') as ItemCategory[];
    const categorizedItems: typeof TRACKED_ITEMS = [];
    categories.forEach(category => {
      categorizedItems.push(...getItemsByCategory(category.trim() as ItemCategory));
    });
    itemsToProcess = categorizedItems;
  } else if (typeFilter) {
    // 카테고리 필터가 없고 타입 필터만 있으면 타입으로 필터링
    itemsToProcess = TRACKED_ITEMS.filter(item => item.type === typeFilter);
  }

  console.log(`[Collect Prices] 처리할 아이템: ${itemsToProcess.length}개 (타입: ${typeFilter || '전체'}, 카테고리: ${categoryFilter || '전체'})`);

  // ========================================================================
  // 00시 경매장 크론 (00:10): 데이터 수집 전에 전날 데이터 처리 (순서 중요!)
  // - 경매장 크론이 거래소 크론보다 먼저 실행되어야 함 (10분 → 15분 → 20분)
  // 1. finalizeYesterdayData(): _raw에 누적된 전날 데이터 평균 계산 → history에 저장
  // 2. appendYesterdayToHistory(): _raw 초기화, _meta.date를 오늘로 변경
  // 3. 그 다음 데이터 수집 시작
  // ========================================================================
  if (shouldFinalizeAuctionYesterday) {
    try {
      // 경매장 아이템의 전날 임시 데이터를 평균내서 확정
      await finalizeYesterdayData(false);
      results.push({ message: '전날 데이터 확정 완료 (경매장 아이템 평균 계산)' });
      console.log(`[00시대] 경매장 전날 데이터 확정 완료`);
    } catch (error: any) {
      errors.push({ message: '전날 데이터 확정 실패', error: error.message });
      console.error(`[00시대] 경매장 전날 데이터 확정 실패:`, error);
    }

    try {
      console.log('[Cron] 히스토리 JSON 업데이트 및 _raw 초기화 시작...');
      await appendYesterdayToHistory();
      results.push({ message: '히스토리 JSON 업데이트 및 _raw 초기화 완료' });
    } catch (error: any) {
      console.error('[Cron] 히스토리 JSON 업데이트 실패:', error);
      errors.push({ message: '히스토리 JSON 업데이트 실패', error: error.message });
    }
  }

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

        // === 거래소 전날 평균가 저장: 매일 00시 ===
        if (shouldSaveMarketYesterday) {
          // Stats[1]은 어제 데이터 (이미 확정된 평균가)
          if (itemData.Stats && itemData.Stats.length > 1) {
            const yesterdayStat = itemData.Stats[1];
            const yesterdayPrice = yesterdayStat.AvgPrice || 0;

            if (yesterdayPrice > 0 && yesterdayStat.Date) {
              await saveHistoricalPrice(item.id, yesterdayPrice, yesterdayStat.Date, item.name);
              console.log(`[Market] ${item.name} - 전날 평균가 저장 (00시): ${yesterdayStat.Date} = ${yesterdayPrice}G`);

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

        // === 1시간마다: 오늘 평균가를 latest_prices.json에 저장 ===
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
        // 1시간마다: 현재 최저가를 latest_prices.json의 _raw에 누적
        // 00시가 되면 finalizeYesterdayData()에서 전날 데이터를 평균 계산

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
            // 오늘 데이터에 추가 (latest_prices.json의 _raw)
            // 00:10 가격은 오늘의 첫 데이터로만 사용 (전날 데이터는 00:10 전에 이미 확정됨)
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

  // ========================================================================
  // JSON 파일 생성 및 Storage 업로드
  // ========================================================================
  // 모든 데이터 수집이 완료된 후 latest_prices.json 생성
  // 주의: 모든 아이템 저장이 완료된 후에 실행됨 (await Promise.all 보장됨)
  try {
    console.log('[Cron] JSON 파일 생성 시작...');
    await generateAndUploadPriceJson();
    results.push({ message: 'JSON 파일 생성 및 업로드 완료' });
  } catch (error: any) {
    console.error('[Cron] JSON 생성 실패:', error);
    errors.push({ message: 'JSON 생성 실패', error: error.message });
    // JSON 생성 실패해도 크론 작업은 성공으로 간주
  }

  return NextResponse.json({
    success: true,
    message: `가격 수집 완료: ${results.length}개 성공, ${errors.length}개 실패`,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
