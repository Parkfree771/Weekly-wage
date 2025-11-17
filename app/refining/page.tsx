'use client';

import { Container, Row, Col, Card } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import RefiningCalculator from '@/components/refining/RefiningCalculator';

export default function RefiningPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <ThemeToggleButton />
      <Container fluid className="mt-3 mt-md-4">
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            {/* 헤더 */}
            <div className="text-center mb-3 mb-md-4">
              <Link href="/" className="text-decoration-none">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-2" style={{ cursor: 'pointer' }}>
                  <Image
                    src="/banner_share.jpg"
                    alt="재련"
                    width={48}
                    height={48}
                    priority
                    style={{ borderRadius: '8px', width: 'clamp(2.5rem, 5vw, 3rem)', height: 'auto', objectFit: 'cover' }}
                  />
                  <h1
                    className="title mb-0"
                    style={{
                      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                      fontWeight: 700,
                      background: 'var(--gradient-text-stone)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    T4 재련 비용 계산
                  </h1>
                </div>
              </Link>
              <p className="mb-3" style={{fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', fontWeight: '400', color: 'var(--text-muted)'}}>
                목표 레벨까지 필요한 재련 재료와 골드를 계산해보세요
              </p>
            </div>

            {/* 재련 계산기 */}
            <RefiningCalculator />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
