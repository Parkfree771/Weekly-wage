import Link from 'next/link';
import { Metadata } from 'next';
import { raids } from '@/data/raids';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '로스트아크 레이드 보상 총정리 (2026)',
  description: '로스트아크 전체 레이드 보상을 한눈에 비교하세요. 세르카, 종막, 4막, 3막, 2막, 1막, 서막, 베히모스 레이드의 관문별 골드와 더보기 보상을 정리했습니다.',
  keywords: '로아 레이드 보상, 로아 세르카 보상, 로아 종막 보상, 로아 4막 보상, 로아 레이드 골드, 로아 더보기 보상, 카제로스 레이드, 로스트아크 레이드 보상 정리',
  alternates: { canonical: 'https://lostarkweeklygold.kr/guide/raid-rewards' },
};

export default function RaidRewardsGuidePage() {
  // 레이드 총 골드 계산
  const raidTotals = raids.map((raid) => ({
    ...raid,
    totalGold: raid.gates.reduce((sum, g) => sum + g.gold, 0),
    totalMoreGold: raid.gates.reduce((sum, g) => sum + g.moreGold, 0),
  }));

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>레이드</span>
          <h1 className={styles.articleTitle}>로스트아크 레이드 보상 총정리 (2026)</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>로스트아크 레이드 시스템 개요</h2>
          <p>
            로스트아크의 레이드는 4인 또는 8인 파티로 진행하는 고난도 보스 전투 콘텐츠입니다.
            각 레이드는 여러 개의 관문으로 나뉘어 있으며, 관문을 클리어할 때마다 골드와 재료를 보상으로 받습니다.
            레이드 난이도는 노말, 하드, 나메(나이트메어)로 구분되며, 높은 난이도일수록 더 많은 보상을 제공합니다.
          </p>
          <p>
            현재 로스트아크에서 진행 가능한 주요 레이드는 카제로스 시리즈(1막~종막)와
            세르카, 베히모스, 서막(에키드나) 등이 있습니다. 각 레이드마다 요구하는 최소 아이템 레벨이 다르며,
            주간 골드 보상을 받을 수 있는 횟수도 캐릭터당 1회로 제한됩니다.
          </p>

          <h2>전체 레이드 보상 비교표</h2>
          <p>
            아래 표에서 각 레이드의 총 클리어 골드와 더보기 골드를 한눈에 비교할 수 있습니다.
            더보기를 모두 선택하면 클리어 골드와 더보기 골드를 합산한 금액과 재료를 받게 됩니다.
          </p>

          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>레이드</th>
                <th>입장 레벨</th>
                <th>관문 수</th>
                <th>총 클리어 골드</th>
                <th>총 더보기 골드</th>
              </tr>
            </thead>
            <tbody>
              {raidTotals.map((raid) => (
                <tr key={raid.name}>
                  <td style={{ fontWeight: 600 }}>{raid.name}</td>
                  <td>{raid.level}</td>
                  <td>{raid.gates.length}관문</td>
                  <td>{raid.totalGold.toLocaleString()}</td>
                  <td>{raid.totalMoreGold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>레이드별 상세 안내</h2>

          <h3>세르카 (최상위 레이드)</h3>
          <p>
            세르카는 현재 로스트아크에서 가장 높은 보상을 제공하는 레이드입니다.
            나이트메어(1740), 하드(1730), 노말(1710) 세 가지 난이도가 있으며,
            나이트메어 기준 총 54,000골드, 하드 기준 44,000골드, 노말 기준 35,000골드를 획득할 수 있습니다.
            높은 골드 보상과 함께 세르카 코어, 고동치는 가시 등 특수 재료도 드롭됩니다.
          </p>

          <h3>카제로스 종막 (아브렐슈드)</h3>
          <p>
            종막은 카제로스 시리즈의 마지막 레이드로, 하드(1730)와 노말(1710) 난이도가 있습니다.
            하드 기준 총 52,000골드, 노말 기준 40,000골드를 제공하여 세르카와 비슷한 수준의 보상을 자랑합니다.
            아브렐슈드와의 최종 결전으로 스토리적으로도 중요한 레이드입니다.
          </p>

          <h3>카제로스 4막 (일리아칸)</h3>
          <p>
            4막은 하드(1720)와 노말(1700) 난이도로 진행됩니다.
            하드 기준 42,000골드, 노말 기준 33,000골드를 보상으로 제공합니다.
            2관문으로 구성되어 있어 비교적 빠르게 클리어할 수 있는 편입니다.
          </p>

          <h3>카제로스 3막 (상아탑)</h3>
          <p>
            3막은 3관문으로 구성된 레이드로, 하드(1700)와 노말(1680) 난이도가 있습니다.
            하드 기준 27,000골드, 노말 기준 21,000골드를 획득할 수 있습니다.
            관문이 3개로 다른 2관문 레이드보다 시간이 더 소요되지만, 골드 효율은 양호한 편입니다.
          </p>

          <h3>카제로스 2막, 1막, 서막, 베히모스</h3>
          <p>
            하위 레이드들은 상대적으로 적은 골드를 보상하지만, 아이템 레벨이 낮은 캐릭터도
            참여할 수 있어 원정대 전체의 주간 골드를 채우는 데 중요한 역할을 합니다.
            2막은 하드 기준 23,000골드, 1막은 하드 기준 18,000골드, 서막과 베히모스는 각각 7,200골드를 제공합니다.
          </p>

          <h2>더보기 보상 선택 가이드</h2>
          <p>
            더보기 보상은 기본 클리어 골드의 일부와 재련 재료를 함께 받는 선택입니다.
            더보기가 이득인지 여부는 재련 재료의 현재 거래소 시세에 달려 있습니다.
            재료 시세가 높을 때는 더보기를 선택하면 기본 골드보다 더 많은 가치를 얻을 수 있고,
            시세가 낮을 때는 기본 골드를 선택하는 것이 유리합니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로골로골의 더보기 손익 계산기에서 실시간 거래소 시세를 반영하여
              각 레이드별 더보기 손익을 자동 분석해드립니다. 매주 레이드 전에 확인하세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로골로골에서 내 캐릭터의 레이드 보상을 직접 계산해보세요.</p>
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
            "headline": "로스트아크 레이드 보상 총정리 (2026)",
            "description": "세르카, 종막, 4막부터 서막까지 모든 레이드의 관문별 클리어 골드와 더보기 보상을 비교합니다.",
            "datePublished": "2026-02-06",
            "author": { "@type": "Organization", "name": "로골로골" },
            "publisher": { "@type": "Organization", "name": "로골로골", "url": "https://lostarkweeklygold.kr" },
            "mainEntityOfPage": "https://lostarkweeklygold.kr/guide/raid-rewards"
          })
        }}
      />
    </div>
  );
}
