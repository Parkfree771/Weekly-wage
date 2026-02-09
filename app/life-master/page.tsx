'use client';

import { Container, Row, Col } from 'react-bootstrap';
import LifeCraftCalculator from '@/components/life-master/LifeCraftCalculator';

export default function LifeMasterPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 헤더 - 재련 페이지와 동일한 구조 */}
            <div className="text-center mb-3" style={{ marginTop: 0 }}>
              <h1
                style={{
                  fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: 0,
                  marginBottom: '0.5rem'
                }}
              >
                생활 제작 계산기
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                아비도스 융화재료 제작 손익 계산
              </p>

              {/* SEO noscript */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>생활 제작 계산기</h2>
                  <p>로스트아크 아비도스 융화재료 제작 손익을 계산합니다.</p>
                </div>
              </noscript>
            </div>

            {/* 컨텐츠 */}
            <LifeCraftCalculator />
          </Col>
        </Row>

      </Container>
    </div>
  );
}
