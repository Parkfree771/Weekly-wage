
'use client';

import { useState, useEffect, ReactNode, useMemo } from 'react';
import { TrackedItem, ItemCategory, getItemsByCategory, RefineAdditionalSubCategory, getItemsBySubCategory } from '@/lib/items-to-track';
import ItemSelector, { CATEGORY_STYLES } from './ItemSelector';
import CompactPriceChart from './CompactPriceChart';
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
      } catch (err) {
        console.error('Error fetching price history:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedItem]);

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];
    if (selectedPeriod === 'all') return history;

    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedPeriod) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [history, selectedPeriod]);

  const handleSelectCategory = (category: ItemCategory) => {
    setSelectedCategory(category);
  };

  const handleSelectSubCategory = (subCategory: RefineAdditionalSubCategory | null) => {
    setSelectedSubCategory(subCategory);
  };

  const handleSelectItem = (item: TrackedItem) => {
    setSelectedItem(item);
  };

  const categoryStyle = CATEGORY_STYLES[selectedCategory];

  return (
    <PriceContext.Provider value={{ history, filteredHistory, selectedPeriod, setSelectedPeriod }}>
      <div style={{ minHeight: '650px', contain: 'layout style' }}>
        <ItemSelector
          selectedCategory={selectedCategory}
          selectedItem={selectedItem}
          onSelectCategory={handleSelectCategory}
          onSelectItem={handleSelectItem}
          selectedSubCategory={selectedSubCategory}
          onSelectSubCategory={handleSelectSubCategory}
        />
        <CompactPriceChart
          selectedItem={selectedItem}
          history={history}
          loading={loading}
          categoryStyle={categoryStyle}
        />
      </div>
      {children}
    </PriceContext.Provider>
  );
}

// 하위 호환성을 위한 default export (이제는 사용하지 않음)
export default function PriceChartContainer() {
  return null;
}
