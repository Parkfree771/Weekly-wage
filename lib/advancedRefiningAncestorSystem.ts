// T4 상급 재련 선조 시스템
// 보고서 기반 완전 구현

/**
 * 선조 종류
 */
export enum AncestorType {
  // 1~20 공통
  GALATOUR = 'galatour',      // 갈라투르
  GELAR = 'gelar',            // 겔라르
  KUHUMBAR = 'kuhumbar',      // 쿠훔바르
  TEMER = 'temer',            // 테메르의 정
  // 21~40 추가
  NABER = 'naber',            // 나베르의 송곳
  EBER = 'eber',              // 에베르
}

/**
 * 성공 등급
 */
export enum SuccessGrade {
  SUCCESS = 'success',           // 성공 (10 EXP)
  GREAT_SUCCESS = 'great',       // 대성공 (20 EXP)
  SUPER_SUCCESS = 'super',       // 초대성공 (40 EXP)
}

/**
 * 성공 등급별 경험치
 */
export const SUCCESS_EXP: Record<SuccessGrade, number> = {
  [SuccessGrade.SUCCESS]: 10,
  [SuccessGrade.GREAT_SUCCESS]: 20,
  [SuccessGrade.SUPER_SUCCESS]: 40,
};

/**
 * 숨결/책 조합별 성공 확률
 */
export interface SuccessProbability {
  success: number;      // 성공 (10 EXP)
  great: number;        // 대성공 (20 EXP)
  super: number;        // 초대성공 (40 EXP)
}

export const SUCCESS_PROBABILITIES: Record<string, SuccessProbability> = {
  // 아무것도 안 씀
  'none': {
    success: 0.80,
    great: 0.15,
    super: 0.05,
  },
  // 숨결만
  'breath': {
    success: 0.50,
    great: 0.30,
    super: 0.20,
  },
  // 책만
  'book': {
    success: 0.30,
    great: 0.45,
    super: 0.25,
  },
  // 숨결 + 책
  'both': {
    success: 0.00,
    great: 0.60,
    super: 0.40,
  },
};

/**
 * 1~20단계 선조 확률
 * 참고: 선조턴 발생 시 100% 선조 등장 (등장하지 않는 경우 없음)
 */
export const ANCESTOR_PROBABILITY_1_20: Record<AncestorType, number> = {
  [AncestorType.GALATOUR]: 0.15,   // 15%
  [AncestorType.GELAR]: 0.35,      // 35%
  [AncestorType.KUHUMBAR]: 0.15,   // 15%
  [AncestorType.TEMER]: 0.35,      // 35%
  [AncestorType.NABER]: 0,         // 없음
  [AncestorType.EBER]: 0,          // 없음
};

/**
 * 21~40단계 선조 확률 (일반)
 */
export const ANCESTOR_PROBABILITY_21_40: Record<AncestorType, number> = {
  [AncestorType.GALATOUR]: 0.125,  // 12.5%
  [AncestorType.GELAR]: 0.25,      // 25%
  [AncestorType.KUHUMBAR]: 0.125,  // 12.5%
  [AncestorType.TEMER]: 0.25,      // 25%
  [AncestorType.NABER]: 0.125,     // 12.5%
  [AncestorType.EBER]: 0.125,      // 12.5%
};

/**
 * 21~40단계 선조 확률 (나베르 발동 후)
 */
export const ANCESTOR_PROBABILITY_21_40_ENHANCED: Record<AncestorType, number> = {
  [AncestorType.GALATOUR]: 0.1429,  // 14.29%
  [AncestorType.GELAR]: 0.2857,     // 28.57%
  [AncestorType.KUHUMBAR]: 0.1429,  // 14.29%
  [AncestorType.TEMER]: 0.2857,     // 28.57%
  [AncestorType.NABER]: 0,          // 0% (등장 안 함)
  [AncestorType.EBER]: 0.1429,      // 14.29%
};

/**
 * 선조 효과 인터페이스
 */
export interface AncestorEffect {
  type: 'multiply' | 'add' | 'instant' | 'enhance';
  value: number;
  freeNext?: boolean;  // 다음 시도 무료
  recharge?: boolean;  // 가호 재충전
  enhanceNext?: boolean; // 다음 선조 강화
}

/**
 * 1~20단계 선조 효과
 */
