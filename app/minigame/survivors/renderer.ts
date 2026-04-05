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

// ── Unique weapon renderers ──

function drawBlackhole(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const lifeRatio = _e.life / _e.maxLife;
  const outerR = _e.radius;

  // ── 생애 단계 ──
  // 생성(0~0.15): 블랙홀이 열리며 커짐
  // 유지(0.15~0.85): 풀 파워
  // 소멸(0.85~1.0): 수축하며 사라짐
  const progress = 1 - lifeRatio; // 0→1
  const formT = Math.min(1, progress / 0.15); // 생성 단계 0→1
  const fadeT = progress > 0.85 ? (progress - 0.85) / 0.15 : 0; // 소멸 0→1
  const activeAlpha = formT * (1 - fadeT);
  const scale = formT * (1 - fadeT * 0.7); // 소멸 시 수축

  const coreR = 18 * scale;
  const eventHorizonR = coreR + 4;

  // ═══ 1. 공간 왜곡 — 동심원 디스토션 느낌 ═══
  const distortionRings = 5;
  for (let r = 0; r < distortionRings; r++) {
    const ringR = eventHorizonR + 8 + r * 12 * scale;
    const wobble = Math.sin(frame * 0.08 + r * 1.2) * 2;
    const ringAlpha = (1 - r / distortionRings) * 0.08 * activeAlpha;
    g.lineStyle(1, 0x6d28d9, ringAlpha);
    g.drawEllipse(wobble * 0.5, wobble * 0.3, ringR, ringR * (0.85 + Math.sin(frame * 0.04 + r) * 0.1));
    g.lineStyle(0);
  }

  // ═══ 2. 외곽 글로우 (ADD 블렌드) — 부드러운 보라빛 후광 ═══
  glow.beginFill(0x4c1d95, 0.06 * activeAlpha);
  glow.drawCircle(_e.x, _e.y, outerR * 0.9 * scale);
  glow.endFill();
  glow.beginFill(0x6d28d9, 0.1 * activeAlpha);
  glow.drawCircle(_e.x, _e.y, eventHorizonR * 3 * scale);
  glow.endFill();
  glow.beginFill(0x8b5cf6, 0.15 * activeAlpha);
  glow.drawCircle(_e.x, _e.y, eventHorizonR * 1.8 * scale);
  glow.endFill();

  // ═══ 3. 강착원반 (Accretion Disk) — 기울어진 타원, 그라데이션 ═══
  const diskTilt = frame * 0.025;
  const diskRx = (coreR + 30) * scale;
  const diskRy = diskRx * 0.3;

  // 외곽 디스크 글로우
  g.lineStyle(4, 0x7c3aed, 0.12 * activeAlpha);
  const diskSteps = 48;
  for (let i = 0; i <= diskSteps; i++) {
    const a = (i / diskSteps) * Math.PI * 2;
    const px = Math.cos(a) * (diskRx + 6);
    const py = Math.sin(a) * (diskRy + 2);
    const rx = px * Math.cos(diskTilt) - py * Math.sin(diskTilt);
    const ry = px * Math.sin(diskTilt) + py * Math.cos(diskTilt);
    if (i === 0) g.moveTo(rx, ry);
    else g.lineTo(rx, ry);
  }
  g.lineStyle(0);

  // 메인 디스크 — 수십 개의 작은 점들로 구성 (입자감)
  const diskParticleCount = 60;
  for (let i = 0; i < diskParticleCount; i++) {
    const a = (i / diskParticleCount) * Math.PI * 2 + frame * 0.06;
    const radiusVar = 1 + Math.sin(frame * 0.1 + i * 0.7) * 0.15;
    const px = Math.cos(a) * diskRx * radiusVar;
    const py = Math.sin(a) * diskRy * radiusVar;
    const rx = px * Math.cos(diskTilt) - py * Math.sin(diskTilt);
    const ry = px * Math.sin(diskTilt) + py * Math.cos(diskTilt);

    // 디스크 색상 — 접근하는 쪽은 밝은 라벤더, 멀어지는 쪽은 어두운 보라
    const brightness = (Math.sin(a + frame * 0.06) + 1) / 2;
    const dotColor = brightness > 0.5 ? 0xc084fc : 0x8b5cf6;
    const dotAlpha = (0.4 + brightness * 0.4) * activeAlpha;
    const dotSize = 1.2 + brightness * 1.5;

    g.beginFill(dotColor, dotAlpha);
    g.drawCircle(rx, ry, dotSize);
    g.endFill();

    // 밝은 점에 글로우
    if (brightness > 0.7) {
      glow.beginFill(0xc084fc, 0.15 * activeAlpha);
      glow.drawCircle(_e.x + rx, _e.y + ry, dotSize * 2);
      glow.endFill();
    }
  }

  // ═══ 4. 이벤트 호라이즌 링 — M87 블랙홀 사진처럼 밝은 테두리 ═══
  // 바깥 글로우 링
  g.lineStyle(3 * scale, 0xa855f7, 0.3 * activeAlpha);
  g.drawCircle(0, 0, eventHorizonR + 2);
  // 밝은 코어 링
  g.lineStyle(1.5 * scale, 0xe9d5ff, 0.6 * activeAlpha);
  g.drawCircle(0, 0, eventHorizonR);
  // 안쪽 얇은 백색 링
  g.lineStyle(0.8 * scale, 0xffffff, 0.3 * activeAlpha);
  g.drawCircle(0, 0, eventHorizonR - 1);
  g.lineStyle(0);

  // ═══ 5. 다크 코어 — 완전한 어둠 ═══
  // 외곽 그라데이션 (보라→검정)
  g.beginFill(0x1e1b4b, 0.7 * activeAlpha);
  g.drawCircle(0, 0, coreR + 3);
  g.endFill();
  // 코어 (거의 순흑, 약간의 보라 틴트)
  g.beginFill(0x05000a, 0.95 * activeAlpha);
  g.drawCircle(0, 0, coreR);
  g.endFill();

  // ═══ 6. 소용돌이 파티클 — 바깥에서 안으로 빨려 들어감 ═══
  const spiralCount = 24;
  for (let i = 0; i < spiralCount; i++) {
    // 각 파티클은 나선 궤도를 따라 안으로 이동
    const baseA = (i / spiralCount) * Math.PI * 2;
    const spiralSpeed = 0.05 + (i % 3) * 0.01;
    const spiralPhase = frame * spiralSpeed + i * 1.3;

    // 거리: sin 함수로 바깥→안→바깥 반복하되, 안쪽에서 더 빠르게
    const rawDist = ((spiralPhase * 0.3) % 1); // 0→1 반복
    const dist = (1 - rawDist) * (outerR * 0.85 * scale); // 바깥에서 안으로
    if (dist < coreR) continue; // 코어 안쪽이면 그리지 않음

    // 각도: 안쪽으로 갈수록 빠르게 회전 (중력 가속)
    const angularSpeed = 0.03 + (1 - dist / outerR) * 0.08;
    const angle = baseA + frame * angularSpeed + (1 - dist / outerR) * 3;

    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;

    // 크기: 바깥은 크고 안쪽은 작게 (빨려들며 압축)
    const sizeT = dist / (outerR * 0.85);
    const pSize = (1 + sizeT * 2.5) * scale;

    // 색상: 바깥은 밝은 라벤더, 안쪽은 진한 보라
    const pColor = sizeT > 0.6 ? 0xc084fc : sizeT > 0.3 ? 0xa855f7 : 0x7c3aed;
    const pAlpha = (0.3 + sizeT * 0.5) * activeAlpha;

    // 파티클 본체
    g.beginFill(pColor, pAlpha);
    g.drawCircle(px, py, pSize);
    g.endFill();

    // 꼬리 (이동 방향 반대로 짧은 선)
    if (pSize > 1.5) {
      const tailLen = pSize * 2.5;
      const tailAngle = angle + Math.PI * 0.5; // 접선 방향
      g.lineStyle(pSize * 0.4, pColor, pAlpha * 0.4);
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(tailAngle) * tailLen, py + Math.sin(tailAngle) * tailLen);
      g.lineStyle(0);
    }

    // 밝은 파티클에 글로우
    if (sizeT > 0.5 && i % 3 === 0) {
      glow.beginFill(0xa855f7, 0.08 * activeAlpha);
      glow.drawCircle(_e.x + px, _e.y + py, pSize * 3);
      glow.endFill();
    }
  }

  // ═══ 7. 중심 흡수 플래시 — 파티클이 중심에 도달할 때 번쩍 ═══
  const flashCycle = frame % 20;
  if (flashCycle < 4 && activeAlpha > 0.3) {
    const flashR = coreR + 6 - flashCycle * 1.5;
    const flashA = (4 - flashCycle) / 4 * 0.25 * activeAlpha;
    glow.beginFill(0xe9d5ff, flashA);
    glow.drawCircle(_e.x, _e.y, flashR);
    glow.endFill();
  }

  // ═══ 8. 소멸 단계 — 수축하며 마지막 폭발 ═══
  if (fadeT > 0) {
    // 수축 충격파
    const collapseR = outerR * (1 - fadeT) * scale;
    g.lineStyle(2, 0xe9d5ff, fadeT * 0.5);
    g.drawCircle(0, 0, collapseR);
    g.lineStyle(0);

    // 마지막 순간 밝은 플래시
    if (fadeT > 0.8) {
      const finalFlash = (fadeT - 0.8) / 0.2;
      glow.beginFill(0xc084fc, finalFlash * 0.3);
      glow.drawCircle(_e.x, _e.y, 30 * (1 - finalFlash));
      glow.endFill();
    }
  }
}

