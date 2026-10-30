'use client';

import dynamic from 'next/dynamic';
import { preload } from 'react-dom';
import { Container } from 'react-bootstrap';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import styles from './page.module.css';
import type { ItemQuote } from '@/components/ItemSelector';
import type { PackagePost } from '@/types/package';
import MarketHero from '@/components/MarketHero';

// 차트 틀(카테고리·아이템 버튼)은 서버에서도 그린다 — 서버가 넘긴 시세(initialQuotes)가 아이템 버튼에
// 첫 HTML 부터 실려 스피너 없이 보이고 검색엔진도 읽는다. 차트 그림 자체(Compact/MiniPriceChart)는
// PriceChartContainer 안에서 여전히 클라이언트 전용이다.
// ("오늘의 시세" 카드 줄은 2026-10 리프레시에서 뺐다 — 같은 시세를 아이템 버튼이 보여 준다)

const PriceComparisonStats = dynamic(() => import('@/components/PriceComparisonStats'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-secondary" role="status">
        <span className="visually-hidden">차트 로딩중...</span>
      </div>
    </div>
  ),
  ssr: false
});

// 특별 이벤트 대비 현재가 — 차트 컨텍스트를 읽으므로 PriceChartProvider 안에서만 산다
const PriceEventCompare = dynamic(() => import('@/components/PriceEventCompare'), { ssr: false });

// 시세 히트맵(주식 히트맵 스타일) — 칸을 누르면 위 차트가 그 아이템으로 바뀐다(차트 컨텍스트 사용).
// 서버 시세(initialQuotes)로 첫 HTML 부터 그려 검색 봇도 종목·등락을 읽는다.
const MarketHeatmap = dynamic(() => import('@/components/MarketHeatmap'));

const PriceChartProvider = dynamic(
  () => import('@/components/PriceChartContainer').then(mod => ({ default: mod.PriceChartProvider })),
  {
    loading: () => <div style={{ minHeight: '650px' }} />,
  }
);


export default function HomeClient({ initialQuotes, asOf, packages }: {
  initialQuotes?: Record<string, ItemQuote>;
  asOf?: string;
  /** 맨 위 띠에 얹을 판매 중 패키지(서버가 lib/home-packages.ts 로 읽어 넘긴다) */
  packages?: PackagePost[];
}) {
  // 가격 히스토리 preload — 메인 시세 차트 전용이라 루트 레이아웃이 아닌 여기서만.
  // fetch URL과 정확히 일치해야 브라우저가 preload를 재사용함(price-history-client.ts).
  preload('/data/history_archive.json', { as: 'fetch', crossOrigin: 'anonymous' });
  preload('/api/price-data/history', { as: 'fetch', crossOrigin: 'anonymous' });

  return (
    <div className={styles.mainContainer}>
      <Container fluid className="mt-2 mt-md-3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 맨 위 띠 — 알데바란의 바다 배경 + 판매 중 패키지 */}
        <MarketHero packages={packages} />

        {/* 가격 추이 차트 */}
        {/* 광고와 이벤트 대비 카드까지 Provider 안에 둔다 — Provider 는 children 을 차트 바로 뒤에
            그대로 내보내므로 화면 순서는 그대로이고, 카드가 차트 컨텍스트(선택 아이템)를 읽을 수 있다 */}
        {/* 아래 블록들은 간격을 styles.homeBlock 한 곳에서만 준다 — 콘텐츠·광고가 번갈아 나오는
            구간이라 사이 간격이 제각각이면 광고가 어느 콘텐츠에 딸린 건지 안 읽힌다. */}
        <PriceChartProvider initialQuotes={initialQuotes}>
          {/* 가격 분석 통계 */}
          <div className={styles.homeBlock}>
            <PriceComparisonStats />
          </div>

          {/* 데스크톱 가로 띠 — 통계 바와 이벤트 대비 카드 사이. 콘텐츠가 바뀌는 경계라 자연스럽다.
              2026-10-30 큰 가로(높이 250) 시험 자리 — 얇은 가로와 수익 비교용(adConfig desktopTall) */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-none d-lg-block`}>
            <DesktopBannerAd tall />
          </div>

          {/* 모바일 인-콘텐츠 광고 — 앱 홈(통계 바 아래)과 동일 위치 */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-block d-lg-none`}>
            <AdBanner />
          </div>

          {/* 특별 이벤트 대비 현재가 — 위 차트가 보고 있는 아이템을 그대로 따라간다 */}
          <div className={styles.homeBlock}>
            <PriceEventCompare />
          </div>

          {/* 이벤트 대비 카드 ↔ 시세 히트맵 경계 광고 (데스크톱·모바일 각각) — 2026-10-30 추가 */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-none d-lg-block`}>
            <DesktopBannerAd />
          </div>
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-block d-lg-none`}>
            <AdBanner />
          </div>

          {/* 시세 히트맵 — 이벤트 대비 카드 아래(사이에 광고 한 줄), 크게 */}
          <div className={styles.homeBlock}>
            <MarketHeatmap initialQuotes={initialQuotes} asOf={asOf} />
          </div>

          {/* 히트맵 아래 광고 (데스크톱·모바일 각각) — 홈 본문의 마지막 광고 자리 */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-none d-lg-block`}>
            <DesktopBannerAd />
          </div>

          {/* 모바일 — 히트맵 아래 */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-block d-lg-none`}>
            <AdBanner />
          </div>
        </PriceChartProvider>

        {/* 사이트 소개 — 홈의 유일한 h1. 2026-09-04 접기 토글 제거: 항상 노출 */}
        <div className="mt-4 mt-md-5">
          <h1 className="h4 mb-2">로아로골 - 로아 패키지 효율 &amp; 시세 차트</h1>
        </div>

      </Container>
    </div>
  );
}
