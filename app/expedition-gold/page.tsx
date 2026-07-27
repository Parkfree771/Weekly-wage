'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { PriceProvider } from '@/contexts/PriceContext';
import AdBanner from '@/components/ads/AdBanner';
// 제목·검색창·카드 톤을 주간 골드 페이지와 동일하게 맞춘다 (같은 래퍼 스타일 재사용).
import styles from '@/app/weekly-gold/weekly-gold.module.css';

const GoldProjection = dynamic(() => import('@/components/GoldProjection'), {
  loading: () => (
    <div className="text-center py-5" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

export default function ExpeditionGoldPage() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [autoSearchName, setAutoSearchName] = useState<string | undefined>(undefined);

  // 주간 레이드 페이지에 저장해 둔 검색 닉네임이 있으면 그대로 자동 검색
  useEffect(() => {
    try {
      const raw = localStorage.getItem('weekly-gold-settings');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.searchName) {
          setAutoSearchName(saved.searchName);
        }
      }
    } catch {}
  }, []);

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
                원정대 수급 골드 시뮬
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                캐릭터를 레벨업하면 원정대 주간 클리어 골드와 재련 재료 수급이 얼마나 늘어나는지 계산해보세요
              </p>
            </div>

            {/* 캐릭터 검색 */}
            <CharacterSearch
              onSelectionChange={setSelectedCharacters}
              onCharactersLoaded={setAllCharacters}
              onSearch={() => setSearched(true)}
              searched={searched}
              autoSearchName={autoSearchName}
            />

            {!searched && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                검색해서 레벨업 시 골드·재료 수급 변화 확인하기
              </p>
            )}

            {/* 재료 환산에 거래소 시세가 필요하다 */}
            <PriceProvider>
              {searched && selectedCharacters.length > 0 && (
                <div style={{ maxWidth: '1180px', margin: 'clamp(2rem, 4vw, 2.5rem) auto 0' }}>
                  <GoldProjection selectedCharacters={selectedCharacters} allCharacters={allCharacters} />
                </div>
              )}
            </PriceProvider>

            {/* 모바일 인-콘텐츠 광고 (앱 배치와 유사) */}
            <div className="d-block d-lg-none my-3">
              <AdBanner slot="8616653628" />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