export const ANCESTOR_EFFECTS_1_20: Record<AncestorType, AncestorEffect> = {
  [AncestorType.GALATOUR]: {
    type: 'multiply',
    value: 5,  // EXP ×5
  },
  [AncestorType.GELAR]: {
    type: 'multiply',
    value: 3,  // EXP ×3
  },
  [AncestorType.KUHUMBAR]: {
    type: 'add',
    value: 30,  // +30 EXP
  },
  [AncestorType.TEMER]: {
    type: 'add',
    value: 10,  // +10 EXP
    freeNext: true,  // 다음 시도 무료
  },
  [AncestorType.NABER]: {
    type: 'add',
    value: 0,  // 사용 안 함
  },
  [AncestorType.EBER]: {
    type: 'add',
    value: 0,  // 사용 안 함
  },
};

/**
 * 21~40단계 선조 효과 (일반)
 */
export const ANCESTOR_EFFECTS_21_40: Record<AncestorType, AncestorEffect> = {
  [AncestorType.GALATOUR]: {
    type: 'multiply',
    value: 5,  // EXP ×5
  },
  [AncestorType.GELAR]: {
    type: 'multiply',
    value: 3,  // EXP ×3
  },
  [AncestorType.KUHUMBAR]: {
    type: 'add',
    value: 30,  // +30 EXP
    recharge: true,  // 가호 재충전
  },
  [AncestorType.TEMER]: {
    type: 'add',
    value: 10,  // +10 EXP
    freeNext: true,  // 다음 시도 무료
  },
  [AncestorType.NABER]: {
    type: 'enhance',
    value: 0,
    enhanceNext: true,  // 다음 선조 강화
    recharge: true,  // 가호 재충전
  },
  [AncestorType.EBER]: {
    type: 'instant',
    value: 100,  // 즉시 1단계 상승 (+100 EXP)
  },
};

/**
 * 21~40단계 선조 효과 (나베르 강화 후)
 */
export const ANCESTOR_EFFECTS_21_40_ENHANCED: Record<AncestorType, AncestorEffect> = {
  [AncestorType.GALATOUR]: {
    type: 'multiply',
    value: 7,  // EXP ×7 (강화)
  },
  [AncestorType.GELAR]: {
    type: 'multiply',
    value: 5,  // EXP ×5 (강화)
  },
  [AncestorType.KUHUMBAR]: {
    type: 'add',
    value: 80,  // +80 EXP (강화)
    recharge: true,
  },
  [AncestorType.TEMER]: {
    type: 'add',
    value: 30,  // +30 EXP (강화)
    freeNext: true,
  },
  [AncestorType.NABER]: {
    type: 'add',
    value: 0,  // 등장 안 함
  },
  [AncestorType.EBER]: {
    type: 'instant',
    value: 200,  // 즉시 2단계 상승 (+200 EXP, 강화)
  },
};

/**
 * 턴 비율
 */
export const TURN_RATES = {
  NORMAL: 0.83894,   // 일반턴 83.894%
  BONUS: 0.16106,    // 선조턴 16.106%
};

/**
 * 테메르의 정 무료턴 확률
 */
export const FREE_TURN_PROBABILITY = 0.040265; // 16.106% × 25%

/**
 * 기본 EXP 계산
 */
export function calculateBaseEXP(useBreath: boolean, useBook: boolean): number {
  let key = 'none';
  if (useBreath && useBook) {
    key = 'both';
  } else if (useBreath) {
    key = 'breath';
  } else if (useBook) {
    key = 'book';
  }

  const prob = SUCCESS_PROBABILITIES[key];
  return (
    SUCCESS_EXP[SuccessGrade.SUCCESS] * prob.success +
    SUCCESS_EXP[SuccessGrade.GREAT_SUCCESS] * prob.great +
    SUCCESS_EXP[SuccessGrade.SUPER_SUCCESS] * prob.super
  );
}

/**
 * 선조 적용 후 EXP 계산
 */
export function applyAncestorEffect(baseEXP: number, effect: AncestorEffect): number {
  switch (effect.type) {
    case 'multiply':
      return baseEXP * effect.value;
    case 'add':
      return baseEXP + effect.value;
    case 'instant':
      return effect.value;
    case 'enhance':
      return baseEXP;  // 나베르는 다음 턴 강화만
    default:
      return baseEXP;
  }
}

/**
 * 선조턴 평균 EXP 계산
 */
