import { SUCCESSION_BASE_PROBABILITY, getBreathEffect, getSuccessionBreathEffect } from './refiningData';

const JANGIN_ACCUMULATE_DIVIDER = 2.15;

// ========================================
// 계산 모드 타입
// ========================================
export type CalcMode = 'median' | 'average' | 'pity';

// ========================================
// 계승 후 시뮬레이션 함수
// ========================================

/**
 * 계승 후 강화 시뮬레이션 (단일 시도)
 * @param baseProb 기본 확률
 * @param useBreath 숨결 사용 여부
 * @returns 성공까지 필요한 시도 횟수
 */
function simulateSuccessionRefining(baseProb: number, useBreath: boolean): number {
  let jangin = 0; // 장인의 기운
  let currentProb = baseProb; // 현재 확률 (실패 시 증가)
  let tries = 0;

  // 숨결 효과 계산 (계승 후용 테이블 사용)
  const breathEffect = getSuccessionBreathEffect(baseProb);
  const breathProb = useBreath ? breathEffect.max * breathEffect.per : 0;

  while (true) {
    tries++;

    // 장인의 기운 100% 도달 시 무조건 성공
    if (jangin >= 1) {
      return tries;
    }

    // 최종 확률 계산: currentProb + breathProb (최대 100%)
    const finalProb = Math.min(currentProb + breathProb, 1);

    // 성공 판정
    if (Math.random() < finalProb) {
      return tries;
    }

    // 실패 시 처리
    // 1. 장인의 기운 누적: jangin += (prob / 2.15)
    jangin += finalProb / JANGIN_ACCUMULATE_DIVIDER;

    // 2. 실패 시 기본 확률 증가: +10%, 최대 2배
    currentProb = Math.min(currentProb + baseProb * 0.1, baseProb * 2);
  }
}

/**
 * 계승 후 평균 시도 횟수 계산 (몬테카를로 시뮬레이션)
 * @param baseProb 기본 확률
 * @param useBreath 숨결 사용 여부
 * @param iterations 시뮬레이션 반복 횟수
 * @returns 평균 시도 횟수
 */
function calculateSuccessionAvgTries(baseProb: number, useBreath: boolean, iterations: number = 100000): number {
  let totalTries = 0;
  for (let i = 0; i < iterations; i++) {
    totalTries += simulateSuccessionRefining(baseProb, useBreath);
  }
  return totalTries / iterations;
}

// ========================================
// 계승 후 시뮬레이션 결과 데이터 (사전 계산됨)
// 레벨 키는 "현재 레벨" (예: 11 = 11→12 강화)
// ========================================

// 계승 후 - 숨결 미사용 (평균)
const SUCCESSION_CASE_1_AVG_TRIES: { [level: number]: number } = {
  11: 11.42, 12: 11.42,  // 5% 확률
  13: 13.77, 14: 13.77, 15: 13.77,  // 4% 확률
  16: 17.58, 17: 17.58, 18: 17.58,  // 3% 확률
  19: 32.36, 20: 32.36,  // 1.5% 확률
  21: 47.51, 22: 47.51,  // 1% 확률
  23: 91.56, 24: 91.56,  // 0.5% 확률
};

// 계승 후 - 숨결 사용 (평균)
const SUCCESSION_CASE_2_AVG_TRIES: { [level: number]: number } = {
  11: 7.53, 12: 7.53,  // 5% + 숨결 5% = 10%
  13: 9.08, 14: 9.08, 15: 9.08,  // 4% + 숨결 4% = 8%
  16: 11.61, 17: 11.61, 18: 11.61,  // 3% + 숨결 3% = 6%
  19: 21.62, 20: 21.62,  // 1.5% + 숨결 1.5% = 3%
  21: 31.50, 22: 31.50,  // 1% + 숨결 1% = 2%
  23: 45.65, 24: 45.65,  // 0.5% + 숨결 1% = 1.5% (50개 × 0.02%)
};

// 계승 후 - 숨결 미사용 (중앙값)
const SUCCESSION_CASE_1_MEDIAN_TRIES: { [level: number]: number } = {
  11: 10, 12: 10,   // 5%
  13: 12, 14: 12, 15: 12,  // 4%
  16: 15, 17: 15, 18: 15,  // 3%
  19: 26, 20: 26,   // 1.5%
  21: 38, 22: 38,   // 1%
  23: 72, 24: 72,   // 0.5%
};

