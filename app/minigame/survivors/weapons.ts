import {
  WeaponDef, WeaponEffectState, WeaponEffectType, ElementType, PlayerState,
  EnemyState, GameState
} from './types';
import { fireProjectile } from './entities';

// ── 무기 정의 (체크리스트에 따라 속성별로 추가 예정) ──
const WEAPON_DEFS: Record<string, WeaponDef> = {
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

/** Activate a single weapon in a specific slot */
function activateWeaponSlot(state: GameState, slotIndex: number) {
  const slot = state.player.weaponSlots[slotIndex];
  if (!slot.weapon) return;
  const w = slot.weapon;

  slot.weaponTimer++;
  if (slot.weaponTimer < w.interval) return;
  slot.weaponTimer = 0;

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

    e.life--;
    if (e.life <= 0) { e.active = false; continue; }

    // Move wave effects
    if (e.type === 'wave') {
      e.x += e.vx;
      e.y += e.vy;
    }
    // Aura follows player
    if (e.type === 'aura' && !e.uniqueId) {
      e.x = state.player.x;
      e.y = state.player.y;
    }
  }
}
