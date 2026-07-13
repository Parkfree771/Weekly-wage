'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './FeedbackBox.module.css';

const MAX_LEN = 500;

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * 익명 의견 박스.
 * - 메인페이지 등에 슬림한 띠로 노출, 클릭하면 팝업으로 입력.
 * - variant 'sidebar': 앱 다운로드 프로모 레일 밑에 붙는 세로 컴팩트 카드.
 * - 로그인 없이 전송, 현재 페이지 경로를 함께 저장.
 * - 서버에서 IP 해시 기준 5분 쿨다운. 관리자만 /admin/feedback 에서 열람.
 * - 클래스명에 ad/banner 류 단어를 쓰지 않아 애드블록 코스메틱 필터에 걸리지 않음.
 */
export default function FeedbackBox({ variant = 'strip' }: { variant?: 'strip' | 'sidebar' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const openModal = () => setOpen(true);

  const close = () => {
    if (status === 'sending') return;
    setOpen(false);
    // 닫힘 애니메이션 후 상태 초기화
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
        setErrorMsg(
          min > 0
            ? `잠시 후 다시 보내주세요. (약 ${min}분 뒤)`
            : '잠시 후 다시 보내주세요.',
        );
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
      <div
        className={variant === 'sidebar' ? `${styles.strip} ${styles.stripSidebar}` : styles.strip}
        role="button"
        tabIndex={0}
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
      >
        <div className={styles.stripBody}>
          <div className={styles.stripTitle}>의견 보내기</div>
          <div className={styles.stripDesc}>
            건의·수정 의견을 익명으로 남겨주세요.
          </div>
        </div>
        <div className={styles.fakeInput}>
          <span>작성하기</span>
          <span className={styles.arrow} aria-hidden>
            ▾
          </span>
        </div>
      </div>

      {open && (
        <div className={styles.overlay} onClick={close}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="의견 보내기"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={close}
              aria-label="닫기"
            >
              ×
            </button>

            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>의견 보내기</div>
              <div className={styles.modalSub}>
                익명 전송 · 관리자만 열람 · 5분에 1회
              </div>
            </div>

            {status === 'sent' ? (
              <div className={styles.sentBox}>
                <div className={styles.sentTitle}>전송 완료</div>
                <p className={styles.sentText}>
                  의견 잘 받았습니다. 검토 후 반영할게요.
                </p>
                <button type="button" className={styles.primaryBtn} onClick={close}>
                  닫기
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_LEN}
                  placeholder="예) 캐릭터 페이지에 각인 검색 필터가 있으면 좋겠어요!"
                  autoFocus
                  disabled={status === 'sending'}
                />
                <div className={styles.modalFoot}>
                  <span className={styles.counter}>{message.length}/{MAX_LEN}</span>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={submit}
                    disabled={status === 'sending'}
                  >
                    {status === 'sending' ? '보내는 중…' : '보내기'}
                  </button>
                </div>
                {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
