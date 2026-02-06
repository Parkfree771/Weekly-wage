'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
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
              {/* SEO noscript */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>로스트아크 지옥 시뮬레이터</h2>
                  <p>로스트아크 지옥(나락/낙원) 시뮬레이터입니다. 열쇠를 선택하고 공을 떨어뜨려 지하 100층까지 도전하세요. 희귀/영웅/전설 열쇠, 히든층 보상, 로켓점프, 풍요 시스템 등 다양한 요소를 체험할 수 있습니다.</p>
                </div>
              </noscript>
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

        {/* 서비스 설명 섹션 */}
        <Row className="justify-content-center mt-3">
          <Col xl={12} lg={12} md={12} style={{ padding: '0 1rem' }}>
            <section className="faq-section">
              <h2 className="faq-section-title">로골로골 지옥 시뮬레이터란?</h2>
              <div className="faq-item">
                <p className="faq-answer">
                  로골로골 지옥 시뮬레이터는 로스트아크의 지옥(나락/낙원) 콘텐츠를 웹에서 무료로 체험할 수 있는
                  시뮬레이션 게임입니다. 물리 엔진(Matter.js)을 사용하여 실제와 유사한 공의 움직임을 구현했으며,
                  지하 100층까지 공을 떨어뜨리며 다양한 보상을 획득하는 것이 목표입니다.
                  인게임에서 지옥 콘텐츠를 직접 진행하지 않아도, 웹에서 편하게 결과를 미리 체험해볼 수 있습니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>로스트아크 지옥(나락/낙원) 콘텐츠란?</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  지옥(나락/낙원)은 로스트아크에서 열쇠를 사용하여 진행하는 랜덤 보상 콘텐츠입니다.
                  공을 떨어뜨려 각 층에 배치된 보상을 획득하며, 낮은 층으로 내려갈수록 더 좋은 보상을 기대할 수 있습니다.
                  히든층(11의 배수 층)에서는 특별한 고가 보상이 등장하며,
                  로켓점프와 풍요 등 특수 이벤트가 결과에 큰 영향을 미칩니다.
                  운의 요소가 크지만, 열쇠 등급 선택에 따라 기대 보상이 달라지는 전략적 요소도 있습니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>시뮬레이터 특징</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>실제 물리 엔진:</strong> Matter.js 물리 엔진을 사용하여 공의 낙하, 충돌, 튕김을 실제처럼 구현했습니다.
                  매번 공의 경로가 달라지므로 반복 플레이의 재미가 있습니다.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>열쇠 등급 시스템:</strong> 희귀, 영웅, 전설 등급의 열쇠 중 하나를 선택하여 게임을 시작합니다.
                  높은 등급의 열쇠일수록 더 좋은 보상을 획득할 확률이 높아집니다.
                  실제 인게임에서 어떤 열쇠를 사용할지 결정하기 전에 시뮬레이터에서 각 등급의 기대 보상을 확인해보세요.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>히든층과 특수 이벤트:</strong> 11층, 22층, 33층 등 히든층에서는 특별한 고가 보상이 등장합니다.
                  로켓점프는 공이 여러 층을 한 번에 통과하는 이벤트로, 빠르게 하위 층에 도달할 수 있습니다.
                  풍요 시스템은 특정 구간에서 보상이 증가하는 버프 효과를 제공합니다.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>데이터 수집 및 통계:</strong> 모든 시뮬레이션 결과는 Supabase에 자동으로 기록됩니다.
                  축적된 데이터를 기반으로 열쇠 등급별 평균 보상, 히든층 도달 확률 등의
                  통계 정보를 확인할 수 있으며, 데이터가 쌓일수록 더 정확한 기대값을 제공합니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

        {/* 게임 설명 + FAQ 섹션 */}
        <Row className="justify-content-center mt-3">
          <Col xl={12} lg={12} md={12} style={{ padding: '0 1rem' }}>
            <section className="faq-section">
              <h2 className="faq-section-title">지옥 시뮬레이터 안내</h2>

              <div className="faq-item">
                <h3 className="faq-question">지옥 시뮬레이터란?</h3>
                <p className="faq-answer">
                  로골로골의 지옥 시뮬레이터는 로스트아크의 지옥(나락/낙원) 콘텐츠를
                  웹에서 체험할 수 있는 시뮬레이션 게임입니다.
                  열쇠를 선택하고 공을 떨어뜨려 지하 100층까지 도달하는 것이 목표입니다.
                  물리 엔진을 사용하여 실제와 유사한 공의 움직임을 구현했으며,
                  다양한 보상과 이벤트가 층마다 배치되어 있습니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">열쇠 시스템</h3>
                <p className="faq-answer">
                  게임 시작 전 희귀, 영웅, 전설 등급의 열쇠 중 하나를 선택합니다.
                  높은 등급의 열쇠일수록 더 좋은 보상을 획득할 확률이 높아지지만,
                  게임의 난이도나 진행 방식에는 영향을 주지 않습니다.
                  열쇠 선택은 전략적인 요소로, 어떤 보상을 기대하느냐에 따라 결정하면 됩니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">히든층 보상</h3>
                <p className="faq-answer">
                  11의 배수 층(11층, 22층, 33층 등)은 히든층으로 지정되어 있으며,
                  특별한 보상이 준비되어 있습니다. 히든층에 도달하면 일반 층보다
                  더 가치 있는 아이템을 획득할 수 있으므로, 히든층을 노려보세요.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">로켓점프와 풍요 시스템</h3>
                <p className="faq-answer">
                  로켓점프는 특정 조건에서 공이 여러 층을 한 번에 내려가는 특수 이벤트입니다.
                  풍요 시스템은 특정 구간에서 보상이 증가하는 버프 효과입니다.
                  이러한 특수 시스템 덕분에 매번 다른 결과를 경험할 수 있어 반복 플레이의 재미가 있습니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">시뮬레이션 데이터</h3>
                <p className="faq-answer">
                  모든 시뮬레이션 결과는 데이터베이스에 수집되어 통계로 제공됩니다.
                  현재까지 수집된 시뮬레이션 데이터를 통해 각 층별 도달 확률, 보상 분포 등을
                  확인할 수 있습니다. 데이터가 많이 쌓일수록 더 정확한 통계를 제공할 수 있습니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
