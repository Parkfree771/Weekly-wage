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
export const ARK_PASSIVE_POWER_PER_POINT = {
  evolution: 0.5,      // 진화 2T-4T 포인트당 0.5%
  enlightenment: 0.7,  // 깨달음 포인트당 0.7%
  leap: 0.2,           // 도약 포인트당 0.2%
} as const;

export function getArkPassivePower(evolution: number, enlightenment: number, leap: number): number {
  return (
    evolution * ARK_PASSIVE_POWER_PER_POINT.evolution +
    enlightenment * ARK_PASSIVE_POWER_PER_POINT.enlightenment +
    leap * ARK_PASSIVE_POWER_PER_POINT.leap
  );
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

// T4 보석 기본 공격력% (11개 기준)
export const GEM_T4_BASE_ATK_PERCENT: Record<number, number> = {
  6: 4.95, 7: 6.60, 8: 8.80, 9: 11.00, 10: 13.20,
};

/** 보석 전투력 조회 (겁화/작열/멸화/홍염 구분 없이 동일) */
export function getGemPower(tier: number, level: number): number {
  const key = `${tier}-${level}`;
  return GEM_POWER_TABLE[key] || 0;
}

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
// (치명 + 특화 + 신속) × 0.03 = 전투력 증가%
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
// category: 분류, tiers: [하, 중, 상] 수치, combatPower: 전투력 영향 여부

export type BraceletOptionDef = {
  id: string;
  category: 'fixed' | 'dealer_combo' | 'dealer_simple' | 'weapon_buff' | 'support_combo' | 'support_simple';
  description: string;
  tiers: [string, string, string]; // [하, 중, 상]
  combatPower: boolean;
  // API 텍스트 매칭 키워드 (첫 줄 기준, 긴 것 우선)
  matchKeywords: string[];
  // 복합효과 2번째 줄 매칭 키워드 (없으면 단일 라인)
  comboKeywords?: string[];
};

export const BRACELET_ALL_OPTIONS: BraceletOptionDef[] = [
  // ═══════════════════════════════════
  // 고정효과 (전투력 미반영)
  // ═══════════════════════════════════
  {
    id: 'atk_move_speed', category: 'fixed',
    description: '공격 및 이동 속도 증가',
    tiers: ['4%', '5%', '6%'], combatPower: false,
    matchKeywords: ['공격 및 이동 속도'],
  },
  {
    id: 'seed_dmg', category: 'fixed',
    description: '시드 등급 이하 몬스터에게 주는 피해 증가',
    tiers: ['4%', '5%', '6%'], combatPower: false,
    matchKeywords: ['시드 등급 이하 몬스터에게 주는 피해'],
  },
  {
    id: 'seed_def', category: 'fixed',
    description: '시드 등급 이하 몬스터에게 받는 피해 감소',
    tiers: ['6%', '8%', '10%'], combatPower: false,
    matchKeywords: ['시드 등급 이하 몬스터에게 받는 피해'],
  },
  {
    id: 'phys_def', category: 'fixed',
    description: '물리 방어력',
    tiers: ['+5000', '+6000', '+7000'], combatPower: false,
    matchKeywords: ['물리 방어력'],
  },
  {
    id: 'mag_def', category: 'fixed',
    description: '마법 방어력',
    tiers: ['+5000', '+6000', '+7000'], combatPower: false,
    matchKeywords: ['마법 방어력'],
  },
  {
    id: 'max_hp', category: 'fixed',
    description: '최대 생명력',
    tiers: ['+11200', '+14000', '+16800'], combatPower: false,
    matchKeywords: ['최대 생명력'],
  },
  {
    id: 'hp_regen', category: 'fixed',
    description: '전투 중 생명력 회복량',
    tiers: ['+100', '+130', '+160'], combatPower: false,
    matchKeywords: ['전투 중 생명력 회복량'],
  },
  {
    id: 'resource_regen', category: 'fixed',
    description: '전투자원 자연 회복량',
    tiers: ['8%', '10%', '12%'], combatPower: false,
    matchKeywords: ['전투자원 자연 회복량'],
  },
  {
    id: 'move_cd', category: 'fixed',
    description: '이동기 및 기상기 재사용 대기 시간 감소',
    tiers: ['8%', '10%', '12%'], combatPower: false,
    matchKeywords: ['이동기 및 기상기 재사용 대기 시간'],
  },
  {
    id: 'cc_immune', category: 'fixed',
    description: '경직 및 피격 이상 면역',
    tiers: ['80초', '70초', '60초'], combatPower: false,
    matchKeywords: ['경직 및 피격 이상에 면역'],
  },

  // ═══════════════════════════════════
  // 부여효과 - 복합 딜러 (전투력 반영)
  // ═══════════════════════════════════
  {
    id: 'crit_rate_combo', category: 'dealer_combo',
    description: '치명타 적중률 + 치명타 적주피 1.5%',
    tiers: ['3.4%', '4.2%', '5.0%'], combatPower: true,
    matchKeywords: ['치명타 적중률이'],
    comboKeywords: ['치명타로 적중 시 적에게 주는 피해'],
  },
  {
    id: 'crit_dmg_combo', category: 'dealer_combo',
    description: '치명타 피해 + 치명타 적주피 1.5%',
    tiers: ['6.8%', '8.4%', '10.0%'], combatPower: true,
    matchKeywords: ['치명타 피해가'],
    comboKeywords: ['치명타로 적중 시 적에게 주는 피해'],
  },
  {
    id: 'enemy_dmg_combo', category: 'dealer_combo',
    description: '적에게 주는 피해 + 무력화 상태 적주피',
    tiers: ['2.0%+4.0%', '2.5%+4.5%', '3.0%+5.0%'], combatPower: true,
    matchKeywords: ['적에게 주는 피해가'],
    comboKeywords: ['무력화 상태의 적에게 주는 피해'],
  },
  {
    id: 'add_dmg_combo', category: 'dealer_combo',
    description: '추가 피해 + 대악마 계열 피해량 2.5%',
    tiers: ['2.5%', '3.0%', '3.5%'], combatPower: true,
    matchKeywords: ['추가 피해가'],
    comboKeywords: ['대악마 계열 피해량'],
  },
  {
    id: 'cd_enemy_dmg', category: 'dealer_combo',
    description: '쿨타임 증가 2% + 적에게 주는 피해 증가',
    tiers: ['4.5%', '5.0%', '5.5%'], combatPower: true,
    matchKeywords: ['재사용 대기 시간이', '적에게 주는 피해가'],
  },

  // ═══════════════════════════════════
  // 부여효과 - 서포터 복합
  // ═══════════════════════════════════
  {
    id: 'def_reduce', category: 'support_combo',
    description: '방어력 감소 + 아군 공격력 강화',
    tiers: ['1.8%+2.0%', '2.1%+2.5%', '2.5%+3.0%'], combatPower: true,
    matchKeywords: ['대상의 방어력을'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'crit_resist_reduce', category: 'support_combo',
    description: '치명타 저항 감소 + 아군 공격력 강화',
    tiers: ['1.8%+2.0%', '2.1%+2.5%', '2.5%+3.0%'], combatPower: true,
    matchKeywords: ['대상의 치명타 저항을'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'shield_dmg', category: 'support_combo',
    description: '보호효과 적주피 + 아군 공격력 강화',
    tiers: ['0.9%+2.0%', '1.1%+2.5%', '1.3%+3.0%'], combatPower: true,
    matchKeywords: ['보호 효과가 적용된 대상'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'crit_dmg_resist_reduce', category: 'support_combo',
    description: '치명타 피해 저항 감소 + 아군 공격력 강화',
    tiers: ['3.6%+2.0%', '4.2%+2.5%', '4.8%+3.0%'], combatPower: true,
    matchKeywords: ['대상의 치명타 피해 저항을'],
    comboKeywords: ['아군 공격력 강화 효과'],
  },

  // ═══════════════════════════════════
  // 부여효과 - 무기 공격력 버프 (전투력 반영)
  // ═══════════════════════════════════
  {
    id: 'weapon_stack', category: 'weapon_buff',
    description: '적중시 무기 공격력 중첩 + 공이속 1%',
    tiers: ['1160', '1320', '1480'], combatPower: true,
    matchKeywords: ['매 초 마다', '무기 공격력이'],
    comboKeywords: ['공격 및 이동 속도가'],
  },
  {
    id: 'weapon_hp_cond', category: 'weapon_buff',
    description: '무기 공격력 + 체력 50% 이상 추가 무기 공격력',
    tiers: ['7200+2000', '8100+2200', '9000+2400'], combatPower: true,
    matchKeywords: ['무기 공격력이'],
    comboKeywords: ['생명력이 50% 이상'],
  },
  {
    id: 'weapon_time_stack', category: 'weapon_buff',
    description: '무기 공격력 + 30초마다 무기 공격력 중첩',
    tiers: ['6900+120', '7800+140', '8700+150'], combatPower: true,
    matchKeywords: ['무기 공격력이'],
    comboKeywords: ['30초 마다'],
  },

  // ═══════════════════════════════════
  // 부여효과 - 단일 딜러 (전투력 반영)
  // ═══════════════════════════════════
  {
    id: 'enemy_dmg', category: 'dealer_simple',
    description: '적에게 주는 피해 증가',
    tiers: ['2.0%', '2.5%', '3.0%'], combatPower: true,
    matchKeywords: ['적에게 주는 피해가'],
  },
  {
    id: 'add_dmg', category: 'dealer_simple',
    description: '추가 피해',
    tiers: ['+3.0%', '+3.5%', '+4.0%'], combatPower: true,
    matchKeywords: ['추가 피해'],
  },
  {
    id: 'back_atk_dmg', category: 'dealer_simple',
    description: '백어택 스킬 적주피',
    tiers: ['2.5%', '3.0%', '3.5%'], combatPower: true,
    matchKeywords: ['백어택 스킬이 적에게 주는 피해'],
  },
  {
    id: 'head_atk_dmg', category: 'dealer_simple',
    description: '헤드어택 스킬 적주피',
    tiers: ['2.5%', '3.0%', '3.5%'], combatPower: true,
    matchKeywords: ['헤드어택 스킬이 적에게 주는 피해'],
  },
  {
    id: 'neutral_atk_dmg', category: 'dealer_simple',
    description: '방향성 공격이 아닌 스킬(타대) 적주피',
    tiers: ['2.5%', '3.0%', '3.5%'], combatPower: true,
    matchKeywords: ['방향성 공격이 아닌 스킬이 적에게 주는 피해'],
  },
  {
    id: 'crit_rate', category: 'dealer_simple',
    description: '치명타 적중률',
    tiers: ['+3.4%', '+4.2%', '+5.0%'], combatPower: true,
    matchKeywords: ['치명타 적중률'],
  },
  {
    id: 'crit_dmg', category: 'dealer_simple',
    description: '치명타 피해',
    tiers: ['+6.8%', '+8.4%', '+10.0%'], combatPower: true,
    matchKeywords: ['치명타 피해'],
  },
  {
    id: 'weapon_flat', category: 'dealer_simple',
    description: '무기 공격력',
    tiers: ['+7200', '+8100', '+9000'], combatPower: true,
    matchKeywords: ['무기 공격력'],
  },

  // ═══════════════════════════════════
  // 부여효과 - 단일 서포터
  // ═══════════════════════════════════
  {
    id: 'party_protect', category: 'support_simple',
    description: '파티원 보호 및 회복 효과',
    tiers: ['2.5%', '3.0%', '3.5%'], combatPower: false,
    matchKeywords: ['파티원 보호 및 회복 효과'],
  },
  {
    id: 'ally_atk_enhance', category: 'support_simple',
    description: '아군 공격력 강화 효과',
    tiers: ['+4.0%', '+5.0%', '+6.0%'], combatPower: true,
    matchKeywords: ['아군 공격력 강화 효과'],
  },
  {
    id: 'ally_dmg_enhance', category: 'support_simple',
    description: '아군 피해량 강화 효과',
    tiers: ['+6.0%', '+7.5%', '+9.0%'], combatPower: true,
    matchKeywords: ['아군 피해량 강화 효과'],
  },
];

// ── 팔찌 부여효과 전투력 계수 (상/중/하) ──
// id → { 하, 중, 상 } 전투력 증가%
// 출처: combat-power-research.ts BRACELET_EFFECTS / BRACELET_WEAPON_BUFF

export const BRACELET_EFFECT_POWER: Record<string, { 하: number; 중: number; 상: number }> = {
  // 복합 딜러
  'crit_rate_combo':    { 하: 3.5,    중: 4.0,    상: 4.5 },
  'crit_dmg_combo':     { 하: 3.5,    중: 4.0,    상: 4.5 },
  'enemy_dmg_combo':    { 하: 2.8,    중: 3.4,    상: 4.0 },
  'add_dmg_combo':      { 하: 3.5,    중: 4.0,    상: 4.5 },
  'cd_enemy_dmg':       { 하: 3.5,    중: 4.0,    상: 4.5 },
  // 단일 딜러
  'enemy_dmg':          { 하: 2.0,    중: 2.5,    상: 3.0 },
  'add_dmg':            { 하: 2.3076, 중: 2.6922, 상: 3.0768 },
  'back_atk_dmg':       { 하: 1.75,   중: 2.10,   상: 2.45 },
  'head_atk_dmg':       { 하: 1.75,   중: 2.10,   상: 2.45 },
  'neutral_atk_dmg':    { 하: 2.5,    중: 3.0,    상: 3.5 },
  'crit_rate':          { 하: 2.38,   중: 2.94,   상: 3.5 },
  'crit_dmg':           { 하: 2.26644, 중: 2.79972, 상: 3.333 },
  // 무공 버프 (무기공격력 184,000 기준 근사)
  'weapon_stack':       { 하: 1.88,   중: 2.14,   상: 2.40 },
  'weapon_hp_cond':     { 하: 0.54,   중: 0.59,   상: 0.65 },
  'weapon_time_stack':  { 하: 1.05,   중: 1.13,   상: 1.21 },
  // 무기 공격력 flat (기본 공격력에서 계산, 근사)
  'weapon_flat':        { 하: 1.44,   중: 1.62,   상: 1.80 },
  // 서포터 (아군 강화 효과는 전투력 반영)
  'ally_atk_enhance':   { 하: 0.52,   중: 0.65,   상: 0.78 },
  'ally_dmg_enhance':   { 하: 0.52,   중: 0.65,   상: 0.78 },
};

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
// 전체 Effects = 모든 젬의 동종 효과 Level 합산 → %값으로 전투력 곱연산 반영
// API /arkgrid Effects에서 합산 %를 직접 가져올 수 있음

/** 아크 그리드 젬 효과별 Level당 전투력 증가% (실측) */
export const ARK_GRID_EFFECT_PER_LEVEL: Record<string, number> = {
  '추가 피해': 0.08,       // Lv당 0.08% (실측: Lv.2=0.16, Lv.3=0.24, Lv.4=0.32, Lv.5=0.40)
  '낙인력': 0,              // 전투력 미반영 (파티 시너지 전용, 실측 확인)
  '아군 피해 강화': 0.052,  // Lv당 0.052% (실측: Lv.1=0.05, Lv.3=0.15)
  '공격력': 0.037,           // Lv당 0.037% (총합 Lv.33=1.21%)
  '보스 피해': 0.083,        // Lv당 0.083% (실측: Lv.2=0.16, Lv.5=0.41)
  '아군 공격 강화': 0.13,    // Lv당 0.13% (Lv.8=1.04%, 추가 검증 필요)
};

/**
 * 아크 그리드 코어 옵션 전투력 기여% (실측 - 처어단자아 회오리 코어 기준)
 * 코어 옵션은 P 임계점(10P, 14P, 17P, 18P, 19P, 20P) 달성 시 활성화
 * 코어 종류별로 값이 약간 다를 수 있음 (회오리: 7.40%, 다른 코어: 7.33%)
 */
export const ARK_GRID_CORE_OPTION_POWER: Record<string, number> = {
  '10P': 0.911,       // 실측: 0P→13P에서 젬효과 차감
  '14P': 2.663,       // 실측: 13P→14P에서 젬변화 보정
  '17P+18P': 3.204,   // 실측: 14P→18P에서 젬변화 보정 (미분리)
  '19P': 0.457,       // 실측: 18P→19P에서 젬변화 보정
  // '20P': ???,       // 미측정
};

/** 아크 그리드 젬 효과 변경 시 전투력 변화% 계산 */
export function getArkGridEffectChange(
  effectName: string,
  currentLevel: number,
  newLevel: number,
): { currentPercent: number; newPercent: number; changeRate: number } {
  const perLevel = ARK_GRID_EFFECT_PER_LEVEL[effectName] || 0;
  const currentPercent = currentLevel * perLevel;
  const newPercent = newLevel * perLevel;
  const changeRate = currentPercent > 0
    ? (1 + newPercent / 100) / (1 + currentPercent / 100) - 1
    : newPercent / 100;
  return { currentPercent, newPercent, changeRate };
}

/**
 * 아크 그리드 코어 P 변경 시 전투력 변화% 계산
 * @param currentP - 현재 활성 P (0, 10, 14, 17, 18, 19, 20)
 * @param newP - 변경 후 P
 * @returns 전투력 곱연산 변화 팩터 (예: 1.05 = +5%)
 */
export function getArkGridCoreOptionFactor(currentP: number, newP: number): number {
  const thresholds = [10, 14, 17, 18, 19, 20];
  // 17P와 18P는 미분리이므로 17 도달 시 17P+18P 합산값 적용
  const perThreshold: Record<number, number> = {
    10: 0.911,
    14: 2.663,
    17: 3.204,  // 17P+18P 합산
    18: 0,      // 17에 포함
    19: 0.457,
    20: 0,      // 미측정
  };

  let factor = 1;
  for (const t of thresholds) {
    const wasActive = currentP >= t;
    const willActive = newP >= t;
    const pct = perThreshold[t] || 0;
    if (!wasActive && willActive) factor *= (1 + pct / 100);
    if (wasActive && !willActive) factor /= (1 + pct / 100);
  }
  return factor;
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
