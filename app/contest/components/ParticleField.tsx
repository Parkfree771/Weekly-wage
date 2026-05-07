'use client';

import { useEffect, useRef } from 'react';

type Bokeh = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  alpha: number;
};

type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  hue: number;
};

type Shooting = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
};

type Props = { className?: string; density?: number };

/** 시네마틱 파티클 — 큰 보케 + 작은 별(트윙클) + 가끔 슈팅스타 */
export default function ParticleField({ className, density = 70 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    // 모바일은 DPR 1로 강제 + 파티클 수 절반 (성능/스크롤 안정)
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const densityScale = isMobile ? 0.45 : 1;
    let w = 0, h = 0;
    let bokehs: Bokeh[] = [];
    let stars: Star[] = [];
    let shootings: Shooting[] = [];
    let nextShootAt = performance.now() + 4000 + Math.random() * 6000;

    const HUES_BOKEH = [260, 320, 195, 45, 285];
    const HUES_STAR = [0, 0, 0, 45, 280, 320, 195]; // 흰색 비중 높음 (0=흰)

    const spawnBokeh = (): Bokeh => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 30 + Math.random() * 70,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08 - 0.02,
      hue: HUES_BOKEH[Math.floor(Math.random() * HUES_BOKEH.length)],
      alpha: 0.06 + Math.random() * 0.1,
    });

    const spawnStar = (): Star => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.4,
      baseAlpha: 0.4 + Math.random() * 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      hue: HUES_STAR[Math.floor(Math.random() * HUES_STAR.length)],
    });

    const spawnShooting = (): Shooting => {
      const fromTop = Math.random() < 0.6;
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
      const speed = 8 + Math.random() * 4;
      return {
        x: fromTop ? Math.random() * w * 0.5 : -50,
        y: fromTop ? -50 : Math.random() * h * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      };
    };

    // 캔버스 크기/파티클 시드 — 모바일은 처음 마운트 때 한 번만, 그 이후엔
    // 주소창 토글로 innerHeight가 어떻게 변하든 절대 다시 안 만진다.
    // 데스크톱은 실제 창 리사이즈가 의미 있으니 호출될 수 있다.
    const setup = () => {
      const newW = window.innerWidth;
      // 모바일은 주소창 영향 없는 안정값(screen.height) 사용 →
      // 스크롤로 innerHeight가 바뀌어도 캔버스 픽셀버퍼는 일정.
      const stableH = isMobile
        ? Math.max(
            window.innerHeight,
            window.screen?.height || 0,
            window.outerHeight || 0,
          )
        : window.innerHeight;

      // 동일 크기면 아무것도 안 한다 (canvas.width 재설정도 컨텍스트 리셋이라 회피)
      if (newW === w && stableH === h) return;

      w = newW;
      h = stableH;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bokehCount = Math.max(6, Math.floor((w * h) / (isMobile ? 160000 : 90000)));
      const starCount = Math.max(
        isMobile ? 20 : 40,
        Math.floor((w * h) / 12000) * (density / 70) * densityScale,
      );
      bokehs = Array.from({ length: bokehCount }, spawnBokeh);
      stars = Array.from({ length: starCount }, spawnStar);
    };

    const tick = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      // 1) 보케 (additive, 큰 흐릿한 빛)
      ctx.globalCompositeOperation = 'screen';
      for (const b of bokehs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        const hue = b.hue;
        grad.addColorStop(0, `hsla(${hue}, 95%, 75%, ${b.alpha})`);
        grad.addColorStop(0.5, `hsla(${hue}, 95%, 65%, ${b.alpha * 0.5})`);
        grad.addColorStop(1, `hsla(${hue}, 95%, 65%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2) 별 (트윙클)
      ctx.globalCompositeOperation = 'lighter';
      const t = now / 1000;
      for (const s of stars) {
        const tw = (Math.sin(t * s.twinkleSpeed + s.twinklePhase) + 1) * 0.5;
        const a = s.baseAlpha * (0.45 + tw * 0.55);
        const sat = s.hue === 0 ? 0 : 90;
        const lit = s.hue === 0 ? 100 : 80;

        // halo
        const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        halo.addColorStop(0, `hsla(${s.hue}, ${sat}%, ${lit}%, ${a * 0.7})`);
        halo.addColorStop(1, `hsla(${s.hue}, ${sat}%, ${lit}%, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();

        // core
        ctx.fillStyle = `hsla(${s.hue}, ${sat}%, ${Math.min(lit + 10, 100)}%, ${Math.min(a + 0.25, 1)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3) 슈팅스타
      if (now > nextShootAt) {
        shootings.push(spawnShooting());
        nextShootAt = now + 6000 + Math.random() * 10000;
      }

      ctx.globalCompositeOperation = 'screen';
      for (let i = shootings.length - 1; i >= 0; i--) {
        const sh = shootings[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;

        const lifeRatio = sh.life / sh.maxLife;
        const alpha = lifeRatio < 0.2
          ? lifeRatio / 0.2
          : 1 - (lifeRatio - 0.2) / 0.8;
        const tailLen = 80;

        const tailX = sh.x - sh.vx * (tailLen / Math.hypot(sh.vx, sh.vy));
        const tailY = sh.y - sh.vy * (tailLen / Math.hypot(sh.vx, sh.vy));

        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.4, `rgba(252, 211, 77, ${alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(252, 211, 77, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // 머리 점
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (sh.life > sh.maxLife || sh.x > w + 100 || sh.y > h + 100) {
          shootings.splice(i, 1);
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      rafRef.current = requestAnimationFrame(tick);
    };

    setup();
    rafRef.current = requestAnimationFrame(tick);

    // 모바일: resize 이벤트는 주소창 토글로 매 스크롤마다 발생하므로 듣지 않는다.
    //         폰을 회전했을 때만 캔버스 재구성 (orientationchange).
    // 데스크톱: 실제 창 리사이즈 처리 (디바운스).
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setup, 150);
    };
    const onOrient = () => {
      // 회전 직후엔 크기가 일시적으로 부정확할 수 있어 살짝 지연
      setTimeout(setup, 250);
    };

    if (!isMobile) {
      window.addEventListener('resize', onResize);
    }
    window.addEventListener('orientationchange', onOrient);

    return () => {
      if (!isMobile) window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrient);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [density]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
