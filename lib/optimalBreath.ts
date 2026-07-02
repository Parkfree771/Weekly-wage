// 재련 "최적 숨결(앞 N회만 풀숨)" 계산 (계승 전·후 공용)
// 장인의 기운은 실패할 때마다 finalProb/2.15씩 결정론적으로 쌓이므로
// 확률 분포를 정확히(DP) 구할 수 있다. 몬테카를로 아님.
// 책(계승 전 11~20)은 기본확률 +100% "가산" 보너스 — 실패 누적(+10%)·상한(2배)에는
// 미적용. lib/refiningSimulationData의 CASE 테이블 전 구간과 일치 검증됨.

import type { CalcMode } from './refiningSimulationData';

const DIV = 2.15;

export interface BreathEffect { max: number; per: number }

export interface OptimalPolicy {
  optimalN: number;              // 앞 N회까지 풀숨 (Infinity 아님, 정수)
  tries: number;                 // 해당 모드 대표 시도 횟수
  breaths: number;               // 해당 모드 대표 숨결 소모 개수
  kind: 'none' | 'full' | 'partial'; // 노숨 / 풀숨 / 부분(앞N회)
}

// 계승 전: 숨결 N회 + 책 사용 여부까지 포함한 정책
export interface PreSuccessionPolicy extends OptimalPolicy {
  useBook: boolean; // 책 사용이 이득인가 (책 소모 수 = tries)
}

// 정책 N(앞 N회 풀숨)에 대한 시도 분포 정확 계산. bookProb = 책 가산 확률(항상 적용)
function distribution(baseProb: number, be: BreathEffect, N: number, bookProb: number) {
  const bprob = be.max * be.per;
  let jangin = 0, survive = 1, k = 0, breathed = 0;
  const pk: number[] = [];
  const breathedCum: number[] = [];
  while (survive > 1e-13 && k < 100000) {
    k++;
    const cur = Math.min(baseProb * (1 + 0.1 * (k - 1)), baseProb * 2);
    let fp: number, used: boolean;
    if (jangin >= 1 - 1e-12) {
      fp = 1; used = false; // 장인의 기운 100% 보장 성공 (숨결 불필요)
    } else {
      const b = k <= N ? bprob : 0;
      fp = Math.min(cur + b + bookProb, 1);
      used = k <= N;
    }
    if (used) breathed++;
    breathedCum.push(breathed);
    pk.push(survive * fp);
    jangin += fp / DIV;
    survive *= (1 - fp);
    if (fp >= 1) break;
  }
  return { pk, breathedCum };
}

// 모드별 (시도, 숨결) 대표값
function metricsForN(baseProb: number, be: BreathEffect, N: number, mode: CalcMode, bookProb: number = 0) {
  const { pk, breathedCum } = distribution(baseProb, be, N, bookProb);
  const bcount = be.max;
  if (mode === 'pity') {
    const k = pk.length;
    return { tries: k, breaths: breathedCum[k - 1] * bcount };
  }
  if (mode === 'average') {
    let eT = 0, eB = 0;
    for (let i = 0; i < pk.length; i++) {
      eT += pk[i] * (i + 1);
      eB += pk[i] * breathedCum[i] * bcount;
    }
    return { tries: eT, breaths: eB };
  }
  // median
  let c = 0, mk = pk.length;
  for (let i = 0; i < pk.length; i++) {
    c += pk[i];
    if (c >= 0.5) { mk = i + 1; break; }
  }
  return { tries: mk, breaths: breathedCum[mk - 1] * bcount };
}

/**
 * 최적 숨결 정책 계산 (현재 시세 기준 총 골드 최소화)
 * @param baseProb 기본 확률
 * @param be 숨결 효과(max, per)
 * @param matGoldPerTry 1회당 재료 골드값 (재료 시세 합 + 누골, 숨결 제외)
 * @param breathUnitPrice 숨결 1개 시세
 * @param mode 중앙값/평균값/장기백
 */
export function optimalBreath(
  baseProb: number,
  be: BreathEffect,
  matGoldPerTry: number,
  breathUnitPrice: number,
  mode: CalcMode
): OptimalPolicy {
  const full = metricsForN(baseProb, be, 100000, mode);

  // 숨결 효과 없거나 시세 미로딩 시 풀숨으로 폴백
  if (!be || be.max === 0 || breathUnitPrice <= 0 || matGoldPerTry <= 0) {
    return { optimalN: 100000, tries: full.tries, breaths: full.breaths, kind: 'full' };
  }

  let best: { N: number; cost: number; tries: number; breaths: number } | null = null;
  for (let N = 0; N <= 250; N++) {
    const m = metricsForN(baseProb, be, N, mode);
    const cost = m.tries * matGoldPerTry + m.breaths * breathUnitPrice;
    if (best === null || cost < best.cost - 1e-6) best = { N, cost, tries: m.tries, breaths: m.breaths };
  }
  const b = best!;
  let kind: OptimalPolicy['kind'];
  if (b.N === 0) kind = 'none';
  else if (Math.abs(b.breaths - full.breaths) < 1e-6) kind = 'full';
  else kind = 'partial';
  return { optimalN: b.N, tries: b.tries, breaths: b.breaths, kind };
}

/**
 * 계승 전 최적 정책 계산: 숨결(앞 N회) × 책 사용 여부를 함께 탐색해 총 골드 최소화
 * @param bookProb 책 가산 확률 (= 기본확률, 책 미지원 레벨이면 0)
 * @param bookUnitPrice 책 1권 시세 (0이면 책 선택지 제외)
 * @param bookMode 'auto' = 책 사용 여부도 최적화, 'on'/'off' = 책 상태 고정(사용자 토글 조건부)
 * @returns 시세 미로딩 시 null (호출부는 수동 설정 경로로 폴백)
 */
export function optimalBreathWithBook(
  baseProb: number,
  be: BreathEffect,
  bookProb: number,
  matGoldPerTry: number,
  breathUnitPrice: number,
  bookUnitPrice: number,
  mode: CalcMode,
  bookMode: 'auto' | 'on' | 'off' = 'auto'
): PreSuccessionPolicy | null {
  if (!be || breathUnitPrice <= 0 || matGoldPerTry <= 0) return null;

  const bookAvailable = bookProb > 0 && bookUnitPrice > 0;
  const bookChoices = !bookAvailable ? [false]
    : bookMode === 'on' ? [true]
    : bookMode === 'off' ? [false]
    : [false, true];
  let best: { useBook: boolean; N: number; cost: number; tries: number; breaths: number } | null = null;
  for (const useBook of bookChoices) {
    const bp = useBook ? bookProb : 0;
    const perTry = matGoldPerTry + (useBook ? bookUnitPrice : 0); // 책은 1회당 1권
    for (let N = 0; N <= 250; N++) {
      const m = metricsForN(baseProb, be, N, mode, bp);
      const cost = m.tries * perTry + m.breaths * breathUnitPrice;
      if (best === null || cost < best.cost - 1e-6) best = { useBook, N, cost, tries: m.tries, breaths: m.breaths };
    }
  }
  const b = best!;
  const full = metricsForN(baseProb, be, 100000, mode, b.useBook ? bookProb : 0);
  let kind: OptimalPolicy['kind'];
  if (b.N === 0) kind = 'none';
  else if (Math.abs(b.breaths - full.breaths) < 1e-6) kind = 'full';
  else kind = 'partial';
  return { optimalN: b.N, tries: b.tries, breaths: b.breaths, kind, useBook: b.useBook };
}
