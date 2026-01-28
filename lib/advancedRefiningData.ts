// T4 상급 재련 시스템 데이터
// 📘 실제 시뮬레이션용 완전판

// ============================================
// 1. 기본 상수
// ============================================

// 목표 경험치
export const EXP_PER_LEVEL = 100;        // 각 단계당 필요 경험치
export const EXP_PER_STAGE = 1000;       // 각 구간당 필요 경험치 (10단계)

// 턴 비율
export const NORMAL_TURN_RATIO = 0.83894;  // 일반턴 비율
export const BONUS_TURN_RATIO = 0.16106;   // 선조턴 비율
export const TURNS_FOR_BONUS = 6;          // 선조의 가호 충전에 필요한 일반턴 수

// ============================================
// 2. 성공 등급과 경험치
// ============================================

export type SuccessGrade = 'success' | 'great' | 'super';

export const SUCCESS_EXP: Record<SuccessGrade, number> = {
  success: 10,   // 성공
  great: 20,     // 대성공
  super: 40,     // 초대성공 (대성공x2)
};

// ============================================
// 3. 성공 확률 (숨결/책 조합별)
// ============================================

export type MaterialCombo = 'none' | 'breath' | 'book' | 'both';

// 각 조합별 성공/대성공/초대성공 확률
export const SUCCESS_RATES: Record<MaterialCombo, { success: number; great: number; super: number }> = {
  none:   { success: 0.80, great: 0.15, super: 0.05 },  // 아무것도 X
  breath: { success: 0.50, great: 0.30, super: 0.20 },  // 숨결만
  book:   { success: 0.30, great: 0.45, super: 0.25 },  // 책만
  both:   { success: 0.00, great: 0.60, super: 0.40 },  // 숨결 + 책
};

// ============================================
// 4. 선조 카드 (1~20단계)
// ============================================

export type AncestorCard1_20 = 'galatur' | 'gellar' | 'kuhumbar' | 'temer';

export const ANCESTOR_CARDS_1_20: Record<AncestorCard1_20, {
  name: string;
  probability: number;
  effect: string;
}> = {
  galatur:  { name: '갈라투르', probability: 0.15, effect: 'EXP ×5' },
  gellar:   { name: '겔라르',   probability: 0.35, effect: 'EXP ×3' },
  kuhumbar: { name: '쿠훔바르', probability: 0.15, effect: '기본 EXP +30' },
  temer:    { name: '테메르의 정', probability: 0.35, effect: '기본 EXP +10 + 다음 시도 무료' },
};

// ============================================
// 5. 선조 카드 (21~40단계)
// ============================================

export type AncestorCard21_40 = 'galatur' | 'gellar' | 'kuhumbar' | 'temer' | 'naber' | 'eber';

export const ANCESTOR_CARDS_21_40: Record<AncestorCard21_40, {
  name: string;
  probability: number;
  effect: string;
}> = {
  galatur:  { name: '갈라투르', probability: 0.125, effect: 'EXP ×5' },
  gellar:   { name: '겔라르',   probability: 0.25,  effect: 'EXP ×3' },
  kuhumbar: { name: '쿠훔바르', probability: 0.125, effect: '+30 EXP + 가호 재충전' },
  temer:    { name: '테메르',   probability: 0.25,  effect: '+10 EXP + 다음 시도 무료' },
  naber:    { name: '나베르',   probability: 0.125, effect: '다음 선조 강화 + 재충전' },
  eber:     { name: '에베르',   probability: 0.125, effect: '즉시 +100 EXP (1단계 상승)' },
};

// ============================================
// 6. 나베르 발동 후 강화된 선조 카드
// ============================================

export type EnhancedAncestorCard = 'galatur' | 'gellar' | 'kuhumbar' | 'temer' | 'eber';

export const ENHANCED_ANCESTOR_CARDS: Record<EnhancedAncestorCard, {
  name: string;
  probability: number;
  effect: string;
}> = {
  galatur:  { name: '갈라투르 (강화)', probability: 0.1429, effect: 'EXP ×7' },
  gellar:   { name: '겔라르 (강화)',   probability: 0.2857, effect: 'EXP ×5' },
  kuhumbar: { name: '쿠훔바르 (강화)', probability: 0.1429, effect: '+80 EXP + 가호 재충전' },
  temer:    { name: '테메르 (강화)',   probability: 0.2857, effect: '+30 EXP + 다음 시도 무료' },
  eber:     { name: '에베르 (강화)',   probability: 0.1429, effect: '즉시 +200 EXP (2단계 상승)' },
};

