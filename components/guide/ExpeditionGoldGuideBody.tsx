import { RAID_TABLE, EVENT_CONTENTS } from '@/data/rewardTable';
import {
  LEVEL_BREAKPOINTS,
  RIFT_RUNS_PER_WEEK,
  GUARDIAN_RUNS_PER_WEEK,
  SAND_ENHANCE_LEVEL,
  charClearGold,
  charContentRewards,
  type SortBasis,
} from '@/lib/gold-projection';
import styles from '@/app/guide/guide.module.css';

/**
 * ExpeditionGoldGuideBody — /expedition-gold 도구 페이지 본문.
 *
 * 주급 계단은 시뮬레이터 본체와 같은 함수(lib/gold-projection 의 charClearGold)로 계산한다.
 * 그래서 "순수 골드 기준"과 "유통 골드 기준"의 차이도 시뮬과 똑같이 나온다.
 * 레이드 외 수급(균열·가토·모래시계·카게·필보)도 같은 모듈의 charContentRewards 를 그대로 쓴다.
 * 더보기 비용 비율만 data/rewardTable.ts 에서 직접 집계한다 (시뮬은 더보기를 넣지 않는다).
 */

type Stair = {
  level: number;
  total: number;
  totalFree: number;
  totalBound: number;
  freeBasisTotal: number;
  freeBasisFree: number;
  picked: string[];
  freePicked: string[];
  delta: number | null;
};

const at = (level: number, basis: SortBasis) => charClearGold(level, basis);

const STAIRS: Stair[] = LEVEL_BREAKPOINTS.map((level, i) => {
  const t = at(level, 'total');
  const f = at(level, 'free');
  const prev = i === 0 ? null : at(LEVEL_BREAKPOINTS[i - 1], 'total').gold.total;
  return {
    level,
    total: t.gold.total,
    totalFree: t.gold.free,
    totalBound: t.gold.bound,
    freeBasisTotal: f.gold.total,
    freeBasisFree: f.gold.free,
    picked: t.picked.map((p) => p.name),
    freePicked: f.picked.map((p) => p.name),
    delta: prev === null ? null : t.gold.total - prev,
  };
});

const FIRST = STAIRS[0];
const LAST = STAIRS[STAIRS.length - 1];
const MAX_TOTAL = Math.max(...STAIRS.map((s) => s.total));
const WITH_DELTA = STAIRS.filter((s) => s.delta !== null);
const BIGGEST = WITH_DELTA.reduce((a, b) => ((b.delta ?? 0) > (a.delta ?? 0) ? b : a));
// 같은 폭의 최대 계단이 여러 곳일 수 있다
const BIGGEST_LEVELS = WITH_DELTA.filter((s) => s.delta === BIGGEST.delta).map((s) => s.level);
const SMALLEST = WITH_DELTA.reduce((a, b) => ((b.delta ?? 0) < (a.delta ?? 0) ? b : a));

// 순수 골드 기준으로 올렸는데 유통 골드는 오히려 줄어드는 계단
const FREE_DROPS = STAIRS.map((s, i) => ({ s, prev: i > 0 ? STAIRS[i - 1] : null }))
  .filter(({ s, prev }) => prev && s.totalFree < prev.totalFree)
  .map(({ s, prev }) => ({ level: s.level, from: prev!.totalFree, to: s.totalFree, prevLevel: prev!.level }));

// 두 기준이 서로 다른 3개를 고르는 레벨 — 총량을 얼마나 내주고 유통을 얼마나 얻는가
const BASIS_GAP = STAIRS.filter((s) => s.picked.join() !== s.freePicked.join()).map((s) => ({
  level: s.level,
  totalLoss: s.total - s.freeBasisTotal,
  freeGain: s.freeBasisFree - s.totalFree,
  swapped: s.picked.filter((n) => !s.freePicked.includes(n)),
  swappedIn: s.freePicked.filter((n) => !s.picked.includes(n)),
}));
const GAP_LAST = BASIS_GAP[BASIS_GAP.length - 1];
const MAX_FREE_GAIN = Math.max(...BASIS_GAP.map((g) => g.freeGain));

