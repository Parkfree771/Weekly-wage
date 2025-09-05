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
            <h1 className="text-center mb-4 title">로스트아크 골드 계산기</h1>
            <CharacterSearch onSelectionChange={setSelectedCharacters} onSearch={handleSearch} />
            
            <div className="mt-4">
              <RaidCalculator selectedCharacters={selectedCharacters} />
            </div>

            {/* 더보기 계산기 섹션 */}
            <div className="mt-5">
              <h2 className="text-center mb-4">더보기 손익 계산</h2>
              <SeeMoreCalculator />
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
