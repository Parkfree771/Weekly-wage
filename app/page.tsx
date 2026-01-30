'use client';

import dynamic from 'next/dynamic';
import { Container, Row, Col, Card } from 'react-bootstrap';
import ContactForm from '@/components/ContactForm';
import PriceDashboard from '@/components/PriceDashboard';
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

        {/* 문의하기 & 업데이트 내역 */}
        <Row className="g-3 mt-2">
          <Col md={6}>
            <Card className="h-100" style={{ overflow: 'hidden' }}>
              <Card.Header
                className="py-2"
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
                  문의하기
                </h3>
              </Card.Header>
              <Card.Body className="p-0" style={{ overflow: 'hidden' }}>
                <ContactForm />
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
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
              <Card.Body className="p-3">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
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
