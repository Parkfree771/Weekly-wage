'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme } from '@/components/ThemeProvider';
import { fetchPriceData, getItemPriceHistory } from '@/lib/price-history-client';
import styles from './LifeMasterCalculator.module.css';

// 상급 아비도스 융화재료 ID
const PREMIUM_ABIDOS_FUSION_ID = '6861013';
const PREMIUM_ABIDOS_FUSION_ICON = '/abidos-fusion2.webp';

// 아비도스 융화재료 ID
const ABIDOS_FUSION_ID = '6861012';
const ABIDOS_FUSION_ICON = '/abidos-fusion.webp';

// 상급 아비도스 융화재료 제작 재료 정보
const PREMIUM_CRAFTING_MATERIALS_BASE = [
  { id: '6884308', name: '아비도스 목재', quantity: 43, icon: '/wood1.webp' },
  { id: '6882304', name: '부드러운 목재', quantity: 59, icon: '/wood3.webp' },
  { id: '6882301', name: '목재', quantity: 112, icon: '/wood2.webp' },
];

// 아비도스 융화재료 제작 재료 정보
const NORMAL_CRAFTING_MATERIALS_BASE = [
  { id: '6884308', name: '아비도스 목재', quantity: 33, icon: '/wood1.webp' },
  { id: '6882304', name: '부드러운 목재', quantity: 45, icon: '/wood3.webp' },
  { id: '6882301', name: '목재', quantity: 86, icon: '/wood2.webp' },
];

const PREMIUM_CRAFTING_GOLD_COST = 520;
const NORMAL_CRAFTING_GOLD_COST = 400;
const OUTPUT_QUANTITY = 10;
const SALE_FEE_PERCENT = 5;

// 소수점 버림 함수 (반올림 X)
const truncateDecimal = (value: number, decimals: number): string => {
  const multiplier = Math.pow(10, decimals);
  return (Math.floor(value * multiplier) / multiplier).toFixed(decimals);
};

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type MaterialPrice = {
  [key: string]: number;
};

type PeriodOption = '7d' | '1m' | 'all';

