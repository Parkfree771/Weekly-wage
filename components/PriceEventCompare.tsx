'use client';

// 특별 이벤트 대비 현재가 — 차트의 특별 이벤트 점(벨가르딘·지평의 성당 …)을 기점으로,
// 그날 가격에서 오늘 현재가까지 얼마나 움직였는지 보여준다.
//
// 차트와 한 몸으로 움직인다.
//  - 위 차트가 보고 있는 아이템을 그대로 따라간다 (PriceContext). 그 재료 그림이 카드마다 들어간다.
//  - 카드를 누르면 위 차트가 그 이벤트 날 → 오늘 구간으로 바뀐다 (setEventRange).
//  - 카드마다 그 구간의 실제 가격 곡선을 그려 숫자와 모양을 같이 읽게 한다.
//    곡선 색은 이벤트 색이 아니라 오름/내림 색으로 통일한다 — 카드끼리 규칙이 같아야 한눈에 비교된다.
//    이벤트 고유색은 이벤트 이름과 선택 표시에만 쓴다.
// 이벤트 목록·색의 원본은 lib/price-events.ts 한 곳.

import { useContext, useMemo } from 'react';
import Image from 'next/image';
import { PriceContext } from './PriceComparisonStats';
import { PRICE_EVENTS, getEventColor, getEventDisplayName } from '@/lib/price-events';
import { ColoredItemName } from '@/lib/components/ColoredItemName';
import TrendArrow from './TrendArrow';
import { useTheme } from './ThemeProvider';
import styles from './PriceEventCompare.module.css';

type PriceEntry = { price: number; timestamp: string; date?: string };

// 이벤트 당일 값이 비어 있을 때 대신 볼 수 있는 최대 거리(일).
// 수집이 하루 빈 날은 바로 옆 날로 메우되, 그보다 멀면 "그때는 데이터가 없다"로 보고 아예 뺀다
// (아이템 추적 시작 전 이벤트가 첫 데이터 값으로 둔갑하는 것을 막는다).
const MAX_GAP_DAYS = 3;

// 미니 차트 좌표계 — 실제 표시 크기는 CSS 가 정하고, SVG 는 이 비율로 늘어난다
const SPARK_W = 100;
const SPARK_H = 32;
const SPARK_PAD = 2.5; // 선 굵기가 위아래로 잘리지 않게
const SPARK_MAX_POINTS = 40;

const dateOf = (e: PriceEntry) => e.date || e.timestamp.slice(0, 10);
const toUTC = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const daysBetween = (a: string, b: string) => Math.abs(toUTC(a) - toUTC(b)) / 86400000;

/** 25.11.07 — 해가 걸쳐 있는 목록이라 연도까지 두 자리로 보여준다 */
const shortDate = (ymd: string) => ymd.slice(2).replace(/-/g, '.');

/**
 * 골드 표기 — "130만" 처럼 줄이지 않고 자릿수를 그대로 보여준다(3,480,312 까지 나온다).
 * 대신 자릿수가 길어지면 카드가 글자 크기를 한 단계 줄여 한 줄에 담는다(.list[data-wide]).
 * 소수점은 값이 작을 때만 — 파편처럼 1골드 미만인 아이템이 0 으로 뭉개지면 안 된다.
 */
const fmtGold = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 100) return Math.round(v).toLocaleString('ko-KR');
  if (a >= 1) return v.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  return v.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
};

const fmtPercent = (v: number): string =>
  `${v > 0 ? '+' : ''}${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)}%`;

type EventRow = {
  date: string;
  name: string;
  color: string;
  then: number;
  diff: number;
  percent: number;
  /** 이벤트 날 → 오늘 구간의 가격 곡선 (SVG 좌표) */
  line: string;
  /** 곡선 아래를 채우는 면 (같은 좌표 + 바닥 닫기) */
  area: string;
};

