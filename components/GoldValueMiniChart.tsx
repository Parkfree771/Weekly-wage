'use client';

import { useState, ReactNode } from 'react';
import { GOLD_VALUE_POINTS } from '@/lib/gold-value';

// 골드 가치 변화 추세 미니 차트 — 왼쪽 바 "골드 가치 변화" 버튼에 마우스를 올리면 뜬다.
// 점 몇 개뿐이라 Recharts 대신 SVG 로 직접 그린다. 값은 lib/gold-value.ts 한 곳에서 온다.

const W = 280;
const H = 150;
const PAD = { top: 22, right: 22, bottom: 26, left: 22 };

const DAY_MS = 86400000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

export default function GoldValueMiniChart({ color }: { color: string }) {
  const days = GOLD_VALUE_POINTS.map(p => toDay(p.date));
  const values = GOLD_VALUE_POINTS.map(p => p.wonPer100);
  const minDay = days[0];
  const maxDay = days[days.length - 1];
  const maxValue = Math.max(...values);

  const x = (day: number) => PAD.left + ((day - minDay) / (maxDay - minDay || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / maxValue) * (H - PAD.top - PAD.bottom);

  const points = GOLD_VALUE_POINTS.map((p, i) => ({ cx: x(days[i]), cy: y(p.wonPer100), p }));
  const path = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.cx},${pt.cy}`).join(' ');

  return (
    <div>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
        골드 가치 변화
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
        100골드당 원화 (추세용, 정확한 값 아님)
      </div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <line
          x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="var(--border-color)" strokeWidth={1}
        />
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {points.map(({ cx, cy, p }) => (
          <g key={p.date}>
            <circle cx={cx} cy={cy} r={3.5} fill={color} />
            <text x={cx} y={cy - 7} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--text-secondary)">
              100:{p.wonPer100}
            </text>
            <text x={cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {p.date.slice(2, 7).replace('-', '.')}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** 감싼 버튼에 마우스를 올리면 오른쪽에 미니 차트를 띄운다 (왼쪽 바 → 차트 쪽으로 뜬다) */
export function GoldValueHover({ color, children }: { color: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div style={{
          position: 'absolute',
          left: 'calc(100% + 26px)',
          bottom: 0,
          zIndex: 100,
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px 14px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          <GoldValueMiniChart color={color} />
        </div>
      )}
    </div>
  );
}
