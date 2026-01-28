'use client';

import { useState, ReactNode } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import RefiningCalculator from '@/components/refining/RefiningCalculator';
import RefiningSimulator from '@/components/refining/RefiningSimulator';
import AdvancedRefiningSimulator from '@/components/refining/AdvancedRefiningSimulator';
import RefiningStats from '@/components/refining/RefiningStats';
import styles from './refining.module.css';

// 3개 탭으로 통합: 평균 시뮬 / 일반 재련 / 상급 재련
type RefiningMode = 'average' | 'normal' | 'advanced';

export default function RefiningPage() {
  const [mode, setMode] = useState<RefiningMode>('normal');

  // 모드 선택 탭 컴포넌트
  const ModeSelector = (
    <div className={styles.tabContainer}>
      <button
        className={`${styles.tabButton} ${mode === 'average' ? styles.tabButtonActive : ''}`}
        onClick={() => setMode('average')}
      >
        <span className={styles.tabLabel}>평균 시뮬</span>
      </button>
      <button
        className={`${styles.tabButton} ${mode === 'normal' ? styles.tabButtonActive : ''}`}
        onClick={() => setMode('normal')}
      >
        <span className={styles.tabLabel}>일반 재련</span>
      </button>
      <button
        className={`${styles.tabButton} ${mode === 'advanced' ? styles.tabButtonActive : ''}`}
        onClick={() => setMode('advanced')}
      >
        <span className={styles.tabLabel}>상급 재련</span>
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '2000px', margin: '0 auto', padding: '0 2rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 간소화된 헤더 */}
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
                T4 재련 비용 계산
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                목표 레벨까지 필요한 재료와 골드를 계산해보세요
              </p>

              {/* SEO noscript */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>로스트아크 T4 재련 비용 계산기</h2>
                  <p>T4 장비 재련에 필요한 재료와 골드를 정확하게 계산합니다.</p>
                </div>
              </noscript>
            </div>

            {/* 컨텐츠 영역 */}
            <div className={styles.contentArea}>
              {mode === 'average' && (
                <RefiningCalculator modeSelector={ModeSelector} />
              )}
              {mode === 'normal' && (
                <RefiningSimulator refiningType="normal" showStats={false} modeSelector={ModeSelector} />
              )}
              {mode === 'advanced' && (
                <AdvancedRefiningSimulator modeSelector={ModeSelector} />
              )}
            </div>

            {/* 통계 - 실제 시뮬(일반/상급)일 때만 표시 */}
            {(mode === 'normal' || mode === 'advanced') && (
              <RefiningStats />
            )}
          </Col>
        </Row>

      </Container>

      {/* 푸터 */}
      <footer style={{ padding: '1.5rem 0', marginTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                &copy; {new Date().getFullYear()} <strong style={{ color: 'var(--text-primary)' }}>로스트아크 골드 계산기</strong>
              </p>
              <div className="d-flex justify-content-center gap-3">
                <a href="/about" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  사이트 소개
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <a href="/privacy" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  개인정보처리방침
                </a>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <a href="/terms" style={{ color: 'var(--text-muted)' }} className="text-decoration-none hover-primary small">
                  이용약관
                </a>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
}