function drawBigBang(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;
  const pulse = 1 + Math.sin(frame * 0.08) * 0.12;
  const auraR = 60 * pulse;

  // Golden aura
  g.beginFill(0xfbbf24, 0.1 * alpha);
  g.drawCircle(0, 0, auraR);
  g.endFill();
  g.beginFill(0xfef3c7, 0.06 * alpha);
  g.drawCircle(0, 0, auraR * 1.3);
  g.endFill();

  // Light rays (8 rotating)
  const rayCount = 8;
  const rayLen = _e.radius * 0.8;
  const rayRotation = frame * 0.015;
  for (let r = 0; r < rayCount; r++) {
    const a = (r / rayCount) * Math.PI * 2 + rayRotation;
    const rayWidth = 2 + Math.sin(frame * 0.1 + r * 0.7) * 1;
    // Outer glow ray
    g.lineStyle(rayWidth + 4, 0xfde68a, 0.08 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
    // Inner ray
    g.lineStyle(rayWidth, 0xf59e0b, 0.4 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
    // Core ray
    g.lineStyle(1, 0xffffff, 0.6 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * rayLen * 0.7, Math.sin(a) * rayLen * 0.7);
  }
  g.lineStyle(0);

  // Golden particles streaming outward
  const pCount = 12;
  for (let p = 0; p < pCount; p++) {
    const a = (p / pCount) * Math.PI * 2 + frame * 0.03;
    const dist = 20 + ((frame * 1.5 + p * 30) % (rayLen - 20));
    const px = Math.cos(a) * dist;
    const py = Math.sin(a) * dist;
    const sz = 1.5 + Math.sin(frame * 0.12 + p) * 0.7;
    g.beginFill(p % 2 === 0 ? 0xfbbf24 : 0xfef08a, 0.6 * alpha * (1 - dist / rayLen));
    g.drawCircle(px, py, sz);
    g.endFill();
  }

  // Periodic flash pulse (every 120 frames = 2 seconds)
  const flashPhase = frame % 120;
  if (flashPhase < 8) {
    const flashAlpha = (1 - flashPhase / 8) * 0.3 * alpha;
    glow.beginFill(0xfffbeb, flashAlpha);
    glow.drawCircle(_e.x, _e.y, _e.radius);
    glow.endFill();
  }

  // Central bright orb
  g.beginFill(0xffffff, 0.6 * alpha);
  g.drawCircle(0, 0, 8);
  g.endFill();
  g.beginFill(0xfcd34d, 0.4 * alpha);
  g.drawCircle(0, 0, 14);
  g.endFill();

  // ADD glow
  glow.beginFill(0xfde68a, 0.15 * alpha);
  glow.drawCircle(_e.x, _e.y, auraR + 10);
  glow.endFill();
}

function drawSun(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;
  const pulse = 1 + Math.sin(frame * 0.07) * 0.08;
  const coreR = 30 * pulse;

  // Orange outer glow
  g.beginFill(0xff4500, 0.08 * alpha);
  g.drawCircle(0, 0, _e.radius * 0.8);
  g.endFill();

  // Heat vignette
  g.beginFill(0x7f1d1d, 0.03 * alpha);
  g.drawCircle(0, 0, _e.radius);
  g.endFill();

  // Core sphere (4 layers: deep red → orange → golden → pale yellow)
  g.beginFill(0xdc2626, 0.7 * alpha);
  g.drawCircle(0, 0, coreR);
  g.endFill();
  g.beginFill(0xf97316, 0.5 * alpha);
  g.drawCircle(0, 0, coreR * 0.7);
  g.endFill();
  g.beginFill(0xfbbf24, 0.4 * alpha);
  g.drawCircle(0, 0, coreR * 0.4);
  g.endFill();
  g.beginFill(0xfef08a, 0.3 * alpha);
  g.drawCircle(0, 0, coreR * 0.2);
  g.endFill();

  // Corona tendrils (8 irregular flame extensions)
  const tendrilCount = 8;
  for (let t = 0; t < tendrilCount; t++) {
    const baseAngle = (t / tendrilCount) * Math.PI * 2;
    const wave = Math.sin(frame * 0.08 + t * 1.2) * 0.3;
    const len = coreR + 15 + Math.sin(frame * 0.06 + t * 0.9) * 12;
    const angle = baseAngle + wave * 0.2;

    // Tendril as series of circles getting smaller
    const steps = 5;
    for (let s = 0; s < steps; s++) {
      const st = (s + 1) / steps;
      const dist = coreR * 0.8 + (len - coreR * 0.8) * st;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      const sz = (1 - st) * 6 + 1;
      const jx = Math.sin(frame * 0.12 + t + s * 0.5) * 3;
      const jy = Math.cos(frame * 0.1 + t + s * 0.7) * 3;
      const tendrilColor = st < 0.5 ? 0xef4444 : 0xfbbf24;
      g.beginFill(tendrilColor, (1 - st) * 0.6 * alpha);
      g.drawCircle(px + jx, py + jy, sz);
      g.endFill();
    }
  }

  // Ember particles rising
  const emberCount = 10;
  for (let e = 0; e < emberCount; e++) {
    const a = (e / emberCount) * Math.PI * 2 + frame * 0.02;
    const dist = coreR + ((frame * 0.8 + e * 20) % 50);
    const px = Math.cos(a) * dist;
    const py = Math.sin(a) * dist - (frame * 0.5 + e * 10) % 30; // drift upward
    const sz = 1.2 + Math.random() * 0.8;
    const emberColors = [0xff6b35, 0xfbbf24, 0xef4444];
    g.beginFill(emberColors[e % 3], 0.5 * alpha * Math.max(0, 1 - dist / _e.radius));
    g.drawCircle(px, py, sz);
    g.endFill();
  }

  // ADD glow
  glow.beginFill(0xf97316, 0.12 * alpha);
  glow.drawCircle(_e.x, _e.y, coreR * 2);
  glow.endFill();
  glow.beginFill(0xef4444, 0.04 * alpha);
  glow.drawCircle(_e.x, _e.y, _e.radius * 0.7);
  glow.endFill();
}

function drawTsunami(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number; angle: number }) {
  const alpha = _e.life / _e.maxLife;
  const waveAngle = _e.angle;
  const perpX = -Math.sin(waveAngle);
  const perpY = Math.cos(waveAngle);
  const waveWidth = _e.radius * 3;

  // Multi-layer wave wall
  const layers = 3;
  for (let layer = 0; layer < layers; layer++) {
    const layerOffset = layer * 5;
    const layerAlpha = (1 - layer * 0.25) * alpha;
    const wallCount = 12;
    for (let w = 0; w < wallCount; w++) {
      const wt = (w / (wallCount - 1)) - 0.5;
      // Sine wave pattern for each particle
      const sineOffset = Math.sin(wt * Math.PI * 3 + frame * 0.15 + layer * 0.5) * 6;
      const heightOffset = Math.cos(wt * Math.PI + frame * 0.1) * 4;
      const px = perpX * wt * waveWidth + Math.cos(waveAngle) * (sineOffset - layerOffset);
      const py = perpY * wt * waveWidth + Math.sin(waveAngle) * (sineOffset - layerOffset) + heightOffset;
      const pSize = 3.5 + Math.sin(frame * 0.1 + w + layer) * 1.5 - layer * 0.5;

      // Blue with depth variation (bright front → deep ocean back)
      const blueShade = layer === 0 ? 0x38bdf8 : layer === 1 ? 0x0ea5e9 : 0x0369a1;
      g.beginFill(blueShade, 0.6 * layerAlpha);
      g.drawCircle(px, py, pSize);
      g.endFill();
    }
  }

  // White foam at wave front
  const foamCount = 8;
  for (let f = 0; f < foamCount; f++) {
    const ft = ((f + 0.5) / foamCount - 0.5);
    const fx = perpX * ft * waveWidth + (Math.sin(frame * 0.2 + f) - 0.5) * 5;
    const fy = perpY * ft * waveWidth + (Math.cos(frame * 0.15 + f) - 0.5) * 5;
    g.beginFill(0xe0f2fe, 0.5 * alpha);
    g.drawCircle(fx + Math.cos(waveAngle) * 4, fy + Math.sin(waveAngle) * 4, 2);
    g.endFill();
  }

  // Water droplet trail
  const trailCount = 6;
  for (let tr = 0; tr < trailCount; tr++) {
    const trOffset = -(tr + 1) * 8;
    const trx = Math.cos(waveAngle) * trOffset + (Math.sin(frame * 0.1 + tr * 2) - 0.5) * 12;
    const try_ = Math.sin(waveAngle) * trOffset + (Math.cos(frame * 0.08 + tr * 3) - 0.5) * 12;
    g.beginFill(0x7dd3fc, 0.3 * alpha);
    g.drawCircle(trx, try_, 1.5);
    g.endFill();
  }

  // Wave crest highlight particles
  const crestCount = 4;
  for (let c = 0; c < crestCount; c++) {
    const ct = ((c + 0.5) / crestCount - 0.5);
    const cx = perpX * ct * waveWidth + Math.cos(waveAngle) * 6;
    const cy = perpY * ct * waveWidth + Math.sin(waveAngle) * 6;
    g.beginFill(0xbae6fd, 0.35 * alpha);
    g.drawCircle(cx + Math.sin(frame * 0.15 + c) * 2, cy + Math.cos(frame * 0.12 + c) * 2, 1.2);
    g.endFill();
  }

  // Glow on wave front
  glow.beginFill(0x0ea5e9, 0.1 * alpha);
  glow.drawCircle(_e.x, _e.y, _e.radius * 2);
  glow.endFill();
}

function drawTectonic(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number; angle: number; vx: number; vy: number }) {
  const alpha = _e.life / _e.maxLife;
  const progress = 1 - alpha;
  const originX = _e.vx; // stored player x
  const originY = _e.vy; // stored player y
  const localX = _e.x - originX; // not used in local space, draw around g center

  // Crack line from origin to this position (draw in local space relative to effect position)
  const crackDX = _e.x - originX;
  const crackDY = _e.y - originY;
  const crackLen = Math.sqrt(crackDX * crackDX + crackDY * crackDY);
  const crackProgress = Math.min(progress * 3, 1);

  // Draw crack from negative direction (toward origin) to center
  if (crackLen > 0) {
    const segments = 6;
    const jitter = 4;
    g.lineStyle(3, 0x92400e, 0.7 * alpha);
    const startX = -crackDX * crackProgress;
    const startY = -crackDY * crackProgress;
    g.moveTo(startX, startY);
    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const px = startX + crackDX * crackProgress * t + (Math.random() - 0.5) * jitter;
      const py = startY + crackDY * crackProgress * t + (Math.random() - 0.5) * jitter;
      g.lineTo(px, py);
    }
    g.lineStyle(1.5, 0xb45309, 0.5 * alpha);
    g.moveTo(startX, startY);
    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const px = startX + crackDX * crackProgress * t + (Math.random() - 0.5) * jitter * 0.5;
      const py = startY + crackDY * crackProgress * t + (Math.random() - 0.5) * jitter * 0.5;
      g.lineTo(px, py);
    }
    g.lineStyle(0);
  }

  // Rock pillar rising at endpoint
  const pillarProgress = Math.max(0, Math.min((progress - 0.2) * 2, 1));
  if (pillarProgress > 0) {
    const pillarW = 12;
    const pillarH = 30 * pillarProgress;
    // Rock pillar body
    g.beginFill(0x78350f, 0.8 * alpha);
    g.drawRect(-pillarW / 2, -pillarH, pillarW, pillarH);
    g.endFill();
    // Lighter top
    g.beginFill(0xb45309, 0.6 * alpha);
    g.drawRect(-pillarW / 2, -pillarH, pillarW, 4);
    g.endFill();
    // Edge highlight
    g.lineStyle(1, 0xd97706, 0.4 * alpha);
    g.drawRect(-pillarW / 2, -pillarH, pillarW, pillarH);
    g.lineStyle(0);
    // Golden vein flash
    if (frame % 90 < 6) {
      g.lineStyle(0.5, 0xfbbf24, (1 - (frame % 90) / 6) * 0.5 * alpha);
      g.moveTo(-pillarW / 4, -pillarH * 0.3);
      g.lineTo(pillarW / 4, -pillarH * 0.7);
      g.lineStyle(0);
    }
  }

  // Rock debris particles
  const debrisCount = 6;
  const seed = Math.floor(_e.angle * 100);
  for (let d = 0; d < debrisCount; d++) {
    const da = ((seed + d * 137) % 360) * Math.PI / 180;
    const dd = _e.radius * 0.5 * progress * ((seed + d * 53) % 100) / 100;
    const dy_offset = -dd * 0.3 + progress * 20; // arc trajectory
    const sz = 2 + (d % 3);
    g.beginFill(d % 2 === 0 ? 0xa16207 : 0xd97706, 0.5 * alpha * (1 - progress));
    g.drawRect(Math.cos(da) * dd - sz / 2, Math.sin(da) * dd + dy_offset - sz / 2, sz, sz);
    g.endFill();
  }

  // Impact glow
  if (progress < 0.3) {
    const flashAlpha = (0.3 - progress) / 0.3 * 0.3 * alpha;
    glow.beginFill(0xf59e0b, flashAlpha);
    glow.drawCircle(_e.x, _e.y, _e.radius * 0.5);
    glow.endFill();
  }
}

