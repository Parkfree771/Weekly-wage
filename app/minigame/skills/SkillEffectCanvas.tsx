'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { Element, Tier } from './skillData';
import { ELEMENT_COLORS, getElementColor } from './skillData';

/* ── Types ── */
type EffectType =
  | 'blackhole' | 'lightning' | 'wave' | 'explosion' | 'beam'
  | 'projectile' | 'aura' | 'field' | 'trap' | 'vortex'
  | 'rain' | 'summon' | 'chain' | 'shield';

interface Props {
  elements: Element[];
  effectType: EffectType;
  tier: Tier;
  size?: number;
  autoPlay?: boolean;
}

/* ── Helpers ── */
const hex = (s: string) => parseInt(s.replace('#', ''), 16);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function colorLerp(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xFF, g1 = (c1 >> 8) & 0xFF, b1 = c1 & 0xFF;
  const r2 = (c2 >> 16) & 0xFF, g2 = (c2 >> 8) & 0xFF, b2 = c2 & 0xFF;
  return (Math.round(lerp(r1, r2, t)) << 16) |
         (Math.round(lerp(g1, g2, t)) << 8) |
          Math.round(lerp(b1, b2, t));
}

function pickColor(colors: number[], i: number): number {
  return colors[i % colors.length];
}

/* ── Particle ── */
interface P {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: number;
  alpha: number;
  kind: 'circle' | 'square' | 'ring' | 'spark';
  extra: number;
}

function mkP(x: number, y: number, vx: number, vy: number, life: number, size: number, color: number, kind: P['kind'] = 'circle', extra = 0): P {
  return { x, y, vx, vy, life, maxLife: life, size, color, alpha: 1, kind, extra };
}

/* ── Jagged lightning line ── */
function drawJagged(gfx: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, segs: number, jitter: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len;
  gfx.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const j = rand(-jitter, jitter);
    gfx.lineTo(lerp(x1, x2, t) + nx * j, lerp(y1, y2, t) + ny * j);
  }
  gfx.lineTo(x2, y2);
}

function drawBolt(gfx: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, segs: number, jitter: number, color: number, alpha: number, width: number) {
  gfx.lineStyle(width + 3, color, alpha * 0.3);
  drawJagged(gfx, x1, y1, x2, y2, segs, jitter);
  gfx.lineStyle(width, 0xFFFFFF, alpha * 0.9);
  drawJagged(gfx, x1, y1, x2, y2, segs, jitter);
  gfx.lineStyle(0);
}

/* ── Tier multiplier ── */
function tierMul(tier: Tier): number {
  switch (tier) {
    case 'SS': return 1.5;
    case 'S': return 1.3;
    case 'A': return 1.1;
    case 'B': return 0.9;
    case 'C': return 0.75;
    default: return 1;
  }
}

/* ── Constants ── */
const CYCLE = 210;

