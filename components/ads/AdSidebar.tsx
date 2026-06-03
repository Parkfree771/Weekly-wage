'use client';

import LoaOnBanner from '@/components/event/LoaOnBanner';

interface AdSidebarProps {
  position: 'left' | 'right';
  topOffset?: number;
}

export default function AdSidebar({ position, topOffset = 80 }: AdSidebarProps) {
  return (
    <aside
      className={`side-rail side-rail-${position}`}
      style={{ paddingTop: `${topOffset}px` }}
    >
      <div className="side-rail-sticky">
        <LoaOnBanner />
      </div>
    </aside>
  );
}
