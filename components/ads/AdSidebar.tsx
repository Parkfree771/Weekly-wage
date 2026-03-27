'use client';

interface AdSidebarProps {
  position: 'left' | 'right';
  topOffset?: number;
}

export default function AdSidebar({ position, topOffset = 80 }: AdSidebarProps) {
  // 애드센스 사이드바 슬롯 자리 (나중에 광고 코드 삽입)
  return (
    <aside
      className={`ad-sidebar ad-sidebar-${position}`}
      style={{ paddingTop: `${topOffset}px` }}
    >
      <div className="ad-sidebar-sticky" />
    </aside>
  );
}
