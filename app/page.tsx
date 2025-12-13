'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import PriceComparisonStats from '@/components/PriceComparisonStats';
import { PriceChartProvider } from '@/components/PriceChartContainer';
import styles from './page.module.css';

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
            <div className="mb-2 mb-md-3 mt-3 mt-md-4">
              <Row className="justify-content-center g-2 g-sm-3">
                <Col xs={5} sm={5} md={4} lg={3} xl={3}>
                  <Link href="/weekly-gold" className="text-decoration-none">
                    <Card
                      className="border-0 shadow-lg h-100 text-center py-2 py-sm-3 px-1 px-sm-2"
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
                        <Image src="/gold.jpg" alt="골드" width={64} height={64} style={{ borderRadius: '8px', width: 'clamp(36px, 8vw, 52px)', height: 'auto' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.8rem, 2.2vw, 1.1rem)',
                          background: 'var(--gradient-text-blue)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        주간 골드 계산
                      </h3>
                      <p style={{ fontSize: 'clamp(0.6rem, 1.6vw, 0.85rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        원정대 주간 골드 수익과<br/>더보기 보상 손익을 계산
                      </p>
                    </Card>
                  </Link>
                </Col>
                <Col xs={5} sm={5} md={4} lg={3} xl={3}>
                  <Link href="/refining" className="text-decoration-none">
                    <Card
                      className="border-0 shadow-lg h-100 text-center py-2 py-sm-3 px-1 px-sm-2"
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
                        <Image src="/banner_share.jpg" alt="재련" width={64} height={64} style={{ borderRadius: '8px', objectFit: 'cover', width: 'clamp(36px, 8vw, 52px)', height: 'auto' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.8rem, 2.2vw, 1.1rem)',
                          background: 'var(--gradient-text-stone)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        T4 재련 비용 계산
                      </h3>
                      <p style={{ fontSize: 'clamp(0.6rem, 1.6vw, 0.85rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        목표 레벨까지 필요한<br/>재련 재료와 골드 계산
                      </p>
                    </Card>
                  </Link>
                </Col>
              </Row>
            </div>

            {/* 가격 추이 그래프 */}
            <Card className="border-0 shadow-lg mb-3" style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent', maxWidth: '1400px', margin: '0 auto 1rem auto' }}>
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
                <PriceChartProvider>
                  <PriceComparisonStats />
                </PriceChartProvider>
              </Card.Body>
            </Card>

            {/* 가격 차이 안내 */}
            <div
              className="px-3 py-2 d-flex align-items-center gap-2 mb-3"
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

            {/* 서비스 소개 섹션 */}
            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', backgroundColor: 'var(--card-body-bg-blue)' }}>
              <Card.Body className="p-3 p-md-4">
                <h2 className="h5 mb-3" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  로스트아크 골드 계산기란?
                </h2>
                <p style={{ fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
                  로스트아크 골드 계산기는 로스트아크 게임을 플레이하는 유저들을 위한 필수 도구입니다.
                  원정대 전체 캐릭터의 주간 골드 수익을 자동으로 계산하고, 레이드 더보기 보상의 실시간 손익을 분석하여
                  가장 효율적인 골드 파밍 전략을 제시합니다.
                </p>

                <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  주요 기능
                </h3>
                <ul style={{ fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.2rem' }}>
                  <li><strong>주간 골드 계산:</strong> 캐릭터명을 입력하면 원정대 전체의 주간 골드 수익을 자동으로 계산합니다.</li>
                  <li><strong>더보기 손익 분석:</strong> 각 레이드의 더보기 보상을 현재 거래소 가격으로 환산하여 손익을 실시간으로 분석합니다.</li>
                  <li><strong>T4 재련 비용 계산:</strong> 목표 레벨까지 필요한 재련 재료와 골드를 정확하게 계산해줍니다.</li>
                  <li><strong>실시간 가격 추이:</strong> 주요 재료와 아이템의 거래소/경매장 가격 변동을 그래프로 확인할 수 있습니다.</li>
                </ul>

                <h3 className="h6 mb-2 mt-3" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  데이터 출처
                </h3>
                <p style={{ fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '0.5rem' }}>
                  모든 데이터는 로스트아크 공식 API를 통해 수집되며, 매시간 정각에 자동으로 업데이트됩니다.
                  거래소 가격, 경매장 가격, 캐릭터 정보 등은 스마일게이트가 제공하는 공개 API를 통해 수집하여
                  사용자에게 정확한 정보를 제공합니다.
                </p>

                <div className="mt-3 p-2 rounded" style={{ backgroundColor: 'var(--card-header-bg-blue)', fontSize: 'clamp(0.75rem, 1.6vw, 0.85rem)' }}>
                  <p className="mb-0" style={{ color: 'var(--text-muted)' }}>
                    <strong>※ 알림:</strong> 본 사이트는 로스트아크 공식 서비스가 아니며, 스마일게이트와 무관한 개인이 운영하는 팬사이트입니다.
                    모든 계산 결과는 참고용이며, 실제 게임 내 상황과 다를 수 있습니다.
                  </p>
                </div>
              </Card.Body>
            </Card>

          </Col>
        </Row>
      </Container>

      <footer className="footer-fixed">
        <Container>
          {/* 간단한 기본 푸터 */}
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-primary)' }}>로스트아크 골드 계산기</strong>
              </p>
              <div className="d-flex justify-content-center align-items-center gap-2 gap-sm-3 flex-wrap">
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
