'use client';

import { memo, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { PackagePost, PackageItem, PackageType } from '@/types/package';
import {
  formatNumber,
  PRICE_BUNDLE_SIZE,
  CRYSTAL_PER_UNIT_FALLBACK,
  calculateGachaItemGold,
  getChoiceBoxBestGold,
  getChoiceBestValue,
  getProbBoxExpectedGold,
  getFixedGemSelectBestUnitPrice,
  FIXED_GEM_SELECT_ICON,
  PROCESSED_GEM_BOX_GEM,
  getProcessedGemBoxUnitPrice,
  isNewReleasePost,
} from '@/lib/package-shared';
import { calcTicketAverage } from '@/lib/hell-reward-calc';
import { isSaleEnded, formatSalePeriod } from '@/lib/package-sale';
import TrendArrow from '@/components/TrendArrow';
import ReactionBar, { EMOJI_YELLOW } from '@/components/package/ReactionBar';
import styles from './PackageGalleryCard.module.css';

type Props = {
  post: PackagePost;
  latestPrices: Record<string, number>;
  /** 갤러리 상단에서 지정한 공통 환율(100골드당 원). 0 이면 미적용. */
  commonWonPer100Gold?: number;
  /**
   * 비교 기준이 되는 평균가 시세. "시세 갱신" 으로 latestPrices 가 실시간 최저가로
   * 덮인 동안에만 넘어오고, 그때 효율 옆에 평균가 대비 변동폭이 붙는다.
   */
  basePrices?: Record<string, number>;
};

function getBadgeClass(type: PackageType): string {
  if (type === '3+1') return styles.badge31;
  if (type === '2+1') return styles.badge21;
  if (type === '3+보너스') return styles.badge31;
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
  // 골드 코인·용숨/빙숨·지옥 영웅 티켓은 인라인 px 대신 getIconTweakClass 의 클래스로 잡는다
  // (모바일 셀은 비율 % 라 px 로는 못 맞춘다)
  'crystal_pheon': 54,
  'expected_gem-choice': 54,
  'expected_gem-hero-random': 54,
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

/**
 * 그림이 꽉 찬 아이콘은 줄이고(골드 코인·용숨/빙숨), 여백이 많은 아이콘은 키워(지옥 영웅 티켓)
 * 셀 안에서 아이템끼리 크기가 고르게 보이게 맞춘다.
 * 인라인 px 이 아니라 클래스로 잡는 이유: 모바일 셀은 크기가 화면 폭에 따라 달라져 % 로만 맞출 수 있다.
 */
function getIconTweakClass(itemId: string, icon: string): string {
  if (itemId === 'fixed_gold-input') return styles.itemCellIconGold;
  if (itemId === 'fixed_hell-heroic-ticket') return styles.itemCellIconHell;
  if (/breath-(lava|glacier)/.test(icon)) return styles.itemCellIconBreath;
  return '';
}

/** 셀 안 그림 — 확정 구성품·보너스 구성품 공용 (묶음 아이콘 / 단일 아이콘 / 기타 텍스트) */
function ItemCellVisual({ item }: { item: PackageItem }) {
  if (item.bundleItems && item.bundleItems.length > 0) {
    return (
      <div className={styles.bundleIconStack}>
        {item.bundleItems.map((bi, biIdx) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img loading="lazy" decoding="async" key={biIdx} src={bi.icon} alt={bi.name} className={styles.bundleIconItem}
            style={{ zIndex: item.bundleItems!.length - biIdx }} />
        ))}
      </div>
    );
  }
  if (item.icon) {
    const size = getGalleryIconSize(item.itemId);
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img loading="lazy" decoding="async"
        src={getDisplayIcon(item.icon)}
        alt={item.name}
        className={`${styles.itemCellIcon} ${getIconTweakClass(item.itemId, getDisplayIcon(item.icon))}`}
        style={size ? { width: size, height: size } : {}} />
    );
  }
  /* 기타(직접 입력) 항목 — 아이콘이 없다. 등록자가 넣은 축약 이름을 쓰고,
     안 넣었으면 풀네임을 그대로 흘려 CSS 로 자른다 (툴팁에는 항상 풀네임) */
  return (
    <div className={styles.itemCellPlaceholder} title={item.name}>
      <span className={styles.itemCellPlaceholderText}>
        {item.shortName || item.name || '기타'}
      </span>
    </div>
  );
}

