import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { RIFT_TIERS, GUARDIAN_TIERS, type ContentTier } from '@/data/rewardTable';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '균열·전선과 가디언 토벌 티어별 주간 재료 수급량',
  description:
    '카오스 던전(균열·전선)과 가디언 토벌을 매일 돌았을 때 아이템 레벨 티어별로 한 주에 들어오는 재료 수량을 실측 표본 평균으로 정리했습니다. 어느 레벨 구간을 넘길 때 수급이 가장 크게 뛰는지, 골드보다 재료에서 이득이 나는 구간은 어디인지 계산했습니다.',
  keywords:
    '카오스 던전, 균열, 전선, 가디언 토벌, 가토, 일일 숙제, 주간 재료 수급, 운명의 파편, 파괴석 결정, 1레벨 보석, 로아 일일 콘텐츠',
  alternates: { canonical: '/guide/weekly-content-materials' },
};

const PER_WEEK = 7;

/** 티어를 레벨 오름차순으로 (원본 배열은 내림차순) */
const asc = (tiers: ContentTier[]) => [...tiers].sort((a, b) => a.minLevel - b.minLevel);

const RIFT = asc(RIFT_TIERS);
const GUARDIAN = asc(GUARDIAN_TIERS);

/** 라벨에 키워드가 들어간 재료의 1회 수급량 */
const amt = (tier: ContentTier, keyword: string) =>
  tier.materials.find((m) => m.label.includes(keyword))?.amount ?? 0;

const pct = (from: number, to: number) => (from === 0 ? '-' : `${(((to - from) / from) * 100).toFixed(0)}%`);

const tierAt = (tiers: ContentTier[], level: number) =>
  tiers.find((t) => t.minLevel === level) ?? null;

/** 계승 재료 경계 — 이 두 티어의 석 수치는 종류가 달라 직접 비교할 수 없다 */
const RIFT_1720 = tierAt(RIFT, 1720);
const RIFT_1730 = tierAt(RIFT, 1730);

const RIFT_LOW = RIFT[0];
const RIFT_TOP = RIFT[RIFT.length - 1];
const GUARD_LOW = GUARDIAN[0];
const GUARD_TOP = GUARDIAN[GUARDIAN.length - 1];

/** 가디언 토벌 보석 증가폭이 가장 큰 구간 찾기 */
const GUARD_JUMP = GUARDIAN.slice(1).reduce(
  (best, t, i) => {
    const prev = GUARDIAN[i];
    const gain = amt(t, '보석') / amt(prev, '보석');
    return gain > best.gain ? { from: prev, to: t, gain } : best;
  },
  { from: GUARDIAN[0], to: GUARDIAN[1], gain: 0 }
);

/** 균열 파편 증가폭이 가장 큰 구간 */
const RIFT_JUMP = RIFT.slice(1).reduce(
  (best, t, i) => {
    const prev = RIFT[i];
    const gain = amt(t, '파편') / amt(prev, '파편');
    return gain > best.gain ? { from: prev, to: t, gain } : best;
  },
  { from: RIFT[0], to: RIFT[1], gain: 0 }
);

export default function WeeklyContentMaterialsGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>골드</span>
          <h1 className={styles.articleTitle}>균열·전선과 가디언 토벌 티어별 주간 재료 수급량</h1>
          <span className={styles.articleDate}>2026년 9월 21일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            레벨을 올릴지 말지 고민할 때 대부분 주간 골드부터 봅니다. 그런데 레이드 골드는 입장
            레벨을 넘는 순간에만 계단식으로 오르기 때문에, 계단과 계단 사이에서는 아무리 올려도
            골드가 그대로입니다. 그 구간에서 실제로 달라지는 것은 일일 콘텐츠의 재료 티어입니다.
          </p>
          <p>
            이 글은 카오스 던전(균열·전선)과 가디언 토벌을 매일 돌았을 때 한 주에 들어오는 재료가
            티어별로 얼마나 달라지는지 정리한 것입니다. 수치는 인게임 실측 표본의 평균이고, 주간
            환산은 휴게를 쓰지 않은 하루 1회 × {PER_WEEK}일 기준입니다.
          </p>

          <h2>균열·전선 — 주간 재료 수급</h2>
          <p>
            1730 이상은 &quot;균열&quot;, 그 아래는 &quot;전선&quot;으로 이름이 갈리고, 주는 재료 계열도
            다릅니다. 1730부터는 계승 재료(파괴석 결정·수호석 결정·위대한 돌파석)를 주고, 1720
            이하는 비계승 재료(파괴석·수호석·돌파석)를 줍니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>파괴석 계열</th>
                  <th>수호석 계열</th>
                  <th>돌파석 계열</th>
                  <th>운명의 파편</th>
                </tr>
              </thead>
              <tbody>
                {RIFT.map((t) => (
                  <tr key={t.label}>
                    <td><strong>{t.label}</strong></td>
                    <td>{Math.round(amt(t, '파괴석') * PER_WEEK).toLocaleString()}</td>
                    <td>{Math.round(amt(t, '수호석') * PER_WEEK).toLocaleString()}</td>
                    <td>{Math.round(amt(t, '돌파석') * PER_WEEK).toLocaleString()}</td>
                    <td>{Math.round(amt(t, '파편') * PER_WEEK).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            표를 읽을 때 주의할 점이 있습니다. 1730을 경계로 재료 <strong>종류</strong>가 바뀌기
            때문에, 석과 돌파석 칸은 1720 이하와 1730 이상을 직접 비교할 수 없습니다. 1720 전선의
            파괴석 {RIFT_1720 ? Math.round(amt(RIFT_1720, '파괴석') * PER_WEEK).toLocaleString() : '-'}개와 1730 균열의
            파괴석 결정 {RIFT_1730 ? Math.round(amt(RIFT_1730, '파괴석') * PER_WEEK).toLocaleString() : '-'}개는 개수만
            보면 줄어든 것처럼 보이지만, 결정은 상위 계열이라 쓰임과 시세가 다릅니다. 계열이 같은
            운명의 파편만 전 구간을 관통해 비교할 수 있습니다.
          </p>
          <p>
            가장 낮은 {RIFT_LOW.label}에서 가장 높은 {RIFT_TOP.label}까지 가면 운명의 파편이 주간{' '}
            {Math.round(amt(RIFT_LOW, '파편') * PER_WEEK).toLocaleString()}개에서{' '}
            {Math.round(amt(RIFT_TOP, '파편') * PER_WEEK).toLocaleString()}개로 늘어납니다.{' '}
            {pct(amt(RIFT_LOW, '파편'), amt(RIFT_TOP, '파편'))} 증가입니다.
          </p>
          <p>
            다만 증가가 고르지 않습니다. 파편 기준으로 가장 크게 뛰는 구간은{' '}
            <strong>{RIFT_JUMP.from.label} → {RIFT_JUMP.to.label}</strong>로,{' '}
            {pct(amt(RIFT_JUMP.from, '파편'), amt(RIFT_JUMP.to, '파편'))} 늘어납니다. 반대로{' '}
            {RIFT[0].label} → {RIFT[1].label} 구간은{' '}
            {pct(amt(RIFT[0], '파편'), amt(RIFT[1], '파편'))}에 그칩니다. 레벨을 올리는 목적이
            재료 수급이라면 어느 티어를 넘기는지가 중요하다는 뜻입니다.
          </p>
          <p>
            참고로 {RIFT_TOP.label}부터는 실링이 함께 들어옵니다. 1회{' '}
            {Math.round(amt(RIFT_TOP, '실링')).toLocaleString()}, 주간으로는{' '}
            {Math.round(amt(RIFT_TOP, '실링') * PER_WEEK).toLocaleString()}입니다. 실링은 거래소
            시세가 없어 골드 환산에는 잡히지 않지만, 상급 재련이 실링을 대량으로 먹는다는 점을
            생각하면 무시할 항목은 아닙니다.
          </p>

          <h2>가디언 토벌 — 주간 보석 수급</h2>
          <p>
            가디언 토벌의 주 수입은 보석입니다. 티어마다 지급되는 보석 등급이 달라서, 아래 수치는
            전부 1레벨 보석으로 환산한 값입니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>1회</th>
                  <th>주간({PER_WEEK}회)</th>
                  <th>직전 티어 대비</th>
                </tr>
              </thead>
              <tbody>
                {GUARDIAN.map((t, i) => (
                  <tr key={t.label}>
                    <td><strong>{t.label}</strong></td>
                    <td>{amt(t, '보석').toFixed(1)}</td>
                    <td>{(amt(t, '보석') * PER_WEEK).toFixed(1)}</td>
                    <td>{i === 0 ? '-' : pct(amt(GUARDIAN[i - 1], '보석'), amt(t, '보석'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            여기서 눈에 띄는 계단이 하나 있습니다.{' '}
            <strong>{GUARD_JUMP.from.label} → {GUARD_JUMP.to.label}</strong> 구간에서 보석 수급이{' '}
            {pct(amt(GUARD_JUMP.from, '보석'), amt(GUARD_JUMP.to, '보석'))} 늘어납니다. 그 아래
            구간들은 {GUARD_LOW.label}에서 {GUARDIAN[1].label}까지{' '}
            {pct(amt(GUARD_LOW, '보석'), amt(GUARDIAN[1], '보석'))} 수준으로 거의 제자리입니다.
          </p>
          <p>
            즉 가디언 토벌만 놓고 보면 {GUARD_JUMP.to.minLevel} 도달이 확실한 분기점입니다. 그
            아래에서 레벨을 조금씩 올리는 것은 가토 수급을 거의 바꾸지 못합니다. 전체로 보면{' '}
            {GUARD_LOW.label}에서 {GUARD_TOP.label}까지 주간{' '}
            {(amt(GUARD_LOW, '보석') * PER_WEEK).toFixed(1)}개에서{' '}
            {(amt(GUARD_TOP, '보석') * PER_WEEK).toFixed(1)}개로{' '}
            {pct(amt(GUARD_LOW, '보석'), amt(GUARD_TOP, '보석'))} 늘어납니다.
          </p>

          <h2>골드 계단과 재료 계단은 위치가 다릅니다</h2>
          <p>
            주간 골드는 레이드 입장 레벨에서만 오릅니다. 반면 일일 콘텐츠의 재료 티어는 그와
            다른 지점에서 갈립니다. 그래서 &quot;이 레벨까지 올려도 주급이 그대로&quot;인 구간이라도
            재료 수급은 한 단계 올라가 있는 경우가 생깁니다.
          </p>
          <p>
            레벨업 판단을 골드만 보고 내리면 이 부분이 통째로 빠집니다. 재련 비용을 뽑아 비교할
            때는 늘어나는 주간 골드에 더해, 위 표의 재료 증가분을 실시간 시세로 환산한 값까지
            같이 놓아야 실제 손익에 가까워집니다.
          </p>
          <p>
            로아로골 원정대 수급 골드 시뮬은 &quot;골드 + 재련 재료&quot; 탭에서 이 계산을 함께 해
            줍니다. 레이드 클리어 보상뿐 아니라 균열·전선, 가디언 토벌, 할의 모래시계, 원정대
            대표 캐릭터만 받는 카오스 게이트·필드보스까지 포함해 레벨업 전후를 비교합니다.
          </p>

          <h2>정리</h2>
          <ul>
            <li>
              균열·전선은 1730부터 계승 재료로 바뀌고, 파편 기준 주간 수급이{' '}
              {RIFT_LOW.label} {Math.round(amt(RIFT_LOW, '파편') * PER_WEEK).toLocaleString()}개에서{' '}
              {RIFT_TOP.label} {Math.round(amt(RIFT_TOP, '파편') * PER_WEEK).toLocaleString()}개까지
              올라갑니다.
            </li>
            <li>
              가디언 토벌 보석은 {GUARD_JUMP.to.minLevel}에서 한 번 크게 뜁니다. 그 아래 구간의
              레벨업은 가토 수급을 거의 바꾸지 않습니다.
            </li>
            <li>골드 계단과 재료 계단의 위치가 다르므로, 레벨업 판단은 둘을 함께 봐야 합니다.</li>
          </ul>

          <div className={styles.guideCta}>
            <p>레벨업 전후의 주간 골드와 재료 수급 변화를 한 번에 비교해 보세요.</p>
            <Link href="/expedition-gold" className={styles.guideCtaLink}>
              원정대 수급 골드 시뮬 바로가기
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
            headline: '균열·전선과 가디언 토벌 티어별 주간 재료 수급량',
            description:
              '카오스 던전과 가디언 토벌의 티어별 주간 재료 수급을 실측 표본 평균으로 정리하고, 수급이 크게 뛰는 레벨 구간을 계산했습니다.',
            datePublished: '2026-09-21',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/weekly-content-materials`,
          }),
        }}
      />
    </div>
  );
}
