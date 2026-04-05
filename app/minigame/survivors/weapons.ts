import {
  WeaponDef, WeaponEffectState, WeaponEffectType, ElementType, PlayerState,
  EnemyState, GameState
} from './types';
import { fireProjectile } from './entities';

// ── All weapon combinations (keys = JS-sorted element names) ──
const WEAPON_DEFS: Record<string, WeaponDef> = {
  // SS tier (6) - unique renderers
  '빛,암흑,전기': { name: '심판의 뇌격', elements: '빛,암흑,전기', effectType: 'explosion', damage: 50, color: 0xFFD700, interval: 1, description: '거대 구체 + 전기 방전 전방위', uniqueId: 'judgment' },
  '불,빛,암흑': { name: '종말의 일식', elements: '불,빛,암흑', effectType: 'aura', damage: 40, color: 0xFF4500, interval: 1, description: '화면 전체 흑염 비', uniqueId: 'eclipse' },
  '물,빛,암흑': { name: '심연의 조류', elements: '물,빛,암흑', effectType: 'aura', damage: 45, color: 0x1E90FF, interval: 1, description: '차원 균열 흡인 + 충격파', uniqueId: 'abyss' },
  '물,불,빛': { name: '프리즘 증기', elements: '물,불,빛', effectType: 'beam', damage: 45, color: 0xFFFFFF, interval: 1, description: '무지개 7색 광선 방사', uniqueId: 'prism' },
  '물,불,암흑': { name: '독무의 늪', elements: '물,불,암흑', effectType: 'aura', damage: 35, color: 0x228B22, interval: 1, description: '독안개 전체 지속딜', uniqueId: 'poison' },
  '빛,전기,흙': { name: '천둥벽력', elements: '빛,전기,흙', effectType: 'lightning', damage: 50, color: 0xFFD700, interval: 1, description: '빛기둥 3개 + 전류 연결 삼각형', uniqueId: 'thunder' },

  // S tier (6) - unique renderers
  '빛,빛,빛': { name: '영겁의 광휘', elements: '빛,빛,빛', effectType: 'aura', damage: 35, color: 0xFEF08A, interval: 1, description: '빛 오오라 + 적 투사체 소멸', uniqueId: 'bigbang' },
  '암흑,암흑,암흑': { name: '특이점', elements: '암흑,암흑,암흑', effectType: 'aura', damage: 25, color: 0x7C3AED, interval: 180, description: '블랙홀 투사체 → 지속 데미지', uniqueId: 'blackhole' },
  '흙,흙,흙': { name: '대지의 심장', elements: '흙,흙,흙', effectType: 'explosion', damage: 50, color: 0xA16207, interval: 240, description: '진동 + 돌기둥 8개 원형', uniqueId: 'tectonic' },
  '불,불,불': { name: '업화연옥', elements: '불,불,불', effectType: 'aura', damage: 40, color: 0xEF4444, interval: 1, description: '불기둥 회오리 나선 확장', uniqueId: 'sun' },
  '물,물,물': { name: '대해일', elements: '물,물,물', effectType: 'wave', damage: 25, color: 0x3B82F6, interval: 180, description: '거대 파도 밀어냄', uniqueId: 'tsunami' },
  '전기,전기,전기': { name: '테슬라 필드', elements: '전기,전기,전기', effectType: 'aura', damage: 30, color: 0xA78BFA, interval: 1, description: '전자기장 자동 번개', uniqueId: 'tesla' },

  // A tier (9)
  '빛,빛,암흑': { name: '황혼의 창', elements: '빛,빛,암흑', effectType: 'projectile', damage: 30, color: 0xFEF08A, interval: 15, description: '빛 창 투척 + 암흑 잔상 폭발' },
  '빛,암흑,암흑': { name: '이클립스 오브', elements: '빛,암흑,암흑', effectType: 'aura', damage: 25, color: 0x7C3AED, interval: 20, description: '검은 구체 공전 + 빛 폭발' },
  '물,불,불': { name: '흑요석 폭격', elements: '물,불,불', effectType: 'projectile', damage: 25, color: 0x333333, interval: 20, description: '흑요석 파편 산탄' },
  '물,물,불': { name: '열수 간헐천', elements: '물,물,불', effectType: 'explosion', damage: 25, color: 0x06B6D4, interval: 90, description: '뜨거운 물기둥 랜덤 분출' },
  '전기,흙,흙': { name: '지진 방전', elements: '전기,흙,흙', effectType: 'lightning', damage: 30, color: 0xA16207, interval: 45, description: '균열 + 전류 질주' },
  '전기,전기,흙': { name: '자기 폭풍', elements: '전기,전기,흙', effectType: 'aura', damage: 25, color: 0xA78BFA, interval: 20, description: '전자기 흡인 + 돌기둥' },

  // B tier (18)
  '불,불,흙': { name: '마그마 분출', elements: '불,불,흙', effectType: 'projectile', damage: 20, color: 0xEF4444, interval: 20, description: '용암 덩어리 + 장판' },
  '불,흙,흙': { name: '화산탄', elements: '불,흙,흙', effectType: 'projectile', damage: 22, color: 0xA16207, interval: 22, description: '불타는 바위 포물선' },
  '물,물,전기': { name: '감전 해류', elements: '물,물,전기', effectType: 'lightning', damage: 25, color: 0x3B82F6, interval: 40, description: '물줄기 + 감전 전이' },
  '물,전기,전기': { name: '번개 폭우', elements: '물,전기,전기', effectType: 'explosion', damage: 22, color: 0xA78BFA, interval: 50, description: '전기 물방울 폭격' },
  '빛,빛,전기': { name: '섬광탄', elements: '빛,빛,전기', effectType: 'explosion', damage: 28, color: 0xFEF08A, interval: 60, description: '빛 폭발 + 전기 충격파 스턴' },
  '빛,전기,전기': { name: '플라즈마 아크', elements: '빛,전기,전기', effectType: 'lightning', damage: 25, color: 0xA78BFA, interval: 35, description: '적 3체 아크 연결' },
  '암흑,암흑,흙': { name: '심연의 수렁', elements: '암흑,암흑,흙', effectType: 'aura', damage: 20, color: 0x333333, interval: 15, description: '검은 수렁 흡인 + 침하' },
  '암흑,흙,흙': { name: '묘비석', elements: '암흑,흙,흙', effectType: 'explosion', damage: 22, color: 0x555555, interval: 80, description: '검은 돌기둥 소환' },
  '불,불,빛': { name: '성화', elements: '불,불,빛', effectType: 'projectile', damage: 22, color: 0xFFAA00, interval: 18, description: '금빛 불꽃 + 정화 폭발' },
  '불,빛,빛': { name: '태양의 화살', elements: '불,빛,빛', effectType: 'beam', damage: 28, color: 0xFEF08A, interval: 1, description: '태양광 집중 빔' },
  '물,물,암흑': { name: '저주의 조류', elements: '물,물,암흑', effectType: 'wave', damage: 22, color: 0x3B82F6, interval: 60, description: '검은 물결 저주' },
  '물,암흑,암흑': { name: '칠흑의 촉수', elements: '물,암흑,암흑', effectType: 'aura', damage: 20, color: 0x7C3AED, interval: 20, description: '촉수 3개 소환 속박' },

  // C tier (14)
  '불,불,전기': { name: '플레어 스파크', elements: '불,불,전기', effectType: 'projectile', damage: 18, color: 0xEF4444, interval: 18, description: '불 + 전기 스파크' },
  '불,전기,전기': { name: '아크 플레임', elements: '불,전기,전기', effectType: 'lightning', damage: 20, color: 0xA78BFA, interval: 40, description: '전기 체인 + 화상' },
  '불,불,암흑': { name: '흑염탄', elements: '불,불,암흑', effectType: 'projectile', damage: 18, color: 0x7C3AED, interval: 20, description: '검은 불 투사체' },
  '불,암흑,암흑': { name: '지옥불 오브', elements: '불,암흑,암흑', effectType: 'aura', damage: 18, color: 0x7C3AED, interval: 15, description: '암흑 구체 + 화염 오오라' },
  '물,물,흙': { name: '진흙 파도', elements: '물,물,흙', effectType: 'wave', damage: 18, color: 0x8B6914, interval: 60, description: '탁한 물결 둔화' },
  '물,흙,흙': { name: '머드 트랩', elements: '물,흙,흙', effectType: 'aura', damage: 15, color: 0x8B6914, interval: 20, description: '진흙 장판 극둔화' },
  '물,물,빛': { name: '성수 세례', elements: '물,물,빛', effectType: 'aura', damage: 15, color: 0x87CEEB, interval: 20, description: '빛나는 물 장판 회복' },
  '물,빛,빛': { name: '무지개 광선', elements: '물,빛,빛', effectType: 'beam', damage: 20, color: 0xFEF08A, interval: 1, description: '7색 부채꼴 빔' },
  '빛,흙,흙': { name: '수정 방벽', elements: '빛,흙,흙', effectType: 'aura', damage: 15, color: 0xA16207, interval: 20, description: '수정 기둥 3개 방어' },
  '빛,빛,흙': { name: '광석 산탄', elements: '빛,빛,흙', effectType: 'projectile', damage: 18, color: 0xFEF08A, interval: 18, description: '보석 파편 부채꼴' },
};

