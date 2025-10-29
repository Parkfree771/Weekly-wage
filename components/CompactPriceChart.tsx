'use client';

import { useMemo, useCallback } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrackedItem, ItemCategory } from '@/lib/items-to-track';

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string; // YYYY-MM-DD 형식
};

type CategoryStyle = {
  label: string;
  color: string;
  darkColor: string;
  lightBg: string;
};

type CompactPriceChartProps = {
  selectedItem: TrackedItem | null;
  history: PriceEntry[];
  loading: boolean;
  categoryStyle?: CategoryStyle;
};

function ColoredItemName({ name }: { name: string }) {
  const regex = /(\d+\.?\d*%)\s*(\(상\))|(\d+\.?\d*%)\s*(\(중\))|(\(상\))|(\(중\))/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(name)) !== null) {
    if (match.index > lastIndex) {
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

  return <>{parts}</>;
}

export default function CompactPriceChart({ selectedItem, history, loading, categoryStyle }: CompactPriceChartProps) {
  const chartColor = categoryStyle?.darkColor || '#16a34a'; // 기본 색상

  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();
    history.forEach((entry) => {
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
      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        rawTime: dateObj.getTime(),
        isWednesday: dayOfWeek === 3,
        fullDate: dateObj
      });
    });
    return Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);
  }, [history]);

  const formatPrice = useCallback((value: number) => {
    if (selectedItem?.id === '6861012' && value < 1000) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  }, [selectedItem?.id]);

  const formatTooltipPrice = useCallback((value: number) => {
    if (selectedItem?.id === '6861012' && value < 1000) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G';
    }
    return value.toLocaleString('ko-KR') + ' G';
  }, [selectedItem?.id]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    return {
      current: history[history.length - 1].price,
      min: Math.min(...history.map(h => h.price)),
      max: Math.max(...history.map(h => h.price)),
      avg: history.reduce((sum, h) => sum + h.price, 0) / history.length,
    };
  }, [history]);

  const yAxisConfig = useMemo(() => {
    if (!stats) return { domain: ['auto', 'auto'], tickCount: 5 };
    const priceRange = stats.max - stats.min;
    const isAbidos = selectedItem?.id === '6861012';
    let tickUnit = 1;
    let tickCount = 6;
    if (stats.max >= 1000000) tickUnit = 100000;
    else if (stats.max >= 100000) tickUnit = 10000;
    else if (stats.max >= 10000) tickUnit = 1000;
    else if (stats.max >= 1000) tickUnit = 100;
    else if (stats.max >= 100) tickUnit = 10;
    else tickUnit = isAbidos ? 0.1 : 1;
    const padding = Math.max(priceRange * 0.1, tickUnit);
    const minValue = isAbidos && stats.max < 100 ? Math.floor((stats.min - padding) * 10) / 10 : Math.floor((stats.min - padding) / tickUnit) * tickUnit;
    const maxValue = isAbidos && stats.max < 100 ? Math.ceil((stats.max + padding) * 10) / 10 : Math.ceil((stats.max + padding) / tickUnit) * tickUnit;
    return { domain: [minValue, maxValue], tickCount };
  }, [stats, selectedItem?.id]);

  const changeRate = useMemo(() => {
    if (chartData.length < 2) return 0;
    const today = chartData[chartData.length - 1].가격;
    const yesterday = chartData[chartData.length - 2].가격;
    return ((today - yesterday) / yesterday) * 100;
  }, [chartData]);

  const averagePrice = useMemo(() => {
    if (history.length === 0) return 0;
    return history.reduce((acc, entry) => acc + entry.price, 0) / history.length;
  }, [history]);

  if (!selectedItem) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
      <Card.Header
        className="py-3 border-0 d-none d-md-block"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)', borderBottom: '2px solid #e5e7eb' }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            {selectedItem.icon && (
              <img
                src={selectedItem.icon}
                alt={selectedItem.name}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  border: `2px solid ${selectedItem.iconBorderColor || chartColor}`,
                  boxShadow: `0 2px 8px ${selectedItem.iconBorderColor ? selectedItem.iconBorderColor + '33' : chartColor + '33'}`
                }}
              />
            )}
            <div>
              <h5 className="mb-1" style={{ fontWeight: '700', color: chartColor }}>
                <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
              </h5>
              <small className="text-muted">
                {selectedItem.type === 'market' ? '거래소' : '경매장'} • 최근 30일
              </small>
            </div>
          </div>
          {stats && (
            <div className="text-end">
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: chartColor }}>
                {formatTooltipPrice(stats.current)}
              </div>
              <div style={{ fontSize: '0.85rem', color: changeRate >= 0 ? '#ef4444' : '#3b82f6' }}>
                {changeRate >= 0 ? '▲' : '▼'} {Math.abs(changeRate).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Header
        className="py-2 border-0 d-md-none"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)', borderBottom: '1.5px solid #e5e7eb' }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            {selectedItem.icon && (
              <img
                src={selectedItem.icon}
                alt={selectedItem.name}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  border: `2px solid ${selectedItem.iconBorderColor || chartColor}`,
                  boxShadow: `0 2px 6px ${selectedItem.iconBorderColor ? selectedItem.iconBorderColor + '33' : chartColor + '33'}`
                }}
              />
            )}
            <div>
              <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.75rem', lineHeight: '1.3', wordBreak: 'keep-all', whiteSpace: 'normal' }}>
                <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
              </h6>
              <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                {selectedItem.type === 'market' ? '거래소' : '경매장'} • 30일
              </small>
            </div>
          </div>
          {stats && (
            <div className="text-end">
              <div style={{ fontSize: '1rem', fontWeight: '700', color: chartColor }}>
                {formatTooltipPrice(stats.current)}
              </div>
              <div style={{ fontSize: '0.7rem', color: changeRate >= 0 ? '#ef4444' : '#3b82f6' }}>
                {changeRate >= 0 ? '▲' : '▼'} {Math.abs(changeRate).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body className="p-2 p-md-3" style={{ backgroundColor: '#fafffe' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
            <p className="mt-3 text-muted">데이터 로딩 중...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: '3rem', opacity: 0.3 }}>📊</div>
            <p className="text-muted mt-2">아직 수집된 데이터가 없습니다</p>
            <small className="text-muted">가격 수집 후 차트가 표시됩니다</small>
          </div>
        ) : (
          <>
            {stats && (
              <div className="d-none d-md-flex mb-4 justify-content-center gap-2">
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: `2px solid ${chartColor}`, padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = categoryStyle?.lightBg || '#f0fdf4'; e.currentTarget.style.borderColor = categoryStyle?.darkColor || '#15803d'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = chartColor; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>현재가</small>
                    <strong style={{ fontSize: '1rem', color: chartColor, fontWeight: '700' }}>{formatTooltipPrice(stats.current)}</strong>
                  </div>
                </div>
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '2px solid #3b82f6', padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#3b82f6'; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>최저가</small>
                    <strong style={{ fontSize: '1rem', color: '#3b82f6', fontWeight: '700' }}>{formatTooltipPrice(stats.min)}</strong>
                  </div>
                </div>
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '2px solid #14b8a6', padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ccfbf1'; e.currentTarget.style.borderColor = '#0d9488'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#14b8a6'; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>최고가</small>
                    <strong style={{ fontSize: '1rem', color: '#14b8a6', fontWeight: '700' }}>{formatTooltipPrice(stats.max)}</strong>
                  </div>
                </div>
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '2px solid #475569', padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#334155'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#475569'; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>평균가</small>
                    <strong style={{ fontSize: '1rem', color: '#475569', fontWeight: '700' }}>
                      {selectedItem?.id === '6861012' && stats.avg < 1000 ? stats.avg.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G' : formatTooltipPrice(Math.round(stats.avg))}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {stats && (
              <div className="row g-2 mb-3 d-md-none">
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: `2px solid ${chartColor}`, padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>현재가</small>
                    <strong style={{ fontSize: '0.8rem', color: chartColor, fontWeight: '700' }}>{formatPrice(stats.current)}</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '2px solid #3b82f6', padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>최저가</small>
                    <strong style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '700' }}>{formatPrice(stats.min)}</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '2px solid #14b8a6', padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>최고가</small>
                    <strong style={{ fontSize: '0.8rem', color: '#14b8a6', fontWeight: '700' }}>{formatPrice(stats.max)}</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '2px solid #475569', padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>평균가</small>
                    <strong style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>{formatPrice(Math.round(stats.avg))}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="d-none d-md-block" style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/><stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="#d1d5db" strokeWidth={1} vertical={true} horizontal={true} />
                  <XAxis dataKey="날짜" tick={(props) => { const { x, y, payload } = props; const dataIndex = chartData.findIndex(d => d.날짜 === payload.value); const isWednesday = dataIndex >= 0 ? chartData[dataIndex].isWednesday : false; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={10} textAnchor="end" fill="#374151" fontSize={16} fontWeight="700" transform="rotate(-35)">{payload.value}</text>{isWednesday && (<text x={0} y={12} dy={10} textAnchor="end" fill="#ef4444" fontSize={12} fontWeight="700" transform="rotate(-35)">수요일</text>)}</g>); }} height={60} stroke="#6b7280" strokeWidth={2} tickLine={{ stroke: '#9ca3af', strokeWidth: 2 }} axisLine={{ stroke: '#6b7280', strokeWidth: 2 }} />
                  <YAxis tick={{ fontSize: stats && stats.max >= 1000000 ? 14 : 16, fill: '#374151', fontWeight: '700' }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 95 : stats && stats.max >= 100000 ? 80 : 60} domain={yAxisConfig.domain} tickCount={yAxisConfig.tickCount} stroke="#6b7280" strokeWidth={2} tickLine={{ stroke: '#9ca3af', strokeWidth: 2 }} axisLine={{ stroke: '#6b7280', strokeWidth: 2 }} />
                  <Tooltip formatter={(value: number) => [formatTooltipPrice(value), '가격']} labelFormatter={(label) => label} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: `3px solid ${chartColor}`, borderRadius: '12px', fontSize: '15px', padding: '14px 18px', boxShadow: '0 6px 16px rgba(0,0,0,0.2)', fontWeight: '600' }} labelStyle={{ fontWeight: '700', color: chartColor, marginBottom: '6px', fontSize: '16px' }} cursor={{ stroke: chartColor, strokeWidth: 2, strokeDasharray: '5 5' }} />
                  <ReferenceLine y={averagePrice} stroke={chartColor} strokeDasharray="5 5" strokeWidth={2} label={{ value: `${formatPrice(averagePrice)}`, position: 'left', fill: chartColor, fontSize: 13, fontWeight: '700' }} />
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={4} dot={{ r: 6, fill: chartColor, strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 9, fill: chartColor, stroke: '#fff', strokeWidth: 4 }} fill="url(#colorPrice)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="d-md-none" style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPriceMobile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/><stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" strokeWidth={0.5} vertical={false} horizontal={true} />
                  <XAxis dataKey="날짜" tick={(props) => { const { x, y, payload } = props; const dataIndex = chartData.findIndex(d => d.날짜 === payload.value); const isWednesday = dataIndex >= 0 ? chartData[dataIndex].isWednesday : false; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={8} textAnchor="end" fill="#374151" fontSize={9} fontWeight="700" transform="rotate(-45)">{payload.value}</text>{isWednesday && (<text x={0} y={8} dy={8} textAnchor="end" fill="#ef4444" fontSize={7} fontWeight="700" transform="rotate(-45)">수요일</text>)}</g>); }} height={45} stroke="#6b7280" strokeWidth={1.5} tickLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }} axisLine={{ stroke: '#6b7280', strokeWidth: 1.5 }} />
                  <YAxis tick={{ fontSize: stats && stats.max >= 1000000 ? 7 : 9, fill: '#374151', fontWeight: '700' }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 55 : stats && stats.max >= 100000 ? 45 : 35} domain={yAxisConfig.domain} tickCount={yAxisConfig.tickCount} stroke="#6b7280" strokeWidth={1.5} tickLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }} axisLine={{ stroke: '#6b7280', strokeWidth: 1.5 }} />
                  <Tooltip formatter={(value: number) => [formatTooltipPrice(value), '가격']} labelFormatter={(label) => label} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', border: `2px solid ${chartColor}`, borderRadius: '8px', fontSize: '11px', padding: '8px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: '600' }} labelStyle={{ fontWeight: '700', color: chartColor, marginBottom: '4px', fontSize: '12px' }} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <ReferenceLine y={averagePrice} stroke={chartColor} strokeDasharray="5 5" strokeWidth={1.5} label={{ value: `${formatPrice(averagePrice)}`, position: 'left', fill: chartColor, fontSize: 9, fontWeight: '700' }} />
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={2.5} dot={{ r: 3, fill: chartColor, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: chartColor, stroke: '#fff', strokeWidth: 2 }} fill="url(#colorPriceMobile)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}