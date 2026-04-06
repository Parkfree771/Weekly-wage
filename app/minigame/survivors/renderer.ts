import * as PIXI from 'pixi.js';
import {
  GameState, CANVAS_W, CANVAS_H, WORLD_W, WORLD_H,
  PLAYER_WIDTH, PLAYER_HEIGHT, ELEMENT_COLORS, ElementType
} from './types';

export function createGameGraphics(stage: PIXI.Container) {
  // Layer structure
  const worldContainer = new PIXI.Container();
  const uiContainer = new PIXI.Container();
  stage.addChild(worldContainer);
  stage.addChild(uiContainer);

  // Sub-layers inside world
  const groundLayer = new PIXI.Container();
  const entityLayer = new PIXI.Container();
  const effectLayer = new PIXI.Container();
  const particleLayer = new PIXI.Container();
  worldContainer.addChild(groundLayer);
  worldContainer.addChild(entityLayer);
  worldContainer.addChild(effectLayer);
  worldContainer.addChild(particleLayer);

  return { worldContainer, uiContainer, groundLayer, entityLayer, effectLayer, particleLayer };
}

export function drawGround(g: PIXI.Graphics, isDark: boolean) {
  g.clear();
  const bgColor = isDark ? 0x2A2318 : 0xF5EDE0;
  const gridColor = isDark ? 0x3E3528 : 0xD4C4AD;
  g.beginFill(bgColor);
  g.drawRect(0, 0, WORLD_W, WORLD_H);
  g.endFill();

  // Grid lines
  g.lineStyle(1, gridColor, 0.5);
  const step = 100;
  for (let x = 0; x <= WORLD_W; x += step) {
    g.moveTo(x, 0);
    g.lineTo(x, WORLD_H);
  }
  for (let y = 0; y <= WORLD_H; y += step) {
    g.moveTo(0, y);
    g.lineTo(WORLD_W, y);
  }

  // World border
  g.lineStyle(3, 0xFF6666, 0.8);
  g.drawRect(0, 0, WORLD_W, WORLD_H);
}

export function drawPlayer(g: PIXI.Graphics, state: GameState) {
  const { player } = state;
  g.clear();

  // Invincibility flash
  if (player.invincibleFrames > 0 && Math.floor(player.invincibleFrames / 4) % 2 === 0) {
    g.alpha = 0.4;
  } else {
    g.alpha = 1;
  }

  // Car body
  g.beginFill(0x4A90D9);
  g.drawRoundedRect(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 3);
  g.endFill();

  // Direction indicator (front)
  g.beginFill(0xFFFFFF);
  g.drawRect(PLAYER_WIDTH / 2 - 4, -3, 4, 6);
  g.endFill();

  g.x = player.x;
  g.y = player.y;
}

export function drawEnemies(container: PIXI.Container, state: GameState, enemyGraphics: PIXI.Graphics[]) {
  const { enemies } = state;
  while (enemyGraphics.length < enemies.length) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    enemyGraphics.push(g);
  }

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const g = enemyGraphics[i];
    if (!e.active) {
      g.visible = false;
      continue;
    }
    g.visible = true;
    g.clear();
    g.beginFill(e.color);
    g.drawRoundedRect(-e.width / 2, -e.height / 2, e.width, e.height, 2);
    g.endFill();

    // HP bar for non-full HP enemies
    if (e.hp < e.maxHp) {
      const barW = e.width;
      const barH = 3;
      const barY = -e.height / 2 - 5;
      g.beginFill(0x333333);
      g.drawRect(-barW / 2, barY, barW, barH);
      g.endFill();
      g.beginFill(0xFF4444);
      g.drawRect(-barW / 2, barY, barW * (e.hp / e.maxHp), barH);
      g.endFill();
    }

    g.x = e.x;
    g.y = e.y;
    g.rotation = e.angle;
  }
}

