'use client';

import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import ExtremePromoBanner from '@/components/ads/ExtremePromoBanner';

const HellRewardCalculator = dynamic(
  () => import('@/components/hell-reward/HellRewardCalculator'),
  { ssr: false }
);

export default function HellRewardPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
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
                지옥 보상 계산기
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                층수별 보상을 실시간 시세 기반으로 골드 가치를 계산합니다
              </p>
            </div>

            <ExtremePromoBanner />
            <HellRewardCalculator />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
