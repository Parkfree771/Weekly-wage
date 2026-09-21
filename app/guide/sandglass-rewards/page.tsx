import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { SAND_TABLE, SAND_GEM_TO_LV1, type SandTierKey } from '@/data/rewardTable';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '할의 모래시계 보상 강화 단계별 수급량 정리',
  description:
    '할의 모래시계 보상 강화 1단계부터 6단계까지 아이템 레벨 티어별로 받는 보석·석·숨결 수량을 정리했습니다. 티어마다 지급되는 보석 등급이 달라 개수만 비교하면 오판하게 되는 지점과, 1레벨 보석으로 환산했을 때의 실제 순서를 함께 계산했습니다.',
  keywords:
    '할의 모래시계, 모래시계 보상, 모래시계 보상 강화, 모래시계 단계, 로아 모래시계, 1레벨 보석, 모래시계 보석, 모래시계 숨결, 주간 콘텐츠 보상',
  alternates: { canonical: '/guide/sandglass-rewards' },
};

const TIERS: SandTierKey[] = ['1730', '1750', '1770'];
const MAX_LEVEL = 6;

/** 각 티어의 1단계 증가분 — 표가 완전 선형이라 1단계 값이 곧 단계당 증가분이다 */
const perStep = (tier: SandTierKey) => SAND_TABLE[tier][0];

/** 6단계까지 다 올렸을 때의 값 */
const atMax = (tier: SandTierKey) => SAND_TABLE[tier][MAX_LEVEL - 1];

/** 보석을 1레벨로 환산 */
const gemsAsLv1 = (tier: SandTierKey, row: { gems: number }) => row.gems * SAND_GEM_TO_LV1[tier];

