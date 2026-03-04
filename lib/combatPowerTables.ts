// ═══════════════════════════════════════════════════════════════
// 전투력 계수 테이블 (25년 7월 9일 패치 반영)
// ═══════════════════════════════════════════════════════════════
//
// ■ 핵심 공식:
//   전투력 = 순수기본공격력 × 0.0288 × Π(1 + 요소%)
//   모든 요소는 곱연산
//
// ■ 기본 공격력 = sqrt(힘민지 × 무기공격력 / 6)
//   → 힘민지(직업별 힘/민첩/지능 동일스탯), 무기공격력 모두 API에서 가져올 수 있음
//
// ■ 기본 공격력 → 전투력 변환 계수: 0.0288

export const BASE_POWER_COEFFICIENT = 0.0288;

// ════════════════════════════════════
// 전투 레벨 계수
// ════════════════════════════════════
export const COMBAT_LEVEL_TABLE: { min: number; max: number; percent: number }[] = [
  { min: 55, max: 59, percent: 8.95 },
  { min: 60, max: 64, percent: 18.56 },
  { min: 65, max: 69, percent: 23.97 },
  { min: 70, max: 70, percent: 29.45 },
];

export function getCombatLevelPercent(level: number): number {
  for (const entry of COMBAT_LEVEL_TABLE) {
    if (level >= entry.min && level <= entry.max) return entry.percent;
  }
  return 0;
}

// ════════════════════════════════════
// 무기 품질
// ════════════════════════════════════
// 무기 품질의 추가 피해량% = 전투력 증가%
// 품질 100 = 30.00%
// 일부 품질에서 0.01% 오차 가능 (품질 95: 추가피해 28.06% → 전투력 28.05%)
//
// 추가 피해량은 API 파싱으로 직접 가져오므로 그 값을 그대로 사용
export function getWeaponQualityPower(additionalDamagePercent: number): number {
  return additionalDamagePercent;
}

// ════════════════════════════════════
// 아크 패시브
// ════════════════════════════════════
// ■ 진화 (실측 검증 2026-03-03):
//   - 비스탯 노드: 포인트당 1.0714% 곱연산 (15P/10P/2P 테스트, 오차 0.001~0.003%)
//   - 스탯 노드(치명/특화/신속): 포인트 기여 0! 스탯 팩터(0.03%/pt)에만 반영
//     검증: 스탯 노드 2P 제거(신속-100) → 예측 2846.72, 실측 2846.69 (0.001% 오차)
//     검증: 스탯 교체(신속→인내, 포인트 불변) = 스탯 노드 제거와 동일한 CP 변동
//   - API Points.Value는 스탯/비스탯 구분 없이 총 포인트만 제공
//   - 시뮬레이터: 비스탯 포인트 변경 시 1.0714%/P, 스탯 노드는 스탯 팩터로 처리
//
// ■ 깨달음 (실측 검증 2026-03-03):
//   - 포인트당 0.7% 곱연산 (2P/12P/28P/100P 테스트, 오차 0.000%)
//   - 4단계 구조: 1~3단계(0~72P) 순수 0.7%/P, 4단계(73P~) 메인 노드 보유
//   - 4단계 메인 노드 활성화 시 ×1.231 곱연산 (ON/OFF 스위치)
//     → 메인 1개 찍으면 ON (8P 필요), 안 찍으면 OFF
//     → 2개/3개 찍어도 동일 (추가 증가 없음, 포인트 기여는 0.7%/P)
//   - P ≥ 80이면 4단계 메인 활성화로 간주 (72P 선행 + 8P 메인)
//   - 검증: 0P=2422.08, 72P=3642.81, 76P=3710.63 (카르마OFF, 0.000%)
//     80P=4680.01, 88P=4816.93, 100P=5067.31 (카르마ON, 0.000%)
//
// ■ 도약 (실측 검증 2026-03-03):
//   - 포인트당 0.2% 곱연산 (10P/70P 테스트, 오차 0.000%)
//   - 카르마 보너스 없음 (순수 0.2%/P만)
//   - 검증: 70P→60P=4978.41(0.000%), 70P→0P=4445.01(0.000%)
export const ARK_PASSIVE_POWER_PER_POINT = {
  evolution: 1.0714,   // 진화 비스탯 노드 포인트당 1.0714% (실측 검증)
  enlightenment: 0.7,  // 깨달음 포인트당 0.7% (실측 검증)
  leap: 0.2,           // 도약 포인트당 0.2% (실측 검증)
} as const;

// 깨달음 4단계 메인 노드 활성화 배율 (실측 검증 2026-03-03)
// ON: 4단계 메인 1개 이상 활성화 (깨달음 P ≥ 80이면 활성화 가정)
// OFF: 4단계 메인 0개 (P < 80)
// 검증: 88~100P에서 F = 1.2306~1.2307 (0.000% 오차)
export const ENLIGHTENMENT_MAIN_NODE_MULTIPLIER = 1.231;

// 아크 패시브 전체 전투력 기여% (곱연산 결합)
// 진화 × 깨달음 × 도약 × 깨달음4단계카르마 × 진화카르마 × 도약카르마 를 하나의 % 팩터로 반환
// simulateChange와 함께 사용: 개별 요소 변경 시 다른 요소가 상쇄되어 정확한 delta 계산
export function getArkPassivePower(
  evolution: number,
  enlightenment: number,
  leap: number,
  karma?: { evolution: { rank: number; level: number }; enlightenment: { rank: number; level: number }; leap: { rank: number; level: number } },
): number {
  const evoFactor = 1 + evolution * ARK_PASSIVE_POWER_PER_POINT.evolution / 100;
  const enlFactor = 1 + enlightenment * ARK_PASSIVE_POWER_PER_POINT.enlightenment / 100;
  const leapFactor = 1 + leap * ARK_PASSIVE_POWER_PER_POINT.leap / 100;
  const enlKarma = enlightenment >= 80 ? ENLIGHTENMENT_MAIN_NODE_MULTIPLIER : 1.0;

  // 카르마 보너스: 진화 rank × 0.6%, 도약 level × 0.02%
  // 깨달음 카르마: 무기공격력%로 기본 공격력에 이미 포함 → 별도 계산 불필요
  const evoKarmaFactor = karma ? 1 + karma.evolution.rank * KARMA_POWER.evolution.perRank / 100 : 1;
  const leapKarmaFactor = karma ? 1 + karma.leap.level * KARMA_POWER.leap.perLevel / 100 : 1;

  return (evoFactor * enlFactor * leapFactor * enlKarma * evoKarmaFactor * leapKarmaFactor - 1) * 100;
}

// ════════════════════════════════════
// 카르마
// ════════════════════════════════════
export const KARMA_POWER = {
  evolution: {
    perRank: 0.6,      // 진화 1랭크당 0.6%
    maxRank: 6,         // 최대 6랭크 = 3.6%
  },
  leap: {
    perLevel: 0.02,     // 도약 1레벨당 0.02%
    perRank: 0.4,       // 도약 1랭크당 0.4% (포인트 2 × 0.2)
  },
} as const;

// 카르마 전투력 기여도 계산 (%)
// - 진화: rank × 0.6% (별도 곱연산 요소)
// - 도약: level × 0.02% (별도 곱연산 요소)
// - 깨달음: 무기공격력%로 기본 공격력에 이미 포함 → 별도 계산 불필요
export function getKarmaPower(karma: {
  evolution: { rank: number; level: number };
  enlightenment: { rank: number; level: number };
  leap: { rank: number; level: number };
}): number {
  return (
    karma.evolution.rank * KARMA_POWER.evolution.perRank +
    karma.leap.level * KARMA_POWER.leap.perLevel
  );
}

// ════════════════════════════════════
// 각인 계수
// ════════════════════════════════════
// 행: 유각 [0, 5, 10, 15, 20]장
// 열: 어빌스톤 레벨 [0, 1, 2, 3, 4]
// 값: 전투력 증가율 (%)

