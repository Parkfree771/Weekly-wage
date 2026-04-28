'use client';

import { useEffect, useState } from 'react';
import { LEGACY_SITE_HOST, NEW_SITE_HOST } from '@/lib/site-config';
import styles from './DomainChangeNotice.module.css';

const DISMISS_KEY = 'domainNoticeDismissed:v1';

type Mode = 'pre-cutover' | 'post-cutover' | null;

/**
 * 도메인 변경 안내 배너.
 * - hostname 검사로 구도메인/새도메인에서 다른 메시지
 * - localStorage 로 사용자가 닫으면 기억
 * - SSR 미지원(클라이언트 hostname 필요) — 첫 렌더는 null 반환 후 마운트 후 표시
 */
export default function DomainChangeNotice() {
  const [mode, setMode] = useState<Mode>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.localStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
      return;
    }

    const host = window.location.hostname.replace(/^www\./, '');
    if (host === LEGACY_SITE_HOST) {
      setMode('pre-cutover');
    } else if (host === NEW_SITE_HOST) {
      setMode('post-cutover');
    } else {
      // localhost / 프리뷰 도메인 등 — 표시 안 함
      setMode(null);
    }
  }, []);

  const handleClose = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // private 모드 등 storage 실패 무시
    }
  };

  if (!mode || dismissed) return null;

  const title =
    mode === 'pre-cutover'
      ? '도메인 변경 안내'
      : '도메인이 변경되었습니다';

  return (
    <div className={styles.notice} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden>!</span>
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        <p className={styles.message}>
          <span className={styles.domainOld}>{LEGACY_SITE_HOST}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.domainNew}>{NEW_SITE_HOST}</span>
          {mode === 'pre-cutover'
            ? ' 으로 곧 이전됩니다. 즐겨찾기를 새 주소로 갱신해 주세요.'
            : ' 으로 변경되었습니다. 즐겨찾기 갱신을 부탁드립니다.'}
        </p>
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={handleClose}
        aria-label="안내 닫기"
      >
        ×
      </button>
    </div>
  );
}
