'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getItemsByCategory, type ItemCategory, type TrackedItem } from '@/lib/items-to-track';
import { PRICE_ITEMS } from '@/data/priceItems';
import { GRADE_CHAR_COLORS } from './PriceItemName';
import { formatShortPrice } from '@/lib/format-price';
import { squarify, type Rect } from '@/lib/treemap';
import { CATEGORY_STYLES, chipIcon, useItemQuotes, type ItemQuote } from './ItemSelector';
import { PriceContext } from './PriceComparisonStats';
import styles from './MarketHeatmap.module.css';

// ── 히트맵에 올릴 종목 ──
// 관심이 몰리는 것만 추린다. 재련 추가 재료·팔찌는 통째로 빼고, 나머지도 많이 보는 종목만 남긴다.
// (빠진 종목도 위 시세 차트에서는 그대로 볼 수 있다 — 히트맵은 한눈에 흐름을 보는 자리라 칸 수를 줄인다)
const CATEGORIES: ItemCategory[] = ['refine', 'gem', 'engraving', 'accessory', 'jewel'];
// 카테고리에서 뺄 종목 — 재련: 일반 재련 재료(계승 이전)·아비도스·운명의 파편
const EXCLUDE = new Set([
  '66102006', // 운명의 파괴석
  '66102106', // 운명의 수호석
  '66110225', // 운명의 돌파석
  '6861012',  // 아비도스 융화 재료
  '66130143', // 운명의 파편 주머니(대)
]);
// 이 카테고리는 여기 적힌 종목만 — 유물 각인서는 대표 딜 각인 넷
const ONLY: Partial<Record<ItemCategory, string[]>> = {
  engraving: [
    '65201005', // 예리한 둔기
    '65203905', // 아드레날린
    '65203305', // 돌격대장
    '65200505', // 원한
  ],
};
const itemsOf = (cat: ItemCategory) => {
  const only = ONLY[cat];
  return getItemsByCategory(cat).filter((i) => (only ? only.includes(i.id) : !EXCLUDE.has(i.id)));
};
const ALL_ITEMS: TrackedItem[] = CATEGORIES.flatMap(itemsOf);

// 칸 이름 — 시세 표시 목록의 줄임말(파결·수결·10겁화 …)이 있으면 그걸, 없으면 원래 이름.
// 젬은 "질서의 젬 : 안정" 이 칸에서 잘려서 콜론 뒤 이름만(안정·견고·불변·침식·왜곡·붕괴 — 서로 겹치지 않는다).
const SHORT_NAME = new Map(PRICE_ITEMS.map((p) => [p.id, p.shortName]));
const tileName = (item: TrackedItem) => {
  const gem = item.name.match(/^(?:질서|혼돈)의 젬\s*:\s*(.+)$/);
  if (gem) return gem[1];
  return SHORT_NAME.get(item.id) ?? item.name;
};

// 악세는 아이콘이 같아(목걸이·반지·귀걸이) 상중/상상을 글자로 가른다 — 줄임말 끝의 등급 글자에 색을 입힌다.
// 색은 다른 화면과 같은 팔레트(PriceItemName: 상 금색 · 중 보라). 칸 바탕이 빨강/초록이라 글자 뒤에 어두운 받침을 깐다.
const isAccessory = (item: TrackedItem) => /^auction_(necklace|ring|earring)/.test(item.id);
function TileName({ item, gradeOnly }: { item: TrackedItem; gradeOnly?: boolean }) {
  const name = tileName(item);
  const m = isAccessory(item) ? name.match(/^(.*?)\s*([상중하]+)$/) : null;
  if (!m) return <>{name}</>;
  return (
    <>
      {!gradeOnly && <>{m[1]} </>}
      <span className={styles.grade}>
        {m[2].split('').map((ch, i) => (
          <span key={i} style={{ color: GRADE_CHAR_COLORS[ch] }}>{ch}</span>
        ))}
      </span>
    </>
  );
}

// ── 칸 넓이 = 관심도 ──
// 주식 히트맵의 시가총액 자리. 거래량 데이터가 없어 "사람들이 많이 보는 것일수록 크게"를 직접 정한다.
// 가격 합으로 나누면 종목 수가 많은 재련 추가 재료(22종)가 가장 크게 잡혀, 정작 많이 보는 재련 재료·보석·
// 유물 각인서가 묻혔다. 그래서 카테고리 면적은 고정 비율로 나눈다(합이 100일 필요는 없다 — 비율만 본다).
const CATEGORY_SHARE: Partial<Record<ItemCategory, number>> = {
  refine: 30,
  jewel: 24,
  engraving: 22,
  gem: 12,
  accessory: 12,
};
const shareOf = (cat: ItemCategory) => CATEGORY_SHARE[cat] ?? 0;

