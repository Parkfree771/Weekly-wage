import { NextResponse } from 'next/server';
import { addTodayTempPrice, saveHistoricalPrice, updateMarketTodayPrice, generateAndUploadPriceJson, rolloverAuctionDays } from '@/lib/firestore-admin';
import { TRACKED_ITEMS, getItemsByCategory, ItemCategory } from '@/lib/items-to-track';
import { purgePriceCache, PRICE_CACHE_TAG } from '@/lib/cache-purge';

// 한 건의 외부 API 호출이 멈춰도 전체 수집이 타임아웃되지 않도록 fetch 타임아웃 래퍼
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 동시성 제한 배치 실행 — fetch(읽기 전용)만 병렬화. 캐시 변경은 호출부에서 순차 처리해 경합 방지.
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  }
  return out;
}

// fetchItem 결과 타입
type FetchedItem =
  | { item: typeof TRACKED_ITEMS[number]; ok: false; error: string }
  | { item: typeof TRACKED_ITEMS[number]; ok: true; kind: 'market'; todayAvg: number; yesterdayStat: { price: number; date: string } | null }
  | { item: typeof TRACKED_ITEMS[number]; ok: true; kind: 'auction'; currentPrice: number };

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
  // history_all.json 이 이 회차에서 실제로 바뀌었는지 추적 → 바뀐 경우에만 price-history 태그 퍼지
  let historyChanged = false;

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
  // - 롤오버는 이제 "타이밍 독립 · 멱등": 경매장 크론이 돌 때마다 호출해도
  //   과거 미확정 버킷이 있을 때만 확정하고, 없으면 no-op.
  // - 따라서 00시 회차가 드롭/타임아웃돼도 다음 회차(01·02·03시…)가 자동으로 메운다.
  const isAuctionCron = categoryFilter?.includes('accessory') || categoryFilter?.includes('jewel') || typeFilter === 'auction';
  const shouldRolloverAuction = isAuctionCron; // 매 경매장 회차마다 멱등 실행

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
  // 경매장 롤오버 (데이터 수집 전에 실행 — 순서 중요!)
  // - 경매장 크론이 거래소 크론보다 먼저 실행됨 (10분 → 15분 → 20분)
  // - rolloverAuctionDays(): _rawByDate 의 "과거" 버킷을 history에 멱등 확정 + 보존기간 지난 버킷 prune
  // - 타이밍 독립 · 멱등: 매 회차 호출해도 과거 미확정 버킷이 있을 때만 동작
  //   → 00시 회차가 빠져도 01·02·03시 회차가 자동으로 메운다 (오늘 버킷은 건드리지 않음)
  // ========================================================================
  if (shouldRolloverAuction) {
    try {
      const committed = await rolloverAuctionDays(false);
      if (committed > 0) {
        historyChanged = true;
        results.push({ message: `경매장 롤오버 완료: ${committed}건 확정` });
        console.log(`[롤오버] 경매장 과거 버킷 ${committed}건 확정`);
      }
    } catch (error: any) {
      errors.push({ message: '경매장 롤오버 실패', error: error.message });
      console.error(`[롤오버] 경매장 롤오버 실패:`, error);
    }
  }

  // ── Phase 1: 외부 API 동시 조회 (배치 6, 읽기 전용 — 캐시 변경 없음) ──
  // 직렬 300ms 딜레이 + 직렬 fetch가 함수 타임아웃의 주원인이었음.
  // fetch만 병렬화하고 캐시 변경(Phase 2)은 순차로 처리해 경합을 막는다.
  const fetched: FetchedItem[] = await inBatches(itemsToProcess, 6, async (item): Promise<FetchedItem> => {
    try {
      if (item.type === 'market') {
        const response = await fetchWithTimeout(
          `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
          { headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` } }
        );
        if (!response.ok) return { item, ok: false, error: `API 오류: ${response.status}` };
        const data = await response.json();
        if (!data || !Array.isArray(data) || data.length === 0) {
          return { item, ok: false, error: '아이템 정보를 찾을 수 없음' };
        }
        // 거래 가능한 버전 찾기
        let itemData: any = null;
        for (const variant of data) {
          if (variant.Stats && variant.Stats.length > 0 && variant.Stats[0].AvgPrice > 0) {
            itemData = variant;
            break;
          }
        }
        if (!itemData) return { item, ok: false, error: '거래 가능한 아이템 버전 없음' };

        const todayAvg = itemData.Stats?.[0]?.AvgPrice || 0;
        const ys = itemData.Stats && itemData.Stats.length > 1 ? itemData.Stats[1] : null;
        const yesterdayStat = ys && ys.AvgPrice > 0 && ys.Date ? { price: ys.AvgPrice as number, date: ys.Date as string } : null;
        return { item, ok: true, kind: 'market', todayAvg, yesterdayStat };
      } else {
        const requestBody: any = {
          ItemName: item.searchName || '',
          CategoryCode: item.categoryCode || null,
          PageNo: 0,
          SortCondition: 'ASC',
          Sort: 'BUY_PRICE',
          ...item.filters // ItemUpgradeLevel, EtcOptions 포함
        };
        const response = await fetchWithTimeout(
          'https://developer-lostark.game.onstove.com/auctions/items',
          {
            method: 'POST',
            headers: { accept: 'application/json', authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }
        );
        if (!response.ok) return { item, ok: false, error: `경매장 API 오류: ${response.status}` };
        const auctionData = await response.json();
        const auctionItems = auctionData?.Items || [];
        if (auctionItems.length === 0) return { item, ok: false, error: '경매장에 아이템 없음' };
        // EtcOptions로 API에서 이미 필터링됨 → 최저가 1건
        const auctionInfo = auctionItems[0].AuctionInfo;
        const currentPrice = auctionInfo.BuyPrice || auctionInfo.BidStartPrice || 0;
        if (currentPrice <= 0) return { item, ok: false, error: '유효한 가격 정보 없음' };
        return { item, ok: true, kind: 'auction', currentPrice };
      }
    } catch (error: any) {
      return { item, ok: false, error: error.message };
    }
  });

  // ── Phase 2: 캐시 변경 순차 적용 (단일 스레드 순차 → 경합 없음) ──
  for (const f of fetched) {
    if (!f.ok) {
      errors.push({ itemId: f.item.id, itemName: f.item.name, error: f.error });
      continue;
    }
    try {
      if (f.kind === 'market') {
        // 00시: 어제 확정 평균가(Stats[1]) → history
        if (shouldSaveMarketYesterday && f.yesterdayStat) {
          await saveHistoricalPrice(f.item.id, f.yesterdayStat.price, f.yesterdayStat.date, f.item.name);
          historyChanged = true;
          results.push({ itemId: f.item.id, itemName: f.item.name, type: 'market', date: f.yesterdayStat.date, price: f.yesterdayStat.price, timestamp: new Date().toISOString(), dataType: 'market_yesterday_avg' });
        }
        // 매시간: 오늘 평균가(Stats[0]) → latest
        if (f.todayAvg > 0) {
          await updateMarketTodayPrice(f.item.id, f.todayAvg, f.item.name);
          results.push({ itemId: f.item.id, itemName: f.item.name, type: 'market', price: f.todayAvg, timestamp: new Date().toISOString(), dataType: 'market_today_avg' });
        } else {
          errors.push({ itemId: f.item.id, itemName: f.item.name, error: '오늘 평균가 없음' });
        }
      } else {
        // 경매장: 현재 최저가 → _rawByDate[오늘] 누적
        await addTodayTempPrice(f.item.id, f.currentPrice, f.item.name);
        results.push({ itemId: f.item.id, itemName: f.item.name, type: 'auction', price: f.currentPrice, timestamp: new Date().toISOString(), dataType: 'auction_current_price' });
      }
    } catch (error: any) {
      errors.push({ itemId: f.item.id, error: error.message });
    }
  }

  // ========================================================================
  // JSON 파일 생성 및 Storage 업로드
  // ========================================================================
  // 모든 데이터 수집이 완료된 후 latest_prices.json 생성
  // 주의: 모든 아이템 저장이 완료된 후에 실행됨 (await Promise.all 보장됨)
  let uploaded = false;
  try {
    console.log('[Cron] JSON 파일 생성 시작...');
    await generateAndUploadPriceJson();
    uploaded = true;
    results.push({ message: 'JSON 파일 생성 및 업로드 완료' });
  } catch (error: any) {
    console.error('[Cron] JSON 생성 실패:', error);
    errors.push({ message: 'JSON 생성 실패', error: error.message });
    // JSON 생성 실패해도 크론 작업은 성공으로 간주
  }

  // ========================================================================
  // 가격이 들어온 직후 CDN 캐시 퍼지 (업로드 성공 시에만)
  // - latest 는 매 회차 갱신되므로 항상 퍼지
  // - history 는 이 회차에서 실제 바뀐 경우(롤오버/거래소 어제확정)에만 퍼지
  // ========================================================================
  if (uploaded) {
    await purgePriceCache([
      PRICE_CACHE_TAG.latest,
      ...(historyChanged ? [PRICE_CACHE_TAG.history] : []),
    ]);
  }

  return NextResponse.json({
    success: true,
    message: `가격 수집 완료: ${results.length}개 성공, ${errors.length}개 실패`,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