export function drawProjectiles(container: PIXI.Container, state: GameState, projGraphics: PIXI.Graphics[]) {
  const { projectiles } = state;
  while (projGraphics.length < projectiles.length) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    projGraphics.push(g);
  }

  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    const g = projGraphics[i];
    if (!p.active) { g.visible = false; continue; }
    g.visible = true;
    g.clear();

    if (p.elementType === '전기') {
      // ── 전기 투사체: 코어 + 지지직 번개 ──
      const r = p.radius;
      // 외곽 전기 글로우
      g.beginFill(0x818cf8, 0.15);
      g.drawCircle(0, 0, r + 6);
      g.endFill();
      // 코어
      g.beginFill(0xa78bfa, 0.8);
      g.drawCircle(0, 0, r);
      g.endFill();
      g.beginFill(0xe0e7ff, 0.9);
      g.drawCircle(0, 0, r * 0.5);
      g.endFill();

      // 지지직 전기 아크 3~4개 (투사체에서 주변으로 짧은 번개)
      const arcCount = 3 + (state.frameCount % 2);
      for (let a = 0; a < arcCount; a++) {
        const angle = Math.random() * Math.PI * 2;
        const len = r + 4 + Math.random() * 10;
        const ex = Math.cos(angle) * len;
        const ey = Math.sin(angle) * len;
        const segs = 3;
        // 글로우 패스
        g.lineStyle(2.5, 0x818cf8, 0.3);
        g.moveTo(0, 0);
        for (let s = 1; s <= segs; s++) {
          const t = s / segs;
          const jx = (Math.random() - 0.5) * 6;
          const jy = (Math.random() - 0.5) * 6;
          if (s === segs) g.lineTo(ex, ey);
          else g.lineTo(ex * t + jx, ey * t + jy);
        }
        // 코어 패스
        g.lineStyle(1, 0xe0e7ff, 0.7);
        g.moveTo(0, 0);
        for (let s = 1; s <= segs; s++) {
          const t = s / segs;
          const jx = (Math.random() - 0.5) * 5;
          const jy = (Math.random() - 0.5) * 5;
          if (s === segs) g.lineTo(ex, ey);
          else g.lineTo(ex * t + jx, ey * t + jy);
        }
        g.lineStyle(0);
      }

      // 꼬리 잔상 (이동 반대 방향)
      const tailLen = 12;
      const tailAngle = Math.atan2(-p.vy, -p.vx);
      g.lineStyle(2, 0xa78bfa, 0.25);
      g.moveTo(0, 0);
      g.lineTo(Math.cos(tailAngle) * tailLen, Math.sin(tailAngle) * tailLen);
      g.lineStyle(0);

    } else if (p.elementType === '불') {
      // ── 불 투사체: 화염구 + 불꼬리 ──
      const r = p.radius;
      // 외곽 열기 글로우
      g.beginFill(0xf97316, 0.12);
      g.drawCircle(0, 0, r + 5);
      g.endFill();
      // 화염 외곽
      g.beginFill(0xdc2626, 0.7);
      g.drawCircle(0, 0, r);
      g.endFill();
      // 내부 오렌지
      g.beginFill(0xf97316, 0.8);
      g.drawCircle(0, 0, r * 0.65);
      g.endFill();
      // 코어 (밝은 노랑)
      g.beginFill(0xfbbf24, 0.9);
      g.drawCircle(0, 0, r * 0.3);
      g.endFill();

      // 불꼬리 — 이동 반대 방향으로 화염 파티클들
      const tailAngle = Math.atan2(-p.vy, -p.vx);
      const tailCount = 5;
      for (let t = 0; t < tailCount; t++) {
        const td = 4 + t * 4;
        const spread = (Math.sin(state.frameCount * 0.3 + t * 1.5) - 0.5) * 4;
        const tx = Math.cos(tailAngle) * td + Math.sin(tailAngle) * spread;
        const ty = Math.sin(tailAngle) * td - Math.cos(tailAngle) * spread;
        const tSize = r * (1 - t / tailCount) * 0.7;
        const tColor = t < 2 ? 0xf97316 : 0xef4444;
        g.beginFill(tColor, 0.5 * (1 - t / tailCount));
        g.drawCircle(tx, ty, tSize);
        g.endFill();
      }

    } else {
      // ── 기본 투사체 ──
      g.beginFill(p.color, 0.9);
      g.drawCircle(0, 0, p.radius);
      g.endFill();
      g.beginFill(0xFFFFFF, 0.4);
      g.drawCircle(0, 0, p.radius * 0.5);
      g.endFill();
      // 글로우
      g.beginFill(p.color, 0.15);
      g.drawCircle(0, 0, p.radius + 3);
      g.endFill();
    }

    g.x = p.x;
    g.y = p.y;
  }
}

