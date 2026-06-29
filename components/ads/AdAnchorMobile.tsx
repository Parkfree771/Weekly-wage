'use client';

import { useState } from 'react';
import AdPlaceholder from './AdPlaceholder';

// 모바일 하단 앵커 광고 미리보기 (실제로는 애드센스 자동광고 '앵커' 포맷).
// 화면 하단 고정 + 닫기(X) 가능. 위치/느낌 확인용 placeholder.
export default function AdAnchorMobile() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <AdPlaceholder
        label="광고 영역 · 하단 앵커 (자동광고)"
        sub="모바일 · 화면 하단 고정 · 닫기 가능"
        style={{ minHeight: '60px', height: '60px', borderRadius: 0, borderBottom: 'none' }}
      />
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="광고 닫기"
        style={{
          flexShrink: 0,
          width: '36px',
          border: '1px dashed var(--border-color, #cbd0da)',
          borderLeft: 'none',
          borderBottom: 'none',
          background: 'var(--card-bg, #f5f6f8)',
          color: 'var(--text-primary, #333)',
          fontSize: '1.1rem',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}