// ── 레이드 외 수급: 티어가 바뀌는 레벨마다 한 행 ──
const CONTENT_LEVELS = [
  ...new Set(
    LEVEL_BREAKPOINTS.map((lv) => {
      const c = charContentRewards(lv, false);
      return { lv, key: `${c.labels.rift}|${c.labels.guardian}|${c.labels.sand}` };
    })
      .filter((x, i, arr) => x.key !== '||' && (i === 0 || arr[i - 1].key !== x.key))
      .map((x) => x.lv)
  ),
];

const sum = (o: Record<string, number>, keys: string[]) => keys.reduce((s, k) => s + (o[k] ?? 0), 0);

const CONTENT_ROWS = CONTENT_LEVELS.map((lv) => {
  const c = charContentRewards(lv, false);
  const rep = charContentRewards(lv, true);
  const crystal = sum(c.rift, ['운명의 파괴석 결정', '운명의 수호석 결정']) > 0;
  return {
    level: lv,
    riftLabel: c.labels.rift,
    crystal,
    fragment: c.rift['운명의 파편'] ?? 0,
    gems: (c.guardian['1레벨 보석'] ?? 0) + (c.sand['1레벨 보석'] ?? 0),
    sandOpen: c.labels.sand !== '',
    repGold: rep.eventBoundGold,
    repGems: rep.event['1레벨 보석'] ?? 0,
  };
});
const MAX_GEMS = Math.max(...CONTENT_ROWS.map((r) => r.gems));
const CRYSTAL_FROM = CONTENT_ROWS.find((r) => r.crystal);
const PRE_CRYSTAL = CONTENT_ROWS.filter((r) => !r.crystal).pop();
const GEM_JUMP = CRYSTAL_FROM && PRE_CRYSTAL ? CRYSTAL_FROM.gems / PRE_CRYSTAL.gems : 0;

// 카오스 게이트 귀속 골드 — 대표 캐릭터 1명만 받는다
const GATE = EVENT_CONTENTS.find((e) => e.key === 'gate');
const REP_TOP = CONTENT_ROWS[CONTENT_ROWS.length - 1];
const REP_TOP_STAIR = STAIRS.filter((s) => s.level <= REP_TOP.level).pop()!;

// ── 더보기 비용 / 클리어 골드 비율 ──
const RAIDS = RAID_TABLE.map((e) => {
  const gold = e.gates.reduce((s, g) => s + g.gold, 0);
  const more = e.gates.reduce((s, g) => s + g.moreGold, 0);
  return { name: e.name, group: e.group, level: e.level, gold, more, pct: (more / gold) * 100 };
});
const STANDARD = 32;
const OFF_STANDARD = RAIDS.filter((r) => Math.abs(r.pct - STANDARD) > 0.05).sort((a, b) => a.pct - b.pct);
const ON_GROUPS = [...new Set(RAIDS.map((r) => r.group))].filter((g) =>
  RAIDS.filter((r) => r.group === g).every((r) => Math.abs(r.pct - STANDARD) <= 0.05)
);
const CHEAPEST = OFF_STANDARD[0];

const fmt = (v: number) => Math.round(v).toLocaleString();
const pctText = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

