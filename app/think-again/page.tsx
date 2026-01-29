'use client';

import { useState, useCallback, useRef } from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import dynamic from 'next/dynamic';
import styles from './think-again.module.css';

// Canvas 컴포넌트 동적 로드
const FallGame = dynamic(() => import('@/components/think-again/FallGame'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: 300,
      height: 500,
      background: 'linear-gradient(180deg, #0c1929 0%, #1e3a5f 50%, #2d5a87 100%)',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }}>
      로딩 중...
    </div>
  )
});

// 열쇠 타입
type KeyType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface KeyConfig {
  name: string;
  chances: number;
  color: string;
}

const KEY_CONFIGS: Record<KeyType, KeyConfig> = {
  bronze: { name: '브론즈 열쇠', chances: 3, color: '#cd7f32' },
  silver: { name: '실버 열쇠', chances: 4, color: '#c0c0c0' },
  gold: { name: '골드 열쇠', chances: 5, color: '#ffd700' },
  platinum: { name: '플래티넘 열쇠', chances: 6, color: '#e5e4e2' },
  diamond: { name: '다이아몬드 열쇠', chances: 7, color: '#b9f2ff' },
};

// 특별 층 (11의 배수)
const SPECIAL_FLOORS = [11, 22, 33, 44, 55, 66, 77, 88, 99];

type GameState = 'select' | 'playing' | 'jumping' | 'result';

