'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PackagePost, PackageType } from '@/types/package';
import styles from './PackageGalleryCard.module.css';

type Props = {
  post: PackagePost;
  latestPrices: Record<string, number>;
};

function getBadgeClass(type: PackageType): string {
  if (type === '3+1') return styles.badge31;
  if (type === '2+1') return styles.badge21;
  return styles.badgeNormal;
}

function formatNumber(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 10) {
    return n.toFixed(3);
  }
  return Math.round(n).toLocaleString('ko-KR');
}

const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102007': 100,
  '66102107': 100,
  '66130143': 3000,
};

export default function PackageGalleryCard({ post, latestPrices }: Props) {
  const router = useRouter();

  // 등록 시 저장된 환율에서 기본값 추출
  const defaultWon = post.goldPerWon && post.goldPerWon > 0
    ? Math.round(100 / post.goldPerWon)
    : 0;
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(defaultWon);

  const totalGold = post.items.reduce((sum, item) => {
    if (item.goldOverride != null) return sum + item.goldOverride * item.quantity;
    const raw = latestPrices[item.itemId] || 0;
    const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
    return sum + (raw / bundle) * item.quantity;
  }, 0);

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;
  const cashGold = post.royalCrystalPrice * goldPerWon;
  const isBundle = post.packageType === '3+1' || post.packageType === '2+1';

  // 1개 구매 이득률
  const singleBenefit = cashGold > 0 ? ((totalGold - cashGold) / cashGold) * 100 : 0;

  // N+1 이득률
  const buyCount = post.packageType === '3+1' ? 3 : post.packageType === '2+1' ? 2 : 1;
  const getCount = post.packageType === '3+1' ? 4 : post.packageType === '2+1' ? 3 : 1;
  const bundleCash = cashGold * buyCount;
  const bundleGold = totalGold * getCount;
  const bundleBenefit = bundleCash > 0 ? ((bundleGold - bundleCash) / bundleCash) * 100 : 0;

  const handleCardClick = () => {
    router.push(`/package/${post.id}`);
  };

  return (
    <article className={styles.galleryCard} onClick={handleCardClick}>
      <div className={styles.cardTop}>
        <span className={`${styles.cardBadge} ${getBadgeClass(post.packageType)}`}>
          {post.packageType}
        </span>
      </div>

      <h3 className={styles.cardTitle}>{post.title}</h3>

      {/* 아이템 아이콘 */}
      <div className={styles.cardItemIcons}>
        {post.items.slice(0, 5).map((item, idx) =>
          item.icon ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={idx} src={item.icon} alt="" className={styles.cardItemIcon} />
          ) : null,
        )}
        {post.items.length > 5 && (
          <span className={styles.cardItemMore}>+{post.items.length - 5}</span>
        )}
      </div>

      {/* 이득률 */}
      {goldPerWon > 0 && (
        <div className={styles.cardBenefitArea}>
          <div className={styles.cardBenefitLine}>
            <span className={styles.cardBenefitLabel}>1개</span>
            <span className={`${styles.cardBenefitValue} ${singleBenefit >= 0 ? styles.benefitPositive : styles.benefitNegative}`}>
              {singleBenefit >= 0 ? '+' : ''}{singleBenefit.toFixed(1)}%
            </span>
          </div>
          {isBundle && (
            <div className={styles.cardBenefitLine}>
              <span className={styles.cardBenefitLabel}>{post.packageType}</span>
              <span className={`${styles.cardBenefitValue} ${bundleBenefit >= 0 ? styles.benefitPositive : styles.benefitNegative}`}>
                {bundleBenefit >= 0 ? '+' : ''}{bundleBenefit.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 골드/원 */}
      <div className={styles.cardGoldValue}>
        {formatNumber(totalGold)}G / {formatNumber(post.royalCrystalPrice)}원
      </div>

      {/* 환율 입력 */}
      <div
        className={styles.cardRateRow}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gold.webp" alt="골드" className={styles.cardRateIcon} />
        <span className={styles.cardRateFixed}>100</span>
        <span className={styles.cardRateSep}>:</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/royal.webp" alt="로얄" className={styles.cardRateIcon} />
        <input
          type="number"
          className={styles.cardRateInput}
          value={wonPer100Gold || ''}
          onChange={(e) => setWonPer100Gold(parseInt(e.target.value) || 0)}
          placeholder="32"
          min={1}
        />
      </div>

    </article>
  );
}