// ============================================
// 7. 재료 소모량 (시도당)
// ============================================

export type StageKey = '1-10' | '11-20' | '21-30' | '31-40';

// 방어구 재료
export const ARMOR_MATERIALS: Record<StageKey, {
  수호석: number;
  돌파석: number;
  아비도스: number;
  운명파편: number;
  골드: number;
  빙하: number;      // 숨결 사용 시
  실링: number;
  책: string;        // 책 종류
}> = {
  '1-10':  { 수호석: 150,  돌파석: 4,  아비도스: 5,  운명파편: 300,   골드: 475,  빙하: 4,  실링: 2850,  책: '재봉술1단' },
  '11-20': { 수호석: 270,  돌파석: 5,  아비도스: 5,  운명파편: 600,   골드: 900,  빙하: 6,  실링: 4000,  책: '재봉술2단' },
  '21-30': { 수호석: 1000, 돌파석: 18, 아비도스: 17, 운명파편: 7000,  골드: 2000, 빙하: 20, 실링: 44000, 책: '재봉술3단' },
  '31-40': { 수호석: 1200, 돌파석: 23, 아비도스: 19, 운명파편: 8000,  골드: 2400, 빙하: 24, 실링: 56000, 책: '재봉술4단' },
};

// 무기 재료
export const WEAPON_MATERIALS: Record<StageKey, {
  파괴석: number;
  돌파석: number;
  아비도스: number;
  운명파편: number;
  골드: number;
  용암: number;      // 숨결 사용 시
  실링: number;
  책: string;        // 책 종류
}> = {
  '1-10':  { 파괴석: 180,  돌파석: 5,  아비도스: 8,  운명파편: 500,   골드: 563,  용암: 4,  실링: 3150,  책: '야금술1단' },
  '11-20': { 파괴석: 330,  돌파석: 7,  아비도스: 9,  운명파편: 1000,  골드: 1250, 용암: 6,  실링: 5000,  책: '야금술2단' },
  '21-30': { 파괴석: 1200, 돌파석: 25, 아비도스: 28, 운명파편: 11500, 골드: 3000, 용암: 20, 실링: 55000, 책: '야금술3단' },
  '31-40': { 파괴석: 1400, 돌파석: 32, 아비도스: 30, 운명파편: 13000, 골드: 4000, 용암: 24, 실링: 70000, 책: '야금술4단' },
};

// 아이템 ID
export const ADVANCED_MATERIAL_IDS: Record<string, number> = {
  야금술1단: 66112711,
  재봉술1단: 66112712,
  야금술2단: 66112713,
  재봉술2단: 66112714,
  야금술3단: 66112715,
  재봉술3단: 66112716,
  야금술4단: 66112717,
  재봉술4단: 66112718,
  빙하: 66111132,
  용암: 66111131,
};

// ============================================
// 8. 유틸리티 함수
// ============================================

/**
 * 현재 레벨에서 구간 키 반환
 */
export function getStageKey(level: number): StageKey {
  if (level < 10) return '1-10';
  if (level < 20) return '11-20';
  if (level < 30) return '21-30';
  return '31-40';
}

/**
 * 현재 레벨에서 구간 번호 반환 (1, 2, 3, 4)
 */
export function getStageNumber(level: number): number {
  if (level < 10) return 1;
  if (level < 20) return 2;
  if (level < 30) return 3;
  return 4;
}

/**
 * 책 사용 가능 여부 확인 (모든 구간 사용 가능)
 */
export function canUseBook(level: number): boolean {
  return level < 40; // 모든 구간에서 책 사용 가능
}

/**
 * 성공 등급 결정 (확률 기반)
 */
export function rollSuccessGrade(combo: MaterialCombo): SuccessGrade {
  const rates = SUCCESS_RATES[combo];
  const roll = Math.random();

  if (roll < rates.super) return 'super';
  if (roll < rates.super + rates.great) return 'great';
  return 'success';
}

/**
 * 선조 카드 뽑기 (1~20단계)
 */
export function rollAncestorCard1_20(): AncestorCard1_20 {
  const roll = Math.random();
  let cumulative = 0;

  for (const [card, data] of Object.entries(ANCESTOR_CARDS_1_20)) {
    cumulative += data.probability;
    if (roll < cumulative) return card as AncestorCard1_20;
  }
  return 'temer'; // fallback
}

