import { useTheme } from './ThemeProvider';
import React, { useMemo, useCallback, useContext, useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrackedItem, ItemCategory } from '@/lib/items-to-track';
import { PriceContext } from './PriceComparisonStats';
import { ColoredItemName } from '@/lib/components/ColoredItemName';
import type { TooltipProps, CustomDotProps } from '@/types/recharts';

// 커스텀 가격선 localStorage 키
const CUSTOM_PRICE_LINES_KEY = 'customPriceLines';

type CustomPriceLine = {
  sellPrice?: number;  // 판매가
  buyPrice?: number;   // 구매가
};

type CustomPriceLines = Record<string, CustomPriceLine>;

const loadCustomPriceLines = (): CustomPriceLines => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(CUSTOM_PRICE_LINES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load custom price lines:', e);
  }
  return {};
};

const saveCustomPriceLines = (lines: CustomPriceLines) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_PRICE_LINES_KEY, JSON.stringify(lines));
  } catch (e) {
    console.error('Failed to save custom price lines:', e);
  }
};

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string; // YYYY-MM-DD 형식
};

// 이벤트 정의
type EventInfo = {
  date: string; // YYYY-MM-DD 형식
  label: string;
  color?: string;
};

const EVENTS: EventInfo[] = [
  { date: '2025-11-07', label: '7주년 라방' },
  { date: '2025-12-07', label: '로아온' },
  { date: '2025-12-10', label: '윈터' },
  { date: '2026-01-07', label: '세르카' },
  { date: '2026-03-18', label: '성당' },
];

type CategoryStyle = {
  label: string;
  color: string;
  darkColor: string;
  lightBg: string;
  darkThemeColor: string;
  darkBg: string;
};