// Fallback for any combo not defined
const FALLBACK_WEAPON: WeaponDef = {
  name: '혼합 원소', elements: '', effectType: 'projectile', damage: 20, color: 0xCCCCCC, interval: 20, description: '혼합 원소탄'
};

export function getWeaponForElements(slots: (ElementType | null)[]): WeaponDef | null {
  const filled = slots.filter(Boolean) as ElementType[];
  if (filled.length < 3) return null;
  const key = [...filled].sort().join(',');
  return WEAPON_DEFS[key] || { ...FALLBACK_WEAPON, elements: key };
}

// ── Unique weapon IDs that are continuous (persistent aura, interval=1) ──
const CONTINUOUS_UNIQUE = new Set(['bigbang', 'sun', 'tesla', 'judgment', 'eclipse', 'abyss', 'prism', 'poison', 'thunder']);

/** Activate a single weapon in a specific slot */
function activateWeaponSlot(state: GameState, slotIndex: number) {
  const slot = state.player.weaponSlots[slotIndex];
  if (!slot.weapon) return;
  const w = slot.weapon;

  slot.weaponTimer++;
  if (slot.weaponTimer < w.interval) return;
  slot.weaponTimer = 0;

  // For unique continuous weapons: maintain a single persistent effect that follows the player
  if (w.uniqueId && CONTINUOUS_UNIQUE.has(w.uniqueId)) {
    activateUniqueWeapon(state, w);
    return;
  }

  // Blackhole: 투사체 발사 → 착탄 지점에 블랙홀 생성
  if (w.uniqueId === 'blackhole') {
    activateBlackhole(state, w);
    return;
  }

  // For unique periodic weapons (tsunami, tectonic)
  if (w.uniqueId === 'tsunami') {
    activateTsunami(state, w);
    return;
  }
  if (w.uniqueId === 'tectonic') {
    activateTectonic(state, w);
    return;
  }

  switch (w.effectType) {
    case 'projectile':
      weaponProjectile(state, w);
      break;
    case 'aura':
      weaponAura(state, w);
      break;
    case 'beam':
      weaponBeam(state, w, slotIndex);
      break;
    case 'explosion':
      weaponExplosion(state, w);
      break;
    case 'lightning':
      weaponLightning(state, w);
      break;
    case 'wave':
      weaponWave(state, w);
      break;
  }
}

