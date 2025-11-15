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