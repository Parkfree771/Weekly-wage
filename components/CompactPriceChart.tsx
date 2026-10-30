import { useTheme } from './ThemeProvider';
import { useMemo, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import Image from 'next/image';
import { Card, Spinner } from 'react-bootstrap';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { TrackedItem } from '@/lib/items-to-track';
import { PRICE_EVENTS, SPECIAL_EVENT_DOT_COLOR_BY_CATEGORY } from '@/lib/price-events';
import { PriceContext } from './PriceComparisonStats';
import { ColoredItemName } from '@/lib/components/ColoredItemName';
import TrendArrow from './TrendArrow';
import WonPrice from './WonPrice';
import { GOLD_VALUE_POINTS, getGoldValueAt } from '@/lib/gold-value';
import type { TooltipProps, CustomDotProps } from '@/types/recharts';

/** 차트 날짜 키(YYYY-MM-DD) → 축·툴팁 표시(M/D) */
const toAxisLabel = (key: unknown): string => {
  const [, m, d] = String(key).split('-');
  return d ? `${Number(m)}/${Number(d)}` : String(key);
};

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

// 이벤트 정의 — 차트와 이벤트 대비 카드(PriceEventCompare)가 같은 점·같은 색을 써야 해서
// 목록과 색은 lib/price-events.ts 한 곳에서 가져온다.
const EVENTS = PRICE_EVENTS;

// 수요일 점 색상 (PriceComparisonStats 통계바 우측 보색과 일치)
const EVENT_DOT_COLOR_BY_CATEGORY: Record<string, string> = {
  '재련 재료': '#f97316',
  '젬': '#eab308',
  '재련 추가 재료': '#e11d48',
  '유물 각인서': '#14b8a6',
  '악세': '#f97316',
  '팔찌': '#f97316',
  '보석': '#14b8a6',
};

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
  /** 부모(flex 세로) 높이만큼 카드를 늘리고 남는 높이는 차트가 먹는다 — 데스크톱에서 왼쪽 바 높이에 맞춘다 */
  fillHeight?: boolean;
};

type PeriodOption = '7d' | '1m' | '2m' | '3m' | '6m' | '1y' | 'all';

/**
 * 등락 한 덩어리 (라벨 + 화살표 + %). 전일 대비와 기간 변화율이 같은 줄에 나란히 서므로
 * 어느 쪽 숫자인지 라벨이 반드시 붙어야 한다. 데스크톱·모바일이 크기만 다르고 모양은 같다.
 */
function RatePair({ label, rate, valueSize, arrowSize }: {
  label: string;
  rate: number;
  valueSize: string;
  arrowSize: number;
}) {
  const up = rate >= 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
      <span
        className="font-numeric"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: valueSize,
          fontWeight: 800,
          color: up ? 'var(--price-up)' : 'var(--price-down)',
        }}
      >
        <TrendArrow up={up} size={arrowSize} />
        {Math.abs(rate).toFixed(1)}%
      </span>
    </span>
  );
}

/**
 * 구간의 시작값 → 끝값. 구간이 오늘로 끝나지 않을 때 현재가 자리에 대신 선다.
 * 사이 기호는 "A 에서 B 로 갔다"만 말하는 단순 오른쪽 화살표다 — 오르내림은 바로 아래 기간 변화율이
 * 이미 화살표·색으로 말하므로 여기서 또 추세 화살표를 쓰면 겹쳐 읽힌다.
 * 글자(→·~) 대신 SVG 인 이유는 폰트마다 글리프 높이가 달라 숫자와 기준선이 어긋나기 때문.
 */
function RangeEndpoints({ first, last, up, valueSize, arrowSize, color }: {
  first: ReactNode;
  last: ReactNode;
  up: boolean;
  valueSize: string;
  arrowSize: number;
  color: string;
}) {
  return (
    <div
      className="font-numeric"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '5px',
        fontSize: valueSize,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        lineHeight: 1.25,
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{first}</span>
      <svg
        viewBox="0 0 24 24"
        width={arrowSize}
        height={arrowSize}
        fill="none"
        stroke={up ? 'var(--price-up)' : 'var(--price-down)'}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <path d="M3 12h15M12.5 5.5 19 12l-6.5 6.5" />
      </svg>
      <span style={{ color }}>{last}</span>
    </div>
  );
}

type YAxisStats = { min: number; max: number; avg: number } | null;
type YAxisRange = { min: number; max: number } | null;

