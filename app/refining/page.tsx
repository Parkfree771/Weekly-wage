'use client';

import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Form, Button } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import {
  parseEquipmentData,
  type Equipment,
  type EquipmentAPIResponse
} from '@/lib/equipmentParser';
import RefiningCalculator from '@/components/refining/RefiningCalculator';
import RefiningSimulator from '@/components/refining/RefiningSimulator';
import AdvancedRefiningSimulator from '@/components/refining/AdvancedRefiningSimulator';
import dynamic from 'next/dynamic';
import AdBanner from '@/components/ads/AdBanner';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
import styles from './refining.module.css';
import searchStyles from '@/components/refining/RefiningSimulator.module.css';

const refiningGuideSections = [
  {
    heading: '일반재련 vs 상급재련, 무엇이 다른가요',
    paragraphs: [
      '실제 시뮬(일반재련)은 단계마다 정해진 확률로 성공과 실패가 갈립니다. 계승 전 기준으로 10~11단계는 10%에서 시작해 12~13단계 5%, 14~15단계 4%, 16~18단계 3%, 19~20단계 1.5%, 21~22단계 1%, 23~24단계 0.5%까지 점점 낮아지고, 실패하면 재료만 소모된 채 다시 도전해야 합니다.',
      '반면 상급재련은 실패라는 개념 자체가 없습니다. 매 시도마다 성공·대성공·초대성공 중 하나로 확정되며, 각각 10·20·40의 경험치를 얻어 누적 경험치가 1,000이 되면 한 구간(10단계)이 자동으로 끝나는 방식입니다. 즉 운이 나빠도 최소한의 진행은 항상 보장된다는 점이 일반재련과 가장 큰 차이입니다.',
      '숨결·책 같은 보조재료를 함께 쓰면 상급재련의 성공/대성공/초대성공 확률 분포 자체가 바뀝니다. 아무것도 쓰지 않으면 성공 80%·대성공 15%·초대성공 5%이지만, 숨결과 책을 모두 사용하면 성공 없이 대성공 60%·초대성공 40%로 바뀌어 평균 진행 속도가 훨씬 빨라집니다.',
    ],
  },
  {
    heading: '장인의 기운은 어떻게 쌓이나요',
    paragraphs: [
      '일반재련에서 실패해도 진행이 완전히 헛되지는 않습니다. 시도할 때마다 그 순간의 최종 성공 확률을 2.15로 나눈 값만큼 "장인의 기운" 게이지가 쌓이고, 이 게이지가 100%에 도달하면 바로 다음 시도가 100% 확정 성공으로 처리됩니다.',
      '예를 들어 최종 확률이 10%인 구간이라면 실패할 때마다 게이지가 약 4.65%p씩 쌓이므로, 이론상 22회 전후로 확정권을 손에 넣게 됩니다. 확률이 낮은 고레벨 구간일수록 확정까지 필요한 시도 횟수도 함께 늘어나는 구조입니다.',
    ],
  },
  {
    heading: '책·숨결 보조재료, 어느 구간에 쓰는 게 효율적인가요',
    paragraphs: [
      '재봉술·야금술 업화(책)는 11~20단계 구간에서만 성공 확률을 2배로 올려주며, 21단계 이후 계승 전 구간에서는 책 효과가 아예 없습니다. 반대로 숨결(빙하의 숨결·용암의 숨결)은 전 구간에서 쓸 수 있지만, 확률 구간마다 최대로 쌓을 수 있는 개수와 개당 상승폭이 다르게 설계되어 있어 저확률 고레벨 구간일수록 더 촘촘하게 누적할 수 있습니다.',
      '2026년 6월 24일 패치로 상급재련 확률이 완화되었고, 이어서 보조재료(숨결·책) 시세 연동 최적화가 업데이트되어 그날그날의 재료 가격을 반영한 최적 조합을 자동으로 계산해줍니다. 상급재련·평균 시뮬 탭 상단의 패치 배지에서 적용 여부를 바로 확인할 수 있습니다.',
    ],
  },
  {
    heading: 'T4 재련에 필요한 재료',
    paragraphs: [
      '계승 전 장비는 무기의 경우 파괴석·돌파석·아비도스 융화 재료·운명의 파편·실링·골드를, 방어구는 파괴석 대신 수호석을 기본 재료로 사용합니다. 단계가 오를수록 재료 소모량과 골드 비용이 함께 늘어나며, 17~18단계나 20단계, 24단계처럼 구간이 바뀌는 지점에서 아비도스 융화 재료 소모량이 한 단계 더 뛰는 식으로 설계되어 있습니다.',
      '장비를 계승하면 11단계부터 다시 시작하고, 재료도 파괴석/수호석 결정, 위대한 돌파석, 상급 아비도스 융화 재료로 바뀝니다. 계승 후 재료 세트는 계승 전보다 단계당 골드 비용이 대체로 더 높게 설정되어 있어, 계승 시점을 언제로 잡을지도 재련 비용 계획에서 중요한 변수입니다.',
    ],
  },
];

