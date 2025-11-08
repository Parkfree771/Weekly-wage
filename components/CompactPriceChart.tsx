import { useTheme } from './ThemeProvider';
import { useMemo, useCallback, useState } from 'react';
import Image from 'next/image';
import { Card, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrackedItem, ItemCategory } from '@/lib/items-to-track';

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
  { date: '2025-11-07', label: '7주년 라방', color: '#ff6b6b' },
  { date: '2025-12-07', label: '로아온', color: '#ffa500' }
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

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export default function CompactPriceChart({ selectedItem, history, loading, categoryStyle }: CompactPriceChartProps) {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('1m');

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

  // 기간에 따른 데이터 필터링
  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];

    // ALL인 경우 모든 데이터 반환
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
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return history.filter(entry => {
      const entryDate = entry.date ? new Date(entry.date) : new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }, [history, selectedPeriod]);

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
      const eventColor = event?.color;

      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        rawTime: dateObj.getTime(),
        isWednesday: dayOfWeek === 3,
        fullDate: dateObj,
        eventLabel,
        eventColor,
        hasEvent: !!eventLabel || dayOfWeek === 3
      });
    });
    return Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);
  }, [filteredHistory]);

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
    if (filteredHistory.length === 0) return null;
    return {
      current: filteredHistory[filteredHistory.length - 1].price,
      min: Math.min(...filteredHistory.map(h => h.price)),
      max: Math.max(...filteredHistory.map(h => h.price)),
      avg: filteredHistory.reduce((sum, h) => sum + h.price, 0) / filteredHistory.length,
    };
  }, [filteredHistory]);

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
    if (filteredHistory.length === 0) return 0;
    return filteredHistory.reduce((acc, entry) => acc + entry.price, 0) / filteredHistory.length;
  }, [filteredHistory]);

  // 커스텀 점 렌더러 (이벤트 라벨 포함)
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const hasEvent = payload.eventLabel || payload.isWednesday;
    const eventLabel = payload.eventLabel || (payload.isWednesday ? '수요일' : '');
    const eventColor = payload.eventColor || '#ef4444';

    if (!hasEvent) {
      return (
        <circle cx={cx} cy={cy} r={6} fill={chartColor} strokeWidth={3} stroke="var(--card-bg)" />
      );
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={eventColor} strokeWidth={3} stroke="var(--card-bg)" />
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          fill={eventColor}
          fontSize={11}
          fontWeight="700"
          style={{
            textShadow: '0 0 3px var(--card-bg), 0 0 3px var(--card-bg), 0 0 3px var(--card-bg)'
          }}
        >
          {eventLabel}
        </text>
      </g>
    );
  };

  // 모바일용 커스텀 점 렌더러
  const CustomDotMobile = (props: any) => {
    const { cx, cy, payload } = props;
    const hasEvent = payload.eventLabel || payload.isWednesday;
    const eventLabel = payload.eventLabel || (payload.isWednesday ? '수요일' : '');
    const eventColor = payload.eventColor || '#ef4444';

    if (!hasEvent) {
      return (
        <circle cx={cx} cy={cy} r={3} fill={chartColor} strokeWidth={2} stroke="var(--card-bg)" />
      );
    }

    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill={eventColor} strokeWidth={2} stroke="var(--card-bg)" />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill={eventColor}
          fontSize={8}
          fontWeight="700"
          style={{
            textShadow: '0 0 2px var(--card-bg), 0 0 2px var(--card-bg)'
          }}
        >
          {eventLabel}
        </text>
      </g>
    );
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
        interval = 60; // 60일 간격
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
    <Card className="border-0 shadow-sm" style={{ borderRadius: '16px', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>
      <Card.Header
        className="py-3 border-0 d-none d-md-block"
        style={{ backgroundColor: 'var(--card-header-bg)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
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
            <div>
              <h5 className="mb-1" style={{ fontWeight: '700', color: chartColor }}>
                <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
              </h5>
              <small style={{ color: 'var(--text-muted)' }}>
                {selectedItem.type === 'market' ? '거래소' : '경매장'} • 최근 {periodLabels[selectedPeriod]}
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
        style={{ backgroundColor: 'var(--card-header-bg)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="d-flex justify-content-between align-items-center">
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
            <div>
              <h6 className="mb-0" style={{ fontWeight: '700', color: chartColor, fontSize: '0.75rem', lineHeight: '1.3', wordBreak: 'keep-all', whiteSpace: 'pre-line' }}>
                <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
              </h6>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                {selectedItem.type === 'market' ? '거래소' : '경매장'} • {periodLabels[selectedPeriod]}
              </small>
            </div>
          </div>
          {stats && (
            <div className="text-end">
              <div style={{ fontSize: '1rem', fontWeight: '700', color: chartColor, whiteSpace: 'nowrap' }}>
                {formatTooltipPrice(stats.current)}
              </div>
              <div style={{ fontSize: '0.7rem', color: changeRate >= 0 ? '#ef4444' : '#3b82f6', whiteSpace: 'nowrap' }}>
                {changeRate >= 0 ? '▲' : '▼'} {Math.abs(changeRate).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body className="p-2 p-md-3" style={{ backgroundColor: 'var(--card-bg)' }}>
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
        ) : (
          <>
            {stats && (
              <div className="d-none d-md-flex mb-4 justify-content-center gap-2">
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '10px', border: `2px solid ${chartColor}`, padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? (categoryStyle?.darkBg || '#3c4043') : (categoryStyle?.lightBg || '#f0fdf4'); e.currentTarget.style.borderColor = theme === 'dark' ? (categoryStyle?.darkThemeColor || '#8ab4f8') : (categoryStyle?.darkColor || '#15803d'); }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.borderColor = chartColor; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>현재가</small>
                    <strong style={{ fontSize: '1rem', color: chartColor, fontWeight: '700' }}>{formatTooltipPrice(stats.current)}</strong>
                  </div>
                </div>
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '10px', border: `2px solid ${minStyle.text}`, padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = minStyle.bg; e.currentTarget.style.borderColor = minStyle.border; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.borderColor = minStyle.text; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>최저가</small>
                    <strong style={{ fontSize: '1rem', color: minStyle.text, fontWeight: '700' }}>{formatTooltipPrice(stats.min)}</strong>
                  </div>
                </div>
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '10px', border: `2px solid ${maxStyle.text}`, padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = maxStyle.bg; e.currentTarget.style.borderColor = maxStyle.border; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.borderColor = maxStyle.text; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>최고가</small>
                    <strong style={{ fontSize: '1rem', color: maxStyle.text, fontWeight: '700' }}>{formatTooltipPrice(stats.max)}</strong>
                  </div>
                </div>
                <div style={{ width: '260px' }}>
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '10px', border: `2px solid ${avgStyle.text}`, padding: '10px 8px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = avgStyle.bg; e.currentTarget.style.borderColor = avgStyle.border; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.borderColor = avgStyle.text; }}>
                    <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>평균가</small>
                    <strong style={{ fontSize: '1rem', color: avgStyle.text, fontWeight: '700' }}>
                      {selectedItem?.id === '6861012' && stats.avg < 1000 ? stats.avg.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G' : formatTooltipPrice(Math.round(stats.avg))}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {stats && (
              <div className="row g-2 mb-3 d-md-none">
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: `2px solid ${chartColor}`, padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>현재가</small>
                    <strong style={{ fontSize: '0.8rem', color: chartColor, fontWeight: '700' }}>{formatPrice(stats.current)}</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: `2px solid ${minStyle.text}`, padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>최저가</small>
                    <strong style={{ fontSize: '0.8rem', color: minStyle.text, fontWeight: '700' }}>{formatPrice(stats.min)}</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: `2px solid ${maxStyle.text}`, padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>최고가</small>
                    <strong style={{ fontSize: '0.8rem', color: maxStyle.text, fontWeight: '700' }}>{formatPrice(stats.max)}</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="text-center" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: `2px solid ${avgStyle.text}`, padding: '4px 2px' }}>
                    <small className="d-block" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>평균가</small>
                    <strong style={{ fontSize: '0.8rem', color: avgStyle.text, fontWeight: '700' }}>{formatPrice(Math.round(stats.avg))}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 기간 선택 버튼 - 데스크톱 */}
            <div className="d-none d-md-flex justify-content-center gap-2 mb-3">
              {(['7d', '1m', '3m', '6m', '1y', 'all'] as PeriodOption[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: selectedPeriod === period ? `2px solid ${chartColor}` : '2px solid var(--border-color)',
                    backgroundColor: selectedPeriod === period ? (theme === 'dark' ? (categoryStyle?.darkBg || '#3c4043') : (categoryStyle?.lightBg || '#f0fdf4')) : 'var(--card-bg)',
                    color: selectedPeriod === period ? chartColor : 'var(--text-secondary)',
                    fontWeight: selectedPeriod === period ? '700' : '500',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
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

            {/* 기간 선택 버튼 - 모바일 */}
            <div className="d-md-none d-flex justify-content-center gap-1 mb-2" style={{ overflowX: 'auto', padding: '4px 0' }}>
              {(['7d', '1m', '3m', '6m', '1y', 'all'] as PeriodOption[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: selectedPeriod === period ? `2px solid ${chartColor}` : '2px solid var(--border-color)',
                    backgroundColor: selectedPeriod === period ? (theme === 'dark' ? (categoryStyle?.darkBg || '#3c4043') : (categoryStyle?.lightBg || '#f0fdf4')) : 'var(--card-bg)',
                    color: selectedPeriod === period ? chartColor : 'var(--text-secondary)',
                    fontWeight: selectedPeriod === period ? '700' : '500',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    whiteSpace: 'nowrap',
                    minWidth: '50px'
                  }}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>

            <div className="d-none d-md-block" style={{ width: '100%', height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/><stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="var(--border-color)" strokeWidth={1} vertical={true} horizontal={true} />
                  <XAxis dataKey="날짜" ticks={xAxisTicks} tick={(props) => { const { x, y, payload } = props; const dataIndex = chartData.findIndex(d => d.날짜 === payload.value); if (dataIndex < 0) return null; const data = chartData[dataIndex]; const eventLabel = data.eventLabel || (data.isWednesday ? '수요일' : ''); const eventColor = data.eventColor || '#ef4444'; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={10} textAnchor="end" fill="var(--text-primary)" fontSize={16} fontWeight="700" transform="rotate(-35)">{payload.value}</text>{eventLabel && (<text x={0} y={12} dy={10} textAnchor="end" fill={eventColor} fontSize={12} fontWeight="700" transform="rotate(-35)">{eventLabel}</text>)}</g>); }} height={80} stroke="var(--text-secondary)" strokeWidth={2} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} />
                  <YAxis tick={{ fontSize: stats && stats.max >= 1000000 ? 14 : 16, fill: 'var(--text-primary)', fontWeight: '700' }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 95 : stats && stats.max >= 100000 ? 80 : 60} domain={yAxisConfig.domain} tickCount={yAxisConfig.tickCount} stroke="var(--text-secondary)" strokeWidth={2} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 2 }} />
                  <Tooltip formatter={(value: number) => [formatTooltipPrice(value), '가격']} labelFormatter={(label) => label} contentStyle={{ backgroundColor: 'var(--card-bg)', border: `3px solid ${chartColor}`, borderRadius: '12px', fontSize: '15px', padding: '14px 18px', boxShadow: 'var(--shadow-lg)', fontWeight: '600', color: 'var(--text-primary)' }} labelStyle={{ fontWeight: '700', color: chartColor, marginBottom: '6px', fontSize: '16px' }} cursor={{ stroke: chartColor, strokeWidth: 2, strokeDasharray: '5 5' }} />
                  <ReferenceLine y={averagePrice} stroke={chartColor} strokeDasharray="5 5" strokeWidth={2} label={{ value: `${formatPrice(averagePrice)}`, position: 'left', fill: chartColor, fontSize: 13, fontWeight: '700' }} />
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={4} dot={<CustomDot />} activeDot={{ r: 9, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 4 }} fill="url(#colorPrice)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="d-md-none" style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPriceMobile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/><stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeWidth={0.5} vertical={false} horizontal={true} />
                  <XAxis dataKey="날짜" ticks={xAxisTicks} tick={(props) => { const { x, y, payload } = props; const dataIndex = chartData.findIndex(d => d.날짜 === payload.value); if (dataIndex < 0) return null; const data = chartData[dataIndex]; const eventLabel = data.eventLabel || (data.isWednesday ? '수요일' : ''); const eventColor = data.eventColor || '#ef4444'; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={8} textAnchor="end" fill="var(--text-primary)" fontSize={9} fontWeight="700" transform="rotate(-45)">{payload.value}</text>{eventLabel && (<text x={0} y={8} dy={8} textAnchor="end" fill={eventColor} fontSize={7} fontWeight="700" transform="rotate(-45)">{eventLabel}</text>)}</g>); }} height={55} stroke="var(--text-secondary)" strokeWidth={1.5} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <YAxis tick={{ fontSize: stats && stats.max >= 1000000 ? 7 : 9, fill: 'var(--text-primary)', fontWeight: '700' }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 55 : stats && stats.max >= 100000 ? 50 : stats && stats.max >= 10000 ? 50 : 35} domain={yAxisConfig.domain} tickCount={yAxisConfig.tickCount} stroke="var(--text-secondary)" strokeWidth={1.5} tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <Tooltip formatter={(value: number) => [formatTooltipPrice(value), '가격']} labelFormatter={(label) => label} contentStyle={{ backgroundColor: 'var(--card-bg)', border: `2px solid ${chartColor}`, borderRadius: '8px', fontSize: '11px', padding: '8px 10px', boxShadow: 'var(--shadow-lg)', fontWeight: '600', color: 'var(--text-primary)' }} labelStyle={{ fontWeight: '700', color: chartColor, marginBottom: '4px', fontSize: '12px' }} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <ReferenceLine y={averagePrice} stroke={chartColor} strokeDasharray="5 5" strokeWidth={1.5} label={{ value: `${formatPrice(averagePrice)}`, position: 'left', fill: chartColor, fontSize: 9, fontWeight: '700' }} />
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={2.5} dot={<CustomDotMobile />} activeDot={{ r: 6, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 2 }} fill="url(#colorPriceMobile)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}