export default function PriceEventCompare() {
  const { history, selectedItem, eventSelection, toggleEventSelection } = useContext(PriceContext);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { rows, current } = useMemo(() => {
    if (!history || history.length === 0) return { rows: [] as EventRow[], current: 0 };

    // 하루에 여러 번 수집되므로 날짜별 마지막 값만 남긴다 (차트가 점을 찍는 기준과 동일)
    const byDate = new Map<string, number>();
    for (const entry of [...history].sort((a, b) => dateOf(a).localeCompare(dateOf(b)))) {
      byDate.set(dateOf(entry), entry.price);
    }
    const dates = [...byDate.keys()].sort();
    if (dates.length === 0) return { rows: [] as EventRow[], current: 0 };

    const lastDate = dates[dates.length - 1];
    const now = byDate.get(lastDate) ?? 0;
    if (now <= 0) return { rows: [] as EventRow[], current: 0 };

    const priceAt = (target: string): number | null => {
      const exact = byDate.get(target);
      if (exact !== undefined) return exact;
      let best: { date: string; gap: number } | null = null;
      for (const d of dates) {
        const gap = daysBetween(d, target);
        if (gap > MAX_GAP_DAYS) continue;
        if (!best || gap < best.gap) best = { date: d, gap };
      }
      return best ? byDate.get(best.date)! : null;
    };

    /** 이벤트 날 이후 구간을 SVG 좌표 문자열로 (min~max 를 세로로 꽉 채워 모양이 드러나게) */
    const sparkOf = (from: string): { line: string; area: string } => {
      let seg = dates.filter((d) => d >= from).map((d) => byDate.get(d)!);
      if (seg.length < 2) return { line: '', area: '' };
      if (seg.length > SPARK_MAX_POINTS) {
        const step = (seg.length - 1) / (SPARK_MAX_POINTS - 1);
        seg = Array.from({ length: SPARK_MAX_POINTS }, (_, i) => seg[Math.round(i * step)]);
      }
      const min = Math.min(...seg);
      const max = Math.max(...seg);
      const span = max - min || 1;
      const usableH = SPARK_H - SPARK_PAD * 2;
      const pts = seg.map((v, i) => {
        const x = (i / (seg.length - 1)) * SPARK_W;
        const y = SPARK_PAD + (1 - (v - min) / span) * usableH;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      return {
        line: pts.join(' '),
        area: `0,${SPARK_H} ${pts.join(' ')} ${SPARK_W},${SPARK_H}`,
      };
    };

    const built: EventRow[] = [];
    for (const evt of PRICE_EVENTS) {
      if (evt.date > lastDate) continue; // 아직 오지 않은 이벤트
      const then = priceAt(evt.date);
      if (then === null || then <= 0) continue;
      const spark = sparkOf(evt.date);
      built.push({
        date: evt.date,
        name: getEventDisplayName(evt),
        color: getEventColor(evt, isDark),
        then,
        diff: now - then,
        percent: ((now - then) / then) * 100,
        line: spark.line,
        area: spark.area,
      });
    }
    // 최근 이벤트가 먼저 — 지금 관심 있는 건 대개 최신 업데이트다
    built.reverse();
    return { rows: built, current: now };
  }, [history, isDark]);

  if (!selectedItem || rows.length === 0) return null;

  // 카드를 누르면 그 이벤트를 고르고/놓는다.
  //   1개 고름 → 그 날 ~ 오늘 / 2개 고름 → 두 이벤트 사이 / 3개째 → 가장 먼저 고른 게 풀린다.
  // 차트가 화면 밖이면 같이 올려 준다 — 안 그러면 눌러도 아무 일 없는 것처럼 보인다.
  const handlePick = (date: string) => {
    const willSelect = !eventSelection.includes(date);
    toggleEventSelection(date);
    if (!willSelect) return;
    const chart = document.querySelector('.price-chart-card');
    if (!chart) return;
    const top = chart.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.5) {
      chart.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const itemLabel = selectedItem.displayName?.split('\n')[0] || selectedItem.name;

  // 자릿수가 긴 아이템(보석·악세는 300만대까지 간다)은 카드가 글자를 한 단계 줄여 한 줄에 담는다
  const wide =
    Math.max(fmtGold(current).length, ...rows.map((r) => fmtGold(r.then).length)) >= 8;

  return (
    <section className={`${styles.card} shadow-hard`} aria-label="특별 이벤트 대비 현재가">
      <header className={styles.head}>
        <div className={styles.headText}>
          {/* h2 로 두면 페이지 유일한 h1(하단 사이트 소개)보다 DOM 에서 먼저 나와 제목 계층이 어긋난다 */}
          <div className={styles.title}>특별 이벤트 대비 현재가</div>
          <div className={styles.itemName}>
            <ColoredItemName name={itemLabel} />
          </div>
        </div>
        <div className={styles.headNow}>
          <span className={styles.headNowLabel}>현재</span>
          <span className={`${styles.headNowValue} font-numeric`}>{fmtGold(current)} G</span>
        </div>
      </header>

      <ul className={styles.list} data-wide={wide || undefined}>
        {rows.map((row) => {
          const up = row.percent > 0;
          const dir = row.percent > 0 ? 'up' : row.percent < 0 ? 'down' : 'flat';
          const active = eventSelection.includes(row.date);
          return (
            <li key={row.date} className={styles.item}>
              <button
                type="button"
                className={styles.cell}
                data-dir={dir}
                data-active={active || undefined}
                style={{ ['--evt' as string]: row.color }}
                onClick={() => handlePick(row.date)}
                aria-pressed={active}
                title={
                  active
                    ? `${row.name} 선택 해제`
                    : eventSelection.length === 1
                      ? `${row.name} 과(와) 고른 이벤트 사이 구간 보기`
                      : `${row.name} 이후 구간 보기`
                }
              >
                {/* 다중 선택 표시 — 두 개를 고르면 그 사이 구간이 차트에 뜬다.
                    버튼 안이라 진짜 input 은 쓸 수 없다(중첩 불가). 상태는 aria-pressed 가 알린다 */}
                <span className={styles.check} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <polyline points="4 12.5 9.5 18 20 6.5" />
                  </svg>
                </span>
                {/* 지금 보고 있는 재료 그림 — 어느 아이템 이야기인지 카드마다 붙는다 */}
                {selectedItem.icon && (
                  <span className={styles.thumb}>
                    <Image
                      src={selectedItem.icon}
                      alt=""
                      width={72}
                      height={72}
                      className={styles.thumbImg}
                      style={{ borderColor: selectedItem.iconBorderColor || undefined }}
                    />
                  </span>
                )}

                <span className={styles.name}>{row.name}</span>
                <span className={`${styles.date} font-numeric`}>{shortDate(row.date)}</span>

                {/* 그 구간의 실제 가격 곡선 — 오르면 초록·내리면 빨강(카드끼리 같은 규칙),
                    세로는 구간 최저~최고로 꽉 채워 모양이 드러나게 */}
                <span className={styles.spark}>
                  {row.line && (
                    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" aria-hidden="true">
                      <polygon className={styles.sparkArea} points={row.area} />
                      <polyline className={styles.sparkLine} points={row.line} />
                    </svg>
                  )}
                </span>

                {/* 당시 → 현재. 화살표는 글자(›)가 아니라 SVG 다 — 글자는 폰트마다 글리프가 위아래로
                    들쭉날쭉해서 숫자(모노스페이스)와 기준선이 어긋난다. 상자 크기가 고정된 SVG 라야 딱 맞는다 */}
                <span className={styles.compare}>
                  <span className={styles.side}>
                    <span className={styles.sideLabel}>당시</span>
                    <b className={`${styles.sideValue} ${styles.thenValue} font-numeric`}>{fmtGold(row.then)}</b>
                  </span>
                  <svg className={styles.cmpArrow} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12h15M12.5 5.5 19 12l-6.5 6.5" />
                  </svg>
                  <span className={`${styles.side} ${styles.sideNow}`}>
                    <span className={`${styles.sideLabel} ${styles.nowLabel}`}>현재</span>
                    <b className={`${styles.sideValue} ${styles.nowValue} font-numeric`}>{fmtGold(current)}</b>
                  </span>
                </span>

                {/* 차액·변화율은 한 덩어리로 묶어 세 열 전체를 쓴다.
                    따로 두면 변화율이 체크박스와 같은 열에 들어가 그 열을 70px 까지 벌려 놓고,
                    그만큼 이벤트 이름 칸이 줄어 "로아온 썸머" 가 말줄임 됐다. */}
                <span className={styles.foot}>
                  <span className={`${styles.delta} font-numeric`}>
                    {row.diff > 0 ? '+' : row.diff < 0 ? '-' : ''}
                    {fmtGold(Math.abs(row.diff))} G
                  </span>
                  <span className={styles.change}>
                    {dir !== 'flat' && <TrendArrow up={up} size={13} />}
                    <b className={`${styles.percent} font-numeric`}>{fmtPercent(row.percent)}</b>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
