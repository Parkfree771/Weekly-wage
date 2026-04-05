import { ParticleState } from './types';

const MAX_PARTICLES = 500;

export function createParticlePool(): ParticleState[] {
  const pool: ParticleState[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: 0, size: 3, active: false });
  }
  return pool;
}

function getInactive(pool: ParticleState[]): ParticleState | null {
  for (const p of pool) {
    if (!p.active) return p;
  }
  return null;
}

export function spawnExplosionParticles(pool: ParticleState[], x: number, y: number, color: number, count: number = 10) {
  for (let i = 0; i < count; i++) {
    const p = getInactive(pool);
    if (!p) return;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 3;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 20 + Math.random() * 15;
    p.maxLife = p.life;
    p.color = color;
    p.size = 2 + Math.random() * 3;
    p.active = true;
  }
}

export function spawnHitParticles(pool: ParticleState[], x: number, y: number, color: number) {
  for (let i = 0; i < 4; i++) {
    const p = getInactive(pool);
    if (!p) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 10 + Math.random() * 8;
    p.maxLife = p.life;
    p.color = color;
    p.size = 2 + Math.random() * 2;
    p.active = true;
  }
}

export function spawnLevelUpParticles(pool: ParticleState[], x: number, y: number) {
  for (let i = 0; i < 20; i++) {
    const p = getInactive(pool);
    if (!p) return;
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 2 + Math.random() * 2;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 30 + Math.random() * 20;
    p.maxLife = p.life;
    p.color = 0x7ED957;
    p.size = 3 + Math.random() * 3;
    p.active = true;
  }
}

export function updateParticles(pool: ParticleState[]) {
  for (const p of pool) {
    if (!p.active) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    if (p.life <= 0) p.active = false;
  }
}
