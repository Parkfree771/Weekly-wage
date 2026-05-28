'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { Form, Button } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import { parseCharacterData, type CharacterData } from '@/lib/characterData';
import CharacterDashboard from '@/components/character/CharacterDashboard';
import CharacterRanking from '@/components/character/CharacterRanking';
import styles from './character.module.css';

type FetchMeta = { fromCache: boolean; fetchedAt: string };

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function CharacterPage() {
  return (
    <Suspense fallback={null}>
      <CharacterPageInner />
    </Suspense>
  );
}

const REFRESH_COOLDOWN_MS = 30_000;

function CharacterPageInner() {
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combatData, setCombatData] = useState<CharacterData | null>(null);
  const [meta, setMeta] = useState<FetchMeta | null>(null);
  const [rankingReloadKey, setRankingReloadKey] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());

  // 자동완성
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // 페이지 제목 클릭 → 첫 화면(검색 폼 + 랭킹)으로 리셋
  const resetToHome = () => {
    setCombatData(null);
    setMeta(null);
    setError(null);
    setCharacterName('');
    setShowSuggestions(false);
    router.push('/character');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // URL ?name=XXX 자동 검색 (랭킹 카드 → 상세 이동용)
  const searchParams = useSearchParams();
  useEffect(() => {
    const nameParam = searchParams?.get('name');
    if (nameParam && nameParam.trim()) {
      performSearch(nameParam.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 쿨다운 초 카운트 (활성 시에만 tick)
  useEffect(() => {
    if (cooldownUntil <= 0) return;
    if (Date.now() >= cooldownUntil) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const performSearch = async (name: string, forceRefresh = false) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    if (forceRefresh && Date.now() < cooldownUntil) {
      return;
    }

    setCharacterName(trimmed);
    if (forceRefresh) {
      setIsRefreshing(true);
      setCooldownUntil(Date.now() + REFRESH_COOLDOWN_MS);
      setNowTs(Date.now());
    } else {
      setIsLoading(true);
      setCombatData(null);
      setMeta(null);
    }
    setError(null);
    setShowSuggestions(false);
    if (!forceRefresh) window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const url = `/api/lostark/character?characterName=${encodeURIComponent(trimmed)}${forceRefresh ? '&refresh=1' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('캐릭터를 찾을 수 없습니다. 캐릭터명을 정확히 입력해주세요.');
        }
        if (response.status === 429) {
          throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        }
        throw new Error('캐릭터 정보를 가져오는데 실패했습니다.');
      }

      const apiData = await response.json();
      const parsed = parseCharacterData(apiData);

      if (!parsed) {
        throw new Error('데이터를 파싱할 수 없습니다.');
      }

      setCombatData(parsed);
      setMeta(apiData?._meta ?? null);
      addToHistory(trimmed);
      // 새 데이터 저장 후 랭킹 갱신
      if (!apiData?._meta?.fromCache) {
        setRankingReloadKey(k => k + 1);
      }
    } catch (err: any) {
      setError(err.message || '예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = characterName.trim();
    if (!trimmed) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }
    // URL 푸시 → history 쌓임 → useEffect가 ?name 보고 자동 검색
    router.push(`/character?name=${encodeURIComponent(trimmed)}`);
  };

  return (
    <Container fluid className={styles.pageContainer}>
      <div className="text-center mb-4">
        <h1
          className={styles.pageTitle}
          onClick={resetToHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resetToHome(); } }}
          style={{ cursor: 'pointer', display: 'inline-block' }}
          title="첫 화면으로"
        >
          캐릭터 조회
        </h1>
        <p className={styles.pageSubtitle}>
          캐릭터명을 입력해 아이템레벨·전투력·장비·각인·아크패시브 정보를 한 번에 확인하세요
        </p>
      </div>

      {/* 검색 폼 */}
      <Form onSubmit={handleSearch}>
        <div className="d-flex justify-content-center">
          <div className="mb-3" style={{ maxWidth: '700px', width: '100%' }}>
            <div className="d-flex gap-2">
              <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
                <Form.Control
                  ref={inputRef}
                  placeholder="캐릭터명을 입력하세요"
                  aria-label="캐릭터명을 입력하세요"
                  value={characterName}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => {
                    if (characterName.trim()) {
                      const matches = getSuggestions(characterName);
                      if (matches.length > 0) {
                        setSuggestions(matches);
                        setShowSuggestions(true);
                      }
                    } else if (history.length > 0) {
                      setSuggestions(history);
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  autoComplete="off"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    padding: 'clamp(0.7rem, 2vw, 0.85rem) clamp(1rem, 2.5vw, 1.25rem)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    fontWeight: '500',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.3s ease',
                  }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      marginTop: '4px',
                      boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {suggestions.map((name, index) => (
                      <div
                        key={name}
                        onClick={() => handleSelectSuggestion(name)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          backgroundColor: selectedIndex === index
                            ? 'var(--hover-bg, rgba(0,0,0,0.05))'
                            : 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                          borderBottom: index < suggestions.length - 1
                            ? '1px solid var(--border-color)'
                            : 'none',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          setSelectedIndex(index);
                          e.currentTarget.style.backgroundColor = 'var(--hover-bg, rgba(0,0,0,0.05))';
                        }}
                        onMouseLeave={(e) => {
                          if (selectedIndex !== index) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading || !characterName.trim()}
                className="character-search-button"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  padding: 'clamp(0.7rem, 2vw, 0.85rem) clamp(0.9rem, 3vw, 2rem)',
                  borderRadius: '12px',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  fontWeight: '700',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow-md)',
                  whiteSpace: 'nowrap',
                  color: 'white',
                  opacity: 1,
                  flexShrink: 0,
                }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    검색 중...
                  </>
                ) : (
                  '검색'
                )}
              </Button>
            </div>
          </div>
        </div>
        {error && (
          <div className="d-flex justify-content-center">
            <div className="alert alert-danger d-inline-block" style={{ maxWidth: '700px' }} role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              {error}
            </div>
          </div>
        )}
      </Form>

      {/* 랭킹 (검색 결과 없을 때만 노출) */}
      {!combatData && !isLoading && (
        <CharacterRanking
          onSelect={(name) => router.push(`/character?name=${encodeURIComponent(name)}`)}
          reloadKey={rankingReloadKey}
        />
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>캐릭터 정보를 불러오는 중...</div>
        </div>
      )}

      {/* 결과 */}
      {combatData && !isLoading && (
        <>
          {meta && (
            <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
              <button
                type="button"
                onClick={resetToHome}
                aria-label="뒤로가기"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1, fontWeight: 700 }}>←</span>
                <span>뒤로가기</span>
              </button>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  마지막 갱신: {formatFetchedAt(meta.fetchedAt)}
                  {meta.fromCache && (
                    <span className="badge ms-2" style={{ backgroundColor: 'var(--badge-bg, #6b7280)', color: 'white' }}>
                      캐시
                    </span>
                  )}
                </span>
                {(() => {
                  const remainingMs = Math.max(0, cooldownUntil - nowTs);
                  const isCoolingDown = !isRefreshing && remainingMs > 0;
                  const secondsLeft = Math.ceil(remainingMs / 1000);
                  return (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => performSearch(combatData.profile.characterName, true)}
                      disabled={isRefreshing || isCoolingDown}
                      title={isCoolingDown ? `${secondsLeft}초 후 다시 갱신할 수 있습니다` : undefined}
                      style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                    {isRefreshing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                        갱신 중...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-1" />
                        갱신하기
                      </>
                    )}
                    </Button>
                  );
                })()}
              </div>
            </div>
          )}
          <CharacterDashboard
            data={combatData}
            onCharacterSelect={(name) => performSearch(name)}
          />
        </>
      )}

    </Container>
  );
}
