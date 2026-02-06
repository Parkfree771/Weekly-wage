'use client';

import { Container, Row, Col } from 'react-bootstrap';
import LifeCraftCalculator from '@/components/life-master/LifeCraftCalculator';

export default function LifeMasterPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 헤더 - 재련 페이지와 동일한 구조 */}
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
                생활 제작 계산기
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                아비도스 융화재료 제작 손익 계산
              </p>

              {/* SEO noscript */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0'}}>
                  <h2>생활 제작 계산기</h2>
                  <p>로스트아크 아비도스 융화재료 제작 손익을 계산합니다.</p>
                </div>
              </noscript>
            </div>

            {/* 컨텐츠 */}
            <LifeCraftCalculator />
          </Col>
        </Row>

        {/* 서비스 설명 섹션 */}
        <Row className="justify-content-center mt-4">
          <Col xl={12} lg={12} md={12} style={{ padding: '0 2rem' }}>
            <section className="faq-section">
              <h2 className="faq-section-title">로골로골 생활 제작 계산기란?</h2>
              <div className="faq-item">
                <p className="faq-answer">
                  로골로골 생활 제작 계산기는 로스트아크의 생활 콘텐츠(벌목, 채광, 고고학 등)에서 획득한 재료로
                  아비도스 융화재료를 제작할 때의 실시간 손익을 계산하는 무료 도구입니다.
                  로스트아크 공식 API의 거래소 시세를 기반으로 생활 재료 비용, 생활의 가루 비용,
                  완성된 융화재료 판매가를 자동으로 계산하여, 현재 시점에서 제작이 이득인지 손해인지 한눈에 보여줍니다.
                  제작 손익은 거래소 5% 수수료까지 반영한 실제 수령 금액 기준으로 정확하게 계산됩니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>생활 콘텐츠란?</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  생활 콘텐츠는 로스트아크에서 전투 외에 자원을 채집하고 가공하여 수익을 얻는 시스템입니다.
                  벌목(나무 채집), 채광(광석 채집), 고고학(유물 발굴), 낚시, 수렵, 채집 등 총 6가지 종류가 있습니다.
                  각 생활 콘텐츠는 생활 에너지를 소모하여 진행하며, 생활 에너지는 시간이 지나면 자동으로 회복됩니다.
                  생활 에너지가 최대치에 도달하면 더 이상 회복되지 않으므로, 주기적으로 생활 콘텐츠를 진행하는 것이 효율적입니다.
                  혼자서 자유롭게 진행할 수 있어 레이드 파티를 구하기 어려운 시간에도 골드를 벌 수 있는 콘텐츠입니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>아비도스 융화재료 제작 시스템</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  아비도스 융화재료는 T4 장비 재련에 반드시 필요한 핵심 재료입니다.
                  생활 콘텐츠에서 획득한 원재료(목재, 광석, 유물 등)와 생활의 가루를 조합하여 제작할 수 있습니다.
                  융화재료의 거래소 가격은 재련 수요에 따라 변동하며, 일반적으로 안정적인 수요가 있어
                  꾸준한 수익원으로 활용할 수 있습니다. 다만 원재료와 생활의 가루의 비용을 고려했을 때
                  항상 이득이 되는 것은 아니므로, 제작 전에 반드시 손익을 확인해야 합니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>주요 기능</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>실시간 손익 계산:</strong> 거래소 시세를 매시간 자동 갱신하여 제작 손익을 정확하게 계산합니다.
                  재료비(생활 재료 + 생활의 가루)와 판매 수익(융화재료 가격 x 0.95)을 비교하여
                  제작 시 얼마의 이득 또는 손해가 발생하는지 보여줍니다.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>콘텐츠별 효율 비교:</strong> 벌목, 채광, 고고학 등 각 생활 콘텐츠의 수익성을 비교할 수 있습니다.
                  현재 거래소 시세에서 어떤 생활 콘텐츠가 가장 높은 수익을 제공하는지 확인하고,
                  가장 효율적인 콘텐츠를 선택하세요.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-answer">
                  <strong>보유 재료 입력:</strong> 이미 보유한 생활 재료의 수량을 입력하면 제작 가능한 융화재료 수량과
                  예상 수익을 계산합니다. 현재 가지고 있는 재료로 얼마나 벌 수 있는지 사전에 확인할 수 있습니다.
                </p>
              </div>

              <h3 className="faq-question" style={{marginTop: '1rem'}}>수익 계산 원리</h3>
              <div className="faq-item">
                <p className="faq-answer">
                  생활 제작 손익은 다음과 같이 계산됩니다. 먼저 융화재료의 거래소 판매가에서 5% 수수료를 차감한 실제 수령 금액을 구합니다.
                  여기서 제작에 사용되는 생활 재료의 거래소 시세(기회비용)와 생활의 가루 비용을 차감하면 실제 이익이 됩니다.
                  생활 재료를 직접 채집한 경우에도 거래소에서 판매할 수 있으므로, 거래소 시세를 기회비용으로 반영하는 것이 정확한 계산법입니다.
                  로골로골에서는 이 모든 계산을 실시간 시세 기반으로 자동 처리하여,
                  제작과 직접 판매 중 어떤 것이 더 유리한지 명확하게 보여줍니다.
                </p>
              </div>
            </section>
          </Col>
        </Row>

        {/* FAQ 섹션 */}
        <Row className="justify-content-center mt-4">
          <Col xl={12} lg={12} md={12} style={{ padding: '0 2rem' }}>
            <section className="faq-section">
              <h2 className="faq-section-title">생활 제작 계산기 자주 묻는 질문</h2>

              <div className="faq-item">
                <h3 className="faq-question">Q. 아비도스 융화재료란 무엇인가요?</h3>
                <p className="faq-answer">
                  아비도스 융화재료는 T4 장비 재련에 반드시 필요한 재료로, 생활 콘텐츠에서 획득한
                  자원(목재, 광석 등)과 생활의 가루를 사용하여 제작합니다.
                  거래소에서도 구매할 수 있지만, 직접 제작하면 비용을 절약하거나
                  제작 후 판매하여 수익을 얻을 수 있습니다.
                  로골로골의 생활 제작 계산기에서 실시간 손익을 확인하세요.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 생활의 가루는 어디서 얻나요?</h3>
                <p className="faq-answer">
                  생활의 가루는 벌목, 채광, 고고학, 낚시, 수렵, 채집 등 모든 생활 콘텐츠를
                  진행할 때 부산물로 자동 획득됩니다. 생활 에너지를 소모하는 모든 활동에서
                  획득할 수 있으므로, 어떤 생활 콘텐츠를 하든 자연스럽게 모을 수 있습니다.
                  또한 거래소에서 직접 구매하는 것도 가능합니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 벌목 효율은 어떻게 계산하나요?</h3>
                <p className="faq-answer">
                  벌목 효율은 생활 에너지 1포인트당 획득 가능한 골드 가치로 계산됩니다.
                  획득한 목재의 거래소 시세와 제작 가능한 융화재료의 가치를 합산하고,
                  생활의 가루 비용을 차감하여 실제 수익을 구합니다.
                  로골로골에서는 현재 거래소 시세를 자동으로 반영하여 실시간 효율을 계산합니다.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 융화재료 제작이 항상 이득인가요?</h3>
                <p className="faq-answer">
                  아닙니다. 융화재료 제작의 손익은 생활 재료 시세, 생활의 가루 시세,
                  융화재료 판매가에 따라 달라집니다. 재료 시세가 높고 융화재료 가격이 낮으면
                  제작보다 재료를 직접 판매하는 것이 유리할 수 있습니다.
                  로골로골에서 실시간으로 제작 손익을 확인한 후 결정하세요.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Q. 어떤 생활 콘텐츠가 가장 효율적인가요?</h3>
                <p className="faq-answer">
                  가장 효율적인 생활 콘텐츠는 거래소 시세에 따라 매일 변동합니다.
                  일반적으로 벌목과 채광이 안정적인 수익을 제공하며,
                  고고학은 변동폭이 크지만 고가 아이템이 나올 수 있습니다.
                  로골로골의 계산기에서 현재 시세 기준으로 각 콘텐츠의 효율을 비교해보세요.
                </p>
              </div>
            </section>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
