'use client';

import { Container, Row, Col, Card } from 'react-bootstrap';
import LifeMasterCalculator from '@/components/life-master/LifeMasterCalculator';

export default function LifeMasterPage() {
  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(180deg, rgb(var(--background-start-rgb)) 0%, rgb(var(--background-end-rgb)) 100%)' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            {/* SEO를 위한 정적 콘텐츠 */}
            <noscript>
              <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                <h1>생활 계산기</h1>
                <p>로스트아크 생활 콘텐츠 효율을 계산하고 아비도스 융화재료 제작 손익을 분석합니다.</p>
                <h2>주요 기능</h2>
                <ul>
                  <li>상급 아비도스 융화재료 제작 효율 계산</li>
                  <li>생활의 가루 수익 분석</li>
                  <li>벌목, 채광, 낚시, 수렵, 고고학 효율 비교</li>
                  <li>실시간 거래소 시세 반영</li>
                </ul>
                <h2>지원하는 생활 콘텐츠</h2>
                <ul>
                  <li>벌목: 부드러운 목재, 아비도스 목재</li>
                  <li>채광: 철 광석, 아비도스 광석</li>
                  <li>낚시: 생선류</li>
                  <li>수렵: 고기류</li>
                  <li>고고학: 유물류</li>
                </ul>
                <p>이 페이지는 JavaScript가 필요합니다. 브라우저에서 JavaScript를 활성화해주세요.</p>
              </div>
            </noscript>
            <LifeMasterCalculator />
          </Col>
        </Row>

      </Container>

      {/* 푸터 */}
      <footer style={{ padding: '1.5rem 0', marginTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-primary)' }}>로스트아크 골드 계산기</strong>
              </p>
              <div className="d-flex justify-content-center gap-3">
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
              </div>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
}