export default function SandglassRewardsGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>골드</span>
          <h1 className={styles.articleTitle}>할의 모래시계 보상 강화 단계별 수급량 정리</h1>
          <span className={styles.articleDate}>2026년 9월 21일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            할의 모래시계는 주 1회 보상을 받는 콘텐츠이고, 보상 강화 단계를 올리면 받는 양이
            늘어납니다. 그런데 이 보상표에는 한 가지 함정이 있습니다. 아이템 레벨 티어에 따라
            지급되는 <strong>보석 등급이 다르기 때문에</strong>, 표에 찍힌 개수만 보고 비교하면
            순서를 거꾸로 읽게 됩니다.
          </p>
          <p>
            이 글에서는 티어별·단계별 수급량을 그대로 정리한 뒤, 보석을 1레벨로 환산해 실제 순서를
            다시 계산합니다.
          </p>

          <h2>단계별 증가는 완전한 선형입니다</h2>
          <p>
            먼저 알아 둘 것은 보상 강화가 단계마다 같은 양씩 늘어난다는 점입니다. 가속도가 붙거나
            마지막 단계에 몰아주는 구조가 아닙니다. 아래는 각 티어의 1단계 수급량이고, n단계의
            수급량은 정확히 이 값의 n배입니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>보석</th>
                  <th>석</th>
                  <th>용암의 숨결</th>
                  <th>빙하의 숨결</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => {
                  const r = perStep(t);
                  return (
                    <tr key={t}>
                      <td><strong>{t}</strong></td>
                      <td>{r.gems}</td>
                      <td>{r.stones}</td>
                      <td>{r.lavaBreath}</td>
                      <td>{r.glacierBreath}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p>
            그래서 &quot;몇 단계까지 올릴까&quot;는 의외로 단순한 판단이 됩니다. 단계마다 받는 양이
            일정하니, 그 단계를 올리는 데 드는 비용만 위 값과 비교하면 됩니다. 뒤로 갈수록 효율이
            좋아지거나 나빠지는 구간은 없습니다.
          </p>

          <h2>티어별 6단계 수급량</h2>
          <p>
            보상 강화를 끝까지 올렸을 때 주 1회로 받는 양입니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>보석</th>
                  <th>석</th>
                  <th>용암의 숨결</th>
                  <th>빙하의 숨결</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => {
                  const r = atMax(t);
                  return (
                    <tr key={t}>
                      <td><strong>{t}</strong></td>
                      <td>{r.gems}</td>
                      <td>{r.stones}</td>
                      <td>{r.lavaBreath}</td>
                      <td>{r.glacierBreath}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p>
            여기서 보석 칸을 보면 이상합니다. 가장 낮은 티어인 1730이 {atMax('1730').gems}개로 가장
            많고, 가장 높은 1770이 {atMax('1770').gems}개로 가장 적습니다. 석과 숨결은 정상적으로
            1770이 가장 많은데 보석만 순서가 뒤집혀 있습니다.
          </p>

          <h2>보석 등급이 달라서 생기는 착시</h2>
          <p>
            이유는 지급되는 보석의 등급이 티어마다 다르기 때문입니다. 1730은 2레벨 보석을 주고,
            1750과 1770은 3레벨 보석을 줍니다. 보석은 세 개를 합쳐 한 등급을 올리므로 2레벨은
            1레벨 {SAND_GEM_TO_LV1['1730']}개, 3레벨은 1레벨 {SAND_GEM_TO_LV1['1770']}개에
            해당합니다.
          </p>
          <p>
            같은 잣대로 놓으려면 전부 1레벨로 환산해야 합니다. 아래가 환산 후의 값입니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>보석 등급</th>
                  <th>1단계당 개수</th>
                  <th>1레벨 환산</th>
                  <th>6단계 개수</th>
                  <th>6단계 1레벨 환산</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t}>
                    <td><strong>{t}</strong></td>
                    <td>{SAND_GEM_TO_LV1[t] === 3 ? '2레벨' : '3레벨'}</td>
                    <td>{perStep(t).gems}</td>
                    <td>{gemsAsLv1(t, perStep(t))}</td>
                    <td>{atMax(t).gems}</td>
                    <td>{gemsAsLv1(t, atMax(t))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            환산하고 나면 순서가 제자리를 찾습니다. 6단계 기준으로 1730이 1레벨{' '}
            {gemsAsLv1('1730', atMax('1730'))}개, 1750이 {gemsAsLv1('1750', atMax('1750'))}개,
            1770이 {gemsAsLv1('1770', atMax('1770'))}개입니다. 개수로는 1730이{' '}
            {atMax('1730').gems}개로 가장 많아 보였지만 실제 가치는 가장 낮습니다. 1770과의 차이는{' '}
            {(
              (gemsAsLv1('1770', atMax('1770')) / gemsAsLv1('1730', atMax('1730')) - 1) *
              100
            ).toFixed(0)}
            %입니다.
          </p>
          <p>
            로아로골의 주간 보상 계산과 마이페이지 달력이 모래시계 보석을 항상 1레벨로 환산해
            집계하는 것도 이 때문입니다. 티어가 섞인 원정대에서 보석 개수를 그대로 더하면 합계가
            의미를 잃습니다.
          </p>

          <h2>티어가 오를 때 무엇이 얼마나 늘어나나</h2>
          <p>
            6단계 기준으로 티어 간 증가폭을 보면 재화마다 양상이 다릅니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>재화</th>
                  <th>1730 → 1750</th>
                  <th>1750 → 1770</th>
                  <th>1730 → 1770</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['보석(1레벨 환산)', (t: SandTierKey) => gemsAsLv1(t, atMax(t))],
                    ['석', (t: SandTierKey) => atMax(t).stones],
                    ['용암의 숨결', (t: SandTierKey) => atMax(t).lavaBreath],
                    ['빙하의 숨결', (t: SandTierKey) => atMax(t).glacierBreath],
                  ] as const
                ).map(([label, pick]) => {
                  const a = pick('1730');
                  const b = pick('1750');
                  const c = pick('1770');
                  const pct = (from: number, to: number) => `${(((to - from) / from) * 100).toFixed(0)}%`;
                  return (
                    <tr key={label}>
                      <td><strong>{label}</strong></td>
                      <td>
                        {a} → {b} ({pct(a, b)})
                      </td>
                      <td>
                        {b} → {c} ({pct(b, c)})
                      </td>
                      <td>{pct(a, c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p>
            표를 세로로 읽으면 석만 결이 다릅니다. 석은 1730에서 1770까지{' '}
            {(((atMax('1770').stones - atMax('1730').stones) / atMax('1730').stones) * 100).toFixed(0)}%
            늘어나는 반면, 보석(1레벨 환산)과 숨결은 모두{' '}
            {(
              ((gemsAsLv1('1770', atMax('1770')) - gemsAsLv1('1730', atMax('1730'))) /
                gemsAsLv1('1730', atMax('1730'))) *
              100
            ).toFixed(0)}
            %에 그칩니다. 보석과 숨결은 두 구간의 증가율까지 똑같아서, 사실상 석 하나만 다른
            기울기로 올라간다고 봐도 됩니다.
          </p>
          <p>
            그래서 모래시계에서 티어 상승의 이득이 가장 또렷하게 나타나는 재화는 석입니다. 다만
            어느 쪽이 골드로 더 큰 이득인지는 그날 시세에 따라 달라지므로, 수량 증가율과 시세를
            함께 봐야 합니다.
          </p>

          <h2>정리</h2>
          <ul>
            <li>보상 강화는 단계마다 같은 양씩 늘어나는 선형 구조입니다. 1단계 값에 단계 수를 곱하면 됩니다.</li>
            <li>
              1730은 2레벨 보석, 1750·1770은 3레벨 보석을 줍니다. 개수를 그대로 비교하면 1730이
              가장 많아 보이지만 1레벨로 환산하면 가장 적습니다.
            </li>
            <li>티어가 오를 때 수량 증가율이 가장 큰 재화는 석입니다. 보석과 숨결은 증가율이 서로 같습니다.</li>
          </ul>

          <div className={styles.guideCta}>
            <p>모래시계를 포함한 주간 콘텐츠 수급량은 마이페이지 달력에서 자동으로 집계됩니다.</p>
            <Link href="/mypage" className={styles.guideCtaLink}>
              마이페이지에서 주간 수급 확인하기
            </Link>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: '할의 모래시계 보상 강화 단계별 수급량 정리',
            description:
              '할의 모래시계 보상 강화 단계별 보석·석·숨결 수량과 티어별 보석 등급 차이를 1레벨 환산으로 비교했습니다.',
            datePublished: '2026-09-21',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/sandglass-rewards`,
          }),
        }}
      />
    </div>
  );
}
