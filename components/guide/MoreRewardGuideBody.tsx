import { RAID_TABLE, MATERIAL_BUNDLE_SIZES, MATERIAL_IDS, MATERIAL_NAMES, type RaidTableEntry, type RaidTableGate } from '@/data/rewardTable';
import styles from '@/app/guide/guide.module.css';

/**
 * MoreRewardGuideBody — /more-reward 도구 페이지 본문.
 * /guide/more-reward 를 도구 페이지로 통합(2026-08-21)하면서 옮긴 본문에 분석 항목을 더했다.
 *
 * 모든 숫자는 data/rewardTable.ts(단일 원본)에서 모듈 로드 시 집계한다.
 * 시세 없이도 성립하는 비교만 다룬다 — "1,000골드당 수령량"은 재료별 수량 비교라 시세와 무관하고,
 * 한 관문이 다른 관문보다 모든 재료에서 많이 주면 어떤 시세에서도 그 관문의 더보기가 효율이 높다.
 */

// 거래 가능한 재료(시세가 붙는 재료)만 — itemId 0 은 거래 불가
const tradable = (g: RaidTableGate) => g.more.filter((m) => m.itemId !== 0);

/** 더보기 1,000골드당 재료 수량 */
const per1k = (g: RaidTableGate) =>
  Object.fromEntries(tradable(g).map((m) => [m.itemName, (m.amount / g.moreGold) * 1000])) as Record<string, number>;

