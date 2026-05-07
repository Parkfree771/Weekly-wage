'use client';

import styles from '../contest.module.css';
import { OFFICIAL_EVENT_URL } from '@/data/contest-data';

export default function HeroSection() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroBadge}>AVATAR CONTEST</div>
      <h1 className={styles.heroTitle}>아바타 콘테스트</h1>

      <div className={styles.heroButtons}>
        <a
          href={OFFICIAL_EVENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaPrimary}
        >
          공식 이벤트 페이지
        </a>
        <a href="#section-A" className={styles.ctaSecondary}>
          후보 보러가기
        </a>
      </div>
    </header>
  );
}
