/**
 * 로스트아크 주간 골드 랭킹 계산 유틸리티
 *
 * 원정대 6캐릭터 총합 기준 / 1660 미만 캐릭터는 배럭 계산에서 제외
 */

/**
 * 골드 랭킹 벤치마크 테이블 (더보기 미사용 - Full Reward)
 * [골드, 상위 퍼센트]
 * 선형 보간법으로 구간 사이 값을 정밀하게 계산
 */
const GOLD_RANKING_BENCHMARKS: [number, number][] = [
  [888000, 0.1],   // 상위 0.1% [신계] 서버 랭커 라인 (1760+ 1캐릭 + 1740+ 5캐릭)
  [838000, 1],     // 상위 1% [최상위] 이론적 한계치 (1750 1캐릭 + 1730 5캐릭)
  [738000, 3],     // 상위 3% [상위권] 과도기 랭커 (1740 1캐릭 + 1720 5캐릭)
  [688000, 5],     // 상위 5% [선발대] 고효율 랭커 (1740 1캐릭 + 1710 5캐릭)
  [550000, 7],     // 상위 7% 성장 과도기 (1730 1캐릭 + 1700대 혼합)
  [415500, 10],    // 상위 10% [고인물] 가장 두터운 층 (1730 1캐릭 + 1680 5캐릭)
  [385500, 15],    // 상위 15% [준상위] 탄탄한 배럭 라인 (1710 1캐릭 + 1680 5캐릭)
  [320000, 20],    // 상위 20% 6캐릭 미완성 (1700 1캐릭 + 1680 4~5캐릭)
  [191500, 30],    // 상위 30% [T4 진입] 효율 중시형 (1690 1캐릭 + 1660 5캐릭)
  [166500, 40],    // 상위 40% 소수 정예 운영 (1680 1캐릭 + 1660 4캐릭)
  [133200, 50],    // 상위 50% [중위값] 전체 유저의 딱 절반 (1680 1캐릭 + 1660 3캐릭)
  [107000, 60],    // 상위 60% 3캐릭 골드 수급 (1680 1캐릭 + 1660 2캐릭)
  [81000, 70],     // 상위 70% 라이트 유저 (1670 1캐릭 + 1660 2캐릭)
  [55500, 80],     // 상위 80% 원캐릭 유저 (1680 1캐릭)
  [25900, 90],     // 상위 90% 데이터상 최하위 그룹 (1660 1캐릭)
  [0, 100]         // 상위 100% 모집단 마지노선
];

/**
 * 선형 보간법을 사용하여 상위 퍼센트 정밀 계산
 *
 * @param userGold 사용자의 주간 골드 총합
 * @returns 상위 퍼센트 (정밀한 계산, 1골드 차이도 반영)
 */
export function calculateRanking(userGold: number): number {
  // 음수 골드는 100%로 처리
  if (userGold <= 0) {
    return 100;
  }

  // 최고 랭킹보다 높으면 0.1% 반환
  if (userGold >= GOLD_RANKING_BENCHMARKS[0][0]) {
    return 0.1;
  }

  // 선형 보간법으로 정밀한 퍼센트 계산
  for (let i = 0; i < GOLD_RANKING_BENCHMARKS.length - 1; i++) {
    const [upperGold, upperPercent] = GOLD_RANKING_BENCHMARKS[i];
    const [lowerGold, lowerPercent] = GOLD_RANKING_BENCHMARKS[i + 1];

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

      // 소수점 2자리까지 반올림하여 반환
      return Math.round(percentile * 100) / 100;
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
    return "[신계] 서버 랭커 라인";
  } else if (percentile <= 1) {
    return "[최상위] 이론적 한계치";
  } else if (percentile <= 3) {
    return "[상위권] 과도기 랭커";
  } else if (percentile <= 5) {
    return "[선발대] 고효율 랭커";
  } else if (percentile <= 7) {
    return "성장 과도기";
  } else if (percentile <= 10) {
    return "[고인물] 가장 두터운 층";
  } else if (percentile <= 15) {
    return "[준상위] 탄탄한 배럭 라인";
  } else if (percentile <= 20) {
    return "6캐릭 미완성";
  } else if (percentile <= 30) {
    return "[T4 진입] 효율 중시형";
  } else if (percentile <= 40) {
    return "소수 정예 운영";
  } else if (percentile <= 50) {
    return "[중위값] 전체 유저의 딱 절반";
  } else if (percentile <= 60) {
    return "3캐릭 골드 수급";
  } else if (percentile <= 70) {
    return "라이트 유저";
  } else if (percentile <= 80) {
    return "원캐릭 유저";
  } else if (percentile <= 90) {
    return "데이터상 최하위 그룹";
  } else {
    return "모집단 마지노선";
  }
}

/**
 * 랭킹 등급 반환
 *
 * @param percentile 상위 퍼센트
 * @returns 등급 (S+, S, A+, A, B+, B, C, D)
 */
export function getRankingGrade(percentile: number): string {
  if (percentile <= 0.1) return "S+";
  if (percentile <= 1) return "S+";
  if (percentile <= 3) return "S";
  if (percentile <= 5) return "S";
  if (percentile <= 10) return "A+";
  if (percentile <= 15) return "A+";
  if (percentile <= 20) return "A";
  if (percentile <= 30) return "B+";
  if (percentile <= 50) return "B";
  if (percentile <= 70) return "C";
  if (percentile <= 90) return "D";
  return "D";
}

/**
 * 랭킹 뱃지 색상 반환
 *
 * @param percentile 상위 퍼센트
 * @returns Bootstrap 색상 클래스
 */
export function getRankingColor(percentile: number): string {
  if (percentile <= 0.1) return "danger";      // 빨강 (신계)
  if (percentile <= 1) return "danger";        // 빨강 (최상위)
  if (percentile <= 5) return "warning";       // 주황 (상위권)
  if (percentile <= 10) return "warning";      // 주황 (고인물)
  if (percentile <= 20) return "info";         // 파랑 (준상위)
  if (percentile <= 50) return "primary";      // 진한 파랑 (중위)
  if (percentile <= 70) return "success";      // 초록 (라이트)
  return "secondary";                          // 회색 (하위)
}
