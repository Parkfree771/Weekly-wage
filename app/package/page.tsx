'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import PackageGalleryCard from '@/components/package/PackageGalleryCard';
import { getPackagePosts } from '@/lib/package-service';
import { useAuth } from '@/contexts/AuthContext';
import type { PackagePost, PackageSortBy } from '@/types/package';
import { calculatePostEfficiency } from '@/lib/package-shared';
import AdBanner from '@/components/ads/AdBanner';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
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

        let fetched = result.posts;

        // 효율순: 클라이언트에서 계산 후 정렬
        if (sortBy === 'efficiency' && Object.keys(latestPrices).length > 0) {
          fetched = [...fetched].sort(
            (a, b) =>
              calculatePostEfficiency(b, latestPrices) -
              calculatePostEfficiency(a, latestPrices),
          );
        }

        if (isLoadMore) {
          setPosts((prev) => [...prev, ...fetched]);
        } else {
          setPosts(fetched);
        }

        lastDocRef.current = result.lastDoc;
        setHasMore(sortBy !== 'efficiency' && result.posts.length === PAGE_SIZE);
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortBy, latestPrices],
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
          <h1 className={styles.pageTitle}>패키지 효율</h1>
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
              <option value="efficiency">효율순</option>
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

        <GuideFaq
          guideTitle="패키지 효율 게시판 이용 가이드"
          sections={[
            {
              heading: '효율은 무엇을, 어떻게 비교하는 건가요',
              paragraphs: [
                '이곳은 로스트아크 캐시샵에서 판매하는 유료 패키지의 구성품을 이용자가 직접 등록하고, 그 구성품을 거래소·경매장 실시간 시세로 환산해 "이 패키지를 사는 것이 실제로 이득인지"를 함께 비교하는 커뮤니티 게시판입니다. 패키지 안의 파괴석·수호석 결정, 숨결, 돌파석, 카드팩, 티켓류 같은 재료를 하나씩 현재 시세로 환산해 더한 값을 총 골드 가치로 계산하고, 이를 패키지의 실제 결제 금액(로열 크리스탈 또는 블루 크리스탈 환산가)과 비교해 이득률(%)로 보여줍니다.',
                '카드 우측의 "1개 구매" 이득률은 해당 패키지를 정가로 한 번 결제했을 때 시세 기준으로 몇 퍼센트 이득 또는 손해인지를 뜻합니다. 시세는 계속 변동하므로 같은 패키지라도 등록 시점과 지금 보는 시점의 이득률이 달라질 수 있습니다.',
              ],
            },
            {
              heading: '3+1·2+1 묶음 패키지, 가챠 패키지는 별도로 계산됩니다',
              paragraphs: [
                '3+1, 2+1처럼 여러 개를 한 번에 결제해야 보너스 구성이 붙는 패키지는 실제 지불 개수와 수령 개수를 구분해서 계산합니다. 예를 들어 3+1은 3개 가격을 내고 4개를 받는 구조이므로, 카드에는 1개만 살 때의 이득률과 3+1로 묶어서 살 때의 이득률을 따로 표시합니다.',
                '확률형(가챠) 패키지는 무엇이 나올지 결제 전에는 알 수 없기 때문에, 등록된 각 결과물의 확률과 골드 가치를 곱해서 모두 더한 기댓값을 기준으로 효율을 계산합니다. 카드에서 직접 1회·10회 뽑기를 눌러볼 수 있는 것은 확률을 체감해 보는 체험 기능이며, 실제 정렬·비교에 쓰이는 수치는 확률 기댓값입니다.',
              ],
            },
            {
              heading: '환율 입력과 N선택 패키지',
              paragraphs: [
                '카드 안의 환율 입력칸(골드 100 : 로열 크리스탈 N원)은 게시물 등록 시점의 환율을 기본값으로 보여주되, 직접 원하는 값으로 바꿀 수 있습니다. 환율을 바꾸면 크리스탈·페온 단위로 환산되는 재화들의 골드 가치와 이득률이 그 자리에서 다시 계산되어, 지금 본인이 실제로 이용하는 환율 기준으로 손익을 확인할 수 있습니다.',
                '구성품 중 정해진 개수만 골라 받는 "N선택" 패키지는 기본적으로 골드 가치가 높은 순으로 자동 체크되어 총 골드 가치에 반영되며, 아이템을 직접 클릭해 체크 상태를 바꾸면 본인이 실제로 고를 조합 기준으로 다시 계산됩니다.',
              ],
            },
            {
              heading: '목록 정렬 방식',
              paragraphs: [
                '상단 드롭다운으로 게시물 정렬 기준을 바꿀 수 있습니다. "효율순"은 방금 설명한 총 골드 가치 대비 결제 금액 기준 이득률이 높은 패키지부터 보여주고, "최신순"은 등록된 지 얼마 안 된 게시물을, "인기순"은 다른 이용자들의 좋아요 수가 많은 게시물을 우선 보여줍니다. 같은 패키지라도 시세 변동에 따라 효율순 결과가 바뀔 수 있으니 여러 기준을 함께 참고하는 것이 좋습니다.',
              ],
            },
          ]}
          faqs={faqData}
        />
      </div>
    </Container>
  );
}
