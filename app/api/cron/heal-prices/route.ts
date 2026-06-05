import { NextResponse } from 'next/server';
import {
  saveHistoricalPrice,
  rolloverAuctionDays,
  generateAndUploadPriceJson,
  readHistorySnapshot,
  getLostArkDate,
  formatDateKey,
} from '@/lib/firestore-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';
import { purgePriceCache, PRICE_CACHE_TAG } from '@/lib/cache-purge';

/**
 * 가격 데이터 자동 복구(self-heal) 크론 — 멱등
 *
 * 매일 1회(정시 회피 시간대) 실행하여 수집 누락을 자동으로 메운다.
 *   1) 경매장: rolloverAuctionDays() — _rawByDate의 과거 미확정 버킷을 history에 확정
 *      (00시 회차가 드롭/타임아웃돼도 여기서 최종적으로 메워짐)
 *   2) 거래소: 최근 N일(HEAL_DAYS) history 누락을 점검하고, LostArk markets API의
 *      Stats 배열(며칠치 확정 평균 제공)에서 해당 날짜 값을 찾아 채움.
 *      - 누락이 있는 아이템만 API 호출(건강한 날엔 호출 0)
 *
 * 멱등하므로 매일 돌려도 안전하고, 같은 날 여러 번 돌려도 결과가 같다.
 *
 * 사용법: GET /api/cron/heal-prices  (선택: ?days=5)
 */

// 한 건의 외부 API 호출이 멈춰도 전체가 타임아웃되지 않도록 fetch 타임아웃 래퍼
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// 동시성 제한 배치 실행 (read-only fetch만 병렬 — 캐시 변경은 호출부에서 순차 처리)
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    out.push(...await Promise.all(chunk.map(fn)));
  }
  return out;
}

// API Date("2026-06-04T00:00:00") → "2026-06-04"
const statsDateKey = (d: string) => d.substring(0, 10);

export async function GET(request: Request) {
  // 인증 (다른 크론과 동일)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const HEAL_DAYS = Math.min(14, Math.max(1, Number(searchParams.get('days')) || 5));

  const summary: any = { auction: {}, market: {} };
  const errors: any[] = [];

  // ────────────────────────────────────────────────────────────
  // 1) 경매장 self-heal: 과거 미확정 버킷 확정 (멱등)
  // ────────────────────────────────────────────────────────────
  try {
    const committed = await rolloverAuctionDays(false);
    summary.auction = { committed };
    console.log(`[heal] 경매장 롤오버: ${committed}건 확정`);
  } catch (error: any) {
    errors.push({ stage: 'auction-rollover', error: error.message });
    console.error('[heal] 경매장 롤오버 실패:', error);
  }

  // ────────────────────────────────────────────────────────────
  // 2) 거래소 self-heal: 최근 N일 누락을 Stats에서 백필
  // ────────────────────────────────────────────────────────────
  try {
    const todayKey = formatDateKey(getLostArkDate());
    // 점검 대상 날짜 = 어제 ~ (어제-N+1)  ※ 오늘은 아직 확정 전이라 제외
    const expectedDates: string[] = [];
    for (let i = 1; i <= HEAL_DAYS; i++) {
      const [y, m, d] = todayKey.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() - i);
      expectedDates.push(formatDateKey(dt));
    }

    const history = await readHistorySnapshot();
    const marketItems = TRACKED_ITEMS.filter(it => it.type === 'market');

    // 누락 날짜가 있는 아이템만 추림
    const needFetch = marketItems
      .map(it => {
        const present = new Set((history[it.id] || []).map(e => e.date));
        const missing = expectedDates.filter(d => !present.has(d));
        return { item: it, missing };
      })
      .filter(x => x.missing.length > 0);

    console.log(`[heal] 거래소 누락 점검: ${needFetch.length}/${marketItems.length}개 아이템에 누락(최근 ${HEAL_DAYS}일)`);

    // 누락 아이템만 Stats 병렬 조회 (read-only)
    const fetched = await inBatches(needFetch, 6, async ({ item, missing }) => {
      try {
        const res = await fetchWithTimeout(
          `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
          { headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` } }
        );
        if (!res.ok) return { item, missing, stats: null as any, error: `HTTP ${res.status}` };
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return { item, missing, stats: null, error: 'no data' };
        for (const v of data) {
          if (v.Stats && v.Stats.length > 0 && v.Stats[0].AvgPrice > 0) {
            return { item, missing, stats: v.Stats as Array<{ Date: string; AvgPrice: number }>, error: null };
          }
        }
        return { item, missing, stats: null, error: 'no tradeable variant' };
      } catch (e: any) {
        return { item, missing, stats: null as any, error: e.message };
      }
    });

    // 채우기 (순차 — 캐시 변경)
    let filledCount = 0;
    const stillMissing: any[] = [];
    for (const r of fetched) {
      if (!r.stats) {
        stillMissing.push({ itemId: r.item.id, itemName: r.item.name, dates: r.missing, reason: r.error });
        continue;
      }
      const byDate = new Map(
        (r.stats as Array<{ Date: string; AvgPrice: number }>).map(s => [statsDateKey(s.Date), s.AvgPrice])
      );
      const remain: string[] = [];
      for (const date of r.missing) {
        const price = byDate.get(date);
        if (price && price > 0) {
          await saveHistoricalPrice(r.item.id, price, date, r.item.name);
          filledCount++;
          console.log(`[heal] 거래소 채움: ${r.item.name} ${date} = ${price}G`);
        } else {
          remain.push(date);
        }
      }
      if (remain.length > 0) {
        stillMissing.push({ itemId: r.item.id, itemName: r.item.name, dates: remain, reason: 'Stats에 해당 날짜 없음' });
      }
    }

    summary.market = {
      checkedDays: HEAL_DAYS,
      itemsWithGaps: needFetch.length,
      filled: filledCount,
      stillMissing: stillMissing.length > 0 ? stillMissing : undefined,
    };
  } catch (error: any) {
    errors.push({ stage: 'market-backfill', error: error.message });
    console.error('[heal] 거래소 백필 실패:', error);
  }

  // ────────────────────────────────────────────────────────────
  // 3) 변경분 업로드 (history 먼저 → latest 순서는 내부에서 보장)
  // ────────────────────────────────────────────────────────────
  let uploaded = false;
  try {
    await generateAndUploadPriceJson();
    uploaded = true;
  } catch (error: any) {
    errors.push({ stage: 'upload', error: error.message });
    console.error('[heal] 업로드 실패:', error);
  }

  // heal 은 history/latest 양쪽을 건드릴 수 있으므로 업로드 성공 시 두 태그 모두 퍼지
  if (uploaded) {
    await purgePriceCache([PRICE_CACHE_TAG.latest, PRICE_CACHE_TAG.history]);
  }

  return NextResponse.json({
    success: errors.length === 0,
    message: 'self-heal 완료',
    timestamp: new Date().toISOString(),
    summary,
    errors: errors.length > 0 ? errors : undefined,
  });
}
