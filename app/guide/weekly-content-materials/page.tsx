import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { RAID_TABLE, RIFT_TIERS, GUARDIAN_TIERS, type ContentTier } from '@/data/rewardTable';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '균열·전선과 가디언 토벌 티어별 주간 재료 수급량',
  description:
    '카오스 던전(균열·전선)과 가디언 토벌을 매일 돌았을 때 아이템 레벨 티어별로 한 주에 들어오는 재료 수량을 실측 표본 평균으로 정리했습니다. 어느 레벨 구간을 넘길 때 수급이 가장 크게 뛰는지, 재료 티어가 오르는 레벨과 주간 골드가 오르는 레벨이 어디서 겹치고 어디서 갈리는지 계산했습니다.',
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
const amt = (tier: ContentTier | null, keyword: string) =>
  tier?.materials.find((m) => m.label.includes(keyword))?.amount ?? 0;

const pct = (from: number, to: number) => (from === 0 ? '-' : `${(((to - from) / from) * 100).toFixed(0)}%`);
const wk = (v: number) => Math.round(v * PER_WEEK).toLocaleString();

const tierAt = (tiers: ContentTier[], level: number) =>
  tiers.find((t) => t.minLevel === level) ?? null;

/** 해당 레벨에서 적용되는 티어 (minLevel ≤ level 중 가장 높은 것) */
const tierFor = (tiers: ContentTier[], level: number) =>
  [...tiers].reverse().find((t) => t.minLevel <= level) ?? null;

/** 계승 재료 경계 — 이 두 티어의 석 수치는 종류가 달라 직접 비교할 수 없다 */
const RIFT_1720 = tierAt(RIFT, 1720);
const RIFT_1730 = tierAt(RIFT, 1730);

const RIFT_LOW = RIFT[0];
const RIFT_TOP = RIFT[RIFT.length - 1];
const GUARD_LOW = GUARDIAN[0];
const GUARD_TOP = GUARDIAN[GUARDIAN.length - 1];

const MAX_RIFT_FRAG = amt(RIFT_TOP, '파편');
const MAX_GUARD_GEM = amt(GUARD_TOP, '보석');

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

// 1770 부터 실링이 붙는다 (균열·가디언 토벌 둘 다)
const SHILLING_WEEK = (amt(RIFT_TOP, '실링') + amt(GUARD_TOP, '실링')) * PER_WEEK;

// ── 골드 계단 × 재료 계단 ──
// 주간 골드는 캐릭터 1명 · 레이드 그룹당 최고 골드 난이도 1개 · 상위 3개 합산 (원정대 수급 골드 시뮬 본문과 같은 기준).
type Raid = { name: string; group: string; level: number; gold: number };
const RAIDS: Raid[] = RAID_TABLE.map((e) => ({
  name: e.name,
  group: e.group,
  level: e.level,
  gold: e.gates.reduce((s, g) => s + g.gold, 0),
}));

function weeklyGold(level: number): number {
  const best = new Map<string, Raid>();
  for (const r of RAIDS) {
    if (r.level > level) continue;
    const cur = best.get(r.group);
    if (!cur || cur.gold < r.gold) best.set(r.group, r);
  }
  return [...best.values()]
    .sort((a, b) => b.gold - a.gold)
    .slice(0, 3)
    .reduce((s, r) => s + r.gold, 0);
}

const CONTENT_LEVELS = new Set([...RIFT, ...GUARDIAN].map((t) => t.minLevel));
const STAIR_LEVELS = [...new Set([...RAIDS.map((r) => r.level), ...CONTENT_LEVELS])]
  .filter((lv) => lv >= RIFT_LOW.minLevel)
  .sort((a, b) => a - b);

const STAIRS = STAIR_LEVELS.map((level, i) => {
  const prevLevel = i === 0 ? null : STAIR_LEVELS[i - 1];
  const gold = weeklyGold(level);
  const goldDelta = prevLevel === null ? null : gold - weeklyGold(prevLevel);
  const matStep = CONTENT_LEVELS.has(level);
  const frag = amt(tierFor(RIFT, level), '파편');
  const fragDelta = prevLevel === null ? null : frag - amt(tierFor(RIFT, prevLevel), '파편');
  const gem = amt(tierFor(GUARDIAN, level), '보석');
  const gemDelta = prevLevel === null ? null : gem - amt(tierFor(GUARDIAN, prevLevel), '보석');
  return { level, gold, goldDelta, matStep, fragDelta, gemDelta };
});

