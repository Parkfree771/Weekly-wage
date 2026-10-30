
'use client';

import { Fragment, useState, useEffect, ReactNode, useMemo, useRef, useCallback, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { Row, Col } from 'react-bootstrap';
import Image from 'next/image';
import { TrackedItem, ItemCategory, getItemsByCategory, RefineAdditionalSubCategory, getItemsBySubCategory, REFINE_ADDITIONAL_SUBCATEGORIES, SUCCESSION_TO_NORMAL_MATERIAL_MAP, SUCCESSION_MATERIAL_START_DATE, findItemById, TRACKED_ITEMS } from '@/lib/items-to-track';
import ItemSelector, { CATEGORY_STYLES, CATEGORY_ICON, ItemChipBody, StarIcon, styleOf, useItemQuotes, type ChartCategory, type ItemQuote } from './ItemSelector';
import { DEFAULT_FAVORITE_IDS, loadFavorites, saveFavorites } from '@/lib/favorite-items';
import styles from './PriceChartContainer.module.css';
const CompactPriceChart = dynamic(() => import('./CompactPriceChart'), { ssr: false });
const MiniPriceChart = dynamic(() => import('./MiniPriceChart'), { ssr: false });
// 즐겨찾기 편집 창 — "+ 아이템 추가" 를 누를 때만 받는다
const FavoritePicker = dynamic(() => import('./FavoritePicker'), { ssr: false });
import { PriceContext } from './PriceComparisonStats';
import { useTheme } from './ThemeProvider';
import useIsMobileViewport from './ads/useIsMobileViewport';
import { convertHistoryToWon } from '@/lib/gold-value';
import { GoldValueHover } from './GoldValueMiniChart';

// 카테고리 표시 순서
const CATEGORY_ORDER: ItemCategory[] = ['refine', 'gem', 'refine_additional', 'engraving', 'accessory', 'bracelet', 'jewel'];

// TRACKED_ITEMS를 Map으로 변환 (O(1) 조회용)
const TRACKED_ITEMS_MAP = new Map(TRACKED_ITEMS.map(item => [item.id, item]));

// 아이템 ID로 아이템 조회 (최적화)
const getTrackedItemById = (id: string): TrackedItem | undefined => TRACKED_ITEMS_MAP.get(id);

// 아이템의 실제 카테고리 — 즐겨찾기에서 고른 아이템도 차트 색·이름 색칠은 원래 카테고리를 따른다
const realCategoryOf = (item: TrackedItem): ItemCategory => findItemById(item.id)?.category ?? 'refine';

// 사이드바·탭 순서 — 즐겨찾기가 맨 위
const SIDEBAR_ORDER: ChartCategory[] = ['favorite', ...CATEGORY_ORDER];

// 아이템 이름 색상 처리 함수 (악세: 상/중, 팔찌: 숫자+)
const renderAccessoryItemName = (name: string, category: ItemCategory) => {
  if (category === 'bracelet') {
    const parts = name.split(/(\d+\+)/g);
    return parts.map((part, idx) => {
      if (/^\d+\+$/.test(part)) {
        return <span key={idx} style={{ color: '#a020f0', fontWeight: 700 }}>{part}</span>;
      }
      return part;
    });
  }
  if (category !== 'accessory') return name;
  const parts = name.split(/(\(상\)|\(중\))/g);
  return parts.map((part, idx) => {
    if (part === '(상)') {
      return <span key={idx} style={{ color: '#fbbf24', fontWeight: 700 }}>(상)</span>;
    } else if (part === '(중)') {
      return <span key={idx} style={{ color: '#a855f7', fontWeight: 700 }}>(중)</span>;
    }
    return part;
  });
};

// 차트 설정 localStorage 키
const CHART_CONFIG_KEY = 'chartConfig';

// 차트 설정 타입
type ChartConfig = {
  defaultItem: string | null;  // 기본 모드에서 처음 표시할 아이템 ID
  showEventDots: boolean;       // 차트에 특별 이벤트 점 표시 여부
  showWednesdayDots: boolean;   // 차트에 수요일 점 표시 여부
  showRegularDots: boolean;     // 차트에 일반 날짜 점 표시 여부
  showComparisonLine: boolean;  // 비교선(일반재료×5 회색 점선) 표시 여부
};

// 처음 들어온 사람(저장된 설정 없음)의 표시 — 2026-10-30 확정:
// 특별 이벤트 점 · 수요일 점 · 일반 날짜 점은 켜고, ×5 비교선은 끈다. 처음 볼 아이템은 운명의 파괴석 결정(아래 초기 로드).
const getDefaultChartConfig = (): ChartConfig => ({
  defaultItem: null,
  showEventDots: true,
  showWednesdayDots: true,
  showRegularDots: true,
  showComparisonLine: false,
});

const loadChartConfig = (): ChartConfig => {
  if (typeof window === 'undefined') return getDefaultChartConfig();
  try {
    const saved = localStorage.getItem(CHART_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 저장된 값이 있으면 그대로(사용자가 고른 것), 빠진 항목만 기본값으로 채운다
      const defaults = getDefaultChartConfig();
      const pick = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
      return {
        defaultItem: parsed.defaultItem || null,
        showEventDots: pick(parsed.showEventDots, defaults.showEventDots),
        showWednesdayDots: pick(parsed.showWednesdayDots, defaults.showWednesdayDots),
        showRegularDots: pick(parsed.showRegularDots, defaults.showRegularDots),
        showComparisonLine: pick(parsed.showComparisonLine, defaults.showComparisonLine),
      };
    }
  } catch (e) {
    console.error('Failed to load chart config:', e);
  }
  return getDefaultChartConfig();
};

const saveChartConfig = (config: ChartConfig) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHART_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save chart config:', e);
  }
};

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type PeriodOption = '7d' | '1m' | '2m' | '3m' | '6m' | '1y' | 'all';

