
'use client';

import { useState, useEffect, ReactNode, useMemo } from 'react';
import { TrackedItem, ItemCategory, getItemsByCategory } from '@/lib/items-to-track';
import ItemSelector, { CATEGORY_STYLES } from './ItemSelector';
import CompactPriceChart from './CompactPriceChart';
import { PriceContext } from './PriceComparisonStats';

// 카테고리 목록
const ALL_CATEGORIES: ItemCategory[] = ['gem', 'refine', 'refine_additional', 'engraving', 'accessory', 'jewel'];

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

// Provider를 별도로 export - 실제 데이터를 관리
export function PriceChartProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('gem');
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');
  const [surgeCategories, setSurgeCategories] = useState<Set<ItemCategory>>(new Set());
  const [surgeItems, setSurgeItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const categoryItems = getItemsByCategory(selectedCategory);
    if (categoryItems.length > 0) {
      setSelectedItem(categoryItems[0]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const defaultCategory = 'gem';
    const defaultCategoryItems = getItemsByCategory(defaultCategory);
    const defaultItem = defaultCategoryItems.find(item => item.id === '67400003') || defaultCategoryItems[0];

    setSelectedCategory(defaultCategory);
    setSelectedItem(defaultItem);
  }, []);

  // 10% 이상 급등한 아이템이 있는 카테고리 및 개별 아이템 감지
  useEffect(() => {
    const checkSurgeItems = async () => {
      const { getItemPriceHistory } = await import('@/lib/price-history-client');
      const surgeCategories = new Set<ItemCategory>();
      const surgeItemIds = new Set<string>();

      for (const category of ALL_CATEGORIES) {
        const items = getItemsByCategory(category);

        // 모든 아이템 체크 (개별 아이템 버튼에도 효과 적용)
        for (const item of items) {
          try {
            const priceHistory = await getItemPriceHistory(item.id, 2); // 최근 2일만 가져오기

            if (priceHistory.length >= 2) {
              const today = priceHistory[priceHistory.length - 1].price;
              const yesterday = priceHistory[priceHistory.length - 2].price;
              const changeRate = ((today - yesterday) / yesterday) * 100;

              if (changeRate >= 20) {
                surgeCategories.add(category);
                surgeItemIds.add(item.id);
              }
            }
          } catch (err) {
            console.error(`Error checking surge for ${item.name}:`, err);
          }
        }
      }

      setSurgeCategories(surgeCategories);
      setSurgeItems(surgeItemIds);
    };

    checkSurgeItems();
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

  const handleSelectItem = (item: TrackedItem) => {
    setSelectedItem(item);
  };

  const categoryStyle = CATEGORY_STYLES[selectedCategory];

  return (
    <PriceContext.Provider value={{ history, filteredHistory, selectedPeriod, setSelectedPeriod }}>
      <div>
        <ItemSelector
          selectedCategory={selectedCategory}
          selectedItem={selectedItem}
          onSelectCategory={handleSelectCategory}
          onSelectItem={handleSelectItem}
          surgeCategories={surgeCategories}
          surgeItems={surgeItems}
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
