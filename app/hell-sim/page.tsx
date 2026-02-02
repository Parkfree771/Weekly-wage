'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Container } from 'react-bootstrap';
import styles from './hell-sim.module.css';
import { getHellSimTotalCount } from '@/lib/supabase';

const PinballTower = dynamic(
  () => import('@/components/pinball/PinballTower'),
  { ssr: false }
);

export default function HellSimPage() {
  const [dataCount, setDataCount] = useState<number | null>(null);

  useEffect(() => {
    getHellSimTotalCount().then(setDataCount);
  }, []);

  return (
    <div className={styles.container}>
      <Container fluid className={styles.innerContainer}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h1 className={styles.title}>지옥 시뮬레이터</h1>
          <p className={styles.subtitle}>공을 떨어뜨려 지하 100층까지 도달하세요</p>
        </div>

        {/* 게임 */}
        <PinballTower />

        {/* 통계 수집 현황 */}
        <div className={styles.statsSection}>
          <div className={styles.statsCard}>
            <div className={styles.statsCount}>
              {dataCount !== null ? dataCount.toLocaleString() : '-'}
            </div>
            <div className={styles.statsLabel}>시뮬레이션 데이터</div>
            <div className={styles.statsNote}>데이터 수집중...</div>
          </div>
        </div>
      </Container>
    </div>
  );
}
