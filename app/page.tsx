'use client';

import dynamic from 'next/dynamic';
import { Container, Row, Col, Card } from 'react-bootstrap';
import InquiryBoard from '@/components/inquiry/InquiryBoard';
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

        {/* 문의하기 & 업데이트 내역 */}
        <Row className="g-3 mt-3">
          <Col md={6} className="order-2 order-md-1">
            <InquiryBoard />
          </Col>

          <Col md={6} className="order-1 order-md-2">
            <Card className="h-100" style={{ overflow: 'hidden' }}>
              <Card.Header
                className="py-2"
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                  업데이트 내역
                </h3>
              </Card.Header>
              <Card.Body className="p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.21</span>
                    <span style={{ color: 'var(--text-primary)' }}>주간 계산 재료가치 계산 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.20</span>
                    <span style={{ color: 'var(--text-primary)' }}>마이페이지 카던, 가토 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.16</span>
                    <span style={{ color: 'var(--text-primary)' }}>마이페이지 카게, 필보, 복주머니 체크 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.15</span>
                    <span style={{ color: 'var(--text-primary)' }}>패키지 등록 페이지 구성품 추가 및 거래소 시세 연동 적용</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}></span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>패키지 추가해주신 분들께 격한 감사를 표합니다. 운명의 파편은 아이콘이 주머니지만, 주머니 개수가 아닌 파편 총 개수를 입력해주세요.</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.13</span>
                    <span style={{ color: 'var(--text-primary)' }}>재련 시뮬 속도 개선, 재료 선택 버튼 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.12</span>
                    <span style={{ color: 'var(--text-primary)' }}>지옥 시뮬 속도 개선 및 높이 수정</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.11</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      패키지 가격 추가 (티켓 등 관리자가 임의로 가격 설정했습니다. 특히 지옥, 나락 등 가격을 측정하기 애매한 상품들이 있습니다. 각 품목 가격 어떻게 설정하면 좋을지 의견 있으시면 옆 문의하기로 보내주시면 감사하겠습니다.) &#8592;
                    </span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.09</span>
                    <span style={{ color: 'var(--text-primary)' }}>패키지 효율 계산기 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.05</span>
                    <span style={{ color: 'var(--text-primary)' }}>생활 계산 리뉴얼, 마이페이지 주간 골드 기록 차트 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.02</span>
                    <span style={{ color: 'var(--text-primary)' }}>지옥 시뮬 추가 (추후 보상, 패키지 정보 추가 예정)</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>02.01</span>
                    <span style={{ color: 'var(--text-primary)' }}>붕괴, 불변 이미지 오류 수정</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.31</span>
                    <span style={{ color: 'var(--text-primary)' }}>자동강화 속도 표시 수정, 차트 오늘의 시세 커스텀 기능 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.30</span>
                    <span style={{ color: 'var(--text-primary)' }}>로그인 기능 추가, 원정대 등록 (추후 차트 커스텀화 기능 추가 등 다양한 기능 추가 예정)</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.29</span>
                    <span style={{ color: 'var(--text-primary)' }}>자동강화 속도 선택버튼 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.29</span>
                    <span style={{ color: 'var(--text-primary)' }}>계승 후 16→17→18→19 숨결 개수 수정</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.27</span>
                    <span style={{ color: 'var(--text-primary)' }}>메인 페이지 리뉴얼</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.26</span>
                    <span style={{ color: 'var(--text-primary)' }}>상급 재련 실제 시뮬 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.26</span>
                    <span style={{ color: 'var(--text-primary)' }}>벌목 보유 재료 입력 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.24</span>
                    <span style={{ color: 'var(--text-primary)' }}>더보기 효율 체크 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.23</span>
                    <span style={{ color: 'var(--text-primary)' }}>홈 버튼 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.22</span>
                    <span style={{ color: 'var(--text-primary)' }}>강화 실제 시뮬 추가</span>
                  </li>
                  <li style={{ padding: '0.35rem 0' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.5rem' }}>01.07</span>
                    <span style={{ color: 'var(--text-primary)' }}>종막 하드 더보기 정보 변경</span>
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
