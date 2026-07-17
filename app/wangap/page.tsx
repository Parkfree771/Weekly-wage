'use client';

import { useState } from 'react';
import WangapSimulator from '@/components/wangap/WangapSimulator';
import WangapAverageCalculator from '@/components/wangap/WangapAverageCalculator';
import AdBanner from '@/components/ads/AdBanner';
import styles from './wangap.module.css';

// 평균 시뮬 / 실제 시뮬 (기본 = 실제 시뮬)
type WangapMode = 'average' | 'real';

export default function WangapPage() {
  const [mode, setMode] = useState<WangapMode>('real');

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '2000px', margin: '0 auto', padding: '1rem clamp(0.75rem, 4vw, 2rem) 0' }}>
        <div className="text-center mb-3">
          <h1
            style={{
              fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: 0,
              marginBottom: '0.5rem',
            }}
          >
            완갑 재련 시뮬레이터
          </h1>

          <noscript>
            <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
              <h2>로스트아크 완갑 재련 시뮬레이터</h2>
              <p>파괴석 결정과 수호석 결정을 동시에 사용하는 벨가르딘 완갑 재련을 시뮬레이션합니다.</p>
            </div>
          </noscript>
        </div>

        {/* 모드 선택 탭 (재련 페이지와 동일한 디자인) */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${mode === 'average' ? styles.tabButtonActive : ''}`}
            onClick={() => setMode('average')}
          >
            <span className={styles.tabLabel}>평균 시뮬</span>
          </button>
          <button
            className={`${styles.tabButton} ${mode === 'real' ? styles.tabButtonActive : ''}`}
            onClick={() => setMode('real')}
          >
            <span className={styles.tabLabel}>실제 시뮬</span>
          </button>
        </div>

        {/* 두 시뮬 모두 유지한 채 표시만 전환 — 탭을 오가도 실제 시뮬 진행 상태가 보존됨 */}
        <div style={{ display: mode === 'average' ? 'block' : 'none' }}>
          <WangapAverageCalculator />
        </div>
        <div style={{ display: mode === 'real' ? 'block' : 'none' }}>
          <WangapSimulator />
        </div>

        {/* 모바일 인-콘텐츠 광고 — 앱 완갑(시뮬 본문 아래)과 동일 위치 */}
        <div className="d-block d-lg-none my-3">
          <AdBanner slot="8616653628" />
        </div>
      </div>
    </div>
  );
}
