'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import { PriceProvider } from '@/contexts/PriceContext';
import AdBanner from '@/components/ads/AdBanner';
import type { CharacterGoldCalc } from '@/components/RaidCalculator';
import styles from './weekly-gold.module.css';

const STORAGE_KEY = 'weekly-gold-settings';

const MaterialSummary = dynamic(() => import('@/components/MaterialSummary'), {
  loading: () => null
});

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

export default function WeeklyGoldPage() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const [gateSelection, setGateSelection] = useState<{[key: string]: {[key: string]: {[key: string]: 'none' | 'withMore' | 'withoutMore'}}}>({});
  const [characterCalc, setCharacterCalc] = useState<{[char: string]: CharacterGoldCalc}>({});
  const [autoSearchName, setAutoSearchName] = useState<string | undefined>(undefined);
  const [searchedName, setSearchedName] = useState<string>('');
  const saveFnRef = useRef<(() => boolean) | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
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

  const handleReset = () => {
    setSearched(false);
    setSelectedCharacters([]);
  };

  const handleSaveReady = useCallback((fn: () => boolean) => {
    saveFnRef.current = fn;
  }, []);

  const handleSave = useCallback(() => {
    if (saveFnRef.current) {
      const success = saveFnRef.current();
      if (success) {
        setSaveStatus('saved');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }
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

              {/* SEO를 위한 정적 콘텐츠 */}
             <noscript>
  <div style={{/*...*/}}>
    {/* 제목 변경 */}
    <h2>성당 레이드 보상 및 주간 골드 계산기</h2>
    {/* 설명 변경 */}
    <p>성당(1700~1750) 포함 원정대 캐릭터들의 주간 골드 수익을 자동으로 계산하고...</p>
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
            <CharacterSearch
              onSelectionChange={setSelectedCharacters}
              onSearch={handleSearch}
              searched={searched}
              autoSearchName={autoSearchName}
            />

            {!searched && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                검색해서 원정대 주간 골드 수급 확인하기
              </p>
            )}

            {/* 가격 데이터 공유를 위한 Provider - RaidCalculator도 포함 */}
            <PriceProvider>
              {/* 검색 후 원정대 주급 계산기 */}
              {searched && selectedCharacters.length > 0 && (
                <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
                  <RaidCalculator selectedCharacters={selectedCharacters} onGateSelectionChange={handleGateSelectionChange} onSaveReady={handleSaveReady} searchName={autoSearchName} showSave={true} />
                </div>
              )}

              {/* 모바일 익스트림 홍보 + 광고 */}
              <div className="d-block d-lg-none my-3">
                <AdBanner slot="8616653628" />
              </div>

              {/* 더보기 손익 계산 섹션 (de-box, 주간 레이드와 너비 1180px 통일) */}
              <div style={{ maxWidth: '1180px', margin: 'clamp(2.5rem, 5vw, 3.5rem) auto 0' }}>
                <div className="mb-3" style={{ background: 'rgba(232, 114, 42, 0.16)', borderRadius: '10px', padding: '0.5rem 1rem', textAlign: 'center' }}>
                  <h3 className="weekly-gold-header-title mb-0">
                    더보기 손익 계산
                  </h3>
                </div>
                <SeeMoreCalculator />
              </div>
            </PriceProvider>

          </Col>
        </Row>

      </Container>
    </div>
  );
}
