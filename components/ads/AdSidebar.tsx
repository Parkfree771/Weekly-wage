'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdSidebarProps {
  position: 'left' | 'right';
  topOffset?: number;
}

export default function AdSidebar({ position, topOffset = 80 }: AdSidebarProps) {
  // 광고 일시 중지 - 라이선스 확인 후 해제
  return null;
  const adRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (adRef.current) return;
    adRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet
    }

    // 3초 후 광고 로드 여부 확인
    const timer = setTimeout(() => {
      const ins = containerRef.current?.querySelector('ins.adsbygoogle');
      if (ins && (ins as HTMLElement).offsetHeight === 0) {
        setHidden(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && hidden) return null;

  return (
    <aside
      ref={containerRef}
      className={`ad-sidebar ad-sidebar-${position}`}
      style={{ paddingTop: `${topOffset}px` }}
    >
      <div className="ad-sidebar-sticky">
        {isDev ? (
          <div style={{
            width: '100%',
            minHeight: '600px',
            border: '2px dashed #ea580c',
            borderRadius: '8px',
            backgroundColor: 'rgba(234, 88, 12, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            color: '#ea580c',
            fontWeight: 600,
            textAlign: 'center',
            padding: '8px',
          }}>
            광고<br/>({position})<br/>160×600
          </div>
        ) : (
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-6944494802169618"
            data-ad-slot={position === 'left' ? '8780314891' : '5718203134'}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    </aside>
  );
}
