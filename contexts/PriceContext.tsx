'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { fetchLatestPrices } from '@/lib/price-history-client';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';

type LatestPrices = Record<string, number>;
type UnitPrices = { [itemId: number]: number };

// 거래소에 직접 상장되지 않는 재화의 환산 단가.
// 교환 상자 구성품의 실시간 시세로 역산하므로 latest.json 이 갱신되면 같이 움직인다.
// 지평의 성당(/cathedral) · 세르카(/cerka) 페이지와 같은 식이다.

// 은총의 파편 1개 = 재련 재료 상자 구성 가치 합 ÷ 60
const GRACE_BOX = [
  { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL, amount: 2000 },
  { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL, amount: 4000 },
  { itemId: MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE, amount: 60 },
  { itemId: MATERIAL_IDS.FATE_FRAGMENT, amount: 22500 },
];
const GRACE_PER_BOX = 60;

// 고통의 가시 1개 = 고통의 재련 재료 상자 기댓값 ÷ 5 (25% 확률 4종)
const THORN_BOX = [
  { itemId: MATERIAL_IDS.FATE_FRAGMENT, amount: 6000, probability: 0.25 },
  { itemId: MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE, amount: 3, probability: 0.25 },
  { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL, amount: 100, probability: 0.25 },
  { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL, amount: 300, probability: 0.25 },
];
const THORN_PER_BOX = 5;

interface PriceContextType {
  latestPrices: LatestPrices;
  unitPrices: UnitPrices;
  /** 은총의 파편 1개 환산 가치 (실시간 시세 기준) */
  graceUnitPrice: number;
  /** 고통의 가시 1개 환산 가치 (실시간 시세 기준) */
  thornUnitPrice: number;
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
      const latest = await fetchLatestPrices();
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

  const graceUnitPrice = useMemo(
    () => GRACE_BOX.reduce((sum, c) => sum + (unitPrices[c.itemId] || 0) * c.amount, 0) / GRACE_PER_BOX,
    [unitPrices],
  );

  const thornUnitPrice = useMemo(
    () => THORN_BOX.reduce((sum, c) => sum + (unitPrices[c.itemId] || 0) * c.amount * c.probability, 0) / THORN_PER_BOX,
    [unitPrices],
  );

  const value: PriceContextType = {
    latestPrices,
    unitPrices,
    graceUnitPrice,
    thornUnitPrice,
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
