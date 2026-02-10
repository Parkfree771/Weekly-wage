'use client';

import { useState, useMemo } from 'react';
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

function formatShortDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102007': 100,
  '66102107': 100,
  '66130143': 3000,
};

export default function PackageGalleryCard({ post, latestPrices }: Props) {
  const router = useRouter();

  const defaultWon = post.goldPerWon && post.goldPerWon > 0
    ? Math.round(100 / post.goldPerWon)
    : 0;
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(defaultWon);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    post.items.forEach((_, idx) => {
      initial[idx] = true;
    });
    return initial;
  });

  const handleToggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const totalGold = useMemo(() => {
    return post.items.reduce((sum, item, idx) => {
      if (checkedItems[idx] === false) return sum;
      if (item.goldOverride != null) return sum + item.goldOverride * item.quantity;
      const raw = latestPrices[item.itemId] || 0;
      const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
      return sum + (raw / bundle) * item.quantity;
    }, 0);
  }, [post.items, latestPrices, checkedItems]);

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;
  const cashGold = post.royalCrystalPrice * goldPerWon;
  const isBundle = post.packageType === '3+1' || post.packageType === '2+1';

  const singleBenefit = cashGold > 0 ? ((totalGold - cashGold) / cashGold) * 100 : 0;

  const buyCount = post.packageType === '3+1' ? 3 : post.packageType === '2+1' ? 2 : 1;
  const getCount = post.packageType === '3+1' ? 4 : post.packageType === '2+1' ? 3 : 1;
  const bundleCash = cashGold * buyCount;
  const bundleGold = totalGold * getCount;
  const bundleBenefit = bundleCash > 0 ? ((bundleGold - bundleCash) / bundleCash) * 100 : 0;

  return (
    <article className={styles.galleryCard} onClick={() => router.push(`/package/${post.id}`)} style={{ cursor: 'pointer' }}>
      {/* 왼쪽: 아이템 목록 (배경 이미지) */}
      <div className={styles.leftBox}>
        <div className={styles.leftHeader}>
          <h3 className={styles.cardTitle}>{post.title}</h3>
          <span className={`${styles.cardBadge} ${getBadgeClass(post.packageType)}`}>
            {post.packageType}
          </span>
        </div>

        <div className={styles.itemGrid}>
          {post.items.map((item, idx) => {
            const isChecked = checkedItems[idx] !== false;
            return (
              <div
                key={idx}
                className={`${styles.itemCell} ${!isChecked ? styles.itemCellUnchecked : ''}`}
              >
                {item.icon && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.icon} alt={item.name} className={styles.itemCellIcon} />
                )}
                <label
                  className={styles.itemCheckLabel}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleCheck(idx);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className={styles.itemCheckInput}
                  />
                  <span className={styles.itemCheckBox}>
                    {isChecked && (
                      <svg viewBox="0 0 12 10" className={styles.itemCheckIcon}>
                        <polyline points="1.5 5 4.5 8 10.5 2" />
                      </svg>
                    )}
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        <div className={styles.leftMeta}>
          <div className={styles.metaLeft}>
            <span><span className={styles.metaHeart}>{'\u2665'}</span> {post.likeCount || 0}</span>
            <span>{'\uD83D\uDC41'} {post.viewCount || 0}</span>
          </div>
          <span className={styles.metaDate}>{formatShortDate(post.createdAt)}</span>
        </div>
      </div>

      {/* 오른쪽: 계산 결과 */}
      <div className={styles.rightBox}>
        <div className={styles.rightTop}>
          {/* 패키지 가격 */}
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>패키지 가격</span>
            <span className={styles.resultValue}>{formatNumber(post.royalCrystalPrice)}원</span>
          </div>

          {/* 총 골드 가치 */}
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>총 골드 가치</span>
            <span className={styles.resultValueGold}>{formatNumber(totalGold)} G</span>
          </div>

          {isBundle && (
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>{post.packageType} 보정</span>
              <span className={styles.resultValueGold}>{formatNumber(totalGold * getCount)} G</span>
            </div>
          )}

          <div className={styles.resultDivider} />

          {/* 환율 */}
          <div className={styles.resultRow} onClick={(e) => e.stopPropagation()}>
            <span className={styles.resultLabel}>환율</span>
            <div className={styles.rateRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gold.webp" alt="골드" className={styles.rateIconGold} />
              <span className={styles.rateFixed}>100</span>
              <span className={styles.rateSep}>:</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/royal.webp" alt="로얄" className={styles.rateIconRoyal} />
              <input
                type="number"
                className={styles.rateInput}
                value={wonPer100Gold || ''}
                onChange={(e) => setWonPer100Gold(parseInt(e.target.value) || 0)}
                placeholder="32"
                min={1}
              />
            </div>
          </div>
          <span className={styles.rateHint}>&#8593; 직접 수정 가능</span>

          {/* 이득률 */}
          {goldPerWon > 0 && (
            <>
              <div className={styles.resultDivider} />
              <div className={styles.benefitArea}>
                <div className={styles.benefitLine}>
                  <span className={styles.benefitLabel}>1개 구매</span>
                  <span className={`${styles.benefitValue} ${singleBenefit >= 0 ? styles.benefitPositive : styles.benefitNegative}`}>
                    {singleBenefit >= 0 ? '+' : ''}{singleBenefit.toFixed(1)}%
                  </span>
                </div>
                {isBundle && (
                  <div className={styles.benefitLine}>
                    <span className={styles.benefitLabel}>{post.packageType} 구매</span>
                    <span className={`${styles.benefitValue} ${bundleBenefit >= 0 ? styles.benefitPositive : styles.benefitNegative}`}>
                      {bundleBenefit >= 0 ? '+' : ''}{bundleBenefit.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.detailLink}>
          상세보기 &#8594;
        </div>
      </div>
    </article>
  );
}
