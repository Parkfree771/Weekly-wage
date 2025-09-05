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

    // 나중에 이 부분을 주시는 정보에 맞게 수정해야 합니다.
    return (
      <div>
        <h3>{raid.name} 더보기 보상 목록</h3>
        <ul>
          {raid.gates.map(gate => (
            <li key={gate.gate}>
              {gate.gate}관문 더보기: {gate.moreGold.toLocaleString()} 골드
            </li>
          ))}
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
