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
        <Link href="/title-stats" className="promo-sidebar-extreme">
          <div className="promo-sidebar-img-wrap">
            <Image
              src="/dlrtmxmfla.webp"
              alt="홍염의 군주 명예의 전당"
              width={160}
              height={90}
              style={{ width: '100%', height: 'auto', borderRadius: '8px 8px 0 0', display: 'block' }}
            />
            <div className="promo-sidebar-img-overlay" />
            <span className="promo-sidebar-badge">NEW</span>
          </div>
          <div className="promo-sidebar-body">
            <span className="promo-sidebar-title">홍염의 군주 명예의 전당</span>
            <span className="promo-sidebar-desc">전투력 통계 · 선봉 10공대 랭킹</span>
            <span className="promo-sidebar-cta">바로가기 →</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
