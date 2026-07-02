// 상급재련 "최적 조합" 계산 (현재 시세 기준 기대 총골드 최소화)
// 비용 모델은 RefiningCalculator의 상급재련 계산과 동일:
// AVERAGE_TRIES(조합별 평균 유료 시도 수) + TURN_RATIO(숨결·책 소모의 일반턴/선조턴 분배 비율)
// → "최적"이 곧 계산기에 표시되는 기대 비용의 최소값이 되도록 같은 모델로 비교한다.

import {
  AVERAGE_TRIES_1_20,
  AVERAGE_TRIES_21_40,
  TURN_RATIO_1_20,
  TURN_RATIO_21_40,
  T4_ARMOR_MATERIALS,
  T4_WEAPON_MATERIALS,
} from './advancedRefiningData';

export type AdvStageNum = 1 | 2 | 3 | 4;

export const ADV_STAGE_KEYS: Record<AdvStageNum, '1-10' | '11-20' | '21-30' | '31-40'> = {
  1: '1-10',
  2: '11-20',
  3: '21-30',
  4: '31-40',
};

// marketPrices 키 (개당 가격으로 변환된 상태)
const PRICE_IDS = {
  수호석: '66102106',
  파괴석: '66102006',
  돌파석: '66110225',
  아비도스: '6861012',
  운명파편: '66130143',
  빙하: '66111132',
  용암: '66111131',
} as const;

const BOOK_PRICE_IDS: Record<'armor' | 'weapon', Record<AdvStageNum, string>> = {
  armor: { 1: '66112712', 2: '66112714', 3: '66112716', 4: '66112718' },
  weapon: { 1: '66112711', 2: '66112713', 3: '66112715', 4: '66112717' },
};

export interface AdvOptStagePick {
  stage: AdvStageNum;
  normalBook: boolean;
  bonusBook: boolean;
  tries: number;    // 구간 완주(10단계) 평균 유료 시도
  cost: number;     // 구간 완주 기준 기대 비용 (숨결·책 포함, 실링 제외)
  noneCost: number; // 보조재료 전부 미사용 시 기대 비용
}

export interface AdvOptPlan {
  normalBreath: boolean;
  bonusBreath: boolean;
  stages: AdvOptStagePick[];
  totalCost: number;
  noneCost: number;
}

const comboKey = (breath: boolean, book: boolean): string =>
  breath ? (book ? 'both' : 'breath') : (book ? 'book' : 'none');

/**
 * 상급재련 최적 조합 계산
 * @param type 방어구/무기
 * @param stages 실제 강화 대상 구간 (1~4)
 * @param unitPrices 개당 가격 (RefiningCalculator의 marketPrices)
 * @returns 시세 미로딩 시 null
 */
export function computeOptimalAdvancedPlan(
  type: 'armor' | 'weapon',
  stages: AdvStageNum[],
  unitPrices: Record<string, number>,
): AdvOptPlan | null {
  if (stages.length === 0) return null;
  const isArmor = type === 'armor';
  const breathPrice = unitPrices[isArmor ? PRICE_IDS.빙하 : PRICE_IDS.용암] || 0;
  if (breathPrice <= 0) return null; // 시세 미로딩

  const materialsTable = isArmor ? T4_ARMOR_MATERIALS : T4_WEAPON_MATERIALS;

  // 구간별 상수 (1회당 기본 재료 골드, 숨결 1회 풀셋 골드, 책 1권 골드)
  const stageConsts = stages.map(stage => {
    const m = materialsTable[ADV_STAGE_KEYS[stage]] as Record<string, number>;
    const base =
      (m.누골 || 0) +
      (m.수호석 || 0) * (unitPrices[PRICE_IDS.수호석] || 0) +
      (m.파괴석 || 0) * (unitPrices[PRICE_IDS.파괴석] || 0) +
      (m.돌파석 || 0) * (unitPrices[PRICE_IDS.돌파석] || 0) +
      (m.아비도스 || 0) * (unitPrices[PRICE_IDS.아비도스] || 0) +
      (m.운명파편 || 0) * (unitPrices[PRICE_IDS.운명파편] || 0);
    const breathPerTry = ((m.빙하 || m.용암) || 0) * breathPrice;
    const bookPrice = unitPrices[BOOK_PRICE_IDS[type][stage]] || 0;
    return { stage, base, breathPerTry, bookPrice };
  });

  let best: AdvOptPlan | null = null;

  // 숨결은 구간 공통 옵션(일반턴/선조턴 각 1개 플래그)이므로 4조합을 밖에서 돌리고,
  // 책은 구간별 옵션이므로 구간마다 최적을 고른다.
  for (const nBreath of [false, true]) {
    for (const bBreath of [false, true]) {
      const picks: AdvOptStagePick[] = [];
      let total = 0;
      let noneTotal = 0;

      for (const sc of stageConsts) {
        const triesTable = sc.stage <= 2 ? AVERAGE_TRIES_1_20 : AVERAGE_TRIES_21_40;
        const ratio = sc.stage <= 2 ? TURN_RATIO_1_20 : TURN_RATIO_21_40;
        const breathRate = (nBreath ? ratio.normal : 0) + (bBreath ? ratio.bonus : 0);

        let stageBest: AdvOptStagePick | null = null;
        for (const nBook of [false, true]) {
          for (const bBook of [false, true]) {
            const tries = triesTable[`${comboKey(nBreath, nBook)}_${comboKey(bBreath, bBook)}`];
            if (!tries) continue;
            const bookRate = (nBook ? ratio.normal : 0) + (bBook ? ratio.bonus : 0);
            const cost = tries * (sc.base + sc.breathPerTry * breathRate + sc.bookPrice * bookRate);
            if (stageBest === null || cost < stageBest.cost - 1e-6) {
              stageBest = { stage: sc.stage, normalBook: nBook, bonusBook: bBook, tries, cost, noneCost: 0 };
            }
          }
        }
        if (!stageBest) return null;
        stageBest.noneCost = (triesTable['none_none'] || 0) * sc.base;
        picks.push(stageBest);
        total += stageBest.cost;
        noneTotal += stageBest.noneCost;
      }

      if (best === null || total < best.totalCost - 1e-6) {
        best = { normalBreath: nBreath, bonusBreath: bBreath, stages: picks, totalCost: total, noneCost: noneTotal };
      }
    }
  }

  return best;
}

/** 조합 짧은 라벨 (팝업 표기용) */
export function advComboLabel(breath: boolean, book: boolean): string {
  if (breath && book) return '숨결+책';
  if (breath) return '숨결';
  if (book) return '책';
  return '미사용';
}
