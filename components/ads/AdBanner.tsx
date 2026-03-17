'use client';

import Image from 'next/image';
import Link from 'next/link';

interface AdBannerProps {
  slot: string;
  className?: string;
}

export default function AdBanner({ slot, className }: AdBannerProps) {
  return (
    <div className={`inline-update-card ${className || ''}`}>
      <Image
        src="/wlvuddmltjdekd1.webp"
        alt="지평의 성당"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
      />
      <div className="inline-update-overlay" />
      <div className="inline-update-inner">
        <div className="inline-update-header">
          <div className="inline-update-title">지평의 성당</div>
          <div className="inline-update-subtitle">3.18 오전 10시 업데이트 예정</div>
        </div>
        <div className="inline-update-buttons">
          <Link href="/weekly-gold" className="inline-update-btn">
            <Image src="/gold.webp" alt="" width={20} height={20} />
            <span>클리어 보상, 더보기 효율</span>
          </Link>
          <Link href="/cathedral" className="inline-update-btn">
            <Image src="/dmschddmlvkvus.webp" alt="" width={20} height={20} />
            <span>은총의 파편 상점</span>
          </Link>
          <Link href="/mypage" className="inline-update-btn">
            <Image src="/top-destiny-destruction-stone5.webp" alt="" width={20} height={20} />
            <span>1750 수급량 확인</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
