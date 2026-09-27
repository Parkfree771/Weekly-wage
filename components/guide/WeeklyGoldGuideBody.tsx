import { raids, upcomingRaids } from '@/data/raids';
import { RAID_TABLE } from '@/data/rewardTable';
import styles from '@/app/guide/guide.module.css';

/**
 * WeeklyGoldGuideBody — /weekly-gold 도구 페이지 본문.
 * /guide/weekly-gold 를 도구 페이지로 통합(2026-08-21)하면서 옮긴 본문에 분석 항목을 더했다.
 *
 * 구간별 주급은 계산기 기본 모드와 같은 규칙으로 구한다 — 레이드 그룹마다 입장 가능한 최고 골드
 * 난이도 하나, 그중 클리어 골드 상위 3개. 골드 수치는 data/raids.ts(= rewardTable.ts)에서 집계한다.
 */

const GOLD_CHAR_LIMIT = 6; // 원정대 골드 획득 캐릭터 수 (본문 기존 서술과 계산기 기준)
const RAIDS_PER_CHAR = 3; // 캐릭터당 골드 수령 레이드 수 (계산기 기본 모드와 동일)

type R = (typeof raids)[number];
const GROUP_OF = new Map(RAID_TABLE.map((e) => [e.name, e.group]));
const total = (r: R) => r.gates.reduce((s, g) => s + g.gold, 0);
const bound = (r: R) => r.gates.reduce((s, g) => s + g.boundGold, 0);
const free = (r: R) => total(r) - bound(r);

const fmt = (v: number) => Math.round(v).toLocaleString();
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** 받침 유무로 조사 선택 */
const josa = (word: string, withBatchim: string, without: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : false;
  return `${word}${has ? withBatchim : without}`;
};

/** 레벨 L 캐릭터가 고를 수 있는 레이드 그룹별 최선 난이도 → 점수 상위 3개 */
function pickTop(level: number, score: (r: R) => number): R[] {
  const best = new Map<string, R>();
  for (const r of raids) {
    if (r.level > level) continue;
    const g = GROUP_OF.get(r.name) ?? r.name;
    const cur = best.get(g);
    if (!cur || score(r) > score(cur) || (score(r) === score(cur) && free(r) > free(cur))) best.set(g, r);
  }
  return [...best.values()]
    .sort((a, b) => score(b) - score(a) || free(b) - free(a))
    .slice(0, RAIDS_PER_CHAR);
}

const sum = (list: R[], f: (r: R) => number) => list.reduce((s, r) => s + f(r), 0);

const LEVELS = [...new Set(raids.map((r) => r.level))].sort((a, b) => a - b);

const TIERS = LEVELS.map((level, i) => {
  const top = pickTop(level, total);
  const topFree = pickTop(level, free);
  return {
    level,
    top,
    gold: sum(top, total),
    bound: sum(top, bound),
    freeTop: topFree,
    freeGold: sum(topFree, total),
    freeFree: sum(topFree, free),
    idx: i,
  };
}).map((t, i, arr) => ({ ...t, delta: i === 0 ? 0 : t.gold - arr[i - 1].gold }));

const FIRST = TIERS[0];
const LAST = TIERS[TIERS.length - 1];
const MAX_GOLD = LAST.gold;
const BIGGEST_DELTA = Math.max(...TIERS.slice(1).map((t) => t.delta));
// 도약 폭이 같은 구간이 여럿이면 모두 표시
const BIGGEST = TIERS.filter((t) => t.idx > 0 && t.delta === BIGGEST_DELTA).map(
  (t) => `${TIERS[t.idx - 1].level} → ${t.level}`,
);

// 골드 최대 조합과 유통 골드 최대 조합이 갈리는 구간
const SPLITS = TIERS.filter((t) => t.freeFree > t.gold - t.bound);
const SPLIT_EX = SPLITS[SPLITS.length - 1];

