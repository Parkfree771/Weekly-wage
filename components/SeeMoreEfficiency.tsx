import React, { useState } from 'react';
import Image from 'next/image';
import { raids } from '../data/raids';
import styles from './SeeMoreEfficiency.module.css';

const SeeMoreEfficiency: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(raids[0]?.name || null);

  // 각 레이드의 총 더보기 골드 계산
  const calculateTotalMoreGold = (gates: Array<{ gate: number; gold: number; moreGold: number }>) => {
    return gates.reduce((sum, gate) => sum + gate.moreGold, 0);
  };

  const renderRewardList = () => {
    const raid = raids.find(r => r.name === selectedRaid);
    if (!raid) {
      return <p>레이드를 선택하세요.</p>;
    }

    return (
      <div className={styles.rewardsList}>
        <h3>{raid.name} 더보기 보상 목록</h3>
        <ul>
          {raid.gates.map(gate => {
            const isProfit = gate.moreGold > 0;
            const isLoss = gate.moreGold < 0;
            const itemClassName = isProfit ? styles.profit : isLoss ? styles.loss : styles.neutral;

            return (
              <li key={gate.gate} className={`${styles.rewardItem} ${itemClassName}`}>
                <span>{gate.gate}관문 더보기</span>
                <span>{gate.moreGold.toLocaleString()} 골드</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>더보기 효율</h2>
      <div className={styles.raidCardsGrid}>
        {raids.map((raid) => {
          const totalMoreGold = calculateTotalMoreGold(raid.gates);
          const isProfit = totalMoreGold > 0;
          const isLoss = totalMoreGold < 0;
          const isSelected = selectedRaid === raid.name;

          return (
            <div
              key={raid.name}
              className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => setSelectedRaid(raid.name)}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={raid.image || '/behemoth.png'}
                  alt={raid.name}
                  fill
                  className={styles.raidImage}
                  sizes="(max-width: 768px) 150px, 200px"
                />
                <div className={styles.overlay} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.raidName}>{raid.name}</h3>
                <p className={styles.raidLevel}>Lv. {raid.level}</p>
                <div className={`${styles.goldBadge} ${isProfit ? styles.profitBadge : isLoss ? styles.lossBadge : styles.neutralBadge}`}>
                  {isProfit ? '+' : ''}{totalMoreGold.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.rewardsContainer}>
        {renderRewardList()}
      </div>
    </section>
  );
};

export default SeeMoreEfficiency;
