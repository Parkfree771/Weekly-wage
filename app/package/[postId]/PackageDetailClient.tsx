'use client';

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import {
  deletePackagePost,
  updatePackagePost,
} from '@/lib/package-service';
import { isSaleEnded, formatSaleEndShort, formatSalePeriodDateOnly } from '@/lib/package-sale';
import type { PackagePost, PackageType, PackageItem } from '@/types/package';
import { calcTicketAverage } from '@/lib/hell-reward-calc';
import {
  formatNumber,
  PRICE_BUNDLE_SIZE,
  CRYSTAL_PER_UNIT_FALLBACK,
  getItemUnitPrice,
  getFixedGemSelectUnitPrice,
  getFixedGemSelectBestUnitPrice,
  getFixedGemSelectBreakdown,
  FIXED_GEM_SELECT_ICON,
  PROCESSED_GEM_BOX_GEM,
  PROCESSED_GEM_BOX_EXTRA_GOLD,
  PROCESSED_GEM_BOX_INFO,
  getProcessedGemBoxUnitPrice,
  getChoiceBoxGold,
  getChoiceBoxBestGold,
  getChoiceBestValue,
  pickTopNCandidateIds,
  calculateGachaItemGold,
  groupMultiResults,
} from '@/lib/package-shared';
import AdBanner from '@/components/ads/AdBanner';
import AdFitUnit from '@/components/ads/AdFitUnit';
import AdPlaceholder from '@/components/ads/AdPlaceholder';
import { AD_PREVIEW, ADFIT_ENABLED, ADFIT_UNITS } from '@/components/ads/adConfig';
import CommentSection from '@/components/package/CommentSection';
import styles from '../package.module.css';

const ITEM_SHORT_NAMES: Record<string, string> = {
  '운명의 파괴석 결정': '운파결',
  '운명의 수호석 결정': '운수결',
  '운명의 파괴석': '운파',
  '운명의 수호석': '운수',
  '운명의 돌파석': '운돌',
  '위대한 운명의 돌파석': '위대한 운돌',
  '운명의 파편': '운명의 파편',
  '용암의 숨결': '용숨',
  '빙하의 숨결': '빙숨',
  '아비도스 융화 재료': '아비도스',
  '장인의 야금술 : 3단계': '야금술3',
  '장인의 야금술 : 4단계': '야금술4',
  '장인의 재봉술 : 3단계': '재봉술3',
  '장인의 재봉술 : 4단계': '재봉술4',
  '어빌리티스톤 키트': '어빌리티스톤 키트',
  '영웅/희귀 젬 상자': '젬 상자',
  '영웅 젬 랜덤 상자': '젬 랜덤',
  '천상 도전권': '천상권',
  '나락 전설 티켓': '나락 전설 티켓',
  '지옥 전설 티켓': '지옥 전설 티켓',
  '파결+수결 묶음 주머니': '파결+수결',
  '파괴/수호 결정 선택': '파결/수결',
  '용숨/빙숨 선택 상자': '용숨/빙숨',
};

function shortenItemName(name: string): string {
  return ITEM_SHORT_NAMES[name] || name;
}

// 젬 선택지 효과 축약. 긴 쪽부터 치환해야 "아군 피해 강화" 가 "피해" 규칙에 먼저 걸리지 않는다.
const GEM_EFFECT_SHORT: [string, string][] = [
  ['아군 공격 강화', '아공강'],
  ['아군 피해 강화', '아피강'],
  ['보스 피해', '보피'],
  ['추가 피해', '추피'],
  ['낙인력', '낙인'],
];

/**
 * 젬 선택지 이름 축약 — "공격형 질서의 젬 : 불변 (보스 피해/추가 피해)" → "불변 (보피/추피)".
 * 선택지가 12개라 드롭다운으로 렌더되는데, 원문은 폭에 못 들어가 등급(불변/견고…)조차 잘린다.
 * 이름은 게시물 문서에 저장된 값이라 원본 목록을 고쳐도 기존 글에는 반영되지 않으므로 여기서 줄인다.
 */
function shortenGemChoiceName(name: string): string {
  const matched = name.match(/젬\s*:\s*(.+)$/);
  if (!matched) return name;
  let rest = matched[1];
  for (const [long, short] of GEM_EFFECT_SHORT) {
    rest = rest.split(long).join(short);
  }
  return rest;
}

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
  if (type === '3+보너스') return styles.typeBadge31;
  if (type === '가챠') return styles.typeBadgeGacha;
  return styles.typeBadgeNormal;
}

/**
 * PC 좌측 칼럼(340px) 계산 결과 아래 250×250 애드핏.
 * 모바일에서는 .sideAdSlot 이 display:none 이라 렌더돼도 보이지 않는다.
 * key={postId}: 글 사이를 클라이언트 이동해도 애드핏 스캔이 다시 돌게 한다.
 */
function SideSquareAd({ postId }: { postId: string }) {
  const adfit = ADFIT_UNITS.packageDetailSquare;

  if (AD_PREVIEW) {
    return (
      <AdPlaceholder
        className={styles.sideAdSlot}
        label="광고 · 패키지 상세 좌측"
        sub={`애드핏 ${adfit.width}×${adfit.height}\n${adfit.unit}`}
        style={{ height: `${adfit.height}px`, whiteSpace: 'pre-line' }}
      />
    );
  }

  if (!ADFIT_ENABLED || !adfit.unit) return null;

  return (
    <div className={styles.sideAdSlot}>
      <AdFitUnit key={postId} unit={adfit.unit} width={adfit.width} height={adfit.height} />
    </div>
  );
}

/** 패키지 가격 — 블크 결제 패키지는 블크로 표기 (갤러리 카드·앱 상세와 동일) */
function PriceValue({ post }: { post: PackagePost }) {
  if (post.priceCurrency === 'blueCrystal' && post.blueCrystalPrice) {
    return (
      <span className={styles.resultRowValue}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src="/blue.webp" alt="블루 크리스탈" className={styles.goldIconInline} />
        {formatNumber(post.blueCrystalPrice)}
      </span>
    );
  }
  return (
    <span className={styles.resultRowValue}>{formatNumber(post.royalCrystalPrice)}원</span>
  );
}

/** 골드 값 — 갤러리 카드와 같은 형식 ("= [골드아이콘] 42,000") */
function GoldValue({ v }: { v: number }) {
  return (
    <span className={styles.resultRowValueGold}>
      ={' '}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
      {formatNumber(v)}
    </span>
  );
}