export const ENGRAVING_MATRIX: Record<string, number[][]> = {
  '원한': [
    [18.00, 21.00, 21.75, 23.25, 24.00],
    [18.75, 21.75, 22.50, 24.00, 24.75],
    [19.50, 22.50, 23.25, 24.75, 25.50],
    [20.25, 23.25, 24.00, 25.50, 26.25],
    [21.00, 24.00, 24.75, 26.25, 27.00],
  ],
  '아드레날린': [
    [15.20, 18.08, 18.80, 20.18, 20.90],
    [16.25, 19.13, 19.85, 21.23, 21.95],
    [17.30, 20.18, 20.90, 22.28, 23.00],
    [18.35, 21.23, 21.95, 23.33, 24.05],
    [19.40, 22.28, 23.00, 24.38, 25.10],
  ],
  '돌격대장': [
    [16.00, 19.00, 19.76, 21.28, 22.00],
    [16.80, 19.80, 20.56, 22.08, 22.80],
    [17.60, 20.60, 21.36, 22.88, 23.60],
    [18.40, 21.40, 22.16, 23.68, 24.40],
    [19.20, 22.20, 22.96, 24.48, 25.20],
  ],
  '질량 증가': [
    [16.00, 19.00, 19.75, 21.25, 22.00],
    [16.75, 19.75, 20.50, 22.00, 22.75],
    [17.50, 20.50, 21.25, 22.75, 23.50],
    [18.25, 21.25, 22.00, 23.50, 24.25],
    [19.00, 22.00, 22.75, 24.25, 25.00],
  ],
  '결투의 대가': [
    [15.30, 18.00, 18.70, 20.00, 20.70],
    [16.00, 18.70, 19.40, 20.70, 21.40],
    [16.70, 19.40, 20.10, 21.40, 22.10],
    [17.40, 20.10, 20.80, 22.10, 22.80],
    [18.10, 20.80, 21.50, 22.80, 23.50],
  ],
  '기습의 대가': [
    [15.30, 18.00, 18.70, 20.00, 20.70],
    [16.00, 18.70, 19.40, 20.70, 21.40],
    [16.70, 19.40, 20.10, 21.40, 22.10],
    [17.40, 20.10, 20.80, 22.10, 22.80],
    [18.10, 20.80, 21.50, 22.80, 23.50],
  ],
  '예리한 둔기': [
    [14.39, 17.18, 17.89, 19.31, 19.98],
    [15.13, 17.92, 18.63, 20.05, 20.72],
    [15.88, 18.67, 19.38, 20.80, 21.47],
    [16.62, 19.41, 20.12, 21.54, 22.21],
    [17.36, 20.15, 20.86, 22.28, 22.95],
  ],
  // 달인의 저력, 바리케이드, 안정된 상태, 저주받은 인형, 타격의 대가 (동일 계수)
  '달인의 저력': [
    [14.00, 17.00, 17.75, 19.25, 20.00],
    [14.75, 17.75, 18.50, 20.00, 20.75],
    [15.50, 18.50, 19.25, 20.75, 21.50],
    [16.25, 19.25, 20.00, 21.50, 22.25],
    [17.00, 20.00, 20.75, 22.25, 23.00],
  ],
  '바리케이드': [
    [14.00, 17.00, 17.75, 19.25, 20.00],
    [14.75, 17.75, 18.50, 20.00, 20.75],
    [15.50, 18.50, 19.25, 20.75, 21.50],
    [16.25, 19.25, 20.00, 21.50, 22.25],
    [17.00, 20.00, 20.75, 22.25, 23.00],
  ],
  '안정된 상태': [
    [14.00, 17.00, 17.75, 19.25, 20.00],
    [14.75, 17.75, 18.50, 20.00, 20.75],
    [15.50, 18.50, 19.25, 20.75, 21.50],
    [16.25, 19.25, 20.00, 21.50, 22.25],
    [17.00, 20.00, 20.75, 22.25, 23.00],
  ],
  '저주받은 인형': [
    [14.00, 17.00, 17.75, 19.25, 20.00],
    [14.75, 17.75, 18.50, 20.00, 20.75],
    [15.50, 18.50, 19.25, 20.75, 21.50],
    [16.25, 19.25, 20.00, 21.50, 22.25],
    [17.00, 20.00, 20.75, 22.25, 23.00],
  ],
  '타격의 대가': [
    [14.00, 17.00, 17.75, 19.25, 20.00],
    [14.75, 17.75, 18.50, 20.00, 20.75],
    [15.50, 18.50, 19.25, 20.75, 21.50],
    [16.25, 19.25, 20.00, 21.50, 22.25],
    [17.00, 20.00, 20.75, 22.25, 23.00],
  ],
  // 속전속결, 슈퍼 차지 (동일 계수)
  '속전속결': [
    [14.40, 16.80, 17.40, 18.60, 19.20],
    [15.00, 17.40, 18.00, 19.20, 19.80],
    [15.60, 18.00, 18.60, 19.80, 20.40],
    [16.20, 18.60, 19.20, 20.40, 21.00],
    [16.80, 19.20, 19.80, 21.00, 21.60],
  ],
  '슈퍼 차지': [
    [14.40, 16.80, 17.40, 18.60, 19.20],
    [15.00, 17.40, 18.00, 19.20, 19.80],
    [15.60, 18.00, 18.60, 19.80, 20.40],
    [16.20, 18.60, 19.20, 20.40, 21.00],
    [16.80, 19.20, 19.80, 21.00, 21.60],
  ],
  '에테르 포식자': [
    [12.60, 15.60, 16.50, 18.00, 18.60],
    [13.50, 16.50, 17.40, 18.90, 19.50],
    [14.40, 17.40, 18.30, 19.80, 20.40],
    [15.30, 18.30, 19.20, 20.70, 21.30],
    [16.20, 19.20, 20.10, 21.60, 22.20],
  ],
  '마나 효율 증가': [
    [13.00, 16.00, 16.75, 18.25, 19.00],
    [13.75, 16.75, 17.50, 19.00, 19.75],
    [14.50, 17.50, 18.25, 19.75, 20.50],
    [15.25, 18.25, 19.00, 20.50, 21.25],
    [16.00, 19.00, 19.75, 21.25, 22.00],
  ],
  '약자 무시': [
    [9.90, 12.30, 12.90, 14.10, 14.70],
    [10.73, 13.13, 13.73, 14.93, 15.53],
    [11.55, 13.95, 14.55, 15.75, 16.35],
    [12.38, 14.78, 15.38, 16.58, 17.18],
    [13.20, 15.60, 16.20, 17.40, 18.00],
  ],
  '정밀 단도': [
    [10.60, 12.70, 13.23, 14.28, 14.80],
    [11.13, 13.23, 13.76, 14.81, 15.33],
    [11.65, 13.75, 14.28, 15.33, 15.85],
    [12.18, 14.28, 14.81, 15.86, 16.38],
    [12.70, 14.80, 15.33, 16.38, 16.90],
  ],
  '추진력': [
    [9.80, 11.90, 12.43, 13.48, 14.00],
    [10.33, 12.43, 12.96, 14.01, 14.53],
    [10.85, 12.95, 13.48, 14.53, 15.05],
    [11.38, 13.48, 14.01, 15.06, 15.58],
    [11.90, 14.00, 14.53, 15.58, 16.10],
  ],
  '마나의 흐름': [
    [7.53, 7.53, 7.53, 7.53, 7.53],
    [8.40, 8.40, 8.40, 8.40, 8.40],
    [9.29, 9.29, 9.29, 9.29, 9.29],
    [10.20, 10.20, 10.20, 10.20, 10.20],
    [11.11, 11.11, 11.11, 11.11, 11.11],
  ],
  '시선 집중': [
    [7.50, 8.70, 9.00, 9.60, 9.90],
    [7.88, 9.08, 9.38, 9.98, 10.28],
    [8.25, 9.45, 9.75, 10.35, 10.65],
    [8.63, 9.83, 10.13, 10.73, 11.03],
    [9.00, 10.20, 10.50, 11.10, 11.40],
  ],
  '부러진 뼈': [
    [7.40, 8.20, 8.40, 8.80, 9.00],
    [7.65, 8.45, 8.65, 9.05, 9.25],
    [7.90, 8.70, 8.90, 9.30, 9.50],
    [8.15, 8.95, 9.15, 9.55, 9.75],
    [8.40, 9.20, 9.40, 9.80, 10.00],
  ],
  '실드관통': [
    [4.60, 5.40, 5.60, 6.00, 6.20],
    [4.80, 5.60, 5.80, 6.20, 6.40],
    [5.00, 5.80, 6.00, 6.40, 6.60],
    [5.20, 6.00, 6.20, 6.60, 6.80],
    [5.40, 6.20, 6.40, 6.80, 7.00],
  ],
  '구슬동자': [
    [4.00, 4.48, 4.60, 4.84, 4.96],
    [4.16, 4.64, 4.76, 5.00, 5.12],
    [4.32, 4.80, 4.92, 5.16, 5.28],
    [4.48, 4.96, 5.08, 5.32, 5.44],
    [4.64, 5.12, 5.24, 5.48, 5.60],
  ],
  '승부사': [
    [1.68, 1.98, 2.06, 2.21, 2.28],
    [1.68, 1.98, 2.06, 2.21, 2.28],
    [1.89, 2.19, 2.27, 2.42, 2.49],
    [1.89, 2.19, 2.27, 2.42, 2.49],
    [2.10, 2.40, 2.48, 2.63, 2.70],
  ],
  '분쇄의 주먹': [
    [1.30, 1.45, 1.49, 1.56, 1.60],
    [1.38, 1.53, 1.57, 1.64, 1.68],
    [1.45, 1.60, 1.64, 1.71, 1.75],
    [1.53, 1.68, 1.72, 1.79, 1.83],
    [1.60, 1.75, 1.79, 1.86, 1.90],
  ],
};

