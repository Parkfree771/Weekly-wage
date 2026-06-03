'use client';

import LoaOnBanner from '@/components/event/LoaOnBanner';

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
        <LoaOnBanner />
      </div>
    </aside>
  );
}