// 이득률 % — 매트 단색 + 양 모서리 컷 칩 (이득 초록 / 손해 빨강)
function BenefitPct({ v }: { v: number }) {
  return (
    <span className={`${styles.benefitBadge} ${v >= 0 ? styles.benefitBadgeUp : styles.benefitBadgeDown}`}>
      {v >= 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

// 평균가 대비 변동폭 — 효율 칩 옆에 붙는 작은 화살표 + 숫자(%p).
// 시세 갱신을 눌렀을 때만 나타나므로, 이게 뜬다는 것 자체가 "갱신됐다" 는 신호다.
function BenefitDelta({ d }: { d: number }) {
  const up = d > 0;
  return (
    <span className={`${styles.benefitDelta} ${up ? styles.benefitDeltaUp : styles.benefitDeltaDown}`}>
      <TrendArrow up={up} size={11} />
      {Math.abs(d).toFixed(1)}
    </span>
  );
}

// 조회수 아이콘 — 누르는 게 아니라 움직일 이유가 없어 로티 대신 정지 SVG.
// 예전 로티(doodle 586)처럼 "사람" 실루엣 — 머리 + 어깨. 반응 로티와 같은 톤
// (선 = 글자색, 채움 = 이모지 노랑). 선 굵기는 VIEWS_STROKE 하나로 조절한다.
// 그림을 0.72 배로 줄이므로 선도 같이 얇아진다 — 화면상 1.7px 정도가 되게 미리 굵혀 둔다
const VIEWS_STROKE = 2.4;
function ViewsIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* 26px 상자는 로티와 같게 두고 그림만 안쪽으로 줄인다 — 알약 높이·정렬이 안 흔들린다 */}
      <g transform="translate(13 13) scale(0.72) translate(-13 -13)">
      {/* 어깨 — 위가 열린 둥근 몸통 */}
      <path
        d="M4.5 22.5c0-5 3.8-8.3 8.5-8.3s8.5 3.3 8.5 8.3"
        fill={EMOJI_YELLOW}
        stroke="var(--gc-text)"
        strokeWidth={VIEWS_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 머리 */}
      <circle
        cx={13}
        cy={8.2}
        r={4.6}
        fill={EMOJI_YELLOW}
        stroke="var(--gc-text)"
        strokeWidth={VIEWS_STROKE}
      />
      </g>
    </svg>
  );
}

