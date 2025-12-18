/**
 * 로스트아크 주간 골드 랭킹 계산 유틸리티
 *
 * 965,987개의 캐릭터 분포 데이터 기반
 */

/**
 * 골드 랭킹 벤치마크 테이블 (더보기 사용 가정)
 * [골드, 상위 퍼센트]
 * 선형 보간법으로 구간 사이 값을 정밀하게 계산
 */
const GOLD_RANKING_BENCHMARKS_WITH_MORE: [number, number][] = [
  [545520, 0.01],  // 상위 0.01% (All 1730+ 천상계)
  [453420, 7.6],   // 상위 7.6% (본캐 1730+ 선발대)
  [439200, 15.0],  // 상위 15.0% (본캐 1710+ 상위권)
  [350000, 23.9],  // 상위 23.9% (본캐 1700+ T4 진입)
  [185000, 40.0],  // 상위 40.0% (본캐 1690+ 허리)
  [155400, 60.5],  // 상위 60.5% (본캐 1680+ 평균)
  [0, 100]         // 상위 100% (입문)
];

/**
 * 골드 랭킹 벤치마크 테이블 (더보기 미사용 가정 - Full Reward)
 * [골드, 상위 퍼센트]
 * 선형 보간법으로 구간 사이 값을 정밀하게 계산
 */
const GOLD_RANKING_BENCHMARKS_WITHOUT_MORE: [number, number][] = [
  [726000, 0.01],  // 상위 0.01% (All 1730+)
  [536000, 7.6],   // 상위 7.6% (본캐 1730 선발대)
  [515000, 15.0],  // 상위 15.0% (본캐 1710 상위권)
  [360500, 23.9],  // 상위 23.9% (본캐 1700 T4 진입)
  [191500, 40.0],  // 상위 40.0% (본캐 1690 중위권)
  [185000, 60.5],  // 상위 60.5% (본캐 1680 평균)
  [0, 100]         // 상위 100% (입문)
];

/**
 * 선형 보간법을 사용하여 상위 퍼센트 정밀 계산
 *
 * @param userGold 사용자의 주간 골드 총합
 * @param hasMoreReward 더보기 보상 사용 여부 (true: 더보기 사용, false: 미사용)
 * @returns 상위 퍼센트 (정밀한 계산, 1골드 차이도 반영)
 */
export function calculateRanking(userGold: number, hasMoreReward: boolean = true): number {
  // 음수 골드는 100%로 처리
  if (userGold <= 0) {
    return 100;
  }

  // 더보기 사용 여부에 따라 벤치마크 선택
  const benchmarks = hasMoreReward
    ? GOLD_RANKING_BENCHMARKS_WITH_MORE
    : GOLD_RANKING_BENCHMARKS_WITHOUT_MORE;

  // 최고 랭킹보다 높으면 0.01% 반환 (더 정밀한 최상위)
  if (userGold >= benchmarks[0][0]) {
    return 0.01;
  }

  // 선형 보간법으로 정밀한 퍼센트 계산
  for (let i = 0; i < benchmarks.length - 1; i++) {
    const [upperGold, upperPercent] = benchmarks[i];
    const [lowerGold, lowerPercent] = benchmarks[i + 1];

    // 현재 구간에 속하는 경우
    if (userGold >= lowerGold && userGold <= upperGold) {
      /**
       * 선형 보간 공식 (Linear Interpolation)
       *
       * 전체 골드 범위 = upperGold - lowerGold
       * 전체 퍼센트 범위 = lowerPercent - upperPercent
       * 사용자 위치 비율 = (userGold - lowerGold) / 전체 골드 범위
       * 최종 퍼센트 = lowerPercent - (전체 퍼센트 범위 * 사용자 위치 비율)
       *
       * 이렇게 하면 1골드 차이도 정확히 반영됨
       */
      const totalGoldRange = upperGold - lowerGold;
      const totalPercentRange = lowerPercent - upperPercent;
      const userPositionRatio = (userGold - lowerGold) / totalGoldRange;
      const percentile = lowerPercent - (totalPercentRange * userPositionRatio);

      // 소수점 4자리까지 정밀하게 반올림하여 반환
      return Math.round(percentile * 10000) / 10000;
    }
  }

  // 최하위
  return 100;
}

/**
 * 랭킹에 따른 코멘트 반환
 *
 * @param percentile 상위 퍼센트
 * @returns 랭킹 코멘트
 */
export function getRankingComment(percentile: number): string {
  if (percentile <= 0.1) {
    return "전체 유저 상위 0.1% 천상계";
  } else if (percentile <= 7.6) {
    return "1730+ 본캐 선발대 유저";
  } else if (percentile <= 15.0) {
    return "1710+ 본캐 상위권 유저";
  } else if (percentile <= 23.9) {
    return "1700+ 본캐 T4 진입";
  } else if (percentile <= 40.0) {
    return "1690+ 본캐 중상위권";
  } else if (percentile <= 60.5) {
    return "1680+ 본캐 평균 유저";
  } else {
    return "꾸준한 성장 단계";
  }
}

/**
 * 랭킹 등급 반환
 *
 * @param percentile 상위 퍼센트
 * @returns 등급 (S+, S, A+, A, B, C, D)
 */
export function getRankingGrade(percentile: number): string {
  if (percentile <= 0.01) return "S+";
  if (percentile <= 7.6) return "S";
  if (percentile <= 15.0) return "A+";
  if (percentile <= 23.9) return "A";
  if (percentile <= 40.0) return "B+";
  if (percentile <= 60.5) return "B";
  if (percentile <= 80) return "C";
  return "D";
}

/**
 * 랭킹 뱃지 색상 반환
 *
 * @param percentile 상위 퍼센트
 * @returns Bootstrap 색상 클래스
 */
export function getRankingColor(percentile: number): string {
  if (percentile <= 0.01) return "danger";     // 빨강 (최상위)
  if (percentile <= 7.6) return "warning";     // 주황
  if (percentile <= 15.0) return "info";       // 파랑
  if (percentile <= 23.9) return "primary";    // 진한 파랑
  if (percentile <= 60.5) return "success";    // 초록
  return "secondary";                          // 회색
}
