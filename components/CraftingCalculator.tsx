'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card } from 'react-bootstrap';
import { fetchPriceData } from '@/lib/price-history-client';

// 상급 아비도스 융화재료 ID
const PREMIUM_ABIDOS_FUSION_ID = '6861013';
const PREMIUM_ABIDOS_FUSION_ICON = '/abidos-fusion2.webp';

// 아비도스 융화재료 ID
const ABIDOS_FUSION_ID = '6861012';
const ABIDOS_FUSION_ICON = '/abidos-fusion.webp';

// 상급 아비도스 융화재료 제작 재료 정보
const PREMIUM_CRAFTING_MATERIALS_BASE = [
  { id: '6884308', name: '아비도스 목재', quantity: 43, icon: '/wood1.webp' },
  { id: '6882304', name: '부드러운 목재', quantity: 59, icon: '/wood2.webp' },
  { id: '6882301', name: '목재', quantity: 112, icon: '/wood3.webp' },
];

// 아비도스 융화재료 제작 재료 정보
const NORMAL_CRAFTING_MATERIALS_BASE = [
  { id: '6884308', name: '아비도스 목재', quantity: 33, icon: '/wood1.webp' },
  { id: '6882304', name: '부드러운 목재', quantity: 45, icon: '/wood2.webp' },
  { id: '6882301', name: '목재', quantity: 86, icon: '/wood3.webp' },
];

const PREMIUM_CRAFTING_GOLD_COST = 520;
const NORMAL_CRAFTING_GOLD_COST = 400;
const OUTPUT_QUANTITY = 10;

