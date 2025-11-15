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
                <div className="d-flex justify-content-center align-items-center gap-2 mb-2" style={{ cursor: 'pointer' }}>
                  <Image
                    src="/icon.png"
                    alt="로고"
                    width={40}
                    height={40}
                    priority
                    style={{ width: 'clamp(2rem, 4.5vw, 2.5rem)', height: 'auto' }}
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
                    재련 비용 계산기
                  </h1>
                </div>
              </Link>
              <p className="mb-3" style={{fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', fontWeight: '400', color: 'var(--text-muted)'}}>
                목표 레벨까지 필요한 재련 재료와 골드를 계산해보세요
              </p>
            </div>

            {/* 재련 계산기 */}
            <div className="mt-3">
              <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent'}}>
                <Card.Header
                  className="text-center py-2 border-0"
                  style={{
                    background: 'var(--card-header-bg-violet)',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <h3
                    className="mb-0"
                    style={{
                      fontWeight: '600',
                      fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                      background: 'var(--gradient-text-violet)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.025em'
                    }}
                  >
                    재련 시뮬레이터
                  </h3>
                </Card.Header>
                <Card.Body className="p-2 p-md-3" style={{backgroundColor: 'var(--card-body-bg-blue)'}}>
                  <RefiningCalculator />
                </Card.Body>
              </Card>
            </div>

            {/* 안내사항 */}
            <div className="mt-3">
              <Row className="justify-content-center">
                <Col xl={9} lg={10} md={12}>
                  <div
                    className="px-3 py-2 d-flex align-items-center gap-2"
                    style={{
                      background: 'var(--card-body-bg-stone)',
                      borderLeft: '3px solid #fb923c',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)',
                      color: 'var(--text-secondary)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
                    <span style={{ lineHeight: '1.4' }}>
                      1640 레벨(+11) 이상의 장비만 계산 가능합니다. 재련 확률과 장인의 기운 시스템을 반영한 평균 비용을 제공합니다.
                    </span>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