// 계승 후 - 숨결 사용 (중앙값)
const SUCCESSION_CASE_2_MEDIAN_TRIES: { [level: number]: number } = {
  11: 6, 12: 6,     // 5% + 숨결
  13: 8, 14: 8, 15: 8,    // 4% + 숨결
  16: 10, 17: 10, 18: 10,  // 3% + 숨결
  19: 17, 20: 17,   // 1.5% + 숨결
  21: 25, 22: 25,   // 1% + 숨결
  23: 36, 24: 36,   // 0.5% + 숨결
};

// 계승 후 - 숨결 미사용 (장기백)
const SUCCESSION_CASE_1_PITY_TRIES: { [level: number]: number } = {
  11: 26, 12: 26,   // 5%
  13: 31, 14: 31, 15: 31,  // 4%
  16: 40, 17: 40, 18: 40,  // 3%
  19: 76, 20: 76,   // 1.5%
  21: 112, 22: 112, // 1%
  23: 219, 24: 219, // 0.5%
};

// 계승 후 - 숨결 사용 (장기백)
const SUCCESSION_CASE_2_PITY_TRIES: { [level: number]: number } = {
  11: 18, 12: 18,   // 5% + 숨결
  13: 21, 14: 21, 15: 21,  // 4% + 숨결
  16: 27, 17: 27, 18: 27,  // 3% + 숨결
  19: 51, 20: 51,   // 1.5% + 숨결
  21: 75, 22: 75,   // 1% + 숨결
  23: 110, 24: 110, // 0.5% + 숨결
};

/**
 * 계승 후 시도 횟수 조회 (모드별)
 */
export const getSuccessionTries = (level: number, useBreath: boolean, mode: CalcMode = 'median'): number => {
  if (useBreath) {
    if (mode === 'pity') return SUCCESSION_CASE_2_PITY_TRIES[level] || 0;
    if (mode === 'average') return SUCCESSION_CASE_2_AVG_TRIES[level] || 0;
    return SUCCESSION_CASE_2_MEDIAN_TRIES[level] || 0;
  } else {
    if (mode === 'pity') return SUCCESSION_CASE_1_PITY_TRIES[level] || 0;
    if (mode === 'average') return SUCCESSION_CASE_1_AVG_TRIES[level] || 0;
    return SUCCESSION_CASE_1_MEDIAN_TRIES[level] || 0;
  }
};

/** @deprecated getSuccessionTries 사용 권장 */
export const getSuccessionAverageTries = (level: number, useBreath: boolean): number => {
  return getSuccessionTries(level, useBreath, 'average');
};

// ========================================
// 계승 전 (기존) 시뮬레이션 데이터
// ========================================

// ① 기본 (숨결 X, 책 X) - 평균
const CASE_1_AVG_TRIES: { [level: number]: number } = {
  11: 6.65, 12: 6.67, 13: 11.39, 14: 11.46, 15: 13.72, 16: 13.78,
  17: 17.48, 18: 17.40, 19: 17.54, 20: 32.31, 21: 32.26, 22: 47.40,
  23: 47.06, 24: 91.08, 25: 91.65,
};

// ② 숨결 O, 책 X - 평균
const CASE_2_AVG_TRIES: { [level: number]: number } = {
  11: 4.19, 12: 4.13, 13: 7.56, 14: 7.53, 15: 9.06, 16: 9.03,
  17: 11.53, 18: 11.68, 19: 11.63, 20: 21.60, 21: 21.60, 22: 31.34,
  23: 31.38, 24: 45.70, 25: 45.38,
};

// ③ 숨결 O, 책 O - 평균
const CASE_3_AVG_TRIES: { [level: number]: number } = {
  11: 3.01, 12: 3.05, 13: 5.59, 14: 5.60, 15: 6.70, 16: 6.74,
  17: 8.67, 18: 8.65, 19: 8.76, 20: 16.21, 21: 21.67, 22: 31.60,
  23: 31.75, 24: 45.87, 25: 45.84,
};

// ④ 숨결 X, 책 O - 평균
const CASE_4_AVG_TRIES: { [level: number]: number } = {
  11: 4.16, 12: 4.19, 13: 7.53, 14: 7.45, 15: 9.07, 16: 9.07,
  17: 11.64, 18: 11.62, 19: 11.59, 20: 21.72, 21: 32.24, 22: 46.89,
  23: 47.37, 24: 91.22, 25: 90.79,
};

