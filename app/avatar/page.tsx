'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import AvatarGalleryCard from '@/components/avatar/AvatarGalleryCard';
import { getAvatarPosts } from '@/lib/avatar-service';
import { useAuth } from '@/contexts/AuthContext';
import type { AvatarPost, AvatarSortBy } from '@/types/avatar';
import { CLASS_GROUPS } from '@/types/avatar';
import styles from './avatar.module.css';

const PAGE_SIZE = 16;

export default function AvatarGalleryPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<AvatarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // 필터/정렬
  const [sortBy, setSortBy] = useState<AvatarSortBy>('createdAt');
  const [filterClass, setFilterClass] = useState('');

  const fetchPosts = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await getAvatarPosts({
          sortBy,
          filterClass: filterClass || undefined,
          limit: PAGE_SIZE,
          startAfterDoc: isLoadMore ? lastDocRef.current : undefined,
        });

        if (isLoadMore) {
          setPosts((prev) => [...prev, ...result.posts]);
        } else {
          setPosts(result.posts);
        }

        lastDocRef.current = result.lastDoc;
        setHasMore(result.posts.length === PAGE_SIZE);
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortBy, filterClass],
  );

  // 초기 로딩 + 필터/정렬 변경 시
  useEffect(() => {
    lastDocRef.current = null;
    setHasMore(true);
    fetchPosts(false);
  }, [fetchPosts]);

  // 스켈레톤 카드
  const renderSkeletons = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className={styles.skeletonCard}>
        <div className={`${styles.skeletonImage} ${styles.skeletonPulse}`} />
        <div className={styles.skeletonInfo}>
          <div className={`${styles.skeletonLine} ${styles.skeletonPulse}`} />
          <div
            className={`${styles.skeletonLine} ${styles.skeletonLineShort} ${styles.skeletonPulse}`}
          />
        </div>
      </div>
    ));

  return (
    <Container fluid style={{ maxWidth: '1400px' }}>
      <div className={styles.pageWrapper}>
        {/* 헤더 */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>아바타 갤러리</h1>
          <p className={styles.pageSubtitle}>
            다른 모험가들의 아바타 염색 코드를 확인하고, 나만의 스타일을 공유하세요
          </p>
        </div>

        {/* 컨트롤 */}
        <div className={styles.controls}>
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AvatarSortBy)}
            >
              <option value="createdAt">최신순</option>
              <option value="likeCount">인기순</option>
            </select>
            <select
              className={styles.filterSelect}
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">전체 클래스</option>
              {Object.entries(CLASS_GROUPS).map(([group, classes]) => (
                <optgroup key={group} label={group}>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <Link href="/avatar/register" className={styles.registerLink}>
            + 등록하기
          </Link>
        </div>

        {/* 갤러리 그리드 */}
        {loading ? (
          <div className={styles.galleryGrid}>{renderSkeletons()}</div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>&#128083;</div>
            <p className={styles.emptyText}>아직 등록된 아바타가 없습니다</p>
            <p className={styles.emptySubtext}>
              첫 번째로 나만의 아바타를 공유해보세요!
            </p>
          </div>
        ) : (
          <>
            <div className={styles.galleryGrid}>
              {posts.map((post) => (
                <AvatarGalleryCard key={post.id} post={post} />
              ))}
            </div>

            {/* 더보기 */}
            {hasMore && (
              <div className={styles.loadMoreWrap}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={() => fetchPosts(true)}
                  disabled={loadingMore}
                >
                  {loadingMore ? '불러오는 중...' : '더 보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  );
}
