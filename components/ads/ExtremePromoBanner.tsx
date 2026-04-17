'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ExtremePromoBanner() {
  const pathname = usePathname();
  if (pathname === '/extreme') return null;

  return (
    <div className="d-block d-lg-none my-3">
      <Link href="/extreme" className="promo-extreme-mobile">
        <Image
          src="/dlrtmxmfla.webp"
          alt="익스트림"
          width={60}
          height={40}
          className="promo-extreme-mobile-img"
        />
        <div className="promo-extreme-mobile-text">
          <strong>익스트림 레이드</strong>
          <span>보상 정리 · 칭호 전투력 통계</span>
        </div>
        <span className="promo-extreme-mobile-badge">NEW</span>
      </Link>
    </div>
  );
}
