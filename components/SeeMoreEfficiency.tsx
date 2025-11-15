import React, { useState } from 'react';
import { raids } from '../data/raids';
import styles from './SeeMoreEfficiency.module.css';

const SeeMoreEfficiency: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(raids[0]?.name || null);

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
      <div className={styles.raidButtons}>
        {raids.map((raid) => (
          <button
            key={raid.name}
            className={`${styles.raidButton} ${selectedRaid === raid.name ? styles.active : ''}`}
            onClick={() => setSelectedRaid(raid.name)}
          >
            {raid.name}
          </button>
        ))}
      </div>
      <div className={styles.rewardsContainer}>
        {renderRewardList()}
      </div>
    </section>
  );
};

export default SeeMoreEfficiency;
