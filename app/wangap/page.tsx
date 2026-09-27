'use client';

import { useState } from 'react';
import WangapSimulator from '@/components/wangap/WangapSimulator';
import WangapAverageCalculator from '@/components/wangap/WangapAverageCalculator';
import AdBanner from '@/components/ads/AdBanner';
import GuideFaq from '@/components/common/GuideFaq';
import WangapGuideBody from '@/components/guide/WangapGuideBody';
import { faqData } from './faq-data';
import styles from './wangap.module.css';

// 평균 시뮬 / 실제 시뮬 (기본 = 평균 시뮬, 재련 페이지와 동일)
type WangapMode = 'average' | 'real';

export default function WangapPage() {
  const [mode, setMode] = useState<WangapMode>('average');

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
          <WangapAverageCalculator adsActive={mode === 'average'} />
        </div>
        <div style={{ display: mode === 'real' ? 'block' : 'none' }}>
          <WangapSimulator adsActive={mode === 'real'} />
        </div>

        {/* 모바일 인-콘텐츠 광고 — 앱 완갑(시뮬 본문 아래)과 동일 위치 */}
        <div className="d-block d-lg-none my-3">
          <AdBanner slot="8616653628" />
        </div>

        {/* 이용 가이드 + FAQ */}
        <GuideFaq
          relatedGuides={['/guide/wangap-cost', '/guide/wangap-upgrade-schedule', '/refining']}
          guideTitle="완갑 재련 가이드"
          sections={[
            {
              heading: '완갑 강화의 특징',
              paragraphs: [
                '완갑(완전 갑주)은 벨가르딘 레이드와 함께 공개된 신규 장비로, 파괴석 결정과 수호석 결정을 동시에 소모해 강화하는 것이 기존 장비와의 가장 큰 차이입니다. 위대한 돌파석, 상급 아비도스 융화 재료, 운명의 파편, 실링, 골드도 단계마다 함께 소모됩니다.',
                '영웅 등급에서 시작해 최대 25강까지 강화할 수 있으며, +10에서 전설로, +15에서 유물로, +20에서 고대로 승급(해방)해야 다음 구간으로 진행됩니다. 승급에는 벨가르딘 레이드에서 획득하는 사령의 잔영 또는 죽음의 손이 소모되며, 고대 승급은 죽음의 손만 사용할 수 있습니다.',
              ],
            },
            {
              heading: '승급 재료는 골드로 살 수 없습니다',
              paragraphs: [
                '사령의 잔영과 죽음의 손은 거래가 불가능한 귀속 재료입니다. 거래소에서 사서 메울 수 없고 벨가르딘 레이드를 돌아 직접 모아야 하므로, 시뮬레이터의 골드 견적에도 포함되지 않습니다. 승급 자체에 골드가 들지도 않습니다.',
                '그래서 완갑 진행 계획은 골드 예산과 레이드 주차 계획을 따로 세워야 합니다. 골드가 넉넉해도 죽음의 손이 모자라면 +20에서 멈추게 되고, 반대로 승급 재료만 쌓아 두고 강화 재료가 없으면 상한까지 올릴 수 없습니다. 시뮬레이터가 골드 비용과 승급 재료 수량을 나눠 보여주는 것도 이 둘의 병목이 서로 다르기 때문입니다.',
              ],
            },
            {
              heading: '두 가지 시뮬 모드',
              paragraphs: [
                '평균 시뮬은 장인의 기운과 실패 시 확률 변화까지 반영해 목표 단계까지의 예상 재료·골드 소모량을 평균값·중앙값으로 계산하고, 실제 시뮬은 인게임과 동일한 확률로 강화 버튼을 직접 눌러보는 체험 모드입니다. 보조재료 최적화 기능은 용암·빙하의 숨결 실시간 시세를 반영해 기대 비용이 가장 낮은 투입 개수를 자동으로 찾아줍니다.',
                '숨결 시세는 매시 정각 거래소 기준으로 갱신되므로, 시세가 저렴한 날에는 숨결을 많이 넣는 쪽이, 비싼 날에는 적게 넣는 쪽이 기대 비용이 낮아질 수 있습니다. 최적 투입 개수가 날마다 달라지는 이유입니다.',
              ],
            },
          ]}
          article={<WangapGuideBody />}
          faqs={faqData}
        />
      </div>
    </div>
  );
}
