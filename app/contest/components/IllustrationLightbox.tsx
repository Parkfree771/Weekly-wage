'use client';

import { useEffect } from 'react';
import styles from '../contest.module.css';

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

/** 일러스트 풀스크린 크게보기 — 자연 비율 + 워터마크 유지 */
export default function IllustrationLightbox({ src, alt, onClose }: Props) {
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

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <div
        className={styles.lightboxImageWrap}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.lightboxImage} />
        <span className={styles.lightboxWatermark}>© SMILEGATE RPG</span>
      </div>
      <button
        type="button"
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
