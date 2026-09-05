'use client';

// 패키지 가치 추이 — 갤러리 카드의 "추이" 배지를 누르면 카드 하단에 열리는 패널 내용.
// 그리는 방식은 메인 시세 차트(CompactPriceChart)와 같은 문법이다:
// 테마별 라인색 + 그라데이션 영역 + 점선 그리드 + 굵은 모노 축 글씨 + 평균 점선.
// Y축은 데이터 범위에 딱 맞춰 잡는다 (0을 억지로 포함시키면 변동이 눌려 보인다).
// 히스토리는 차트 페이지와 같은 fetchPriceData(모듈 캐시)라 추가 네트워크 비용이 거의 없다.
// 지표는 갤러리 효율순 정렬과 같은 calculatePostEfficiency 기준 —
// 3+1/2+1/3+보너스는 묶음 보정 포함, 가챠는 기대값이다.

import { useEffect, useMemo, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';
import type { PackagePost } from '@/types/package';
import type { AzenaOptions } from '@/lib/azena-blessing';
import { fetchPriceData } from '@/lib/price-history-client';
import {
  buildPackageValueSeries,
  buildAzenaValueSeries,
  type PackageValuePoint,
  type PriceHistoryData,
  type ValueBasis,
} from '@/lib/package-value-history';
import { formatNumber } from '@/lib/package-shared';
import styles from './PackageGalleryCard.module.css';

type Props = {
  /** 카드의 현재 체크 상태가 반영된 글 (N선택·보너스 선택을 items 에 미리 걸러서 넘긴다) */
  post?: PackagePost;
  /** 아제나의 축복 모드 — post 대신 카드의 현재 옵션(티어·공명·휴게·PC방)을 넘긴다 */
  azenaOptions?: AzenaOptions;
  /** 카드가 지금 쓰는 시세(평균가 또는 최저가 덮인 상태) — 오늘 점이 카드 숫자와 일치해야 한다 */
  latestPrices: Record<string, number>;
  /** 카드가 지금 쓰는 환율 — 카드 입력칸·공통 환율을 그대로 따라간다 */
  goldPerWon: number;
};

// 지표 라벨 — 카드에 찍히는 어느 숫자와 같은 기준인지 명시한다
function metricLabel(post?: PackagePost, basis: ValueBasis = 'bundle'): string {
  if (!post) return '28일 기대값 이득률'; // 아제나 — 카드의 "기대 효율"과 같은 기준
  if (post.packageType === '가챠') return '기대값 이득률';
  if (post.packageType === '3+1' || post.packageType === '2+1' || post.packageType === '3+보너스')
    return basis === 'single' ? '1개 구매 이득률' : `${post.packageType} 이득률`;
  return '1개 구매 이득률';
}

// 묶음/1개 기준 전환이 의미 있는 패키지 타입인지 (일반·가챠는 두 기준이 같다)
function hasBundleBasis(post?: PackagePost): boolean {
  return !!post && (post.packageType === '3+1' || post.packageType === '2+1' || post.packageType === '3+보너스');
}

const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(m)}/${Number(day)}`;
};

// 참조선 오른쪽 라벨 — 차트 오른쪽 여백에서 각 점선의 y 위치를 따라다닌다 (이름 위, 값 아래)
type RefLabelProps = {
  viewBox?: { x: number; y: number; width: number; height: number };
  text: string;
  value: string;
  color: string;
};
function RefLabel({ viewBox, text, value, color }: RefLabelProps) {
  if (!viewBox) return null;
  const x = viewBox.x + viewBox.width + 5;
  return (
    <g>
      <text x={x} y={viewBox.y - 3} fill={color} fontSize={9} fontWeight={700}>
        {text}
      </text>
      <text
        x={x}
        y={viewBox.y + 10}
        fill={color}
        fontSize={11}
        fontWeight={800}
        fontFamily="var(--font-mono), monospace"
      >
        {value}
      </text>
    </g>
  );
}

/** 1·2·5×10^k 로 올림한 "보기 좋은" 틱 간격 */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export default function PackageValueChart({ post, azenaOptions, latestPrices, goldPerWon }: Props) {
  const { theme } = useTheme();
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData | null>(null);
  const [failed, setFailed] = useState(false);
  // 3+1/2+1/3+보너스: 묶음 구매 기준(기본·정렬과 동일) ↔ 1개 구매 기준 전환
  const [basis, setBasis] = useState<ValueBasis>('bundle');

  // 메인 시세 차트와 같은 색 체계 (라이트 초록 / 다크 하늘)
  const chartColor = theme === 'dark' ? '#8ab4f8' : '#16a34a';

  useEffect(() => {
    let cancelled = false;
    fetchPriceData()
      .then(({ history }) => {
        if (!cancelled) setPriceHistory(history);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 환율·체크 상태·시세(최저가 갱신 포함)가 바뀌면 즉시 다시 계산 — 오늘 점은 항상 카드 숫자와 같다
  const series = useMemo<PackageValuePoint[] | null>(() => {
    if (!priceHistory) return null;
    if (post) return buildPackageValueSeries(post, priceHistory, latestPrices, goldPerWon, basis);
    if (azenaOptions)
      return buildAzenaValueSeries(priceHistory, latestPrices, goldPerWon, azenaOptions);
    return null;
  }, [priceHistory, post, azenaOptions, latestPrices, goldPerWon, basis]);

  // 이득률 축이 기본, 등록 환율이 없는 옛 글은 골드 축으로 대신 그린다
  const benefitMode = !!(series && series.length > 0 && series[0].benefitPct !== null);

  const chartData = useMemo(() => {
    if (!series) return [];
    // 점이 아주 많으면 솎아낸다 (처음·끝은 보존)
    const MAX_POINTS = 200;
    const step = series.length > MAX_POINTS ? Math.ceil(series.length / MAX_POINTS) : 1;
    return series
      .filter((_, i) => i % step === 0 || i === series.length - 1)
      .map((p) => ({
        날짜: shortDate(p.date),
        fullDate: p.date,
        값: p.benefitPct !== null ? Math.round(p.benefitPct * 10) / 10 : Math.round(p.gold),
        gold: Math.round(p.gold),
      }));
  }, [series]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const vals = chartData.map((d) => d.값);
    return {
      current: vals[vals.length - 1],
      max: Math.max(...vals),
      min: Math.min(...vals),
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
    };
  }, [chartData]);

  // Y축 — 메인 차트의 buildYAxisConfig 와 같은 원칙: 데이터 범위 + 패딩에 보기 좋은 간격의 틱
  const yAxis = useMemo(() => {
    if (!stats) return null;
    let { min, max } = stats;
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const range = max - min;
    const step = niceStep(range / 4);
    const pad = range * 0.15 + step * 0.25;
    const lo = Math.floor((min - pad) / step) * step;
    const hi = Math.ceil((max + pad) / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.round(v * 100) / 100);
    return { domain: [lo, hi] as [number, number], ticks };
  }, [stats]);

  // X축 — 균일 간격으로 8개 정도만, 마지막 날짜는 항상 포함
  const xTicks = useMemo(() => {
    const n = chartData.length;
    if (n <= 1) return chartData.map((d) => d.날짜);
    const step = Math.max(1, Math.ceil(n / 8));
    const ticks: string[] = [];
    for (let i = 0; i < n; i += step) ticks.push(chartData[i].날짜);
    const last = chartData[n - 1].날짜;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [chartData]);

  const fmtAxis = (v: number) =>
    benefitMode
      ? `${Number.isInteger(v) ? v : v.toFixed(1)}%`
      : Math.round(v).toLocaleString('ko-KR');
  const fmtVal = (v: number) =>
    benefitMode ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : `${formatNumber(Math.round(v))}G`;
  const valColor = (v: number) =>
    benefitMode ? (v >= 0 ? 'var(--price-up)' : 'var(--price-down)') : 'var(--gc-text)';

  type ChartTipProps = {
    active?: boolean;
    payload?: Array<{ payload: { 날짜: string; fullDate: string; 값: number; gold: number } }>;
  };
  const ChartTooltip = ({ active, payload }: ChartTipProps) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className={styles.chartTooltip} style={{ borderColor: chartColor }}>
        <div className={styles.chartTooltipDate} style={{ color: chartColor }}>
          {d.fullDate}
        </div>
        <div className={styles.chartTooltipValue} style={{ color: valColor(d.값) }}>
          {fmtVal(d.값)}
        </div>
        {benefitMode && (
          <div className={styles.chartTooltipGold}>구성품 가치 {formatNumber(d.gold)}G</div>
        )}
      </div>
    );
  };

  // 카드마다 차트가 하나씩 열릴 수 있어 그라데이션 id 는 글마다 달라야 한다
  const gradId = `pkgValueGrad-${post?.id ?? 'azena-blessing'}`;

  return (
    <div>
      {/* 헤더 한 줄: 왼쪽 = 지표 이름, 오른쪽 = 현재값 하나만.
          최고·평균·최저는 차트 오른쪽 여백에서 각 점선 y 위치에 붙어 따라다닌다 */}
      <div className={styles.chartHead}>
        <span className={styles.chartTitle}>
          {benefitMode ? metricLabel(post, basis) : '구성품 가치'} 추이
          {/* 묶음/1개 기준 전환 — 카드에 두 숫자(1개 구매·묶음 구매)가 다 있으므로 차트도 둘 다 보여준다 */}
          {hasBundleBasis(post) && (
            <span className={styles.chartBasisToggle} role="group" aria-label="이득률 기준 전환">
              <button
                type="button"
                className={`${styles.chartBasisBtn} ${basis === 'bundle' ? styles.chartBasisBtnActive : ''}`}
                onClick={() => setBasis('bundle')}
              >
                {post!.packageType}
              </button>
              <button
                type="button"
                className={`${styles.chartBasisBtn} ${basis === 'single' ? styles.chartBasisBtnActive : ''}`}
                onClick={() => setBasis('single')}
              >
                1개
              </button>
            </span>
          )}
        </span>
        {stats && (
          <div className={styles.chartStats}>
            <span className={styles.chartStatItem}>
              <em>현재</em>
              <strong style={{ color: valColor(stats.current) }}>{fmtVal(stats.current)}</strong>
            </span>
          </div>
        )}
      </div>

      {failed ? (
        <div className={styles.chartEmpty}>시세 히스토리를 불러오지 못했습니다</div>
      ) : !series ? (
        <div className={styles.chartEmpty}>
          <Spinner animation="border" size="sm" /> 불러오는 중…
        </div>
      ) : chartData.length < 2 ? (
        <div className={styles.chartEmpty}>
          아직 추이를 그릴 데이터가 부족합니다 (등록 다음 날부터 쌓입니다)
        </div>
      ) : (
        <>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: benefitMode ? 62 : 82, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" stroke="var(--border-color)" strokeWidth={1} vertical horizontal />
                <XAxis
                  dataKey="날짜"
                  ticks={xTicks}
                  height={42}
                  stroke="var(--text-secondary)"
                  strokeWidth={1.5}
                  tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                  axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={9}
                          textAnchor="end"
                          fill="var(--text-primary)"
                          fontSize={11}
                          fontWeight="700"
                          fontFamily="var(--font-mono), monospace"
                          transform="rotate(-35)"
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis
                  width={benefitMode ? 52 : 64}
                  domain={yAxis?.domain ?? ['auto', 'auto']}
                  ticks={yAxis?.ticks}
                  interval={0}
                  tickFormatter={fmtAxis}
                  stroke="var(--text-secondary)"
                  strokeWidth={1.5}
                  tickLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                  axisLine={{ stroke: 'var(--text-secondary)', strokeWidth: 1.5 }}
                  tick={{
                    fill: 'var(--text-primary)',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono), monospace',
                  }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: chartColor, strokeWidth: 1.5, strokeDasharray: '5 5' }}
                />
                {/* 참조선 — 이득률 차트라 사이트 손익 색 규칙을 따른다: 높을수록 좋음 =
                    최고 초록(--price-up) / 최저 빨강(--price-down) / 평균 검정(--gc-text, 다크에선 밝은 글자색).
                    (시세 차트의 "최고 빨강/최저 파랑"은 가격 문법이라 여긴 반대로 읽힌다)

                    최고·최저는 선을 긋지 않는다(stroke="none"). 값이 오른쪽 여백 라벨에 이미
                    적혀 있어서 가로줄까지 그으면 격자·평균선과 겹쳐 차트만 복잡해진다.
                    ReferenceLine 을 지우지 않고 남겨 둔 이유는 이것이 라벨의 y 좌표를 잡아 주기 때문 —
                    빼면 최고·최저 숫자가 같이 사라진다. 실제 가로줄은 평균 하나만 남는다. */}
                {stats && (
                  <>
                    <ReferenceLine
                      y={stats.max}
                      stroke="none"
                      label={<RefLabel text="최고" value={fmtVal(stats.max)} color="var(--price-up)" />}
                    />
                    <ReferenceLine
                      y={stats.avg}
                      stroke="var(--gc-text)"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={<RefLabel text="평균" value={fmtVal(stats.avg)} color="var(--gc-text)" />}
                    />
                    <ReferenceLine
                      y={stats.min}
                      stroke="none"
                      label={<RefLabel text="최저" value={fmtVal(stats.min)} color="var(--price-down)" />}
                    />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey="값"
                  stroke={chartColor}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: chartColor, stroke: 'var(--card-bg)', strokeWidth: 2 }}
                  fill={`url(#${gradId})`}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
