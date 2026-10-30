'use client';

import type { TrackedItem } from '@/lib/items-to-track';
import { formatShortPrice } from '@/lib/format-price';
import { StarIcon, chipIcon, shortNameOf, type ItemQuote } from './ItemSelector';
import TrendArrow from './TrendArrow';
import styles from './FavoriteTicker.module.css';

const FLAT = 0.1;

/**
 * 모바일 홈 맨 위 — 즐겨찾기 아이템을 예전 "오늘의 시세" 카드처럼 가로로 늘어놓는다.
 * (모바일은 배경 그림 띠를 빼고 이 줄이 그 자리를 맡는다 — 2026-10-30)
 * 카드를 누르면 아래 차트가 그 아이템으로(즐겨찾기 카테고리) 바뀐다. 끝 카드는 편집.
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
      <div className={styles.head}>
        <span className={styles.title}><StarIcon size={15} />즐겨찾기 시세</span>
        <button type="button" className={styles.edit} onClick={onEdit}>편집</button>
      </div>
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
              <span className={styles.name}>{shortNameOf(item)}</span>
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
