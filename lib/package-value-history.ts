// 패키지 가치 추이 — 과거 시세로 calculatePostEfficiency 를 날짜별로 재계산한다.
//
// 계산 함수들이 전부 "가격 맵"을 인자로 받는 순수 함수라, 히스토리를 날짜별 가격 맵으로
// 재조립해 그대로 넣으면 갤러리 효율과 동일한 지표의 시계열이 나온다 (계산 로직 중복 없음).
// 환율은 등록 시점 환율(post.goldPerWon) 고정 — 환율 시계열 데이터가 없다.
// firestore 의존이 없는 순수 모듈.
//
// 코어(buildDailyValues)는 "가격 맵 → 값" 콜백만 받는 범용 구조라, 일반 패키지
// (buildPackageValueSeries)와 아제나의 축복(buildAzenaValueSeries)이 같은
// 축·캐리포워드·오늘 덮어쓰기 규칙을 공유한다.

import {
  calculatePostEfficiency,
  pickTopNCandidateIds,
  getItemUnitPrice,
  getFixedGemSelectUnitPrice,
  FIXED_GEM_SELECT_ICON,
} from './package-shared';
import { toDateOnlyValue } from './package-sale';
import {
  AZENA_PRICE_WON,
  AZENA_SALE_START,
  calcAzenaBreakdown,
  type AzenaOptions,
} from './azena-blessing';
import type { PackagePost, PackageItem } from '@/types/package';

/** 차트의 지표 기준 — bundle: 3+1/2+1/3+보너스 묶음 보정 포함(정렬·기본), single: 1개 구매 */
export type ValueBasis = 'bundle' | 'single';

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
 * 날짜별 값 시계열의 공통 코어 — compute(그날의 가격 맵)를 축 위 모든 날짜에 대해 돌린다.
 * - 결측일은 직전 값으로 채우고(캐리포워드), 첫 데이터 이전 구간은 첫 값으로 채운다
 *   (신규 추적 아이템이 과거 구간에서 0으로 급락해 보이는 것 방지)
 * - 오늘 점은 latest(화면과 같은 시세)로 덮어 카드 숫자와 어긋나지 않게 한다
 * - 히스토리가 없는 시세 키는 오늘 값으로 상수 취급 — 0으로 떨어뜨리는 것보단 낫다
 */
function buildDailyValues(
  compute: (prices: Record<string, number>) => number,
  history: PriceHistoryData,
  latest: Record<string, number>,
  startDate: string,
): Array<{ date: string; value: number }> {
  const todayKey = kstTodayKey();

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

  const out: Array<{ date: string; value: number }> = [];
  for (const d of axis) {
    const prices: Record<string, number> = {};
    for (const [id, v] of Object.entries(latestNums)) prices[id] = v;
    for (const id of itemIds) {
      const v = filled[id][d];
      if (v !== undefined) prices[id] = v;
    }
    out.push({ date: d, value: compute(prices) });
  }
  return out;
}

/**
 * 선택형 구성품을 "오늘 시세 기준 최고 선택지"로 박제한다 — 추이 전용.
 * calculatePostEfficiency 는 날짜마다 그날 시세로 최고 선택지를 다시 고르는데, 그러면
 * 과거 구간에서 곡선이 "그날그날 갈아탄 가정"이 되어 읽기 애매하다. 차트는 뷰어가 지금
 * 고를 조합 하나를 고정해 두고 그 조합의 가치가 어떻게 움직였는지를 보여준다.
 * (오늘 점은 오늘 최고가 = 카드 숫자 그대로라 어긋나지 않는다)
 */
