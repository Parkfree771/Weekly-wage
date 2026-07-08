'use client';

import dynamic from 'next/dynamic';
import { Container, Row, Col } from 'react-bootstrap';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';

const HellRewardCalculator = dynamic(
  () => import('@/components/hell-reward/HellRewardCalculator'),
  { ssr: false }
);

export default function HellRewardPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
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
                지옥 보상
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                층수별 보상을 실시간 시세 기반으로 골드 가치를 계산합니다
              </p>
            </div>

            <HellRewardCalculator />

            <GuideFaq
              guideTitle="지옥·나락 보상 이용 가이드"
              sections={[
                {
                  heading: '지옥과 나락, 두 콘텐츠의 보상 구성 차이',
                  paragraphs: [
                    '지옥과 나락은 겉으로는 비슷해 보이지만 상자 안에 들어있는 보상 항목이 서로 다릅니다. 지옥 상자는 특수재련 재료, 상급 아비도스 융화 재료, 파괴석·수호석 결정 선택상자, 위대한 운명의 돌파석을 지급하고, 일정 단계 이상에서는 천상 도전권이 추가됩니다.',
                    '반면 나락 상자는 귀속 각인서 랜덤 상자를 기본으로 지급하며, 단계가 높아지면 귀속 보석과 전설카드팩이 추가로 열립니다. 어빌리티스톤, 팔찌, 젬 선택 상자, 용암의 숨결·빙하의 숨결, 정련된 운명·혼돈의 돌, 귀속골드는 두 콘텐츠 모두에 존재하지만 단계별 지급 수량 자체가 다르게 설계되어 있어, 같은 단계라도 지옥과 나락의 총 기댓값이 다르게 나타납니다.',
                  ],
                },
                {
                  heading: '보상 가격을 매기는 세 가지 방식',
                  paragraphs: [
                    '지옥·나락 보상 계산기는 각 보상 항목의 특성에 맞춰 서로 다른 가격 산정 방식을 사용합니다. 파괴석·수호석 결정, 위대한 운명의 돌파석, 상급 아비도스 융화 재료, 용암·빙하의 숨결, 특수재련, 귀속 각인서, 귀속 보석처럼 거래소·경매장에서 실제로 거래되는 재화는 매시 갱신되는 실시간 시세를 그대로 반영합니다.',
                    '천상 도전권, 전설카드팩, 정련된 운명·혼돈의 돌, 희귀 젬처럼 게임 내에서 사실상 고정된 가치를 가지는 항목은 고정가로 계산하고, 어빌리티스톤이나 팔찌처럼 귀속되어 거래소에 올릴 수 없는 재화는 블루크리스탈·로열크리스탈 환율을 거쳐 페온(귀속 아이템 거래용 재화) 가치로 환산합니다. 카드 우측 상단의 "실시간 시세"·"고정가"·"환율" 배지로 각 항목이 어떤 방식으로 계산되었는지 바로 확인할 수 있습니다.',
                  ],
                },
                {
                  heading: '특수재련 재료의 대체 가치 산출법',
                  paragraphs: [
                    '특수재련 재료는 거래소에서 직접 거래되지 않는 재화라, 계승 무기 20단계에서 21단계로 넘어가는 일반재련 1회의 총비용을 기준으로 대체 가치를 역산합니다. 이 구간의 성공 확률(1.5%)을 기하분포로 계산했을 때 중앙값에 해당하는 시행 횟수를 구하고, 여기에 시행 1회당 필요한 재료 개수를 곱해 "특수재련으로 같은 성공 결과를 얻으려면 몇 개가 필요한지"를 산출한 뒤, 일반재련 총비용을 그 개수로 나누어 특수재련 재료 1개의 단가를 정합니다.',
                  ],
                },
                {
                  heading: '평균 기댓값과 어빌리티스톤 제외 옵션',
                  paragraphs: [
                    '화면 상단의 평균 기댓값은 선택한 단계에서 실제로 지급되는(값이 "-"가 아닌) 보상 항목들의 골드 가치를 모두 더한 뒤 항목 수로 나눈 값입니다. 실제 상자를 열었을 때 어떤 보상이 나올지에 대한 개별 확률까지 반영한 값은 아니므로, 해당 단계에서 나올 수 있는 보상들의 전반적인 수준을 가늠하는 참고 지표로 활용하는 것이 좋습니다.',
                    '어빌리티스톤은 페온 환산 특성상 골드 가치가 다른 항목보다 두드러지게 높게 계산되어 평균값을 왜곡할 수 있어, 기본적으로 평균 기댓값 계산에서 제외되어 있습니다. 체크박스를 해제하면 어빌리티스톤을 포함한 평균값도 바로 확인할 수 있습니다.',
                  ],
                },
              ]}
              faqs={faqData}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
}