function drawTesla(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;
  const fieldR = _e.radius;

  // Field boundary (subtle circle)
  g.lineStyle(1, 0x8b5cf6, 0.15 * alpha);
  g.drawCircle(0, 0, fieldR);
  g.lineStyle(0);

  // 3-5 jagged lightning bolts from center to random nearby points
  const boltCount = 3 + (frame % 3);
  for (let b = 0; b < boltCount; b++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * (fieldR - 30);
    const endX = Math.cos(angle) * dist;
    const endY = Math.sin(angle) * dist;

    const mainPts = drawJaggedBolt(
      g, 0, 0, endX, endY,
      5 + Math.floor(Math.random() * 3), 15,
      0x818cf8, 0.3 * alpha, 4,
      0xe0e7ff, 0.8 * alpha, 1.5,
    );

    // Branch bolts (30% chance per segment)
    for (let s = 1; s < mainPts.length - 1; s++) {
      if (Math.random() < 0.3) {
        const branchLen = 10 + Math.random() * 20;
        const branchAngle = angle + (Math.random() - 0.5) * 2;
        const bx2 = mainPts[s].x + Math.cos(branchAngle) * branchLen;
        const by2 = mainPts[s].y + Math.sin(branchAngle) * branchLen;
        drawJaggedBolt(
          g, mainPts[s].x, mainPts[s].y, bx2, by2,
          3, 8,
          0xa78bfa, 0.2 * alpha, 2,
          0xf5f3ff, 0.5 * alpha, 1,
        );
      }
    }

    // Spark at bolt endpoint
    g.beginFill(0xc4b5fd, 0.7 * alpha);
    g.drawCircle(endX, endY, 2);
    g.endFill();
    g.beginFill(0xc4b5fd, 0.4 * alpha);
    g.drawCircle(endX, endY, 4);
    g.endFill();
  }

  // Occasional screen flash (every 30 frames)
  if (frame % 30 < 2) {
    glow.beginFill(0xede9fe, 0.15 * alpha);
    glow.drawCircle(_e.x, _e.y, fieldR * 1.2);
    glow.endFill();
  }

  // Central electric orb
  g.beginFill(0x8b5cf6, 0.3 * alpha);
  g.drawCircle(0, 0, 8);
  g.endFill();
  g.beginFill(0xf5f3ff, 0.5 * alpha);
  g.drawCircle(0, 0, 4);
  g.endFill();

  // ADD glow
  glow.beginFill(0x7c3aed, 0.08 * alpha);
  glow.drawCircle(_e.x, _e.y, fieldR * 0.6);
  glow.endFill();
}

function drawJudgment(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;
  const pulse = 1 + Math.sin(frame * 0.1) * 0.15;

  // Central orb oscillating between gold and deep violet
  const orbT = (Math.sin(frame * 0.08) + 1) / 2;
  const orbColor = orbT > 0.5 ? 0xfbbf24 : 0x6d28d9;
  const orbR = 15 * pulse;

  g.beginFill(orbColor, 0.7 * alpha);
  g.drawCircle(0, 0, orbR);
  g.endFill();
  g.beginFill(0xFFFFFF, 0.4 * alpha);
  g.drawCircle(0, 0, orbR * 0.4);
  g.endFill();

  // Lightning bolts in gold/purple/violet radiating outward
  const boltCount = 4 + Math.floor(Math.sin(frame * 0.05) * 2);
  const boltColors = [0xfde68a, 0x8b5cf6, 0x818cf8, 0xfde68a];
  for (let b = 0; b < boltCount; b++) {
    const angle = (b / boltCount) * Math.PI * 2 + frame * 0.02;
    const dist = 40 + Math.random() * (_e.radius - 40);
    const endX = Math.cos(angle) * dist;
    const endY = Math.sin(angle) * dist;
    const bColor = boltColors[b % boltColors.length];

    drawJaggedBolt(
      g, 0, 0, endX, endY,
      5, 12,
      bColor, 0.3 * alpha, 4,
      0xFFFFFF, 0.7 * alpha, 1.5,
    );
  }

  // Gold-white flash
  if (frame % 90 < 4) {
    const flashColor = 0xfef3c7;
    glow.beginFill(flashColor, 0.15 * alpha);
    glow.drawCircle(_e.x, _e.y, _e.radius * 0.8);
    glow.endFill();
  }

  // ADD glow
  glow.beginFill(0xfbbf24, 0.1 * alpha);
  glow.drawCircle(_e.x, _e.y, orbR * 3);
  glow.endFill();
}

