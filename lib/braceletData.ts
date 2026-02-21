// 팔찌 부여효과 확률 테이블 및 롤 엔진

export type EffectTier = 'low' | 'mid' | 'high';
export type EffectRarity = 'common' | 'rare' | 'special';

export type BraceletEffectDef = {
  id: string;
  group: string;
  tier: EffectTier;
  label: string;
  rarity: EffectRarity;
  probability: number; // 부여효과 확률 (%)
};

export type BraceletEffect = {
  def: BraceletEffectDef;
  locked: boolean;
};

export type FixedStatType = '특화' | '신속' | '치명';

export type FixedStat = {
  type: FixedStatType;
  value: number; // 61~120
};

export type SimPhase = 'input' | 'result' | 'comparing' | 'final';

// ===== 부여효과 확률 테이블 =====
// 부여 효과 확률만 사용 (사용자 요청)

export const BRACELET_EFFECTS: BraceletEffectDef[] = [
  // === Common 효과 (4.2 / 2.1 / 0.7%) ===

  // 1. 공격 및 이동 속도
  { id: 'atk_spd_4', group: '공격 및 이동 속도', tier: 'low', label: '공격 및 이동 속도가 4% 증가한다.', rarity: 'common', probability: 4.2 },
  { id: 'atk_spd_5', group: '공격 및 이동 속도', tier: 'mid', label: '공격 및 이동 속도가 5% 증가한다.', rarity: 'common', probability: 2.1 },
  { id: 'atk_spd_6', group: '공격 및 이동 속도', tier: 'high', label: '공격 및 이동 속도가 6% 증가한다.', rarity: 'common', probability: 0.7 },

  // 2. 시드 등급 이하 피해 증가
  { id: 'seed_dmg_4', group: '시드 등급 이하 피해 증가', tier: 'low', label: '시드 등급 이하 몬스터에게 주는 피해가 4% 증가한다.', rarity: 'common', probability: 4.2 },
  { id: 'seed_dmg_5', group: '시드 등급 이하 피해 증가', tier: 'mid', label: '시드 등급 이하 몬스터에게 주는 피해가 5% 증가한다.', rarity: 'common', probability: 2.1 },
  { id: 'seed_dmg_6', group: '시드 등급 이하 피해 증가', tier: 'high', label: '시드 등급 이하 몬스터에게 주는 피해가 6% 증가한다.', rarity: 'common', probability: 0.7 },

  // 3. 시드 등급 이하 피해 감소
  { id: 'seed_def_6', group: '시드 등급 이하 피해 감소', tier: 'low', label: '시드 등급 이하 몬스터에게 받는 피해가 6% 감소한다.', rarity: 'common', probability: 4.2 },
  { id: 'seed_def_8', group: '시드 등급 이하 피해 감소', tier: 'mid', label: '시드 등급 이하 몬스터에게 받는 피해가 8% 감소한다.', rarity: 'common', probability: 2.1 },
  { id: 'seed_def_10', group: '시드 등급 이하 피해 감소', tier: 'high', label: '시드 등급 이하 몬스터에게 받는 피해가 10% 감소한다.', rarity: 'common', probability: 0.7 },

  // 4. 물리 방어력
  { id: 'phys_def_5000', group: '물리 방어력', tier: 'low', label: '물리 방어력 +5000', rarity: 'common', probability: 4.2 },
  { id: 'phys_def_6000', group: '물리 방어력', tier: 'mid', label: '물리 방어력 +6000', rarity: 'common', probability: 2.1 },
  { id: 'phys_def_7000', group: '물리 방어력', tier: 'high', label: '물리 방어력 +7000', rarity: 'common', probability: 0.7 },

  // 5. 마법 방어력
  { id: 'mag_def_5000', group: '마법 방어력', tier: 'low', label: '마법 방어력 +5000', rarity: 'common', probability: 4.2 },
  { id: 'mag_def_6000', group: '마법 방어력', tier: 'mid', label: '마법 방어력 +6000', rarity: 'common', probability: 2.1 },
  { id: 'mag_def_7000', group: '마법 방어력', tier: 'high', label: '마법 방어력 +7000', rarity: 'common', probability: 0.7 },

  // 6. 최대 생명력
  { id: 'max_hp_11200', group: '최대 생명력', tier: 'low', label: '최대 생명력 +11200', rarity: 'common', probability: 4.2 },
  { id: 'max_hp_14000', group: '최대 생명력', tier: 'mid', label: '최대 생명력 +14000', rarity: 'common', probability: 2.1 },
  { id: 'max_hp_16800', group: '최대 생명력', tier: 'high', label: '최대 생명력 +16800', rarity: 'common', probability: 0.7 },

  // 7. 전투 중 생명력 회복량
  { id: 'hp_regen_100', group: '전투 중 생명력 회복량', tier: 'low', label: '전투 중 생명력 회복량 +100', rarity: 'common', probability: 4.2 },
  { id: 'hp_regen_130', group: '전투 중 생명력 회복량', tier: 'mid', label: '전투 중 생명력 회복량 +130', rarity: 'common', probability: 2.1 },
  { id: 'hp_regen_160', group: '전투 중 생명력 회복량', tier: 'high', label: '전투 중 생명력 회복량 +160', rarity: 'common', probability: 0.7 },

  // 8. 전투자원 자연 회복량
  { id: 'resource_8', group: '전투자원 자연 회복량', tier: 'low', label: '전투자원 자연 회복량 +8%', rarity: 'common', probability: 4.2 },
  { id: 'resource_10', group: '전투자원 자연 회복량', tier: 'mid', label: '전투자원 자연 회복량 +10%', rarity: 'common', probability: 2.1 },
  { id: 'resource_12', group: '전투자원 자연 회복량', tier: 'high', label: '전투자원 자연 회복량 +12%', rarity: 'common', probability: 0.7 },

  // 9. 이동기 및 기상기 재사용
  { id: 'dash_cd_8', group: '이동기 및 기상기 재사용', tier: 'low', label: '이동기 및 기상기 재사용 대기 시간이 8% 감소한다.', rarity: 'common', probability: 4.2 },
  { id: 'dash_cd_10', group: '이동기 및 기상기 재사용', tier: 'mid', label: '이동기 및 기상기 재사용 대기 시간이 10% 감소한다.', rarity: 'common', probability: 2.1 },
  { id: 'dash_cd_12', group: '이동기 및 기상기 재사용', tier: 'high', label: '이동기 및 기상기 재사용 대기 시간이 12% 감소한다.', rarity: 'common', probability: 0.7 },

  // 10. 경직 및 피격 이상 면역
  { id: 'immune_80', group: '경직 면역', tier: 'low', label: '공격 적중 시 80초 동안 경직 및 피격 이상에 면역이 된다. (재사용 대기 시간 80초) 해당 효과는 1회 피격 시 사라진다.', rarity: 'common', probability: 4.2 },
  { id: 'immune_70', group: '경직 면역', tier: 'mid', label: '공격 적중 시 70초 동안 경직 및 피격 이상에 면역이 된다. (재사용 대기 시간 70초) 해당 효과는 1회 피격 시 사라진다.', rarity: 'common', probability: 2.1 },
  { id: 'immune_60', group: '경직 면역', tier: 'high', label: '공격 적중 시 60초 동안 경직 및 피격 이상에 면역이 된다. (재사용 대기 시간 60초) 해당 효과는 1회 피격 시 사라진다.', rarity: 'common', probability: 0.7 },

  // === Rare 효과 (0.5 / 0.25 / 0.08333%) ===

  // 11. 치명타 적중률 + 치명타 피해 증가
  { id: 'crit_rate_combo_3.4', group: '치명타 적중률 콤보', tier: 'low', label: '치명타 적중률이 3.4% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'crit_rate_combo_4.2', group: '치명타 적중률 콤보', tier: 'mid', label: '치명타 적중률이 4.2% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'crit_rate_combo_5.0', group: '치명타 적중률 콤보', tier: 'high', label: '치명타 적중률이 5.0% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 12. 치명타 피해 + 치명타 피해 증가
  { id: 'crit_dmg_combo_6.8', group: '치명타 피해 콤보', tier: 'low', label: '치명타 피해가 6.8% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'crit_dmg_combo_8.4', group: '치명타 피해 콤보', tier: 'mid', label: '치명타 피해가 8.4% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'crit_dmg_combo_10.0', group: '치명타 피해 콤보', tier: 'high', label: '치명타 피해가 10.0% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 13. 적에게 주는 피해 + 무력화
  { id: 'dmg_stagger_2.0', group: '피해 무력화 콤보', tier: 'low', label: '적에게 주는 피해가 2.0% 증가하며, 무력화 상태의 적에게 주는 피해가 4.0% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'dmg_stagger_2.5', group: '피해 무력화 콤보', tier: 'mid', label: '적에게 주는 피해가 2.5% 증가하며, 무력화 상태의 적에게 주는 피해가 4.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'dmg_stagger_3.0', group: '피해 무력화 콤보', tier: 'high', label: '적에게 주는 피해가 3.0% 증가하며, 무력화 상태의 적에게 주는 피해가 5.0% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 14. 추가 피해 + 악마 계열
  { id: 'add_dmg_demon_2.5', group: '추가 피해 악마 콤보', tier: 'low', label: '추가 피해가 2.5% 증가한다. 악마 및 대악마 계열 피해량이 2.5% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'add_dmg_demon_3.0', group: '추가 피해 악마 콤보', tier: 'mid', label: '추가 피해가 3.0% 증가한다. 악마 및 대악마 계열 피해량이 2.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'add_dmg_demon_3.5', group: '추가 피해 악마 콤보', tier: 'high', label: '추가 피해가 3.5% 증가한다. 악마 및 대악마 계열 피해량이 2.5% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 15. 스킬 재사용 + 피해 증가
  { id: 'cd_dmg_4.5', group: '재사용 피해 콤보', tier: 'low', label: '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 4.5% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'cd_dmg_5.0', group: '재사용 피해 콤보', tier: 'mid', label: '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 5.0% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'cd_dmg_5.5', group: '재사용 피해 콤보', tier: 'high', label: '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 5.5% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 16. 방어력 감소 + 아군 강화
  { id: 'def_break_1.8', group: '방어력 감소 콤보', tier: 'low', label: '몬스터에게 공격 적중 시 8초 동안 대상의 방어력을 1.8% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 2.0% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'def_break_2.1', group: '방어력 감소 콤보', tier: 'mid', label: '몬스터에게 공격 적중 시 8초 동안 대상의 방어력을 2.1% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 2.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'def_break_2.5', group: '방어력 감소 콤보', tier: 'high', label: '몬스터에게 공격 적중 시 8초 동안 대상의 방어력을 2.5% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 3.0% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 17. 치명타 저항 감소 + 아군 강화
  { id: 'crit_res_break_1.8', group: '치명타 저항 감소 콤보', tier: 'low', label: '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 저항을 1.8% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 2.0% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'crit_res_break_2.1', group: '치명타 저항 감소 콤보', tier: 'mid', label: '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 저항을 2.1% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 2.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'crit_res_break_2.5', group: '치명타 저항 감소 콤보', tier: 'high', label: '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 저항을 2.5% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 3.0% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 18. 보호 효과 + 아군 강화
  { id: 'shield_ally_0.9', group: '보호 효과 콤보', tier: 'low', label: '파티 효과로 보호 효과가 적용된 대상이 5초 동안 적에게 주는 피해가 0.9% 증가한다. 해당 효과는 한 파티 당 하나만 적용되며, 지속 시간이 없는 보호 효과에는 적용되지 않는다. 아군 공격력 강화 효과가 2.0% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'shield_ally_1.1', group: '보호 효과 콤보', tier: 'mid', label: '파티 효과로 보호 효과가 적용된 대상이 5초 동안 적에게 주는 피해가 1.1% 증가한다. 해당 효과는 한 파티 당 하나만 적용되며, 지속 시간이 없는 보호 효과에는 적용되지 않는다. 아군 공격력 강화 효과가 2.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'shield_ally_1.3', group: '보호 효과 콤보', tier: 'high', label: '파티 효과로 보호 효과가 적용된 대상이 5초 동안 적에게 주는 피해가 1.3% 증가한다. 해당 효과는 한 파티 당 하나만 적용되며, 지속 시간이 없는 보호 효과에는 적용되지 않는다. 아군 공격력 강화 효과가 3.0% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 19. 치명타 피해 저항 감소 + 아군 강화
  { id: 'crit_dmg_res_3.6', group: '치명타 피해 저항 감소 콤보', tier: 'low', label: '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 피해 저항을 3.6% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 2.0% 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'crit_dmg_res_4.2', group: '치명타 피해 저항 감소 콤보', tier: 'mid', label: '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 피해 저항을 4.2% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 2.5% 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'crit_dmg_res_4.8', group: '치명타 피해 저항 감소 콤보', tier: 'high', label: '몬스터에게 공격 적중 시 8초 동안 대상의 치명타 피해 저항을 4.8% 감소시킨다. 해당 효과는 한 파티 당 하나만 적용된다. 아군 공격력 강화 효과가 3.0% 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 20. 무기 공격력 + 이동속도 중첩
  { id: 'wpn_stack_1160', group: '무기 공격력 중첩', tier: 'low', label: '공격 적중 시 매 초 마다 10초 동안 무기 공격력이 1160, 공격 및 이동 속도가 1% 증가한다.(최대 6중첩)', rarity: 'rare', probability: 0.5 },
  { id: 'wpn_stack_1320', group: '무기 공격력 중첩', tier: 'mid', label: '공격 적중 시 매 초 마다 10초 동안 무기 공격력이 1320, 공격 및 이동 속도가 1% 증가한다.(최대 6중첩)', rarity: 'rare', probability: 0.25 },
  { id: 'wpn_stack_1480', group: '무기 공격력 중첩', tier: 'high', label: '공격 적중 시 매 초 마다 10초 동안 무기 공격력이 1480, 공격 및 이동 속도가 1% 증가한다.(최대 6중첩)', rarity: 'rare', probability: 0.08333 },

  // 21. 무기 공격력 + 생명력 50%
  { id: 'wpn_hp50_7200', group: '무기 공격력 생명력', tier: 'low', label: '무기 공격력이 7200 증가한다. 자신의 생명력이 50% 이상일 경우 적에게 공격 적중 시 5초 동안 무기 공격력이 2000 증가한다.', rarity: 'rare', probability: 0.5 },
  { id: 'wpn_hp50_8100', group: '무기 공격력 생명력', tier: 'mid', label: '무기 공격력이 8100 증가한다. 자신의 생명력이 50% 이상일 경우 적에게 공격 적중 시 5초 동안 무기 공격력이 2200 증가한다.', rarity: 'rare', probability: 0.25 },
  { id: 'wpn_hp50_9000', group: '무기 공격력 생명력', tier: 'high', label: '무기 공격력이 9000 증가한다. 자신의 생명력이 50% 이상일 경우 적에게 공격 적중 시 5초 동안 무기 공격력이 2400 증가한다.', rarity: 'rare', probability: 0.08333 },

  // 22. 무기 공격력 + 30초 중첩
  { id: 'wpn_30s_6900', group: '무기 공격력 30초 중첩', tier: 'low', label: '무기 공격력이 6900 증가한다. 공격 적중 시 30초 마다 120초 동안 무기 공격력이 130 증가한다. (최대 30중첩)', rarity: 'rare', probability: 0.5 },
  { id: 'wpn_30s_7800', group: '무기 공격력 30초 중첩', tier: 'mid', label: '무기 공격력이 7800 증가한다. 공격 적중 시 30초 마다 120초 동안 무기 공격력이 140 증가한다. (최대 30중첩)', rarity: 'rare', probability: 0.25 },
  { id: 'wpn_30s_8700', group: '무기 공격력 30초 중첩', tier: 'high', label: '무기 공격력이 8700 증가한다. 공격 적중 시 30초 마다 120초 동안 무기 공격력이 150 증가한다. (최대 30중첩)', rarity: 'rare', probability: 0.08333 },

  // === Special 효과 (1.0909 / 0.5455 / 0.1818%) ===

  // 23. 적에게 주는 피해
  { id: 'deal_dmg_2.0', group: '적에게 주는 피해', tier: 'low', label: '적에게 주는 피해가 2.0% 증가한다.', rarity: 'special', probability: 1.0909 },
  { id: 'deal_dmg_2.5', group: '적에게 주는 피해', tier: 'mid', label: '적에게 주는 피해가 2.5% 증가한다.', rarity: 'special', probability: 0.5455 },
  { id: 'deal_dmg_3.0', group: '적에게 주는 피해', tier: 'high', label: '적에게 주는 피해가 3.0% 증가한다.', rarity: 'special', probability: 0.1818 },

  // 24. 추가 피해
  { id: 'add_dmg_3.0', group: '추가 피해', tier: 'low', label: '추가 피해 +3.0%', rarity: 'special', probability: 1.0909 },
  { id: 'add_dmg_3.5', group: '추가 피해', tier: 'mid', label: '추가 피해 +3.5%', rarity: 'special', probability: 0.5455 },
  { id: 'add_dmg_4.0', group: '추가 피해', tier: 'high', label: '추가 피해 +4.0%', rarity: 'special', probability: 0.1818 },

  // 25. 백어택
  { id: 'back_atk_2.5', group: '백어택', tier: 'low', label: '백어택 스킬이 적에게 주는 피해가 2.5% 증가한다.', rarity: 'special', probability: 1.0909 },
  { id: 'back_atk_3.0', group: '백어택', tier: 'mid', label: '백어택 스킬이 적에게 주는 피해가 3.0% 증가한다.', rarity: 'special', probability: 0.5455 },
  { id: 'back_atk_3.5', group: '백어택', tier: 'high', label: '백어택 스킬이 적에게 주는 피해가 3.5% 증가한다.', rarity: 'special', probability: 0.1818 },

  // 26. 헤드어택
  { id: 'head_atk_2.5', group: '헤드어택', tier: 'low', label: '헤드어택 스킬이 적에게 주는 피해가 2.5% 증가한다.', rarity: 'special', probability: 1.0909 },
  { id: 'head_atk_3.0', group: '헤드어택', tier: 'mid', label: '헤드어택 스킬이 적에게 주는 피해가 3.0% 증가한다.', rarity: 'special', probability: 0.5455 },
  { id: 'head_atk_3.5', group: '헤드어택', tier: 'high', label: '헤드어택 스킬이 적에게 주는 피해가 3.5% 증가한다.', rarity: 'special', probability: 0.1818 },

  // 27. 비방향성 공격
  { id: 'non_dir_2.5', group: '비방향성 공격', tier: 'low', label: '방향성 공격이 아닌 스킬이 적에게 주는 피해가 2.5% 증가한다. 각성기는 적용되지 않는다.', rarity: 'special', probability: 1.0909 },
  { id: 'non_dir_3.0', group: '비방향성 공격', tier: 'mid', label: '방향성 공격이 아닌 스킬이 적에게 주는 피해가 3.0% 증가한다. 각성기는 적용되지 않는다.', rarity: 'special', probability: 0.5455 },
  { id: 'non_dir_3.5', group: '비방향성 공격', tier: 'high', label: '방향성 공격이 아닌 스킬이 적에게 주는 피해가 3.5% 증가한다. 각성기는 적용되지 않는다.', rarity: 'special', probability: 0.1818 },

  // 28. 파티원 보호 및 회복
  { id: 'party_heal_2.5', group: '파티원 보호 및 회복', tier: 'low', label: '파티원 보호 및 회복 효과가 2.5% 증가한다.', rarity: 'special', probability: 1.0909 },
  { id: 'party_heal_3.0', group: '파티원 보호 및 회복', tier: 'mid', label: '파티원 보호 및 회복 효과가 3.0% 증가한다.', rarity: 'special', probability: 0.5455 },
  { id: 'party_heal_3.5', group: '파티원 보호 및 회복', tier: 'high', label: '파티원 보호 및 회복 효과가 3.5% 증가한다.', rarity: 'special', probability: 0.1818 },

  // 29. 아군 공격력 강화
  { id: 'ally_atk_4.0', group: '아군 공격력 강화', tier: 'low', label: '아군 공격력 강화 효과 +4.0%', rarity: 'special', probability: 1.0909 },
  { id: 'ally_atk_5.0', group: '아군 공격력 강화', tier: 'mid', label: '아군 공격력 강화 효과 +5.0%', rarity: 'special', probability: 0.5455 },
  { id: 'ally_atk_6.0', group: '아군 공격력 강화', tier: 'high', label: '아군 공격력 강화 효과 +6.0%', rarity: 'special', probability: 0.1818 },

  // 30. 아군 피해량 강화
  { id: 'ally_dmg_6.0', group: '아군 피해량 강화', tier: 'low', label: '아군 피해량 강화 효과 +6.0%', rarity: 'special', probability: 1.0909 },
  { id: 'ally_dmg_7.5', group: '아군 피해량 강화', tier: 'mid', label: '아군 피해량 강화 효과 +7.5%', rarity: 'special', probability: 0.5455 },
  { id: 'ally_dmg_9.0', group: '아군 피해량 강화', tier: 'high', label: '아군 피해량 강화 효과 +9.0%', rarity: 'special', probability: 0.1818 },

  // 31. 치명타 적중률
  { id: 'crit_rate_3.4', group: '치명타 적중률', tier: 'low', label: '치명타 적중률 +3.4%', rarity: 'special', probability: 1.0909 },
  { id: 'crit_rate_4.2', group: '치명타 적중률', tier: 'mid', label: '치명타 적중률 +4.2%', rarity: 'special', probability: 0.5455 },
  { id: 'crit_rate_5.0', group: '치명타 적중률', tier: 'high', label: '치명타 적중률 +5.0%', rarity: 'special', probability: 0.1818 },

  // 32. 치명타 피해
  { id: 'crit_dmg_6.8', group: '치명타 피해', tier: 'low', label: '치명타 피해 +6.8%', rarity: 'special', probability: 1.0909 },
  { id: 'crit_dmg_8.4', group: '치명타 피해', tier: 'mid', label: '치명타 피해 +8.4%', rarity: 'special', probability: 0.5455 },
  { id: 'crit_dmg_10.0', group: '치명타 피해', tier: 'high', label: '치명타 피해 +10.0%', rarity: 'special', probability: 0.1818 },

  // 33. 무기 공격력
  { id: 'wpn_atk_7200', group: '무기 공격력', tier: 'low', label: '무기 공격력 +7200', rarity: 'special', probability: 1.0909 },
  { id: 'wpn_atk_8100', group: '무기 공격력', tier: 'mid', label: '무기 공격력 +8100', rarity: 'special', probability: 0.5455 },
  { id: 'wpn_atk_9000', group: '무기 공격력', tier: 'high', label: '무기 공격력 +9000', rarity: 'special', probability: 0.1818 },
];

// ===== tier별 변동 숫자 위치 계산 =====
// 같은 그룹 내 low/mid/high 비교하여 달라지는 숫자 위치만 추출
const tierVaryingPositions = new Map<string, Set<number>>();
(() => {
  const groups = new Map<string, BraceletEffectDef[]>();
  for (const e of BRACELET_EFFECTS) {
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group)!.push(e);
  }
  for (const [, effects] of groups) {
    const numberSets = effects.map(e => (e.label.match(/\d+\.?\d*%?/g) || []));
    for (let i = 0; i < effects.length; i++) {
      const varying = new Set<number>();
      const nums = numberSets[i];
      for (let j = 0; j < nums.length; j++) {
        const isDiff = numberSets.some((other, k) => k !== i && j < other.length && other[j] !== nums[j]);
        if (isDiff) varying.add(j);
      }
      tierVaryingPositions.set(effects[i].id, varying);
    }
  }
})();

export function getTierVaryingPositions(effectId: string): Set<number> {
  return tierVaryingPositions.get(effectId) || new Set();
}

// ===== 롤 엔진 =====

/**
 * 가중 확률로 단일 효과를 롤한다.
 * excludeGroups에 포함된 그룹은 제외하고 확률을 재정규화한다.
 */
export function rollSingleEffect(excludeGroups: string[] = []): BraceletEffectDef {
  const available = BRACELET_EFFECTS.filter(e => !excludeGroups.includes(e.group));

  const totalProb = available.reduce((sum, e) => sum + e.probability, 0);
  let rand = Math.random() * totalProb;

  for (const effect of available) {
    rand -= effect.probability;
    if (rand <= 0) {
      return effect;
    }
  }

  // fallback (shouldn't happen)
  return available[available.length - 1];
}

/**
 * 초기 3개 랜덤 효과를 롤한다.
 * 같은 그룹 중복 불가.
 */
export function rollInitialEffects(): BraceletEffect[] {
  const results: BraceletEffect[] = [];
  const usedGroups: string[] = [];

  for (let i = 0; i < 3; i++) {
    const def = rollSingleEffect(usedGroups);
    results.push({ def, locked: false });
    usedGroups.push(def.group);
  }

  return results;
}

/**
 * 잠금되지 않은 효과만 재롤한다.
 * 잠금된 효과의 그룹은 풀에서 제외된다.
 */
export function rerollEffects(currentEffects: BraceletEffect[]): BraceletEffect[] {
  const lockedGroups = currentEffects
    .filter(e => e.locked)
    .map(e => e.def.group);

  const results: BraceletEffect[] = [];
  const usedGroups = [...lockedGroups];

  for (const effect of currentEffects) {
    if (effect.locked) {
      results.push({ ...effect });
    } else {
      const newDef = rollSingleEffect(usedGroups);
      results.push({ def: newDef, locked: false });
      usedGroups.push(newDef.group);
    }
  }

  return results;
}

// ===== 확률 계산 =====

function getGroupTotal(group: string): number {
  return BRACELET_EFFECTS
    .filter(e => e.group === group)
    .reduce((sum, e) => sum + e.probability, 0);
}

function getPermutations(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr];
  const result: number[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/** 3개 효과 조합의 실제 확률 계산 (그룹 제외 재정규화 적용, 순서 무관) */
export function calculateComboProbability(effects: BraceletEffectDef[]): number {
  if (effects.length === 0) return 0;
  const indices = effects.map((_, i) => i);
  const perms = getPermutations(indices);
  let totalProb = 0;
  for (const perm of perms) {
    let prob = 1;
    let pool = 100;
    for (const idx of perm) {
      prob *= effects[idx].probability / pool;
      pool -= getGroupTotal(effects[idx].group);
    }
    totalProb += prob;
  }
  return totalProb * 100;
}

/** 확률을 퍼센트로 포맷 (유효숫자까지 표시) */
export function formatProbPercent(probPercent: number): string {
  if (probPercent >= 1) return `${probPercent.toFixed(1)}%`;
  if (probPercent >= 0.01) return `${probPercent.toFixed(2)}%`;
  // 소수점 이하 첫 유효숫자+1자리까지 표시
  let decimals = 3;
  while (probPercent < Math.pow(10, -(decimals - 1)) && decimals < 20) {
    decimals++;
  }
  return `${probPercent.toFixed(decimals)}%`;
}
