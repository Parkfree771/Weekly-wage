// 전투력 계수 테이블
// 유저 분석 문서 기반의 룩업 테이블 (상대적 증가율 %)

// ============================
// 각인별 전투력 증가 계수
// ============================
// 유각 레벨(1~4) × 어빌스톤 레벨(1~10) 매트릭스
// 값: 전투력 증가율 (%)
export const ENGRAVING_MATRIX: Record<string, number[][]> = {
  // [유각레벨][어빌스톤레벨] = 증가율%
  // 주요 딜 각인들
  '원한': [
    // 어빌 1~10
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], // 유각 1
    [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0], // 유각 2
    [1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5, 12.0, 13.5, 15.0], // 유각 3
    [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0], // 유각 4
  ],
  '저주받은 인형': [
    [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0],
    [0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.4, 7.2, 8.0],
    [1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, 9.6, 10.8, 12.0],
    [1.6, 3.2, 4.8, 6.4, 8.0, 9.6, 11.2, 12.8, 14.4, 16.0],
  ],
  '예리한 둔기': [
    [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],
    [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0],
    [0.9, 1.8, 2.7, 3.6, 4.5, 5.4, 6.3, 7.2, 8.1, 9.0],
    [1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, 9.6, 10.8, 12.0],
  ],
  '돌격대장': [
    [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],
    [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0],
    [0.9, 1.8, 2.7, 3.6, 4.5, 5.4, 6.3, 7.2, 8.1, 9.0],
    [1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, 9.6, 10.8, 12.0],
  ],
  '기습의 대가': [
    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0],
    [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0],
    [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0],
    [0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.4, 7.2, 8.0],
  ],
  '아드레날린': [
    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0],
    [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0],
    [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0],
    [0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.4, 7.2, 8.0],
  ],
  '슈퍼 차지': [
    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0],
    [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0],
    [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0],
    [0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.4, 7.2, 8.0],
  ],
  // 기본 각인 (등록 안 된 각인은 기본값 사용)
  'default': [
    [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],
    [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0],
    [0.9, 1.8, 2.7, 3.6, 4.5, 5.4, 6.3, 7.2, 8.1, 9.0],
    [1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, 9.6, 10.8, 12.0],
  ],
};

// 각인 이름 목록 (시뮬레이터 선택용)
export const ENGRAVING_NAMES = [
  '원한', '저주받은 인형', '예리한 둔기', '돌격대장',
  '기습의 대가', '아드레날린', '슈퍼 차지',
  '결투의 대가', '바리케이드', '안정된 상태',
  '속전속결', '정밀 단도', '질량 증가',
  '타격의 대가', '진화의 유산',
];

// 각인 전투력 계수 조회
export function getEngravingCoefficient(
  engravingName: string,
  yukakLevel: number,
  abilityStoneLevel: number
): number {
  const matrix = ENGRAVING_MATRIX[engravingName] || ENGRAVING_MATRIX['default'];
  const yIdx = Math.max(0, Math.min(3, yukakLevel - 1));
  const aIdx = Math.max(0, Math.min(9, abilityStoneLevel - 1));
  return matrix[yIdx][aIdx];
}

// ============================
// 보석 티어/레벨별 전투력 증가율 (%)
// ============================
// 키: "티어-레벨", 값: 전투력 증가율%
export const GEM_POWER_TABLE: Record<string, number> = {
  // 티어4 보석
  '4-1': 0.3, '4-2': 0.6, '4-3': 1.0, '4-4': 1.5, '4-5': 2.0,
  '4-6': 2.8, '4-7': 3.5, '4-8': 4.5, '4-9': 5.5, '4-10': 7.0,
  // 티어3 보석 (레거시)
  '3-1': 0.2, '3-2': 0.4, '3-3': 0.7, '3-4': 1.0, '3-5': 1.5,
  '3-6': 2.0, '3-7': 2.5, '3-8': 3.2, '3-9': 4.0, '3-10': 5.0,
};

// 보석 종류별 가중치 (멸화가 홍염보다 전투력 기여 높음)
export const GEM_TYPE_WEIGHT: Record<string, number> = {
  '멸화': 1.0,
  '홍염': 0.7,
  '겁화': 1.0,  // 멸화 상위
  '작열': 0.7,  // 홍염 상위
};

// 보석 전투력 조회
export function getGemPower(tier: number, level: number, type: string): number {
  const key = `${tier}-${level}`;
  const basePower = GEM_POWER_TABLE[key] || 0;
  const weight = GEM_TYPE_WEIGHT[type] || 0.85;
  return basePower * weight;
}

// ============================
// 무기 품질별 전투력 증가율 (%)
// ============================
// 품질 0~100에 대한 추가 피해 기반 전투력 증가율
export const WEAPON_QUALITY_TABLE: Record<number, number> = {
  0: 0, 10: 0.8, 20: 1.6, 30: 2.4, 40: 3.2,
  50: 4.0, 60: 5.0, 67: 5.8, 70: 6.2, 75: 6.8,
  80: 7.5, 85: 8.2, 90: 9.0, 95: 10.0, 100: 12.0,
};

