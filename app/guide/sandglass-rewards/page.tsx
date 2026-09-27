import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import {
  SAND_TABLE,
  SAND_GEM_TO_LV1,
  EVENT_CONTENTS,
  GUARDIAN_TIERS,
  RIFT_TIERS,
  type ContentMaterial,
  type SandTierKey,
} from '@/data/rewardTable';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '할의 모래시계 보상 강화 단계별 수급량 정리',
  description:
    '할의 모래시계 보상 강화 기본(0단계)부터 5단계까지 아이템 레벨 티어별로 받는 보석·위대한 돌파석·숨결 수량을 정리했습니다. 티어마다 지급되는 보석 등급이 달라 개수만 비교하면 오판하게 되는 지점과, 1레벨 보석으로 환산했을 때의 실제 순서, 가디언 토벌·균열·카오스 게이트·필드보스와 비교한 주간 비중까지 계산했습니다.',
  keywords:
    '할의 모래시계, 모래시계 보상, 모래시계 보상 강화, 모래시계 단계, 로아 모래시계, 1레벨 보석, 모래시계 보석, 모래시계 숨결, 주간 콘텐츠 보상',
  alternates: { canonical: '/guide/sandglass-rewards' },
};

const TIERS: SandTierKey[] = ['1730', '1750', '1770'];

/** 보상 강화 단계는 0(기본)~5. 표의 인덱스가 곧 단계다. */
const MAX_LEVEL = SAND_TABLE['1770'].length - 1;
const LEVELS = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);

/** 기본(0단계) 값 — 표가 완전 선형이라 이 값이 곧 한 단계당 증가분이다 */
const base = (tier: SandTierKey) => SAND_TABLE[tier][0];

/** 5단계까지 다 올렸을 때의 값 */
const atMax = (tier: SandTierKey) => SAND_TABLE[tier][MAX_LEVEL];

/** 보석을 1레벨로 환산 */
const gemsAsLv1 = (tier: SandTierKey, row: { gems: number }) => row.gems * SAND_GEM_TO_LV1[tier];

const pctUp = (from: number, to: number) => `${(((to - from) / from) * 100).toFixed(0)}%`;
const fmt = (v: number) => (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1));

// ── 다른 주간 수급원과의 비교 (1770 티어) ──
// 가디언 토벌·균열은 캐릭터마다 하루 1회 × 7일(휴게 미적용), 카오스 게이트·필드보스는 원정대 대표 1캐릭만
// 주간 발생 횟수만큼. 수치는 data/rewardTable.ts 의 실측 평균을 그대로 곱한다.
const CMP_TIER: SandTierKey = '1770';
const DAILY_RUNS = 7;
const amtOf = (mats: ContentMaterial[] | undefined, label: string) =>
  mats?.find((m) => m.label === label)?.amount ?? 0;
const GATE = EVENT_CONTENTS.find((e) => e.key === 'gate')!;
const BOSS = EVENT_CONTENTS.find((e) => e.key === 'boss')!;
const GUARD_TIER = GUARDIAN_TIERS.find((t) => String(t.minLevel) === CMP_TIER);
const RIFT_TIER = RIFT_TIERS.find((t) => String(t.minLevel) === CMP_TIER);

type Source = { name: string; note: string; value: number; sand?: boolean };

const GEM_SOURCES: Source[] = [
  { name: `가디언 토벌 ×${DAILY_RUNS}`, note: '캐릭터별', value: amtOf(GUARD_TIER?.materials, '1레벨 보석') * DAILY_RUNS },
  { name: `${BOSS.name} ×${BOSS.perWeek}`, note: '대표 1캐릭', value: amtOf(BOSS.byTier[CMP_TIER], '1레벨 보석') * BOSS.perWeek },
  { name: `${GATE.name} ×${GATE.perWeek}`, note: '대표 1캐릭', value: amtOf(GATE.byTier[CMP_TIER], '1레벨 보석') * GATE.perWeek },
  { name: '모래시계 기본', note: '캐릭터별', value: gemsAsLv1(CMP_TIER, base(CMP_TIER)), sand: true },
  { name: `모래시계 ${MAX_LEVEL}단계`, note: '캐릭터별', value: gemsAsLv1(CMP_TIER, atMax(CMP_TIER)), sand: true },
];