/** Activate ALL completed weapon slots */
export function activateAllWeapons(state: GameState) {
  for (let i = 0; i < 3; i++) {
    if (state.player.weaponSlots[i].weapon) {
      activateWeaponSlot(state, i);
    }
  }
}

// Keep old name for compatibility but redirect
export function activateWeapon(state: GameState) {
  activateAllWeapons(state);
}

function findNearestEnemies(enemies: EnemyState[], px: number, py: number, count: number): number[] {
  const dists: Array<{ i: number; d: number }> = [];
  for (let i = 0; i < enemies.length; i++) {
    if (!enemies[i].active) continue;
    const dx = enemies[i].x - px;
    const dy = enemies[i].y - py;
    dists.push({ i, d: dx * dx + dy * dy });
  }
  dists.sort((a, b) => a.d - b.d);
  return dists.slice(0, count).map(d => d.i);
}

// ── Unique weapon activations ──

function activateUniqueWeapon(state: GameState, w: WeaponDef) {
  // Find existing effect with this uniqueId, refresh it.
  for (const e of state.weaponEffects) {
    if (e.active && e.uniqueId === w.uniqueId) {
      e.x = state.player.x;
      e.y = state.player.y;
      e.life = e.maxLife;
      e.hitEnemies.clear();
      return;
    }
  }
  // Spawn new persistent effect
  const radius = getUniqueRadius(w.uniqueId!);
  spawnWeaponEffect(state, {
    type: w.effectType,
    uniqueId: w.uniqueId,
    x: state.player.x,
    y: state.player.y,
    vx: 0, vy: 0,
    radius,
    damage: w.damage,
    color: w.color,
    life: 60,
    maxLife: 60,
    active: true,
    angle: 0,
    hitEnemies: new Set(),
  });
}