// memo: 갤러리 페이지 최상위 state(공통 환율 타이핑 등)가 바뀔 때 prop 이 그대로인 카드까지
// 전부 리렌더되는 것을 막는다 — post/latestPrices 는 참조가 안정적이라 memo 가 실제로 먹힌다
function PackageGalleryCard({ post, latestPrices, commonWonPer100Gold = 0, basePrices }: Props) {
  const router = useRouter();

  const defaultWon = post.goldPerWon && post.goldPerWon > 0
    ? Math.round(1000 / post.goldPerWon) / 10
    : 0;
  // 환율 입력은 문자열로 든다 — number state 면 "16." 같은 타이핑 중간 상태가 지워져 소수(16.5) 입력이 안 된다
  const [rateText, setRateText] = useState<string>(() => {
    const v = commonWonPer100Gold || defaultWon;
    return v > 0 ? String(v) : '';
  });
  // 블크 시세(100블크당 골드) — 환율과 양방향 동기화 (100블크 = 2750원 고정)
  const [bcText, setBcText] = useState<string>(() => {
    const v = commonWonPer100Gold || defaultWon;
    return v > 0 ? String(Math.round(275000 / v)) : '';
  });
  const wonPer100Gold = parseFloat(rateText) || 0;

  const handleRateInput = (v: string) => {
    setRateText(v);
    const w = parseFloat(v) || 0;
    setBcText(w > 0 ? String(Math.round(275000 / w)) : '');
  };
  const handleBcInput = (v: string) => {
    setBcText(v);
    const b = parseFloat(v) || 0;
    setRateText(b > 0 ? String(Math.round(2750000 / b) / 10) : '');
  };
  // 판매 종료 카드는 기본이 흐린 상태 — 우측 상단 버튼으로 해제하면 그대로 비교할 수 있다
  const [saleRevealed, setSaleRevealed] = useState(false);

  // 갤러리 공통 환율이 바뀌면 이 카드도 따라간다.
  // 적용 후 아래 입력칸으로 개별 수정하는 건 그대로 되고, 공통 환율을 다시 건드릴 때까지 유지된다.
  // 0(미적용)으로 되돌리면 등록 시점 환율로 복귀.
  useEffect(() => {
    const v = commonWonPer100Gold > 0 ? commonWonPer100Gold : defaultWon;
    setRateText(v > 0 ? String(v) : '');
    setBcText(v > 0 ? String(Math.round(275000 / v)) : '');
  }, [commonWonPer100Gold, defaultWon]);
  // N선택 패키지는 시세 로드 후 아래 useEffect에서 최고가 N개를 확정한다
  // (마운트 시점엔 latestPrices가 비어 있어 goldOverride 티켓만 값이 잡히는 오선택이 났었음)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    const selectable = !!(post.selectableCount && post.selectableCount > 0);
    post.items.forEach((_, idx) => { initial[idx] = !selectable; });
    return initial;
  });

  const goldPerWon = wonPer100Gold > 0 ? 100 / wonPer100Gold : 0;

  // 티켓 동적 시세 계산 (시세 변동 시 자동 반영)
  // 시세맵은 calcItemGold 에서 그대로 흘려받는다 — 평균가 기준으로 다시 돌릴 때
  // 이 함수만 실시간 시세를 보면 비교값에 두 시세가 섞인다.
  const getTicketDynamicUnit = (
    itemId: string,
    fallback: number,
    prices: Record<string, number> = latestPrices,
  ): number => {
    const bcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
    if (PROCESSED_GEM_BOX_GEM[itemId] && Object.keys(prices).length > 0)
      return getProcessedGemBoxUnitPrice(itemId, prices);
    if (bcRate > 0 && Object.keys(prices).length > 0) {
      if (itemId === 'fixed_hell-legendary-ticket')
        return calcTicketAverage('hell', 7, prices, bcRate);
      if (itemId === 'fixed_hell-heroic-ticket')
        return calcTicketAverage('hell', 6, prices, bcRate);
      if (itemId === 'fixed_naraka-legendary-ticket')
        return calcTicketAverage('narak', 2, prices, bcRate);
      if (itemId === 'fixed_cube-ticket')
        return calcTicketAverage('hell', 6, prices, bcRate) / 6;
    }
    return fallback;
  };

  /**
   * 구성품 1개의 골드 가치 — 확정 구성품·보너스 구성품 공용.
   * 시세맵을 인자로 받는다: 같은 계산을 평균가 기준으로 한 번 더 돌려 변동폭을 낸다.
   */
  const calcItemGold = (item: PackageItem, prices: Record<string, number> = latestPrices): number => {
    const bcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
    if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
      // 현재 시세 상위 N개 조합 (저장된 선택은 등록 시점 시세라 역전될 수 있음)
      const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
      return getChoiceBoxBestGold(item.choiceBoxCandidates, n, prices) * item.quantity;
    }
    // 확률 상자: 현재 시세 기준 기댓값 (티켓 후보는 bcRate 로 동적 단가)
    if (item.probBoxCandidates && item.probBoxCandidates.length > 0) {
      return getProbBoxExpectedGold(item.probBoxCandidates, prices, bcRate) * item.quantity;
    }
    if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
      return item.crystalPerUnit * goldPerWon * 27.5 * item.quantity;
    }
    // 기존 패키지 하위 호환
    if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
      const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
      if (fallback) return fallback * goldPerWon * 27.5 * item.quantity;
    }
    if (item.goldOverride != null) {
      const dynamicUnit = getTicketDynamicUnit(item.itemId, item.goldOverride, prices);
      return dynamicUnit * item.quantity;
    }
    // choice 타입: 현재 시세 최고가 선택지 기준 (item.quantity = 박스 개수)
    if (item.choiceOptions && item.choiceOptions.length > 0) {
      if (item.icon === FIXED_GEM_SELECT_ICON) {
        const qty = item.quantity * (item.choiceOptions.find((c) => c.itemId === item.itemId)?.quantity ?? 1);
        return getFixedGemSelectBestUnitPrice(item.choiceOptions, item.itemId, prices, goldPerWon) * qty;
      }
      return getChoiceBestValue(item.choiceOptions, item.itemId, prices) * item.quantity;
    }
    const raw = prices[item.itemId] || 0;
    const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
    return (raw / bundle) * item.quantity;
  };

  // 아이템별 소계 (N선택 토글 로직용)
  const itemSubtotals = useMemo(
    () => post.items.map(item => calcItemGold(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.items, latestPrices, goldPerWon],
  );

  // 보너스 구성품 소계 (보너스 택N 토글 로직용)
  const bonusItemSubtotals = useMemo(
    () => (post.bonusItems || []).map(item => calcItemGold(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.bonusItems, latestPrices, goldPerWon],
  );

  // 시세 로드 후 N선택 재계산 — 표시 소계(itemSubtotals)와 동일한 값 기준 (티켓은 지옥 보상 평균 연동).
  // useState 초기값은 시세 도착 전(빈 prices)에 계산되어 goldOverride 티켓만 값이 잡히는 문제가 있어 여기서 확정한다.
  // 사용자가 손으로 고르기 전까지는 시세를 따라간다 — "시세 갱신"으로 최저가가 덮이면
  // 최고가 N개가 뒤집힐 수 있는데, 1회 확정으로 두면 선택만 낡은 시세 기준으로 남는다.
  const userPickedRef = useRef(false);
  useEffect(() => {
    const sc = post.selectableCount || 0;
    if (sc <= 0) return;
    if (Object.keys(latestPrices).length === 0) return;
    if (userPickedRef.current) return;
    const withValue = itemSubtotals.map((value, idx) => ({ idx, value }));
    withValue.sort((a, b) => b.value - a.value);
    const next: Record<number, boolean> = {};
    post.items.forEach((_, idx) => { next[idx] = false; });
    withValue.slice(0, sc).forEach((v) => { next[v.idx] = true; });
    // 같은 선택이면 setState 를 건너뛴다 — 시세 참조가 바뀔 때마다 불필요한 리렌더를 막는다
    setCheckedItems((prev) => {
      const same = post.items.every((_, idx) => (prev[idx] !== false) === (next[idx] !== false));
      return same ? prev : next;
    });
  }, [latestPrices, itemSubtotals, post.items, post.selectableCount]);

  const handleToggleCheck = (idx: number) => {
    userPickedRef.current = true;
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

  /* 보너스 구성품 택N — 확정 구성품 N선택과 같은 원칙.
     시세 로드 전에는 값을 몰라 최고가 N개를 못 고르므로, 아래 effect 에서 확정한다. */
  const [bonusChecked, setBonusChecked] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    const selectable = !!(post.bonusSelectableCount && post.bonusSelectableCount > 0);
    (post.bonusItems || []).forEach((_, idx) => { initial[idx] = !selectable; });
    return initial;
  });

  // 본품과 같은 원칙 — 사용자 개입 전까지는 시세 갱신을 따라 최고가 N개를 재선정한다
  const bonusUserPickedRef = useRef(false);
  useEffect(() => {
    const sc = post.bonusSelectableCount || 0;
    if (sc <= 0) return;
    if (!post.bonusItems || post.bonusItems.length === 0) return;
    if (Object.keys(latestPrices).length === 0) return;
    if (bonusUserPickedRef.current) return;
    const withValue = bonusItemSubtotals.map((value, idx) => ({ idx, value }));
    withValue.sort((a, b) => b.value - a.value);
    const next: Record<number, boolean> = {};
    post.bonusItems.forEach((_, idx) => { next[idx] = false; });
    withValue.slice(0, sc).forEach((v) => { next[v.idx] = true; });
    setBonusChecked((prev) => {
      const same = (post.bonusItems || []).every((_, idx) => (prev[idx] !== false) === (next[idx] !== false));
      return same ? prev : next;
    });
  }, [latestPrices, bonusItemSubtotals, post.bonusItems, post.bonusSelectableCount]);

  // 보너스 택N 토글 — N개 초과 선택 시 체크된 것 중 가장 싼 보너스를 밀어낸다 (메인 N선택과 동일)
  const handleBonusToggleCheck = (idx: number) => {
    bonusUserPickedRef.current = true;
    const sc = post.bonusSelectableCount || 0;
    setBonusChecked((prev) => {
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
              const val = bonusItemSubtotals[+i] || 0;
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
      return sum + (itemSubtotals[idx] || 0);
    }, 0);
  }, [post.items, checkedItems, itemSubtotals]);
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

  // '3+보너스' 전용: 3회 구매 시 1회 지급되는 보너스 구성품 가치.
  // 카드에서 켜 둔 보너스만 합산한다 (택N 이면 시세 기준 최고가 N개가 기본으로 켜져 있다).
  const bonusTotalGold = useMemo(() => {
    if (post.packageType !== '3+보너스' || !post.bonusItems || post.bonusItems.length === 0) return 0;
    return bonusItemSubtotals.reduce((sum, v, idx) => (bonusChecked[idx] === false ? sum : sum + v), 0);
  }, [post.packageType, post.bonusItems, bonusItemSubtotals, bonusChecked]);

  // 평균가 기준 효율 — 같은 calcItemGold·같은 체크 상태로 시세맵만 갈아서 한 번 더 돌린다.
  // 계산 경로를 공유하므로 "표시값과 비교값이 다른 로직" 으로 어긋날 일이 없다.
  const baseEffectiveGold = useMemo(() => {
    if (!basePrices) return null;
    if (isGacha) {
      const bcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
      return post.items.reduce((sum, item, idx) => {
        if (checkedItems[idx] === false) return sum;
        return sum + calculateGachaItemGold(item, basePrices, goldPerWon, bcRate) * ((item.probability || 0) / 100);
      }, 0);
    }
    return post.items.reduce((sum, item, idx) => {
      if (checkedItems[idx] === false) return sum;
      return sum + calcItemGold(item, basePrices);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePrices, post.items, checkedItems, isGacha, goldPerWon]);

  const cashGold = post.royalCrystalPrice * goldPerWon;
  const isBundle = post.packageType === '3+1' || post.packageType === '2+1';
  const isBonusPkg = post.packageType === '3+보너스';
  // 보너스 판을 카드 아래 남는 자리로 내리면 메타 줄의 margin-top:auto 와 자리를 나눠 갖게 되므로
  // 이 플래그로 메타 줄의 auto 를 끈다
  const showBonus = isBonusPkg && !!post.bonusItems && post.bonusItems.length > 0;

  // '1개 구매'는 보너스 가정 없이 순수 1회 구매 기준 (3+1/2+1과 동일한 원칙)
  const effectiveGold = isGacha ? gachaExpectedGold : totalGold;
  const singleBenefit = cashGold > 0 ? ((effectiveGold - cashGold) / cashGold) * 100 : 0;
  // 평균가 대비 변동폭(%p). 0.1%p 미만은 표시하지 않는다 — 안 움직인 카드까지 화살표가 붙으면
  // "갱신됐다" 가 아니라 "원래 그렇다" 로 읽혀 신호가 죽는다.
  const benefitDelta = (() => {
    if (baseEffectiveGold === null || cashGold <= 0) return null;
    const d = singleBenefit - ((baseEffectiveGold - cashGold) / cashGold) * 100;
    return Math.abs(d) < 0.1 ? null : d;
  })();

  const buyCount = post.packageType === '3+1' ? 3 : post.packageType === '2+1' ? 2 : isBonusPkg ? 3 : 1;
  const getCount = post.packageType === '3+1' ? 4 : post.packageType === '2+1' ? 3 : 1;
  const bundleCash = cashGold * buyCount;
  // '3+보너스': 3회 구매 시 확정 구성품 3배 + 보너스 구성품 1회(고정, 배수 아님)
  const bundleGold = isBonusPkg ? totalGold * 3 + bonusTotalGold : totalGold * getCount;
  const bundleBenefit = bundleCash > 0 ? ((bundleGold - bundleCash) / bundleCash) * 100 : 0;

  // 판매 종료 — 표시만 비활성 톤으로 내린다. 시세 연동·계산·상세 이동은 그대로 동작한다.
  const saleEnded = isSaleEnded(post);
  const salePeriod = formatSalePeriod(post);
  const dimmed = saleEnded && !saleRevealed;

  /**
   * 카드 아무 데나 누르면 상세로 가되, 조작 영역은 예외로 둔다.
   * 버튼·입력 자체뿐 아니라 그 둘레(가챠 버튼 사이 여백, 환율 상자 바깥 등)도 data-nonav 로 묶어
   * 살짝 빗나간 터치가 상세 이동으로 새지 않게 한다.
   */
  const handleCardClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-nonav], button, input, select, textarea, label, a')) return;
    router.push(`/package/${post.id}`);
  };

  return (
    <article
      className={`${styles.galleryCard} ${saleEnded ? styles.cardEnded : ''} ${dimmed ? styles.cardDimmed : ''}`}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      {/* 흐린 화면 위에 얹히는 글씨 — 판매 종료 / 줄 내려서 판매 기간 (카드 중앙) */}
      {dimmed && (
        <div className={styles.saleEndedOverlay}>
          <span className={styles.saleEndedTitle}>판매 종료</span>
          {salePeriod && <span className={styles.saleEndedPeriodText}>{salePeriod}</span>}
        </div>
      )}
      {/* 우측 상단 해제 버튼 — 비교하려고 잠깐 원래 카드로 보기 */}
      {saleEnded && (
        <button
          type="button"
          className={styles.saleRevealBtn}
          onClick={(e) => { e.stopPropagation(); setSaleRevealed((v) => !v); }}
          title={salePeriod ? `판매기간 ${salePeriod}` : '판매 종료'}
        >
          {saleRevealed ? '복원' : '해제'}
        </button>
      )}
      {/* 왼쪽: 아이템 목록 (배경 이미지) */}
      <div className={styles.leftBox}>
        <div className={styles.leftHeader}>
          {/* 신규 출시 NEW — 제목 앞 강조 배지 (판매 종료되면 isNewReleasePost 가 false 라 안 뜬다) */}
          {isNewReleasePost(post) && (
            <span className={styles.badgeNew}>NEW</span>
          )}
          <h3 className={styles.cardTitle}>{post.title}</h3>
        </div>

        <div className={`${styles.itemGrid} ${isGacha ? '' : styles.itemGridCapped}`}>
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
                <ItemCellVisual item={item} />
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
          <span className={`${styles.moreText} ${styles.moreTextDesktop}`}>...외 {post.items.length - 15}개 아이템</span>
        )}
        {/* 모바일은 2줄(10개)까지만 보인다 — 가챠는 룰렛 칸이라 자르지 않는다 */}
        {!isGacha && post.items.length > 10 && (
          <span className={`${styles.moreText} ${styles.moreTextMobile}`}>...외 {post.items.length - 10}개 아이템</span>
        )}

        {/* 보너스 구성품 — 3회 구매 시 1회 지급.
            카드 아래 남는 자리로 내려 붙이고(.bonusBlock margin-top:auto), 금색 띠 머리말이 달린
            별도 판으로 묶어 확정 구성품과 구분한다. 셀 크기는 확정 구성품과 똑같이 둔다.
            고른 것만 살리고 안 고른 건 흑백으로 죽여 '안 받는 것'이 한눈에 보이게 한다. */}
        {showBonus && post.bonusItems && (
          <div className={styles.bonusBlock}>
            <div className={styles.bonusBar}>
              <span className={styles.bonusBarTitle}>보너스</span>
              <span className={styles.bonusBarNote}>
                3회 구매 시 1회{(post.bonusSelectableCount || 0) > 0 ? ` · ${post.bonusSelectableCount}개 선택` : ''}
              </span>
              {bonusTotalGold > 0 && (
                <span className={styles.bonusBarGold}>+{formatNumber(bonusTotalGold)}G</span>
              )}
            </div>
            <div className={styles.bonusGrid}>
              {post.bonusItems.map((item, idx) => {
                const isChecked = bonusChecked[idx] !== false;
                return (
                  <div
                    key={idx}
                    className={`${styles.bonusCell} ${isChecked ? '' : styles.bonusCellOff}`}
                    onClick={(e) => { e.stopPropagation(); handleBonusToggleCheck(idx); }}
                    title={item.name}
                  >
                    <ItemCellVisual item={item} />
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
          </div>
        )}

        <div className={`${styles.leftMeta} ${showBonus ? styles.leftMetaTight : ''}`}>
          {/* 왼쪽: 따봉 · 흠 · 조회수 (로티 세 개, 같은 노란 이모지 톤). 카드 클릭 이동 제외 */}
          <div className={styles.metaLeft}>
            <ReactionBar postId={post.id} likeCount={post.likeCount || 0} sosoCount={post.sosoCount || 0} />
            {/* 조회수 — 반응 버튼과 같은 알약 생김새(누를 수는 없다) */}
            <span className={`${styles.reactionBtn} ${styles.metaViews}`} title="조회수">
              <ViewsIcon />
              <span className={styles.reactionCount}>{post.viewCount || 0}</span>
            </span>
          </div>
          {/* 오른쪽: 작성자 · 날짜 — 글자만 */}
          <div className={styles.metaRight}>
            <span className={styles.metaAuthor}>{post.authorName || '익명'}</span>
            <span className={styles.metaDate}>{formatShortDate(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 오른쪽: 계산 결과 */}
      <div className={styles.rightBox}>
        <div className={styles.rightTop}>
          {/* 타입·N선택 배지 — 제목 줄에서 옮겨와 계산 결과 최상단에 표시 */}
          <div className={styles.rightBadgeRow}>
            <span className={`${styles.cardBadge} ${getBadgeClass(post.packageType)}`}>
              {post.packageType}
            </span>
            {post.selectableCount != null && post.selectableCount > 0 && (
              <span className={`${styles.cardBadge} ${styles.badgeSelect}`}>
                {post.selectableCount}선택
              </span>
            )}
          </div>
          {/* 패키지 가격 */}
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>패키지 가격</span>
            <span className={styles.resultValue}>
              {post.priceCurrency === 'blueCrystal' && post.blueCrystalPrice ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/blue.webp" alt="" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 3 }} />
                  {formatNumber(post.blueCrystalPrice)}
                </>
              ) : (
                <>{formatNumber(post.royalCrystalPrice)}원</>
              )}
            </span>
          </div>

          {/* 가격 줄 바로 아래: 33,000원 = [골드] 환산값 — 구성품 가치 줄과 같은 열 정렬 */}
          {goldPerWon > 0 && post.priceCurrency !== 'blueCrystal' && (
            <div className={styles.resultRow}>
              <span className={styles.cashNum}>{formatNumber(post.royalCrystalPrice)}원</span>
              <span className={styles.resultValueGold}>
                ={' '}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
                {formatNumber(cashGold)}
              </span>
            </div>
          )}

          {/* 구성품 가치 / 기대값 */}
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>{isGacha ? '기대값' : '구성품 가치'}</span>
            <span className={styles.resultValueGold}>
              ={' '}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
              {formatNumber(isGacha ? gachaExpectedGold : totalGold)}
            </span>
          </div>

          {/* 1개 구매 결과 — 입체 텍스트 % (이득 초록 / 손해 빨강) */}
          {goldPerWon > 0 && !isGacha && (
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>1개 구매</span>
              {benefitDelta !== null && <BenefitDelta d={benefitDelta} />}
              <BenefitPct v={singleBenefit} />
            </div>
          )}

          {/* 가챠: 기대 효율 */}
          {goldPerWon > 0 && isGacha && (
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>기대 효율</span>
              {benefitDelta !== null && <BenefitDelta d={benefitDelta} />}
              <BenefitPct v={singleBenefit} />
            </div>
          )}

          {(isBundle || isBonusPkg) && !isGacha && (
            <>
              {/* 구분선: 1개 구매 결과와 묶음(3+1/3+보너스) 구간 사이 */}
              <div className={styles.resultDivider} />
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>{isBonusPkg ? post.packageType : `${post.packageType} 보정`}</span>
                <span className={styles.resultValueGold}>
                  ={' '}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.goldIconInline} />
                  {formatNumber(bundleGold)}
                </span>
              </div>
              {goldPerWon > 0 && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>{post.packageType} 구매</span>
                  <BenefitPct v={bundleBenefit} />
                </div>
              )}
            </>
          )}

          {/* 가챠 버튼 + 결과 */}
          {isGacha && (
            <>
              {/* 1회 결과 - 컴팩트 2줄 */}
              {gachaPhase === 'result' && gachaMode === 'single' && gachaWinner >= 0 && (() => {
                const winOrigIdx = gachaDisplayOrder[gachaWinner];
                const wonGold = gachaItemGolds[winOrigIdx];
                const benefit = cashGold > 0 ? ((wonGold - cashGold) / cashGold) * 100 : 0;
                return (
                <div className={styles.gachaResultArea} data-nonav>
                  <div className={styles.gachaResultRow}>
                    <span className={styles.gachaResultName}>
                      {post.items[winOrigIdx].name}
                      {post.items[winOrigIdx].quantity > 1 ? ` x${post.items[winOrigIdx].quantity}` : ''}
                    </span>
                    <span className={styles.gachaResultGold}>{formatNumber(wonGold)}G</span>
                  </div>
                  <div className={styles.gachaResultRow}>
                    {goldPerWon > 0 && <BenefitPct v={benefit} />}
                    <button className={styles.gachaReroll} onClick={resetGacha}>다시 뽑기</button>
                  </div>
                </div>
                );
              })()}

              {/* 10회 스피닝 진행 표시 */}
              {gachaPhase === 'spinning' && gachaMode === 'multi' && multiRevealCount > 0 && (
                <div className={styles.gachaResultArea} data-nonav>
                  <div className={styles.gachaMultiTitle}>{multiRevealCount}/10</div>
                </div>
              )}

              {/* 10회 최종 결과 - 컴팩트 2줄 */}
              {gachaPhase === 'result' && gachaMode === 'multi' && (() => {
                const totalWonGold = gachaMultiResults.reduce((sum, ri) => sum + gachaItemGolds[ri], 0);
                const totalCash = cashGold * 10;
                const multiBenefit = totalCash > 0 ? ((totalWonGold - totalCash) / totalCash) * 100 : 0;
                return (
                  <div className={styles.gachaResultArea} data-nonav>
                    <div className={styles.gachaResultRow}>
                      <span className={styles.gachaResultName}>10회 결과</span>
                      <span className={styles.gachaResultGold}>{formatNumber(totalWonGold)}G</span>
                    </div>
                    <div className={styles.gachaResultRow}>
                      {goldPerWon > 0 && <BenefitPct v={multiBenefit} />}
                      <button className={styles.gachaReroll} onClick={resetGacha}>다시 뽑기</button>
                    </div>
                  </div>
                );
              })()}

              {/* 버튼 (idle 일 때만) */}
              {gachaPhase === 'idle' && (
                <div className={styles.gachaBtnGroup} data-nonav>
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

        {/* 하단 한 줄: 환율 입력 (카드 아무 데나 누르면 상세로 가므로 상세보기 버튼은 두지 않는다) */}
        <div className={styles.bottomRow} data-nonav>
          <div className={styles.bottomRate}>
            <div className={styles.rateRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.rateIconGold} />
              <span className={styles.rateFixed}>100</span>
              <span className={styles.rateSep}>:</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/royal.webp" alt="로얄" className={styles.rateIconRoyal} />
              <input
                type="number"
                className={styles.rateInput}
                value={rateText}
                onChange={(e) => handleRateInput(e.target.value)}
                placeholder="32"
                min={1}
                step="any"
                aria-label="100골드당 원화 환율"
              />
            </div>
            <div className={styles.rateRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/blue.webp" alt="블루 크리스탈" className={styles.rateIconBlue} />
              <span className={styles.rateFixed}>100</span>
              <span className={styles.rateSep}>=</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/gold.webp" alt="골드" className={styles.rateIconPad} />
              <input
                type="number"
                className={styles.rateInput}
                value={bcText}
                onChange={(e) => handleBcInput(e.target.value)}
                placeholder="16500"
                min={1}
                step="any"
                aria-label="블루 크리스탈 100개당 골드"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(PackageGalleryCard);
