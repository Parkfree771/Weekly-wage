
'use client';

import { useState, useEffect, ReactNode, useMemo, useRef, useCallback } from 'react';
import { Row, Col } from 'react-bootstrap';
import Image from 'next/image';
import { TrackedItem, ItemCategory, getItemsByCategory, RefineAdditionalSubCategory, getItemsBySubCategory, REFINE_ADDITIONAL_SUBCATEGORIES, SUCCESSION_TO_NORMAL_MATERIAL_MAP, SUCCESSION_MATERIAL_START_DATE, findItemById, TRACKED_ITEMS } from '@/lib/items-to-track';
import ItemSelector, { CATEGORY_STYLES } from './ItemSelector';
import CompactPriceChart from './CompactPriceChart';
import MiniPriceChart from './MiniPriceChart';
import { PriceContext } from './PriceComparisonStats';
import { useTheme } from './ThemeProvider';

// 카테고리 표시 순서
const CATEGORY_ORDER: ItemCategory[] = ['refine_succession', 'gem', 'refine', 'refine_additional', 'engraving', 'accessory', 'jewel'];

// TRACKED_ITEMS를 Map으로 변환 (O(1) 조회용)
const TRACKED_ITEMS_MAP = new Map(TRACKED_ITEMS.map(item => [item.id, item]));

// 아이템 ID로 아이템 조회 (최적화)
const getTrackedItemById = (id: string): TrackedItem | undefined => TRACKED_ITEMS_MAP.get(id);

