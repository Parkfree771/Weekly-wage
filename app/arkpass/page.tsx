'use client';

import dynamic from 'next/dynamic';
import { Container } from 'react-bootstrap';
import styles from './arkpass.module.css';

const ArkPassCalculator = dynamic(
  () => import('@/components/arkpass/ArkPassCalculator'),
  { ssr: false }
);

export default function ArkPassPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem' }}>
        {/* 타이틀 */}
        <div className="text-center" style={{ marginBottom: '0.85rem' }}>
          <h1
            style={{
              fontSize: 'clamp(1.35rem, 3vw, 1.7rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            아크패스 효율
          </h1>
        </div>

        {/* 히어로 — 시즌 아바타 배너 */}
        <div className={styles.hero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arkpass-avatar.webp" alt="창공의 안내자 아크패스 아바타" className={styles.heroImg} />
          <div className={styles.heroOverlay}>
            <span className={styles.heroSeason}>창공의 안내자</span>
          </div>
        </div>

        <ArkPassCalculator />
      </Container>
    </div>
  );
}