// 카테고리 안에서는 가격대(로그)로 나누되, 많이 보는 종목은 배수를 더 준다.
// 로그라서 비싼 것과 싼 것이 몇 배 이상 벌어지지 않는다(그대로 쓰면 비싼 것만 보인다).
const ITEM_BOOST: Record<string, number> = {
  '66102007': 3,   // 운명의 파괴석 결정
  '66102107': 3,   // 운명의 수호석 결정
  '66110226': 3,   // 위대한 운명의 돌파석 — 개당 20골드대라 로그 가격이 작아 2배로는 칸이 너무 작아 이름이 잘렸다
  '6861013': 2,    // 상급 아비도스 융화 재료
  auction_gem_fear_10: 2.5,
  auction_gem_flame_10: 2.5,
  auction_gem_fear_9: 1.6,
  auction_gem_fear_8: 1.6, // 8겁화 — 배수가 없던 유일한 보석이라 칸이 작아 이름이 잘렸다
};
const weightOf = (item: TrackedItem, price: number) =>
  Math.max(Math.log10(Math.max(price, 1)) + 1, 0.6) * (ITEM_BOOST[item.id] ?? 1);

// 색 — 보합 회색에서 ±HEAT_CAP% 로 갈수록 짙은 초록/빨강 (주식 히트맵와 같은 규칙: 상승 초록 · 하락 빨강)
const FLAT = 0.1;
const HEAT_CAP = 5;
const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const UP_FROM = [99, 190, 133];   // 옅은 초록
const UP_TO = [20, 104, 58];      // 짙은 초록
const DOWN_FROM = [246, 128, 128]; // 옅은 빨강
const DOWN_TO = [139, 28, 28];     // 짙은 빨강
const heatColor = (change: number) => {
  if (Math.abs(change) < FLAT) return 'rgb(150, 158, 170)';
  const t = Math.min(Math.abs(change) / HEAT_CAP, 1);
  const [r, g, b] = change > 0 ? lerp(UP_FROM, UP_TO, t) : lerp(DOWN_FROM, DOWN_TO, t);
  return `rgb(${r}, ${g}, ${b})`;
};
const signed = (n: number) => `${n >= FLAT ? '+' : n <= -FLAT ? '−' : ''}${Math.abs(n).toFixed(2)}%`;

const HEADER = 22; // 카테고리 머리줄 높이(px)
const GAP = 2;     // 카테고리 사이 틈(px)

type Tile = { item: TrackedItem; q: ItemQuote; rect: Rect };
type Group = { cat: ItemCategory; avg: number; rect: Rect; tiles: Tile[] };

// 폭에 맞춘 히트맵 높이 — 넓으면 가로로 길게, 좁으면(모바일) 세로로 길게
const heightFor = (w: number) => (w >= 900 ? Math.round(w * 0.5) : w >= 600 ? Math.round(w * 0.72) : Math.round(w * 1.25));

/**
 * 홈 시세 히트맵 — 주식 히트맵처럼 카테고리(섹터)별로 묶어 종목을 사각형으로 깔고, 등락을 색으로 칠한다.
 * 칸을 누르면 위 시세 차트가 그 아이템으로 바뀌고 차트로 스크롤한다.
 * 시세는 홈 서버(ISR)가 넘긴 값으로 첫 HTML 부터 그린다. 폭은 서버에서 모르니 1000px 로 가정하고
 * 마운트 뒤 실제 폭으로 다시 나눈다(첫 그림과 크게 다르지 않게 높이 비율을 폭 구간별로 고정).
 */