/** 이득률 배지 — 갤러리 카드의 사선컷 칩과 같은 형태 */
function BenefitBadge({ v }: { v: number }) {
  return (
    <span className={`${styles.resultBenefitBadge} ${v >= 0 ? styles.resultBenefitUp : styles.resultBenefitDown}`}>
      {v >= 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

/** 보너스/일반 구성품 공용 골드 가치 계산 (choiceBox·crystal·goldOverride·시세 아이템 지원) */
function getPackageItemGold(
  item: PackageItem,
  prices: Record<string, number>,
  goldPerWon: number,
  bcRate: number,
  selectedChoiceItemId?: string,
  selectedChoiceBoxIds?: string[],
): number {
  if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
    const selected = selectedChoiceBoxIds ?? item.choiceBoxSelectedIds;
    return getChoiceBoxGold(item.choiceBoxCandidates, selected, prices) * item.quantity;
  }
  if (item.itemId === 'fixed_hell-legendary-ticket')
    return (bcRate > 0 ? calcTicketAverage('hell', 7, prices, bcRate) : (item.goldOverride || 0)) * item.quantity;
  if (item.itemId === 'fixed_hell-heroic-ticket')
    return (bcRate > 0 ? calcTicketAverage('hell', 6, prices, bcRate) : (item.goldOverride || 0)) * item.quantity;
  if (item.itemId === 'fixed_naraka-legendary-ticket')
    return (bcRate > 0 ? calcTicketAverage('narak', 2, prices, bcRate) : (item.goldOverride || 0)) * item.quantity;
  if (item.itemId === 'fixed_cube-ticket')
    return (bcRate > 0 ? calcTicketAverage('hell', 6, prices, bcRate) / 6 : (item.goldOverride || 0)) * item.quantity;
  if (PROCESSED_GEM_BOX_GEM[item.itemId])
    return (Object.keys(prices).length > 0 ? getProcessedGemBoxUnitPrice(item.itemId, prices) : (item.goldOverride || 0)) * item.quantity;
  if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
    return item.crystalPerUnit * goldPerWon * 27.5 * item.quantity;
  }
  if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
    const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
    if (fallback) return fallback * goldPerWon * 27.5 * item.quantity;
  }
  if (item.bundleItems && item.bundleItems.length > 0) {
    const perBundleValue = item.bundleItems.reduce((sum, bi) => sum + getItemUnitPrice(bi.itemId, prices) * bi.quantity, 0);
    return perBundleValue * item.quantity;
  }
  if (item.goldOverride != null) return item.goldOverride * item.quantity;
  if (item.choiceOptions && item.choiceOptions.length > 0) {
    // 선택된 선택지가 없으면 등록 시 저장된 기본(최고가) 선택지 사용
    const effectiveId = selectedChoiceItemId || item.itemId;
    const qty = item.quantity * (item.choiceOptions.find((c) => c.itemId === effectiveId)?.quantity ?? 1);
    const unit = item.icon === FIXED_GEM_SELECT_ICON
      ? getFixedGemSelectUnitPrice(effectiveId, prices, goldPerWon)
      : getItemUnitPrice(effectiveId, prices);
    return unit * qty;
  }
  return getItemUnitPrice(item.itemId, prices) * item.quantity;
}

/**
 * choiceOptions가 있는 아이템의 "현재 선택된 선택지" 개수.
 * item.quantity = 박스 개수, choiceOptions[i].quantity = 그 선택지의 박스당 개수(미지정 시 1배).
 * 최종 개수 = 박스 개수 × 박스당 개수 — 다른 선택지를 고르면 그 선택지 배수로 재계산된다.
 */
function getEffectiveQty(item: PackageItem, selectedChoiceItemId: string | undefined): number {
  if (!item.choiceOptions || item.choiceOptions.length === 0) return item.quantity;
  const effectiveId = selectedChoiceItemId || item.itemId;
  const perBoxQty = item.choiceOptions.find((c) => c.itemId === effectiveId)?.quantity ?? 1;
  return item.quantity * perBoxQty;
}

type Props = {
  /** 서버에서 이미 읽어온 게시물. 클라이언트에서 같은 문서를 다시 읽지 않는다. */
  initialPost: PackagePost | null;
};

