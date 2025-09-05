'use client';

import { useState } from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import CharacterSearch from '@/components/CharacterSearch';
import RaidCalculator from '@/components/RaidCalculator';
import SeeMoreCalculator from '@/components/SeeMoreCalculator';
import styles from './page.module.css';

type Character = {
  characterName: string;
  itemLevel: number;
};

type RaidInfo = {
  id: string;
  name: string;
  difficulty: 'normal' | 'hard';
};

const RAIDS: RaidInfo[] = [
  { id: 'jongmak_hard', name: '종막', difficulty: 'hard' },
  { id: 'jongmak_normal', name: '종막', difficulty: 'normal' },
  { id: '4mak_hard', name: '4막', difficulty: 'hard' },
  { id: '4mak_normal', name: '4막', difficulty: 'normal' },
];

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);

  const handleSearch = () => {
    setSearched(true);
  };

  const handleRaidSelect = (raidId: string) => {
    setSelectedRaid(selectedRaid === raidId ? null : raidId);
  };

  const getDifficultyText = (difficulty: 'normal' | 'hard') => {
    return difficulty === 'hard' ? '하드' : '노말';
  };

  const getDifficultyClass = (difficulty: 'normal' | 'hard') => {
    return difficulty === 'hard' ? styles.hardButton : styles.normalButton;
  };

  return (
    <div className={`main-container ${searched ? 'searched' : ''}`}>
      <Container fluid className="mt-5">
        <Row className="justify-content-center">
          <Col xl={10} lg={11} md={12}>
            <div className="text-center mb-4">
              <h1 className="title mb-2">원정대 주급 계산</h1>
              <p className="text-muted mb-4" style={{fontSize: '1.1rem', fontWeight: '400'}}>
                캐릭터 닉네임 검색해서 원정대 주급 계산
              </p>
            </div>
            <CharacterSearch onSelectionChange={setSelectedCharacters} onSearch={handleSearch} />
            
            <div className="mt-4">
              <RaidCalculator selectedCharacters={selectedCharacters} />
            </div>

            {/* 더보기 계산기 섹션 */}
            <div className="mt-5">
              <Card className="border-0 shadow-lg" style={{borderRadius: '16px', overflow: 'hidden'}}>
                <Card.Header 
                  className="text-center py-4 border-0" 
                  style={{
                    background: 'linear-gradient(145deg, #f8f9ff 0%, #e8ecff 100%)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                  }}
                >
                  <div>
                    <h2 
                      className="mb-1" 
                      style={{
                        fontWeight: '700', 
                        fontSize: '1.75rem',
                        background: 'linear-gradient(145deg, #4f46e5, #7c3aed)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.025em',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                      }}
                    >
                      하남자 특 손익 따짐
                    </h2>
                    <p className="text-muted mb-0" style={{fontSize: '0.95rem', fontWeight: '400'}}>
                      더보기 손익 계산
                    </p>
                  </div>
                </Card.Header>
                <Card.Body className="p-4" style={{backgroundColor: '#fafbff'}}>
                  <SeeMoreCalculator />
                </Card.Body>
              </Card>
            </div>

          </Col>
        </Row>
        <footer className="text-center text-muted mt-5">
          <p>&copy; {new Date().getFullYear()} Lost Ark Gold Calculator. All rights reserved.</p>
        </footer>
      </Container>
    </div>
  );
}