/**
 * 선조 카드 뽑기 (21~40단계)
 */
export function rollAncestorCard21_40(): AncestorCard21_40 {
  const roll = Math.random();
  let cumulative = 0;

  for (const [card, data] of Object.entries(ANCESTOR_CARDS_21_40)) {
    cumulative += data.probability;
    if (roll < cumulative) return card as AncestorCard21_40;
  }
  return 'temer'; // fallback
}

/**
 * 강화된 선조 카드 뽑기 (나베르 발동 후)
 */
export function rollEnhancedAncestorCard(): EnhancedAncestorCard {
  const roll = Math.random();
  let cumulative = 0;

  for (const [card, data] of Object.entries(ENHANCED_ANCESTOR_CARDS)) {
    cumulative += data.probability;
    if (roll < cumulative) return card as EnhancedAncestorCard;
  }
  return 'temer'; // fallback
}

/**
 * 일반턴 경험치 계산
 */
export function calculateNormalTurnExp(grade: SuccessGrade): number {
  return SUCCESS_EXP[grade];
}

/**
 * 선조턴 경험치 계산 (1~20단계)
 */
export function calculateBonusTurnExp1_20(
  card: AncestorCard1_20,
  baseExp: number
): { exp: number; nextFree: boolean; rechargeGaho: boolean } {
  switch (card) {
    case 'galatur':
      return { exp: baseExp * 5, nextFree: false, rechargeGaho: false };
    case 'gellar':
      return { exp: baseExp * 3, nextFree: false, rechargeGaho: false };
    case 'kuhumbar':
      return { exp: baseExp + 30, nextFree: false, rechargeGaho: false };
    case 'temer':
      return { exp: baseExp + 10, nextFree: true, rechargeGaho: false };
  }
}

/**
 * 선조턴 경험치 계산 (21~40단계)
 */
export function calculateBonusTurnExp21_40(
  card: AncestorCard21_40,
  baseExp: number
): { exp: number; nextFree: boolean; rechargeGaho: boolean; enhanceNext: boolean } {
  switch (card) {
    case 'galatur':
      return { exp: baseExp * 5, nextFree: false, rechargeGaho: false, enhanceNext: false };
    case 'gellar':
      return { exp: baseExp * 3, nextFree: false, rechargeGaho: false, enhanceNext: false };
    case 'kuhumbar':
      return { exp: baseExp + 30, nextFree: false, rechargeGaho: true, enhanceNext: false };
    case 'temer':
      return { exp: baseExp + 10, nextFree: true, rechargeGaho: false, enhanceNext: false };
    case 'naber':
      return { exp: 0, nextFree: false, rechargeGaho: true, enhanceNext: true };
    case 'eber':
      return { exp: 100, nextFree: false, rechargeGaho: false, enhanceNext: false }; // 즉시 1단계
  }
}

/**
 * 강화된 선조턴 경험치 계산
 */
export function calculateEnhancedBonusTurnExp(
  card: EnhancedAncestorCard,
  baseExp: number
): { exp: number; nextFree: boolean; rechargeGaho: boolean } {
  switch (card) {
    case 'galatur':
      return { exp: baseExp * 7, nextFree: false, rechargeGaho: false };
    case 'gellar':
      return { exp: baseExp * 5, nextFree: false, rechargeGaho: false };
    case 'kuhumbar':
      return { exp: baseExp + 80, nextFree: false, rechargeGaho: true };
    case 'temer':
      return { exp: baseExp + 30, nextFree: true, rechargeGaho: false };
    case 'eber':
      return { exp: 200, nextFree: false, rechargeGaho: false }; // 즉시 2단계
  }
}

// ============================================
// 9. 평균 시도 횟수 (평균 계산용)
// ============================================

// 1~10단계, 11~20단계용 (숨결 + 책 조합 가능)
export const AVERAGE_TRIES_1_20: Record<string, number> = {
  'none_none': 59.3,
  'none_breath': 52.4,
  'none_book': 49.5,
  'none_both': 44.6,
  'breath_none': 45.7,
  'breath_breath': 41.5,
  'breath_book': 39.7,
  'breath_both': 36.4,
  'book_none': 41.0,
  'book_breath': 37.6,
  'book_book': 36.1,
  'book_both': 33.4,
  'both_none': 34.0,
  'both_breath': 31.6,
  'both_book': 30.5,
  'both_both': 28.6,
};

