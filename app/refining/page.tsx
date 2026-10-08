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
import { parseCombatPowerBase, type CombatPowerBase } from '@/lib/combatPower';
import dynamic from 'next/dynamic';
import AdBanner from '@/components/ads/AdBanner';
import NewLottie from '@/components/NewLottie';
import styles from './refining.module.css';
import searchStyles from '@/components/refining/RefiningSimulator.module.css';

const RefiningStats = dynamic(() => import('@/components/refining/RefiningStats'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '200px' }} />,
});

// 탭은 한 번에 하나만 렌더되는데 셋 다 정적 import 하면 첫 로드에 전부 실린다.
// 기본 탭(평균 시뮬 = RefiningCalculator)만 정적으로 두고, 나머지 둘은 탭을 눌렀을 때 받는다.
const RefiningSimulator = dynamic(() => import('@/components/refining/RefiningSimulator'), {
  loading: () => <div style={{ minHeight: '400px' }} />,
});
const AdvancedRefiningSimulator = dynamic(() => import('@/components/refining/AdvancedRefiningSimulator'), {
  loading: () => <div style={{ minHeight: '400px' }} />,
});

// 3개 탭으로 통합: 평균 시뮬 / 실제 시뮬 / 상급 재련
type RefiningMode = 'average' | 'normal' | 'advanced';

// 검색 전 기본 표시 — 전율(계승) +11 6부위 + 완갑 0강, 현재 레벨 1730.
// 첫 방문에 빈 화면 대신 검색 후와 같은 UI 가 바로 나오도록 초기 상태를 채워 둔다.
// 실제 캐릭터를 검색하면 통째로 교체된다. API 아이콘 URL 이 없으므로 전율 카드의
// 아이콘 자리는 배경·프레임만 나온다 (RefiningCalculator 쪽에서 처리).
const DEFAULT_EQUIPMENTS: Equipment[] = [
  ...(['무기', '투구', '견갑', '상의', '하의', '장갑'] as const).map((name): Equipment => ({
    name,
    type: name === '무기' ? 'weapon' : 'armor',
    currentLevel: 11,
    currentAdvancedLevel: 0,
    itemLevel: 1700,
    grade: '고대',
    isSuccession: true,
    isEsther: false,
    originalName: `+11 운명의 전율 ${name}`,
  })),
  {
    name: '완갑',
    type: 'weapon', // 편의상 값만 채운다 — 실제 계산은 isWangap 분기로 갈린다 (equipmentParser 와 동일)
    currentLevel: 0,
    currentAdvancedLevel: 0,
    itemLevel: 0,
    grade: '영웅',
    isSuccession: false,
    isEsther: false,
    isWangap: true,
    originalName: '운명의 전율 완갑',
  },
];
const DEFAULT_CHARACTER_INFO = { name: '기본 장비', itemLevel: '1,730.00' };

export default function RefiningPage() {
  const [mode, setMode] = useState<RefiningMode>('average');

  // === 공유 검색 상태 === (기본값 채움 — 검색하면 실제 캐릭터 데이터로 교체)
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>(DEFAULT_EQUIPMENTS);
  const [searched, setSearched] = useState(true);
  const [characterInfo, setCharacterInfo] = useState<{ name: string; itemLevel: string; image?: string } | null>(DEFAULT_CHARACTER_INFO);
  // 전투력 계산 기준값 — 실제 캐릭터를 검색해야 생긴다 (기본 장비 상태에선 null)
  const [combatPowerBase, setCombatPowerBase] = useState<CombatPowerBase | null>(null);

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
      // avatars/gems — 전투력 상승량 계산에 아바타 주스탯 %와 보석 기본공격력 %가 필요하다.
      // siblings=0 — 이 페이지는 원정대 목록을 안 써서 외부 API 호출을 하나 아낀다. (lib/combatPower)
      const response = await fetch(
        `/api/lostark?characterName=${encodeURIComponent(characterName.trim())}&avatars=1&gems=1&siblings=0`,
      );

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

      // 완갑은 1750부터 열려서, API에 안 와도 레벨이 되면 0강으로 노출한다
      const parsedEquipments = parseEquipmentData(
        data.equipment as EquipmentAPIResponse[],
        data.profile?.ItemAvgLevel,
      );

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

      // 전투력 상승량 계산 기준값 (읽지 못하면 전투력 섹션이 그냥 안 나온다)
      setCombatPowerBase(parseCombatPowerBase(data.equipment, data.profile, data.avatars, data.gems));

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
            <div className="text-center mb-2" style={{ marginTop: 0 }}>
              {/* 제목 옆 "새로 등장" 로티 — /extreme·/package 와 같은 처리.
                  부모가 text-center 라 inline-flex 로 두면 그대로 가운데 온다. */}
              <h1
                style={{
                  fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: 0,
                  marginBottom: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                재련 시뮬레이터
                <NewLottie size={30} />
              </h1>
            </div>

            {/* 공유 검색 폼 */}
            <div style={{ maxWidth: '2000px', margin: '0 auto' }}>
              <Form onSubmit={handleSearch} className="mb-2">
                <div className={searchStyles.searchWrapper}>
                  {/* 제목 가운데와 눈으로 맞춰 보면 검색창이 살짝 왼쪽으로 보여 6px 만 오른쪽으로 민다 */}
                  <div className={searchStyles.searchInner} style={{ position: 'relative', left: 6 }}>
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
                  combatPowerBase={combatPowerBase}
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
              <AdBanner />
            </div>

            {/* 통계 - 일반 실제 시뮬일 때만 표시 (상급 재련 탭에서는 숨김) */}
            {mode === 'normal' && (
              <RefiningStats />
            )}

          </Col>
        </Row>

      </Container>
    </div>
  );
}
