import { EnemyState, ProjectileState, PlayerState, WeaponEffectState, ElementOrbState, PLAYER_WIDTH, PLAYER_HEIGHT, ELEMENT_ORB_PICKUP_RANGE } from './types';

const CELL_SIZE = 64;

export class SpatialHash {
  private cells: Map<string, number[]> = new Map();

  clear() {
    this.cells.clear();
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  insert(index: number, x: number, y: number, w: number, h: number) {
    const minCx = Math.floor((x - w / 2) / CELL_SIZE);
    const maxCx = Math.floor((x + w / 2) / CELL_SIZE);
    const minCy = Math.floor((y - h / 2) / CELL_SIZE);
    const maxCy = Math.floor((y + h / 2) / CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const k = this.key(cx, cy);
        let arr = this.cells.get(k);
        if (!arr) { arr = []; this.cells.set(k, arr); }
        arr.push(index);
      }
    }
  }

  query(x: number, y: number, w: number, h: number): number[] {
    const result: Set<number> = new Set();
    const minCx = Math.floor((x - w / 2) / CELL_SIZE);
    const maxCx = Math.floor((x + w / 2) / CELL_SIZE);
    const minCy = Math.floor((y - h / 2) / CELL_SIZE);
    const maxCy = Math.floor((y + h / 2) / CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (arr) for (const idx of arr) result.add(idx);
      }
    }
    return Array.from(result);
  }
}

export function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

export function circleRectOverlap(
  cx: number, cy: number, cr: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const dx = Math.abs(cx - rx);
  const dy = Math.abs(cy - ry);
  if (dx > rw / 2 + cr || dy > rh / 2 + cr) return false;
  if (dx <= rw / 2 || dy <= rh / 2) return true;
  const cornerDist = (dx - rw / 2) ** 2 + (dy - rh / 2) ** 2;
  return cornerDist <= cr * cr;
}

export function checkProjectileEnemyCollisions(
  projectiles: ProjectileState[],
  enemies: EnemyState[],
  hash: SpatialHash
): Array<{ pi: number; ei: number }> {
  const hits: Array<{ pi: number; ei: number }> = [];
  for (let pi = 0; pi < projectiles.length; pi++) {
    const p = projectiles[pi];
    if (!p.active) continue;
    const candidates = hash.query(p.x, p.y, p.radius * 2, p.radius * 2);
    for (const ei of candidates) {
      const e = enemies[ei];
      if (!e.active) continue;
      if (circleRectOverlap(p.x, p.y, p.radius, e.x, e.y, e.width, e.height)) {
        hits.push({ pi, ei });
        if (p.pierce <= 0) break;
      }
    }
  }
  return hits;
}

export function checkPlayerEnemyCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  hash: SpatialHash
): number[] {
  if (player.invincibleFrames > 0) return [];
  const candidates = hash.query(player.x, player.y, PLAYER_WIDTH + 10, PLAYER_HEIGHT + 10);
  const hits: number[] = [];
  for (const ei of candidates) {
    const e = enemies[ei];
    if (!e.active) continue;
    if (rectOverlap(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT, e.x, e.y, e.width, e.height)) {
      hits.push(ei);
    }
  }
  return hits;
}

export function checkWeaponEffectEnemyCollisions(
  effects: WeaponEffectState[],
  enemies: EnemyState[],
  hash: SpatialHash
): Array<{ wi: number; ei: number }> {
  const hits: Array<{ wi: number; ei: number }> = [];
  for (let wi = 0; wi < effects.length; wi++) {
    const w = effects[wi];
    if (!w.active) continue;
    const r = w.radius;
    const candidates = hash.query(w.x, w.y, r * 2, r * 2);
    for (const ei of candidates) {
      if (w.hitEnemies.has(ei)) continue;
      const e = enemies[ei];
      if (!e.active) continue;
      const dx = w.x - e.x;
      const dy = w.y - e.y;
      if (dx * dx + dy * dy < (r + Math.max(e.width, e.height) / 2) ** 2) {
        hits.push({ wi, ei });
      }
    }
  }
  return hits;
}