/** 받침 유무로 조사 선택 — 괄호 설명은 건너뛰고 앞 단어 기준 */
const josa = (word: string, withBatchim: string, without: string) => {
  const base = word.replace(/\([^)]*\)\s*$/, '').trim();
  const code = base.charCodeAt(base.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : /[0-9LMNR]$/i.test(base) && !/[2459]$/.test(base);
  return `${word}${has ? withBatchim : without}`;
};

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(/\.0+$/, '')}%`;
const fmt = (v: number) => Math.round(v).toLocaleString();

const ALL_GATES = RAID_TABLE.flatMap((r) => r.gates.map((g) => ({ raid: r, gate: g })));

// ── 1. 비용 비율 — 관문 클리어 골드 대비 더보기 비용 ──
const RATIO_OF = (g: RaidTableGate) => g.moreGold / g.gold;
const AT_32 = ALL_GATES.filter(({ gate }) => Math.abs(RATIO_OF(gate) - 0.32) < 0.0005);
const OFF_32 = ALL_GATES.filter(({ gate }) => Math.abs(RATIO_OF(gate) - 0.32) >= 0.0005);
const OFF_RAIDS = [...new Set(OFF_32.map(({ raid }) => raid.name))];
const OFF_MAX_LEVEL = Math.max(...OFF_32.map(({ raid }) => raid.level));
const RATIO_MIN = Math.min(...ALL_GATES.map(({ gate }) => RATIO_OF(gate)));
const RATIO_MIN_ROW = ALL_GATES.find(({ gate }) => RATIO_OF(gate) === RATIO_MIN)!;

// 더보기로 받는 거래 재료가 클리어보다 적은 레이드와 그 재료 (배율 1 미만)
const LESS_THAN_CLEAR = (() => {
  const map = new Map<string, Set<string>>();
  for (const { raid, gate } of ALL_GATES) {
    for (const m of tradable(gate)) {
      const c = gate.clear.find((x) => x.itemName === m.itemName)?.amount ?? 0;
      if (c > 0 && m.amount < c) {
        if (!map.has(raid.name)) map.set(raid.name, new Set());
        map.get(raid.name)!.add(m.itemName);
      }
    }
  }
  return [...map.entries()].map(([name, mats]) => `${name}(${[...mats].map((x) => x.replace('운명의 ', '')).join('·')})`);
})();

// ── 2. 한 관문만 더보기 한다면 — 관문 간 지배 관계 ──
type Verdict = { raid: RaidTableEntry; best: number | null; margin: number };

/** a 관문이 b 관문보다 모든 거래 재료에서 1,000골드당 같거나 많으면 그 최소 우위 비율, 아니면 null */
function dominance(a: RaidTableGate, b: RaidTableGate): number | null {
  const pa = per1k(a);
  const pb = per1k(b);
  let min = Infinity;
  for (const k of Object.keys(pb)) {
    if (pa[k] == null) return null;
    const r = pa[k] / pb[k] - 1;
    if (r < 0) return null;
    min = Math.min(min, r);
  }
  return min;
}

const VERDICTS: Verdict[] = RAID_TABLE.filter((r) => r.gates.length > 1).map((raid) => {
  for (const cand of raid.gates) {
    const margins = raid.gates.filter((o) => o !== cand).map((o) => dominance(cand, o));
    if (margins.every((m) => m != null)) {
      return { raid, best: cand.gate, margin: Math.min(...(margins as number[])) };
    }
  }
  return { raid, best: null, margin: 0 };
});
const LAST_GATE_WINS = VERDICTS.filter((v) => v.best === v.raid.gates.length).length;
const FIRST_GATE_WINS = VERDICTS.filter((v) => v.best === 1);
const UNDECIDED = VERDICTS.filter((v) => v.best == null);

// ── 3. 계승 재료 더보기의 1,000골드당 수령량 ──
const CRYSTAL = MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL;
const GREAT_BT = MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE;
const FRAG = MATERIAL_NAMES.FATE_FRAGMENT;

// 재료·비용이 완전히 같은 관문은 한 줄로 묶는다
const sig = (g: RaidTableGate) =>
  tradable(g)
    .map((m) => `${m.itemName}:${m.amount}`)
    .sort()
    .join('|');

type Pack = { names: string[]; gate: RaidTableGate; costs: { name: string; cost: number }[] };
const PACKS: Pack[] = (() => {
  const map = new Map<string, Pack>();
  for (const { raid, gate } of ALL_GATES) {
    const key = sig(gate);
    const label = `${raid.name} ${gate.gate}관문`;
    const p = map.get(key);
    if (p) {
      p.names.push(label);
      p.costs.push({ name: label, cost: gate.moreGold });
    } else {
      map.set(key, { names: [label], gate, costs: [{ name: label, cost: gate.moreGold }] });
    }
  }
  return [...map.values()];
})();

// 같은 재료 묶음인데 비용이 다른 경우 — 시세와 무관하게 싼 쪽이 이득
const SAME_MATS_DIFF_COST = PACKS.filter((p) => new Set(p.costs.map((c) => c.cost)).size > 1).map((p) => {
  const sorted = [...p.costs].sort((a, b) => a.cost - b.cost);
  return { cheap: sorted[0], dear: sorted[sorted.length - 1], gate: p.gate };
});

// 같은 재료·같은 비용 — 표에서 한 줄로 합친다
const INHERIT_ROWS = (() => {
  const rows = new Map<string, { label: string; gate: RaidTableGate }>();
  for (const { raid, gate } of ALL_GATES) {
    if (!gate.more.some((m) => m.itemName === CRYSTAL)) continue;
    const key = `${sig(gate)}#${gate.moreGold}`;
    const label = `${raid.name} ${gate.gate}관문`;
    const prev = rows.get(key);
    if (prev) prev.label += ` / ${label}`;
    else rows.set(key, { label, gate });
  }
  return [...rows.values()]
    .map((r) => ({ ...r, p: per1k(r.gate) }))
    .sort((a, b) => b.p[GREAT_BT] - a.p[GREAT_BT]);
})();
const BT_MAX = Math.max(...INHERIT_ROWS.map((r) => r.p[GREAT_BT]));
const BT_MIN = Math.min(...INHERIT_ROWS.map((r) => r.p[GREAT_BT]));
const INHERIT_TOP = INHERIT_ROWS[0];
// 수호석 결정이 모든 계승 관문에서 파괴석 결정의 정확히 2배인지 — 표에서 생략하는 근거
const GUARD_IS_DOUBLE = INHERIT_ROWS.every((r) => {
  const d = r.gate.more.find((m) => m.itemName === CRYSTAL)?.amount ?? 0;
  const gd = r.gate.more.find((m) => m.itemName === MATERIAL_NAMES.FATE_GUARDIAN_STONE_CRYSTAL)?.amount ?? 0;
  return gd === d * 2;
});
// 최고 레벨 레이드의 관문이 돌파석 효율 순위에서 몇 위인지
const TOP_RAID_NAME = [...RAID_TABLE].sort((a, b) => b.level - a.level)[0].name;
const TOP_RAID_RANKS = INHERIT_ROWS.map((r, i) => (r.label.includes(TOP_RAID_NAME) ? i + 1 : 0)).filter(Boolean);
// 1위 묶음이 나머지 전부를 모든 재료에서 앞서는지
const TOP_DOMINATES_ALL = INHERIT_ROWS.slice(1).every((r) => dominance(INHERIT_TOP.gate, r.gate) != null);

