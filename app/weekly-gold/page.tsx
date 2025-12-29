'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import ThemeToggleButton from '@/components/ThemeToggleButton';

// Dynamic imports로 코드 분할
const RaidCalculator = dynamic(() => import('@/components/RaidCalculator'), {
  loading: () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  )
});

const SeeMoreCalculator = dynamic(() => import('@/components/SeeMoreCalculator'), {
  loading: () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  )
});

type Character = {
  characterName: string;
  itemLevel: number;
};

export default function WeeklyGoldPage() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSearch = () => {
    setSearched(true);
  };

  const handleReset = () => {
    setSearched(false);
    setSelectedCharacters([]);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <ThemeToggleButton />
      <Container fluid className="mt-3 mt-md-4">
        <Row className="justify-content-center">
          <Col xl={9} lg={10} md={12}>
            <div className="text-center mb-3 mb-md-4">
              <Link href="/" className="text-decoration-none">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-2" style={{ cursor: 'pointer' }}>
                  <Image src="/gold.webp" alt="골드" width={48} height={48} priority style={{ borderRadius: '8px', width: 'clamp(2.5rem, 5vw, 3rem)', height: 'auto' }} />
                  <h1
                    className="title mb-0"
                    style={{
                      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                      fontWeight: 700,
                      background: 'var(--gradient-text-blue)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    주간 골드 계산
                  </h1>
                </div>
              </Link>
              <p className="mb-3" style={{fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', fontWeight: '400', color: 'var(--text-muted)'}}>
                원정대 주간 골드 수익과 더보기 보상 손익을 계산해보세요
              </p>

              {/* SEO를 위한 정적 콘텐츠 */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>로스트아크 주간 골드 계산기</h2>
                  <p>원정대 캐릭터들의 주간 골드 수익을 자동으로 계산하고, 레이드 더보기 보상의 손익을 실시간 거래소 가격으로 분석합니다.</p>
                  <h3>주요 기능</h3>
                  <ul>
                    <li>캐릭터명 입력만으로 원정대 전체 주간 골드 수익 자동 계산</li>
                    <li>에스더 무기, 아브렐슈드, 카양겔, 쿠크세이튼 등 모든 레이드 지원</li>
                    <li>더보기 보상 손익 실시간 분석 (실화, 명돌, 파괴강석, 수호강석 등)</li>
                    <li>거래소 가격 매시간 자동 업데이트</li>
                  </ul>
                  <p>이 페이지는 JavaScript가 필요합니다. 브라우저에서 JavaScript를 활성화해주세요.</p>
                </div>
              </noscript>
            </div>

            {/* 캐릭터 검색 */}
            <CharacterSearch onSelectionChange={setSelectedCharacters} onSearch={handleSearch} searched={searched} />

            {/* 검색 후 원정대 주급 계산기 */}
            {searched && selectedCharacters.length > 0 && (
              <div className="mt-3" style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: isMobile ? '-1.8rem' : '-2rem',
                    right: '0',
                    backgroundColor: 'var(--card-bg)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: isMobile ? '0.25rem 0.5rem' : '0.3rem 0.6rem',
                    fontSize: isMobile ? '0.6rem' : '0.7rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    zIndex: 10
                  }}
                >
                  25년 12월 10일 겨울 업데이트 ❄️
                </div>
                <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent'}}>
                  <Card.Header
                    className="py-2 border-0"
                    style={{
                      background: 'var(--card-header-bg-blue)',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    <div className="text-center">
                      <h3
                        className="mb-0"
                        style={{
                          fontWeight: '600',
                          fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                          background: 'var(--gradient-text-blue)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          letterSpacing: '-0.025em'
                        }}
                      >
                        원정대 주간 골드 계산
                      </h3>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-2 p-md-3" style={{backgroundColor: 'var(--card-body-bg-blue)'}}>
                    <RaidCalculator selectedCharacters={selectedCharacters} />
                  </Card.Body>
                </Card>
              </div>
            )}

            {/* 더보기 효율 계산기 섹션 */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Row className="justify-content-center">
                <Col xl={12} lg={12} md={12}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      top: isMobile ? '-1.8rem' : '-2rem',
                      right: '0',
                      backgroundColor: 'var(--card-bg)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: isMobile ? '0.25rem 0.5rem' : '0.3rem 0.6rem',
                      fontSize: isMobile ? '0.6rem' : '0.7rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-sm)',
                      zIndex: 10
                    }}>
                      25년 12월 10일 겨울 업데이트 ❄️
                    </div>
                    <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent'}}>
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
                          더보기 손익 계산
                        </h3>
                      </Card.Header>
                    <Card.Body className="p-2 p-md-3" style={{backgroundColor: 'var(--card-body-bg-stone)'}}>
                      <SeeMoreCalculator />
                    </Card.Body>
                  </Card>
                  </div>
                </Col>
              </Row>
            </div>

          </Col>
        </Row>
      </Container>

      <footer className="footer-fixed">
        <Container>
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

          <Collapse in={footerOpen}>
            <div>
              <hr className="my-3" style={{opacity: 0.3, borderColor: 'var(--border-color)'}} />
              <Row className="justify-content-center">
                <Col lg={8} md={10}>
                  <Row className="gy-4 text-center text-md-start">
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
