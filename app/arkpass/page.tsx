'use client';

import dynamic from 'next/dynamic';
import { Container } from 'react-bootstrap';
import styles from './arkpass.module.css';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';

const ArkPassCalculator = dynamic(
  () => import('@/components/arkpass/ArkPassCalculator'),
  { ssr: false }
);

export default function ArkPassPage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1640px', margin: '0 auto', padding: '0 1rem' }}>
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

        <GuideFaq
          guideTitle="아크패스 이용 가이드"
          intro={[
            '아크패스는 로스트아크의 시즌 성장 트랙으로, 레이드 클리어나 필드 활동 등으로 경험치를 쌓아 레벨을 올리면 정해진 보상을 받는 시스템입니다. 이번 시즌 "창공의 안내자"는 1레벨부터 30레벨까지 이어지며, 누구나 받는 무료 달성 보상과 결제로 해금하는 프리미엄·슈퍼 프리미엄 보상으로 구성됩니다.',
            '위 계산기는 레벨별 보상을 실시간 거래소 시세, 블루 크리스탈 환산 단가, 확률형 상자의 기댓값, 현금 구매 상품의 원화 단가 등 보상 성격에 맞춰 골드 가치로 환산해 합산합니다. 환율을 입력하면 프리미엄·슈퍼 프리미엄 결제 금액 대비 이득률이 자동으로 나와, 패스를 살 가치가 있는지 판단하는 데 참고할 수 있습니다.',
          ]}
          sections={[
            {
              heading: '아크패스 보상 구조 — 무료·프리미엄·슈퍼 프리미엄',
              paragraphs: [
                '아크패스는 세 가지 티어로 나뉩니다. 무료(달성) 티어는 결제 없이도 매 레벨 두 가지 달성 보상 중 하나를 선택해 받는 기본 트랙이고, 프리미엄을 결제하면 1레벨부터 30레벨까지 전 구간에서 프리미엄 전용 보상 칸이 추가로 열립니다. 슈퍼 프리미엄은 프리미엄 내용을 그대로 포함하면서, 5레벨 단위의 스페셜 레벨(5·10·15·20·25·30)에서만 지급되는 아바타 부위·크리스탈 상자·탈것이나 펫 선택 상자 같은 시즌 마일스톤 보상을 추가로 제공합니다.',
                '일반 레벨과 스페셜 레벨은 보상이 지급되는 방식도 다릅니다. 일반 레벨은 달성 보상이 두 종류로 나뉘어 있어 원하는 쪽을 직접 골라야 하지만, 스페셜 레벨은 달성 보상이 선택 없이 하나로 고정 지급되고 그 대신 슈퍼 프리미엄 칸에 마일스톤 보상이 붙는 구조입니다.',
              ],
            },
            {
              heading: '레벨별 달성 보상 — 택1과 자동 선택',
              paragraphs: [
                '일반 레벨의 아크패스 달성 보상은 항상 두 개의 보상이 나오고 그중 하나만 받을 수 있는 택1 방식입니다. 계산기에서 원하는 타일을 클릭하면 선택이 바뀌고, 별도로 선택하지 않은 레벨은 두 옵션 중 골드 환산 가치가 더 높은 쪽이 자동으로 선택되어 합계와 이득률 계산에 반영됩니다.',
              ],
              bullets: [
                '영웅 젬 상자·희귀~영웅 젬 상자 : 6종 젬 중 확률로 하나가 나오는 랜덤 보상',
                '창공의 돌파·융화·보조 선택 상자 : 실제 수량과 거래소 시세를 곱해 자동으로 더 비싼 쪽 선택',
                '펫·탈것·아바타 선택 상자 : 거래소 시세가 없어 실제 판매 원화 가격 기준으로 환산',
              ],
            },
            {
              heading: '보상 가치는 어떻게 계산되나요',
              paragraphs: [
                '보상 하나하나의 골드 가치는 종류에 따라 계산 방식이 갈립니다. 파편 상자·돌파석·융화 재료·숨결처럼 거래소에서 매매되는 재화는 실시간 시세를 그대로 곱해 계산하고, 페온이나 젬 가공 초기화권처럼 거래소에 없는 재화는 블루 크리스탈 개당 단가를 환율로 환산합니다. 영웅 젬 상자처럼 여러 결과 중 하나가 확률로 나오는 랜덤 보상은 각 결과물의 확률과 시세를 곱한 값을 모두 더한 기댓값으로 가치를 매기며, 펫·탈것·아바타처럼 애초에 거래소에 없는 항목은 실제 판매되는 원화 가격을 골드로 환산해 반영합니다. 근거가 될 시세나 가격이 없는 항목은 "가치 미산정"으로 표시되고 합계에서는 0으로 처리됩니다.',
              ],
            },
            {
              heading: '환율 입력과 이득률 계산',
              paragraphs: [
                '사이드바 상단의 환율 입력칸은 100골드를 현금 얼마에 사고파는지(100:N원) 나타내며, 이 값으로 100블루 크리스탈이 골드로 얼마인지 환산율이 함께 계산됩니다. 이 환산율은 크리스탈 단가로 표시된 보상과 패스 결제 가격(프리미엄 19,600원, 슈퍼 프리미엄 49,200원)을 골드로 바꾸는 데 공통으로 쓰입니다.',
                '이득률은 (프리미엄·슈퍼 프리미엄에서 새로 추가되는 유료 보상의 골드 가치 − 결제 금액을 골드로 환산한 값) ÷ 결제 금액을 골드로 환산한 값 × 100으로 계산합니다. 이때 무료 달성 보상(택1)은 어차피 결제와 무관하게 받는 몫이라 유료 가치 계산에서는 제외하고, 프리미엄·슈퍼 프리미엄 칸에서 순수하게 새로 열리는 보상만 결제 금액과 비교합니다.',
              ],
            },
          ]}
          faqs={faqData}
        />
      </Container>
    </div>
  );
}
