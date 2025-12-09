
'use client';

import { useState, useEffect } from 'react';
import { TrackedItem, ItemCategory, getItemsByCategory } from '@/lib/items-to-track';
import ItemSelector, { CATEGORY_STYLES } from './ItemSelector';
import CompactPriceChart from './CompactPriceChart';

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

export default function PriceChartContainer() {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('gem');
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categoryItems = getItemsByCategory(selectedCategory);
    if (categoryItems.length > 0) {
      // 카테고리 변경 시 항상 첫 번째 아이템 선택
      setSelectedItem(categoryItems[0]);
    }
  }, [selectedCategory]);

  // 컴포넌트 마운트 시 기본값 설정
  useEffect(() => {
    const defaultCategory = 'gem';
    const defaultCategoryItems = getItemsByCategory(defaultCategory);
    // '질서의 젬 : 안정' (ID: 67400003)을 기본값으로 설정
    const defaultItem = defaultCategoryItems.find(item => item.id === '67400003') || defaultCategoryItems[0];
    
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
        // Firebase Storage에서 직접 JSON 다운로드 (최대 999일)
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

  const handleSelectCategory = (category: ItemCategory) => {
    setSelectedCategory(category);
  };

  const handleSelectItem = (item: TrackedItem) => {
    setSelectedItem(item);
  };

  const categoryStyle = CATEGORY_STYLES[selectedCategory];

  return (
    <div>
      <ItemSelector
        selectedCategory={selectedCategory}
        selectedItem={selectedItem}
        onSelectCategory={handleSelectCategory}
        onSelectItem={handleSelectItem}
      />
      <CompactPriceChart
        selectedItem={selectedItem}
        history={history}
        loading={loading}
        categoryStyle={categoryStyle}
      />
    </div>
  );
}