// 21~30단계, 31~40단계용 (숨결 + 책 조합 가능)
export const AVERAGE_TRIES_21_40: Record<string, number> = {
  'none_none': 54.8,
  'none_breath': 48.2,
  'none_book': 45.6,
  'none_both': 41.0,
  'breath_none': 43.1,
  'breath_breath': 39.2,
  'breath_book': 37.5,
  'breath_both': 34.2,
  'book_none': 37.8,
  'book_breath': 34.9,
  'book_book': 33.5,
  'book_both': 30.8,
  'both_none': 31.4,
  'both_breath': 29.3,
  'both_book': 28.2,
  'both_both': 26.5,
};

// ============================================
// 10. 평균 계산용 (RefiningCalculator에서 사용)
// ============================================

/**
 * T4 방어구 재료 소모량 (구간별, 시도당) - 평균 계산용
 */
export const T4_ARMOR_MATERIALS = {
  '1-10': {
    수호석: 150,
    돌파석: 4,
    아비도스: 5,
    운명파편: 300,
    누골: 475,
    빙하: 4,
    실링: 2850,
    재봉술1단: 1,
  },
  '11-20': {
    수호석: 270,
    돌파석: 5,
    아비도스: 5,
    운명파편: 600,
    누골: 900,
    빙하: 6,
    실링: 4000,
    재봉술2단: 1,
  },
  '21-30': {
    수호석: 1000,
    돌파석: 18,
    아비도스: 17,
    운명파편: 7000,
    누골: 2000,
    빙하: 20,
    실링: 44000,
    재봉술3단: 1,
  },
  '31-40': {
    수호석: 1200,
    돌파석: 23,
    아비도스: 19,
    운명파편: 8000,
    누골: 2400,
    빙하: 24,
    실링: 56000,
    재봉술4단: 1,
  },
};

/**
 * T4 무기 재료 소모량 (구간별, 시도당) - 평균 계산용
 */
export const T4_WEAPON_MATERIALS = {
  '1-10': {
    파괴석: 180,
    돌파석: 5,
    아비도스: 8,
    운명파편: 500,
    누골: 563,
    용암: 4,
    실링: 3150,
    야금술1단: 1,
  },
  '11-20': {
    파괴석: 330,
    돌파석: 7,
    아비도스: 9,
    운명파편: 1000,
    누골: 1250,
    용암: 6,
    실링: 5000,
    야금술2단: 1,
  },
  '21-30': {
    파괴석: 1200,
    돌파석: 25,
    아비도스: 28,
    운명파편: 11500,
    누골: 3000,
    용암: 20,
    실링: 55000,
    야금술3단: 1,
  },
  '31-40': {
    파괴석: 1400,
    돌파석: 32,
    아비도스: 30,
    운명파편: 13000,
    누골: 4000,
    용암: 24,
    실링: 70000,
    야금술4단: 1,
  },
};

/**
 * 상급 재련 옵션 인터페이스 (평균 계산용)
 */
export interface AdvancedRefiningOptions {
  useNormalBreath: boolean;
  useNormalBook1: boolean;
  useNormalBook2: boolean;
  useNormalBook3: boolean;
  useNormalBook4: boolean;
  useBonusBreath: boolean;
  useBonusBook1: boolean;
  useBonusBook2: boolean;
  useBonusBook3: boolean;
  useBonusBook4: boolean;
}

/**
 * 일반 턴 키 생성
 */
function getNormalKey(options: AdvancedRefiningOptions, stage: number): string {
  const useBreath = options.useNormalBreath;
  let useBook = false;

  if (stage === 1) useBook = options.useNormalBook1;
  else if (stage === 2) useBook = options.useNormalBook2;
  else if (stage === 3) useBook = options.useNormalBook3;
  else if (stage === 4) useBook = options.useNormalBook4;

  if (useBreath && useBook) return 'both';
  if (useBreath) return 'breath';
  if (useBook) return 'book';
  return 'none';
}

/**
 * 선조 턴 키 생성
 */
function getBonusKey(options: AdvancedRefiningOptions, stage: number): string {
  const useBreath = options.useBonusBreath;
  let useBook = false;

  if (stage === 1) useBook = options.useBonusBook1;
  else if (stage === 2) useBook = options.useBonusBook2;
  else if (stage === 3) useBook = options.useBonusBook3;
  else if (stage === 4) useBook = options.useBonusBook4;

  if (useBreath && useBook) return 'both';
  if (useBreath) return 'breath';
  if (useBook) return 'book';
  return 'none';
}

