import Link from 'next/link';
import { Metadata } from 'next';
import { raids, upcomingRaids } from '@/data/raids';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '로스트아크 레이드 보상 총정리 (2026)',
  description:
    '로스트아크 전체 레이드 보상을 한눈에 비교하세요. 벨가르딘, 지평의 성당, 세르카, 종막, 4막부터 서막까지 관문별 골드와 더보기 보상을 정리했습니다.',
  keywords:
    '로아 레이드 보상, 로아 벨가르딘 보상, 로아 세르카 보상, 로아 성당 보상, 로아 종막 보상, 로아 레이드 골드, 로아 더보기 보상, 카제로스 레이드, 로스트아크 레이드 보상 정리',
  alternates: { canonical: '/guide/raid-rewards' },
};

export default function RaidRewardsGuidePage() {
  // 레이드 총 골드 계산
  const raidTotals = raids.map((raid) => ({
    ...raid,
    totalGold: raid.gates.reduce((sum, g) => sum + g.gold, 0),
    totalMoreGold: raid.gates.reduce((sum, g) => sum + g.moreGold, 0),
  }));
  const upcomingTotals = upcomingRaids.map((raid) => ({
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
          <span className={styles.articleDate}>2026년 2월 6일 작성 · 2026년 7월 18일 업데이트</span>
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
            세르카, 지평의 성당, 베히모스, 서막(에키드나) 등이 있으며,
            2026년 8월 5일에는 신규 레이드 벨가르딘이 출시될 예정입니다.
            각 레이드마다 요구하는 최소 아이템 레벨이 다르며,
            주간 골드 보상을 받을 수 있는 횟수도 캐릭터당 1회로 제한됩니다.
            2026년 6월에는 벨가르딘 추가를 앞두고 일부 상위 레이드의 클리어 골드가 하향 조정되었고,
            이 글의 수치는 조정 이후 기준입니다.
          </p>

          <h2>전체 레이드 보상 비교표</h2>
          <p>
            아래 표에서 각 레이드의 총 클리어 골드와 총 더보기 비용을 한눈에 비교할 수 있습니다.
            더보기는 골드를 지불하고 재련 재료를 추가로 받는 선택지로, 재료 시세에 따라 손익이 달라집니다.
          </p>

          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>레이드</th>
                <th>입장 레벨</th>
                <th>관문 수</th>
                <th>총 클리어 골드</th>
                <th>총 더보기 비용</th>
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
              {upcomingTotals.map((raid) => (
                <tr key={raid.name}>
                  <td style={{ fontWeight: 600 }}>{raid.name} ({raid.releaseLabel})</td>
                  <td>{raid.level}</td>
                  <td>{raid.gates.length}관문</td>
                  <td>{raid.totalGold.toLocaleString()}</td>
                  <td>{raid.totalMoreGold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>레이드별 상세 안내</h2>

          <h3>벨가르딘 (2026년 8월 5일 출시 예정)</h3>
          <p>
            벨가르딘은 노말(1750), 하드(1770), 나이트메어(1780) 세 난이도로 출시되는 신규 레이드입니다.
            나이트메어 기준 총 75,000골드, 하드 62,000골드, 노말 50,000골드로 출시와 동시에
            최고 보상 레이드가 됩니다. 관문별 클리어 골드와 더보기 비용은 이미 공개되어 있으며,
            더보기 보상 재료 구성은 출시 후 확인되는 대로 로아로골에 반영됩니다.
          </p>

          <h3>지평의 성당</h3>
          <p>
            지평의 성당은 1단계(1700), 2단계(1720), 3단계(1750)로 나뉘는 레이드로,
            3단계 기준 총 50,000골드를 제공합니다. 다른 레이드와 달리 클리어 골드 전액이
            <strong> 귀속 골드</strong>로 지급되는 것이 특징입니다. 귀속 골드는 거래소에서 쓸 수 없지만
            재련 비용으로는 사용할 수 있으므로, 성장 중인 캐릭터에게는 체감 가치가 충분히 높습니다.
          </p>

          <h3>세르카</h3>
          <p>
            세르카는 나이트메어(1740), 하드(1730), 노말(1710) 세 가지 난이도가 있으며,
            나이트메어 기준 총 54,000골드, 하드 44,000골드, 노말 32,000골드를 획득할 수 있습니다.
            현재 출시된 레이드 중 일반 골드 기준으로 가장 높은 보상을 제공하며,
            고통의 가시 등 세르카 전용 재화도 함께 드롭됩니다.
          </p>

          <h3>카제로스 종막 (아브렐슈드)</h3>
          <p>
            종막은 카제로스 시리즈의 마지막 레이드로, 하드(1730)와 노말(1710) 난이도가 있습니다.
            하드 기준 총 48,000골드, 노말 기준 32,000골드를 제공합니다.
            아브렐슈드와의 최종 결전으로 스토리적으로도 중요한 레이드입니다.
          </p>

          <h3>카제로스 4막 (일리아칸)</h3>
          <p>
            4막은 하드(1720)와 노말(1700) 난이도로 진행됩니다.
            하드 기준 총 38,000골드, 노말 기준 27,000골드를 보상으로 제공합니다.
            2관문으로 구성되어 있어 비교적 빠르게 클리어할 수 있는 편입니다.
          </p>

          <h3>카제로스 3막 (상아탑)</h3>
          <p>
            3막은 3관문으로 구성된 레이드로, 하드(1700)와 노말(1680) 난이도가 있습니다.
            하드 기준 총 27,000골드, 노말 기준 21,000골드를 획득할 수 있습니다.
            관문이 3개라 다른 2관문 레이드보다 시간이 더 소요되지만, 골드 효율은 양호한 편입니다.
          </p>

          <h3>카제로스 2막, 1막, 서막, 베히모스</h3>
          <p>
            하위 레이드들은 상대적으로 적은 골드를 보상하지만, 아이템 레벨이 낮은 캐릭터도
            참여할 수 있어 원정대 전체의 주간 골드를 채우는 데 중요한 역할을 합니다.
            2막은 하드 기준 총 23,000골드, 1막은 하드 기준 총 18,000골드,
            서막과 베히모스는 각각 총 7,200골드를 제공합니다.
          </p>

          <h2>더보기 보상 선택 가이드</h2>
          <p>
            더보기 보상은 골드를 지불하고 재련 재료를 추가로 받는 선택입니다.
            더보기가 이득인지 여부는 재련 재료의 현재 거래소 시세에 달려 있습니다.
            재료 시세가 높을 때는 더보기로 받는 재료의 가치가 지불 골드를 넘어 이득이 되고,
            시세가 낮을 때는 골드를 아끼는 편이 유리합니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골의 더보기 손익 계산기에서 실시간 거래소 시세를 반영하여
              각 레이드별 더보기 손익을 자동 분석해드립니다. 매주 레이드 전에 확인하세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로아로골에서 내 캐릭터의 레이드 보상을 직접 계산해보세요.</p>
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
            "description": "벨가르딘, 성당, 세르카, 종막부터 서막까지 모든 레이드의 관문별 클리어 골드와 더보기 보상을 비교합니다.",
            "datePublished": "2026-02-06",
            "dateModified": "2026-07-18",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/raid-rewards`
          })
        }}
      />
    </div>
  );
}
