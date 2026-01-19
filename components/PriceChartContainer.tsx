
'use client';

import { useState, useEffect, ReactNode, useMemo } from 'react';
import { Row, Col } from 'react-bootstrap';
import { TrackedItem, ItemCategory, getItemsByCategory, RefineAdditionalSubCategory, getItemsBySubCategory, SUCCESSION_TO_NORMAL_MATERIAL_MAP, SUCCESSION_MATERIAL_START_DATE } from '@/lib/items-to-track';
import ItemSelector, { CATEGORY_STYLES } from './ItemSelector';
import CompactPriceChart from './CompactPriceChart';
import MiniPriceChart from './MiniPriceChart';
import { PriceContext } from './PriceComparisonStats';

// 카테고리 목록
const ALL_CATEGORIES: ItemCategory[] = ['refine_succession', 'gem', 'refine', 'refine_additional', 'engraving', 'accessory', 'jewel'];

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

// Provider를 별도로 export - 실제 데이터를 관리
export function PriceChartProvider({ children }: { children: ReactNode }) {
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

  // 현재 카테고리의 아이템 목록
  const currentCategoryItems = useMemo(() => {
    if (selectedCategory === 'refine_additional' && selectedSubCategory) {
      return getItemsBySubCategory(selectedSubCategory);
    }
    return getItemsByCategory(selectedCategory);
  }, [selectedCategory, selectedSubCategory]);

  useEffect(() => {
    // 재련 추가 재료 카테고리일 때는 서브카테고리가 선택되어야만 아이템을 가져옴
    if (selectedCategory === 'refine_additional') {
      if (selectedSubCategory) {
        const subCategoryItems = getItemsBySubCategory(selectedSubCategory);
        if (subCategoryItems.length > 0) {
          setSelectedItem(subCategoryItems[0]);
        }
      }
    } else {
      const categoryItems = getItemsByCategory(selectedCategory);
      if (categoryItems.length > 0) {
        setSelectedItem(categoryItems[0]);
      }
    }
  }, [selectedCategory, selectedSubCategory]);

  // 카테고리 변경 시 그리드 아이템 초기화
  useEffect(() => {
    if (isGridView) {
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

  useEffect(() => {
    const defaultCategory = 'refine_succession';
    const defaultCategoryItems = getItemsByCategory(defaultCategory);
    const defaultItem = defaultCategoryItems.find(item => item.id === '6861013') || defaultCategoryItems[0];

    setSelectedCategory(defaultCategory);
    setSelectedItem(defaultItem);
  }, []);

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

  const handleSelectCategory = (category: ItemCategory) => {
    setSelectedCategory(category);
    setSelectedSlot(null);
  };

  const handleSelectSubCategory = (subCategory: RefineAdditionalSubCategory | null) => {
    setSelectedSubCategory(subCategory);
    setSelectedSlot(null);
  };

  const handleSelectItem = (item: TrackedItem) => {
    // 그리드 모드이고 슬롯이 선택된 경우, 해당 슬롯에 아이템 배치
    if (isGridView && selectedSlot !== null) {
      setGridItems(prev => {
        const newItems = [...prev];
        newItems[selectedSlot] = item;
        return newItems;
      });
      setSelectedSlot(null);
    } else {
      setSelectedItem(item);
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedSlot === slotIndex) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot(slotIndex);
    }
  };

  const handleToggleGridView = () => {
    if (!isGridView) {
      // 그리드 뷰로 전환 시 현재 카테고리의 처음 4개 아이템으로 초기화
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
  };

  const categoryStyle = CATEGORY_STYLES[selectedCategory];

  return (
    <PriceContext.Provider value={{ history, filteredHistory, selectedPeriod, setSelectedPeriod, comparisonData, isGridView, onToggleGridView: handleToggleGridView }}>
      <div className="price-chart-container">
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

        {/* 데스크톱: 그리드 뷰 또는 단일 차트 */}
        <div className="d-none d-md-block">
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
            />
          )}
        </div>

        {/* 모바일: 그리드 뷰 또는 단일 차트 */}
        <div className="d-md-none">
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
      {children}
    </PriceContext.Provider>
  );
}

// 하위 호환성을 위한 default export (이제는 사용하지 않음)
export default function PriceChartContainer() {
  return null;
}
