'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { AD_CLIENT } from './adConfig';

interface AdUnitProps {
  slot: string;
  format?: string;        // 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  responsive?: boolean;   // 반응형 전체폭 (가로 배너 등)
  // width·height 지정 시 표준 고정 규격 단위(예: 160×600). 이땐 format/responsive 무시.
  width?: number;
  height?: number;
  style?: CSSProperties;
  className?: string;
}

// 실제 애드센스 광고 단위 (<ins class="adsbygoogle">).
// 페이지 이동 시 새 광고가 나오게 하려면 사용처에서 key={pathname}으로 마운트.
// (새 경로 = 새 컴포넌트 인스턴스 = 새 push = 새 노출. 타이머 새로고침 아님 → 정책 준수)
export default function AdUnit({ slot, format = 'auto', responsive = true, width, height, style, className }: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    // StrictMode 등으로 effect가 두 번 돌아도 중복 push 방지
    if (pushed.current) return;
    pushed.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // 스크립트 미로딩/차단 시 조용히 무시
    }
  }, []);

  // 고정 규격 단위 (width·height 지정): data-ad-format 없이 inline-block + 정확한 px
  const isFixed = !!width && !!height;
  if (isFixed) {
    return (
      <ins
        className={`adsbygoogle ${className || ''}`}
        style={{ display: 'inline-block', width: `${width}px`, height: `${height}px`, ...style }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
      />
    );
  }

  return (
    <ins
      className={`adsbygoogle ${className || ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