// ① 기본 (숨결 X, 책 X) - 중앙값
const CASE_1_MEDIAN_TRIES: { [level: number]: number } = {
  11: 6, 12: 6, 13: 10, 14: 10, 15: 12, 16: 12,
  17: 15, 18: 15, 19: 15, 20: 26, 21: 26, 22: 38,
  23: 38, 24: 72, 25: 72,
};

// ② 숨결 O, 책 X - 중앙값
const CASE_2_MEDIAN_TRIES: { [level: number]: number } = {
  11: 3, 12: 3, 13: 6, 14: 6, 15: 8, 16: 8,
  17: 10, 18: 10, 19: 10, 20: 17, 21: 17, 22: 25,
  23: 25, 24: 36, 25: 36,
};

// ③ 숨결 O, 책 O - 중앙값
const CASE_3_MEDIAN_TRIES: { [level: number]: number } = {
  11: 2, 12: 2, 13: 5, 14: 5, 15: 6, 16: 6,
  17: 7, 18: 7, 19: 7, 20: 13, 21: 17, 22: 25,
  23: 25, 24: 36, 25: 36,
};

// ④ 숨결 X, 책 O - 중앙값
const CASE_4_MEDIAN_TRIES: { [level: number]: number } = {
  11: 3, 12: 3, 13: 6, 14: 6, 15: 8, 16: 8,
  17: 10, 18: 10, 19: 10, 20: 17, 21: 26, 22: 38,
  23: 38, 24: 72, 25: 72,
};

// ① 기본 (숨결 X, 책 X) - 장기백
const CASE_1_PITY_TRIES: { [level: number]: number } = {
  11: 15, 12: 15, 13: 26, 14: 26, 15: 31, 16: 31,
  17: 40, 18: 40, 19: 40, 20: 76, 21: 76, 22: 112,
  23: 112, 24: 219, 25: 219,
};

// ② 숨결 O, 책 X - 장기백
const CASE_2_PITY_TRIES: { [level: number]: number } = {
  11: 10, 12: 10, 13: 18, 14: 18, 15: 21, 16: 21,
  17: 27, 18: 27, 19: 27, 20: 51, 21: 51, 22: 75,
  23: 75, 24: 110, 25: 110,
};

// ③ 숨결 O, 책 O - 장기백
const CASE_3_PITY_TRIES: { [level: number]: number } = {
  11: 8, 12: 8, 13: 14, 14: 14, 15: 16, 16: 16,
  17: 21, 18: 21, 19: 21, 20: 39, 21: 51, 22: 75,
  23: 75, 24: 110, 25: 110,
};

// ④ 숨결 X, 책 O - 장기백
const CASE_4_PITY_TRIES: { [level: number]: number } = {
  11: 10, 12: 10, 13: 18, 14: 18, 15: 21, 16: 21,
  17: 27, 18: 27, 19: 27, 20: 51, 21: 76, 22: 112,
  23: 112, 24: 219, 25: 219,
};

/**
 * 계승 전 시도 횟수 조회 (모드별)
 */
export const getTries = (level: number, useBreath: boolean, useBook: boolean, mode: CalcMode = 'median'): number => {
  // 책 효과가 0인 레벨 처리 (21-25)
  const effectiveBook = useBook && level <= 20;

  if (useBreath && effectiveBook) {
    if (mode === 'pity') return CASE_3_PITY_TRIES[level] || 0;
    if (mode === 'average') return CASE_3_AVG_TRIES[level] || 0;
    return CASE_3_MEDIAN_TRIES[level] || 0;
  } else if (useBreath) {
    if (mode === 'pity') return CASE_2_PITY_TRIES[level] || 0;
    if (mode === 'average') return CASE_2_AVG_TRIES[level] || 0;
    return CASE_2_MEDIAN_TRIES[level] || 0;
  } else if (effectiveBook) {
    if (mode === 'pity') return CASE_4_PITY_TRIES[level] || 0;
    if (mode === 'average') return CASE_4_AVG_TRIES[level] || 0;
    return CASE_4_MEDIAN_TRIES[level] || 0;
  } else {
    if (mode === 'pity') return CASE_1_PITY_TRIES[level] || 0;
    if (mode === 'average') return CASE_1_AVG_TRIES[level] || 0;
    return CASE_1_MEDIAN_TRIES[level] || 0;
  }
};

/** @deprecated getTries 사용 권장 */
export const getAverageTries = (level: number, useBreath: boolean, useBook: boolean): number => {
  return getTries(level, useBreath, useBook, 'average');
};
