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
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
import styles from './weekly-gold.module.css';

const weeklyGoldGuideSections = [
  {
    heading: '원정대 주간 골드 계산 방식',
    paragraphs: [
      '캐릭터명을 검색하면 같은 원정대 소속 캐릭터들의 아이템 레벨을 자동으로 불러옵니다. 캐릭터마다 이번 주에 클리어(예정)한 레이드와 관문을 체크하면, 해당 관문의 클리어 골드가 원정대 전체 합계에 실시간으로 반영됩니다.',
      '레이드 보상에는 자유롭게 거래에 쓸 수 있는 일반 골드와, 해당 캐릭터에게만 귀속되는 귀속 골드가 섞여 있습니다. 예를 들어 지평의 성당은 관문 클리어 골드 전액이 귀속으로 지급되는 반면, 세르카나 카제로스 레이드는 절반 정도만 귀속으로 지급됩니다. 원정대 합계를 낼 때도 이 구분을 유지해서, 실제로 자유롭게 쓸 수 있는 골드와 캐릭터에 묶여 있는 골드를 나눠서 보여줍니다.',
      '또한 캐릭터 1명이 주간 골드를 받을 수 있는 레이드는 최대 3개까지로 제한되어 있습니다. 그래서 무작정 여러 레이드를 클리어한다고 골드가 계속 늘어나는 것이 아니라, 캐릭터별로 가장 효율이 좋은 3개 관문을 골라 담는 조합을 짜는 것이 주급을 최대화하는 핵심입니다.',
    ],
  },
  {
    heading: '더보기 손익은 어떻게 계산되나요',
    paragraphs: [
      '더보기 보상은 기본 클리어 보상 대신 골드를 지불하고 파괴강석·수호강석, 돌파석, 각종 파편류 같은 재료를 추가로 받는 선택지입니다. 문제는 이 재료들의 실제 가치가 거래소 시세에 따라 하루에도 계속 바뀐다는 점입니다.',
      '로아로골은 더보기로 받는 재료 목록 전체를 그날의 거래소 평균 시세로 환산한 총 가치에서, 더보기를 선택하는 데 드는 골드 비용을 뺀 값을 관문별로 계산합니다. 이 값이 양수면 더보기가 이득이라는 뜻으로 초록색으로, 음수면 그냥 기본 골드를 받는 편이 낫다는 뜻으로 빨간색으로 표시해서 매번 직접 손익을 따져볼 필요가 없도록 만들었습니다.',
      '레이드 전체를 기준으로 더보기 비용 대비 손익률(%)도 함께 계산되므로, 관문 하나하나를 비교하기보다 레이드 단위로 더보기 여부를 빠르게 결정하고 싶을 때 참고하면 됩니다.',
    ],
  },
  {
    heading: '현재 지원하는 레이드와 아이템 레벨',
    paragraphs: [
      '2026년 7월 기준으로 서비스 중인 레이드는 지평의 성당(1단계 1700 · 2단계 1720 · 3단계 1750), 세르카(노말 1710 · 하드 1730 · 나메 1740), 카제로스 종막(노말 1710 · 하드 1730), 4막(노말 1700 · 하드 1720), 3막(노말 1680 · 하드 1700), 2막(노말 1670 · 하드 1690), 1막(노말 1660 · 하드 1680), 그리고 입문 단계인 서막과 베히모스(1640)까지입니다.',
      '신규 레이드인 밸가르딘(노말 1750 · 하드 1770 · 나메 1780)은 2026년 8월 5일 출시 예정이라 현재는 계산에 포함되지 않으며, 출시와 동시에 자동으로 활성화됩니다.',
    ],
    bullets: [
      '지평의 성당 1~3단계 (1700 / 1720 / 1750)',
      '세르카 노말·하드·나메 (1710 / 1730 / 1740)',
      '카제로스 종막·4막·3막·2막·1막 (1660~1730)',
      '서막·베히모스 (1640) — 원정대 저레벨 캐릭터용',
      '밸가르딘 노말·하드·나메 (1750 / 1770 / 1780, 8월 5일 출시 예정)',
    ],
  },
];

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

              <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
                <GuideFaq sections={weeklyGoldGuideSections} faqs={faqData} />
              </div>
            </PriceProvider>

          </Col>
        </Row>

      </Container>
    </div>
  );
}