// 무기 품질에 대한 보간된 전투력 증가율
export function getWeaponQualityPower(quality: number): number {
  const clamped = Math.max(0, Math.min(100, quality));
  const keys = Object.keys(WEAPON_QUALITY_TABLE).map(Number).sort((a, b) => a - b);

  // 정확한 키 매치
  if (WEAPON_QUALITY_TABLE[clamped] !== undefined) {
    return WEAPON_QUALITY_TABLE[clamped];
  }

  // 보간
  let lower = 0, upper = 100;
  for (const k of keys) {
    if (k <= clamped) lower = k;
    if (k >= clamped) { upper = k; break; }
  }

  const lowerVal = WEAPON_QUALITY_TABLE[lower];
  const upperVal = WEAPON_QUALITY_TABLE[upper];
  if (lower === upper) return lowerVal;

  const ratio = (clamped - lower) / (upper - lower);
  return lowerVal + (upperVal - lowerVal) * ratio;
}

// ============================
// 전투 스탯별 전투력 계수
// ============================
// 스탯 100당 전투력 증가율 (%)
export const STAT_POWER_PER_100: Record<string, number> = {
  '치명': 0.35,
  '특화': 0.40,
  '신속': 0.30,
  '제압': 0.15,
  '인내': 0.10,
  '숙련': 0.20,
};

// ============================
// 카드 세트별 전투력 증가율 (%)
// ============================
export const CARD_SET_POWER: Record<string, Record<number, number>> = {
  '남겨진 바람의 절벽': { 2: 0.5, 4: 1.5, 6: 4.0 },
  '세상을 구하는 빛': { 2: 0.5, 4: 1.5, 6: 3.5 },
  '카제로스의 군단장': { 2: 0.3, 4: 1.0, 6: 2.5 },
  '만개': { 2: 0.3, 4: 1.0, 6: 2.0 },
  '암흑 군단의 지배': { 2: 0.3, 4: 0.8, 6: 1.5 },
};

// 카드 세트 전투력 조회
export function getCardSetPower(setName: string, activeCount: number): number {
  const set = CARD_SET_POWER[setName];
  if (!set) return 0;
  // activeCount 이하의 가장 큰 키 찾기
  let power = 0;
  for (const count of [2, 4, 6]) {
    if (count <= activeCount && set[count]) {
      power = set[count];
    }
  }
  return power;
}

// ============================
// 장신구 연마 효과별 전투력 증가율 (%)
// ============================
export const ACCESSORY_GRINDING_POWER: Record<string, Record<string, number>> = {
  '공격력': { '하': 0.3, '중': 0.6, '상': 1.0 },
  '무기 공격력': { '하': 0.4, '중': 0.8, '상': 1.3 },
  '추가 피해': { '하': 0.3, '중': 0.5, '상': 0.8 },
  '적에게 주는 피해 증가': { '하': 0.4, '중': 0.7, '상': 1.1 },
  '치명타 피해': { '하': 0.2, '중': 0.4, '상': 0.7 },
  '치명타 적중률': { '하': 0.2, '중': 0.4, '상': 0.6 },
  '아군 공격력 강화 효과': { '하': 0.2, '중': 0.3, '상': 0.5 },
  '아군 피해 강화 효과': { '하': 0.2, '중': 0.3, '상': 0.5 },
};

// ============================
// 팔찌 특수 효과별 전투력 증가율 (%)
// ============================
export const BRACELET_EFFECT_POWER: Record<string, number> = {
  '치명타 피해 +': 0.8,
  '추가 피해 +': 0.7,
  '공격력 +': 1.0,
  '무기 공격력 +': 1.2,
  '적에게 주는 피해 +': 0.9,
  '치명타 적중률 +': 0.5,
  // 고정 효과
  '정밀': 0.5,
  '습격': 0.6,
  '급소': 0.4,
  '강타': 0.5,
  '열정': 0.3,
  '신념': 0.3,
};

// ============================
// 아크 패시브 포인트별 전투력 증가율
// ============================
// 진화/깨달음/도약 각각 포인트당 증가율
export const ARK_PASSIVE_POWER_PER_POINT: Record<string, number> = {
  '진화': 0.05,
  '깨달음': 0.08,
  '도약': 0.12,
};

// 아크 패시브 전투력 계산
export function getArkPassivePower(evolution: number, enlightenment: number, leap: number): number {
  return (
    evolution * ARK_PASSIVE_POWER_PER_POINT['진화'] +
    enlightenment * ARK_PASSIVE_POWER_PER_POINT['깨달음'] +
    leap * ARK_PASSIVE_POWER_PER_POINT['도약']
  );
}

// ============================
// 전투 레벨(아이템 레벨)별 전투력 기본 계수
// ============================
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

// 아이템 레벨에서 기본 전투력 보간
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
