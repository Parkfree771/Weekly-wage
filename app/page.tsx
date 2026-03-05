'use client';

import dynamic from 'next/dynamic';
import { Container } from 'react-bootstrap';
import PriceDashboard from '@/components/PriceDashboard';
import AdBanner from '@/components/ads/AdBanner';
import styles from './page.module.css';

// Recharts를 사용하는 컴포넌트를 Dynamic Import로 지연 로드
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

const PriceChartProvider = dynamic(
  () => import('@/components/PriceChartContainer').then(mod => ({ default: mod.PriceChartProvider })),
  { ssr: false }
);

const UserPriceGrid = dynamic(() => import('@/components/UserPriceGrid'), { ssr: false });

export default function Home() {
  return (
    <div className={styles.mainContainer}>
      <Container fluid className="mt-2 mt-md-3" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* SEO를 위한 정적 콘텐츠 - 검색엔진만 읽음 */}
        <noscript>
          <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
            <h2>세르카 레이드 보상 및 주간 골드 계산</h2>
            <p>세르카(1710) 레이드 클리어 골드와 더보기 효율을 완벽 분석합니다.</p>
          </div>
        </noscript>

        {/* 오늘의 시세 + 가격 추이 차트 */}
        <PriceChartProvider dashboard={<div className="mb-3"><PriceDashboard /></div>}>
          {/* 가격 분석 통계 */}
          <PriceComparisonStats />
        </PriceChartProvider>

        {/* 모바일 중간 광고 */}
        <div className="d-block d-lg-none my-3">
          <AdBanner slot="8616653628" />
        </div>

        {/* 나의 시세 모아보기 (사용자 커스텀 3×3 그리드) */}
        <UserPriceGrid />

      </Container>
    </div>
  );
}
