'use client';

import { useTheme } from './ThemeProvider';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrackedItem } from '@/lib/items-to-track';

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type CategoryStyle = {
  label: string;
  color: string;
  darkColor: string;
  lightBg: string;
  darkThemeColor: string;
  darkBg: string;
};

type MiniPriceChartProps = {
  item: TrackedItem | null;
  categoryStyle?: CategoryStyle;
  isSelected?: boolean;
  onClick?: () => void;
  slotIndex: number;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

// 아이템명 색상 처리 컴포넌트 - (상)은 노란색, (중)은 보라색, 나머지는 부모 색상 상속
function ColoredItemName({ name }: { name: string }) {
  const regex = /(\d+\.?\d*%)\s*(\(상\))|(\d+\.?\d*%)\s*(\(중\))|(\(상\))|(\(중\))/g;
  const parts: React.JSX.Element[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(name)) !== null) {
    if (match.index > lastIndex) {
      // 일반 텍스트는 색상 지정 안함 (부모에서 상속)
      parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex, match.index)}</span>);
    }

    if (match[2] === '(상)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[1]} {match[2]}
        </span>
      );
    } else if (match[4] === '(중)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[3]} {match[4]}
        </span>
      );
    } else if (match[5] === '(상)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[5]}
        </span>
      );
    } else if (match[6] === '(중)') {
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[6]}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < name.length) {
    parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex)}</span>);
  }

  // parts가 비어있으면 그냥 name 반환 (색상은 부모에서 상속)
  return <>{parts.length > 0 ? parts : name}</>;
}

export default function MiniPriceChart({ item, categoryStyle, isSelected, onClick, slotIndex }: MiniPriceChartProps) {
  const { theme } = useTheme();
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedPeriod: PeriodOption = '1m';

  const chartColor = theme === 'dark'
    ? (categoryStyle?.darkThemeColor || '#8ab4f8')
    : (categoryStyle?.darkColor || '#16a34a');

  // 데이터 fetch
  useEffect(() => {
    if (!item?.id) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { getItemPriceHistory } = await import('@/lib/price-history-client');
        const priceHistory = await getItemPriceHistory(item.id, 365);
        setHistory(priceHistory);
      } catch (err) {
        console.error('Error fetching price history:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [item?.id]);

  // 기간 필터링
  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setMonth(now.getMonth() - 1); // 1m

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [history]);

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

      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        rawTime: dateObj.getTime(),
        fullDate: dateObj,
      });
    });
    return Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);
  }, [filteredHistory]);

  const formatPrice = useCallback((value: number) => {
    if (value >= 10000) {
      return Math.round(value / 1000) + 'k';
    }
    if (value < 100) {
      return value.toFixed(1);
    }
    return Math.round(value).toString();
  }, []);

  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const current = filteredHistory[filteredHistory.length - 1].price;
    const min = Math.min(...filteredHistory.map(h => h.price));
    const max = Math.max(...filteredHistory.map(h => h.price));
    const avg = filteredHistory.reduce((sum, h) => sum + h.price, 0) / filteredHistory.length;

    return { current, min, max, avg };
  }, [filteredHistory]);

  const yAxisConfig = useMemo(() => {
    if (!stats) return { domain: ['auto', 'auto'], ticks: [] };

    const priceRange = stats.max - stats.min;
    const padding = priceRange * 0.1;

    return {
      domain: [stats.min - padding, stats.max + padding],
      ticks: [stats.min, stats.avg, stats.max],
    };
  }, [stats]);

  // 전일 대비 변동률
  const changeRate = useMemo(() => {
    if (chartData.length < 2) return 0;
    const today = chartData[chartData.length - 1].가격;
    const yesterday = chartData[chartData.length - 2].가격;
    return ((today - yesterday) / yesterday) * 100;
  }, [chartData]);

  // X축 날짜 틱 계산 (1달 기준 3일 간격)
  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];

    if (chartData.length === 1) {
      return [chartData[0].날짜];
    }

    const interval = 3; // 1m = 3일 간격
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
  }, [chartData]);

  // 빈 슬롯
  if (!item) {
    return (
      <div
        onClick={onClick}
        style={{
          border: isSelected ? `3px solid ${chartColor}` : '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          background: 'var(--card-bg)',
          cursor: 'pointer',
          height: '100%',
          minHeight: '270px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          빈 슬롯 - 아이템 선택
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        border: isSelected ? `3px solid ${chartColor}` : '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px',
        background: 'var(--card-bg)',
        cursor: 'pointer',
        height: '100%',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 12px ${chartColor}40` : 'none',
      }}
    >
      {/* 헤더 - 2줄 구조 */}
      <div style={{ marginBottom: '10px' }}>
        {/* 첫째 줄: 아이콘 + 아이템명 (왼쪽) / 가격 (오른쪽) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <Image
              src={item.icon || '/icon.png'}
              alt={item.name}
              width={28}
              height={28}
              style={{ borderRadius: '6px', border: `1px solid ${chartColor}`, flexShrink: 0 }}
            />
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: chartColor,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <ColoredItemName name={item.name} />
            </div>
          </div>
          {stats && (
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: chartColor, flexShrink: 0 }}>
              {stats.current.toLocaleString()}G
            </div>
          )}
        </div>
        {/* 둘째 줄: 변동률 (오른쪽 정렬) */}
        {stats && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: changeRate >= 0 ? '#ef4444' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              <Image
                src={changeRate >= 0 ? '/up.png' : '/down.png'}
                alt={changeRate >= 0 ? 'up' : 'down'}
                width={10}
                height={10}
              />
              {Math.abs(changeRate).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* 차트 */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px' }}>
          <Spinner animation="border" size="sm" />
        </div>
      ) : (
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`miniGradient-${slotIndex}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeWidth={0.5} vertical={false} />
              <XAxis
                dataKey="날짜"
                ticks={xAxisTicks}
                tick={{ fill: 'var(--text-muted)', fontSize: 8 }}
                height={20}
                stroke="var(--border-color)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 8 }}
                tickFormatter={formatPrice}
                width={35}
                domain={yAxisConfig.domain}
                stroke="var(--border-color)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  border: `1px solid ${chartColor}`,
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
                formatter={(value) => [Number(value).toLocaleString() + ' G', '가격']}
              />
              {stats && (
                <ReferenceLine y={stats.avg} stroke={chartColor} strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Line
                type="monotone"
                dataKey="가격"
                stroke={chartColor}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: chartColor }}
                fill={`url(#miniGradient-${slotIndex})`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
