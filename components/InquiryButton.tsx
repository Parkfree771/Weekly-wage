'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

const MAX_LEN = 500;

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * 문의하기 트리거 — children을 그대로 버튼으로 렌더링하고, 클릭하면 문의 작성 모달을 띄운다.
 * 익명 전송, /api/feedback(관리자 의견함, Firestore)로 저장 — 예전 FeedbackBox와 동일 백엔드.
 * 네비게이션 아이콘·푸터 링크·로그인 드롭다운 등 여러 곳에서 트리거 모양만 다르게 재사용.
 */
export default function InquiryButton({
  children,
  className,
  ariaLabel = '문의하기',
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const close = () => {
    if (status === 'sending') return;
    setOpen(false);
    window.setTimeout(() => {
      setStatus('idle');
      setMessage('');
      setErrorMsg('');
    }, 200);
  };

  const submit = async () => {
    const text = message.trim();
    if (text.length < 2) {
      setErrorMsg('내용을 조금만 더 적어주세요.');
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, page: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('sent');
        setMessage('');
      } else if (res.status === 429) {
        setStatus('error');
        const min = data.retryAfterSec ? Math.ceil(data.retryAfterSec / 60) : 0;
        setErrorMsg(min > 0 ? `잠시 후 다시 보내주세요. (약 ${min}분 뒤)` : '잠시 후 다시 보내주세요.');
      } else {
        setStatus('error');
        setErrorMsg(data.message || '전송에 실패했어요.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('네트워크 오류가 발생했어요.');
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="문의하기"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px',
              background: 'var(--card-bg)', borderRadius: '14px',
              padding: '20px', position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              style={{
                position: 'absolute', top: '10px', right: '12px',
                background: 'none', border: 'none', fontSize: '22px',
                color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1,
              }}
            >
              ×
            </button>

            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              문의하기
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              익명 전송 · 관리자만 열람 · 5분에 1회
            </div>

            {status === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>전송 완료</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  문의 잘 받았습니다. 검토 후 반영할게요.
                </p>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    background: 'var(--color-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_LEN}
                  placeholder="문의하실 내용을 적어주세요"
                  autoFocus
                  disabled={status === 'sending'}
                  style={{
                    width: '100%', minHeight: '110px', resize: 'vertical',
                    padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'var(--input-bg)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{message.length}/{MAX_LEN}</span>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={status === 'sending'}
                    style={{
                      padding: '8px 20px', borderRadius: '8px', border: 'none',
                      background: 'var(--color-primary)', color: '#fff', fontWeight: 700,
                      cursor: status === 'sending' ? 'default' : 'pointer',
                      opacity: status === 'sending' ? 0.7 : 1,
                    }}
                  >
                    {status === 'sending' ? '보내는 중…' : '보내기'}
                  </button>
                </div>
                {errorMsg && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '8px' }}>{errorMsg}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
