'use client';

import dynamic from 'next/dynamic';
import { Container } from 'react-bootstrap';
import styles from './hell-sim.module.css';

const PinballTower = dynamic(
  () => import('@/components/pinball/PinballTower'),
  { ssr: false }
);

export default function HellSimPage() {
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
      </Container>
    </div>
  );
}
