'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import ContactForm from '@/components/ContactForm';
import styles from './page.module.css';

// Recharts를 사용하는 컴포넌트를 Dynamic Import로 지연 로드 (초기 번들 크기 감소)
const PriceComparisonStats = dynamic(() => import('@/components/PriceComparisonStats'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <ThemeToggleButton />
      <Container fluid className="mt-3 mt-md-4">
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            {/* 사이트 제목 */}
            <div className="text-center mb-3 mb-md-4">
              <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                <Image src="/icon.png" alt="로스트아크 골드 계산기 로고" width={40} height={40} priority style={{ width: 'clamp(2rem, 4.5vw, 2.5rem)', height: 'auto', aspectRatio: '1/1' }} />
                <h1
  className="title mb-0"
  style={{
    fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
    fontWeight: 700,
    backgroundImage: 'var(--gradient-text-stone)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em'
  }}
>
  {/* 👇 여기가 핵심입니다. 로봇과 사용자 모두에게 '세르카'를 보여줍니다 */}
  주간 골드 계산기
</h1>
              </div>

              {/* SEO를 위한 정적 콘텐츠 - 검색엔진만 읽음 */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>세르카 레이드 보상 및 주간 골드 계산</h2>
    {/* 설명 구체화 */}
    <p>세르카(1710) 레이드 클리어 골드와 더보기 효율을 완벽 분석합니다. 카제로스 및 에키드나 레이드 수익도 한눈에 확인하세요.</p>
                  <h3>지원 레이드</h3>
                  <ul>
                    <li><strong>카제로스 레이드:</strong> 종막, 4막, 3막, 2막, 1막</li>
                    <li><strong>그림자 레이드:</strong> 세르카, 고통의 마녀</li>
                  </ul>
                  <h3>계산 가능 항목</h3>
                  <ul>
                    <li>원정대 주간 골드 수익 계산</li>
                    <li>레이드 더보기 보상 손익 분석</li>
                    <li>T4 재련 비용 및 재료 계산</li>
                    <li>실시간 아이템 시세 확인 (명예의 파편, 파괴강석, 수호강석, 돌파석 등)</li>
                  </ul>
                </div>
              </noscript>
            </div>

            {/* 기능 버튼들 */}
            <div className="mb-2 mb-md-3 mt-3 mt-md-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <Row className="justify-content-center g-2 g-sm-3">
                <Col xs={4} sm={4} md={4} lg={3} xl={3}>
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
                        <Image src="/gold.webp" alt="로아 주간 골드 계산 아이콘" width={64} height={64} style={{ borderRadius: '8px', width: 'clamp(32px, 7vw, 52px)', height: 'auto', aspectRatio: '1/1' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.7rem, 2vw, 1.1rem)',
                          background: 'var(--gradient-text-blue)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        주간 골드 계산
                      </h3>
                      <p style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.85rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        원정대 주간 골드 수익과<br/>더보기 보상 손익을 계산
                      </p>
                    </Card>
                  </Link>
                </Col>
                <Col xs={4} sm={4} md={4} lg={3} xl={3}>
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
                        <Image src="/banner_share.webp" alt="로아 T4 재련 비용 계산 아이콘" width={64} height={64} style={{ borderRadius: '8px', objectFit: 'cover', width: 'clamp(32px, 7vw, 52px)', height: 'auto', aspectRatio: '1/1' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.7rem, 2vw, 1.1rem)',
                          background: 'var(--gradient-text-stone)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        T4 재련 비용 계산
                      </h3>
                      <p style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.85rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        목표 레벨까지 필요한<br/>재련 재료와 골드 계산
                      </p>
                    </Card>
                  </Link>
                </Col>
                <Col xs={4} sm={4} md={4} lg={3} xl={3}>
                  <Link href="/life-master" className="text-decoration-none">
                    <Card
                      className="border-0 shadow-lg h-100 text-center py-2 py-sm-3 px-1 px-sm-2"
                      style={{
                        borderRadius: 'clamp(10px, 3vw, 16px)',
                        backgroundColor: 'var(--card-body-bg-orange)',
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
                        <Image src="/abidos-fusion3.webp" alt="로아 생활의 달인 아이콘" width={64} height={64} style={{ borderRadius: '8px', objectFit: 'cover', width: 'clamp(32px, 7vw, 52px)', height: 'auto', aspectRatio: '1/1' }} />
                      </div>
                      <h3
                        className="mb-1 mb-sm-2"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(0.7rem, 2vw, 1.1rem)',
                          background: 'var(--gradient-text-orange)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        생활의 달인
                      </h3>
                      <p style={{ fontSize: 'clamp(0.55rem, 1.4vw, 0.85rem)', color: 'var(--text-muted)', marginBottom: 0, lineHeight: '1.3' }}>
                        아비도스 융화재료<br/>제작 손익과 극한 효율
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
                  borderRadius: '0 0 16px 16px',
                  minHeight: '500px'
                }}
              >
                <PriceChartProvider>
                  <PriceComparisonStats />
                </PriceChartProvider>
              </Card.Body>
            </Card>

            {/* 문의하기 섹션 */}
            <div style={{ maxWidth: '700px', margin: '0 auto 0 auto' }}>
              <Card className="border-0 shadow-lg mb-3" style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent' }}>
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
                    문의하기
                  </h3>
                </Card.Header>
                <Card.Body className="p-0" style={{ background: 'var(--card-body-bg-stone)', borderRadius: '0 0 16px 16px', overflow: 'hidden', minHeight: '380px' }}>
                  <ContactForm />
                </Card.Body>
              </Card>
            </div>

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
