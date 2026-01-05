// T4 상급 재련 시스템 데이터
// 📘 통계적 최종 완성본

/**
 * T4 상급 재련 평균 시도 횟수 데이터
 *
 * 1~10단계, 11~20단계: 숨결 + 책 조합 가능
 * 21~30단계, 31~40단계: 숨결만 가능 (책 사용 불가)
 *
 * 키 형식:
 * - 1~20: 'normal_bonus' (예: 'breath_book_none_book' = 일반턴 숨결+책, 선조턴 책만)
 * - 21~40: 'normal_bonus' (예: 'breath_none' = 일반턴 숨결, 선조턴 없음)
 */

// 1~10단계 및 11~20단계용 (숨결 + 책 조합 가능)
export const T4_ADVANCED_TRIES_1_20: Record<string, number> = {
  // 일반턴: 아무것도 X
  'none_none': 59.3,        // 선조턴: 아무것도 X
  'none_breath': 52.4,      // 선조턴: 숨결만
  'none_book': 49.5,        // 선조턴: 책만
  'none_both': 44.6,        // 선조턴: 숨결 + 책

  // 일반턴: 숨결만
  'breath_none': 45.7,
  'breath_breath': 41.5,
  'breath_book': 39.7,
  'breath_both': 36.4,

  // 일반턴: 책만
  'book_none': 41.0,
  'book_breath': 37.6,
  'book_book': 36.1,
  'book_both': 33.4,

  // 일반턴: 숨결 + 책
  'both_none': 34.0,
  'both_breath': 31.6,
  'both_book': 30.5,
  'both_both': 28.6,
};

// 21~30단계 및 31~40단계용 (숨결 + 책 조합 가능)
export const T4_ADVANCED_TRIES_21_40: Record<string, number> = {
  // 일반턴: 아무것도 X
  'none_none': 54.8,      // 선조턴: 아무것도 X
  'none_breath': 48.2,    // 선조턴: 숨결만
  'none_book': 45.6,      // 선조턴: 책만
  'none_both': 41.0,      // 선조턴: 숨결 + 책

  // 일반턴: 숨결만
  'breath_none': 43.1,
  'breath_breath': 39.2,
  'breath_book': 37.5,
  'breath_both': 34.2,

  // 일반턴: 책만
  'book_none': 37.8,
  'book_breath': 34.9,
  'book_book': 33.5,
  'book_both': 30.8,

  // 일반턴: 숨결 + 책
  'both_none': 31.4,
  'both_breath': 29.3,
  'both_book': 28.2,
  'both_both': 26.5,
};

/**
 * T4 방어구 재료 소모량 (구간별, 시도당)
 */
export const T4_ARMOR_MATERIALS = {
  '1-10': {
    수호석: 150,
    돌파석: 4,
    아비도스: 5,
    운명파편: 300,
    누골: 475,
    빙하: 4,           // 숨결 사용 시
    재봉술1단: 1,       // 책 사용 시 (1~10단계)
  },
  '11-20': {
    수호석: 270,
    돌파석: 5,
    아비도스: 5,
    운명파편: 600,
    누골: 900,
    빙하: 6,
    재봉술2단: 1,       // 책 사용 시 (11~20단계)
  },
  '21-30': {
    수호석: 1000,
    돌파석: 18,
    아비도스: 17,
    운명파편: 7000,
    누골: 2000,
    빙하: 20,
    재봉술3단: 1,       // 책 사용 시 (21~30단계)
  },
  '31-40': {
    수호석: 1200,
    돌파석: 23,
    아비도스: 19,
    운명파편: 8000,
    누골: 2400,
    빙하: 24,
    재봉술4단: 1,       // 책 사용 시 (31~40단계)
  },
};

/**
 * T4 무기 재료 소모량 (구간별, 시도당)
 */