export default function PackageDetailPage({ initialPost }: Props) {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user, userProfile } = useAuth();

  const [post, setPost] = useState<PackagePost | null>(initialPost);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [choiceSelections, setChoiceSelections] = useState<Record<number, string>>({});
  const [choiceBoxSelections, setChoiceBoxSelections] = useState<Record<number, string[]>>({});
  const [bonusChoiceSelections, setBonusChoiceSelections] = useState<Record<number, string>>({});
  const [bonusChoiceBoxSelections, setBonusChoiceBoxSelections] = useState<Record<number, string[]>>({});
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [detailWonPer100Gold, setDetailWonPer100Gold] = useState<number>(0);

  // 가챠 state
  const [gachaPhase, setGachaPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [winnerIdx, setWinnerIdx] = useState(-1);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gachaMode, setGachaMode] = useState<'single' | 'multi'>('single');
  const [multiResults, setMultiResults] = useState<number[]>([]);
  const [multiRevealCount, setMultiRevealCount] = useState(0);
  const [multiHighlights, setMultiHighlights] = useState<number[]>([]);
  // 가챠 제외 아이템 (제외 시 골드 0으로 계산, 확률은 유지)
  const [gachaExcluded, setGachaExcluded] = useState<Record<number, boolean>>({});

  const isOwner = user && post && (user.uid === post.authorUid || isAdmin(user.email));

  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  // 조회수 중복 전송 방지 — postId 기준 (같은 컴포넌트 인스턴스로 다른 글에 진입해도 각각 집계)
  const viewCountedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    const load = async () => {
      try {
        const data = initialPost;
        if (data) {
          // 클라이언트 내비게이션으로 다른 글에 진입한 경우 post 상태 동기화
          // (useState 초기값은 최초 마운트에만 반영되므로 여기서 반드시 갱신)
          setPost(data);
          const initial: Record<number, string> = {};
          const initialChecked: Record<number, boolean> = {};
          const initialChoiceBox: Record<number, string[]> = {};
          data.items.forEach((item, idx) => {
            if (item.choiceOptions && item.choiceOptions.length > 0) {
              initial[idx] = item.itemId;
            }
            if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
              initialChoiceBox[idx] = item.choiceBoxSelectedIds && item.choiceBoxSelectedIds.length > 0
                ? item.choiceBoxSelectedIds
                : item.choiceBoxCandidates.slice(0, item.choiceBoxPickCount || 1).map((c) => c.id);
            }
            initialChecked[idx] = true;
          });
          const bonusInitial: Record<number, string> = {};
          const bonusInitialChoiceBox: Record<number, string[]> = {};
          (data.bonusItems || []).forEach((item, idx) => {
            if (item.choiceOptions && item.choiceOptions.length > 0) {
              bonusInitial[idx] = item.itemId;
            }
            if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
              bonusInitialChoiceBox[idx] = item.choiceBoxSelectedIds && item.choiceBoxSelectedIds.length > 0
                ? item.choiceBoxSelectedIds
                : item.choiceBoxCandidates.slice(0, item.choiceBoxPickCount || 1).map((c) => c.id);
            }
          });
          // N선택: 시세 로드 후 재계산 effect가 최고가 N개를 확정 (시세 없는 시점의 goldOverride 기반 오선택 방지)
          if (data.selectableCount && data.selectableCount > 0) {
            data.items.forEach((_, idx) => {
              initialChecked[idx] = false;
            });
          }
          setChoiceSelections(initial);
          setChoiceBoxSelections(initialChoiceBox);
          setBonusChoiceSelections(bonusInitial);
          setBonusChoiceBoxSelections(bonusInitialChoiceBox);
          setCheckedItems(initialChecked);
          if (data.goldPerWon && data.goldPerWon > 0) {
            setDetailWonPer100Gold(Math.round(100 / data.goldPerWon));
          }
          if (viewCountedFor.current !== postId) {
            viewCountedFor.current = postId;
            fetch('/api/package/view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, initialPost]);

  // 선택형 아이템: 시세 로드 후 최고가 선택지로 자동 갱신 (등록 시점이 아닌 현재 시세 기준, 이후 뷰어가 직접 변경 가능)
  // 고정형 젬 상자뿐 아니라 일반 choice·선택 상자도 등록 후 시세가 역전되면 저장된 선택이 낮은 아이템일 수 있음
  const autoSelectedPostId = useRef<string | null>(null);
  useEffect(() => {
    if (!post || Object.keys(latestPrices).length === 0) return;
    if (autoSelectedPostId.current === post.id) return;
    autoSelectedPostId.current = post.id;
    const pickBest = (items: PackageItem[]): Record<number, string> => {
      const updates: Record<number, string> = {};
      items.forEach((item, idx) => {
        if (!item.choiceOptions?.length) return;
        const unit = (id: string) =>
          item.icon === FIXED_GEM_SELECT_ICON
            ? getFixedGemSelectUnitPrice(id, latestPrices, detailGoldPerWon)
            : getItemUnitPrice(id, latestPrices) * (item.choiceOptions!.find((c) => c.itemId === id)?.quantity ?? 1);
        let bestId = item.itemId;
        let best = unit(bestId);
        for (const c of item.choiceOptions) {
          const v = unit(c.itemId);
          if (v > best) { best = v; bestId = c.itemId; }
        }
        if (bestId !== item.itemId) updates[idx] = bestId;
      });
      return updates;
    };
    // 선택 상자: 현재 시세 기준 가치 상위 N개로 초기 선택 재계산
    const pickBestBox = (items: PackageItem[]): Record<number, string[]> => {
      const updates: Record<number, string[]> = {};
      items.forEach((item, idx) => {
        if (!item.choiceBoxCandidates?.length) return;
        const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
        updates[idx] = pickTopNCandidateIds(item.choiceBoxCandidates, n, latestPrices);
      });
      return updates;
    };
    const mainUpdates = pickBest(post.items);
    if (Object.keys(mainUpdates).length > 0)
      setChoiceSelections((prev) => ({ ...prev, ...mainUpdates }));
    const bonusUpdates = pickBest(post.bonusItems || []);
    if (Object.keys(bonusUpdates).length > 0)
      setBonusChoiceSelections((prev) => ({ ...prev, ...bonusUpdates }));
    const mainBoxUpdates = pickBestBox(post.items);
    if (Object.keys(mainBoxUpdates).length > 0)
      setChoiceBoxSelections((prev) => ({ ...prev, ...mainBoxUpdates }));
    const bonusBoxUpdates = pickBestBox(post.bonusItems || []);
    if (Object.keys(bonusBoxUpdates).length > 0)
      setBonusChoiceBoxSelections((prev) => ({ ...prev, ...bonusBoxUpdates }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPrices, post?.id]);

  // 시세 로드 후 N선택 재계산
  useEffect(() => {
    if (!post || !post.selectableCount || post.selectableCount <= 0) return;
    if (Object.keys(latestPrices).length === 0) return;
    const withValue = post.items.map((item, idx) => {
      // 선택 상자: 현재 시세 기준 최고 조합 (자동 최고가 선택 effect가 같은 조합으로 갱신하므로 표시값과 일치)
      if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
        const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
        return { idx, value: getChoiceBoxBestGold(item.choiceBoxCandidates, n, latestPrices) * item.quantity };
      }
      if (item.goldOverride != null) {
        // 티켓(지옥 보상 평균)·가공 젬·크리스탈 전부 표시 소계와 동일한 동적 단가로 비교
        return { idx, value: getCrystalAdjustedUnit(item) * item.quantity };
      }
      // choice 타입: 현재 시세 최고가 선택지 기준
      if (item.choiceOptions && item.choiceOptions.length > 0) {
        if (item.icon === FIXED_GEM_SELECT_ICON) {
          const qty = item.quantity * (item.choiceOptions.find((c) => c.itemId === item.itemId)?.quantity ?? 1);
          return { idx, value: getFixedGemSelectBestUnitPrice(item.choiceOptions, item.itemId, latestPrices, detailGoldPerWon) * qty };
        }
        return { idx, value: getChoiceBestValue(item.choiceOptions, item.itemId, latestPrices) * item.quantity };
      }
      return { idx, value: getItemUnitPrice(item.itemId, latestPrices) * item.quantity };
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

  // 판매 종료 직접 처리 (작성자 본인 + 관리자). 표시만 바꾸고 글·계산·시세 연동은 그대로 둔다.
  const [saleUpdating, setSaleUpdating] = useState(false);
  const handleToggleSaleClosed = async () => {
    if (!post || saleUpdating) return;
    const next = !post.saleClosed;
    if (next && !confirm('판매 종료로 표시할까요? 글은 그대로 남고 시세·계산도 계속 동작합니다.')) return;
    setSaleUpdating(true);
    try {
      await updatePackagePost(postId, { saleClosed: next });
      setPost({ ...post, saleClosed: next });
      // ISR 캐시된 상세 페이지 즉시 재생성 (다른 방문자에게도 바로 반영)
      fetch('/api/package/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      }).catch(() => {});
    } catch (err) {
      console.error('판매 종료 처리 실패:', err);
    } finally {
      setSaleUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deletePackagePost(postId);
      // ISR 캐시된 상세 페이지 즉시 무효화 (다른 방문자에게 삭제된 글이 남지 않도록)
      fetch('/api/package/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      }).catch(() => {});
      router.push('/package');
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  // 판매 상태 표시 — 종료여도 상세·시세·계산은 전부 그대로 동작한다 (과거 패키지 비교용)
  const saleEnded = isSaleEnded(post);
  // 배지는 상태만 짧게 (진행중이면 마감일까지). 전체 기간은 아래 메타 줄로 내려 배지가 길어지지 않게 한다.
  const salePeriodFull = formatSalePeriodDateOnly(post);
  const saleEndShort = formatSaleEndShort(post);
  const saleBadge = saleEnded ? (
    <span className={styles.saleEndedBadge}>판매 종료</span>
  ) : saleEndShort ? (
    <span className={styles.salePeriodBadge}>~{saleEndShort} 판매</span>
  ) : salePeriodFull ? (
    <span className={styles.salePeriodBadge}>판매중</span>
  ) : null;
  // 기간이 지나 자동 종료된 글은 여기서 되돌리지 않는다 (기간 변경은 수정 페이지에서)
  const saleToggleBtn =
    isOwner && (!saleEnded || post?.saleClosed === true) ? (
      <button
        className={styles.saleToggleBtn}
        onClick={handleToggleSaleClosed}
        disabled={saleUpdating}
      >
        {post?.saleClosed === true ? '판매 재개' : '판매 종료'}
      </button>
    ) : null;

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

  // 가챠 애니메이션 시작 (1회)
  const startGacha = () => {
    if (!post || gachaPhase !== 'idle') return;
    setGachaMode('single');
    const items = post.items;
    const targetIdx = selectGachaWinner(items);

    setGachaPhase('spinning');
    setWinnerIdx(-1);

    const minCycles = 3;
    const totalSteps = minCycles * items.length + targetIdx + 1;

    let step = 0;
    const tick = () => {
      const currentIdx = step % items.length;
      setHighlightIdx(currentIdx);
      step++;

      if (step > totalSteps) {
        setHighlightIdx(targetIdx);
        setWinnerIdx(targetIdx);
        setGachaPhase('result');
        return;
      }

      const progress = step / totalSteps;
      const interval = 50 + Math.pow(progress, 2.5) * 400;
      spinTimerRef.current = setTimeout(tick, interval);
    };

    tick();
  };

  // 가챠 10회: 동시 출발 + 순차 착지
  const startGachaMulti = () => {
    if (!post || gachaPhase !== 'idle') return;
    const items = post.items;

    const results: number[] = [];
    for (let r = 0; r < 10; r++) results.push(selectGachaWinner(items));

    setGachaMode('multi');
    setGachaPhase('spinning');
    setMultiResults(results);
    setMultiRevealCount(0);
    setMultiHighlights([]);

    const count = items.length;
    const TICK_MS = 35;
    const STAGGER_TICKS = 3; // ~105ms 간격으로 출발
    const CYCLES = 2;

    // 각 롤 데이터 사전 계산
    const rolls = results.map((targetIdx, rollIndex) => {
      const totalPositions = CYCLES * count + targetIdx + 1;
      const totalTicks = Math.round(totalPositions * 2.5);
      return {
        targetIdx,
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
        spinTimerRef.current = setTimeout(() => {
          setMultiHighlights([]);
          setGachaPhase('result');
        }, 300);
        return;
      }

      currentTick++;
      spinTimerRef.current = setTimeout(masterTick, TICK_MS);
    };

    masterTick();
  };

  // 가챠 리셋
  const resetGacha = () => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    setGachaPhase('idle');
    setHighlightIdx(-1);
    setWinnerIdx(-1);
    setGachaMode('single');
    setMultiResults([]);
    setMultiRevealCount(0);
    setMultiHighlights([]);
  };

  const handleChoiceSelect = (idx: number, choiceItemId: string) => {
    setChoiceSelections((prev) => ({ ...prev, [idx]: choiceItemId }));
  };

  // 선택 상자: 보는 사람이 후보 중 pickCount개까지 자유롭게 골라보는 토글
  const handleChoiceBoxCandidateToggle = (idx: number, candidateId: string) => {
    const item = post?.items[idx];
    if (!item || !item.choiceBoxCandidates) return;
    const pickCount = item.choiceBoxPickCount || 1;
    setChoiceBoxSelections((prev) => {
      const current = prev[idx] || [];
      if (current.includes(candidateId)) {
        return { ...prev, [idx]: current.filter((id) => id !== candidateId) };
      }
      if (current.length < pickCount) {
        return { ...prev, [idx]: [...current, candidateId] };
      }
      // 이미 pickCount개 선택된 상태면 가장 먼저 선택한 후보를 밀어내고 새 후보로 교체
      return { ...prev, [idx]: [...current.slice(1), candidateId] };
    });
  };

  const handleBonusChoiceSelect = (idx: number, choiceItemId: string) => {
    setBonusChoiceSelections((prev) => ({ ...prev, [idx]: choiceItemId }));
  };

  // 보너스 구성품용 선택 상자 토글 (메인 구성품과 동일한 로직, 별도 상태 사용)
  const handleBonusChoiceBoxCandidateToggle = (idx: number, candidateId: string) => {
    const item = post?.bonusItems?.[idx];
    if (!item || !item.choiceBoxCandidates) return;
    const pickCount = item.choiceBoxPickCount || 1;
    setBonusChoiceBoxSelections((prev) => {
      const current = prev[idx] || [];
      if (current.includes(candidateId)) {
        return { ...prev, [idx]: current.filter((id) => id !== candidateId) };
      }
      if (current.length < pickCount) {
        return { ...prev, [idx]: [...current, candidateId] };
      }
      return { ...prev, [idx]: [...current.slice(1), candidateId] };
    });
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
    if (item.itemId === 'fixed_cube-ticket')
      return bcRate > 0 ? calcTicketAverage('hell', 6, latestPrices, bcRate) / 6 : (item.goldOverride || 0);
    // 가공 완료 젬 상자: 연결 젬 실시간 시세 + 8,100골드
    if (PROCESSED_GEM_BOX_GEM[item.itemId])
      return Object.keys(latestPrices).length > 0
        ? getProcessedGemBoxUnitPrice(item.itemId, latestPrices)
        : (item.goldOverride || 0);
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
      if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
        const selected = choiceBoxSelections[idx] ?? item.choiceBoxSelectedIds ?? [];
        const sub = getChoiceBoxGold(item.choiceBoxCandidates, selected, latestPrices) * item.quantity;
        subtotals.push(sub);
        if (checkedItems[idx] !== false) total += sub;
        return;
      }
      let effectiveItemId = item.itemId;
      if (item.choiceOptions && item.choiceOptions.length > 0) {
        effectiveItemId = choiceSelections[idx] || item.itemId;
      }
      const effectiveQty = getEffectiveQty(item, choiceSelections[idx]);
      if (item.goldOverride != null) {
        const unit = getCrystalAdjustedUnit(item);
        const sub = unit * item.quantity;
        subtotals.push(sub);
        if (checkedItems[idx] !== false) total += sub;
      } else {
        const unitPrice = item.icon === FIXED_GEM_SELECT_ICON
          ? getFixedGemSelectUnitPrice(effectiveItemId, latestPrices, detailGoldPerWon)
          : getItemUnitPrice(effectiveItemId, latestPrices);
        const sub = unitPrice * effectiveQty;
        subtotals.push(sub);
        if (checkedItems[idx] !== false) total += sub;
      }
    });
    return { totalGold: total, itemSubtotals: subtotals };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, choiceSelections, choiceBoxSelections, latestPrices, checkedItems, detailGoldPerWon]);

  // '3+보너스' 전용: 3회 구매 시 1회 지급되는 보너스 구성품 가치 (선택형 보너스는 뷰어의 선택에 따라 재계산)
  const { bonusTotalGold, bonusItemSubtotals } = useMemo(() => {
    if (!post || post.packageType !== '3+보너스' || !post.bonusItems || post.bonusItems.length === 0) {
      return { bonusTotalGold: 0, bonusItemSubtotals: [] as number[] };
    }
    const subtotals = post.bonusItems.map((item, idx) =>
      getPackageItemGold(item, latestPrices, detailGoldPerWon, bcRate, bonusChoiceSelections[idx], bonusChoiceBoxSelections[idx]),
    );
    return { bonusTotalGold: subtotals.reduce((s, v) => s + v, 0), bonusItemSubtotals: subtotals };
  }, [post, latestPrices, detailGoldPerWon, bcRate, bonusChoiceSelections, bonusChoiceBoxSelections]);

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
  const isBonusPkg = post.packageType === '3+보너스';

  // 1개 이득률: 보너스 가정 없이 순수 1회 구매 기준 (3+1/2+1과 동일한 원칙)
  const singleBenefit = cashGold > 0 ? ((totalGold - cashGold) / cashGold) * 100 : 0;

  // N+1 / 3+보너스 이득률
  const buyCount = post.packageType === '3+1' ? 3 : post.packageType === '2+1' ? 2 : isBonusPkg ? 3 : 1;
  const getCount = post.packageType === '3+1' ? 4 : post.packageType === '2+1' ? 3 : 1;
  const bundleCash = cashGold * buyCount;
  // '3+보너스': 3회 구매 시 확정 구성품 3배 + 보너스 구성품 1회(고정, 배수 아님)
  const bundleGold = isBonusPkg ? totalGold * 3 + bonusTotalGold : totalGold * getCount;
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

    // 기대 효율 — 갤러리 카드의 가챠 표기와 같은 기준 (기대값 대비 현금 골드)
    const expectedBenefit = gachaCashGold > 0
      ? ((expectedGold - gachaCashGold) / gachaCashGold) * 100
      : 0;

    return (
      <Container fluid style={{ maxWidth: '1100px' }}>
        <div className={styles.detailWrapper}>
          <Link href="/package" className={styles.backLink}>
            &#8592; 목록으로 돌아가기
          </Link>

          {/* 헤더 — 일반 상세와 같은 구조 (뱃지 줄 · 제목 · 메타) */}
          <div className={styles.detailHeader}>
            <div className={styles.detailBadgeRow}>
              <span className={`${styles.typeBadge} ${styles.typeBadgeGacha}`}>가챠</span>
              {saleBadge}
            </div>
            <h1 className={styles.detailTitle}>{post.title}</h1>
            <div className={styles.detailMetaRow}>
              <span>{formatDate(post.createdAt)}</span>
              {salePeriodFull && <span>판매 {salePeriodFull}</span>}
              <span className={styles.viewCountText}>조회 {post.viewCount || 0}</span>
            </div>
          </div>

          <div className={styles.detailSplitRow}>
            {/* 왼쪽: 계산 결과 */}
            <div className={styles.resultPanel}>
              <div className={styles.detailCard}>
                <h2 className={styles.detailCardHeader}>계산 결과</h2>

                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>가챠 가격</span>
                  <PriceValue post={post} />
                </div>

                {detailGoldPerWon > 0 && (
                  <div className={styles.resultRow}>
                    <span className={styles.resultCashNum}>
                      {formatNumber(post.royalCrystalPrice)}원
                    </span>
                    <GoldValue v={gachaCashGold} />
                  </div>
                )}

                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>
                    {hasExcluded ? '기대값 (제외 반영)' : '기대값'}
                  </span>
                  <GoldValue v={expectedGold} />
                </div>

                {post.royalCrystalPrice > 0 && (
                  <div className={styles.resultRow}>
                    <span className={styles.resultRowLabel}>원당 골드</span>
                    <span className={styles.gachaExpectedEfficiency}>
                      {formatNumber(expectedGold / post.royalCrystalPrice)} G/원
                    </span>
                  </div>
                )}

                {detailGoldPerWon > 0 && (
                  <div className={styles.resultRow}>
                    <span className={styles.resultRowLabel}>기대 효율</span>
                    <BenefitBadge v={expectedBenefit} />
                  </div>
                )}

                {/* 환율 — 결과 수치와 섞이지 않게 따로 상자로 분리 */}
                <div className={styles.resultRateBox}>
                  <span className={styles.resultRateBoxLabel}>환율</span>
                  <div className={styles.resultRateInput}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.resultRateIcon} />
                    <span className={styles.resultRateFixed}>100</span>
                    <span className={styles.resultRateSep}>:</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/royal.webp" alt="로얄 크리스탈" className={styles.resultRateIcon} />
                    <input
                      type="number"
                      className={styles.resultRateNumber}
                      value={detailWonPer100Gold || ''}
                      onChange={(e) => setDetailWonPer100Gold(parseInt(e.target.value) || 0)}
                      placeholder="32"
                      min={1}
                      aria-label="100골드당 원화 환율"
                    />
                  </div>
                </div>

                {isOwner && (
                  <div className={styles.resultActions}>
                    <div className={styles.resultActionsRight}>
                      {saleToggleBtn}
                      <Link href={`/package/edit/${postId}`} className={styles.editBtn}>
                        수정
                      </Link>
                      <button className={styles.deleteBtn} onClick={handleDelete}>
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 모바일 띠배너 — 자리마다 다른 애드핏 단위를 받아야 한다.
                  같은 단위를 두 번 넣으면 애드핏이 첫 자리만 채운다 (index 0) */}
              <div className="d-block d-md-none my-2">
                <AdBanner slot="8616653628" index={0} />
              </div>

              {/* PC 좌측 250×250 (모바일에서는 CSS 로 숨김) */}
              <SideSquareAd postId={postId} />
            </div>

            {/* 오른쪽: 아이템 구성 + 가챠 시뮬 */}
            <section className={`${styles.itemCardsSection} ${styles.detailCard}`}>
              <h2 className={styles.detailCardHeader}>
                아이템 구성 ({gachaItems.length}종)
              </h2>

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
              const revealedSlice = multiResults.slice(0, multiRevealCount);
              const isHighlight = gachaPhase === 'spinning' && (
                (gachaMode === 'single' && highlightIdx === idx) ||
                (gachaMode === 'multi' && multiHighlights.includes(idx))
              );
              const isWon = (
                (gachaPhase === 'result' && gachaMode === 'single' && winnerIdx === idx) ||
                (gachaPhase === 'result' && gachaMode === 'multi' && multiResults.includes(idx)) ||
                (gachaPhase === 'spinning' && gachaMode === 'multi' && revealedSlice.includes(idx))
              );
              const isDimmed = gachaPhase === 'result' && (
                (gachaMode === 'single' && winnerIdx !== idx) ||
                (gachaMode === 'multi' && !multiResults.includes(idx))
              );
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
                  {(() => {
                    if (gachaMode !== 'multi') return null;
                    const slice = gachaPhase === 'result' ? multiResults : multiResults.slice(0, multiRevealCount);
                    const cnt = slice.filter(r => r === idx).length;
                    return cnt > 1 ? <span className={styles.gachaItemMultiCount}>x{cnt}</span> : null;
                  })()}
                  {item.icon && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img loading="lazy" decoding="async" src={item.icon} alt={item.name} className={styles.gachaItemIcon}
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

              {/* 가챠 버튼 (idle 일 때만) */}
              {gachaPhase === 'idle' && (
                <div className={styles.gachaBtnGroup}>
                  <button className={styles.gachaButton} onClick={startGacha}>
                    가챠!
                  </button>
                  <button className={`${styles.gachaButton} ${styles.gachaBtnMulti}`} onClick={startGachaMulti}>
                    10회 가챠!
                  </button>
                </div>
              )}

          {/* 1회 결과 */}
          {gachaPhase === 'result' && gachaMode === 'single' && wonItem && (
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

          {/* 10회 결과 (스피닝 중 진행 표시 + 최종 result) */}
          {((gachaPhase === 'spinning' && gachaMode === 'multi' && multiRevealCount > 0) || (gachaPhase === 'result' && gachaMode === 'multi')) && multiResults.length > 0 && (() => {
            const visibleResults = gachaPhase === 'spinning'
              ? multiResults.slice(0, multiRevealCount)
              : multiResults;
            const grouped = groupMultiResults(visibleResults);
            return (
              <div className={styles.gachaMultiResult}>
                <div className={styles.gachaResultTitle}>
                  {gachaPhase === 'spinning' ? `${multiRevealCount}/10` : '10회 가챠 결과!'}
                </div>
                <div className={styles.gachaMultiTable}>
                  {grouped.map(({ origIdx, count }) => {
                    const item = gachaItems[origIdx];
                    const itemGold = gachaItemGolds[origIdx];
                    const lineGold = itemGold * count;
                    return (
                      <div key={origIdx} className={styles.gachaMultiTableRow}>
                        <div className={styles.gachaMultiTableName}>
                          {item.icon && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img loading="lazy" decoding="async" src={item.icon} alt={item.name} className={styles.gachaMultiTableIcon}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          <span>{item.name}</span>
                          {item.quantity > 1 && <span className={styles.gachaMultiTableQty}>x{item.quantity}</span>}
                        </div>
                        <div className={styles.gachaMultiTableCount}>
                          {count}회
                        </div>
                        <div className={styles.gachaMultiTableGold}>
                          {formatNumber(lineGold)} G
                        </div>
                      </div>
                    );
                  })}
                </div>
                {gachaPhase === 'result' && (
                  <>
                    <div className={styles.gachaMultiTotalRow}>
                      <span className={styles.gachaMultiTotalLabel}>합계</span>
                      <span className={styles.gachaMultiTotalGold}>
                        {formatNumber(multiResults.reduce((sum, idx) => sum + gachaItemGolds[idx], 0))} G
                      </span>
                    </div>
                    {detailGoldPerWon > 0 && (() => {
                      const totalWonGold = multiResults.reduce((sum, idx) => sum + gachaItemGolds[idx], 0);
                      const totalCash = gachaCashGold * 10;
                      const multiBenefit = totalCash > 0 ? ((totalWonGold - totalCash) / totalCash) * 100 : 0;
                      return (
                        <div className={styles.gachaMultiTotalRow}>
                          <span className={styles.gachaMultiTotalLabel}>10회 이득률</span>
                          <span className={`${styles.gachaResultBenefit} ${multiBenefit >= 0 ? styles.benefitUp : styles.benefitDown}`}>
                            {multiBenefit >= 0 ? '+' : ''}{multiBenefit.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })()}
                    <button className={styles.gachaRerollButton} onClick={resetGacha}>
                      다시 뽑기
                    </button>
                  </>
                )}
              </div>
            );
          })()}
            </section>

            {/* 모바일 띠배너 — 아이템 구성 아래 (index 1: 위 자리와 다른 단위) */}
            <div className="d-block d-md-none my-2">
              <AdBanner slot="8616653628" index={1} />
            </div>
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
        <Link href="/package" className={styles.backLink}>
          &#8592; 목록으로 돌아가기
        </Link>

        {/* 헤더 — 뱃지 + 제목. 좌우 분할 위에 전체 폭으로 둔다 (가챠 상세와 같은 구조) */}
        <div className={styles.detailHeader}>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.typeBadge} ${getTypeBadgeClass(post.packageType)}`}>
              {post.packageType}
            </span>
            {/* 앞 피연산자를 숫자로 두면 selectableCount 가 0 일 때 React 가 그 0 을 그대로 그린다 */}
            {(post.selectableCount ?? 0) > 0 && (
              <span className={`${styles.typeBadge} ${styles.typeBadgeSelect}`}>
                {post.selectableCount}선택
              </span>
            )}
            {saleBadge}
          </div>
          <h1 className={styles.detailTitle}>{post.title}</h1>
          {/* 메타 — 앱 상세와 같은 자리(제목 아래 한 줄). 계산 결과 카드 안에 또 넣지 않는다 */}
          <div className={styles.detailMetaRow}>
            <span>{formatDate(post.createdAt)}</span>
            {salePeriodFull && <span>판매 {salePeriodFull}</span>}
            <span className={styles.viewCountText}>조회 {post.viewCount || 0}</span>
          </div>
        </div>

        <div className={styles.detailSplitRow}>
          {/* 왼쪽: 계산 결과 */}
          <div className={styles.resultPanel}>
            <div className={styles.detailCard}>
              <h2 className={styles.detailCardHeader}>계산 결과</h2>
              {/* 핵심 수치 — 갤러리 카드와 같은 순서·형식으로 읽히게 맞췄다.
                  가격 → 골드 환산 → 구성품 가치 → 이득률. 환율은 아래 별도 상자로 뺐다. */}
              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>패키지 가격</span>
                <PriceValue post={post} />
              </div>

              {/* 환산 줄: 30,000원 = [골드] 37,400 — 라벨 없이 좌우를 맞대 비교되게 둔다 */}
              {detailGoldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultCashNum}>
                    {formatNumber(post.royalCrystalPrice)}원
                  </span>
                  <GoldValue v={cashGold} />
                </div>
              )}

              <div className={styles.resultRow}>
                <span className={styles.resultRowLabel}>구성품 가치</span>
                <GoldValue v={totalGold} />
              </div>

              {detailGoldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultRowLabel}>1개 구매</span>
                  <BenefitBadge v={singleBenefit} />
                </div>
              )}

              {/* N+1 / 3+보너스 구간 */}
              {post.packageType !== '일반' && (
                <>
                  <div className={styles.resultDivider} />
                  <div className={styles.resultRow}>
                    <span className={styles.resultRowLabel}>{post.packageType} 보정</span>
                    <GoldValue v={bundleGold} />
                  </div>
                  {detailGoldPerWon > 0 && (
                    <div className={styles.resultRow}>
                      <span className={styles.resultRowLabel}>{post.packageType} 구매</span>
                      <BenefitBadge v={bundleBenefit} />
                    </div>
                  )}
                </>
              )}

              {/* 환율 — 결과 수치와 섞이지 않게 따로 상자로 분리 */}
              <div className={styles.resultRateBox}>
                <span className={styles.resultRateBoxLabel}>환율</span>
                <div className={styles.resultRateInput}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.resultRateIcon} />
                  <span className={styles.resultRateFixed}>100</span>
                  <span className={styles.resultRateSep}>:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/royal.webp" alt="로얄 크리스탈" className={styles.resultRateIcon} />
                  <input
                    type="number"
                    className={styles.resultRateNumber}
                    value={detailWonPer100Gold || ''}
                    onChange={(e) => setDetailWonPer100Gold(parseInt(e.target.value) || 0)}
                    placeholder="32"
                    min={1}
                    aria-label="100골드당 원화 환율"
                  />
                </div>
              </div>

              {isOwner && (
                <div className={styles.resultActions}>
                  <div className={styles.resultActionsRight}>
                    {saleToggleBtn}
                    <Link href={`/package/edit/${postId}`} className={styles.editBtn}>
                      수정
                    </Link>
                    <button className={styles.deleteBtn} onClick={handleDelete}>
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 모바일 띠배너 — 자리마다 다른 애드핏 단위를 받아야 한다.
                같은 단위를 두 번 넣으면 애드핏이 첫 자리만 채운다 (index 0) */}
            <div className="d-block d-md-none my-2">
              <AdBanner slot="8616653628" index={0} />
            </div>

            {/* PC 좌측 250×250 (모바일에서는 CSS 로 숨김) */}
            <SideSquareAd postId={postId} />
          </div>

          {/* 오른쪽: 아이템 카드 */}
          <section className={`${styles.itemCardsSection} ${styles.detailCard}`}>
            <h2 className={styles.detailCardHeader}>
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
                  : item.icon === FIXED_GEM_SELECT_ICON
                  ? getFixedGemSelectUnitPrice(effectiveItemId, latestPrices, detailGoldPerWon)
                  : getItemUnitPrice(effectiveItemId, latestPrices);
                const subtotal = itemSubtotals[idx] || 0;
                const hasChoices = item.choiceOptions && item.choiceOptions.length > 0;
                const hasChoiceBox = !!(item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0);
                const choiceBoxSelected = choiceBoxSelections[idx] ?? item.choiceBoxSelectedIds ?? [];
                const effectiveQty = getEffectiveQty(item, choiceSelections[idx]);

                const isChecked = checkedItems[idx] !== false;

                return (
                  <div
                    key={idx}
                    className={`${styles.itemCard} ${(hasChoices || hasChoiceBox) ? styles.itemCardChoice : ''} ${hasChoiceBox ? styles.itemCardFull : ''} ${!isChecked ? styles.itemCardUnchecked : ''}`}
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
                      {item.bundleItems && item.bundleItems.length > 0 ? (
                        <div className={styles.bundleIconStack}>
                          {item.bundleItems.map((bi, biIdx) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img loading="lazy" decoding="async" key={biIdx} src={bi.icon} alt={bi.name} className={styles.bundleIconItem}
                              style={{ zIndex: item.bundleItems!.length - biIdx }} />
                          ))}
                        </div>
                      ) : effective.icon && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img loading="lazy" decoding="async"
                          src={effective.icon}
                          alt={effective.name}
                          className={styles.itemCardIcon}
                        />
                      )}
                    </div>
                    <div className={styles.itemCardName}>
                      {item.bundleItems && item.bundleItems.length > 0
                        ? item.bundleItems.map((bi, biIdx) => (
                            <div key={biIdx} className={styles.bundleNameLine}>
                              {shortenItemName(bi.name)} ×{bi.quantity.toLocaleString()}×{item.quantity}
                            </div>
                          ))
                        : hasChoiceBox
                        ? `${item.name} (최대 ${item.choiceBoxPickCount || 1}개 선택)${item.quantity > 1 ? ` ×${item.quantity.toLocaleString()}` : ''}`
                        : item.icon === FIXED_GEM_SELECT_ICON && hasChoices
                        ? `고정형 영웅 젬 선택 상자 ×${effectiveQty.toLocaleString()}`
                        : `${shortenItemName(effective.name)} ×${effectiveQty.toLocaleString()}`}
                    </div>

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
                              <img loading="lazy" decoding="async" src={choice.icon} alt={choice.name} className={styles.itemCardChoiceBtnIcon} />
                            )}
                            <span>{shortenGemChoiceName(choice.name)}</span>
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
                            {shortenGemChoiceName(choice.name)}
                          </option>
                        ))}
                      </select>
                    )}

                    {hasChoiceBox && (
                      <div className={`${styles.itemCardChoices} ${styles.itemCardChoicesWide}`}>
                        {item.choiceBoxCandidates!.map((cand) => {
                          const isSelected = choiceBoxSelected.includes(cand.id);
                          const candPrice = (cand.itemId ? getItemUnitPrice(cand.itemId, latestPrices) : (cand.goldPerUnit || 0)) * cand.quantity;
                          return (
                            <button
                              key={cand.id}
                              type="button"
                              className={`${styles.itemCardChoiceBtn} ${isSelected ? styles.itemCardChoiceBtnActive : ''}`}
                              onClick={() => handleChoiceBoxCandidateToggle(idx, cand.id)}
                            >
                              {cand.icon && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img loading="lazy" decoding="async" src={cand.icon} alt={cand.name} className={styles.itemCardChoiceBtnIcon} />
                              )}
                              <span>{cand.name} ×{cand.quantity} ({formatNumber(candPrice)}G)</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className={styles.itemCardBottom}>
                      {!hasChoiceBox && (
                        <div className={styles.itemCardPriceLine}>
                          {`${formatNumber(unitPrice)}G`}
                          {' x '}
                          {effectiveQty}개
                        </div>
                      )}
                      <div className={styles.itemCardSubtotal}>
                        {formatNumber(subtotal)}G
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 모바일 띠배너 — 아이템 구성 아래 (index 1: 위 자리와 다른 단위) */}
          <div className="d-block d-md-none my-2">
            <AdBanner slot="8616653628" index={1} />
          </div>
        </div>

        {/* 구성품 상세 — 젬 상자류의 구성·계산 근거 (카드 안에 다 안 들어가는 정보를 여기에 풀어씀) */}
        {(() => {
          const rows: ReactNode[] = [];
          const pushGemRows = (items: PackageItem[], selections: Record<number, string>, keyPrefix: string) => {
            items.forEach((item, idx) => {
              if (item.icon === FIXED_GEM_SELECT_ICON && item.choiceOptions && item.choiceOptions.length > 0) {
                const selId = selections[idx] || item.itemId;
                const sel = item.choiceOptions.find((c) => c.itemId === selId);
                const bd = getFixedGemSelectBreakdown(selId, latestPrices, detailGoldPerWon);
                const fixedOpts = sel?.name.match(/\(([^)]+)\)/)?.[1];
                rows.push(
                  <div key={`${keyPrefix}${idx}`} className={styles.gemDetailRow}>
                    <div className={styles.gemDetailTitle}>고정형 영웅 젬 선택 상자 ×{item.quantity.toLocaleString()}</div>
                    <div className={styles.gemDetailLine}>
                      선택: {sel?.name || ''} — {fixedOpts ? `${fixedOpts} 옵션이 고정된 상태로 지급` : '옵션 고정 지급'}, 초기화 가능 횟수 +1
                    </div>
                    <div className={styles.gemDetailLine}>
                      계산: 젬 시세 {formatNumber(bd.base)}G × {bd.multiplier} (조합 확률 1/6 확정) × 2 (초기화 가능 횟수 +1) − {formatNumber(bd.ticketGold)}G (초기화권 100크리스탈) = <strong>{formatNumber(bd.total)}G</strong>
                    </div>
                  </div>,
                );
              } else if (PROCESSED_GEM_BOX_GEM[item.itemId]) {
                const info = PROCESSED_GEM_BOX_INFO[item.itemId];
                const base = getItemUnitPrice(PROCESSED_GEM_BOX_GEM[item.itemId], latestPrices);
                rows.push(
                  <div key={`${keyPrefix}${idx}`} className={styles.gemDetailRow}>
                    <div className={styles.gemDetailTitle}>{item.name} ×{item.quantity.toLocaleString()}</div>
                    <div className={styles.gemDetailLine}>
                      구성: {info.gemName} 확정 — {info.options}
                    </div>
                    <div className={styles.gemDetailLine}>
                      계산: {info.gemShort} 시세 {formatNumber(base)}G + 가공 비용 {formatNumber(PROCESSED_GEM_BOX_EXTRA_GOLD)}G = <strong>{formatNumber(getProcessedGemBoxUnitPrice(item.itemId, latestPrices))}G</strong>
                    </div>
                  </div>,
                );
              }
            });
          };
          pushGemRows(post.items, choiceSelections, 'gd-m-');
          pushGemRows(post.bonusItems || [], bonusChoiceSelections, 'gd-b-');
          if (rows.length === 0) return null;
          return (
            <section className={`${styles.itemCardsSection} ${styles.detailCard}`}>
              <h2 className={styles.detailCardHeader}>구성품 상세</h2>
              <div className={styles.gemDetailList}>{rows}</div>
            </section>
          );
        })()}

        {/* 보너스 구성품 (3+보너스 전용, 3회 구매 시 1회 지급) */}
        {post.packageType === '3+보너스' && post.bonusItems && post.bonusItems.length > 0 && (
          <section className={`${styles.itemCardsSection} ${styles.detailCard}`}>
            <h2 className={styles.detailCardHeader}>
              보너스 구성품 ({post.bonusItems.length}종)
              <span className={styles.detailCardHeaderNote}>3회 구매 시 1회 지급</span>
            </h2>
            <div className={styles.itemCardsGrid}>
              {post.bonusItems.map((item, idx) => {
                const hasChoices = !!(item.choiceOptions && item.choiceOptions.length > 0);
                const hasChoiceBox = !!(item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0);
                const choiceBoxSelected = bonusChoiceBoxSelections[idx] ?? item.choiceBoxSelectedIds ?? [];
                const effectiveChoiceId = bonusChoiceSelections[idx] || item.itemId;
                const effectiveChoice = hasChoices
                  ? item.choiceOptions!.find((c) => c.itemId === effectiveChoiceId)
                  : null;
                const gold = bonusItemSubtotals[idx] || 0;
                const effectiveQty = item.quantity * (effectiveChoice?.quantity ?? 1);

                return (
                  <div
                    key={idx}
                    className={`${styles.itemCard} ${(hasChoices || hasChoiceBox) ? styles.itemCardChoice : ''} ${hasChoiceBox ? styles.itemCardFull : ''}`}
                  >
                    <div className={styles.itemCardIconWrap}>
                      {item.bundleItems && item.bundleItems.length > 0 ? (
                        <div className={styles.bundleIconStack}>
                          {item.bundleItems.map((bi, biIdx) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img loading="lazy" decoding="async" key={biIdx} src={bi.icon} alt={bi.name} className={styles.bundleIconItem}
                              style={{ zIndex: item.bundleItems!.length - biIdx }} />
                          ))}
                        </div>
                      ) : (effectiveChoice?.icon || item.icon) && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img loading="lazy" decoding="async"
                          src={effectiveChoice?.icon || item.icon}
                          alt={effectiveChoice?.name || item.name}
                          className={styles.itemCardIcon}
                        />
                      )}
                    </div>
                    <div className={styles.itemCardName}>
                      {item.bundleItems && item.bundleItems.length > 0
                        ? item.bundleItems.map((bi, biIdx) => (
                            <div key={biIdx} className={styles.bundleNameLine}>
                              {shortenItemName(bi.name)} ×{bi.quantity.toLocaleString()}×{item.quantity}
                            </div>
                          ))
                        : hasChoiceBox
                        ? `${item.name} (최대 ${item.choiceBoxPickCount || 1}개 선택)${item.quantity > 1 ? ` ×${item.quantity.toLocaleString()}` : ''}`
                        : item.icon === FIXED_GEM_SELECT_ICON && hasChoices
                        ? `고정형 영웅 젬 선택 상자 ×${effectiveQty.toLocaleString()}`
                        : `${shortenItemName(effectiveChoice?.name || item.name)} ×${effectiveQty.toLocaleString()}`}
                    </div>

                    {hasChoices && item.choiceOptions!.length <= 3 && (
                      <div className={styles.itemCardChoices}>
                        {item.choiceOptions!.map((choice) => (
                          <button
                            key={choice.itemId}
                            type="button"
                            className={`${styles.itemCardChoiceBtn} ${effectiveChoiceId === choice.itemId ? styles.itemCardChoiceBtnActive : ''}`}
                            onClick={() => handleBonusChoiceSelect(idx, choice.itemId)}
                          >
                            {choice.icon && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img loading="lazy" decoding="async" src={choice.icon} alt={choice.name} className={styles.itemCardChoiceBtnIcon} />
                            )}
                            <span>{shortenGemChoiceName(choice.name)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {hasChoices && item.choiceOptions!.length > 3 && (
                      <select
                        className={styles.itemCardChoiceSelect}
                        value={effectiveChoiceId}
                        onChange={(e) => handleBonusChoiceSelect(idx, e.target.value)}
                      >
                        {item.choiceOptions!.map((choice) => (
                          <option key={choice.itemId} value={choice.itemId}>
                            {shortenGemChoiceName(choice.name)}
                          </option>
                        ))}
                      </select>
                    )}

                    {hasChoiceBox && (
                      <div className={`${styles.itemCardChoices} ${styles.itemCardChoicesWide}`}>
                        {item.choiceBoxCandidates!.map((cand) => {
                          const isSelected = choiceBoxSelected.includes(cand.id);
                          const candPrice = (cand.itemId ? getItemUnitPrice(cand.itemId, latestPrices) : (cand.goldPerUnit || 0)) * cand.quantity;
                          return (
                            <button
                              key={cand.id}
                              type="button"
                              className={`${styles.itemCardChoiceBtn} ${isSelected ? styles.itemCardChoiceBtnActive : ''}`}
                              onClick={() => handleBonusChoiceBoxCandidateToggle(idx, cand.id)}
                            >
                              {cand.icon && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img loading="lazy" decoding="async" src={cand.icon} alt={cand.name} className={styles.itemCardChoiceBtnIcon} />
                              )}
                              <span>{cand.name} ×{cand.quantity} ({formatNumber(candPrice)}G)</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className={styles.itemCardBottom}>
                      {!hasChoiceBox && (
                        <div className={styles.itemCardPriceLine}>
                          {effectiveQty}개
                        </div>
                      )}
                      <div className={styles.itemCardSubtotal}>
                        {formatNumber(gold)}G
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