// ── 4. 귀속 골드로 더보기 비용이 얼마나 흡수되나 — 최고 레벨 캐릭터의 골드 상위 3레이드 기준 ──
const total = (r: RaidTableEntry) => r.gates.reduce((s, g) => s + g.gold, 0);
const bound = (r: RaidTableEntry) => r.gates.reduce((s, g) => s + g.boundGold, 0);
const moreCost = (r: RaidTableEntry) => r.gates.reduce((s, g) => s + g.moreGold, 0);
const TOP_LEVEL = Math.max(...RAID_TABLE.map((r) => r.level));
const TOP3 = (() => {
  const best: Record<string, RaidTableEntry> = {};
  for (const r of RAID_TABLE) {
    if (r.level > TOP_LEVEL) continue;
    if (!best[r.group] || total(r) > total(best[r.group])) best[r.group] = r;
  }
  return Object.values(best)
    .sort((a, b) => total(b) - total(a) || bound(a) - bound(b))
    .slice(0, 3);
})();
const TOP3_MORE = TOP3.reduce((s, r) => s + moreCost(r), 0);
const TOP3_BOUND = TOP3.reduce((s, r) => s + bound(r), 0);
const TOP3_FROM_FREE = Math.max(0, TOP3_MORE - TOP3_BOUND);
// 레이드 자체 귀속 골드만으로 더보기 비용이 전액 충당되는 레이드
const SELF_COVERED = RAID_TABLE.filter((r) => bound(r) >= moreCost(r));
const SELF_COVERED_NOT_FULL = SELF_COVERED.filter((r) => bound(r) < total(r));
const SELF_COVERED_TOP = [...SELF_COVERED_NOT_FULL].sort((a, b) => b.level - a.level)[0];

const EXCLUDED = RAID_TABLE.filter((r) => r.moreDataIncomplete).map((r) => r.name);
const BUNDLE_STONE = MATERIAL_BUNDLE_SIZES[MATERIAL_IDS.FATE_DESTRUCTION_STONE];
const BUNDLE_FRAG = MATERIAL_BUNDLE_SIZES[MATERIAL_IDS.FATE_FRAGMENT];

