'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card } from 'react-bootstrap';
import { fetchPriceData } from '@/lib/price-history-client';

// 상급 아비도스 융화재료 ID
const PREMIUM_ABIDOS_FUSION_ID = '6861013';
const PREMIUM_ABIDOS_FUSION_ICON = '/abidos-fusion2.webp';

// 제작 재료 정보 (가격은 API에서 가져옴)
const CRAFTING_MATERIALS_BASE = [
  { id: '6884308', name: '아비도스 목재', quantity: 43, icon: '/wood1.webp' },
  { id: '6882304', name: '부드러운 목재', quantity: 59, icon: '/wood2.webp' },
  { id: '6882301', name: '목재', quantity: 112, icon: '/wood3.webp' },
];

const CRAFTING_GOLD_COST = 520;
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
  const [craftingFeeReduction, setCraftingFeeReduction] = useState<number>(0); // 제작 수수료 감소 %
  const [marketPrice, setMarketPrice] = useState<number>(0);
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice>({});
  const [isLoading, setIsLoading] = useState(true);

  // 상급 아비도스 융화재료가 선택되었을 때만 가격 가져오기
  useEffect(() => {
    if (selectedItemId !== PREMIUM_ABIDOS_FUSION_ID) {
      setIsLoading(false);
      return;
    }

    const fetchAllPrices = async () => {
      try {
        setIsLoading(true);

        // 1. 상급 아비도스 융화재료 가격 가져오기
        const { latest } = await fetchPriceData();
        const fusionPrice = latest[PREMIUM_ABIDOS_FUSION_ID];
        if (fusionPrice) {
          setMarketPrice(fusionPrice);
        }

        // 2. 목재 재료들 가격 가져오기 (batch API 사용)
        const materialIds = CRAFTING_MATERIALS_BASE.map(m => m.id);
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

  // 재료 정보에 가격 추가
  const craftingMaterials = useMemo(() => {
    return CRAFTING_MATERIALS_BASE.map(material => ({
      ...material,
      pricePer100: materialPrices[material.id] || 0,
    }));
  }, [materialPrices]);

  // 제작 비용 계산 (제작 수수료 감소 적용)
  const { craftingCost, materialCost, actualGoldCost } = useMemo(() => {
    let matCost = 0;
    craftingMaterials.forEach(material => {
      const unitPrice = material.pricePer100 / 100;
      matCost += material.quantity * unitPrice;
    });
    // 제작 수수료 감소 적용
    const goldCost = CRAFTING_GOLD_COST * (1 - craftingFeeReduction / 100);
    return {
      craftingCost: matCost + goldCost,
      materialCost: matCost,
      actualGoldCost: goldCost
    };
  }, [craftingFeeReduction, craftingMaterials]);

  // 개당 제작 비용
  const costPerUnit = craftingCost / OUTPUT_QUANTITY;

  // 직접 사용 시 이득 (수수료 없음)
  const directUseProfit = marketPrice - costPerUnit;
  const directUseProfitDisplay = Math.round(directUseProfit * 10) / 10; // 소수점 1자리 (표시 및 계산용)
  const directUseProfitPercent = costPerUnit > 0 ? (directUseProfit / costPerUnit) * 100 : 0;
  const isDirectUseProfit = directUseProfit > 0;

  // 판매 시 이득 (5% 수수료 고정)
  const SALE_FEE_PERCENT = 5;
  const netPriceAfterFee = marketPrice * (1 - SALE_FEE_PERCENT / 100);
  const saleProfit = netPriceAfterFee - costPerUnit;
  const saleProfitDisplay = Math.round(saleProfit * 10) / 10; // 소수점 1자리 (표시 및 계산용)
  const saleProfitPercent = costPerUnit > 0 ? (saleProfit / costPerUnit) * 100 : 0;
  const isSaleProfit = saleProfit > 0;

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
      {/* 데스크톱 */}
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
            제작 손익 계산기
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
                {craftingMaterials.map((material, idx) => (
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
                      {craftingFeeReduction > 0 && (
                        <span style={{ color: '#10b981', fontSize: '0.85rem', marginLeft: '6px' }}>(-{craftingFeeReduction}%)</span>
                      )}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem' }}>
                    {craftingFeeReduction > 0 ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '8px', fontSize: '0.85rem' }}>{CRAFTING_GOLD_COST}</span>
                        {Math.round(actualGoldCost).toLocaleString()} G
                      </>
                    ) : (
                      `${CRAFTING_GOLD_COST.toLocaleString()} G`
                    )}
                  </span>
                </div>
                <hr style={{ margin: '14px 0', borderColor: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>총 제작 비용</span>
                  <span style={{ color: '#c2410c', fontWeight: '700', fontSize: '1.2rem' }}>{Math.round(craftingCost).toLocaleString()} G</span>
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
                    <span style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>{marketPrice.toLocaleString()} G</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>개당 제작 비용</span>
                    <span style={{ fontSize: '1.6rem', color: '#c2410c', fontWeight: '700' }}>{costPerUnit.toFixed(1)} G</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                    제작 수수료 감소 (%)
                  </label>
                  <input
                    type="number"
                    value={craftingFeeReduction || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setCraftingFeeReduction(val);
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
                    border: `2px solid ${isDirectUseProfit ? '#10b981' : '#ef4444'}`,
                    padding: '16px 20px',
                    backgroundColor: isDirectUseProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
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
                      <div style={{ fontSize: '1.8rem', color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {isDirectUseProfit ? '+' : ''}{directUseProfitPercent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.95rem', color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        개당 {isDirectUseProfit ? '+' : ''}{directUseProfitDisplay} G
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>400개: <span style={{ color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isDirectUseProfit ? '+' : ''}{Math.round(directUseProfitDisplay * 400).toLocaleString()} G</span></span>
                    <span style={{ marginLeft: '16px' }}>대성공 420개: <span style={{ color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isDirectUseProfit ? '+' : ''}{Math.round(directUseProfitDisplay * 420).toLocaleString()} G</span></span>
                  </div>
                </div>

                {/* 판매 시 */}
                <div
                  style={{
                    borderRadius: '14px',
                    border: `2px solid ${isSaleProfit ? '#10b981' : '#ef4444'}`,
                    padding: '16px 20px',
                    backgroundColor: isSaleProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        판매 시
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        판매 수수료 5% ({netPriceAfterFee.toFixed(1)} G)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {isSaleProfit ? '+' : ''}{saleProfitPercent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.95rem', color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        개당 {isSaleProfit ? '+' : ''}{saleProfitDisplay} G
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>400개: <span style={{ color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isSaleProfit ? '+' : ''}{Math.round(saleProfitDisplay * 400).toLocaleString()} G</span></span>
                    <span style={{ marginLeft: '16px' }}>대성공 420개: <span style={{ color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isSaleProfit ? '+' : ''}{Math.round(saleProfitDisplay * 420).toLocaleString()} G</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 모바일 */}
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
            제작 손익 계산기
          </h5>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {getTodayPriceDate()}
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="row g-3">
            {/* 첫째 줄: 제작 비용 + 거래소 정보 */}
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
                {craftingMaterials.map((material, idx) => (
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
                    {Math.round(actualGoldCost).toLocaleString()}G
                  </span>
                </div>
                <hr style={{ margin: '8px 0', borderColor: 'var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>총 비용</span>
                  <span style={{ color: '#c2410c', fontWeight: '700' }}>{Math.round(craftingCost).toLocaleString()}G</span>
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
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>{marketPrice.toLocaleString()}G</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>개당 제작비</span>
                    <span style={{ fontSize: '1.1rem', color: '#c2410c', fontWeight: '700' }}>{costPerUnit.toFixed(1)}G</span>
                  </div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    제작 수수료 감소 (%)
                  </label>
                  <input
                    type="number"
                    value={craftingFeeReduction || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setCraftingFeeReduction(val);
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

            {/* 둘째 줄: 직접 사용 + 판매 결과 */}
            {/* 직접 사용 시 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${isDirectUseProfit ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  backgroundColor: isDirectUseProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
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
                    <div style={{ fontSize: '1.3rem', color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {isDirectUseProfit ? '+' : ''}{directUseProfitPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      개당 {isDirectUseProfit ? '+' : ''}{directUseProfitDisplay} G
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div>400개: <span style={{ color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isDirectUseProfit ? '+' : ''}{Math.round(directUseProfitDisplay * 400).toLocaleString()} G</span></div>
                  <div>대성공 420개: <span style={{ color: isDirectUseProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isDirectUseProfit ? '+' : ''}{Math.round(directUseProfitDisplay * 420).toLocaleString()} G</span></div>
                </div>
              </div>
            </div>

            {/* 판매 시 - 모바일 */}
            <div className="col-6">
              <div
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${isSaleProfit ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  backgroundColor: isSaleProfit ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                      판매 시
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      수수료 5% ({netPriceAfterFee.toFixed(1)} G)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {isSaleProfit ? '+' : ''}{saleProfitPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      개당 {isSaleProfit ? '+' : ''}{saleProfitDisplay} G
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <div>400개: <span style={{ color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isSaleProfit ? '+' : ''}{Math.round(saleProfitDisplay * 400).toLocaleString()} G</span></div>
                  <div>대성공 420개: <span style={{ color: isSaleProfit ? '#10b981' : '#ef4444', fontWeight: '600' }}>{isSaleProfit ? '+' : ''}{Math.round(saleProfitDisplay * 420).toLocaleString()} G</span></div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
