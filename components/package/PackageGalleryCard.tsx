'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { PackagePost, PackageItem, PackageType } from '@/types/package';
import {
  formatNumber,
  PRICE_BUNDLE_SIZE,
  CRYSTAL_PER_UNIT_FALLBACK,
  calculateGachaItemGold,
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
  if (type === '가챠') return styles.badgeGacha;
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

// 갤러리 카드 아이콘 크기 오버라이드 (기본 42px, 셀 62px 고정)
const GALLERY_ICON_SIZE: Record<string, number> = {
  'fixed_gold-input': 30,
  'fixed_hell-heroic-ticket': 58,
  'crystal_pheon': 54,
  'expected_gem-choice': 54,
};
const GALLERY_ICON_RE: [RegExp, number][] = [
  [/^674/, 54], // 젬 선택 아이템 (영웅 젬 상자에서 선택된 젬)
];
function getGalleryIconSize(itemId: string): number | undefined {
  if (GALLERY_ICON_SIZE[itemId]) return GALLERY_ICON_SIZE[itemId];
  for (const [re, size] of GALLERY_ICON_RE) {
    if (re.test(itemId)) return size;
  }
  return undefined;
}


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
  // 가챠: 기대값 계산 (체크 해제 아이템은 골드 0으로 계산, 확률은 유지)
  const isGacha = post.packageType === '가챠';
  const gachaBcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
  const gachaExpectedGold = isGacha
    ? post.items.reduce((s, item, idx) => {
        if (checkedItems[idx] === false) return s + 0 * ((item.probability || 0) / 100);
        const gold = calculateGachaItemGold(item, latestPrices, goldPerWon, gachaBcRate);
        return s + gold * ((item.probability || 0) / 100);
      }, 0)
    : 0;

  // 가챠: 확률 높은 순 표시 순서 (원본 인덱스 → 정렬된 순서)
  const gachaDisplayOrder = useMemo(() => {
    if (!isGacha) return post.items.map((_, i) => i);
    return post.items
      .map((item, i) => ({ i, prob: item.probability || 0 }))
      .sort((a, b) => a.prob - b.prob)
      .map((v) => v.i);
  }, [isGacha, post.items]);

  // 가챠 미니 상태
  const [gachaPhase, setGachaPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [gachaHighlight, setGachaHighlight] = useState(-1);
  const [gachaWinner, setGachaWinner] = useState(-1);
  const gachaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gachaMode, setGachaMode] = useState<'single' | 'multi'>('single');
  const [gachaMultiResults, setGachaMultiResults] = useState<number[]>([]);
  const [multiRevealCount, setMultiRevealCount] = useState(0);
  const [multiHighlights, setMultiHighlights] = useState<number[]>([]);

  const gachaItemGolds = useMemo(() => {
    if (!isGacha) return [];
    return post.items.map((item) =>
      calculateGachaItemGold(item, latestPrices, goldPerWon, gachaBcRate),
    );
  }, [isGacha, post.items, latestPrices, goldPerWon, gachaBcRate]);

  // 가챠 1회: 확률 기반 가중 랜덤
  const selectOneWinner = (): number => {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < post.items.length; i++) {
      cumulative += post.items[i].probability || 0;
      if (rand <= cumulative) return i;
    }
    return post.items.length - 1;
  };

  const handleGacha = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gachaPhase !== 'idle') return;

    setGachaMode('single');
    const targetOrigIdx = selectOneWinner();
    const targetDisplayIdx = gachaDisplayOrder.indexOf(targetOrigIdx);

    setGachaPhase('spinning');
    setGachaWinner(-1);

    const count = post.items.length;
    const minCycles = 2;
    const totalSteps = minCycles * count + targetDisplayIdx + 1;
    let step = 0;

    const tick = () => {
      setGachaHighlight(step % count);
      step++;
      if (step > totalSteps) {
        setGachaHighlight(targetDisplayIdx);
        setGachaWinner(targetDisplayIdx);
        setGachaPhase('result');
        return;
      }
      const progress = step / totalSteps;
      const interval = 40 + Math.pow(progress, 2.5) * 350;
      gachaTimerRef.current = setTimeout(tick, interval);
    };
    tick();
  };

  // 가챠 10회: 동시 출발 + 순차 착지
  const handleGachaMulti = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gachaPhase !== 'idle') return;

    const results: number[] = [];
    for (let r = 0; r < 10; r++) results.push(selectOneWinner());

    setGachaMode('multi');
    setGachaPhase('spinning');
    setGachaMultiResults(results);
    setMultiRevealCount(0);
    setMultiHighlights([]);

    const count = post.items.length;
    const TICK_MS = 35;
    const STAGGER_TICKS = 3; // ~105ms 간격으로 출발
    const CYCLES = 2;

    // 각 롤 데이터 사전 계산
    const rolls = results.map((origIdx, rollIndex) => {
      const targetDisplayIdx = gachaDisplayOrder.indexOf(origIdx);
      const totalPositions = CYCLES * count + targetDisplayIdx + 1;
      const totalTicks = Math.round(totalPositions * 2.5);
      return {
        targetDisplayIdx,
        startTick: rollIndex * STAGGER_TICKS,
        totalPositions,
        totalTicks,
        landed: false,
      };
    });

    let currentTick = 0;
    let revealCount = 0;

    const masterTick = () => {
      const highlights: number[] = [];
      let allLanded = true;

      for (const roll of rolls) {
        if (currentTick < roll.startTick) {
          allLanded = false;
          continue;
        }

        const elapsed = currentTick - roll.startTick;

        if (elapsed >= roll.totalTicks) {
          if (!roll.landed) {
            roll.landed = true;
            revealCount++;
            setMultiRevealCount(revealCount);
          }
          continue;
        }

        allLanded = false;
        const progress = elapsed / roll.totalTicks;
        const easedProgress = 1 - Math.pow(1 - progress, 2);
        const visualPos = Math.min(
          Math.floor(easedProgress * roll.totalPositions),
          roll.totalPositions - 1,
        );
        highlights.push(visualPos % count);
      }

      setMultiHighlights(highlights);

      if (allLanded) {
        gachaTimerRef.current = setTimeout(() => {
          setMultiHighlights([]);
          setGachaPhase('result');
        }, 300);
        return;
      }

      currentTick++;
      gachaTimerRef.current = setTimeout(masterTick, TICK_MS);
    };

    masterTick();
  };

  const resetGacha = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gachaTimerRef.current) clearTimeout(gachaTimerRef.current);
    setGachaPhase('idle');
    setGachaHighlight(-1);
    setGachaWinner(-1);
    setGachaMode('single');
    setGachaMultiResults([]);
    setMultiRevealCount(0);
    setMultiHighlights([]);
  };

  const cashGold = post.royalCrystalPrice * goldPerWon;
  const isBundle = post.packageType === '3+1' || post.packageType === '2+1';

  const effectiveGold = isGacha ? gachaExpectedGold : totalGold;
  const singleBenefit = cashGold > 0 ? ((effectiveGold - cashGold) / cashGold) * 100 : 0;

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
          {post.selectableCount != null && post.selectableCount > 0 && (
            <span className={`${styles.cardBadge} ${styles.badgeSelect}`}>
              {post.selectableCount}선택
            </span>
          )}
        </div>

        <div className={styles.itemGrid}>
          {(isGacha ? gachaDisplayOrder : post.items.map((_, i) => i)).map((idx, renderIdx) => {
            const item = post.items[idx];
            const displayIdx = isGacha ? gachaDisplayOrder.indexOf(idx) : idx;
            const isChecked = checkedItems[idx] !== false;
            const revealedSlice = gachaMultiResults.slice(0, multiRevealCount);
            const isGachaHighlighted = isGacha && gachaPhase === 'spinning' && (
              (gachaMode === 'single' && gachaHighlight === displayIdx) ||
              (gachaMode === 'multi' && multiHighlights.includes(displayIdx))
            );
            const isGachaWon = isGacha && (
              (gachaPhase === 'result' && gachaMode === 'single' && gachaWinner === displayIdx) ||
              (gachaPhase === 'result' && gachaMode === 'multi' && gachaMultiResults.includes(idx)) ||
              (gachaPhase === 'spinning' && gachaMode === 'multi' && revealedSlice.includes(idx))
            );
            const isGachaDimmed = isGacha && gachaPhase === 'result' && (
              (gachaMode === 'single' && gachaWinner !== displayIdx) ||
              (gachaMode === 'multi' && !gachaMultiResults.includes(idx))
            );
            return (
              <div
                key={idx}
                className={`${styles.itemCell} ${renderIdx >= 15 ? styles.itemCellHidden : ''} ${!isChecked && gachaPhase === 'idle' ? styles.itemCellUnchecked : ''} ${isGachaHighlighted ? styles.itemCellHighlight : ''} ${isGachaWon ? styles.itemCellWon : ''} ${isGachaDimmed ? styles.itemCellDimmed : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (gachaPhase !== 'idle') return;
                  handleToggleCheck(idx);
                }}
              >
                {item.icon ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getDisplayIcon(item.icon)}
                    alt={item.name} className={styles.itemCellIcon}
                    style={(() => { const s = getGalleryIconSize(item.itemId); return s ? { width: s, height: s } : {}; })()} />
                ) : (
                  <div className={styles.itemCellPlaceholder}>기타</div>
                )}
                {isGacha && (
                  <span className={styles.itemProbBadge}>{item.probability}%</span>
                )}
                <span className={`${styles.itemCheckBox} ${isChecked ? styles.itemCheckBoxChecked : ''} ${isGachaWon ? styles.itemCheckBoxWon : ''}`}>
                  {(isChecked || isGachaWon) && (
                    <svg viewBox="0 0 12 10" className={styles.itemCheckIcon}>
                      <polyline points="1.5 5 4.5 8 10.5 2" />
                    </svg>
                  )}
                </span>
                {(() => {
                  if (!isGacha || gachaMode !== 'multi') return null;
                  const slice = gachaPhase === 'result' ? gachaMultiResults : gachaMultiResults.slice(0, multiRevealCount);
                  const cnt = slice.filter(r => r === idx).length;
                  return cnt > 1 ? <span className={styles.itemMultiCount}>x{cnt}</span> : null;
                })()}
              </div>
            );
          })}
        </div>
        {post.items.length > 15 && (
          <span className={styles.moreText}>...외 {post.items.length - 15}개 아이템</span>
        )}

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

          {/* 총 골드 가치 / 기대값 */}
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>{isGacha ? '기대값' : '총 골드 가치'}</span>
            <span className={styles.resultValueGold}>
              {formatNumber(isGacha ? gachaExpectedGold : totalGold)} G
            </span>
          </div>

          {isBundle && !isGacha && (
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
          {goldPerWon > 0 && !isGacha && (
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

          {/* 가챠 버튼 + 결과 */}
          {isGacha && (
            <>
              <div className={styles.resultDivider} />

              {/* 1회 결과 - 컴팩트 2줄 */}
              {gachaPhase === 'result' && gachaMode === 'single' && gachaWinner >= 0 && (() => {
                const winOrigIdx = gachaDisplayOrder[gachaWinner];
                const wonGold = gachaItemGolds[winOrigIdx];
                const benefit = cashGold > 0 ? ((wonGold - cashGold) / cashGold) * 100 : 0;
                return (
                <div className={styles.gachaResultArea} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.gachaResultRow}>
                    <span className={styles.gachaResultName}>
                      {post.items[winOrigIdx].name}
                      {post.items[winOrigIdx].quantity > 1 ? ` x${post.items[winOrigIdx].quantity}` : ''}
                    </span>
                    <span className={styles.gachaResultGold}>{formatNumber(wonGold)}G</span>
                  </div>
                  <div className={styles.gachaResultRow}>
                    {goldPerWon > 0 && (
                      <span className={`${styles.gachaResultBenefit} ${benefit >= 0 ? styles.benefitPositive : styles.benefitNegative}`}>
                        {benefit >= 0 ? '+' : ''}{benefit.toFixed(1)}%
                      </span>
                    )}
                    <button className={styles.gachaReroll} onClick={resetGacha}>다시 뽑기</button>
                  </div>
                </div>
                );
              })()}

              {/* 10회 스피닝 진행 표시 */}
              {gachaPhase === 'spinning' && gachaMode === 'multi' && multiRevealCount > 0 && (
                <div className={styles.gachaResultArea} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.gachaMultiTitle}>{multiRevealCount}/10</div>
                </div>
              )}

              {/* 10회 최종 결과 - 컴팩트 2줄 */}
              {gachaPhase === 'result' && gachaMode === 'multi' && (() => {
                const totalWonGold = gachaMultiResults.reduce((sum, ri) => sum + gachaItemGolds[ri], 0);
                const totalCash = cashGold * 10;
                const multiBenefit = totalCash > 0 ? ((totalWonGold - totalCash) / totalCash) * 100 : 0;
                return (
                  <div className={styles.gachaResultArea} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.gachaResultRow}>
                      <span className={styles.gachaResultName}>10회 결과</span>
                      <span className={styles.gachaResultGold}>{formatNumber(totalWonGold)}G</span>
                    </div>
                    <div className={styles.gachaResultRow}>
                      {goldPerWon > 0 && (
                        <span className={`${styles.gachaResultBenefit} ${multiBenefit >= 0 ? styles.benefitPositive : styles.benefitNegative}`}>
                          {multiBenefit >= 0 ? '+' : ''}{multiBenefit.toFixed(1)}%
                        </span>
                      )}
                      <button className={styles.gachaReroll} onClick={resetGacha}>다시 뽑기</button>
                    </div>
                  </div>
                );
              })()}

              {/* 버튼 (idle 일 때만) */}
              {gachaPhase === 'idle' && (
                <div className={styles.gachaBtnGroup}>
                  <button className={styles.gachaBtn} onClick={handleGacha}>
                    가챠
                  </button>
                  <button className={`${styles.gachaBtn} ${styles.gachaBtnMulti}`} onClick={handleGachaMulti}>
                    10회
                  </button>
                </div>
              )}
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