function lockItemChoices(
  item: PackageItem,
  today: Record<string, number>,
  goldPerWon: number,
): PackageItem {
  // 선택 상자: 오늘 시세 상위 N개 후보만 남긴다 → 어느 날짜든 "이 N개" 조합으로 계산된다
  if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
    const n = Math.max(1, item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1);
    const picked = new Set(pickTopNCandidateIds(item.choiceBoxCandidates, n, today));
    const kept = item.choiceBoxCandidates.filter((c) => picked.has(c.id));
    return { ...item, choiceBoxCandidates: kept, choiceBoxPickCount: kept.length };
  }
  // 선택(choice) 아이템: 오늘 시세 최고가 선택지 하나로 고정
  if (item.choiceOptions && item.choiceOptions.length > 0) {
    const isGemSelect = item.icon === FIXED_GEM_SELECT_ICON;
    const unitOf = (id: string, qty: number) =>
      isGemSelect
        ? getFixedGemSelectUnitPrice(id, today, goldPerWon)
        : getItemUnitPrice(id, today) * qty;
    let bestId = item.itemId;
    let best = unitOf(
      item.itemId,
      item.choiceOptions.find((c) => c.itemId === item.itemId)?.quantity ?? 1,
    );
    for (const c of item.choiceOptions) {
      const v = unitOf(c.itemId, c.quantity ?? 1);
      if (v > best) {
        best = v;
        bestId = c.itemId;
      }
    }
    const kept = item.choiceOptions.filter((c) => c.itemId === bestId);
    return {
      ...item,
      itemId: bestId,
      choiceOptions: kept.length > 0 ? kept : [{ itemId: bestId, name: item.name, quantity: 1 }],
    };
  }
  return item;
}

/**
 * 패키지의 날짜별 가치 시계열.
 * - 시작일: 판매 시작일(출시일)이 있으면 그날, 없으면 등록일 (KST 날짜)
 * - 선택형 구성품은 오늘 시세 기준 최고 선택지로 고정해서 그린다 (lockItemChoices)
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
  /** bundle(기본): 3+1/2+1/3+보너스 묶음 보정 포함 — 갤러리 효율순 정렬과 같은 기준. single: 1개 구매 */
  basis: ValueBasis = 'bundle',
): PackageValuePoint[] {
  const startDate =
    toDateOnlyValue(post.saleStartAt) || toDateOnlyValue(post.createdAt) || kstTodayKey();

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
  // 오늘 시세(카드와 같은 값)로 선택지를 박제할 때 쓸 가격 맵
  const todayNums: Record<string, number> = {};
  for (const [id, v] of Object.entries(latest)) {
    if (!id.startsWith('_') && typeof v === 'number') todayNums[id] = v;
  }

  // 환율을 글에 직접 심는다 — calculatePostEfficiency 의 override 인자는 0(미적용)일 때
  // 등록 환율로 폴백해 버려서, 카드가 % 를 숨긴 상태와 어긋난다
  const isBundleType =
    post.packageType === '3+1' || post.packageType === '2+1' || post.packageType === '3+보너스';
  const effPost: PackagePost = {
    ...post,
    goldPerWon,
    items: post.items.map((i) => lockItemChoices(i, todayNums, goldPerWon)),
    bonusItems: post.bonusItems?.map((i) => lockItemChoices(i, todayNums, goldPerWon)),
    // 1개 구매 기준: 묶음 배수(4/3·3/2)와 3+보너스의 보너스분을 뺀 순수 1회 구매 가치
    ...(basis === 'single' && isBundleType
      ? { packageType: '일반' as const, bonusItems: undefined }
      : {}),
  };

  return buildDailyValues(
    (prices) => calculatePostEfficiency(effPost, prices),
    history,
    latest,
    startDate,
  ).map(({ date, value: eff }) => ({
    date,
    gold: eff * (post.royalCrystalPrice || 0),
    benefitPct: goldPerWon > 0 ? (eff / goldPerWon - 1) * 100 : null,
  }));
}

/** 아제나 판매 시작일('YY.MM.DD') → YYYY-MM-DD */
function azenaSaleStartKey(): string {
  const [y, m, d] = AZENA_SALE_START.split('.');
  return `20${y}-${m}-${d}`;
}

/**
 * 아제나의 축복 날짜별 가치 시계열 — 카드의 calcAzenaBreakdown 을 과거 시세로 재계산.
 * 환율·옵션(티어·공명·휴게·PC방)은 카드의 현재 상태 고정 — 오늘 점 = 카드 기대 효율 일치.
 */
export function buildAzenaValueSeries(
  history: PriceHistoryData,
  latest: Record<string, number>,
  goldPerWon: number,
  options: AzenaOptions,
): PackageValuePoint[] {
  const cashGold = AZENA_PRICE_WON * goldPerWon;
  return buildDailyValues(
    (prices) => calcAzenaBreakdown(prices, goldPerWon, options).totalGold,
    history,
    latest,
    azenaSaleStartKey(),
  ).map(({ date, value: gold }) => ({
    date,
    gold,
    benefitPct: cashGold > 0 ? (gold / cashGold - 1) * 100 : null,
  }));
}
