'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getLoaOnStatus } from '@/lib/loaon-event';
import AdSidebar from './AdSidebar';

interface PageConfig {
  contentWidth: number;
  adTop: number;
}

// 각 페이지의 실제 콘텐츠 폭에 맞춤 (사이드 레일이 콘텐츠를 침범하지 않도록)
function getPageConfig(pathname: string): PageConfig {
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 110 };
  if (pathname === '/weekly-gold') return { contentWidth: 1800, adTop: 110 };
  if (pathname === '/life-master') return { contentWidth: 1200, adTop: 110 };
  if (pathname === '/mypage') return { contentWidth: 1600, adTop: 130 };
  if (pathname === '/character') return { contentWidth: 1400, adTop: 90 };
  if (pathname === '/tier') return { contentWidth: 1100, adTop: 90 };
  if (pathname === '/tier/vote') return { contentWidth: 1320, adTop: 90 };
  if (pathname === '/cathedral') return { contentWidth: 1200, adTop: 90 };
  if (pathname === '/cerka') return { contentWidth: 1200, adTop: 90 };
  if (pathname === '/extreme') return { contentWidth: 1200, adTop: 90 };
  if (pathname === '/bracelet') return { contentWidth: 900, adTop: 90 };
  if (pathname === '/hell-reward') return { contentWidth: 900, adTop: 90 };
  if (pathname.startsWith('/package/')) return { contentWidth: 1100, adTop: 80 };
  if (pathname === '/package') return { contentWidth: 1400, adTop: 80 };
  return { contentWidth: 1400, adTop: 60 };
}

// 양쪽 사이드바: 220px * 2 + 갭 8px * 2 = 456px
const AD_EXTRA = 456;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { contentWidth, adTop } = getPageConfig(pathname);
  const [showSideAds, setShowSideAds] = useState(false);

  // 캐릭터 조회 페이지는 광고 레일 비활성 (오른쪽에 필터 통계 사이드바를 자체 배치)
  const adsDisabled = pathname === '/character';

  useEffect(() => {
    if (adsDisabled) {
      setShowSideAds(false);
      return;
    }
    // 이벤트 종료 후에는 사이드 레일을 띄우지 않음 → 콘텐츠 풀폭 복귀
    if (getLoaOnStatus(Date.now()) === 'ended') {
      setShowSideAds(false);
      return;
    }

    // 콘텐츠 폭 + 양쪽 레일이 들어갈 만큼 넓은 뷰포트에서만 노출 (콘텐츠 침범 방지)
    const minViewport = contentWidth + AD_EXTRA;
    const check = () => setShowSideAds(window.innerWidth >= minViewport);

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [contentWidth, adsDisabled]);

  const layoutStyle: React.CSSProperties = showSideAds
    ? { maxWidth: `${contentWidth + AD_EXTRA}px` }
    : {};

  return (
    <div className="content-shell" style={layoutStyle}>
      {showSideAds && <AdSidebar position="left" topOffset={adTop} />}
      <main className="content-shell-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </main>
      {showSideAds && <AdSidebar position="right" topOffset={adTop} />}
    </div>
  );
}
