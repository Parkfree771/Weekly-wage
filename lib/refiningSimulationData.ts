import { SUCCESSION_BASE_PROBABILITY, getBreathEffect } from './refiningData';

const JANGIN_ACCUMULATE_DIVIDER = 2.15;

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

  // 숨결 효과 계산
  const breathEffect = getBreathEffect(baseProb);
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

// 계승 후 - 숨결 미사용
const SUCCESSION_CASE_1_AVG_TRIES: { [level: number]: number } = {
  11: 11.42, 12: 11.42,  // 5% 확률
  13: 13.77, 14: 13.77, 15: 13.77,  // 4% 확률
  16: 17.58, 17: 17.58, 18: 17.58,  // 3% 확률
  19: 32.36, 20: 32.36,  // 1.5% 확률
  21: 47.51, 22: 47.51,  // 1% 확률
  23: 91.56, 24: 91.56,  // 0.5% 확률
};

// 계승 후 - 숨결 사용
const SUCCESSION_CASE_2_AVG_TRIES: { [level: number]: number } = {
  11: 6.68, 12: 6.68,  // 5% → 10% (숨결 사용)
  13: 9.08, 14: 9.08, 15: 9.08,  // 4% → 8%
  16: 11.61, 17: 11.61, 18: 11.61,  // 3% → 6%
  19: 21.62, 20: 21.62,  // 1.5% → 3%
  21: 31.50, 22: 31.50,  // 1% → 2%
  23: 45.65, 24: 45.65,  // 0.5% → 1.5% (50개 × 0.02%)
};

/**
 * 계승 후 평균 시도 횟수 조회
 * @param level 현재 레벨 (11~24)
 * @param useBreath 숨결 사용 여부
 * @returns 평균 시도 횟수
 */
export const getSuccessionAverageTries = (level: number, useBreath: boolean): number => {
  if (useBreath) {
    return SUCCESSION_CASE_2_AVG_TRIES[level] || 0;
  } else {
    return SUCCESSION_CASE_1_AVG_TRIES[level] || 0;
  }
};

// ========================================
// 계승 전 (기존) 시뮬레이션 데이터
// ========================================

// 케이스별 평균 시도 횟수 데이터
// ① 기본 (숨결 X, 책 X)
const CASE_1_AVG_TRIES: { [level: number]: number } = {
  11: 6.65, 12: 6.67, 13: 11.39, 14: 11.46, 15: 13.72, 16: 13.78,
  17: 17.48, 18: 17.40, 19: 17.54, 20: 32.31, 21: 32.26, 22: 47.40,
  23: 47.06, 24: 91.08, 25: 91.65,
};

// ② 기본 + 숨결 (숨결 O, 책 X)
const CASE_2_AVG_TRIES: { [level: number]: number } = {
  11: 4.19, 12: 4.13, 13: 7.56, 14: 7.53, 15: 9.06, 16: 9.03,
  17: 11.53, 18: 11.68, 19: 11.63, 20: 21.60, 21: 21.60, 22: 31.34,
  23: 31.38, 24: 45.70, 25: 45.38,
};

// ③ 기본 + 숨결 + 책 (숨결 O, 책 O - 새 책 효과 적용)
const CASE_3_AVG_TRIES: { [level: number]: number } = {
  11: 3.01, 12: 3.05, 13: 5.59, 14: 5.60, 15: 6.70, 16: 6.74,
  17: 8.67, 18: 8.65, 19: 8.76, 20: 16.21, 21: 21.67, 22: 31.60,
  23: 31.75, 24: 45.87, 25: 45.84,
};

// ④ 기본 + 책 (숨결 X, 책 O - 새 책 효과 적용)
const CASE_4_AVG_TRIES: { [level: number]: number } = {
  11: 4.16, 12: 4.19, 13: 7.53, 14: 7.45, 15: 9.07, 16: 9.07,
  17: 11.64, 18: 11.62, 19: 11.59, 20: 21.72, 21: 32.24, 22: 46.89,
  23: 47.37, 24: 91.22, 25: 90.79,
};

export const getAverageTries = (level: number, useBreath: boolean, useBook: boolean): number => {
  if (useBreath && useBook) {
    return CASE_3_AVG_TRIES[level] || 0; // Case ③
  } else if (useBreath) {
    return CASE_2_AVG_TRIES[level] || 0; // Case ②
  } else if (useBook) {
    // 책 효과가 0인 레벨 처리 (21-25)
    if (level >= 21 && level <= 25) {
      return CASE_1_AVG_TRIES[level] || 0; // 책 효과가 없으므로 기본 케이스와 동일
    }
    return CASE_4_AVG_TRIES[level] || 0; // Case ④
  } else {
    return CASE_1_AVG_TRIES[level] || 0; // Case ①
  }
};