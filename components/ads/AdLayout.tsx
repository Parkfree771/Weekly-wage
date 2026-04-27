'use client';

import { usePathname } from 'next/navigation';

interface PageConfig {
  contentWidth: number;
}

function getPageConfig(pathname: string): PageConfig {
  if (pathname === '/refining') return { contentWidth: 1400 };
  if (pathname === '/weekly-gold') return { contentWidth: 1800 };
  if (pathname === '/life-master') return { contentWidth: 1200 };
  if (pathname === '/mypage') return { contentWidth: 1600 };
  if (pathname.startsWith('/package/')) return { contentWidth: 1100 };
  if (pathname === '/package') return { contentWidth: 1400 };
  if (pathname.startsWith('/title-stats')) return { contentWidth: 1600 };
  return { contentWidth: 1400 };
}

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { contentWidth } = getPageConfig(pathname);

  return (
    <div className="ad-layout" style={{ maxWidth: `${contentWidth}px` }}>
      <main className="ad-layout-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </main>
    </div>
  );
}