/* ═══════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════ */
export default function SkillEffectCanvas({ elements, effectType, tier, size = 200, autoPlay = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const playingRef = useRef(false);
  const visibleRef = useRef(false);
  const stateRef = useRef<Record<string, unknown>>({});

  const restart = useCallback(() => {
    stateRef.current = { frame: 0, particles: [], bolts: [], targets: [], pillars: [], shakeX: 0, shakeY: 0 };
    playingRef.current = true;
    if (appRef.current) appRef.current.ticker.start();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application({
      width: size, height: size,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    const canvas = app.view as HTMLCanvasElement;
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 },
    );
    observer.observe(canvas);

    if (autoPlay) {
      playingRef.current = true;
      visibleRef.current = true;
    } else {
      app.ticker.stop();
      playingRef.current = false;
    }

    const gfx = new PIXI.Graphics();
    app.stage.addChild(gfx);

    const glowContainer = new PIXI.Container();
    app.stage.addChild(glowContainer);
    const glowGfx = new PIXI.Graphics();
    glowGfx.blendMode = PIXI.BLEND_MODES.ADD;
    glowContainer.addChild(glowGfx);

    const CX = size / 2, CY = size / 2;
    const mul = tierMul(tier);
    const colors = elements.map(el => hex(getElementColor(el)));
    const c0 = colors[0], c1 = colors[1 % colors.length], c2 = colors[2 % colors.length];

    // Draw initial idle state: element color dots
    const drawIdle = () => {
      gfx.clear();
      glowGfx.clear();
      const unique = [...new Set(elements)];
      const uColors = unique.map(el => hex(getElementColor(el)));
      const spacing = 25;
      const startX = CX - (uColors.length - 1) * spacing / 2;
      uColors.forEach((c, idx) => {
        gfx.beginFill(c, 0.15);
        gfx.drawCircle(startX + idx * spacing, CY, 16);
        gfx.endFill();
        gfx.beginFill(c, 0.7);
        gfx.drawCircle(startX + idx * spacing, CY, 8);
        gfx.endFill();
      });
    };
    drawIdle();

    const S = stateRef.current;
    S.frame = 0;
    S.particles = [];

    const particles = () => S.particles as P[];

    const tickFn = () => {
      if (!visibleRef.current) return;
      const frame = (S.frame as number);
      S.frame = frame + 1;

      if (frame >= CYCLE) {
        playingRef.current = false;
        app.ticker.stop();
        drawIdle();
        return;
      }

      gfx.clear();
      glowGfx.clear();

      // Apply screen shake
      const shakeX = (S.shakeX as number) || 0;
      const shakeY = (S.shakeY as number) || 0;
      app.stage.x = shakeX;
      app.stage.y = shakeY;
      S.shakeX = shakeX * 0.85;
      S.shakeY = shakeY * 0.85;

      const t = frame / CYCLE;
      const ps = particles();

      // Update and draw all generic particles
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) { ps.splice(i, 1); continue; }

        const lt = 1 - p.life / p.maxLife;
        const a = p.alpha * (lt < 0.1 ? lt / 0.1 : lt > 0.75 ? (1 - lt) / 0.25 : 1);
        const sz = p.size * (lt < 0.2 ? lerp(0.5, 1, lt / 0.2) : lerp(1, 0.15, (lt - 0.2) / 0.8));

        if (sz < 0.3 || a < 0.01) continue;

        switch (p.kind) {
          case 'circle':
            glowGfx.beginFill(p.color, a * 0.2);
            glowGfx.drawCircle(p.x, p.y, sz * 2);
            glowGfx.endFill();
            gfx.beginFill(p.color, a * 0.9);
            gfx.drawCircle(p.x, p.y, sz);
            gfx.endFill();
            break;
          case 'square':
            gfx.beginFill(p.color, a * 0.85);
            gfx.drawRect(p.x - sz, p.y - sz, sz * 2, sz * 2);
            gfx.endFill();
            break;
          case 'ring':
            gfx.lineStyle(Math.max(1, sz * 0.4), p.color, a * 0.6);
            gfx.drawCircle(p.x, p.y, sz * 1.5);
            gfx.lineStyle(0);
            break;
          case 'spark':
            glowGfx.beginFill(p.color, a * 0.35);
            glowGfx.drawCircle(p.x, p.y, sz * 1.5);
            glowGfx.endFill();
            gfx.beginFill(0xFFFFFF, a * 0.95);
            gfx.drawCircle(p.x, p.y, sz * 0.5);
            gfx.endFill();
            break;
        }
      }

      /* ═══════════════════════════════════════════
         S급/SS급 고유 이펙트 (스킬 ID 기반)
         ═══════════════════════════════════════════ */
      const sortedEls = [...elements].sort().join(',');
      let handled = false;

      // ── S급: 빛×3 "영겁의 광휘" — 빅뱅/초신성 ──
      if (sortedEls === '빛,빛,빛') {
        handled = true;
        const phase1 = frame < 40;   // 축적
        const phase2 = frame >= 40 && frame < 80;  // 빅뱅
        const phase3 = frame >= 80;  // 여파

        // Phase 1: 중심에 에너지 축적 — 점점 밝아지는 구체
        if (phase1) {
          const grow = frame / 40;
          const r = 5 + grow * 15;
          glowGfx.beginFill(0xfef08a, grow * 0.4);
          glowGfx.drawCircle(CX, CY, r + 20);
          glowGfx.endFill();
          gfx.beginFill(0xFFFFFF, grow * 0.8);
          gfx.drawCircle(CX, CY, r);
          gfx.endFill();
          // 흡인 파티클
          if (frame % 2 === 0) {
            for (let i = 0; i < 4; i++) {
              const a = rand(0, Math.PI * 2);
              const d = rand(60, 95);
              ps.push(mkP(CX + Math.cos(a) * d, CY + Math.sin(a) * d,
                -Math.cos(a) * 1.5, -Math.sin(a) * 1.5,
                randInt(15, 25), rand(1, 3), 0xfbbf24, 'spark'));
            }
          }
        }

        // Phase 2: 빅뱅 폭발 — 화면 전체 백색 플래시 + 거대 충격파
        if (phase2) {
          const t2 = (frame - 40) / 40;
          // 화면 플래시
          const flashA = t2 < 0.2 ? 1 : Math.max(0, 1 - (t2 - 0.2) / 0.8);
          gfx.beginFill(0xFFFFFF, flashA * 0.6);
          gfx.drawRect(0, 0, size, size);
          gfx.endFill();
          // 거대 충격파 링 3중
          for (let r = 0; r < 3; r++) {
            const ringT = Math.max(0, t2 - r * 0.1);
            const ringR = ringT * size * 0.8;
            const ringA = Math.max(0, (1 - ringT) * 0.6);
            const ringColor = r === 0 ? 0xFFFFFF : r === 1 ? 0xfef08a : 0xfbbf24;
            gfx.lineStyle(4 * (1 - ringT) + 1, ringColor, ringA);
            gfx.drawCircle(CX, CY, ringR);
          }
          gfx.lineStyle(0);
          // 폭발 파편
          if (frame === 40) {
            for (let i = 0; i < 30; i++) {
              const a = rand(0, Math.PI * 2);
              const sp = rand(2, 5);
              ps.push(mkP(CX, CY, Math.cos(a) * sp, Math.sin(a) * sp,
                randInt(40, 80), rand(2, 5),
                Math.random() > 0.5 ? 0xfef08a : 0xFFFFFF, Math.random() > 0.3 ? 'circle' : 'spark'));
            }
            S.shakeX = rand(-6, 6); S.shakeY = rand(-6, 6);
          }
        }

        // Phase 3: 잔광 — 빛 입자들이 천천히 퍼짐
        if (phase3) {
          const fadeA = Math.max(0, 1 - (frame - 80) / 130);
          glowGfx.beginFill(0xfef08a, fadeA * 0.1);
          glowGfx.drawCircle(CX, CY, 60);
          glowGfx.endFill();
          // 부유 광 입자
          if (frame % 6 === 0 && frame < 180) {
            const a = rand(0, Math.PI * 2);
            ps.push(mkP(CX + rand(-30, 30), CY + rand(-30, 30),
              Math.cos(a) * 0.3, Math.sin(a) * 0.3,
              randInt(20, 40), rand(1, 3), 0xfbbf24, 'spark'));
          }
        }
      }

      // ── S급: 불×3 "업화연옥" — 태양 ──
      if (sortedEls === '불,불,불') {
        handled = true;
        // 거대 태양 구체
        const sunR = 20 + 5 * Math.sin(frame * 0.05);
        const coronaR = sunR + 15 + 8 * Math.sin(frame * 0.03);

        // 코로나 (외곽 글로우)
        glowGfx.beginFill(0xf97316, 0.15 + 0.05 * Math.sin(frame * 0.04));
        glowGfx.drawCircle(CX, CY, coronaR + 20);
        glowGfx.endFill();
        glowGfx.beginFill(0xef4444, 0.2);
        glowGfx.drawCircle(CX, CY, coronaR);
        glowGfx.endFill();

        // 태양 표면 (밝은 중심)
        gfx.beginFill(0xf97316, 0.9);
        gfx.drawCircle(CX, CY, sunR);
        gfx.endFill();
        gfx.beginFill(0xFFFFFF, 0.5);
        gfx.drawCircle(CX, CY, sunR * 0.5);
        gfx.endFill();

        // 태양 플레어 (불규칙한 돌출)
        if (frame < 200) {
          for (let f = 0; f < 8; f++) {
            const flareAngle = (f / 8) * Math.PI * 2 + Math.sin(frame * 0.02 + f) * 0.5;
            const flareLen = coronaR + rand(5, 30) * (0.7 + 0.3 * Math.sin(frame * 0.08 + f * 1.5));
            const fx = CX + Math.cos(flareAngle) * flareLen;
            const fy = CY + Math.sin(flareAngle) * flareLen;
            gfx.lineStyle(2.5, 0xef4444, 0.5);
            gfx.moveTo(CX + Math.cos(flareAngle) * sunR, CY + Math.sin(flareAngle) * sunR);
            gfx.lineTo(fx, fy);
          }
          gfx.lineStyle(0);
        }

        // 화염 파티클 분출
        if (frame % 2 === 0 && frame < 190) {
          for (let i = 0; i < 3; i++) {
            const a = rand(0, Math.PI * 2);
            const sp = rand(0.8, 2.5);
            ps.push(mkP(
              CX + Math.cos(a) * sunR, CY + Math.sin(a) * sunR,
              Math.cos(a) * sp, Math.sin(a) * sp,
              randInt(20, 50), rand(1.5, 4),
              Math.random() > 0.5 ? 0xef4444 : 0xf97316, 'circle'));
          }
        }

        // 열기 왜곡 — 화면 가장자리 붉은 비네트
        gfx.beginFill(0xef4444, 0.04 + 0.02 * Math.sin(frame * 0.06));
        gfx.drawRect(0, 0, size, size);
        gfx.endFill();
      }

      // ── S급: 흙×3 "대지의 심장" — 지각변동 ──
      if (sortedEls === '흙,흙,흙') {
        handled = true;
        const quakePhase = frame < 60;
        const pillarPhase = frame >= 30 && frame < 160;

        // 화면 진동
        if (quakePhase) {
          const intensity = Math.sin(frame * 0.5) * 3 * (1 - frame / 60);
          S.shakeX = intensity * rand(-1, 1);
          S.shakeY = intensity * rand(-1, 1);
        }

        // 바닥 균열 선
        if (frame > 10 && frame < 180) {
          const crackA = Math.min(1, (frame - 10) / 30) * 0.5;
          gfx.lineStyle(2, 0xa16207, crackA);
          for (let c = 0; c < 5; c++) {
            const cx1 = CX + Math.cos(c * 1.26) * 10;
            const cy1 = CY + Math.sin(c * 1.26) * 10;
            const cx2 = CX + Math.cos(c * 1.26) * (50 + Math.sin(frame * 0.05 + c) * 15);
            const cy2 = CY + Math.sin(c * 1.26) * (50 + Math.sin(frame * 0.05 + c) * 15);
            drawJagged(gfx, cx1, cy1, cx2, cy2, 4, 8);
          }
          gfx.lineStyle(0);
        }

        // 돌기둥 8개 원형 솟아오름
        if (pillarPhase) {
          for (let p = 0; p < 8; p++) {
            const pillarStart = 30 + p * 10;
            if (frame < pillarStart) continue;
            const elapsed = frame - pillarStart;
            const pAngle = (p / 8) * Math.PI * 2;
            const pDist = 50;
            const px = CX + Math.cos(pAngle) * pDist;
            const baseY = CY + Math.sin(pAngle) * pDist;
            const pillarH = Math.min(40, elapsed * 2);
            const pillarW = 8;

            gfx.beginFill(0xa16207, 0.8);
            gfx.drawRect(px - pillarW / 2, baseY - pillarH, pillarW, pillarH);
            gfx.endFill();
            gfx.beginFill(0x65a30d, 0.9);
            gfx.drawRect(px - pillarW / 2 - 1, baseY - pillarH - 2, pillarW + 2, 3);
            gfx.endFill();

            // 솟아오를 때 파편
            if (elapsed === 1) {
              for (let d = 0; d < 4; d++) {
                const da = rand(-Math.PI, 0);
                ps.push(mkP(px, baseY - pillarH,
                  Math.cos(da) * rand(0.5, 2), Math.sin(da) * rand(0.5, 2),
                  randInt(10, 20), rand(2, 4), 0xa16207, 'square'));
              }
              S.shakeX = rand(-2, 2); S.shakeY = rand(-1, 1);
            }
          }
        }
      }

      // ── S급: 물×3 "대해일" — 쓰나미 ──
      if (sortedEls === '물,물,물') {
        handled = true;
        const waveProgress = frame / CYCLE;
        const waveX = lerp(-50, size + 50, waveProgress * 1.2);
        const waveH = size; // 화면 전체 높이

        // 거대 파도 벽 (다중 레이어)
        for (let layer = 0; layer < 3; layer++) {
          const layerOffset = layer * 15;
          const layerAlpha = 0.4 - layer * 0.1;
          const lColor = layer === 0 ? 0x3b82f6 : layer === 1 ? 0x06b6d4 : 0x2563eb;

          for (let y = 0; y < waveH; y += 4) {
            const curve = Math.sin(y * 0.03 + frame * 0.08 + layer) * 25;
            const topCurl = y < 30 ? Math.pow(y / 30, 0.5) * 20 : 0;
            const px = waveX + curve - layerOffset + topCurl;
            gfx.beginFill(lColor, layerAlpha);
            gfx.drawCircle(px, y, rand(3, 5));
            gfx.endFill();
          }
        }

        // 파도 앞 물보라 (백색)
        if (frame % 2 === 0 && frame < 180) {
          for (let i = 0; i < 5; i++) {
            const fy = rand(0, size);
            const curve = Math.sin(fy * 0.03 + frame * 0.08) * 25;
            ps.push(mkP(waveX + curve + rand(5, 20), fy,
              rand(1, 3), rand(-1, 1),
              randInt(8, 18), rand(1.5, 3),
              0xFFFFFF, 'circle'));
          }
        }

        // 뒤에 남는 물
        if (waveProgress > 0.3) {
          const waterLevel = size * 0.85;
          gfx.beginFill(0x3b82f6, 0.08);
          gfx.drawRect(0, waterLevel, Math.min(waveX, size), size - waterLevel);
          gfx.endFill();
          // 파문
          if (frame % 10 === 0) {
            const rippleX = rand(0, Math.min(waveX - 20, size));
            gfx.lineStyle(1, 0x06b6d4, 0.2);
            gfx.drawEllipse(rippleX, waterLevel, rand(5, 15), 3);
            gfx.lineStyle(0);
          }
        }

        // 파도 글로우
        glowGfx.lineStyle(15, 0x3b82f6, 0.08);
        glowGfx.moveTo(waveX, 0);
        for (let y = 0; y <= size; y += 8) {
          const curve = Math.sin(y * 0.03 + frame * 0.08) * 25;
          glowGfx.lineTo(waveX + curve, y);
        }
        glowGfx.lineStyle(0);
      }

      // ── S급: 전기×3 "테슬라 필드" — 뇌신 (번개 난무) ──
      if (sortedEls === '전기,전기,전기') {
        handled = true;
        // 중앙 전자기 코어
        const coreR = 12 + 3 * Math.sin(frame * 0.1);
        glowGfx.beginFill(0xa78bfa, 0.3);
        glowGfx.drawCircle(CX, CY, coreR + 15);
        glowGfx.endFill();
        gfx.beginFill(0xFFFFFF, 0.8);
        gfx.drawCircle(CX, CY, coreR * 0.4);
        gfx.endFill();
        gfx.beginFill(0xa78bfa, 0.6);
        gfx.drawCircle(CX, CY, coreR);
        gfx.endFill();

        // 전자기 필드 링
        gfx.lineStyle(1.5, 0x38bdf8, 0.2 + 0.1 * Math.sin(frame * 0.06));
        gfx.drawCircle(CX, CY, 50 + 5 * Math.sin(frame * 0.04));
        gfx.lineStyle(0);

        // 매 프레임 번개 6~10개 난사
        if (frame < 190) {
          const numBolts = randInt(4, 8);
          for (let b = 0; b < numBolts; b++) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(30, 90);
            const ex = CX + Math.cos(angle) * dist;
            const ey = CY + Math.sin(angle) * dist;
            const bColor = Math.random() > 0.5 ? 0xa78bfa : 0x38bdf8;
            drawBolt(gfx, CX, CY, ex, ey, randInt(3, 6), dist * 0.2, bColor, rand(0.4, 0.8), rand(1, 2));

            // 가지 번개
            if (Math.random() < 0.3) {
              const midT = rand(0.4, 0.7);
              const mx = lerp(CX, ex, midT);
              const my = lerp(CY, ey, midT);
              const ba = angle + rand(-1, 1);
              const bd = rand(15, 35);
              drawBolt(gfx, mx, my, mx + Math.cos(ba) * bd, my + Math.sin(ba) * bd,
                3, bd * 0.25, bColor, 0.4, 1);
            }
          }
        }

        // 스파크 파티클
        if (frame % 2 === 0 && frame < 190) {
          const a = rand(0, Math.PI * 2);
          const sp = rand(1.5, 3.5);
          ps.push(mkP(CX, CY, Math.cos(a) * sp, Math.sin(a) * sp,
            randInt(6, 15), rand(1, 2.5),
            Math.random() > 0.5 ? 0xa78bfa : 0x38bdf8, 'spark'));
        }

        // 글리치 효과 — 간헐적 화면 반전 플래시
        if (frame % 35 < 2 && frame < 180) {
          gfx.beginFill(0xFFFFFF, 0.1);
          gfx.drawRect(0, 0, size, size);
          gfx.endFill();
        }
      }

      // ── SS급: 빛+암흑+전기 "심판의 뇌격" ──
      if (sortedEls === '빛,암흑,전기') {
        handled = true;
        const phase1 = frame < 50;  // 구체 생성
        const phase2 = frame >= 50 && frame < 120;  // 방전
        const phase3 = frame >= 120;  // 소멸

        if (phase1) {
          const grow = frame / 50;
          // 빛+암흑 뒤섞인 구체
          gfx.beginFill(0x1e1b4b, 0.8 * grow);
          gfx.drawCircle(CX, CY, 18 * grow);
          gfx.endFill();
          gfx.beginFill(0xfef08a, 0.4 * grow);
          gfx.drawCircle(CX + 3 * Math.sin(frame * 0.2), CY + 3 * Math.cos(frame * 0.2), 10 * grow);
          gfx.endFill();
          glowGfx.beginFill(0x7c3aed, grow * 0.3);
          glowGfx.drawCircle(CX, CY, 30 * grow);
          glowGfx.endFill();
        }

        if (phase2) {
          // 구체 유지
          gfx.beginFill(0x1e1b4b, 0.7);
          gfx.drawCircle(CX, CY, 18);
          gfx.endFill();
          gfx.beginFill(0xfef08a, 0.5);
          gfx.drawCircle(CX + 3 * Math.sin(frame * 0.2), CY + 3 * Math.cos(frame * 0.2), 10);
          gfx.endFill();

          // 전방위 번개 방전
          const numBolts = randInt(6, 12);
          for (let b = 0; b < numBolts; b++) {
            const a = rand(0, Math.PI * 2);
            const d = rand(40, 95);
            const bColor = [0xfef08a, 0x7c3aed, 0xa78bfa][b % 3];
            drawBolt(gfx, CX, CY, CX + Math.cos(a) * d, CY + Math.sin(a) * d,
              randInt(4, 7), d * 0.2, bColor, rand(0.5, 0.9), rand(1, 2.5));
          }

          // 흑백 플래시
          if ((frame - 50) % 20 < 2) {
            gfx.beginFill(0xFFFFFF, 0.15);
            gfx.drawRect(0, 0, size, size);
            gfx.endFill();
          }
          S.shakeX = rand(-2, 2); S.shakeY = rand(-2, 2);
        }

        if (phase3) {
          const fadeT = (frame - 120) / (CYCLE - 120);
          glowGfx.beginFill(0x7c3aed, (1 - fadeT) * 0.15);
          glowGfx.drawCircle(CX, CY, 30 * (1 - fadeT));
          glowGfx.endFill();
          if (frame % 8 === 0 && fadeT < 0.7) {
            const a = rand(0, Math.PI * 2);
            ps.push(mkP(CX, CY, Math.cos(a) * 0.5, Math.sin(a) * 0.5,
              randInt(15, 25), rand(1, 2), 0xa78bfa, 'spark'));
          }
        }
      }

      // ── SS급: 빛+암흑+불 "종말의 일식" ──
      if (sortedEls === '빛,암흑,불') {
        handled = true;
        // 태양이 암흑에 삼켜지며 흑염 비
        const eclipseT = Math.min(1, frame / 80);

        // 태양 (점점 가려짐)
        gfx.beginFill(0xfbbf24, 0.7 * (1 - eclipseT * 0.7));
        gfx.drawCircle(CX, CY, 20);
        gfx.endFill();
        // 암흑 침식
        gfx.beginFill(0x1e1b4b, eclipseT * 0.9);
        gfx.drawCircle(CX + 5 * eclipseT, CY - 3 * eclipseT, 22);
        gfx.endFill();
        // 코로나 잔광
        glowGfx.beginFill(0xef4444, (1 - eclipseT * 0.5) * 0.15);
        glowGfx.drawCircle(CX, CY, 35);
        glowGfx.endFill();

        // 흑염 비 (검은 불 파티클 내림)
        if (frame > 40 && frame < 200) {
          const rainCount = Math.floor(3 + eclipseT * 4);
          for (let i = 0; i < rainCount; i++) {
            const rx = rand(0, size);
            ps.push(mkP(rx, rand(-5, 0),
              rand(-0.3, 0.3), rand(1.5, 3.5),
              randInt(25, 50), rand(2, 4),
              Math.random() > 0.4 ? 0x1e1b4b : 0xef4444,
              Math.random() > 0.5 ? 'circle' : 'spark'));
          }
        }

        // 화면 어두워짐
        gfx.beginFill(0x000000, eclipseT * 0.15);
        gfx.drawRect(0, 0, size, size);
        gfx.endFill();
      }

      // ── SS급: 빛+암흑+물 "심연의 조류" ──
      if (sortedEls === '물,빛,암흑') {
        handled = true;
        // 차원 균열 + 소용돌이 흡인 + 충격파

        // 중앙 균열
        const crackW = 4 + 2 * Math.sin(frame * 0.05);
        gfx.beginFill(0x7c3aed, 0.7);
        gfx.drawEllipse(CX, CY, crackW, 25 + 5 * Math.sin(frame * 0.03));
        gfx.endFill();
        gfx.beginFill(0xFFFFFF, 0.3);
        gfx.drawEllipse(CX, CY, crackW * 0.3, 15);
        gfx.endFill();
        glowGfx.beginFill(0x3b82f6, 0.15);
        glowGfx.drawCircle(CX, CY, 40);
        glowGfx.endFill();

        // 소용돌이 흡인 파티클
        if (frame % 2 === 0 && frame < 190) {
          for (let i = 0; i < 4; i++) {
            const a = rand(0, Math.PI * 2);
            const d = rand(50, 90);
            const spd = rand(0.5, 1.2);
            ps.push(mkP(CX + Math.cos(a) * d, CY + Math.sin(a) * d,
              -Math.cos(a) * spd + Math.sin(a) * 0.6,
              -Math.sin(a) * spd - Math.cos(a) * 0.6,
              randInt(30, 55), rand(1.5, 3),
              [0xfef08a, 0x7c3aed, 0x3b82f6][i % 3], 'circle'));
          }
        }

        // 주기적 충격파
        if (frame % 50 === 25 && frame < 180) {
          const ringStart = frame;
          // 간단히 바로 그리기
          for (let r = 0; r < 20; r++) {
            const rt = r / 20;
            const ringR = rt * 80;
            gfx.lineStyle(2 * (1 - rt), 0x3b82f6, (1 - rt) * 0.3);
            gfx.drawCircle(CX, CY, ringR);
          }
          gfx.lineStyle(0);
        }
      }

      // ── SS급: 불+물+암흑 "독무의 늪" ──
      if (sortedEls === '물,불,암흑') {
        handled = true;
        // 독안개 전체 지속딜

        // 전체 독안개 (어두운 보라+녹색)
        const fogA = Math.min(0.2, frame / 100 * 0.2);
        gfx.beginFill(0x1a0a2e, fogA);
        gfx.drawRect(0, 0, size, size);
        gfx.endFill();

        // 독기 파티클 (보라 + 녹색 계열)
        if (frame % 3 === 0 && frame < 200) {
          for (let i = 0; i < 4; i++) {
            const poisonColors = [0x7c3aed, 0x22c55e, 0x1e1b4b, 0x15803d];
            ps.push(mkP(rand(10, size - 10), rand(size * 0.5, size),
              rand(-0.4, 0.4), rand(-1, -0.3),
              randInt(40, 70), rand(3, 7),
              poisonColors[i % 4], 'circle'));
          }
        }

        // 바닥 늪 장판
        gfx.beginFill(0x15803d, 0.1 + 0.03 * Math.sin(frame * 0.04));
        gfx.drawEllipse(CX, size * 0.8, size * 0.45, 20);
        gfx.endFill();

        // 거품
        if (frame % 8 === 0 && frame < 190) {
          const bx = CX + rand(-60, 60);
          gfx.lineStyle(1, 0x22c55e, 0.3);
          gfx.drawCircle(bx, size * 0.8 + rand(-5, 5), rand(2, 5));
          gfx.lineStyle(0);
        }
      }

      // ── SS급: 전기+흙+빛 "천둥벽력" ──
      if (sortedEls === '빛,전기,흙') {
        handled = true;
        // 빛기둥 3개 + 전류 연결 삼각형

        const pillarPositions = [
          { x: CX, y: CY - 35 },
          { x: CX - 30, y: CY + 20 },
          { x: CX + 30, y: CY + 20 },
        ];

        // 땅 갈라짐
        if (frame < 30) {
          S.shakeX = rand(-3, 3) * (1 - frame / 30);
          S.shakeY = rand(-3, 3) * (1 - frame / 30);
        }

        // 빛기둥 솟아오름
        for (let i = 0; i < 3; i++) {
          const start = i * 15;
          if (frame < start) continue;
          const elapsed = frame - start;
          const pp = pillarPositions[i];
          const pillarH = Math.min(50, elapsed * 2.5);

          // 빛기둥
          glowGfx.beginFill(0xfef08a, 0.15);
          glowGfx.drawRect(pp.x - 6, pp.y - pillarH, 12, pillarH);
          glowGfx.endFill();
          gfx.beginFill(0xfef08a, 0.7);
          gfx.drawRect(pp.x - 3, pp.y - pillarH, 6, pillarH);
          gfx.endFill();
          gfx.beginFill(0xFFFFFF, 0.9);
          gfx.drawRect(pp.x - 2, pp.y - pillarH, 4, 4);
          gfx.endFill();

          if (elapsed === 1) {
            S.shakeX = rand(-2, 2); S.shakeY = rand(-1, 1);
          }
        }

        // 전류 연결 삼각형 (기둥 다 올라온 후)
        if (frame > 50 && frame < 190) {
          for (let i = 0; i < 3; i++) {
            const from = pillarPositions[i];
            const to = pillarPositions[(i + 1) % 3];
            const topY1 = from.y - Math.min(50, (frame - 15 * i) * 2.5);
            const topY2 = to.y - Math.min(50, (frame - 15 * ((i + 1) % 3)) * 2.5);
            drawBolt(gfx, from.x, topY1, to.x, topY2,
              randInt(4, 6), 12, 0xa78bfa, 0.7, 1.5);
          }

          // 삼각형 내부 글로우
          glowGfx.beginFill(0xa78bfa, 0.05 + 0.03 * Math.sin(frame * 0.1));
          glowGfx.moveTo(pillarPositions[0].x, pillarPositions[0].y - 50);
          glowGfx.lineTo(pillarPositions[1].x, pillarPositions[1].y - 50);
          glowGfx.lineTo(pillarPositions[2].x, pillarPositions[2].y - 50);
          glowGfx.closePath();
          glowGfx.endFill();
        }
      }

      // ── SS급: 불+물+빛 "프리즘 증기" — 무지개 광선 ──
      if (sortedEls === '물,불,빛') {
        handled = true;
        const numBeams = 7;
        const rainbow = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0088ff, 0x0000ff, 0x8800ff];
        const rotBase = frame * 0.02;

        // 중앙 프리즘 구체
        glowGfx.beginFill(0xFFFFFF, 0.4 + 0.1 * Math.sin(frame * 0.08));
        glowGfx.drawCircle(CX, CY, 12);
        glowGfx.endFill();

        // 7색 광선 방사
        if (frame < 190) {
          for (let b = 0; b < numBeams; b++) {
            const angle = rotBase + (b / numBeams) * Math.PI * 2;
            const beamLen = 85;
            const ex = CX + Math.cos(angle) * beamLen;
            const ey = CY + Math.sin(angle) * beamLen;
            const rc = rainbow[b];

            gfx.lineStyle(8, rc, 0.12);
            gfx.moveTo(CX, CY); gfx.lineTo(ex, ey);
            gfx.lineStyle(3, rc, 0.35);
            gfx.moveTo(CX, CY); gfx.lineTo(ex, ey);
            gfx.lineStyle(1, 0xFFFFFF, 0.7);
            gfx.moveTo(CX, CY); gfx.lineTo(ex, ey);
            gfx.lineStyle(0);

            if (frame % 5 === 0) {
              const pt = rand(0.3, 0.9);
              ps.push(mkP(lerp(CX, ex, pt), lerp(CY, ey, pt),
                rand(-0.3, 0.3), rand(-0.3, 0.3),
                randInt(10, 20), rand(1, 2.5), rc, 'spark'));
            }
          }
        }
      }

      /* ═══════════════════════════════════════════
         일반 Effect-specific rendering (A/B/C급)
         ═══════════════════════════════════════════ */
      if (!handled) switch (effectType) {

        /* ────────── 1. BLACKHOLE ────────── */
        case 'blackhole': {
          const pulseR = 12 + 6 * Math.sin(frame * 0.08) * mul;
          const burstPhase = frame > 170;

          // Dark center
          gfx.beginFill(0x0a0010, 0.95);
          gfx.drawCircle(CX, CY, pulseR);
          gfx.endFill();

          // Accretion disk (rotating ellipse)
          const diskAngle = frame * 0.03;
          const diskRx = 40 * mul, diskRy = 8;
          gfx.lineStyle(2, c0, 0.5);
          gfx.moveTo(CX + Math.cos(diskAngle) * diskRx, CY + Math.sin(diskAngle) * diskRy);
          for (let a = 0; a <= Math.PI * 2; a += 0.1) {
            const px = CX + Math.cos(a + diskAngle) * diskRx;
            const py = CY + Math.sin(a + diskAngle) * diskRy;
            gfx.lineTo(px, py);
          }
          gfx.lineStyle(0);

          // Inward-spiraling particles
          if (frame < 160 && frame % 2 === 0) {
            const count = Math.floor(3 * mul);
            for (let i = 0; i < count; i++) {
              const angle = rand(0, Math.PI * 2);
              const dist = rand(50, 90) * mul;
              const sx = CX + Math.cos(angle) * dist;
              const sy = CY + Math.sin(angle) * dist;
              const speed = rand(0.6, 1.2);
              ps.push(mkP(sx, sy,
                -Math.cos(angle) * speed + Math.sin(angle) * 0.4,
                -Math.sin(angle) * speed - Math.cos(angle) * 0.4,
                randInt(40, 70), rand(1.5, 3.5),
                pickColor(colors, i), 'circle'));
            }
          }

          // Burst phase
          if (burstPhase && frame % 3 === 0) {
            for (let i = 0; i < 5; i++) {
              const angle = rand(0, Math.PI * 2);
              const speed = rand(1.5, 3.5);
              ps.push(mkP(CX, CY,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(15, 30), rand(2, 4),
                colorLerp(c0, 0xFFFFFF, 0.3), 'spark'));
            }
          }

          // Inner glow
          glowGfx.beginFill(c0, 0.15 + 0.1 * Math.sin(frame * 0.1));
          glowGfx.drawCircle(CX, CY, pulseR + 5);
          glowGfx.endFill();
          break;
        }

        /* ────────── 2. LIGHTNING ────────── */
        case 'lightning': {
          // Bright flash at origin
          const flashA = frame < 10 ? (10 - frame) / 10 : (frame % 30 < 3 ? 0.3 : 0);
          if (flashA > 0) {
            glowGfx.beginFill(0xFFFFFF, flashA);
            glowGfx.drawCircle(CX, CY, 15);
            glowGfx.endFill();
          }

          // Origin orb
          gfx.beginFill(0xFFFFFF, 0.9);
          gfx.drawCircle(CX, CY, 4);
          gfx.endFill();
          glowGfx.beginFill(c0, 0.4);
          glowGfx.drawCircle(CX, CY, 10);
          glowGfx.endFill();

          // Redraw bolts every 3 frames for dancing effect
          if (frame < 180 && frame % 3 === 0) {
            const numBolts = Math.floor(4 + 2 * mul);
            for (let b = 0; b < numBolts; b++) {
              const angle = (b / numBolts) * Math.PI * 2 + rand(-0.3, 0.3);
              const dist = rand(50, 90) * mul;
              const ex = CX + Math.cos(angle) * dist;
              const ey = CY + Math.sin(angle) * dist;
              const segs = randInt(4, 6);
              const jitter = dist * 0.2;
              const boltColor = pickColor(colors, b);
              drawBolt(gfx, CX, CY, ex, ey, segs, jitter, boltColor, 0.85, 1.5);

              // Branch bolts (30% chance per segment)
              const midT = rand(0.3, 0.7);
              if (Math.random() < 0.3) {
                const mx = lerp(CX, ex, midT) + rand(-8, 8);
                const my = lerp(CY, ey, midT) + rand(-8, 8);
                const branchAngle = angle + rand(-0.8, 0.8);
                const branchDist = rand(15, 35);
                const bex = mx + Math.cos(branchAngle) * branchDist;
                const bey = my + Math.sin(branchAngle) * branchDist;
                drawBolt(gfx, mx, my, bex, bey, 3, branchDist * 0.2, boltColor, 0.5, 1);
              }
            }
          }

          // Small spark particles
          if (frame < 170 && frame % 4 === 0) {
            for (let i = 0; i < 2; i++) {
              const angle = rand(0, Math.PI * 2);
              const speed = rand(1, 3);
              ps.push(mkP(CX + rand(-5, 5), CY + rand(-5, 5),
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(8, 20), rand(1, 2.5),
                pickColor(colors, i), 'spark'));
            }
          }
          break;
        }

        /* ────────── 3. WAVE ────────── */
        case 'wave': {
          const waveX = lerp(-30, size + 30, t);
          const waveH = 60 * mul * (0.7 + 0.3 * Math.sin(frame * 0.06));
          const numDots = Math.floor(25 * mul);

          // Sine wave wall of particles
          for (let i = 0; i < numDots; i++) {
            const yy = (i / numDots) * size;
            const offset = Math.sin(yy * 0.05 + frame * 0.1) * waveH * 0.5;
            const px = waveX + offset;
            const wColor = pickColor(colors, i);
            gfx.beginFill(wColor, 0.8);
            gfx.drawCircle(px, yy, rand(2, 4));
            gfx.endFill();
          }

          // Foam/splash at wave front (white)
          if (frame % 2 === 0 && frame < 190) {
            for (let i = 0; i < 3; i++) {
              const fy = rand(0, size);
              const offset = Math.sin(fy * 0.05 + frame * 0.1) * waveH * 0.5;
              ps.push(mkP(waveX + offset + rand(-3, 8), fy,
                rand(0.5, 2), rand(-0.5, 0.5),
                randInt(10, 20), rand(1.5, 3),
                0xFFFFFF, 'circle'));
            }
          }

          // Trailing water droplets
          if (frame % 3 === 0 && frame < 180) {
            for (let i = 0; i < 2; i++) {
              const fy = rand(10, size - 10);
              ps.push(mkP(waveX - rand(10, 40), fy,
                rand(-0.2, 0.3), rand(-0.8, 0.8),
                randInt(15, 35), rand(1, 2.5),
                pickColor(colors, i), 'circle'));
            }
          }

          // Wave glow line
          glowGfx.lineStyle(8, c0, 0.15);
          glowGfx.moveTo(waveX, 0);
          for (let yy = 0; yy <= size; yy += 5) {
            const offset = Math.sin(yy * 0.05 + frame * 0.1) * waveH * 0.5;
            glowGfx.lineTo(waveX + offset, yy);
          }
          glowGfx.lineStyle(0);
          break;
        }

        /* ────────── 4. EXPLOSION ────────── */
        case 'explosion': {
          // Phase 1: bright center flash (0-20)
          if (frame < 20) {
            const flashAlpha = (20 - frame) / 20;
            gfx.beginFill(0xFFFFFF, flashAlpha);
            gfx.drawCircle(CX, CY, 10 + frame * 2);
            gfx.endFill();
            glowGfx.beginFill(c0, flashAlpha * 0.5);
            glowGfx.drawCircle(CX, CY, 20 + frame * 3);
            glowGfx.endFill();
          }

          // Shockwave ring 1 (frame 5-60)
          if (frame >= 5 && frame < 60) {
            const rt = (frame - 5) / 55;
            const ringR = lerp(5, 90 * mul, rt);
            const ringA = rt < 0.3 ? 1 : (1 - rt) / 0.7;
            gfx.lineStyle(3 * (1 - rt) + 1, c0, ringA * 0.4);
            gfx.drawCircle(CX, CY, ringR);
            gfx.lineStyle(1.5, 0xFFFFFF, ringA * 0.7);
            gfx.drawCircle(CX, CY, ringR);
            gfx.lineStyle(0);
          }

          // Shockwave ring 2 (delayed)
          if (frame >= 15 && frame < 75) {
            const rt = (frame - 15) / 60;
            const ringR = lerp(5, 70 * mul, rt);
            const ringA = rt < 0.3 ? 0.8 : (1 - rt) / 0.7 * 0.8;
            gfx.lineStyle(2 * (1 - rt) + 0.5, c1, ringA * 0.3);
            gfx.drawCircle(CX, CY, ringR);
            gfx.lineStyle(0);
          }

          // Spawn debris (frame 0-10)
          if (frame < 10) {
            const count = Math.floor(8 * mul);
            for (let i = 0; i < count; i++) {
              const angle = rand(0, Math.PI * 2);
              const speed = rand(1.0, 3.5) * mul;
              const p = mkP(CX + rand(-5, 5), CY + rand(-5, 5),
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(35, 70), rand(1.5, 4),
                pickColor(colors, i), Math.random() > 0.5 ? 'circle' : 'square', 0.97);
              ps.push(p);
            }
          }

          // Apply deceleration to debris
          for (const p of ps) {
            if (p.extra > 0.9 && p.extra < 1) {
              p.vx *= p.extra;
              p.vy *= p.extra;
            }
          }

          // Screen shake
          if (frame < 15) {
            S.shakeX = rand(-3, 3) * (1 - frame / 15);
            S.shakeY = rand(-3, 3) * (1 - frame / 15);
          }
          break;
        }

        /* ────────── 5. BEAM ────────── */
        case 'beam': {
          const beamCount = tier === 'SS' ? 3 : 1;
          const rotSpeed = 0.015;

          // Origin orb
          glowGfx.beginFill(0xFFFFFF, 0.6 + 0.2 * Math.sin(frame * 0.1));
          glowGfx.drawCircle(CX, CY, 8);
          glowGfx.endFill();
          gfx.beginFill(c0, 0.8);
          gfx.drawCircle(CX, CY, 5);
          gfx.endFill();

          if (frame < 190) {
            for (let b = 0; b < beamCount; b++) {
              const baseAngle = frame * rotSpeed + (b / beamCount) * Math.PI * 2;
              const beamLen = 95 * mul;
              const ex = CX + Math.cos(baseAngle) * beamLen;
              const ey = CY + Math.sin(baseAngle) * beamLen;
              const bColor = pickColor(colors, b);

              // Outer glow
              gfx.lineStyle(12, bColor, 0.15);
              gfx.moveTo(CX, CY);
              gfx.lineTo(ex, ey);
              // Mid glow
              gfx.lineStyle(6, bColor, 0.35);
              gfx.moveTo(CX, CY);
              gfx.lineTo(ex, ey);
              // Inner core (white)
              gfx.lineStyle(2, 0xFFFFFF, 0.9);
              gfx.moveTo(CX, CY);
              gfx.lineTo(ex, ey);
              gfx.lineStyle(0);

              // Particles along beam
              if (frame % 3 === 0) {
                const pt = rand(0.2, 0.9);
                ps.push(mkP(
                  lerp(CX, ex, pt) + rand(-4, 4),
                  lerp(CY, ey, pt) + rand(-4, 4),
                  rand(-0.3, 0.3), rand(-0.3, 0.3),
                  randInt(8, 18), rand(1, 2.5),
                  bColor, 'spark'));
              }
            }
          }
          break;
        }

        /* ────────── 6. PROJECTILE ────────── */
        case 'projectile': {
          // Fire orbs outward periodically
          if (frame < 150 && frame % 12 === 0) {
            const numProj = Math.floor(2 + mul);
            for (let i = 0; i < numProj; i++) {
              const angle = rand(0, Math.PI * 2);
              const speed = rand(1.2, 2.5);
              const arc = rand(-0.015, 0.015);
              const pColor = pickColor(colors, i);
              ps.push(mkP(CX + rand(-5, 5), CY + rand(-5, 5),
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                randInt(50, 80), rand(3, 5),
                pColor, 'circle', arc));
            }
          }

          // Apply arc to projectiles and spawn trails
          for (const p of ps) {
            if (p.kind === 'circle' && p.size >= 3 && Math.abs(p.extra) > 0.001) {
              const cos = Math.cos(p.extra);
              const sin = Math.sin(p.extra);
              const nvx = p.vx * cos - p.vy * sin;
              const nvy = p.vx * sin + p.vy * cos;
              p.vx = nvx;
              p.vy = nvy;
            }
          }

          // Trail particles
          if (frame % 2 === 0) {
            for (const p of ps) {
              if (p.kind === 'circle' && p.size >= 3 && p.life > 5) {
                ps.push(mkP(p.x, p.y, rand(-0.1, 0.1), rand(-0.1, 0.1),
                  randInt(6, 12), p.size * 0.5,
                  colorLerp(p.color, 0x000000, 0.3), 'circle'));
              }
            }
          }

          // Edge explosion
          for (let i = ps.length - 1; i >= 0; i--) {
            const p = ps[i];
            if (p.kind === 'circle' && p.size >= 3 && Math.abs(p.extra) > 0.001) {
              if (p.x < 5 || p.x > size - 5 || p.y < 5 || p.y > size - 5) {
                for (let j = 0; j < 4; j++) {
                  const angle = rand(0, Math.PI * 2);
                  ps.push(mkP(p.x, p.y,
                    Math.cos(angle) * rand(0.5, 1.5), Math.sin(angle) * rand(0.5, 1.5),
                    randInt(8, 15), rand(1, 2),
                    p.color, 'spark'));
                }
                p.life = 0;
              }
            }
          }
          break;
        }

        /* ────────── 7. AURA ────────── */
        case 'aura': {
          const breathR = 30 + 20 * Math.sin(frame * 0.04) * mul;

          // Soft glow center
          glowGfx.beginFill(c0, 0.12 + 0.08 * Math.sin(frame * 0.05));
          glowGfx.drawCircle(CX, CY, breathR + 10);
          glowGfx.endFill();

          // Pulsing circle border
          gfx.lineStyle(2, c0, 0.4 + 0.2 * Math.sin(frame * 0.04));
          gfx.drawCircle(CX, CY, breathR);
          gfx.lineStyle(0);

          // Rotating ring of particles
          if (frame < 200) {
            const numOrbit = Math.floor(8 * mul);
            for (let i = 0; i < numOrbit; i++) {
              const orbitAngle = (i / numOrbit) * Math.PI * 2 + frame * 0.03;
              const ox = CX + Math.cos(orbitAngle) * (breathR - 5);
              const oy = CY + Math.sin(orbitAngle) * (breathR - 5);
              gfx.beginFill(pickColor(colors, i), 0.7);
              gfx.drawCircle(ox, oy, 2.5);
              gfx.endFill();
            }
          }

          // Sparkle particles
          if (frame % 5 === 0 && frame < 190) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(0, breathR);
            ps.push(mkP(CX + Math.cos(angle) * dist, CY + Math.sin(angle) * dist,
              rand(-0.2, 0.2), rand(-0.3, -0.05),
              randInt(15, 30), rand(1, 2.5),
              pickColor(colors, frame), 'spark'));
          }

          // Tesla field: lightning arcs from center for electric element
          const isElectric = elements.includes('전기');
          if (isElectric && frame % 10 === 0 && frame < 180) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(25, breathR + 10);
            drawBolt(gfx, CX, CY,
              CX + Math.cos(angle) * dist,
              CY + Math.sin(angle) * dist,
              4, 10, hex(getElementColor('전기')), 0.7, 1.5);
          }
          break;
        }

        /* ────────── 8. FIELD ────────── */
        case 'field': {
          const fieldR = 45 * mul;
          const hasRed = elements.includes('불');

          // Circular field area
          gfx.beginFill(c0, 0.08 + 0.04 * Math.sin(frame * 0.03));
          gfx.drawCircle(CX, CY, fieldR);
          gfx.endFill();

          // Edge glowing border ring
          gfx.lineStyle(2.5, c0, 0.4 + 0.15 * Math.sin(frame * 0.05));
          gfx.drawCircle(CX, CY, fieldR);
          gfx.lineStyle(0);

          // Color shift inner ring
          const shiftColor = colorLerp(c0, c1, 0.5 + 0.5 * Math.sin(frame * 0.02));
          gfx.beginFill(shiftColor, 0.05);
          gfx.drawCircle(CX, CY, fieldR * 0.7);
          gfx.endFill();

          // Bubbling particles
          if (frame % 3 === 0 && frame < 190) {
            const count = Math.floor(2 * mul);
            for (let i = 0; i < count; i++) {
              const angle = rand(0, Math.PI * 2);
              const dist = rand(0, fieldR * 0.9);
              const bx = CX + Math.cos(angle) * dist;
              const by = CY + Math.sin(angle) * dist;
              const bubbleColor = hasRed
                ? colorLerp(0xef4444, 0xf97316, Math.random())
                : pickColor(colors, i);
              ps.push(mkP(bx, by, rand(-0.2, 0.2), rand(-0.8, -0.3),
                randInt(20, 40), rand(1.5, 3.5),
                bubbleColor, 'circle'));
            }
          }

          // Animated texture dots
          if (frame < 200) {
            for (let i = 0; i < 12; i++) {
              const da = (i / 12) * Math.PI * 2 + frame * 0.01;
              const dd = fieldR * 0.4 + 10 * Math.sin(frame * 0.04 + i);
              gfx.beginFill(c0, 0.2);
              gfx.drawCircle(CX + Math.cos(da) * dd, CY + Math.sin(da) * dd, 2);
              gfx.endFill();
            }
          }
          break;
        }

        /* ────────── 9. TRAP ────────── */
        case 'trap': {
          const trapR = 25 * mul;

          if (frame < 60) {
            // Subtle/hidden: faint circle
            const fadeIn = frame / 60;
            gfx.lineStyle(1, c0, fadeIn * 0.12);
            gfx.drawCircle(CX, CY, trapR);
            gfx.lineStyle(0);
            if (frame % 15 === 0) {
              for (let i = 0; i < 3; i++) {
                gfx.beginFill(c0, 0.08);
                gfx.drawCircle(CX + rand(-trapR, trapR), CY + rand(-trapR, trapR), 1);
                gfx.endFill();
              }
            }
          } else if (frame < 110) {
            // TRIGGER: burst upward
            const trigT = (frame - 60) / 50;

            // Flash
            if (frame < 70) {
              const flashAl = (70 - frame) / 10;
              gfx.beginFill(0xFFFFFF, flashAl * 0.5);
              gfx.drawCircle(CX, CY, trapR * 0.5);
              gfx.endFill();
            }

            // Expanding ring
            gfx.lineStyle(2 * (1 - trigT), c0, (1 - trigT) * 0.6);
            gfx.drawCircle(CX, CY, trapR * (1 + trigT));
            gfx.lineStyle(0);

            // Spike particles on trigger start
            if (frame === 60) {
              const count = Math.floor(12 * mul);
              for (let i = 0; i < count; i++) {
                const angle = rand(-Math.PI, 0);
                const speed = rand(1.5, 3.5);
                ps.push(mkP(CX + rand(-trapR * 0.6, trapR * 0.6), CY,
                  Math.cos(angle) * speed * 0.3, Math.sin(angle) * speed,
                  randInt(25, 50), rand(2, 4),
                  pickColor(colors, i), Math.random() > 0.5 ? 'square' : 'spark'));
              }
              S.shakeX = rand(-4, 4);
              S.shakeY = rand(-2, 2);
            }
          } else {
            // Settle back to subtle
            const settleT = (frame - 110) / (CYCLE - 110);
            gfx.lineStyle(1, c0, (1 - settleT) * 0.2);
            gfx.drawCircle(CX, CY, trapR);
            gfx.lineStyle(0);
          }
          break;
        }

        /* ────────── 10. VORTEX ────────── */
        case 'vortex': {
          // Center glowing core
          glowGfx.beginFill(c0, 0.2 + 0.1 * Math.sin(frame * 0.06));
          glowGfx.drawCircle(CX, CY, 10);
          glowGfx.endFill();
          gfx.beginFill(0xFFFFFF, 0.6);
          gfx.drawCircle(CX, CY, 4);
          gfx.endFill();

          // Spiral pattern of particles
          if (frame < 190) {
            const numSpiral = Math.floor(40 * mul);
            for (let i = 0; i < numSpiral; i++) {
              const spiralT = i / numSpiral;
              const spiralAngle = spiralT * Math.PI * 6 + frame * 0.05;
              const spiralR = 8 + spiralT * 75 * mul;
              const sx = CX + Math.cos(spiralAngle) * spiralR;
              const sy = CY + Math.sin(spiralAngle) * spiralR;
              const sAlpha = 0.6 * (1 - spiralT * 0.5);
              gfx.beginFill(pickColor(colors, i), sAlpha);
              gfx.drawCircle(sx, sy, 1.5 + spiralT * 1.5);
              gfx.endFill();
            }
          }

          // Inward-moving particles
          if (frame % 4 === 0 && frame < 180) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(60, 90) * mul;
            const inSpeed = rand(0.3, 0.8);
            ps.push(mkP(
              CX + Math.cos(angle) * dist, CY + Math.sin(angle) * dist,
              -Math.cos(angle) * inSpeed + Math.sin(angle) * 0.5,
              -Math.sin(angle) * inSpeed - Math.cos(angle) * 0.5,
              randInt(30, 60), rand(1.5, 3),
              pickColor(colors, frame), 'circle'));
          }
          break;
        }

        /* ────────── 11. RAIN ────────── */
        case 'rain': {
          const density = Math.floor(3 + 4 * mul);
          const groundY = size * 0.85;
          const hasLightning = elements.includes('전기');

          // Spawn rain drops
          if (frame < 190) {
            for (let i = 0; i < density; i++) {
              ps.push(mkP(rand(0, size), rand(-10, -2),
                rand(-0.5, -0.2), rand(3, 5),
                randInt(20, 40), rand(1, 2),
                pickColor(colors, i), 'circle'));
            }
          }

          // Ground splashes
          for (const p of ps) {
            if (p.vy > 1 && p.y > groundY && p.life > 2) {
              for (let j = 0; j < 2; j++) {
                ps.push(mkP(p.x, groundY,
                  rand(-0.8, 0.8), rand(-1.5, -0.3),
                  randInt(5, 12), rand(0.8, 1.5),
                  0xFFFFFF, 'spark'));
              }
              p.life = 1;
            }
          }

          // Ground line
          gfx.lineStyle(1, c0, 0.15);
          gfx.moveTo(0, groundY);
          gfx.lineTo(size, groundY);
          gfx.lineStyle(0);

          // Lightning flash for electric element
          if (hasLightning && frame % 40 < 3 && frame < 180) {
            gfx.beginFill(0xFFFFFF, 0.15);
            gfx.drawRect(0, 0, size, size);
            gfx.endFill();
            const lx = rand(30, size - 30);
            drawBolt(gfx, lx, 0, lx + rand(-20, 20), groundY,
              5, 20, hex(getElementColor('전기')), 0.8, 1.5);
          }
          break;
        }

        /* ────────── 12. SUMMON ────────── */
        case 'summon': {
          type Pillar = { x: number; maxH: number; currentH: number; w: number; color: number; startFrame: number; phase: 'grow' | 'hold' };
          if (!S.pillars || (S.pillars as Pillar[]).length === 0) {
            const numPillars = Math.floor(3 + 2 * mul);
            const pls: Pillar[] = [];
            for (let i = 0; i < numPillars; i++) {
              pls.push({
                x: 20 + (i / (numPillars - 1)) * (size - 40),
                maxH: rand(40, 80) * mul,
                currentH: 0,
                w: rand(10, 18),
                color: pickColor(colors, i),
                startFrame: i * 20,
                phase: 'grow',
              });
            }
            S.pillars = pls;
          }

          const pillars = S.pillars as Pillar[];
          const baseY = size - 10;

          for (const pl of pillars) {
            if (frame < pl.startFrame) continue;

            if (pl.phase === 'grow') {
              const elapsed = frame - pl.startFrame;
              pl.currentH = Math.min(pl.maxH, elapsed * 1.8);
              if (pl.currentH >= pl.maxH) {
                pl.phase = 'hold';
                for (let d = 0; d < 6; d++) {
                  const angle = rand(-Math.PI, 0);
                  const speed = rand(0.8, 2.5);
                  ps.push(mkP(pl.x, baseY - pl.maxH,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    randInt(15, 30), rand(1.5, 3),
                    pl.color, 'square'));
                }
                S.shakeX = rand(-2, 2);
                S.shakeY = rand(-1, 1);
              }
            }

            const h = pl.currentH;
            if (h > 0) {
              glowGfx.beginFill(pl.color, 0.1);
              glowGfx.drawRect(pl.x - pl.w / 2 - 3, baseY - h, pl.w + 6, h);
              glowGfx.endFill();
              gfx.beginFill(pl.color, 0.7);
              gfx.drawRect(pl.x - pl.w / 2, baseY - h, pl.w, h);
              gfx.endFill();
              gfx.beginFill(colorLerp(pl.color, 0xFFFFFF, 0.3), 0.9);
              gfx.drawRect(pl.x - pl.w / 2 - 2, baseY - h - 3, pl.w + 4, 3);
              gfx.endFill();
            }
          }

          gfx.lineStyle(1.5, c0, 0.3);
          gfx.moveTo(0, baseY);
          gfx.lineTo(size, baseY);
          gfx.lineStyle(0);
          break;
        }

        /* ────────── 13. CHAIN ────────── */
        case 'chain': {
          type Target = { x: number; y: number; vx: number; vy: number; color: number };
          if (!S.targets || (S.targets as Target[]).length === 0) {
            const numTargets = randInt(3, 5);
            const tgts: Target[] = [];
            for (let i = 0; i < numTargets; i++) {
              tgts.push({
                x: rand(30, size - 30),
                y: rand(30, size - 30),
                vx: rand(-0.8, 0.8),
                vy: rand(-0.8, 0.8),
                color: pickColor(colors, i),
              });
            }
            S.targets = tgts;
          }

          const targets = S.targets as Target[];

          for (const tg of targets) {
            tg.x += tg.vx;
            tg.y += tg.vy;
            if (tg.x < 20 || tg.x > size - 20) tg.vx *= -1;
            if (tg.y < 20 || tg.y > size - 20) tg.vy *= -1;
            tg.x = clamp(tg.x, 20, size - 20);
            tg.y = clamp(tg.y, 20, size - 20);
          }

          // Draw targets (pulsing glow)
          for (const tg of targets) {
            const pulse = 4 + 2 * Math.sin(frame * 0.1);
            glowGfx.beginFill(tg.color, 0.3);
            glowGfx.drawCircle(tg.x, tg.y, pulse + 4);
            glowGfx.endFill();
            gfx.beginFill(tg.color, 0.9);
            gfx.drawCircle(tg.x, tg.y, pulse);
            gfx.endFill();
          }

          // Chain lightning connecting targets
          if (frame < 190 && frame % 3 === 0) {
            for (let i = 0; i < targets.length; i++) {
              const from = targets[i];
              const to = targets[(i + 1) % targets.length];
              const chainColor = colorLerp(from.color, to.color, 0.5);
              drawBolt(gfx, from.x, from.y, to.x, to.y,
                randInt(4, 6), 15, chainColor, 0.7, 1.2);
            }
          }
          break;
        }

        /* ────────── 14. SHIELD ────────── */
        case 'shield': {
          const shieldR = 45 * mul;
          const hitInterval = 50;
          const isHit = (frame % hitInterval) < 8;
          const hitAngle = Math.floor(frame / hitInterval) * 2.3;

          // Translucent dome
          gfx.beginFill(c0, isHit ? 0.12 : 0.06);
          gfx.drawCircle(CX, CY, shieldR);
          gfx.endFill();

          // Shield border ring
          gfx.lineStyle(2, c0, isHit ? 0.7 : 0.35);
          gfx.drawCircle(CX, CY, shieldR);
          gfx.lineStyle(0);

          // Hexagonal pattern
          if (frame < 200) {
            for (let h = 0; h < 6; h++) {
              const ha = (h / 6) * Math.PI * 2 + frame * 0.005;
              const hx = CX + Math.cos(ha) * shieldR;
              const hy = CY + Math.sin(ha) * shieldR;
              const ha2 = ((h + 1) / 6) * Math.PI * 2 + frame * 0.005;
              const hx2 = CX + Math.cos(ha2) * shieldR;
              const hy2 = CY + Math.sin(ha2) * shieldR;
              gfx.lineStyle(1, c0, 0.2);
              gfx.moveTo(hx, hy);
              gfx.lineTo(hx2, hy2);
              gfx.moveTo(CX + Math.cos(ha) * shieldR * 0.5, CY + Math.sin(ha) * shieldR * 0.5);
              gfx.lineTo(CX + Math.cos(ha2) * shieldR * 0.5, CY + Math.sin(ha2) * shieldR * 0.5);
              gfx.lineStyle(0);
            }
          }

          // Hit ripple effect
          if (isHit) {
            const hitT = (frame % hitInterval) / 8;
            const hitX = CX + Math.cos(hitAngle) * shieldR * 0.7;
            const hitY = CY + Math.sin(hitAngle) * shieldR * 0.7;
            gfx.lineStyle(2 * (1 - hitT), 0xFFFFFF, (1 - hitT) * 0.5);
            gfx.drawCircle(hitX, hitY, hitT * 20);
            gfx.lineStyle(0);
            glowGfx.beginFill(c0, (1 - hitT) * 0.15);
            glowGfx.drawCircle(CX, CY, shieldR);
            glowGfx.endFill();

            if (frame % hitInterval === 0) {
              for (let j = 0; j < 4; j++) {
                const pa = hitAngle + rand(-0.5, 0.5);
                ps.push(mkP(hitX, hitY,
                  Math.cos(pa) * rand(0.3, 1), Math.sin(pa) * rand(0.3, 1),
                  randInt(10, 20), rand(1, 2),
                  c0, 'spark'));
              }
            }
          }

          // Particles sliding along shield surface
          if (frame % 8 === 0 && frame < 190) {
            const slideAngle = rand(0, Math.PI * 2);
            const sx = CX + Math.cos(slideAngle) * shieldR;
            const sy = CY + Math.sin(slideAngle) * shieldR;
            ps.push(mkP(sx, sy,
              -Math.sin(slideAngle) * 0.8, Math.cos(slideAngle) * 0.8,
              randInt(15, 25), rand(1, 2),
              pickColor(colors, frame), 'spark'));
          }
          break;
        }
      } // end if (!handled) switch
    };

    app.ticker.add(tickFn);

    return () => {
      observer.disconnect();
      app.ticker.remove(tickFn);
      app.destroy(true, { children: true, texture: true });
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements.join(','), effectType, tier, size]);

  return (
    <div
      ref={containerRef}
      onClick={restart}
      style={{ width: size, height: size, cursor: 'pointer' }}
      title="클릭하여 재생"
    />
  );
}
