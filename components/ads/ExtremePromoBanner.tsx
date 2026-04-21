'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ExtremePromoBanner() {
  const pathname = usePathname();
  if (pathname === '/extreme' || pathname === '/title-stats') return null;

  return (
    <div className="d-block d-lg-none my-3">
      <Link href="/title-stats" className="promo-extreme-mobile">
        <Image
          src="/dlrtmxmfla.webp"
          alt="홍염의 군주 명예의 전당"
          width={60}
          height={40}
          className="promo-extreme-mobile-img"
        />
        <div className="promo-extreme-mobile-text">
          <strong>홍염의 군주 명예의 전당</strong>
          <span>전투력 통계 · 선봉 10공대 랭킹</span>
        </div>
        <span className="promo-extreme-mobile-badge">NEW</span>
      </Link>
    </div>
  );
}