function drawEclipse(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;

  // Golden sun
  const sunR = 25;
  g.beginFill(0xfbbf24, 0.6 * alpha);
  g.drawCircle(0, 0, sunR);
  g.endFill();

  // Dark eclipse circle (slowly moves across)
  const eclipsePhase = Math.sin(frame * 0.03);
  const eclipseOffset = eclipsePhase * 8;
  g.beginFill(0x1e1b4b, 0.85 * alpha);
  g.drawCircle(eclipseOffset, 0, sunR * 0.9);
  g.endFill();

  // Corona visible around eclipse (orange peeking around edges)
  g.lineStyle(2, 0xf97316, 0.4 * alpha);
  g.drawCircle(0, 0, sunR + 5);
  g.lineStyle(0);

  // Dark flame rain falling from above
  const rainCount = 12;
  for (let r = 0; r < rainCount; r++) {
    const rx = (r / rainCount - 0.5) * _e.radius * 2;
    const ry = -_e.radius + ((frame * 2 + r * 30) % (_e.radius * 2));
    const rAlpha = 0.5 * alpha * (1 - Math.abs(ry) / _e.radius);
    if (rAlpha > 0) {
      // Dark flame particle (alternating deep purple and dark red)
      g.beginFill(r % 2 === 0 ? 0x581c87 : 0xb91c1c, rAlpha);
      g.drawCircle(rx + Math.sin(frame * 0.1 + r) * 3, ry, 2.5);
      g.endFill();
      g.beginFill(r % 2 === 0 ? 0xb91c1c : 0x581c87, rAlpha * 0.5);
      g.drawCircle(rx + Math.sin(frame * 0.1 + r) * 3, ry - 3, 1.5);
      g.endFill();
    }
  }

  // Screen darkening effect (cosmic dark purple overlay)
  glow.beginFill(0x0f0518, 0.05 * alpha);
  glow.drawCircle(_e.x, _e.y, _e.radius);
  glow.endFill();
  glow.beginFill(0xf97316, 0.08 * alpha);
  glow.drawCircle(_e.x, _e.y, sunR + 10);
  glow.endFill();
}

function drawPrism(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;

  // Central white prism orb with rainbow shimmer
  g.beginFill(0xfefefe, 0.7 * alpha);
  g.drawCircle(0, 0, 10);
  g.endFill();

  // 7-color rainbow beams rotating from center (richer, more saturated)
  const rainbowColors = [0xff2d55, 0xff6b35, 0xfbbf24, 0x22c55e, 0x0ea5e9, 0x6366f1, 0xa855f7];
  const beamLen = _e.radius * 0.8;
  const baseRotation = frame * 0.02;

  for (let b = 0; b < 7; b++) {
    const angle = (b / 7) * Math.PI * 2 + baseRotation;
    const color = rainbowColors[b];
    const pulse = 1 + Math.sin(frame * 0.12 + b) * 0.1;

    // Glow layer (wide)
    g.lineStyle(8 * pulse, color, 0.12 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(angle) * beamLen, Math.sin(angle) * beamLen);

    // Color layer (medium)
    g.lineStyle(3 * pulse, color, 0.5 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(angle) * beamLen, Math.sin(angle) * beamLen);

    // White core (thin)
    g.lineStyle(1, 0xFFFFFF, 0.6 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(angle) * beamLen * 0.6, Math.sin(angle) * beamLen * 0.6);
  }
  g.lineStyle(0);

  // Rainbow glow
  glow.beginFill(0xFFFFFF, 0.1 * alpha);
  glow.drawCircle(_e.x, _e.y, 20);
  glow.endFill();
}

function drawAbyss(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;
  const pulse = 1 + Math.sin(frame * 0.07) * 0.1;

  // Central rift (vertical crack with violet outer, gold inner)
  const riftH = 40 * pulse;
  g.lineStyle(4, 0x6d28d9, 0.6 * alpha);
  g.moveTo(0, -riftH / 2);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    g.lineTo((Math.random() - 0.5) * 6, -riftH / 2 + riftH * t);
  }
  g.lineStyle(1.5, 0xfef08a, 0.4 * alpha);
  g.moveTo(0, -riftH / 2);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    g.lineTo((Math.random() - 0.5) * 3, -riftH / 2 + riftH * t);
  }
  g.lineStyle(0);

  // Particles being pulled inward (vortex)
  const vortexCount = 14;
  const vortexColors = [0x3b82f6, 0x8b5cf6, 0xfbbf24];
  for (let p = 0; p < vortexCount; p++) {
    const baseA = (p / vortexCount) * Math.PI * 2;
    const spiralSpeed = frame * 0.06;
    const angle = baseA + spiralSpeed;
    const dist = _e.radius * 0.8 * ((Math.sin(spiralSpeed + p * 0.5) + 1.5) / 2.5);
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    const sz = 1.5 + (1 - dist / _e.radius) * 2;
    const pColor = vortexColors[p % 3];
    g.beginFill(pColor, 0.5 * alpha * (1 - dist / _e.radius));
    g.drawCircle(px, py, sz);
    g.endFill();
  }

  // Shockwave pulse every 120 frames
  const shockPhase = frame % 120;
  if (shockPhase < 20) {
    const shockT = shockPhase / 20;
    const shockR = _e.radius * shockT;
    g.lineStyle(2, 0x60a5fa, (1 - shockT) * 0.4 * alpha);
    g.drawCircle(0, 0, shockR);
    g.lineStyle(0);
  }

  glow.beginFill(0x60a5fa, 0.08 * alpha);
  glow.drawCircle(_e.x, _e.y, _e.radius * 0.5);
  glow.endFill();
}

function drawPoison(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;

  // Swamp floor
  g.beginFill(0x14532d, 0.06 * alpha);
  g.drawCircle(0, 0, _e.radius * 0.8);
  g.endFill();

  // Toxic fog (deep forest green and dark purple)
  const fogCount = 18;
  for (let p = 0; p < fogCount; p++) {
    const a = (p / fogCount) * Math.PI * 2 + frame * 0.015 + Math.sin(frame * 0.03 + p) * 0.5;
    const dist = 10 + (p * 7 + Math.sin(frame * 0.04 + p * 1.3) * 15) % (_e.radius * 0.7);
    const px = Math.cos(a) * dist;
    const py = Math.sin(a) * dist;
    const sz = 4 + Math.sin(frame * 0.06 + p * 0.8) * 2;
    const fogColor = p % 2 === 0 ? 0x166534 : 0x581c87;
    g.beginFill(fogColor, 0.2 * alpha);
    g.drawCircle(px, py, sz);
    g.endFill();
  }

  // Toxic particles (emerald, bright green, violet)
  const toxicCount = 8;
  const toxicColors = [0x22c55e, 0x4ade80, 0x7c3aed];
  for (let t = 0; t < toxicCount; t++) {
    const ta = (t / toxicCount) * Math.PI * 2 + frame * 0.025;
    const td = 15 + Math.sin(frame * 0.05 + t * 1.5) * 12;
    const tx = Math.cos(ta) * td;
    const ty = Math.sin(ta) * td;
    g.beginFill(toxicColors[t % 3], 0.4 * alpha);
    g.drawCircle(tx, ty, 1.5);
    g.endFill();
  }

  // Bubbling effect at center
  const bubbleCount = 5;
  for (let b = 0; b < bubbleCount; b++) {
    const by = -((frame * 0.5 + b * 15) % 30);
    const bx = Math.sin(frame * 0.1 + b * 2) * 8;
    const bSize = 2 + Math.sin(frame * 0.08 + b) * 1;
    g.lineStyle(1, 0x86efac, 0.4 * alpha);
    g.drawCircle(bx, by, bSize);
    g.lineStyle(0);
  }

  glow.beginFill(0x22c55e, 0.06 * alpha);
  glow.drawCircle(_e.x, _e.y, _e.radius * 0.6);
  glow.endFill();
}

function drawThunder(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; color: number; life: number; maxLife: number }) {
  const alpha = _e.life / _e.maxLife;

  // 3 light pillars arranged in triangle
  const pillarCount = 3;
  const pillarDist = _e.radius * 0.5;
  const rotation = frame * 0.01;
  const pillarPositions: { x: number; y: number }[] = [];

  for (let p = 0; p < pillarCount; p++) {
    const angle = (p / pillarCount) * Math.PI * 2 + rotation;
    const px = Math.cos(angle) * pillarDist;
    const py = Math.sin(angle) * pillarDist;
    pillarPositions.push({ x: px, y: py });

    // Light pillar (vertical beam of gold light)
    const pillarH = 50;
    g.beginFill(0xfde68a, 0.2 * alpha);
    g.drawRect(px - 4, py - pillarH / 2, 8, pillarH);
    g.endFill();
    g.beginFill(0xfefce8, 0.4 * alpha);
    g.drawRect(px - 1.5, py - pillarH / 2, 3, pillarH);
    g.endFill();
    // White cap at top
    g.beginFill(0xffffff, 0.5 * alpha);
    g.drawRect(px - 2, py - pillarH / 2 - 2, 4, 4);
    g.endFill();

    // Base glow
    glow.beginFill(0xfbbf24, 0.15 * alpha);
    glow.drawCircle(_e.x + px, _e.y + py, 12);
    glow.endFill();
  }

  // Lightning connecting the 3 pillars (triangle)
  // Triangle fill at very low alpha
  g.beginFill(0x8b5cf6, 0.04 * alpha);
  g.moveTo(pillarPositions[0].x, pillarPositions[0].y);
  for (let i = 1; i < pillarCount; i++) {
    g.lineTo(pillarPositions[i].x, pillarPositions[i].y);
  }
  g.closePath();
  g.endFill();

  for (let i = 0; i < pillarCount; i++) {
    const a = pillarPositions[i];
    const b = pillarPositions[(i + 1) % pillarCount];
    drawJaggedBolt(
      g, a.x, a.y, b.x, b.y,
      5, 10,
      0x818cf8, 0.3 * alpha, 4,
      0xe0e7ff, 0.7 * alpha, 1.5,
    );
  }

  // Central electric node
  g.beginFill(0xa78bfa, 0.5 * alpha);
  g.drawCircle(0, 0, 6);
  g.endFill();
  g.beginFill(0xe0e7ff, 0.3 * alpha);
  g.drawCircle(0, 0, 3);
  g.endFill();
}

