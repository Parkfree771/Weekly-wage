'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdSidebar from './AdSidebar';

interface PageConfig {
  contentWidth: number;
  adTop: number;
}

function getPageConfig(pathname: string): PageConfig {
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 110 };
  if (pathname === '/weekly-gold') return { contentWidth: 1800, adTop: 110 };
  if (pathname === '/hell-sim') return { contentWidth: 1200, adTop: 110 };
  if (pathname === '/life-master') return { contentWidth: 1200, adTop: 110 };
  if (pathname === '/mypage') return { contentWidth: 1600, adTop: 130 };
  if (pathname.startsWith('/package/')) return { contentWidth: 1100, adTop: 80 };
  if (pathname === '/package') return { contentWidth: 1400, adTop: 80 };
  return { contentWidth: 1400, adTop: 60 };
}

// 양쪽 사이드바: 160px * 2 + 갭 8px * 2 = 336px
const AD_EXTRA = 336;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname === '/package/register';
  const { contentWidth, adTop } = getPageConfig(pathname);
  const [showSideAds, setShowSideAds] = useState(false);

  useEffect(() => {
    const minViewport = contentWidth + AD_EXTRA;

    const check = () => {
      setShowSideAds(window.innerWidth >= minViewport);
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [contentWidth]);

  const layoutStyle: React.CSSProperties = showSideAds
    ? { maxWidth: `${contentWidth + AD_EXTRA}px` }
    : {};

  return (
    <div className="ad-layout" style={layoutStyle}>
      {showSideAds && !hideSidebar && <AdSidebar position="left" topOffset={adTop} />}
      <main className="ad-layout-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </main>
      {showSideAds && !hideSidebar && <AdSidebar position="right" topOffset={adTop} />}
    </div>
  );
}
