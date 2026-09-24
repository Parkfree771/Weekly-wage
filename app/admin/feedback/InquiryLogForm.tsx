'use client';

import { useState } from 'react';
import type { InquiryLogInput } from '@/lib/inquiry-log';

// 공개 처리 내역 한 건 작성·수정 폼 — 문의하기 모달의 "최근 반영된 요청"에 그대로 나간다.

const field: React.CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)',
  color: 'inherit',
  padding: '8px 10px',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

export default function InquiryLogForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: InquiryLogInput;
  /** 실패 시 에러 문구를 돌려준다 */
  onSave: (v: InquiryLogInput) => Promise<string | null>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [v, setV] = useState<InquiryLogInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof InquiryLogInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setError('');
    const err = await onSave(v);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div
      style={{
        marginTop: '10px',
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        background: 'rgba(16, 185, 129, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div>
          <span style={label}>페이지</span>
          <input style={field} value={v.page} onChange={set('page')} />
        </div>
        <div>
          <span style={{ ...label, color: '#3b82f6' }}>요청일</span>
          <input type="date" style={field} value={v.requestedAt} onChange={set('requestedAt')} />
        </div>
        <div>
          <span style={{ ...label, color: '#10b981' }}>처리일</span>
          <input type="date" style={field} value={v.resolvedAt} onChange={set('resolvedAt')} />
        </div>
      </div>
      <div>
        <span style={{ ...label, color: '#3b82f6' }}>Q 익명 — 무엇을 원했는지 한 줄</span>
        <textarea style={{ ...field, resize: 'vertical' }} rows={2} value={v.request} onChange={set('request')} />
      </div>
      <div>
        <span style={{ ...label, color: '#10b981' }}>관리자 — 무엇을 했는지</span>
        <textarea style={{ ...field, resize: 'vertical' }} rows={3} value={v.reply} onChange={set('reply')} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={save}
          disabled={busy}
          style={{
            padding: '6px 16px',
            borderRadius: '7px',
            border: 'none',
            background: '#10b981',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '저장 중…' : '공개 저장'}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: '6px 14px',
            borderRadius: '7px',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'inherit',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          취소
        </button>
        {error && <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>{error}</span>}
        {onDelete && (
          <button
            onClick={async () => {
              if (!window.confirm('공개 목록에서 내릴까요?')) return;
              setBusy(true);
              await onDelete();
              setBusy(false);
            }}
            disabled={busy}
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              borderRadius: '7px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'transparent',
              color: '#ef4444',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            공개 내리기
          </button>
        )}
      </div>
    </div>
  );
}
