'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPackagePost,
  togglePackageLike,
  checkPackageLike,
  deletePackagePost,
} from '@/lib/package-service';
import type { PackagePost, PackageType, PackageItem } from '@/types/package';
import { calcTicketAverage } from '@/lib/hell-reward-calc';
import {
  formatNumber,
  PRICE_BUNDLE_SIZE,
  CRYSTAL_PER_UNIT_FALLBACK,
  getItemUnitPrice,
  calculateGachaItemGold,
} from '@/lib/package-shared';
import AdBanner from '@/components/ads/AdBanner';
import CommentSection from '@/components/package/CommentSection';
import styles from '../package.module.css';

function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function getTypeBadgeClass(type: PackageType): string {
  if (type === '3+1') return styles.typeBadge31;
  if (type === '2+1') return styles.typeBadge21;
  if (type === '가챠') return styles.typeBadgeGacha;
  return styles.typeBadgeNormal;
}

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user, userProfile } = useAuth();

  const [post, setPost] = useState<PackagePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [choiceSelections, setChoiceSelections] = useState<Record<number, string>>({});
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [detailWonPer100Gold, setDetailWonPer100Gold] = useState<number>(0);

  // 가챠 state
  const [gachaPhase, setGachaPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [winnerIdx, setWinnerIdx] = useState(-1);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 가챠 제외 아이템 (제외 시 골드 0으로 계산, 확률은 유지)
  const [gachaExcluded, setGachaExcluded] = useState<Record<number, boolean>>({});

  const isOwner = user && post && user.uid === post.authorUid;

  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  const viewCounted = useRef(false);

  useEffect(() => {
    if (!postId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getPackagePost(postId);
        if (data) {
          setPost(data);
          setLikeCount(data.likeCount || 0);
          const initial: Record<number, string> = {};
          const initialChecked: Record<number, boolean> = {};
          data.items.forEach((item, idx) => {
            if (item.choiceOptions && item.choiceOptions.length > 0) {
              initial[idx] = item.itemId;
            }
            initialChecked[idx] = true;
          });
          // N선택: 가장 비싼 N개만 초기 체크
          if (data.selectableCount && data.selectableCount > 0) {
            const withValue = data.items.map((item, idx) => {
              const value = item.goldOverride != null
                ? item.goldOverride * item.quantity
                : getItemUnitPrice(item.itemId, {}) * item.quantity; // 시세 아직 없으므로 0 기반
              return { idx, value };
            });
            // 시세가 아직 없을 수 있으므로 나중에 latestPrices 로드 후 재계산
            data.items.forEach((_, idx) => {
              initialChecked[idx] = false;
            });
            withValue.sort((a, b) => b.value - a.value);
            withValue.slice(0, data.selectableCount).forEach((v) => {
              initialChecked[v.idx] = true;
            });
          }
          setChoiceSelections(initial);
          setCheckedItems(initialChecked);
          if (data.goldPerWon && data.goldPerWon > 0) {
            setDetailWonPer100Gold(Math.round(100 / data.goldPerWon));
          }
          if (!viewCounted.current) {
            viewCounted.current = true;
            fetch('/api/package/view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);

  // 시세 로드 후 N선택 재계산
  useEffect(() => {
    if (!post || !post.selectableCount || post.selectableCount <= 0) return;
    if (Object.keys(latestPrices).length === 0) return;
    const withValue = post.items.map((item, idx) => {
      let effectiveItemId = item.itemId;
      if (item.choiceOptions && item.choiceOptions.length > 0) {
        effectiveItemId = choiceSelections[idx] || item.itemId;
      }
      const value = item.goldOverride != null
        ? item.goldOverride * item.quantity
        : getItemUnitPrice(effectiveItemId, latestPrices) * item.quantity;
      return { idx, value };
    });
    withValue.sort((a, b) => b.value - a.value);
    const newChecked: Record<number, boolean> = {};
    post.items.forEach((_, idx) => { newChecked[idx] = false; });
    withValue.slice(0, post.selectableCount).forEach((v) => {
      newChecked[v.idx] = true;
    });
    setCheckedItems(newChecked);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPrices, post?.id]);

  useEffect(() => {
    if (!user || !postId) return;
    checkPackageLike(postId, user.uid).then(setLiked).catch(() => {});
  }, [user, postId]);

  const handleLike = async () => {
    if (!user || !postId) return;
    try {
      const nowLiked = await togglePackageLike(postId, user.uid);
      setLiked(nowLiked);
      setLikeCount((prev) => prev + (nowLiked ? 1 : -1));
    } catch (err) {
      console.error('좋아요 실패:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deletePackagePost(postId);
      router.push('/package');
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  // 가챠 cleanup
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  // 가챠: 확률 기반 랜덤 선택
  const selectGachaWinner = (items: PackageItem[]): number => {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      cumulative += items[i].probability || 0;
      if (rand <= cumulative) return i;
    }
    return items.length - 1;
  };

  // 가챠 애니메이션 시작
  const startGacha = () => {
    if (!post || gachaPhase === 'spinning') return;
    const items = post.items;
    const targetIdx = selectGachaWinner(items);

    setGachaPhase('spinning');
    setWinnerIdx(-1);

    // 총 스텝 수: 최소 3바퀴 + 타겟까지
    const minCycles = 3;
    const totalSteps = minCycles * items.length + targetIdx + 1;

    let step = 0;
    const tick = () => {
      const currentIdx = step % items.length;
      setHighlightIdx(currentIdx);
      step++;

      if (step > totalSteps) {
        // 도착
        setHighlightIdx(targetIdx);
        setWinnerIdx(targetIdx);
        setGachaPhase('result');
        return;
      }

      // 이징: 점점 느려짐
      const progress = step / totalSteps;
      const interval = 50 + Math.pow(progress, 2.5) * 400;
      spinTimerRef.current = setTimeout(tick, interval);
    };

    tick();
  };

  // 가챠 리셋
  const resetGacha = () => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    setGachaPhase('idle');
    setHighlightIdx(-1);
    setWinnerIdx(-1);
  };

  const handleChoiceSelect = (idx: number, choiceItemId: string) => {
    setChoiceSelections((prev) => ({ ...prev, [idx]: choiceItemId }));
  };

  const handleToggleCheck = (idx: number) => {
    const sc = post?.selectableCount || 0;
    setCheckedItems((prev) => {
      const isChecked = prev[idx] !== false;
      if (isChecked) {
        return { ...prev, [idx]: false };
      }
      if (sc > 0) {
        const checkedCount = Object.values(prev).filter((v) => v !== false).length;
        if (checkedCount >= sc) {
          // 체크된 것 중 가장 싼 것 해제
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

  const getEffectiveItem = (item: PackageItem, idx: number) => {
    if (!item.choiceOptions || !item.choiceOptions.length) return item;
    const selectedId = choiceSelections[idx] || item.itemId;
    const selectedOption = item.choiceOptions.find((c) => c.itemId === selectedId);
    if (selectedOption) {
      return {
        ...item,
        itemId: selectedOption.itemId,
        name: selectedOption.name,
        icon: selectedOption.icon || item.icon,
      };
    }
    return item;
  };

  const detailGoldPerWon = detailWonPer100Gold > 0 ? 100 / detailWonPer100Gold : 0;

  // 환율 기반 bcRate (100 블크 = 2750 로크)
  const bcRate = detailGoldPerWon > 0 ? detailGoldPerWon * 2750 : 0;

  // goldOverride 아이템의 실제 단가 (환율 변경 시 재계산)
  const getCrystalAdjustedUnit = (item: PackageItem): number => {
    // 티켓: 환율 기반 동적 계산
    if (item.itemId === 'fixed_hell-legendary-ticket')
      return bcRate > 0 ? calcTicketAverage('hell', 7, latestPrices, bcRate) : (item.goldOverride || 0);
    if (item.itemId === 'fixed_hell-heroic-ticket')
      return bcRate > 0 ? calcTicketAverage('hell', 6, latestPrices, bcRate) : (item.goldOverride || 0);
    if (item.itemId === 'fixed_naraka-legendary-ticket')
      return bcRate > 0 ? calcTicketAverage('narak', 2, latestPrices, bcRate) : (item.goldOverride || 0);
    // crystal 아이템
    if (item.crystalPerUnit && item.crystalPerUnit > 0 && detailGoldPerWon > 0) {
      return item.crystalPerUnit * detailGoldPerWon * 27.5;
    }
    // 기존 패키지 하위 호환: crystalPerUnit 없지만 crystal_ 접두사인 경우
    if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && detailGoldPerWon > 0) {
      const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
      if (fallback) {
        return fallback * detailGoldPerWon * 27.5;
      }
    }
    return item.goldOverride || 0;
  };

  const { totalGold, itemSubtotals } = useMemo(() => {
    if (!post) return { totalGold: 0, itemSubtotals: [] as number[] };
    let total = 0;
    const subtotals: number[] = [];
    post.items.forEach((item, idx) => {
      let effectiveItemId = item.itemId;
      if (item.choiceOptions && item.choiceOptions.length > 0) {
        effectiveItemId = choiceSelections[idx] || item.itemId;
      }
      if (item.goldOverride != null) {
        const unit = getCrystalAdjustedUnit(item);
        const sub = unit * item.quantity;
        subtotals.push(sub);
        if (checkedItems[idx] !== false) total += sub;
      } else {
        const unitPrice = getItemUnitPrice(effectiveItemId, latestPrices);
        const sub = unitPrice * item.quantity;
        subtotals.push(sub);
        if (checkedItems[idx] !== false) total += sub;
      }
    });
    return { totalGold: total, itemSubtotals: subtotals };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, choiceSelections, latestPrices, checkedItems, detailGoldPerWon]);

  if (loading) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.detailWrapper} style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <Spinner animation="border" style={{ color: '#f97316' }} />
        </div>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.detailWrapper}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>게시물을 찾을 수 없습니다</p>
            <Link href="/package" className={styles.backLink}>
              &#8592; 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const cashGold = post.royalCrystalPrice * detailGoldPerWon;

  // 1개 이득률
  const singleBenefit = cashGold > 0 ? ((totalGold - cashGold) / cashGold) * 100 : 0;

  // N+1 이득률
  const buyCount = post.packageType === '3+1' ? 3 : post.packageType === '2+1' ? 2 : 1;
  const getCount = post.packageType === '3+1' ? 4 : post.packageType === '2+1' ? 3 : 1;
  const bundleCash = cashGold * buyCount;
  const bundleGold = totalGold * getCount;
  const bundleBenefit = bundleCash > 0 ? ((bundleGold - bundleCash) / bundleCash) * 100 : 0;

  // 가챠 전용 렌더링
  if (post.packageType === '가챠') {
    const gachaItems = post.items;
    const gachaBcRate = detailGoldPerWon > 0 ? detailGoldPerWon * 2750 : 0;
    const gachaItemGolds = gachaItems.map((item) =>
      calculateGachaItemGold(item, latestPrices, detailGoldPerWon, gachaBcRate),
    );
    // 제외 아이템 반영 기대값: 제외된 아이템은 골드 0으로 계산
    const expectedGold = gachaItems.reduce(
      (s, item, i) => s + (gachaExcluded[i] ? 0 : gachaItemGolds[i]) * ((item.probability || 0) / 100), 0,
    );
    const hasExcluded = Object.values(gachaExcluded).some(Boolean);
    const gachaCashGold = post.royalCrystalPrice * detailGoldPerWon;
    const wonItem = winnerIdx >= 0 ? gachaItems[winnerIdx] : null;
    const wonGold = winnerIdx >= 0 ? gachaItemGolds[winnerIdx] : 0;
    const wonBenefit = gachaCashGold > 0 ? ((wonGold - gachaCashGold) / gachaCashGold) * 100 : 0;

    return (
      <Container fluid style={{ maxWidth: '900px' }}>
        <div className={styles.detailWrapper}>
          <Link href="/package" className={styles.backLink}>
            &#8592; 목록으로 돌아가기
          </Link>

          {/* 헤더 */}
          <div className={styles.detailHeader}>
            <div className={styles.detailHeaderTop}>
              <h1 className={styles.detailTitle}>
                <span className={`${styles.typeBadge} ${styles.typeBadgeGacha}`} style={{ marginRight: '0.5rem' }}>
                  가챠
                </span>
                {post.title}
              </h1>
            </div>
            <span className={styles.detailDate}>{formatDate(post.createdAt)}</span>
          </div>

          {/* 환율 + 기대값 */}
          <div className={styles.gachaExpectedRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={styles.gachaExpectedLabel}>환율</span>
              <div className={styles.resultRateInput}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gold.webp" alt="" className={styles.resultRateIcon} />
                <span className={styles.resultRateFixed}>100</span>
                <span className={styles.resultRateSep}>:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/royal.webp" alt="" className={styles.resultRateIcon} />
                <input
                  type="number"
                  className={styles.resultRateNumber}
                  value={detailWonPer100Gold || ''}
                  onChange={(e) => setDetailWonPer100Gold(parseInt(e.target.value) || 0)}
                  placeholder="32"
                  min={1}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={styles.gachaExpectedLabel}>{hasExcluded ? '기대값 (제외 반영)' : '기대값'}</span>
              <span className={styles.gachaExpectedGold}>{formatNumber(expectedGold)} G</span>
              {post.royalCrystalPrice > 0 && (
                <span className={styles.gachaExpectedEfficiency}>
                  ({formatNumber(expectedGold / post.royalCrystalPrice)} G/원)
                </span>
              )}
            </div>
          </div>

          {/* 제외 안내 */}
          {gachaPhase === 'idle' && (
            <p className={styles.gachaExcludeHint}>
              아이템을 클릭하면 기대값 계산에서 제외됩니다 (확률은 유지)
            </p>
          )}

          {/* 아이템 그리드 */}
          <div className={styles.gachaGrid}>
            {gachaItems.map((item, idx) => {
              const gold = gachaItemGolds[idx];
              const isHighlight = highlightIdx === idx && gachaPhase === 'spinning';
              const isWon = winnerIdx === idx && gachaPhase === 'result';
              const isDimmed = gachaPhase === 'result' && winnerIdx !== idx;
              const isExcluded = !!gachaExcluded[idx];
              return (
                <div
                  key={idx}
                  className={`${styles.gachaItemCard} ${isHighlight ? styles.gachaItemCardHighlight : ''} ${isWon ? styles.gachaItemCardWon : ''} ${isDimmed ? styles.gachaItemCardDimmed : ''} ${isExcluded && gachaPhase === 'idle' ? styles.gachaItemCardExcluded : ''}`}
                  onClick={() => {
                    if (gachaPhase !== 'idle') return;
                    setGachaExcluded((prev) => ({ ...prev, [idx]: !prev[idx] }));
                  }}
                  style={gachaPhase === 'idle' ? { cursor: 'pointer' } : undefined}
                >
                  <div className={`${styles.gachaCheckbox} ${isWon ? styles.gachaCheckboxActive : ''} ${isExcluded && gachaPhase === 'idle' ? styles.gachaCheckboxExcluded : ''}`}>
                    {isWon && (
                      <svg viewBox="0 0 12 10" className={styles.gachaCheckIcon}>
                        <polyline points="1.5 5 4.5 8 10.5 2" />
                      </svg>
                    )}
                    {isExcluded && gachaPhase === 'idle' && (
                      <svg viewBox="0 0 12 12" className={styles.gachaCheckIcon}>
                        <line x1="2" y1="2" x2="10" y2="10" />
                        <line x1="10" y1="2" x2="2" y2="10" />
                      </svg>
                    )}
                  </div>
                  {item.icon && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.icon} alt={item.name} className={styles.gachaItemIcon}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className={styles.gachaItemName}>{item.name}</div>
                  {item.quantity > 1 && (
                    <span className={styles.gachaItemQty}>x{item.quantity}</span>
                  )}
                  <span className={`${styles.gachaProbBadge} ${(item.probability || 0) <= 5 ? styles.gachaProbBadgeRare : ''}`}>
                    {item.probability}%
                  </span>
                  <span className={styles.gachaItemGold}>
                    {isExcluded ? '제외' : `${formatNumber(gold)}G`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 가챠 버튼 */}
          <button
            className={`${styles.gachaButton} ${gachaPhase === 'spinning' ? styles.gachaButtonSpinning : ''}`}
            onClick={startGacha}
            disabled={gachaPhase === 'spinning'}
          >
            {gachaPhase === 'spinning' ? '뽑는 중...' : '가챠!'}
          </button>

          {/* 결과 */}
          {gachaPhase === 'result' && wonItem && (
            <div className={styles.gachaResult}>
              <div className={styles.gachaResultTitle}>당첨!</div>
              <div className={styles.gachaResultItemName}>
                {wonItem.name} {wonItem.quantity > 1 ? `x${wonItem.quantity}` : ''}
              </div>
              <div className={styles.gachaResultRow}>
                <span className={styles.gachaResultLabel}>골드 가치</span>
                <span className={styles.gachaResultGold}>{formatNumber(wonGold)} G</span>
              </div>
              <div className={styles.gachaResultRow}>
                <span className={styles.gachaResultLabel}>가챠 가격</span>
                <span className={styles.gachaResultValue}>{formatNumber(post.royalCrystalPrice)}원</span>
              </div>
              {detailGoldPerWon > 0 && (
                <>
                  <div className={styles.gachaResultRow}>
                    <span className={styles.gachaResultLabel}>현금 골드</span>
                    <span className={styles.gachaResultValue}>{formatNumber(gachaCashGold)} G</span>
                  </div>
                  <div className={styles.gachaResultRow}>
                    <span className={styles.gachaResultLabel}>이득률</span>
                    <span className={`${styles.gachaResultBenefit} ${wonBenefit >= 0 ? styles.benefitUp : styles.benefitDown}`}>
                      {wonBenefit >= 0 ? '+' : ''}{wonBenefit.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.gachaResultRow}>
                    <span className={styles.gachaResultLabel}>확률</span>
                    <span className={styles.gachaResultValue}>{wonItem.probability}%</span>
                  </div>
                </>
              )}
              <button className={styles.gachaRerollButton} onClick={resetGacha}>
                다시 뽑기
              </button>
            </div>
          )}

          {/* 액션 */}
          <div className={styles.detailActions}>
            <div className={styles.detailActionsLeft}>
              <button
                className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
                onClick={handleLike}
                disabled={!user}
                title={user ? '좋아요' : '로그인 후 이용 가능'}
              >
                {liked ? '\u2665' : '\u2661'} {likeCount}
              </button>
              <span className={styles.viewCountText}>
                {'\uD83D\uDC41'} {post.viewCount || 0}
              </span>
            </div>
            {isOwner && (
              <div className={styles.resultActionsRight}>
                <Link href={`/package/edit/${postId}`} className={styles.editBtn}>
                  수정
                </Link>
                <button className={styles.deleteBtn} onClick={handleDelete}>
                  삭제
                </button>
              </div>
            )}
          </div>

          {/* 댓글 */}
          <CommentSection
            postId={postId}
            commentCount={post.commentCount || 0}
            onCommentCountChange={(delta) =>
              setPost((prev) =>
                prev ? { ...prev, commentCount: (prev.commentCount || 0) + delta } : null,
              )
            }
          />

          <div className="d-block d-md-none my-3">
            <AdBanner slot="8616653628" />
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1100px' }}>
      <div className={styles.detailWrapper}>
        <div className={styles.detailSplitRow}>
          {/* 왼쪽: 요약 카드 */}
          <div className={styles.resultPanel}>
            <Link href="/package" className={styles.backLink}>
              &#8592; 목록으로 돌아가기
            </Link>
            <div className={styles.resultBox}>
              {/* 뱃지 + 제목 */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`${styles.typeBadge} ${getTypeBadgeClass(post.packageType)}`}>
                  {post.packageType}
                </span>
                {post.selectableCount && post.selectableCount > 0 && (
                  <span className={`${styles.typeBadge} ${styles.typeBadgeSelect}`}>
                    {post.selectableCount}선택
                  </span>
                )}
              </div>
              <h1 className={styles.resultTitle}>{post.title}</h1>

              <div className={styles.resultDivider} />

              {/* 패키지 가격 */}
              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>패키지 가격</span>
                <span className={styles.resultRowValue}>
                  {formatNumber(post.royalCrystalPrice)}원
                </span>
              </div>

              {/* 총 골드 가치 */}
              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>총 골드 가치</span>
                <span className={styles.resultRowValueGold}>
                  {formatNumber(totalGold)} G
                </span>
              </div>

              {/* N+1 보정 */}
              {post.packageType !== '일반' && (
                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>{post.packageType} 보정</span>
                  <span className={styles.resultRowValueGold}>
                    {formatNumber(totalGold * getCount)} G
                  </span>
                </div>
              )}

              <div className={styles.resultDivider} />

              {/* 환율 */}
              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>환율</span>
                <div className={styles.resultRateInput}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gold.webp" alt="" className={styles.resultRateIcon} />
                  <span className={styles.resultRateFixed}>100</span>
                  <span className={styles.resultRateSep}>:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/royal.webp" alt="" className={styles.resultRateIcon} />
                  <input
                    type="number"
                    className={styles.resultRateNumber}
                    value={detailWonPer100Gold || ''}
                    onChange={(e) => setDetailWonPer100Gold(parseInt(e.target.value) || 0)}
                    placeholder="32"
                    min={1}
                  />
                </div>
              </div>

              {/* 로크로 골드 구매 시 */}
              {detailGoldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>로크 골드 구매 시</span>
                  <span className={styles.resultRowValue}>
                    {formatNumber(cashGold)} G
                  </span>
                </div>
              )}

              {/* 이득률 */}
              {detailGoldPerWon > 0 && (
                <>
                  <div className={styles.resultDivider} />
                  <div className={styles.resultRow}>
                    <span className={styles.resultRowLabel}>1개 구매</span>
                    <span className={`${styles.resultBenefitNum} ${singleBenefit >= 0 ? styles.benefitUp : styles.benefitDown}`}>
                      {singleBenefit >= 0 ? '+' : ''}{singleBenefit.toFixed(1)}%
                    </span>
                  </div>
                  {post.packageType !== '일반' && (
                    <div className={styles.resultRow}>
                      <span className={styles.resultRowLabel}>{post.packageType} 구매</span>
                      <span className={`${styles.resultBenefitNum} ${bundleBenefit >= 0 ? styles.benefitUp : styles.benefitDown}`}>
                        {bundleBenefit >= 0 ? '+' : ''}{bundleBenefit.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className={styles.resultDivider} />

              {/* 메타 + 액션 */}
              <div className={styles.resultMeta}>
                <span className={styles.resultMetaDate}>{formatDate(post.createdAt)}</span>
              </div>
              <div className={styles.resultActions}>
                <div className={styles.resultActionsLeft}>
                  <button
                    className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
                    onClick={handleLike}
                    disabled={!user}
                    title={user ? '좋아요' : '로그인 후 이용 가능'}
                  >
                    {liked ? '\u2665' : '\u2661'} {likeCount}
                  </button>
                  <span className={styles.viewCountText}>
                    {'\uD83D\uDC41'} {post.viewCount || 0}
                  </span>
                </div>
                {isOwner && (
                  <div className={styles.resultActionsRight}>
                    <Link href={`/package/edit/${postId}`} className={styles.editBtn}>
                      수정
                    </Link>
                    <button className={styles.deleteBtn} onClick={handleDelete}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 아이템 카드 */}
          <section className={styles.itemCardsSection}>
            <h2 className={styles.sectionTitle}>
              아이템 구성 ({post.items.length}종)
            </h2>
            <div className={styles.itemCardsGrid}>
              {post.items.map((item, idx) => {
                const effective = getEffectiveItem(item, idx);
                const isFixed = item.goldOverride != null;
                const effectiveItemId =
                  item.choiceOptions && item.choiceOptions.length > 0
                    ? choiceSelections[idx] || item.itemId
                    : item.itemId;
                const unitPrice = isFixed
                  ? getCrystalAdjustedUnit(item)
                  : getItemUnitPrice(effectiveItemId, latestPrices);
                const subtotal = itemSubtotals[idx] || 0;
                const hasChoices = item.choiceOptions && item.choiceOptions.length > 0;

                const isChecked = checkedItems[idx] !== false;

                return (
                  <div
                    key={idx}
                    className={`${styles.itemCard} ${hasChoices ? styles.itemCardChoice : ''} ${!isChecked ? styles.itemCardUnchecked : ''}`}
                  >
                    <label className={styles.itemCardCheckLabel} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(idx)}
                        className={styles.itemCardCheckInput}
                      />
                      <span className={styles.itemCardCheckBox}>
                        {isChecked && (
                          <svg viewBox="0 0 12 10" className={styles.itemCardCheckIcon}>
                            <polyline points="1.5 5 4.5 8 10.5 2" />
                          </svg>
                        )}
                      </span>
                    </label>
                    <div className={styles.itemCardIconWrap}>
                      {effective.icon && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={effective.icon}
                          alt={effective.name}
                          className={styles.itemCardIcon}
                        />
                      )}
                    </div>
                    <div className={styles.itemCardName}>{effective.name}</div>

                    {hasChoices && item.choiceOptions!.length <= 3 && (
                      <div className={styles.itemCardChoices}>
                        {item.choiceOptions!.map((choice) => (
                          <button
                            key={choice.itemId}
                            type="button"
                            className={`${styles.itemCardChoiceBtn} ${
                              (choiceSelections[idx] || item.itemId) === choice.itemId
                                ? styles.itemCardChoiceBtnActive
                                : ''
                            }`}
                            onClick={() => handleChoiceSelect(idx, choice.itemId)}
                          >
                            {choice.icon && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={choice.icon} alt={choice.name} className={styles.itemCardChoiceBtnIcon} />
                            )}
                            <span>{choice.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {hasChoices && item.choiceOptions!.length > 3 && (
                      <select
                        className={styles.itemCardChoiceSelect}
                        value={choiceSelections[idx] || item.itemId}
                        onChange={(e) => handleChoiceSelect(idx, e.target.value)}
                      >
                        {item.choiceOptions!.map((choice) => (
                          <option key={choice.itemId} value={choice.itemId}>
                            {choice.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className={styles.itemCardBottom}>
                      <div className={styles.itemCardPriceLine}>
                        {`${formatNumber(unitPrice)}G`}
                        {' x '}
                        {item.quantity}개
                      </div>
                      <div className={styles.itemCardSubtotal}>
                        {formatNumber(subtotal)}G
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 댓글 섹션 */}
        {post && (
          <CommentSection
            postId={postId}
            commentCount={post.commentCount || 0}
            onCommentCountChange={(delta) =>
              setPost((prev) =>
                prev ? { ...prev, commentCount: (prev.commentCount || 0) + delta } : null,
              )
            }
          />
        )}

        {/* 모바일 하단 광고 */}
        <div className="d-block d-md-none my-3">
          <AdBanner slot="8616653628" />
        </div>
      </div>
    </Container>
  );
}