// 유각장 인덱스: 0→0, 5→1, 10→2, 15→3, 20→4
const YUKAK_VALUES = [0, 5, 10, 15, 20];

/** 유각장 수 → 매트릭스 행 인덱스 (가장 가까운 값으로 내림) */
function getYukakIndex(yukakSheets: number): number {
  for (let i = YUKAK_VALUES.length - 1; i >= 0; i--) {
    if (yukakSheets >= YUKAK_VALUES[i]) return i;
  }
  return 0;
}

/** 어빌스톤 레벨 → 매트릭스 열 인덱스 (0~4 클램프) */
function getAbilIndex(abilLevel: number): number {
  return Math.max(0, Math.min(4, abilLevel));
}

/** 각인 전투력 계수 조회 (%) */
export function getEngravingCoefficient(
  engravingName: string,
  yukakSheets: number,
  abilityStoneLevel: number,
): number {
  const matrix = ENGRAVING_MATRIX[engravingName];
  if (!matrix) return 0;

  const yIdx = getYukakIndex(yukakSheets);
  const aIdx = getAbilIndex(abilityStoneLevel);
  return matrix[yIdx][aIdx];
}

// 시뮬레이터 선택용 각인 이름 목록
export const ENGRAVING_NAMES = Object.keys(ENGRAVING_MATRIX);

// ════════════════════════════════════
// 보석 계수
// ════════════════════════════════════
// 보석 하나당 전투력 증가% (겁화/작열 구분 없음, 스킬 구분 없음)
// T4 보석은 기본 공격력%도 추가로 올려줌 (별도 계산 필요)

export const GEM_POWER_TABLE: Record<string, number> = {
  // 3티어
  '3-1': 0.48, '3-2': 0.96, '3-3': 1.44, '3-4': 1.92, '3-5': 2.40,
  '3-6': 2.88, '3-7': 3.36, '3-8': 3.84, '3-9': 4.80, '3-10': 6.40,
  // 4티어 (기본 공격력% 제외한 순수 전투력 증가)
  '4-1': 1.28, '4-2': 1.92, '4-3': 2.56, '4-4': 3.20, '4-5': 3.84,
  '4-6': 4.48, '4-7': 5.12, '4-8': 5.76, '4-9': 6.40, '4-10': 7.04,
};

// T4 보석 기본 공격력% (11개 동일 레벨 기준 합계)
export const GEM_T4_BASE_ATK_PERCENT: Record<number, number> = {
  6: 4.95, 7: 6.60, 8: 8.80, 9: 11.00, 10: 13.20,
};

// T4 보석 개별 기본 공격력% (= 11개 기준 / 11)
// 실측 검증: T4-8=0.80%, T4-10=1.20% (구아바밤바아 tooltip 확인)
export const GEM_T4_BASE_ATK_PER_GEM: Record<number, number> = {
  6: 0.45, 7: 0.60, 8: 0.80, 9: 1.00, 10: 1.20,
};

/** 보석 전투력 조회 (겁화/작열/멸화/홍염 구분 없이 동일) */
export function getGemPower(tier: number, level: number): number {
  const key = `${tier}-${level}`;
  return GEM_POWER_TABLE[key] || 0;
}

/** T4 보석 개별 기본공격력% 조회 */
export function getGemBaseAtkPercent(tier: number, level: number): number {
  if (tier !== 4) return 0;
  return GEM_T4_BASE_ATK_PER_GEM[level] || 0;
}

// ════════════════════════════════════
// 추가 피해 풀 모델 (raw 추가피해% 값)
// ════════════════════════════════════
// 무기 품질 + 악세 + 팔찌 + 그리드 젬 → 합연산 후 하나의 곱연산 팩터
export const ADD_DMG_RAW = {
  // 악세 연마 "추가 피해%" raw 값 (목걸이 전용)
  accessory: { '하': 0.6, '중': 1.6, '상': 2.6 } as Record<string, number>,
  // 팔찌 "add_dmg" (단일) raw 값
  bracelet_simple: { '하': 3.0, '중': 3.5, '상': 4.0 } as Record<string, number>,
  // 그리드 젬 추가피해 per level
  grid_per_level: 0.08,
} as const;

// ════════════════════════════════════
// 장신구 연마 효과
// ════════════════════════════════════
// 값: 전투력 증가% (combat power coefficient)
// 키 네이밍: 'X+' = flat 수치, 'X%' = 퍼센트 수치

export const ACCESSORY_GRINDING_POWER: Record<string, Record<string, number>> = {
  // ── 공통 (목걸이/귀걸이/반지) ──
  // 공격력+ flat (기본공격력 142,857 기준, value / 142857 × 100)
  '공격력+': { '하': 0.0560, '중': 0.1365, '상': 0.2730 },
  // 무기 공격력+ flat (sqrt(1 + value/무기공) - 1, 무기공 250,000 기준 근사)
  '무기 공격력+': { '하': 0.039, '중': 0.096, '상': 0.192 },

  // ── 목걸이 전용 ──
  // 추가 피해% (기존 추가피해 30% 가정, value / 1.30)
  '추가 피해%': { '하': 0.46152, '중': 1.23072, '상': 1.99992 },
  // 적에게 주는 피해% (수치 = 전투력%)
  '적에게 주는 피해%': { '하': 0.55, '중': 1.20, '상': 2.00 },

  // ── 귀걸이 전용 ──
  // 공격력% (수치 그대로 전투력 증가)
  '공격력%': { '하': 0.40, '중': 0.95, '상': 1.55 },
  // 무기 공격력% (sqrt(1 + x/100) - 1 변환)
  '무기 공격력%': { '하': 0.40, '중': 0.89, '상': 1.49 },

  // ── 반지 전용 ──
  '치명타 적중률%': { '하': 0.309680, '중': 0.735490, '상': 1.200010 },
  '치명타 피해%': { '하': 0.330000, '중': 0.720000, '상': 1.200000 },
};

// ── 하위 호환: 기존 키 이름으로도 조회 가능 ──
// (parseAccessoryGrinding이 새 키로 변환하므로 새 코드에서는 사용 안 함)
export const ACCESSORY_GRINDING_ALIASES: Record<string, string> = {
  '공격력': '공격력+',
  '치명타 적중률': '치명타 적중률%',
  '치명타 피해량': '치명타 피해%',
  '치명타 피해': '치명타 피해%',
  '추가 피해': '추가 피해%',
  '적에게 주는 피해': '적에게 주는 피해%',
  '적에게 주는 피해 증가': '적에게 주는 피해%',
  '무기 공격력': '무기 공격력+',
};

// ── 악세서리 타입별 연마 옵션 카탈로그 ──
export const ACCESSORY_GRINDING_OPTIONS: Record<string, { id: string; label: string }[]> = {
  '목걸이': [
    { id: '추가 피해%', label: '추가 피해' },
    { id: '적에게 주는 피해%', label: '적에게 주는 피해' },
    { id: '공격력+', label: '공격력(+)' },
    { id: '무기 공격력+', label: '무기 공격력(+)' },
  ],
  '귀걸이': [
    { id: '공격력%', label: '공격력(%)' },
    { id: '무기 공격력%', label: '무기 공격력(%)' },
    { id: '공격력+', label: '공격력(+)' },
    { id: '무기 공격력+', label: '무기 공격력(+)' },
  ],
  '반지': [
    { id: '치명타 적중률%', label: '치명타 적중률' },
    { id: '치명타 피해%', label: '치명타 피해' },
    { id: '공격력+', label: '공격력(+)' },
    { id: '무기 공격력+', label: '무기 공격력(+)' },
  ],
};

