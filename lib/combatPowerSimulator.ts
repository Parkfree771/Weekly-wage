// ═══════════════════════════════════════════════════════════════
// 전투력 시뮬레이터 (25년 7월 9일 패치 반영)
// ═══════════════════════════════════════════════════════════════
//
// ■ 핵심 공식:
//   전투력 = 순수기본공격력 × 0.0288 × Π(1 + 요소%)
//   모든 요소는 곱연산
//
// ■ 시뮬레이션:
//   한 요소만 변경 시 전투력 변화 =
//   현재전투력 × (1 + 새요소%) / (1 + 현재요소%) - 현재전투력

import type { CombatPowerData, GemInfo, EngravingInfo } from './combatPowerData';
import {
  getEngravingCoefficient,
  getGemPower,
  getCardSetPower,
  getArkPassivePower,
  getCombatLevelPercent,
  COMBAT_STAT_COEFFICIENT,
  BRACELET_EFFECT_POWER,
  ACCESSORY_GRINDING_POWER,
  getBaseItemLevelPower,
  ARK_PASSIVE_POWER_PER_POINT,
} from './combatPowerTables';

// ════════════════════════════════════
// 타입 정의
// ════════════════════════════════════

export type PowerBreakdownItem = {
  category: string;       // 분류
  label: string;          // 표시 이름
  currentValue: string;   // 현재 값
  contribution: number;   // 전투력 증가율 (%)  ← 곱연산 요소
  estimatedPower: number; // 추정 전투력 기여량 (참고용)
};

export type PowerBreakdown = {
  totalPower: number;     // 총 전투력 (API 실제 값)
  basePower: number;      // 기본 전투력 (아이템 레벨 기반 추정)
  items: PowerBreakdownItem[];
  // 곱연산 검증: 모든 요소를 곱해서 나온 전투력 배율
  totalMultiplier: number;
};

export type SimulationResult = {
  category: string;
  label: string;
  currentValue: string;
  newValue: string;
  currentContribution: number;
  newContribution: number;
  powerChange: number;
  powerChangePercent: number;
};

export type UpgradeRecommendation = {
  category: string;
  label: string;
  currentValue: string;
  recommendedValue: string;
  expectedGain: number;
  expectedGainPercent: number;
  priority: number;
};

// ════════════════════════════════════
// 기여도 계산 (곱연산 기반)
// ════════════════════════════════════

