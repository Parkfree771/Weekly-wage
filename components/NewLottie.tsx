'use client';

// "새로 등장" 표시용 불꽃 로티 — 네비게이션 항목과 해당 페이지 제목 옆에 붙인다.
// 인기 페이지 표시(FireLottie)와는 다른 그림·다른 뜻이라 따로 둔다.
//
// 계속 반복 재생하되, 화면에 실제로 보일 때만 돈다.
// 네비 드롭다운은 열려 있지 않아도 DOM 에 남아 있고(display:none) 전 페이지에 렌더되므로,
// 그냥 loop 를 켜면 안 보이는 아이콘이 모든 페이지에서 rAF 를 계속 태운다.
// IntersectionObserver 로 보일 때 play, 벗어나면 pause 한다 (display:none 은 교차 0 으로 잡힌다).
//
// JSON(/lottie/new-flame.json)은 loadLottieData 가 경로당 한 번만 받는다 — 여러 곳에 띄워도 요청은 한 번.

import { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import { loadLottieData } from '@/lib/lottie-data';

// 원본(wired-lineal)의 고정색 → 사이트 색. 선은 테마 글자색을 따라가게 하고(다크에서 남색이면 안 보인다),
// 불꽃의 노랑·주황은 "새로 등장" 신호라 원본 그대로 둔다.
const RECOLOR: Record<string, string> = {
  'rgb(18,19,49)': 'var(--text-primary)',
};
// 430px 원본을 26px 로 줄이면 선이 실처럼 얇아진다 — 선만 굵힌다(ReactionBar 와 같은 처리)
const STROKE_SCALE = 1.6;

type Props = {
  size?: number;
  /** 마우스 오버 시 네이티브 툴팁 (기본: "새로 등장") */
  title?: string;
  className?: string;
};

export default function NewLottie({ size = 26, title = '새로 등장', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cancelled = false;
    let anim: AnimationItem | undefined;
    let io: IntersectionObserver | undefined;
    const host = ref.current;

    Promise.all([import('lottie-web/build/player/lottie_light'), loadLottieData('/lottie/new-flame.json')]).then(([mod, animationData]) => {
      if (cancelled || !ref.current) return;
      const a = mod.default.loadAnimation({
        container: ref.current,
        renderer: 'svg',
        loop: true,
        // 보일 때만 돈다 — 아래 IntersectionObserver 가 play 를 걸어 준다
        autoplay: false,
        animationData,
      });
      anim = a;
      a.addEventListener('DOMLoaded', () => {
        const root = ref.current;
        if (!root) return;
        root.querySelectorAll<SVGElement>('[stroke], [fill]').forEach((el) => {
          const st = el.getAttribute('stroke');
          if (st && RECOLOR[st]) el.style.stroke = RECOLOR[st];
          const fl = el.getAttribute('fill');
          if (fl && RECOLOR[fl]) el.style.fill = RECOLOR[fl];
          const w = parseFloat(el.getAttribute('stroke-width') || '');
          if (w > 0) el.style.strokeWidth = String(w * STROKE_SCALE);
        });
      });
      if (!host) return;
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) a.play();
          else a.pause();
        }
      });
      io.observe(host);
    // 받기 실패는 조용히 넘긴다 — 아이콘 자리만 비고 링크는 그대로 동작한다
    }).catch(() => {});

    return () => {
      cancelled = true;
      io?.disconnect();
      anim?.destroy();
    };
  }, []);

  return (
    <span
      ref={ref}
      title={title}
      className={className}
      aria-label={title}
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0, verticalAlign: '-3px' }}
    />
  );
}
