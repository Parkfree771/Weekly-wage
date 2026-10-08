'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { PriceProvider } from '@/contexts/PriceContext';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
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

// 검색 전에도 결과 화면을 그대로 보여주기 위한 예시 원정대.
// 레벨을 레이드 입장 구간에 걸쳐 흩어 두어야 목표 레벨 버튼이 캐릭터마다 다르게 나온다.
// 하한은 1680 — 계산에 쓰는 데이터가 1680부터라 그 아래는 기본값으로 두지 않는다.
const DEMO_CHARACTERS: Character[] = [
  { characterName: '디스트로이어', itemLevel: 1765 },
  { characterName: '기상술사', itemLevel: 1745 },
  { characterName: '슬레이어', itemLevel: 1725 },
  { characterName: '바드', itemLevel: 1705 },
  { characterName: '창술사', itemLevel: 1695 },
  { characterName: '홀리나이트', itemLevel: 1685 },
];

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
              demoCharacters={DEMO_CHARACTERS}
            />

            {!searched && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                예시 원정대입니다. 캐릭터와 목표 레벨을 눌러보세요 — 검색하면 내 원정대로 바뀝니다
              </p>
            )}

            {/* 재료 환산에 거래소 시세가 필요하다 */}
            <PriceProvider>
              {selectedCharacters.length > 0 && (
                <div style={{ maxWidth: '1180px', margin: 'clamp(2rem, 4vw, 2.5rem) auto 0' }}>
                  <GoldProjection selectedCharacters={selectedCharacters} allCharacters={allCharacters} />
                </div>
              )}
            </PriceProvider>

            {!searched && (
              /* 검색 전에도 이 도구가 무엇을 계산하는지 본문으로 읽히도록 둔다 */
              <div
                style={{
                  maxWidth: '880px',
                  margin: 'clamp(1.5rem, 4vw, 2.25rem) auto 0',
                  padding: 'clamp(1rem, 3vw, 1.5rem)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--card-body-bg-blue)',
                }}
              >
                <h2 className="h6 text-primary mb-3">레벨업, 올리기 전에 먼저 계산해보세요</h2>
                <p className="small mb-2">
                  재련은 레벨이 오를수록 비용이 가파르게 뜁니다. 그런데 정작 주간 골드는 아이템 레벨에 비례해서
                  오르지 않고, 새 레이드의 입장 레벨을 넘는 순간에만 계단식으로 오릅니다. 그 사이 구간은 아무리
                  올려도 주급이 그대로라, 어디까지 올려야 실제로 이득인지 미리 아는 것이 중요합니다.
                </p>
                <p className="small mb-3">
                  캐릭터명을 검색하면 원정대 전체의 아이템 레벨을 불러와, 지금 받는 주간 골드와 목표 레벨에서 받게 될
                  주간 골드를 각각 계산해 그 차이를 보여줍니다. 캐릭터 1명당 골드 레이드 3개, 원정대 골드 인정 6캐릭터
                  제한을 그대로 반영하기 때문에, 새로 열리는 레이드의 골드를 그냥 더하는 계산과는 결과가 다릅니다.
                </p>
                <ul className="small mb-0">
                  <li>목표 레벨별 원정대 주간 골드 증가분 (귀속·유통 골드 구분)</li>
                  <li>올려도 주급이 변하지 않는 구간 표시 — 헛돈 쓰지 않게</li>
                  <li>레이드·균열·가디언 토벌·모래시계 재련 재료 수급 변화를 실시간 시세로 환산</li>
                  <li>골드가 인정되는 6캐릭터 자동 선정 (직접 변경 가능)</li>
                </ul>
              </div>
            )}

            {/* 본문 ↔ 가이드 경계 광고 — 계산 결과를 다 본 뒤 읽을거리로 넘어가는 자리 */}
            <div className="d-block d-lg-none my-3">
              <AdBanner index={0} />
            </div>
            <DesktopBannerAd adfit={ADFIT_UNITS.galleryBottomDesktop} />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