export function calculateBreakdown(data: CombatPowerData): PowerBreakdown {
  const items: PowerBreakdownItem[] = [];
  const totalPower = data.profile.combatPower || 0;
  const basePower = getBaseItemLevelPower(data.profile.itemLevel);

  // ── 1. 전투 레벨 ──
  const combatLevel = data.profile.characterLevel || 70;
  const combatLevelPercent = getCombatLevelPercent(combatLevel);
  if (combatLevelPercent > 0) {
    items.push({
      category: '전투 레벨',
      label: `전투 레벨 ${combatLevel}`,
      currentValue: `Lv.${combatLevel}`,
      contribution: combatLevelPercent,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * combatLevelPercent / (100 + combatLevelPercent)) : 0,
    });
  }

  // ── 2. 무기 품질 (추가 피해%) ──
  if (data.weapon) {
    // 추가 피해% = 전투력 증가%
    const qualityContrib = data.weapon.additionalDamage || 0;
    items.push({
      category: '무기 품질',
      label: `무기 품질 (${data.weapon.grade})`,
      currentValue: `품질 ${data.weapon.quality} (추가피해 ${qualityContrib}%)`,
      contribution: qualityContrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * qualityContrib / (100 + qualityContrib)) : 0,
    });
  }

  // ── 3. 아크 패시브 ──
  if (data.arkPassive) {
    const evoContrib = data.arkPassive.evolution * ARK_PASSIVE_POWER_PER_POINT.evolution;
    const enlContrib = data.arkPassive.enlightenment * ARK_PASSIVE_POWER_PER_POINT.enlightenment;
    const leapContrib = data.arkPassive.leap * ARK_PASSIVE_POWER_PER_POINT.leap;
    const totalArkContrib = evoContrib + enlContrib + leapContrib;

    items.push({
      category: '아크 패시브',
      label: '아크 패시브',
      currentValue: `진화 ${data.arkPassive.evolution}(${evoContrib.toFixed(1)}%) / 깨달음 ${data.arkPassive.enlightenment}(${enlContrib.toFixed(1)}%) / 도약 ${data.arkPassive.leap}(${leapContrib.toFixed(1)}%)`,
      contribution: totalArkContrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * totalArkContrib / (100 + totalArkContrib)) : 0,
    });
  }

  // ── 4. 각인 (각각 독립 곱연산) ──
  for (const eng of data.engravings) {
    // API에서 유각장 수를 정확히 알기 어려우므로, 현재 레벨에서 역추정
    // 유각 20장 + 어빌스톤 레벨 기준으로 조회
    const yukakSheets = eng.level * 5; // 레벨 1→5장, 2→10장, 3→15장, 4→20장 (근사)
    const contrib = getEngravingCoefficient(eng.name, yukakSheets, eng.abilityStoneLevel);
    if (contrib > 0) {
      items.push({
        category: '각인',
        label: eng.name,
        currentValue: `Lv.${eng.level}${eng.abilityStoneLevel > 0 ? ` (어빌 ${eng.abilityStoneLevel})` : ''}`,
        contribution: contrib,
        estimatedPower: totalPower > 0 ? Math.round(totalPower * contrib / (100 + contrib)) : 0,
      });
    }
  }

  // ── 5. 보석 (각각 독립 곱연산) ──
  const gemSummary: Record<string, { count: number; totalPower: number; levels: number[] }> = {};
  for (const gem of data.gems) {
    const contrib = getGemPower(gem.tier, gem.level);
    const key = `T${gem.tier}`;
    if (!gemSummary[key]) {
      gemSummary[key] = { count: 0, totalPower: 0, levels: [] };
    }
    gemSummary[key].count++;
    gemSummary[key].totalPower += contrib;
    gemSummary[key].levels.push(gem.level);
  }

  for (const [tierKey, info] of Object.entries(gemSummary)) {
    const avgLevel = info.levels.reduce((a, b) => a + b, 0) / info.levels.length;
    items.push({
      category: '보석',
      label: `${tierKey} 보석`,
      currentValue: `${info.count}개 (평균 Lv.${avgLevel.toFixed(1)})`,
      contribution: info.totalPower,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * info.totalPower / (100 + info.totalPower)) : 0,
    });
  }

  // ── 6. 전투 스탯 ──
  const statSum = data.combatStats.crit + data.combatStats.specialization + data.combatStats.swiftness;
  const statContrib = statSum * COMBAT_STAT_COEFFICIENT;

  items.push({
    category: '전투 스탯',
    label: '전투 스탯 (치+특+신)',
    currentValue: `합계 ${statSum} (치${data.combatStats.crit}/특${data.combatStats.specialization}/신${data.combatStats.swiftness})`,
    contribution: statContrib,
    estimatedPower: totalPower > 0 ? Math.round(totalPower * statContrib / (100 + statContrib)) : 0,
  });

  // ── 7. 카드 세트 ──
  for (const card of data.cardSets) {
    const contrib = getCardSetPower(card.name, card.activeCount, card.awakening);
    if (contrib > 0) {
      items.push({
        category: '카드',
        label: card.name,
        currentValue: `${card.activeCount}세트${card.awakening > 0 ? ` (${card.awakening}각)` : ''}`,
        contribution: contrib,
        estimatedPower: totalPower > 0 ? Math.round(totalPower * contrib / (100 + contrib)) : 0,
      });
    }
  }

  // ── 8. 팔찌 ──
  let braceletContrib = 0;
  for (const effect of data.bracelet) {
    const power = BRACELET_EFFECT_POWER[effect.name] || 0;
    braceletContrib += power;
  }
  if (braceletContrib > 0 || data.bracelet.length > 0) {
    items.push({
      category: '팔찌',
      label: '팔찌 효과',
      currentValue: `${data.bracelet.length}개 효과`,
      contribution: braceletContrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * braceletContrib / (100 + braceletContrib)) : 0,
    });
  }

  // ── 9. 장신구 연마 ──
  let accessoryContrib = 0;
  for (const acc of data.accessories) {
    for (const eff of acc.effects) {
      for (const [key, grades] of Object.entries(ACCESSORY_GRINDING_POWER)) {
        if (eff.name.includes(key)) {
          accessoryContrib += grades[eff.grade] || grades['중'] || 0;
          break;
        }
      }
    }
  }
  if (accessoryContrib > 0 || data.accessories.length > 0) {
    items.push({
      category: '장신구 연마',
      label: '장신구 연마 효과',
      currentValue: `${data.accessories.length}개 장신구`,
      contribution: accessoryContrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * accessoryContrib / (100 + accessoryContrib)) : 0,
    });
  }

  // contribution 내림차순 정렬
  items.sort((a, b) => b.contribution - a.contribution);

  // 전체 곱연산 배율 계산
  let totalMultiplier = 1;
  for (const item of items) {
    totalMultiplier *= (1 + item.contribution / 100);
  }

  return { totalPower, basePower, items, totalMultiplier };
}

