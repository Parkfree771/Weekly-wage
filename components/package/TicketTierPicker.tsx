'use client';

// 티켓 층 선택 — 네이티브 <select> 는 항목 안을 꾸밀 수 없어(층·가격 열 정렬 불가) 직접 그린다.
// 알약 버튼을 누르면 포털로 목록을 띄운다. 카드가 overflow 를 자르거나 격자 안에 있어도
// 목록이 잘리지 않게 body 에 fixed 로 붙이고, 열 때 버튼 위치를 재서 화면 아래가 모자라면 위로 편다.
// 스크롤·리사이즈·바깥 클릭·ESC 로 닫는다 (좌표가 어긋난 채 떠 있지 않게).

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './TicketTierPicker.module.css';

type Props = {
  /** 층 라벨 목록 (index = 단계) */
  labels: readonly string[];
  /** 단계별 1장 가치 (골드). 시세 전이면 빈 배열/0 — 가격 열을 비운다 */
  prices: number[];
  value: number;
  onChange: (tier: number) => void;
  /** 버튼에 붙는 짧은 이름 (툴팁·접근성) */
  name: string;
  className?: string;
};

const fmt = (n: number) => Math.floor(n).toLocaleString('ko-KR');
const ROW_H = 32;
const PAD = 8;
const GAP = 4;

export default function TicketTierPicker({ labels, prices, value, onChange, name, className }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const hasPrice = prices.length === labels.length && prices.some((p) => p > 0);

  // 열릴 때 버튼 위치로 목록 좌표 계산 — 아래 공간이 모자라면 위로
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(r.width, hasPrice ? 200 : 132);
    const height = labels.length * ROW_H + PAD * 2;
    const up = r.bottom + GAP + height > vh - PAD && r.top - GAP - height >= PAD;
    const left = Math.min(Math.max(r.left, PAD), Math.max(PAD, vw - width - PAD));
    const top = up ? r.top - GAP - height : r.bottom + GAP;
    setPos({ top, left, width, up });
  }, [open, labels.length, hasPrice]);

  // 바깥 클릭·ESC·스크롤·리사이즈 → 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // 열리면 현재 값 행에 포커스 — 키보드로 위아래 이동 가능
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>('[data-selected="true"]');
    el?.focus();
  }, [open, pos]);

  const pick = (i: number) => {
    onChange(i);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
    items[next]?.focus();
  };

  return (
    <div className={`${styles.wrap} ${className ?? ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        className={`${styles.pill} ${open ? styles.pillOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${name} 층수 선택`}
        title="층마다 지옥 보상 기댓값이 다르다 — 이 티켓을 쓸 층"
      >
        <span className={styles.pillTier}>{labels[value]}층</span>
        {hasPrice && <span className={styles.pillPrice}>{fmt(prices[value])}G</span>}
        <span className={styles.chevron} aria-hidden="true" />
      </button>

      {open && pos && createPortal(
        <div
          ref={listRef}
          className={`${styles.list} ${pos.up ? styles.listUp : ''}`}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          role="listbox"
          aria-label={`${name} 층수`}
          onKeyDown={onListKey}
        >
          <div className={styles.head}>
            <span>층</span>
            {hasPrice && <span>1장 가치</span>}
          </div>
          {labels.map((label, i) => {
            const selected = i === value;
            return (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={selected}
                data-selected={selected ? 'true' : undefined}
                className={`${styles.row} ${selected ? styles.rowOn : ''}`}
                onClick={() => pick(i)}
              >
                <span className={styles.rowTier}>{label}층</span>
                {hasPrice && <span className={styles.rowPrice}>{fmt(prices[i])}G</span>}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
