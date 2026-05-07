'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../contest.module.css';

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
  /** 워터마크 표시 여부 (일러스트 true / 사용자 무기 false) */
  showWatermark?: boolean;
};

/** 풀스크린 크게보기 — 자연 비율 + (일러스트면) 워터마크
 *  Portal 로 document.body 에 직접 렌더 → 부모 stacking context / transform 갇힘 회피 */
export default function IllustrationLightbox({
  src,
  alt,
  onClose,
  showWatermark = true,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <div
        className={styles.lightboxImageWrap}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.lightboxImage} />
        {showWatermark && (
          <span className={styles.lightboxWatermark}>© SMILEGATE · 로스트아크 — AI 재가공</span>
        )}
      </div>
      <button
        type="button"
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>,
    document.body,
  );
}
