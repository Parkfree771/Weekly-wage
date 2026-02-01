'use client';

import { useTheme } from './ThemeProvider';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Customized } from 'recharts';
import { TrackedItem, SUCCESSION_TO_NORMAL_MATERIAL_MAP, SUCCESSION_MATERIAL_START_DATE } from '@/lib/items-to-track';
import { ColoredItemName } from '@/lib/components/ColoredItemName';
import type { CustomizedProps } from '@/types/recharts';

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
  isMobile?: boolean;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export default function MiniPriceChart({ item, categoryStyle, isSelected, onClick, slotIndex, isMobile = false }: MiniPriceChartProps) {
  const { theme } = useTheme();
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const selectedPeriod: PeriodOption = '1m';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 비교 데이터 (계승 재료 ↔ 일반 재료)
  const [comparisonHistory, setComparisonHistory] = useState<PriceEntry[]>([]);
  const [comparisonInfo, setComparisonInfo] = useState<{ normalIcon: string; ratio: number } | null>(null);

  const chartColor = theme === 'dark'
    ? (categoryStyle?.darkThemeColor || '#8ab4f8')
    : (categoryStyle?.darkColor || '#16a34a');

  const comparisonColor = '#9ca3af'; // 회색

  // 데이터 fetch
  useEffect(() => {
    if (!item?.id) {
      setHistory([]);
      setComparisonHistory([]);
      setComparisonInfo(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { getItemPriceHistory } = await import('@/lib/price-history-client');
        const priceHistory = await getItemPriceHistory(item.id, 365);
        setHistory(priceHistory);

        // 계승 재료 → 일반 재료 비교 데이터 가져오기
        const mapping = SUCCESSION_TO_NORMAL_MATERIAL_MAP[item.id];
        if (mapping) {
          const normalHistory = await getItemPriceHistory(mapping.normalId, 365);
          // 가격 × 5 적용하고, 계승 재료 시작일 이후 데이터만 필터링
          const filteredNormalHistory = normalHistory
            .filter(entry => {
              const entryDate = entry.date || entry.timestamp.split('T')[0];
              return entryDate >= SUCCESSION_MATERIAL_START_DATE;
            })
            .map(entry => ({
              ...entry,
              price: entry.price * mapping.ratio
            }));
          setComparisonHistory(filteredNormalHistory);
          setComparisonInfo({ normalIcon: mapping.normalIcon, ratio: mapping.ratio });
        } else {
          setComparisonHistory([]);
          setComparisonInfo(null);
        }
      } catch (err) {
        console.error('Error fetching price history:', err);
        setHistory([]);
        setComparisonHistory([]);
        setComparisonInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [item?.id]);

  // 기간 필터링을 위한 cutoffDate 계산
  const cutoffDate = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - 1); // 1m
    return cutoff;
  }, []);

  // 기간 필터링
  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [history, cutoffDate]);

  // 비교 히스토리 필터링
  const filteredComparisonHistory = useMemo(() => {
    if (comparisonHistory.length === 0) return [];

    return comparisonHistory.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [comparisonHistory, cutoffDate]);

  // 비교 데이터를 날짜별로 매핑
  const comparisonPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredComparisonHistory.forEach((entry) => {
      const dateStr = entry.date || entry.timestamp.split('T')[0];
      map.set(dateStr, entry.price);
    });
    return map;
  }, [filteredComparisonHistory]);

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
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 비교 가격 가져오기
      const comparisonPrice = comparisonPriceMap.get(dateString);

      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        비교가격: comparisonPrice,
        rawTime: dateObj.getTime(),
        fullDate: dateObj,
      });
    });
    return Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);
  }, [filteredHistory, comparisonPriceMap]);

  const formatPrice = useCallback((value: number) => {
    // 악세, 보석 카테고리는 소수점 없이 표시
    if (categoryStyle?.label === '악세' || categoryStyle?.label === '보석') {
      if (value >= 10000) {
        return Math.round(value / 1000) + 'k';
      }
      return Math.round(value).toString();
    }
    if (value >= 10000) {
      return Math.round(value / 1000) + 'k';
    }
    if (value < 100) {
      return value.toFixed(1);
    }
    return Math.round(value).toString();
  }, [categoryStyle]);

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
          borderRadius: isMobile ? '8px' : '12px',
          padding: isMobile ? '8px' : '16px',
          background: 'var(--card-bg)',
          cursor: 'pointer',
          height: '100%',
          minHeight: isMobile ? '155px' : '270px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.65rem' : '0.85rem' }}>
          빈 슬롯
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        border: isSelected ? `3px solid ${chartColor}` : '1px solid var(--border-color)',
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '6px' : '12px',
        background: 'var(--card-bg)',
        cursor: 'pointer',
        height: '100%',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 12px ${chartColor}40` : 'none',
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: isMobile ? '4px' : '10px' }}>
        {/* 첫째 줄: 아이콘 + 아이템명 (왼쪽) / 가격 (오른쪽) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? '4px' : '8px', marginBottom: isMobile ? '2px' : '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flex: 1, minWidth: 0 }}>
            <Image
              src={item.icon || '/icon.png'}
              alt={item.name}
              width={isMobile ? 20 : 28}
              height={isMobile ? 20 : 28}
              style={{ borderRadius: isMobile ? '4px' : '6px', border: `1px solid ${chartColor}`, flexShrink: 0 }}
            />
            <div style={{
              fontSize: isMobile ? '0.6rem' : '0.9rem',
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
            <div style={{ fontSize: isMobile ? '0.65rem' : '0.95rem', fontWeight: 700, color: chartColor, flexShrink: 0 }}>
              {(categoryStyle?.label === '악세' || categoryStyle?.label === '보석')
                ? Math.round(stats.current).toLocaleString()
                : stats.current.toLocaleString()}G
            </div>
          )}
        </div>
        {/* 둘째 줄: 변동률 (오른쪽 정렬) */}
        {stats && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              fontSize: isMobile ? '0.55rem' : '0.7rem',
              fontWeight: 600,
              color: changeRate >= 0 ? '#ef4444' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              <Image
                src={changeRate >= 0 ? '/up.png' : '/down.png'}
                alt={changeRate >= 0 ? 'up' : 'down'}
                width={isMobile ? 8 : 10}
                height={isMobile ? 8 : 10}
              />
              {Math.abs(changeRate).toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* 차트 */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isMobile ? '110px' : '220px' }}>
          <Spinner animation="border" size="sm" />
        </div>
      ) : !isMounted ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isMobile ? '110px' : '220px' }}>
          <Spinner animation="border" size="sm" />
        </div>
      ) : (
        <div style={{ width: '100%', height: isMobile ? '110px' : '220px' }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 110 : 220}>
            <LineChart data={chartData} margin={{ top: isMobile ? 2 : 5, right: isMobile ? 5 : (comparisonInfo ? 45 : 5), left: 0, bottom: 0 }}>
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
                tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 6 : 8 }}
                height={isMobile ? 15 : 20}
                stroke="var(--border-color)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 6 : 8 }}
                tickFormatter={formatPrice}
                width={isMobile ? 25 : 35}
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
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const mainPrice = data.가격;
                  const compPrice = data.비교가격;
                  const priceDiff = compPrice ? mainPrice - compPrice : null;

                  return (
                    <div style={{
                      backgroundColor: 'var(--card-bg)',
                      border: `1px solid ${chartColor}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '10px',
                    }}>
                      <div style={{ fontWeight: 600, color: chartColor }}>{label}</div>
                      <div>결정: {(categoryStyle?.label === '악세' || categoryStyle?.label === '보석')
                        ? Math.round(mainPrice).toLocaleString()
                        : mainPrice.toLocaleString()} G</div>
                      {compPrice !== undefined && compPrice !== null && (
                        <>
                          <div style={{ color: comparisonColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Image src={comparisonInfo?.normalIcon || ''} alt="" width={12} height={12} style={{ borderRadius: '2px' }} />
                            ×5: {compPrice.toLocaleString()} G
                          </div>
                          {priceDiff !== null && (
                            <div style={{ fontWeight: 700, color: priceDiff >= 0 ? '#ef4444' : '#3b82f6' }}>
                              {priceDiff >= 0 ? '+' : ''}{priceDiff.toLocaleString()} G
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                }}
              />
              {stats && (
                <ReferenceLine y={stats.avg} stroke={chartColor} strokeDasharray="3 3" strokeWidth={1} />
              )}
              {/* 비교 라인 (일반 재료 × 5) */}
              {comparisonInfo && (
                <Line
                  type="monotone"
                  dataKey="비교가격"
                  stroke={comparisonColor}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 2, fill: comparisonColor }}
                  connectNulls
                />
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
              {/* 차트 오른쪽 끝 라벨 - 데스크톱만 */}
              {!isMobile && comparisonInfo && chartData.length > 0 && (
                <Customized
                  component={(props: CustomizedProps) => {
                    const { xAxisMap, yAxisMap } = props;
                    if (!xAxisMap || !yAxisMap) return null;
                    const xAxis = Object.values(xAxisMap)[0] as any;
                    const yAxis = Object.values(yAxisMap)[0] as any;
                    if (!xAxis || !yAxis) return null;

                    const lastData = chartData[chartData.length - 1];
                    const mainPrice = lastData.가격;
                    const compPrice = lastData.비교가격;
                    if (!compPrice) return null;

                    const x = xAxis.x + xAxis.width + 3;
                    const yMain = yAxis.scale(mainPrice);
                    const yComp = yAxis.scale(compPrice);
                    const priceDiff = mainPrice - compPrice;
                    const diffColor = priceDiff >= 0 ? '#ef4444' : '#3b82f6';
                    const yMid = (yMain + yComp) / 2;

                    return (
                      <g>
                        {/* 메인 가격 라벨 */}
                        <circle cx={x - 1} cy={yMain} r={2} fill={chartColor} />
                        <text x={x + 2} y={yMain} dy={2} fontSize={7} fontWeight="700" fill={chartColor}>
                          결정
                        </text>
                        {/* 비교 가격 라벨 */}
                        <circle cx={x - 1} cy={yComp} r={2} fill={comparisonColor} />
                        <text x={x + 2} y={yComp} dy={2} fontSize={7} fontWeight="700" fill={comparisonColor}>
                          ×5
                        </text>
                        {/* 화살표와 차이 */}
                        <line x1={x + 22} y1={yMain + (priceDiff >= 0 ? 3 : -3)} x2={x + 22} y2={yComp + (priceDiff >= 0 ? -3 : 3)} stroke={diffColor} strokeWidth={1} markerEnd={`url(#arrowMini-${slotIndex})`} />
                        <defs>
                          <marker id={`arrowMini-${slotIndex}`} markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
                            <polygon points="0 0, 3 1.5, 0 3" fill={diffColor} />
                          </marker>
                        </defs>
                        <text x={x + 25} y={yMid} dy={2} fontSize={7} fontWeight="700" fill={diffColor}>
                          {priceDiff >= 0 ? '+' : '-'}{formatPrice(Math.abs(priceDiff))}
                        </text>
                      </g>
                    );
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