export function drawXPOrbs(container: PIXI.Container, state: GameState, orbGraphics: PIXI.Graphics[]) {
  const { xpOrbs } = state;
  while (orbGraphics.length < xpOrbs.length) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    orbGraphics.push(g);
  }

  for (let i = 0; i < xpOrbs.length; i++) {
    const o = xpOrbs[i];
    const g = orbGraphics[i];
    if (!o.active) { g.visible = false; continue; }
    g.visible = true;
    g.clear();
    // Glow
    g.beginFill(0x7ED957, 0.3);
    g.drawCircle(0, 0, 7);
    g.endFill();
    g.beginFill(0x7ED957);
    g.drawCircle(0, 0, 4);
    g.endFill();
    g.x = o.x;
    g.y = o.y;
  }
}

export function drawElementOrbs(container: PIXI.Container, state: GameState, elementOrbGraphics: PIXI.Graphics[]) {
  const { elementOrbs } = state;
  while (elementOrbGraphics.length < elementOrbs.length) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    elementOrbGraphics.push(g);
  }

  for (let i = 0; i < elementOrbs.length; i++) {
    const o = elementOrbs[i];
    const g = elementOrbGraphics[i];
    if (!o.active) { g.visible = false; continue; }
    g.visible = true;
    g.clear();

    const colorHex = ELEMENT_COLORS[o.element];
    const color = parseInt(colorHex.replace('#', ''), 16);

    // Fade when close to expiring (last 3 seconds)
    const fadeThreshold = 3 * 60;
    let alpha = 1;
    if (o.life < fadeThreshold) {
      const blinkRate = Math.max(4, Math.floor(o.life / 10));
      alpha = (Math.floor(o.life / blinkRate) % 2 === 0) ? 0.3 : 0.8;
    }

    // Pulsing size
    const pulse = 1 + Math.sin(state.frameCount * 0.08 + i) * 0.15;
    const baseRadius = 10;
    const radius = baseRadius * pulse;

    // Outer glow
    g.beginFill(color, 0.2 * alpha);
    g.drawCircle(0, 0, radius + 6);
    g.endFill();

    // Main circle
    g.beginFill(color, 0.7 * alpha);
    g.drawCircle(0, 0, radius);
    g.endFill();

    // Inner bright core
    g.beginFill(0xFFFFFF, 0.5 * alpha);
    g.drawCircle(0, 0, radius * 0.4);
    g.endFill();

    // Border
    g.lineStyle(1.5, color, 0.9 * alpha);
    g.drawCircle(0, 0, radius);

    g.x = o.x;
    g.y = o.y;
  }
}

export function drawParticles(container: PIXI.Container, state: GameState, particleGraphics: PIXI.Graphics[]) {
  const { particles } = state;
  while (particleGraphics.length < particles.length) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    particleGraphics.push(g);
  }

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const g = particleGraphics[i];
    if (!p.active) { g.visible = false; continue; }
    g.visible = true;
    g.clear();
    const alpha = p.life / p.maxLife;
    g.beginFill(p.color, alpha);
    g.drawCircle(0, 0, p.size * alpha);
    g.endFill();
    g.x = p.x;
    g.y = p.y;
  }
}

/** Draw a jagged lightning bolt between two local-space points */
function drawJaggedBolt(
  g: PIXI.Graphics,
  x0: number, y0: number, x1: number, y1: number,
  segments: number, jitter: number,
  colorOuter: number, alphaOuter: number, widthOuter: number,
  colorInner: number, alphaInner: number, widthInner: number,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const points: { x: number; y: number }[] = [{ x: x0, y: y0 }];
  for (let s = 1; s < segments; s++) {
    const t = s / segments;
    points.push({
      x: x0 + dx * t + (Math.random() - 0.5) * jitter,
      y: y0 + dy * t + (Math.random() - 0.5) * jitter,
    });
  }
  points.push({ x: x1, y: y1 });

  // Outer glow pass
  g.lineStyle(widthOuter, colorOuter, alphaOuter);
  g.moveTo(points[0].x, points[0].y);
  for (let p = 1; p < points.length; p++) g.lineTo(points[p].x, points[p].y);

  // Inner core pass
  g.lineStyle(widthInner, colorInner, alphaInner);
  g.moveTo(points[0].x, points[0].y);
  for (let p = 1; p < points.length; p++) g.lineTo(points[p].x, points[p].y);

  return points;
}

