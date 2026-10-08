// 홈 "오늘의 시세" 서버 스냅샷 (서버 전용).
//
// 홈 대시보드는 원래 브라우저가 시세를 받아 그린 뒤에야 숫자가 보였다. 그래서 첫 화면은 스피너였고,
// JS 를 돌리지 않는 검색 봇(네이버 등)에는 시세가 하나도 안 보였다.
// app/page.tsx(ISR)가 이걸로 기본 목록 시세를 미리 계산해 PriceDashboard 에 넘긴다.
//
// 계산은 PriceDashboard 의 브라우저 계산과 같다:
// history_all.json 날짜별 종가 + 오늘(latest_prices.json)을 이어 붙이고, 마지막 값 vs 그 앞 값.

import { getAdminStorage } from './firebase-admin';
import type { DashboardPrice } from '@/components/PriceDashboard';

type HistoryAll = Record<string, Array<{ date: string; price: number }>>;

/** 로아 기준 오늘(KST 0시 기준) YYYY-MM-DD */
function kstDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export type HomePriceSnapshot = {
  prices: Record<string, DashboardPrice>;
  /** 대시보드 우측 "N월 N일 기준" 표기 */
  dateLabel: string;
};

export async function loadHomePriceSnapshot(itemIds: string[]): Promise<HomePriceSnapshot | null> {
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) return null;
    const bucket = getAdminStorage().bucket(bucketName);

    const [[latestBuf], [historyBuf]] = await Promise.all([
      bucket.file('latest_prices.json').download(),
      bucket.file('history_all.json').download(),
    ]);
    const latest = JSON.parse(latestBuf.toString()) as Record<string, unknown>;
    const history = JSON.parse(historyBuf.toString()) as HistoryAll;

    const todayKey = kstDateKey();
    const prices: Record<string, DashboardPrice> = {};

    for (const id of itemIds) {
      const entries = (history[id] || []).map((e) => ({ date: e.date, price: e.price }));
      const todayPrice = latest[id];
      if (typeof todayPrice === 'number' && !entries.some((e) => e.date === todayKey)) {
        entries.push({ date: todayKey, price: todayPrice });
      }
      if (entries.length === 0) continue;
      entries.sort((a, b) => a.date.localeCompare(b.date));

      const current = entries[entries.length - 1].price || 0;
      const previous = entries.length >= 2 ? entries[entries.length - 2].price || current : current;
      const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      prices[id] = { current, previous, change };
    }

    if (Object.keys(prices).length === 0) return null;

    const [, m, d] = todayKey.split('-').map(Number);
    return { prices, dateLabel: `${m}월 ${d}일` };
  } catch (error) {
    // 실패하면 예전처럼 브라우저가 받아 그린다 — 홈 렌더 자체를 막지 않는다
    console.error('[home-price-snapshot] 실패:', error);
    return null;
  }
}
