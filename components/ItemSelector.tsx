'use client';

import { ItemCategory, TrackedItem, getItemsByCategory, RefineAdditionalSubCategory, REFINE_ADDITIONAL_SUBCATEGORIES, getItemsBySubCategory } from '@/lib/items-to-track';
import React, { useMemo, useState, useContext, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Offcanvas } from 'react-bootstrap';
import { PriceContext, PeriodOption } from './PriceComparisonStats';
import TrendArrow from './TrendArrow';
import { formatShortPrice, smallIcon } from '@/lib/format-price';
import { PRICE_ITEMS } from '@/data/priceItems';
import chipStyles from './ItemChip.module.css';
import mStyles from './ItemSelector.module.css';

// 버튼 아이콘 — 시세 표시 목록(PRICE_ITEMS)에 있는 종목은 그쪽 아이콘의 88px 사본을 쓴다(사본이 있는 게 확인된 목록).
// 나머지는 원본을 그대로 쓴다. 서버 HTML 에 실리는 img 라 onError 로 갈아끼우는 방식은 하이드레이션 전에
// 에러가 나면 안 먹는다 — 그래서 없는 사본을 시도하지 않는 쪽으로 고른다.
const PRICE_ITEM_ICON = new Map(PRICE_ITEMS.map((p) => [p.id, smallIcon(p.icon)]));
export const chipIcon = (item: TrackedItem) => PRICE_ITEM_ICON.get(item.id) ?? item.icon;

export const CATEGORY_STYLES: Record<ItemCategory, { label: string; color: string; darkColor: string; lightBg: string; darkThemeColor: string; darkBg: string; }> = {
  // 재련 재료 = 사이트 기본색 계열(알데바란의 바다 청색). 다른 카테고리는 아이템 정체성 색이라 그대로 둔다.
  refine: { label: '재련 재료', color: '#1f7fc0', darkColor: '#13609c', lightBg: '#eaf4fa', darkThemeColor: '#5cb3e0', darkBg: '#14293a' },
  gem: { label: '젬', color: '#8A2BE2', darkColor: '#4B0082', lightBg: '#F5EEFF', darkThemeColor: '#c084fc', darkBg: '#3c2a4a' },
  refine_additional: { label: '재련 추가 재료', color: '#34d399', darkColor: '#059669', lightBg: '#d1fae5', darkThemeColor: '#34d399', darkBg: '#064e3b' },
  engraving: { label: '유물 각인서', color: '#ff9b7a', darkColor: '#E11D48', lightBg: '#fff1f2', darkThemeColor: '#f87171', darkBg: '#4d222a' },
  accessory: { label: '악세', color: '#5fd4e8', darkColor: '#0E7490', lightBg: '#ecfeff', darkThemeColor: '#67e8f9', darkBg: '#1e3a4a' },
  bracelet: { label: '팔찌', color: '#5fd4e8', darkColor: '#0E7490', lightBg: '#ecfeff', darkThemeColor: '#67e8f9', darkBg: '#1e3a4a' },
  jewel: { label: '보석', color: '#FF69B4', darkColor: '#C71585', lightBg: '#FFF0F5', darkThemeColor: '#f472b6', darkBg: '#4a2239' }
};

// 카테고리 표시 순서 정의
const CATEGORY_ORDER: ItemCategory[] = ['refine', 'gem', 'refine_additional', 'engraving', 'accessory', 'bracelet', 'jewel'];

// 카테고리 대표 이미지 — 그 카테고리를 대표하는 종목 아이콘을 빌려 쓴다(데스크톱 사이드바·모바일 탭 공용)
const CATEGORY_ICON_ITEM: Record<ItemCategory, string> = {
  refine: '66102007',                         // 운명의 파괴석 결정
  gem: '67400003',                            // 질서의 젬 : 안정
  refine_additional: '66111131',              // 용암의 숨결
  engraving: '65203905',                      // 아드레날린 각인서
  accessory: 'auction_necklace_ancient_refine3',
  bracelet: 'auction_bracelet_spec_crit',
  jewel: 'auction_gem_fear_10',
};
export const CATEGORY_ICON = Object.fromEntries(
  (Object.keys(CATEGORY_ICON_ITEM) as ItemCategory[]).map((cat) => {
    const item = getItemsByCategory(cat).find((i) => i.id === CATEGORY_ICON_ITEM[cat]);
    return [cat, item ? chipIcon(item) : undefined];
  }),
) as Record<ItemCategory, string | undefined>;