const STONE_SOURCES: Source[] = [
  { name: `균열 ×${DAILY_RUNS}`, note: '캐릭터별', value: amtOf(RIFT_TIER?.materials, '위대한 돌파석') * DAILY_RUNS },
  { name: `${BOSS.name} ×${BOSS.perWeek}`, note: '대표 1캐릭', value: amtOf(BOSS.byTier[CMP_TIER], '위대한 돌파석') * BOSS.perWeek },
  { name: '모래시계 기본', note: '캐릭터별', value: base(CMP_TIER).stones, sand: true },
  { name: `모래시계 ${MAX_LEVEL}단계`, note: '캐릭터별', value: atMax(CMP_TIER).stones, sand: true },
];

const LAVA_SOURCES: Source[] = [
  { name: `${GATE.name} ×${GATE.perWeek}`, note: '대표 1캐릭', value: amtOf(GATE.byTier[CMP_TIER], '용숨') * GATE.perWeek },
  { name: `${BOSS.name} ×${BOSS.perWeek}`, note: '대표 1캐릭', value: amtOf(BOSS.byTier[CMP_TIER], '용숨') * BOSS.perWeek },
  { name: '모래시계 기본', note: '캐릭터별', value: base(CMP_TIER).lavaBreath, sand: true },
  { name: `모래시계 ${MAX_LEVEL}단계`, note: '캐릭터별', value: atMax(CMP_TIER).lavaBreath, sand: true },
];

const GROUPS: { title: string; rows: Source[] }[] = [
  { title: '1레벨 보석(환산)', rows: GEM_SOURCES },
  { title: '위대한 돌파석', rows: STONE_SOURCES },
  { title: '용암의 숨결', rows: LAVA_SOURCES },
];

const sandMaxOf = (rows: Source[]) => rows[rows.length - 1].value;
const othersOf = (rows: Source[]) => rows.filter((r) => !r.sand).reduce((s, r) => s + r.value, 0);

const GEM_VS_GUARD = sandMaxOf(GEM_SOURCES) / GEM_SOURCES[0].value;
const GEM_OTHERS = othersOf(GEM_SOURCES);
const STONE_VS_RIFT = sandMaxOf(STONE_SOURCES) / STONE_SOURCES[0].value;
const LAVA_OTHERS = othersOf(LAVA_SOURCES);