// ── 단일 원소 자동공격 이펙트 ──

function drawAutoWater(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; life: number; maxLife: number }) {
  const progress = 1 - _e.life / _e.maxLife; // 0→1 (느리게: 55프레임 = ~0.9초)
  const alpha = progress < 0.1 ? progress / 0.1 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
  const R = _e.radius;

  // ═══ 1. 수면 채우기 — 캐릭터 아래 은은한 물 표면 ═══
  const surfaceR = R * Math.min(1, progress * 1.5) * 0.85;
  if (surfaceR > 5) {
    // 반투명 수면
    g.beginFill(0x0c4a6e, 0.06 * alpha);
    g.drawCircle(0, 0, surfaceR);
    g.endFill();
    // 수면 위 반사광 (작은 백색 점들이 천천히 반짝)
    const reflCount = 8;
    for (let rf = 0; rf < reflCount; rf++) {
      const rfSeed = rf * 47.3;
      const rfA = (rf / reflCount) * Math.PI * 2 + frame * 0.008;
      const rfDist = surfaceR * (0.3 + Math.sin(rfSeed) * 0.4);
      const rfFlicker = (Math.sin(frame * 0.06 + rfSeed) + 1) * 0.5;
      if (rfFlicker < 0.5) continue;
      g.beginFill(0xbae6fd, rfFlicker * 0.25 * alpha);
      g.drawCircle(Math.cos(rfA) * rfDist, Math.sin(rfA) * rfDist, 1 + rfFlicker);
      g.endFill();
    }
    // 수면 글로우
    glow.beginFill(0x0369a1, 0.04 * alpha);
    glow.drawCircle(_e.x, _e.y, surfaceR + 5);
    glow.endFill();
  }

  // ═══ 2. 파도 링 3중 — 느리고 우아하게 퍼짐 ═══
  for (let r = 0; r < 3; r++) {
    const delay = r * 0.15; // 링 간 시간차 넓게
    const ringT = Math.max(0, Math.min(1, (progress - delay) / (0.9 - delay)));
    if (ringT <= 0) continue;

    // ease-out 커브: 처음에 빠르고 끝에서 느리게
    const easedT = 1 - Math.pow(1 - ringT, 2.5);
    const ringR = R * 0.1 + R * 0.9 * easedT;
    const ringAlpha = (1 - ringT * 0.7) * alpha;
    const thickness = (4.5 - r * 1.2) * (1 - easedT * 0.3);

    const ringColors = [0x38bdf8, 0x0ea5e9, 0x0284c7];

    // ADD 글로우 링
    glow.lineStyle(thickness + 10, ringColors[r], 0.035 * ringAlpha);
    const glowSegs = 64;
    for (let s = 0; s <= glowSegs; s++) {
      const a = (s / glowSegs) * Math.PI * 2;
      const w = Math.sin(a * 4 + frame * 0.025 + r * 1.8) * 4 * (1 - easedT * 0.5);
      const px = _e.x + Math.cos(a) * (ringR + w);
      const py = _e.y + Math.sin(a) * (ringR + w);
      if (s === 0) glow.moveTo(px, py); else glow.lineTo(px, py);
    }
    glow.lineStyle(0);

    // 메인 링 — 부드러운 물결 (저주파 3회 + 고주파 미세)
    g.lineStyle(thickness, ringColors[r], 0.6 * ringAlpha);
    const mainSegs = 72;
    for (let s = 0; s <= mainSegs; s++) {
      const a = (s / mainSegs) * Math.PI * 2;
      const wLow = Math.sin(a * 3 + frame * 0.02 + r * 2) * 5 * (1 - easedT * 0.4);
      const wHigh = Math.sin(a * 8 + frame * 0.035 + r * 1.3) * 1.5;
      const px = Math.cos(a) * (ringR + wLow + wHigh);
      const py = Math.sin(a) * (ringR + wLow + wHigh);
      if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }

    // 하이라이트 (안쪽 밝은 선)
    g.lineStyle(Math.max(0.6, thickness * 0.25), 0xbae6fd, 0.35 * ringAlpha);
    for (let s = 0; s <= mainSegs; s++) {
      const a = (s / mainSegs) * Math.PI * 2;
      const wLow = Math.sin(a * 3 + frame * 0.02 + r * 2) * 5 * (1 - easedT * 0.4);
      const px = Math.cos(a) * (ringR + wLow - 2);
      const py = Math.sin(a) * (ringR + wLow - 2);
      if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.lineStyle(0);

    // 파도 마루 물방울 — 사인파 피크 위치에만 (크고 반짝이게)
    if (easedT < 0.85) {
      const crestCount = 14;
      for (let c = 0; c < crestCount; c++) {
        const ca = (c / crestCount) * Math.PI * 2 + frame * 0.008 + r * 0.5;
        const cWave = Math.sin(ca * 3 + frame * 0.02 + r * 2);
        if (cWave < 0.4) continue;
        const cNorm = (cWave - 0.4) / 0.6; // 0→1 피크에서만
        const cDist = ringR + cWave * 5;
        const cx = Math.cos(ca) * cDist;
        const cy = Math.sin(ca) * cDist;
        const cSize = 1.5 + cNorm * 2.5;
        // 물방울 글로우
        glow.beginFill(0x7dd3fc, cNorm * 0.12 * ringAlpha);
        glow.drawCircle(_e.x + cx, _e.y + cy, cSize * 2.5);
        glow.endFill();
        // 밝은 물방울
        g.beginFill(0xe0f2fe, 0.6 * ringAlpha * cNorm);
        g.drawCircle(cx, cy, cSize);
        g.endFill();
        // 핵심: 물방울 안 작은 하이라이트 점
        g.beginFill(0xf0f9ff, 0.4 * ringAlpha * cNorm);
        g.drawCircle(cx - cSize * 0.2, cy - cSize * 0.3, cSize * 0.3);
        g.endFill();
      }
    }
  }

  // ═══ 3. 잔여 파문 — 천천히 사라지는 동심원 ═══
  if (progress > 0.6) {
    const rippleT = (progress - 0.6) / 0.4;
    const rippleAlpha = (1 - rippleT) * 0.2 * alpha;
    for (let rp = 0; rp < 5; rp++) {
      const rpSeed = rp * 67.1 + 3;
      const rpA = (rp / 5) * Math.PI * 2 + Math.sin(rpSeed) * 0.8;
      const rpDist = R * (0.25 + rp * 0.12);
      const rpR = 4 + rippleT * 10;
      const rpx = Math.cos(rpA) * rpDist;
      const rpy = Math.sin(rpA) * rpDist;
      g.lineStyle(0.7, 0x7dd3fc, rippleAlpha);
      g.drawCircle(rpx, rpy, rpR);
      g.lineStyle(0.4, 0xbae6fd, rippleAlpha * 0.5);
      g.drawCircle(rpx, rpy, rpR * 0.5);
      g.lineStyle(0);
    }
  }
}

function drawAutoEarth(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; life: number; maxLife: number }) {
  const progress = 1 - _e.life / _e.maxLife; // 0→1 (60프레임 = 1초)
  const alpha = progress < 0.08 ? progress / 0.08 : progress > 0.75 ? (1 - progress) / 0.25 : 1;
  const R = _e.radius;

  // ═══ 돌기둥 소환 — 캐릭터 주변에 6개 바위 기둥이 느리게 솟아올랐다 가라앉음 ═══

  const pillarCount = 6;
  for (let p = 0; p < pillarCount; p++) {
    const pAngle = (p / pillarCount) * Math.PI * 2 + 0.3;
    const pDist = R * (0.35 + (p % 2) * 0.25); // 안/바깥 교대 배치
    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;

    // 각 기둥은 시간차로 솟아오름
    const pDelay = p * 0.06;
    const pT = Math.max(0, Math.min(1, (progress - pDelay) / (0.85 - pDelay)));
    if (pT <= 0) continue;

    // 높이: ease-out으로 솟아올랐다가, 후반에 ease-in으로 가라앉음
    const riseT = pT < 0.5 ? pT * 2 : 1; // 0→1 (전반: 솟아오름)
    const sinkT = pT > 0.6 ? (pT - 0.6) / 0.4 : 0; // 0→1 (후반: 가라앉음)
    const riseEased = 1 - Math.pow(1 - riseT, 3); // ease-out
    const sinkEased = Math.pow(sinkT, 2); // ease-in
    const heightFactor = riseEased * (1 - sinkEased);

    const pillarW = 10 + (p % 3) * 3;
    const pillarH = (25 + (p % 2) * 15) * heightFactor;
    if (pillarH < 1) continue;

    const pillarAlpha = heightFactor * alpha;

    // 기둥 그림자
    g.beginFill(0x000000, 0.05 * pillarAlpha);
    g.drawEllipse(px, py + 3, pillarW * 0.6, pillarW * 0.15);
    g.endFill();

    // 기둥 본체 — 아래서 위로 솟는 사각형
    // 어두운 면 (왼쪽)
    g.beginFill(0x5c3310, 0.75 * pillarAlpha);
    g.drawRect(px - pillarW / 2, py - pillarH, pillarW * 0.45, pillarH);
    g.endFill();
    // 밝은 면 (오른쪽)
    g.beginFill(0x92400e, 0.7 * pillarAlpha);
    g.drawRect(px - pillarW / 2 + pillarW * 0.45, py - pillarH, pillarW * 0.55, pillarH);
    g.endFill();
    // 윗면 (밝은 앰버)
    g.beginFill(0xb45309, 0.8 * pillarAlpha);
    g.drawRect(px - pillarW / 2, py - pillarH - 3, pillarW, 4);
    g.endFill();
    // 윗면 하이라이트
    g.beginFill(0xd97706, 0.5 * pillarAlpha);
    g.drawRect(px - pillarW / 2 + 2, py - pillarH - 2, pillarW * 0.4, 2);
    g.endFill();

    // 기둥 표면 금광맥 (세로 줄)
    if (pillarH > 10) {
      g.lineStyle(0.6, 0xd97706, 0.25 * pillarAlpha);
      const veinX = px - pillarW * 0.1 + Math.sin(p * 3.7) * 2;
      g.moveTo(veinX, py);
      g.lineTo(veinX + Math.sin(p * 2.1) * 2, py - pillarH * 0.7);
      g.lineStyle(0);
    }

    // 솟아오를 때 기둥 주변 먼지
    if (riseT < 0.8 && riseT > 0.1) {
      const dustAlpha = (0.8 - riseT) * 0.3 * alpha;
      const dustCount = 3;
      for (let d = 0; d < dustCount; d++) {
        const da = pAngle + (d - 1) * 0.5;
        const dd = pillarW * 0.8 + d * 3;
        const dustRise = riseT * 8;
        const driftX = Math.sin(frame * 0.02 + p + d) * 3;
        g.beginFill(0xa16207, dustAlpha);
        g.drawCircle(px + Math.cos(da) * dd + driftX, py - dustRise + d * 2, 2 + Math.sin(p + d) * 1);
        g.endFill();
      }
    }

    // 기둥 바닥 글로우
    if (heightFactor > 0.3) {
      glow.beginFill(0xb45309, 0.06 * pillarAlpha);
      glow.drawCircle(_e.x + px, _e.y + py, pillarW * 0.8);
      glow.endFill();
    }
  }

  // ═══ 중심부 은은한 흙빛 글로우 ═══
  const centerGlow = Math.min(1, progress * 3) * (1 - Math.max(0, (progress - 0.7) / 0.3));
  glow.beginFill(0x92400e, 0.04 * centerGlow * alpha);
  glow.drawCircle(_e.x, _e.y, R * 0.6);
  glow.endFill();

  // ═══ 먼지 입자 — 전체적으로 흩날리는 흙먼지 ═══
  if (progress > 0.05 && progress < 0.85) {
    const dustGlobalT = (progress - 0.05) / 0.8;
    const dustCount = 8;
    for (let d = 0; d < dustCount; d++) {
      const dSeed = d * 67.3 + 5;
      const da = (d / dustCount) * Math.PI * 2 + Math.sin(dSeed) * 0.4;
      const dd = R * 0.3 + R * 0.35 * dustGlobalT;
      const dRise = dustGlobalT * 6 + Math.sin(dSeed) * 3;
      const dDrift = Math.sin(frame * 0.015 + d * 1.1) * 4;
      const dAlpha = (1 - dustGlobalT) * 0.15 * alpha;
      const dSize = 1.5 + Math.sin(dSeed * 1.3) * 1;
      g.beginFill(0xb45309, dAlpha);
      g.drawCircle(Math.cos(da) * dd + dDrift, Math.sin(da) * dd - dRise, dSize);
      g.endFill();
    }
  }
}

