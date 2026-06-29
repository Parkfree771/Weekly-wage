'use client';

import { useState } from 'react';
import { TIER_CLASSES } from '@/lib/tier-data';
import { ENGRAVING_BUILDS } from '@/lib/engraving-builds.generated';
import styles from './EngravingCorrectionBox.module.css';

// 서버(/api/feedback)는 message 최대 500자. "[각인정정] 직업: OOO\n" 접두가 붙으므로
// 본문은 여유 있게 440자로 제한.
const BODY_MAX = 440;

type Status = 'idle' | 'sending' | 'sent' | 'error';

// 각인 페이지에 실제로 노출되는 직업과 동일한 목록 (빌드 있는 스펙, 가나다순)
const JOBS = TIER_CLASSES
  .filter((c) => ENGRAVING_BUILDS[c.id])
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

/**
 * 각인 정정 요청 박스 (뉴비 추천 사이드바 하단).
 * - 로그인 없이 익명 전송. 기존 문의하기와 동일하게 /api/feedback 로 POST.
 * - 메시지에 [각인정정] + 직업 태그를 붙여 관리자 의견함에서 일반 문의와 구분.
 * - 서버에서 IP 해시 기준 5분 쿨다운 적용(문의하기와 공유).
 */
export default function EngravingCorrectionBox() {
  const [job, setJob] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async () => {
    const body = text.trim();
    if (body.length < 2) {
      setErrorMsg('정정 내용을 입력해 주세요.');
      return;
    }
    setStatus('sending');
    setErrorMsg('');

    const jobLabel = job || '(직업 미선택)';
    const message = `[각인정정] 직업: ${jobLabel}\n${body}`.slice(0, 500);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, page: '/engraving' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('sent');
        setText('');
        setJob('');
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
    <div className={styles.box}>
      <div className={styles.head}>
        <span className={styles.title}>정정요청 정보</span>
      </div>
      <div className={styles.sub}>로그인 없이 제보 · 관리자만 확인</div>

      {status === 'sent' ? (
        <div className={styles.sentBox}>
          <div className={styles.sentTitle}>제보 완료</div>
          <p className={styles.sentText}>확인 후 반영할게요. 감사합니다!</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setStatus('idle')}
          >
            새 제보 작성
          </button>
        </div>
      ) : (
        <>
          <select
            className={styles.select}
            value={job}
            onChange={(e) => setJob(e.target.value)}
            disabled={status === 'sending'}
            aria-label="직업 선택"
          >
            <option value="">직업 선택 (선택 안 해도 됨)</option>
            {JOBS.map((j) => (
              <option key={j.id} value={j.name}>
                {j.name}
              </option>
            ))}
          </select>

          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={BODY_MAX}
            placeholder="예) 분노의망치 빼고 결투의대가 씁니다"
            disabled={status === 'sending'}
          />

          <div className={styles.foot}>
            <span className={styles.counter}>
              {text.length}/{BODY_MAX}
            </span>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={submit}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? '보내는 중…' : '제보 보내기'}
            </button>
          </div>

          {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
        </>
      )}
    </div>
  );
}
