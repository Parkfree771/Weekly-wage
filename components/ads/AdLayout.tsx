'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdSidebar from './AdSidebar';

interface PageConfig {
  contentWidth: number;
  adTop: number; // 광고 시작 위치 (px) - 페이지 제목 아래 컨텐츠와 어깨 맞춤
}

function getPageConfig(pathname: string): PageConfig {
  // 재련 계산 - 실제 컨텐츠(계산기/시뮬레이터) max-width:1400
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 110 };
  // 주간 계산 - Container maxWidth:1800
  if (pathname === '/weekly-gold') return { contentWidth: 1800, adTop: 110 };
  // 지옥 시뮬 - 실제 게임 영역(.gameLayout) max-width:1200
  if (pathname === '/hell-sim') return { contentWidth: 1200, adTop: 110 };
  // 생활 계산 - Container maxWidth:1200
  if (pathname === '/life-master') return { contentWidth: 1200, adTop: 110 };
  // 마이페이지 - CSS max-width:1400, padding-top:80px + 헤더
  if (pathname === '/mypage') return { contentWidth: 1400, adTop: 130 };
  // 패키지 상세/등록/수정
  if (pathname.startsWith('/package/')) return { contentWidth: 1100, adTop: 80 };
  // 패키지 목록
  if (pathname === '/package') return { contentWidth: 1400, adTop: 80 };
  // 홈 - Container maxWidth:1400
  return { contentWidth: 1400, adTop: 60 };
}

// 광고 1개: 160px, 갭: 8px, 좌우 합계: 160*2 + 8*2 = 336px
const AD_EXTRA = 336;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      {showSideAds && <AdSidebar position="left" topOffset={adTop} />}
      <main className="ad-layout-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </main>
      {showSideAds && <AdSidebar position="right" topOffset={adTop} />}
    </div>
  );
}
