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

        {/* 서비스 설명 섹션 - 봇이 읽을 수 있는 정적 텍스트 */}
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            <section className="faq-section">
              <h2 className="faq-section-title">로골로골 주간 골드 계산기란?</h2>
              <div className="faq-item">
                <p className="faq-answer">
                  로골로골 주간 골드 계산기는 로스트아크 플레이어의 원정대 전체 주간 골드 수익을 자동으로 계산하는 무료 도구입니다.
                  캐릭터명을 입력하면 로스트아크 공식 API를 통해 캐릭터 정보를 조회하고, 아이템 레벨에 따라
                  참여 가능한 레이드 목록과 예상 골드 수익을 자동으로 분석합니다.
                  원정대 내 최대 6캐릭터의 골드 획득을 한눈에 파악할 수 있어,
                  어떤 캐릭터를 우선 육성해야 주간 수익이 극대화되는지 전략을 세울 수 있습니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>주요 기능</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>레이드별 클리어 골드 계산:</strong> 세르카, 종막, 4막, 3막, 2막, 1막, 서막, 베히모스 등
                  현재 진행 가능한 모든 레이드의 관문별 클리어 골드를 정확히 계산합니다.
                  노말과 하드 난이도별 골드 차이도 확인할 수 있어, 골드 획득 캐릭터 6개를 어떻게 배분할지 참고할 수 있습니다.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>더보기 보상 실시간 손익 분석:</strong> 레이드 클리어 시 기본 골드 대신 더보기를 선택하면
                  재련 재료(운명의 파편, 파괴석, 수호석, 돌파석)를 추가로 획득할 수 있습니다.
                  로골로골은 로스트아크 공식 API의 실시간 거래소 시세를 기반으로 더보기 보상의 실제 가치를 계산하여,
                  기본 골드와 비교해 어느 쪽이 유리한지 초록색(이득) 또는 빨간색(손해)으로 표시합니다.
                  매시간 자동으로 시세가 갱신되므로 항상 최신 데이터를 기반으로 판단할 수 있습니다.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>원정대 통합 관리:</strong> 캐릭터명 하나만 입력하면 같은 원정대의 모든 캐릭터를 자동으로 불러옵니다.
                  각 캐릭터의 아이템 레벨, 직업, 참여 가능 레이드가 표시되며,
                  골드 획득 캐릭터 6개를 자유롭게 선택하여 최적의 골드 조합을 시뮬레이션할 수 있습니다.
                  로그인 시 원정대 정보가 저장되어 매번 다시 입력할 필요 없이 빠르게 확인 가능합니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>지원 레이드 목록</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  로골로골 주간 골드 계산기에서 지원하는 레이드 목록입니다.
                  세르카(나메/하드/노말, 아이템 레벨 1710), 종막의 땅(하드/노말, 1700),
                  에기르(4막 하드/노말, 1680/1660), 베히모스(1700),
                  아에르(3막 하드/노말, 1660/1640), 아브렐슈드(2막 하드/노말, 1640/1620),
                  카멘(1막 하드/노말, 1630/1610), 상아탑(서막 하드/노말, 1620/1600) 등
                  모든 레이드의 관문별 골드와 더보기 보상 정보를 제공합니다.
                  새로운 레이드가 추가되면 빠르게 업데이트됩니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>데이터 출처 및 정확도</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  로골로골의 모든 데이터는 로스트아크 공식 API(Lostark Open API)에서 수집됩니다.
                  거래소 시세는 매시간 정각에 자동 갱신되며, 레이드 보상 데이터는
                  인게임 공식 정보를 기반으로 정확하게 반영합니다.
                  패치나 업데이트로 보상이 변경될 경우 최대한 빠르게 데이터를 수정하여
                  항상 최신 정보를 제공하고 있습니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

        {/* FAQ 섹션 */}
        <Row className="justify-content-center">
          <Col xl={11} lg={12} md={12}>
            <section className="faq-section">
              <h2 className="faq-section-title">주간 골드 계산기 자주 묻는 질문</h2>

              <div className="faq-item">
                <h3 className="faq-question">Q. 주간 골드는 무엇인가요?</h3>
                <p className="faq-answer">
                  주간 골드는 매주 수요일 오전 6시에 초기화되는 레이드 클리어 보상입니다.
                  각 캐릭터가 레이드를 클리어하면 관문별로 골드를 획득하며,
                  원정대 내 최대 6캐릭터까지 골드를 받을 수 있습니다.
                  주간 골드는 로스트아크에서 가장 큰 골드 수입원으로,
                  효율적으로 관리하면 캐릭터 성장 속도를 크게 높일 수 있습니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 더보기 보상이란 무엇인가요?</h3>
                <p className="faq-answer">
                  더보기 보상은 레이드 클리어 시 기본 골드 대신 재련 재료와 소량의 골드를 받는 선택입니다.
                  더보기를 선택하면 운명의 파편, 파괴석, 수호석, 돌파석 등의 재련 재료를 추가로 획득할 수 있습니다.
                  더보기의 실제 가치는 거래소 시세에 따라 달라지므로, 로골로골에서 실시간 손익을 확인 후 결정하세요.
                  초록색이면 더보기가 이득, 빨간색이면 기본 골드가 유리합니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 어떤 레이드를 지원하나요?</h3>
                <p className="faq-answer">
                  로골로골은 현재 진행 가능한 모든 레이드를 지원합니다.
                  세르카(나메/하드/노말), 종막(하드/노말), 4막(하드/노말), 3막(하드/노말),
                  2막(하드/노말), 1막(하드/노말), 서막, 베히모스 등 전체 레이드의
                  클리어 골드와 더보기 손익을 계산할 수 있습니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 거래소 시세는 얼마나 자주 업데이트되나요?</h3>
                <p className="faq-answer">
                  로골로골은 로스트아크 공식 API를 통해 매시간 정각에 거래소 시세를 자동으로 수집합니다.
                  더보기 손익 계산에 사용되는 재련 재료(운명의 파괴석, 수호석, 돌파석, 파편 등)의
                  가격이 매시간 최신 데이터로 반영됩니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 골드 획득 캐릭터 제한은 어떻게 되나요?</h3>
                <p className="faq-answer">
                  원정대 내에서 주간 골드를 획득할 수 있는 캐릭터는 최대 6캐릭터로 제한됩니다.
                  아이템 레벨이 높은 순서대로 자동 선정되며, 나머지 캐릭터는 레이드를 클리어해도
                  골드 보상을 받을 수 없습니다. 로골로골에서는 캐릭터명만 입력하면
                  골드 획득 대상 6캐릭터를 자동으로 판별하여 주간 골드를 계산합니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
