
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
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('fusion');
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categoryItems = getItemsByCategory(selectedCategory);
    if (categoryItems.length > 0) {
      setSelectedItem(categoryItems[0]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const fusionItems = getItemsByCategory('fusion');
    if (fusionItems.length > 0 && !selectedItem) {
      setSelectedItem(fusionItems[0]);
    }
  }, []);

  useEffect(() => {
    if (!selectedItem?.id) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/market/price-history/${selectedItem.id}`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        } else {
          console.error('Failed to fetch price history:', response.status);
          setHistory([]);
        }
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
