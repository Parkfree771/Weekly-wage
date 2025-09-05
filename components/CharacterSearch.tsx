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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (characterName.trim()) {
      setIsLoading(true);
      onSearch();
      try {
        const response = await fetch(`/api/lostark?characterName=${characterName.trim()}`);
        const data = await response.json();
        if (data && data.siblings) {
          const formattedCharacters: Character[] = data.siblings.map((sibling: Sibling) => ({
            characterName: sibling.CharacterName,
            itemLevel: parseFloat(sibling.ItemAvgLevel.replace(/,/g, '')),
          }));
          const sortedCharacters = formattedCharacters.sort((a, b) => b.itemLevel - a.itemLevel);
          setCharacters(sortedCharacters);
          const newCheckedState = sortedCharacters.map((_, index) => index < 6);
          setCheckedState(newCheckedState);
        }
      } catch (error) {
        console.error('Error fetching expedition data:', error);
      } finally {
        setIsLoading(false);
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
          <InputGroup className="mb-3" style={{maxWidth: '500px'}}>
            <Form.Control
              placeholder="캐릭터명을 입력하세요"
              aria-label="캐릭터명을 입력하세요"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              disabled={isLoading}
              className="character-search-input"
            />
            <Button variant="primary" type="submit" disabled={isLoading} className="character-search-button">
              {isLoading ? '검색 중...' : '검색'}
            </Button>
          </InputGroup>
        </div>
      </Form>
      {characters.length > 0 && (
        <Row>
          {characters.map((char, index) => (
            <Col md={4} key={char.characterName} className="mb-3">
              <Card
                className={`character-card ${checkedState[index] ? 'selected' : ''}`}
                onClick={() => handleCheckboxChange(index)}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="character-name">{char.characterName}</div>
                      <div className="character-level">Lv. {char.itemLevel}</div>
                    </div>
                    <Form.Check
                      type="checkbox"
                      id={`character-checkbox-${index}`}
                      checked={checkedState[index]}
                      onChange={() => {}}
                      className="character-checkbox"
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}
