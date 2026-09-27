'use client';

import { useState } from 'react';

const MAX_LEN = 500;

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * /contact 페이지 본문 안에 바로 펼쳐진 문의 폼.
 * 푸터 InquiryButton 모달과 같은 백엔드(/api/feedback)·같은 제한(500자, 5분 1회)을 쓴다.
 */
export default function ContactForm() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
        body: JSON.stringify({ message: text, page: '/contact' }),
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

  if (status === 'sent') {
    return (
      <div className="p-3 rounded" style={{ background: 'var(--card-body-bg-blue)' }}>
        <div className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>전송 완료</div>
        <p className="small mb-2" style={{ color: 'var(--text-secondary)' }}>문의 잘 받았습니다. 검토 후 반영할게요.</p>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setStatus('idle')}>
          하나 더 보내기
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="contact-message" className="form-label small fw-semibold">문의 내용</label>
      <textarea
        id="contact-message"
        className="form-control"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={MAX_LEN}
        rows={5}
        placeholder="어느 페이지에서 무엇이 어떻게 다른지 적어주시면 빠르게 확인할 수 있어요"
        disabled={status === 'sending'}
      />
      <div className="d-flex align-items-center justify-content-between mt-2">
        <span className="small text-muted">{message.length}/{MAX_LEN}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={status === 'sending'}>
          {status === 'sending' ? '보내는 중…' : '보내기'}
        </button>
      </div>
      {errorMsg && <div className="small mt-2" style={{ color: '#ef4444' }}>{errorMsg}</div>}
    </div>
  );
}