function getUniqueRadius(uniqueId: string): number {
  switch (uniqueId) {
    case 'blackhole': return 100;
    case 'bigbang': return 120;
    case 'sun': return 90;
    case 'tesla': return 130;
    case 'judgment': return 110;
    case 'eclipse': return 100;
    case 'abyss': return 100;
    case 'prism': return 140;
    case 'poison': return 100;
    case 'thunder': return 120;
    default: return 80;
  }
}

function activateTsunami(state: GameState, w: WeaponDef) {
  const { player, enemies } = state;
  const nearest = findNearestEnemies(enemies, player.x, player.y, 1);
  let angle = 0;
  if (nearest.length > 0) {
    const e = enemies[nearest[0]];
    angle = Math.atan2(e.y - player.y, e.x - player.x);
  }
  for (let i = -4; i <= 4; i++) {
    const a = angle + i * 0.12;
    spawnWeaponEffect(state, {
      type: 'wave',
      uniqueId: 'tsunami',
      x: player.x,
      y: player.y,
      vx: Math.cos(a) * 3.5,
      vy: Math.sin(a) * 3.5,
      radius: 30,
      damage: w.damage,
      color: w.color,
      life: 60,
      maxLife: 60,
      active: true,
      angle: a,
      hitEnemies: new Set(),
    });
  }
  state.shakeFrames = Math.max(state.shakeFrames, 6);
}

function activateTectonic(state: GameState, w: WeaponDef) {
  const { player } = state;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + (state.frameCount * 0.01);
    const dist = 80 + Math.random() * 40;
    spawnWeaponEffect(state, {
      type: 'explosion',
      uniqueId: 'tectonic',
      x: player.x + Math.cos(a) * dist,
      y: player.y + Math.sin(a) * dist,
      vx: player.x,
      vy: player.y,
      radius: 50,
      damage: w.damage,
      color: w.color,
      life: 40,
      maxLife: 40,
      active: true,
      angle: a,
      hitEnemies: new Set(),
    });
  }
  state.shakeFrames = Math.max(state.shakeFrames, 15);
}

function activateBlackhole(state: GameState, w: WeaponDef) {
  const { player, enemies } = state;
  // 가장 가까운 적 위치로 투사체 발사 → 도착하면 블랙홀 생성
  const targets = findNearestEnemies(enemies, player.x, player.y, 1);
  let targetX = player.x + 150; // 적 없으면 전방
  let targetY = player.y;
  if (targets.length > 0) {
    targetX = enemies[targets[0]].x;
    targetY = enemies[targets[0]].y;
  }

  // 블랙홀 이펙트를 착탄 위치에 직접 생성 (2.5초 = 150프레임 지속)
  spawnWeaponEffect(state, {
    type: 'aura',
    uniqueId: 'blackhole',
    x: targetX,
    y: targetY,
    vx: 0, vy: 0,
    radius: 120,
    damage: w.damage,
    color: w.color,
    life: 150,
    maxLife: 150,
    active: true,
    angle: 0,
    hitEnemies: new Set(),
  });
}

// ── Generic weapon activations ──

