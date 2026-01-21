'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchPriceData } from '@/lib/price-history-client';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';

type LatestPrices = Record<string, number>;
type UnitPrices = { [itemId: number]: number };

interface PriceContextType {
  latestPrices: LatestPrices;
  unitPrices: UnitPrices;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

interface PriceProviderProps {
  children: ReactNode;
}

export function PriceProvider({ children }: PriceProviderProps) {
  const [latestPrices, setLatestPrices] = useState<LatestPrices>({});
  const [unitPrices, setUnitPrices] = useState<UnitPrices>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { latest } = await fetchPriceData();
      setLatestPrices(latest);

      // 개당 가격 계산
      const calculatedUnitPrices: UnitPrices = {};
      Object.entries(MATERIAL_IDS).forEach(([, itemId]) => {
        const bundlePrice = latest[String(itemId)] || 0;
        const bundleSize = MATERIAL_BUNDLE_SIZES[itemId] || 1;
        calculatedUnitPrices[itemId] = bundlePrice / bundleSize;
      });
      setUnitPrices(calculatedUnitPrices);
    } catch (err) {
      console.error('Failed to fetch price data:', err);
      setError('가격 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const value: PriceContextType = {
    latestPrices,
    unitPrices,
    loading,
    error,
    refetch: fetchPrices
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePriceData(): PriceContextType {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceData must be used within a PriceProvider');
  }
  return context;
}