const RefiningStats = dynamic(() => import('@/components/refining/RefiningStats'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '200px' }} />,
});

// 오늘 날짜를 "YYYY년 M월 D일 평균 거래가" 형식으로 반환
const getTodayPriceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 평균 거래가`;
};

// 3개 탭으로 통합: 평균 시뮬 / 실제 시뮬 / 상급 재련
type RefiningMode = 'average' | 'normal' | 'advanced';

export default function RefiningPage() {
  const [mode, setMode] = useState<RefiningMode>('average');

  // === 공유 검색 상태 ===
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searched, setSearched] = useState(false);
  const [characterInfo, setCharacterInfo] = useState<{ name: string; itemLevel: string; image?: string } | null>(null);

  // 자동완성
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 검색 핸들러
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(characterName.trim())}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('캐릭터를 찾을 수 없습니다.');
        }
        throw new Error('캐릭터 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();

      if (!data.equipment || !Array.isArray(data.equipment)) {
        throw new Error('장비 정보를 찾을 수 없습니다.');
      }

      const parsedEquipments = parseEquipmentData(data.equipment as EquipmentAPIResponse[]);

      if (parsedEquipments.length === 0) {
        throw new Error('1640 레벨(+11) 이상의 장비가 없습니다.');
      }

      // 캐릭터 정보 저장
      if (data.profile) {
        setCharacterInfo({
          name: data.profile.CharacterName || characterName,
          itemLevel: data.profile.ItemAvgLevel || '알 수 없음',
          image: data.profile.CharacterImage || undefined
        });
      }

      setEquipments(parsedEquipments);
      addToHistory(characterName.trim());
      setShowSuggestions(false);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || '예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setCharacterName(value);
    if (error) setError(null);
    if (value.trim()) {
      const matches = getSuggestions(value);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions(history);
      setShowSuggestions(history.length > 0);
    }
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = (name: string) => {
    setCharacterName(name);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 모드 선택 탭 컴포넌트
  const ModeSelector = (
    <div className={styles.tabContainer}>
      <button
        className={`${styles.tabButton} ${mode === 'average' ? styles.tabButtonActive : ''}`}
        onClick={() => setMode('average')}
      >
        <span className={styles.tabLabel}>평균 시뮬</span>
      </button>
      <button
        className={`${styles.tabButton} ${mode === 'normal' ? styles.tabButtonActive : ''}`}
        onClick={() => setMode('normal')}
      >
        <span className={styles.tabLabel}>실제 시뮬</span>
      </button>
      <button
        className={`${styles.tabButton} ${mode === 'advanced' ? styles.tabButtonActive : ''}`}
        onClick={() => setMode('advanced')}
      >
        <span className={styles.tabLabel}>상급 재련</span>
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '2000px', margin: '0 auto', padding: '0 2rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 간소화된 헤더 */}
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
                T4 재련 비용
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                목표 레벨까지 필요한 재료와 골드를 계산해보세요
              </p>

              {/* SEO noscript */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>로스트아크 T4 재련 비용 계산기</h2>
                  <p>T4 장비 재련에 필요한 재료와 골드를 정확하게 계산합니다.</p>
                </div>
              </noscript>
            </div>

            {/* 공유 검색 폼 */}
            <div style={{ maxWidth: '2000px', margin: '0 auto' }}>
              <Form onSubmit={handleSearch} className="mb-2">
                <div className={searchStyles.searchWrapper}>
                  <div className={searchStyles.searchInner}>
                    <div className={searchStyles.searchInputGroup}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Form.Control
                          ref={inputRef}
                          placeholder="캐릭터명을 입력하세요"
                          value={characterName}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onFocus={() => {
                            if (history.length > 0 && !characterName.trim()) {
                              setSuggestions(history);
                              setShowSuggestions(true);
                            }
                          }}
                          className={searchStyles.searchInput}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                          <div ref={suggestionsRef} className={searchStyles.suggestions}>
                            {suggestions.map((name, idx) => (
                              <div
                                key={name}
                                className={`${searchStyles.suggestionItem} ${idx === selectedIndex ? searchStyles.suggestionItemSelected : ''}`}
                                onClick={() => handleSelectSuggestion(name)}
                              >
                                {name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button type="submit" className={searchStyles.searchButton} disabled={isLoading} style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: 'white' }}>
                        {isLoading ? '검색 중...' : '검색'}
                      </Button>
                    </div>
                  </div>
                </div>
                {error && (
                  <div className={searchStyles.errorWrapper}>
                    <div className={searchStyles.errorMessage}>{error}</div>
                  </div>
                )}
                <div className={searchStyles.lastUpdated}>
                  <small className={searchStyles.lastUpdatedText}>
                    {getTodayPriceDate()} | 실시간 시세와 차이가 있을 수 있습니다
                  </small>
                </div>
              </Form>
            </div>

            {/* 모드 선택 탭 */}
            {ModeSelector}

            {/* 상급재련 완화 패치 배지 + 보조재료 최적화 업데이트 배지 (탭 버튼 바로 아래) */}
            {(mode === 'average' || mode === 'advanced') && (
              <div className={`${styles.patchBadgeRow} ${styles.patchBadgeCol}`}>
                <span className={styles.patchBadge}>2026.06.24 상급재련 완화 적용</span>
                <span className={`${styles.patchBadge} ${styles.patchBadgeNew}`}>보조재료(숨결·책) 최적화 업데이트</span>
              </div>
            )}

            {/* 컨텐츠 영역 */}
            <div className={styles.contentArea}>
              {mode === 'average' && (
                <RefiningCalculator
                  equipments={equipments}
                  searched={searched}
                  characterInfo={characterInfo}
                />
              )}
              {mode === 'normal' && (
                <RefiningSimulator
                  refiningType="normal"
                  showStats={false}
                  equipments={equipments}
                  searched={searched}
                  characterInfo={characterInfo}
                />
              )}
              {mode === 'advanced' && (
                <AdvancedRefiningSimulator
                  equipments={equipments}
                  searched={searched}
                  characterInfo={characterInfo}
                />
              )}
            </div>

            {/* 모바일 익스트림 홍보 + 광고 */}
            <div className="d-block d-lg-none my-3">
              <AdBanner slot="8616653628" />
            </div>

            {/* 통계 - 일반 실제 시뮬일 때만 표시 (상급 재련 탭에서는 숨김) */}
            {mode === 'normal' && (
              <RefiningStats />
            )}

            <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
              <GuideFaq sections={refiningGuideSections} faqs={faqData} />
            </div>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
