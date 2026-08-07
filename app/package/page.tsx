'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import PackageGalleryCard from '@/components/package/PackageGalleryCard';
import AzenaBlessingGalleryCard from '@/components/package/AzenaBlessingGalleryCard';
import { getPackagePosts } from '@/lib/package-service';
import { calculatePostEfficiency, isNewReleasePost } from '@/lib/package-shared';
import { isSaleEnded } from '@/lib/package-sale';
import { useAuth } from '@/contexts/AuthContext';
import type { PackagePost } from '@/types/package';
import AdBanner from '@/components/ads/AdBanner';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
import styles from './package.module.css';

const PAGE_SIZE = 16;

// 모바일 인-콘텐츠 광고를 끼워 넣을 자리 — "이 인덱스의 카드 뒤"에 하나씩.
// 카드 2개 → 광고 → 카드 3개 → 광고 → 카드 3개 → 광고.
// 자리 순번이 곧 애드핏 단위 순번(ADFIT_INCONTENT_UNITS)이다. 단위가 모자란 뒤쪽 자리는
// AdBanner 가 스스로 렌더를 건너뛴다.
const AD_AFTER_CARD_INDEX = [1, 4, 7];

// 공통 환율(100골드당 원) 입력 범위. 기본값은 두지 않는다 —
// 비어 있으면 미적용이고, 각 카드가 등록 시점 환율을 그대로 쓴다.
const RATE_MIN = 1;
const RATE_MAX = 999;

const clampRate = (v: number) => (v <= 0 ? 0 : Math.max(RATE_MIN, Math.min(RATE_MAX, v)));

// ─── 정렬·필터 ───
// 전부 이미 불러온 posts 배열 위에서만 도는 화면 기준 기능이다.
// Firestore 재조회를 절대 일으키지 않는다 — 예전에 정렬을 서버 쿼리로 돌리다
// 드롭다운을 건드릴 때마다 읽기가 한 페이지씩 더 나가서 뺐던 기능이라, 같은 실수를 막으려고
// sortBy/typeFilter 는 fetchPosts 의 의존성에 넣지 않는다.
type GallerySort = 'createdAt' | 'efficiency' | 'newRelease';
type SaleFilter = 'all' | 'onSale' | 'ended';

// 정렬과 판매 상태를 드롭다운 하나로 합쳤다. select 는 값이 하나뿐이라
// "판매중 + 효율순" 같은 조합은 안 된다 — 컨트롤 개수를 줄이는 쪽을 택한 결과다.
type GalleryView = GallerySort | 'onSale' | 'ended';

// optgroup 으로 묶으면 "정렬" 같은 그룹 헤더가 한 줄 차지하고 항목이 오른쪽으로
// 들여쓰기돼서 지저분하다 — 그냥 평평한 목록으로 둔다.
// 기본은 업로드순 — Firestore 가 내려주는 순서 그대로다
const VIEW_OPTIONS: [GalleryView, string][] = [
  ['createdAt', '업로드순'],
  ['efficiency', '효율순'],
  ['newRelease', '신작순'],
  ['onSale', '판매중'],
  ['ended', '판매종료'],
];

const SALE_VIEWS: SaleFilter[] = ['onSale', 'ended'];
const isSaleView = (v: GalleryView): v is Exclude<SaleFilter, 'all'> =>
  (SALE_VIEWS as string[]).includes(v);

