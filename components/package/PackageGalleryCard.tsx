'use client';

import Link from 'next/link';
import type { PackagePost, PackageType } from '@/types/package';
import styles from './PackageGalleryCard.module.css';

type Props = {
  post: PackagePost;
  latestPrices: Record<string, number>;
};

/** 패키지 타입별 뱃지 클래스 */
function getBadgeClass(type: PackageType): string {
  if (type === '3+1') return styles.badge31;
  if (type === '2+1') return styles.badge21;
  return styles.badgeNormal;
}

/** 패키지 타입별 배수 */
function getMultiplier(type: PackageType): number {
  if (type === '3+1') return 4 / 3;
  if (type === '2+1') return 3 / 2;
  return 1;
}

/** 숫자 포맷 (1000 → 1,000) */
function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

/** 묶음 단위 (API 가격 기준) */
const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102007': 100,
  '66102107': 100,
  '66130143': 3000,
};

export default function PackageGalleryCard({ post, latestPrices }: Props) {
  const totalGold = post.items.reduce((sum, item) => {
    if (item.goldOverride != null) return sum + item.goldOverride * item.quantity;
    const raw = latestPrices[item.itemId] || 0;
    const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
    return sum + (raw / bundle) * item.quantity;
  }, 0);

  const multiplier = getMultiplier(post.packageType);
  const adjustedValue = totalGold * multiplier;
  const efficiency = post.royalCrystalPrice > 0
    ? adjustedValue / post.royalCrystalPrice
    : 0;

  return (
    <Link href={`/package/${post.id}`} className={styles.cardLink}>
      <article className={styles.galleryCard}>
        {/* 타입 뱃지 */}
        <span className={`${styles.cardBadge} ${getBadgeClass(post.packageType)}`}>
          {post.packageType}
        </span>

        {/* 제목 */}
        <h3 className={styles.cardTitle}>{post.title}</h3>

        {/* 효율 지표 */}
        <div className={styles.cardEfficiency}>
          {formatNumber(efficiency)} G/원
        </div>
        <div className={styles.cardGoldValue}>
          {formatNumber(adjustedValue)}G / {formatNumber(post.royalCrystalPrice)}원
        </div>

        {/* 메타 */}
        <div className={styles.cardMeta}>
          <span className={styles.cardItemCount}>
            {post.items.length}개 아이템
          </span>
          <span>{post.authorName}</span>
        </div>
      </article>
    </Link>
  );
}