function drawAutoLight(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; vx: number; vy: number; radius: number; life: number; maxLife: number; angle: number }) {
  const progress = 1 - _e.life / _e.maxLife; // 0→1 (50프레임)
  const ox = _e.x; // 플레이어 위치 (발사 원점)
  const oy = _e.y;
  const dirX = _e.vx; // 방향 벡터 (단위)
  const dirY = _e.vy;
  const beamLen = _e.radius;

  // 수직 방향
  const perpX = -dirY;
  const perpY = dirX;

  // ═══ 3단계: 차징(0~0.45) → 발사(0.45~0.85) → 소멸(0.85~1.0) ═══
  const chargePhase = progress < 0.45;
  const firePhase = progress >= 0.45 && progress < 0.85;
  const fadePhase = progress >= 0.85;

  // ── 차징: 아주 작은 광자 알갱이가 천천히 모임 ──
  if (chargePhase) {
    const chargeT = progress / 0.45; // 0→1 (80프레임 × 0.45 = 36프레임 차징)

    // 광자 알갱이 25개 — 아주 작고 천천히
    const photonCount = 25;
    for (let i = 0; i < photonCount; i++) {
      const seed = i * 137.5 + 42;
      const startAngle = (Math.sin(seed) * 0.5 + 0.5) * Math.PI * 2;
      const startDist = 55 + (Math.sin(seed * 0.7) * 0.5 + 0.5) * 60; // 55~115px

      // 넓은 시간차 등장 (0~0.6 사이에 천천히)
      const appearT = (i / photonCount) * 0.6;
      if (chargeT < appearT) continue;

      const localT = (chargeT - appearT) / (1 - appearT);
      // 느린 가속: 오래 떠다니다 마지막에 슝
      const accelT = Math.pow(localT, 3);

      const currentDist = startDist * (1 - accelT);
      if (currentDist < 2) continue;

      // 느긋한 떠다님
      const wobbleX = Math.sin(frame * 0.008 + seed) * 5 * (1 - accelT);
      const wobbleY = Math.cos(frame * 0.007 + seed * 0.8) * 5 * (1 - accelT);

      const px = ox + Math.cos(startAngle) * currentDist + wobbleX;
      const py = oy + Math.sin(startAngle) * currentDist + wobbleY;

      // 크기: 매우 작게 (0.5~1px)
      const pSize = 0.5 + (i % 3) * 0.2;
      const pAlpha = (0.3 + accelT * 0.6) * Math.min(1, (chargeT - appearT) * 4);

      // 글로우
      glow.beginFill(0xfde68a, pAlpha * 0.2);
      glow.drawCircle(px, py, pSize * 5);
      glow.endFill();

      // 알갱이 (밝은 작은 점)
      g.beginFill(0xfefce8, pAlpha * 0.9);
      g.drawCircle(px, py, pSize);
      g.endFill();

      // 꼬리 (마지막에 빨려갈 때만)
      if (accelT > 0.3) {
        const tailLen = 2 + accelT * 10;
        const tdx = Math.cos(startAngle);
        const tdy = Math.sin(startAngle);
        g.lineStyle(0.4, 0xfbbf24, pAlpha * 0.3);
        g.moveTo(px, py);
        g.lineTo(px + tdx * tailLen, py + tdy * tailLen);
        g.lineStyle(0);
      }
    }

    // 중심 코어 — 아주 작게, 모일수록 조금씩 밝아짐
    const coreI = Math.pow(chargeT, 2);
    const coreR = 1.5 + coreI * 4;
    glow.beginFill(0xfef08a, coreI * 0.2);
    glow.drawCircle(ox, oy, coreR + 6);
    glow.endFill();
    g.beginFill(0xfbbf24, coreI * 0.6);
    g.drawCircle(ox, oy, coreR);
    g.endFill();
  }

  // ── 발사 단계: 두꺼운 광선이 쫘아악 ──
  if (firePhase) {
    const fireT = (progress - 0.45) / 0.4; // 0→1

    // 광선 길이: 빠르게 최대 도달 (ease-out)
    const lenT = 1 - Math.pow(1 - Math.min(1, fireT * 3), 3);
    const currentLen = beamLen * lenT;

    // 광선 두께: 처음 두껍다가 서서히 줄어듬
    const thickT = fireT < 0.15 ? fireT / 0.15 : 1 - (fireT - 0.15) / 0.85 * 0.4;
    const baseThick = 14 * thickT;

    // 끝점
    const endX = ox + dirX * currentLen;
    const endY = oy + dirY * currentLen;

    // 레이어 1: 가장 바깥 글로우 (넓고 투명한 골드)
    glow.lineStyle(baseThick + 20, 0xfbbf24, 0.06);
    glow.moveTo(ox, oy);
    glow.lineTo(endX, endY);
    glow.lineStyle(0);

    // 레이어 2: 바깥 글로우 (진한 골드)
    g.lineStyle(baseThick + 8, 0xf59e0b, 0.15);
    g.moveTo(ox, oy);
    g.lineTo(endX, endY);

    // 레이어 3: 메인 빔 (밝은 골드)
    g.lineStyle(baseThick, 0xfbbf24, 0.5);
    g.moveTo(ox, oy);
    g.lineTo(endX, endY);

    // 레이어 4: 내부 코어 (더 밝은 옐로우)
    g.lineStyle(baseThick * 0.5, 0xfde68a, 0.7);
    g.moveTo(ox, oy);
    g.lineTo(endX, endY);

    // 레이어 5: 중심 (백열)
    g.lineStyle(baseThick * 0.2, 0xfefce8, 0.9);
    g.moveTo(ox, oy);
    g.lineTo(endX, endY);
    g.lineStyle(0);

    // 광선 표면 빛 입자 — 빔을 따라 흩뿌려짐
    const particleCount = 10;
    for (let p = 0; p < particleCount; p++) {
      const pT = (p + (frame * 0.15) % 1) / particleCount;
      if (pT > lenT) continue;
      const pDist = currentLen * pT;
      const pOffset = (Math.sin(frame * 0.1 + p * 2.3) - 0.5) * baseThick * 0.6;
      const px = ox + dirX * pDist + perpX * pOffset;
      const py = oy + dirY * pDist + perpY * pOffset;
      const pSize = 1 + Math.sin(frame * 0.15 + p) * 0.8;
      g.beginFill(0xfefce8, 0.5);
      g.drawCircle(px, py, pSize);
      g.endFill();
    }

    // 발사 원점 밝은 플래시
    glow.beginFill(0xfef08a, 0.25 * thickT);
    glow.drawCircle(ox, oy, baseThick + 5);
    glow.endFill();
    g.beginFill(0xFFFFFF, 0.5 * thickT);
    g.drawCircle(ox, oy, baseThick * 0.4);
    g.endFill();

    // 끝점 임팩트 빛
    if (lenT > 0.8) {
      glow.beginFill(0xfbbf24, 0.15 * thickT);
      glow.drawCircle(endX, endY, 15);
      glow.endFill();
      g.beginFill(0xfefce8, 0.4 * thickT);
      g.drawCircle(endX, endY, 4);
      g.endFill();
    }

    // 처음 발사 순간 화면 전체 미세한 플래시
    if (fireT < 0.05) {
      const initFlash = (0.05 - fireT) / 0.05;
      glow.beginFill(0xfef08a, initFlash * 0.08);
      glow.drawCircle(ox, oy, 200);
      glow.endFill();
    }
  }

  // ── 소멸 단계: 잔광이 사라짐 ──
  if (fadePhase) {
    const fadeT = (progress - 0.85) / 0.15; // 0→1
    const fadeAlpha = 1 - fadeT;

    // 잔광 빔 (얇아지며 사라짐)
    const thinFactor = (1 - fadeT) * 0.3;
    const endX = ox + dirX * beamLen;
    const endY = oy + dirY * beamLen;

    g.lineStyle(14 * thinFactor + 2, 0xfbbf24, 0.15 * fadeAlpha);
    g.moveTo(ox, oy);
    g.lineTo(endX, endY);
    g.lineStyle(14 * thinFactor * 0.3, 0xfefce8, 0.3 * fadeAlpha);
    g.moveTo(ox, oy);
    g.lineTo(endX, endY);
    g.lineStyle(0);

    // 잔여 빛 입자 흩어짐
    const scatterCount = 6;
    for (let sc = 0; sc < scatterCount; sc++) {
      const scT = sc / scatterCount;
      const scDist = beamLen * scT;
      const scDrift = (Math.sin(frame * 0.05 + sc * 1.7) - 0.5) * 15 * fadeT;
      const scx = ox + dirX * scDist + perpX * scDrift;
      const scy = oy + dirY * scDist + perpY * scDrift;
      g.beginFill(0xfde68a, 0.3 * fadeAlpha);
      g.drawCircle(scx, scy, 1.5 * fadeAlpha);
      g.endFill();
    }
  }
}

