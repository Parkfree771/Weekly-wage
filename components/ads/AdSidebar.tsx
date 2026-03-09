'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// 애드센스 활성화 시 true로 변경
const ADSENSE_ACTIVE = false;

const FEEDBACK_URL = 'https://forms.gle/n9XKQJmheLhZcSf69';

interface AdSidebarProps {
  position: 'left' | 'right';
  topOffset?: number;
}

export default function AdSidebar({ position, topOffset = 80 }: AdSidebarProps) {
  const adRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!ADSENSE_ACTIVE || adRef.current) return;
    adRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet
    }

    const timer = setTimeout(() => {
      const ins = containerRef.current?.querySelector('ins.adsbygoogle');
      if (ins && (ins as HTMLElement).offsetHeight === 0) {
        setHidden(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const isDev = process.env.NODE_ENV === 'development';

  // 애드센스 비활성 → 자체 홍보 배너
  if (!ADSENSE_ACTIVE) {
    return (
      <aside
        className={`ad-sidebar ad-sidebar-${position}`}
        style={{ paddingTop: `${topOffset}px` }}
      >
        <div className="ad-sidebar-sticky">
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="promo-banner-vertical"
          >
            <div className="promo-v-icon">💡</div>
            <div className="promo-v-title">로아로골 건의함</div>
            <div className="promo-v-desc">
              이런 기능이 있으면<br />좋겠다! 하는 아이디어를<br />보내주세요
            </div>
            <div className="promo-v-cta">건의하기</div>
          </a>
        </div>
      </aside>
    );
  }

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