export const T4_WEAPON_MATERIALS = {
  '1-10': {
    파괴석: 180,
    돌파석: 5,
    아비도스: 8,
    운명파편: 500,
    누골: 563,
    용암: 4,           // 숨결 사용 시
    야금술1단: 1,       // 책 사용 시 (1~10단계)
  },
  '11-20': {
    파괴석: 330,
    돌파석: 7,
    아비도스: 9,
    운명파편: 1000,
    누골: 1250,
    용암: 6,
    야금술2단: 1,       // 책 사용 시 (11~20단계)
  },
  '21-30': {
    파괴석: 1200,
    돌파석: 25,
    아비도스: 28,
    운명파편: 11500,
    누골: 3000,
    용암: 20,
    야금술3단: 1,       // 책 사용 시 (21~30단계)
  },
  '31-40': {
    파괴석: 1400,
    돌파석: 32,
    아비도스: 30,
    운명파편: 13000,
    누골: 4000,
    용암: 24,
    야금술4단: 1,       // 책 사용 시 (31~40단계)
  },
};

/**
 * 테메르의 정 무료턴 확률
 * 보너스턴 확률(16.106%) × 테메르 정 확률(25%) = 약 4.0265%
 */
export const FREE_TURN_PROBABILITY = 0.040265;

/**
 * 구간별 필요한 총 경험치
 */
export const TOTAL_EXP_PER_STAGE = 1000;

/**
 * 각 단계당 필요 경험치
 */
export const EXP_PER_LEVEL = 100;

/**
 * 상급 재련 옵션 인터페이스
 */
export interface AdvancedRefiningOptions {
  useNormalBreath: boolean;  // 일반 턴에 숨결 사용
  useNormalBook1: boolean;   // 일반 턴에 1단계 책 사용 (1~10)
  useNormalBook2: boolean;   // 일반 턴에 2단계 책 사용 (11~20)
  useNormalBook3: boolean;   // 일반 턴에 3단계 책 사용 (21~30)
  useNormalBook4: boolean;   // 일반 턴에 4단계 책 사용 (31~40)
  useBonusBreath: boolean;   // 선조 턴에 숨결 사용
  useBonusBook1: boolean;    // 선조 턴에 1단계 책 사용 (1~10)
  useBonusBook2: boolean;    // 선조 턴에 2단계 책 사용 (11~20)
  useBonusBook3: boolean;    // 선조 턴에 3단계 책 사용 (21~30)
  useBonusBook4: boolean;    // 선조 턴에 4단계 책 사용 (31~40)
}

/**
 * 구간별 평균 시도 횟수 가져오기
 *
 * @param currentLevel 현재 상급 재련 레벨
 * @param targetLevel 목표 상급 재련 레벨
 * @param options 재료 사용 옵션
 * @returns 평균 시도 횟수
 */
