'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import PackageGalleryCard from '@/components/package/PackageGalleryCard';
import AzenaBlessingGalleryCard from '@/components/package/AzenaBlessingGalleryCard';
import { getPackagePosts, getPackagePostCount } from '@/lib/package-service';
import { fetchLatestPrices } from '@/lib/price-history-client';
import { calculatePostEfficiency, isNewReleasePost } from '@/lib/package-shared';
import RefreshLottie from '@/components/RefreshLottie';
import { isSaleEnded } from '@/lib/package-sale';
import type { PackagePost } from '@/types/package';
import AdBanner from '@/components/ads/AdBanner';
import AdFitUnit from '@/components/ads/AdFitUnit';
import useIsMobileViewport from '@/components/ads/useIsMobileViewport';
import { ADFIT_ENABLED, ADFIT_UNITS } from '@/components/ads/adConfig';
import GuideFaq from '@/components/common/GuideFaq';
import PackageEfficiencyGuideBody from '@/components/guide/PackageEfficiencyGuideBody';
import { faqData } from './faq-data';
import styles from './package.module.css';

// 페이지당 카드 6장 고정 — 1페이지는 아제나 카드 + 글 5개, 2페이지부터는 글 6개.
// 커서 페이지네이션이라 페이지마다 limit 이 달라도 문제없다 (커서 = 직전 페이지 마지막 문서)
const PAGE_SIZE_FIRST = 5;
const PAGE_SIZE_REST = 6;
const pageSizeOf = (n: number) => (n === 1 ? PAGE_SIZE_FIRST : PAGE_SIZE_REST);

// 모바일 인-콘텐츠 광고를 끼워 넣을 자리 — "이 인덱스의 글 카드 뒤"에 하나씩.
// 아제나 카드는 1페이지에만 나온다 (매 페이지 반복하면 페이지가 바뀐 게 안 보인다).
// 1페이지: 아제나 → 광고(단위0) → 글 2개 → 광고(단위1) → 글 2개 → 광고(단위2) → 글 1개
// 2페이지~: 글 1개 → 광고(단위0) → 글 2개 → 광고(단위1) → 글 2개 → 광고(단위2) → 글 1개
// 공통 하단: 페이지 버튼 → 320×100 광고(구 단일 단위).
// 동시 게재 최대 4개 — 애드핏 정책 상한("4개 초과 금지")에 맞춘 배치라 더 늘리면 안 된다.
// 페이지를 넘기면 이전 광고 DOM 이 사라지고 새로 로드되므로 페이지 수만큼 노출이 늘어난다.
// 단위가 모자란 자리는 AdBanner 가 스스로 렌더를 건너뛴다.
const AD_AFTER_CARD_INDEX_PAGE1 = [1, 3];
const AD_AFTER_CARD_INDEX_REST = [0, 2, 4];

// 페이지 번호 목록 — 많아지면 [1 … 4 5 6 … 20] 처럼 현재 페이지 주변만 남기고 접는다
function buildPageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const uniq = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  uniq.forEach((n, i) => {
    if (i > 0) {
      const prev = uniq[i - 1];
      if (n - prev === 2) out.push(prev + 1);
      else if (n - prev > 2) out.push('gap');
    }
    out.push(n);
  });
  return out;
}

// 공통 환율(100골드당 원) 입력 범위. 기본값은 두지 않는다 —
// 비어 있으면 미적용이고, 각 카드가 등록 시점 환율을 그대로 쓴다.
const RATE_MIN = 1;
const RATE_MAX = 999;

const clampRate = (v: number) => (v <= 0 ? 0 : Math.max(RATE_MIN, Math.min(RATE_MAX, v)));

// 모듈 스코프 페이지 캐시 — 갤러리 ↔ 상세 왕복으로 컴포넌트가 언마운트돼도 조회 결과를 유지해
// Firestore 재조회를 막는다. 새 글 등록 직후 낡은 목록이 보이지 않게 TTL 을 두고 통째로 비운다.
const PAGE_CACHE_TTL_MS = 60_000;
const modulePageCache = new Map<number, PackagePost[]>();
const moduleCursors = new Map<number, any>();
let modulePageCacheAt = 0;
let moduleTotalCount: number | null = null;