// ════════════════════════════════════
// 전투 스탯
// ════════════════════════════════════
// (치명 + 특화 + 신속) × 0.03 = 전투력 증가% (곱연산)
// - 내실, 펫 효과, 팔찌 특성, 진화 스탯 노드 모두 포함된 표시 수치 사용
// - 제압/인내/숙련: 전투력 미반영 (실측 확인)
// - 엔드 스펙 기준 ~2600 합산 → 약 78% 증가
// - 실측 검증 (2026-03-03): 진화 스탯 노드 교체로 순수 스탯 변동 테스트
//   CP 2895.61, 스탯합 2586→2486: 예측 2846.72, 실측 2846.69 (0.001% 오차)
export const COMBAT_STAT_COEFFICIENT = 0.03;

export function getCombatStatPower(crit: number, spec: number, swift: number): number {
  return (crit + spec + swift) * COMBAT_STAT_COEFFICIENT;
}

// 기존 호환용 (deprecated - 새 공식은 합산 × 0.03)
export const STAT_POWER_PER_100: Record<string, number> = {
  '치명': 3.0,   // 100당 3% (= 100 × 0.03)
  '특화': 3.0,
  '신속': 3.0,
  '제압': 0,     // 전투력에 반영 안 됨
  '인내': 0,
  '숙련': 0,
};

// ════════════════════════════════════
// 팔찌 효과
// ════════════════════════════════════
// 전투 특성(치명/특화/신속) → 전투 스탯에서 계산
// 힘/민첩/지능 → 기본 공격력에서 계산
// 도약 포인트 → 아크 패시브에서 계산
// 아래는 팔찌 고유 부여/고정 효과 전체 카탈로그

// ── 팔찌 전체 옵션 카탈로그 ──
// tierTexts: [하, 중, 상] 인게임 풀 텍스트
// power: {하, 중, 상} 전투력 증가%
// weaponFlat: 무기 계열 기본공격력 합산 flat 무기공

export type BraceletOptionDef = {
  id: string;
  category: 'fixed' | 'dealer_combo' | 'dealer_simple' | 'weapon_buff' | 'support_combo' | 'support_simple';
  description: string;
  /** 인게임 풀 텍스트 [하, 중, 상] — API 파싱/매칭용 */
  tierTexts: [string, string, string];
  /** 전투력 증가% {하, 중, 상} — 곱연산 팩터 */
  power: { 하: number; 중: number; 상: number };
  /** 무기 계열: 기본공격력 sqrt(힘×무기공/6)에 합산할 flat 무기공격력 */
  weaponFlat?: { 하: number; 중: number; 상: number };
  /** API 텍스트 매칭 키워드 (첥 줄 기준, 긴 것 우선) */
  matchKeywords: string[];
  /** 복합효과 2번째 줄 매칭 키워드 (없으면 단일 라인) */
  comboKeywords?: string[];
};

