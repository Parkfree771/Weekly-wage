'use client';

// 주간 골드 차트 — 앱 loalogol-app/src/screens/WeeklyScreen.tsx 골드 기록 카드 이식 (데이터·디자인 동일).
// 세그먼트(주/월/년/전체) + 기간 네비 + 합계 HERO + 유통/귀속 스택 막대 + 다크 툴팁 + 평균 점선.
import { useMemo, useState } from 'react';
import NextImage from 'next/image';
import styles from './WeeklyGoldChart.module.css';
import { WeeklyGoldRecord, getThisWeekWednesday6AM, getCurrentWeekStart } from '@/types/user';

const ACCENT = '#6366f1';
const BOUND_GOLD_FILTER = 'hue-rotate(280deg) saturate(1.0)';

// 차트 축·막대 라벨 (만 단위 축약)
const fmtMan = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1).replace(/\.0$/, '')}만` : v.toLocaleString());

// 차트 스케일 상한을 보기 좋은 값(1/2/2.5/5×10^k)으로 올림
const niceCeil = (v: number) => {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
};

// 차트 전용 색 — 앱과 동일
const CHART_FREE = '#d97706';    // 유통
const CHART_BOUND = '#c026d3';   // 귀속
const CHART_UNSPLIT = '#9ca3af'; // 유통/귀속 분리 기록이 없는 옛 주
const CHART_PLOT_H = 150;        // 막대 영역 높이 (앱과 동일)
const CHART_HEADROOM = 10;       // 막대 위 여유
const CHART_TIP_W = 136;         // 막대 툴팁 폭

type ChartPeriod = 'week' | 'month' | 'year' | 'all';
const CHART_PERIODS: Array<[ChartPeriod, string]> = [
  ['week', '주'], ['month', '월'], ['year', '년'], ['all', '전체'],
];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type GoldRecLite = { weekStart: string; total: number; free?: number; bound?: number };
type GoldBucket = {
  key: string;
  label: string;   // x축 짧은 라벨
  tip: string;     // 막대 툴팁 라벨
  total: number; free: number; bound: number; unsplit: number;
  current?: boolean;
};

type Props = {
  history: WeeklyGoldRecord[];
  /** 이번 주 실시간 합계 (유통에는 추가 골드 포함, 귀속에는 공통 컨텐츠 골드 포함) */
  currentWeek: { total: number; free: number; bound: number };
};

export default function WeeklyGoldChart({ history, currentWeek }: Props) {
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week');
  const [chartOffset, setChartOffset] = useState(0); // 0=현재, 음수=과거
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const currentWeekKey = getCurrentWeekStart();

  const goldRecords = useMemo<GoldRecLite[]>(() => {
    const recs: GoldRecLite[] = (history || [])
      .filter(h => h && typeof h.weekStart === 'string' && h.weekStart !== currentWeekKey)
      .map(h => ({ weekStart: h.weekStart, total: h.totalGold || 0, free: h.freeGold, bound: h.boundGold }));
    recs.push({
      weekStart: currentWeekKey,
      total: currentWeek.total,
      free: currentWeek.free,
      bound: currentWeek.bound,
    });
    recs.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    return recs;
  }, [history, currentWeek, currentWeekKey]);

  const goldChart = useMemo(() => {
    const byWeek = new Map(goldRecords.map(r => [r.weekStart, r]));
    const baseMs = getThisWeekWednesday6AM().getTime(); // 이번 주 시작 (수 06시 KST, 실시각)
    const kstKey = (ms: number) => {
      const d = new Date(ms + 9 * 3600e3);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };
    const mk = (key: string, label: string, tip: string, rs: GoldRecLite[], current = false): GoldBucket => {
      const total = rs.reduce((s, r) => s + r.total, 0);
      const free = rs.reduce((s, r) => s + (r.free || 0), 0);
      const bound = rs.reduce((s, r) => s + (r.bound || 0), 0);
      return { key, label, tip, total, free, bound, unsplit: Math.max(0, total - free - bound), current };
    };

    const nowKst = new Date(Date.now() + 9 * 3600e3);
    const curY = nowKst.getUTCFullYear();
    const curM = nowKst.getUTCMonth();
    const earliest = goldRecords[0]?.weekStart || currentWeekKey;

    const buckets: GoldBucket[] = [];
    let navLabel = '';
    let canBack = false;

    if (chartPeriod === 'week') {
      // 8주 창 (offset 페이지 단위)
      for (let j = 0; j < 8; j++) {
        const ms = baseMs + (chartOffset * 8 + j - 7) * WEEK_MS;
        const key = kstKey(ms);
        const [, m, d] = key.split('-').map(Number);
        const rec = byWeek.get(key);
        const isCur = key === currentWeekKey;
        buckets.push(mk(key, `${m}.${d}`, `${m}월 ${Math.ceil(d / 7)}주차${isCur ? ' · 이번주' : ''}`, rec ? [rec] : [], isCur));
      }
      const a = buckets[0].key.split('-').map(Number);
      const b = buckets[7].key.split('-').map(Number);
      navLabel = `${a[1]}.${a[2]} – ${b[1]}.${b[2]}`;
      canBack = buckets[0].key > earliest;
    } else if (chartPeriod === 'month') {
      const mIdx = curM + chartOffset;
      const vy = curY + Math.floor(mIdx / 12);
      const vm = ((mIdx % 12) + 12) % 12;
      const t0 = Date.parse(`${vy}-${String(vm + 1).padStart(2, '0')}-01T06:00:00+09:00`);
      const nIdx = mIdx + 1;
      const t1 = Date.parse(`${curY + Math.floor(nIdx / 12)}-${String((((nIdx % 12) + 12) % 12) + 1).padStart(2, '0')}-01T06:00:00+09:00`);
      // 이 달에 시작하는 주들 (주 시작 그리드는 7일 간격 고정)
      let ws = baseMs + Math.floor((t0 - baseMs) / WEEK_MS) * WEEK_MS;
      if (ws < t0) ws += WEEK_MS;
      for (; ws < t1; ws += WEEK_MS) {
        const key = kstKey(ws);
        const d = Number(key.slice(8));
        const rec = byWeek.get(key);
        const isCur = key === currentWeekKey;
        buckets.push(mk(key, `${Math.ceil(d / 7)}주`, `${vm + 1}월 ${Math.ceil(d / 7)}주차${isCur ? ' · 이번주' : ''}`, rec ? [rec] : [], isCur));
      }
      navLabel = `${vy}년 ${vm + 1}월`;
      canBack = `${vy}-${String(vm + 1).padStart(2, '0')}` > earliest.slice(0, 7);
    } else if (chartPeriod === 'year') {
      const vy = curY + chartOffset;
      for (let m = 0; m < 12; m++) {
        const prefix = `${vy}-${String(m + 1).padStart(2, '0')}`;
        const rs = goldRecords.filter(r => r.weekStart.startsWith(prefix));
        buckets.push(mk(prefix, `${m + 1}`, `${vy}년 ${m + 1}월`, rs));
      }
      navLabel = `${vy}년`;
      canBack = String(vy) > earliest.slice(0, 4);
    } else {
      // 전체 — 연도별 (최소 3칸)
      const firstY = Math.min(Number(earliest.slice(0, 4)), curY - 2);
      for (let y = firstY; y <= curY; y++) {
        const rs = goldRecords.filter(r => r.weekStart.startsWith(`${y}-`));
        buckets.push(mk(String(y), String(y), `${y}년`, rs));
      }
      navLabel = '전체';
    }

    const niceMax = niceCeil(Math.max(...buckets.map(b => b.total), 1));
    const withData = buckets.filter(b => b.total > 0);
    const avg = withData.length > 1 ? withData.reduce((s, b) => s + b.total, 0) / withData.length : 0;
    const heroTotal = buckets.reduce((s, b) => s + b.total, 0);
    const heroFree = buckets.reduce((s, b) => s + b.free, 0);
    const heroBound = buckets.reduce((s, b) => s + b.bound, 0);
    return { buckets, niceMax, avg, heroTotal, heroFree, heroBound, navLabel, canBack };
  }, [goldRecords, chartPeriod, chartOffset, currentWeekKey]);

  const { buckets, niceMax, avg, heroTotal, heroFree, heroBound, navLabel, canBack } = goldChart;
  const scale = CHART_PLOT_H / niceMax;
  const n = buckets.length;
  const barW = n <= 6 ? 24 : n <= 8 ? 20 : 14;
  const canForward = chartOffset < 0;

  return (
    <div className={styles.chartCard}>
      {/* 제목 */}
      <div className={styles.titleRow}>
        <span className={styles.title}>골드 기록</span>
      </div>

      {/* 기간 세그먼트 (주/월/년/전체) */}
      <div className={styles.seg}>
        {CHART_PERIODS.map(([p, label]) => {
          const on = chartPeriod === p;
          return (
            <button
              key={p}
              className={`${styles.segItem} ${on ? styles.segItemOn : ''}`}
              onClick={() => { setChartPeriod(p); setChartOffset(0); setActiveBar(null); }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 기간 네비 (‹ 기간 ›) + 우측 기간 합계(유통·귀속) */}
      <div className={styles.navRow}>
        <button
          className={styles.navArrow}
          disabled={!canBack}
          onClick={() => { setChartOffset(o => o - 1); setActiveBar(null); }}
        >
          ‹
        </button>
        <span className={styles.navLabel}>{navLabel}</span>
        <button
          className={styles.navArrow}
          disabled={!canForward}
          onClick={() => { setChartOffset(o => Math.min(0, o + 1)); setActiveBar(null); }}
        >
          ›
        </button>
        <span style={{ flex: 1 }} />
        {/* 기간 합계 HERO */}
        <div className={styles.hero}>
          <span className={styles.heroTotal}>{heroTotal.toLocaleString()} G</span>
          <span className={styles.heroSplit}>
            <span className={styles.heroSplitItem}>
              <NextImage src="/gold.webp" alt="유통" width={12} height={12} unoptimized style={{ borderRadius: 2 }} />
              유통 {fmtMan(heroFree)}
            </span>
            <span className={styles.heroSplitItem}>
              <NextImage src="/gold.webp" alt="귀속" width={12} height={12} unoptimized style={{ borderRadius: 2, filter: BOUND_GOLD_FILTER }} />
              귀속 {fmtMan(heroBound)}
            </span>
          </span>
        </div>
      </div>

      {/* 차트: y축 + 플롯 */}
      <div className={styles.plotRow}>
        <div className={styles.yAxis} style={{ height: CHART_PLOT_H + CHART_HEADROOM }}>
          {[niceMax, niceMax / 2, 0].map(v => (
            <span key={v} className={styles.yLabel} style={{ bottom: Math.max(v * scale - 5, 0) }}>
              {fmtMan(v)}
            </span>
          ))}
        </div>
        <div className={styles.plotArea}>
          <div className={styles.plot} style={{ height: CHART_PLOT_H + CHART_HEADROOM }}>
            {/* 눈금선 */}
            {[niceMax, niceMax / 2].map(v => (
              <div key={v} className={styles.gridLine} style={{ bottom: v * scale }} />
            ))}
            {/* 막대 (유통 아래 + 귀속 위, 분리 기록 없는 옛 주는 회색) */}
            <div className={styles.barsRow}>
              {buckets.map((b, i) => {
                const isActive = activeBar === i;
                const dim = activeBar !== null && !isActive;
                let hFree = b.free > 0 ? Math.round(b.free * scale) : 0;
                const hBound = b.bound > 0 ? Math.round(b.bound * scale) : 0;
                let hUnsplit = b.unsplit > 0 ? Math.round(b.unsplit * scale) : 0;
                if (b.total > 0 && hFree + hBound + hUnsplit < 3) {
                  if (hFree > 0 || hBound === 0) hFree = Math.max(hFree, 3);
                  else hUnsplit = Math.max(hUnsplit, 3);
                }
                const hSum = hFree + hBound + hUnsplit;
                const anchor: React.CSSProperties =
                  i <= 1 ? { left: 0 } : i >= n - 2 ? { right: 0 } : { left: '50%', marginLeft: -CHART_TIP_W / 2 };
                return (
                  <button
                    key={b.key}
                    className={styles.barCol}
                    style={{ opacity: dim ? 0.35 : 1, zIndex: isActive ? 8 : undefined }}
                    onClick={() => setActiveBar(isActive ? null : i)}
                  >
                    {hSum > 0 && (
                      <span className={styles.barStack} style={{ width: barW }}>
                        {hUnsplit > 0 && <span style={{ display: 'block', height: hUnsplit, background: CHART_UNSPLIT, opacity: 0.65 }} />}
                        {hBound > 0 && <span style={{ display: 'block', height: hBound, background: CHART_BOUND }} />}
                        {hFree > 0 && <span style={{ display: 'block', height: hFree, background: CHART_FREE }} />}
                      </span>
                    )}
                    {/* 툴팁 */}
                    {isActive && (
                      <span className={styles.tip} style={{ ...anchor, bottom: hSum + 8, width: CHART_TIP_W }}>
                        <span className={styles.tipBox}>
                          <span className={styles.tipDate}>{b.tip}</span>
                          <span className={styles.tipValue}>{b.total.toLocaleString()} G</span>
                          {(b.free > 0 || b.bound > 0) && (
                            <span className={styles.tipSub}>유통 {fmtMan(b.free)} · 귀속 {fmtMan(b.bound)}</span>
                          )}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 평균 점선 + 배지 */}
            {avg > 0 && (
              <>
                <div className={styles.avgLine} style={{ bottom: Math.min(avg * scale, CHART_PLOT_H) }} />
                <div className={styles.avgBadge} style={{ bottom: Math.min(avg * scale, CHART_PLOT_H) + 3 }}>
                  평균 {fmtMan(avg)}
                </div>
              </>
            )}
          </div>
          {/* 베이스라인 */}
          <div className={styles.baseline} />
          {/* x축 라벨 */}
          <div className={styles.xRow}>
            {buckets.map((b, i) => (
              <button
                key={b.key}
                className={styles.xCol}
                onClick={() => setActiveBar(activeBar === i ? null : i)}
              >
                <span
                  className={styles.xLabel}
                  style={{
                    fontWeight: activeBar === i || b.current ? 800 : 600,
                    color: activeBar === i ? ACCENT : b.current ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {b.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {goldRecords.length <= 1 && (
        <p className={styles.emptyHint}>매주 수요일 오전 6시 초기화 때 주간 기록이 쌓입니다</p>
      )}
    </div>
  );
}
