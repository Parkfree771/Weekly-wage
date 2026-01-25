'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import { PriceProvider } from '@/contexts/PriceContext';

// Dynamic imports로 코드 분할 (CLS 방지를 위해 최소 높이 지정)
const RaidCalculator = dynamic(() => import('@/components/RaidCalculator'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  )
});

const SeeMoreCalculator = dynamic(() => import('@/components/SeeMoreCalculator'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  )
});

const CerkaRewardInfo = dynamic(() => import('@/components/CerkaRewardInfo'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    <div className="raid-calculator-page" style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <ThemeToggleButton />
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <Row className="justify-content-center">
          <Col xl={11} lg={11} md={12}>
            <div className="text-center mb-3 mb-md-4">
              <Link href="/" className="text-decoration-none">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-2" style={{ cursor: 'pointer' }}>
                  <Image src="/gold.webp" alt="골드" width={48} height={48} priority style={{ borderRadius: '8px', width: 'clamp(2.5rem, 5vw, 3rem)', height: 'auto', aspectRatio: '1/1' }} />
                  <h1
  className="title mb-0"
  style={{
    // 폰트 크기 등 스타일은 그대로 유지
    fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
    fontWeight: 700,
    background: 'var(--gradient-text-blue)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em'
  }}
>
  {/* 👇 텍스트 변경: 세르카 키워드 추가 */}
  세르카 보상 & 주간 골드 계산
</h1>
                </div>
              </Link>
              <p className="mb-3" style={{fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', fontWeight: '400', color: 'var(--text-muted)'}}>
                원정대 주간 골드 수익과 더보기 보상 손익을 계산해보세요
              </p>

              {/* SEO를 위한 정적 콘텐츠 */}
             <noscript>
  <div style={{/*...*/}}>
    {/* 제목 변경 */}
    <h2>세르카 레이드 보상 및 주간 골드 계산기</h2>
    {/* 설명 변경 */}
    <p>세르카(1710) 포함 원정대 캐릭터들의 주간 골드 수익을 자동으로 계산하고...</p>
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

            {/* 검색 후 원정대 주급 계산기 - 검색 결과가 가장 위에 표시 */}
            {searched && selectedCharacters.length > 0 && (
              <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)', position: 'relative' }}>
                <Card className="border-0 shadow-lg weekly-gold-header-card" style={{borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent'}}>
                  <Card.Header
                    className="py-2 border-0"
                  >
                    <div className="text-center">
                      <h3 className="weekly-gold-header-title mb-0">
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

            {/* 가격 데이터 공유를 위한 Provider */}
            <PriceProvider>
              {/* 세르카 보상 정보 */}
              <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
                <Row className="justify-content-center">
                  <Col xl={12} lg={12} md={12}>
                    <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent'}}>
                      <Card.Header
                        className="text-center py-2 border-0"
                        style={{
                          background: 'linear-gradient(135deg, #6b2d8c 0%, #9c4dcc 50%, #e85d04 100%)',
                          borderBottom: '1px solid var(--border-color)'
                        }}
                      >
                        <h3
                          className="mb-0"
                          style={{
                            fontWeight: '600',
                            fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                            color: '#ffffff',
                            letterSpacing: '-0.025em'
                          }}
                        >
                          세르카 클리어 보상 정보
                        </h3>
                      </Card.Header>
                      <Card.Body className="p-2 p-md-3" style={{backgroundColor: 'var(--card-body-bg-stone)'}}>
                        <CerkaRewardInfo />
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* 더보기 효율 계산기 섹션 */}
              <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
                <Row className="justify-content-center">
                  <Col xl={12} lg={12} md={12}>
                    <div style={{ position: 'relative' }}>
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
            </PriceProvider>

          </Col>
        </Row>

        {/* SEO 정보성 콘텐츠 */}
        <Row className="justify-content-center mt-5">
          <Col xl={10} lg={11} md={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', backgroundColor: 'var(--card-body-bg-stone)' }}>
              <Card.Body className="p-4">
                <h2 className="h5 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  주간 골드 계산기 사용 가이드
                </h2>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>사용 방법</h3>
                  <ol className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li className="mb-1">상단 검색창에 로스트아크 캐릭터명을 입력합니다.</li>
                    <li className="mb-1">원정대 캐릭터 목록에서 골드를 획득할 캐릭터를 선택합니다.</li>
                    <li className="mb-1">각 캐릭터별 클리어 가능한 레이드와 예상 골드 수익을 확인합니다.</li>
                    <li className="mb-1">더보기 손익 계산기에서 레이드별 더보기 효율을 분석합니다.</li>
                  </ol>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>지원 레이드</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li><strong>카제로스 레이드:</strong> 종막(하드/노말), 4막, 3막, 2막, 1막</li>
                    <li><strong>그림자 레이드:</strong> 세르카(1710), 고통의 마녀 에키드나</li>
                    <li><strong>에브레샤크/카양겔:</strong> 각 난이도별 보상 계산</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>자주 묻는 질문</h3>
                  <div className="small" style={{ color: 'var(--text-muted)' }}>
                    <p className="mb-2"><strong>Q. 골드 수익은 어떻게 계산되나요?</strong><br />
                    A. 각 레이드의 클리어 골드와 더보기 보상을 실시간 거래소 시세로 환산하여 계산합니다.</p>
                    <p className="mb-2"><strong>Q. 더보기 손익은 무엇인가요?</strong><br />
                    A. 레이드 클리어 시 추가 골드를 지불하고 받는 더보기 보상의 실제 가치를 분석한 것입니다.</p>
                    <p className="mb-0"><strong>Q. 시세는 얼마나 자주 업데이트되나요?</strong><br />
                    A. 거래소 시세는 매시 정각에 로스트아크 공식 API를 통해 자동 갱신됩니다.</p>
                  </div>
                </div>

                <div className="small" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <strong>TIP:</strong> 골드 획득 제한(6캐릭터)을 고려하여 가장 효율적인 캐릭터 조합을 선택하세요.
                </div>
              </Card.Body>
            </Card>
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
