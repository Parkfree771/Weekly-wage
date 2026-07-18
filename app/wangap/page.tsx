'use client';

import { useState } from 'react';
import WangapSimulator from '@/components/wangap/WangapSimulator';
import WangapAverageCalculator from '@/components/wangap/WangapAverageCalculator';
import AdBanner from '@/components/ads/AdBanner';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
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

        {/* 이용 가이드 + FAQ */}
        <GuideFaq
          guideTitle="완갑 재련 가이드"
          sections={[
            {
              heading: '완갑 강화의 특징',
              paragraphs: [
                '완갑(완전 갑주)은 벨가르딘 레이드와 함께 공개된 신규 장비로, 파괴석 결정과 수호석 결정을 동시에 소모해 강화하는 것이 기존 장비와의 가장 큰 차이입니다. 위대한 돌파석, 상급 아비도스 융화 재료, 운명의 파편, 실링, 골드도 단계마다 함께 소모됩니다.',
                '전설 등급에서 시작해 최대 25강까지 강화할 수 있으며, +15에서 유물로, +20에서 고대로 승급해야 다음 구간으로 진행됩니다. 승급에는 벨가르딘 레이드에서 획득하는 전용 승급 재료가 필요합니다.',
              ],
            },
            {
              heading: '두 가지 시뮬 모드',
              paragraphs: [
                '평균 시뮬은 장인의 기운과 실패 시 확률 변화까지 반영해 목표 단계까지의 예상 재료·골드 소모량을 평균값·중앙값으로 계산하고, 실제 시뮬은 인게임과 동일한 확률로 강화 버튼을 직접 눌러보는 체험 모드입니다. 보조재료 최적화 기능은 용암·빙하의 숨결 실시간 시세를 반영해 기대 비용이 가장 낮은 투입 개수를 자동으로 찾아줍니다.',
                '완갑은 아직 인게임 미공개 콘텐츠이므로 12강 이상 구간은 세르카 계승 장비 실측치를, 그 이하는 추세 기반 추정치를 사용합니다. 실제 스펙 공개 시 즉시 수치를 교체해 반영할 예정입니다.',
              ],
            },
          ]}
          faqs={faqData}
        />
      </div>
    </div>
  );
}