function weaponProjectile(state: GameState, w: WeaponDef) {
  const { player, enemies, projectiles } = state;
  const targets = findNearestEnemies(enemies, player.x, player.y, 3);
  for (const ti of targets) {
    const e = enemies[ti];
    fireProjectile(projectiles, player.x, player.y, e.x, e.y, w.damage, w.color, 6, 5, 1);
  }
}

function weaponAura(state: GameState, w: WeaponDef) {
  spawnWeaponEffect(state, {
    type: 'aura',
    x: state.player.x,
    y: state.player.y,
    vx: 0, vy: 0,
    radius: 80,
    damage: w.damage,
    color: w.color,
    life: 15,
    maxLife: 15,
    active: true,
    angle: 0,
    hitEnemies: new Set(),
  });
}

function weaponBeam(state: GameState, w: WeaponDef, slotIndex: number) {
  state.beamAngles[slotIndex] += 0.04;
  const angle = state.beamAngles[slotIndex];
  const length = 200;
  const bx = state.player.x + Math.cos(angle) * length / 2;
  const by = state.player.y + Math.sin(angle) * length / 2;
  spawnWeaponEffect(state, {
    type: 'beam',
    x: bx,
    y: by,
    vx: 0, vy: 0,
    radius: length / 2,
    damage: w.damage,
    color: w.color,
    life: 1,
    maxLife: 1,
    active: true,
    angle: angle,
    hitEnemies: new Set(),
  });
}

function weaponExplosion(state: GameState, w: WeaponDef) {
  spawnWeaponEffect(state, {
    type: 'explosion',
    x: state.player.x,
    y: state.player.y,
    vx: 0, vy: 0,
    radius: 120,
    damage: w.damage,
    color: w.color,
    life: 20,
    maxLife: 20,
    active: true,
    angle: 0,
    hitEnemies: new Set(),
  });
}

function weaponLightning(state: GameState, w: WeaponDef) {
  const { player, enemies } = state;
  const targets = findNearestEnemies(enemies, player.x, player.y, 4);
  for (let i = 0; i < targets.length; i++) {
    const e = enemies[targets[i]];
    spawnWeaponEffect(state, {
      type: 'lightning',
      x: i === 0 ? player.x : enemies[targets[i - 1]].x,
      y: i === 0 ? player.y : enemies[targets[i - 1]].y,
      vx: e.x,
      vy: e.y,
      radius: 15,
      damage: w.damage - i * 5,
      color: w.color,
      life: 10,
      maxLife: 10,
      active: true,
      angle: 0,
      hitEnemies: new Set(),
    });
  }
}

function weaponWave(state: GameState, w: WeaponDef) {
  const { player, enemies } = state;
  const nearest = findNearestEnemies(enemies, player.x, player.y, 1);
  let angle = 0;
  if (nearest.length > 0) {
    const e = enemies[nearest[0]];
    angle = Math.atan2(e.y - player.y, e.x - player.x);
  }
  for (let i = -2; i <= 2; i++) {
    const a = angle + i * 0.2;
    spawnWeaponEffect(state, {
      type: 'wave',
      x: player.x,
      y: player.y,
      vx: Math.cos(a) * 4,
      vy: Math.sin(a) * 4,
      radius: 20,
      damage: w.damage,
      color: w.color,
      life: 40,
      maxLife: 40,
      active: true,
      angle: a,
      hitEnemies: new Set(),
    });
  }
}

function spawnWeaponEffect(state: GameState, effect: WeaponEffectState) {
  for (let i = 0; i < state.weaponEffects.length; i++) {
    if (!state.weaponEffects[i].active) {
      state.weaponEffects[i] = effect;
      return;
    }
  }
  if (state.weaponEffects.length < 200) {
    state.weaponEffects.push(effect);
  }
}

export function updateWeaponEffects(state: GameState) {
  for (const e of state.weaponEffects) {
    if (!e.active) continue;

    // Continuous unique weapons: still decrement but they get refreshed each frame
    e.life--;
    if (e.life <= 0) { e.active = false; continue; }

    // Move wave effects
    if (e.type === 'wave') {
      e.x += e.vx;
      e.y += e.vy;
    }
    // Aura follows player (non-unique only; unique already tracked in activateUniqueWeapon)
    if (e.type === 'aura' && !e.uniqueId) {
      e.x = state.player.x;
      e.y = state.player.y;
    }
  }
}
