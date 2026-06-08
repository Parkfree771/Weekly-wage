'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { Form, Button } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import type { CharacterData } from '@/lib/characterData';
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
  const [cooldownMap, setCooldownMap] = useState<Record<string, number>>({}); // 캐릭터명별 갱신 쿨다운 만료 시각
  const [nowTs, setNowTs] = useState(() => Date.now());

  // 자동완성
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  // 랭킹 → 캐릭터 이동 시 랭킹 스크롤 위치 저장 (뒤로가기 복원용)
  const rankingScrollRef = useRef(0);
  // 세션 내 조회한 캐릭터 캐시 (뒤로가기·재방문 시 재요청·로딩 플래시 없이 즉시 표시)
  const charCacheRef = useRef<Map<string, { data: CharacterData; meta: FetchMeta | null }>>(new Map());

  const router = useRouter();

  // 페이지 제목 클릭 → 첫 화면(검색 폼 + 랭킹)으로 리셋
  const resetToHome = () => {
    setCombatData(null);
    setMeta(null);
    setError(null);
    setCharacterName('');
    setShowSuggestions(false);
    rankingScrollRef.current = 0; // 첫 화면은 맨 위 — 스크롤 복원 비활성
    router.push('/character', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // URL ?name= 을 화면의 단일 진실 소스로 사용.
  // name 있으면 해당 캐릭터 표시, 없으면(뒤로가기로 /character 복귀 등) 결과 정리 → 랭킹 화면.
  const searchParams = useSearchParams();
  useEffect(() => {
    const nameParam = searchParams?.get('name')?.trim();
    if (nameParam) {
      const cached = charCacheRef.current.get(nameParam);
      if (cached) {
        // 이미 조회한 캐릭터 → 재요청·로딩 플래시 없이 즉시 표시
        setCharacterName(nameParam);
        setCombatData(cached.data);
        setMeta(cached.meta);
        setError(null);
        setIsLoading(false);
        window.scrollTo(0, 0);
      } else {
        performSearch(nameParam);
      }
    } else {
      setCombatData(null);
      setMeta(null);
      setError(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 랭킹 화면으로 복귀 시 직전 스크롤 위치 복원 (제스처 뒤로가기 대응).
  // display:none→block 레이아웃 지연·Next 자동 스크롤(top)에 밀리지 않도록
  // 여러 프레임에 걸쳐 목표 위치를 재확정한다.
  useEffect(() => {
    const showRanking = !combatData && !isLoading;
    const y = rankingScrollRef.current;
    if (!showRanking || y <= 0) return;
    let raf = 0;
    let tries = 0;
    let hits = 0;
    const restore = () => {
      window.scrollTo(0, y);
      tries += 1;
      hits = Math.abs(window.scrollY - y) <= 1 ? hits + 1 : 0;
      // 목표 위치에 2프레임 연속 안착하면 종료, 아니면 최대 15프레임까지 재시도
      if (hits < 2 && tries < 15) raf = requestAnimationFrame(restore);
    };
    raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, [combatData, isLoading]);

  // 쿨다운 초 카운트 (활성 쿨다운이 하나라도 있을 때만 tick)
  useEffect(() => {
    const anyActive = Object.values(cooldownMap).some((ts) => Date.now() < ts);
    if (!anyActive) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownMap]);

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

    if (forceRefresh && Date.now() < (cooldownMap[trimmed] || 0)) {
      return;
    }

    setCharacterName(trimmed);
    if (forceRefresh) {
      setIsRefreshing(true);
      setCooldownMap((prev) => ({ ...prev, [trimmed]: Date.now() + REFRESH_COOLDOWN_MS }));
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
      // 서버에서 이미 parseCharacterData 결과로 반환되므로 그대로 사용
      // titlesHistory는 _meta에서 합쳐 넣음 (data 컬럼에는 분리 저장)
      const meta = apiData?._meta ?? null;
      const parsed: CharacterData = {
        ...apiData,
        titlesHistory: Array.isArray(meta?.titlesHistory) ? meta.titlesHistory : (apiData.titlesHistory || []),
      };
      // _meta는 CharacterData에 속하지 않으므로 제거
      delete (parsed as any)._meta;

      if (!parsed.profile || !parsed.profile.characterName) {
        throw new Error('데이터를 파싱할 수 없습니다.');
      }

      setCombatData(parsed);
      setMeta(meta);
      charCacheRef.current.set(trimmed, { data: parsed, meta }); // 세션 캐시 저장 (뒤로가기 즉시표시)
      addToHistory(trimmed);
      // 새 데이터 저장 후 랭킹 갱신
      if (!meta?.fromCache) {
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
    router.push(`/character?name=${encodeURIComponent(trimmed)}`, { scroll: false });
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

      {/* 랭킹: 항상 마운트하고 결과/로딩 시 숨김 → 목록·스크롤 상태 유지 (뒤로가기 복원) */}
      <div style={{ display: !combatData && !isLoading ? 'block' : 'none' }}>
        <CharacterRanking
          onSelect={(name) => {
            rankingScrollRef.current = window.scrollY; // 뒤로가기 시 복원할 위치 저장
            router.push(`/character?name=${encodeURIComponent(name)}`, { scroll: false });
          }}
          reloadKey={rankingReloadKey}
        />
      </div>

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
                  const cdName = combatData.profile.characterName.trim();
                  const remainingMs = Math.max(0, (cooldownMap[cdName] || 0) - nowTs);
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
            onCharacterSelect={(name) => router.push(`/character?name=${encodeURIComponent(name)}`, { scroll: false })}
          />
        </>
      )}

    </Container>
  );
}
