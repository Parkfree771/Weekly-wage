'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { PriceProvider } from '@/contexts/PriceContext';
import AdBanner from '@/components/ads/AdBanner';
import DesktopBannerAd from '@/components/ads/DesktopBannerAd';
import { ADFIT_UNITS } from '@/components/ads/adConfig';
import type { CharacterGoldCalc } from '@/components/RaidCalculator';
import styles from './weekly-gold.module.css';

const STORAGE_KEY = 'weekly-gold-settings';


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

type Character = {
  characterName: string;
  itemLevel: number;
};

// 검색 전에도 주간 골드 계산 결과 화면을 그대로 보여주기 위한 예시 원정대.
// (원정대 수급 골드 페이지의 데모와 같은 방식 — 검색하면 실제 원정대로 대체된다)
// 레벨을 레이드 입장 구간에 걸쳐 흩어 두어야 캐릭터마다 다른 레이드 카드가 나온다.
const DEMO_CHARACTERS: Character[] = [
  { characterName: '디스트로이어', itemLevel: 1770 },
  { characterName: '기상술사', itemLevel: 1750 },
  { characterName: '슬레이어', itemLevel: 1730 },
  { characterName: '바드', itemLevel: 1710 },
  { characterName: '창술사', itemLevel: 1700 },
  { characterName: '홀리나이트', itemLevel: 1680 },
];

export default function WeeklyGoldPage() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [, setIsMobile] = useState<boolean | undefined>(undefined);
  const [, setGateSelection] = useState<{[key: string]: {[key: string]: {[key: string]: 'none' | 'withMore' | 'withoutMore'}}}>({});
  const [, setCharacterCalc] = useState<{[char: string]: CharacterGoldCalc}>({});
  const [autoSearchName, setAutoSearchName] = useState<string | undefined>(undefined);
  const saveFnRef = useRef<(() => boolean) | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleGateSelectionChange = useCallback((gs: {[key: string]: {[key: string]: {[key: string]: 'none' | 'withMore' | 'withoutMore'}}}, cc: {[char: string]: CharacterGoldCalc}) => {
    setGateSelection(gs);
    setCharacterCalc(cc);
  }, []);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 저장된 설정에서 검색 닉네임 복원 → 자동 검색
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.searchName) {
          setAutoSearchName(saved.searchName);
        }
      }
    } catch {}
  }, []);

  const handleSearch = () => {
    setSearched(true);
  };


  const handleSaveReady = useCallback((fn: () => boolean) => {
    saveFnRef.current = fn;
  }, []);


  // cleanup timer
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
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
                주간 골드
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                원정대 주간 골드 수익과 더보기 보상 손익을 계산해보세요
              </p>

            </div>

            {/* 캐릭터 검색 */}
            <CharacterSearch
              onSelectionChange={setSelectedCharacters}
              onSearch={handleSearch}
              searched={searched}
              autoSearchName={autoSearchName}
              demoCharacters={DEMO_CHARACTERS}
            />

            {!searched && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                예시 원정대입니다. 레이드 관문을 눌러보세요 — 검색하면 내 원정대로 바뀝니다
              </p>
            )}

            {/* 가격 데이터 공유를 위한 Provider - RaidCalculator도 포함 */}
            <PriceProvider>
              {/* 원정대 주급 계산기 — 검색 전에는 예시 원정대로 결과 화면을 미리 보여준다
                  (저장 버튼은 실제 검색 후에만 노출해 예시 상태가 저장되지 않게 한다) */}
              {selectedCharacters.length > 0 && (
                <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
                  <RaidCalculator selectedCharacters={selectedCharacters} onGateSelectionChange={handleGateSelectionChange} onSaveReady={handleSaveReady} searchName={autoSearchName} showSave={searched} />
                </div>
              )}

              {/* 주급 계산 결과 ↔ 더보기 손익 경계 광고 */}
              <div className="d-block d-lg-none my-3">
                <AdBanner />
              </div>
              <DesktopBannerAd adfit={ADFIT_UNITS.galleryBottomDesktop} />

              {/* 더보기 손익 계산 섹션 (de-box, 주간 레이드와 너비 1180px 통일) */}
              <div style={{ maxWidth: '1180px', margin: 'clamp(2.5rem, 5vw, 3.5rem) auto 0' }}>
                <div className="mb-3" style={{ background: 'rgba(232, 114, 42, 0.16)', borderRadius: '10px', padding: '0.5rem 1rem', textAlign: 'center' }}>
                  <h3 className="weekly-gold-header-title mb-0">
                    더보기 손익 계산
                  </h3>
                </div>
                <SeeMoreCalculator />
              </div>

              {/* 더보기 손익 ↔ 가이드 경계 광고 — 계산을 다 끝내고 읽을거리로 넘어가는 자리.
                  위 자리와 반드시 다른 단위여야 한다 (같은 단위면 애드핏이 첫 자리만 채운다) */}
              <div className="d-block d-lg-none my-3">
                <AdBanner index={0} />
              </div>
              <DesktopBannerAd adfit={ADFIT_UNITS.refiningResultDesktop} />
            </PriceProvider>

          </Col>
        </Row>

      </Container>
    </div>
  );
}