// 귀속 비율별 레이드 분류
const BY_BOUND = {
  all: raids.filter((r) => bound(r) === total(r)),
  half: raids.filter((r) => bound(r) * 2 === total(r)),
  none: raids.filter((r) => bound(r) === 0),
};
const HALF_MAX_LEVEL = Math.max(...BY_BOUND.half.map((r) => r.level));
const THREE_KINDS = BY_BOUND.all.length + BY_BOUND.half.length + BY_BOUND.none.length === raids.length;
const ALL_BOUND_GROUPS = [...new Set(BY_BOUND.all.map((r) => GROUP_OF.get(r.name) ?? r.name))].join('·');
// 최고 구간 한 자리가 낮은 구간 두 자리보다 많은 경우 — 그중 가장 높은 구간
const TWO_SEAT = [...TIERS].reverse().find((t) => t.gold * 2 < LAST.gold);
const NONE_MIN_LEVEL = Math.min(...BY_BOUND.none.map((r) => r.level));

// 귀속 비중이 가장 높은 구간 (골드 최대 조합 기준)
const PEAK_BOUND = TIERS.reduce((a, b) => (b.bound / b.gold > a.bound / a.gold ? b : a));

export default function WeeklyGoldGuideBody() {
  return (
    <div className={styles.articleBody}>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>캐릭터 1명 최대 주급</span>
          <span className={styles.statValue}>{fmt(MAX_GOLD)}G</span>
          <span className={styles.statNote}>{LAST.level} 이상, 골드 상위 {RAIDS_PER_CHAR}레이드</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>원정대 이론상 상한</span>
          <span className={styles.statValue}>{fmt(MAX_GOLD * GOLD_CHAR_LIMIT)}G</span>
          <span className={styles.statNote}>{GOLD_CHAR_LIMIT}캐릭터 모두 {LAST.level} 기준</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>입문 구간 대비</span>
          <span className={styles.statValue}>{(MAX_GOLD / FIRST.gold).toFixed(1)}배</span>
          <span className={styles.statNote}>
            {FIRST.level} 캐릭터 {fmt(FIRST.gold)}G와 비교
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>가장 큰 레벨 도약</span>
          <span className={styles.statValue}>+{fmt(BIGGEST_DELTA)}G</span>
          <span className={styles.statNote}>{BIGGEST.join(', ')}</span>
        </div>
      </div>

      <h2>주간 골드란?</h2>
      <p>
        로스트아크에서 주간 골드는 매주 수요일 오전 6시를 기준으로 초기화되는 레이드 보상 시스템입니다.
        각 캐릭터는 지정된 레이드를 클리어하면 관문별로 골드를 획득할 수 있으며, 이 골드는 거래소에서
        아이템을 구매하거나 재련 비용을 충당하는 데 사용됩니다. 주간 골드는 로스트아크 경제의 핵심이며,
        효율적으로 관리하면 캐릭터 성장 속도를 크게 높일 수 있습니다.
      </p>

      <h2>골드 획득 제한 시스템</h2>
      <p>
        원정대 내에서 주간 골드를 획득할 수 있는 캐릭터 수는 최대 {GOLD_CHAR_LIMIT}캐릭터로 제한됩니다.
        아이템 레벨이 가장 높은 {GOLD_CHAR_LIMIT}캐릭터가 자동으로 골드 획득 대상이 되며,
        나머지 캐릭터는 레이드를 클리어하더라도 골드 보상을 받을 수 없습니다.
        여기에 캐릭터 한 명이 골드를 받을 수 있는 레이드도 주 {RAIDS_PER_CHAR}개까지입니다. 같은 레이드는
        난이도 하나만 돌 수 있으니, 결국 캐릭터마다 &quot;입장 가능한 레이드 중 어떤 {RAIDS_PER_CHAR}개에
        골드를 받을지&quot;를 고르는 문제가 됩니다. 위 카드의 원정대 상한은 이 두 제한을 곱한 값입니다.
      </p>

      <h2>아이템 레벨 구간별 캐릭터 1명의 주급</h2>
      <p>
        레이드 입장 레벨을 하나 넘을 때마다 골드 상위 {RAIDS_PER_CHAR}레이드의 구성이 바뀝니다. 아래 표는
        레벨마다 입장할 수 있는 레이드 중 클리어 골드가 가장 큰 {RAIDS_PER_CHAR}개를 골랐을 때의 주간
        골드입니다. 계산기의 기본 모드가 캐릭터마다 자동으로 채우는 조합과 같은 규칙입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레벨</th>
              <th>골드 상위 {RAIDS_PER_CHAR}레이드</th>
              <th>주간 골드</th>
              <th>그중 귀속</th>
              <th>직전 대비</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t.level}>
                <td style={{ fontWeight: 600 }}>{t.level}</td>
                <td style={{ textAlign: 'left' }}>{t.top.map((r) => r.name).join(', ')}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(t.gold / MAX_GOLD) * 90}px` }} />
                    <span className={styles.barText}>{fmt(t.gold)}</span>
                  </div>
                </td>
                <td>
                  {t.bound === 0 ? '없음' : `${fmt(t.bound)} (${pct(t.bound / t.gold)})`}
                </td>
                <td>{t.delta === 0 ? '-' : `+${fmt(t.delta)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>레이드 그룹마다 입장 가능한 최고 골드 난이도 하나만 계산, 더보기 미포함</p>

      <p>
        {FIRST.level}에서 {LAST.level}까지 주급은 {fmt(FIRST.gold)}골드에서 {fmt(LAST.gold)}골드로 늘어납니다.
        가장 크게 뛰는 구간은 {BIGGEST.join(', ')} 구간으로 올라설 때로, 한 번에 {fmt(BIGGEST_DELTA)}골드가
        늘어납니다. 골드 캐릭터를 키울 때 어느 레벨을 먼저 넘길지 정한다면,
        직전 대비 칸이 큰 구간부터 챙기는 것이 주급을 가장 빨리 올리는 순서입니다.
      </p>
      <p>
        귀속 칸도 함께 봐야 합니다. 귀속 비중은 {PEAK_BOUND.level} 구간이 {pct(PEAK_BOUND.bound / PEAK_BOUND.gold)}로
        가장 높고, {NONE_MIN_LEVEL} 이후로는 귀속이 없는 레이드가 조합에 들어오면서 비중이 뚝 떨어집니다.
        같은 주급이라도 거래소에서 쓸 수 있는 골드는 구간에 따라 크게 다르다는 뜻입니다.
      </p>

      <h2>일반 골드와 귀속 골드</h2>
      <p>
        레이드 클리어 골드는 전부 자유롭게 거래할 수 있는 골드가 아닙니다.
        일부 레이드는 보상의 절반 또는 전부를 <strong>귀속 골드</strong>로 지급하는데,
        귀속 골드는 재련 비용 등 게임 내 시스템에는 쓸 수 있지만 거래소 거래나 다른 유저와의
        거래에는 사용할 수 없습니다.{THREE_KINDS && ' 현재 레이드는 귀속 비율로 깔끔하게 세 부류로 나뉩니다.'}
      </p>
      <ul>
        <li>
          <strong>전액 귀속:</strong> {BY_BOUND.all.map((r) => r.name).join(', ')}
        </li>
        <li>
          <strong>절반 귀속:</strong> {BY_BOUND.half.map((r) => r.name).join(', ')}
        </li>
        <li>
          <strong>귀속 없음:</strong> {BY_BOUND.none.map((r) => r.name).join(', ')}
        </li>
      </ul>
      <p>
        {HALF_MAX_LEVEL < NONE_MIN_LEVEL && (
          <>
            {ALL_BOUND_GROUPS}을 빼면 경계는 레벨로 갈립니다. 절반 귀속 레이드 중 가장 높은 것이{' '}
            {HALF_MAX_LEVEL}이고, 귀속이 없는 레이드는 {NONE_MIN_LEVEL}부터 시작합니다.{' '}
          </>
        )}
        거래소에서 쓸 골드가 필요한지, 재련에 쓸 골드가
        필요한지에 따라 체감 수익이 달라지므로 이 구조를 알아두는 것이 좋습니다.
      </p>
      <p>
        또한 더보기 보상을 선택할 때 지불하는 골드는 귀속 골드에서 우선 차감되고, 부족한 만큼만
        일반 골드에서 차감됩니다. 귀속 골드가 쌓여 있다면 더보기 비용 부담이 생각보다 적을 수 있습니다.
      </p>

      <h2>골드 최대 조합 vs 거래 가능 골드 최대 조합</h2>
      <p>
        골드 상위 {RAIDS_PER_CHAR}개가 늘 정답은 아닙니다. 전액 귀속인 {ALL_BOUND_GROUPS}이 조합에 들어가는
        구간에서는 그 자리에 귀속이 적은 레이드를 넣으면 총액은 조금 줄어도 거래 가능한 골드가 크게 늘어납니다.
        아래는 두 조합이 갈리는 구간만 모은 것입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레벨</th>
              <th>유통 우선 조합</th>
              <th>총 골드 차이</th>
              <th>거래 가능 골드</th>
            </tr>
          </thead>
          <tbody>
            {SPLITS.map((t) => (
              <tr key={t.level}>
                <td style={{ fontWeight: 600 }}>{t.level}</td>
                <td style={{ textAlign: 'left' }}>{t.freeTop.map((r) => r.name).join(', ')}</td>
                <td>−{fmt(t.gold - t.freeGold)}</td>
                <td>
                  {fmt(t.gold - t.bound)} → {fmt(t.freeFree)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>거래 가능 골드 = 클리어 골드 − 귀속 골드, 더보기 미포함</p>

      {SPLIT_EX && (
        <p>
          {SPLIT_EX.level} 캐릭터를 예로 들면, 유통 우선 조합은 총 {fmt(SPLIT_EX.gold - SPLIT_EX.freeGold)}골드를
          덜 받는 대신 거래 가능한 골드가 {fmt(SPLIT_EX.gold - SPLIT_EX.bound)}골드에서 {fmt(SPLIT_EX.freeFree)}골드로
          늘어납니다.
          재련을 계속하는 본캐라면 귀속도 재련 비용으로 그대로 녹으니 총액이 큰 쪽이 낫고, 골드를 모아
          다른 캐릭터나 거래소 구매에 쓰려는 부캐라면 유통 우선 조합이 실속 있습니다. 계산기에서 레이드별
          골드 수령 체크를 바꾸면 두 조합을 직접 비교할 수 있습니다.
        </p>
      )}

      <h2>현재 레이드별 골드 보상</h2>
      <p>
        아래 표는 현재 로스트아크에서 진행 가능한 모든 레이드의 관문별 클리어 골드와 더보기 골드를 정리한 것입니다.
        더보기 골드는 클리어 골드 외에 재료 보상을 추가로 받을 때 지불하는 골드입니다.
        2026년 6월 벨가르딘 추가를 앞두고 기존 상위 레이드의 클리어 골드가 일부 하향 조정되었으며,
        아래 표는 조정 이후의 수치에 8월 5일 출시된 벨가르딘 확정치를 더한 것입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레이드</th>
              <th>입장 레벨</th>
              <th>관문</th>
              <th>클리어 골드</th>
              <th>그중 귀속</th>
              <th>더보기 비용</th>
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
                  <td>{gate.boundGold === 0 ? '-' : gate.boundGold.toLocaleString()}</td>
                  <td>{gate.moreGold.toLocaleString()}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {upcomingRaids.length > 0 && (
        <>
          <h3>출시 예정 레이드</h3>
          <p>
            아직 출시되지 않았지만 골드 보상이 공개된 레이드입니다. 출시 전까지는 주간 골드 계산에
            포함되지 않습니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>레이드</th>
                <th>입장 레벨</th>
                <th>관문</th>
                <th>클리어 골드</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {upcomingRaids.map((raid) =>
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
                    {i === 0 && <td rowSpan={raid.gates.length}>{raid.releaseLabel}</td>}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </>
      )}

      <h2>더보기 보상이란?</h2>
      <p>
        더보기 보상은 레이드 관문 클리어 후 골드를 추가로 지불하고 재련 재료를 받는 시스템입니다.
        더보기를 선택하면 운명의 파편, 파괴석, 수호석, 돌파석 등의 재련 재료를 추가로 획득할 수 있습니다.
        더보기의 효율은 거래소 시세에 따라 달라지므로, 실시간 시세를 확인하고 판단하는 것이 좋습니다.
        위 구간별 주급은 더보기를 하나도 사지 않은 기준이라, 더보기를 사는 만큼 실제 손에 남는 골드는 줄어듭니다.
      </p>
      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 로아로골의 주간 골드 계산기에서는 실시간 거래소 시세를 반영하여
          더보기 손익을 자동 계산해드립니다. 초록색이면 더보기가 이득, 빨간색이면 기본 골드가 유리합니다.
        </p>
      </div>

      <h2>골드 수익 극대화 전략</h2>
      <h3>1. 주급이 크게 뛰는 레벨부터 넘기기</h3>
      <p>
        골드 보상은 레이드 난이도와 입장 레벨에 비례하는 경향이 있습니다. 현재 캐릭터 1명이 받을 수 있는
        최대 조합은 {LAST.level} 기준 {LAST.top.map((r) => r.name).join(', ')}로 주 {fmt(LAST.gold)}골드입니다.
        {BY_BOUND.all.some((r) => LAST.top.includes(r)) && (
          <> 이 중 {josa(BY_BOUND.all.filter((r) => LAST.top.includes(r)).map((r) => r.name).join(', '), '은', '는')} 전액 귀속 골드라는 점만 유의하면 됩니다.</>
        )}{' '}
        구간별 표의 직전 대비 칸을 보고, 캐릭터마다 다음으로 넘길 레벨의 가치를 따져 보세요.
      </p>

      <h3>2. {GOLD_CHAR_LIMIT}캐릭터 원정대 운영</h3>
      <p>
        골드 획득 제한이 {GOLD_CHAR_LIMIT}캐릭터이므로, {GOLD_CHAR_LIMIT}캐릭터를 모두 레이드 콘텐츠에 참여시키는 것이
        수익을 극대화하는 방법입니다. 자리가 {GOLD_CHAR_LIMIT}개로 묶여 있으니 한 자리의 가치는 그 캐릭터의 레벨
        구간이 정합니다.
        {TWO_SEAT && (
          <>
            {' '}
            {LAST.level} 캐릭터 한 명의 주급 {fmt(LAST.gold)}골드는 {TWO_SEAT.level} 캐릭터 두 명의 주급 합{' '}
            {fmt(TWO_SEAT.gold * 2)}골드보다도 많습니다.
          </>
        )}{' '}
        같은 여섯 자리라도 각 캐릭터를 다음 도약 구간 위로 올려 두는 것이 원정대 주급을 키우는 가장 직접적인
        방법입니다.
      </p>

      <h3>3. 더보기 효율 매주 확인</h3>
      <p>
        거래소 시세는 매일 변동하므로, 매주 레이드 전에 더보기 효율을 확인하는 습관을 들이세요.
        특히 재련 재료 시세가 급등할 때는 더보기를 선택하는 것이 훨씬 유리할 수 있습니다.
      </p>
    </div>
  );
}
