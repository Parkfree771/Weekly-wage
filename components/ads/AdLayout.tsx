'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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

// 좌우 사이드 레일 전체 비활성화 스위치 (재활용용).
// 현재: 로아온 종료 → 아크패스 효율 배너로 교체하여 노출.
const SIDE_RAILS_DISABLED = false;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { contentWidth, adTop } = getPageConfig(pathname);
  const [showSideAds, setShowSideAds] = useState(false);

  // 광고 레일 비활성 페이지
  // - /character: 오른쪽에 필터 통계 사이드바를 자체 배치
  // - /tier/vote: 직업 선택·투표 화면이 자체 사이드바를 써서 레일과 충돌
  // - /arkpass: 자체 효율 사이드바가 있어 레일과 충돌 + 같은 페이지 배너 중복
  const adsDisabled =
    pathname === '/character' || pathname === '/tier/vote' || pathname === '/arkpass';

  useEffect(() => {
    // 좌우 사이드 레일 전체 비활성화 스위치 (재활용용)
    if (SIDE_RAILS_DISABLED) {
      setShowSideAds(false);
      return;
    }

    if (adsDisabled) {
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
