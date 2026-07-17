// ========================================
// 완갑 평균 시뮬 계산 (기대값 DP — 몬테카를로 아님)
// 실제 시뮬(WangapSimulator)과 완전히 동일한 확률 모델을 사용한다:
//  - 기본 확률: WANGAP_BASE_PROBABILITY (실패 시 +기본×10% 누적, 기본×2 상한)
//  - 장인의 기운: 최종확률/2.15 누적, 100% 도달 시 다음 시도 확정 성공
//  - 숨결 효과·재료 소모량·승급 비용: lib/wangapData 테이블 그대로
// → 실제 데이터 공개 시 wangapData 수치만 교체하면 두 시뮬에 동시 반영됨.
// 계산 방식은 재련 평균 시뮬과 동일한 결정론적 분포 계산 (lib/optimalBreath 참고)
// ========================================

import {
  WANGAP_BASE_PROBABILITY,
  WANGAP_MATERIAL_COSTS,
  WANGAP_JANGIN_DIVIDER,
  WANGAP_MAX_LEVEL,
  WANGAP_PROMOTION_COSTS,
  getWangapBreathEffect,
  type WangapGrade,
  type WangapOptMatKey,
} from './wangapData';

export type WangapCalcMode = 'median' | 'average' | 'pity';

// 숨결 사용 정책 (재련 평균 시뮬과 동일한 3모드): 미사용 / 풀숨 / 최적(시세·확률 기대비용 최소화)
export type WangapBreathMode = 'off' | 'full' | 'optimal';

export interface WangapAvgParams {
  startLevel: number;
  targetLevel: number;
  startGrade: WangapGrade;
  mode: WangapCalcMode;
  lavaMode: WangapBreathMode;
  glacierMode: WangapBreathMode;
  // 귀속 재료는 무료로 취급(최적 계산·비용 모두), 개당 시세는 기대비용 계산에 사용
  boundFlags: Record<WangapOptMatKey, boolean>;
  unitPrices: Record<WangapOptMatKey, number>;
}

export interface WangapAvgEnhanceRow {
  type: 'enhance';
  level: number;          // L → L+1
  grade: WangapGrade;     // 시도 당시 등급
  tries: number;          // 대표 시도 횟수 (average 모드는 소수)
  lava: number;
  glacier: number;
}

export interface WangapAvgPromotionRow {
  type: 'promotion';
  to: '유물' | '고대';
  level: number;          // 승급 시점 레벨
}

export type WangapAvgRow = WangapAvgEnhanceRow | WangapAvgPromotionRow;

// 키 구성은 components/wangap/wangapShared.ts의 WangapCostTotals와 동일 (구조적 호환)
export interface WangapAvgTotals {
  파괴석결정: number; 수호석결정: number; 위대한돌파석: number; 상급아비도스: number; 운명파편: number;
  실링: number; 골드: number; 용암: number; 빙하: number; 승급재료유물: number; 승급재료고대: number;
}

export interface WangapAvgResult {
  rows: WangapAvgRow[];
  totals: WangapAvgTotals;
  totalTries: number;
  promotionGold: number; // 승급으로 소모하는 골드 (누르는 골드에 포함된 값)
}

const GRADE_RANK: Record<WangapGrade, number> = { 전설: 0, 유물: 1, 고대: 2 };

// 해당 레벨에서 강화를 시도하려면 필요한 최소 등급 (15→16은 유물, 20→21은 고대)
const gradeAtLevel = (level: number): WangapGrade =>
  level >= 20 ? '고대' : level >= 15 ? '유물' : '전설';

// 한 시도에 사용할 숨결 개수 결정
// 최적 모드: 실제 시뮬 computeOptimalBreaths와 동일한 (1회 실비용/성공확률) 기대비용 최소화 그리디.
// 귀속 재료는 무료 취급 → 자연히 풀숨으로 수렴. 시세 미로딩(0G) 시에도 풀숨으로 수렴(재련과 동일한 폴백).
const chooseBreaths = (
  level: number,
  capped: number,
  params: WangapAvgParams,
): { lava: number; glacier: number } => {
  const base = WANGAP_BASE_PROBABILITY[level] ?? 0;
  const eff = getWangapBreathEffect(base);
  const fixedLava = params.lavaMode === 'full' ? eff.max : 0;
  const fixedGlacier = params.glacierMode === 'full' ? eff.max : 0;
  if (eff.max === 0 || (params.lavaMode !== 'optimal' && params.glacierMode !== 'optimal')) {
    return { lava: fixedLava, glacier: fixedGlacier };
  }

  const materialCost = WANGAP_MATERIAL_COSTS[level + 1];
  if (!materialCost) return { lava: fixedLava, glacier: fixedGlacier };

  const paidFor = (key: WangapOptMatKey, needed: number): number =>
    params.boundFlags[key] ? 0 : needed * (params.unitPrices[key] || 0);

  const baseCost =
    materialCost.골드 +
    paidFor('파괴석결정', materialCost.파괴석결정) +
    paidFor('수호석결정', materialCost.수호석결정) +
    paidFor('위대한돌파석', materialCost.위대한돌파석) +
    paidFor('상급아비도스', materialCost.상급아비도스) +
    paidFor('운명파편', materialCost.운명파편);

  const unitLava = params.boundFlags.용암 ? 0 : (params.unitPrices.용암 || 0);
  const unitGlacier = params.boundFlags.빙하 ? 0 : (params.unitPrices.빙하 || 0);
  const lavaMaxSearch = params.lavaMode === 'optimal' ? eff.max : fixedLava;
  const lavaMinSearch = params.lavaMode === 'optimal' ? 0 : fixedLava;
  const glacierMaxSearch = params.glacierMode === 'optimal' ? eff.max : fixedGlacier;
  const glacierMinSearch = params.glacierMode === 'optimal' ? 0 : fixedGlacier;

  let best = { lava: lavaMinSearch, glacier: glacierMinSearch };
  let bestExpected = Infinity;
  for (let l = lavaMinSearch; l <= lavaMaxSearch; l++) {
    for (let g = glacierMinSearch; g <= glacierMaxSearch; g++) {
      const p = Math.min(capped + (l + g) * eff.per, 1);
      if (p <= 0) continue;
      const expected = (baseCost + l * unitLava + g * unitGlacier) / p;
      if (expected < bestExpected - 1e-9) {
        bestExpected = expected;
        best = { lava: l, glacier: g };
      }
    }
  }
  return best;
};

