import Link from 'next/link';
import { Metadata } from 'next';
import { raids } from '@/data/raids';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '로스트아크 주간 골드 수익 완벽 가이드',
  description: '로스트아크 주간 골드 시스템 완벽 정리. 캐릭터별 골드 획득 제한, 레이드별 보상 비교, 더보기 효율, 골드 수익 극대화 전략까지 한눈에 알아보세요.',
  keywords: '로아 주간 골드, 로아 골드 가이드, 로아 주급, 로아 레이드 골드, 로아 더보기, 로아 골드 제한, 로스트아크 골드 수익',
  alternates: { canonical: 'https://lostarkweeklygold.kr/guide/weekly-gold' },
};

export default function WeeklyGoldGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>골드</span>
          <h1 className={styles.articleTitle}>로스트아크 주간 골드 수익 완벽 가이드</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>주간 골드란?</h2>
          <p>
            로스트아크에서 주간 골드는 매주 수요일 오전 6시를 기준으로 초기화되는 레이드 보상 시스템입니다.
            각 캐릭터는 지정된 레이드를 클리어하면 관문별로 골드를 획득할 수 있으며, 이 골드는 거래소에서
            아이템을 구매하거나 재련 비용을 충당하는 데 사용됩니다. 주간 골드는 로스트아크 경제의 핵심이며,
            효율적으로 관리하면 캐릭터 성장 속도를 크게 높일 수 있습니다.
          </p>

          <h2>골드 획득 제한 시스템</h2>
          <p>
            원정대 내에서 주간 골드를 획득할 수 있는 캐릭터 수는 최대 6캐릭터로 제한됩니다.
            아이템 레벨이 가장 높은 6캐릭터가 자동으로 골드 획득 대상이 되며,
            나머지 캐릭터는 레이드를 클리어하더라도 골드 보상을 받을 수 없습니다.
            따라서 원정대를 구성할 때 골드 획득 캐릭터를 전략적으로 선택하는 것이 중요합니다.
          </p>

          <h2>현재 레이드별 골드 보상 (2026년 2월 기준)</h2>
          <p>
            아래 표는 현재 로스트아크에서 진행 가능한 모든 레이드의 관문별 클리어 골드와 더보기 골드를 정리한 것입니다.
            더보기 골드는 클리어 골드 대신 재료 보상을 선택했을 때 추가로 지급되는 골드입니다.
          </p>

          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>레이드</th>
                <th>입장 레벨</th>
                <th>관문</th>
                <th>클리어 골드</th>
                <th>더보기 골드</th>
              </tr>
            </thead>
            <tbody>
              {raids.map((raid) =>
                raid.gates.map((gate, i) => (
                  <tr key={`${raid.name}-${gate.gate}`}>
                    {i === 0 && (
                      <>
                        <td rowSpan={raid.gates.length} style={{ fontWeight: 600 }}>{raid.name}</td>
                        <td rowSpan={raid.gates.length}>{raid.level}</td>
                      </>
                    )}
                    <td>{gate.gate}관문</td>
                    <td>{gate.gold.toLocaleString()}</td>
                    <td>{gate.moreGold.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h2>더보기 보상이란?</h2>
          <p>
            더보기 보상은 레이드 클리어 후 기본 골드 보상 대신 재련 재료와 소량의 골드를 받는 시스템입니다.
            더보기를 선택하면 운명의 파편, 파괴석, 수호석, 돌파석 등의 재련 재료를 추가로 획득할 수 있습니다.
            더보기의 효율은 거래소 시세에 따라 달라지므로, 실시간 시세를 확인하고 판단하는 것이 좋습니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로골로골의 주간 골드 계산기에서는 실시간 거래소 시세를 반영하여
              더보기 손익을 자동 계산해드립니다. 초록색이면 더보기가 이득, 빨간색이면 기본 골드가 유리합니다.
            </p>
          </div>

          <h2>골드 수익 극대화 전략</h2>
          <h3>1. 높은 레벨 레이드 우선 클리어</h3>
          <p>
            골드 보상은 레이드 난이도와 입장 레벨에 비례합니다. 세르카 나메(1740)는 총 54,000골드,
            세르카 하드(1730)는 44,000골드를 제공하므로, 가능한 한 높은 난이도의 레이드를 클리어하는 것이 유리합니다.
          </p>

          <h3>2. 6캐릭터 원정대 운영</h3>
          <p>
            골드 획득 제한이 6캐릭터이므로, 6캐릭터를 모두 레이드 컨텐츠에 참여시키는 것이 수익을 극대화하는 방법입니다.
            각 캐릭터의 아이템 레벨을 균형있게 올려 다양한 레이드에 참여할 수 있도록 준비하세요.
          </p>

          <h3>3. 더보기 효율 매주 확인</h3>
          <p>
            거래소 시세는 매일 변동하므로, 매주 레이드 전에 더보기 효율을 확인하는 습관을 들이세요.
            특히 재련 재료 시세가 급등할 때는 더보기를 선택하는 것이 훨씬 유리할 수 있습니다.
          </p>

          <div className={styles.guideCta}>
            <p>로골로골 주간 골드 계산기로 내 원정대의 주간 수익을 확인해보세요.</p>
            <Link href="/weekly-gold" className={styles.guideCtaLink}>
              주간 골드 계산기 바로가기
            </Link>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "로스트아크 주간 골드 수익 완벽 가이드",
            "description": "캐릭터별 주간 골드 획득 제한, 레이드별 보상, 골드 수익 극대화 전략까지 한눈에 정리했습니다.",
            "datePublished": "2026-02-06",
            "author": { "@type": "Organization", "name": "로골로골" },
            "publisher": { "@type": "Organization", "name": "로골로골", "url": "https://lostarkweeklygold.kr" },
            "mainEntityOfPage": "https://lostarkweeklygold.kr/guide/weekly-gold"
          })
        }}
      />
    </div>
  );
}
