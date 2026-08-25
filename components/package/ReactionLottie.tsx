'use client';

// 패키지 카드 반응 로티(쏘쏘·오) — "hover-pinch" 계열이라 첫 프레임이 정지 아이콘이고
// 마우스를 올리거나 누르면 한 번 재생된다. FireLottie 와 같은 경량 빌드를 동적 로드한다.
// JSON(/lottie/react-*.json)은 브라우저 캐시를 타므로 카드마다 띄워도 요청은 한 번이다.

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export type ReactionLottieHandle = { play: () => void };

type Props = {
  path: string;
  size?: number;
  className?: string;
  /** true 면 계속 반복 재생, 아니면 첫 프레임에서 멈춰 있다가 play() 로 한 번 재생 */
  loop?: boolean;
  /**
   * 원본 색 → CSS 값 치환표. 키는 lottie 가 SVG 에 쓰는 형식 그대로("rgb(18,19,49)").
   * "stroke:rgb(…)" / "fill:rgb(…)" 로 선·채움을 따로 줄 수 있다(없으면 공통 키).
   * 값에 var(--…) 를 쓰면 테마(라이트/다크)를 그대로 따라간다. 애니메이션되지 않는 고정색에만 유효.
   */
  recolor?: Record<string, string>;
  /** 선 두께 배율 (1 = 원본). 작은 크기에서 표정이 뭉개지지 않게 굵힌다 */
  strokeScale?: number;
};

const ReactionLottie = forwardRef<ReactionLottieHandle, Props>(function ReactionLottie(
  { path, size = 28, className, loop = false, recolor, strokeScale = 1 },
  ref,
) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<{ goToAndPlay: (v: number, isFrame?: boolean) => void; destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('lottie-web/build/player/lottie_light').then((mod) => {
      if (cancelled || !boxRef.current) return;
      const anim = mod.default.loadAnimation({
        container: boxRef.current,
        renderer: 'svg',
        loop,
        autoplay: loop,
        path,
      });
      animRef.current = anim;
      if (recolor || strokeScale !== 1) {
        anim.addEventListener('DOMLoaded', () => {
          const root = boxRef.current;
          if (!root) return;
          root.querySelectorAll<SVGElement>('[stroke], [fill]').forEach((el) => {
            // 같은 원본색이 선·채움 양쪽에 쓰일 때는 "stroke:…" / "fill:…" 키로 따로 지정할 수 있다
            const st = el.getAttribute('stroke');
            const stTo = st ? (recolor?.[`stroke:${st}`] ?? recolor?.[st]) : undefined;
            if (stTo) el.style.stroke = stTo;
            const fl = el.getAttribute('fill');
            const flTo = fl ? (recolor?.[`fill:${fl}`] ?? recolor?.[fl]) : undefined;
            if (flTo) el.style.fill = flTo;
            if (strokeScale !== 1) {
              const w = parseFloat(el.getAttribute('stroke-width') || '');
              if (w > 0) el.style.strokeWidth = String(w * strokeScale);
            }
          });
        });
      }
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
    // recolor 표는 모듈 상수라 참조가 안 바뀐다 — 의존성에 넣으면 매 렌더 재로드된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, loop, strokeScale]);

  useImperativeHandle(ref, () => ({ play: () => animRef.current?.goToAndPlay(0, true) }), []);

  return (
    <span
      ref={boxRef}
      className={className}
      aria-hidden="true"
      // 크기는 변수로 둔다 — 부모 CSS(모바일 축소 등)가 --rl-size 로 덮어쓸 수 있다
      style={{ '--rl-size': size + 'px', width: 'var(--rl-size)', height: 'var(--rl-size)', display: 'inline-flex', flexShrink: 0 } as React.CSSProperties}
    />
  );
});

export default ReactionLottie;