// ── 즐겨찾기 ──
// 차트 카테고리 = 실제 아이템 카테고리 + 즐겨찾기(사용자가 고른 아이템 묶음, lib/favorite-items.ts).
export type ChartCategory = ItemCategory | 'favorite';
type CategoryStyle = typeof CATEGORY_STYLES[ItemCategory];
// 즐겨찾기 버튼·시트 색 — 별의 금색
export const FAVORITE_STYLE: CategoryStyle = {
  label: '즐겨찾기', color: '#e5b400', darkColor: '#9a7300', lightBg: '#fff8db', darkThemeColor: '#facc15', darkBg: '#3a3113',
};
export const styleOf = (cat: ChartCategory): CategoryStyle => (cat === 'favorite' ? FAVORITE_STYLE : CATEGORY_STYLES[cat]);

export function StarIcon({ filled = true, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <path
        d="M12 2.8l2.75 5.58 6.15.9-4.45 4.34 1.05 6.13L12 16.86l-5.5 2.89 1.05-6.13L3.1 9.28l6.15-.9L12 2.8z"
        fill={filled ? '#facc15' : 'none'}
        stroke={filled ? '#e5b400' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ColoredItemName({ name }: { name: string }) {
  const regex = /(\d+\.?\d*%)\s*(\(상\))|(\d+\.?\d*%)\s*(\(중\))|(\(상\))|(\(중\))|(\d+\+)/g;
  const parts: React.JSX.Element[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(name)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex, match.index)}</span>);
    }

    if (match[2] === '(상)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[1]} {match[2]}
        </span>
      );
    } else if (match[4] === '(중)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[3]} {match[4]}
        </span>
      );
    } else if (match[5] === '(상)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[5]}
        </span>
      );
    } else if (match[6] === '(중)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[6]}
        </span>
      );
    } else if (match[7]) {
      // 팔찌 숫자 (100+ 등) 보라색
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[7]}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < name.length) {
    parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export type ItemQuote = { current: number; change: number };

// 버튼에 붙일 현재가·전일 대비 등락률 — 마지막 두 날짜 종가 비교(서버 스냅샷 lib/home-price-snapshot 과 같은 계산).
// 시세는 차트가 이미 받아 둔 price-history-client 캐시에서 꺼내므로 요청이 더 나가지 않는다.
// initial: 홈 서버(ISR)가 미리 계산해 넘긴 값. 있으면 첫 HTML 부터 시세가 찍혀 나간다(검색 봇도 읽는다).
export function useItemQuotes(items: TrackedItem[], initial?: Record<string, ItemQuote>): Record<string, ItemQuote> {
  const [quotes, setQuotes] = useState<Record<string, ItemQuote>>(initial ?? {});
  const key = items.map((i) => i.id).join(',');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getMultipleItemPriceHistory } = await import('@/lib/price-history-client');
        const all = await getMultipleItemPriceHistory(items.map((i) => i.id), 2);
        const next: Record<string, ItemQuote> = {};
        for (const item of items) {
          const h = all[item.id] || [];
          if (h.length === 0) continue;
          const current = h[h.length - 1].price;
          const previous = h.length >= 2 ? h[h.length - 2].price : current;
          next[item.id] = { current, change: previous > 0 ? ((current - previous) / previous) * 100 : 0 };
        }
        if (!cancelled) setQuotes((prev) => ({ ...prev, ...next }));
      } catch {
        // 시세를 못 받으면 이름만 보여 준다 — 버튼 자체는 그대로 동작해야 한다
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return quotes;
}