export const BRACELET_ALL_OPTIONS: BraceletOptionDef[] = [
  // ═══════════════════════════════════
  // 비전투 / 생존 옵션 (전투력 0%)
  // ═══════════════════════════════════
  {
    id: 'atk_move_speed', category: 'fixed',
    description: '공격 및 이동 속도 증가',
    tierTexts: [
      '공격 및 이동 속도가 4% 증가한다.',
      '공격 및 이동 속도가 5% 증가한다.',
      '공격 및 이동 속도가 6% 증가한다.',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['공격 및 이동 속도'],
  },
  {
    id: 'seed_dmg', category: 'fixed',
    description: '시드 등급 이하 몬스터 피해 증가',
    tierTexts: [
      '시드 등급 이하 몬스터에게 주는 피해가 4% 증가한다.',
      '시드 등급 이하 몬스터에게 주는 피해가 5% 증가한다.',
      '시드 등급 이하 몬스터에게 주는 피해가 6% 증가한다.',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['시드 등급 이하 몬스터에게 주는 피해'],
  },
  {
    id: 'seed_def', category: 'fixed',
    description: '시드 등급 이하 몬스터 피해 감소',
    tierTexts: [
      '시드 등급 이하 몬스터에게 받는 피해가 6% 감소한다.',
      '시드 등급 이하 몬스터에게 받는 피해가 8% 감소한다.',
      '시드 등급 이하 몬스터에게 받는 피해가 10% 감소한다.',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['시드 등급 이하 몬스터에게 받는 피해'],
  },
  {
    id: 'phys_def', category: 'fixed',
    description: '물리 방어력',
    tierTexts: [
      '물리 방어력 +5000',
      '물리 방어력 +6000',
      '물리 방어력 +7000',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['물리 방어력'],
  },
  {
    id: 'mag_def', category: 'fixed',
    description: '마법 방어력',
    tierTexts: [
      '마법 방어력 +5000',
      '마법 방어력 +6000',
      '마법 방어력 +7000',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['마법 방어력'],
  },
  {
    id: 'max_hp', category: 'fixed',
    description: '최대 생명력',
    tierTexts: [
      '최대 생명력 +11200',
      '최대 생명력 +14000',
      '최대 생명력 +16800',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['최대 생명력'],
  },
  {
    id: 'hp_regen', category: 'fixed',
    description: '전투 중 생명력 회복량',
    tierTexts: [
      '전투 중 생명력 회복량 +100',
      '전투 중 생명력 회복량 +130',
      '전투 중 생명력 회복량 +160',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['전투 중 생명력 회복량'],
  },
  {
    id: 'resource_regen', category: 'fixed',
    description: '전투자원 자연 회복량',
    tierTexts: [
      '전투자원 자연 회복량 +8%',
      '전투자원 자연 회복량 +10%',
      '전투자원 자연 회복량 +12%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['전투자원 자연 회복량'],
  },
  {
    id: 'move_cd', category: 'fixed',
    description: '이동기 및 기상기 재사용 대기 시간 감소',
    tierTexts: [
      '이동기 및 기상기 재사용 대기 시간이 8% 감소한다.',
      '이동기 및 기상기 재사용 대기 시간이 10% 감소한다.',
      '이동기 및 기상기 재사용 대기 시간이 12% 감소한다.',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['이동기 및 기상기 재사용 대기 시간'],
  },
  {
    id: 'cc_immune', category: 'fixed',
    description: '경직 및 피격 이상 면역',
    tierTexts: [
      '공격 적중 시 80초 동안 경직 및 피격 이상에 면역이 된다. (재사용 대기 시간 80초)',
      '공격 적중 시 70초 동안 경직 및 피격 이상에 면역이 된다. (재사용 대기 시간 70초)',
      '공격 적중 시 60초 동안 경직 및 피격 이상에 면역이 된다. (재사용 대기 시간 60초)',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['경직 및 피격 이상에 면역'],
  },

  // ═══════════════════════════════════
  // 특수 콤보 딜 옵션 (상/중/하)
  // ═══════════════════════════════════
  {
    id: 'crit_rate_combo', category: 'dealer_combo',
    description: '치적+치적주피',
    tierTexts: [
      '치명타 적중률이 3.4% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
      '치명타 적중률이 4.2% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
      '치명타 적중률이 5.0% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
    ],
    power: { 하: 3.5, 중: 4, 상: 4.5 },
    matchKeywords: ['치명타 적중률이'],
    comboKeywords: ['치명타로 적중 시 적에게 주는 피해'],
  },
  {
    id: 'crit_dmg_combo', category: 'dealer_combo',
    description: '치피+치적주피',
    tierTexts: [
      '치명타 피해가 6.8% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
      '치명타 피해가 8.4% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
      '치명타 피해가 10.0% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
    ],
    power: { 하: 3.5, 중: 4, 상: 4.5 },
    matchKeywords: ['치명타 피해가'],
    comboKeywords: ['치명타로 적중 시 적에게 주는 피해'],
  },
  {
    id: 'enemy_dmg_combo', category: 'dealer_combo',
    description: '적주피+무력화적주피',
    tierTexts: [
      '적에게 주는 피해가 2.0% 증가하며, 무력화 상태의 적에게 주는 피해가 4.0% 증가한다.',
      '적에게 주는 피해가 2.5% 증가하며, 무력화 상태의 적에게 주는 피해가 4.5% 증가한다.',
      '적에게 주는 피해가 3.0% 증가하며, 무력화 상태의 적에게 주는 피해가 5.0% 증가한다.',
    ],
    power: { 하: 2.8, 중: 3.4, 상: 4 },
    matchKeywords: ['적에게 주는 피해가'],
    comboKeywords: ['무력화 상태의 적에게 주는 피해'],
  },
  {
    id: 'add_dmg_combo', category: 'dealer_combo',
    description: '추피+대악마피해',
    tierTexts: [
      '추가 피해가 2.5% 증가한다. 악마 및 대악마 계열 피해량이 2.5% 증가한다.',
      '추가 피해가 3.0% 증가한다. 악마 및 대악마 계열 피해량이 2.5% 증가한다.',
      '추가 피해가 3.5% 증가한다. 악마 및 대악마 계열 피해량이 2.5% 증가한다.',
    ],
    power: { 하: 3.5, 중: 4, 상: 4.5 },
    matchKeywords: ['추가 피해가'],
    comboKeywords: ['대악마 계열 피해량'],
  },
  {
    id: 'cd_enemy_dmg', category: 'dealer_combo',
    description: '쿨증2%+적주피',
    tierTexts: [
      '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 4.5% 증가한다.',
      '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 5.0% 증가한다.',
      '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 5.5% 증가한다.',
    ],
    power: { 하: 3.5, 중: 4, 상: 4.5 },
    matchKeywords: ['재사용 대기 시간이', '적에게 주는 피해가'],
  },

  // ═══════════════════════════════════
  // 지원 콤보 옵션 (전투력 0%)
  // ═══════════════════════════════════
  {
    id: 'def_reduce', category: 'support_combo',
    description: '방어력감소+아군공강',
    tierTexts: [
      '몬스터에게 공격 적중 시 8초 동안 대상의 방어력을 1.8% 감소시킨다. 아군 공격력 강화 효과 +2.0%',
      '몬스터에게 공격 적중 시 8초 동안 대상의 방어력을 2.1% 감소시킨다. 아군 공격력 강화 효과 +2.5%',
      '몬스터에게 공격 적중 시 8초 동안 대상의 방어력을 2.5% 감소시킨다. 아군 공격력 강화 효과 +3.0%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['대상의 방어력을'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'crit_resist_reduce', category: 'support_combo',
    description: '치저감소+아군공강',
    tierTexts: [
      '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 저항을 1.8% 감소시킨다. 아군 공격력 강화 효과 +2.0%',
      '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 저항을 2.1% 감소시킨다. 아군 공격력 강화 효과 +2.5%',
      '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 저항을 2.5% 감소시킨다. 아군 공격력 강화 효과 +3.0%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['대상의 치명타 저항을'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'shield_dmg', category: 'support_combo',
    description: '보호적주피+아군공강',
    tierTexts: [
      '파티 효과로 보호 효과가 적용된 대상이 5초 동안 적에게 주는 피해가 0.9% 증가한다. 아군 공격력 강화 효과 +2.0%',
      '파티 효과로 보호 효과가 적용된 대상이 5초 동안 적에게 주는 피해가 1.1% 증가한다. 아군 공격력 강화 효과 +2.5%',
      '파티 효과로 보호 효과가 적용된 대상이 5초 동안 적에게 주는 피해가 1.3% 증가한다. 아군 공격력 강화 효과 +3.0%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['보호 효과가 적용된 대상'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'crit_dmg_resist_reduce', category: 'support_combo',
    description: '치피저감소+아군공강',
    tierTexts: [
      '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 피해 저항을 3.6% 감소시킨다. 아군 공격력 강화 효과 +2.0%',
      '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 피해 저항을 4.2% 감소시킨다. 아군 공격력 강화 효과 +2.5%',
      '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 피해 저항을 4.8% 감소시킨다. 아군 공격력 강화 효과 +3.0%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['대상의 치명타 피해 저항을'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },

  // ═══════════════════════════════════
  // 무기 공격력 콤보 옵션 (버프분만, 18.4만 무공 기준)
  // ※ 기본 무공 증가분은 weaponFlat으로 기본공격력에 별도 합산
  // ═══════════════════════════════════
  {
    id: 'weapon_stack', category: 'weapon_buff',
    description: '무기공중첩+공이속',
    tierTexts: [
      '공격 적중 시 매 초마다 10초 동안 무기 공격력이 1160 증가하며 공격 및 이동 속도가 1% 증가한다. (최대 6중첩)',
      '공격 적중 시 매 초마다 10초 동안 무기 공격력이 1320 증가하며 공격 및 이동 속도가 1% 증가한다. (최대 6중첩)',
      '공격 적중 시 매 초마다 10초 동안 무기 공격력이 1480 증가하며 공격 및 이동 속도가 1% 증가한다. (최대 6중첩)',
    ],
    power: { 하: 1.88, 중: 2.14, 상: 2.4 },
    matchKeywords: ['매 초 마다', '무기 공격력이'],
    comboKeywords: ['공격 및 이동 속도가'],
  },
  {
    id: 'weapon_hp_cond', category: 'weapon_buff',
    description: '무기공+체력조건무기공',
    tierTexts: [
      '무기 공격력이 7200 증가한다. 자신의 생명력이 50% 이상일 경우 무기 공격력 2000 증가',
      '무기 공격력이 8100 증가한다. 자신의 생명력이 50% 이상일 경우 무기 공격력 2200 증가',
      '무기 공격력이 9000 증가한다. 자신의 생명력이 50% 이상일 경우 무기 공격력 2400 증가',
    ],
    power: { 하: 0.54, 중: 0.59, 상: 0.65 },
    weaponFlat: { 하: 7200, 중: 8100, 상: 9000 },
    matchKeywords: ['무기 공격력이'],
    comboKeywords: ['생명력이 50% 이상'],
  },
  {
    id: 'weapon_time_stack', category: 'weapon_buff',
    description: '무기공+시간중첩무기공',
    tierTexts: [
      '무기 공격력이 6900 증가한다. 공격 적중 시 30초마다 120초 동안 무기 공격력이 130 증가한다. (최대 30중첩)',
      '무기 공격력이 7800 증가한다. 공격 적중 시 30초마다 120초 동안 무기 공격력이 140 증가한다. (최대 30중첩)',
      '무기 공격력이 8700 증가한다. 공격 적중 시 30초마다 120초 동안 무기 공격력이 150 증가한다. (최대 30중첩)',
    ],
    power: { 하: 1.05, 중: 1.13, 상: 1.21 },
    weaponFlat: { 하: 6900, 중: 7800, 상: 8700 },
    matchKeywords: ['무기 공격력이'],
    comboKeywords: ['30초 마다'],
  },

  // ═══════════════════════════════════
  // 단일 딜 옵션
  // ═══════════════════════════════════
  {
    id: 'enemy_dmg', category: 'dealer_simple',
    description: '적주피',
    tierTexts: [
      '적에게 주는 피해가 2.0% 증가한다.',
      '적에게 주는 피해가 2.5% 증가한다.',
      '적에게 주는 피해가 3.0% 증가한다.',
    ],
    power: { 하: 2, 중: 2.5, 상: 3 },
    matchKeywords: ['적에게 주는 피해가'],
  },
  {
    id: 'add_dmg', category: 'dealer_simple',
    description: '추가 피해',
    tierTexts: [
      '추가 피해 +3.0%',
      '추가 피해 +3.5%',
      '추가 피해 +4.0%',
    ],
    power: { 하: 2.3076, 중: 2.6922, 상: 3.0768 },
    matchKeywords: ['추가 피해'],
  },
  {
    id: 'back_atk_dmg', category: 'dealer_simple',
    description: '백어택 적주피',
    tierTexts: [
      '백어택 스킬이 적에게 주는 피해가 2.5% 증가한다.',
      '백어택 스킬이 적에게 주는 피해가 3.0% 증가한다.',
      '백어택 스킬이 적에게 주는 피해가 3.5% 증가한다.',
    ],
    power: { 하: 1.75, 중: 2.1, 상: 2.45 },
    matchKeywords: ['백어택 스킬이 적에게 주는 피해'],
  },
  {
    id: 'head_atk_dmg', category: 'dealer_simple',
    description: '헤드어택 적주피',
    tierTexts: [
      '헤드어택 스킬이 적에게 주는 피해가 2.5% 증가한다.',
      '헤드어택 스킬이 적에게 주는 피해가 3.0% 증가한다.',
      '헤드어택 스킬이 적에게 주는 피해가 3.5% 증가한다.',
    ],
    power: { 하: 1.75, 중: 2.1, 상: 2.45 },
    matchKeywords: ['헤드어택 스킬이 적에게 주는 피해'],
  },
  {
    id: 'neutral_atk_dmg', category: 'dealer_simple',
    description: '무방향 적주피',
    tierTexts: [
      '방향성 공격이 아닌 스킬이 적에게 주는 피해가 2.5% 증가한다.',
      '방향성 공격이 아닌 스킬이 적에게 주는 피해가 3.0% 증가한다.',
      '방향성 공격이 아닌 스킬이 적에게 주는 피해가 3.5% 증가한다.',
    ],
    power: { 하: 2.5, 중: 3, 상: 3.5 },
    matchKeywords: ['방향성 공격이 아닌 스킬이 적에게 주는 피해'],
  },
  {
    id: 'crit_rate', category: 'dealer_simple',
    description: '치명타 적중률',
    tierTexts: [
      '치명타 적중률 +3.4%',
      '치명타 적중률 +4.2%',
      '치명타 적중률 +5.0%',
    ],
    power: { 하: 2.38, 중: 2.94, 상: 3.5 },
    matchKeywords: ['치명타 적중률'],
  },
  {
    id: 'crit_dmg', category: 'dealer_simple',
    description: '치명타 피해',
    tierTexts: [
      '치명타 피해 +6.8%',
      '치명타 피해 +8.4%',
      '치명타 피해 +10.0%',
    ],
    power: { 하: 2.26644, 중: 2.79972, 상: 3.333 },
    matchKeywords: ['치명타 피해'],
  },

  // ═══════════════════════════════════
  // 무기 공격력 단독 (전투력 0% — 기본공격력에서 계산)
  // ═══════════════════════════════════
  {
    id: 'weapon_flat', category: 'dealer_simple',
    description: '무기 공격력',
    tierTexts: [
      '무기 공격력 +7200',
      '무기 공격력 +8100',
      '무기 공격력 +9000',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    weaponFlat: { 하: 7200, 중: 8100, 상: 9000 },
    matchKeywords: ['무기 공격력'],
  },

  // ═══════════════════════════════════
  // 지원 단일 옵션 (전투력 0%)
  // ═══════════════════════════════════
  {
    id: 'party_protect', category: 'support_simple',
    description: '파티원 보호 및 회복 효과',
    tierTexts: [
      '파티원 보호 및 회복 효과가 2.5% 증가한다.',
      '파티원 보호 및 회복 효과가 3.0% 증가한다.',
      '파티원 보호 및 회복 효과가 3.5% 증가한다.',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['파티원 보호 및 회복 효과'],
  },
  {
    id: 'ally_atk_enhance', category: 'support_simple',
    description: '아군 공격력 강화 효과',
    tierTexts: [
      '아군 공격력 강화 효과 +4.0%',
      '아군 공격력 강화 효과 +5.0%',
      '아군 공격력 강화 효과 +6.0%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'ally_dmg_enhance', category: 'support_simple',
    description: '아군 피해량 강화 효과',
    tierTexts: [
      '아군 피해량 강화 효과 +6.0%',
      '아군 피해량 강화 효과 +7.5%',
      '아군 피해량 강화 효과 +9.0%',
    ],
    power: { 하: 0, 중: 0, 상: 0 },
    matchKeywords: ['아군 피해량 강화 효과'],
  },
];

// ── 팔찌 부여효과 전투력 계수 (BRACELET_ALL_OPTIONS에서 자동 파생) ──
// 기존 코드 호환용. power > 0인 항목만 포함.

export const BRACELET_EFFECT_POWER: Record<string, { 하: number; 중: number; 상: number }> = Object.fromEntries(
  BRACELET_ALL_OPTIONS
    .filter(o => o.power.하 > 0 || o.power.중 > 0 || o.power.상 > 0)
    .map(o => [o.id, o.power])
);

// ════════════════════════════════════
// 카드 세트
// ════════════════════════════════════
export const CARD_SET_POWER: Record<string, Record<number, number>> = {
  '세상을 구하는 빛': { 30: 15.0, 24: 11.0, 18: 7.0 },
  '남겨진 바람의 절벽': { 30: 15.0, 24: 11.0, 18: 7.0 },
  '카제로스의 군단장': { 30: 15.0, 24: 11.0, 18: 7.0 },
  '삼두정치': { 6: 6.5 },
  '세 우마르가 오리라': { 6: 8.4 },
  '플라티나의 주민들': { 6: 8.4 },
};

export function getCardSetPower(setName: string, activeCount: number, awakening?: number): number {
  const set = CARD_SET_POWER[setName];
  if (!set) return 0;

  // 각성 수가 있으면 각성 기준, 아니면 세트 수 기준
  const key = awakening || activeCount;
  let power = 0;
  for (const [count, val] of Object.entries(set)) {
    if (Number(count) <= key) power = val;
  }
  return power;
}

// ════════════════════════════════════
// 에스더
// ════════════════════════════════════
export const ESTHER_POWER: Record<string, number> = {
  '0단계 6강': 0.50,
  '0단계 8강': 0.95,
  '1단계 6강': 0.75,
  '1단계 8강': 1.43,
  '2단계 6강': 1.00,
  '2단계 8강': 1.90,
};

// ════════════════════════════════════
// 아크 그리드
// ════════════════════════════════════
// 구조: 6코어 × 4젬, 젬마다 2개 효과(효과명 + Level)
// 전체 Effects = 모든 젬의 동종 효과 Level 합산 → %값으로 전투력 반영
// API /arkgrid Effects에서 합산 %를 직접 가져올 수 있음
//
// ■ 젬 효과 → 전투력 반영 모델 (2026-03-03 실측 검증):
//   - 각 효과의 Lv × 계수 = 해당 효과의 tooltip %값
//   - 효과별로 다른 풀에 합연산 또는 독립 곱연산으로 반영:
//     · 추가 피해: 무기/악세/팔찌/그리드 전부 합연산 → 하나의 곱연산 팩터 (~37% 풀)
//     · 보스 피해: 그리드 젬만 독립 곱연산 팩터 (각인 등은 별도)
//     · 공격력:    보석/그리드 등 합연산 → 하나의 곱연산 팩터 (~17% 풀)
//   - 아군 피해 강화, 아군 공격 강화, 낙인력: 딜러 전투력 미반영 (서포터 전용)

/** 젬 효과 풀 모델 */
export type GemEffectPoolType = 'additive' | 'standalone';

export interface GemEffectInfo {
  perLevel: number;         // Lv당 전투력 기여% (tooltip 기준)
  poolType: GemEffectPoolType; // 합연산(additive) / 독립(standalone)
  affectsDpsCombatPower: boolean; // 딜러 전투력 반영 여부
}

/** 아크 그리드 젬 효과 상세 정보 (실측 검증 2026-03-03) */
export const ARK_GRID_EFFECT_INFO: Record<string, GemEffectInfo> = {
  '추가 피해': {
    perLevel: 0.08,        // 실측: Lv.2=0.16, Lv.3=0.24, Lv.4=0.32, Lv.5=0.40
    poolType: 'additive',  // 무기(30%)+악세+팔찌+그리드 합연산, 풀 ~37%
    affectsDpsCombatPower: true,
  },
  '보스 피해': {
    perLevel: 0.083,       // 실측: Lv.2=0.16, Lv.5=0.41 → 0.082%/Lv
    poolType: 'standalone', // 각인(원한 등)과 별개 독립 곱연산
    affectsDpsCombatPower: true,
  },
  '공격력': {
    perLevel: 0.037,       // 총합 Lv.33=1.21% → 0.0367%/Lv
    poolType: 'additive',  // 보석 공격력%+그리드 합연산, 풀 ~17%
    affectsDpsCombatPower: true,
  },
  '낙인력': {
    perLevel: 0,           // 전투력 미반영 (파티 시너지 전용, 실측 확인)
    poolType: 'standalone',
    affectsDpsCombatPower: false,
  },
  '아군 피해 강화': {
    perLevel: 0.052,       // Lv.1=0.05, Lv.3=0.15 → 서포터 캐릭 기준
    poolType: 'additive',
    affectsDpsCombatPower: false, // 딜러 전투력 미반영
  },
  '아군 공격 강화': {
    perLevel: 0.13,        // Lv.8=1.04% → 서포터 캐릭 기준
    poolType: 'additive',
    affectsDpsCombatPower: false, // 딜러 전투력 미반영
  },
};

/** 하위 호환: 기존 Record<string, number> 형태 */
export const ARK_GRID_EFFECT_PER_LEVEL: Record<string, number> = Object.fromEntries(
  Object.entries(ARK_GRID_EFFECT_INFO).map(([k, v]) => [k, v.perLevel])
);

/**
 * 아크 그리드 코어 옵션 전투력 누적% 테이블
 * 값: 해당 P에서의 누적 전투력 증가% (곱연산 요소로 사용)
 * 고대 = 유물 + 1.00% (17P 이상에서만 적용)
 */
export const CORE_OPTION_TABLE = {
  // ── 질서 코어 (직업/종류 무관, 해=달 > 별) ──
  질서_해달: {
    유물: { 10: 1.50, 14: 4.00, 17: 7.50, 18: 7.67, 19: 7.83, 20: 8.00 },
    고대: { 10: 1.50, 14: 4.00, 17: 8.50, 18: 8.67, 19: 8.83, 20: 9.00 },
  },
  질서_별: {
    유물: { 10: 1.00, 14: 2.50, 17: 4.50, 18: 4.67, 19: 4.83, 20: 5.00 },
    고대: { 10: 1.00, 14: 2.50, 17: 5.50, 18: 5.67, 19: 5.83, 20: 6.00 },
  },

  // ── 혼돈의 해 (현란한 공격 > 안정적/재빠른, 차이 1%) ──
  혼돈_해_현란한공격: {
    유물: { 10: 0.50, 14: 1.00, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 },
    고대: { 10: 0.50, 14: 1.00, 17: 3.50, 18: 3.67, 19: 3.83, 20: 4.00 },
  },
  혼돈_해_안정적_재빠른: {
    유물: { 10: 0, 14: 0.50, 17: 1.50, 18: 1.67, 19: 1.83, 20: 2.00 },
    고대: { 10: 0, 14: 0.50, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 },
  },

  // ── 혼돈의 달 (불타는 일격 > 흡수/부수는, 차이 1%) ──
  혼돈_달_불타는일격: {
    유물: { 10: 0.50, 14: 1.00, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 },
    고대: { 10: 0.50, 14: 1.00, 17: 3.50, 18: 3.67, 19: 3.83, 20: 4.00 },
  },
  혼돈_달_흡수_부수는: {
    유물: { 10: 0, 14: 0.50, 17: 1.50, 18: 1.67, 19: 1.83, 20: 2.00 },
    고대: { 10: 0, 14: 0.50, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 },
  },

  // ── 혼돈의 별 (공격 > 무기) ──
  혼돈_별_공격: {
    유물: { 10: 0.50, 14: 1.00, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 },
    고대: { 10: 0.50, 14: 1.00, 17: 3.50, 18: 3.67, 19: 3.83, 20: 4.00 },
  },
  혼돈_별_무기: {
    // 무기 공격력 기반 (엔드스펙 무공 184,000 기준 환산치, 유물만)
    유물: { 10: 0.35, 14: 0.70, 17: 2.20, 18: 2.30, 19: 2.41, 20: 2.53 },
  },
} as const;

// 혼돈 코어 이름 → 테이블 키 매핑
export const CHAOS_CORE_NAME_MAP: Record<string, string> = {
  // 혼돈의 해
  '현란한 공격': '혼돈_해_현란한공격',
  '안정적인 공격': '혼돈_해_안정적_재빠른',
  '재빠른 공격': '혼돈_해_안정적_재빠른',
  // 혼돈의 달
  '불타는 일격': '혼돈_달_불타는일격',
  '흡수하는 일격': '혼돈_달_흡수_부수는',
  '부수는 일격': '혼돈_달_흡수_부수는',
  // 혼돈의 별
  '공격': '혼돈_별_공격',
  '무기': '혼돈_별_무기',
};

/**
 * 아크 그리드 젬 효과 변경 시 전투력 변화% 계산
 *
 * 풀 모델 지원:
 * - standalone (보스피해): 독립 곱연산 → (1 + new%) / (1 + cur%) - 1
 * - additive (추가피해, 공격력): 합연산 풀에 포함 → poolOtherPercent 필요
 *   → (1 + (poolOther + new%) / 100) / (1 + (poolOther + cur%) / 100) - 1
 *
 * @param poolOtherPercent - additive 효과의 경우 그리드 외 다른 소스의 합계%
 *                           (예: 추가피해 = 무기30% + 악세1.6% + 팔찌2.5% ≈ 34%)
 *                           standalone 효과에서는 무시됨
 */
export function getArkGridEffectChange(
  effectName: string,
  currentLevel: number,
  newLevel: number,
  poolOtherPercent?: number,
): { currentPercent: number; newPercent: number; changeRate: number } {
  const info = ARK_GRID_EFFECT_INFO[effectName];
  const perLevel = info?.perLevel || 0;
  const currentPercent = currentLevel * perLevel;
  const newPercent = newLevel * perLevel;

  if (info?.poolType === 'additive' && poolOtherPercent !== undefined) {
    // 합연산: 그리드 효과는 다른 소스와 합산되어 하나의 곱연산 요소를 형성
    const curPool = poolOtherPercent + currentPercent;
    const newPool = poolOtherPercent + newPercent;
    const changeRate = curPool > 0
      ? (1 + newPool / 100) / (1 + curPool / 100) - 1
      : newPool / 100;
    return { currentPercent, newPercent, changeRate };
  }

  // standalone 또는 poolOtherPercent 미제공: 독립 곱연산
  const changeRate = currentPercent > 0
    ? (1 + newPercent / 100) / (1 + currentPercent / 100) - 1
    : newPercent / 100;
  return { currentPercent, newPercent, changeRate };
}

/**
 * 코어 옵션 누적 전투력% 조회
 * @param tableKey - CORE_OPTION_TABLE의 키 (예: '질서_해달', '혼돈_해_현란한공격')
 * @param grade - '유물' | '고대'
 * @param point - 코어 포인트 (0~20)
 * @returns 해당 P에서의 누적 전투력 증가%
 */
export function getCoreOptionPower(
  tableKey: string,
  grade: '유물' | '고대',
  point: number,
): number {
  const table = CORE_OPTION_TABLE[tableKey as keyof typeof CORE_OPTION_TABLE];
  if (!table) return 0;
  const gradeTable = table[grade as keyof typeof table] as Record<number, number> | undefined;
  if (!gradeTable) return 0;

  // 해당 P 이하의 가장 큰 임계점 값 찾기
  let result = 0;
  for (const [threshold, pct] of Object.entries(gradeTable)) {
    if (point >= Number(threshold)) result = pct;
  }
  return result;
}

/**
 * 코어 슬롯 정보로부터 테이블 키 결정
 * @param slotName - API 슬롯 이름 (예: "질서의 해 코어 : 회오리")
 * @param grade - 코어 등급
 * @returns { tableKey, grade }
 */
export function getCoreTableKey(
  slotName: string,
): { tableKey: string; category: string; coreName: string } {
  // "질서의 해 코어 : 회오리" → 질서/혼돈, 해/달/별, 코어이름
  const isOrder = slotName.includes('질서');
  const isChaos = slotName.includes('혼돈');

  let celestial = '';
  if (slotName.includes('해')) celestial = '해';
  else if (slotName.includes('달')) celestial = '달';
  else if (slotName.includes('별')) celestial = '별';

  // 코어 이름 추출 ("코어 : " 뒤의 부분)
  const nameMatch = slotName.match(/코어\s*:\s*(.+)/);
  const coreName = nameMatch ? nameMatch[1].trim() : '';

  let tableKey = '';

  if (isOrder) {
    // 질서 코어: 해/달은 같은 테이블, 별은 별도
    tableKey = celestial === '별' ? '질서_별' : '질서_해달';
  } else if (isChaos) {
    // 혼돈 코어: 코어 이름으로 매핑
    tableKey = CHAOS_CORE_NAME_MAP[coreName] || '';
    // 매핑 실패 시 기본값
    if (!tableKey) {
      if (celestial === '해') tableKey = '혼돈_해_현란한공격';
      else if (celestial === '달') tableKey = '혼돈_달_불타는일격';
      else tableKey = '혼돈_별_공격';
    }
  }

  return { tableKey, category: celestial, coreName };
}

/**
 * 아크 그리드 코어 P 변경 시 전투력 변화 팩터 계산 (신규)
 * @returns 전투력 곱연산 변화 팩터 (예: 1.05 = +5%)
 */
export function getArkGridCoreOptionFactor(
  currentP: number,
  newP: number,
  tableKey?: string,
  grade?: '유물' | '고대',
): number {
  // 테이블 키가 없으면 질서_해달 유물 기본값
  const tk = tableKey || '질서_해달';
  const gr = grade || '유물';

  const currentPower = getCoreOptionPower(tk, gr, currentP);
  const newPower = getCoreOptionPower(tk, gr, newP);

  if (currentPower === 0 && newPower === 0) return 1;
  return (1 + newPower / 100) / (1 + currentPower / 100);
}

// ════════════════════════════════════
// 펫 방범대
// ════════════════════════════════════
export const PET_PATROL_POWER: Record<string, number> = {
  '상': 0.77,
  '중': 0.54,
  '하': 0.31,
};

// ════════════════════════════════════
// T4 장비 강화 단계별 스탯 테이블
// ════════════════════════════════════

// ── 전율 (운명의 전율) ──
// 1~16강: 단계당 ~2.64%~2.91% 증가 (점진적)
// 17~25강: 단계당 정확히 2.5% 증가
export const T4_JEONRYUL_ATK_BY_LEVEL: Record<number, number> = {
  1: 128059, 2: 131439, 3: 134936, 4: 138556, 5: 142303,
  6: 146182, 7: 150196, 8: 154350, 9: 158649, 10: 163099,
  11: 167706, 12: 172473, 13: 177406, 14: 182514, 15: 187799,
  16: 193270, 17: 198101, 18: 203054, 19: 208130, 20: 213333,
  21: 218667, 22: 224133, 23: 229737, 24: 235480, 25: 241367,
};

// ── 업화 (계승 전 장비) ──
// 1~4강: 단계당 ~8.5~10% 증가 (대폭), 5~25강: 단계당 ~2.2~2.7% 증가
export const T4_UPHWA_WEAPON_ATK_BY_LEVEL: Record<number, number> = {
  1: 67051, 2: 73796, 3: 80599, 4: 87463, 5: 89390,
  6: 91381, 7: 93439, 8: 95566, 9: 97764, 10: 100036,
  11: 102384, 12: 104811, 13: 107429, 14: 110139, 15: 112944,
  16: 115847, 17: 118851, 18: 121961, 19: 125180, 20: 128511,
  21: 131959, 22: 135527, 23: 139221, 24: 143044, 25: 147000,
};

// 업화 방어구: 부위별 힘/민/지 (비율은 전 부위 동일, 대표값으로 투구 사용)
export const T4_UPHWA_ARMOR_STAT_BY_LEVEL: Record<number, number> = {
  1: 38669, 2: 42565, 3: 46495, 4: 50459, 5: 51572,
  6: 52722, 7: 53911, 8: 55139, 9: 56409, 10: 57721,
  11: 59077, 12: 60478, 13: 61991, 14: 63556, 15: 65176,
  16: 66852, 17: 68588, 18: 70384, 19: 72243, 20: 74167,
  21: 76158, 22: 78219, 23: 80352, 24: 82560, 25: 84845,
};

/** 하위 호환용 별칭 */
export const T4_WEAPON_ATK_BY_LEVEL = T4_JEONRYUL_ATK_BY_LEVEL;

/** 장비 이름에서 세트 종류 판별 */
export function getEquipmentSetType(equipmentName: string): '전율' | '업화' {
  if (equipmentName.includes('업화')) return '업화';
  return '전율';
}

/** 세트 종류에 맞는 무기 테이블 반환 */
function getWeaponTable(setType: '전율' | '업화'): Record<number, number> {
  return setType === '업화' ? T4_UPHWA_WEAPON_ATK_BY_LEVEL : T4_JEONRYUL_ATK_BY_LEVEL;
}

/** 세트 종류에 맞는 방어구 비율 테이블 반환 */
function getArmorTable(setType: '전율' | '업화'): Record<number, number> {
  return setType === '업화' ? T4_UPHWA_ARMOR_STAT_BY_LEVEL : T4_JEONRYUL_ATK_BY_LEVEL;
}

/** 무기 강화 단계 변경 시 전투력 변화 계산
 *  기본 공격력 = sqrt(힘민지 × 무기공 / 6) → 무기공만 변경 시 변화율 = sqrt(비율) - 1
 */
export function getWeaponEnhancePowerChange(
  combatPower: number,
  currentLevel: number,
  newLevel: number,
  equipmentName?: string,
): number {
  const table = getWeaponTable(getEquipmentSetType(equipmentName || ''));
  const from = table[currentLevel];
  const to = table[newLevel];
  if (!from || !to || from === to) return 0;
  const changeRate = Math.sqrt(to / from) - 1;
  return Math.round(combatPower * changeRate);
}

/** 방어구 강화 단계 변경 시 전투력 변화 계산
 *  기본 공격력 = sqrt(힘민지 × 무기공 / 6)
 *  방어구 강화 → 힘민지 변동 → sqrt(new_힘/old_힘) - 1
 *  @param combatPower - 현재 전투력
 *  @param currentMainStat - 해당 부위의 현재 힘/민/지 (API 기본 효과)
 *  @param totalMainStat - 전체 힘/민/지 합계 (모든 장비 mainStat 합)
 *  @param currentLevel - 현재 강화 단계
 *  @param newLevel - 변경할 강화 단계
 */
export function getArmorEnhancePowerChange(
  combatPower: number,
  currentMainStat: number,
  totalMainStat: number,
  currentLevel: number,
  newLevel: number,
  equipmentName?: string,
): number {
  if (currentLevel === newLevel || totalMainStat <= 0 || currentMainStat <= 0) return 0;
  const table = getArmorTable(getEquipmentSetType(equipmentName || ''));
  const from = table[currentLevel];
  const to = table[newLevel];
  if (!from || !to) return 0;
  // 해당 부위의 힘 변화량
  const ratio = to / from;
  const newPieceStat = currentMainStat * ratio;
  const deltaStat = newPieceStat - currentMainStat;
  // 전체 힘 중 변화분 → 기본 공격력 변화율 = sqrt(1 + delta/total) - 1
  const changeRate = Math.sqrt(1 + deltaStat / totalMainStat) - 1;
  return Math.round(combatPower * changeRate);
}

// ════════════════════════════════════
// 아이템 레벨 기본 전투력 테이블 (참고용)
// ════════════════════════════════════
// 실제 공식은 sqrt(힘민지 × 무기공격력 / 6) × 0.0288
// 힘민지, 무기공격력 모두 API에서 가져올 수 있으므로 직접 계산 가능
// 이 테이블은 대략적 참고용
export const ITEM_LEVEL_POWER_TABLE: Record<number, number> = {
  1540: 45000,
  1560: 55000,
  1580: 65000,
  1600: 80000,
  1610: 90000,
  1620: 100000,
  1630: 115000,
  1640: 130000,
  1650: 148000,
  1660: 168000,
  1670: 190000,
  1680: 215000,
  1690: 245000,
  1700: 280000,
  1710: 315000,
  1720: 355000,
};

export function getBaseItemLevelPower(itemLevel: number): number {
  const keys = Object.keys(ITEM_LEVEL_POWER_TABLE).map(Number).sort((a, b) => a - b);
  if (itemLevel <= keys[0]) return ITEM_LEVEL_POWER_TABLE[keys[0]];
  if (itemLevel >= keys[keys.length - 1]) return ITEM_LEVEL_POWER_TABLE[keys[keys.length - 1]];

  let lower = keys[0], upper = keys[keys.length - 1];
  for (const k of keys) {
    if (k <= itemLevel) lower = k;
    if (k >= itemLevel) { upper = k; break; }
  }

  const lowerVal = ITEM_LEVEL_POWER_TABLE[lower];
  const upperVal = ITEM_LEVEL_POWER_TABLE[upper];
  if (lower === upper) return lowerVal;

  const ratio = (itemLevel - lower) / (upper - lower);
  return Math.round(lowerVal + (upperVal - lowerVal) * ratio);
}
