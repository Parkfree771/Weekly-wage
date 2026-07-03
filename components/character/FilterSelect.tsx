'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './FilterSelect.module.css';

export interface FilterOption {
  value: string;
  label: string;
  /** 옵션/트리거에 렌더할 커스텀 노드(아이콘 등). 없으면 label 텍스트 */
  node?: ReactNode;
}

export interface FilterGroup {
  label?: string;
  options: FilterOption[];
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  groups: FilterGroup[];
  /** value='' 일 때 표시 + 목록 최상단 "전체" 옵션 라벨 */
  placeholder: string;
  ariaLabel: string;
  /** 트리거 최소 너비(px). 미지정 시 기본 160 */
  minWidth?: number;
  /** 패널 상단에 검색 입력 표시 */
  searchable?: boolean;
  /** 검색 대상 문자열 (value → 별칭 포함 텍스트). 없으면 label로 매칭 */
  searchTexts?: Record<string, string>;
  /** 검색어가 있을 때만 노출되는 그룹 (예: "직업 전체" 옵션들) — 일반 그룹보다 위에 표시 */
  searchOnlyGroups?: FilterGroup[];
  searchPlaceholder?: string;
}

export default function FilterSelect({
  value, onChange, groups, placeholder, ariaLabel, minWidth,
  searchable, searchTexts, searchOnlyGroups, searchPlaceholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // 닫힐 때 검색어 초기화
  useEffect(() => { if (!open) setTerm(''); }, [open]);

  // 선택된 옵션 탐색 (검색 전용 그룹 포함)
  let selected: FilterOption | null = null;
  for (const g of [...(searchOnlyGroups ?? []), ...groups]) {
    const f = g.options.find(o => o.value === value);
    if (f) { selected = f; break; }
  }

  const choose = (v: string) => { onChange(v); setOpen(false); };

  // 검색어 매칭: searchTexts의 별칭 문자열(없으면 label) 부분일치
  const t = term.trim();
  const matches = (o: FilterOption) => !t || (searchTexts?.[o.value] ?? o.label).includes(t);
  const filterGroups = (gs: FilterGroup[]) =>
    gs.map(g => ({ ...g, options: g.options.filter(matches) })).filter(g => g.options.length > 0);

  const shownSearchOnly = t ? filterGroups(searchOnlyGroups ?? []) : [];
  const shownGroups = filterGroups(groups);
  const isEmpty = shownSearchOnly.length === 0 && shownGroups.length === 0;

  const renderGroup = (g: FilterGroup, gi: number | string) => (
    <div key={g.label ?? gi} className={styles.group}>
      {g.label && <div className={styles.groupLabel}>{g.label}</div>}
      {g.options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`${styles.option} ${value === o.value ? styles.optionActive : ''}`}
          onClick={() => choose(o.value)}
          role="option"
          aria-selected={value === o.value}
        >
          {o.node ?? o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={styles.wrap}
      ref={wrapRef}
      style={minWidth ? ({ ['--fs-min-w']: `${minWidth}px` } as CSSProperties) : undefined}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.triggerLabel}>
          {selected ? (selected.node ?? selected.label) : <span className={styles.placeholder}>{placeholder}</span>}
        </span>
        <span className={styles.caret} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel} role="listbox" aria-label={ariaLabel}>
          {searchable && (
            <div className={styles.searchBox}>
              <input
                type="text"
                className={styles.searchInput}
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder={searchPlaceholder || '검색'}
                aria-label={`${ariaLabel} 검색`}
                autoFocus
              />
            </div>
          )}
          {!t && (
            <button
              type="button"
              className={`${styles.option} ${value === '' ? styles.optionActive : ''}`}
              onClick={() => choose('')}
              role="option"
              aria-selected={value === ''}
            >
              {placeholder}
            </button>
          )}
          {shownSearchOnly.map((g, gi) => renderGroup(g, `s${gi}`))}
          {shownGroups.map((g, gi) => renderGroup(g, gi))}
          {t && isEmpty && <div className={styles.searchEmpty}>검색 결과가 없습니다</div>}
        </div>
      )}
    </div>
  );
}
