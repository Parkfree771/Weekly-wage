'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PackagePost } from '@/types/package';
import HeroPackageCard from './HeroPackageCard';
import HeroAvatarCard from './HeroAvatarCard';
import styles from './MarketHero.module.css';

/**
 * 홈 맨 위 띠 — 판매 중인 최신 패키지 몇 개(일반 패키지 + 아바타 패키지).
 *
 * 2026-11-03: 알데바란의 바다 배경 그림·시즌 글자를 걷어내고 패키지 카드만 둔다(사용자 결정).
 * 글은 서버가 lib/home-packages.ts 로 최근 글 몇 건 중 판매 중인 것만 골라 넘긴다.
 * 일반 패키지는 구성품·이득률 카드, 아바타 패키지는 대표 이미지를 카드 전체에 깐 카드.
 * 카드가 띠 폭을 넘으면 가로로 넘긴다 — 데스크톱은 좌우 화살표, 모바일은 손가락으로.
 * 데스크톱 띠 높이(min-height 176)는 홈 사이드 광고 위치(components/ads/AdLayout.tsx adTop 208)에 맞춰져 있다.
 */
export default function MarketHero({ packages = [] }: { packages?: PackagePost[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update, packages.length]);

  // 한 번에 카드 한 장(폭 + 간격)씩
  const scrollBy = (dir: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 18 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className={styles.hero} aria-label="판매 중 패키지">
      {packages.length > 0 ? (
        <div className={styles.rowWrap}>
          <div ref={rowRef} className={styles.pkgRow}>
            {packages.map((p) => (p.packageType === '아바타'
              ? <HeroAvatarCard key={p.id} post={p} />
              : <HeroPackageCard key={p.id} post={p} />))}
          </div>
          {canLeft && (
            <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} onClick={() => scrollBy(-1)} aria-label="이전 패키지">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          {canRight && (
            <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} onClick={() => scrollBy(1)} aria-label="다음 패키지">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>
      ) : (
        <Link href="/package" className={styles.empty} prefetch={false}>
          지금 판매 중인 패키지가 없어요 · 지난 패키지 보기
        </Link>
      )}
    </section>
  );
}
