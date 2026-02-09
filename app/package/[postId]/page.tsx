'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPackagePost,
  incrementPackageViewCount,
  togglePackageLike,
  checkPackageLike,
  deletePackagePost,
} from '@/lib/package-service';
import type { PackagePost, PackageType } from '@/types/package';
import styles from '../package.module.css';

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function getMultiplier(type: PackageType): number {
  if (type === '3+1') return 4 / 3;
  if (type === '2+1') return 3 / 2;
  return 1;
}

function getTypeBadgeClass(type: PackageType): string {
  if (type === '3+1') return styles.typeBadge31;
  if (type === '2+1') return styles.typeBadge21;
  return styles.typeBadgeNormal;
}

/** 묶음 단위 (API 가격 기준) */
const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102007': 100,
  '66102107': 100,
  '66130143': 3000,
};

function getItemPrice(itemId: string, prices: Record<string, number>): number {
  const raw = prices[itemId] || 0;
  const bundle = PRICE_BUNDLE_SIZE[itemId] || 1;
  return raw / bundle;
}

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user } = useAuth();

  const [post, setPost] = useState<PackagePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});

  const isOwner = user && post && user.uid === post.authorUid;

  // 가격 fetch
  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  // 게시물 로딩
  const viewCounted = useRef(false);

  useEffect(() => {
    if (!postId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getPackagePost(postId);
        if (data) {
          setPost(data);
          setLikeCount(data.likeCount || 0);
          if (!viewCounted.current) {
            viewCounted.current = true;
            incrementPackageViewCount(postId).catch(() => {});
          }
        }
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [postId]);

  // 좋아요 상태 확인
  useEffect(() => {
    if (!user || !postId) return;
    checkPackageLike(postId, user.uid).then(setLiked).catch(() => {});
  }, [user, postId]);

  // 좋아요 토글
  const handleLike = async () => {
    if (!user || !postId) return;
    try {
      const nowLiked = await togglePackageLike(postId, user.uid);
      setLiked(nowLiked);
      setLikeCount((prev) => prev + (nowLiked ? 1 : -1));
    } catch (err) {
      console.error('좋아요 실패:', err);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deletePackagePost(postId);
      router.push('/package');
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  if (loading) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.detailWrapper} style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <Spinner animation="border" style={{ color: '#f97316' }} />
        </div>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.detailWrapper}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>게시물을 찾을 수 없습니다</p>
            <Link href="/package" className={styles.backLink}>
              &#8592; 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // 실시간 계산
  const totalGold = post.items.reduce((sum, item) => {
    if (item.goldOverride != null) return sum + item.goldOverride * item.quantity;
    const unitPrice = getItemPrice(item.itemId, latestPrices);
    return sum + unitPrice * item.quantity;
  }, 0);

  const multiplier = getMultiplier(post.packageType);
  const adjustedValue = totalGold * multiplier;
  const efficiency = post.royalCrystalPrice > 0
    ? adjustedValue / post.royalCrystalPrice
    : 0;

  return (
    <Container fluid style={{ maxWidth: '1400px' }}>
      <div className={styles.detailWrapper}>
        <Link href="/package" className={styles.backLink}>
          &#8592; 목록으로 돌아가기
        </Link>

        <div className={styles.detailLayout}>
          {/* 좌측: 패키지 요약 카드 */}
          <div className={styles.summaryCard}>
            {/* 타입 뱃지 */}
            <span className={`${styles.typeBadge} ${getTypeBadgeClass(post.packageType)}`}>
              {post.packageType}
            </span>

            <h1 className={styles.summaryTitle}>{post.title}</h1>

            {post.description && (
              <p className={styles.summaryDescription}>{post.description}</p>
            )}

            {/* 요약 지표 */}
            <div className={styles.summaryMetrics}>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>패키지 가격</span>
                <span className={styles.metricValue}>
                  {formatNumber(post.royalCrystalPrice)}원
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>총 골드 가치</span>
                <span className={styles.metricValue}>
                  {formatNumber(totalGold)} G
                </span>
              </div>
              {post.packageType !== '일반' && (
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>
                    {post.packageType} 보정
                  </span>
                  <span className={styles.metricValue}>
                    {formatNumber(adjustedValue)} G
                  </span>
                </div>
              )}
              <hr className={styles.summaryDivider} />
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>효율</span>
                <span className={styles.metricHighlight}>
                  {formatNumber(efficiency)} G/원
                </span>
              </div>
            </div>

            {/* 작성자 정보 */}
            <div className={styles.authorInfo}>
              {post.authorPhotoURL && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={post.authorPhotoURL}
                  alt={post.authorName}
                  className={styles.authorPhoto}
                />
              )}
              <span>{post.authorName}</span>
              <span style={{ marginLeft: 'auto' }}>{formatDate(post.createdAt)}</span>
            </div>

            {/* 좋아요 · 조회수 | 삭제 */}
            <div className={styles.detailStats}>
              <div className={styles.detailStatsLeft}>
                <button
                  className={`${styles.detailLike} ${liked ? styles.detailLiked : ''}`}
                  onClick={handleLike}
                  disabled={!user}
                  title={user ? '좋아요' : '로그인 후 이용 가능'}
                >
                  {liked ? '\u2764' : '\u2661'} {likeCount}
                </button>
                <span className={styles.viewCount}>
                  {'\uD83D\uDC41'} {post.viewCount || 0}
                </span>
              </div>
              {isOwner && (
                <div className={styles.detailStatsRight}>
                  <button className={styles.deleteBtn} onClick={handleDelete}>
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 우측: 아이템 상세 목록 */}
          <div className={styles.detailContent}>
            <h2 className={styles.sectionTitle}>
              아이템 구성 ({post.items.length}개)
            </h2>
            <div className={styles.itemDetailList}>
              {post.items.map((item, idx) => {
                const price = item.goldOverride != null ? item.goldOverride : getItemPrice(item.itemId, latestPrices);
                const subtotal = price * item.quantity;
                const isFixed = item.goldOverride != null;
                return (
                  <div key={idx} className={styles.itemDetailRow}>
                    {item.icon && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.icon}
                        alt={item.name}
                        className={styles.itemDetailIcon}
                      />
                    )}
                    <div className={styles.itemDetailInfo}>
                      <div className={styles.itemDetailName}>{item.name}</div>
                      <div className={styles.itemDetailMeta}>
                        {isFixed ? `${formatNumber(price)}G (고정)` : `@${formatNumber(price)}G`} x {item.quantity}개
                      </div>
                    </div>
                    <div className={styles.itemDetailSubtotal}>
                      {formatNumber(subtotal)}G
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
