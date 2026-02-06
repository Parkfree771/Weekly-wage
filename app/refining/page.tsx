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

        {/* 서비스 설명 섹션 */}
        <Row className="justify-content-center mt-4">
          <Col xl={12} lg={12} md={12} style={{ padding: '0 2rem' }}>
            <section className="faq-section">
              <h2 className="faq-section-title">로골로골 재련 계산기란?</h2>
              <div className="faq-item">
                <p className="faq-answer">
                  로골로골 재련 계산기는 로스트아크 T4 장비 재련에 필요한 비용을 정확하게 계산하고,
                  실제 재련을 시뮬레이션할 수 있는 무료 도구입니다.
                  로스트아크 공식 API의 실시간 거래소 시세를 기반으로 재련 재료(운명의 파괴석, 수호석, 돌파석, 파편)의
                  비용을 자동으로 반영하여, 현재 시점에서 재련에 드는 정확한 골드 비용을 계산합니다.
                  일반 재련과 상급 재련의 비용을 비교하여 어떤 방식이 유리한지 한눈에 확인할 수 있습니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>3가지 모드 소개</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>평균 비용 계산 모드:</strong> 원하는 재련 구간(예: 12강→25강)을 설정하면
                  각 단계별 평균 시도 횟수, 재료 소모량, 총 골드 비용을 계산합니다.
                  장인의 기운(장기백) 시스템까지 고려한 기댓값 기반의 정확한 평균 비용을 제공하며,
                  숨결(재련 확률 증가 아이템) 사용 여부에 따른 비용 변화도 확인 가능합니다.
                  재련 계획을 세울 때 예산을 미리 파악하는 데 유용합니다.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>일반 재련 시뮬레이션 모드:</strong> 인게임과 동일한 확률과 장인의 기운 로직으로
                  실제 재련을 시뮬레이션합니다. 버튼을 클릭하면 성공/실패가 결정되고,
                  장인의 기운이 누적되며, 실제 재련과 동일한 경험을 웹에서 체험할 수 있습니다.
                  시뮬 결과는 통계로 기록되어 평균 시도 횟수, 장기백 도달 비율 등을 확인할 수 있습니다.
                  실제 골드를 소비하기 전에 재련 운을 미리 시험해보세요.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>상급 재련 시뮬레이션 모드:</strong> 14강 이상에서 사용 가능한 상급 재련을 시뮬레이션합니다.
                  상급 재련은 일반 재련 대비 재료 소모가 약 60~70%로 적지만 성공 확률이 낮아,
                  재료 시세에 따라 유불리가 달라집니다. 시뮬레이션을 통해
                  상급 재련의 실제 비용 구조를 체험하고, 일반 재련과 비교하여 최적의 선택을 할 수 있습니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>재련 재료와 비용 구조</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  T4 재련에는 운명의 파편, 운명의 파괴석(무기), 운명의 수호석(방어구), 운명의 돌파석, 골드가 필요합니다.
                  재련 단계가 높아질수록 필요한 재료량과 골드가 증가하며, 성공 확률은 감소합니다.
                  특히 20강 이상에서는 재련 비용이 급격히 상승하므로, 미리 비용을 계산하고
                  충분한 재료를 확보한 후 재련을 시작하는 것이 좋습니다.
                  로골로골에서는 각 재료의 실시간 거래소 시세를 자동으로 반영하여
                  정확한 골드 환산 비용을 제공합니다. 시세가 변동하면 재련 비용도 자동으로 업데이트됩니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>통계 및 데이터</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  재련 시뮬레이션 결과는 자동으로 통계에 반영됩니다.
                  평균 성공 횟수, 평균 비용, 장기백 도달 비율, 1회 성공 비율 등
                  다양한 통계 데이터를 확인할 수 있습니다.
                  통계 데이터가 쌓일수록 더 정확한 기댓값을 제공하며,
                  다른 유저들의 시뮬 결과도 포함되어 실제 재련의 참고 자료로 활용할 수 있습니다.
                  자동 강화 기능으로 빠르게 다수의 시뮬을 진행하여 통계를 수집하는 것도 가능합니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

        {/* FAQ 섹션 */}
        <Row className="justify-content-center mt-4">
          <Col xl={12} lg={12} md={12} style={{ padding: '0 2rem' }}>
            <section className="faq-section">
              <h2 className="faq-section-title">재련 계산기 자주 묻는 질문</h2>

              <div className="faq-item">
                <h3 className="faq-question">Q. T4 재련이란 무엇인가요?</h3>
                <p className="faq-answer">
                  T4(4티어) 재련은 로스트아크의 최신 장비 단계에서 아이템 레벨을 올리는 시스템입니다.
                  재련에는 운명의 파편, 파괴석, 수호석, 돌파석, 골드 등의 재료가 필요하며,
                  성공 확률이 존재합니다. 재련 단계가 높아질수록 필요 재료와 골드가 증가하고
                  성공 확률은 감소합니다. 재련에 성공하면 아이템 레벨이 올라
                  더 높은 난이도의 콘텐츠에 참여할 수 있습니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 일반 재련과 상급 재련의 차이는 무엇인가요?</h3>
                <p className="faq-answer">
                  일반 재련은 전 구간에서 사용할 수 있으며 기본 성공 확률과 재료 소모량을 가집니다.
                  상급 재련은 14강 이상에서 사용 가능하며, 재료 소모가 일반 대비 약 60~70%로 적지만
                  성공 확률이 더 낮습니다. 재련 재료 시세가 비쌀 때는 상급 재련이,
                  시세가 저렴할 때는 일반 재련이 비용 효율적일 수 있습니다.
                  로골로골의 계산기에서 두 방식의 예상 비용을 비교해보세요.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 장인의 기운(장기백)은 어떤 시스템인가요?</h3>
                <p className="faq-answer">
                  장인의 기운은 재련 실패 시 누적되는 보너스 시스템입니다.
                  실패할 때마다 장인의 기운이 일정량씩 쌓이며, 100%에 도달하면 다음 재련은 반드시 성공합니다.
                  이를 &quot;장기백(장인의 기운 100%)&quot;이라 부릅니다.
                  로골로골의 평균 시뮬에서는 장기백까지 필요한 평균 횟수와 총 비용을 계산하며,
                  실제 재련 시뮬에서는 장인의 기운 적용과 동일한 확률로 시뮬레이션을 체험할 수 있습니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 재련 시뮬레이터는 실제 확률과 동일한가요?</h3>
                <p className="faq-answer">
                  네, 로골로골의 재련 시뮬레이터는 로스트아크 인게임과 동일한 성공 확률,
                  장인의 기운 적용 로직을 사용합니다. 실제 재련 전에 시뮬레이션을 통해
                  예상 비용과 장기백 횟수를 미리 확인하고, 재련 전략을 세울 수 있습니다.
                  수천 건의 시뮬레이션 데이터를 통계로 제공하여 참고 자료로 활용하세요.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 재련 비용에 사용되는 시세는 언제 업데이트되나요?</h3>
                <p className="faq-answer">
                  로골로골은 로스트아크 공식 API를 통해 매시간 정각에 재련 재료(운명의 파괴석, 수호석,
                  돌파석, 파편 등)의 거래소 시세를 수집합니다. 재련 비용 계산에는
                  항상 최신 시세가 반영되므로, 정확한 비용 예측이 가능합니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