export function getAdvancedRefiningTries(
  currentLevel: number,
  targetLevel: number,
  options: AdvancedRefiningOptions
): number {
  let totalTries = 0;

  // 구간별로 계산
  const stages = [
    { start: 0, end: 10, stage: 1 },
    { start: 10, end: 20, stage: 2 },
    { start: 20, end: 30, stage: 3 },
    { start: 30, end: 40, stage: 4 },
  ];

  for (const stageInfo of stages) {
    const stageStart = Math.max(currentLevel, stageInfo.start);
    const stageEnd = Math.min(targetLevel, stageInfo.end);

    if (stageStart >= stageEnd) continue;

    const tries = getStageAverageTries(stageInfo.stage, options);

    // 부분 구간 비율 계산
    const stageLength = stageInfo.end - stageInfo.start;
    const actualLength = stageEnd - stageStart;
    const ratio = actualLength / stageLength;

    totalTries += tries * ratio;
  }

  return totalTries;
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
 * 상급 재련 재료 계산
 *
 * @param equipmentType 'armor' | 'weapon'
 * @param currentLevel 현재 상급 재련 레벨
 * @param targetLevel 목표 상급 재련 레벨
 * @param options 재료 사용 옵션
 * @returns 재료 소모량 및 비용
 */
export function calculateAdvancedRefiningMaterials(
  equipmentType: 'armor' | 'weapon',
  currentLevel: number,
  targetLevel: number,
  options: AdvancedRefiningOptions
): Record<string, number> {
  const materials: Record<string, number> = {};
  const isArmor = equipmentType === 'armor';

  // 구간별로 계산 (각 구간은 한 번만 계산)
  const stages = [
    { start: 0, end: 10, stage: 1, key: '1-10' as const },
    { start: 10, end: 20, stage: 2, key: '11-20' as const },
    { start: 20, end: 30, stage: 3, key: '21-30' as const },
    { start: 30, end: 40, stage: 4, key: '31-40' as const },
  ];

  for (const stageInfo of stages) {
    // 이 구간을 지나가는지 확인
    const stageStart = Math.max(currentLevel, stageInfo.start);
    const stageEnd = Math.min(targetLevel, stageInfo.end);

    if (stageStart >= stageEnd) continue; // 이 구간은 건너뜀

    // 구간별 평균 시도 횟수 (전체 구간 0→10, 10→20 등에 대한 평균)
    const tries = getStageAverageTries(stageInfo.stage, options);

    // 부분 구간 비율 계산 (예: 5→10이면 5/10 = 0.5)
    const stageLength = stageInfo.end - stageInfo.start;
    const actualLength = stageEnd - stageStart;
    const ratio = actualLength / stageLength;
    const actualTries = tries * ratio;

    // 구간별 재료 데이터
    const stageMaterials = isArmor ? T4_ARMOR_MATERIALS[stageInfo.key] : T4_WEAPON_MATERIALS[stageInfo.key];

    // 기본 재료 계산
    for (const [material, amount] of Object.entries(stageMaterials)) {
      // 숨결/책은 별도 계산
      if (material === '빙하' || material === '용암' || material.includes('재봉술') || material.includes('야금술')) {
        continue;
      }

      materials[material] = (materials[material] || 0) + amount * actualTries;
    }

    // 숨결 계산
    const breathKey = isArmor ? '빙하' : '용암';
    const breathAmount = (stageMaterials as any)[breathKey] || 0;
    if (breathAmount > 0) {
      // 일반 턴 숨결 사용 비율 + 선조 턴 숨결 사용 비율
      const normalBreathRate = options.useNormalBreath ? 0.83894 : 0;  // 일반 턴 비율 83.894%
      const bonusBreathRate = options.useBonusBreath ? 0.16106 : 0;    // 선조 턴 비율 16.106%
      const totalBreathRate = normalBreathRate + bonusBreathRate;

      materials[breathKey] = (materials[breathKey] || 0) + breathAmount * actualTries * totalBreathRate;
    }

    // 책 계산 (1~40단계 전체)
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

        const bookCount = bookAmount * actualTries * totalBookRate;
        materials[bookKey] = (materials[bookKey] || 0) + bookCount;

        // 디버깅 로그
        if (bookCount > 0) {
          console.log(`[책 계산] ${stageInfo.key} (${stageStart}→${stageEnd}): tries=${actualTries.toFixed(1)}, rate=${totalBookRate.toFixed(3)}, 책=${bookCount.toFixed(1)}개`);
        }
      }
    }
  }

  return materials;
}

/**
 * 구간의 평균 시도 횟수 가져오기
 * @param stage 구간 번호 (1, 2, 3, 4)
 */
function getStageAverageTries(stage: number, options: AdvancedRefiningOptions): number {
  if (stage <= 2) {
    // 1~20단계: 숨결 + 책 조합 고려
    const normalKey = getNormalKey(options, stage);
    const bonusKey = getBonusKey(options, stage);
    const key = `${normalKey}_${bonusKey}`;
    return T4_ADVANCED_TRIES_1_20[key] || 59.3;
  } else {
    // 21~40단계: 숨결 + 책 조합 고려
    const normalKey = getNormalKey(options, stage);
    const bonusKey = getBonusKey(options, stage);
    const key = `${normalKey}_${bonusKey}`;
    return T4_ADVANCED_TRIES_21_40[key] || 54.8;
  }
}