export function calculateAncestorAverageEXP(
  stage: number,  // 1, 2, 3, 4
  useBreath: boolean,
  useBook: boolean,
  isEnhanced: boolean = false  // 나베르 강화 여부
): number {
  const baseEXP = calculateBaseEXP(useBreath, useBook);

  let probabilities: Record<AncestorType, number>;
  let effects: Record<AncestorType, AncestorEffect>;

  if (stage <= 2) {
    // 1~20단계
    probabilities = ANCESTOR_PROBABILITY_1_20;
    effects = ANCESTOR_EFFECTS_1_20;
  } else {
    // 21~40단계
    if (isEnhanced) {
      probabilities = ANCESTOR_PROBABILITY_21_40_ENHANCED;
      effects = ANCESTOR_EFFECTS_21_40_ENHANCED;
    } else {
      probabilities = ANCESTOR_PROBABILITY_21_40;
      effects = ANCESTOR_EFFECTS_21_40;
    }
  }

  let totalEXP = 0;

  for (const ancestor in probabilities) {
    const prob = probabilities[ancestor as AncestorType];
    const effect = effects[ancestor as AncestorType];
    const exp = applyAncestorEffect(baseEXP, effect);
    totalEXP += exp * prob;
  }

  return totalEXP;
}

/**
 * 전체 평균 EXP 계산 (일반턴 + 선조턴)
 */
export function calculateTotalAverageEXP(
  stage: number,
  normalUseBreath: boolean,
  normalUseBook: boolean,
  bonusUseBreath: boolean,
  bonusUseBook: boolean
): number {
  // 일반턴 평균 EXP
  const normalEXP = calculateBaseEXP(normalUseBreath, normalUseBook);

  // 선조턴 평균 EXP
  const bonusEXP = calculateAncestorAverageEXP(stage, bonusUseBreath, bonusUseBook, false);

  // 전체 평균
  return normalEXP * TURN_RATES.NORMAL + bonusEXP * TURN_RATES.BONUS;
}

/**
 * 평균 시도 횟수 계산
 */
export function calculateAverageTries(
  stage: number,
  normalUseBreath: boolean,
  normalUseBook: boolean,
  bonusUseBreath: boolean,
  bonusUseBook: boolean
): number {
  const avgEXP = calculateTotalAverageEXP(
    stage,
    normalUseBreath,
    normalUseBook,
    bonusUseBreath,
    bonusUseBook
  );

  // 1000 EXP 필요
  return 1000 / avgEXP;
}

/**
 * 선조 이름 가져오기
 */
export function getAncestorName(type: AncestorType): string {
  const names: Record<AncestorType, string> = {
    [AncestorType.GALATOUR]: '갈라투르',
    [AncestorType.GELAR]: '겔라르',
    [AncestorType.KUHUMBAR]: '쿠훔바르',
    [AncestorType.TEMER]: '테메르의 정',
    [AncestorType.NABER]: '나베르의 송곳',
    [AncestorType.EBER]: '에베르',
  };
  return names[type];
}

/**
 * 선조 효과 설명 가져오기
 */
export function getAncestorDescription(
  type: AncestorType,
  stage: number,
  isEnhanced: boolean = false
): string {
  let effect: AncestorEffect;

  if (stage <= 2) {
    effect = ANCESTOR_EFFECTS_1_20[type];
  } else {
    effect = isEnhanced
      ? ANCESTOR_EFFECTS_21_40_ENHANCED[type]
      : ANCESTOR_EFFECTS_21_40[type];
  }

  let desc = '';
  switch (effect.type) {
    case 'multiply':
      desc = `EXP ×${effect.value}`;
      break;
    case 'add':
      desc = `+${effect.value} EXP`;
      break;
    case 'instant':
      desc = `즉시 ${effect.value / 100}단계 상승 (+${effect.value} EXP)`;
      break;
    case 'enhance':
      desc = '다음 선조 강화';
      break;
  }

  if (effect.freeNext) {
    desc += ' + 다음 시도 무료';
  }
  if (effect.recharge) {
    desc += ' + 가호 재충전';
  }

  return desc;
}

/**
 * 무료턴 확률 계산
 */
export function calculateFreeTurnProbability(stage: number): number {
  let temerProb: number;

  if (stage <= 2) {
    temerProb = ANCESTOR_PROBABILITY_1_20[AncestorType.TEMER];
  } else {
    temerProb = ANCESTOR_PROBABILITY_21_40[AncestorType.TEMER];
  }

  return TURN_RATES.BONUS * temerProb;
}

/**
 * 나베르 강화 후 무료턴 확률 계산
 */
export function calculateEnhancedFreeTurnProbability(): number {
  const temerProb = ANCESTOR_PROBABILITY_21_40_ENHANCED[AncestorType.TEMER];
  return TURN_RATES.BONUS * temerProb;
}
