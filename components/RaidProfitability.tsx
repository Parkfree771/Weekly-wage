
import styles from './RaidProfitability.module.css';

type Raid = {
  name: string;
  profit: '이득' | '손해';
};

// Placeholder data
const raids: Raid[] = [
  { name: '종막 하드', profit: '이득' },
  { name: '종막 노말', profit: '손해' },
  { name: '상아탑 하드', profit: '이득' },
  { name: '상아탑 노말', profit: '이득' },
  { name: '카양겔 하드', profit: '손해' },
  { name: '카양겔 노말', profit: '손해' },
  { name: '일리아칸 하드', profit: '이득' },
  { name: '일리아칸 노말', profit: '이득' },
];

const RaidProfitability = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>레이드별 더보기 효율</h2>
      <div className={styles.scrollContainer}>
        {raids.map((raid) => (
          <div key={raid.name} className={styles.card}>
            <span className={styles.raidName}>{raid.name}</span>
            <span className={raid.profit === '이득' ? styles.profit : styles.loss}>
              {raid.profit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RaidProfitability;