/**
 * 구간의 평균 시도 횟수 가져오기
 */
function getStageAverageTries(stage: number, options: AdvancedRefiningOptions): number {
  if (stage <= 2) {
    const normalKey = getNormalKey(options, stage);
    const bonusKey = getBonusKey(options, stage);
    const key = `${normalKey}_${bonusKey}`;
    return AVERAGE_TRIES_1_20[key] || 59.3;
  } else {
    const normalKey = getNormalKey(options, stage);
    const bonusKey = getBonusKey(options, stage);
    const key = `${normalKey}_${bonusKey}`;
    return AVERAGE_TRIES_21_40[key] || 54.8;
  }
}

/**
 * 상급 재련 재료 계산 (평균 계산용)
 */
export function calculateAdvancedRefiningMaterials(
  equipmentType: 'armor' | 'weapon',
  currentLevel: number,
  targetLevel: number,
  options: AdvancedRefiningOptions
): Record<string, number> {
  const materials: Record<string, number> = {};
  const isArmor = equipmentType === 'armor';

  const stages = [
    { start: 0, end: 10, stage: 1, key: '1-10' as const },
    { start: 10, end: 20, stage: 2, key: '11-20' as const },
    { start: 20, end: 30, stage: 3, key: '21-30' as const },
    { start: 30, end: 40, stage: 4, key: '31-40' as const },
  ];

  for (const stageInfo of stages) {
    const stageStart = Math.max(currentLevel, stageInfo.start);
    const stageEnd = Math.min(targetLevel, stageInfo.end);

    if (stageStart >= stageEnd) continue;

    const tries = getStageAverageTries(stageInfo.stage, options);
    const stageLength = stageInfo.end - stageInfo.start;
    const actualLength = stageEnd - stageStart;
    const ratio = actualLength / stageLength;
    const actualTries = tries * ratio;

    const stageMaterials = isArmor ? T4_ARMOR_MATERIALS[stageInfo.key] : T4_WEAPON_MATERIALS[stageInfo.key];

    for (const [material, amount] of Object.entries(stageMaterials)) {
      if (material === '빙하' || material === '용암' || material.includes('재봉술') || material.includes('야금술')) {
        continue;
      }
      materials[material] = (materials[material] || 0) + amount * actualTries;
    }

    const breathKey = isArmor ? '빙하' : '용암';
    const breathAmount = (stageMaterials as any)[breathKey] || 0;
    if (breathAmount > 0) {
      const normalBreathRate = options.useNormalBreath ? 0.83894 : 0;
      const bonusBreathRate = options.useBonusBreath ? 0.16106 : 0;
      const totalBreathRate = normalBreathRate + bonusBreathRate;
      materials[breathKey] = (materials[breathKey] || 0) + breathAmount * actualTries * totalBreathRate;
    }

    let bookKey = '';
    let useNormalBook = false;
    let useBonusBook = false;

    if (stageInfo.stage === 1) {
      bookKey = isArmor ? '재봉술1단' : '야금술1단';
      useNormalBook = options.useNormalBook1;
      useBonusBook = options.useBonusBook1;
    } else if (stageInfo.stage === 2) {
      bookKey = isArmor ? '재봉술2단' : '야금술2단';
      useNormalBook = options.useNormalBook2;
      useBonusBook = options.useBonusBook2;
    } else if (stageInfo.stage === 3) {
      bookKey = isArmor ? '재봉술3단' : '야금술3단';
      useNormalBook = options.useNormalBook3;
      useBonusBook = options.useBonusBook3;
    } else if (stageInfo.stage === 4) {
      bookKey = isArmor ? '재봉술4단' : '야금술4단';
      useNormalBook = options.useNormalBook4;
      useBonusBook = options.useBonusBook4;
    }

    if (bookKey) {
      const bookAmount = (stageMaterials as any)[bookKey] || 0;
      if (bookAmount > 0) {
        const normalBookRate = useNormalBook ? 0.83894 : 0;
        const bonusBookRate = useBonusBook ? 0.16106 : 0;
        const totalBookRate = normalBookRate + bonusBookRate;
        materials[bookKey] = (materials[bookKey] || 0) + bookAmount * actualTries * totalBookRate;
      }
    }
  }

  return materials;
}
