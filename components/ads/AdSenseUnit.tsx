'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import AdPlaceholder from './AdPlaceholder';
import { AD_PREVIEW, ADSENSE_CLIENT } from './adConfig';
import type { AdSize } from './adConfig';

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

interface AdSenseUnitProps {
  /** 광고 단위 ID(data-ad-slot). 비어 있으면 렌더하지 않는다(미리보기 제외). */
  slot: string;
  size: AdSize;
  /** 미리보기 박스에 찍을 자리 이름 */
  label: string;
  className?: string;
  style?: CSSProperties;
}

// 구글 애드센스 광고 단위.
//
// 반응형 단위를 CSS 로 정한 칸(width·height)에 띄운다 — data-ad-format 을 빼면
// 애드센스가 칸 크기에 맞는 소재만 고른다(도움말 "반응형 광고 코드 수정" 방식).
// 칸 높이가 고정이라 광고가 채워질 때 아래 콘텐츠가 밀리지 않는다.
//
// ins 는 마운트 후에만 렌더하고 ins 하나당 push 를 한 번만 한다 — 같은 ins 에 두 번 push 하면
// "already have ads" 오류가 난다(개발 모드 effect 이중 실행 포함).
// 페이지 이동 때 새 광고를 받으려면 부르는 쪽에서 key 를 바꿔 새 ins 를 만든다.
export default function AdSenseUnit({ slot, size, label, className, style }: AdSenseUnitProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pushed.current || !insRef.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 로더가 막힌 경우 — 칸만 비어 있게 둔다
    }
  }, [mounted]);

  const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
  const box: CSSProperties = {
    display: 'block',
    width: px(size.width),
    maxWidth: size.maxWidth ? `${size.maxWidth}px` : undefined,
    height: px(size.height),
    margin: '0 auto',
  };
  // 칸 높이를 미리 잡아 둘 값 — '100%' 처럼 부모를 따르는 칸은 minHeight 를 쓴다
  const reserve = px(typeof size.height === 'number' ? size.height : size.minHeight ?? 0);

  if (AD_PREVIEW) {
    const w = typeof size.width === 'number' ? `${size.width}` : `${size.width}${size.maxWidth ? `(최대 ${size.maxWidth})` : ''}`;
    return (
      <div className={className} style={style}>
        <AdPlaceholder
          label={`광고 · ${label}`}
          sub={`애드센스 ${w}×${size.height}`}
          // lineHeight: 광고 자리 CSS 가 기준선 여백을 없애려 line-height 0 을 걸어 둔 곳이 있다
          style={{ ...box, minHeight: reserve, lineHeight: 1.3 }}
        />
      </div>
    );
  }

  if (!slot) return null;

  // 마운트 전에도 칸 높이를 잡아 둔다 — ins 가 늦게 들어오며 아래 콘텐츠를 밀지 않게
  return (
    <div className={className} style={{ minHeight: reserve, ...style }}>
      {mounted && (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={box}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
        />
      )}
    </div>
  );
}
