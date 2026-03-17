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
        <div className="sidebar-update-card">
          {/* 배경 이미지 */}
          <div className="sidebar-update-image">
            <Image
              src="/wlvuddmltjdekd1.webp"
              alt="지평의 성당"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
            />
            <div className="sidebar-update-overlay" />
            <div className="sidebar-update-content">
              <div className="sidebar-update-title">지평의 성당</div>
              <div className="sidebar-update-subtitle">3월 18일 오전 10시<br />업데이트 예정</div>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="sidebar-update-buttons">
            <Link href="/weekly-gold" className="sidebar-update-btn">
              <Image src="/gold.webp" alt="" width={18} height={18} />
              <span>주간 골드 계산</span>
            </Link>
            <Link href="/cathedral" className="sidebar-update-btn">
              <Image src="/dmschddmlvkvus.webp" alt="" width={18} height={18} />
              <span>지평의 성당 <span className="sidebar-beta-badge">BETA</span></span>
            </Link>
            <Link href="/mypage" className="sidebar-update-btn">
              <Image src="/top-destiny-destruction-stone5.webp" alt="" width={18} height={18} />
              <span>마이페이지</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