// 오늘 날짜를 "YYYY년 M월 D일 평균 거래가" 형식으로 반환
const getTodayPriceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 평균 거래가`;
};

type MaterialPrice = {
  [key: string]: number; // itemId -> 100개 묶음 가격
};

type CraftingCalculatorProps = {
  selectedItemId: string | null;
};

export default function CraftingCalculator({ selectedItemId }: CraftingCalculatorProps) {
  // 상급 아비도스 융화재료 state
  const [premiumCraftingFeeReduction, setPremiumCraftingFeeReduction] = useState<number>(0);
  const [premiumMarketPrice, setPremiumMarketPrice] = useState<number>(0);
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice>({});
  const [isLoading, setIsLoading] = useState(true);

  // 일반 아비도스 융화재료 state
  const [normalCraftingFeeReduction, setNormalCraftingFeeReduction] = useState<number>(0);
  const [normalMarketPrice, setNormalMarketPrice] = useState<number>(0);

  // 상급 아비도스 융화재료가 선택되었을 때만 가격 가져오기
  useEffect(() => {
    if (selectedItemId !== PREMIUM_ABIDOS_FUSION_ID) {
      setIsLoading(false);
      return;
    }

    const fetchAllPrices = async () => {
      try {
        setIsLoading(true);

        // 1. 상급 아비도스 융화재료 + 일반 아비도스 융화재료 가격 가져오기
        const { latest } = await fetchPriceData();
        const premiumFusionPrice = latest[PREMIUM_ABIDOS_FUSION_ID];
        const normalFusionPrice = latest[ABIDOS_FUSION_ID];
        if (premiumFusionPrice) {
          setPremiumMarketPrice(premiumFusionPrice);
        }
        if (normalFusionPrice) {
          setNormalMarketPrice(normalFusionPrice);
        }

        // 2. 목재 재료들 가격 가져오기 (batch API 사용)
        const materialIds = PREMIUM_CRAFTING_MATERIALS_BASE.map(m => m.id);
        const response = await fetch('/api/market/batch-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: materialIds }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.prices) {
            const prices: MaterialPrice = {};
            data.prices.forEach((item: { itemId: string; price: number }) => {
              // API에서 받은 가격은 100개 묶음 가격
              prices[item.itemId] = item.price;
            });
            setMaterialPrices(prices);
          }
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPrices();
  }, [selectedItemId]);

  // 상급 아비도스 융화재료 - 재료 정보에 가격 추가
  const premiumCraftingMaterials = useMemo(() => {
    return PREMIUM_CRAFTING_MATERIALS_BASE.map(material => ({
      ...material,
      pricePer100: materialPrices[material.id] || 0,
    }));
  }, [materialPrices]);

  // 일반 아비도스 융화재료 - 재료 정보에 가격 추가
  const normalCraftingMaterials = useMemo(() => {
    return NORMAL_CRAFTING_MATERIALS_BASE.map(material => ({
      ...material,
      pricePer100: materialPrices[material.id] || 0,
    }));
  }, [materialPrices]);

  // 상급 아비도스 융화재료 - 제작 비용 계산
  const { premiumCraftingCost, premiumActualGoldCost } = useMemo(() => {
    let matCost = 0;
    premiumCraftingMaterials.forEach(material => {
      const unitPrice = material.pricePer100 / 100;
      matCost += material.quantity * unitPrice;
    });
    const goldCost = PREMIUM_CRAFTING_GOLD_COST * (1 - premiumCraftingFeeReduction / 100);
    return {
      premiumCraftingCost: matCost + goldCost,
      premiumActualGoldCost: goldCost
    };
  }, [premiumCraftingFeeReduction, premiumCraftingMaterials]);

  // 일반 아비도스 융화재료 - 제작 비용 계산
  const { normalCraftingCost, normalActualGoldCost } = useMemo(() => {
    let matCost = 0;
    normalCraftingMaterials.forEach(material => {
      const unitPrice = material.pricePer100 / 100;
      matCost += material.quantity * unitPrice;
    });
    const goldCost = NORMAL_CRAFTING_GOLD_COST * (1 - normalCraftingFeeReduction / 100);
    return {
      normalCraftingCost: matCost + goldCost,
      normalActualGoldCost: goldCost
    };
  }, [normalCraftingFeeReduction, normalCraftingMaterials]);

  // 상급 아비도스 융화재료 - 개당 제작 비용
  const premiumCostPerUnit = premiumCraftingCost / OUTPUT_QUANTITY;

  // 상급 아비도스 융화재료 - 직접 사용 시 이득
  const premiumDirectUseProfit = premiumMarketPrice - premiumCostPerUnit;
  const premiumDirectUseProfitDisplay = Math.round(premiumDirectUseProfit * 10) / 10;
  const premiumDirectUseProfitPercent = premiumCostPerUnit > 0 ? (premiumDirectUseProfit / premiumCostPerUnit) * 100 : 0;
  const isPremiumDirectUseProfit = premiumDirectUseProfit > 0;

  // 상급 아비도스 융화재료 - 판매 시 이득 (5% 수수료)
  const SALE_FEE_PERCENT = 5;
  const premiumNetPriceAfterFee = premiumMarketPrice * (1 - SALE_FEE_PERCENT / 100);
  const premiumSaleProfit = premiumNetPriceAfterFee - premiumCostPerUnit;
  const premiumSaleProfitDisplay = Math.round(premiumSaleProfit * 10) / 10;
  const premiumSaleProfitPercent = premiumCostPerUnit > 0 ? (premiumSaleProfit / premiumCostPerUnit) * 100 : 0;
  const isPremiumSaleProfit = premiumSaleProfit > 0;

  // 일반 아비도스 융화재료 - 개당 제작 비용
  const normalCostPerUnit = normalCraftingCost / OUTPUT_QUANTITY;

  // 일반 아비도스 융화재료 - 직접 사용 시 이득
  const normalDirectUseProfit = normalMarketPrice - normalCostPerUnit;
  const normalDirectUseProfitDisplay = Math.round(normalDirectUseProfit * 10) / 10;
  const normalDirectUseProfitPercent = normalCostPerUnit > 0 ? (normalDirectUseProfit / normalCostPerUnit) * 100 : 0;
  const isNormalDirectUseProfit = normalDirectUseProfit > 0;

  // 일반 아비도스 융화재료 - 판매 시 이득 (5% 수수료)
  const normalNetPriceAfterFee = normalMarketPrice * (1 - SALE_FEE_PERCENT / 100);
  const normalSaleProfit = normalNetPriceAfterFee - normalCostPerUnit;
  const normalSaleProfitDisplay = Math.round(normalSaleProfit * 10) / 10;
  const normalSaleProfitPercent = normalCostPerUnit > 0 ? (normalSaleProfit / normalCostPerUnit) * 100 : 0;
  const isNormalSaleProfit = normalSaleProfit > 0;

  // 상급 아비도스 융화재료가 아니면 렌더링하지 않음
  if (selectedItemId !== PREMIUM_ABIDOS_FUSION_ID) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg mt-3" style={{ borderRadius: '16px', background: 'var(--card-body-bg-stone)', maxWidth: '1400px', margin: '16px auto 0' }}>
        <Card.Body className="text-center py-4">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">로딩중...</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      {/* ========== 상급 아비도스 융화재료 - 데스크톱 ========== */}
      <Card className="border-0 shadow-lg mt-3 d-none d-md-block" style={{ borderRadius: '16px', background: 'var(--card-body-bg-stone)', color: 'var(--text-primary)', maxWidth: '1400px', margin: '16px auto 0', overflow: 'hidden' }}>
        <Card.Header
          className="text-center py-3 border-0"
          style={{
            background: 'var(--card-header-bg-stone)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h4
            className="mb-1"
            style={{
              fontWeight: '600',
              fontSize: '1.25rem',
              background: 'var(--gradient-text-stone)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em'
            }}
          >
            상급 아비도스 융화재료 제작 손익
          </h4>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {getTodayPriceDate()}
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="row g-4">
            {/* 재료 비용 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  backgroundColor: 'transparent'
                }}
              >
                <h6 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="상급 아비도스 융화재료" width={32} height={32} style={{ borderRadius: '6px' }} />
                  제작 재료 (10개 기준)
                </h6>
                {premiumCraftingMaterials.map((material, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Image src={material.icon} alt={material.name} width={36} height={36} style={{ borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{material.name} x{material.quantity}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem' }}>
                      {Math.round(material.quantity * material.pricePer100 / 100).toLocaleString()} G
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Image src="/gold.webp" alt="골드" width={36} height={36} style={{ borderRadius: '6px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      제작 비용
                      {premiumCraftingFeeReduction > 0 && (
                        <span style={{ color: '#10b981', fontSize: '0.85rem', marginLeft: '6px' }}>(-{premiumCraftingFeeReduction}%)</span>
                      )}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem' }}>
                    {premiumCraftingFeeReduction > 0 ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '8px', fontSize: '0.85rem' }}>{PREMIUM_CRAFTING_GOLD_COST}</span>
                        {Math.round(premiumActualGoldCost).toLocaleString()} G
                      </>
                    ) : (
                      `${PREMIUM_CRAFTING_GOLD_COST.toLocaleString()} G`
                    )}
                  </span>
                </div>
                <hr style={{ margin: '14px 0', borderColor: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>총 제작 비용</span>
                  <span style={{ color: '#c2410c', fontWeight: '700', fontSize: '1.2rem' }}>{Math.round(premiumCraftingCost).toLocaleString()} G</span>
                </div>
              </div>
            </div>

            {/* 거래소 정보 & 제작 수수료 감소 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  backgroundColor: 'transparent',
                  height: '100%'
                }}
              >
                <h6 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="상급 아비도스 융화재료" width={32} height={32} style={{ borderRadius: '6px' }} />
                  거래소 정보
                </h6>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>현재 거래소 가격</span>
                    <span style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>{premiumMarketPrice.toLocaleString()} G</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>개당 제작 비용</span>
                    <span style={{ fontSize: '1.6rem', color: '#c2410c', fontWeight: '700' }}>{premiumCostPerUnit.toFixed(1)} G</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                    제작 수수료 감소 (%)
                  </label>
                  <input
                    type="number"
                    value={premiumCraftingFeeReduction || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setPremiumCraftingFeeReduction(val);
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* 결과 - 직접 사용 & 판매 */}
            <div className="col-md-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                {/* 직접 사용 시 */}
                <div
                  style={{
                    borderRadius: '14px',
                    border: `2px solid ${isPremiumDirectUseProfit ? '#10b981' : '#ef4444'}`,
                    padding: '16px 20px',
                    backgroundColor: isPremiumDirectUseProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        직접 사용 시
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        판매 수수료 없음
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {isPremiumDirectUseProfit ? '+' : ''}{premiumDirectUseProfitPercent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.95rem', color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        개당 {isPremiumDirectUseProfit ? '+' : ''}{premiumDirectUseProfitDisplay} G
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>400개: <span style={{ color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumDirectUseProfit ? '+' : ''}{Math.round(premiumDirectUseProfitDisplay * 400).toLocaleString()} G</span></span>
                    <span style={{ marginLeft: '16px' }}>대성공 420개: <span style={{ color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumDirectUseProfit ? '+' : ''}{Math.round(premiumDirectUseProfitDisplay * 420).toLocaleString()} G</span></span>
                  </div>
                </div>

                {/* 판매 시 */}
                <div
                  style={{
                    borderRadius: '14px',
                    border: `2px solid ${isPremiumSaleProfit ? '#10b981' : '#ef4444'}`,
                    padding: '16px 20px',
                    backgroundColor: isPremiumSaleProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        판매 시
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        판매 수수료 5% ({premiumNetPriceAfterFee.toFixed(1)} G)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {isPremiumSaleProfit ? '+' : ''}{premiumSaleProfitPercent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.95rem', color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        개당 {isPremiumSaleProfit ? '+' : ''}{premiumSaleProfitDisplay} G
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>400개: <span style={{ color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumSaleProfit ? '+' : ''}{Math.round(premiumSaleProfitDisplay * 400).toLocaleString()} G</span></span>
                    <span style={{ marginLeft: '16px' }}>대성공 420개: <span style={{ color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumSaleProfit ? '+' : ''}{Math.round(premiumSaleProfitDisplay * 420).toLocaleString()} G</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ========== 상급 아비도스 융화재료 - 모바일 ========== */}
      <Card className="border-0 shadow-lg mt-2 d-md-none" style={{ borderRadius: '12px', background: 'var(--card-body-bg-stone)', color: 'var(--text-primary)', overflow: 'hidden' }}>
        <Card.Header
          className="text-center py-2 border-0"
          style={{
            background: 'var(--card-header-bg-stone)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h5
            className="mb-1"
            style={{
              fontWeight: '600',
              fontSize: '1rem',
              background: 'var(--gradient-text-stone)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em'
            }}
          >
            상급 아비도스 융화재료 제작 손익
          </h5>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {getTodayPriceDate()}
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="row g-3">
            {/* 제작 비용 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  height: '100%'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="" width={20} height={20} style={{ borderRadius: '4px' }} />
                  제작 재료 (10개)
                </div>
                {premiumCraftingMaterials.map((material, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Image src={material.icon} alt={material.name} width={20} height={20} style={{ borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>x{material.quantity}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {Math.round(material.quantity * material.pricePer100 / 100).toLocaleString()}G
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Image src="/gold.webp" alt="골드" width={20} height={20} style={{ borderRadius: '4px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>제작비</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {Math.round(premiumActualGoldCost).toLocaleString()}G
                  </span>
                </div>
                <hr style={{ margin: '8px 0', borderColor: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>총 비용</span>
                  <span style={{ color: '#c2410c', fontWeight: '700' }}>{Math.round(premiumCraftingCost).toLocaleString()}G</span>
                </div>
              </div>
            </div>

            {/* 거래소 정보 + 수수료 감소 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="" width={20} height={20} style={{ borderRadius: '4px' }} />
                  거래소 정보
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>현재가</span>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>{premiumMarketPrice.toLocaleString()}G</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>개당 제작비</span>
                    <span style={{ fontSize: '1.1rem', color: '#c2410c', fontWeight: '700' }}>{premiumCostPerUnit.toFixed(1)}G</span>
                  </div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    제작 수수료 감소 (%)
                  </label>
                  <input
                    type="number"
                    value={premiumCraftingFeeReduction || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setPremiumCraftingFeeReduction(val);
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* 직접 사용 시 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${isPremiumDirectUseProfit ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  backgroundColor: isPremiumDirectUseProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      직접 사용 시
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      판매 수수료 없음
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {isPremiumDirectUseProfit ? '+' : ''}{premiumDirectUseProfitPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      개당 {isPremiumDirectUseProfit ? '+' : ''}{premiumDirectUseProfitDisplay} G
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div>400개: <span style={{ color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumDirectUseProfit ? '+' : ''}{Math.round(premiumDirectUseProfitDisplay * 400).toLocaleString()} G</span></div>
                  <div>대성공 420개: <span style={{ color: isPremiumDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumDirectUseProfit ? '+' : ''}{Math.round(premiumDirectUseProfitDisplay * 420).toLocaleString()} G</span></div>
                </div>
              </div>
            </div>

            {/* 판매 시 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${isPremiumSaleProfit ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  backgroundColor: isPremiumSaleProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      판매 시
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      수수료 5% ({premiumNetPriceAfterFee.toFixed(1)} G)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {isPremiumSaleProfit ? '+' : ''}{premiumSaleProfitPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      개당 {isPremiumSaleProfit ? '+' : ''}{premiumSaleProfitDisplay} G
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div>400개: <span style={{ color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumSaleProfit ? '+' : ''}{Math.round(premiumSaleProfitDisplay * 400).toLocaleString()} G</span></div>
                  <div>대성공 420개: <span style={{ color: isPremiumSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isPremiumSaleProfit ? '+' : ''}{Math.round(premiumSaleProfitDisplay * 420).toLocaleString()} G</span></div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ========== 아비도스 융화재료 - 데스크톱 ========== */}
      <Card className="border-0 shadow-lg mt-3 d-none d-md-block" style={{ borderRadius: '16px', background: 'var(--card-body-bg-stone)', color: 'var(--text-primary)', maxWidth: '1400px', margin: '16px auto 0', overflow: 'hidden' }}>
        <Card.Header
          className="text-center py-3 border-0"
          style={{
            background: 'var(--card-header-bg-stone)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h4
            className="mb-1"
            style={{
              fontWeight: '600',
              fontSize: '1.25rem',
              background: 'var(--gradient-text-stone)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em'
            }}
          >
            아비도스 융화재료 제작 손익
          </h4>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {getTodayPriceDate()}
          </div>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="row g-4">
            {/* 재료 비용 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  backgroundColor: 'transparent'
                }}
              >
                <h6 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Image src={ABIDOS_FUSION_ICON} alt="아비도스 융화재료" width={32} height={32} style={{ borderRadius: '6px' }} />
                  제작 재료 (10개 기준)
                </h6>
                {normalCraftingMaterials.map((material, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Image src={material.icon} alt={material.name} width={36} height={36} style={{ borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{material.name} x{material.quantity}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem' }}>
                      {Math.round(material.quantity * material.pricePer100 / 100).toLocaleString()} G
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Image src="/gold.webp" alt="골드" width={36} height={36} style={{ borderRadius: '6px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      제작 비용
                      {normalCraftingFeeReduction > 0 && (
                        <span style={{ color: '#10b981', fontSize: '0.85rem', marginLeft: '6px' }}>(-{normalCraftingFeeReduction}%)</span>
                      )}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem' }}>
                    {normalCraftingFeeReduction > 0 ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '8px', fontSize: '0.85rem' }}>{NORMAL_CRAFTING_GOLD_COST}</span>
                        {Math.round(normalActualGoldCost).toLocaleString()} G
                      </>
                    ) : (
                      `${NORMAL_CRAFTING_GOLD_COST.toLocaleString()} G`
                    )}
                  </span>
                </div>
                <hr style={{ margin: '14px 0', borderColor: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>총 제작 비용</span>
                  <span style={{ color: '#c2410c', fontWeight: '700', fontSize: '1.2rem' }}>{Math.round(normalCraftingCost).toLocaleString()} G</span>
                </div>
              </div>
            </div>

            {/* 거래소 정보 & 제작 수수료 감소 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  backgroundColor: 'transparent',
                  height: '100%'
                }}
              >
                <h6 style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Image src={ABIDOS_FUSION_ICON} alt="아비도스 융화재료" width={32} height={32} style={{ borderRadius: '6px' }} />
                  거래소 정보
                </h6>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>현재 거래소 가격</span>
                    <span style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>{normalMarketPrice.toLocaleString()} G</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>개당 제작 비용</span>
                    <span style={{ fontSize: '1.6rem', color: '#c2410c', fontWeight: '700' }}>{normalCostPerUnit.toFixed(1)} G</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                    제작 수수료 감소 (%)
                  </label>
                  <input
                    type="number"
                    value={normalCraftingFeeReduction || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setNormalCraftingFeeReduction(val);
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* 결과 - 직접 사용 & 판매 */}
            <div className="col-md-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                {/* 직접 사용 시 */}
                <div
                  style={{
                    borderRadius: '14px',
                    border: `2px solid ${isNormalDirectUseProfit ? '#10b981' : '#ef4444'}`,
                    padding: '16px 20px',
                    backgroundColor: isNormalDirectUseProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        직접 사용 시
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        판매 수수료 없음
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {isNormalDirectUseProfit ? '+' : ''}{normalDirectUseProfitPercent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.95rem', color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        개당 {isNormalDirectUseProfit ? '+' : ''}{normalDirectUseProfitDisplay} G
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>400개: <span style={{ color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalDirectUseProfit ? '+' : ''}{Math.round(normalDirectUseProfitDisplay * 400).toLocaleString()} G</span></span>
                    <span style={{ marginLeft: '16px' }}>대성공 420개: <span style={{ color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalDirectUseProfit ? '+' : ''}{Math.round(normalDirectUseProfitDisplay * 420).toLocaleString()} G</span></span>
                  </div>
                </div>

                {/* 판매 시 */}
                <div
                  style={{
                    borderRadius: '14px',
                    border: `2px solid ${isNormalSaleProfit ? '#10b981' : '#ef4444'}`,
                    padding: '16px 20px',
                    backgroundColor: isNormalSaleProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        판매 시
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        판매 수수료 5% ({normalNetPriceAfterFee.toFixed(1)} G)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {isNormalSaleProfit ? '+' : ''}{normalSaleProfitPercent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.95rem', color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        개당 {isNormalSaleProfit ? '+' : ''}{normalSaleProfitDisplay} G
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>400개: <span style={{ color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalSaleProfit ? '+' : ''}{Math.round(normalSaleProfitDisplay * 400).toLocaleString()} G</span></span>
                    <span style={{ marginLeft: '16px' }}>대성공 420개: <span style={{ color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalSaleProfit ? '+' : ''}{Math.round(normalSaleProfitDisplay * 420).toLocaleString()} G</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ========== 아비도스 융화재료 - 모바일 ========== */}
      <Card className="border-0 shadow-lg mt-2 d-md-none" style={{ borderRadius: '12px', background: 'var(--card-body-bg-stone)', color: 'var(--text-primary)', overflow: 'hidden' }}>
        <Card.Header
          className="text-center py-2 border-0"
          style={{
            background: 'var(--card-header-bg-stone)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h5
            className="mb-1"
            style={{
              fontWeight: '600',
              fontSize: '1rem',
              background: 'var(--gradient-text-stone)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em'
            }}
          >
            아비도스 융화재료 제작 손익
          </h5>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {getTodayPriceDate()}
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="row g-3">
            {/* 제작 비용 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  height: '100%'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Image src={ABIDOS_FUSION_ICON} alt="" width={20} height={20} style={{ borderRadius: '4px' }} />
                  제작 재료 (10개)
                </div>
                {normalCraftingMaterials.map((material, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Image src={material.icon} alt={material.name} width={20} height={20} style={{ borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>x{material.quantity}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {Math.round(material.quantity * material.pricePer100 / 100).toLocaleString()}G
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Image src="/gold.webp" alt="골드" width={20} height={20} style={{ borderRadius: '4px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>제작비</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {Math.round(normalActualGoldCost).toLocaleString()}G
                  </span>
                </div>
                <hr style={{ margin: '8px 0', borderColor: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>총 비용</span>
                  <span style={{ color: '#c2410c', fontWeight: '700' }}>{Math.round(normalCraftingCost).toLocaleString()}G</span>
                </div>
              </div>
            </div>

            {/* 거래소 정보 + 수수료 감소 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Image src={ABIDOS_FUSION_ICON} alt="" width={20} height={20} style={{ borderRadius: '4px' }} />
                  거래소 정보
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>현재가</span>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>{normalMarketPrice.toLocaleString()}G</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>개당 제작비</span>
                    <span style={{ fontSize: '1.1rem', color: '#c2410c', fontWeight: '700' }}>{normalCostPerUnit.toFixed(1)}G</span>
                  </div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    제작 수수료 감소 (%)
                  </label>
                  <input
                    type="number"
                    value={normalCraftingFeeReduction || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setNormalCraftingFeeReduction(val);
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* 직접 사용 시 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${isNormalDirectUseProfit ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  backgroundColor: isNormalDirectUseProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      직접 사용 시
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      판매 수수료 없음
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {isNormalDirectUseProfit ? '+' : ''}{normalDirectUseProfitPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      개당 {isNormalDirectUseProfit ? '+' : ''}{normalDirectUseProfitDisplay} G
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div>400개: <span style={{ color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalDirectUseProfit ? '+' : ''}{Math.round(normalDirectUseProfitDisplay * 400).toLocaleString()} G</span></div>
                  <div>대성공 420개: <span style={{ color: isNormalDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalDirectUseProfit ? '+' : ''}{Math.round(normalDirectUseProfitDisplay * 420).toLocaleString()} G</span></div>
                </div>
              </div>
            </div>

            {/* 판매 시 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${isNormalSaleProfit ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  backgroundColor: isNormalSaleProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      판매 시
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      수수료 5% ({normalNetPriceAfterFee.toFixed(1)} G)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {isNormalSaleProfit ? '+' : ''}{normalSaleProfitPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      개당 {isNormalSaleProfit ? '+' : ''}{normalSaleProfitDisplay} G
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div>400개: <span style={{ color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalSaleProfit ? '+' : ''}{Math.round(normalSaleProfitDisplay * 400).toLocaleString()} G</span></div>
                  <div>대성공 420개: <span style={{ color: isNormalSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isNormalSaleProfit ? '+' : ''}{Math.round(normalSaleProfitDisplay * 420).toLocaleString()} G</span></div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
