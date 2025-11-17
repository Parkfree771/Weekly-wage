'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import styles from './page.module.css';

// Dynamic imports로 코드 분할 - 초기 로딩 속도 개선
const PriceChartContainer = dynamic(() => import('@/components/PriceChartContainer'), {
  loading: () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  )
});

export default function Home() {
  const [footerOpen, setFooterOpen] = useState(false);

  return (
    <div className={styles.mainContainer}>
      <ThemeToggleButton />
      <Container fluid className="mt-3 mt-md-4">
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            {/* 사이트 제목 */}
            <div className="text-center mb-3 mb-md-4">
              <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                <Image src="/icon.png" alt="로고" width={40} height={40} priority style={{ width: 'clamp(2rem, 4.5vw, 2.5rem)', height: 'auto' }} />
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
                  로스트아크 골드 계산기
                </h1>
              </div>
            </div>

            {/* 기능 버튼들 */}
            <div className="mb-4 mb-md-5 mt-2 mt-md-0">
              <Row className="justify-content-center g-2 g-sm-3">
                <Col xs={5} sm={5} md={5} lg={4}>
                  <Link href="/weekly-gold" className="text-decoration-none">
                    <Card
                      className="border-0 shadow-lg h-100 text-center py-2 py-sm-4 px-1 px-sm-3"
                      style={{
                        borderRadius: 'clamp(10px, 3vw, 16px)',
                        backgroundColor: 'var(--card-body-bg-blue)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <div className="d-flex justify-content-center mb-1 mb-sm-2">
                        <Image src="/gold.jpg" alt="골드" width={64} height={64} style={{ borderRadius: '8px', width: 'clamp(36px, 10vw, 64px)', height: 'auto' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.8rem, 2.5vw, 1.3rem)',
                          background: 'var(--gradient-text-blue)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        주간 골드 계산
                      </h3>
                      <p style={{ fontSize: 'clamp(0.6rem, 1.8vw, 0.9rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        원정대 주간 골드 수익과<br/>더보기 보상 손익을 계산
                      </p>
                    </Card>
                  </Link>
                </Col>
                <Col xs={5} sm={5} md={5} lg={4}>
                  <Link href="/refining" className="text-decoration-none">
                    <Card
                      className="border-0 shadow-lg h-100 text-center py-2 py-sm-4 px-1 px-sm-3"
                      style={{
                        borderRadius: 'clamp(10px, 3vw, 16px)',
                        backgroundColor: 'var(--card-body-bg-stone)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <div className="d-flex justify-content-center mb-1 mb-sm-2">
                        <Image src="/banner_share.jpg" alt="재련" width={64} height={64} style={{ borderRadius: '8px', objectFit: 'cover', width: 'clamp(36px, 10vw, 64px)', height: 'auto' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.8rem, 2.5vw, 1.3rem)',
                          background: 'var(--gradient-text-stone)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        T4 재련 비용 계산
                      </h3>
                      <p style={{ fontSize: 'clamp(0.6rem, 1.8vw, 0.9rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        목표 레벨까지 필요한<br/>재련 재료와 골드 계산
                      </p>
                    </Card>
                  </Link>
                </Col>
              </Row>
            </div>

            {/* 가격 추이 그래프 섹션 */}
            <div className="mt-3">
              <Row className="justify-content-center">
                <Col xl={9} lg={10} md={12}>
                  <Card className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent' }}>
                    <Card.Header
                      className="text-center py-2 border-0"
                      style={{
                        background: 'var(--card-header-bg-stone)',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      <h3
                        className="mb-0"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                          background: 'var(--gradient-text-stone)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          letterSpacing: '-0.025em'
                        }}
                      >
                        거래소 & 경매장 가격 추이
                      </h3>
                    </Card.Header>
                    <Card.Body
                      className="p-2 p-md-3"
                      style={{
                        background: 'var(--card-body-bg-stone)',
                        borderRadius: '0 0 16px 16px'
                      }}
                    >
                      <PriceChartContainer />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* 가격 차이 안내 */}
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
                      경매장 가격 수집 빈도 차이로 인게임 가격과 다소 차이가 있을 수 있습니다. 추세 참고만 하시고 실제 가격은 인게임에서 확인 부탁드립니다.
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

          </Col>
        </Row>
      </Container>

      <footer className="footer-fixed">
        <Container>
          {/* 간단한 기본 푸터 */}
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <div className="mb-2">
                <p className="small mb-1" style={{ color: 'var(--text-muted)' }}>
                  &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-primary)' }}>로스트아크 골드 계산기</strong>
                </p>
                <div className="d-flex justify-content-center gap-3 mb-2">
                  <a href="/privacy" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                    개인정보처리방침
                  </a>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <a href="/terms" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                    이용약관
                  </a>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  style={{ color: 'var(--text-muted)' }}
                  className="p-0 border-0"
                  onClick={() => setFooterOpen(!footerOpen)}
                >
                  {footerOpen ? '▲ 사이트 정보 접기' : '▼ 사이트 정보 더보기'}
                </Button>
              </div>
            </Col>
          </Row>

          {/* 확장 가능한 상세 정보 */}
          <Collapse in={footerOpen}>
            <div>
              <hr className="my-3" style={{opacity: 0.3, borderColor: 'var(--border-color)'}} />
              <Row className="justify-content-center">
                <Col lg={8} md={10}>
                  <Row className="gy-4 text-center text-md-start">
                    {/* 사이트 설명 */}
                    <Col md={6}>
                      <h6 className="fw-semibold mb-3 text-primary" style={{ background: 'var(--footer-text-primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>서비스 소개</h6>
                      <p className="small mb-3" style={{ color: 'var(--text-muted)' }}>
                        원정대 주간 골드 수익을 계산하고 더보기 보상의 손익을 분석하여
                        효율적인 로스트아크 플레이를 도와드립니다.
                      </p>
                      <div className="small" style={{ color: 'var(--text-muted)' }}>
                        <div>🌐 <strong style={{ color: 'var(--text-primary)' }}>사이트:</strong> lostarkweeklygold.kr</div>
                        <div>🔄 <strong style={{ color: 'var(--text-primary)' }}>갱신:</strong> 매시 정각</div>
                        <div>📊 <strong style={{ color: 'var(--text-primary)' }}>데이터:</strong> 로스트아크 공식 API</div>
                      </div>
                    </Col>

                    {/* 주요 기능 */}
                    <Col md={6}>
                      <h6 className="fw-semibold mb-3 text-success" style={{ color: 'var(--text-primary)' }}>주요 기능</h6>
                      <ul className="list-unstyled small" style={{ color: 'var(--text-muted)' }}>
                        <li className="mb-1">✓ 캐릭터별 주간 골드 수익 계산</li>
                        <li className="mb-1">✓ 레이드 더보기 보상 손익 분석</li>
                        <li className="mb-1">✓ 실시간 거래소 가격 반영</li>
                        <li className="mb-1">✓ 효율적인 골드 파밍 가이드</li>
                      </ul>
                    </Col>
                  </Row>

                  <div className="text-center mt-4">
                    <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
                      본 사이트는 로스트아크 공식 서비스가 아니며, 스마일게이트와 무관한 팬사이트입니다.
                    </p>
                    <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
                      Made with ❤️ for Lost Ark Players
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
