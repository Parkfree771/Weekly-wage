'use client';

import React, { useState } from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { raids } from '@/data/raids';
import styles from './SeeMoreCalculator.module.css';

const SeeMoreCalculator: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);

  const handleRaidSelect = (raidName: string) => {
    setSelectedRaid(selectedRaid === raidName ? null : raidName);
  };

  // 손익 계산 함수 (나중에 실제 더보기 재료 데이터가 추가되면 구현)
  const calculateProfitLoss = (raidName: string) => {
    // TODO: 더보기 재료 정보가 추가되면 실제 계산 로직 구현
    // 현재는 임시로 0을 반환 (중립)
    return 0;
  };

  // 손익에 따른 CSS 클래스 결정
  const getProfitLossClass = (raidName: string) => {
    const profitLoss = calculateProfitLoss(raidName);
    if (profitLoss > 0) return styles.profitRaid;
    if (profitLoss < 0) return styles.lossRaid;
    return styles.neutralRaid;
  };

  return (
    <div>
      {/* 레이드 목록 버튼들 */}
      <div className={styles.raidGrid}>
        {raids.map((raid) => (
          <Button
            key={raid.name}
            variant={selectedRaid === raid.name ? "primary" : "outline-secondary"}
            className={`${styles.raidButton} ${getProfitLossClass(raid.name)}`}
            onClick={() => handleRaidSelect(raid.name)}
          >
            <div className={styles.raidButtonContent}>
              <span className={styles.raidName}>{raid.name}</span>
              <Badge bg="secondary" className={styles.raidLevel}>Lv. {raid.level}</Badge>
            </div>
          </Button>
        ))}
      </div>

      {/* 선택된 레이드의 더보기 정보 표시 영역 */}
      {selectedRaid && (
        <Card className={`mt-4 ${styles.selectedRaidCard}`}>
          <Card.Header as="h5">
            {selectedRaid} 더보기 보상
          </Card.Header>
          <Card.Body>
            <div className={styles.rewardInfo}>
              {/* 여기에 나중에 더보기 재료 정보가 들어갈 예정 */}
              <p className="text-muted">더보기 재료 정보는 추후 추가될 예정입니다.</p>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default SeeMoreCalculator;