// ════════════════════════════════════
// 시뮬레이션 (곱연산 기반)
// ════════════════════════════════════

/**
 * 한 요소만 변경했을 때 전투력 변화
 * 곱연산이므로: 변화율 = (1+새%) / (1+현재%) - 1
 * 전투력 변화 = 현재전투력 × 변화율
 */
export function simulateChange(
  totalPower: number,
  currentContribution: number,
  newContribution: number,
): { powerChange: number; powerChangePercent: number } {
  if (totalPower <= 0) return { powerChange: 0, powerChangePercent: 0 };

  const changeRate = (1 + newContribution / 100) / (1 + currentContribution / 100) - 1;
  const powerChange = Math.round(totalPower * changeRate);
  const powerChangePercent = changeRate * 100;

  return { powerChange, powerChangePercent };
}

// 무기 품질 변경 시뮬레이션
export function simulateWeaponQuality(
  data: CombatPowerData,
  newQuality: number,
  newAdditionalDamage?: number,
): SimulationResult | null {
  if (!data.weapon) return null;

  const currentContrib = data.weapon.additionalDamage || 0;
  // 품질 → 추가피해 변환 (품질 100 = 30%)
  const newContrib = newAdditionalDamage !== undefined
    ? newAdditionalDamage
    : (newQuality / 100) * 30; // 근사치

  const { powerChange, powerChangePercent } = simulateChange(
    data.profile.combatPower, currentContrib, newContrib
  );

  return {
    category: '무기 품질',
    label: '무기 품질 변경',
    currentValue: `품질 ${data.weapon.quality} (추가피해 ${currentContrib}%)`,
    newValue: `품질 ${newQuality} (추가피해 ${newContrib.toFixed(2)}%)`,
    currentContribution: currentContrib,
    newContribution: newContrib,
    powerChange,
    powerChangePercent,
  };
}

// 보석 레벨 변경 시뮬레이션
export function simulateGemUpgrade(
  data: CombatPowerData,
  gemType: string,
  newLevel: number,
  newTier?: number,
): SimulationResult | null {
  // gemType이 T3/T4면 티어로 필터, 아니면 전체
  const targetTier = newTier || (gemType === '겁화' || gemType === '작열' ? 4 : 3);
  const gemsOfType = data.gems.filter(g => g.tier === targetTier);
  if (gemsOfType.length === 0) {
    // 타입 구분 없이 전체
    const allGems = data.gems;
    if (allGems.length === 0) return null;

    let currentContrib = 0;
    let newContrib = 0;
    for (const gem of allGems) {
      currentContrib += getGemPower(gem.tier, gem.level);
      newContrib += getGemPower(newTier || gem.tier, newLevel);
    }

    const { powerChange, powerChangePercent } = simulateChange(
      data.profile.combatPower, currentContrib, newContrib
    );

    const avgLevel = allGems.reduce((s, g) => s + g.level, 0) / allGems.length;
    return {
      category: '보석',
      label: `보석 업그레이드`,
      currentValue: `${allGems.length}개 평균 Lv.${avgLevel.toFixed(1)}`,
      newValue: `전부 Lv.${newLevel}`,
      currentContribution: currentContrib,
      newContribution: newContrib,
      powerChange,
      powerChangePercent,
    };
  }

  let currentContrib = 0;
  let newContrib = 0;
  for (const gem of gemsOfType) {
    currentContrib += getGemPower(gem.tier, gem.level);
    newContrib += getGemPower(newTier || gem.tier, newLevel);
  }

  const { powerChange, powerChangePercent } = simulateChange(
    data.profile.combatPower, currentContrib, newContrib
  );

  const avgLevel = gemsOfType.reduce((s, g) => s + g.level, 0) / gemsOfType.length;
  return {
    category: '보석',
    label: `T${targetTier} 보석 업그레이드`,
    currentValue: `${gemsOfType.length}개 평균 Lv.${avgLevel.toFixed(1)}`,
    newValue: `전부 Lv.${newLevel}`,
    currentContribution: currentContrib,
    newContribution: newContrib,
    powerChange,
    powerChangePercent,
  };
}