// Y축 도메인·틱 계산 (전체 기간 / 줌 구간 모두에서 동일 로직 재사용)
function buildYAxisConfig(stats: YAxisStats, comparisonRange: YAxisRange) {
  if (!stats) return { domain: ['auto', 'auto'], ticks: [] as number[], avgValue: null as number | null };

  // 메인 가격 + 비교가격을 모두 포함하는 실제 표시 범위
  const dataMin = comparisonRange ? Math.min(stats.min, comparisonRange.min) : stats.min;
  const dataMax = comparisonRange ? Math.max(stats.max, comparisonRange.max) : stats.max;
  const priceRange = dataMax - dataMin;
  const avgPrice = stats.avg;

  // 최대 틱 개수 — 넘치면 단위를 2배씩 키운다 (앱 PriceChart 와 동일)
  const TARGET_TICK_COUNT = 9;

  // 가격대별로 적절한 틱 단위 결정 (틱 개수를 줄이기 위해 더 큰 단위 사용)
  let tickUnit = 1;

  // 100만 골드 이상
  if (dataMax >= 1000000) {
    if (priceRange >= 500000) tickUnit = 200000;
    else if (priceRange >= 200000) tickUnit = 100000;
    else if (priceRange >= 100000) tickUnit = 50000;
    else tickUnit = 20000;
  }
  // 10만~100만 골드
  else if (dataMax >= 100000) {
    if (priceRange >= 100000) tickUnit = 50000;
    else if (priceRange >= 50000) tickUnit = 20000;
    else if (priceRange >= 20000) tickUnit = 10000;
    else if (priceRange >= 10000) tickUnit = 5000;
    else tickUnit = 2000;
  }
  // 1만~10만 골드
  else if (dataMax >= 10000) {
    if (priceRange >= 10000) tickUnit = 5000;
    else if (priceRange >= 5000) tickUnit = 2000;
    else if (priceRange >= 2000) tickUnit = 1000;
    else tickUnit = 500;
  }
  // 1000~1만 골드
  else if (dataMax >= 1000) {
    if (priceRange >= 2000) tickUnit = 1000;
    else if (priceRange >= 1000) tickUnit = 500;
    else if (priceRange >= 500) tickUnit = 200;
    else tickUnit = 100;
  }
  // 100~1000 골드
  else if (dataMax >= 100) {
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
  const minWithPadding = dataMin - padding;
  const maxWithPadding = dataMax + padding;

  const scale = dataMax < 100 ? 100 : 1; // 100 미만은 소수점 오차 방지용 정수 스케일
  const centerScaled = Math.round(centerTick * scale);
  const minScaled = minWithPadding * scale;
  const maxScaled = maxWithPadding * scale;
  let unitScaled = Math.round(tickUnit * scale);

  const genTicks = (unit: number) => {
    const out: number[] = [centerTick];
    let cur = centerScaled - unit;
    while (cur >= minScaled) {
      out.unshift(cur / scale);
      cur -= unit;
    }
    cur = centerScaled + unit;
    while (cur <= maxScaled) {
      out.push(cur / scale);
      cur += unit;
    }
    return out;
  };

  // 급등·급락으로 변동폭이 커져도 데이터 전체가 축 안에 들어오도록,
  // 눈금 개수가 넘치면 단위를 2배씩 키워 전 구간을 덮는 눈금을 다시 만든다.
  // (기존에는 생성 단계에서 개수로 잘라버려 2배 재계산이 안 돌고 축이 최고/최저가를 못 덮었음)
  let ticks = genTicks(unitScaled);
  while (ticks.length > TARGET_TICK_COUNT) {
    unitScaled *= 2;
    ticks = genTicks(unitScaled);
  }
  // 단위 확대로 패딩보다 눈금 간격이 커지면 끝 눈금이 데이터에 못 미칠 수 있어 한 칸씩 연장
  const unitVal = unitScaled / scale;
  while (ticks[0] > dataMin) ticks.unshift(ticks[0] - unitVal);
  while (ticks[ticks.length - 1] < dataMax) ticks.push(ticks[ticks.length - 1] + unitVal);

  // 가격은 0 밑으로 내려가지 않는다 — 싼 아이템은 아래 여유(패딩)가 0 을 넘어가 "-10" 같은 눈금이 찍혔다.
  // 음수 눈금은 버리고, 그 바람에 데이터가 맨 아래 눈금보다 낮아지면 0 을 바닥 눈금으로 둔다.
  if (ticks[0] < 0) {
    ticks = ticks.filter((t) => t >= 0);
    if (ticks.length === 0 || ticks[0] > dataMin) ticks.unshift(0);
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
  // 바닥이 0 이면 여유도 0 밑으로 내지 않는다
  const domainMin = Math.max(0, minTick - (buffer || 0.1));
  const domainMax = maxTick + (buffer || 0.1);

  return {
    domain: [domainMin, domainMax],
    ticks,
    avgValue: centerTick, // 정확한 평균가 (틱으로 표시됨)
  };
}

export default function CompactPriceChart({ selectedItem, history, loading, categoryStyle, hidePeriodButtons = false, fillHeight = false }: CompactPriceChartProps) {
  const { theme } = useTheme();
  const { selectedPeriod, setSelectedPeriod, eventRangeActive, filteredHistory, comparisonData, activeReferenceLines, showEventDots, toggleEventDots, showWednesdayDots, toggleWednesdayDots, showRegularDots, toggleRegularDots, showComparisonLine, toggleComparisonLine, wonMode, toggleWonMode, openChartSettings } = useContext(PriceContext);

  // 이벤트 대비 카드로 구간을 잡은 동안에는 어떤 기간 버튼도 켜 두지 않는다 —
  // 차트가 보여 주는 구간과 켜진 버튼이 다르면 무엇이 적용됐는지 알 수 없다.
  const periodOn = (period: PeriodOption) => !eventRangeActive && selectedPeriod === period;

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
  // 차트에 그리는 가격선 — 골드로 입력한 값이라 원화 환산 중에는 숨긴다
  const chartCustomLines = wonMode ? undefined : currentCustomLines;

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

  // 점 색 — 헤더 토글과 모바일 설정 팝업이 같은 색을 써야 해서 컴포넌트 스코프에 둔다
  const wedDotColor = (categoryStyle?.label && EVENT_DOT_COLOR_BY_CATEGORY[categoryStyle.label]) || '#f97316';
  const eventDotColor = (categoryStyle?.label && SPECIAL_EVENT_DOT_COLOR_BY_CATEGORY[categoryStyle.label]) || '#ec4899';

  // ── 표시 설정 팝업 내용 ──
  // 예전엔 데스크톱 헤더에 점 토글 3개 · ×5 · 원화 · 톱니(가격선)가 따로 줄지어 있었고, 왼쪽 바에도 톱니(기본 아이템)가
  // 하나 더 있었다. 전부 이 팝업 하나로 모았다 — 헤더에는 "표시 설정" 버튼 하나만 남는다. 모바일 팝업도 같은 줄을 쓴다.
  // 누르는 즉시 저장된다(따로 저장 버튼 없음). includeWon: 데스크톱은 왼쪽 바에 원화 토글이 있어서 뺀다.
  // includeDots: 데스크톱은 점 토글을 아래 막대의 칩(dotChips)으로 꺼냈다 — 팝업에서는 뺀다(모바일 팝업만 포함).
  const renderToggleRows = (includeWon: boolean, includeDots = true) => {
    const rowStyle = (on: boolean, color: string) => ({
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      marginBottom: '4px',
      borderRadius: '8px',
      border: `1px solid ${on ? color : 'var(--border-color)'}`,
      backgroundColor: 'var(--bg-secondary)',
      cursor: 'pointer',
      textAlign: 'left' as const,
    });
    const stateLabel = (on: boolean, color: string, onText = '표시', offText = '숨김') => (
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: on ? color : 'var(--text-muted)' }}>{on ? onText : offText}</span>
    );
    return (
      <>
        {includeDots && [
          { key: 'regular', label: '일반 날짜 점', on: showRegularDots, toggle: toggleRegularDots, color: chartColor },
          { key: 'wed', label: '수요일 점', on: showWednesdayDots, toggle: toggleWednesdayDots, color: wedDotColor },
          { key: 'event', label: '특별 이벤트 점', on: showEventDots, toggle: toggleEventDots, color: eventDotColor },
        ].map((row) => (
          <button key={row.key} type="button" onClick={row.toggle} aria-pressed={row.on} style={rowStyle(row.on, row.color)}>
            <span style={{
              display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: row.on ? row.color : 'transparent',
              border: `2px solid ${row.color}`,
            }} />
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</span>
            {stateLabel(row.on, row.color)}
          </button>
        ))}
        {comparisonData && (
          <button type="button" onClick={toggleComparisonLine} aria-pressed={showComparisonLine} style={rowStyle(showComparisonLine, comparisonColor)}>
            <Image
              src={comparisonData.normalIcon || ''}
              alt=""
              width={18}
              height={18}
              style={{
                borderRadius: '4px',
                flexShrink: 0,
                filter: showComparisonLine ? 'none' : 'grayscale(100%)',
                opacity: showComparisonLine ? 1 : 0.4,
              }}
            />
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              일반 재료 <span style={{ color: comparisonColor, fontWeight: 800 }}>×5</span> 비교선
            </span>
            {stateLabel(showComparisonLine, comparisonColor)}
          </button>
        )}
        {includeWon && (
          <button type="button" onClick={toggleWonMode} aria-pressed={wonMode} style={rowStyle(wonMode, chartColor)}>
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>원화로 보기</span>
            {stateLabel(wonMode, chartColor, '적용', '끔')}
          </button>
        )}
      </>
    );
  };

  // 범례 — 차트 카드 맨 아래 막대 왼쪽 한 줄(데스크톱). 머리는 이름·가격만 남긴다.
  // 켠 선(판매가·구매가·최저가 …)만 붙고, 끝에 드래그 확대 안내를 흐리게 단다.
  const legendLine = (color: string, dash: string, width = 2) => (
    <svg width="16" height="2" aria-hidden="true" style={{ flexShrink: 0 }}>
      <line x1="0" y1="1" x2="16" y2="1" stroke={color} strokeWidth={width} strokeDasharray={dash} />
    </svg>
  );
  const legendItems: [string, string, string][] = [
    ['avg-line', chartColor, '평균가'],
    ...(chartCustomLines?.sellPrice != null ? [['sell', '#10b981', '판매가'] as [string, string, string]] : []),
    ...(chartCustomLines?.buyPrice != null ? [['buy', '#f59e0b', '구매가'] as [string, string, string]] : []),
    ...([['min', '#3b82f6', '최저가'], ['max', '#ef4444', '최고가'], ['current', '#8b5cf6', '현재가'], ['avg', '#6b7280', '기간평균']] as [string, string, string][])
      .filter(([k]) => activeReferenceLines?.has(k as 'min')),
  ];
  const chartLegend = (
    <div
      style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 14px', minWidth: 0,
        fontSize: '0.78rem', color: 'var(--text-muted)',
      }}
    >
      {legendItems.map(([k, color, label]) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          {legendLine(color, k === 'avg-line' ? '4 3' : '6 3', k === 'sell' || k === 'buy' ? 2.5 : 2)}
          {label}
        </span>
      ))}
      <span
        title="차트를 좌우로 드래그하면 그 구간이 확대돼요"
        aria-label="차트를 드래그하면 그 구간이 확대돼요"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '2px 8px 2px 6px', borderRadius: '999px',
          border: '1px dashed var(--border-color)', color: 'var(--text-muted)', cursor: 'help',
        }}
      >
        {/* 실제로 드래그할 때 차트에 깔리는 선택 상자와 같은 모양 — 작은 선 위에 반투명 직사각형 */}
        <svg width="40" height="18" viewBox="0 0 40 18" fill="none" aria-hidden="true">
          <polyline points="1,13 7,10 12,12 17,6 22,9 27,4 32,8 39,5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="13" y="1" width="13" height="16" rx="1.5" fill={chartColor} fillOpacity={0.22} stroke={chartColor} strokeOpacity={0.6} strokeWidth="1.2" />
        </svg>
      </span>
    </div>
  );

  // 점 표시 칩 — 데스크톱 아래 막대, 표시 설정 바로 왼쪽. 눌러서 바로 보며 켜고 끈다.
  // 켜짐: 색을 채운 점 + 옅은 색 바탕 / 꺼짐: 속 빈 점 + 흐린 글자
  const dotChips = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} role="group" aria-label="차트 점 표시">
      {[
        { key: 'regular', label: '일반', title: '일반 날짜 점', on: showRegularDots, toggle: toggleRegularDots, color: chartColor },
        { key: 'wed', label: '수요일', title: '수요일 점', on: showWednesdayDots, toggle: toggleWednesdayDots, color: wedDotColor },
        { key: 'event', label: '이벤트', title: '특별 이벤트 점', on: showEventDots, toggle: toggleEventDots, color: eventDotColor },
      ].map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.toggle}
          aria-pressed={c.on}
          title={`${c.title} ${c.on ? '숨기기' : '표시'}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: isMobile ? '5px 9px 5px 7px' : '6px 11px 6px 9px', borderRadius: '999px',
            border: `1px solid ${c.on ? `color-mix(in srgb, ${c.color} 45%, transparent)` : 'var(--border-color)'}`,
            background: c.on ? `color-mix(in srgb, ${c.color} 10%, var(--card-bg))` : 'transparent',
            color: c.on ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: isMobile ? '0.74rem' : '0.8rem', fontWeight: c.on ? 700 : 600, cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
          }}
        >
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
            background: c.on ? c.color : 'transparent', border: `2px solid ${c.color}`,
          }} />
          {c.label}
        </button>
      ))}
    </div>
  );

  // 처음 볼 아이템 설정(모달은 PriceChartContainer 에 있다) — 예전엔 왼쪽 바 톱니였다
  const defaultItemButton = (
    <button
      type="button"
      onClick={() => { setShowPriceInput(false); openChartSettings(); }}
      style={{
        width: '100%',
        marginTop: '6px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px dashed var(--border-color)',
        background: 'transparent',
        color: 'var(--text-secondary)',
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      처음 볼 아이템 설정 ›
    </button>
  );



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
    // 날짜 키는 YYYY-MM-DD, 화면 표시는 toAxisLabel 로 M/D
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
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dateObj.getUTCDay();
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 이벤트 찾기
      const event = EVENTS.find(e => e.date === dateString);
      const eventLabel = event?.label;
      // 이벤트 점 색상 — 3색 체계
      // 차트 선=카테고리색 / 수요일=보색 / 특별이벤트=제3의 강조색
      const isSpecialEvent = !!event;
      const catLabel = categoryStyle?.label;
      const eventColor = isSpecialEvent
        ? (catLabel ? (SPECIAL_EVENT_DOT_COLOR_BY_CATEGORY[catLabel] || '#ec4899') : '#ec4899')
        : dayOfWeek === 3
          ? (catLabel ? (EVENT_DOT_COLOR_BY_CATEGORY[catLabel] || '#f97316') : '#f97316')
          : undefined;

      // 비교 가격 가져오기 (날짜 매칭)
      const comparisonPrice = comparisonPriceMap.get(dateString);

      dateMap.set(dateString, {
        날짜: dateString,
        가격: entry.price,
        비교가격: comparisonPrice,
        rawTime: dateObj.getTime(),
        isWednesday: dayOfWeek === 3,
        fullDate: dateObj,
        eventLabel,
        eventColor,
        eventNotes: event?.notes,
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

  // 드래그 박스 줌: 선택한 X축 구간으로 확대 (Y축도 해당 구간 가격대로 재계산)
  const [zoomKeys, setZoomKeys] = useState<{ left: string; right: string } | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // 아이템/기간 변경 시 줌 해제
  useEffect(() => {
    setZoomKeys(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  }, [selectedItem, selectedPeriod]);

  // 현재 표시할 데이터 (줌 구간이 있으면 그 구간만 잘라서 표시)
  const visibleData = useMemo(() => {
    if (!zoomKeys) return chartData;
    const li = chartData.findIndex(d => d.날짜 === zoomKeys.left);
    const ri = chartData.findIndex(d => d.날짜 === zoomKeys.right);
    if (li < 0 || ri < 0) return chartData;
    const a = Math.min(li, ri);
    const b = Math.max(li, ri);
    return chartData.slice(a, b + 1);
  }, [chartData, zoomKeys]);

  const isZoomed = !!zoomKeys && visibleData.length !== chartData.length;

  // 줌 구간 통계 (min/max/avg/current)
  const visibleStats = useMemo(() => {
    if (visibleData.length === 0) return null;
    const prices = visibleData.map(d => d.가격).filter((v): v is number => typeof v === 'number' && isFinite(v));
    if (prices.length === 0) return null;
    const current = prices[prices.length - 1];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    return { current, min, max, avg };
  }, [visibleData]);

  // 줌 구간 비교가격(회색선) 범위
  const visibleComparisonRange = useMemo(() => {
    if (!showComparisonLine) return null;
    const vals = visibleData
      .map(d => d.비교가격)
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
    if (vals.length === 0) return null;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [visibleData, showComparisonLine]);

  const visibleYAxisConfig = useMemo(
    () => buildYAxisConfig(visibleStats, visibleComparisonRange),
    [visibleStats, visibleComparisonRange]
  );

  const visibleAveragePrice = useMemo(() => {
    if (visibleData.length === 0) return 0;
    return visibleData.reduce((s, d) => s + d.가격, 0) / visibleData.length;
  }, [visibleData]);

  // 줌 구간 X축 틱 (균등 간격으로 추출)
  const visibleXTicks = useMemo(() => {
    const n = visibleData.length;
    if (n <= 1) return visibleData.map(d => d.날짜);
    const target = isMobile ? 6 : 10;
    const step = Math.max(1, Math.ceil(n / target));
    const ticks: string[] = [];
    for (let i = 0; i < n; i += step) ticks.push(visibleData[i].날짜);
    const lastKey = visibleData[n - 1].날짜;
    if (ticks[ticks.length - 1] !== lastKey) ticks.push(lastKey);
    return ticks;
  }, [visibleData, isMobile]);

  // 드래그 핸들러 (recharts mouse 이벤트의 activeLabel = X축 날짜 키)
  const handleZoomMouseDown = useCallback((e: { activeLabel?: string | number } | null | undefined) => {
    if (e && e.activeLabel != null) {
      const key = String(e.activeLabel);
      setRefAreaLeft(key);
      setRefAreaRight(key);
      setIsSelecting(true);
    }
  }, []);

  const handleZoomMouseMove = useCallback((e: { activeLabel?: string | number } | null | undefined) => {
    if (isSelecting && e && e.activeLabel != null) {
      const key = String(e.activeLabel);
      // 같은 데이터 지점 위면 setState 생략 → 불필요한 리렌더 방지
      setRefAreaRight(prev => (prev === key ? prev : key));
    }
  }, [isSelecting]);

  const handleZoomMouseUp = useCallback(() => {
    setIsSelecting(false);
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const li = chartData.findIndex(d => d.날짜 === refAreaLeft);
      const ri = chartData.findIndex(d => d.날짜 === refAreaRight);
      // 최소 2포인트 이상 선택 시에만 줌 (의도치 않은 클릭 방지)
      if (li >= 0 && ri >= 0 && Math.abs(ri - li) >= 1) {
        const a = Math.min(li, ri);
        const b = Math.max(li, ri);
        setZoomKeys({ left: chartData[a].날짜, right: chartData[b].날짜 });
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [refAreaLeft, refAreaRight, chartData]);

  const resetZoom = useCallback(() => {
    setZoomKeys(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  }, []);

  const formatPrice = useCallback((value: number) => {
    // 원화 환산 — 싼 재료는 1원도 안 돼서 소수점을 남긴다 (formatWon 과 같은 자릿수)
    if (wonMode) {
      const a = Math.abs(value);
      if (a >= 10) return Math.round(value).toLocaleString('ko-KR');
      return value.toLocaleString('ko-KR', { maximumFractionDigits: a >= 1 ? 1 : 2 });
    }
    // 악세, 보석 카테고리는 소수점 없이 표시
    if (categoryStyle?.label === '악세' || categoryStyle?.label === '팔찌' || categoryStyle?.label === '보석') {
      return Math.round(value).toLocaleString('ko-KR');
    }
    if (value < 100) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  }, [categoryStyle, wonMode]);

  const formatTooltipPrice = useCallback((value: number): ReactNode => {
    if (wonMode) return <WonPrice value={value} />;
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
  }, [categoryStyle, wonMode]);

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

  // 비교가격(회색선) 범위 — Y축이 비교선까지 감싸도록 (없으면 null)
  const comparisonRange = useMemo(() => {
    if (!showComparisonLine) return null; // 비교선 끄면 Y축도 메인 가격에 맞춰 좁힘
    const vals = chartData
      .map((d) => d.비교가격)
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
    if (vals.length === 0) return null;
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [chartData, showComparisonLine]);

  const yAxisConfig = useMemo(() => buildYAxisConfig(stats, comparisonRange), [stats, comparisonRange]);

  // 헤더의 현재가·전일 대비는 언제나 "오늘" 기준이다 — 기간을 과거 구간(이벤트 A~B)으로 잡아도
  // 이 둘은 흔들리지 않는다. 기간에 따라 움직이는 건 아래 periodRate 하나뿐.
  // 그래서 필터된 구간이 아니라 전체 history 를 본다(날짜별 마지막 값 = 차트가 점을 찍는 기준).
  const todayStats = useMemo(() => {
    if (!history || history.length === 0) return null;
    const byDate = new Map<string, number>();
    for (const e of history) byDate.set(e.date || e.timestamp.slice(0, 10), e.price);
    const dates = [...byDate.keys()].sort();
    if (dates.length === 0) return null;
    const latest = dates[dates.length - 1];
    const current = byDate.get(latest)!;
    const prev = dates.length > 1 ? byDate.get(dates[dates.length - 2])! : current;
    const [ly, lm, ld] = latest.split('-').map(Number);
    return {
      current,
      changeRate: prev > 0 ? ((current - prev) / prev) * 100 : 0,
      latestTime: Date.UTC(ly, lm - 1, ld),
    };
  }, [history]);

  const changeRate = todayStats?.changeRate ?? 0;

  // 지금 화면에 그려진 구간의 처음값·끝값·변화율.
  // 기간 버튼, 이벤트 대비 카드가 잡아 준 구간, 드래그 줌 — 무엇으로 구간이 정해졌든
  // 실제로 보이는 선(visibleData)을 기준으로 잡으므로 화면과 숫자가 어긋나지 않는다.
  const rangeStats = useMemo(() => {
    if (visibleData.length < 2) return null;
    const first = visibleData[0].가격;
    const last = visibleData[visibleData.length - 1].가격;
    return {
      first,
      last,
      rate: first > 0 ? ((last - first) / first) * 100 : 0,
      endTime: visibleData[visibleData.length - 1].rawTime as number,
    };
  }, [visibleData]);

  const periodRate = rangeStats?.rate ?? 0;

  // 구간이 오늘까지인가. 아니면(이벤트 두 개 선택·중간 드래그 줌) 현재가·전일 대비는 뜻이 없다 —
  // 그 자리에 구간의 시작값 → 끝값을 대신 보여준다.
  const rangeEndsToday =
    !rangeStats || !todayStats || rangeStats.endTime >= todayStats.latestTime;

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
          {toAxisLabel(label)} {eventLabel && <span style={{ color: eventColor }}>({eventLabel})</span>}
        </div>
        {data.eventNotes && data.eventNotes.length > 0 && (
          <ul style={{ margin: '0 0 10px', paddingLeft: '18px', fontSize: '13px', fontWeight: '600', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {data.eventNotes.map(note => <li key={note}>{note}</li>)}
          </ul>
        )}
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
                <span style={{ fontSize: '18px', fontWeight: '800', color: priceDiff >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
                  {priceDiff >= 0 ? '>' : '<'}
                </span>
                <Image src={comparisonData?.normalIcon || ''} alt="" width={22} height={22} style={{ borderRadius: '4px' }} />
                <span style={{ fontSize: '18px', fontWeight: '800', color: priceDiff >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
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
          {toAxisLabel(label)} {eventLabel && <span style={{ color: eventColor }}>({eventLabel})</span>}
        </div>
        {data.eventNotes && data.eventNotes.length > 0 && (
          <ul style={{ margin: '0 0 6px', paddingLeft: '14px', fontSize: '10px', fontWeight: '600', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
            {data.eventNotes.map(note => <li key={note}>{note}</li>)}
          </ul>
        )}
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
                <span style={{ fontSize: '14px', fontWeight: '800', color: priceDiff >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
                  {priceDiff >= 0 ? '>' : '<'}
                </span>
                <Image src={comparisonData?.normalIcon || ''} alt="" width={16} height={16} style={{ borderRadius: '3px' }} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: priceDiff >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
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
  // 1M, 2M: 모든 데이터 점 표시 (수요일/이벤트 강조)
  // 3M, 6M, 1Y, ALL: 수요일 + 특별 이벤트만
  const showAllDots = selectedPeriod === '1m' || selectedPeriod === '2m';

  // 커스텀 점 렌더러 (이벤트 라벨 포함)
  const CustomDot = (props: CustomDotProps) => {
    const { cx, cy, payload } = props;
    if (!payload || cx === undefined || cy === undefined) return null;
    const isSpecialEvent = !!payload.eventLabel;
    const isWednesday = !isSpecialEvent && payload.isWednesday;
    const eventColor = payload.eventColor || '#ef4444';

    // 일반 날짜 점 (1m/2m 일자별 점 — 독립 토글)
    if (!isSpecialEvent && !isWednesday) {
      if (!showAllDots || !showRegularDots) return null;
      // 선 위에 얹힌 속 빈 작은 원 — 꽉 찬 큰 점이 줄지어 있으면 선이 묻힌다
      return <circle cx={cx} cy={cy} r={3.5} fill="var(--card-bg)" strokeWidth={2} stroke={chartColor} />;
    }

    // 수요일 점 (라벨 없이 점만 - 호버 시 툴팁에서 "수요일" 표시)
    if (isWednesday) {
      if (!showWednesdayDots) return null;
      return <circle cx={cx} cy={cy} r={4.5} fill={eventColor} strokeWidth={2} stroke="var(--card-bg)" />;
    }

    // 특별 이벤트 점 — 점 + 위쪽 둥근 이름표(글자 그림자 대신 바탕을 깐다)
    if (!showEventDots) return null;
    const label = String(payload.eventLabel);
    const w = label.length * 11 + 14;
    return (
      <g>
        <line x1={cx} y1={cy - 7} x2={cx} y2={cy - 14} stroke={eventColor} strokeWidth={1.5} />
        <rect x={cx - w / 2} y={cy - 33} width={w} height={19} rx={9.5} fill="var(--card-bg)" stroke={eventColor} strokeWidth={1.5} />
        <text x={cx} y={cy - 23.5} textAnchor="middle" dominantBaseline="central" fill={eventColor} fontSize={11} fontWeight={800}>
          {label}
        </text>
        <circle cx={cx} cy={cy} r={5.5} fill={eventColor} strokeWidth={2.5} stroke="var(--card-bg)" />
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
      if (!showAllDots || !showRegularDots) return null;
      return <circle cx={cx} cy={cy} r={2.5} fill="var(--card-bg)" strokeWidth={1.5} stroke={chartColor} />;
    }

    if (isWednesday) {
      if (!showWednesdayDots) return null;
      return <circle cx={cx} cy={cy} r={3} fill={eventColor} strokeWidth={2} stroke="var(--card-bg)" />;
    }

    // 특별 이벤트
    if (!showEventDots) return null;
    return <circle cx={cx} cy={cy} r={4} fill={eventColor} strokeWidth={2} stroke="var(--card-bg)" />;
  };

  // 기간 라벨 맵핑
  const periodLabels: Record<PeriodOption, string> = {
    '7d': '7D',
    '1m': '1M',
    '2m': '2M',
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
      case '2m':
        interval = 5; // 5일 간격
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
      const targetTime = currentDate.getTime();

      // 후보 시점에 가장 가까운 chartData 날짜 찾기 (다운샘플링으로 정확한 날짜가 없어도 근사 매칭)
      let closestDateKey: string | null = null;
      let minDiff = Infinity;
      for (const d of chartData) {
        const diff = Math.abs(d.fullDate.getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestDateKey = d.날짜;
        }
      }

      if (closestDateKey && !tickSet.has(closestDateKey)) {
        ticks.push(closestDateKey);
        tickSet.add(closestDateKey);
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

  // 줌 반영 유효값 (줌 중이면 구간 기준, 아니면 전체 기준 — 비줌 시 기존과 100% 동일)
  const effectiveData = isZoomed ? visibleData : chartData;
  const effectiveYAxisConfig = isZoomed ? visibleYAxisConfig : yAxisConfig;
  const effectiveXTicks = isZoomed ? visibleXTicks : xAxisTicks;
  const effectiveAvg = isZoomed ? visibleAveragePrice : averagePrice;

  // 골드 가치 구간 — 원화로 보기 중에만, 지금 보이는 범위를 lib/gold-value.ts 점 날짜로
  // 나눈다. 구간마다 차트 위 여백에 "100골드 = 14원 → 10원" 알약 배지, 점 날짜에는 세로 점선.
  // X축이 날짜 문자열(카테고리)이라 점 날짜가 데이터에 없으면 그 뒤 첫 날짜에 붙인다.
  const goldValueSegments = (() => {
    if (!wonMode || effectiveData.length < 2) return null;
    const keys: string[] = effectiveData.map(d => d.날짜);
    const lastIdx = keys.length - 1;
    const bounds = [0];
    GOLD_VALUE_POINTS.forEach(p => {
      const i = keys.findIndex(k => k >= p.date);
      if (i > 0 && i < lastIdx && i !== bounds[bounds.length - 1]) bounds.push(i);
    });
    bounds.push(lastIdx);
    const fmt = (v: number) => String(Math.round(v * 10) / 10);
    const segments = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const from = fmt(getGoldValueAt(keys[bounds[i]]));
      const to = fmt(getGoldValueAt(keys[bounds[i + 1]]));
      segments.push({
        x1: keys[bounds[i]],
        x2: keys[bounds[i + 1]],
        label: from === to ? `100골드 = ${from}원` : `100골드 = ${from}원 → ${to}원`,
      });
    }
    return { segments, lines: bounds.slice(1, -1).map(i => keys[i]) };
  })();

  /** 구간 배지 — ReferenceArea 의 label 로 그려서 구간 가운데 위(차트 위 여백)에 띄운다. 구간보다 넓으면 생략 */
  const renderGoldValueBadge = (viewBox: { x?: number; y?: number; width?: number } | undefined, text: string, fontSize: number) => {
    if (!viewBox || viewBox.x == null || viewBox.y == null || viewBox.width == null) return null;
    // 한글은 1em, 숫자·기호는 0.62em 정도로 폭을 어림한다
    const textW = [...text].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? fontSize : fontSize * 0.62), 0);
    const padX = fontSize * 0.75;
    const w = textW + padX * 2;
    const h = fontSize * 1.75;
    if (w > viewBox.width) return null;
    const cx = viewBox.x + viewBox.width / 2;
    const top = viewBox.y - h - 3;
    return (
      <g pointerEvents="none">
        <rect x={cx - w / 2} y={top} width={w} height={h} rx={h / 2} style={{ fill: 'var(--card-bg)' }} stroke={chartColor} strokeWidth={1.5} />
        <text x={cx} y={top + h / 2} textAnchor="middle" dominantBaseline="central" fill={chartColor} fontSize={fontSize} fontWeight={800}>
          {text}
        </text>
      </g>
    );
  };

  if (!selectedItem) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  return (
    <Card className="price-chart-card" style={{ color: 'var(--text-primary)', maxWidth: '1400px', margin: '0 auto', ...(fillHeight ? { flex: 1, width: '100%' } : {}) }}>
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
            </div>
          </div>

          {!hidePeriodButtons && (
            <div className="d-flex justify-content-center gap-2" style={{ flex: '1' }}>
              {(['1m', '2m', '3m', 'all'] as PeriodOption[]).map((period) => (
                <button
                  key={period}
                  className="shadow-hard"
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '4px 16px',
                    borderRadius: '10px',
                    border: periodOn(period) ? `2px solid ${chartColor}` : '2px solid var(--border-color)',
                    backgroundColor: periodOn(period) ? (theme === 'dark' ? (categoryStyle?.darkBg || '#3c4043') : (categoryStyle?.lightBg || '#f0fdf4')) : 'var(--card-bg)',
                    color: periodOn(period) ? chartColor : 'var(--text-secondary)',
                    fontWeight: periodOn(period) ? '700' : '500',
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

          {stats && (
            <div className="text-end" style={{ flex: '1' }}>
              {rangeEndsToday ? (
                <>
                  <div className="font-numeric" style={{ fontSize: '1.5rem', fontWeight: '700', color: chartColor }}>
                    {formatTooltipPrice(todayStats?.current ?? stats.current)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
                    <RatePair label="전일" rate={changeRate} valueSize="1.4rem" arrowSize={20} />
                    <RatePair label="기간" rate={periodRate} valueSize="1.4rem" arrowSize={20} />
                  </div>
                </>
              ) : (
                <>
                  <RangeEndpoints
                    first={formatTooltipPrice(rangeStats!.first)}
                    last={formatTooltipPrice(rangeStats!.last)}
                    up={periodRate >= 0}
                    valueSize="1.15rem"
                    arrowSize={17}
                    color={chartColor}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <RatePair label="기간" rate={periodRate} valueSize="1.4rem" arrowSize={20} />
                  </div>
                </>
              )}
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
            </div>
          </div>
          {stats && (
            <div className="text-end">
              {rangeEndsToday ? (
                <>
                  <div className="font-numeric" style={{ fontSize: '1rem', fontWeight: '700', color: chartColor, whiteSpace: 'nowrap' }}>
                    {formatTooltipPrice(todayStats?.current ?? stats.current)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '9px', whiteSpace: 'nowrap' }}>
                    <RatePair label="전일" rate={changeRate} valueSize="0.95rem" arrowSize={15} />
                    <RatePair label="기간" rate={periodRate} valueSize="0.95rem" arrowSize={15} />
                  </div>
                </>
              ) : (
                <>
                  <RangeEndpoints
                    first={formatTooltipPrice(rangeStats!.first)}
                    last={formatTooltipPrice(rangeStats!.last)}
                    up={periodRate >= 0}
                    valueSize="0.78rem"
                    arrowSize={13}
                    color={chartColor}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <RatePair label="기간" rate={periodRate} valueSize="0.95rem" arrowSize={15} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body className="py-0 px-2 px-md-3" style={{ backgroundColor: 'var(--card-bg)', ...(fillHeight ? { display: 'flex', flexDirection: 'column' } : {}) }}>
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
            {!isMobile && <div style={{ width: '100%', position: 'relative', ...(fillHeight ? { flex: 1, minHeight: '500px' } : { height: '500px' }) }}>
              {isZoomed && (
                <button
                  onClick={resetZoom}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '12px',
                    zIndex: 10,
                    padding: '4px 12px',
                    borderRadius: '8px',
                    border: `2px solid ${chartColor}`,
                    backgroundColor: 'var(--card-bg)',
                    color: chartColor,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  전체보기
                </button>
              )}
              <ResponsiveContainer width="100%" height="100%" minHeight={500}>
                <ComposedChart data={effectiveData} onMouseDown={handleZoomMouseDown} onMouseMove={handleZoomMouseMove} onMouseUp={handleZoomMouseUp} style={{ cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }} margin={{ top: goldValueSegments ? 44 : 36, right: 12, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.22}/><stop offset="100%" stopColor={chartColor} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="var(--border-color)" strokeWidth={1} vertical={false} horizontal={true} />
                  <XAxis dataKey="날짜" ticks={effectiveXTicks} tick={(props) => { const { x, y, payload } = props; if (effectiveData.findIndex(d => d.날짜 === payload.value) < 0) return null; return (<text x={x} y={y} dy={14} textAnchor="middle" fill="var(--text-muted)" fontSize={12} fontWeight={600} fontFamily="var(--font-num), var(--font-kr), sans-serif">{toAxisLabel(payload.value)}</text>); }} height={34} tickLine={false} axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }} />
                  <YAxis tick={(props) => { const { x, y, payload } = props; const isAverage = effectiveYAxisConfig.avgValue && Math.abs(payload.value - effectiveYAxisConfig.avgValue) < 0.01; return (<text x={x} y={y} textAnchor="end" dominantBaseline="central" fill={isAverage ? chartColor : 'var(--text-muted)'} fontSize={stats && stats.max >= 1000000 ? 12 : 13} fontWeight={isAverage ? 800 : 600} fontFamily="var(--font-num), var(--font-kr), sans-serif" dx={-8}>{formatPrice(payload.value)}</text>); }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 92 : stats && stats.max >= 100000 ? 80 : stats && stats.max >= 10000 ? 70 : stats && stats.max >= 1000 ? 62 : stats && stats.max >= 100 ? 52 : 48} domain={effectiveYAxisConfig.domain} ticks={effectiveYAxisConfig.ticks} interval={0} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <ReferenceLine y={effectiveAvg} stroke={chartColor} strokeOpacity={0.6} strokeDasharray="6 4" strokeWidth={1.5} />
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
                  {chartCustomLines?.sellPrice && (
                    <ReferenceLine y={chartCustomLines.sellPrice} stroke="#10b981" strokeDasharray="10 5" strokeWidth={2.5} />
                  )}
                  {/* 커스텀 가격선 - 구매가 (주황) */}
                  {chartCustomLines?.buyPrice && (
                    <ReferenceLine y={chartCustomLines.buyPrice} stroke="#f59e0b" strokeDasharray="10 5" strokeWidth={2.5} />
                  )}
                  {/* 비교 라인 (일반 재료 × 5) - 점선 */}
                  {comparisonData && showComparisonLine && (
                    <Line type="monotone" dataKey="비교가격" stroke={comparisonColor} strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={{ r: 6, fill: comparisonColor, stroke: 'var(--card-bg)', strokeWidth: 2 }} connectNulls isAnimationActive={false} />
                  )}
                  {/* 골드 가치 구간 — 경계 점선 + 한 칸씩 걸러 옅은 줄무늬 + 위쪽 배지 */}
                  {goldValueSegments?.lines.map(x => (
                    <ReferenceLine key={`gv-${x}`} x={x} stroke={chartColor} strokeOpacity={0.55} strokeDasharray="4 4" strokeWidth={1.5} />
                  ))}
                  {goldValueSegments?.segments.map((seg, i) => (
                    <ReferenceArea
                      key={`gvs-${seg.x1}`}
                      x1={seg.x1}
                      x2={seg.x2}
                      fill={chartColor}
                      fillOpacity={i % 2 === 0 ? 0.06 : 0}
                      strokeOpacity={0}
                      ifOverflow="visible"
                      label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => renderGoldValueBadge(props.viewBox, seg.label, 13)}
                    />
                  ))}
                  {/* 선 아래 면 — 위에서 아래로 옅어지는 카테고리 색. 툴팁에는 안 나온다 */}
                  <Area type="monotone" dataKey="가격" stroke="none" fill="url(#colorPrice)" tooltipType="none" activeDot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" dot={<CustomDot />} activeDot={{ r: 6, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 3 }} isAnimationActive={false} />
                  {/* 드래그 선택 영역 (확대 미리보기) */}
                  {isSelecting && refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight && (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} stroke={chartColor} strokeOpacity={0.4} fill={chartColor} fillOpacity={0.12} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>}

            {isMobile && <div style={{ width: '100%', height: '350px', marginTop: '-8px', position: 'relative' }}>
              {isZoomed && (
                <button
                  onClick={resetZoom}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '8px',
                    zIndex: 10,
                    padding: '3px 10px',
                    borderRadius: '7px',
                    border: `2px solid ${chartColor}`,
                    backgroundColor: 'var(--card-bg)',
                    color: chartColor,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  전체보기
                </button>
              )}
              <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                <ComposedChart data={effectiveData} onMouseDown={handleZoomMouseDown} onMouseMove={handleZoomMouseMove} onMouseUp={handleZoomMouseUp} style={{ cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }} margin={{ top: goldValueSegments ? 26 : 10, right: 5, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorPriceMobile" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.22}/><stop offset="100%" stopColor={chartColor} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeWidth={0.5} vertical={false} horizontal={true} />
                  <XAxis dataKey="날짜" ticks={effectiveXTicks} tick={(props) => { const { x, y, payload } = props; const dataIndex = effectiveData.findIndex(d => d.날짜 === payload.value); if (dataIndex < 0) return null; const data = effectiveData[dataIndex]; const eventLabel = data.eventLabel || ''; const eventColor = data.eventColor || '#ef4444'; return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={8} textAnchor="end" fill="var(--text-muted)" fontSize={9} fontWeight="600" fontFamily="var(--font-mono), monospace" transform="rotate(-45)">{toAxisLabel(payload.value)}</text>{eventLabel && (<text x={0} y={8} dy={8} textAnchor="end" fill={eventColor} fontSize={7} fontWeight="700" transform="rotate(-45)">{eventLabel}</text>)}</g>); }} height={55} tickLine={false} axisLine={{ stroke: 'var(--border-color)', strokeWidth: 1 }} />
                  <YAxis tick={(props) => { const { x, y, payload } = props; const isAverage = effectiveYAxisConfig.avgValue && Math.abs(payload.value - effectiveYAxisConfig.avgValue) < 0.01; const fontSize = stats ? (stats.max >= 1000000 ? 6 : stats.max >= 100000 ? 7 : stats.max >= 10000 ? 8 : stats.max >= 1000 ? 9 : stats.max >= 100 ? 7.5 : 7) : 8; return (<text x={x} y={y} textAnchor="end" fill={isAverage ? chartColor : 'var(--text-muted)'} fontSize={fontSize} fontWeight={isAverage ? '900' : '700'} fontFamily="var(--font-mono), monospace" dx={-2}>{formatPrice(payload.value)}</text>); }} tickFormatter={formatPrice} width={stats && stats.max >= 1000000 ? 46 : stats && stats.max >= 100000 ? 42 : stats && stats.max >= 10000 ? 38 : stats && stats.max >= 1000 ? 38 : stats && stats.max >= 100 ? 32 : 30} domain={effectiveYAxisConfig.domain} ticks={effectiveYAxisConfig.ticks} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltipMobile />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <ReferenceLine y={effectiveAvg} stroke={chartColor} strokeDasharray="5 5" strokeWidth={1.5} />
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
                  {chartCustomLines?.sellPrice && (
                    <ReferenceLine y={chartCustomLines.sellPrice} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {/* 커스텀 가격선 - 구매가 (주황) - 모바일 */}
                  {chartCustomLines?.buyPrice && (
                    <ReferenceLine y={chartCustomLines.buyPrice} stroke="#f59e0b" strokeDasharray="8 4" strokeWidth={2} />
                  )}
                  {/* 비교 라인 (일반 재료 × 5) - 점선 */}
                  {comparisonData && showComparisonLine && (
                    <Line type="monotone" dataKey="비교가격" stroke={comparisonColor} strokeWidth={1.5} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, fill: comparisonColor, stroke: 'var(--card-bg)', strokeWidth: 1 }} connectNulls isAnimationActive={false} />
                  )}
                  {/* 골드 가치 구간 — 경계 점선 + 한 칸씩 걸러 옅은 줄무늬 + 위쪽 배지 */}
                  {goldValueSegments?.lines.map(x => (
                    <ReferenceLine key={`gv-${x}`} x={x} stroke={chartColor} strokeOpacity={0.55} strokeDasharray="3 3" strokeWidth={1.5} />
                  ))}
                  {goldValueSegments?.segments.map((seg, i) => (
                    <ReferenceArea
                      key={`gvs-${seg.x1}`}
                      x1={seg.x1}
                      x2={seg.x2}
                      fill={chartColor}
                      fillOpacity={i % 2 === 0 ? 0.06 : 0}
                      strokeOpacity={0}
                      ifOverflow="visible"
                      label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => renderGoldValueBadge(props.viewBox, seg.label, 9)}
                    />
                  ))}
                  <Area type="monotone" dataKey="가격" stroke="none" fill="url(#colorPriceMobile)" tooltipType="none" activeDot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="가격" stroke={chartColor} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" dot={<CustomDotMobile />} activeDot={{ r: 5, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 2 }} isAnimationActive={false} />
                  {/* 드래그 선택 영역 (확대 미리보기) - 모바일 */}
                  {isSelecting && refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight && (
                    <ReferenceArea x1={refAreaLeft} x2={refAreaRight} stroke={chartColor} strokeOpacity={0.4} fill={chartColor} fillOpacity={0.12} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>}
          </>
        )}
      </Card.Body>
      {/* 아래 막대 — 범례 · 드래그 안내 · 점 칩 · 표시 설정. 머리 줄은 이름·가격만 남긴다.
          모바일도 같은 막대를 쓴다(예전엔 머리에 톱니 팝업이 따로 있었다). 범례는 좁아서 데스크톱만. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: isMobile ? '8px 10px' : '10px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)',
        }}
      >
        {!isMobile && chartLegend}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: isMobile ? '6px' : '10px', flex: isMobile ? 1 : '0 0 auto' }}>
          {dotChips}
              {/* 표시 설정 — 비교선·가격선·처음 볼 아이템을 한 팝업에(점은 왼쪽 칩으로 꺼냈다). 팝업은 위로 연다 */}
              <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowPriceInput(!showPriceInput)}
                aria-expanded={showPriceInput}
                title="차트 표시 설정"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  padding: '7px 12px 7px 11px',
                  borderRadius: '10px',
                  border: `1px solid color-mix(in srgb, ${chartColor} ${showPriceInput ? 70 : 40}%, transparent)`,
                  background: `color-mix(in srgb, ${chartColor} ${showPriceInput ? 18 : 10}%, var(--card-bg))`,
                  color: chartColor,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                  <circle cx="9" cy="6" r="2" fill="var(--card-bg)" /><circle cx="15" cy="12" r="2" fill="var(--card-bg)" /><circle cx="7" cy="18" r="2" fill="var(--card-bg)" />
                </svg>
                {!isMobile && '표시 설정'}
                {currentCustomLines && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} aria-label="가격선 사용 중" />}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  style={{ transform: showPriceInput ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  <polyline points="6 15 12 9 18 15" />
                </svg>
              </button>

              {/* 가격 입력 팝업 */}
              {showPriceInput && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '8px',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    zIndex: 100,
                    minWidth: '260px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    차트 표시
                  </div>
                  {renderToggleRows(isMobile || !hidePeriodButtons, false)}

                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', margin: '14px 0 8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    가격선
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
                  {defaultItemButton}
                </div>
              )}
            </div>
        </div>
      </div>
    </Card>
  );
}