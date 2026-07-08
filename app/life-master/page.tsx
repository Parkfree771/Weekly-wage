'use client';

import { Container, Row, Col } from 'react-bootstrap';
import LifeCraftCalculator from '@/components/life-master/LifeCraftCalculator';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';

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
                생활 제작
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                아비도스 융화재료 제작 손익 계산
              </p>

              {/* SEO noscript */}
              <noscript>
                <div style={{padding: '2rem', backgroundColor: 'var(--card-bg)', borderRadius: '12px', margin: '1rem 0'}}>
                  <h2>생활 제작 계산기</h2>
                  <p>로스트아크 아비도스 융화재료 제작 손익을 계산합니다.</p>
                </div>
              </noscript>
            </div>


            {/* 컨텐츠 */}
            <LifeCraftCalculator />

            {/* 이용 가이드 + FAQ */}
            <GuideFaq
              guideTitle="아비도스 융화재료 제작 가이드"
              sections={[
                {
                  heading: '융화재료 두 종류와 필요 재료',
                  paragraphs: [
                    '생활 제작에서 다루는 아이템은 아비도스 융화 재료(일반)와 상급 아비도스 융화 재료 두 가지입니다. 둘 다 한 번 제작하면 10개 단위로 완성되며, 목재 계열 재료 세 가지(아비도스 목재, 부드러운 목재, 목재)와 약간의 골드를 함께 소모합니다.',
                    '일반 융화재료는 아비도스 목재 33개, 부드러운 목재 45개, 목재 86개에 골드 400을 더해 10개가 완성되고, 상급 융화재료는 아비도스 목재 43개, 부드러운 목재 59개, 목재 112개에 골드 520을 더해 10개가 완성됩니다. 요구량이 더 많은 상급 쪽은 그만큼 시세 변동에 따른 손익 폭도 크게 갈립니다.',
                  ],
                  bullets: [
                    '일반: 아비도스 목재 33 + 부드러운 목재 45 + 목재 86 + 골드 400 → 10개',
                    '상급: 아비도스 목재 43 + 부드러운 목재 59 + 목재 112 + 골드 520 → 10개',
                  ],
                },
                {
                  heading: '구매 제작과 보유 제작, 두 가지 계산 방식',
                  paragraphs: [
                    '재료 구매 제작 모드는 세 가지 목재를 전부 거래소에서 사서 만든다고 가정하고, 재료비와 골드 비용을 더한 총 제작 비용을 완성품 개당 비용으로 환산합니다. 이 개당 비용을 판매가와 비교해 직접 사용할 때와 수수료 5%를 뗀 뒤 판매할 때의 손익률을 각각 보여줍니다.',
                    '재료 보유 제작 모드는 이미 캐릭터가 들고 있는 목재 수량을 직접 입력하는 방식입니다. 세 재료 중 어느 하나라도 필요량보다 적으면 제작 자체가 불가능하므로, 계산기는 가장 적게 보유한 재료를 기준으로 몇 회까지 제작할 수 있는지 자동으로 계산합니다.',
                  ],
                },
                {
                  heading: '생활의 가루를 활용한 재료 변환',
                  paragraphs: [
                    '목재는 서로 다른 등급끼리 직접 교환하거나, 생활의 가루를 거쳐 간접적으로 교환할 수 있습니다. 직접 교환은 부드러운 목재 25개를 목재 50개로, 튼튼한 목재 5개를 목재 50개로 바꾸는 방식입니다.',
                    '가루를 이용한 교환은 목재 100개 또는 부드러운 목재 50개를 생활의 가루 80개로 바꾼 뒤, 그 가루 100개를 다시 부드러운 목재 50개·튼튼한 목재 10개·아비도스 목재 10개 중 하나로 전환하는 방식입니다. 계산기의 "생활의 가루 최적화" 사이드바는 아비도스 목재 1개를 확보하는 세 가지 경로(직접 구매, 목재 경유, 부드러운 목재 경유)의 실시간 비용을 비교해 가장 저렴한 방법을 알려줍니다.',
                  ],
                },
                {
                  heading: '보유 재료로 추가 제작 늘리기',
                  paragraphs: [
                    '보유 제작 모드에서 기본 제작을 마치고 나면 세 가지 목재가 서로 다른 비율로 남는 경우가 많습니다. 이때 남은 재료를 가루로 바꾸고 다시 부족한 재료로 전환하는 과정을 반복하면 추가로 몇 번을 더 제작할 수 있는지 계산기가 자동으로 시뮬레이션해줍니다.',
                    '"계산에 적용하기" 버튼을 누르면 이 추가 제작 횟수까지 포함한 최종 손익과, 모든 교환을 마친 뒤 남는 재료 수량을 함께 확인할 수 있어 재료를 낭비 없이 소진하는 계획을 세우는 데 도움이 됩니다.',
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
