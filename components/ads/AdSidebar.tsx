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
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-title">주간 골드 계산</span>
                <span className="sidebar-btn-desc">지평의 성당 보상, 더보기 효율 확인</span>
              </div>
            </Link>
            <Link href="/cathedral" className="sidebar-update-btn">
              <Image src="/dmschddmlvkvus.webp" alt="" width={18} height={18} />
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-title">지평의 성당 <span className="sidebar-beta-badge">NEW</span></span>
                <span className="sidebar-btn-desc">은총의 파편 교환 상점 확인</span>
              </div>
            </Link>
            <Link href="/mypage" className="sidebar-update-btn">
              <Image src="/top-destiny-destruction-stone5.webp" alt="" width={18} height={18} />
              <div className="sidebar-btn-text">
                <span className="sidebar-btn-title">마이페이지</span>
                <span className="sidebar-btn-desc">1750 신규 일일 컨텐츠 수급량 확인</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
