'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import styles from './hell-sim.module.css';
import { getHellSimTotalCount } from '@/lib/supabase';
import AdBanner from '@/components/ads/AdBanner';
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
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 헤더 - 다른 페이지와 동일한 스타일 */}
            <div className="text-center mb-3" style={{ marginTop: 0 }}>
              <h1
                style={{
                  fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: 0,
                  marginBottom: '0.5rem'
                }}
              >
                지옥 시뮬레이터
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                공을 떨어뜨려 지하 100층까지 도달하세요
              </p>
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
          </Col>
        </Row>

      </Container>
    </div>
  );
}
