'use client';

import { useEffect } from 'react';
import styles from '../contest.module.css';
import type { ContestWeapon } from '@/types/contest';
import WeaponCommentSection from './WeaponCommentSection';

type Props = {
  weapon: ContestWeapon;
  illustrationSlug: string;
  isLiked: boolean;
  isOwner: boolean;
  onClose: () => void;
  onLikeToggle: () => void;
  onDelete: () => void;
  onCommentCountChange?: (delta: number) => void;
};

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${dd}`;
}

export default function WeaponDetailModal({
  weapon,
  illustrationSlug,
  isLiked,
  isOwner,
  onClose,
  onLikeToggle,
  onDelete,
  onCommentCountChange,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.detailOverlay} onClick={onClose}>
      <div
        className={styles.detailCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className={styles.modalCloseFloating}
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>

        <div className={styles.detailGrid}>
          {/* 좌: 이미지 */}
          <div className={styles.detailImageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={weapon.imageUrl} alt={weapon.title || ''} />
          </div>

          {/* 우: 메타 + 댓글 */}
          <div className={styles.detailRight}>
            <div className={styles.detailHead}>
              {weapon.title && (
                <h3 className={styles.detailTitle}>{weapon.title}</h3>
              )}
              <div className={styles.detailMetaRow}>
                <span className={styles.detailAuthor}>{weapon.authorName}</span>
                <span className={styles.detailDate}>
                  {formatDate(weapon.createdAt)}
                </span>
              </div>
              <div className={styles.detailStatRow}>
                <button
                  type="button"
                  className={`${styles.weaponLikeBtn} ${isLiked ? styles.weaponLikeBtnActive : ''}`}
                  onClick={onLikeToggle}
                  aria-label={isLiked ? '좋아요 취소' : '좋아요'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{weapon.likeCount || 0}</span>
                </button>
                <span className={styles.weaponView}>
                  댓글 {weapon.commentCount || 0}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    className={styles.detailDeleteBtn}
                    onClick={onDelete}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            <WeaponCommentSection
              illustrationSlug={illustrationSlug}
              weaponId={weapon.id}
              onCountChange={onCommentCountChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
