// 패키지 가치 추이 — 과거 시세로 calculatePostEfficiency 를 날짜별로 재계산한다.
//
// 계산 함수들이 전부 "가격 맵"을 인자로 받는 순수 함수라, 히스토리를 날짜별 가격 맵으로
// 재조립해 그대로 넣으면 갤러리 효율과 동일한 지표의 시계열이 나온다 (계산 로직 중복 없음).
// 환율은 등록 시점 환율(post.goldPerWon) 고정 — 환율 시계열 데이터가 없다.
// firestore 의존이 없는 순수 모듈.

import { calculatePostEfficiency } from './package-shared';
import { toDateOnlyValue } from './package-sale';
import type { PackagePost } from '@/types/package';

export type PriceHistoryData = Record<string, Array<{ date: string; price: number }>>;

export type PackageValuePoint = {
  date: string; // YYYY-MM-DD (KST)
  /** 구성품 가치(골드). 3+1/2+1/3+보너스는 묶음 보정 포함 — calculatePostEfficiency 와 같은 기준 */
  gold: number;
  /** 등록 환율 기준 이득률(%). 등록 환율이 없으면 null (골드 축으로 대신 그린다) */
  benefitPct: number | null;
};

/** 한국 시간 오늘 날짜 키 — price-history-client 의 getLostArkDate 와 같은 규칙 */
export function kstTodayKey(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 패키지의 날짜별 가치 시계열.
 * - 시작일: 판매 시작일(출시일)이 있으면 그날, 없으면 등록일 (KST 날짜)
 * - 결측일은 직전 값으로 채우고(캐리포워드), 첫 데이터 이전 구간은 첫 값으로 채운다
 *   (신규 추적 아이템이 과거 구간에서 0으로 급락해 보이는 것 방지)
 * - 오늘 점은 latest(화면과 같은 시세)로 덮어 카드 숫자와 어긋나지 않게 한다
 */
export function buildPackageValueSeries(
  post: PackagePost,
  history: PriceHistoryData,
  latest: Record<string, number>,
  /**
   * 카드가 지금 쓰는 환율 — 넘기면 이 값으로 전 구간을 계산한다 (카드 숫자와 일치 보장).
   * 0 은 "환율 미적용"(카드도 % 를 숨기는 상태) — 골드 축으로 그린다.
   * 안 넘기면 카드 기본값과 같은 규칙(등록 환율 0.1원 반올림)으로 만든다.
   */
  goldPerWonOverride?: number,
): PackageValuePoint[] {
  const todayKey = kstTodayKey();
  const startDate =
    toDateOnlyValue(post.saleStartAt) || toDateOnlyValue(post.createdAt) || todayKey;

  // latest_prices.json 에는 _meta/_rawByDate 같은 비가격 키가 섞여 있다 — 숫자만 가격이다
  const latestNums: Record<string, number> = {};
  for (const [id, v] of Object.entries(latest)) {
    if (!id.startsWith('_') && typeof v === 'number') latestNums[id] = v;
  }

  const itemIds = Object.keys(history).filter(
    (id) => !id.startsWith('_') && Array.isArray(history[id]),
  );

  // 날짜 축: 전 아이템 히스토리 날짜의 합집합 + 오늘, 시작일 이후만
  const dateSet = new Set<string>([todayKey]);
  for (const id of itemIds) for (const e of history[id]) dateSet.add(e.date);
  const axis = [...dateSet].sort().filter((d) => d >= startDate && d <= todayKey);
  if (axis.length === 0) return [];

  // 아이템별로 축 위를 한 번 훑으며 채운다 (날짜별 이분 탐색 대신 포인터 워크)
  const filled: Record<string, Record<string, number>> = {};
  for (const id of itemIds) {
    const sorted = [...history[id]].sort((a, b) => a.date.localeCompare(b.date));
    const m: Record<string, number> = {};
    let i = 0;
    let last: number | undefined;
    for (const d of axis) {
      while (i < sorted.length && sorted[i].date <= d) {
        last = sorted[i].price;
        i += 1;
      }
      if (last !== undefined) m[d] = last;
      else if (sorted.length > 0) m[d] = sorted[0].price; // 첫 데이터 이전 — 첫 값 백필
    }
    if (latestNums[id] !== undefined) m[todayKey] = latestNums[id];
    filled[id] = m;
  }

  // 카드와 같은 환율로 계산한다 — 카드가 지금 쓰는 환율(입력칸 값)을 그대로 쓴다.
  // 원시 goldPerWon 을 그대로 쓰면 오늘 점의 이득률이 카드 숫자와 소수점 단위로 어긋난다
  // (카드는 "100골드당 원" 0.1 단위로 반올림된 표시값으로 계산하기 때문).
  const fallbackWonPer100 =
    post.goldPerWon && post.goldPerWon > 0 ? Math.round(1000 / post.goldPerWon) / 10 : 0;
  const goldPerWon =
    goldPerWonOverride !== undefined
      ? goldPerWonOverride
      : fallbackWonPer100 > 0
        ? 100 / fallbackWonPer100
        : 0;
  // 환율을 글에 직접 심는다 — calculatePostEfficiency 의 override 인자는 0(미적용)일 때
  // 등록 환율로 폴백해 버려서, 카드가 % 를 숨긴 상태와 어긋난다
  const effPost: PackagePost = { ...post, goldPerWon };
  const points: PackageValuePoint[] = [];
  for (const d of axis) {
    const prices: Record<string, number> = {};
    // 히스토리가 없는 시세 키(있다면)는 오늘 값으로 상수 취급 — 0으로 떨어뜨리는 것보단 낫다
    for (const [id, v] of Object.entries(latestNums)) prices[id] = v;
    for (const id of itemIds) {
      const v = filled[id][d];
      if (v !== undefined) prices[id] = v;
    }
    const eff = calculatePostEfficiency(effPost, prices);
    points.push({
      date: d,
      gold: eff * (post.royalCrystalPrice || 0),
      benefitPct: goldPerWon > 0 ? (eff / goldPerWon - 1) * 100 : null,
    });
  }
  return points;
}