// ─── 정렬·필터 ───
// 전부 이미 불러온 posts 배열 위에서만 도는 화면 기준 기능이다.
// Firestore 재조회를 절대 일으키지 않는다 — 예전에 정렬을 서버 쿼리로 돌리다
// 드롭다운을 건드릴 때마다 읽기가 한 페이지씩 더 나가서 뺐던 기능이라, 같은 실수를 막으려고
// 실시간 최저가(시세 갱신 버튼) — 페이지 왕복에도 유지되게 모듈에 둔다.
// 서버가 durable 캐시(120초)로 전 유저 공유라, 여기 쿨다운은 "무의미한 재요청"만 막는다.
let moduleLivePrices: Record<string, number> | null = null;
let moduleLiveAt = 0; // ms
const LIVE_COOLDOWN_MS = 120_000;

// sortBy/typeFilter 는 goToPage 의 의존성에 넣지 않는다.
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
  const [posts, setPosts] = useState<PackagePost[]>([]);
  const [loading, setLoading] = useState(true);
  // 페이지 번호 방식. Firestore 는 offset 점프가 안 돼 커서로만 다음 페이지를 연다 —
  // 방문한 페이지는 캐시에 담아 재조회 없이 오가고, 안 가본 곳은 "방문한 끝 + 1"까지만 열린다.
  // 진입 시 읽기는 1페이지 5개뿐이고, 다른 페이지는 처음 넘어갈 때 한 번씩만 읽는다.
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(moduleTotalCount);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  // 실시간 최저가 — 갱신 버튼을 누른 뒤에만 채워진다. 평균가(latestPrices) 위에 덮어쓴다.
  const [livePrices, setLivePrices] = useState<Record<string, number> | null>(moduleLivePrices);
  const [liveAt, setLiveAt] = useState<number>(moduleLiveAt);
  const [liveLoading, setLiveLoading] = useState(false);
  // "N분 전" 표시가 시간을 따라가게 하는 틱 — 갱신된 적 있을 때만 돈다
  const [, setLiveTick] = useState(0);
  useEffect(() => {
    if (!liveAt) return;
    const t = setInterval(() => setLiveTick(v => v + 1), 30_000);
    return () => clearInterval(t);
  }, [liveAt]);

  const refreshLivePrices = useCallback(async () => {
    if (liveLoading || Date.now() - moduleLiveAt < LIVE_COOLDOWN_MS) return;
    setLiveLoading(true);
    try {
      const res = await fetch('/api/market/live-prices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.prices && Object.keys(data.prices).length > 0) {
        moduleLivePrices = data.prices;
        // 쿨다운은 서버 수집 시각 기준 — CDN 캐시를 받은 경우 남은 TTL 만큼만 기다리게 된다
        moduleLiveAt = Date.parse(data.fetchedAt) || Date.now();
        setLivePrices(moduleLivePrices);
        setLiveAt(moduleLiveAt);
      }
    } catch (err) {
      console.error('실시간 시세 갱신 실패:', err);
    } finally {
      setLiveLoading(false);
    }
  }, [liveLoading]);

  // 카드·정렬이 실제로 쓰는 가격 — 갱신 전에는 평균가 그대로, 갱신 후에는 최저가가 덮는다
  const effectivePrices = useMemo(
    () => (livePrices ? { ...latestPrices, ...livePrices } : latestPrices),
    [latestPrices, livePrices],
  );

  // 갤러리 공통 환율(100골드당 원). 0 이면 미적용 — 각 카드가 등록 시점 환율을 그대로 쓴다.
  // 값이 들어오면 모든 카드가 이 값으로 맞춰지고, 이후 카드별 개별 수정은 그대로 가능하다.
  // 입력은 문자열로 든다 — number state 면 "16." 같은 타이핑 중간 상태가 지워져 소수(16.5) 입력이 안 된다.
  const [commonRateText, setCommonRateText] = useState<string>('');
  // 블크 시세(100블크당 골드) — 환율과 양방향 동기화 (100블크 = 2750원 고정)
  const [commonBcText, setCommonBcText] = useState<string>('');
  const commonWonPer100Gold = clampRate(parseFloat(commonRateText) || 0);
  // 카드 6장 재계산·재정렬은 키 입력보다 한 박자 늦게 — 입력칸 반응성은 유지하고 무거운 작업만 미룬다
  const deferredCommonRate = useDeferredValue(commonWonPer100Gold);
  // 하단 데스크톱 배너의 뷰포트 판정 (d-md-block 과 같은 768px 기준)
  const isMobileMd = useIsMobileViewport(767.98);

  const handleCommonRateInput = (v: string) => {
    setCommonRateText(v);
    const w = parseFloat(v) || 0;
    setCommonBcText(w > 0 ? String(Math.round(275000 / w)) : '');
  };
  const handleCommonBcInput = (v: string) => {
    setCommonBcText(v);
    const b = parseFloat(v) || 0;
    setCommonRateText(b > 0 ? String(Math.round(2750000 / b) / 10) : '');
  };
  // 두 입력칸은 항상 같은 폭을 쓴다 — 폭이 갈리면 위·아래 줄의 밑줄 길이와 열 정렬이 어긋난다.
  // 블크 골드값은 환율이 낮을수록 자릿수가 늘어나서(16.5원 → 16666골드) 고정 폭이면 뒷자리가 잘린다.
  const rateInputWidth = `calc(${Math.max(5, commonRateText.length, commonBcText.length)}ch + 0.5rem)`;

  // 화면 기준 정렬·필터 (Firestore 재조회 없음)
  const [view, setView] = useState<GalleryView>('createdAt');
  const sortBy: GallerySort = isSaleView(view) ? 'createdAt' : view;
  const saleFilter: SaleFilter = isSaleView(view) ? view : 'all';

  // 기본값이 없으므로 비어 있을 때 +는 최솟값부터 시작하고, −는 아무 일도 하지 않는다
  const stepCommonRate = (delta: number) => {
    const cur = clampRate(parseFloat(commonRateText) || 0);
    const next = cur <= 0
      ? (delta > 0 ? RATE_MIN : 0)
      : clampRate(Math.round((cur + delta) * 10) / 10);
    setCommonRateText(next > 0 ? String(next) : '');
    setCommonBcText(next > 0 ? String(Math.round(275000 / next)) : '');
  };

  useEffect(() => {
    // fetchLatestPrices 는 모듈 메모리 캐시가 있어 갤러리 ↔ 상세 왕복 시 재요청이 없다
    fetchLatestPrices()
      .then((data) => setLatestPrices(data))
      .catch((err) => console.error('가격 데이터 로딩 실패:', err));
  }, []);

  const goToPage = useCallback(async (n: number) => {
    // TTL 이 지난 모듈 캐시는 통째로 비운다 — 새 글 등록 직후 낡은 목록이 계속 보이지 않게
    if (Date.now() - modulePageCacheAt > PAGE_CACHE_TTL_MS) {
      modulePageCache.clear();
      moduleCursors.clear();
      moduleTotalCount = null;
    }
    const cached = modulePageCache.get(n);
    if (cached) {
      setPage(n);
      setPosts(cached);
      // loading 은 마운트마다 true 로 시작한다 — 캐시 히트로 조회를 건너뛸 때도 반드시 내려야
      // 재진입 시 스켈레톤이 그대로 남는다
      setLoading(false);
      return;
    }

    // 커서가 없는 페이지(중간 건너뛰기)는 UI 에서 비활성이지만, 혹시 들어와도 조용히 무시
    const cursor = n === 1 ? undefined : moduleCursors.get(n - 1);
    if (n !== 1 && !cursor) return;

    setLoading(true);
    try {
      const result = await getPackagePosts({
        sortBy: 'createdAt',
        limit: pageSizeOf(n),
        startAfterDoc: cursor,
      });
      if (modulePageCache.size === 0) modulePageCacheAt = Date.now();
      modulePageCache.set(n, result.posts);
      moduleCursors.set(n, result.lastDoc);
      setPage(n);
      setPosts(result.posts);
    } catch (err) {
      console.error('게시물 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
    // latestPrices는 카드 표시용일 뿐 조회 조건이 아니다.
    // deps에 넣으면 시세 응답 직후 재조회가 일어나 방문당 읽기가 2배가 된다.
  }, []);

  useEffect(() => {
    goToPage(1);
    // 전체 페이지 수 표시용. count 집계는 문서를 읽어오지 않아 비용이 거의 없고,
    // 실패해도 이전/다음 버튼만으로 정상 동작한다. 모듈 캐시가 살아 있으면 재호출도 생략.
    if (moduleTotalCount != null) {
      setTotalCount(moduleTotalCount);
      return;
    }
    getPackagePostCount()
      .then((c) => { moduleTotalCount = c; setTotalCount(c); })
      .catch(() => setTotalCount(null));
  }, [goToPage]);

  // 사용자가 페이지를 넘길 때 — 목록 맨 위로 되돌린다 (첫 로딩에는 안 탄다)
  const handlePageChange = (n: number) => {
    if (n === page || loading) return;
    goToPage(n);
    window.scrollTo({ top: 0 });
  };

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
    if (Object.keys(effectivePrices).length === 0) return filtered;
    const rateOverride = deferredCommonRate > 0 ? 100 / deferredCommonRate : 0;
    return [...filtered].sort(
      (a, b) =>
        calculatePostEfficiency(b, effectivePrices, rateOverride) -
        calculatePostEfficiency(a, effectivePrices, rateOverride),
    );
  }, [posts, saleFilter, sortBy, effectivePrices, deferredCommonRate]);

  // 정렬·필터는 "지금 불러온 목록" 안에서만 도므로, 범위를 숨기지 않고 그대로 알려준다
  const isNarrowed = saleFilter !== 'all';

  // 1페이지는 5개, 나머지는 6개씩이라 전체 페이지 수도 그 기준으로 나눈다
  const totalPages = totalCount != null
    ? totalCount <= PAGE_SIZE_FIRST
      ? 1
      : 1 + Math.ceil((totalCount - PAGE_SIZE_FIRST) / PAGE_SIZE_REST)
    : null;
  // 커서 확보 범위: 방문한 페이지 + 그 다음 한 페이지까지만 이동 가능
  const maxLoaded = modulePageCache.size > 0 ? Math.max(...modulePageCache.keys()) : 0;
  const hasNext = totalPages != null ? page < totalPages : posts.length === pageSizeOf(page);

  const renderSkeletons = () =>
    Array.from({ length: 6 }).map((_, i) => (
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
            {/* 실시간 최저가 갱신 — 전 유저 공유 캐시(120초)라 그 안의 재클릭은 보내지 않는다 */}
            <button
              type="button"
              className={`${styles.liveRefreshBtn} ${liveLoading ? styles.liveRefreshLoading : ''}`}
              onClick={refreshLivePrices}
              disabled={liveLoading}
              aria-busy={liveLoading}
              aria-label="시세 갱신"
              title="거래소 현재 최저가로 다시 계산합니다 (기본은 1시간 주기 평균가)"
            >
              <RefreshLottie spinning={liveLoading} size={18} />
              {/* 불러오는 2~3초가 멈춘 것처럼 보이면 사용자가 연타하거나 떠난다 — 문구로 상태를 못박는다.
                  모바일은 폭이 없어 글자를 접고 로티 회전 + 맥동만 남긴다(CSS). */}
              <span className={styles.liveRefreshLabel}>
                {liveLoading ? '시세 불러오는 중' : '시세 갱신'}
              </span>
              {!liveLoading && liveAt > 0 && (
                <em className={styles.liveRefreshAt}>
                  {(() => {
                    const m = Math.floor((Date.now() - liveAt) / 60_000);
                    return m < 1 ? '방금' : `${m}분 전`;
                  })()}
                </em>
              )}
            </button>
          </div>
          <div className={styles.commonRate}>
            <div className={styles.commonRateGroup}>
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
                  <img src="/royal.webp" alt="로얄" className={styles.commonRateIconRoyal} loading="lazy" decoding="async" />
                  <input
                    type="number"
                    className={styles.commonRateInput}
                    style={{ width: rateInputWidth }}
                    value={commonRateText}
                    onChange={(e) => handleCommonRateInput(e.target.value)}
                    min={RATE_MIN}
                    max={RATE_MAX}
                    step="any"
                    aria-label="갤러리 공통 환율 (100골드당 원화)"
                  />
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
              <div className={styles.commonRateRowBc}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/blue.webp" alt="블루 크리스탈" className={styles.commonRateIcon} loading="lazy" decoding="async" />
                <span className={styles.commonRateFixed}>100</span>
                <span className={styles.commonRateSep}>=</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gold.webp" alt="골드" className={styles.commonRateIconPad} loading="lazy" decoding="async" />
                <input
                  type="number"
                  className={styles.commonRateInput}
                  style={{ width: rateInputWidth }}
                  value={commonBcText}
                  onChange={(e) => handleCommonBcInput(e.target.value)}
                  min={1}
                  step="any"
                  aria-label="블루 크리스탈 100개당 골드"
                />
              </div>
              {commonWonPer100Gold > 0 && (
                <div className={styles.commonRateStatus}>
                  <span className={styles.commonRateStatusLabel}>공통 환율 적용 중</span>
                  <button
                    type="button"
                    className={styles.commonRateClear}
                    onClick={() => { setCommonRateText(''); setCommonBcText(''); }}
                  >
                    해제
                  </button>
                </div>
              )}
            </div>
          </div>
          <Link href="/package/register" className={styles.registerLink}>
            + 등록하기
          </Link>
        </div>

        {/* 시세 기준 안내 — 갱신 전에는 두 시세의 차이를, 갱신 후에는 현재 기준을 한 줄로 */}
        <p className={styles.liveHint}>
          {livePrices
            ? (() => {
                const m = Math.floor((Date.now() - liveAt) / 60_000);
                return `지금 거래소 최저가 기준으로 계산 중 · ${m < 1 ? '방금' : `${m}분 전`} 갱신`;
              })()
            : '시세는 1시간 주기 거래 평균가 기준 — 시세 갱신을 누르면 지금 거래소 최저가로 다시 계산됩니다'}
        </p>

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
                  {hasNext
                    ? '다음 페이지를 넘겨보거나, 드롭다운을 "업로드순"으로 바꿔보세요'
                    : '드롭다운을 "업로드순"으로 바꿔보세요'}
                </p>
              </div>
            ) : (
              <div className={styles.galleryGrid}>
                {/* 아제나의 축복 — 코드로 박아둔 공식 패키지. 1페이지 첫 칸에만 둔다
                    (매 페이지 반복하면 페이지를 넘겨도 첫 칸이 그대로라 바뀐 게 안 보인다).
                    바로 뒤가 첫 광고 자리(단위 0번) — 아제나가 빠지는 2페이지부터는
                    글 카드 사이 광고가 단위 0번부터 쓴다. */}
                {saleFilter !== 'ended' && page === 1 && (
                  <>
                    <AzenaBlessingGalleryCard
                      latestPrices={effectivePrices}
                      commonWonPer100Gold={deferredCommonRate}
                    />
                    <div className={`d-block d-md-none ${styles.mobileAdSlot} ${styles.betweenCardsAd}`}>
                      <AdBanner slot="8616653628" index={0} />
                    </div>
                  </>
                )}
                {visiblePosts.map((post, index) => {
                  // 마지막 카드 뒤에는 붙이지 않는다. 1페이지는 아제나 뒤 광고가 단위 0번을
                  // 먼저 쓰므로 여기 자리들은 1번부터, 2페이지부터는 0번부터 받는다.
                  const adAfterIndex = page === 1 ? AD_AFTER_CARD_INDEX_PAGE1 : AD_AFTER_CARD_INDEX_REST;
                  const adUnitOffset = page === 1 ? 1 : 0;
                  const adSlotIndex = adAfterIndex.indexOf(index);
                  const showAd = adSlotIndex !== -1 && index < visiblePosts.length - 1;
                  return (
                    <React.Fragment key={post.id}>
                      <PackageGalleryCard
                        post={post}
                        latestPrices={effectivePrices}
                        commonWonPer100Gold={deferredCommonRate}
                      />
                      {/* 모바일 전용(d-md-none). 자리마다 다른 애드핏 단위를 받는다 —
                          같은 단위를 반복하면 애드핏이 첫 자리만 채우고 나머지는 안 나온다. */}
                      {showAd && (
                        <div className={`d-block d-md-none ${styles.mobileAdSlot} ${styles.betweenCardsAd}`}>
                          <AdBanner slot="8616653628" index={adSlotIndex + adUnitOffset} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {((totalPages ?? 1) > 1 || page > 1 || hasNext) && (
              <nav className={styles.pagination} aria-label="페이지 이동">
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                >
                  이전
                </button>
                {/* count 실패 시(totalPages null) 번호는 방문한 범위까지만 그린다 */}
                {buildPageList(page, totalPages ?? maxLoaded).map((p, i) =>
                  p === 'gap' ? (
                    <span key={`gap-${i}`} className={styles.pageGap}>…</span>
                  ) : (
                    <button
                      type="button"
                      key={p}
                      className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                      onClick={() => handlePageChange(p)}
                      // Firestore 커서 특성상 "방문한 끝 + 1"까지만 열린다 — 그 너머는 중간을
                      // 전부 읽어야 갈 수 있어 비활성으로 막는다
                      disabled={loading || (!modulePageCache.has(p) && p > maxLoaded + 1)}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!hasNext || loading}
                >
                  다음
                </button>
              </nav>
            )}

            {/* 페이지 버튼 아래 320×100 — index 없이 호출하면 단일 인-콘텐츠 단위를 쓴다.
                key={page}: 페이지를 넘길 때마다 새 광고를 받는다 (가운데 띠배너들은 글 목록이
                갈리면서 저절로 리마운트되지만 이 자리는 페이지 버튼처럼 남는 요소라 직접 갈아줘야 한다) */}
            <div key={`ad-bottom-${page}`} className={`d-block d-md-none ${styles.mobileAdSlot} ${styles.belowPagerAd}`}>
              <AdBanner slot="8616653628" />
            </div>

            {/* 데스크톱 — 페이지 버튼 아래 728×90 가로 배너 (모바일은 위 320×100 이 담당).
                단위 미발급 동안(unit 빈 문자열) 자리째 렌더하지 않는다. key={page}: 페이지마다 새 광고.
                d-md-block 으로 숨겨도 모바일에서 마운트·요청은 나가므로 뷰포트(≥768)가 확인될 때만 렌더 */}
            {ADFIT_ENABLED && ADFIT_UNITS.galleryBottomDesktop.unit && isMobileMd === false && (
              <div className={`d-none d-md-block ${styles.desktopAdSlot}`}>
                <AdFitUnit
                  key={`ad-bottom-desktop-${page}`}
                  unit={ADFIT_UNITS.galleryBottomDesktop.unit}
                  width={ADFIT_UNITS.galleryBottomDesktop.width}
                  height={ADFIT_UNITS.galleryBottomDesktop.height}
                />
              </div>
            )}
          </>
        )}

        <GuideFaq
          relatedGuides={['/guide/market-price']}
          article={<PackageEfficiencyGuideBody />}
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
                '정렬과 필터는 지금 보고 있는 페이지의 게시물 안에서 즉시 다시 계산됩니다. 지난 게시물은 목록 아래 페이지 번호로 넘겨서 확인할 수 있습니다. 각 카드에 표시되는 이득률은 실시간 시세 기준으로 계산되므로, 같은 패키지라도 등록 시점과 지금 보는 시점의 값이 달라질 수 있습니다.',
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
