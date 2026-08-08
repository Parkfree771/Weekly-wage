// ========================================
// 특수 재련 (특재) 계산 — 계승 후 무기/방어구 + 완갑 공용
//
// 특재는 재료·실링·골드가 전혀 들지 않고 "특재돌"만 소모한다.
// 확률은 고정(장인의 기운 축적·실패 시 증가·숨결·책 전부 없음)이며 값 자체는
// 각 장비의 기본 확률과 같다. 특재돌은 귀속(거래 불가) 공용 1종이므로,
// "보유한 돌을 어느 부위·어느 단계에 쓰면 일반 재련 비용을 가장 많이 아끼는가"
// = 돌 1개당 절약 골드(goldPerStone) 내림차순 그리디 배분으로 계산한다.
// ========================================

import type { CalcMode } from './refiningSimulationData';
import {
  SUCCESSION_BASE_PROBABILITY,
  SPECIAL_REFINE_ARMOR_STONES,
  SPECIAL_REFINE_WEAPON_STONES,
} from './refiningData';
import { WANGAP_BASE_PROBABILITY, WANGAP_SPECIAL_REFINE_STONES } from './wangapData';

export type SpecialRefineKind = 'armor' | 'weapon' | 'wangap';

/** 해당 부위·단계의 특재 정보. 없으면 null (계승 전 등 특재 불가 단계) */
export function getSpecialRefineInfo(
  kind: SpecialRefineKind,
  level: number, // 현재 레벨 (level → level+1)
): { stonesPerTry: number; prob: number } | null {
  if (kind === 'wangap') {
    const stones = WANGAP_SPECIAL_REFINE_STONES[level];
    const prob = WANGAP_BASE_PROBABILITY[level];
    return stones && prob ? { stonesPerTry: stones, prob } : null;
  }
  const table = kind === 'armor' ? SPECIAL_REFINE_ARMOR_STONES : SPECIAL_REFINE_WEAPON_STONES;
  const stones = table[level];
  const prob = SUCCESSION_BASE_PROBABILITY[level];
  return stones && prob ? { stonesPerTry: stones, prob } : null;
}

/**
 * 특재 기대 시도 횟수 — 고정 확률 기하분포.
 * median: 절반이 성공하는 횟수 / average: 1/p
 * pity(장기백): 특재엔 장인의 기운이 없어 상한이 존재하지 않으므로 기댓값(1/p)을 쓴다.
 * (일반 재련 쪽은 장기백 비용, 특재 쪽은 기댓값으로 비교 — 사용자 확정 정책)
 */
export function getSpecialTries(prob: number, mode: CalcMode): number {
  if (mode === 'median') return Math.ceil(Math.log(0.5) / Math.log(1 - prob));
  return 1 / prob;
}

export type SpecialCandidate = {
  key: string;        // 장비명:레벨 고유 키
  equipName: string;  // 표시용 장비 이름
  kind: SpecialRefineKind;
  level: number;      // 현재 레벨 (level → level+1)
  normalCostGold: number; // 이 단계를 일반 재련으로 진행할 때의 기대 실구매 골드 (귀속 제외)
};

export type SpecialRankedStage = SpecialCandidate & {
  stonesPerTry: number;
  prob: number;
  expectedTries: number;
  expectedStones: number; // 모드별 기대 돌 소모 (stonesPerTry × expectedTries)
  goldPerStone: number;   // 돌 1개당 절약 골드
};

/** 후보 단계들을 돌 1개당 절약 골드 내림차순으로 정렬 (특재 불가 단계는 제외) */
export function rankSpecialStages(
  candidates: SpecialCandidate[],
  mode: CalcMode,
): SpecialRankedStage[] {
  const ranked: SpecialRankedStage[] = [];
  for (const c of candidates) {
    const info = getSpecialRefineInfo(c.kind, c.level);
    if (!info) continue;
    const expectedTries = getSpecialTries(info.prob, mode);
    const expectedStones = info.stonesPerTry * expectedTries;
    ranked.push({
      ...c,
      stonesPerTry: info.stonesPerTry,
      prob: info.prob,
      expectedTries,
      expectedStones,
      goldPerStone: expectedStones > 0 ? c.normalCostGold / expectedStones : 0,
    });
  }
  ranked.sort((a, b) => b.goldPerStone - a.goldPerStone);
  return ranked;
}

export type SpecialPlan = {
  ranked: SpecialRankedStage[];   // 전체 효율 순위 (배분 여부 무관)
  chosen: SpecialRankedStage[];   // 보유 돌로 커버되는 추천 단계
  chosenKeys: Set<string>;
  usedStones: number;             // 추천 단계의 기대 돌 소모 합
  savedGold: number;              // 추천 단계의 일반 재련 기대 비용 합 (= 절약 골드)
};

/**
 * 보유 돌 범위 내 그리디 배분.
 * 기대 돌 소모 누적이 보유량을 넘지 않는 선에서 효율 순으로 채운다.
 * (기대값 기준 배분 — 평균 시뮬 전체가 기대값 철학이므로 동일하게 둔다)
 */
export function buildSpecialPlan(
  candidates: SpecialCandidate[],
  ownedStones: number,
  mode: CalcMode,
): SpecialPlan {
  const ranked = rankSpecialStages(candidates, mode);
  const chosen: SpecialRankedStage[] = [];
  let usedStones = 0;
  let savedGold = 0;
  for (const r of ranked) {
    if (usedStones + r.expectedStones > ownedStones) continue;
    chosen.push(r);
    usedStones += r.expectedStones;
    savedGold += r.normalCostGold;
  }
  return {
    ranked,
    chosen,
    chosenKeys: new Set(chosen.map((c) => c.key)),
    usedStones,
    savedGold,
  };
}

/**
 * 사용자가 직접 고른 단계로 플랜을 만든다 (자동 배분 결과를 체크박스로 수정한 경우).
 * 보유 돌 한도를 넘겨도 그대로 반영한다 — 넘겼는지는 호출부가 usedStones로 판단해 표시한다.
 */
export function buildSpecialPlanFromKeys(
  candidates: SpecialCandidate[],
  selectedKeys: Set<string>,
  mode: CalcMode,
): SpecialPlan {
  const ranked = rankSpecialStages(candidates, mode);
  const chosen = ranked.filter((r) => selectedKeys.has(r.key));
  return {
    ranked,
    chosen,
    chosenKeys: new Set(chosen.map((c) => c.key)),
    usedStones: chosen.reduce((s, c) => s + c.expectedStones, 0),
    savedGold: chosen.reduce((s, c) => s + c.normalCostGold, 0),
  };
}
