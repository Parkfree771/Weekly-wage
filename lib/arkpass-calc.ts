// 아크패스 효율 계산 로직
import type { Reward, PassLevel } from '@/data/arkpass';

/** 골드 환산에 필요한 환율 컨텍스트 */
export interface PriceCtx {
  /** 100블루크리스탈 = N골드 */
  exchangeRate?: number;
  /** 1원 = N골드 (현금가 아이템 환산용) */
  goldPerWon?: number;
}

/** 보상 1종의 골드 가치. 산정 불가(아바타/벽지 등)면 null */
export function rewardGold(
  reward: Reward,
  prices: Record<string, number>,
  ctx: PriceCtx = {}
): number | null {
  // 0) 선택 상자: 옵션 중 가치 최댓값 × 상자 수(qty)
  if (reward.choices && reward.choices.length > 0) {
    let best: number | null = null;
    for (const opt of reward.choices) {
      const v = rewardGold(opt, prices, ctx);
      if (v != null && (best == null || v > best)) best = v;
    }
    if (best == null) return null;
    const boxes = reward.qty > 0 ? reward.qty : 1;
    return Math.round(best * boxes);
  }
  // 1) 고정 골드 가치
  if (typeof reward.gold === 'number') {
    return Math.round(reward.gold * reward.qty);
  }
  // 1-2) 현금가(원) → 골드 (펫/탈것/아바타 등 시세 없는 현금 상품)
  if (typeof reward.wonCost === 'number') {
    const gpw = ctx.goldPerWon ?? 0;
    if (gpw > 0) return Math.round(reward.wonCost * reward.qty * gpw);
    return null;
  }
  // 1-3) 확률 기댓값 — Σ(prob% × 시세) × qty (랜덤 상자)
  if (reward.expected && reward.expected.length > 0) {
    let sum = 0;
    let any = false;
    for (const e of reward.expected) {
      const raw = prices[e.priceKey];
      if (typeof raw === 'number' && raw > 0) {
        sum += raw * (e.prob / 100);
        any = true;
      }
    }
    if (!any) return null;
    return Math.round(sum * reward.qty);
  }
  // 2) 실시간 시세 (아이템 ID) — bonusGold(가공 완료 보너스 등) 가산
  if (reward.priceKey) {
    const raw = prices[reward.priceKey];
    if (typeof raw === 'number' && raw > 0) {
      const bundle = reward.bundle && reward.bundle > 0 ? reward.bundle : 1;
      const bonus = (reward.bonusGold ?? 0) * reward.qty;
      return Math.round((raw / bundle) * reward.qty + bonus);
    }
  }
  // 3) 환율 환산 — 블루 크리스탈 단가로 가치 지정된 아이템 (페온/젬가공권/도약/물약 등)
  const rate = ctx.exchangeRate ?? 0; // 100블크 = rate골드
  if (rate > 0) {
    if (typeof reward.crystalCost === 'number') {
      // 개당 N블크 → 골드
      return Math.round(reward.crystalCost * reward.qty * (rate / 100));
    }
    if (reward.category === 'crystal') {
      // 블루 크리스탈 그 자체 (qty개)
      return Math.round((reward.qty / 100) * rate);
    }
  }
  // 4) 산정 불가
  return null;
}

/** 보상 목록의 골드 합계 (산정 불가 항목은 0으로 취급) */
export function sumGold(rewards: Reward[], prices: Record<string, number>, ctx: PriceCtx = {}): number {
  return rewards.reduce((acc, r) => acc + (rewardGold(r, prices, ctx) ?? 0), 0);
}

/** 레벨의 달성 보상 중 선택된 옵션 (선택 안 했으면 가치가 가장 높은 것) */
export function selectedAchievement(
  level: PassLevel,
  choices: Record<number, number>,
  prices: Record<string, number>,
  ctx: PriceCtx = {}
): Reward | undefined {
  const opts = level.achievement;
  if (opts.length === 0) return undefined;
  if (opts.length === 1) return opts[0];

  const picked = choices[level.level];
  if (picked != null && opts[picked]) return opts[picked];

  // 미선택 시 골드 가치 최대 옵션 (더 비싼 쪽 기본 선택)
  let best = 0;
  let bestVal = -1;
  opts.forEach((o, i) => {
    const v = rewardGold(o, prices, ctx) ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return opts[best];
}

export interface TierTotals {
  /** 달성 보상(무료) 합계 */
  achievement: number;
  /** 프리미엄 추가 보상 합계 */
  premium: number;
  /** 슈퍼프리미엄 추가 보상 합계 */
  superPremium: number;
}

/** 전 레벨에 걸친 티어별 골드 합계 */
export function calcTotals(
  levels: PassLevel[],
  choices: Record<number, number>,
  prices: Record<string, number>,
  ctx: PriceCtx = {}
): TierTotals {
  let achievement = 0;
  let premium = 0;
  let superPremium = 0;

  for (const lv of levels) {
    const pick = selectedAchievement(lv, choices, prices, ctx);
    if (pick) achievement += rewardGold(pick, prices, ctx) ?? 0;
    premium += sumGold(lv.premium, prices, ctx);
    if (lv.superPremium) superPremium += sumGold(lv.superPremium, prices, ctx);
  }
  return { achievement, premium, superPremium };
}

export type PassTier = 'free' | 'premium' | 'super';

/**
 * 티어별 가치.
 *  - free  : 택1(달성) 가치 — 무료라 가격 비교 대상 아님
 *  - premium: 프리미엄 보상만 (택1 제외) → 프리미엄 가격과 비교
 *  - super : 프리미엄 + 슈퍼 보상 (택1 제외) → 슈퍼 가격과 비교
 *  택1은 무료로 받으므로 유료 티어 가치에서 제외한다.
 */
export function tierValue(totals: TierTotals, tier: PassTier): number {
  switch (tier) {
    case 'free':
      return totals.achievement;
    case 'premium':
      return totals.premium;
    case 'super':
      return totals.premium + totals.superPremium;
  }
}

/**
 * 현금(원)을 골드로 환산.
 * 환율: 100블루크리스탈 = won100Blue 원, 100블크 = goldPer100Blue 골드
 * (지옥 보상 계산기와 동일한 환산 개념)
 */
export function wonToGold(won: number, goldPer100Blue: number, won100Blue: number): number {
  if (won <= 0 || won100Blue <= 0) return 0;
  const blue = (won / won100Blue) * 100;
  return Math.round((blue / 100) * goldPer100Blue);
}
