'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col, Button, Card, Collapse } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { TRACKED_ITEMS } from '@/lib/items-to-track';
import styles from './page.module.css';

// Dynamic imports로 코드 분할 - 초기 로딩 속도 개선
const RaidCalculator = dynamic(() => import('@/components/RaidCalculator'), {
  loading: () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  ),
  ssr: false
});

const SeeMoreCalculator = dynamic(() => import('@/components/SeeMoreCalculator'), {
  loading: () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  ),
  ssr: false
});

const PriceChartContainer = dynamic(() => import('@/components/PriceChartContainer'), {
  loading: () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">로딩중...</span>
      </div>
    </div>
  ),
  ssr: false
});

type Character = {
  characterName: string;
  itemLevel: number;
};

type RaidInfo = {
  id: string;
  name: string;
  difficulty: 'normal' | 'hard';
};

const RAIDS: RaidInfo[] = [
  { id: 'jongmak_hard', name: '종막', difficulty: 'hard' },
  { id: 'jongmak_normal', name: '종막', difficulty: 'normal' },
  { id: '4mak_hard', name: '4막', difficulty: 'hard' },
  { id: '4mak_normal', name: '4막', difficulty: 'normal' },
];

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);
  const [footerOpen, setFooterOpen] = useState(false);

  const handleSearch = () => {
    setSearched(true);
  };

  const handleRaidSelect = (raidId: string) => {
    setSelectedRaid(selectedRaid === raidId ? null : raidId);
  };

  const getDifficultyText = (difficulty: 'normal' | 'hard') => {
    return difficulty === 'hard' ? '하드' : '노말';
  };

  const getDifficultyClass = (difficulty: 'normal' | 'hard') => {
    return difficulty === 'hard' ? styles.hardButton : styles.normalButton;
  };

  return (
    <div className={`main-container ${searched ? 'searched' : ''}`}>
      <Container fluid className="mt-3 mt-md-4">
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            <div className="text-center mb-3 mb-md-4">
              <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                <img src="/icon.png" alt="로고" style={{ width: 'clamp(2rem, 4.5vw, 2.5rem)', height: 'auto' }} />
<h1
      className="title mb-0"
      style={{
        fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
        fontWeight: 700,
        // 🪨 돌색 그라디언트 텍스트
        background: 'linear-gradient(145deg, #78716c 0%, #57534e 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.02em'
      }}
    >
      로스트아크 주간 골드 계산
    </h1>
                 </div>
              <p className="text-muted mb-3" style={{fontSize: 'clamp(0.85rem, 1.8vw, 1rem)', fontWeight: '400'}}>
                원정대 주간 골드 수익과 더보기 보상 손익을 계산해보세요
              </p>
            </div>
            <CharacterSearch onSelectionChange={setSelectedCharacters} onSearch={handleSearch} />
            
            {/* 검색 후 원정대 주급 계산기 */}
            {searched && selectedCharacters.length > 0 && (
              <div className="mt-2 mt-md-3">
                <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden'}}>
                  <Card.Header
                    className="text-center py-2 border-0"
                    style={{
                      background: 'linear-gradient(145deg, #f0f9ff 0%, #dbeafe 100%)',
                      borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
                    }}
                  >
                    <h3
                      className="mb-0"
                      style={{
                        fontWeight: '600',
                        fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                        background: 'linear-gradient(145deg, #2563eb, #1d4ed8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.025em'
                      }}
                    >
                      원정대 주간 골드 계산
                    </h3>
                  </Card.Header>
                  <Card.Body className="p-2 p-md-3" style={{backgroundColor: '#fafbff'}}>
                    <RaidCalculator selectedCharacters={selectedCharacters} />
                  </Card.Body>
                </Card>
              </div>
            )}

            {/* 공격대 시너지 분석기 섹션 */}
            {/* <div className="mt-4">
              <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden'}}>
                <Card.Header
                  className="text-center py-3 border-0"
                  style={{
                    background: 'linear-gradient(145deg, #fff0e6 0%, #ffe4cc 100%)',
                    borderBottom: '1px solid rgba(251, 146, 60, 0.1)'
                  }}
                >
                  <h3
                    className="mb-0"
                    style={{
                      fontWeight: '600',
                      fontSize: 'clamp(1.2rem, 2.5vw, 1.4rem)',
                      background: 'linear-gradient(145deg, #ea580c, #dc2626)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.025em'
                    }}
                  >
                    공격대 시너지 분석
                  </h3>
                </Card.Header>
                <Card.Body className="p-3 p-md-4" style={{backgroundColor: '#fefbf7'}}>
                  <RaidSynergyAnalyzer />
                </Card.Body>
              </Card>
            </div> */}

            {/* 가격 추이 그래프 섹션 */}
            {/* 가격 추이 그래프 섹션 */}
<div className="mt-3">
  <Row className="justify-content-center">
    <Col xl={9} lg={10} md={12}>
      <Card className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <Card.Header
  className="text-center py-2 border-0"
  style={{
    background: 'linear-gradient(145deg, #f5f5f4 0%, #e7e5e4 100%)',
    borderBottom: '1px solid rgba(120, 113, 108, 0.15)'
  }}
>
  <h3
    className="mb-0"
    style={{
      fontWeight: '600',
      fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
      // 돌맹이(바위) 톤 그라디언트
      background: 'linear-gradient(145deg, #78716c 0%, #57534e 100%)',
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
    background: 'linear-gradient(180deg, #fafaf9 0%, #f4f4f5 100%)',
    borderRadius: '0 0 0.5rem 0.5rem'
  }}
>
  <PriceChartContainer />
</Card.Body>



      </Card>
    </Col>
  </Row>
</div>


            {/* 더보기 효율 계산기 섹션 */}
            <div className="mt-3">
              <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden'}}>
                <Card.Header
                  className="text-center py-2 border-0"
                  style={{
                    background: 'linear-gradient(145deg, #f8f9ff 0%, #e8ecff 100%)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                  }}
                >
                  <h3
                    className="mb-0"
                    style={{
                      fontWeight: '600',
                      fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                      background: 'linear-gradient(145deg, #4f46e5, #7c3aed)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-0.025em'
                    }}
                  >
                    더보기 손익 계산
                  </h3>
                </Card.Header>
                <Card.Body className="p-2 p-md-3" style={{backgroundColor: '#fafbff'}}>
                  <SeeMoreCalculator />
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
              <div className="mb-2">
                <p className="small mb-1 text-muted">
                  &copy; {new Date().getFullYear()} <strong>로스트아크 주간 골드 계산</strong>
                </p>
                <div className="d-flex justify-content-center gap-3 mb-2">
                  <a href="/privacy" className="text-muted text-decoration-none hover-primary small">
                    개인정보처리방침
                  </a>
                  <span className="text-muted">|</span>
                  <a href="/terms" className="text-muted text-decoration-none hover-primary small">
                    이용약관
                  </a>
                </div>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-muted p-0 border-0"
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
              <hr className="my-3" style={{opacity: 0.3}} />
              <Row className="justify-content-center">
                <Col lg={8} md={10}>
                  <Row className="gy-4 text-center text-md-start">
                    {/* 사이트 설명 */}
                    <Col md={6}>
                      <h6 className="fw-semibold mb-3 text-primary">서비스 소개</h6>
                      <p className="small text-muted mb-3">
                        원정대 주간 골드 수익을 계산하고 더보기 보상의 손익을 분석하여
                        효율적인 로스트아크 플레이를 도와드립니다.
                      </p>
                      <div className="small text-muted">
                        <div>🌐 <strong>사이트:</strong> lostarkweeklygold.kr</div>
                        <div>🔄 <strong>갱신:</strong> 매시 정각</div>
                        <div>📊 <strong>데이터:</strong> 로스트아크 공식 API</div>
                      </div>
                    </Col>

                    {/* 주요 기능 */}
                    <Col md={6}>
                      <h6 className="fw-semibold mb-3 text-success">주요 기능</h6>
                      <ul className="list-unstyled small text-muted">
                        <li className="mb-1">✓ 캐릭터별 주간 골드 수익 계산</li>
                        <li className="mb-1">✓ 레이드 더보기 보상 손익 분석</li>
                        <li className="mb-1">✓ 실시간 거래소 가격 반영</li>
                        <li className="mb-1">✓ 효율적인 골드 파밍 가이드</li>
                      </ul>
                    </Col>
                  </Row>
                  
                  <div className="text-center mt-4">
                    <p className="small text-muted mb-0">
                      본 사이트는 로스트아크 공식 서비스가 아니며, 스마일게이트와 무관한 팬사이트입니다.
                    </p>
                    <p className="small text-muted mb-0">
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