export default function ExpeditionGoldGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>숫자로 보는 주간 골드 계단</h2>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>주급이 바뀌는 레벨</span>
          <span className={styles.statValue}>{STAIRS.length}곳</span>
          <span className={styles.statNote}>
            {FIRST.level}부터 {LAST.level}까지, 그 사이는 평평
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>캐릭터 1명 주급</span>
          <span className={styles.statValue}>{(LAST.total / FIRST.total).toFixed(1)}배</span>
          <span className={styles.statNote}>
            {fmt(FIRST.total)}G에서 {fmt(LAST.total)}G로
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>가장 큰 계단</span>
          <span className={styles.statValue}>+{fmt(BIGGEST.delta ?? 0)}G</span>
          <span className={styles.statNote}>{BIGGEST_LEVELS.join('·')} 도달 시</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>가장 작은 계단</span>
          <span className={styles.statValue}>+{fmt(SMALLEST.delta ?? 0)}G</span>
          <span className={styles.statNote}>{SMALLEST.level} 도달 시</span>
        </div>
      </div>

      <p>
        주간 골드는 아이템 레벨에 비례해 오르지 않습니다. 새 레이드의 입장 레벨을 넘는 순간에만 값이 바뀌고,
        그 사이는 완전히 평평합니다. 아래 표는 위 시뮬레이터가 쓰는 계산 함수를 그대로 돌려 얻은 캐릭터 1명의
        계단입니다. 같은 레이드 그룹에서는 가장 높은 난이도 하나만 세고, 그중 골드가 많은 3개를 합산합니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>도달 레벨</th>
              <th>주간 골드</th>
              <th>그중 유통</th>
              <th>증가분</th>
              <th>세는 레이드 3개</th>
            </tr>
          </thead>
          <tbody>
            {STAIRS.map((s) => (
              <tr key={s.level}>
                <td style={{ fontWeight: 600 }}>{s.level}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(s.total / MAX_TOTAL) * 100}px` }} />
                    <span className={styles.barText}>{fmt(s.total)}</span>
                  </div>
                </td>
                <td>{fmt(s.totalFree)}</td>
                <td>{s.delta === null ? '-' : `+${fmt(s.delta)}`}</td>
                <td style={{ fontSize: '0.9em' }}>{s.picked.join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>순수 골드 기준(귀속 포함 총량이 많은 순), 더보기 비용 미차감</p>

      <p>
        같은 &quot;레이드 하나가 새로 열리는&quot; 사건인데 {BIGGEST_LEVELS.join('·')}에서는 {fmt(BIGGEST.delta ?? 0)}골드가,{' '}
        {SMALLEST.level}에서는 {fmt(SMALLEST.delta ?? 0)}골드만 늘어납니다. 새 레이드가 기존 3개 중 가장 낮은 하나를
        밀어내기 때문입니다. 실제 이득은 새 레이드의 골드가 아니라 <strong>새 레이드와 밀려난 레이드의 차액</strong>이고,
        마지막 칸을 위아래로 비교하면 세 칸 중 무엇이 바뀌었는지 바로 보입니다.
      </p>

      <h2>순수 골드 기준과 유통 골드 기준이 갈리는 곳</h2>
      <p>
        지평의 성당은 관문 골드 전액이 귀속으로 지급됩니다. 순수 골드 기준으로 3개를 고르면 성당이 들어오는
        순간 총량은 늘지만 거래소에서 쓸 수 있는 골드는 오히려 줄어들 수 있습니다.
        {FREE_DROPS.length > 0 && (
          <>
            {' '}실제로{' '}
            {FREE_DROPS.map((d, i) => (
              <span key={d.level}>
                {i > 0 && ', '}
                {d.prevLevel}에서 {d.level}까지 올리면 유통 골드가 {fmt(d.from)}골드에서 {fmt(d.to)}골드로 내려갑니다
              </span>
            ))}
            . 레벨을 올렸는데 손에 쥐는 골드가 줄어드는{FREE_DROPS.length === 1 ? ' 유일한' : ''} 구간입니다.
          </>
        )}
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레벨</th>
              <th>순수 기준 (총 / 유통)</th>
              <th>유통 기준 (총 / 유통)</th>
              <th>총량 차이</th>
              <th>유통 차이</th>
            </tr>
          </thead>
          <tbody>
            {BASIS_GAP.map((g) => {
              const s = STAIRS.find((x) => x.level === g.level)!;
              return (
                <tr key={g.level}>
                  <td style={{ fontWeight: 600 }}>{g.level}</td>
                  <td>
                    {fmt(s.total)} / {fmt(s.totalFree)}
                  </td>
                  <td>
                    {fmt(s.freeBasisTotal)} / {fmt(s.freeBasisFree)}
                  </td>
                  <td>-{fmt(g.totalLoss)}</td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(g.freeGain / MAX_FREE_GAIN) * 100}px` }} />
                      <span className={styles.barText}>+{fmt(g.freeGain)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>두 기준이 서로 다른 3개를 고르는 레벨만 표시, 차이는 유통 기준 − 순수 기준</p>

      <p>
        {GAP_LAST && (
          <>
            {GAP_LAST.level} 기준으로 보면 유통 기준은 {GAP_LAST.swapped.join('·')} 대신 {GAP_LAST.swappedIn.join('·')}를
            세면서 총량은 {fmt(GAP_LAST.totalLoss)}골드 적지만, 유통 골드는 {fmt(GAP_LAST.freeGain)}골드 많습니다.{' '}
          </>
        )}
        총량 차이는 레이드 하나의 골드 차이만큼이라 작고, 유통 차이는 성당 골드 전체가 빠지는 만큼이라 큽니다.
        귀속 골드를 재련 재료 구매에 다 쓸 수 있는 캐릭터라면 순수 기준이 맞고, 거래소에서 재료나 보석을 사려고
        골드를 모으는 중이라면 유통 기준이 실제 주머니 사정에 가깝습니다.
      </p>

      <h2>골드 말고 바뀌는 것: 레이드 외 수급 티어</h2>
      <p>
        시뮬의 &quot;골드 + 재련 재료&quot; 탭은 레이드 밖 콘텐츠도 셉니다. 균열·전선과 가디언 토벌은 주{' '}
        {RIFT_RUNS_PER_WEEK}회·{GUARDIAN_RUNS_PER_WEEK}회, 할의 모래시계는 보상 강화 {SAND_ENHANCE_LEVEL}단계로 주 1회
        기준입니다. 이 콘텐츠들은 레이드와 다른 레벨에서 보상 티어가 바뀌는데, 순서대로 놓으면 이렇습니다.
      </p>

      <ol className={styles.stepFlow}>
        {CONTENT_ROWS.map((r) => (
          <li key={r.level} className={styles.stepItem}>
            <strong>{r.level}</strong>
            {r.riftLabel}
            <br />
            파편 주 {fmt(r.fragment)}개
            {r.crystal && r === CRYSTAL_FROM && (
              <>
                <br />
                결정 재료로 전환
              </>
            )}
            {r.sandOpen && r === CRYSTAL_FROM && (
              <>
                <br />
                모래시계·카게·필보 개방
              </>
            )}
          </li>
        ))}
      </ol>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레벨</th>
              <th>균열·전선 재료</th>
              <th>주간 1레벨 보석 (가토+모래시계)</th>
              <th>대표 캐릭터 추가분</th>
            </tr>
          </thead>
          <tbody>
            {CONTENT_ROWS.map((r) => (
              <tr key={r.level}>
                <td style={{ fontWeight: 600 }}>{r.level}</td>
                <td>{r.crystal ? '결정·위대한 돌파석' : '파괴석·수호석·돌파석'}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(r.gems / MAX_GEMS) * 100}px` }} />
                    <span className={styles.barText}>{r.gems.toFixed(1)}개</span>
                  </div>
                </td>
                <td>{r.repGold > 0 ? `귀속 ${fmt(r.repGold)}G · 보석 ${fmt(r.repGems)}개` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>보석은 1레벨 환산, 대표 캐릭터 추가분 = 카오스 게이트 + 필드보스 주간 합</p>

      {CRYSTAL_FROM && PRE_CRYSTAL && (
        <p>
          {CRYSTAL_FROM.level}은 레이드 밖에서 가장 큰 변화가 일어나는 레벨이기도 합니다.
          균열 보상이 계승 후 장비에 쓰는 결정·위대한 돌파석으로 바뀌고, 모래시계가 열리면서 주간 보석 수급이{' '}
          {PRE_CRYSTAL.gems.toFixed(1)}개에서 {CRYSTAL_FROM.gems.toFixed(1)}개로 약 {GEM_JUMP.toFixed(1)}배가 됩니다.
          골드 탭에서 이득이 작아 보이는 캐릭터라도 {CRYSTAL_FROM.level}을 넘기는 계획이라면 재료 탭을 꼭 함께 보는 편이
          좋습니다.
        </p>
      )}

      <h2>대표 캐릭터는 가장 높은 캐릭터로</h2>
      <p>
        카오스 게이트와 필드보스는 원정대에서 캐릭터 1명만 보상을 받습니다. 시뮬은 골드 인정 캐릭터 중 레벨이 가장
        높은 캐릭터를 자동으로 대표로 잡습니다.
        {GATE && (
          <>
            {' '}카오스 게이트는 주 {GATE.perWeek}회 열리고 회당 귀속 골드가 티어별로{' '}
            {Object.entries(GATE.gold)
              .map(([tier, g]) => `${tier} 구간 ${fmt(g)}골드`)
              .join(', ')}
            라, 대표 캐릭터의 티어가 곧 이 골드의 크기입니다.
          </>
        )}{' '}
        {REP_TOP.level} 대표 캐릭터 기준 주 {fmt(REP_TOP.repGold)}골드는 같은 레벨 캐릭터 한 명의 레이드 주급(
        {fmt(REP_TOP_STAIR.total)}골드)의 {pctText(REP_TOP.repGold / REP_TOP_STAIR.total)}에 해당합니다. 레벨업 후보가
        여럿이라면 이미 가장 높은 캐릭터를 더 올리는 쪽이 이 몫까지 함께 키웁니다.
      </p>

      <h2>원정대 단위에서는 6캐릭 상한이 한 번 더 걸린다</h2>
      <p>
        주간 골드가 인정되는 캐릭터는 상위 6명까지입니다. 7번째 캐릭터를 올려도 원정대 주급은 그대로이고, 그 캐릭터가
        6위 안으로 들어오면 기존 6위가 밖으로 밀려납니다. 그래서 원정대 이득은 캐릭터 계단을 그냥 더해서 구할 수 없고,
        레벨업 전후 원정대를 각각 처음부터 계산해 차이를 내야 합니다. 위 시뮬레이터가 전후 전체 재계산 방식을 쓰는
        이유입니다.
      </p>

      <h2>더보기 비용 비율은 레이드마다 같지 않다</h2>
      <p>
        더보기 비용은 대체로 클리어 골드의 {STANDARD}%입니다. {ON_GROUPS.join('·')}은 모든 난이도가 정확히 {STANDARD}%로
        맞춰져 있고, 비율이 어긋나는 것은 그보다 오래된 레이드들입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레이드</th>
              <th>입장 레벨</th>
              <th>클리어 골드</th>
              <th>더보기 비용</th>
              <th>비율</th>
            </tr>
          </thead>
          <tbody>
            {OFF_STANDARD.map((r) => (
              <tr key={r.name}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.level}</td>
                <td>{fmt(r.gold)}</td>
                <td>{fmt(r.more)}</td>
                <td>{r.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {CHEAPEST && (
        <p>
          가장 눈에 띄는 것은 {CHEAPEST.name}입니다. 비율이 {CHEAPEST.pct.toFixed(1)}%로 표준보다{' '}
          {(STANDARD - CHEAPEST.pct).toFixed(0)}%p 낮아, 같은 골드로 얻는 재료가 다른 레이드보다 유리합니다. 반대로 33%대인
          레이드는 표준보다 조금 비쌉니다. 더보기 손익이 아슬아슬하게 갈리는 시세에서는 이 1%p가 부호를 바꾸기도 하는데,
          시뮬이 더보기 비용을 아예 빼고 계산하는 것도 이런 변수를 레벨업 비교에서 분리하기 위해서입니다.
        </p>
      )}

      <div className={styles.noteBox}>
        <p>
          레이드 외 수급의 균열·가토 수치는 여러 판을 기록한 표본 평균이라 한 주 실제 수급과는 차이가 날 수 있습니다.
          레이드 골드와 더보기 비용은 인게임 보상 화면과 대조한 확정값입니다.
        </p>
      </div>
    </div>
  );
}
