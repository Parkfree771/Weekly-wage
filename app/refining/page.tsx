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

        {/* SEO 정보성 콘텐츠 */}
        <Row className="justify-content-center mt-5 mb-4">
          <Col xl={10} lg={11} md={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px', backgroundColor: 'var(--card-body-bg-stone)' }}>
              <Card.Body className="p-4">
                <h2 className="h5 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  T4 재련 비용 계산기 가이드
                </h2>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>계산 모드 안내</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li className="mb-1"><strong>평균 시뮬:</strong> 확률 기반으로 평균적인 재련 비용을 계산합니다. 장기적인 재료 수급 계획에 적합합니다.</li>
                    <li className="mb-1"><strong>실제 시뮬:</strong> 실제 재련처럼 성공/실패를 시뮬레이션합니다. 운에 따른 편차를 확인할 수 있습니다.</li>
                    <li className="mb-1"><strong>장비 자동 판별:</strong> 업화 장비는 계승 전, 전율 장비는 계승 후 재련으로 자동 적용됩니다.</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>필요 재료 종류</h3>
                  <ul className="mb-0 small" style={{ color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
                    <li><strong>파괴강석/수호강석:</strong> 무기/방어구 재련의 기본 재료</li>
                    <li><strong>명예의 돌파석:</strong> 재련 단계별 필수 소모 재료</li>
                    <li><strong>명예의 파편:</strong> 대량으로 필요한 재련 재료</li>
                    <li><strong>골드:</strong> 재련 시도마다 소모되는 비용</li>
                    <li><strong>융화 재료:</strong> 1540 이상 구간에서 추가로 필요</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h3 className="h6 mb-2" style={{ color: 'var(--text-primary)' }}>자주 묻는 질문</h3>
                  <div className="small" style={{ color: 'var(--text-muted)' }}>
                    <p className="mb-2"><strong>Q. 재련 확률은 어떻게 적용되나요?</strong><br />
                    A. 로스트아크 공식 재련 확률을 기반으로 계산하며, 장인의 기운(아템) 누적도 반영됩니다.</p>
                    <p className="mb-2"><strong>Q. 골드 비용은 정확한가요?</strong><br />
                    A. 재료 가격은 실시간 거래소 시세를 반영하며, 재련 골드는 인게임 고정 비용을 적용합니다.</p>
                    <p className="mb-0"><strong>Q. 귀속 재료는 어떻게 계산하나요?</strong><br />
                    A. 귀속 재료가 있다면 해당 수량만큼 거래소 구매 비용에서 차감됩니다.</p>
                  </div>
                </div>

                <div className="small" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <strong>TIP:</strong> 재련 이벤트나 파괴/수호강석 가격 변동 시 재계산하여 최적의 재련 타이밍을 찾아보세요.
                </div>
              </Card.Body>
            </Card>
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