// 각인 변경 시뮬레이션
export function simulateEngravingChange(
  data: CombatPowerData,
  engravingName: string,
  newLevel: number,
  newAbilityStoneLevel?: number,
): SimulationResult | null {
  const eng = data.engravings.find(e => e.name === engravingName);
  if (!eng) return null;

  const currentYukak = eng.level * 5;
  const newYukak = newLevel * 5;

  const currentContrib = getEngravingCoefficient(eng.name, currentYukak, eng.abilityStoneLevel);
  const newContrib = getEngravingCoefficient(
    eng.name,
    newYukak,
    newAbilityStoneLevel !== undefined ? newAbilityStoneLevel : eng.abilityStoneLevel,
  );

  const { powerChange, powerChangePercent } = simulateChange(
    data.profile.combatPower, currentContrib, newContrib
  );

  return {
    category: '각인',
    label: `${engravingName} 변경`,
    currentValue: `Lv.${eng.level}`,
    newValue: `Lv.${newLevel}`,
    currentContribution: currentContrib,
    newContribution: newContrib,
    powerChange,
    powerChangePercent,
  };
}

// ════════════════════════════════════
// 업그레이드 추천
// ════════════════════════════════════

export function getUpgradeRecommendations(data: CombatPowerData): UpgradeRecommendation[] {
  const recommendations: UpgradeRecommendation[] = [];
  const totalPower = data.profile.combatPower;
  if (totalPower <= 0) return recommendations;

  // 1. 무기 품질 100으로
  if (data.weapon && data.weapon.quality < 100) {
    const result = simulateWeaponQuality(data, 100, 30.0);
    if (result && result.powerChange > 0) {
      recommendations.push({
        category: '무기 품질',
        label: '무기 품질',
        currentValue: `품질 ${data.weapon.quality}`,
        recommendedValue: '품질 100 (추가피해 30%)',
        expectedGain: result.powerChange,
        expectedGainPercent: result.powerChangePercent,
        priority: 0,
      });
    }
  }

  // 2. 보석 10레벨로
  const gemTiers = [...new Set(data.gems.map(g => g.tier))];
  for (const tier of gemTiers) {
    const gemsOfTier = data.gems.filter(g => g.tier === tier);
    const avgLevel = gemsOfTier.reduce((s, g) => s + g.level, 0) / gemsOfTier.length;

    if (avgLevel < 10) {
      let currentContrib = 0;
      let newContrib = 0;
      for (const gem of gemsOfTier) {
        currentContrib += getGemPower(gem.tier, gem.level);
        newContrib += getGemPower(gem.tier, 10);
      }
      const { powerChange, powerChangePercent } = simulateChange(totalPower, currentContrib, newContrib);

      if (powerChange > 0) {
        recommendations.push({
          category: '보석',
          label: `T${tier} 보석`,
          currentValue: `평균 Lv.${avgLevel.toFixed(1)}`,
          recommendedValue: '전부 Lv.10',
          expectedGain: powerChange,
          expectedGainPercent: powerChangePercent,
          priority: 0,
        });
      }
    }
  }

  // 3. 각인 레벨 업 (유각 20장으로)
  for (const eng of data.engravings) {
    const currentYukak = eng.level * 5;
    if (currentYukak < 20) {
      const currentContrib = getEngravingCoefficient(eng.name, currentYukak, eng.abilityStoneLevel);
      const newContrib = getEngravingCoefficient(eng.name, 20, eng.abilityStoneLevel);
      const { powerChange, powerChangePercent } = simulateChange(totalPower, currentContrib, newContrib);

      if (powerChange > 0) {
        recommendations.push({
          category: '각인',
          label: eng.name,
          currentValue: `Lv.${eng.level} (유각 ${currentYukak}장)`,
          recommendedValue: '유각 20장',
          expectedGain: powerChange,
          expectedGainPercent: powerChangePercent,
          priority: 0,
        });
      }
    }
  }

  // 우선순위 정렬 (전투력 증가량 내림차순)
  recommendations.sort((a, b) => b.expectedGain - a.expectedGain);
  recommendations.forEach((r, i) => { r.priority = i + 1; });

  return recommendations;
}
