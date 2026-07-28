'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

interface AdFitUnitProps {
  /** 애드핏 광고단위 ID (DAN-xxxxxxxx) */
  unit: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}

// 카카오 애드핏 광고 단위.
//
// 애드센스(AdUnit)와 로딩 방식이 다르다. 애드센스는 로더를 head 에 한 번 두고
// 자리마다 push 하지만, 애드핏의 ba.min.js 는 "실행 시점에 아직 안 채워진
// .kakao_ad_area 를 찾아 채우는" 일회성 스캔이다. 그래서 로더를 head 에 두면
// 클라이언트 라우팅으로 새로 생긴 광고 자리는 영영 안 채워진다.
// → 광고 자리마다 마운트 시점에 스크립트를 새로 붙여 스캔을 다시 돌린다.
//
// ins 의 display:none 은 애드핏 규격이다. 광고가 채워질 때 스크립트가 직접 풀어주고,
// 안 채워지면 숨은 채로 남아 빈 공간이 생기지 않는다(대체 광고 미설정 기준).
export default function AdFitUnit({ unit, width, height, className, style }: AdFitUnitProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kas/static/ba.min.js';
    script.async = true;
    host.appendChild(script);

    return () => {
      script.remove();
    };
  }, [unit]);

  return (
    <div ref={hostRef} className={className} style={style}>
      <ins
        className="kakao_ad_area"
        style={{ display: 'none' }}
        data-ad-unit={unit}
        data-ad-width={String(width)}
        data-ad-height={String(height)}
      />
    </div>
  );
}