export default function MarketHeatmap({ initialQuotes, asOf }: {
  initialQuotes?: Record<string, ItemQuote>;
  asOf?: string;
}) {
  const { selectItemById } = useContext(PriceContext);
  const quotes = useItemQuotes(ALL_ITEMS, initialQuotes);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = heightFor(width);

  const { groups, up, down, total } = useMemo(() => {
    const raw = CATEGORIES.map((cat) => {
      const rows = itemsOf(cat)
        .map((item) => ({ item, q: quotes[item.id] }))
        .filter((r): r is { item: TrackedItem; q: ItemQuote } => !!r.q && r.q.current > 0)
        .map((r) => ({ ...r, w: weightOf(r.item, r.q.current) }))
        .sort((a, b) => b.w - a.w);
      const avg = rows.length ? rows.reduce((a, r) => a + r.q.change, 0) / rows.length : 0;
      return { cat, rows, avg };
    }).filter((g) => g.rows.length > 0).sort((a, b) => shareOf(b.cat) - shareOf(a.cat));

    // 큰 카테고리부터 왼쪽 위 — 재련 재료가 첫눈에 들어온다
    const outer = squarify(raw.map((g) => shareOf(g.cat)), { x: 0, y: 0, w: width, h: height });
    const groups: Group[] = raw.map((g, gi) => {
      const o = outer[gi];
      // 카테고리끼리 GAP 만큼 띄우고 위쪽 HEADER 는 이름 줄
      const box = { x: o.x + GAP / 2, y: o.y + GAP / 2, w: Math.max(o.w - GAP, 0), h: Math.max(o.h - GAP, 0) };
      const body = { x: box.x, y: box.y + HEADER, w: box.w, h: Math.max(box.h - HEADER, 0) };
      const inner = squarify(g.rows.map((r) => r.w), body);
      return { cat: g.cat, avg: g.avg, rect: box, tiles: g.rows.map((r, i) => ({ item: r.item, q: r.q, rect: inner[i] })) };
    });
    const all = raw.flatMap((g) => g.rows);
    return {
      groups,
      up: all.filter((r) => r.q.change >= FLAT).length,
      down: all.filter((r) => r.q.change <= -FLAT).length,
      total: all.length,
    };
  }, [quotes, width, height]);

  const pick = (itemId: string) => {
    selectItemById(itemId);
    // 바뀐 차트가 보이게 — 시세 차트 영역으로 올라간다
    document.querySelector('.price-chart-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (total === 0) return null;

  return (
    <section className={styles.card} aria-labelledby="market-heatmap-title">
      <div className={styles.head}>
        <div>
          <h2 id="market-heatmap-title" className={styles.title}>시세 히트맵</h2>
          <p className={styles.sub}>
            {asOf ? `${asOf} · ` : ''}전일 대비 · {total}종목 · 색은 등락
          </p>
        </div>
        <div className={styles.summary}>
          <span className={`font-numeric ${styles.sumUp}`}>▲ {up}</span>
          <span className={`font-numeric ${styles.sumDown}`}>▼ {down}</span>
          <span className={styles.legend} aria-hidden="true">
            <span className="font-numeric">−{HEAT_CAP}%</span>
            <span className={styles.legendBar} />
            <span className="font-numeric">+{HEAT_CAP}%</span>
          </span>
        </div>
      </div>

      <div ref={boxRef} className={styles.map} style={{ height }}>
        {groups.map((g) => (
          <div
            key={g.cat}
            className={styles.group}
            style={{ left: g.rect.x, top: g.rect.y, width: g.rect.w, height: g.rect.h }}
          >
            <div className={styles.groupHead} style={{ height: HEADER }}>
              <span className={styles.groupName}>{CATEGORY_STYLES[g.cat].label}</span>
              <span className={`font-numeric ${styles.groupAvg}`}>{signed(g.avg)}</span>
            </div>
          </div>
        ))}
        {groups.flatMap((g) => g.tiles.map(({ item, q, rect }) => {
          const minSide = Math.min(rect.w, rect.h);
          // 칸 크기에 따라 보여 줄 것을 줄인다 — 큰 칸: 아이콘·이름·등락·가격 / 중간: 아이콘·등락 / 작은 칸: 아이콘만
          const size = minSide >= 110 && rect.w >= 120 ? 'xl' : minSide >= 64 && rect.w >= 76 ? 'lg' : minSide >= 40 ? 'md' : 'sm';
          const icon = chipIcon(item);
          // 글자 크기 — 짧은 변 기준에 더해, 이름(글자 수 × 0.82em)이 칸 폭 안에 들어오는 크기를 넘지 않게.
          // 폭이 좁은 칸에서 이름이 잘리던 문제(위운돌·8겁화). 아이콘(2.2em)도 같은 크기를 따라 줄어든다.
          const nameLen = Math.max(tileName(item).length, 3);
          const fitByWidth = (rect.w - 10) / (nameLen * 0.82);
          const fontSize = Math.max(9, Math.min(minSide / 5.5, fitByWidth, 22));
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.tile} ${styles[size]}`}
              style={{
                left: rect.x, top: rect.y, width: rect.w, height: rect.h,
                background: heatColor(q.change),
                fontSize,
              }}
              onClick={() => pick(item.id)}
              title={`${item.name}\n${formatShortPrice(q.current)}골드 · ${signed(q.change)}`}
              aria-label={`${item.name} ${signed(q.change)}`}
            >
              {icon && size !== 'sm' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className={styles.icon} loading="lazy" decoding="async" />
              )}
              {(size === 'xl' || size === 'lg') && <span className={styles.name}><TileName item={item} /></span>}
              {/* 중간 칸은 이름을 빼지만 악세는 등급 글자만은 남긴다 — 아이콘으로는 상중/상상이 안 갈린다 */}
              {size === 'md' && isAccessory(item) && <span className={styles.name}><TileName item={item} gradeOnly /></span>}
              {size !== 'sm' && <span className={`font-numeric ${styles.chg}`}>{signed(q.change)}</span>}
              {size === 'xl' && <span className={`font-numeric ${styles.price}`}>{formatShortPrice(q.current)}G</span>}
              {size === 'sm' && icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className={styles.iconSm} loading="lazy" decoding="async" />
              )}
            </button>
          );
        }))}
      </div>
    </section>
  );
}
