'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { PackagePost, PackageItem } from '@/types/package';
import { boxDisplayIcon, calculatePostEfficiency, getDisplayOrder } from '@/lib/package-shared';
import { useNoPeon } from '@/components/package/useNoPeon';
import styles from './MarketHero.module.css';

// 띠 카드에 늘어놓을 구성품 수 — 넘치면 "+N"
const MAX_ICONS = 5;
const iconOf = (it: PackageItem) => it.icon || it.bundleItems?.[0]?.icon || null;

/**
 * 홈 맨 위 띠의 판매 중 패키지 카드 — 구성품 아이콘 몇 개 + 가격 + 이득률. 누르면 상세로.
 *
 * 이득률은 갤러리 정렬과 같은 calculatePostEfficiency(현재 시세 · 글에 저장된 환율 · 페온 제외 설정)로 낸다.
 * 묶음(3+1·2+1·3+보너스)은 묶음 기준 이득률 — 갤러리 카드 맨 아래 "3+1 이득률" 과 같은 숫자다.
 * 시세는 홈 차트가 이미 받아 둔 캐시(fetchLatestPrices)라 요청이 더 나가지 않는다.
 */
export default function HeroPackageCard({ post }: { post: PackagePost }) {
  const [prices, setPrices] = useState<Record<string, number> | null>(null);
  const [noPeon] = useNoPeon();

  useEffect(() => {
    let cancelled = false;
    import('@/lib/price-history-client')
      .then(({ fetchLatestPrices }) => fetchLatestPrices())
      .then((p) => { if (!cancelled) setPrices(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const benefit = useMemo(() => {
    const gpw = post.goldPerWon || 0;
    if (!prices || gpw <= 0) return null;
    const eff = calculatePostEfficiency(post, prices, undefined, noPeon);
    return eff > 0 ? (eff / gpw) * 100 - 100 : null;
  }, [post, prices, noPeon]);

  const ordered = useMemo(() => getDisplayOrder(post.items).map((i) => post.items[i]), [post.items]);
  const shown = ordered.slice(0, MAX_ICONS);
  const rest = ordered.length - shown.length;
  const isBundle = post.packageType === '3+1' || post.packageType === '2+1' || post.packageType === '3+보너스';
  const label = isBundle ? `${post.packageType} 이득률` : '이득률';

  return (
    <Link href={`/package/${post.id}`} className={styles.pkg} title={`${post.title} — 패키지 효율 자세히 보기`}>
      <span className={styles.pkgHead}>
        <span className={styles.pkgBadge}>판매 중</span>
        <span className={styles.pkgTitle}>{post.title}</span>
      </span>
      <span className={styles.pkgBody}>
        <span className={styles.pkgItems}>
          {shown.map((it, i) => {
            const icon = iconOf(it);
            return (
              <span key={i} className={styles.pkgItem} title={`${it.name} ×${it.quantity.toLocaleString('ko-KR')}`}>
                {icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={boxDisplayIcon(icon)} alt="" loading="lazy" decoding="async" />
                )}
                <span className={`font-numeric ${styles.pkgQty}`}>×{it.quantity.toLocaleString('ko-KR')}</span>
              </span>
            );
          })}
          {rest > 0 && <span className={styles.pkgMore}>+{rest}</span>}
        </span>
        <span className={styles.pkgNumbers}>
          <span className={`font-numeric ${styles.pkgPrice}`}>{post.royalCrystalPrice.toLocaleString('ko-KR')}원</span>
          <span className={styles.pkgBenefitLabel}>{label}</span>
          <span
            className={`font-numeric ${styles.pkgBenefit} ${benefit === null ? '' : benefit >= 0 ? styles.pkgGain : styles.pkgLoss}`}
          >
            {benefit === null ? '—' : `${benefit >= 0 ? '+' : '−'}${Math.abs(benefit).toFixed(1)}%`}
          </span>
        </span>
      </span>
    </Link>
  );
}
