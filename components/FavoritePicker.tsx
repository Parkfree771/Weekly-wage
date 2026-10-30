'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getItemsByCategory, TRACKED_ITEMS, type ItemCategory, type TrackedItem } from '@/lib/items-to-track';
import { CATEGORY_STYLES, CATEGORY_ICON, StarIcon, chipIcon } from './ItemSelector';
import { ColoredItemName } from '@/lib/components/ColoredItemName';
import styles from './FavoritePicker.module.css';

const CATEGORY_ORDER: ItemCategory[] = ['refine', 'gem', 'refine_additional', 'engraving', 'accessory', 'bracelet', 'jewel'];
const ITEM_BY_ID = new Map(TRACKED_ITEMS.map((i) => [i.id, i]));

// 검색 — 띄어쓰기 무시, 대소문자 무시
const norm = (v: string) => v.replace(/\s+/g, '').toLowerCase();

/**
 * 즐겨찾기 편집 — 사이드바·탭의 ★ 즐겨찾기 옆 연필, 또는 아이템 줄 끝 "+ 아이템 추가" 로 연다.
 *  · 맨 위 "내 즐겨찾기": 지금 담긴 것. ✕ 로 바로 뺀다.
 *  · 검색 + 카테고리 칩: 원하는 아이템을 빨리 찾는다. 누르면 넣고/빼고(바로 저장).
 *  · "기본값으로": 처음 목록으로 되돌린다.
 * 데스크톱은 가운데 창, 모바일은 아래에서 올라오는 시트.
 */
export default function FavoritePicker({ favorites, onToggle, onReset, onClose }: {
  favorites: string[];
  onToggle: (itemId: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<ItemCategory | 'all'>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  // Esc 로 닫기 · 뒤 페이지 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const favItems = favorites.map((id) => ITEM_BY_ID.get(id)).filter((i): i is TrackedItem => !!i);

  // 아래 목록 — 검색어가 있으면 전체에서 찾고, 없으면 고른 카테고리(전체면 카테고리별 묶음)
  const sections = useMemo(() => {
    const q = norm(query);
    const cats = cat === 'all' ? CATEGORY_ORDER : [cat];
    return cats
      .map((c) => ({
        cat: c,
        items: getItemsByCategory(c).filter((i) => !q || norm(i.name).includes(q)),
      }))
      .filter((s) => s.items.length > 0);
  }, [query, cat]);

  const itemButton = (item: TrackedItem) => {
    const on = favSet.has(item.id);
    const icon = chipIcon(item);
    return (
      <button
        key={item.id}
        type="button"
        className={`${styles.item} ${on ? styles.itemOn : ''}`}
        onClick={() => onToggle(item.id)}
        aria-pressed={on}
      >
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.itemIcon} src={icon} alt="" loading="lazy" decoding="async" />
        )}
        <span className={styles.itemName}><ColoredItemName name={item.name} /></span>
        <span className={styles.itemStar} aria-hidden="true"><StarIcon filled={on} size={16} /></span>
      </button>
    );
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="fav-picker-title">
        <div className={styles.head}>
          <h3 id="fav-picker-title" className={styles.title}>
            <StarIcon filled size={18} />
            즐겨찾기 편집
          </h3>
          <button type="button" className={styles.done} onClick={onClose}>완료</button>
        </div>

        {/* 내 즐겨찾기 — 지금 담긴 것. ✕ 로 바로 뺀다 */}
        <div className={styles.mine}>
          <div className={styles.mineHead}>
            <span>내 즐겨찾기 <b>{favItems.length}</b></span>
            <button type="button" className={styles.reset} onClick={onReset}>기본값으로</button>
          </div>
          {favItems.length === 0 ? (
            <p className={styles.mineEmpty}>아래에서 아이템을 눌러 담아 보세요.</p>
          ) : (
            <div className={styles.mineList}>
              {favItems.map((item) => {
                const icon = chipIcon(item);
                return (
                  <span key={item.id} className={styles.mineChip}>
                    {icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={icon} alt="" decoding="async" />
                    )}
                    <span className={styles.mineName}><ColoredItemName name={item.name} /></span>
                    <button type="button" className={styles.mineRemove} onClick={() => onToggle(item.id)} aria-label={`${item.name} 빼기`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* 찾기 — 검색 + 카테고리 칩 */}
        <div className={styles.finder}>
          <div className={styles.search}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="아이템 이름 검색 (예: 파괴석, 겁화, 아드)"
              aria-label="아이템 이름 검색"
            />
            {query && (
              <button type="button" className={styles.clear} onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="검색어 지우기">✕</button>
            )}
          </div>
          <div className={styles.cats} role="group" aria-label="카테고리">
            {(['all', ...CATEGORY_ORDER] as (ItemCategory | 'all')[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.cat} ${cat === c ? styles.catOn : ''}`}
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
              >
                {c !== 'all' && CATEGORY_ICON[c] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={CATEGORY_ICON[c]} alt="" decoding="async" />
                )}
                {c === 'all' ? '전체' : CATEGORY_STYLES[c].label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          {sections.length === 0 && <p className={styles.noResult}>‘{query}’ 에 맞는 아이템이 없어요.</p>}
          {sections.map((s) => (
            <section key={s.cat} className={styles.section}>
              {(cat === 'all' || query) && <h4 className={styles.sectionTitle}>{CATEGORY_STYLES[s.cat].label}</h4>}
              <div className={styles.grid}>{s.items.map(itemButton)}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