// 아이템 버튼 내용 — 아이콘 | 이름 / 현재가·등락 배지. label 을 주면 이름 자리를 그걸로 그린다(악세 옵션 색칠 등).
export function ItemChipBody({ item, quote, label }: { item: TrackedItem; quote?: ItemQuote; label?: React.ReactNode }) {
  const dir = !quote ? null : quote.change > 0.1 ? 'up' : quote.change < -0.1 ? 'down' : 'flat';
  const icon = chipIcon(item);
  return (
    <span className={chipStyles.body}>
      {icon && (
        <span className={chipStyles.iconTile}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={icon} alt="" width={30} height={30} loading="lazy" decoding="async" />
        </span>
      )}
      <span className={chipStyles.text}>
        <span className={chipStyles.name}>{label ?? <ColoredItemName name={item.name} />}</span>
        <span className={chipStyles.quote}>
          {quote && dir ? (
            <>
              <span className={`font-numeric ${chipStyles.price}`}>{formatShortPrice(quote.current)}</span>
              <span className={`font-numeric ${chipStyles.chg} ${chipStyles[dir]}`}>
                {dir === 'flat' ? '─' : <TrendArrow up={dir === 'up'} size={13} />}
                {Math.abs(quote.change).toFixed(1)}%
              </span>
            </>
          ) : (
            <span className={chipStyles.skeleton} aria-hidden="true" />
          )}
        </span>
      </span>
    </span>
  );
}

type ItemSelectorProps = {
  selectedCategory: ChartCategory;
  selectedItem: TrackedItem | null;
  onSelectCategory: (category: ChartCategory) => void;
  onSelectItem: (item: TrackedItem) => void;
  selectedSubCategory: RefineAdditionalSubCategory | null;
  onSelectSubCategory: (subCategory: RefineAdditionalSubCategory | null) => void;
  /** 즐겨찾기 아이템(순서대로) */
  favoriteItems: TrackedItem[];
  /** 즐겨찾기 편집 창 열기 */
  onOpenFavoritePicker: () => void;
};

/**
 * 모바일 차트 아이템 고르기 — 카테고리 탭 줄 + 아래에서 올라오는 시트.
 * (데스크톱 사이드바·아이템 줄은 PriceChartContainer 가 직접 그린다. 이 컴포넌트는 d-md-none 안에서만 쓰인다)
 */
