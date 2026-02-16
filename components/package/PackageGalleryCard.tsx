'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { PackagePost, PackageType } from '@/types/package';
import {
  formatNumber,
  PRICE_BUNDLE_SIZE,
  CRYSTAL_PER_UNIT_FALLBACK,
} from '@/lib/package-shared';
import { calcTicketAverage } from '@/lib/hell-reward-calc';
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

function formatShortDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

// 갤러리 카드 아이콘 크기 오버라이드 (기본 50px, 셀 76px 고정)
const GALLERY_ICON_SIZE: Record<string, number> = {
  'fixed_gold-input': 36,
  'fixed_hell-heroic-ticket': 72,
  'crystal_pheon': 66,
  'expected_gem-choice': 66,
};
const GALLERY_ICON_RE: [RegExp, number][] = [
  [/^674/, 66], // 젬 선택 아이템 (영웅 젬 상자에서 선택된 젬)
];
function getGalleryIconSize(itemId: string): number | undefined {
  if (GALLERY_ICON_SIZE[itemId]) return GALLERY_ICON_SIZE[itemId];
  for (const [re, size] of GALLERY_ICON_RE) {
    if (re.test(itemId)) return size;
  }
  return undefined;
}

// 갤러리 카드 아이콘 밝기 오버라이드 (기본 1.3, CSS filter: brightness)
const GALLERY_ICON_BRIGHTNESS: Record<string, number> = {
  '66112715': 1,   // 장인의 야금술 : 3단계
  '66112717': 1,   // 장인의 야금술 : 4단계
  '66112716': 1,   // 장인의 재봉술 : 3단계
  '66112718': 1,   // 장인의 재봉술 : 4단계
};

// 기존 데이터 대응: 개별 선택 아이콘 → 상자 아이콘 복원
function getDisplayIcon(icon: string): string {
  if (/gem-(order|chaos)-/.test(icon)) return '/gem-hero.webp';
  return icon;
}

export default function PackageGalleryCard({ post, latestPrices }: Props) {
  const router = useRouter();

  const defaultWon = post.goldPerWon && post.goldPerWon > 0
    ? Math.round(100 / post.goldPerWon)
    : 0;
  const [wonPer100Gold, setWonPer100Gold] = useState<number>(defaultWon);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    if (post.selectableCount && post.selectableCount > 0) {
      // 가장 비싼 N개만 체크
      const withValue = post.items.map((item, idx) => {
        const value = item.goldOverride != null
          ? item.goldOverride * item.quantity
          : (() => {
              const raw = latestPrices[item.itemId] || 0;
              const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
              return (raw / bundle) * item.quantity;
            })();
        return { idx, value };
      });
      withValue.sort((a, b) => b.value - a.value);
      post.items.forEach((_, idx) => { initial[idx] = false; });
      withValue.slice(0, post.selectableCount).forEach((v) => {
        initial[v.idx] = true;
      });
    } else {
      post.items.forEach((_, idx) => {
        initial[idx] = true;
      });
    }
    return initial;
  });

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  // 티켓 동적 시세 계산 (시세 변동 시 자동 반영)
  const getTicketDynamicUnit = (itemId: string, fallback: number): number => {
    const bcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
    if (bcRate > 0 && Object.keys(latestPrices).length > 0) {
      if (itemId === 'fixed_hell-legendary-ticket')
        return calcTicketAverage('hell', 7, latestPrices, bcRate);
      if (itemId === 'fixed_hell-heroic-ticket')
        return calcTicketAverage('hell', 6, latestPrices, bcRate);
      if (itemId === 'fixed_naraka-legendary-ticket')
        return calcTicketAverage('narak', 2, latestPrices, bcRate);
    }
    return fallback;
  };

  // 아이템별 소계 (N선택 토글 로직용)
  const itemSubtotals = useMemo(() => {
    return post.items.map((item) => {
      if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
        return item.crystalPerUnit * goldPerWon * 27.5 * item.quantity;
      }
      // 기존 패키지 하위 호환
      if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
        const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
        if (fallback) return fallback * goldPerWon * 27.5 * item.quantity;
      }
      if (item.goldOverride != null) {
        const dynamicUnit = getTicketDynamicUnit(item.itemId, item.goldOverride);
        return dynamicUnit * item.quantity;
      }
      const raw = latestPrices[item.itemId] || 0;
      const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
      return (raw / bundle) * item.quantity;
    });
  }, [post.items, latestPrices, goldPerWon]);

  const handleToggleCheck = (idx: number) => {
    const sc = post.selectableCount || 0;
    setCheckedItems((prev) => {
      const isChecked = prev[idx] !== false;
      if (isChecked) {
        return { ...prev, [idx]: false };
      }
      if (sc > 0) {
        const checkedCount = Object.values(prev).filter((v) => v !== false).length;
        if (checkedCount >= sc) {
          let minIdx = -1;
          let minValue = Infinity;
          Object.entries(prev).forEach(([i, checked]) => {
            if (checked !== false) {
              const val = itemSubtotals[+i] || 0;
              if (val < minValue) { minValue = val; minIdx = +i; }
            }
          });
          if (minIdx >= 0) return { ...prev, [minIdx]: false, [idx]: true };
        }
      }
      return { ...prev, [idx]: true };
    });
  };

  const totalGold = useMemo(() => {
    return post.items.reduce((sum, item, idx) => {
      if (checkedItems[idx] === false) return sum;
      if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
        return sum + item.crystalPerUnit * goldPerWon * 27.5 * item.quantity;
      }
      // 기존 패키지 하위 호환
      if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
        const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
        if (fallback) return sum + fallback * goldPerWon * 27.5 * item.quantity;
      }
      if (item.goldOverride != null) {
        const dynamicUnit = getTicketDynamicUnit(item.itemId, item.goldOverride);
        return sum + dynamicUnit * item.quantity;
      }
      const raw = latestPrices[item.itemId] || 0;
      const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
      return sum + (raw / bundle) * item.quantity;
    }, 0);
  }, [post.items, latestPrices, checkedItems, goldPerWon]);
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
          {post.selectableCount && post.selectableCount > 0 && (
            <span className={`${styles.cardBadge} ${styles.badgeSelect}`}>
              {post.selectableCount}선택
            </span>
          )}
        </div>

        <div className={styles.itemGrid}>
          {post.items.map((item, idx) => {
            const isChecked = checkedItems[idx] !== false;
            return (
              <div
                key={idx}
                className={`${styles.itemCell} ${!isChecked ? styles.itemCellUnchecked : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCheck(idx);
                }}
              >
                {item.icon ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getDisplayIcon(item.icon)}
                    alt={item.name} className={styles.itemCellIcon}
                    style={(() => { const s = getGalleryIconSize(item.itemId); const b = GALLERY_ICON_BRIGHTNESS[item.itemId]; return { ...(s ? { width: s, height: s } : {}), ...(b != null ? { filter: `brightness(${b})` } : {}) }; })()} />
                ) : (
                  <div className={styles.itemCellPlaceholder}>기타</div>
                )}
                <span className={`${styles.itemCheckBox} ${isChecked ? styles.itemCheckBoxChecked : ''}`}>
                  {isChecked && (
                    <svg viewBox="0 0 12 10" className={styles.itemCheckIcon}>
                      <polyline points="1.5 5 4.5 8 10.5 2" />
                    </svg>
                  )}
                </span>
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
