// 전투력 시뮬레이터 로직
// 현재 캐릭터 데이터에서 각 요소의 전투력 기여도(%) 계산 및 시뮬레이션

import type { CombatPowerData, GemInfo, EngravingInfo } from './combatPowerData';
import {
  getEngravingCoefficient,
  getGemPower,
  getWeaponQualityPower,
  getCardSetPower,
  getArkPassivePower,
  STAT_POWER_PER_100,
  BRACELET_EFFECT_POWER,
  ACCESSORY_GRINDING_POWER,
  getBaseItemLevelPower,
} from './combatPowerTables';

// ============================
// 전투력 기여도 타입
// ============================

export type PowerBreakdownItem = {
  category: string;       // 분류 (무기 품질, 각인, 보석 등)
  label: string;          // 표시 이름
  currentValue: string;   // 현재 값 (예: "품질 89")
  contribution: number;   // 기여도 (%)
  estimatedPower: number; // 추정 전투력 기여량
};

export type PowerBreakdown = {
  totalPower: number;     // 총 전투력 (API)
  basePower: number;      // 기본 전투력 (아이템 레벨 기반)
  items: PowerBreakdownItem[];
};

export type SimulationResult = {
  category: string;
  label: string;
  currentValue: string;
  newValue: string;
  currentContribution: number;
  newContribution: number;
  powerChange: number;         // 전투력 변화량
  powerChangePercent: number;  // 전투력 변화율 (%)
};

export type UpgradeRecommendation = {
  category: string;
  label: string;
  currentValue: string;
  recommendedValue: string;
  expectedGain: number;
  expectedGainPercent: number;
  priority: number; // 1이 가장 높음
};

// ============================
// 기여도 계산
// ============================

export function calculateBreakdown(data: CombatPowerData): PowerBreakdown {
  const items: PowerBreakdownItem[] = [];
  const totalPower = data.profile.combatPower || 0;
  const basePower = getBaseItemLevelPower(data.profile.itemLevel);

  // 1. 무기 품질
  if (data.weapon) {
    const qualityContrib = getWeaponQualityPower(data.weapon.quality);
    items.push({
      category: '무기 품질',
      label: `무기 품질 (${data.weapon.grade})`,
      currentValue: `품질 ${data.weapon.quality}`,
      contribution: qualityContrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * qualityContrib / 100) : 0,
    });
  }

  // 2. 각인
  let totalEngravingContrib = 0;
  for (const eng of data.engravings) {
    const contrib = getEngravingCoefficient(eng.name, eng.level, Math.max(1, eng.abilityStoneLevel));
    totalEngravingContrib += contrib;
    items.push({
      category: '각인',
      label: eng.name,
      currentValue: `Lv.${eng.level}${eng.abilityStoneLevel > 0 ? ` (어빌 ${eng.abilityStoneLevel})` : ''}`,
      contribution: contrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * contrib / 100) : 0,
    });
  }

  // 3. 보석
  let totalGemContrib = 0;
  const gemSummary: Record<string, { count: number; totalPower: number; levels: number[] }> = {};

  for (const gem of data.gems) {
    const contrib = getGemPower(gem.tier, gem.level, gem.type);
    totalGemContrib += contrib;

    const key = gem.type;
    if (!gemSummary[key]) {
      gemSummary[key] = { count: 0, totalPower: 0, levels: [] };
    }
    gemSummary[key].count++;
    gemSummary[key].totalPower += contrib;
    gemSummary[key].levels.push(gem.level);
  }

  for (const [type, info] of Object.entries(gemSummary)) {
    const avgLevel = info.levels.reduce((a, b) => a + b, 0) / info.levels.length;
    items.push({
      category: '보석',
      label: `${type} 보석`,
      currentValue: `${info.count}개 (평균 Lv.${avgLevel.toFixed(1)})`,
      contribution: info.totalPower,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * info.totalPower / 100) : 0,
    });
  }

  // 4. 카드 세트
  for (const card of data.cardSets) {
    const contrib = getCardSetPower(card.name, card.activeCount);
    if (contrib > 0) {
      items.push({
        category: '카드',
        label: card.name,
        currentValue: `${card.activeCount}세트${card.awakening > 0 ? ` (각성 ${card.awakening})` : ''}`,
        contribution: contrib,
        estimatedPower: totalPower > 0 ? Math.round(totalPower * contrib / 100) : 0,
      });
    }
  }

  // 5. 아크 패시브
  if (data.arkPassive) {
    const contrib = getArkPassivePower(
      data.arkPassive.evolution,
      data.arkPassive.enlightenment,
      data.arkPassive.leap
    );
    items.push({
      category: '아크 패시브',
      label: '아크 패시브',
      currentValue: `진화 ${data.arkPassive.evolution} / 깨달음 ${data.arkPassive.enlightenment} / 도약 ${data.arkPassive.leap}`,
      contribution: contrib,
      estimatedPower: totalPower > 0 ? Math.round(totalPower * contrib / 100) : 0,
    });
  }

  // 6. 전투 스탯
  const statContrib =
    (data.combatStats.crit / 100) * (STAT_POWER_PER_100['치명'] || 0) +
    (data.combatStats.specialization / 100) * (STAT_POWER_PER_100['특화'] || 0) +
    (data.combatStats.swiftness / 100) * (STAT_POWER_PER_100['신속'] || 0);

  items.push({
    category: '전투 스탯',
    label: '전투 스탯 합',
    currentValue: `치${data.combatStats.crit} / 특${data.combatStats.specialization} / 신${data.combatStats.swiftness}`,
    contribution: statContrib,
    estimatedPower: totalPower > 0 ? Math.round(totalPower * statContrib / 100) : 0,
  });

  // 7. 팔찌
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
      estimatedPower: totalPower > 0 ? Math.round(totalPower * braceletContrib / 100) : 0,
    });
  }

  // 8. 장신구 연마
  let accessoryContrib = 0;
  for (const acc of data.accessories) {
    for (const eff of acc.effects) {
      // 효과명에서 카테고리 추출
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
      estimatedPower: totalPower > 0 ? Math.round(totalPower * accessoryContrib / 100) : 0,
    });
  }

  // contribution 내림차순 정렬
  items.sort((a, b) => b.contribution - a.contribution);

  return { totalPower, basePower, items };
}

