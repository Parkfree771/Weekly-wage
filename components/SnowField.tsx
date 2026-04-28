'use client';

import { useEffect, useRef } from 'react';

type Snowflake = {
  x: number;
  y: number;
  vy: number;
  size: number;
  swayPhase: number;
  swayFreq: number;
  swayAmp: number;
  alpha: number;
  spin: number;
  spinSpeed: number;
  shape: 0 | 1 | 2;
};

type SnowFieldProps = {
  /** 입자 개수 — 데스크탑 기준. 모바일은 자동으로 60% 로 감소. */
  density?: number;
  /** 캔버스 z-index — 컨테이너 내 다른 요소 위에 떠야 한다. */
  zIndex?: number;
  /** 입자 색 (rgba 베이스). 기본 청색 도는 백색. */
  color?: { r: number; g: number; b: number };
};

/**
 * 부모(position: relative) 영역을 덮어 눈송이를 흩날리는 캔버스 오버레이.
 * - 6각/별/원의 3가지 형태를 섞어 그리드/스프라이트 없이도 디테일 확보
 * - 깊이별 시차(파라랙스): 큰 입자는 빠르게/진하게, 작은 입자는 느리게/희미하게
 * - prefers-reduced-motion 시 렌더 자체 스킵
 * - 부모 리사이즈를 ResizeObserver 로 추적
 */
export default function SnowField({
  density = 110,
  zIndex = 4,
  color = { r: 230, g: 243, b: 255 },
}: SnowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const count = Math.round(density * (isMobile ? 0.55 : 1));

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 3);
    const flakes: Snowflake[] = [];

    function resize() {
      const rect = parent!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas!.width = Math.max(1, Math.round(w * dpr));
      canvas!.height = Math.max(1, Math.round(h * dpr));
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(initial: boolean): Snowflake {
      // size 0.6 ~ 3.4 (분포: 작은게 많음 — pow 2)
      const r = Math.random();
      const size = 0.6 + Math.pow(r, 1.6) * 2.8;
      const depth = (size - 0.6) / 2.8; // 0..1
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : -size * 4,
        // 큰 입자(가까움) 빠르게 떨어짐
        vy: 18 + depth * 55,
        size,
        swayPhase: Math.random() * Math.PI * 2,
        swayFreq: 0.25 + Math.random() * 0.65,
        swayAmp: 10 + depth * 28,
        alpha: 0.35 + depth * 0.55,
        spin: Math.random() * Math.PI,
        spinSpeed: (Math.random() - 0.5) * 1.4,
        shape: (Math.floor(Math.random() * 3) as 0 | 1 | 2),
      };
    }

    function reseed() {
      flakes.length = 0;
      for (let i = 0; i < count; i++) flakes.push(spawn(true));
    }

    resize();
    reseed();

    const ro = new ResizeObserver(() => {
      resize();
      // 입자 위치는 그대로 둬서 리사이즈 시 갑자기 모두 사라지지 않도록
      for (const f of flakes) {
        if (f.x > w) f.x = Math.random() * w;
      }
    });
    ro.observe(parent);

    let raf = 0;
    let last = performance.now();

    function drawFlake(f: Snowflake, x: number) {
      const a = f.alpha;
      // 글로우 (큰 입자에만)
      if (f.size > 2.0) {
        const glowR = f.size * 4.5;
        const grd = ctx!.createRadialGradient(x, f.y, 0, x, f.y, glowR);
        grd.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${a * 0.25})`);
        grd.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${a * 0.05})`);
        grd.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.arc(x, f.y, glowR, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.save();
      ctx!.translate(x, f.y);
      ctx!.rotate(f.spin);
      ctx!.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
      ctx!.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
      ctx!.lineCap = 'round';

      if (f.shape === 0 || f.size < 1.2) {
        // 원: 작은 입자
        ctx!.beginPath();
        ctx!.arc(0, 0, f.size, 0, Math.PI * 2);
        ctx!.fill();
      } else if (f.shape === 1) {
        // 6각 별 (3개 라인 교차)
        ctx!.lineWidth = Math.max(0.6, f.size * 0.42);
        const arm = f.size * 1.6;
        for (let i = 0; i < 3; i++) {
          const ang = (i * Math.PI) / 3;
          ctx!.beginPath();
          ctx!.moveTo(Math.cos(ang) * arm, Math.sin(ang) * arm);
          ctx!.lineTo(-Math.cos(ang) * arm, -Math.sin(ang) * arm);
          ctx!.stroke();
        }
        // 중심 점
        ctx!.beginPath();
        ctx!.arc(0, 0, f.size * 0.45, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        // 4각 별 (코어 + 십자 라인)
        ctx!.lineWidth = Math.max(0.5, f.size * 0.35);
        const arm = f.size * 1.4;
        ctx!.beginPath();
        ctx!.moveTo(-arm, 0);
        ctx!.lineTo(arm, 0);
        ctx!.moveTo(0, -arm);
        ctx!.lineTo(0, arm);
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(0, 0, f.size * 0.55, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
    }

    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx!.clearRect(0, 0, w, h);

      for (const f of flakes) {
        f.y += f.vy * dt;
        f.swayPhase += f.swayFreq * dt;
        f.spin += f.spinSpeed * dt;
        const x = f.x + Math.sin(f.swayPhase) * f.swayAmp;

        if (f.y - f.size > h) {
          // 재활용: 위로 보냄 + 새 위치
          const fresh = spawn(false);
          f.x = fresh.x;
          f.y = fresh.y;
          f.vy = fresh.vy;
          f.size = fresh.size;
          f.swayPhase = fresh.swayPhase;
          f.swayFreq = fresh.swayFreq;
          f.swayAmp = fresh.swayAmp;
          f.alpha = fresh.alpha;
          f.spin = fresh.spin;
          f.spinSpeed = fresh.spinSpeed;
          f.shape = fresh.shape;
          continue;
        }

        // 가시 영역 밖이면 그리기 스킵
        if (x < -10 || x > w + 10) continue;

        drawFlake(f, x);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [density, color.r, color.g, color.b]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
      }}
      aria-hidden
    />
  );
}
