'use client';

import { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Row, Col, Card } from 'react-bootstrap';

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
};

export default function CharacterSearch({ onSelectionChange, onSearch }: CharacterSearchProps) {
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [checkedState, setCheckedState] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

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

  const handleCheckboxChange = (index: number) => {
    const newCheckedState = [...checkedState];
    newCheckedState[index] = !newCheckedState[index];
    setCheckedState(newCheckedState);
  };

  useEffect(() => {
    const selectedCharacters = characters.filter((_, index) => checkedState[index]);
    onSelectionChange(selectedCharacters);
  }, [checkedState, characters, onSelectionChange]);

  return (
    <>
      <Form onSubmit={handleSearch}>
        <div className="d-flex justify-content-center">
          <InputGroup className="mb-3 simple-search-group" style={{maxWidth: '600px'}}>
            <Form.Control
              placeholder="로스트아크 캐릭터명을 입력하세요"
              aria-label="캐릭터명을 입력하세요"
              value={characterName}
              onChange={(e) => {
                setCharacterName(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              className={`simple-search-input ${error ? 'is-invalid' : ''}`}
              autoComplete="off"
            />
            <Button 
              variant="primary" 
              type="submit" 
              disabled={isLoading || !characterName.trim()} 
              className="simple-search-button"
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
          </InputGroup>
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
        <div>
          <Row>
            {characters.slice(0, showAll ? characters.length : 9).map((char, index) => (
              <Col lg={4} md={6} sm={6} xs={6} key={char.characterName} className="mb-3">
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
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="character-name" aria-hidden="true">{char.characterName}</div>
                        <div className="character-level" aria-hidden="true">Lv. {char.itemLevel.toLocaleString()}</div>
                      </div>
                      <Form.Check
                        type="checkbox"
                        id={`character-checkbox-${index}`}
                        checked={checkedState[index]}
                        onChange={() => {}}
                        className="character-checkbox"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          {characters.length > 9 && (
            <div className="d-flex justify-content-center mt-3 mb-4">
              <Button 
                variant={showAll ? "outline-primary" : "primary"}
                onClick={() => setShowAll(!showAll)}
                className="show-more-button"
              >
                {showAll ? (
                  <>
                    <i className="bi bi-chevron-up me-2"></i>
                    접기 ({characters.length - 9}개 숨기기)
                  </>
                ) : (
                  <>
                    <i className="bi bi-chevron-down me-2"></i>
                    더보기 ({characters.length - 9}개 더 있음)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