// ============================
// 시뮬레이션
// ============================

// 업그레이드 시 전투력 변화 계산
// 공식: 변화율 = (1 + 새_요소%) / (1 + 현재_요소%) - 1
// 예상 전투력 변화 = 현재_전투력 × 변화율
export function simulateChange(
  totalPower: number,
  currentContribution: number,  // 현재 기여도 (%)
  newContribution: number,      // 변경 후 기여도 (%)
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
  newQuality: number
): SimulationResult | null {
  if (!data.weapon) return null;

  const currentContrib = getWeaponQualityPower(data.weapon.quality);
  const newContrib = getWeaponQualityPower(newQuality);
  const { powerChange, powerChangePercent } = simulateChange(
    data.profile.combatPower, currentContrib, newContrib
  );

  return {
    category: '무기 품질',
    label: '무기 품질 변경',
    currentValue: `품질 ${data.weapon.quality}`,
    newValue: `품질 ${newQuality}`,
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
  newTier?: number
): SimulationResult | null {
  const gemsOfType = data.gems.filter(g => g.type === gemType);
  if (gemsOfType.length === 0) return null;

  let currentContrib = 0;
  let newContrib = 0;

  for (const gem of gemsOfType) {
    currentContrib += getGemPower(gem.tier, gem.level, gem.type);
    newContrib += getGemPower(newTier || gem.tier, newLevel, gem.type);
  }

  const { powerChange, powerChangePercent } = simulateChange(
    data.profile.combatPower, currentContrib, newContrib
  );

  const avgLevel = gemsOfType.reduce((s, g) => s + g.level, 0) / gemsOfType.length;

  return {
    category: '보석',
    label: `${gemType} 보석 업그레이드`,
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
  newAbilityStoneLevel?: number
): SimulationResult | null {
  const eng = data.engravings.find(e => e.name === engravingName);
  if (!eng) return null;

  const currentContrib = getEngravingCoefficient(eng.name, eng.level, Math.max(1, eng.abilityStoneLevel));
  const newContrib = getEngravingCoefficient(
    eng.name,
    newLevel,
    newAbilityStoneLevel !== undefined ? newAbilityStoneLevel : Math.max(1, eng.abilityStoneLevel)
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

// ============================
// 업그레이드 추천
// ============================

export function getUpgradeRecommendations(data: CombatPowerData): UpgradeRecommendation[] {
  const recommendations: UpgradeRecommendation[] = [];
  const totalPower = data.profile.combatPower;
  if (totalPower <= 0) return recommendations;

  // 1. 무기 품질 100으로 올렸을 때
  if (data.weapon && data.weapon.quality < 100) {
    const result = simulateWeaponQuality(data, 100);
    if (result && result.powerChange > 0) {
      recommendations.push({
        category: '무기 품질',
        label: '무기 품질',
        currentValue: `품질 ${data.weapon.quality}`,
        recommendedValue: '품질 100',
        expectedGain: result.powerChange,
        expectedGainPercent: result.powerChangePercent,
        priority: 0,
      });
    }
  }

  // 2. 보석 10레벨로 올렸을 때
  const gemTypes = [...new Set(data.gems.map(g => g.type))];
  for (const gemType of gemTypes) {
    const gemsOfType = data.gems.filter(g => g.type === gemType);
    const avgLevel = gemsOfType.reduce((s, g) => s + g.level, 0) / gemsOfType.length;

    if (avgLevel < 10) {
      const result = simulateGemUpgrade(data, gemType, 10);
      if (result && result.powerChange > 0) {
        recommendations.push({
          category: '보석',
          label: `${gemType} 보석`,
          currentValue: `평균 Lv.${avgLevel.toFixed(1)}`,
          recommendedValue: '전부 Lv.10',
          expectedGain: result.powerChange,
          expectedGainPercent: result.powerChangePercent,
          priority: 0,
        });
      }
    }
  }

  // 3. 각인 레벨 업
  for (const eng of data.engravings) {
    if (eng.level < 4) {
      const result = simulateEngravingChange(data, eng.name, 4);
      if (result && result.powerChange > 0) {
        recommendations.push({
          category: '각인',
          label: eng.name,
          currentValue: `Lv.${eng.level}`,
          recommendedValue: 'Lv.4',
          expectedGain: result.powerChange,
          expectedGainPercent: result.powerChangePercent,
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
