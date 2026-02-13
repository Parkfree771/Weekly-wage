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
import styles from './refining.module.css';
import searchStyles from '@/components/refining/RefiningSimulator.module.css';

const RefiningStats = dynamic(() => import('@/components/refining/RefiningStats'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '200px' }} />,
});

// 오늘 날짜를 "YYYY년 M월 D일 평균 거래가" 형식으로 반환
const getTodayPriceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 평균 거래가`;
};

// 3개 탭으로 통합: 평균 시뮬 / 일반 재련 / 상급 재련
type RefiningMode = 'average' | 'normal' | 'advanced';

export default function RefiningPage() {
  const [mode, setMode] = useState<RefiningMode>('normal');

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
        <span className={styles.tabLabel}>일반 재련</span>
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
                T4 재련 비용 계산
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
                      <Button type="submit" className={searchStyles.searchButton} disabled={isLoading} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1', color: 'white' }}>
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

            {/* 모바일 중간 광고 */}
            <div className="d-block d-lg-none my-3">
              <AdBanner slot="8616653628" />
            </div>

            {/* 통계 - 실제 시뮬(일반/상급)일 때만 표시 */}
            {(mode === 'normal' || mode === 'advanced') && (
              <RefiningStats />
            )}
          </Col>
        </Row>

      </Container>
    </div>
  );
}
