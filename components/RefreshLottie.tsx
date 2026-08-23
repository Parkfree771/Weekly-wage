'use client';

// 새로고침 로티(도들 남색+코랄) — 패키지 "시세 갱신" 버튼 아이콘.
// FireLottie 와 같은 방식: lottie_light 를 마운트 시점에만 동적 로드하고
// JSON(/lottie/refresh.json)은 브라우저 캐시를 탄다.
//
// 원본 마커 — in-reveal(0~115) / default:hover-pinch(125~222) / loop-cycle(232~352).
// 평시에는 기본 포즈(125프레임)에 세워 두고, spinning 이면 loop-cycle 을 무한 반복한다.

import { useEffect, useRef } from 'react';

const IDLE_FRAME = 125;
const LOOP_SEGMENT: [number, number] = [232, 352];

type Anim = {
  destroy: () => void;
  goToAndStop: (v: number, isFrame?: boolean) => void;
  playSegments: (s: [number, number], force?: boolean) => void;
  loop: boolean | number;
};

export default function RefreshLottie({ spinning, size = 16 }: { spinning: boolean; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Anim | null>(null);
  // 로드 완료 전에 spinning 이 바뀌었을 때를 위해 최신값을 들고 있는다
  const spinningRef = useRef(spinning);
  spinningRef.current = spinning;

  useEffect(() => {
    let cancelled = false;
    import('lottie-web/build/player/lottie_light').then((mod) => {
      if (cancelled || !ref.current) return;
      const anim = mod.default.loadAnimation({
        container: ref.current,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: '/lottie/refresh.json',
      }) as unknown as Anim;
      animRef.current = anim;
      if (spinningRef.current) anim.playSegments(LOOP_SEGMENT, true);
      else anim.goToAndStop(IDLE_FRAME, true);
    });
    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (spinning) anim.playSegments(LOOP_SEGMENT, true);
    else anim.goToAndStop(IDLE_FRAME, true);
  }, [spinning]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
    />
  );
}
