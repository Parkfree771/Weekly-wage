'use client';

import type { CSSProperties } from 'react';

interface AdPlaceholderProps {
  label: string;
  sub?: string;
  style?: CSSProperties;
  className?: string;
}

// 광고가 들어갈 자리를 시각적으로 보여주는 박스 (실제 광고 아님).
// 라이트/다크 테마 변수에 맞춰 점선 박스 + 라벨로 표시.
// 임시 위치 표시 숨김: 당분간 전 페이지에서 미리보기 박스를 렌더하지 않음.
// 다시 보이게 하려면 아래 `return null;`을 지우고 주석 처리된 블록을 복원.
export default function AdPlaceholder({ label, sub, style, className }: AdPlaceholderProps) {
  void label; void sub; void style; void className;
  return null;
  /*
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        width: '100%',
        minHeight: '90px',
        padding: '8px',
        textAlign: 'center',
        border: '1px dashed var(--border-color, #cbd0da)',
        borderRadius: '8px',
        background: 'var(--card-bg, #f5f6f8)',
        color: 'var(--text-primary, #333)',
        ...style,
      }}
    >
      <span style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.6 }}>{label}</span>
      {sub && <span style={{ fontSize: '0.68rem', opacity: 0.42 }}>{sub}</span>}
    </div>
  );
  */
}