/** Glow layer Graphics -- drawn with PixiJS ADD blend mode for light effects */
let _glowGraphics: PIXI.Graphics | null = null;
function getGlowGraphics(container: PIXI.Container): PIXI.Graphics {
  if (!_glowGraphics || _glowGraphics.destroyed) {
    _glowGraphics = new PIXI.Graphics();
    _glowGraphics.blendMode = PIXI.BLEND_MODES.ADD;
    container.addChild(_glowGraphics);
  }
  return _glowGraphics;
}

// ── Main draw function ──

export function drawWeaponEffects(container: PIXI.Container, state: GameState, effectGraphics: PIXI.Graphics[]) {
  const { weaponEffects } = state;
  while (effectGraphics.length < weaponEffects.length) {
    const g = new PIXI.Graphics();
    container.addChild(g);
    effectGraphics.push(g);
  }

  // Glow layer (ADD blend)
  const glow = getGlowGraphics(container);
  glow.clear();

  for (let i = 0; i < weaponEffects.length; i++) {
    const e = weaponEffects[i];
    const g = effectGraphics[i];
    if (!e.active) { g.visible = false; continue; }
    g.visible = true;
    g.clear();
    const alpha = e.life / e.maxLife;
    const t = 1 - alpha; // progress 0->1

    // ── 커스텀 이펙트는 EffectManager가 처리 → generic 렌더링 스킵 ──
    if (e.uniqueId === 'auto_water') {
      g.visible = false;
      continue;
    }

    // ── Generic effect rendering ──
    switch (e.type) {
      // --- AURA ---
      case 'aura': {
        // Breathing radius
        const breathe = 1 + Math.sin(state.frameCount * 0.1) * 0.08;
        const r = e.radius * breathe;

        // Dark center (space distortion feel)
        g.beginFill(0x000000, 0.35 * alpha);
        g.drawCircle(0, 0, r * 0.5);
        g.endFill();

        // Inner fill
        g.beginFill(e.color, 0.12 * alpha);
        g.drawCircle(0, 0, r);
        g.endFill();

        // Outer ring
        g.lineStyle(2.5, e.color, 0.6 * alpha);
        g.drawCircle(0, 0, r);

        // Edge glow (ADD blend)
        glow.beginFill(e.color, 0.18 * alpha);
        glow.drawCircle(e.x, e.y, r + 6);
        glow.endFill();

        // Orbiting particles (8 particles)
        const particleCount = 8;
        for (let p = 0; p < particleCount; p++) {
          const a = (state.frameCount * 0.03) + (p / particleCount) * Math.PI * 2;
          const pr = r * (0.75 + Math.sin(state.frameCount * 0.05 + p) * 0.2);
          const px = Math.cos(a) * pr;
          const py = Math.sin(a) * pr;
          const pSize = 2 + Math.sin(state.frameCount * 0.08 + p * 1.3) * 1;
          g.beginFill(e.color, 0.7 * alpha);
          g.drawCircle(px, py, pSize);
          g.endFill();
        }

        // Inner bright core glow (ADD)
        glow.beginFill(e.color, 0.25 * alpha);
        glow.drawCircle(e.x, e.y, r * 0.35);
        glow.endFill();
        break;
      }

      // --- EXPLOSION ---
      case 'explosion': {
        const progress = t;
        const expandR = e.radius * Math.min(progress * 2, 1);

        // Initial bright white flash (first 30% of life)
        if (progress < 0.3) {
          const flashAlpha = (0.3 - progress) / 0.3;
          glow.beginFill(0xFFFFFF, 0.6 * flashAlpha);
          glow.drawCircle(e.x, e.y, expandR * 0.4);
          glow.endFill();
        }

        // Main fill
        g.beginFill(e.color, 0.25 * alpha);
        g.drawCircle(0, 0, expandR);
        g.endFill();

        // Shockwave ring 1
        const ring1R = e.radius * Math.min(progress * 1.5, 1);
        const ring1Alpha = Math.max(0, 1 - progress * 1.5);
        g.lineStyle(3, e.color, 0.8 * ring1Alpha);
        g.drawCircle(0, 0, ring1R);

        // Shockwave ring 2 (delayed)
        if (progress > 0.2) {
          const p2 = (progress - 0.2) / 0.8;
          const ring2R = e.radius * Math.min(p2 * 1.3, 1) * 0.85;
          const ring2Alpha = Math.max(0, 1 - p2 * 1.5);
          g.lineStyle(2, 0xFFFFFF, 0.5 * ring2Alpha);
          g.drawCircle(0, 0, ring2R);
        }

        // Debris particles scattered outward
        const debrisCount = 10;
        const seed = Math.floor(e.x * 7 + e.y * 13);
        for (let d = 0; d < debrisCount; d++) {
          const da = ((seed + d * 137) % 360) * Math.PI / 180;
          const dd = expandR * (0.5 + ((seed + d * 53) % 100) / 200);
          const dAlpha = Math.max(0, alpha - 0.2);
          const dSize = 1.5 + (d % 3);
          const dx = Math.cos(da) * dd;
          const dy = Math.sin(da) * dd;
          g.beginFill(e.color, 0.7 * dAlpha);
          if (d % 2 === 0) {
            g.drawRect(dx - dSize / 2, dy - dSize / 2, dSize, dSize);
          } else {
            g.drawCircle(dx, dy, dSize * 0.6);
          }
          g.endFill();
        }
        break;
      }

      // --- BEAM ---
      case 'beam': {
        const beamLen = e.radius;
        const pulse = 1 + Math.sin(state.frameCount * 0.15) * 0.15;

        // Outer glow (wide, transparent)
        g.lineStyle(14 * pulse, e.color, 0.15);
        g.moveTo(-beamLen, 0);
        g.lineTo(beamLen, 0);

        // Mid layer (medium, colored)
        g.lineStyle(6 * pulse, e.color, 0.5);
        g.moveTo(-beamLen, 0);
        g.lineTo(beamLen, 0);

        // Inner core (thin, white)
        g.lineStyle(2 * pulse, 0xFFFFFF, 0.8);
        g.moveTo(-beamLen, 0);
        g.lineTo(beamLen, 0);

        g.rotation = e.angle;

        // Origin orb at player position (drawn in glow layer, world coords)
        const originX = e.x - Math.cos(e.angle) * beamLen;
        const originY = e.y - Math.sin(e.angle) * beamLen;
        glow.beginFill(0xFFFFFF, 0.5);
        glow.drawCircle(originX, originY, 6);
        glow.endFill();
        glow.beginFill(e.color, 0.3);
        glow.drawCircle(originX, originY, 10);
        glow.endFill();

        // Particles along beam
        const pCount = 6;
        for (let p = 0; p < pCount; p++) {
          const pt = (p + (state.frameCount * 0.05) % 1) / pCount;
          const px = -beamLen + beamLen * 2 * pt;
          const py = (Math.random() - 0.5) * 6;
          g.beginFill(0xFFFFFF, 0.4 + Math.random() * 0.3);
          g.drawCircle(px, py, 1 + Math.random());
          g.endFill();
        }
        break;
      }

      // --- LIGHTNING ---
      case 'lightning': {
        const ldx = e.vx - e.x;
        const ldy = e.vy - e.y;

        // Main bolt
        const mainPts = drawJaggedBolt(
          g, 0, 0, ldx, ldy,
          7, 20,
          e.color, 0.4 * alpha, 6,
          0xFFFFFF, 0.9 * alpha, 2,
        );

        // Branch bolts (30% chance per segment)
        for (let s = 1; s < mainPts.length - 1; s++) {
          if (Math.random() < 0.3) {
            const branchLen = 15 + Math.random() * 20;
            const branchAngle = Math.atan2(ldy, ldx) + (Math.random() - 0.5) * 1.5;
            const bx2 = mainPts[s].x + Math.cos(branchAngle) * branchLen;
            const by2 = mainPts[s].y + Math.sin(branchAngle) * branchLen;
            drawJaggedBolt(
              g, mainPts[s].x, mainPts[s].y, bx2, by2,
              3, 10,
              e.color, 0.25 * alpha, 3,
              0xFFFFFF, 0.6 * alpha, 1,
            );
          }
        }

        // Flash at start and end points (ADD glow)
        const flashA = Math.min(alpha * 2, 1);
        glow.beginFill(0xFFFFFF, 0.5 * flashA);
        glow.drawCircle(e.x, e.y, 6);
        glow.endFill();
        glow.beginFill(e.color, 0.4 * flashA);
        glow.drawCircle(e.vx, e.vy, 8);
        glow.endFill();
        break;
      }

      // --- WAVE ---
      case 'wave': {
        const waveAngle = e.angle;
        const perpX = -Math.sin(waveAngle);
        const perpY = Math.cos(waveAngle);
        const waveWidth = e.radius * 2.5;

        // Multiple particles forming a "wall"
        const wallCount = 8;
        for (let w = 0; w < wallCount; w++) {
          const wt = (w / (wallCount - 1)) - 0.5;
          const sineOffset = Math.sin(wt * Math.PI * 2 + state.frameCount * 0.15) * 4;
          const px = perpX * wt * waveWidth + Math.cos(waveAngle) * sineOffset;
          const py = perpY * wt * waveWidth + Math.sin(waveAngle) * sineOffset;
          const pSize = 3 + Math.sin(state.frameCount * 0.1 + w) * 1;
          g.beginFill(e.color, 0.6 * alpha);
          g.drawCircle(px, py, pSize);
          g.endFill();
        }

        // Foam/splash at wave front
        const foamCount = 5;
        for (let f = 0; f < foamCount; f++) {
          const ft = ((f + 0.5) / foamCount - 0.5);
          const fx = perpX * ft * waveWidth + (Math.random() - 0.5) * 6;
          const fy = perpY * ft * waveWidth + (Math.random() - 0.5) * 6;
          g.beginFill(0xFFFFFF, 0.4 * alpha);
          g.drawCircle(fx + Math.cos(waveAngle) * 3, fy + Math.sin(waveAngle) * 3, 1.5);
          g.endFill();
        }

        // Trailing droplets behind
        const trailCount = 4;
        for (let tr = 0; tr < trailCount; tr++) {
          const trOffset = -(tr + 1) * 6;
          const trx = Math.cos(waveAngle) * trOffset + (Math.random() - 0.5) * 8;
          const tr_y = Math.sin(waveAngle) * trOffset + (Math.random() - 0.5) * 8;
          g.beginFill(e.color, 0.25 * alpha);
          g.drawCircle(trx, tr_y, 1.5);
          g.endFill();
        }

        // Glow on wave front
        glow.beginFill(e.color, 0.12 * alpha);
        glow.drawCircle(e.x, e.y, e.radius * 1.5);
        glow.endFill();
        break;
      }

      // --- DEFAULT / PROJECTILE ---
      default: {
        g.beginFill(e.color, 0.5 * alpha);
        g.drawCircle(0, 0, e.radius);
        g.endFill();
        glow.beginFill(e.color, 0.2 * alpha);
        glow.drawCircle(e.x, e.y, e.radius + 3);
        glow.endFill();
      }
    }

    if (e.type !== 'beam') {
      g.rotation = 0;
    }
    g.x = e.x;
    g.y = e.y;
  }
}

export function updateCamera(state: GameState) {
  state.cameraX = state.player.x - CANVAS_W / 2;
  state.cameraY = state.player.y - CANVAS_H / 2;

  // Clamp
  state.cameraX = Math.max(0, Math.min(WORLD_W - CANVAS_W, state.cameraX));
  state.cameraY = Math.max(0, Math.min(WORLD_H - CANVAS_H, state.cameraY));

  // Screen shake
  if (state.shakeFrames > 0) {
    state.shakeX = (Math.random() - 0.5) * state.shakeFrames * 1.5;
    state.shakeY = (Math.random() - 0.5) * state.shakeFrames * 1.5;
    state.shakeFrames--;
  } else {
    state.shakeX = 0;
    state.shakeY = 0;
  }
}

export function applyCamera(worldContainer: PIXI.Container, state: GameState) {
  worldContainer.x = -state.cameraX + state.shakeX;
  worldContainer.y = -state.cameraY + state.shakeY;
}
