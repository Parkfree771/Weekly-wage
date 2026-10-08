'use client';

import dynamic from 'next/dynamic';
import { preload } from 'react-dom';
import { Container } from 'react-bootstrap';
import Link from 'next/link';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
import styles from './page.module.css';
import type { DashboardPrice } from '@/components/PriceDashboard';

// 대시보드와 차트 틀은 서버에서도 그린다 — 서버가 넘긴 시세(initialPrices)가 첫 HTML 에 실려
// 스피너 없이 바로 보이고 검색엔진도 읽는다. 차트 그림 자체(Compact/MiniPriceChart)는
// PriceChartContainer 안에서 여전히 클라이언트 전용이다.
const PriceDashboard = dynamic(() => import('@/components/PriceDashboard'), {
  loading: () => <div style={{ minHeight: '320px' }} />,
});

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

const PriceChartProvider = dynamic(
  () => import('@/components/PriceChartContainer').then(mod => ({ default: mod.PriceChartProvider })),
  {
    loading: () => <div style={{ minHeight: '650px' }} />,
  }
);


export default function HomeClient({ initialPrices, initialDate }: {
  initialPrices?: Record<string, DashboardPrice>;
  initialDate?: string;
}) {
  // 가격 히스토리 preload — 메인 시세 차트 전용이라 루트 레이아웃이 아닌 여기서만.
  // fetch URL과 정확히 일치해야 브라우저가 preload를 재사용함(price-history-client.ts).
  preload('/data/history_archive.json', { as: 'fetch', crossOrigin: 'anonymous' });
  preload('/api/price-data/history', { as: 'fetch', crossOrigin: 'anonymous' });

  return (
    <div className={styles.mainContainer}>
      <Container fluid className="mt-2 mt-md-3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 오늘의 시세 + 가격 추이 차트 */}
        {/* 광고와 이벤트 대비 카드까지 Provider 안에 둔다 — Provider 는 children 을 차트 바로 뒤에
            그대로 내보내므로 화면 순서는 그대로이고, 카드가 차트 컨텍스트(선택 아이템)를 읽을 수 있다 */}
        {/* 아래 블록들은 간격을 styles.homeBlock 한 곳에서만 준다 — 콘텐츠·광고가 번갈아 나오는
            구간이라 사이 간격이 제각각이면 광고가 어느 콘텐츠에 딸린 건지 안 읽힌다. */}
        <PriceChartProvider dashboard={<div className="mb-3"><PriceDashboard initialPrices={initialPrices} initialDate={initialDate} /></div>}>
          {/* 가격 분석 통계 */}
          <div className={styles.homeBlock}>
            <PriceComparisonStats />
          </div>

          {/* 데스크톱 728×90 — 통계 바와 이벤트 대비 카드 사이. 콘텐츠가 바뀌는 경계라 자연스럽다.
              홈에서는 galleryBottomDesktop 을 여기서만 쓰므로 한 페이지 한 단위 원칙에 어긋나지 않는다. */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-none d-lg-block`}>
            <DesktopBannerAd adfit={ADFIT_UNITS.galleryBottomDesktop} />
          </div>

          {/* 모바일 인-콘텐츠 광고 — 앱 홈(통계 바 아래)과 동일 위치 */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-block d-lg-none`}>
            <AdBanner />
          </div>

          {/* 특별 이벤트 대비 현재가 — 위 차트가 보고 있는 아이템을 그대로 따라간다 */}
          <div className={styles.homeBlock}>
            <PriceEventCompare />
          </div>

          {/* 이벤트 대비 카드 ↔ 매수가 보드 경계 광고 (데스크톱·모바일 각각).
              위아래 콘텐츠가 서로 다른 이야기라 경계로 자연스럽고, 앞뒤로 광고가 붙지 않는다.

              데스크톱 728×90 — 이 페이지 위쪽 자리가 이미 galleryBottomDesktop 을 쓰므로
              반드시 다른 단위여야 한다. 같은 단위를 한 페이지에 두 번 넣으면 애드핏이 첫 자리만 채운다. */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-none d-lg-block`}>
            <DesktopBannerAd adfit={ADFIT_UNITS.refiningResultDesktop} />
          </div>

          {/* 모바일 320×50 — 홈의 세 번째 인-콘텐츠 자리. index 0 은 아래 보드 밑 자리가 쓰고 있어 1 을 준다
              (index 마다 다른 단위를 꺼내야 애드핏이 두 자리 다 채운다). */}
          <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-block d-lg-none`}>
            <AdBanner index={1} />
          </div>
        </PriceChartProvider>

        {/* 사이트 소개 — 홈의 유일한 h1. 2026-09-04 접기 토글 제거: 항상 노출 */}
        <div className="mt-4 mt-md-5">
          <h1 className="h4 mb-2">로아로골 - 로아 패키지 효율 &amp; 시세 차트</h1>
          <div className="d-flex flex-wrap gap-2">
            <Link href="/package" className="btn btn-sm btn-outline-primary">패키지 효율 계산기</Link>
            <Link href="/weekly-gold" className="btn btn-sm btn-outline-primary">주간 골드 계산기</Link>
            <Link href="/refining" className="btn btn-sm btn-outline-primary">재련 계산기</Link>
            <Link href="/hell-reward" className="btn btn-sm btn-outline-primary">지옥의 나락 보상</Link>
            <Link href="/life-master" className="btn btn-sm btn-outline-primary">생활의 달인</Link>
          </div>
        </div>

        {/* 모바일 인-콘텐츠 광고 3 — 사이트 소개 아래.
            원래 매수가 보드 아래에 있었는데 보드를 없애면서(2026-09-21) 이리로 내렸다.
            그냥 두면 바로 위 이벤트 대비 자리(index 1)와 광고 두 개가 연달아 붙는다.
            index 를 줘야 띠배너 배열에서 다른 단위를 꺼낸다 — 같은 단위를 한 페이지에
            두 번 넣으면 애드핏이 첫 자리만 채운다. */}
        <div className={`${styles.homeBlock} ${styles.homeAdBlock} d-block d-lg-none`}>
          <AdBanner index={0} />
        </div>

      </Container>
    </div>
  );
}