type CompactPriceChartProps = {
  selectedItem: TrackedItem | null;
  history: PriceEntry[];
  loading: boolean;
  categoryStyle?: CategoryStyle;
  hidePeriodButtons?: boolean;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export default function CompactPriceChart({ selectedItem, history, loading, categoryStyle, hidePeriodButtons = false }: CompactPriceChartProps) {
  const { theme } = useTheme();
  const { selectedPeriod, setSelectedPeriod, filteredHistory, comparisonData, activeReferenceLines } = useContext(PriceContext);

  // 모바일 감지 및 마운트 상태
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    setIsMounted(true);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 커스텀 가격선 관련 state
  const [customPriceLines, setCustomPriceLines] = useState<CustomPriceLines>({});
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [tempSellPrice, setTempSellPrice] = useState('');
  const [tempBuyPrice, setTempBuyPrice] = useState('');

  // 커스텀 가격선 불러오기
  useEffect(() => {
    setCustomPriceLines(loadCustomPriceLines());
  }, []);

  // 아이템 변경 시 입력값 초기화
  useEffect(() => {
    if (selectedItem) {
      const lines = customPriceLines[selectedItem.id];
      setTempSellPrice(lines?.sellPrice?.toString() || '');
      setTempBuyPrice(lines?.buyPrice?.toString() || '');
    }
  }, [selectedItem, customPriceLines]);

  // 현재 아이템의 커스텀 가격선
  const currentCustomLines = selectedItem ? customPriceLines[selectedItem.id] : undefined;

  // 가격선 저장
  const savePriceLines = () => {
    if (!selectedItem) return;
    const newLines = { ...customPriceLines };
    const sellPrice = tempSellPrice ? parseFloat(tempSellPrice) : undefined;
    const buyPrice = tempBuyPrice ? parseFloat(tempBuyPrice) : undefined;

    if (sellPrice || buyPrice) {
      newLines[selectedItem.id] = { sellPrice, buyPrice };
    } else {
      delete newLines[selectedItem.id];
    }

    setCustomPriceLines(newLines);
    saveCustomPriceLines(newLines);
    setShowPriceInput(false);
  };

  // 가격선 삭제
  const clearPriceLines = () => {
    if (!selectedItem) return;
    const newLines = { ...customPriceLines };
    delete newLines[selectedItem.id];
    setCustomPriceLines(newLines);
    saveCustomPriceLines(newLines);
    setTempSellPrice('');
    setTempBuyPrice('');
    setShowPriceInput(false);
  };

  // 비교 라인 색상 (일반 재료)
  const comparisonColor = '#9ca3af'; // 회색

  const chartColor = theme === 'dark'
    ? (categoryStyle?.darkThemeColor || '#8ab4f8')
    : (categoryStyle?.darkColor || '#16a34a');

  const statBoxStyles = {
    min: {
        light: { bg: '#f3f4f6', border: '#4b5563', text: '#1f2937' },
        dark: { bg: '#2d3748', border: '#9ca3af', text: '#e5e7eb' }
    },
    max: {
        light: { bg: '#f3f4f6', border: '#4b5563', text: '#1f2937' },
        dark: { bg: '#2d3748', border: '#9ca3af', text: '#e5e7eb' }
    },
    avg: {
        light: { bg: '#f3f4f6', border: '#4b5563', text: '#1f2937' },
        dark: { bg: '#2d3748', border: '#9ca3af', text: '#e5e7eb' }
    }
  };

  const minStyle = theme === 'dark' ? statBoxStyles.min.dark : statBoxStyles.min.light;
  const maxStyle = theme === 'dark' ? statBoxStyles.max.dark : statBoxStyles.max.light;
  const avgStyle = theme === 'dark' ? statBoxStyles.avg.dark : statBoxStyles.avg.light;

  // filteredHistory는 이제 Context에서 가져옴 (Provider에서 필터링)

  // 비교 데이터를 날짜별로 매핑
  const comparisonPriceMap = useMemo(() => {
    if (!comparisonData) return new Map<string, number>();
    const map = new Map<string, number>();
    comparisonData.normalHistory.forEach((entry) => {
      const dateStr = entry.date || entry.timestamp.split('T')[0];
      map.set(dateStr, entry.price);
    });
    return map;
  }, [comparisonData]);

  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();
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
      const dayOfWeek = dateObj.getUTCDay();
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 이벤트 찾기
      const event = EVENTS.find(e => e.date === dateString);
      const eventLabel = event?.label;
      // 이벤트 점 색상 (60-30-10 법칙)
      // 특별이벤트(10% 강조): 주황으로 전 카테고리 통일
      // 수요일: 기본 빨간색, 유물각인서=파란색
      const isSpecialEvent = !!event;
      const catLabel = categoryStyle?.label;
      const eventColor = isSpecialEvent
        ? '#f97316'
        : (dayOfWeek === 3
          ? (catLabel === '유물 각인서' ? '#3b82f6' : '#ef4444')
          : undefined);

      // 비교 가격 가져오기 (날짜 매칭)
      const comparisonPrice = comparisonPriceMap.get(dateString);

      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        비교가격: comparisonPrice,
        rawTime: dateObj.getTime(),
        isWednesday: dayOfWeek === 3,
        fullDate: dateObj,
        eventLabel,
        eventColor,
        hasEvent: !!eventLabel || dayOfWeek === 3
      });
    });
    const sorted = Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);

    // 다운샘플링: 180포인트 초과 시 간격 추출 (이벤트/수요일 포인트는 보존)
    const MAX_POINTS = 180;
    if (sorted.length <= MAX_POINTS) return sorted;

    const step = Math.ceil(sorted.length / MAX_POINTS);
    return sorted.filter((point, i) =>
      i === 0 || i === sorted.length - 1 || point.hasEvent || i % step === 0
    );
  }, [filteredHistory, comparisonPriceMap, categoryStyle]);

  const formatPrice = useCallback((value: number) => {
    // 악세, 보석 카테고리는 소수점 없이 표시
    if (categoryStyle?.label === '악세' || categoryStyle?.label === '팔찌' || categoryStyle?.label === '보석') {
      return Math.round(value).toLocaleString('ko-KR');
    }
    if (value < 100) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  }, [categoryStyle]);

  const formatTooltipPrice = useCallback((value: number) => {
    // 악세, 보석 카테고리는 소수점 없이 표시
    if (categoryStyle?.label === '악세' || categoryStyle?.label === '팔찌' || categoryStyle?.label === '보석') {
      return Math.round(value).toLocaleString('ko-KR') + ' G';
    }
    if (value < 100) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G';
    }
    // 10만 이상은 소수점 없이 표시
    if (value >= 100000) {
      return Math.round(value).toLocaleString('ko-KR') + ' G';
    }
    return value.toLocaleString('ko-KR') + ' G';
  }, [categoryStyle]);

  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const current = filteredHistory[filteredHistory.length - 1].price;
    const min = Math.min(...filteredHistory.map(h => h.price));
    const max = Math.max(...filteredHistory.map(h => h.price));
    const avg = filteredHistory.reduce((sum, h) => sum + h.price, 0) / filteredHistory.length;

    // 최저가 대비 현재가 변동률 계산
    const changeFromMin = min > 0 ? ((current - min) / min) * 100 : 0;

    return {
      current,
      min,
      max,
      avg,
      changeFromMin,
    };
  }, [filteredHistory]);

  const yAxisConfig = useMemo(() => {
    if (!stats) return { domain: ['auto', 'auto'], ticks: [], avgValue: null };

    const priceRange = stats.max - stats.min;
    const avgPrice = stats.avg;

    // 목표 틱 개수 (5-7개 정도로 제한)
    const TARGET_TICK_COUNT = 15;

    // 가격대별로 적절한 틱 단위 결정 (틱 개수를 줄이기 위해 더 큰 단위 사용)
    let tickUnit = 1;

    // 100만 골드 이상
    if (stats.max >= 1000000) {
      if (priceRange >= 500000) tickUnit = 200000;
      else if (priceRange >= 200000) tickUnit = 100000;
      else if (priceRange >= 100000) tickUnit = 50000;
      else tickUnit = 20000;
    }
    // 10만~100만 골드
    else if (stats.max >= 100000) {
      if (priceRange >= 50000) tickUnit = 20000;
      else if (priceRange >= 20000) tickUnit = 10000;
      else if (priceRange >= 10000) tickUnit = 5000;
      else tickUnit = 2000;
    }
    // 1만~10만 골드
    else if (stats.max >= 10000) {
      if (priceRange >= 10000) tickUnit = 5000;
      else if (priceRange >= 5000) tickUnit = 2000;
      else if (priceRange >= 2000) tickUnit = 1000;
      else tickUnit = 500;
    }
    // 1000~1만 골드
    else if (stats.max >= 1000) {
      if (priceRange >= 2000) tickUnit = 1000;
      else if (priceRange >= 1000) tickUnit = 500;
      else if (priceRange >= 500) tickUnit = 200;
      else tickUnit = 100;
    }
    // 100~1000 골드
    else if (stats.max >= 100) {
      if (priceRange >= 200) tickUnit = 100;
      else if (priceRange >= 100) tickUnit = 50;
      else if (priceRange >= 50) tickUnit = 20;
      else tickUnit = 10;
    }
    // 100 골드 미만
    else {
      if (priceRange >= 50) tickUnit = 20;
      else if (priceRange >= 20) tickUnit = 10;
      else if (priceRange >= 10) tickUnit = 5;
      else if (priceRange >= 5) tickUnit = 2;
      else if (priceRange >= 2) tickUnit = 1;
      else if (priceRange >= 1) tickUnit = 0.5;
      else tickUnit = 0.2;
    }

    // 정확한 평균가를 중심 틱으로 사용 (반올림하지 않음)
    const centerTick = avgPrice;

    // 데이터 범위에 약간의 패딩 추가
    const paddingRatio = 0.15; // 15% 패딩으로 상단 여유 확보
    const padding = Math.max(priceRange * paddingRatio, tickUnit * 1.5);
    const minWithPadding = stats.min - padding;
    const maxWithPadding = stats.max + padding;

    // 평균가(정확한 값)을 기준으로 위아래로 틱 생성
    const ticks = [centerTick];

    if (stats.max < 100) {
      // 100 미만: 부동소수점 오차 방지
      const centerTickScaled = Math.round(centerTick * 100); // 소수점 2자리까지 정확히
      const minScaled = Math.round(minWithPadding * 100);
      const maxScaled = Math.round(maxWithPadding * 100);
      let tickUnitScaled = Math.round(tickUnit * 100);

      // 아래쪽 틱 추가
      let currentTickScaled = centerTickScaled - tickUnitScaled;
      while (currentTickScaled >= minScaled && ticks.length < TARGET_TICK_COUNT) {
        ticks.unshift(currentTickScaled / 100);
        currentTickScaled -= tickUnitScaled;
      }

      // 위쪽 틱 추가
      currentTickScaled = centerTickScaled + tickUnitScaled;
      while (currentTickScaled <= maxScaled && ticks.length < TARGET_TICK_COUNT) {
        ticks.push(currentTickScaled / 100);
        currentTickScaled += tickUnitScaled;
      }

      // 틱이 너무 많으면 간격을 2배로 늘려서 재계산
      if (ticks.length > TARGET_TICK_COUNT) {
        tickUnitScaled *= 2;
        const newTicks = [centerTick];

        currentTickScaled = centerTickScaled - tickUnitScaled;
        while (currentTickScaled >= minScaled) {
          newTicks.unshift(currentTickScaled / 100);
          currentTickScaled -= tickUnitScaled;
        }

        currentTickScaled = centerTickScaled + tickUnitScaled;
        while (currentTickScaled <= maxScaled) {
          newTicks.push(currentTickScaled / 100);
          currentTickScaled += tickUnitScaled;
        }

        ticks.length = 0;
        ticks.push(...newTicks);
      }
    } else {
      // 100 이상
      let actualTickUnit = tickUnit;

      // 아래쪽 틱 추가
      let currentTick = centerTick - actualTickUnit;
      while (currentTick >= minWithPadding && ticks.length < TARGET_TICK_COUNT) {
        ticks.unshift(currentTick);
        currentTick -= actualTickUnit;
      }

      // 위쪽 틱 추가
      currentTick = centerTick + actualTickUnit;
      while (currentTick <= maxWithPadding && ticks.length < TARGET_TICK_COUNT) {
        ticks.push(currentTick);
        currentTick += actualTickUnit;
      }

      // 틱이 너무 많으면 간격을 2배로 늘려서 재계산
      if (ticks.length > TARGET_TICK_COUNT) {
        actualTickUnit *= 2;
        const newTicks = [centerTick];

        currentTick = centerTick - actualTickUnit;
        while (currentTick >= minWithPadding) {
          newTicks.unshift(currentTick);
          currentTick -= actualTickUnit;
        }

        currentTick = centerTick + actualTickUnit;
        while (currentTick <= maxWithPadding) {
          newTicks.push(currentTick);
          currentTick += actualTickUnit;
        }

        ticks.length = 0;
        ticks.push(...newTicks);
      }
    }

    // 도메인 설정 (최소/최대 틱 기준으로 약간의 여유 추가)
    const minTick = ticks[0];
    const maxTick = ticks[ticks.length - 1];
    
    // 틱 사이의 간격을 계산합니다 (틱이 하나만 있는 경우 대비 안전장치 포함)
    const tickGap = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 0;
    
    // 소수점 오차로 인해 숫자가 잘리는 것을 막기 위해
    // 틱 간격의 5% 정도만큼 위아래로 범위를 살짝 넓혀줍니다.
    const buffer = tickGap * 0.05;

    // 버퍼가 0일 경우(틱이 1개뿐일 때)를 대비해 안전하게 처리
    const domainMin = minTick - (buffer || 0.1);
    const domainMax = maxTick + (buffer || 0.1);

    return {
      domain: [domainMin, domainMax],
      ticks,
      avgValue: centerTick // 정확한 평균가 (틱으로 표시됨)
    };
  }, [stats]);

  const changeRate = useMemo(() => {
    if (chartData.length < 2) return 0;
    const today = chartData[chartData.length - 1].가격;
    const yesterday = chartData[chartData.length - 2].가격;
    return ((today - yesterday) / yesterday) * 100;
  }, [chartData]);

  const averagePrice = useMemo(() => {
    if (filteredHistory.length === 0) return 0;
    return filteredHistory.reduce((acc, entry) => acc + entry.price, 0) / filteredHistory.length;
  }, [filteredHistory]);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const eventLabel = data.eventLabel || (data.isWednesday ? '수요일' : '');
    const eventColor = data.eventColor || '#ef4444';

    // 비교 가격 및 차이 계산
    const mainPrice = data.가격;
    const compPrice = data.비교가격;
    const ratio = comparisonData?.ratio || 5;
    const originalPrice = compPrice ? compPrice / ratio : null; // 원래 가격 (×5 전)
    const priceDiff = compPrice ? mainPrice - compPrice : null;
    const priceDiffPercent = compPrice ? ((mainPrice - compPrice) / compPrice) * 100 : null;

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
        <div style={{ fontWeight: '700', color: chartColor, marginBottom: '10px', fontSize: '16px' }}>
          {label} {eventLabel && <span style={{ color: eventColor }}>({eventLabel})</span>}
        </div>
        <div style={{ fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
          <Image src={selectedItem?.icon || ''} alt="" width={20} height={20} style={{ borderRadius: '4px' }} />
          <span>{formatTooltipPrice(mainPrice)}</span>
        </div>
        {compPrice !== undefined && compPrice !== null && originalPrice !== null && (
          <>
            <div style={{ fontWeight: '600', fontSize: '14px', color: comparisonColor, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
              <Image src={comparisonData?.normalIcon || ''} alt="" width={18} height={18} style={{ borderRadius: '3px' }} />
              <span>{formatTooltipPrice(originalPrice)}</span>
              <span style={{ color: 'var(--text-secondary)' }}>×{ratio}</span>
              <span>=</span>
              <span style={{ fontWeight: '700' }}>{formatTooltipPrice(compPrice)}</span>
            </div>
            {priceDiff !== null && priceDiffPercent !== null && (
              <div style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'var(--font-mono), monospace', fontVariantNumeric: 'tabular-nums'
              }}>
                <Image src={selectedItem?.icon || ''} alt="" width={22} height={22} style={{ borderRadius: '4px' }} />
                <span style={{ fontSize: '18px', fontWeight: '800', color: priceDiff >= 0 ? '#ef4444' : '#3b82f6' }}>
                  {priceDiff >= 0 ? '>' : '<'}
                </span>
                <Image src={comparisonData?.normalIcon || ''} alt="" width={22} height={22} style={{ borderRadius: '4px' }} />
                <span style={{ fontSize: '18px', fontWeight: '800', color: priceDiff >= 0 ? '#ef4444' : '#3b82f6' }}>
                  {priceDiff >= 0 ? '+' : ''}{priceDiffPercent.toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // 모바일용 커스텀 툴팁
  const CustomTooltipMobile = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const eventLabel = data.eventLabel || (data.isWednesday ? '수요일' : '');
    const eventColor = data.eventColor || '#ef4444';

    // 비교 가격 및 차이 계산
    const mainPrice = data.가격;
    const compPrice = data.비교가격;
    const ratio = comparisonData?.ratio || 5;
    const originalPrice = compPrice ? compPrice / ratio : null;
    const priceDiff = compPrice ? mainPrice - compPrice : null;
    const priceDiffPercent = compPrice ? ((mainPrice - compPrice) / compPrice) * 100 : null;

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
        <div style={{ fontWeight: '700', color: chartColor, marginBottom: '6px', fontSize: '12px' }}>
          {label} {eventLabel && <span style={{ color: eventColor }}>({eventLabel})</span>}
        </div>
        <div style={{ fontWeight: '700', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
          <Image src={selectedItem?.icon || ''} alt="" width={16} height={16} style={{ borderRadius: '3px' }} />
          <span>{formatTooltipPrice(mainPrice)}</span>
        </div>
        {compPrice !== undefined && compPrice !== null && originalPrice !== null && (
          <>
            <div style={{ fontWeight: '600', fontSize: '10px', color: comparisonColor, marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono), monospace', fontVariantNumeric: 'tabular-nums' }}>
              <Image src={comparisonData?.normalIcon || ''} alt="" width={14} height={14} style={{ borderRadius: '2px' }} />
              <span>{formatTooltipPrice(originalPrice)}</span>
              <span style={{ color: 'var(--text-secondary)' }}>×{ratio}</span>
              <span>=</span>
              <span style={{ fontWeight: '700' }}>{formatTooltipPrice(compPrice)}</span>
            </div>
            {priceDiff !== null && priceDiffPercent !== null && (
              <div style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                fontFamily: 'var(--font-mono), monospace', fontVariantNumeric: 'tabular-nums'
              }}>
                <Image src={selectedItem?.icon || ''} alt="" width={16} height={16} style={{ borderRadius: '3px' }} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: priceDiff >= 0 ? '#ef4444' : '#3b82f6' }}>
                  {priceDiff >= 0 ? '>' : '<'}
                </span>
                <Image src={comparisonData?.normalIcon || ''} alt="" width={16} height={16} style={{ borderRadius: '3px' }} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: priceDiff >= 0 ? '#ef4444' : '#3b82f6' }}>
                  {priceDiff >= 0 ? '+' : ''}{priceDiffPercent.toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // 기간별 점 표시 규칙:
  // 7D, 1M: 전부 표시
  // 3M, 6M, 1Y: 수요일 + 특별 이벤트만
  // ALL: 특별 이벤트만
  const showAllDots = selectedPeriod === '7d' || selectedPeriod === '1m';
  const showWednesdayDots = showAllDots || ['3m', '6m', '1y'].includes(selectedPeriod);

  // 커스텀 점 렌더러 (이벤트 라벨 포함)
  const CustomDot = (props: CustomDotProps) => {
    const { cx, cy, payload } = props;
    if (!payload || cx === undefined || cy === undefined) return null;
    const isSpecialEvent = !!payload.eventLabel;
    const isWednesday = !isSpecialEvent && payload.isWednesday;
    const eventColor = payload.eventColor || '#ef4444';

    // 일반 점
    if (!isSpecialEvent && !isWednesday) {
      if (!showAllDots) return null;
      return <circle cx={cx} cy={cy} r={6} fill={chartColor} strokeWidth={3} stroke="var(--card-bg)" />;
    }

    // 수요일 점
    if (isWednesday) {
      if (!showWednesdayDots) return null;
      if (showAllDots) {
        // 7D/1M: 라벨 포함
        return (
          <g>
            <circle cx={cx} cy={cy} r={6} fill={eventColor} strokeWidth={3} stroke="var(--card-bg)" />
            <text x={cx} y={cy - 15} textAnchor="middle" fill={eventColor}
              fontSize={11} fontWeight="700"
              style={{ textShadow: '0 0 3px var(--card-bg), 0 0 3px var(--card-bg), 0 0 3px var(--card-bg)' }}>
              수요일
            </text>
          </g>
        );
      }
      // 3M/6M/1Y: 점만
      return <circle cx={cx} cy={cy} r={6} fill={eventColor} strokeWidth={3} stroke="var(--card-bg)" />;
    }

    // 특별 이벤트 점 (항상 표시)
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill={eventColor} strokeWidth={3} stroke="var(--card-bg)" />
        <text x={cx} y={cy - 15} textAnchor="middle" fill={eventColor}
          fontSize={12} fontWeight="900"
          style={{ textShadow: '0 0 4px var(--card-bg), 0 0 4px var(--card-bg), 0 0 4px var(--card-bg), 0 0 4px var(--card-bg)' }}>
          {payload.eventLabel}
        </text>
      </g>
    );
  };

  // 모바일용 커스텀 점 렌더러
  const CustomDotMobile = (props: CustomDotProps) => {
    const { cx, cy, payload } = props;
    if (!payload || cx === undefined || cy === undefined) return null;
    const isSpecialEvent = !!payload.eventLabel;
    const isWednesday = !isSpecialEvent && payload.isWednesday;
    const eventColor = payload.eventColor || '#ef4444';

    if (!isSpecialEvent && !isWednesday) {
      if (!showAllDots) return null;
      return <circle cx={cx} cy={cy} r={3} fill={chartColor} strokeWidth={2} stroke="var(--card-bg)" />;
    }

    if (isWednesday) {
      if (!showWednesdayDots) return null;
      return <circle cx={cx} cy={cy} r={3} fill={eventColor} strokeWidth={2} stroke="var(--card-bg)" />;
    }

    // 특별 이벤트 (항상 표시)
    return <circle cx={cx} cy={cy} r={4} fill={eventColor} strokeWidth={2} stroke="var(--card-bg)" />;
  };

  // 기간 라벨 맵핑
  const periodLabels: Record<PeriodOption, string> = {
    '7d': '7D',
    '1m': '1M',
    '3m': '3M',
    '6m': '6M',
    '1y': '1Y',
    'all': 'ALL'
  };

  // X축에 표시할 날짜 계산 (오늘 기준 균일한 간격으로 역산)
  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];

    // 데이터가 1개면 그 날짜만 표시
    if (chartData.length === 1) {
      return [chartData[0].날짜];
    }

    // 기간별 표시 간격 설정
    let interval: number;
    switch (selectedPeriod) {
      case '7d':
        interval = 1; // 매일
        break;
      case '1m':
        interval = 3; // 3일 간격
        break;
      case '3m':
        interval = 7; // 7일 간격
        break;
      case '6m':
        interval = 14; // 14일 간격
        break;
      case '1y':
        interval = 30; // 30일 간격
        break;
      case 'all':
        interval = 30; // 30일 간격 (약 1개월)
        break;
      default:
        interval = 1;
    }

    const ticks: string[] = [];
    const tickSet = new Set<string>();

    // 오늘 날짜부터 시작
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 차트 데이터의 시작 날짜
    const firstDate = chartData[0].fullDate;

    // 오늘부터 역산하면서 간격에 맞는 날짜 생성
    let currentDate = new Date(today);

    while (currentDate >= firstDate) {
      const dateKey = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;

      // 해당 날짜에 데이터가 있는지 확인
      const hasData = chartData.some(d => d.날짜 === dateKey);

      if (hasData && !tickSet.has(dateKey)) {
        ticks.push(dateKey);
        tickSet.add(dateKey);
      }

      // 간격만큼 날짜 빼기
      currentDate.setDate(currentDate.getDate() - interval);
    }

    // 날짜 순서대로 정렬
    return ticks.sort((a, b) => {
      const aIndex = chartData.findIndex(d => d.날짜 === a);
      const bIndex = chartData.findIndex(d => d.날짜 === b);
      return aIndex - bIndex;
    });
  }, [chartData, selectedPeriod]);

  if (!selectedItem) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  return (
    <Card className="price-chart-card" style={{ color: 'var(--text-primary)', maxWidth: '1400px', margin: '0 auto' }}>
      <Card.Header
        className="py-3 d-none d-md-block"
        style={{ backgroundColor: 'var(--card-header-bg)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="d-flex align-items-center" style={{ gap: '16px' }}>
          <div className="d-flex align-items-center gap-2" style={{ flex: '1' }}>
            {selectedItem.icon && (
              <Image
                src={selectedItem.icon}
                alt={selectedItem.name}
                width={48}
                height={48}
                style={{
                  borderRadius: '8px',
                  border: `2px solid ${selectedItem.iconBorderColor || chartColor}`,
                  boxShadow: `0 2px 8px ${selectedItem.iconBorderColor ? selectedItem.iconBorderColor + '33' : chartColor + '33'}`
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div>
                {(categoryStyle?.label === '악세' || categoryStyle?.label === '팔찌') && selectedItem.displayName ? (
                  (() => {
                    const parts = selectedItem.displayName.split('\n');
                    if (parts.length === 3) {
                      return (
                        <div>
                          <h5 className="mb-0" style={{ fontWeight: '700', color: chartColor, lineHeight: '1.3', fontSize: '0.95rem' }}>
                            <div><ColoredItemName name={parts[0]} /></div>
                            <div><ColoredItemName name={parts[1]} /></div>
                          </h5>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                            {parts[2]}, {selectedItem.type === 'market' ? '거래소' : '경매장'}
                          </small>
                        </div>
                      );
                    }
                    return (
                      <h5 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.95rem' }}>
                        <ColoredItemName name={selectedItem.displayName} />
                      </h5>
                    );
                  })()
                ) : (
                  <>
                    <h5 className="mb-0" style={{ fontWeight: '700', color: chartColor }}>
                      <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
                    </h5>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {selectedItem.type === 'market' ? '거래소' : '경매장'}
                    </small>
                  </>
                )}
              </div>
              {/* 가격선 설정 톱니바퀴 */}
              <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPriceInput(!showPriceInput)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentCustomLines ? '#10b981' : 'var(--text-muted)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = currentCustomLines ? '#10b981' : 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = currentCustomLines ? '#10b981' : 'var(--text-muted)'}
                title="차트 설정"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {/* 가격 입력 팝업 */}
              {showPriceInput && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    zIndex: 100,
                    minWidth: '220px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    가격선 설정
                  </div>

                  {/* 판매가 */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      판매가 (녹색)
                    </label>
                    <input
                      type="number"
                      value={tempSellPrice}
                      onChange={(e) => setTempSellPrice(e.target.value)}
                      placeholder="판매가"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  {/* 구매가 */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      구매가 (주황)
                    </label>
                    <input
                      type="number"
                      value={tempBuyPrice}
                      onChange={(e) => setTempBuyPrice(e.target.value)}
                      placeholder="구매가"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  {/* 버튼 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={clearPriceLines}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                    <button
                      onClick={savePriceLines}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {!hidePeriodButtons && (
            <div className="d-flex justify-content-center gap-2" style={{ flex: '1' }}>
              {(['7d', '1m', '3m', 'all'] as PeriodOption[]).map((period) => (
                <button
                  key={period}
                  className="shadow-hard"
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '4px 16px',
                    borderRadius: '10px',
                    border: selectedPeriod === period ? `2px solid ${chartColor}` : '2px solid var(--border-color)',
                    backgroundColor: selectedPeriod === period ? (theme === 'dark' ? (categoryStyle?.darkBg || '#3c4043') : (categoryStyle?.lightBg || '#f0fdf4')) : 'var(--card-bg)',
                    color: selectedPeriod === period ? chartColor : 'var(--text-secondary)',
                    fontWeight: selectedPeriod === period ? '700' : '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPeriod !== period) {
                      e.currentTarget.style.borderColor = chartColor;
                      e.currentTarget.style.color = chartColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPeriod !== period) {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>
          )}

          {/* 범례 */}
          <div className="d-flex align-items-center justify-content-center flex-wrap" style={{ gap: '12px', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke={chartColor} strokeWidth="2" strokeDasharray="4 3" /></svg>
              평균가
            </span>
            {currentCustomLines?.sellPrice != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#10b981" strokeWidth="2.5" strokeDasharray="8 4" /></svg>
                판매가
              </span>
            )}
            {currentCustomLines?.buyPrice != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="8 4" /></svg>
                구매가
              </span>
            )}
            {activeReferenceLines?.has('min') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" /></svg>
                최저가
              </span>
            )}
            {activeReferenceLines?.has('max') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" /></svg>
                최고가
              </span>
            )}
            {activeReferenceLines?.has('current') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6 3" /></svg>
                현재가
              </span>
            )}
            {activeReferenceLines?.has('avg') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#6b7280" strokeWidth="2" strokeDasharray="6 3" /></svg>
                기간평균
              </span>
            )}
          </div>

          {stats && (
            <div className="text-end" style={{ flex: '1' }}>
              <div className="font-numeric" style={{ fontSize: '1.5rem', fontWeight: '700', color: chartColor }}>
                {formatTooltipPrice(stats.current)}
              </div>
              <div className="font-numeric" style={{ fontSize: '1.4rem', fontWeight: '600', color: changeRate >= 0 ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <Image
                  src={changeRate >= 0 ? '/up.png' : '/down.png'}
                  alt={changeRate >= 0 ? 'up' : 'down'}
                  width={20}
                  height={20}
                  style={{ objectFit: 'contain' }}
                />
                {Math.abs(changeRate).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Header
        className="py-2 d-md-none"
        style={{ backgroundColor: 'var(--card-header-bg)', borderBottom: 'none', paddingBottom: 0 }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            {selectedItem.icon && (
              <Image
                src={selectedItem.icon}
                alt={selectedItem.name}
                width={36}
                height={36}
                style={{
                  height: '36px',
                  borderRadius: '6px',
                  border: `2px solid ${selectedItem.iconBorderColor || chartColor}`,
                  boxShadow: `0 2px 6px ${selectedItem.iconBorderColor ? selectedItem.iconBorderColor + '33' : chartColor + '33'}`
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div>
                {(categoryStyle?.label === '악세' || categoryStyle?.label === '팔찌') && selectedItem.displayName ? (
                  (() => {
                    const parts = selectedItem.displayName.split('\n');
                    if (parts.length === 3) {
                      return (
                        <div>
                          <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.63rem', lineHeight: '1.3', wordBreak: 'keep-all' }}>
                            <div><ColoredItemName name={parts[0]} /></div>
                            <div><ColoredItemName name={parts[1]} /></div>
                          </h6>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.58rem', display: 'block', marginTop: '2px' }}>
                            {parts[2]}, {selectedItem.type === 'market' ? '거래소' : '경매장'}
                          </small>
                        </div>
                      );
                    }
                    return (
                      <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.63rem', lineHeight: '1.3', wordBreak: 'keep-all', whiteSpace: 'pre-line' }}>
                        <ColoredItemName name={selectedItem.displayName} />
                      </h6>
                    );
                  })()
                ) : (
                  <>
                    <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.75rem', lineHeight: '1.3', wordBreak: 'keep-all', whiteSpace: 'pre-line' }}>
                      <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
                    </h6>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                      {selectedItem.type === 'market' ? '거래소' : '경매장'}
                    </small>
                  </>
                )}
              </div>
              {/* 모바일 가격선 설정 톱니바퀴 */}
              <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPriceInput(!showPriceInput)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentCustomLines ? '#10b981' : 'var(--text-muted)',
                }}
                title="차트 설정"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {/* 모바일 가격 입력 팝업 */}
              {showPriceInput && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    zIndex: 100,
                    minWidth: '180px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    가격선 설정
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      판매가 (녹색)
                    </label>
                    <input
                      type="number"
                      value={tempSellPrice}
                      onChange={(e) => setTempSellPrice(e.target.value)}
                      placeholder="판매가"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                      구매가 (주황)
                    </label>
                    <input
                      type="number"
                      value={tempBuyPrice}
                      onChange={(e) => setTempBuyPrice(e.target.value)}
                      placeholder="구매가"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={clearPriceLines}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '5px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                    <button
                      onClick={savePriceLines}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '5px',
                        border: 'none',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
          {stats && (
            <div className="text-end">
              <div className="font-numeric" style={{ fontSize: '1rem', fontWeight: '700', color: chartColor, whiteSpace: 'nowrap' }}>
                {formatTooltipPrice(stats.current)}
              </div>
              <div className="font-numeric" style={{ fontSize: '1rem', fontWeight: '600', color: changeRate >= 0 ? '#ef4444' : '#3b82f6', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
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

      <Card.Body className="py-0 px-2 px-md-3" style={{ backgroundColor: 'var(--card-bg)' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
            <p className="mt-3" style={{ color: 'var(--text-muted)' }}>데이터 로딩 중...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: '3rem', opacity: 0.3 }}>📊</div>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>아직 수집된 데이터가 없습니다</p>
            <small style={{ color: 'var(--text-muted)' }}>가격 수집 후 차트가 표시됩니다</small>
          </div>
        ) : !isMounted ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isMobile ? '350px' : '500px' }}>
            <Spinner animation="border" size="sm" />
          </div>
        ) : (
          <>
            {!isMobile && <div style={{ width: '100%', height: '500px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={500}>
                <LineChart data={chartData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/><stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="var(--border-color)" strokeWidth={1} vertical={true} horizontal={true} />
                  <XAxis dataKey="날짜" ticks={xAxisTicks} tick={(props) => { const { x, y, payload } = props; const dataIndex = chartData.findIndex(d => d.날짜 === payload.value); if (dataIndex < 0) return null; const data = chartData[dataIndex]; const eventLabel = data.eventLabel || (data.isWednesday ? '수요일' : ''); const eventColor = data.eventColor || '#ef4444'; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={10} textAnchor="end" fill="var(--text-primary)" fontSize={16} fontWeight="700" fontFamily="var(--font-mono), monospace" transform="rotate(-35)">{payload.value}</text>{eventLabel && (<text x={0} y={12} dy={10} textAnchor="end" fill={eventColor} fontSize={12} fontWeight="700" transform="rotate(-35)">{eventLabel}</text>)}</g>); }} height={80} stroke="var(--text-secondary)" strokeWidth={2} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} />
                  <YAxis tick={(props) => { const { x, y, payload } = props; const isAverage = yAxisConfig.avgValue && Math.abs(payload.value - yAxisConfig.avgValue) < 0.01; return (<text x={x} y={y} textAnchor="end" fill={isAverage ? chartColor : 'var(--text-primary)'} fontSize={stats && stats.max >= 1000000 ? 14 : 16} fontWeight={isAverage ? '900' : '700'} fontFamily="var(--font-mono), monospace" dx={-8}>{formatPrice(payload.value)}</text>); }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 105 : stats && stats.max >= 100000 ? 90 : stats && stats.max >= 10000 ? 78 : stats && stats.max >= 1000 ? 65 : stats && stats.max >= 100 ? 50 : 45} domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} interval={0} stroke="var(--text-secondary)" strokeWidth={2} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColor, strokeWidth: 2, strokeDasharray: '5 5' }} />
                  <ReferenceLine y={averagePrice} stroke={chartColor} strokeDasharray="5 5" strokeWidth={2} />
                  {/* 사용자 선택 참조선 */}
                  {activeReferenceLines?.has('min') && stats && (
                    <ReferenceLine y={stats.min} stroke="#3b82f6" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {activeReferenceLines?.has('max') && stats && (
                    <ReferenceLine y={stats.max} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {activeReferenceLines?.has('current') && stats && (
                    <ReferenceLine y={stats.current} stroke="#8b5cf6" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {activeReferenceLines?.has('avg') && stats && (
                    <ReferenceLine y={stats.avg} stroke="#6b7280" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {/* 커스텀 가격선 - 판매가 (녹색) */}
                  {currentCustomLines?.sellPrice && (
                    <ReferenceLine y={currentCustomLines.sellPrice} stroke="#10b981" strokeDasharray="10 5" strokeWidth={2.5} />
                  )}
                  {/* 커스텀 가격선 - 구매가 (주황) */}
                  {currentCustomLines?.buyPrice && (
                    <ReferenceLine y={currentCustomLines.buyPrice} stroke="#f59e0b" strokeDasharray="10 5" strokeWidth={2.5} />
                  )}
                  {/* 비교 라인 (일반 재료 × 5) - 점선 */}
                  {comparisonData && (
                    <Line type="monotone" dataKey="비교가격" stroke={comparisonColor} strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={{ r: 6, fill: comparisonColor, stroke: 'var(--card-bg)', strokeWidth: 2 }} connectNulls />
                  )}
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={4} dot={<CustomDot />} activeDot={{ r: 9, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 4 }} fill="url(#colorPrice)" />
                </LineChart>
              </ResponsiveContainer>
            </div>}

            {isMobile && <div style={{ width: '100%', height: '350px', marginTop: '-8px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                <LineChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPriceMobile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/><stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeWidth={0.5} vertical={false} horizontal={true} />
                  <XAxis dataKey="날짜" ticks={xAxisTicks} tick={(props) => { const { x, y, payload } = props; const dataIndex = chartData.findIndex(d => d.날짜 === payload.value); if (dataIndex < 0) return null; const data = chartData[dataIndex]; const eventLabel = data.eventLabel || (data.isWednesday ? '수요일' : ''); const eventColor = data.eventColor || '#ef4444'; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={8} textAnchor="end" fill="var(--text-primary)" fontSize={9} fontWeight="700" fontFamily="var(--font-mono), monospace" transform="rotate(-45)">{payload.value}</text>{eventLabel && (<text x={0} y={8} dy={8} textAnchor="end" fill={eventColor} fontSize={7} fontWeight="700" transform="rotate(-45)">{eventLabel}</text>)}</g>); }} height={55} stroke="var(--text-secondary)" strokeWidth={1.5} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <YAxis tick={(props) => { const { x, y, payload } = props; const isAverage = yAxisConfig.avgValue && Math.abs(payload.value - yAxisConfig.avgValue) < 0.01; const fontSize = stats ? (stats.max >= 1000000 ? 6 : stats.max >= 100000 ? 7 : stats.max >= 10000 ? 8 : stats.max >= 1000 ? 9 : stats.max >= 100 ? 7.5 : 7) : 8; return (<text x={x} y={y} textAnchor="end" fill={isAverage ? chartColor : 'var(--text-primary)'} fontSize={fontSize} fontWeight={isAverage ? '900' : '700'} fontFamily="var(--font-mono), monospace" dx={-2}>{formatPrice(payload.value)}</text>); }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 46 : stats && stats.max >= 100000 ? 42 : stats && stats.max >= 10000 ? 38 : stats && stats.max >= 1000 ? 34 : stats && stats.max >= 100 ? 26 : 24} domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} stroke="var(--text-secondary)" strokeWidth={1.5} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <Tooltip content={<CustomTooltipMobile />} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <ReferenceLine y={averagePrice} stroke={chartColor} strokeDasharray="5 5" strokeWidth={1.5} />
                  {/* 사용자 선택 참조선 - 모바일 */}
                  {activeReferenceLines?.has('min') && stats && (
                    <ReferenceLine y={stats.min} stroke="#3b82f6" strokeDasharray="6 3" strokeWidth={1.5} />
                  )}
                  {activeReferenceLines?.has('max') && stats && (
                    <ReferenceLine y={stats.max} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} />
                  )}
                  {activeReferenceLines?.has('current') && stats && (
                    <ReferenceLine y={stats.current} stroke="#8b5cf6" strokeDasharray="6 3" strokeWidth={1.5} />
                  )}
                  {activeReferenceLines?.has('avg') && stats && (
                    <ReferenceLine y={stats.avg} stroke="#6b7280" strokeDasharray="6 3" strokeWidth={1.5} />
                  )}
                  {/* 커스텀 가격선 - 판매가 (녹색) - 모바일 */}
                  {currentCustomLines?.sellPrice && (
                    <ReferenceLine y={currentCustomLines.sellPrice} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {/* 커스텀 가격선 - 구매가 (주황) - 모바일 */}
                  {currentCustomLines?.buyPrice && (
                    <ReferenceLine y={currentCustomLines.buyPrice} stroke="#f59e0b" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {/* 비교 라인 (일반 재료 × 5) - 점선 */}
                  {comparisonData && (
                    <Line type="monotone" dataKey="비교가격" stroke={comparisonColor} strokeWidth={1.5} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, fill: comparisonColor, stroke: 'var(--card-bg)', strokeWidth: 1 }} connectNulls />
                  )}
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={2.5} dot={<CustomDotMobile />} activeDot={{ r: 6, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 2 }} fill="url(#colorPriceMobile)" />
                </LineChart>
              </ResponsiveContainer>
            </div>}
          </>
        )}
      </Card.Body>
    </Card>
  );
}