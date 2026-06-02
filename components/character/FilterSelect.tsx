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
}

export default function FilterSelect({ value, onChange, groups, placeholder, ariaLabel, minWidth }: Props) {
  const [open, setOpen] = useState(false);
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

  // 선택된 옵션 탐색
  let selected: FilterOption | null = null;
  for (const g of groups) {
    const f = g.options.find(o => o.value === value);
    if (f) { selected = f; break; }
  }

  const choose = (v: string) => { onChange(v); setOpen(false); };

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
          <button
            type="button"
            className={`${styles.option} ${value === '' ? styles.optionActive : ''}`}
            onClick={() => choose('')}
            role="option"
            aria-selected={value === ''}
          >
            {placeholder}
          </button>
          {groups.map((g, gi) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
