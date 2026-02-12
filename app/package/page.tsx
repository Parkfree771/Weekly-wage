'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import PackageGalleryCard from '@/components/package/PackageGalleryCard';
import { getPackagePosts } from '@/lib/package-service';
import { useAuth } from '@/contexts/AuthContext';
import type { PackagePost, PackageSortBy } from '@/types/package';
import AdBanner from '@/components/ads/AdBanner';
import styles from './package.module.css';

const PAGE_SIZE = 16;

export default function PackageGalleryPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PackagePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});

  const [sortBy, setSortBy] = useState<PackageSortBy>('createdAt');

  useEffect(() => {
    fetch('/api/price-data/latest')
      .then((res) => res.json())
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  const fetchPosts = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await getPackagePosts({
          sortBy,
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
    [sortBy],
  );

  useEffect(() => {
    lastDocRef.current = null;
    setHasMore(true);
    fetchPosts(false);
  }, [fetchPosts]);

  const renderSkeletons = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className={styles.skeletonCard}>
        <div className={`${styles.skeletonBadge} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort} ${styles.skeletonPulse}`} />
        <div className={`${styles.skeletonLineTiny} ${styles.skeletonPulse}`} />
      </div>
    ));

  return (
    <Container fluid style={{ maxWidth: '1400px' }}>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>패키지 효율 계산기</h1>
          <p className={styles.pageSubtitle}>
            캐시샵 패키지의 효율을 계산하고 비교하세요
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PackageSortBy)}
            >
              <option value="createdAt">최신순</option>
              <option value="likeCount">인기순</option>
            </select>
          </div>

          <Link href="/package/register" className={styles.registerLink}>
            + 등록하기
          </Link>
        </div>

        {loading ? (
          <div className={styles.galleryGrid}>{renderSkeletons()}</div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>아직 등록된 패키지가 없습니다</p>
            <p className={styles.emptySubtext}>
              첫 번째로 패키지 효율을 공유해보세요!
            </p>
          </div>
        ) : (
          <>
            <div className={styles.galleryGrid}>
              {posts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <PackageGalleryCard
                    post={post}
                    latestPrices={latestPrices}
                  />
                  {index === 1 && posts.length > 2 && (
                    <div className="d-block d-md-none" style={{ gridColumn: '1 / -1' }}>
                      <AdBanner slot="8616653628" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

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