export default function SandglassRewardsGuidePage() {
  const top = atMax('1770');
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
            다시 계산합니다. 마지막으로 같은 티어의 가디언 토벌·균열·카오스 게이트·필드보스와 나란히
            놓고 모래시계가 한 주 수급에서 얼마나 큰 몫인지 비교합니다.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>보상 강화 단계</span>
              <span className={styles.statValue}>기본 + {MAX_LEVEL}단계</span>
              <span className={styles.statNote}>단계마다 기본값만큼 증가</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{MAX_LEVEL}단계 = 기본의</span>
              <span className={styles.statValue}>{MAX_LEVEL + 1}배</span>
              <span className={styles.statNote}>모든 티어·모든 재화 공통</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>1770 {MAX_LEVEL}단계 보석</span>
              <span className={styles.statValue}>{gemsAsLv1('1770', top)}개</span>
              <span className={styles.statNote}>
                3레벨 {top.gems}개를 1레벨로 환산
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>가디언 토벌 한 주 대비</span>
              <span className={styles.statValue}>{GEM_VS_GUARD.toFixed(1)}배</span>
              <span className={styles.statNote}>1770, 1레벨 보석 기준</span>
            </div>
          </div>

          <h2>단계별 증가는 완전한 선형입니다</h2>
          <p>
            먼저 알아 둘 것은 보상 강화가 단계마다 같은 양씩 늘어난다는 점입니다. 가속도가 붙거나
            마지막 단계에 몰아주는 구조가 아닙니다. 보상 강화를 하지 않은 기본(0단계) 보상이 곧 한
            단계당 증가분이고, n단계의 수급량은 정확히 기본값의 (n+1)배입니다. 아래는 각 티어의 기본
            보상입니다.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>보석</th>
                  <th>위대한 돌파석</th>
                  <th>용암의 숨결</th>
                  <th>빙하의 숨결</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => {
                  const r = base(t);
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
          <p className={styles.tableCaption}>보상 강화 기본(0단계), 보석은 지급 등급 그대로의 개수</p>

          <p>
            1770 티어로 단계를 따라가 보면 1레벨 환산 보석이 한 단계에{' '}
            {gemsAsLv1('1770', base('1770'))}개씩 정확히 같은 폭으로 쌓입니다.
          </p>

          <ol className={styles.stepFlow}>
            {LEVELS.map((lv) => {
              const r = SAND_TABLE['1770'][lv];
              return (
                <li key={lv} className={styles.stepItem}>
                  <strong>{lv === 0 ? '기본' : `${lv}단계`}</strong>
                  보석 {gemsAsLv1('1770', r)}개
                  <br />
                  위대한 돌파석 {r.stones}개
                </li>
              );
            })}
          </ol>

          <p>
            그래서 &quot;몇 단계까지 올릴까&quot;는 의외로 단순한 판단이 됩니다. 단계마다 받는 양이
            일정하니, 그 단계를 올리는 데 드는 비용만 기본 보상과 비교하면 됩니다. 뒤로 갈수록 효율이
            좋아지거나 나빠지는 구간은 없습니다.
          </p>

          <h2>티어별 {MAX_LEVEL}단계 수급량</h2>
          <p>보상 강화를 끝까지 올렸을 때 주 1회로 받는 양입니다.</p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>보석</th>
                  <th>위대한 돌파석</th>
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
            많고, 가장 높은 1770이 {atMax('1770').gems}개로 가장 적습니다. 위대한 돌파석과 숨결은
            정상적으로 1770이 가장 많은데 보석만 순서가 뒤집혀 있습니다.
          </p>

          <h2>보석 등급이 달라서 생기는 착시</h2>
          <p>
            이유는 지급되는 보석의 등급이 티어마다 다르기 때문입니다. 1730은 2레벨 보석을 주고,
            1750과 1770은 3레벨 보석을 줍니다. 보석은 세 개를 합쳐 한 등급을 올리므로 2레벨은
            1레벨 {SAND_GEM_TO_LV1['1730']}개, 3레벨은 1레벨 {SAND_GEM_TO_LV1['1770']}개에
            해당합니다.
          </p>
          <p>같은 잣대로 놓으려면 전부 1레벨로 환산해야 합니다. 아래가 환산 후의 값입니다.</p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>티어</th>
                  <th>보석 등급</th>
                  <th>기본 개수</th>
                  <th>기본 1레벨 환산</th>
                  <th>{MAX_LEVEL}단계 개수</th>
                  <th>{MAX_LEVEL}단계 1레벨 환산</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t}>
                    <td><strong>{t}</strong></td>
                    <td>{SAND_GEM_TO_LV1[t] === 3 ? '2레벨' : '3레벨'}</td>
                    <td>{base(t).gems}</td>
                    <td>{gemsAsLv1(t, base(t))}</td>
                    <td>{atMax(t).gems}</td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${(gemsAsLv1(t, atMax(t)) / gemsAsLv1('1770', atMax('1770'))) * 100}px` }}
                        />
                        <span className={styles.barText}>{gemsAsLv1(t, atMax(t))}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            환산하고 나면 순서가 제자리를 찾습니다. {MAX_LEVEL}단계 기준으로 1730이 1레벨{' '}
            {gemsAsLv1('1730', atMax('1730'))}개, 1750이 {gemsAsLv1('1750', atMax('1750'))}개,
            1770이 {gemsAsLv1('1770', atMax('1770'))}개입니다. 개수로는 1730이{' '}
            {atMax('1730').gems}개로 가장 많아 보였지만 실제 가치는 가장 낮습니다. 1770과의 차이는{' '}
            {pctUp(gemsAsLv1('1730', atMax('1730')), gemsAsLv1('1770', atMax('1770')))}입니다.
          </p>
          <p>
            로아로골의 주간 보상 계산과 마이페이지 달력이 모래시계 보석을 항상 1레벨로 환산해
            집계하는 것도 이 때문입니다. 티어가 섞인 원정대에서 보석 개수를 그대로 더하면 합계가
            의미를 잃습니다.
          </p>

          <h2>티어가 오를 때 무엇이 얼마나 늘어나나</h2>
          <p>{MAX_LEVEL}단계 기준으로 티어 간 증가폭을 보면 재화마다 양상이 다릅니다.</p>

          <div className={styles.tableScroll}>
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
                    ['위대한 돌파석', (t: SandTierKey) => atMax(t).stones],
                    ['용암의 숨결', (t: SandTierKey) => atMax(t).lavaBreath],
                    ['빙하의 숨결', (t: SandTierKey) => atMax(t).glacierBreath],
                  ] as const
                ).map(([label, pick]) => {
                  const a = pick('1730');
                  const b = pick('1750');
                  const c = pick('1770');
                  return (
                    <tr key={label}>
                      <td><strong>{label}</strong></td>
                      <td>
                        {a} → {b} ({pctUp(a, b)})
                      </td>
                      <td>
                        {b} → {c} ({pctUp(b, c)})
                      </td>
                      <td>{pctUp(a, c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p>
            표를 세로로 읽으면 위대한 돌파석만 결이 다릅니다. 돌파석은 1730에서 1770까지{' '}
            {pctUp(atMax('1730').stones, atMax('1770').stones)} 늘어나는 반면, 보석(1레벨 환산)과
            숨결은 모두 {pctUp(gemsAsLv1('1730', atMax('1730')), gemsAsLv1('1770', atMax('1770')))}에
            그칩니다. 보석과 숨결은 두 구간의 증가율까지 똑같아서, 사실상 돌파석 하나만 다른 기울기로
            올라간다고 봐도 됩니다.
          </p>
          <p>
            그래서 모래시계에서 티어 상승의 이득이 가장 또렷하게 나타나는 재화는 위대한 돌파석입니다.
            다만 어느 쪽이 골드로 더 큰 이득인지는 그날 시세에 따라 달라지므로, 수량 증가율과 시세를
            함께 봐야 합니다.
          </p>

          <h2>다른 주간 수급과 나란히 놓으면</h2>
          <p>
            모래시계는 주 1회라 존재감이 작아 보이지만, 보상 강화를 올린 뒤에는 이야기가 달라집니다.
            아래는 {CMP_TIER} 티어에서 같은 재화를 주는 콘텐츠의 한 주 수급을 모래시계와 나란히 놓은
            표입니다. 가디언 토벌과 균열은 하루 1회 × {DAILY_RUNS}일(휴게 미적용), 카오스 게이트와
            필드보스는 주간 발생 횟수 기준입니다.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>재화</th>
                  <th>수급원</th>
                  <th>받는 캐릭터</th>
                  <th>한 주 수량</th>
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => {
                  const max = Math.max(...g.rows.map((r) => r.value));
                  return g.rows.map((r, i) => (
                    <tr key={`${g.title}-${r.name}`}>
                      {i === 0 && (
                        <td rowSpan={g.rows.length} style={{ fontWeight: 600 }}>
                          {g.title}
                        </td>
                      )}
                      <td style={r.sand ? { fontWeight: 600 } : undefined}>{r.name}</td>
                      <td>{r.note}</td>
                      <td className={styles.barCell}>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${(r.value / max) * 100}px` }} />
                          <span className={styles.barText}>{fmt(r.value)}</span>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>
            {CMP_TIER} 티어, 균열·가디언 토벌·필드보스는 실측 표본 평균. 빙하의 숨결은 용암의 숨결과 같은 수량이라 생략
          </p>

          <p>
            보석부터 보면 {MAX_LEVEL}단계 모래시계 한 번이 1레벨 {fmt(sandMaxOf(GEM_SOURCES))}개로,
            가디언 토벌을 한 주 내내 돈 {fmt(GEM_SOURCES[0].value)}개의 {GEM_VS_GUARD.toFixed(1)}배입니다.
            가디언 토벌·필드보스·카오스 게이트를 전부 더한 {fmt(GEM_OTHERS)}개보다도 많습니다. 이 표의
            수급원 가운데 보석을 가장 많이 주는 것은 보상 강화를 올린 모래시계입니다.
          </p>
          <p>
            숨결도 비슷합니다. 카오스 게이트와 필드보스를 모두 챙겨도 용암의 숨결은 한 주{' '}
            {fmt(LAVA_OTHERS)}개인데, {MAX_LEVEL}단계 모래시계는 혼자 {fmt(sandMaxOf(LAVA_SOURCES))}개를
            줍니다. 보상 강화를 전혀 하지 않은 기본 단계({fmt(base(CMP_TIER).lavaBreath)}개)만으로도
            필드보스 한 주 분량({fmt(LAVA_SOURCES[1].value)}개)을 넘습니다.
          </p>
          <p>
            반대로 위대한 돌파석은 균열 쪽이 훨씬 많습니다. {MAX_LEVEL}단계 모래시계의{' '}
            {fmt(sandMaxOf(STONE_SOURCES))}개는 균열 한 주 {fmt(STONE_SOURCES[0].value)}개의{' '}
            {(STONE_VS_RIFT * 100).toFixed(0)}% 수준입니다. 돌파석이 모자란 캐릭터라면 모래시계
            단계보다 균열을 거르지 않는 쪽이 먼저입니다.
          </p>

          <div className={styles.noteBox}>
            <p>
              카오스 게이트와 필드보스는 원정대 대표 캐릭터 한 명만 받는 보상입니다. 반면 모래시계는
              1730 이상인 캐릭터마다 따로 받으므로, 원정대 전체로 보면 캐릭터 수만큼 격차가 더 벌어집니다.
            </p>
          </div>

          <h2>정리</h2>
          <ul>
            <li>
              보상 강화는 기본(0단계)부터 {MAX_LEVEL}단계까지 단계마다 같은 양씩 늘어나는 선형
              구조입니다. n단계 보상은 기본값의 (n+1)배입니다.
            </li>
            <li>
              1730은 2레벨 보석, 1750·1770은 3레벨 보석을 줍니다. 개수를 그대로 비교하면 1730이
              가장 많아 보이지만 1레벨로 환산하면 가장 적습니다.
            </li>
            <li>
              티어가 오를 때 수량 증가율이 가장 큰 재화는 위대한 돌파석입니다. 보석과 숨결은 증가율이
              서로 같습니다.
            </li>
            <li>
              {MAX_LEVEL}단계 모래시계는 {CMP_TIER} 기준 보석과 숨결에서 가디언 토벌·카오스 게이트·필드보스보다
              큰 주간 공급원입니다. 위대한 돌파석은 균열이 훨씬 많습니다.
            </li>
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
              '할의 모래시계 보상 강화 단계별 보석·위대한 돌파석·숨결 수량과 티어별 보석 등급 차이를 1레벨 환산으로 비교했습니다.',
            datePublished: '2026-09-21',
            dateModified: '2026-09-27',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/sandglass-rewards`,
          }),
        }}
      />
    </div>
  );
}
