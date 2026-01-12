'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Button, InputGroup, Row, Col, Card } from 'react-bootstrap';
import { useSearchHistory } from '@/lib/useSearchHistory';

type Sibling = {
  CharacterName: string;
  ItemAvgLevel: string;
};

type Character = {
  characterName: string;
  itemLevel: number;
};

type CharacterSearchProps = {
  onSelectionChange: (selectedCharacters: Character[]) => void;
  onSearch: () => void;
  searched: boolean;
};

export default function CharacterSearch({ onSelectionChange, onSearch, searched }: CharacterSearchProps) {
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [checkedState, setCheckedState] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  // 자동완성 관련 상태
  const { addToHistory, getSuggestions } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!searched) {
      setCharacterName('');
      setCharacters([]);
      setCheckedState([]);
      setError(null);
    }
  }, [searched]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    onSearch();
    
    const maxRetries = 3;
    let currentRetry = 0;
    
    while (currentRetry <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
        
        const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(characterName.trim())}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('캐릭터를 찾을 수 없습니다. 캐릭터명을 정확히 입력해주세요.');
          }
          if (response.status === 429) {
            throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          }
          if (response.status >= 500) {
            throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
          }
          throw new Error('예상치 못한 오류가 발생했습니다.');
        }
        
        const data = await response.json();
        
        if (data && data.siblings && Array.isArray(data.siblings)) {
          if (data.siblings.length === 0) {
            throw new Error('해당 캐릭터의 원정대 정보를 찾을 수 없습니다.');
          }
          
          const formattedCharacters: Character[] = data.siblings.map((sibling: Sibling) => ({
            characterName: sibling.CharacterName,
            itemLevel: parseFloat(sibling.ItemAvgLevel.replace(/,/g, '')),
          }));
          const sortedCharacters = formattedCharacters.sort((a, b) => b.itemLevel - a.itemLevel);
          setCharacters(sortedCharacters);
          const newCheckedState = sortedCharacters.map((_, index) => index < 6);
          setCheckedState(newCheckedState);
          setShowAll(false);
          setRetryCount(0);
          addToHistory(characterName.trim()); // 검색 성공 시 히스토리에 추가
          setShowSuggestions(false);
          break; // 성공 시 루프 종료
        } else {
          throw new Error('잘못된 데이터 형식입니다.');
        }
      } catch (error: any) {
        currentRetry++;
        setRetryCount(currentRetry);
        
        if (error.name === 'AbortError') {
          setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
          break;
        }
        
        if (currentRetry > maxRetries) {
          setError(error.message || '예상치 못한 오류가 발생했습니다.');
          break;
        }
        
        // 재시도 전 대기 (1초, 2초, 3초)
        if (currentRetry <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, currentRetry * 1000));
        }
      } finally {
        if (currentRetry > maxRetries || error === null) {
          setIsLoading(false);
        }
      }
    }
  };

  const handleCheckboxChange = useCallback((index: number) => {
    const newCheckedState = [...checkedState];
    newCheckedState[index] = !newCheckedState[index];
    setCheckedState(newCheckedState);
  }, [checkedState]);

  // 입력값 변경 시 자동완성 목록 업데이트
  const handleInputChange = (value: string) => {
    setCharacterName(value);
    if (error) setError(null);

    const matches = getSuggestions(value);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0 && value.trim().length > 0);
    setSelectedIndex(-1);
  };

  // 자동완성 항목 선택
  const handleSelectSuggestion = (name: string) => {
    setCharacterName(name);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // 키보드 네비게이션
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

  useEffect(() => {
    const selectedCharacters = characters.filter((_, index) => checkedState[index]);
    onSelectionChange(selectedCharacters);
  }, [checkedState, characters, onSelectionChange]);

  return (
    <>
      <Form onSubmit={handleSearch}>
        <div className="d-flex justify-content-center">
          <div className="mb-3" style={{maxWidth: '550px', width: '100%'}}>
            <div className="d-flex gap-2">
              <div style={{ position: 'relative', flex: 1 }}>
                <Form.Control
                  ref={inputRef}
                  placeholder="로스트아크 캐릭터명을 입력하세요"
                  aria-label="캐릭터명을 입력하세요"
                  value={characterName}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => {
                    const matches = getSuggestions(characterName);
                    if (matches.length > 0 && characterName.trim()) {
                      setSuggestions(matches);
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  autoComplete="off"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                    padding: 'clamp(0.5rem, 1.5vw, 0.65rem) clamp(0.9rem, 2vw, 1.1rem)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    fontWeight: '500',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                />
                {/* 자동완성 드롭다운 */}
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
                          backgroundColor: selectedIndex === index ? 'var(--hover-bg, rgba(0,0,0,0.05))' : 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                          borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
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
                  padding: 'clamp(0.5rem, 1.5vw, 0.65rem) clamp(1.2rem, 2.5vw, 1.6rem)',
                  borderRadius: '12px',
                  fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                  fontWeight: '700',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    검색 중{retryCount > 0 ? ` (${retryCount}/3)` : ''}...
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
            <div className="alert alert-danger d-inline-block" style={{maxWidth: '600px'}} role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          </div>
        )}
      </Form>
      {characters.length > 0 && (
        <div className="d-flex justify-content-center">
          <div style={{ maxWidth: isMobile ? '100%' : '75%', width: '100%' }}>
          <Row>
            {(() => {
              // 모바일: 선택된 6개만 기본 표시, 데스크톱: 6개 기본 표시
              const defaultCount = 6;
              const displayChars = showAll ? characters : characters.slice(0, defaultCount);

              return displayChars.map((char, index) => (
                <Col lg={4} md={4} sm={6} xs={6} key={char.characterName} className={isMobile ? 'mb-2' : 'mb-3'}>
                  <Card
                    className={`character-card ${checkedState[index] ? 'selected' : ''}`}
                    onClick={() => handleCheckboxChange(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCheckboxChange(index);
                      }
                    }}
                    aria-label={`${char.characterName} 레벨 ${char.itemLevel} ${checkedState[index] ? '선택됨' : '선택 안됨'}`}
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      borderColor: checkedState[index] ? 'var(--primary-brand)' : 'var(--border-color)',
                    }}
                  >
                    <Card.Body style={{ padding: isMobile ? '0.5rem 0.6rem' : '1rem' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div
                            className="character-name"
                            style={{
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '0.75rem' : '1rem',
                              fontWeight: 600,
                              marginBottom: isMobile ? '0.1rem' : '0.25rem'
                            }}
                          >
                            {char.characterName}
                          </div>
                          <div
                            className="character-level"
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: isMobile ? '0.65rem' : '0.875rem'
                            }}
                          >
                            Lv. {char.itemLevel.toLocaleString()}
                          </div>
                        </div>
                        <Form.Check
                          type="checkbox"
                          id={`character-checkbox-${index}`}
                          checked={checkedState[index]}
                          onChange={() => {}}
                          className="character-checkbox"
                          tabIndex={-1}
                          aria-hidden="true"
                          style={{ transform: isMobile ? 'scale(0.8)' : 'scale(1)' }}
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ));
            })()}
          </Row>
          {characters.length > 6 && (
            <div className="d-flex justify-content-center mt-2 mb-2">
              <Button
                variant="link"
                onClick={() => setShowAll(!showAll)}
                style={{
                  fontSize: isMobile ? '0.75rem' : '0.88rem',
                  padding: isMobile ? '0.5rem 1.2rem' : '0.6rem 1.8rem',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  backgroundColor: showAll ? 'var(--card-header-bg)' : 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  transition: 'all 0.2s ease',
                  boxShadow: showAll ? 'var(--shadow-sm)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-header-bg)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = showAll ? 'var(--card-header-bg)' : 'transparent';
                  e.currentTarget.style.boxShadow = showAll ? 'var(--shadow-sm)' : 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {showAll ? (
                  <>
                    접기
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                      ({characters.length - 6}개)
                    </span>
                  </>
                ) : (
                  <>
                    더보기
                    <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                      ({characters.length - 6}개)
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}
          </div>
        </div>
      )}
    </>
  );
}