export default function ItemSelector({
  selectedCategory,
  selectedItem,
  onSelectCategory,
  onSelectItem,
  onSelectSubCategory,
  favoriteItems,
  onOpenFavoritePicker,
}: ItemSelectorProps) {
  const { theme } = useTheme();
  const { isGridView, onToggleGridView, selectedPeriod, setSelectedPeriod, eventRangeActive } = useContext(PriceContext);
  const catVars = (cat: ChartCategory) => {
    const cs = styleOf(cat);
    return {
      '--cat': theme === 'dark' ? cs.darkThemeColor : cs.color,
      '--cat-fg': theme === 'dark' ? cs.darkThemeColor : cs.darkColor,
      '--cat-bg': theme === 'dark' ? cs.darkBg : cs.lightBg,
    } as React.CSSProperties;
  };

  const periodLabels: Record<PeriodOption, string> = {
    '7d': '7일', '1m': '1개월', '2m': '2개월', '3m': '3개월', '6m': '6개월', '1y': '1년', 'all': '전체',
  };
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetCategory, setBottomSheetCategory] = useState<ChartCategory>(selectedCategory);
  const [bottomSheetSubCategory, setBottomSheetSubCategory] = useState<RefineAdditionalSubCategory | null>(null);

  const bottomSheetItems = useMemo(() => {
    if (bottomSheetCategory === 'favorite') return favoriteItems;
    // 재련 추가 재료 카테고리이고 서브카테고리가 선택된 경우
    if (bottomSheetCategory === 'refine_additional' && bottomSheetSubCategory) {
      return getItemsBySubCategory(bottomSheetSubCategory);
    }
    return getItemsByCategory(bottomSheetCategory);
  }, [bottomSheetCategory, bottomSheetSubCategory, favoriteItems]);

  // 카테고리 탭 → 시트 열기
  const handleMobileCategoryClick = (cat: ChartCategory) => {
    onSelectCategory(cat); // 선택된 카테고리 업데이트 (테두리 색 변경)
    setBottomSheetCategory(cat);
    // 재련 추가 재료가 아닌 경우 서브카테고리 초기화
    if (cat !== 'refine_additional') {
      setBottomSheetSubCategory(null);
      onSelectSubCategory(null);
    }
    setShowBottomSheet(true);
  };

  const handleMobileSubCategoryClick = (subCat: RefineAdditionalSubCategory) => {
    setBottomSheetSubCategory(subCat);
    onSelectSubCategory(subCat);
  };

  // 시트에서 아이템 선택 — 시트는 열어 둔 채로(위 차트를 보며 바꿔 본다)
  const handleBottomSheetItemSelect = (item: TrackedItem) => {
    if (selectedCategory !== bottomSheetCategory) onSelectCategory(bottomSheetCategory);
    onSelectItem(item);
  };

  if (!selectedItem) {
    return null;
  }

  const TAB_ORDER: ChartCategory[] = ['favorite', ...CATEGORY_ORDER];
  const sheetIcon = (cat: ChartCategory) =>
    cat === 'favorite' ? <StarIcon size={24} /> : CATEGORY_ICON[cat] ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={CATEGORY_ICON[cat]} alt="" decoding="async" />
    ) : null;

  return (
    <div>
      {/* 카테고리 탭 - 모바일 — 대표 이미지(즐겨찾기는 별) + 이름 알약. 누르면 아래에서 아이템 시트가 올라온다 */}
      <div className={mStyles.tabs}>
        {TAB_ORDER.map((cat) => {
          const active = selectedCategory === cat;
          const tab = (
            <button
              key={cat}
              type="button"
              className={`${mStyles.tab} ${active ? mStyles.tabActive : ''}`}
              style={catVars(cat)}
              onClick={() => handleMobileCategoryClick(cat)}
              aria-pressed={active}
            >
              {cat === 'favorite' ? (
                <span className={mStyles.tabStar}><StarIcon size={18} /></span>
              ) : CATEGORY_ICON[cat] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={mStyles.tabIcon} src={CATEGORY_ICON[cat]} alt="" decoding="async" />
              )}
              {styleOf(cat).label}
              {cat === 'favorite' && <span className={mStyles.tabCount}>{favoriteItems.length}</span>}
            </button>
          );
          if (cat !== 'favorite') return tab;
          // 즐겨찾기 탭 — 오른쪽에 붙은 편집(연필) 버튼
          return (
            <span key={cat} className={mStyles.tabGroup}>
              {tab}
              <button type="button" className={mStyles.tabEdit} onClick={onOpenFavoritePicker} aria-label="즐겨찾기 편집">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              </button>
            </span>
          );
        })}
      </div>

      {/* 바텀시트 - 모바일 아이템 선택.
          1줄: 손잡이 · 카테고리 · 닫기 / 2줄: 기간 · 단일/4분할 / 본문: 2줄 가로 넘김 아이템(아이콘 + 이름).
          점 표시·비교선·처음 볼 아이템은 차트 아래 막대(표시 설정)로 옮겼다 — 여기 톱니는 없앴다.
          배경을 막지 않는다(backdrop 없음) — 시트를 연 채로 아이템을 바꿔 가며 위 차트를 본다. */}
      <Offcanvas
        show={showBottomSheet}
        onHide={() => setShowBottomSheet(false)}
        placement="bottom"
        backdrop={false}
        scroll={true}
        className={mStyles.sheet}
        style={{
          ...catVars(bottomSheetCategory),
          height: 'auto',
          // 낮게 — 시트를 연 채로 위 차트를 보며 아이템을 바꾼다(아이템은 2줄 가로 넘김)
          maxHeight: '42vh',
          // 하단 앵커 광고가 떠 있으면 그만큼 위로 올려 버튼이 안 가리게 함 (AdLayout이 변수 설정)
          bottom: 'var(--mobile-anchor-h, 0px)',
        }}
      >
        <div className={mStyles.handle} aria-hidden="true" />
        <div className={mStyles.sheetHead}>
          <span className={mStyles.sheetTitle}>
            {sheetIcon(bottomSheetCategory)}
            {styleOf(bottomSheetCategory).label}
          </span>
          {bottomSheetCategory === 'favorite' && (
            <button type="button" className={mStyles.sheetEdit} onClick={onOpenFavoritePicker}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              편집
            </button>
          )}
          <button type="button" className={mStyles.closeBtn} onClick={() => setShowBottomSheet(false)} aria-label="닫기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className={mStyles.controls}>
          <div className={`${mStyles.seg} ${mStyles.segGrow}`} role="group" aria-label="기간">
            {(['1m', '2m', '3m', 'all'] as PeriodOption[]).map((period) => {
              const on = !eventRangeActive && selectedPeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  className={`${mStyles.segBtn} ${on ? mStyles.segBtnActive : ''}`}
                  onClick={() => setSelectedPeriod(period)}
                  aria-pressed={on}
                >
                  {periodLabels[period]}
                </button>
              );
            })}
          </div>
          <div className={mStyles.seg} role="group" aria-label="보기">
            <button
              type="button"
              className={`${mStyles.segBtn} ${!isGridView ? mStyles.segBtnActive : ''}`}
              onClick={() => isGridView && onToggleGridView()}
              aria-pressed={!isGridView}
            >
              단일
            </button>
            <button
              type="button"
              className={`${mStyles.segBtn} ${isGridView ? mStyles.segBtnActive : ''}`}
              onClick={() => !isGridView && onToggleGridView()}
              aria-pressed={isGridView}
            >
              4분할
            </button>
          </div>
        </div>
        <Offcanvas.Body className={mStyles.body}>
          {/* 서브카테고리 선택 - 모바일 (재련 추가 재료만) */}
          {bottomSheetCategory === 'refine_additional' && (
            <div className={mStyles.subTabs} role="group" aria-label="보조 재료 종류">
              {(Object.keys(REFINE_ADDITIONAL_SUBCATEGORIES) as RefineAdditionalSubCategory[]).map((subCat) => {
                const on = bottomSheetSubCategory === subCat;
                return (
                  <button
                    key={subCat}
                    type="button"
                    className={`${mStyles.segBtn} ${on ? mStyles.segBtnActive : ''}`}
                    onClick={() => handleMobileSubCategoryClick(subCat)}
                    aria-pressed={on}
                  >
                    {REFINE_ADDITIONAL_SUBCATEGORIES[subCat].label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 아이템 목록 (재련 추가 재료일 경우 서브카테고리 선택 후 표시). 즐겨찾기는 끝에 "+ 추가" */}
          {(bottomSheetCategory !== 'refine_additional' || bottomSheetSubCategory) && (
            <div className={mStyles.grid}>
              {bottomSheetItems.map((item) => {
                const isSelected = selectedItem.id === item.id && selectedCategory === bottomSheetCategory;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${mStyles.item} ${isSelected ? mStyles.itemActive : ''}`}
                    onClick={() => handleBottomSheetItemSelect(item)}
                    aria-pressed={isSelected}
                  >
                    {/* 모바일은 좁아 가격·등락까지 넣으면 잘린다 — 아이콘 + 이름만. 시세는 위 차트 머리에 나온다 */}
                    {chipIcon(item) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={mStyles.itemIcon} src={chipIcon(item)} alt="" loading="lazy" decoding="async" />
                    )}
                    <ColoredItemName name={item.name} />
                  </button>
                );
              })}
              {bottomSheetCategory === 'favorite' && (
                <button type="button" className={`${mStyles.item} ${mStyles.addItem}`} onClick={onOpenFavoritePicker}>
                  <span className={mStyles.addPlus} aria-hidden="true">+</span>
                  {favoriteItems.length === 0 ? '즐겨찾기에 아이템 추가' : '아이템 추가'}
                </button>
              )}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
