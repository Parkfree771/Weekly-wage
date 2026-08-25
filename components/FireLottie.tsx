'use client';

// 스트릭 불꽃 로티(주황+빨강) 공용 아이콘 — "인기" 표시용.
// 계속 반복하지 않는다 — 첫 프레임에 멈춰 있다가 이 아이콘이 붙은 링크/버튼(없으면 아이콘 자체)을 누르면 한 번 재생.
// lottie_light(svg 렌더러 전용 경량 빌드)를 마운트 시점에만 동적 로드한다 —
// JSON(/lottie/streak-fire.json)은 브라우저 캐시를 타므로 여러 개 띄워도 요청은 한 번이다.

import { useEffect, useRef } from 'react';

type Props = {
  size?: number;
  /** 넘기면 마우스 오버 시 네이티브 툴팁으로 표시 (예: "인기 페이지") */
  title?: string;
  className?: string;
};

export default function FireLottie({ size = 18, title, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let anim: { destroy: () => void; goToAndPlay: (v: number, isFrame?: boolean) => void } | undefined;
    let cancelled = false;
    // 누르면 처음부터 한 번 — 가장 가까운 링크/버튼에 걸어 메뉴 항목을 누를 때 같이 움직인다
    const host: HTMLElement | null = ref.current?.closest('a, button') ?? ref.current;
    const play = () => anim?.goToAndPlay(0, true);
    host?.addEventListener('click', play);
    import('lottie-web/build/player/lottie_light').then((mod) => {
      if (cancelled || !ref.current) return;
      anim = mod.default.loadAnimation({
        container: ref.current,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/lottie/streak-fire.json',
      });
    });
    return () => {
      cancelled = true;
      host?.removeEventListener('click', play);
      anim?.destroy();
    };
  }, []);

  return (
    <span
      ref={ref}
      title={title}
      className={className}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0, verticalAlign: '-3px' }}
    />
  );
}