const BOTH = STAIRS.filter((s) => s.goldDelta !== null && s.goldDelta > 0 && s.matStep);
const GOLD_ONLY = STAIRS.filter((s) => s.goldDelta !== null && s.goldDelta > 0 && !s.matStep);
const MAT_ONLY = STAIRS.filter((s) => s.goldDelta !== null && s.goldDelta === 0 && s.matStep);
const MAX_GOLD_DELTA = Math.max(...STAIRS.map((s) => s.goldDelta ?? 0));

const levels = (arr: { level: number }[]) => arr.map((s) => s.level).join(', ');

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
            레벨을 올릴지 말지 고민할 때 대부분 주간 골드부터 봅니다. 그런데 레벨업으로 달라지는
            것은 골드만이 아닙니다. 매일 도는 카오스 던전(균열·전선)과 가디언 토벌도 아이템 레벨
            티어에 따라 주는 재료가 바뀌고, 이 차이는 한 주 단위로 쌓이면 꽤 커집니다.
          </p>
          <p>
            이 글은 두 콘텐츠를 매일 돌았을 때 한 주에 들어오는 재료가 티어별로 얼마나 달라지는지
            정리하고, 재료 티어가 오르는 레벨과 주간 골드가 오르는 레벨을 한 표에 겹쳐 봅니다. 수치는
            인게임 실측 표본의 평균이고, 주간 환산은 휴게를 쓰지 않은 하루 1회 × {PER_WEEK}일
            기준입니다.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>재료 티어</span>
              <span className={styles.statValue}>{RIFT.length}구간</span>
              <span className={styles.statNote}>
                {RIFT_LOW.minLevel}부터 {RIFT_TOP.minLevel}까지
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>주간 운명의 파편</span>
              <span className={styles.statValue}>
                {(amt(RIFT_TOP, '파편') / amt(RIFT_LOW, '파편')).toFixed(2)}배
              </span>
              <span className={styles.statNote}>
                {RIFT_LOW.label} → {RIFT_TOP.label}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>주간 1레벨 보석</span>
              <span className={styles.statValue}>
                {(amt(GUARD_TOP, '보석') / amt(GUARD_LOW, '보석')).toFixed(2)}배
              </span>
              <span className={styles.statNote}>
                {GUARD_LOW.label} → {GUARD_TOP.label}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>{RIFT_TOP.minLevel} 주간 실링</span>
              <span className={styles.statValue}>{Math.round(SHILLING_WEEK).toLocaleString()}</span>
              <span className={styles.statNote}>균열 + 가디언 토벌</span>
            </div>
          </div>

          <h2>균열·전선 — 주간 재료 수급</h2>
          <p>
            1730 이상은 &quot;균열&quot;, 그 아래는 &quot;전선&quot;으로 이름이 갈리고, 주는 재료 계열도
            다릅니다. 1730부터는 계승 재료(파괴석 결정·수호석 결정·위대한 돌파석)를 주고, 1720
            이하는 비계승 재료(파괴석·수호석·돌파석)를 줍니다.
          </p>

          <div className={styles.tableScroll}>
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
                    <td>{wk(amt(t, '파괴석'))}</td>
                    <td>{wk(amt(t, '수호석'))}</td>
                    <td>{wk(amt(t, '돌파석'))}</td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${(amt(t, '파편') / MAX_RIFT_FRAG) * 100}px` }}
                        />
                        <span className={styles.barText}>{wk(amt(t, '파편'))}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>하루 1회 × {PER_WEEK}일, 실측 표본 평균을 반올림</p>

          <p>
            표를 읽을 때 주의할 점이 있습니다. 1730을 경계로 재료 <strong>종류</strong>가 바뀌기
            때문에, 석과 돌파석 칸은 1720 이하와 1730 이상을 직접 비교할 수 없습니다. 1720 전선의
            파괴석 {wk(amt(RIFT_1720, '파괴석'))}개와 1730 균열의 파괴석 결정{' '}
            {wk(amt(RIFT_1730, '파괴석'))}개는 개수만 보면 줄어든 것처럼 보이지만, 결정은 상위
            계열이라 쓰임과 시세가 다릅니다. 계열이 같은 운명의 파편만 전 구간을 관통해 비교할 수
            있습니다.
          </p>
          <p>
            가장 낮은 {RIFT_LOW.label}에서 가장 높은 {RIFT_TOP.label}까지 가면 운명의 파편이 주간{' '}
            {wk(amt(RIFT_LOW, '파편'))}개에서 {wk(amt(RIFT_TOP, '파편'))}개로 늘어납니다.{' '}
            {pct(amt(RIFT_LOW, '파편'), amt(RIFT_TOP, '파편'))} 증가입니다.
          </p>
          <p>
            다만 증가가 고르지 않습니다. 파편 기준으로 가장 크게 뛰는 구간은{' '}
            <strong>
              {RIFT_JUMP.from.label} → {RIFT_JUMP.to.label}
            </strong>
            로, {pct(amt(RIFT_JUMP.from, '파편'), amt(RIFT_JUMP.to, '파편'))} 늘어납니다. 반대로{' '}
            {RIFT[0].label} → {RIFT[1].label} 구간은{' '}
            {pct(amt(RIFT[0], '파편'), amt(RIFT[1], '파편'))}에 그칩니다. 레벨을 올리는 목적이
            재료 수급이라면 어느 티어를 넘기는지가 중요하다는 뜻입니다.
          </p>
          <p>
            참고로 {RIFT_TOP.label}부터는 실링이 함께 들어옵니다. 1회{' '}
            {Math.round(amt(RIFT_TOP, '실링')).toLocaleString()}, 주간으로는 {wk(amt(RIFT_TOP, '실링'))}
            입니다. 같은 {GUARD_TOP.minLevel} 가디언 토벌에서도 1회{' '}
            {Math.round(amt(GUARD_TOP, '실링')).toLocaleString()}씩 붙어, 둘을 합치면 한 주{' '}
            {Math.round(SHILLING_WEEK).toLocaleString()}입니다. 실링은 거래소 시세가 없어 골드 환산에는
            잡히지 않지만, 상급 재련이 실링을 대량으로 먹는다는 점을 생각하면 무시할 항목은 아닙니다.
          </p>

          <h2>가디언 토벌 — 주간 보석 수급</h2>
          <p>
            가디언 토벌의 주 수입은 보석입니다. 티어마다 지급되는 보석 등급이 달라서, 아래 수치는
            전부 1레벨 보석으로 환산한 값입니다.
          </p>

          <div className={styles.tableScroll}>
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
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${(amt(t, '보석') / MAX_GUARD_GEM) * 100}px` }}
                        />
                        <span className={styles.barText}>{(amt(t, '보석') * PER_WEEK).toFixed(1)}</span>
                      </div>
                    </td>
                    <td>{i === 0 ? '-' : pct(amt(GUARDIAN[i - 1], '보석'), amt(t, '보석'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            여기서 눈에 띄는 계단이 하나 있습니다.{' '}
            <strong>
              {GUARD_JUMP.from.label} → {GUARD_JUMP.to.label}
            </strong>{' '}
            구간에서 보석 수급이 {pct(amt(GUARD_JUMP.from, '보석'), amt(GUARD_JUMP.to, '보석'))}{' '}
            늘어납니다. 그 아래 구간들은 {GUARD_LOW.label}에서 {GUARDIAN[1].label}까지{' '}
            {pct(amt(GUARD_LOW, '보석'), amt(GUARDIAN[1], '보석'))} 수준으로 거의 제자리입니다.
          </p>
          <p>
            즉 가디언 토벌만 놓고 보면 {GUARD_JUMP.to.minLevel} 도달이 확실한 분기점입니다. 그
            아래에서 레벨을 조금씩 올리는 것은 가토 수급을 거의 바꾸지 못합니다. 전체로 보면{' '}
            {GUARD_LOW.label}에서 {GUARD_TOP.label}까지 주간 {(amt(GUARD_LOW, '보석') * PER_WEEK).toFixed(1)}
            개에서 {(amt(GUARD_TOP, '보석') * PER_WEEK).toFixed(1)}개로{' '}
            {pct(amt(GUARD_LOW, '보석'), amt(GUARD_TOP, '보석'))} 늘어납니다.
          </p>

          <h2>골드 계단과 재료 계단은 어디서 겹치나</h2>
          <p>
            주간 골드는 새 레이드의 입장 레벨에서만 오릅니다. 그렇다면 재료 티어가 바뀌는 레벨은
            골드 계단과 같은 자리일까요, 다른 자리일까요. 아래 표는 {RIFT_LOW.minLevel} 이상의 모든
            계단을 한 줄씩 놓고 두 가지를 함께 적은 것입니다. 주간 골드는 캐릭터 한 명이 레이드
            그룹마다 골드가 가장 많은 난이도 하나를 고르고 그중 상위 3개를 더한 값입니다.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>레벨</th>
                  <th>주간 골드 증가</th>
                  <th>재료 티어</th>
                  <th>주간 파편 증가</th>
                  <th>주간 보석 증가</th>
                </tr>
              </thead>
              <tbody>
                {STAIRS.map((s) => (
                  <tr key={s.level}>
                    <td style={{ fontWeight: 600 }}>{s.level}</td>
                    <td className={styles.barCell}>
                      {s.goldDelta === null ? (
                        '-'
                      ) : (
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${(s.goldDelta / MAX_GOLD_DELTA) * 100}px` }}
                          />
                          <span className={styles.barText}>+{s.goldDelta.toLocaleString()}</span>
                        </div>
                      )}
                    </td>
                    <td>{s.goldDelta === null ? '기준' : s.matStep ? '오름' : '그대로'}</td>
                    <td>{s.fragDelta ? `+${wk(s.fragDelta)}` : '-'}</td>
                    <td>{s.gemDelta ? `+${(s.gemDelta * PER_WEEK).toFixed(1)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>
            첫 행({RIFT_LOW.minLevel})은 기준점. 증가분은 바로 윗줄 레벨 대비, 파편·보석은 하루 1회 × {PER_WEEK}일
          </p>

          <p>
            표를 보면 재료 티어가 오르는 레벨({levels(STAIRS.filter((s) => s.matStep && s.goldDelta !== null))})은
            {MAT_ONLY.length === 0
              ? ' 전부 주간 골드도 함께 오르는 자리입니다. 재료만 오르고 골드는 그대로인 레벨은 없습니다.'
              : ` 대부분 주간 골드도 함께 오르는 자리입니다. 재료만 오르는 레벨은 ${levels(MAT_ONLY)}입니다.`}{' '}
            반대로 {levels(GOLD_ONLY)}은 주간 골드만 오르고 균열·가디언 토벌 수급은 그대로인 레벨입니다.
          </p>
          <p>
            이 구분이 실제 판단에서 쓰이는 지점은 이렇습니다. {levels(BOTH)}은 골드와 재료가 동시에 오르는
            이중 계단이라, 재련 비용을 주급 증가분만으로 따지면 이득을 과소평가하게 됩니다. 반면{' '}
            {levels(GOLD_ONLY)}은 주급 증가분이 곧 레벨업 이득의 거의 전부입니다. 두 레벨의 재련 비용이
            비슷하다면, 재료까지 따라 오르는 쪽을 먼저 넘기는 편이 한 주 수급이 더 크게 늘어납니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              로아로골 원정대 수급 골드 시뮬은 &quot;골드 + 재련 재료&quot; 탭에서 이 계산을 함께 해
              줍니다. 레이드 클리어 보상뿐 아니라 균열·전선, 가디언 토벌, 할의 모래시계, 원정대 대표
              캐릭터만 받는 카오스 게이트·필드보스까지 포함해, 늘어나는 재료를 실시간 시세로 환산한 값과
              주간 골드 증가분을 레벨업 전후로 비교합니다.
            </p>
          </div>

          <h2>정리</h2>
          <ul>
            <li>
              균열·전선은 1730부터 계승 재료로 바뀌고, 파편 기준 주간 수급이 {RIFT_LOW.label}{' '}
              {wk(amt(RIFT_LOW, '파편'))}개에서 {RIFT_TOP.label} {wk(amt(RIFT_TOP, '파편'))}개까지
              올라갑니다.
            </li>
            <li>
              가디언 토벌 보석은 {GUARD_JUMP.to.minLevel}에서 한 번 크게 뜁니다. 그 아래 구간의
              레벨업은 가토 수급을 거의 바꾸지 않습니다.
            </li>
            <li>
              {RIFT_TOP.minLevel}부터는 균열과 가디언 토벌 모두 실링을 줍니다. 한 주 합계{' '}
              {Math.round(SHILLING_WEEK).toLocaleString()}입니다.
            </li>
            <li>
              재료 티어가 오르는 레벨은 주간 골드도 함께 오르는 이중 계단입니다. {levels(GOLD_ONLY)}은
              골드만 오르는 레벨이므로, 레벨업 판단 때 두 종류를 구분해서 보는 편이 정확합니다.
            </li>
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
              '카오스 던전과 가디언 토벌의 티어별 주간 재료 수급을 실측 표본 평균으로 정리하고, 수급이 크게 뛰는 레벨 구간과 주간 골드 계단과의 관계를 계산했습니다.',
            datePublished: '2026-09-21',
            dateModified: '2026-09-27',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/weekly-content-materials`,
          }),
        }}
      />
    </div>
  );
}