const PERIOD_LABELS: Record<PeriodOption, string> = {
  '7d': '7일', '1m': '1개월', '2m': '2개월', '3m': '3개월', '6m': '6개월', '1y': '1년', 'all': '전체',
};

// 사이드바 카테고리 옆 종목 수
const CATEGORY_ITEM_COUNT = Object.fromEntries(
  CATEGORY_ORDER.map((cat) => [cat, getItemsByCategory(cat).length]),
) as Record<ItemCategory, number>;

// Provider를 별도로 export - 실제 데이터를 관리
/**
 * initialQuotes: 홈 서버(app/page.tsx, ISR)가 추적 종목 전체의 시세를 미리 계산해 넘긴 값.
 * 아이템 버튼의 현재가·등락이 첫 HTML 부터 찍혀 나간다 — 스피너 없이 보이고 검색 봇도 읽는다.
 * (아래 시세 히트맵 MarketHeatmap 은 HomeClient 가 같은 값을 따로 넘긴다)
 * (2026-10 리프레시 전까지는 "오늘의 시세" 카드 줄이 이 역할을 했다)
 */
export function PriceChartProvider({ children, initialQuotes }: {
  children: ReactNode;
  initialQuotes?: Record<string, ItemQuote>;
}) {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ChartCategory>('refine');
  // 즐겨찾기 — 아이디 목록(순서 유지). 브라우저 저장(lib/favorite-items.ts). 첫 렌더(서버)는 비어 있다
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavPicker, setShowFavPicker] = useState(false);
  const favoriteItems = useMemo(
    () => favorites.map((id) => TRACKED_ITEMS_MAP.get(id)).filter((i): i is TrackedItem => !!i),
    [favorites],
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<RefineAdditionalSubCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [rawHistory, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');
  // 이벤트 대비 카드에서 고른 이벤트(YYYY-MM-DD). 1개면 그 날~오늘, 2개면 두 이벤트 사이.
  // 있으면 기간 버튼보다 우선한다.
  const [eventSelection, setEventSelection] = useState<string[]>([]);

  // 이벤트 고르기 — 이미 골랐으면 놓고, 아니면 더한다. 셋이 되면 가장 먼저 고른 걸 놓아
  // 항상 최대 2개를 유지한다 (다 지우고 다시 고르라고 시키지 않는다).
  const toggleEventSelection = useCallback((date: string) => {
    setEventSelection(prev => {
      if (prev.includes(date)) return prev.filter(d => d !== date);
      const next = [...prev, date];
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });
  }, []);

  // 고른 이벤트 → 실제 구간. 고른 순서와 상관없이 이른 날이 시작이다.
  const eventRange = useMemo(() => {
    if (eventSelection.length === 0) return null;
    const sorted = [...eventSelection].sort();
    return { start: sorted[0], end: sorted.length > 1 ? sorted[1] : null };
  }, [eventSelection]);


  // 비교 차트 데이터 (계승 재료 ↔ 일반 재료)
  const [rawComparisonHistory, setComparisonHistory] = useState<PriceEntry[]>([]);

  // 원화 환산 — 켜면 그 날 가격을 그 날의 원화 가치로 바꿔서 보여준다 (lib/gold-value.ts).
  // 아래부터는 전부 환산된 history 를 쓰므로 차트·통계·이벤트 카드가 함께 바뀐다.
  const [wonMode, setWonMode] = useState(false);
  const toggleWonMode = useCallback(() => setWonMode(v => !v), []);
  const history = useMemo(() => (wonMode ? convertHistoryToWon(rawHistory) : rawHistory), [rawHistory, wonMode]);
  const comparisonHistory = useMemo(
    () => (wonMode ? convertHistoryToWon(rawComparisonHistory) : rawComparisonHistory),
    [rawComparisonHistory, wonMode],
  );
  const [comparisonInfo, setComparisonInfo] = useState<{ normalIcon: string; ratio: number } | null>(null);

  // 그리드 뷰 관련 state
  const [isGridView, setIsGridView] = useState(false);
  const [gridItems, setGridItems] = useState<(TrackedItem | null)[]>([null, null, null, null]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // 참조선 관련 state
  type ReferenceLineType = 'min' | 'avg' | 'max' | 'current';
  const [activeReferenceLines, setActiveReferenceLines] = useState<Set<ReferenceLineType>>(new Set());

  // 차트 설정 관련 state
  const [chartConfig, setChartConfig] = useState<ChartConfig>(getDefaultChartConfig());
  const [showChartSettings, setShowChartSettings] = useState(false);
  const [tempChartConfig, setTempChartConfig] = useState<ChartConfig>(getDefaultChartConfig());

  // 차트 설정 불러오기 (초기 로드 - 한 번만 실행)
  useEffect(() => {
    const loaded = loadChartConfig();
    setChartConfig(loaded);
    setTempChartConfig(loaded);

    // 즐겨찾기가 있으면 즐겨찾기 카테고리로 연다(2026-10-30). 처음 볼 아이템이 즐겨찾기 안에 있으면 그것,
    // 아니면 즐겨찾기 첫 아이템. 처음 볼 아이템을 즐겨찾기 밖의 것으로 정해 두었으면 그 설정이 우선이다.
    const favs = loadFavorites();
    setFavorites(favs);
    const favItems = favs.map((id) => TRACKED_ITEMS_MAP.get(id)).filter((i): i is TrackedItem => !!i);
    const defaultInFavs = loaded.defaultItem ? favItems.find((i) => i.id === loaded.defaultItem) : undefined;
    if (favItems.length > 0 && (!loaded.defaultItem || defaultInFavs)) {
      setSelectedCategory('favorite');
      setSelectedSubCategory(null);
      setSelectedItem(defaultInFavs ?? favItems[0]);
      return;
    }

    // 저장된 기본 아이템이 있으면 해당 아이템으로 설정
    if (loaded.defaultItem) {
      const result = findItemById(loaded.defaultItem);
      if (result) {
        setSelectedCategory(result.category);
        if (result.subCategory) {
          setSelectedSubCategory(result.subCategory);
        }
        setSelectedItem(result.item);
        return;
      }
    }

    // 저장된 아이템이 없으면 기본값 (운명의 파괴석 결정)
    const defaultCategoryItems = getItemsByCategory('refine');
    const defaultItem = defaultCategoryItems.find(item => item.id === '66102007') || defaultCategoryItems[0];
    setSelectedItem(defaultItem);
  }, []);

  const toggleReferenceLine = useCallback((type: ReferenceLineType) => {
    setActiveReferenceLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // 아이템 ID로 선택하기 (대시보드에서 클릭 시 사용)
  const selectItemById = useCallback((itemId: string) => {
    const result = findItemById(itemId);
    if (result) {
      // 그리드 뷰가 켜져 있으면 끄기
      setIsGridView(false);
      // 카테고리 변경
      setSelectedCategory(result.category);
      // 서브카테고리가 있으면 설정
      if (result.subCategory) {
        setSelectedSubCategory(result.subCategory);
      } else {
        setSelectedSubCategory(null);
      }
      // 아이템 선택
      setSelectedItem(result.item);
    }
  }, []);

  // 아이템 스크롤 관련
  const itemScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkItemScroll = () => {
    if (itemScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = itemScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollItems = (direction: 'left' | 'right') => {
    if (itemScrollRef.current) {
      const scrollAmount = 200;
      itemScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkItemScroll, 300);
    }
  };

  // 현재 카테고리의 아이템 목록
  const currentCategoryItems = useMemo(() => {
    if (selectedCategory === 'favorite') return favoriteItems;
    if (selectedCategory === 'refine_additional' && selectedSubCategory) {
      return getItemsBySubCategory(selectedSubCategory);
    }
    return getItemsByCategory(selectedCategory);
  }, [selectedCategory, selectedSubCategory, favoriteItems]);
  const itemQuotes = useItemQuotes(currentCategoryItems, initialQuotes);

  // 이 useEffect는 더 이상 카테고리 변경 시 아이템을 자동 선택하지 않음
  // 대신 handleSelectCategory, handleSelectSubCategory에서 직접 처리

  // 카테고리 변경 시 그리드 아이템 초기화
  useEffect(() => {
    if (isGridView) {
      // 4분할 모드일 때 카테고리 변경하면 해당 카테고리 아이템으로 초기화
      const items = currentCategoryItems;
      setGridItems([
        items[0] || null,
        items[1] || null,
        items[2] || null,
        items[3] || null,
      ]);
      setSelectedSlot(null);
    }
  }, [selectedCategory, selectedSubCategory, isGridView, currentCategoryItems]);

  // 카테고리 변경 시 스크롤 상태 체크
  useEffect(() => {
    setTimeout(checkItemScroll, 100);
  }, [selectedCategory, selectedSubCategory, currentCategoryItems]);

  useEffect(() => {
    if (!selectedItem?.id) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { getItemPriceHistory } = await import('@/lib/price-history-client');
        const priceHistory = await getItemPriceHistory(selectedItem.id, 999);
        setHistory(priceHistory);

        // 계승 재료 → 일반 재료 비교 데이터 가져오기
        const mapping = SUCCESSION_TO_NORMAL_MATERIAL_MAP[selectedItem.id];
        if (mapping) {
          const normalHistory = await getItemPriceHistory(mapping.normalId, 999);
          // 가격 × 5 적용하고, 계승 재료 시작일(2025-01-07) 이후 데이터만 필터링
          const filteredNormalHistory = normalHistory
            .filter(entry => {
              const entryDate = entry.date || entry.timestamp.split('T')[0];
              return entryDate >= SUCCESSION_MATERIAL_START_DATE;
            })
            .map(entry => ({
              ...entry,
              price: entry.price * mapping.ratio
            }));
          setComparisonHistory(filteredNormalHistory);
          setComparisonInfo({ normalIcon: mapping.normalIcon, ratio: mapping.ratio });
        } else {
          setComparisonHistory([]);
          setComparisonInfo(null);
        }
      } catch (err) {
        console.error('Error fetching price history:', err);
        setHistory([]);
        setComparisonHistory([]);
        setComparisonInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedItem]);

  // 기간 필터링을 위한 cutoffDate 계산
  const cutoffDate = useMemo(() => {
    if (eventRange) return new Date(`${eventRange.start}T00:00:00Z`);
    if (selectedPeriod === 'all') return null;

    const now = new Date();
    const cutoff = new Date();

    switch (selectedPeriod) {
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '1m':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case '2m':
        cutoff.setMonth(now.getMonth() - 2);
        break;
      case '3m':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }
    return cutoff;
  }, [selectedPeriod, eventRange]);

  // 두 이벤트를 고른 경우의 끝 날짜(그 날 포함). 하나만 골랐거나 안 골랐으면 오늘까지다.
  const endDate = useMemo(
    () => (eventRange?.end ? new Date(`${eventRange.end}T23:59:59Z`) : null),
    [eventRange],
  );

  // 기간 버튼을 누르면 이벤트 구간은 풀린다 — 둘이 동시에 켜져 있으면 무엇이 적용됐는지 알 수 없다
  const handleSetPeriod = useCallback((period: PeriodOption) => {
    setEventSelection([]);
    setSelectedPeriod(period);
  }, []);

  // 아이템을 바꾸면 이벤트 구간을 푼다 — 새 아이템이 그 구간에 데이터가 없으면 빈 차트가 된다
  useEffect(() => {
    setEventSelection([]);
  }, [selectedItem?.id]);

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];
    if (!cutoffDate && !endDate) return history;

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      if (cutoffDate && entryDate < cutoffDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  }, [history, cutoffDate, endDate]);

  // 비교 히스토리도 동일하게 필터링
  const filteredComparisonHistory = useMemo(() => {
    if (comparisonHistory.length === 0) return [];
    if (!cutoffDate && !endDate) return comparisonHistory;

    return comparisonHistory.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      if (cutoffDate && entryDate < cutoffDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  }, [comparisonHistory, cutoffDate, endDate]);

  // 비교 데이터 객체
  const comparisonData = useMemo(() => {
    if (!comparisonInfo || filteredComparisonHistory.length === 0) return null;
    return {
      normalHistory: filteredComparisonHistory,
      normalIcon: comparisonInfo.normalIcon,
      ratio: comparisonInfo.ratio
    };
  }, [filteredComparisonHistory, comparisonInfo]);

  const handleSelectCategory = useCallback((category: ChartCategory) => {
    // 4분할 모드일 때 카테고리 클릭하면 단일 모드로 전환
    if (isGridView) {
      setIsGridView(false);
    }
    setSelectedCategory(category);
    setSelectedSlot(null);

    if (category === 'favorite') {
      // 즐겨찾기: 첫 아이템. 비어 있으면 보던 차트를 그대로 둔다("+ 아이템 추가" 만 보인다)
      setSelectedSubCategory(null);
      if (favoriteItems.length > 0) setSelectedItem(favoriteItems[0]);
    } else if (category === 'refine_additional') {
      // 재련 추가 재료: 첫 번째 서브카테고리(무기 보조 재료) 자동 선택 + 첫 아이템
      const firstSubCat = Object.keys(REFINE_ADDITIONAL_SUBCATEGORIES)[0] as RefineAdditionalSubCategory;
      setSelectedSubCategory(firstSubCat);
      const subItems = getItemsBySubCategory(firstSubCat);
      if (subItems.length > 0) {
        setSelectedItem(subItems[0]);
      }
    } else {
      setSelectedSubCategory(null);
      const categoryItems = getItemsByCategory(category);
      if (categoryItems.length > 0) {
        setSelectedItem(categoryItems[0]);
      }
    }
  }, [isGridView, favoriteItems]);

  // 즐겨찾기 넣고 빼기 — 바로 저장
  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
      saveFavorites(next);
      return next;
    });
  }, []);
  const openFavoritePicker = useCallback(() => setShowFavPicker(true), []);
  // 기본값으로 되돌리기(편집 창의 "기본값으로")
  const resetFavorites = useCallback(() => {
    setFavorites([...DEFAULT_FAVORITE_IDS]);
    saveFavorites([...DEFAULT_FAVORITE_IDS]);
  }, []);

  const handleSelectSubCategory = useCallback((subCategory: RefineAdditionalSubCategory | null) => {
    // 4분할 모드일 때 서브카테고리 클릭하면 단일 모드로 전환
    if (isGridView) {
      setIsGridView(false);
    }
    setSelectedSubCategory(subCategory);
    setSelectedSlot(null);

    // 서브카테고리가 선택되면 첫 번째 아이템 선택
    if (subCategory) {
      const subCategoryItems = getItemsBySubCategory(subCategory);
      if (subCategoryItems.length > 0) {
        setSelectedItem(subCategoryItems[0]);
      }
    }
  }, [isGridView]);

  const handleSelectItem = useCallback((item: TrackedItem) => {
    if (isGridView) {
      if (selectedSlot !== null) {
        // 슬롯이 선택되어 있으면 해당 슬롯의 아이템 교체
        setGridItems(prev => {
          const next = [...prev];
          next[selectedSlot] = item;
          return next;
        });
      } else {
        // 슬롯 미선택 시 첫 번째 빈 슬롯에 넣거나, 없으면 0번 슬롯 교체
        setGridItems(prev => {
          const next = [...prev];
          const emptyIdx = next.findIndex(g => g === null);
          const targetIdx = emptyIdx >= 0 ? emptyIdx : 0;
          next[targetIdx] = item;
          return next;
        });
      }
    } else {
      setSelectedItem(item);
    }
  }, [isGridView, selectedSlot]);

  const handleSlotClick = useCallback((slotIndex: number) => {
    setSelectedSlot(prev => prev === slotIndex ? null : slotIndex);
  }, []);

  const handleToggleGridView = useCallback(() => {
    if (!isGridView) {
      // 그리드 뷰로 전환 시: 현재 카테고리의 처음 4개 아이템으로 초기화
      const items = currentCategoryItems;
      setGridItems([
        items[0] || null,
        items[1] || null,
        items[2] || null,
        items[3] || null,
      ]);
    }
    setIsGridView(!isGridView);
    setSelectedSlot(null);
  }, [isGridView, currentCategoryItems]);

  // 차트 설정 모달 열기
  const openChartSettings = useCallback(() => {
    setTempChartConfig({ ...chartConfig });
    setShowChartSettings(true);
  }, [chartConfig]);

  // 차트 설정 저장
  const saveChartSettings = () => {
    setChartConfig(tempChartConfig);
    saveChartConfig(tempChartConfig);

    // 저장된 아이템으로 현재 화면 업데이트
    if (tempChartConfig.defaultItem) {
      const result = findItemById(tempChartConfig.defaultItem);
      if (result) {
        setSelectedCategory(result.category);
        if (result.subCategory) {
          setSelectedSubCategory(result.subCategory);
        } else {
          setSelectedSubCategory(null);
        }
        setSelectedItem(result.item);
      }
    }

    setShowChartSettings(false);
  };

  // 차트 설정 초기화
  const resetChartSettings = () => {
    setTempChartConfig(getDefaultChartConfig());
  };

  // 특별 이벤트 점 표시 토글 (즉시 저장)
  const toggleEventDots = useCallback(() => {
    setChartConfig(prev => {
      const next = { ...prev, showEventDots: !prev.showEventDots };
      saveChartConfig(next);
      return next;
    });
  }, []);

  // 수요일 점 표시 토글 (즉시 저장)
  const toggleWednesdayDots = useCallback(() => {
    setChartConfig(prev => {
      const next = { ...prev, showWednesdayDots: !prev.showWednesdayDots };
      saveChartConfig(next);
      return next;
    });
  }, []);

  // 일반 날짜 점 표시 토글 (즉시 저장)
  const toggleRegularDots = useCallback(() => {
    setChartConfig(prev => {
      const next = { ...prev, showRegularDots: !prev.showRegularDots };
      saveChartConfig(next);
      return next;
    });
  }, []);

  // 비교선(일반재료×5 회색 점선) 표시 토글 (즉시 저장)
  const toggleComparisonLine = useCallback(() => {
    setChartConfig(prev => {
      const next = { ...prev, showComparisonLine: !prev.showComparisonLine };
      saveChartConfig(next);
      return next;
    });
  }, []);


  // 차트·통계 색 — 즐겨찾기에서 고른 아이템은 원래 카테고리 색을 쓴다
  const categoryStyle = selectedCategory === 'favorite'
    ? CATEGORY_STYLES[selectedItem ? realCategoryOf(selectedItem) : 'refine']
    : CATEGORY_STYLES[selectedCategory];
  // 카테고리 색을 CSS 변수로 내려 준다 — 모듈 CSS(hover·선택 상태)가 이 변수만 본다
  const catVars = (cs: typeof CATEGORY_STYLES[ItemCategory]) => ({
    '--cat': theme === 'dark' ? cs.darkThemeColor : cs.color,
    '--cat-fg': theme === 'dark' ? cs.darkThemeColor : cs.darkColor,
    '--cat-bg': theme === 'dark' ? cs.darkBg : cs.lightBg,
  }) as CSSProperties;

  // 데스크톱·태블릿·모바일 레이아웃은 CSS(d-lg-block 등)로 하나만 보이지만 셋 다 마운트돼 있어서,
  // 차트(Recharts)가 숨은 것까지 3벌 그려지고 있었다. 지금 보이는 레이아웃에서만 차트를 그린다.
  // 기준 폭은 위 클래스의 부트스트랩 브레이크포인트(md 768 · lg 992)와 같다.
  // 마운트 전(null)엔 아무 데도 안 그린다 — 차트는 원래 클라이언트 전용이라 첫 HTML 은 그대로다.
  const categoryColor = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor;
  // 값이 그대로면 같은 객체를 넘겨, 상관없는 상태(스크롤 화살표 등)가 바뀔 때
  // 대시보드·통계·이벤트 카드·차트가 통째로 다시 그려지지 않게 한다.
  const contextValue = useMemo(() => ({
    history, selectedItem, categoryLabel: categoryStyle.label, eventSelection, toggleEventSelection,
    eventRangeActive: eventSelection.length > 0, filteredHistory, selectedPeriod, setSelectedPeriod: handleSetPeriod,
    comparisonData, isGridView, onToggleGridView: handleToggleGridView, activeReferenceLines, toggleReferenceLine,
    selectItemById, categoryColor, openChartSettings,
    showEventDots: chartConfig.showEventDots, toggleEventDots,
    showWednesdayDots: chartConfig.showWednesdayDots, toggleWednesdayDots,
    showRegularDots: chartConfig.showRegularDots, toggleRegularDots,
    showComparisonLine: chartConfig.showComparisonLine, toggleComparisonLine,
    wonMode, toggleWonMode,
  }), [
    history, selectedItem, categoryStyle.label, eventSelection, toggleEventSelection, filteredHistory, selectedPeriod,
    handleSetPeriod, comparisonData, isGridView, handleToggleGridView, activeReferenceLines, toggleReferenceLine,
    selectItemById, categoryColor, openChartSettings, chartConfig, toggleEventDots, toggleWednesdayDots,
    toggleRegularDots, toggleComparisonLine, wonMode, toggleWonMode,
  ]);

  const belowLg = useIsMobileViewport(991.98);
  const belowMd = useIsMobileViewport(767.98);
  const chartLayout = belowLg === null || belowMd === null
    ? null
    : !belowLg ? 'desktop' : belowMd ? 'mobile' : 'tablet';

  return (
    <PriceContext.Provider value={contextValue}>
      <div className="price-chart-container">
        {/* 데스크톱: 사이드바 레이아웃 */}
        <div className="d-none d-lg-block">
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* 왼쪽 사이드바 - 카테고리 + 기간 + 보기. 카테고리 패널이 남는 높이를 먹어
                아래 두 패널이 차트 카드 바닥에 맞춰진다 */}
            <div className={styles.sidebar}>
              <div className={`${styles.panel} ${styles.panelGrow}`}>
                <div className={styles.panelHead}>
                  <span>카테고리</span>
                </div>
                <div className={styles.catList}>
                  {SIDEBAR_ORDER.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const isFav = cat === 'favorite';
                    const btn = (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.catBtn} ${isSelected ? styles.catBtnActive : ''}`}
                        style={catVars(styleOf(cat))}
                        onClick={() => handleSelectCategory(cat)}
                        aria-pressed={isSelected}
                      >
                        <span className={`${styles.catIcon} ${isFav ? styles.catIconStar : ''}`}>
                          {isFav ? <StarIcon size={22} /> : CATEGORY_ICON[cat] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={CATEGORY_ICON[cat]} alt="" width={28} height={28} decoding="async" />
                          )}
                        </span>
                        <span className={styles.catLabel}>
                          {styleOf(cat).label}
                          {isFav && <span className={styles.catCountInline}>{favorites.length}</span>}
                        </span>
                        {!isFav && <span className={styles.catCount}>{CATEGORY_ITEM_COUNT[cat]}</span>}
                      </button>
                    );
                    if (!isFav) return btn;
                    // 즐겨찾기 줄 — 오른쪽 끝에 편집(연필). 버튼 안에 버튼을 못 넣어 한 줄 칸에 나란히 겹쳐 둔다
                    return (
                      <div key={cat} className={styles.catRowFav}>
                        {btn}
                        <button type="button" className={styles.catEdit} onClick={openFavoritePicker} title="즐겨찾기 편집" aria-label="즐겨찾기 편집">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 기간 */}
              <div className={styles.panel} style={catVars(categoryStyle)}>
                <div className={styles.panelHead}><span>기간</span></div>
                <div className={styles.segmented}>
                  {(['1m', '2m', '3m', 'all'] as PeriodOption[]).map((period) => {
                    const isSelected = eventSelection.length === 0 && selectedPeriod === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        className={`${styles.segBtn} ${isSelected ? styles.segBtnActive : ''}`}
                        onClick={() => handleSetPeriod(period)}
                        aria-pressed={isSelected}
                      >
                        {PERIOD_LABELS[period]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 보기 */}
              <div className={styles.panel} style={catVars(categoryStyle)}>
                <div className={styles.panelHead}><span>보기</span></div>
                <div className={styles.segmented}>
                  <button
                    type="button"
                    className={`${styles.segBtn} ${!isGridView ? styles.segBtnActive : ''}`}
                    onClick={() => isGridView && handleToggleGridView()}
                    aria-pressed={!isGridView}
                  >
                    단일
                  </button>
                  <button
                    type="button"
                    className={`${styles.segBtn} ${isGridView ? styles.segBtnActive : ''}`}
                    onClick={() => !isGridView && handleToggleGridView()}
                    aria-pressed={isGridView}
                  >
                    4분할
                  </button>
                </div>
                {/* 원화 환산 — 켜면 그 날 가격을 그 날의 원화 가치로 보여준다 (lib/gold-value.ts).
                    마우스를 올리면 골드 가치 추세 미니 차트가 뜬다. */}
                <GoldValueHover color={categoryColor}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${wonMode ? styles.toggleBtnOn : ''}`}
                    onClick={toggleWonMode}
                    aria-pressed={wonMode}
                  >
                    <span className={styles.toggleMark}>₩</span>
                    원화로 보기
                    <span className={styles.toggleSwitch} aria-hidden="true" />
                  </button>
                </GoldValueHover>
              </div>
            </div>

            {/* 오른쪽 메인 영역 — 세로 flex 라 차트 카드가 왼쪽 바 높이까지 늘어난다 (fillHeight) */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', ...catVars(categoryStyle) }}>
              {/* 서브카테고리 (재련 추가 재료) */}
              {selectedCategory === 'refine_additional' && (
                <div className={styles.subTabs}>
                  {(Object.keys(REFINE_ADDITIONAL_SUBCATEGORIES) as RefineAdditionalSubCategory[]).map((subCat) => {
                    const isSelected = selectedSubCategory === subCat;
                    return (
                      <button
                        key={subCat}
                        type="button"
                        className={`${styles.segBtn} ${isSelected ? styles.segBtnActive : ''}`}
                        onClick={() => handleSelectSubCategory(subCat)}
                        aria-pressed={isSelected}
                      >
                        {REFINE_ADDITIONAL_SUBCATEGORIES[subCat].label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 아이템 목록 — 넘치는 쪽 가장자리는 흐리게(fade) + 둥근 화살표 */}
              {(selectedCategory !== 'refine_additional' || selectedSubCategory) && (
                <div className={styles.itemRail}>
                  {canScrollLeft && (
                    <button type="button" className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`} onClick={() => scrollItems('left')} aria-label="이전 아이템">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                  )}
                  {canScrollRight && (
                    <button type="button" className={`${styles.scrollBtn} ${styles.scrollBtnRight}`} onClick={() => scrollItems('right')} aria-label="다음 아이템">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  )}
                  <div
                    ref={itemScrollRef}
                    onScroll={checkItemScroll}
                    className={`${styles.chipRow} ${canScrollLeft ? styles.fadeLeft : ''} ${canScrollRight ? styles.fadeRight : ''}`}
                  >
                    {currentCategoryItems.map((item) => {
                      // 단일 모드: selectedItem과 일치하면 선택 / 4분할 모드: gridItems에 포함되어 있으면 선택
                      const isSelected = isGridView
                        ? gridItems.some(gi => gi?.id === item.id)
                        : selectedItem?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                          onClick={() => handleSelectItem(item)}
                          aria-pressed={isSelected}
                        >
                          <ItemChipBody item={item} quote={itemQuotes[item.id]} label={renderAccessoryItemName(item.name, realCategoryOf(item))} />
                        </button>
                      );
                    })}
                    {selectedCategory === 'favorite' && (
                      <button type="button" className={`${styles.chip} ${styles.addChip}`} onClick={openFavoritePicker}>
                        <span className={styles.addPlus} aria-hidden="true">+</span>
                        {favoriteItems.length === 0 ? '즐겨찾기에 아이템 추가' : '아이템 추가'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 그리드 뷰 안내 */}
              {isGridView && selectedSlot !== null && (
                <div className={styles.slotHint}>
                  슬롯 {selectedSlot + 1} 선택됨 - 아이템을 클릭하세요
                </div>
              )}

              {/* 차트 영역 */}
              {chartLayout !== 'desktop' ? null : isGridView ? (
                <Row className="g-2">
                  {gridItems.map((item, index) => (
                    <Col key={index} xs={6}>
                      <MiniPriceChart
                        item={item}
                        categoryStyle={categoryStyle}
                        isSelected={selectedSlot === index}
                        onClick={() => handleSlotClick(index)}
                        slotIndex={index}
                      />
                    </Col>
                  ))}
                </Row>
              ) : (
                <CompactPriceChart
                  selectedItem={selectedItem}
                  history={history}
                  loading={loading}
                  categoryStyle={categoryStyle}
                  hidePeriodButtons={true}
                  fillHeight={true}
                />
              )}
            </div>
          </div>
        </div>

        {/* 태블릿: 기존 레이아웃 유지 */}
        <div className="d-none d-md-block d-lg-none">
          <SidebarMobileLayout
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            selectedItem={selectedItem}
            currentCategoryItems={currentCategoryItems}
            categoryStyle={categoryStyle}
            isGridView={isGridView}
            selectedSlot={selectedSlot}
            gridItems={gridItems}
            history={history}
            loading={loading}
            theme={theme}
            onSelectCategory={handleSelectCategory}
            onSelectSubCategory={handleSelectSubCategory}
            onSelectItem={handleSelectItem}
            onToggleGridView={handleToggleGridView}
            onSlotClick={handleSlotClick}
            showChart={chartLayout === 'tablet'}
            favoriteCount={favorites.length}
            onOpenFavoritePicker={openFavoritePicker}
          />
        </div>

        {/* 모바일: 바텀시트 UI (예전 스타일) */}
        <div className="d-md-none">
          <ItemSelector
            selectedCategory={selectedCategory}
            selectedItem={selectedItem}
            onSelectCategory={handleSelectCategory}
            onSelectItem={handleSelectItem}
            selectedSubCategory={selectedSubCategory}
            onSelectSubCategory={handleSelectSubCategory}
            favoriteItems={favoriteItems}
            onOpenFavoritePicker={openFavoritePicker}
          />

          {/* 그리드 뷰 안내 메시지 */}
          {isGridView && selectedSlot !== null && (
            <div
              style={{
                background: `${categoryStyle?.darkThemeColor || 'var(--brand-primary)'}20`,
                border: `1px solid ${categoryStyle?.darkThemeColor || 'var(--brand-primary)'}`,
                borderRadius: '8px',
                padding: '6px 10px',
                marginBottom: '8px',
                fontSize: '0.75rem',
                color: categoryStyle?.darkThemeColor || 'var(--brand-primary)',
                textAlign: 'center',
              }}
            >
              슬롯 {selectedSlot + 1} 선택됨 - 아이템을 클릭하세요
            </div>
          )}

          {/* 모바일 차트 */}
          {chartLayout !== 'mobile' ? null : isGridView ? (
            <Row className="g-1" style={{ height: '350px' }}>
              {gridItems.map((item, index) => (
                <Col key={index} xs={6} style={{ height: '50%' }}>
                  <MiniPriceChart
                    item={item}
                    categoryStyle={categoryStyle}
                    isSelected={selectedSlot === index}
                    onClick={() => handleSlotClick(index)}
                    slotIndex={index}
                    isMobile={true}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <CompactPriceChart
              selectedItem={selectedItem}
              history={history}
              loading={loading}
              categoryStyle={categoryStyle}
            />
          )}
        </div>
      </div>
      {/* 차트 설정 모달 */}
      {showFavPicker && (
        <FavoritePicker favorites={favorites} onToggle={toggleFavorite} onReset={resetFavorites} onClose={() => setShowFavPicker(false)} />
      )}

      {showChartSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChartSettings(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '450px',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* 모달 헤더 */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                차트 설정
              </h3>
              <button
                onClick={() => setShowChartSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* 모달 바디 */}
            <div style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* 기본 아이템 설정 */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                페이지 접속 시 처음 표시될 아이템을 선택하세요.
              </div>

              {/* 선택된 기본 아이템 표시 */}
              {tempChartConfig.defaultItem && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                }}>
                  {(() => {
                    const item = getTrackedItemById(tempChartConfig.defaultItem!);
                    if (!item) return <span style={{ color: 'var(--text-muted)' }}>아이템을 찾을 수 없음</span>;
                    return (
                      <>
                        <Image
                          src={item.icon || '/icon.png'}
                          alt={item.name}
                          width={28}
                          height={28}
                          style={{ borderRadius: '4px' }}
                        />
                        <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {item.name}
                        </span>
                        <button
                          onClick={() => setTempChartConfig(prev => ({ ...prev, defaultItem: null }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '0 4px',
                          }}
                        >
                          ×
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* 기본 아이템 선택 목록 */}
              <div style={{
                maxHeight: '350px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}>
                {CATEGORY_ORDER.map(cat => {
                  const catStyle = CATEGORY_STYLES[cat];
                  const items = getItemsByCategory(cat);
                  return (
                    <div key={cat}>
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor,
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        {catStyle.label}
                      </div>
                      {items.map(item => {
                        const isSelected = tempChartConfig.defaultItem === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setTempChartConfig(prev => ({ ...prev, defaultItem: item.id }))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg) : 'transparent',
                              borderBottom: '1px solid var(--border-color)',
                            }}
                          >
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <Image
                              src={item.icon || '/icon.png'}
                              alt={item.name}
                              width={24}
                              height={24}
                              style={{ borderRadius: '4px', flexShrink: 0 }}
                            />
                            <span style={{
                              fontSize: '0.8rem',
                              color: isSelected ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor) : 'var(--text-primary)',
                              fontWeight: isSelected ? 600 : 400,
                            }}>
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={resetChartSettings}
                style={{
                  padding: '10px 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                초기화
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowChartSettings(false)}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={saveChartSettings}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {children}
    </PriceContext.Provider>
  );
}

// 모바일/태블릿용 레이아웃 컴포넌트
function SidebarMobileLayout({
  selectedCategory,
  selectedSubCategory,
  selectedItem,
  currentCategoryItems,
  categoryStyle,
  isGridView,
  selectedSlot,
  gridItems,
  history,
  loading,
  theme,
  onSelectCategory,
  onSelectSubCategory,
  onSelectItem,
  onToggleGridView,
  onSlotClick,
  showChart,
  favoriteCount,
  onOpenFavoritePicker,
}: {
  selectedCategory: ChartCategory;
  selectedSubCategory: RefineAdditionalSubCategory | null;
  selectedItem: TrackedItem | null;
  currentCategoryItems: TrackedItem[];
  categoryStyle: typeof CATEGORY_STYLES[ItemCategory];
  isGridView: boolean;
  selectedSlot: number | null;
  gridItems: (TrackedItem | null)[];
  history: PriceEntry[];
  loading: boolean;
  theme: string;
  onSelectCategory: (cat: ChartCategory) => void;
  onSelectSubCategory: (sub: RefineAdditionalSubCategory | null) => void;
  onSelectItem: (item: TrackedItem) => void;
  onToggleGridView: () => void;
  onSlotClick: (index: number) => void;
  showChart: boolean;
  favoriteCount: number;
  onOpenFavoritePicker: () => void;
}) {
  const [showItemSheet, setShowItemSheet] = useState(false);
  const itemQuotes = useItemQuotes(currentCategoryItems);

  return (
    <>
      {/* 카테고리 가로 스크롤 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '8px',
      }}>
        {SIDEBAR_ORDER.map((cat) => {
          const catStyle = styleOf(cat);
          const isSelected = selectedCategory === cat;
          return (
            <Fragment key={cat}>
            <button
              onClick={() => {
                onSelectCategory(cat);
                setShowItemSheet(true);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.color) : 'var(--border-color)'}`,
                backgroundColor: isSelected
                  ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg)
                  : 'var(--card-bg)',
                color: isSelected
                  ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor)
                  : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: isSelected ? 600 : 500,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {cat === 'favorite' && <StarIcon size={14} />}
              {catStyle.label}{cat === 'favorite' ? ` ${favoriteCount}` : ''}
            </button>
            {cat === 'favorite' && (
              <button
                type="button"
                onClick={onOpenFavoritePicker}
                title="즐겨찾기 편집"
                aria-label="즐겨찾기 편집"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  width: '34px', borderRadius: '8px', border: '1px dashed var(--border-color)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              </button>
            )}
            </Fragment>
          );
        })}
      </div>

      {/* 서브카테고리 (재련 추가 재료) */}
      {selectedCategory === 'refine_additional' && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '8px',
        }}>
          {(Object.keys(REFINE_ADDITIONAL_SUBCATEGORIES) as RefineAdditionalSubCategory[]).map((subCat) => {
            const subCatInfo = REFINE_ADDITIONAL_SUBCATEGORIES[subCat];
            const isSelected = selectedSubCategory === subCat;
            return (
              <button
                key={subCat}
                onClick={() => {
                  onSelectSubCategory(subCat);
                  setShowItemSheet(true);
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? categoryStyle.darkThemeColor : 'var(--border-color)'}`,
                  backgroundColor: isSelected
                    ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                    : 'var(--card-bg)',
                  color: isSelected
                    ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                    : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {subCatInfo.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 선택된 아이템 표시 + 아이템 선택 버튼 */}
      {selectedItem && (selectedCategory !== 'refine_additional' || selectedSubCategory) && (
        <button
          onClick={() => setShowItemSheet(!showItemSheet)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 12px',
            marginBottom: '8px',
            borderRadius: '10px',
            border: `1px solid ${theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color}`,
            backgroundColor: theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg,
            cursor: 'pointer',
          }}
        >
          {selectedItem.icon && (
            <Image
              src={selectedItem.icon}
              alt={selectedItem.name}
              width={32}
              height={32}
              style={{ borderRadius: '6px' }}
            />
          )}
          <span style={{
            flex: 1,
            textAlign: 'left',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor,
          }}>
            {renderAccessoryItemName(selectedItem.name, realCategoryOf(selectedItem))}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {showItemSheet ? '▲' : '▼'}
          </span>
        </button>
      )}

      {/* 아이템 목록 (접기/펼치기) */}
      {showItemSheet && (selectedCategory !== 'refine_additional' || selectedSubCategory) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '12px',
          padding: '10px 14px 14px 10px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}>
          {currentCategoryItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            const baseShadow = theme === 'dark'
              ? '0 2px 6px -1px rgba(var(--brand-rgb), 0.25), 0 3px 8px -2px rgba(var(--brand-rgb), 0.12)'
              : '0 2px 6px -1px rgba(var(--brand-rgb), 0.2), 0 3px 8px -2px rgba(var(--brand-rgb), 0.1)';
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectItem(item);
                  setShowItemSheet(false);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                  backgroundColor: isSelected
                    ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                    : 'var(--card-bg)',
                  color: isSelected
                    ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                    : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  boxShadow: baseShadow,
                }}
              >
                <ItemChipBody item={item} quote={itemQuotes[item.id]} label={renderAccessoryItemName(item.name, realCategoryOf(item))} />
              </button>
            );
          })}
          {selectedCategory === 'favorite' && (
            <button
              type="button"
              onClick={onOpenFavoritePicker}
              style={{
                padding: '8px 10px', borderRadius: '6px', border: '1px dashed var(--border-color)',
                background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              + 아이템 추가
            </button>
          )}
        </div>
      )}

      {/* 그리드 뷰 안내 */}
      {isGridView && selectedSlot !== null && (
        <div
          style={{
            background: `${categoryStyle?.darkThemeColor || 'var(--brand-primary)'}20`,
            border: `1px solid ${categoryStyle?.darkThemeColor || 'var(--brand-primary)'}`,
            borderRadius: '8px',
            padding: '6px 10px',
            marginBottom: '8px',
            fontSize: '0.75rem',
            color: categoryStyle?.darkThemeColor || 'var(--brand-primary)',
            textAlign: 'center',
          }}
        >
          슬롯 {selectedSlot + 1} 선택됨 - 아이템을 클릭하세요
        </div>
      )}

      {/* 차트 */}
      {!showChart ? null : isGridView ? (
        <Row className="g-1">
          {gridItems.map((item, index) => (
            <Col key={index} xs={6}>
              <MiniPriceChart
                item={item}
                categoryStyle={categoryStyle}
                isSelected={selectedSlot === index}
                onClick={() => onSlotClick(index)}
                slotIndex={index}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <CompactPriceChart
          selectedItem={selectedItem}
          history={history}
          loading={loading}
          categoryStyle={categoryStyle}
        />
      )}
    </>
  );
}