// 악세서리 아이템 이름에서 (상), (중) 색상 처리 함수
const renderAccessoryItemName = (name: string, category: ItemCategory) => {
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

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  if (price >= 100) {
    return Math.round(price).toLocaleString('ko-KR');
  }
  return price.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// 차트 설정 localStorage 키
const CHART_CONFIG_KEY = 'chartConfig';

// 차트 설정 타입
type ChartConfig = {
  defaultItem: string | null;  // 기본 모드에서 처음 표시할 아이템 ID
};

const getDefaultChartConfig = (): ChartConfig => ({
  defaultItem: null
});

const loadChartConfig = (): ChartConfig => {
  if (typeof window === 'undefined') return getDefaultChartConfig();
  try {
    const saved = localStorage.getItem(CHART_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        defaultItem: parsed.defaultItem || null
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

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

// Provider를 별도로 export - 실제 데이터를 관리
export function PriceChartProvider({ children, dashboard }: { children: ReactNode; dashboard?: ReactNode }) {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('refine_succession');
  const [selectedSubCategory, setSelectedSubCategory] = useState<RefineAdditionalSubCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');

  // 비교 차트 데이터 (계승 재료 ↔ 일반 재료)
  const [comparisonHistory, setComparisonHistory] = useState<PriceEntry[]>([]);
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
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // 차트 설정 불러오기 (초기 로드 - 한 번만 실행)
  useEffect(() => {
    const loaded = loadChartConfig();
    setChartConfig(loaded);
    setTempChartConfig(loaded);

    // 저장된 기본 아이템이 있으면 해당 아이템으로 설정
    if (loaded.defaultItem) {
      const result = findItemById(loaded.defaultItem);
      if (result) {
        setSelectedCategory(result.category);
        if (result.subCategory) {
          setSelectedSubCategory(result.subCategory);
        }
        setSelectedItem(result.item);
        setIsConfigLoaded(true);
        return;
      }
    }

    // 저장된 아이템이 없으면 기본값 (정수의 돌파석)
    const defaultCategoryItems = getItemsByCategory('refine_succession');
    const defaultItem = defaultCategoryItems.find(item => item.id === '66102007') || defaultCategoryItems[0];
    setSelectedItem(defaultItem);
    setIsConfigLoaded(true);
  }, []);

  const toggleReferenceLine = (type: ReferenceLineType) => {
    setActiveReferenceLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // 아이템 ID로 선택하기 (대시보드에서 클릭 시 사용)
  const selectItemById = (itemId: string) => {
    const result = findItemById(itemId);
    if (result) {
      // 그리드 뷰가 켜져 있으면 끄기
      if (isGridView) {
        setIsGridView(false);
      }
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
  };

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
    if (selectedCategory === 'refine_additional' && selectedSubCategory) {
      return getItemsBySubCategory(selectedSubCategory);
    }
    return getItemsByCategory(selectedCategory);
  }, [selectedCategory, selectedSubCategory]);

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
  }, [selectedPeriod]);

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];
    if (!cutoffDate) return history;

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [history, cutoffDate]);

  // 비교 히스토리도 동일하게 필터링
  const filteredComparisonHistory = useMemo(() => {
    if (comparisonHistory.length === 0) return [];
    if (!cutoffDate) return comparisonHistory;

    return comparisonHistory.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [comparisonHistory, cutoffDate]);

  // 비교 데이터 객체
  const comparisonData = useMemo(() => {
    if (!comparisonInfo || filteredComparisonHistory.length === 0) return null;
    return {
      normalHistory: filteredComparisonHistory,
      normalIcon: comparisonInfo.normalIcon,
      ratio: comparisonInfo.ratio
    };
  }, [filteredComparisonHistory, comparisonInfo]);

  const handleSelectCategory = useCallback((category: ItemCategory) => {
    // 4분할 모드일 때 카테고리 클릭하면 단일 모드로 전환
    if (isGridView) {
      setIsGridView(false);
    }
    setSelectedCategory(category);
    setSelectedSubCategory(null);
    setSelectedSlot(null);

    // 재련 추가 재료가 아니면 첫 번째 아이템 선택
    if (category !== 'refine_additional') {
      const categoryItems = getItemsByCategory(category);
      if (categoryItems.length > 0) {
        setSelectedItem(categoryItems[0]);
      }
    }
  }, [isGridView]);

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
    // 4분할 모드일 때 아이템 클릭하면 단일 모드로 전환하고 해당 아이템 선택
    if (isGridView) {
      setIsGridView(false);
      setSelectedItem(item);
      setSelectedSlot(null);
    } else {
      setSelectedItem(item);
    }
  }, [isGridView]);

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
  const openChartSettings = () => {
    setTempChartConfig({ ...chartConfig });
    setShowChartSettings(true);
  };

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


  const categoryStyle = CATEGORY_STYLES[selectedCategory];

  return (
    <PriceContext.Provider value={{ history, filteredHistory, selectedPeriod, setSelectedPeriod, comparisonData, isGridView, onToggleGridView: handleToggleGridView, activeReferenceLines, toggleReferenceLine, selectItemById, categoryColor: theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor, openChartSettings }}>
      {dashboard}
      <div className="price-chart-container">
        {/* 데스크톱: 사이드바 레이아웃 */}
        <div className="d-none d-lg-block">
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* 왼쪽 사이드바 - 카테고리 + 기간선택 + 보기모드 */}
            <div style={{
              width: '170px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* 카테고리 상자 */}
              <div style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '14px',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>카테고리</span>
                  {/* 차트 설정 톱니바퀴 */}
                  <button
                    onClick={openChartSettings}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="차트 설정"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>
                </div>
                {CATEGORY_ORDER.map((cat) => {
                  const catStyle = CATEGORY_STYLES[cat];
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        marginBottom: '6px',
                        borderRadius: '10px',
                        border: `2px solid ${isSelected ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.color) : 'var(--border-color)'}`,
                        backgroundColor: isSelected
                          ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg)
                          : 'transparent',
                        color: isSelected
                          ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor)
                          : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = theme === 'dark' ? catStyle.darkBg : catStyle.lightBg;
                          e.currentTarget.style.borderColor = theme === 'dark' ? catStyle.darkThemeColor : catStyle.color;
                          e.currentTarget.style.color = theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {catStyle.label}
                    </button>
                  );
                })}
              </div>

              {/* 기간선택 상자 */}
              <div style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '14px',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  기간선택
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                }}>
                  {(['7d', '1m', '3m', 'all'] as PeriodOption[]).map((period) => {
                    const periodLabels: Record<PeriodOption, string> = {
                      '7d': '7일',
                      '1m': '1개월',
                      '3m': '3개월',
                      '6m': '6개월',
                      '1y': '1년',
                      'all': '전체'
                    };
                    const isSelected = selectedPeriod === period;
                    return (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: `2px solid ${isSelected ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                          backgroundColor: isSelected
                            ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                            : 'transparent',
                          color: isSelected
                            ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                            : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 700 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg;
                            e.currentTarget.style.borderColor = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color;
                            e.currentTarget.style.color = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        {periodLabels[period]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 보기모드 상자 */}
              <div style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '14px',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  보기모드
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                }}>
                  <button
                    onClick={() => isGridView && handleToggleGridView()}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `2px solid ${!isGridView ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                      backgroundColor: !isGridView
                        ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                        : 'transparent',
                      color: !isGridView
                        ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                        : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: !isGridView ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    단일
                  </button>
                  <button
                    onClick={() => !isGridView && handleToggleGridView()}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `2px solid ${isGridView ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                      backgroundColor: isGridView
                        ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                        : 'transparent',
                      color: isGridView
                        ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                        : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: isGridView ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    4분할
                  </button>
                </div>
              </div>
            </div>

            {/* 오른쪽 메인 영역 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 서브카테고리 (재련 추가 재료) */}
              {selectedCategory === 'refine_additional' && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '16px',
                }}>
                  {(Object.keys(REFINE_ADDITIONAL_SUBCATEGORIES) as RefineAdditionalSubCategory[]).map((subCat) => {
                    const subCatInfo = REFINE_ADDITIONAL_SUBCATEGORIES[subCat];
                    const isSelected = selectedSubCategory === subCat;
                    return (
                      <button
                        key={subCat}
                        onClick={() => handleSelectSubCategory(subCat)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                          backgroundColor: isSelected
                            ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                            : 'var(--card-bg)',
                          color: isSelected
                            ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                            : 'var(--text-secondary)',
                          fontSize: '0.95rem',
                          fontWeight: isSelected ? 700 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          letterSpacing: '0.3px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg;
                            e.currentTarget.style.borderColor = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color;
                            e.currentTarget.style.color = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        {subCatInfo.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 아이템 목록 */}
              {(selectedCategory !== 'refine_additional' || selectedSubCategory) && (
                <div style={{
                  position: 'relative',
                  marginBottom: '16px',
                }}>
                  {/* 왼쪽 스크롤 버튼 */}
                  {canScrollLeft && (
                    <button
                      onClick={() => scrollItems('left')}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-md)',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                      }}
                    >
                      ‹
                    </button>
                  )}
                  {/* 오른쪽 스크롤 버튼 */}
                  {canScrollRight && (
                    <button
                      onClick={() => scrollItems('right')}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-md)',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                      }}
                    >
                      ›
                    </button>
                  )}
                  {/* 스크롤 컨테이너 */}
                  <div
                    ref={itemScrollRef}
                    onScroll={checkItemScroll}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      overflowX: 'auto',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      padding: '4px 0',
                    }}
                  >
                    {currentCategoryItems.map((item) => {
                      // 단일 모드: selectedItem과 일치하면 선택
                      // 4분할 모드: gridItems에 포함되어 있으면 선택
                      const isSelected = isGridView
                        ? gridItems.some(gi => gi?.id === item.id)
                        : selectedItem?.id === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: `2px solid ${isSelected ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color) : 'var(--border-color)'}`,
                            backgroundColor: isSelected
                              ? (theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg)
                              : 'var(--card-bg)',
                            color: isSelected
                              ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                              : 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 700 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? categoryStyle.darkBg : categoryStyle.lightBg;
                              e.currentTarget.style.borderColor = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.color;
                              e.currentTarget.style.color = theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }
                          }}
                        >
                          {renderAccessoryItemName(item.name, selectedCategory)}
                        </button>
                      );
                    })}
                  </div>
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                </div>
              )}

              {/* 그리드 뷰 안내 */}
              {isGridView && selectedSlot !== null && (
                <div
                  style={{
                    background: `${categoryStyle?.darkThemeColor || 'var(--brand-primary)'}20`,
                    border: `1px solid ${categoryStyle?.darkThemeColor || 'var(--brand-primary)'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontSize: '0.8rem',
                    color: categoryStyle?.darkThemeColor || 'var(--brand-primary)',
                    textAlign: 'center',
                  }}
                >
                  슬롯 {selectedSlot + 1} 선택됨 - 사이드바에서 아이템을 클릭하세요
                </div>
              )}

              {/* 차트 영역 */}
              {isGridView ? (
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
          {isGridView ? (
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
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
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
  isMobile = false,
}: {
  selectedCategory: ItemCategory;
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
  onSelectCategory: (cat: ItemCategory) => void;
  onSelectSubCategory: (sub: RefineAdditionalSubCategory | null) => void;
  onSelectItem: (item: TrackedItem) => void;
  onToggleGridView: () => void;
  onSlotClick: (index: number) => void;
  isMobile?: boolean;
}) {
  const [showItemSheet, setShowItemSheet] = useState(false);

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
        {CATEGORY_ORDER.map((cat) => {
          const catStyle = CATEGORY_STYLES[cat];
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                onSelectCategory(cat);
                setShowItemSheet(true);
              }}
              style={{
                padding: isMobile ? '6px 12px' : '8px 16px',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.color) : 'var(--border-color)'}`,
                backgroundColor: isSelected
                  ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg)
                  : 'var(--card-bg)',
                color: isSelected
                  ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor)
                  : 'var(--text-secondary)',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                fontWeight: isSelected ? 600 : 500,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {catStyle.label}
            </button>
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
            {renderAccessoryItemName(selectedItem.name, selectedCategory)}
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
          gap: '6px',
          marginBottom: '12px',
          padding: '10px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}>
          {currentCategoryItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
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
                    : 'transparent',
                  color: isSelected
                    ? (theme === 'dark' ? categoryStyle.darkThemeColor : categoryStyle.darkColor)
                    : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 600 : 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {renderAccessoryItemName(item.name, selectedCategory)}
              </button>
            );
          })}
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
      {isGridView ? (
        <Row className="g-1" style={{ height: isMobile ? '350px' : 'auto' }}>
          {gridItems.map((item, index) => (
            <Col key={index} xs={6} style={isMobile ? { height: '50%' } : {}}>
              <MiniPriceChart
                item={item}
                categoryStyle={categoryStyle}
                isSelected={selectedSlot === index}
                onClick={() => onSlotClick(index)}
                slotIndex={index}
                isMobile={isMobile}
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

// 하위 호환성을 위한 default export (이제는 사용하지 않음)
export default function PriceChartContainer() {
  return null;
}