export default function MoreRewardGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>더보기 보상이란?</h2>
      <p>
        레이드 관문을 클리어하면 기본 보상과 별개로, 골드를 추가로 지불하고 재련 재료
        (파괴석·수호석, 돌파석, 파편 등)를 더 받을 수 있는 선택지가 있습니다.
        이것을 흔히 <strong>더보기</strong>라고 부릅니다. 더보기 비용은 관문마다 정해져 있지만,
        받는 재료의 실제 가치는 거래소 시세에 따라 매일 달라지기 때문에
        같은 더보기라도 어떤 날은 이득이고 어떤 날은 손해가 됩니다.
      </p>

      <h2>더보기 손익은 이 순서로 판단합니다</h2>
      <ol className={styles.stepFlow}>
        <li className={styles.stepItem}>
          <strong>1. 재료 목록</strong>
          관문별로 더보기 시 추가로 받는 재료와 수량을 확인합니다.
        </li>
        <li className={styles.stepItem}>
          <strong>2. 시세 환산</strong>
          거래소 묶음 시세를 개당 가격으로 바꿔 곱합니다. 파괴석은 {BUNDLE_STONE}개, 파편은{' '}
          {BUNDLE_FRAG.toLocaleString()}개 묶음 기준입니다.
        </li>
        <li className={styles.stepItem}>
          <strong>3. 비용 차감</strong>
          환산 총 가치에서 더보기 비용(골드)을 뺍니다.
        </li>
        <li className={styles.stepItem}>
          <strong>4. 쓰임새 보정</strong>
          되팔 계획이면 수수료 5%를, 거래 불가 재료가 필요하면 그 가치를 따로 얹어 봅니다.
        </li>
      </ol>
      <p>
        <strong>더보기 손익 = 받는 재료의 시세 환산 총 가치 − 더보기 비용</strong>
      </p>
      <p>
        이 값이 양수(+)면 더보기를 사는 것이 같은 재료를 거래소에서 직접 사는 것보다 저렴하다는
        뜻이고, 음수(−)면 그냥 골드를 아끼고 필요한 재료만 거래소에서 사는 편이 낫다는 뜻입니다.
        재료를 당장 쓰지 않고 판매할 계획이라면 거래소 수수료 5%도 감안해야 하므로,
        손익이 소폭 양수인 경우에는 신중하게 판단하는 것이 좋습니다.
      </p>

      <h2>최근 레이드의 더보기 비용은 클리어 골드의 32%</h2>
      <p>
        전체 {ALL_GATES.length}개 관문 가운데 {AT_32.length}개 관문의 더보기 비용이 해당 관문 클리어
        골드의 정확히 32%입니다. 입장 레벨 {OFF_MAX_LEVEL}을 넘는 레이드는 예외 없이 이 비율을 따릅니다.
        비율이 어긋나는 관문은 {OFF_32.length}개뿐이고, 모두 {OFF_RAIDS.join('·')}에 몰려 있습니다. 가장
        낮은 곳은 {RATIO_MIN_ROW.raid.name} {RATIO_MIN_ROW.gate.gate}관문으로 {pct(RATIO_MIN)}입니다.
      </p>
      <p>
        {OFF_MAX_LEVEL}을 넘는 레이드에서 비용 비율이 고정이라는 것은, 더보기가 이득인지를 가르는 변수가
        비용 쪽이 아니라 재료 쪽에 있다는 뜻입니다. 같은 32%를 내고 재료를 얼마나 받느냐가 관문마다 다르고, 그 차이가 곧 효율
        차이입니다. 참고로{' '}
        {LESS_THAN_CLEAR.length > 0 ? (
          <>
            {josa(LESS_THAN_CLEAR.join(', '), '은', '는')} 괄호 안 재료를 더보기로 받는 양이 클리어 보상보다도 적습니다.
            더보기를 &quot;클리어 보상을 한 번 더 받는 것&quot;으로 생각하면 오해하기 쉬운 부분입니다.
          </>
        ) : (
          <>모든 관문에서 더보기로 받는 재료가 클리어 보상 이상입니다.</>
        )}
      </p>

      <h2>한 관문만 더보기를 산다면 어느 관문?</h2>
      <p>
        골드가 빠듯해서 관문 하나만 더보기를 사려 할 때 쓸 수 있는 비교입니다. 관문마다 더보기 비용
        1,000골드당 받는 재료 수량을 재료별로 구한 뒤, 한 관문이 다른 관문보다{' '}
        <strong>모든 재료에서</strong> 같거나 많으면 그 관문이 어떤 시세에서도 효율이 더 높다고 판정했습니다.
        시세를 몰라도 결론이 바뀌지 않는 비교입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레이드</th>
              <th>관문별 더보기 비용</th>
              <th>한 관문만 산다면</th>
              <th>최소 우위</th>
            </tr>
          </thead>
          <tbody>
            {VERDICTS.map((v) => (
              <tr key={v.raid.name}>
                <td style={{ fontWeight: 600 }}>{v.raid.name}</td>
                <td>{v.raid.gates.map((g) => fmt(g.moreGold)).join(' / ')}</td>
                <td>{v.best == null ? '시세에 따라 다름' : `${v.best}관문`}</td>
                <td>{v.best == null ? '-' : v.margin < 0.0005 ? '동일' : pct(v.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        거래 가능 재료의 1,000골드당 수량 비교. 최소 우위는 재료별 우위 폭 중 가장 작은 값
      </p>

      <p>
        {VERDICTS.length}개 레이드 중 마지막 관문의 더보기가 모든 재료에서 앞서는 곳이 {LAST_GATE_WINS}개,
        반대로 1관문이 앞서는 곳이 {FIRST_GATE_WINS.length}개입니다. 마지막 관문이 앞서는 쪽은{' '}
        {VERDICTS.filter((v) => v.best === v.raid.gates.length).map((v) => v.raid.name).join('·')}이고,
        1관문이 앞서는 쪽은 {FIRST_GATE_WINS.map((v) => v.raid.name).join('·')}입니다. &quot;뒤 관문이
        비싸니 더 많이 주겠지&quot;라는 감으로 고르면 1관문이 앞서는 {FIRST_GATE_WINS.length}개 레이드에서는 손해를 봅니다.{' '}
        {UNDECIDED.length > 0 && (
          <>
            {josa(UNDECIDED.map((v) => v.raid.name).join('·'), '은', '는')} 재료마다 우위가 엇갈려서,
            그날 어떤 재료가 비싸냐에 따라 답이 달라집니다.
          </>
        )}
      </p>

      <h2>계승 재료 더보기, 1,000골드당 얼마나 받나</h2>
      <p>
        1730 이상 레이드의 더보기는 운명의 파괴석 결정·수호석 결정·위대한 운명의 돌파석·운명의 파편을
        줍니다.{GUARD_IS_DOUBLE && ' 수호석 결정은 모든 관문에서 파괴석 결정의 정확히 두 배라 생략했습니다.'} 아래는 비용
        1,000골드당 수령량을 위대한 운명의 돌파석 순으로 정렬한 것입니다. 재료와 비용이 완전히 같은 관문은
        한 줄로 묶었습니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>관문</th>
              <th>비용</th>
              <th>파괴석 결정</th>
              <th>위대한 돌파석</th>
              <th>운명의 파편</th>
            </tr>
          </thead>
          <tbody>
            {INHERIT_ROWS.map((r) => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600, textAlign: 'left' }}>{r.label}</td>
                <td>{fmt(r.gate.moreGold)}</td>
                <td>{r.p[CRYSTAL].toFixed(1)}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(r.p[GREAT_BT] / BT_MAX) * 90}px` }} />
                    <span className={styles.barText}>{r.p[GREAT_BT].toFixed(2)}개</span>
                  </div>
                </td>
                <td>{fmt(r.p[FRAG])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>더보기 비용 1,000골드당 수령량</p>

      <p>
        위대한 운명의 돌파석은 1,000골드당 {BT_MIN.toFixed(2)}개에서 {BT_MAX.toFixed(2)}개까지 벌어집니다.
        같은 골드를 써도 관문에 따라 돌파석을 {pct(BT_MAX / BT_MIN - 1, 0)} 더 받을 수 있다는 뜻입니다.
        {TOP_DOMINATES_ALL && (
          <>
            {' '}맨 위의 {josa(INHERIT_TOP.label, '은', '는')} 돌파석뿐 아니라 파괴석 결정과 파편까지 표의 다른 모든
            관문보다 많이 줍니다. 계승 재료 더보기 중에서는 시세와 상관없이 가장 효율이 좋은 자리입니다.
          </>
        )}{' '}
        반대로 가장 높은 레이드라고 효율까지 가장 높은 것은 아닙니다. {TOP_RAID_NAME}의 두 관문은
        돌파석 기준으로 {TOP_RAID_RANKS.map((n) => `${n}위`).join('와 ')}에 그칩니다. 비용이 큰 만큼 재료도
        많이 주지만, 1,000골드당으로 나누면 아래 난이도가 앞서는 자리가 있습니다.
      </p>

      {SAME_MATS_DIFF_COST.length > 0 && (
        <div className={styles.noteBox}>
          {SAME_MATS_DIFF_COST.map(({ cheap, dear }) => (
            <p key={dear.name}>
              {dear.name} 더보기는 {josa(cheap.name, '과', '와')} 받는 재료가 한 개도 다르지 않은데 비용이{' '}
              {fmt(dear.cost)}골드로 {fmt(dear.cost - cheap.cost)}골드({pct(dear.cost / cheap.cost - 1)})
              비쌉니다.
            </p>
          ))}
          <p>
            두 레이드를 모두 도는 캐릭터가 더보기를 한쪽만 산다면 싼 쪽을 고르는 것이 시세와 무관하게
            이득입니다. 클리어 골드가 더 높은 레이드는 더보기 비용도 그 32%로 따라 올라가기 때문에 생기는
            차이입니다.
          </p>
        </div>
      )}

      <h2>더보기 비용은 귀속 골드에서 우선 차감</h2>
      <p>
        많은 유저가 놓치는 부분인데, 더보기 비용은 <strong>귀속 골드에서 우선 차감</strong>되고
        부족한 만큼만 일반 골드에서 빠져나갑니다. 귀속 골드는 어차피 거래소에서 쓸 수 없는 골드이므로,
        귀속이 쌓이는 캐릭터에게 더보기의 실질 비용은 표시 금액보다 훨씬 가볍습니다.
      </p>
      <p>
        예를 들어 {TOP_LEVEL} 캐릭터가 클리어 골드 상위 세 레이드({TOP3.map((r) => r.name).join('·')})를
        돈다면, 세 레이드를 전부 더보기했을 때 비용은 {fmt(TOP3_MORE)}골드입니다. 같은 캐릭터가 이번 주
        받는 귀속 골드가 {fmt(TOP3_BOUND)}골드이므로{' '}
        {TOP3_FROM_FREE > 0 ? (
          <>
            실제로 일반 골드에서 빠지는 돈은 {fmt(TOP3_FROM_FREE)}골드, 표시 비용의{' '}
            {pct(TOP3_FROM_FREE / TOP3_MORE)}에 불과합니다.
          </>
        ) : (
          <>일반 골드는 한 푼도 빠지지 않습니다.</>
        )}{' '}
        이런 캐릭터라면 손익이 소폭 음수로 나와도 거래 가능한 골드 기준으로는 부담이 거의 없는 셈이라,
        손익분기점을 조금 더 관대하게 잡아도 됩니다.
      </p>
      <p>
        레이드 하나만 놓고 봐도, 절반이 귀속으로 들어오는 레이드는 자기 귀속 골드만으로 더보기 비용이
        전부 충당됩니다. 비용이 클리어 골드의 32% 안팎이고 귀속이 50%이기 때문입니다.
        {SELF_COVERED_NOT_FULL.length > 0 && (
          <>
            {' '}
            {SELF_COVERED_NOT_FULL.length}개 레이드가 여기에 해당하고, 그중 가장 높은 레벨은{' '}
            {SELF_COVERED_TOP.name}({SELF_COVERED_TOP.level})입니다.
          </>
        )}{' '}
        반대로 귀속이 없는 레이드는 다른 레이드에서 귀속을 받아 두지 않는 한 더보기 비용이 곧바로 일반
        골드에서 나갑니다.
      </p>

      <h2>어떤 레이드부터 더보기를 사야 할까?</h2>
      <p>
        재료의 종류가 같은 관문끼리는 위의 1,000골드당 수령량으로 순서를 매길 수 있지만, 계승 재료와
        비계승 재료처럼 종류가 다른 관문끼리는 결국 시세가 순위를 정합니다. 로아로골의 더보기 효율
        페이지는 레이드 카드마다 전체 관문 합산 더보기 손익과 손익률(%)을 그날 시세로 표시하므로,
        초록색 숫자가 큰 레이드부터 더보기를 사면 됩니다.
      </p>

      <h2>레이드 관문별 더보기 비용과 보상 재료</h2>
      <p>
        아래 표는 현재 레이드의 관문별 더보기 비용과, 더보기를 선택했을 때 추가로 받는 재료 전체를
        정리한 것입니다. 2026년 7월 인게임 보상 화면과 전수 대조해 검증한 수치에 벨가르딘은 8월 5일 출시
        당일 확인한 값을 더했으며, 로아로골 더보기 효율 계산기가 손익 계산에 사용하는 데이터와 동일합니다.
        {EXCLUDED.length > 0 && (
          <> {josa(EXCLUDED.join('·'), '은', '는')} 더보기 재련 재료가 아직 공개되지 않아 표에서 제외했습니다.</>
        )}
      </p>
      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>레이드</th>
              <th>관문</th>
              <th>더보기 비용</th>
              <th>더보기로 받는 재료</th>
            </tr>
          </thead>
          <tbody>
            {RAID_TABLE.filter((raid) => !raid.moreDataIncomplete).map((raid) =>
              raid.gates.map((gate, i) => (
                <tr key={`${raid.name}-${gate.gate}`}>
                  {i === 0 && (
                    <td rowSpan={raid.gates.length} style={{ fontWeight: 600 }}>{raid.name}</td>
                  )}
                  <td>{gate.gate}관문</td>
                  <td>{gate.moreGold.toLocaleString()}</td>
                  <td style={{ textAlign: 'left' }}>
                    {gate.more.map((mat) => `${mat.itemName} ${mat.amount.toLocaleString()}개`).join(', ')}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <h2>거래 불가 재료는 어떻게 계산하나?</h2>
      <p>
        은총의 파편이나 아크그리드용 코어처럼 거래소에서 거래되지 않는 재료는 시세가 없어
        손익 계산에서 제외됩니다. 즉, 표시되는 더보기 손익은 거래 가능한 재료만으로 계산한
        보수적인 수치이며, 해당 재료가 본인에게 필요하다면 실질 가치는 표시된 손익보다
        더 높다고 볼 수 있습니다. 이 재료들은 더보기를 하면 클리어 보상과 같은 수량이 한 번 더
        들어오므로, 필요한 캐릭터에게는 더보기가 곧 수급량을 두 배로 늘리는 수단입니다.
        특히 성장 구간에서 은총의 파편이 부족한 캐릭터라면 손익이 소폭 음수라도 더보기가
        실질적으로는 이득일 수 있습니다.
      </p>

      <h2>시세 타이밍과 더보기</h2>
      <p>
        재련 재료 시세는 매주 수요일 초기화 이후 공급이 늘며 하락하는 경향이 있고,
        대형 업데이트를 앞두고는 재련 수요 증가로 상승하는 경향이 있습니다.
        재료 시세가 높은 시기에는 더보기 이득 폭이 커지므로,
        신규 레이드 출시 전후처럼 시세가 들썩이는 시기에는 더보기 손익을 더 자주 확인해보세요.
      </p>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 로아로골 더보기 효율 페이지의 시세는 거래소 데이터 기준으로
          매시간 자동 갱신됩니다. 클리어 보상과 더보기 보상을 관문별로 모두 정리해두었으니,
          레이드 한 번에 재료가 총 얼마나 나오는지도 함께 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