export default function PackageGalleryPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PackagePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  // 갤러리 공통 환율(100골드당 원). 0 이면 미적용 — 각 카드가 등록 시점 환율을 그대로 쓴다.
  // 값이 들어오면 모든 카드가 이 값으로 맞춰지고, 이후 카드별 개별 수정은 그대로 가능하다.
  const [commonWonPer100Gold, setCommonWonPer100Gold] = useState<number>(0);
  // 화면 기준 정렬·필터 (Firestore 재조회 없음)
  const [view, setView] = useState<GalleryView>('createdAt');
  const sortBy: GallerySort = isSaleView(view) ? 'createdAt' : view;
  const saleFilter: SaleFilter = isSaleView(view) ? view : 'all';

  // 기본값이 없으므로 비어 있을 때 +는 최솟값부터 시작하고, −는 아무 일도 하지 않는다
  const stepCommonRate = (delta: number) =>
    setCommonWonPer100Gold((prev) => {
      if (prev <= 0) return delta > 0 ? RATE_MIN : 0;
      return clampRate(prev + delta);
    });

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
          sortBy: 'createdAt',
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
    // latestPrices는 카드 표시용일 뿐 조회 조건이 아니다.
    // deps에 넣으면 시세 응답 직후 재조회가 일어나 방문당 읽기가 2배가 된다.
    [],
  );

  useEffect(() => {
    fetchPosts(false);
  }, [fetchPosts]);

  // 이미 받아둔 posts 위에서만 도는 정렬·필터. 여기서 네트워크를 타는 건 아무것도 없다.
  const visiblePosts = useMemo(() => {
    let filtered = posts;

    if (saleFilter !== 'all') {
      const wantEnded = saleFilter === 'ended';
      filtered = filtered.filter((p) => isSaleEnded(p) === wantEnded);
    }

    // 업로드순은 Firestore 가 이미 그 순서로 내려준 것이라 다시 정렬할 필요가 없다
    if (sortBy === 'createdAt') return filtered;

    // 신작순 — NEW 배지가 붙은 글(신규 출시 + 30일 이내 + 판매중)을 앞으로.
    // 같은 그룹 안에서는 들어온 순서(=업로드순)를 그대로 둔다.
    if (sortBy === 'newRelease') {
      return [...filtered].sort(
        (a, b) => Number(isNewReleasePost(b)) - Number(isNewReleasePost(a)),
      );
    }

    // 효율순 — 시세가 도착하기 전엔 전부 0이 나와 순서가 무의미하므로 원래 순서를 유지한다
    if (Object.keys(latestPrices).length === 0) return filtered;
    const rateOverride = commonWonPer100Gold > 0 ? 100 / commonWonPer100Gold : 0;
    return [...filtered].sort(
      (a, b) =>
        calculatePostEfficiency(b, latestPrices, rateOverride) -
        calculatePostEfficiency(a, latestPrices, rateOverride),
    );
  }, [posts, saleFilter, sortBy, latestPrices, commonWonPer100Gold]);

  // 정렬·필터는 "지금 불러온 목록" 안에서만 도므로, 범위를 숨기지 않고 그대로 알려준다
  const isNarrowed = saleFilter !== 'all';

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
              value={view}
              onChange={(e) => setView(e.target.value as GalleryView)}
              aria-label="정렬·판매 상태"
            >
              {VIEW_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {isNarrowed && (
              <span className={styles.filterCount}>
                {posts.length}개 중 {visiblePosts.length}개
              </span>
            )}
          </div>
          <div className={styles.commonRate}>
            <div className={styles.commonRateRow}>
              <button
                type="button"
                className={styles.commonRateStep}
                onClick={() => stepCommonRate(-1)}
                aria-label="공통 환율 1원 낮추기"
              >
                −
              </button>
              <div className={styles.commonRateBox}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gold.webp" alt="골드" className={styles.commonRateIcon} loading="lazy" decoding="async" />
                <span className={styles.commonRateFixed}>100</span>
                <span className={styles.commonRateSep}>:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/royal.webp" alt="로얄" className={styles.commonRateIcon} loading="lazy" decoding="async" />
                <input
                  type="number"
                  className={styles.commonRateInput}
                  value={commonWonPer100Gold || ''}
                  onChange={(e) => setCommonWonPer100Gold(clampRate(parseInt(e.target.value) || 0))}
                  min={RATE_MIN}
                  max={RATE_MAX}
                  aria-label="갤러리 공통 환율 (100골드당 원화)"
                />
                <span className={styles.commonRateUnit}>원</span>
              </div>
              <button
                type="button"
                className={styles.commonRateStep}
                onClick={() => stepCommonRate(1)}
                aria-label="공통 환율 1원 올리기"
              >
                +
              </button>
            </div>
            <div className={styles.commonRateBelow}>
              <span className={styles.commonRateLabel}>
                {commonWonPer100Gold > 0 ? '공통 환율 적용 중' : '공통 환율 — 입력하면 전체 카드에 적용'}
              </span>
              {commonWonPer100Gold > 0 && (
                <button
                  type="button"
                  className={styles.commonRateReset}
                  onClick={() => setCommonWonPer100Gold(0)}
                >
                  해제
                </button>
              )}
            </div>
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
            {visiblePosts.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>조건에 맞는 패키지가 없습니다</p>
                <p className={styles.emptySubtext}>
                  {hasMore
                    ? '아래 "더 보기"로 목록을 더 불러오거나, 드롭다운을 "업로드순"으로 바꿔보세요'
                    : '드롭다운을 "업로드순"으로 바꿔보세요'}
                </p>
              </div>
            ) : (
              <div className={styles.galleryGrid}>
                {/* 아제나의 축복 — 코드로 박아둔 공식 패키지. 판매종료 필터에서만 숨긴다 */}
                {saleFilter !== 'ended' && (
                  <AzenaBlessingGalleryCard
                    latestPrices={latestPrices}
                    commonWonPer100Gold={commonWonPer100Gold}
                  />
                )}
                {visiblePosts.map((post, index) => {
                  // 자리 순번 = 애드핏 단위 순번. 마지막 카드 뒤에는 붙이지 않는다.
                  const adSlotIndex = AD_AFTER_CARD_INDEX.indexOf(index);
                  const showAd = adSlotIndex !== -1 && index < visiblePosts.length - 1;
                  return (
                    <React.Fragment key={post.id}>
                      <PackageGalleryCard
                        post={post}
                        latestPrices={latestPrices}
                        commonWonPer100Gold={commonWonPer100Gold}
                      />
                      {/* 모바일 전용(d-md-none). 자리마다 다른 애드핏 단위를 받는다 —
                          같은 단위를 반복하면 애드핏이 첫 자리만 채우고 나머지는 안 나온다. */}
                      {showAd && (
                        <div className="d-block d-md-none" style={{ gridColumn: '1 / -1' }}>
                          <AdBanner slot="8616653628" index={adSlotIndex} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

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
          relatedGuides={['/guide/package-efficiency']}
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
              heading: '목록 정렬과 필터',
              paragraphs: [
                '게시물은 기본적으로 업로드순(최근에 등록된 순서)으로 표시되며, 상단 왼쪽 드롭다운 하나로 보기 방식을 바꿀 수 있습니다. "정렬" 항목에서 "효율순"은 방금 설명한 총 골드 가치 대비 결제 금액 기준으로 이득이 큰 패키지부터, "신작순"은 신규 출시로 등록된 지 30일이 지나지 않은 판매중 패키지(NEW 배지가 붙은 글)부터, "인기순"은 다른 이용자들의 좋아요가 많은 게시물부터 보여줍니다. "판매 상태" 항목에서 "판매중" 또는 "판매종료"를 고르면 해당 상태의 패키지만 골라서 볼 수 있습니다.',
                '정렬과 필터는 지금 화면에 불러와 둔 게시물 안에서 즉시 다시 계산됩니다. 목록을 더 넓게 두고 비교하고 싶다면 아래 "더 보기"로 게시물을 더 불러온 뒤 정렬하면 됩니다. 각 카드에 표시되는 이득률은 실시간 시세 기준으로 계산되므로, 같은 패키지라도 등록 시점과 지금 보는 시점의 값이 달라질 수 있습니다.',
                '공통 환율을 입력해 둔 상태에서 "효율순"을 고르면 모든 게시물이 같은 환율로 환산되므로, 정렬 순서가 각 카드에 찍히는 이득률 순서와 정확히 일치합니다. 공통 환율 없이 정렬하면 게시물마다 등록 당시 환율이 달라 순서가 카드의 이득률과 어긋나 보일 수 있습니다.',
              ],
            },
          ]}
          faqs={faqData}
        />
      </div>
    </Container>
  );
}
