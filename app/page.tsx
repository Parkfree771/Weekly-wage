'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
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
  const [footerOpen, setFooterOpen] = useState(false);

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

      <footer className="footer-fixed">
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-primary)' }}>로스트아크 골드 계산기</strong>
              </p>
              <div className="d-flex justify-content-center align-items-center gap-2 gap-sm-3 flex-wrap">
                <a href="/about" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  사이트 소개
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <a href="/privacy" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  개인정보처리방침
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <a href="/terms" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  이용약관
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <Button
                  variant="link"
                  size="sm"
                  style={{ color: 'var(--text-muted)' }}
                  className="p-0 border-0 small"
                  onClick={() => setFooterOpen(!footerOpen)}
                >
                  {footerOpen ? '▲ 접기' : '▼ 더보기'}
                </Button>
              </div>
            </Col>
          </Row>

          <Collapse in={footerOpen}>
            <div>
              <hr className="my-3" style={{opacity: 0.3, borderColor: 'var(--border-color)'}} />
              <Row className="justify-content-center">
                <Col lg={8} md={10}>
                  <Row className="gy-3 text-center text-md-start">
                    <Col md={6}>
                      <h6 className="fw-semibold mb-2" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>서비스 소개</h6>
                      <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                        원정대 주간 골드 수익을 계산하고 더보기 보상의 손익을 분석하여
                        효율적인 로스트아크 플레이를 도와드립니다.
                      </p>
                      <div className="small" style={{ color: 'var(--text-muted)' }}>
                        <div>🔄 갱신: 매시 정각</div>
                        <div>📊 데이터: 로스트아크 공식 API</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <h6 className="fw-semibold mb-2" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>주요 기능</h6>
                      <ul className="list-unstyled small" style={{ color: 'var(--text-muted)' }}>
                        <li className="mb-1">✓ 캐릭터별 주간 골드 수익 계산</li>
                        <li className="mb-1">✓ 레이드 더보기 보상 손익 분석</li>
                        <li className="mb-1">✓ 실시간 거래소 가격 반영</li>
                      </ul>
                    </Col>
                  </Row>
                  <div className="text-center mt-3">
                    <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
                      본 사이트는 로스트아크 공식 서비스가 아닙니다.
                    </p>
                  </div>
                </Col>
              </Row>
            </div>
          </Collapse>
        </Container>
      </footer>
    </div>
  );
}
