'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col, Card } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { PriceProvider } from '@/contexts/PriceContext';
import styles from './weekly-gold.module.css';

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
    <div className={styles.pageWrapper} style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto' }}>
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
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
                주간 골드 계산
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
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

      </Container>
    </div>
  );
}
