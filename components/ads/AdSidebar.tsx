'use client';

import Image from 'next/image';
import Link from 'next/link';

interface AdSidebarProps {
  position: 'left' | 'right';
  topOffset?: number;
}

export default function AdSidebar({ position, topOffset = 80 }: AdSidebarProps) {
  return (
    <aside
      className={`ad-sidebar ad-sidebar-${position}`}
      style={{ paddingTop: `${topOffset}px` }}
    >
      <div className="ad-sidebar-sticky">
        <Link href="/extreme" className="promo-sidebar-extreme">
          <div className="promo-sidebar-img-wrap">
            <Image
              src="/dlrtmxmfla.webp"
              alt="익스트림 레이드"
              width={160}
              height={90}
              style={{ width: '100%', height: 'auto', borderRadius: '8px 8px 0 0', display: 'block' }}
            />
            <div className="promo-sidebar-img-overlay" />
            <span className="promo-sidebar-badge">NEW</span>
          </div>
          <div className="promo-sidebar-body">
            <span className="promo-sidebar-title">익스트림 레이드</span>
            <span className="promo-sidebar-desc">보상 정리 · 전투력 통계</span>
            <span className="promo-sidebar-cta">바로가기 →</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