function drawAutoElectric(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; vx: number; vy: number; radius: number; life: number; maxLife: number; angle: number }) {
  // _e.x,y = 시작점, _e.vx,vy = 끝점 (적 위치)
  const x0 = _e.x, y0 = _e.y;
  const x1 = _e.vx, y1 = _e.vy;
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;

  const lifeRatio = _e.life / _e.maxLife;
  const alpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : lifeRatio > 0.7 ? 1 : 1; // 빠르게 등장, 서서히 소멸 안 함 (짧은 수명)
  const fadeAlpha = _e.life <= 4 ? _e.life / 4 : 1; // 마지막 4프레임 페이드

  // 법선 벡터 (수직 방향)
  const nx = -dy / dist;
  const ny = dx / dist;

  // ═══ 메인 볼트 — 6~8 세그먼트의 지그재그 ═══
  const segments = 6 + Math.floor(dist / 30);
  const jitter = dist * 0.12; // 거리에 비례하는 흔들림

  // 중간점 생성 (매 프레임 새로 — 지지직 효과)
  const points: Array<{ x: number; y: number }> = [{ x: x0, y: y0 }];
  for (let s = 1; s < segments; s++) {
    const t = s / segments;
    const baseX = x0 + dx * t;
    const baseY = y0 + dy * t;
    // 중앙부가 더 크게 흔들림
    const midFactor = Math.sin(t * Math.PI);
    const j = jitter * midFactor;
    const offsetX = nx * (Math.random() - 0.5) * 2 * j;
    const offsetY = ny * (Math.random() - 0.5) * 2 * j;
    points.push({ x: baseX + offsetX, y: baseY + offsetY });
  }
  points.push({ x: x1, y: y1 });

  // 레이어 1: 가장 바깥 글로우 (두껍고 투명)
  g.lineStyle(7, 0x6d28d9, 0.12 * fadeAlpha);
  g.moveTo(points[0].x, points[0].y);
  for (let p = 1; p < points.length; p++) g.lineTo(points[p].x, points[p].y);

  // 레이어 2: 중간 글로우 (보라)
  g.lineStyle(4, 0x818cf8, 0.3 * fadeAlpha);
  g.moveTo(points[0].x, points[0].y);
  for (let p = 1; p < points.length; p++) g.lineTo(points[p].x, points[p].y);

  // 레이어 3: 코어 (밝은 라벤더-화이트)
  g.lineStyle(1.8, 0xe0e7ff, 0.85 * fadeAlpha);
  g.moveTo(points[0].x, points[0].y);
  for (let p = 1; p < points.length; p++) g.lineTo(points[p].x, points[p].y);
  g.lineStyle(0);

  // ═══ 분기 번개 — 메인 볼트에서 30% 확률로 가지 ═══
  for (let s = 1; s < points.length - 1; s++) {
    if (Math.random() > 0.35) continue;
    const pt = points[s];
    const branchAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2.5;
    const branchLen = 10 + Math.random() * 20;
    const bx2 = pt.x + Math.cos(branchAngle) * branchLen;
    const by2 = pt.y + Math.sin(branchAngle) * branchLen;

    // 분기 중간점 2개
    const bMid1x = pt.x + (bx2 - pt.x) * 0.4 + (Math.random() - 0.5) * 8;
    const bMid1y = pt.y + (by2 - pt.y) * 0.4 + (Math.random() - 0.5) * 8;

    // 분기 글로우
    g.lineStyle(2.5, 0x818cf8, 0.15 * fadeAlpha);
    g.moveTo(pt.x, pt.y);
    g.lineTo(bMid1x, bMid1y);
    g.lineTo(bx2, by2);
    // 분기 코어
    g.lineStyle(1, 0xc4b5fd, 0.5 * fadeAlpha);
    g.moveTo(pt.x, pt.y);
    g.lineTo(bMid1x, bMid1y);
    g.lineTo(bx2, by2);
    g.lineStyle(0);

    // 분기 끝 스파크
    glow.beginFill(0xc4b5fd, 0.2 * fadeAlpha);
    glow.drawCircle(bx2, by2, 3);
    glow.endFill();
  }

  // ═══ 시작점/끝점 노드 ═══
  // 시작점 (플레이어 쪽) — 작은 글로우
  glow.beginFill(0x8b5cf6, 0.2 * fadeAlpha);
  glow.drawCircle(x0, y0, 8);
  glow.endFill();
  g.beginFill(0xe0e7ff, 0.6 * fadeAlpha);
  g.drawCircle(x0, y0, 3);
  g.endFill();

  // 끝점 (적 위치) — 더 큰 임팩트 글로우
  glow.beginFill(0xa78bfa, 0.25 * fadeAlpha);
  glow.drawCircle(x1, y1, 12);
  glow.endFill();
  glow.beginFill(0xc4b5fd, 0.15 * fadeAlpha);
  glow.drawCircle(x1, y1, 20);
  glow.endFill();
  g.beginFill(0xe0e7ff, 0.7 * fadeAlpha);
  g.drawCircle(x1, y1, 4);
  g.endFill();

  // ═══ 볼트 주변 미세 스파크 ═══
  const sparkCount = 3;
  for (let sp = 0; sp < sparkCount; sp++) {
    const t = Math.random();
    const baseX = x0 + dx * t;
    const baseY = y0 + dy * t;
    const sparkOff = (Math.random() - 0.5) * 16;
    const spx = baseX + nx * sparkOff;
    const spy = baseY + ny * sparkOff;
    g.beginFill(0xc4b5fd, 0.5 * fadeAlpha);
    g.drawCircle(spx, spy, 1 + Math.random());
    g.endFill();
  }
}

