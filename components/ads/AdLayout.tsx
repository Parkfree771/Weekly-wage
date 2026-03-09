'use client';

import { useEffect, useState } from 'react';
import AdSidebar from './AdSidebar';

// 모든 페이지에서 메인 페이지 기준(1400px) 통일
const CONTENT_WIDTH = 1400;
const SIDEBAR_WIDTH = 160;
const SIDEBAR_GAP = 16;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const [sidebarLeft, setSidebarLeft] = useState<number | null>(null);

  useEffect(() => {
    const check = () => {
      const viewportW = window.innerWidth;
      const contentEnd = (viewportW + CONTENT_WIDTH) / 2;
      const spaceRight = viewportW - contentEnd;

      if (spaceRight >= SIDEBAR_WIDTH + SIDEBAR_GAP) {
        setSidebarLeft(contentEnd + SIDEBAR_GAP);
      } else {
        setSidebarLeft(null);
      }
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <>
      <main style={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </main>
      {sidebarLeft !== null && (
        <div
          className="ad-sidebar-float"
          style={{ left: `${sidebarLeft}px` }}
        >
          <AdSidebar position="right" topOffset={80} />
        </div>
      )}
    </>
  );
}
