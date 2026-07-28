'use client';

import type { CSSProperties } from 'react';

interface AdPlaceholderProps {
  label: string;
  sub?: string;
  style?: CSSProperties;
  className?: string;
}

// 광고가 들어갈 자리를 시각적으로 보여주는 박스 (실제 광고 아님).
// adConfig.AD_PREVIEW 가 true 일 때만 렌더된다 — 실제 배포 전 배치 확인용.
export default function AdPlaceholder({ label, sub, style, className }: AdPlaceholderProps) {
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
      {sub && (
        <span style={{ fontSize: '0.66rem', opacity: 0.45, wordBreak: 'break-all', lineHeight: 1.35 }}>
          {sub}
        </span>
      )}
    </div>
  );
}
