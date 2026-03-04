'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  slot: string;
  className?: string;
}

export default function AdBanner({ slot, className }: AdBannerProps) {
  const adRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    <div ref={containerRef} className={`ad-banner-container ${className || ''}`} style={{ maxHeight: '60px', overflow: 'hidden' }}>
      {isDev ? (
        <div style={{
          width: '100%',
          height: '90px',
          border: '2px dashed #6366f1',
          borderRadius: '8px',
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.85rem',
          color: '#6366f1',
          fontWeight: 600,
        }}>
          광고 배너 (수평형 728×90)
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-6944494802169618"
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