// 톱니바퀴 아이콘 SVG 컴포넌트
function GearIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// 차트 + 제작손익이 함께 있는 통합 컴포넌트
function ChartWithProfit({
  name,
  icon,
  history,
  loading,
  chartColor,
  currentPrice,
  bgColor,
  headerBgColor,
  craftingMaterials,
  craftingGoldCost,
  craftingFeeReduction,
  setCraftingFeeReduction,
  colorType,
  onRefreshPrices,
  isRefreshing,
  canRefresh,
  priceDate,
}: {
  name: string;
  icon: string;
  history: PriceEntry[];
  loading: boolean;
  chartColor: string;
  currentPrice: number;
  bgColor: string;
  headerBgColor: string;
  craftingMaterials: Array<{ id: string; name: string; quantity: number; icon: string; pricePer100: number }>;
  craftingGoldCost: number;
  craftingFeeReduction: number;
  setCraftingFeeReduction: (value: number) => void;
  colorType: 'orange' | 'stone';
  onRefreshPrices: () => void;
  isRefreshing: boolean;
  canRefresh: boolean;
  priceDate: string;
}) {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');

  // 제작 비용 계산
  const { craftingCost, actualGoldCost } = useMemo(() => {
    let matCost = 0;
    craftingMaterials.forEach(material => {
      const unitPrice = material.pricePer100 / 100;
      matCost += material.quantity * unitPrice;
    });
    const goldCost = craftingGoldCost * (1 - craftingFeeReduction / 100);
    return {
      craftingCost: matCost + goldCost,
      actualGoldCost: goldCost
    };
  }, [craftingFeeReduction, craftingMaterials, craftingGoldCost]);

  // 손익 계산
  const costPerUnit = craftingCost / OUTPUT_QUANTITY;
  const directUseProfit = currentPrice - costPerUnit;
  const directUseProfitDisplay = Math.round(directUseProfit * 10) / 10;
  const directUseProfitPercent = costPerUnit > 0 ? (directUseProfit / costPerUnit) * 100 : 0;
  const isDirectUseProfit = directUseProfit > 0;
  const netPriceAfterFee = currentPrice * (1 - SALE_FEE_PERCENT / 100);
  const saleProfit = netPriceAfterFee - costPerUnit;
  const saleProfitDisplay = Math.round(saleProfit * 10) / 10;
  const saleProfitPercent = costPerUnit > 0 ? (saleProfit / costPerUnit) * 100 : 0;
  const isSaleProfit = saleProfit > 0;

  // 기간에 따른 히스토리 필터링
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
    }

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [history, selectedPeriod]);

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    const dateMap = new Map<string, { 날짜: string; 가격: number; rawTime: number; fullDate: Date }>();
    filteredHistory.forEach((entry) => {
      let month: number, day: number, year: number;
      if (entry.date) {
        [year, month, day] = entry.date.split('-').map(Number);
      } else {
        const date = new Date(entry.timestamp);
        year = date.getUTCFullYear();
        month = date.getUTCMonth() + 1;
        day = date.getUTCDate();
      }
      const dateKey = `${month}/${day}`;
      const dateObj = new Date(Date.UTC(year, month - 1, day));

      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        rawTime: dateObj.getTime(),
        fullDate: dateObj,
      });
    });
    return Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);
  }, [filteredHistory]);

  // 통계 계산
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const prices = filteredHistory.map(h => h.price);
    const current = filteredHistory[filteredHistory.length - 1].price;
    return {
      current,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    };
  }, [filteredHistory]);

  // Y축 설정
  const yAxisConfig = useMemo(() => {
    if (!stats) return { domain: ['auto', 'auto'], ticks: [], avgValue: null };

    const priceRange = stats.max - stats.min;
    const avgPrice = stats.avg;
    const TARGET_TICK_COUNT = 7;

    let tickUnit = 1;
    if (stats.max >= 1000) {
      if (priceRange >= 500) tickUnit = 200;
      else if (priceRange >= 200) tickUnit = 100;
      else tickUnit = 50;
    } else if (stats.max >= 100) {
      if (priceRange >= 100) tickUnit = 50;
      else if (priceRange >= 50) tickUnit = 20;
      else tickUnit = 10;
    } else {
      if (priceRange >= 20) tickUnit = 10;
      else if (priceRange >= 10) tickUnit = 5;
      else tickUnit = 2;
    }

    const centerTick = avgPrice;
    const paddingRatio = 0.15;
    const padding = Math.max(priceRange * paddingRatio, tickUnit * 1.5);
    const minWithPadding = stats.min - padding;
    const maxWithPadding = stats.max + padding;

    const ticks = [centerTick];
    let currentTick = centerTick - tickUnit;
    while (currentTick >= minWithPadding && ticks.length < TARGET_TICK_COUNT) {
      ticks.unshift(currentTick);
      currentTick -= tickUnit;
    }
    currentTick = centerTick + tickUnit;
    while (currentTick <= maxWithPadding && ticks.length < TARGET_TICK_COUNT) {
      ticks.push(currentTick);
      currentTick += tickUnit;
    }

    const minTick = ticks[0];
    const maxTick = ticks[ticks.length - 1];
    const tickGap = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 0;
    const buffer = tickGap * 0.05;

    return {
      domain: [minTick - (buffer || 0.1), maxTick + (buffer || 0.1)],
      ticks,
      avgValue: centerTick
    };
  }, [stats]);

  // 전일 대비 변동률
  const changeRate = useMemo(() => {
    if (chartData.length < 2) return 0;
    const today = chartData[chartData.length - 1].가격;
    const yesterday = chartData[chartData.length - 2].가격;
    return ((today - yesterday) / yesterday) * 100;
  }, [chartData]);

  // X축 틱 계산
  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    if (chartData.length === 1) return [chartData[0].날짜];

    let interval: number;
    switch (selectedPeriod) {
      case '7d': interval = 1; break;
      case '1m': interval = 3; break;
      case 'all': interval = 7; break;
      default: interval = 1;
    }

    const ticks: string[] = [];
    const tickSet = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDate = chartData[0].fullDate;
    let currentDate = new Date(today);

    while (currentDate >= firstDate) {
      const dateKey = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      const hasData = chartData.some(d => d.날짜 === dateKey);
      if (hasData && !tickSet.has(dateKey)) {
        ticks.push(dateKey);
        tickSet.add(dateKey);
      }
      currentDate.setDate(currentDate.getDate() - interval);
    }

    return ticks.sort((a, b) => {
      const aIndex = chartData.findIndex(d => d.날짜 === a);
      const bIndex = chartData.findIndex(d => d.날짜 === b);
      return aIndex - bIndex;
    });
  }, [chartData, selectedPeriod]);

  const formatPrice = useCallback((value: number) => {
    if (value < 100) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  }, []);

  const formatTooltipPrice = useCallback((value: number) => {
    if (value < 100) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G';
    }
    return value.toLocaleString('ko-KR') + ' G';
  }, []);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: `3px solid ${chartColor}`,
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ fontWeight: '700', color: chartColor, marginBottom: '6px', fontSize: '16px' }}>
          {label}
        </div>
        <div style={{ fontWeight: '600', fontSize: '15px' }}>
          가격: {formatTooltipPrice(payload[0].value)}
        </div>
      </div>
    );
  };

  // 모바일용 툴팁
  const CustomTooltipMobile = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: `2px solid ${chartColor}`,
          borderRadius: '8px',
          padding: '8px 10px',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ fontWeight: '700', color: chartColor, marginBottom: '4px', fontSize: '12px' }}>
          {label}
        </div>
        <div style={{ fontWeight: '600', fontSize: '11px' }}>
          가격: {formatTooltipPrice(payload[0].value)}
        </div>
      </div>
    );
  };

  const periodLabels: Record<PeriodOption, string> = {
    '7d': '7D',
    '1m': '1M',
    'all': 'ALL'
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: bgColor, height: '100%' }}>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" size="sm" />
          <p className="mt-2 small" style={{ color: 'var(--text-muted)' }}>데이터 로딩 중...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', background: bgColor, color: 'var(--text-primary)', height: '100%' }}>
      {/* 데스크톱 헤더 */}
      <Card.Header
        className="py-2 py-md-3 border-0 d-none d-md-block"
        style={{ background: headerBgColor, borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="d-flex align-items-center" style={{ gap: '12px' }}>
          <div className="d-flex align-items-center gap-2" style={{ flex: '1' }}>
            <Image
              src={icon}
              alt={name}
              width={40}
              height={40}
              style={{
                borderRadius: '8px',
                border: `2px solid ${chartColor}`,
                boxShadow: `0 2px 8px ${chartColor}33`
              }}
            />
            <div>
              <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>{name}</h6>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>거래소</small>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-1" style={{ flex: '1' }}>
            {(['7d', '1m', 'all'] as PeriodOption[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                style={{
                  padding: '3px 12px',
                  borderRadius: '6px',
                  border: selectedPeriod === period ? `2px solid ${chartColor}` : '2px solid var(--border-color)',
                  background: selectedPeriod === period ? 'var(--card-body-bg-blue)' : 'var(--card-bg)',
                  color: selectedPeriod === period ? chartColor : 'var(--text-secondary)',
                  fontWeight: selectedPeriod === period ? '700' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>

          {stats && (
            <div className="text-end" style={{ flex: '1' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: chartColor }}>
                {formatTooltipPrice(currentPrice)}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: changeRate >= 0 ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                <Image
                  src={changeRate >= 0 ? '/up.png' : '/down.png'}
                  alt={changeRate >= 0 ? 'up' : 'down'}
                  width={16}
                  height={16}
                  style={{ objectFit: 'contain' }}
                />
                {Math.abs(changeRate).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card.Header>

      {/* 모바일 헤더 */}
      <Card.Header
        className="py-2 border-0 d-md-none"
        style={{ background: headerBgColor, borderBottom: 'none', paddingBottom: 0 }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Image
              src={icon}
              alt={name}
              width={32}
              height={32}
              style={{
                borderRadius: '6px',
                border: `2px solid ${chartColor}`,
                boxShadow: `0 2px 6px ${chartColor}33`
              }}
            />
            <div>
              <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.65rem', lineHeight: '1.3' }}>
                {name}
              </h6>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>거래소</small>
            </div>
          </div>
          {stats && (
            <div className="text-end">
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: chartColor, whiteSpace: 'nowrap' }}>
                {formatTooltipPrice(currentPrice)}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: changeRate >= 0 ? '#ef4444' : '#3b82f6', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                <Image
                  src={changeRate >= 0 ? '/up.png' : '/down.png'}
                  alt={changeRate >= 0 ? 'up' : 'down'}
                  width={14}
                  height={14}
                  style={{ objectFit: 'contain' }}
                />
                {Math.abs(changeRate).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body className="py-0 px-2 px-md-3" style={{ background: bgColor }}>
        {history.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: 'var(--text-muted)' }}>아직 수집된 데이터가 없습니다</p>
          </div>
        ) : (
          <>
            {/* 모바일 기간 선택 버튼 */}
            <div className="d-md-none d-flex justify-content-center gap-1" style={{ margin: 0, padding: '2px 0 0 0' }}>
              {(['7d', '1m', 'all'] as PeriodOption[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '2px 10px',
                    borderRadius: '3px',
                    border: selectedPeriod === period ? `1px solid ${chartColor}` : '1px solid var(--border-color)',
                    background: selectedPeriod === period ? 'var(--card-body-bg-blue)' : 'var(--card-bg)',
                    color: selectedPeriod === period ? chartColor : 'var(--text-secondary)',
                    fontWeight: selectedPeriod === period ? '700' : '500',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>

            {/* 데스크톱 차트 */}
            <div className="d-none d-md-block" style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorPrice-${name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="var(--border-color)" strokeWidth={1} />
                  <XAxis
                    dataKey="날짜"
                    ticks={xAxisTicks}
                    tick={{ fill: 'var(--text-primary)', fontSize: 10, fontWeight: 700 }}
                    height={35}
                    stroke="var(--text-secondary)"
                    strokeWidth={2}
                    tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                    axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                  />
                  <YAxis
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const isAverage = yAxisConfig.avgValue && Math.abs(payload.value - yAxisConfig.avgValue) < 0.01;
                      return (
                        <text x={x} y={y} textAnchor="end" fill={isAverage ? chartColor : 'var(--text-primary)'} fontSize={10} fontWeight={isAverage ? '900' : '700'} dx={-6}>
                          {formatPrice(payload.value)}
                        </text>
                      );
                    }}
                    tickFormatter={formatPrice}
                    width={45}
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    interval={0}
                    stroke="var(--text-secondary)"
                    strokeWidth={2}
                    tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                    axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColor, strokeWidth: 2, strokeDasharray: '5 5' }} />
                  <ReferenceLine y={stats?.avg} stroke={chartColor} strokeDasharray="5 5" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="가격"
                    stroke={chartColor}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 2 }}
                    fill={`url(#colorPrice-${name})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 모바일 차트 */}
            <div className="d-md-none" style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorPriceMobile-${name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeWidth={0.5} vertical={false} />
                  <XAxis
                    dataKey="날짜"
                    ticks={xAxisTicks}
                    tick={{ fill: 'var(--text-primary)', fontSize: 8, fontWeight: 700 }}
                    height={30}
                    stroke="var(--text-secondary)"
                    strokeWidth={1.5}
                    tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                    axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                  />
                  <YAxis
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const isAverage = yAxisConfig.avgValue && Math.abs(payload.value - yAxisConfig.avgValue) < 0.01;
                      return (
                        <text x={x} y={y} textAnchor="end" fill={isAverage ? chartColor : 'var(--text-primary)'} fontSize={7} fontWeight={isAverage ? '900' : '700'} dx={-2}>
                          {formatPrice(payload.value)}
                        </text>
                      );
                    }}
                    tickFormatter={formatPrice}
                    width={32}
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    stroke="var(--text-secondary)"
                    strokeWidth={1.5}
                    tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                    axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                  />
                  <Tooltip content={<CustomTooltipMobile />} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <ReferenceLine y={stats?.avg} stroke={chartColor} strokeDasharray="5 5" strokeWidth={1.5} />
                  <Line
                    type="monotone"
                    dataKey="가격"
                    stroke={chartColor}
                    strokeWidth={1.5}
                    dot={{ r: 1.5, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 1 }}
                    activeDot={{ r: 3, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 1.5 }}
                    fill={`url(#colorPriceMobile-${name})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 제작 손익 섹션 - 메인페이지 스타일 */}
            <div className={styles.craftingSection}>
              <Row className="g-2 mb-2">
                {/* 왼쪽: 제작 재료 */}
                <Col xs={6}>
                  <div className={styles.craftingBox}>
                    <div className={styles.titleWrapper}>
                      <h6 className={styles.craftingTitle}>
                        <Image
                          src={icon}
                          alt={name}
                          width={32}
                          height={32}
                          className={styles.craftingIcon}
                        />
                        제작 재료
                      </h6>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {priceDate && (
                          <span className={styles.priceDate}>
                            {priceDate}
                          </span>
                        )}
                        <button
                          onClick={onRefreshPrices}
                          disabled={isRefreshing}
                          title={!canRefresh ? '10분 쿨다운 중' : '가격 갱신'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: isRefreshing ? 'not-allowed' : 'pointer',
                            padding: '3px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            opacity: isRefreshing ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isRefreshing) {
                              e.currentTarget.style.background = 'var(--card-body-bg-blue)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {isRefreshing ? (
                            <Spinner animation="border" size="sm" style={{ width: '14px', height: '14px' }} />
                          ) : (
                            <GearIcon size={14} color={!canRefresh ? 'var(--profit-color)' : 'var(--text-secondary)'} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      {craftingMaterials.map((material, idx) => (
                        <div key={idx} className={styles.materialRow}>
                          <span className={styles.materialLabel}>
                            <Image
                              src={material.icon}
                              alt={material.name}
                              width={30}
                              height={30}
                              className={styles.materialIcon}
                            />
                            ×{material.quantity}
                          </span>
                          <span className={styles.materialPrice}>
                            {Math.round(material.quantity * material.pricePer100 / 100).toLocaleString()} G
                          </span>
                        </div>
                      ))}
                      <div className={styles.materialRow}>
                        <span className={styles.materialLabel}>
                          <Image src="/gold.webp" alt="골드" width={30} height={30} className={styles.materialIcon} />
                          제작비
                        </span>
                        <span className={styles.materialPrice}>
                          {Math.round(actualGoldCost).toLocaleString()} G
                        </span>
                      </div>
                    </div>
                    <hr className={styles.dividerLine} />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span className={styles.totalLabel}>총 제작 비용</span>
                      <span className={styles.totalValue} style={{ color: chartColor }}>
                        {Math.round(craftingCost).toLocaleString()} G
                      </span>
                    </div>
                  </div>
                </Col>

                {/* 오른쪽: 거래소 정보 - 메인페이지 스타일 */}
                <Col xs={6}>
                  <div className={styles.craftingBox}>
                    <h6 className={`${styles.craftingTitle} ${styles.titleWrapper}`}>
                      <Image
                        src={icon}
                        alt={name}
                        width={32}
                        height={32}
                        className={styles.craftingIcon}
                      />
                      거래소 정보
                    </h6>
                    <div className={styles.exchangeInfoBox}>
                      <div className={styles.infoRow}>
                        <span className={styles.exchangeLabel}>현재 거래소 가격</span>
                        <span className={styles.exchangeValue} style={{ color: 'var(--text-primary)' }}>
                          {currentPrice.toLocaleString()} G
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span className={styles.exchangeLabel}>개당 제작 비용</span>
                        <span className={styles.exchangeValue} style={{ color: chartColor }}>
                          {costPerUnit.toFixed(1)} G
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className={styles.feeLabel}>
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
                        min={0}
                        max={100}
                        step={1}
                        className={styles.feeInput}
                      />
                    </div>
                  </div>
                </Col>
              </Row>

              {/* 손익 결과 */}
              <Row className="g-2">
                <Col xs={6}>
                  <div className={`${styles.profitBox} ${isDirectUseProfit ? styles.profitBoxProfit : styles.profitBoxLoss}`}>
                    <div className={styles.profitLabel}>직접 사용 시</div>
                    <div className={`${styles.profitPercent} ${isDirectUseProfit ? styles.profitPercentProfit : styles.profitPercentLoss}`}>
                      {isDirectUseProfit ? '+' : ''}{directUseProfitPercent.toFixed(1)}%
                    </div>
                    <div className={`${styles.profitPerUnit} ${isDirectUseProfit ? styles.profitPerUnitProfit : styles.profitPerUnitLoss}`}>
                      개당 {isDirectUseProfit ? '+' : ''}{directUseProfitDisplay} G
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className={`${styles.profitBox} ${isSaleProfit ? styles.profitBoxProfit : styles.profitBoxLoss}`}>
                    <div className={styles.profitLabel}>판매 시 (수수료 5%)</div>
                    <div className={`${styles.profitPercent} ${isSaleProfit ? styles.profitPercentProfit : styles.profitPercentLoss}`}>
                      {isSaleProfit ? '+' : ''}{saleProfitPercent.toFixed(1)}%
                    </div>
                    <div className={`${styles.profitPerUnit} ${isSaleProfit ? styles.profitPerUnitProfit : styles.profitPerUnitLoss}`}>
                      개당 {isSaleProfit ? '+' : ''}{saleProfitDisplay} G
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default function LifeMasterCalculator() {
  const { theme } = useTheme();

  // 가격 state
  const [premiumMarketPrice, setPremiumMarketPrice] = useState<number>(0);
  const [normalMarketPrice, setNormalMarketPrice] = useState<number>(0);
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice>({});
  const [isLoading, setIsLoading] = useState(true);

  // 가격 히스토리 state
  const [premiumHistory, setPremiumHistory] = useState<PriceEntry[]>([]);
  const [normalHistory, setNormalHistory] = useState<PriceEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // 제작 수수료 감소 state
  const [premiumCraftingFeeReduction, setPremiumCraftingFeeReduction] = useState<number>(0);
  const [normalCraftingFeeReduction, setNormalCraftingFeeReduction] = useState<number>(0);

  // 가격 갱신 관련 state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [priceDate, setPriceDate] = useState<string>('');

  // 10분 쿨다운 체크
  const canRefresh = useMemo(() => {
    if (!lastRefreshTime) return true;
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes >= 10;
  }, [lastRefreshTime]);

  // 남은 쿨다운 시간 (분)
  const remainingCooldown = useMemo(() => {
    if (!lastRefreshTime) return 0;
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return Math.max(0, Math.ceil(10 - diffMinutes));
  }, [lastRefreshTime]);

  // 가격 갱신 함수
  const refreshPrices = useCallback(async () => {
    if (!canRefresh) {
      alert(`${remainingCooldown}분 후에 다시 갱신할 수 있습니다`);
      return;
    }

    try {
      setIsRefreshing(true);

      // 목재 재료들 가격 갱신
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
            prices[item.itemId] = item.price;
          });
          setMaterialPrices(prices);
          setLastRefreshTime(new Date());

          // 날짜+시간 설정 (갱신 시점 기준)
          const now = new Date();
          const yy = String(now.getFullYear()).slice(2);
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const hh = String(now.getHours()).padStart(2, '0');
          const min = String(now.getMinutes()).padStart(2, '0');
          setPriceDate(`${yy}.${mm}.${dd} ${hh}:${min}`);

          alert('가격이 갱신되었습니다');
        }
      } else {
        alert('가격 갱신에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to refresh prices:', error);
      alert('가격 갱신 중 오류가 발생했습니다');
    } finally {
      setIsRefreshing(false);
    }
  }, [canRefresh, remainingCooldown]);

  // 가격 데이터 가져오기 (차트용 - 로스트아크 API 호출 안 함)
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setIsLoading(true);
        setHistoryLoading(true);

        // 융화재료 가격 가져오기 (latest.json에서)
        const { latest } = await fetchPriceData();
        const premiumFusionPrice = latest[PREMIUM_ABIDOS_FUSION_ID];
        const normalFusionPrice = latest[ABIDOS_FUSION_ID];
        if (premiumFusionPrice) {
          setPremiumMarketPrice(premiumFusionPrice);
        }
        if (normalFusionPrice) {
          setNormalMarketPrice(normalFusionPrice);
        }

        // 가격 히스토리 가져오기 (history.json에서)
        const [premiumHist, normalHist] = await Promise.all([
          getItemPriceHistory(PREMIUM_ABIDOS_FUSION_ID, 365),
          getItemPriceHistory(ABIDOS_FUSION_ID, 365),
        ]);
        setPremiumHistory(premiumHist);
        setNormalHistory(normalHist);

        // 목재 재료 가격은 톱니바퀴 버튼 클릭 시에만 가져옴
        // (로스트아크 API 호출 최소화)
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setIsLoading(false);
        setHistoryLoading(false);
      }
    };

    fetchChartData();
  }, []);

  // 재료 정보에 가격 추가
  const premiumCraftingMaterials = useMemo(() => {
    return PREMIUM_CRAFTING_MATERIALS_BASE.map(material => ({
      ...material,
      pricePer100: materialPrices[material.id] || 0,
    }));
  }, [materialPrices]);

  const normalCraftingMaterials = useMemo(() => {
    return NORMAL_CRAFTING_MATERIALS_BASE.map(material => ({
      ...material,
      pricePer100: materialPrices[material.id] || 0,
    }));
  }, [materialPrices]);

  // 극한의 효율 계산
  const abidosWoodPrice = (materialPrices['6884308'] || 0) / 100;
  const softWoodPrice = (materialPrices['6882304'] || 0) / 100;
  const normalWoodPrice = (materialPrices['6882301'] || 0) / 100;

  const abidosFromNormalWood = normalWoodPrice * 12.5;
  const abidosFromSoftWood = softWoodPrice * 6.25;
  const abidosDirectBuy = abidosWoodPrice;

  const abidosMethods = [
    { method: '직접 구매', cost: abidosDirectBuy },
    { method: '일반 목재로 교환', cost: abidosFromNormalWood },
    { method: '부드러운 목재로 교환', cost: abidosFromSoftWood },
  ].sort((a, b) => a.cost - b.cost);

  const bestAbidosMethod = abidosMethods[0];

  // 차트 색상
  const premiumChartColor = theme === 'dark' ? '#fb923c' : '#ea580c';
  const normalChartColor = theme === 'dark' ? '#a8a29e' : '#78716c';

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">로딩중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <Link href="/" className={styles.headerLink}>
          <div className={styles.headerContent}>
            <Image
              src={PREMIUM_ABIDOS_FUSION_ICON}
              alt="생활의 달인"
              width={40}
              height={40}
              priority
              className={styles.headerIcon}
            />
            <h1 className={styles.title}>생활의 달인</h1>
          </div>
        </Link>
        <p className={styles.subtitle}>
          아비도스 융화재료 제작 손익 및 극한의 효율 계산
        </p>
      </div>

      {/* 차트 + 제작손익 섹션 - 2열 배치 */}
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <ChartWithProfit
            name="상급 아비도스 융화 재료"
            icon={PREMIUM_ABIDOS_FUSION_ICON}
            history={premiumHistory}
            loading={historyLoading}
            chartColor={premiumChartColor}
            currentPrice={premiumMarketPrice}
            bgColor="var(--card-bg)"
            headerBgColor="var(--card-header-bg)"
            craftingMaterials={premiumCraftingMaterials}
            craftingGoldCost={PREMIUM_CRAFTING_GOLD_COST}
            craftingFeeReduction={premiumCraftingFeeReduction}
            setCraftingFeeReduction={setPremiumCraftingFeeReduction}
            colorType="orange"
            onRefreshPrices={refreshPrices}
            isRefreshing={isRefreshing}
            canRefresh={canRefresh}
            priceDate={priceDate}
          />
        </Col>
        <Col lg={6}>
          <ChartWithProfit
            name="아비도스 융화 재료"
            icon={ABIDOS_FUSION_ICON}
            history={normalHistory}
            loading={historyLoading}
            chartColor={normalChartColor}
            currentPrice={normalMarketPrice}
            bgColor="var(--card-bg)"
            headerBgColor="var(--card-header-bg)"
            craftingMaterials={normalCraftingMaterials}
            craftingGoldCost={NORMAL_CRAFTING_GOLD_COST}
            craftingFeeReduction={normalCraftingFeeReduction}
            setCraftingFeeReduction={setNormalCraftingFeeReduction}
            colorType="stone"
            onRefreshPrices={refreshPrices}
            isRefreshing={isRefreshing}
            canRefresh={canRefresh}
            priceDate={priceDate}
          />
        </Col>
      </Row>

      {/* 생활 최적 재련 섹션 */}
      <Card className="border-0 shadow-lg" style={{ borderRadius: '16px', background: 'var(--card-bg)' }}>
        <Card.Header style={{ background: 'var(--card-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', padding: '0.75rem 1rem' }}>
          <h4 style={{ marginBottom: 0, fontWeight: 600, fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--text-primary)' }}>
            생활 최적 재련 (가루 교환 활용)
          </h4>
        </Card.Header>
        <Card.Body style={{ padding: '1rem' }}>
          {/* 첫 번째 줄: 현재 시세 | 교환 공식 */}
          <Row className="g-3 mb-3">
            {/* 왼쪽: 현재 시세 (100개당) */}
            <Col md={6}>
              <div className={styles.efficiencyBox}>
                <div className={styles.titleWrapper}>
                  <h6 className={styles.efficiencySectionTitle}>
                    현재 시세 (100개당)
                  </h6>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {priceDate && (
                      <span className={styles.priceDate}>
                        {priceDate}
                      </span>
                    )}
                    <button
                      onClick={refreshPrices}
                      disabled={isRefreshing}
                      title={!canRefresh ? '10분 쿨다운 중' : '가격 갱신'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: isRefreshing ? 'not-allowed' : 'pointer',
                        padding: '3px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        opacity: isRefreshing ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isRefreshing) {
                          e.currentTarget.style.background = 'var(--card-body-bg-blue)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {isRefreshing ? (
                        <Spinner animation="border" size="sm" style={{ width: '14px', height: '14px' }} />
                      ) : (
                        <GearIcon size={14} color={!canRefresh ? 'var(--profit-color)' : 'var(--text-secondary)'} />
                      )}
                    </button>
                  </div>
                </div>
                <div className={styles.efficiencyGap}>
                  <div className={styles.efficiencyRow}>
                    <div className={styles.efficiencyItemRow}>
                      <Image src="/wood2.webp" alt="목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.efficiencyItemLabel}>목재</span>
                    </div>
                    <span className={styles.efficiencyItemValue}>
                      {(materialPrices['6882301'] || 0).toLocaleString()} G
                    </span>
                  </div>
                  <div className={styles.efficiencyRow}>
                    <div className={styles.efficiencyItemRow}>
                      <Image src="/wood3.webp" alt="부드러운 목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.efficiencyItemLabel}>부드러운</span>
                    </div>
                    <span className={styles.efficiencyItemValue}>
                      {(materialPrices['6882304'] || 0).toLocaleString()} G
                    </span>
                  </div>
                  <div className={styles.efficiencyRow}>
                    <div className={styles.efficiencyItemRow}>
                      <Image src="/wood1.webp" alt="아비도스 목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.efficiencyItemLabel}>아비도스</span>
                    </div>
                    <span className={styles.efficiencyItemValue}>
                      {(materialPrices['6884308'] || 0).toLocaleString()} G
                    </span>
                  </div>
                </div>
              </div>
            </Col>

            {/* 오른쪽: 교환 공식 */}
            <Col md={6}>
              <div className={styles.efficiencyBox}>
                <h6 className={styles.efficiencySectionTitle}>
                  교환 공식
                </h6>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                  {/* 왼쪽: 교환 공식 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className={styles.efficiencyGap}>
                    <div className={styles.formulaRow}>
                      <Image src="/wood2.webp" alt="목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.formulaText}>×100</span>
                      <span className={styles.formulaArrow}>→</span>
                      <Image src="/rkfn.webp" alt="가루" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.formulaText}>×80</span>
                    </div>
                    <div className={styles.formulaRow}>
                      <Image src="/wood3.webp" alt="부드러운 목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.formulaText}>×50</span>
                      <span className={styles.formulaArrow}>→</span>
                      <Image src="/rkfn.webp" alt="가루" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.formulaText}>×80</span>
                    </div>
                    <div className={styles.formulaRow}>
                      <Image src="/rkfn.webp" alt="가루" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.formulaText}>×100</span>
                      <span className={styles.formulaArrow}>→</span>
                      <Image src="/wood1.webp" alt="아비도스 목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.formulaText}>×10</span>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div style={{ width: '1px', backgroundColor: 'var(--border-color)', alignSelf: 'stretch' }} />

                  {/* 오른쪽: 교환 비율 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className={styles.efficiencyGap}>
                    <div className={styles.formulaRow}>
                      <Image src="/wood1.webp" alt="아비도스" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.ratioText}>×1</span>
                      <span className={styles.ratioEquals}>=</span>
                      <Image src="/wood2.webp" alt="목재" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.ratioResult}>×12.5</span>
                    </div>
                    <div className={styles.formulaRow}>
                      <Image src="/wood1.webp" alt="아비도스" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.ratioText}>×1</span>
                      <span className={styles.ratioEquals}>=</span>
                      <Image src="/wood3.webp" alt="부드러운" width={36} height={36} className={styles.efficiencyIcon} />
                      <span className={styles.ratioResult}>×6.25</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          {/* 두 번째 줄: 1개 획득 비용 + 결과 (화살표로 연결) */}
          {(() => {
            const optimalAbidosCost = Math.min(abidosDirectBuy, abidosFromNormalWood, abidosFromSoftWood);
            const isDirectBest = abidosDirectBuy <= abidosFromNormalWood && abidosDirectBuy <= abidosFromSoftWood;
            const isNormalWoodBest = abidosFromNormalWood < abidosDirectBuy && abidosFromNormalWood <= abidosFromSoftWood;
            const isSoftWoodBest = abidosFromSoftWood < abidosDirectBuy && abidosFromSoftWood < abidosFromNormalWood;

            const optimalMethod = isDirectBest ? '직접 구매' : isNormalWoodBest ? '목재 교환' : '부드러운 목재 교환';
            const optimalIcon = isDirectBest ? '/wood1.webp' : isNormalWoodBest ? '/wood2.webp' : '/wood3.webp';

            // 절약률 계산 (직접 구매 대비)
            const savingsPercent = isDirectBest ? 0 : ((abidosDirectBuy - optimalAbidosCost) / abidosDirectBuy) * 100;
            const savingsPerUnit = abidosDirectBuy - optimalAbidosCost;

            // 화살표가 나올 위치 (0: 직접구매, 1: 목재, 2: 부드러운)
            const arrowPosition = isDirectBest ? 0 : isNormalWoodBest ? 1 : 2;

            const renderOptionRow = (
              icon: string,
              unitPrice: number,
              multiplier: number | null,
              finalPrice: number,
              isBest: boolean
            ) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0',
                position: 'relative'
              }}>
                <div className={`${styles.optionBox} ${isBest ? styles.optionBoxBest : ''}`}>
                  <div className={styles.efficiencyItemRow}>
                    <Image src={icon} alt="재료" width={36} height={36} className={styles.optionIcon} />
                    {multiplier ? (
                      <span className={styles.optionLabel}>
                        {truncateDecimal(unitPrice, 3)} × {multiplier}
                      </span>
                    ) : (
                      <span className={styles.optionLabel}>
                        {truncateDecimal(unitPrice, 3)}
                      </span>
                    )}
                  </div>
                  <span className={styles.optionValue} style={{
                    color: isBest ? 'var(--profit-color)' : 'var(--text-primary)'
                  }}>
                    = {truncateDecimal(finalPrice, 3)} G
                  </span>
                </div>
                {/* 화살표 - 가장 저렴한 줄에서만 표시 */}
                {isBest && (
                  <div className={styles.costArrow}>
                    →
                  </div>
                )}
              </div>
            );

            return (
              <Row className="g-3 mb-3 align-items-stretch">
                {/* 왼쪽: 1개 획득 비용 */}
                <Col md={6}>
                  <div className={styles.costBox}>
                    <h6 className={styles.efficiencySectionTitle}>
                      아비도스 목재 1개 획득 비용
                    </h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {renderOptionRow('/wood1.webp', abidosWoodPrice, null, abidosDirectBuy, isDirectBest)}
                      {renderOptionRow('/wood2.webp', normalWoodPrice, 12.5, abidosFromNormalWood, isNormalWoodBest)}
                      {renderOptionRow('/wood3.webp', softWoodPrice, 6.25, abidosFromSoftWood, isSoftWoodBest)}
                    </div>
                  </div>
                </Col>

                {/* 오른쪽: 결과 */}
                <Col md={6}>
                  <div className={styles.resultBox}>
                    {/* 교환 과정 시각화 */}
                    {isDirectBest ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <Image src="/wood1.webp" alt="아비도스 목재" width={40} height={40} className={styles.resultIcon} />
                          <span className={styles.resultLabel}>
                            직접 구매
                          </span>
                        </div>
                        <div className={styles.resultDescription}>
                          직접 구매가 가장 저렴합니다
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 교환 체인: 목재/부드러운 → 가루 → 아비도스 목재 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                          <Image src={optimalIcon} alt="재료" width={36} height={36} className={styles.resultChainIcon} />
                          <span className={styles.resultArrow}>→</span>
                          <Image src="/rkfn.webp" alt="가루" width={36} height={36} className={styles.resultChainIcon} />
                          <span className={styles.resultArrow}>→</span>
                          <Image src="/wood1.webp" alt="아비도스 목재" width={36} height={36} className={styles.resultChainIcon} />
                        </div>
                        <div className={styles.resultSavings}>
                          {truncateDecimal(savingsPercent, 2)}% 절약
                        </div>
                        <div className={styles.resultPerUnit}>
                          개당 {truncateDecimal(savingsPerUnit, 3)} G 이득
                        </div>
                      </>
                    )}

                    <hr className={styles.dividerLine} style={{ width: '100%' }} />
                    <div className={styles.resultOptimal}>
                      최적 비용: <span style={{ fontWeight: 700, color: 'var(--profit-color)' }}>{truncateDecimal(optimalAbidosCost, 3)} G</span> / 개
                    </div>
                  </div>
                </Col>
              </Row>
            );
          })()}

          {/* 세 번째 줄: 최적화된 제작 손익 - 위 차트 섹션과 동일한 레이아웃 */}
          {(() => {
            const optimalAbidosCost = Math.min(abidosDirectBuy, abidosFromNormalWood, abidosFromSoftWood);
            const isDirectBest = abidosDirectBuy <= abidosFromNormalWood && abidosDirectBuy <= abidosFromSoftWood;
            const isNormalWoodBest = abidosFromNormalWood < abidosDirectBuy && abidosFromNormalWood <= abidosFromSoftWood;
            const isSoftWoodBest = abidosFromSoftWood < abidosDirectBuy && abidosFromSoftWood < abidosFromNormalWood;

            // 상급 융화재료 재료 계산 (교환 로직 포함)
            // 원래: 아비도스 43, 부드러운 59, 목재 112
            const premiumAbidosNeeded = 43;
            const premiumSoftWoodBase = 59;
            const premiumNormalWoodBase = 112;

            let premiumAbidosQty = premiumAbidosNeeded;
            let premiumSoftWoodQty = premiumSoftWoodBase;
            let premiumNormalWoodQty = premiumNormalWoodBase;

            if (isNormalWoodBest) {
              // 목재로 교환: 아비도스 0, 목재 += 아비도스 * 12.5
              premiumAbidosQty = 0;
              premiumNormalWoodQty = premiumNormalWoodBase + (premiumAbidosNeeded * 12.5);
            } else if (isSoftWoodBest) {
              // 부드러운 목재로 교환: 아비도스 0, 부드러운 += 아비도스 * 6.25
              premiumAbidosQty = 0;
              premiumSoftWoodQty = premiumSoftWoodBase + (premiumAbidosNeeded * 6.25);
            }

            // 상급 비용 계산 (수수료 감소 적용)
            const premiumActualGoldCost = PREMIUM_CRAFTING_GOLD_COST * (1 - premiumCraftingFeeReduction / 100);
            const premiumMaterialCost = (premiumAbidosQty * abidosWoodPrice) + (premiumSoftWoodQty * softWoodPrice) + (premiumNormalWoodQty * normalWoodPrice);
            const premiumTotalCost = premiumMaterialCost + premiumActualGoldCost;
            const premiumCostPerUnit = premiumTotalCost / OUTPUT_QUANTITY;
            const premiumDirectProfit = premiumMarketPrice - premiumCostPerUnit;
            const premiumDirectProfitPercent = premiumCostPerUnit > 0 ? (premiumDirectProfit / premiumCostPerUnit) * 100 : 0;
            const premiumSaleProfit = (premiumMarketPrice * 0.95) - premiumCostPerUnit;
            const premiumSaleProfitPercent = premiumCostPerUnit > 0 ? (premiumSaleProfit / premiumCostPerUnit) * 100 : 0;

            // 일반 융화재료 재료 계산 (교환 로직 포함)
            // 원래: 아비도스 33, 부드러운 45, 목재 86
            const normalAbidosNeeded = 33;
            const normalSoftWoodBase = 45;
            const normalNormalWoodBase = 86;

            let normalAbidosQty = normalAbidosNeeded;
            let normalSoftWoodQty = normalSoftWoodBase;
            let normalNormalWoodQty = normalNormalWoodBase;

            if (isNormalWoodBest) {
              normalAbidosQty = 0;
              normalNormalWoodQty = normalNormalWoodBase + (normalAbidosNeeded * 12.5);
            } else if (isSoftWoodBest) {
              normalAbidosQty = 0;
              normalSoftWoodQty = normalSoftWoodBase + (normalAbidosNeeded * 6.25);
            }

            // 일반 비용 계산 (수수료 감소 적용)
            const normalActualGoldCost = NORMAL_CRAFTING_GOLD_COST * (1 - normalCraftingFeeReduction / 100);
            const normalMaterialCost = (normalAbidosQty * abidosWoodPrice) + (normalSoftWoodQty * softWoodPrice) + (normalNormalWoodQty * normalWoodPrice);
            const normalTotalCost = normalMaterialCost + normalActualGoldCost;
            const normalCostPerUnit = normalTotalCost / OUTPUT_QUANTITY;
            const normalDirectProfit = normalMarketPrice - normalCostPerUnit;
            const normalDirectProfitPercent = normalCostPerUnit > 0 ? (normalDirectProfit / normalCostPerUnit) * 100 : 0;
            const normalSaleProfit = (normalMarketPrice * 0.95) - normalCostPerUnit;
            const normalSaleProfitPercent = normalCostPerUnit > 0 ? (normalSaleProfit / normalCostPerUnit) * 100 : 0;

            // 재료 행 렌더링 함수
            const renderMaterialRow = (icon: string, quantity: number, pricePer100: number) => {
              if (quantity === 0) return null;
              const totalPrice = Math.round(quantity * pricePer100 / 100);
              return (
                <div className={styles.materialRow}>
                  <span className={styles.materialLabel}>
                    <Image src={icon} alt="재료" width={30} height={30} className={styles.materialIcon} />
                    ×{quantity % 1 === 0 ? quantity : quantity.toFixed(1)}
                  </span>
                  <span className={styles.materialPrice}>
                    {totalPrice.toLocaleString()} G
                  </span>
                </div>
              );
            };

            return (
              <Row className="g-3">
                {/* 상급 아비도스 융화재료 */}
                <Col lg={6}>
                  <div className={styles.fusionCard}>
                    {/* 헤더 */}
                    <div className={styles.fusionCardHeader}>
                      <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="상급" width={32} height={32} className={styles.craftingIcon} />
                      <span className={styles.fusionCardTitle} style={{ color: '#ea580c' }}>상급 아비도스 융화 재료</span>
                    </div>
                    {/* 바디 */}
                    <div className={styles.fusionCardBody}>
                      <Row className="g-2 mb-2">
                        {/* 왼쪽: 제작 재료 */}
                        <Col xs={6}>
                          <div className={styles.craftingBox}>
                            <h6 className={`${styles.craftingTitle} ${styles.titleWrapper}`}>
                              <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="상급" width={32} height={32} className={styles.craftingIcon} />
                              제작 재료
                            </h6>
                            <div style={{ marginBottom: '8px' }}>
                              {renderMaterialRow('/wood1.webp', premiumAbidosQty, materialPrices['6884308'] || 0)}
                              {renderMaterialRow('/wood3.webp', premiumSoftWoodQty, materialPrices['6882304'] || 0)}
                              {renderMaterialRow('/wood2.webp', premiumNormalWoodQty, materialPrices['6882301'] || 0)}
                              <div className={styles.materialRow}>
                                <span className={styles.materialLabel}>
                                  <Image src="/gold.webp" alt="골드" width={30} height={30} className={styles.materialIcon} />
                                  제작비
                                </span>
                                <span className={styles.materialPrice}>
                                  {Math.round(premiumActualGoldCost).toLocaleString()} G
                                </span>
                              </div>
                            </div>
                            <hr className={styles.dividerLine} />
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span className={styles.totalLabel}>총 제작 비용</span>
                              <span className={styles.totalValue} style={{ color: '#ea580c' }}>
                                {Math.round(premiumTotalCost).toLocaleString()} G
                              </span>
                            </div>
                          </div>
                        </Col>

                        {/* 오른쪽: 거래소 정보 */}
                        <Col xs={6}>
                          <div className={styles.craftingBox}>
                            <h6 className={`${styles.craftingTitle} ${styles.titleWrapper}`}>
                              <Image src={PREMIUM_ABIDOS_FUSION_ICON} alt="상급" width={32} height={32} className={styles.craftingIcon} />
                              거래소 정보
                            </h6>
                            <div className={styles.exchangeInfoBox}>
                              <div className={styles.infoRow}>
                                <span className={styles.exchangeLabel}>현재 거래소 가격</span>
                                <span className={styles.exchangeValue} style={{ color: 'var(--text-primary)' }}>
                                  {premiumMarketPrice.toLocaleString()} G
                                </span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span className={styles.exchangeLabel}>개당 제작 비용</span>
                                <span className={styles.exchangeValue} style={{ color: '#ea580c' }}>
                                  {truncateDecimal(premiumCostPerUnit, 2)} G
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className={styles.feeLabel}>
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
                                min={0}
                                max={100}
                                step={1}
                                className={styles.feeInput}
                              />
                            </div>
                          </div>
                        </Col>
                      </Row>

                      {/* 손익 결과 */}
                      <Row className="g-2">
                        <Col xs={6}>
                          <div className={`${styles.profitBox} ${premiumDirectProfit > 0 ? styles.profitBoxProfit : styles.profitBoxLoss}`}>
                            <div className={styles.profitLabel}>직접 사용 시</div>
                            <div className={`${styles.profitPercent} ${premiumDirectProfit > 0 ? styles.profitPercentProfit : styles.profitPercentLoss}`}>
                              {premiumDirectProfit > 0 ? '+' : ''}{truncateDecimal(premiumDirectProfitPercent, 2)}%
                            </div>
                            <div className={`${styles.profitPerUnit} ${premiumDirectProfit > 0 ? styles.profitPerUnitProfit : styles.profitPerUnitLoss}`}>
                              개당 {premiumDirectProfit > 0 ? '+' : ''}{truncateDecimal(premiumDirectProfit, 2)} G
                            </div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className={`${styles.profitBox} ${premiumSaleProfit > 0 ? styles.profitBoxProfit : styles.profitBoxLoss}`}>
                            <div className={styles.profitLabel}>판매 시 (수수료 5%)</div>
                            <div className={`${styles.profitPercent} ${premiumSaleProfit > 0 ? styles.profitPercentProfit : styles.profitPercentLoss}`}>
                              {premiumSaleProfit > 0 ? '+' : ''}{truncateDecimal(premiumSaleProfitPercent, 2)}%
                            </div>
                            <div className={`${styles.profitPerUnit} ${premiumSaleProfit > 0 ? styles.profitPerUnitProfit : styles.profitPerUnitLoss}`}>
                              개당 {premiumSaleProfit > 0 ? '+' : ''}{truncateDecimal(premiumSaleProfit, 2)} G
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Col>

                {/* 일반 아비도스 융화재료 */}
                <Col lg={6}>
                  <div className={styles.fusionCard}>
                    {/* 헤더 */}
                    <div className={styles.fusionCardHeader}>
                      <Image src={ABIDOS_FUSION_ICON} alt="일반" width={32} height={32} className={styles.craftingIcon} />
                      <span className={styles.fusionCardTitle} style={{ color: '#78716c' }}>아비도스 융화 재료</span>
                    </div>
                    {/* 바디 */}
                    <div className={styles.fusionCardBody}>
                      <Row className="g-2 mb-2">
                        {/* 왼쪽: 제작 재료 */}
                        <Col xs={6}>
                          <div className={styles.craftingBox}>
                            <h6 className={`${styles.craftingTitle} ${styles.titleWrapper}`}>
                              <Image src={ABIDOS_FUSION_ICON} alt="일반" width={32} height={32} className={styles.craftingIcon} />
                              제작 재료
                            </h6>
                            <div style={{ marginBottom: '8px' }}>
                              {renderMaterialRow('/wood1.webp', normalAbidosQty, materialPrices['6884308'] || 0)}
                              {renderMaterialRow('/wood3.webp', normalSoftWoodQty, materialPrices['6882304'] || 0)}
                              {renderMaterialRow('/wood2.webp', normalNormalWoodQty, materialPrices['6882301'] || 0)}
                              <div className={styles.materialRow}>
                                <span className={styles.materialLabel}>
                                  <Image src="/gold.webp" alt="골드" width={30} height={30} className={styles.materialIcon} />
                                  제작비
                                </span>
                                <span className={styles.materialPrice}>
                                  {Math.round(normalActualGoldCost).toLocaleString()} G
                                </span>
                              </div>
                            </div>
                            <hr className={styles.dividerLine} />
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span className={styles.totalLabel}>총 제작 비용</span>
                              <span className={styles.totalValue} style={{ color: '#78716c' }}>
                                {Math.round(normalTotalCost).toLocaleString()} G
                              </span>
                            </div>
                          </div>
                        </Col>

                        {/* 오른쪽: 거래소 정보 */}
                        <Col xs={6}>
                          <div className={styles.craftingBox}>
                            <h6 className={`${styles.craftingTitle} ${styles.titleWrapper}`}>
                              <Image src={ABIDOS_FUSION_ICON} alt="일반" width={32} height={32} className={styles.craftingIcon} />
                              거래소 정보
                            </h6>
                            <div className={styles.exchangeInfoBox}>
                              <div className={styles.infoRow}>
                                <span className={styles.exchangeLabel}>현재 거래소 가격</span>
                                <span className={styles.exchangeValue} style={{ color: 'var(--text-primary)' }}>
                                  {normalMarketPrice.toLocaleString()} G
                                </span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span className={styles.exchangeLabel}>개당 제작 비용</span>
                                <span className={styles.exchangeValue} style={{ color: '#78716c' }}>
                                  {truncateDecimal(normalCostPerUnit, 2)} G
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className={styles.feeLabel}>
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
                                min={0}
                                max={100}
                                step={1}
                                className={styles.feeInput}
                              />
                            </div>
                          </div>
                        </Col>
                      </Row>

                      {/* 손익 결과 */}
                      <Row className="g-2">
                        <Col xs={6}>
                          <div className={`${styles.profitBox} ${normalDirectProfit > 0 ? styles.profitBoxProfit : styles.profitBoxLoss}`}>
                            <div className={styles.profitLabel}>직접 사용 시</div>
                            <div className={`${styles.profitPercent} ${normalDirectProfit > 0 ? styles.profitPercentProfit : styles.profitPercentLoss}`}>
                              {normalDirectProfit > 0 ? '+' : ''}{truncateDecimal(normalDirectProfitPercent, 2)}%
                            </div>
                            <div className={`${styles.profitPerUnit} ${normalDirectProfit > 0 ? styles.profitPerUnitProfit : styles.profitPerUnitLoss}`}>
                              개당 {normalDirectProfit > 0 ? '+' : ''}{truncateDecimal(normalDirectProfit, 2)} G
                            </div>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <div className={`${styles.profitBox} ${normalSaleProfit > 0 ? styles.profitBoxProfit : styles.profitBoxLoss}`}>
                            <div className={styles.profitLabel}>판매 시 (수수료 5%)</div>
                            <div className={`${styles.profitPercent} ${normalSaleProfit > 0 ? styles.profitPercentProfit : styles.profitPercentLoss}`}>
                              {normalSaleProfit > 0 ? '+' : ''}{truncateDecimal(normalSaleProfitPercent, 2)}%
                            </div>
                            <div className={`${styles.profitPerUnit} ${normalSaleProfit > 0 ? styles.profitPerUnitProfit : styles.profitPerUnitLoss}`}>
                              개당 {normalSaleProfit > 0 ? '+' : ''}{truncateDecimal(normalSaleProfit, 2)} G
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </Col>
              </Row>
            );
          })()}
        </Card.Body>
      </Card>
    </div>
  );
}