function drawAutoFireSplash(g: PIXI.Graphics, glow: PIXI.Graphics, frame: number, _e: { x: number; y: number; radius: number; life: number; maxLife: number }) {
  const progress = 1 - _e.life / _e.maxLife; // 0→1
  const alpha = progress < 0.08 ? progress / 0.08 : progress > 0.6 ? (1 - progress) / 0.4 : 1;
  const R = _e.radius;

  // ═══ 1. 중심 폭발 — 적중 순간의 화염 폭발 ═══
  if (progress < 0.25) {
    const impactT = progress / 0.25;
    // 3중 플래시: 백열 → 골드 → 오렌지
    const flashR = 8 + impactT * 12;
    glow.beginFill(0xfef08a, 0.4 * (1 - impactT) * alpha);
    glow.drawCircle(_e.x, _e.y, flashR + 15);
    glow.endFill();
    glow.beginFill(0xf97316, 0.25 * (1 - impactT) * alpha);
    glow.drawCircle(_e.x, _e.y, flashR + 8);
    glow.endFill();
    g.beginFill(0xfbbf24, 0.6 * (1 - impactT) * alpha);
    g.drawCircle(0, 0, flashR * 0.7);
    g.endFill();
    g.beginFill(0xfef3c7, 0.5 * (1 - impactT * 0.8) * alpha);
    g.drawCircle(0, 0, flashR * 0.3);
    g.endFill();

    // 폭발 충격파 링
    const shockR = 5 + impactT * R * 0.6;
    g.lineStyle(2.5 * (1 - impactT), 0xf97316, 0.5 * (1 - impactT) * alpha);
    g.drawCircle(0, 0, shockR);
    g.lineStyle(0);
  }

  // ═══ 2. 화염 파편 10개 — 방사형 비산 ═══
  const splashCount = 10;
  for (let s = 0; s < splashCount; s++) {
    const sSeed = s * 73.7 + 11;
    const sa = (s / splashCount) * Math.PI * 2 + Math.sin(sSeed) * 0.3;
    // 속도 변화: 빠르게 출발 → 감속
    const speedCurve = 1 - Math.pow(1 - progress, 0.5); // ease-out
    const sd = R * 0.1 + R * 0.9 * speedCurve;
    // 포물선 상승 (파편이 위로 튀었다 떨어지는 느낌)
    const risePhase = Math.sin(progress * Math.PI * 0.8);
    const riseHeight = (8 + (s % 3) * 4) * risePhase;

    const sx = Math.cos(sa) * sd;
    const sy = Math.sin(sa) * sd - riseHeight;

    // 파편 크기: 중심에서 멀어질수록 작아짐
    const sz = (3 + Math.sin(sSeed) * 1.5) * (1 - speedCurve * 0.5);
    if (sz < 0.5) continue;

    // 색상: 안쪽=밝은 골드, 바깥=레드 (온도 그라데이션)
    const tempT = speedCurve;
    const sColor = tempT < 0.3 ? 0xfbbf24 : tempT < 0.6 ? 0xf97316 : 0xdc2626;
    const sAlpha = (1 - speedCurve * 0.6) * 0.8 * alpha;

    // 파편 코어
    g.beginFill(sColor, sAlpha);
    g.drawCircle(sx, sy, sz);
    g.endFill();
    // 밝은 중심
    if (sz > 1.5 && tempT < 0.5) {
      g.beginFill(0xfef08a, sAlpha * 0.5);
      g.drawCircle(sx, sy, sz * 0.35);
      g.endFill();
    }

    // 파편 꼬리 — 이동 반대 방향 화염 트레일
    if (speedCurve < 0.8 && sz > 1) {
      const tailLen = sz * 3;
      const tailAngle = sa + Math.PI; // 반대 방향
      const tx1 = sx + Math.cos(tailAngle) * tailLen * 0.4;
      const ty1 = sy + Math.sin(tailAngle) * tailLen * 0.4 + riseHeight * 0.3;
      const tx2 = sx + Math.cos(tailAngle) * tailLen;
      const ty2 = sy + Math.sin(tailAngle) * tailLen + riseHeight * 0.6;
      // 꼬리 글로우
      g.lineStyle(sz * 0.8, sColor, sAlpha * 0.25);
      g.moveTo(sx, sy);
      g.lineTo(tx1, ty1);
      g.lineTo(tx2, ty2);
      // 꼬리 코어
      g.lineStyle(sz * 0.3, tempT < 0.4 ? 0xfbbf24 : 0xf97316, sAlpha * 0.5);
      g.moveTo(sx, sy);
      g.lineTo(tx1, ty1);
      g.lineStyle(0);
    }

    // 파편 글로우 (ADD)
    if (s % 2 === 0 && sAlpha > 0.2) {
      glow.beginFill(sColor, 0.08 * alpha);
      glow.drawCircle(_e.x + sx, _e.y + sy, sz * 2.5);
      glow.endFill();
    }
  }

  // ═══ 3. 연기 — 폭발 후 위로 피어오르는 잔화 ═══
  if (progress > 0.2 && progress < 0.95) {
    const smokeT = (progress - 0.2) / 0.75;
    const smokeCount = 6;
    for (let sm = 0; sm < smokeCount; sm++) {
      const smSeed = sm * 53.3 + 7;
      const sma = (sm / smokeCount) * Math.PI * 2 + Math.sin(smSeed) * 0.8;
      const smDist = R * 0.15 + R * 0.25 * smokeT;
      const smRise = smokeT * (12 + sm * 3); // 위로 상승
      const smDrift = Math.sin(frame * 0.04 + sm * 1.7) * 5; // 좌우 흔들림
      const smx = Math.cos(sma) * smDist + smDrift;
      const smy = Math.sin(sma) * smDist - smRise;
      const smSize = (3 + sm % 2) * (0.5 + smokeT * 1.5); // 커지며 퍼짐
      const smAlpha = (1 - smokeT) * 0.12 * alpha;
      // 연기 색상: 짙은 빨강 → 회색
      const smColor = smokeT < 0.4 ? 0xb91c1c : 0x78716c;
      g.beginFill(smColor, smAlpha);
      g.drawCircle(smx, smy, smSize);
      g.endFill();
    }
  }

  // ═══ 4. 바닥 잔불 — 폭발 지점에 작은 불씨 남음 ═══
  if (progress > 0.3 && progress < 1) {
    const emberT = (progress - 0.3) / 0.7;
    const emberCount = 5;
    for (let em = 0; em < emberCount; em++) {
      const emSeed = em * 31.7;
      const ema = (em / emberCount) * Math.PI * 2 + Math.sin(emSeed) * 0.6;
      const emDist = 5 + Math.sin(emSeed * 0.5) * 8;
      const emx = Math.cos(ema) * emDist;
      const emy = Math.sin(ema) * emDist;
      const emFlicker = 0.4 + Math.sin(frame * 0.15 + em * 2.3) * 0.3; // 깜빡임
      const emAlpha = (1 - emberT) * emFlicker * 0.5 * alpha;
      const emSize = 1.5 + Math.sin(frame * 0.1 + em) * 0.5;
      g.beginFill(0xf97316, emAlpha);
      g.drawCircle(emx, emy, emSize);
      g.endFill();
      // 불씨 글로우
      glow.beginFill(0xef4444, emAlpha * 0.3);
      glow.drawCircle(_e.x + emx, _e.y + emy, emSize * 3);
      glow.endFill();
    }
  }
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

    // ── Check for unique weapons first ──
    if (e.uniqueId) {
      switch (e.uniqueId) {
        case 'blackhole':
          drawBlackhole(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'bigbang':
          drawBigBang(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'sun':
          drawSun(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'tsunami':
          drawTsunami(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'tectonic':
          drawTectonic(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'tesla':
          drawTesla(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'judgment':
          drawJudgment(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'eclipse':
          drawEclipse(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'prism':
          drawPrism(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'abyss':
          drawAbyss(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'poison':
          drawPoison(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'thunder':
          drawThunder(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'auto_water':
          drawAutoWater(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'auto_earth':
          drawAutoEarth(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'auto_fire_splash':
          drawAutoFireSplash(g, glow, state.frameCount, e);
          g.x = e.x; g.y = e.y;
          continue;
        case 'auto_light':
          drawAutoLight(g, glow, state.frameCount, e);
          g.x = 0; g.y = 0; // 월드 좌표 직접 사용
          continue;
        case 'auto_electric':
          drawAutoElectric(g, glow, state.frameCount, e);
          // auto_electric은 월드 좌표 직접 사용 (두 점 사이)
          g.x = 0; g.y = 0;
          continue;
      }
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
