'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from '../contest.module.css';
import type { ContestIllustration } from '@/types/contest';
import { useAuth } from '@/contexts/AuthContext';
import { toggleIllustLike } from '@/lib/contest-supabase';
import { getWeaponCount } from '@/lib/contest-service';
import WeaponGalleryModal from './WeaponGalleryModal';
import IllustrationLightbox from './IllustrationLightbox';

type Props = {
  illustration: ContestIllustration;
  initialLikeCount: number;
  initialLiked: boolean;
  onLikeChange?: (slug: string, liked: boolean, newCount: number) => void;
};

export default function IllustrationCard({
  illustration,
  initialLikeCount,
  initialLiked,
  onLikeChange,
}: Props) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);
  const [weaponCount, setWeaponCount] = useState<number>(0);
  const [showWeapons, setShowWeapons] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // 부모에서 새 카운트 내려오면 sync (visibilitychange 등으로 갱신될 때)
  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    if (illustration.comingSoon) return;
    (async () => {
      try {
        const c = await getWeaponCount(illustration.slug);
        setWeaponCount(c);
      } catch (err) {
        console.error('무기 카운트 조회 실패:', err);
      }
    })();
  }, [illustration.slug, illustration.comingSoon]);

  if (illustration.comingSoon) {
    return (
      <div className={styles.illustCardEmpty}>
        <span className={styles.illustCardEmptyIcon}>?</span>
        <span className={styles.illustCardEmptyText}>Coming Soon</span>
      </div>
    );
  }

  const handleLike = async () => {
    if (!user) {
      alert('좋아요는 로그인 후 이용 가능합니다.');
      return;
    }
    if (busy) return;

    // 옵티미스틱 — UI 즉시 반영
    const prevLiked = liked;
    const prevCount = likeCount;
    const optimisticLiked = !prevLiked;
    const optimisticCount = optimisticLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
    setLiked(optimisticLiked);
    setLikeCount(optimisticCount);
    onLikeChange?.(illustration.slug, optimisticLiked, optimisticCount);

    setBusy(true);
    try {
      const nowLiked = await toggleIllustLike(illustration.slug, user.uid, prevLiked);
      // 서버 결과와 옵티미스틱 일치 여부 확인 (보정)
      if (nowLiked !== optimisticLiked) {
        const correctedCount = nowLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
        setLiked(nowLiked);
        setLikeCount(correctedCount);
        onLikeChange?.(illustration.slug, nowLiked, correctedCount);
      }
    } catch (err) {
      // 롤백
      console.error('좋아요 실패:', err);
      setLiked(prevLiked);
      setLikeCount(prevCount);
      onLikeChange?.(illustration.slug, prevLiked, prevCount);
      alert('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.illustCard}>
        <button
          type="button"
          className={styles.illustImageWrap}
          onClick={() => setShowLightbox(true)}
          aria-label={`${illustration.name} 크게 보기`}
        >
          <Image
            src={illustration.imageSrc}
            alt={illustration.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 660px"
            priority={false}
          />
          <span className={styles.illustWatermark}>© SMILEGATE RPG</span>
        </button>
        <div className={styles.illustActions}>
          <button
            type="button"
            className={`${styles.likeButton} ${liked ? styles.likeButtonActive : ''}`}
            onClick={handleLike}
            disabled={busy}
            aria-label={liked ? '좋아요 취소' : '좋아요'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{likeCount.toLocaleString()}</span>
          </button>
          <button
            type="button"
            className={styles.weaponButton}
            onClick={() => setShowWeapons(true)}
          >
            <span>어울리는 무기 아바타</span>
            <span className={styles.weaponBadge}>{weaponCount}</span>
          </button>
        </div>
      </div>

      {showWeapons && (
        <WeaponGalleryModal
          illustrationSlug={illustration.slug}
          illustrationImageSrc={illustration.imageSrc}
          onClose={() => setShowWeapons(false)}
          onCountChange={(delta) => setWeaponCount((c) => Math.max(0, c + delta))}
        />
      )}

      {showLightbox && (
        <IllustrationLightbox
          src={illustration.imageSrc}
          alt={illustration.name}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
