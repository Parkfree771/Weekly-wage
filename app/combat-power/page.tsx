'use client';

import { useState, useRef, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Form, Button } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';
import { parseCombatPowerData, type CombatPowerData } from '@/lib/combatPowerData';
import CombatPowerDashboard from '@/components/combat-power/CombatPowerDashboard';
import styles from './combat-power.module.css';

export default function CombatPowerPage() {
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combatData, setCombatData] = useState<CombatPowerData | null>(null);

  // 자동완성
  const { history, addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCombatData(null);

    try {
      const response = await fetch(
        `/api/lostark/combat?characterName=${encodeURIComponent(characterName.trim())}`
      );

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
      const parsed = parseCombatPowerData(apiData);

      if (!parsed) {
        throw new Error('데이터를 파싱할 수 없습니다.');
      }

      setCombatData(parsed);
      addToHistory(characterName.trim());
      setShowSuggestions(false);
    } catch (err: any) {
      setError(err.message || '예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container fluid className={styles.pageContainer}>
      <div className="text-center mb-4">
        <h1 className={styles.pageTitle}>전투력 분석</h1>
        <p className={styles.pageSubtitle}>
          캐릭터의 전투력 구성 요소를 분석하고 업그레이드 시뮬레이션을 해보세요
        </p>
      </div>

      {/* 검색 폼 */}
      <Form onSubmit={handleSearch}>
        <div className="d-flex justify-content-center">
          <div className="mb-3" style={{ maxWidth: '700px', width: '100%' }}>
            <div className="d-flex gap-2">
              <div style={{ position: 'relative', flex: 1 }}>
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
                style={{
                  backgroundColor: '#8b5cf6',
                  padding: 'clamp(0.7rem, 2vw, 0.85rem) clamp(1.5rem, 3vw, 2rem)',
                  borderRadius: '12px',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  fontWeight: '700',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                  whiteSpace: 'nowrap',
                  color: 'white',
                }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    분석 중...
                  </>
                ) : (
                  '분석'
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

      {/* 로딩 */}
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>전투력 데이터를 분석하는 중...</div>
        </div>
      )}

      {/* 결과 */}
      {combatData && !isLoading && (
        <CombatPowerDashboard data={combatData} />
      )}

      {/* 빈 상태 */}
      {!combatData && !isLoading && !error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>&#9876;</div>
          <div className={styles.emptyStateText}>캐릭터를 검색하여 전투력을 분석해보세요</div>
          <div className={styles.emptyStateSubtext}>
            각 요소별 기여도 분석과 업그레이드 시뮬레이션을 제공합니다
          </div>
        </div>
      )}
    </Container>
  );
}
