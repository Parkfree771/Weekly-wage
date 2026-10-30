'use client';

import type { TrackedItem } from '@/lib/items-to-track';
import { formatShortPrice } from '@/lib/format-price';
import { chipIcon, tickerNameOf, type ItemQuote } from './ItemSelector';
import { GRADE_CHAR_COLORS } from './PriceItemName';
import TrendArrow from './TrendArrow';
import styles from './FavoriteTicker.module.css';

const FLAT = 0.1;

// 악세 줄임말 끝의 등급 글자(상중·상상)에 색을 입힌다 — 히트맵·시세 표와 같은 팔레트
function CardName({ item }: { item: TrackedItem }) {
  const name = tickerNameOf(item);
  const m = /^auction_(necklace|ring|earring)/.test(item.id) ? name.match(/^(.*?)\s*([상중하]+)$/) : null;
  if (!m) return <>{name}</>;
  return (
    <>
      {m[1]}{' '}
      {m[2].split('').map((ch, i) => <span key={i} style={{ color: GRADE_CHAR_COLORS[ch] }}>{ch}</span>)}
    </>
  );
}

/**
 * 모바일 홈 맨 위 — 즐겨찾기 아이템을 예전 "오늘의 시세" 카드처럼 가로로 늘어놓는다.
 * (모바일은 배경 그림 띠를 빼고 이 줄이 그 자리를 맡는다 — 2026-10-30)
 * 카드를 누르면 아래 차트가 그 아이템으로(즐겨찾기 카테고리) 바뀐다. 끝 카드는 편집.
 * 제목 줄(★ 즐겨찾기 시세 · 편집)은 뺐다 — 카드만 둔다. 편집은 끝의 + 카드로.
 * 이름은 줄임말(파결·상비도스·목걸이 상상 …) — 줄임말이 없는 아이템만 원래 이름을 두 줄까지.
 * loaded 전(서버 HTML·첫 렌더)에는 즐겨찾기를 모르니 같은 높이의 빈 카드로 자리를 지킨다.
 */
export default function FavoriteTicker({ items, quotes, selectedId, loaded, onSelect, onEdit }: {
  items: TrackedItem[];
  quotes: Record<string, ItemQuote>;
  selectedId?: string;
  loaded: boolean;
  onSelect: (item: TrackedItem) => void;
  onEdit: () => void;
}) {
  return (
    <section className={styles.wrap} aria-label="즐겨찾기 시세">
      <div className={styles.row}>
        {!loaded && Array.from({ length: 4 }, (_, i) => <span key={i} className={`${styles.card} ${styles.skeleton}`} aria-hidden="true" />)}
        {loaded && items.map((item) => {
          const q = quotes[item.id];
          const dir = !q ? null : q.change > FLAT ? 'up' : q.change < -FLAT ? 'down' : 'flat';
          const icon = chipIcon(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.card} ${selectedId === item.id ? styles.cardOn : ''}`}
              onClick={() => onSelect(item)}
              aria-pressed={selectedId === item.id}
              title={item.name}
            >
              {icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.icon} src={icon} alt="" decoding="async" />
              )}
              <span className={styles.name}><CardName item={item} /></span>
              <span className={`font-numeric ${styles.price}`}>{q ? formatShortPrice(q.current) : '—'}</span>
              <span className={`font-numeric ${styles.chg} ${dir ? styles[dir] : ''}`}>
                {dir === 'up' || dir === 'down' ? <TrendArrow up={dir === 'up'} size={11} /> : null}
                {q ? `${Math.abs(q.change).toFixed(1)}%` : ''}
              </span>
            </button>
          );
        })}
        {loaded && (
          <button type="button" className={`${styles.card} ${styles.addCard}`} onClick={onEdit}>
            <span className={styles.addPlus} aria-hidden="true">+</span>
            <span className={styles.name}>{items.length === 0 ? '즐겨찾기 추가' : '추가·편집'}</span>
          </button>
        )}
      </div>
    </section>
  );
}
