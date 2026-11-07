'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PackagePost } from '@/types/package';
import { toSaleDate } from '@/lib/package-sale';
import styles from './MarketHero.module.css';

/**
 * 홈 맨 위 띠의 아바타 패키지 카드 — 일반 카드(HeroPackageCard)와 같은 크기.
 * 카드 크기(380×153)가 공식 아바타 그림 비율(약 2.5:1)에 맞춰져 있어 그림이 카드 전체에 잘리지 않고 깔린다.
 * 제목·가격·남은 날짜는 그림 아래쪽 어두운 그라데이션 위에 얹는다(머리가 가려지지 않게 아래에만). 누르면 상세(착용샷)로.
 * 효율 계산이 없는 글이라 시세를 받지 않는다.
 */
export default function HeroAvatarCard({ post }: { post: PackagePost }) {
  const img = post.avatarImage;
  // 남은 날짜는 지금 시각에 따라 달라 서버 HTML 과 어긋나지 않게 마운트 뒤에만 계산
  const endMs = toSaleDate(post.saleEndAt)?.getTime() ?? null;
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  useEffect(() => {
    if (endMs === null) return;
    setDaysLeft(Math.max(0, Math.ceil((endMs - Date.now()) / 86_400_000)));
  }, [endMs]);

  return (
    <Link href={`/package/${post.id}`} className={`${styles.pkg} ${styles.avatarCard}`} prefetch={false} title={`${post.title} — 착용샷 보기`}>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.avatarBg} src={img.thumbUrl || img.url} alt="" loading="lazy" decoding="async" />
      )}
      <span className={styles.avatarShade} aria-hidden />
      {/* 배지는 그림 왼쪽 위 모서리 — 아래 글줄은 제목이 폭을 다 쓴다 */}
      <span className={`${styles.pkgBadge} ${styles.pkgBadgeAvatar} ${styles.avatarBadgeCorner}`}>아바타</span>
      {/* 남은 날짜는 오른쪽 위 모서리 — 아래 글줄은 제목 · 가격 한 줄 */}
      {daysLeft !== null && (
        <span className={`${styles.avatarDday} ${styles.avatarDdayCorner} ${daysLeft <= 3 ? styles.avatarDdaySoon : ''}`}>
          {daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
        </span>
      )}
      <span className={styles.avatarOverlay}>
        <span className={styles.avatarInfo}>
          <span className={styles.avatarTitle}>{post.title}</span>
        </span>
        <span className={styles.avatarNumbers}>
          <span className={`font-numeric ${styles.avatarPrice}`}>{(post.royalCrystalPrice || 0).toLocaleString('ko-KR')}원</span>
        </span>
      </span>
    </Link>
  );
}