export default function ThinkAgainPage() {
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [remainingChances, setRemainingChances] = useState(0);
  const [fallAmount, setFallAmount] = useState(0);
  const [hitSpecialFloors, setHitSpecialFloors] = useState<number[]>([]);
  const [jumpHistory, setJumpHistory] = useState<number[]>([]);
  const [showSpecialBonus, setShowSpecialBonus] = useState(false);
  const [currentSpecialFloor, setCurrentSpecialFloor] = useState<number | null>(null);

  const gameRef = useRef<{ startFall: (floors: number) => void; reset: () => void } | null>(null);

  // 게임 시작
  const startGame = useCallback((keyType: KeyType) => {
    setSelectedKey(keyType);
    setCurrentFloor(0);
    setRemainingChances(KEY_CONFIGS[keyType].chances);
    setGameState('playing');
    setHitSpecialFloors([]);
    setJumpHistory([]);
    gameRef.current?.reset();
  }, []);

  // 점프 실행
  const executeJump = useCallback(() => {
    if (remainingChances <= 0 || gameState !== 'playing') return;

    const fall = Math.floor(Math.random() * 21); // 0~20
    setFallAmount(fall);
    setGameState('jumping');

    // 게임 캔버스에 낙하 시작 알림
    gameRef.current?.startFall(fall);
  }, [remainingChances, gameState]);

  // 낙하 완료 콜백
  const handleFallComplete = useCallback(() => {
    const newFloor = Math.min(currentFloor + fallAmount, 100);

    // 특별 층 정확히 도달 체크
    if (SPECIAL_FLOORS.includes(newFloor) && !hitSpecialFloors.includes(newFloor)) {
      setHitSpecialFloors(prev => [...prev, newFloor]);
      setShowSpecialBonus(true);
      setCurrentSpecialFloor(newFloor);

      // 3초 후 보너스 표시 숨기기
      setTimeout(() => {
        setShowSpecialBonus(false);
        setCurrentSpecialFloor(null);
      }, 2000);
    }

    setCurrentFloor(newFloor);
    setJumpHistory(prev => [...prev, fallAmount]);
    setRemainingChances(prev => prev - 1);

    // 게임 종료 체크
    if (newFloor >= 100 || remainingChances <= 1) {
      setTimeout(() => {
        setGameState('result');
      }, showSpecialBonus ? 2500 : 500);
    } else {
      setGameState('playing');
    }
  }, [currentFloor, fallAmount, hitSpecialFloors, remainingChances, showSpecialBonus]);

  // 다시 시작
  const resetGame = () => {
    setGameState('select');
    setSelectedKey(null);
    setCurrentFloor(0);
    setRemainingChances(0);
    setFallAmount(0);
    setHitSpecialFloors([]);
    setJumpHistory([]);
    setShowSpecialBonus(false);
    setCurrentSpecialFloor(null);
    gameRef.current?.reset();
  };

  return (
    <div className={styles.pageContainer}>
      <Container fluid style={{ maxWidth: '500px', padding: '1rem' }}>
        <div className="text-center mb-3">
          <h1 className={styles.title}>다시 한번 생각해보자</h1>
          <p className={styles.subtitle}>뛰어내리기 전에... 정말 괜찮겠어?</p>
        </div>

        {/* 열쇠 선택 화면 */}
        {gameState === 'select' && (
          <Card className={styles.card}>
            <Card.Body>
              <h5 className={styles.cardTitle}>열쇠를 선택하세요</h5>
              <div className={styles.keyGrid}>
                {(Object.keys(KEY_CONFIGS) as KeyType[]).map((key) => (
                  <button
                    key={key}
                    className={styles.keyButton}
                    style={{ '--key-color': KEY_CONFIGS[key].color } as React.CSSProperties}
                    onClick={() => startGame(key)}
                  >
                    <div className={styles.keyIcon}>🔑</div>
                    <div className={styles.keyName}>{KEY_CONFIGS[key].name}</div>
                    <div className={styles.keyChances}>{KEY_CONFIGS[key].chances}회</div>
                  </button>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* 게임 화면 */}
        {(gameState === 'playing' || gameState === 'jumping') && (
          <>
            {/* 상태 표시 */}
            <div className={styles.statusBar}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>현재</span>
                <span className={styles.statusValue}>{currentFloor}층</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>남은 기회</span>
                <span className={styles.statusValue}>{remainingChances}회</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>목표</span>
                <span className={styles.statusValue}>100층</span>
              </div>
            </div>

            {/* 게임 캔버스 */}
            <div className={styles.gameContainer}>
              <FallGame
                ref={gameRef}
                fallAmount={fallAmount}
                onFallComplete={handleFallComplete}
              />

              {/* 특별 보너스 표시 */}
              {showSpecialBonus && currentSpecialFloor && (
                <div className={styles.specialBonus}>
                  <div className={styles.specialBonusContent}>
                    <span className={styles.specialBonusStar}>⭐</span>
                    <span className={styles.specialBonusText}>{currentSpecialFloor}층 도달!</span>
                    <span className={styles.specialBonusDesc}>특별 보너스!</span>
                  </div>
                </div>
              )}

              {/* 낙하 층수 표시 */}
              {gameState === 'jumping' && (
                <div className={styles.fallIndicator}>
                  <span className={styles.fallNumber}>-{fallAmount}층</span>
                </div>
              )}
            </div>

            {/* 점프 버튼 */}
            <Button
              className={styles.jumpButton}
              onClick={executeJump}
              disabled={gameState === 'jumping'}
            >
              {gameState === 'jumping' ? '떨어지는 중...' : '🪂 뛰어내리기!'}
            </Button>

            {/* 점프 기록 */}
            {jumpHistory.length > 0 && (
              <div className={styles.historyContainer}>
                <span className={styles.historyLabel}>기록:</span>
                <div className={styles.historyList}>
                  {jumpHistory.map((fall, idx) => (
                    <span
                      key={idx}
                      className={`${styles.historyItem} ${
                        fall <= 9 ? styles.historySafe :
                        fall <= 14 ? styles.historyStumble :
                        styles.historyCrash
                      }`}
                    >
                      -{fall}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 결과 화면 */}
        {gameState === 'result' && (
          <Card className={styles.card}>
            <Card.Body className={styles.resultArea}>
              <h3 className={styles.resultTitle}>
                {currentFloor >= 100 ? '🎉 100층 도달!' : '게임 종료!'}
              </h3>

              <div className={styles.resultFloor}>
                <span className={styles.resultFloorNumber}>{currentFloor}</span>
                <span className={styles.resultFloorLabel}>층</span>
              </div>

              {/* 도달한 특별 층 */}
              {hitSpecialFloors.length > 0 && (
                <div className={styles.specialFloorsList}>
                  <h6>⭐ 특별 층 보너스</h6>
                  <div className={styles.specialFloorsGrid}>
                    {hitSpecialFloors.map(floor => (
                      <span key={floor} className={styles.specialFloorBadge}>
                        {floor}층
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 보상 영역 */}
              <div className={styles.rewardArea}>
                <h5>🎁 획득 보상</h5>
                <p className={styles.rewardPlaceholder}>
                  (보상 데이터 연결 예정)
                </p>
              </div>

              <Button className={styles.restartButton} onClick={resetGame}>
                다시 도전하기
              </Button>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
}