// 한 단계(L → L+1)의 대표 시도 횟수·숨결 소모 (정확한 분포 계산)
const computeStep = (
  level: number,
  params: WangapAvgParams,
): { tries: number; lava: number; glacier: number } => {
  const base = WANGAP_BASE_PROBABILITY[level] ?? 0;
  if (base <= 0) return { tries: 0, lava: 0, glacier: 0 };
  const eff = getWangapBreathEffect(base);

  // 실패 확률 보너스는 k=11에서 2배 상한에 도달해 이후 일정 → 숨결 선택도 k별 캐시 가능
  const choiceCache: Array<{ lava: number; glacier: number } | undefined> = [];

  let jangin = 0, survive = 1, k = 0, lavaCum = 0, glacierCum = 0;
  const pk: number[] = [];
  const lavaAt: number[] = [];
  const glacierAt: number[] = [];

  while (survive > 1e-13 && k < 100000) {
    k++;
    const kIdx = Math.min(k, 11);
    let fp: number;
    let lava = 0, glacier = 0;
    if (jangin >= 1 - 1e-12) {
      fp = 1; // 장인의 기운 확정 성공 — 숨결 불필요
    } else {
      const capped = Math.min(base * (1 + 0.1 * (kIdx - 1)), base * 2);
      let c = choiceCache[kIdx];
      if (!c) {
        c = chooseBreaths(level, capped, params);
        choiceCache[kIdx] = c;
      }
      lava = c.lava;
      glacier = c.glacier;
      fp = Math.min(capped + (lava + glacier) * eff.per, 1);
    }
    lavaCum += lava;
    glacierCum += glacier;
    pk.push(survive * fp);
    lavaAt.push(lavaCum);
    glacierAt.push(glacierCum);
    jangin += fp / WANGAP_JANGIN_DIVIDER;
    survive *= 1 - fp;
    if (fp >= 1) break;
  }

  const n = pk.length;
  if (n === 0) return { tries: 0, lava: 0, glacier: 0 };

  if (params.mode === 'pity') {
    // 매번 장인의 기운 100%에서 성공하는 최악의 경우
    return { tries: n, lava: lavaAt[n - 1], glacier: glacierAt[n - 1] };
  }
  if (params.mode === 'average') {
    let tries = 0, lava = 0, glacier = 0;
    for (let i = 0; i < n; i++) {
      tries += pk[i] * (i + 1);
      lava += pk[i] * lavaAt[i];
      glacier += pk[i] * glacierAt[i];
    }
    return { tries, lava, glacier };
  }
  // median: 누적 성공 확률이 50%를 넘는 첫 시도
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += pk[i];
    if (cum >= 0.5) return { tries: i + 1, lava: lavaAt[i], glacier: glacierAt[i] };
  }
  return { tries: n, lava: lavaAt[n - 1], glacier: glacierAt[n - 1] };
};

export function computeWangapAverage(params: WangapAvgParams): WangapAvgResult {
  const rows: WangapAvgRow[] = [];
  const totals: WangapAvgTotals = {
    파괴석결정: 0, 수호석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 운명파편: 0,
    실링: 0, 골드: 0, 용암: 0, 빙하: 0, 승급재료유물: 0, 승급재료고대: 0,
  };
  let totalTries = 0;
  let promotionGold = 0;

  const start = Math.max(0, params.startLevel);
  const target = Math.min(params.targetLevel, WANGAP_MAX_LEVEL);
  let curGrade = params.startGrade;

  for (let level = start; level < target; level++) {
    // 등급 상한을 넘어가는 지점에서 승급 비용 합산 (전설→유물 +15, 유물→고대 +20)
    const required = gradeAtLevel(level);
    while (GRADE_RANK[required] > GRADE_RANK[curGrade]) {
      const next: '유물' | '고대' = curGrade === '전설' ? '유물' : '고대';
      const promoCost = WANGAP_PROMOTION_COSTS[next];
      totals[next === '유물' ? '승급재료유물' : '승급재료고대'] += promoCost.벨가르딘재료;
      totals.골드 += promoCost.골드;
      promotionGold += promoCost.골드;
      rows.push({ type: 'promotion', to: next, level });
      curGrade = next;
    }

    const step = computeStep(level, params);
    const mat = WANGAP_MATERIAL_COSTS[level + 1];
    if (mat) {
      totals.파괴석결정 += step.tries * mat.파괴석결정;
      totals.수호석결정 += step.tries * mat.수호석결정;
      totals.위대한돌파석 += step.tries * mat.위대한돌파석;
      totals.상급아비도스 += step.tries * mat.상급아비도스;
      totals.운명파편 += step.tries * mat.운명파편;
      totals.실링 += step.tries * mat.실링;
      totals.골드 += step.tries * mat.골드;
    }
    totals.용암 += step.lava;
    totals.빙하 += step.glacier;
    totalTries += step.tries;

    rows.push({ type: 'enhance', level, grade: curGrade, ...step });
  }

  return { rows, totals, totalTries, promotionGold };
}
