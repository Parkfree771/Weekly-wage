'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AvatarPost } from '@/types/avatar';
import { getGradeColor, getBackgroundStyle } from '@/types/avatar';
import styles from './AvatarGalleryCard.module.css';

type Props = {
  post: AvatarPost;
};

/** 장착 아바타 중 가장 높은 등급 추출 */
function getHighestGrade(post: AvatarPost): string {
  const gradeOrder = ['에스더', '고대', '유물', '전설', '영웅', '희귀', '고급', '일반'];
  for (const grade of gradeOrder) {
    if (post.avatarItems.some((item) => item.grade === grade && !item.isInner)) {
      return grade;
    }
  }
  return '일반';
}

/** 날짜 포맷 */
function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function AvatarGalleryCard({ post }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const highestGrade = getHighestGrade(post);
  const gradeColor = getGradeColor(highestGrade);

  return (
    <Link href={`/avatar/${post.id}`} className={styles.cardLink}>
      <article className={styles.galleryCard}>
        {/* 이미지 영역 */}
        <div
          className={styles.cardImageWrapper}
          style={post.transparentImageUrl
            ? getBackgroundStyle(post.backgroundId)
            : { backgroundColor: '#2a2035' }
          }
        >
          {(post.transparentImageUrl || post.characterImageUrl) && !imgError && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={post.transparentImageUrl || post.characterImageUrl}
              alt={`${post.characterName} 아바타`}
              className={`${styles.cardImage} ${imgLoaded ? styles.cardImageLoaded : ''}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          )}
          {(imgError || (!post.characterImageUrl && !post.transparentImageUrl)) && (
            <div className={styles.cardImageFallback}>
              <span>{post.characterClass}</span>
            </div>
          )}

        </div>

        {/* 정보 영역 */}
        <div className={styles.cardInfo}>
          <h3 className={styles.cardTitle}>{post.title}</h3>
          <p className={styles.cardMeta}>{post.characterClass}</p>
        </div>
      </article>
    </Link>
  );
}
