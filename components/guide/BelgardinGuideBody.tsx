import { RAID_TABLE, MATERIAL_NAMES, type RaidTableEntry, type RaidTableGate, type MaterialReward } from '@/data/rewardTable';
import { WANGAP_PROMOTION_AT, WANGAP_PROMOTION_COSTS, type WangapPromotedGrade } from '@/lib/wangapData';
import styles from '@/app/guide/guide.module.css';

/**
 * BelgardinGuideBody — /belgardin 도구 페이지 본문.
 *
 * 골드·재료 수치는 data/rewardTable.ts(단일 원본)에서 직접 집계한다.
 * 승급 비용·승급 지점은 lib/wangapData.ts 의 WANGAP_PROMOTION_COSTS·WANGAP_PROMOTION_AT 을 그대로 쓴다.
 * 두 원본이 패치로 갱신되면 본문 표와 문장 속 숫자도 함께 따라간다.
 */

const ORDER = ['벨가르딘 노말', '벨가르딘 하드', '벨가르딘 나메'] as const;

type Agg = {
  name: string;
  entry: RaidTableEntry;
  level: number;
  gold: number;
  moreGold: number;
  clear: Record<string, number>;
  more: Record<string, number>;
};

const sumMats = (list: MaterialReward[], into: Record<string, number>) => {
  for (const mat of list) into[mat.itemName] = (into[mat.itemName] ?? 0) + mat.amount;
};

const aggregate = (entry: RaidTableEntry): Agg => {
  const clear: Record<string, number> = {};
  const more: Record<string, number> = {};
  for (const g of entry.gates) {
    sumMats(g.clear, clear);
    sumMats(g.more, more);
  }
  return {
    name: entry.name,
    entry,
    level: entry.level,
    gold: entry.gates.reduce((s, g) => s + g.gold, 0),
    moreGold: entry.gates.reduce((s, g) => s + g.moreGold, 0),
    clear,
    more,
  };
};

const ROWS: Agg[] = ORDER.map((name) => aggregate(RAID_TABLE.find((e) => e.name === name)!));
const NORMAL = ROWS[0];
const NM = ROWS[2];

/** 받침 유무로 조사 선택 */
const josa = (word: string, withBatchim: string, without: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : false;
  return `${word}${has ? withBatchim : without}`;
};

const fmt = (v: number) => Math.round(v).toLocaleString();
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(/\.0+$/, '')}%`;

// ── 더보기 비용 비율 ──
const GATE_RATIOS = ROWS.flatMap((r) => r.entry.gates.map((g) => g.moreGold / g.gold));
const RATIO_SAME = GATE_RATIOS.every((v) => Math.abs(v - GATE_RATIOS[0]) < 0.0005);
const NM_LAST_GATE = NM.entry.gates[NM.entry.gates.length - 1];
const NORMAL_FIRST_GATE = NORMAL.entry.gates[0];

/** 더보기로 추가되는 재료가 클리어 수령분의 몇 배인지 */
const MAT_KEYS = [
  MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL,
  MATERIAL_NAMES.FATE_GUARDIAN_STONE_CRYSTAL,
  MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE,
  MATERIAL_NAMES.FATE_FRAGMENT,
];
const mult = (row: Agg, k: string) => (row.clear[k] ? (row.more[k] ?? 0) / row.clear[k] : 0);
const MULTS = MAT_KEYS.map((k) => mult(NM, k));
const MULT_MAX = Math.max(...MULTS);
const BT_MULT = mult(NM, MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE);
const OTHER_MULTS = MAT_KEYS.filter((k) => k !== MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE).map((k) => mult(NM, k));
// 코어·승급 재료는 더보기 = 클리어 수량인지 (배율 1)
const SAME_QTY_KEYS = [MATERIAL_NAMES.CERKA_CORE, MATERIAL_NAMES.HAND_OF_DEATH];
const SAME_QTY = SAME_QTY_KEYS.every((k) => (NM.clear[k] ?? 0) > 0 && NM.clear[k] === NM.more[k]);

// ── 관문별 더보기 효율: 2관문이 1관문보다 1,000골드당 모든 거래 재료를 더 주는지 ──
const per1k = (g: RaidTableGate) =>
  Object.fromEntries(g.more.filter((m) => m.itemId !== 0).map((m) => [m.itemName, (m.amount / g.moreGold) * 1000]));
const GATE2_WINS = ROWS.map((r) => {
  const [g1, g2] = r.entry.gates;
  const p1 = per1k(g1);
  const p2 = per1k(g2);
  const keys = Object.keys(p1);
  const wins = keys.every((k) => (p2[k] ?? 0) >= p1[k]);
  const minEdge = Math.min(...keys.map((k) => (p2[k] ?? 0) / p1[k] - 1));
  return { row: r, wins, minEdge };
});
const ALL_GATE2_WIN = GATE2_WINS.every((w) => w.wins);
// 거래 불가 재료의 관문별 1,000골드당 수량 — 코어는 관문마다 같은 수량, 승급 재료는 비용에 비례하는지
const untradPer1k = (g: RaidTableGate, name: string) =>
  ((g.more.find((m) => m.itemName === name)?.amount ?? 0) / g.moreGold) * 1000;
const PROMO_MAT_OF = (r: Agg) =>
  r.clear[MATERIAL_NAMES.WRAITH_ECHO] != null ? MATERIAL_NAMES.WRAITH_ECHO : MATERIAL_NAMES.HAND_OF_DEATH;
const PROMO_PER_GOLD_EQUAL = ROWS.every((r) => {
  const [g1, g2] = r.entry.gates;
  return Math.abs(untradPer1k(g1, PROMO_MAT_OF(r)) - untradPer1k(g2, PROMO_MAT_OF(r))) < 1e-9;
});
const CORE_GATE1_BETTER = ROWS.every((r) => {
  const [g1, g2] = r.entry.gates;
  return untradPer1k(g1, MATERIAL_NAMES.CERKA_CORE) > untradPer1k(g2, MATERIAL_NAMES.CERKA_CORE);
});

// ── 승급 ──
const promoAmount = (grade: WangapPromotedGrade, mat: '사령의잔영' | '죽음의손') =>
  WANGAP_PROMOTION_COSTS[grade].find((c) => c.material === mat)?.amount ?? null;

const GRADES: WangapPromotedGrade[] = ['전설', '유물', '고대'];
const PROMO_LEVEL = (grade: WangapPromotedGrade) =>
  Object.values(WANGAP_PROMOTION_AT).find((p) => p?.next === grade)?.level ?? 0;

const HAND_TOTAL = GRADES.reduce((s, g) => s + (promoAmount(g, '죽음의손') ?? 0), 0);
const ECHO_GRADES = GRADES.filter((g) => promoAmount(g, '사령의잔영') != null);
const HAND_ONLY_GRADES = GRADES.filter((g) => promoAmount(g, '사령의잔영') == null);
const ECHO_TO_RELIC = ECHO_GRADES.reduce((s, g) => s + (promoAmount(g, '사령의잔영') ?? 0), 0);
const HAND_AFTER_ECHO = HAND_ONLY_GRADES.reduce((s, g) => s + (promoAmount(g, '죽음의손') ?? 0), 0);
const LAST_ECHO_GRADE = ECHO_GRADES[ECHO_GRADES.length - 1];
// 잔영 몇 개가 손 1개 몫인지 — 두 재료가 모두 쓰이는 등급에서 비율이 같은지 확인
const ECHO_PER_HAND_LIST = ECHO_GRADES.map((g) => (promoAmount(g, '사령의잔영') ?? 0) / (promoAmount(g, '죽음의손') ?? 1));
const ECHO_PER_HAND = ECHO_PER_HAND_LIST.every((v) => v === ECHO_PER_HAND_LIST[0]) ? ECHO_PER_HAND_LIST[0] : null;

/** 주간 승급 재료 수급 — 클리어분 + 더보기 추가분 */
const weeklyPromo = (row: Agg, matName: string) => (row.clear[matName] ?? 0) + (row.more[matName] ?? 0);

const HAND_PER_WEEK_FULL = weeklyPromo(NM, MATERIAL_NAMES.HAND_OF_DEATH);
const HAND_PER_WEEK_CLEAR = NM.clear[MATERIAL_NAMES.HAND_OF_DEATH] ?? 0;
const ECHO_PER_WEEK_FULL = weeklyPromo(NORMAL, MATERIAL_NAMES.WRAITH_ECHO);
const ECHO_PER_WEEK_CLEAR = NORMAL.clear[MATERIAL_NAMES.WRAITH_ECHO] ?? 0;

const WEEKS_FULL = Math.ceil(HAND_TOTAL / HAND_PER_WEEK_FULL);
const WEEKS_CLEAR = Math.ceil(HAND_TOTAL / HAND_PER_WEEK_CLEAR);
// 노말에서 잔영으로 유물까지 → 하드 이상에서 고대분 손만 모으는 경로
const MIX_ECHO_WEEKS = Math.ceil(ECHO_TO_RELIC / ECHO_PER_WEEK_FULL);
const MIX_HAND_WEEKS = Math.ceil(HAND_AFTER_ECHO / HAND_PER_WEEK_FULL);

// 등급별 누적 소모와 도달 주차 (죽음의 손만 쓰는 경우)
const PROMO_STEPS = (() => {
  let cum = 0;
  return GRADES.map((grade) => {
    const hand = promoAmount(grade, '죽음의손') ?? 0;
    cum += hand;
    return {
      grade,
      at: PROMO_LEVEL(grade),
      hand,
      echo: promoAmount(grade, '사령의잔영'),
      cum,
      weekFull: Math.ceil(cum / HAND_PER_WEEK_FULL),
      weekClear: Math.ceil(cum / HAND_PER_WEEK_CLEAR),
    };
  });
})();

// ── 노말과 재련 재료·골드가 같은 다른 레이드 ──
const sig = (e: RaidTableEntry, side: 'clear' | 'more') =>
  e.gates
    .map((g) =>
      g[side]
        .filter((m) => m.itemId !== 0)
        .map((m) => `${m.itemName}:${m.amount}`)
        .sort()
        .join('|'),
    )
    .join('#');
const NORMAL_TWINS = RAID_TABLE.filter(
  (e) =>
    e.group !== NORMAL.entry.group &&
    e.level === NORMAL.level &&
    e.gates.reduce((s, g) => s + g.gold, 0) === NORMAL.gold &&
    e.gates.every(
      (g, i) =>
        (g.clear.find((m) => m.itemName === MATERIAL_NAMES.CERKA_CORE)?.amount ?? 0) ===
        (NORMAL.entry.gates[i]?.clear.find((m) => m.itemName === MATERIAL_NAMES.CERKA_CORE)?.amount ?? 0),
    ) &&
    sig(e, 'clear') === sig(NORMAL.entry, 'clear') &&
    sig(e, 'more') === sig(NORMAL.entry, 'more'),
).map((e) => {
  const a = aggregate(e);
  const bound = e.gates.reduce((s, g) => s + g.boundGold, 0);
  const special = Object.entries(a.clear).find(
    ([k]) => k === MATERIAL_NAMES.GRACE_FRAGMENT || k === MATERIAL_NAMES.PULSATING_THORN,
  );
  return { e, a, bound, special };
});
const NORMAL_BOUND = NORMAL.entry.gates.reduce((s, g) => s + g.boundGold, 0);

export default function BelgardinGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>난이도별 주간 수령액 한눈에</h2>
      <p>
        벨가르딘은 어느 난이도든 1관문·2관문 두 관문 구성이라, 한 캐릭터가 한 주에 받는 양은
        두 관문을 더한 값입니다. 아래는 클리어 골드와 더보기 비용, 그리고 완갑 승급 재료의 주간
        합계입니다. 더보기 재료 수량은 다음 항목에서 따로 다룹니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>난이도</th>
              <th>입장 레벨</th>
              <th>주간 클리어 골드</th>
              <th>더보기 총비용</th>
              <th>승급 재료(클리어)</th>
              <th>승급 재료(풀더보기)</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const isNormal = r.name === '벨가르딘 노말';
              const matName = isNormal ? MATERIAL_NAMES.WRAITH_ECHO : MATERIAL_NAMES.HAND_OF_DEATH;
              return (
                <tr key={r.name}>
                  <td style={{ fontWeight: 600 }}>{r.name.replace('벨가르딘 ', '')}</td>
                  <td>{r.level}</td>
                  <td>{r.gold.toLocaleString()}</td>
                  <td>{r.moreGold.toLocaleString()}</td>
                  <td>
                    {matName} {(r.clear[matName] ?? 0).toLocaleString()}개
                  </td>
                  <td>
                    {matName} {weeklyPromo(r, matName).toLocaleString()}개
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {RATIO_SAME && (
        <p>
          더보기 비용은 세 난이도 모두 해당 관문 클리어 골드의 정확히 {pct(GATE_RATIOS[0])}입니다. 나이트메어{' '}
          {NM_LAST_GATE.gate}관문이 {fmt(NM_LAST_GATE.gold)}골드에 더보기 {fmt(NM_LAST_GATE.moreGold)}골드인
          것도, 노말 {NORMAL_FIRST_GATE.gate}관문이 {fmt(NORMAL_FIRST_GATE.gold)}골드에{' '}
          {fmt(NORMAL_FIRST_GATE.moreGold)}골드인 것도 같은 비율입니다. 난이도를 올린다고 더보기가 상대적으로
          비싸지거나 싸지지는 않는다는 뜻이라, 더보기 여부는 난이도와 분리해서 판단하면 됩니다.
        </p>
      )}

      <h2>더보기는 재료를 몇 배로 주나</h2>
      <p>
        벨가르딘에서 더보기의 값어치는 골드 대비 재료 비율로 봐야 합니다. 아래는 나이트메어 기준
        주간 클리어 수령량과 더보기로 <strong>추가</strong>되는 양, 그리고 그 배율입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>재료</th>
              <th>클리어 수령</th>
              <th>더보기 추가</th>
              <th>배율</th>
            </tr>
          </thead>
          <tbody>
            {MAT_KEYS.map((k, i) => {
              const c = NM.clear[k] ?? 0;
              const mo = NM.more[k] ?? 0;
              return (
                <tr key={k}>
                  <td style={{ fontWeight: 600 }}>{k}</td>
                  <td>{c.toLocaleString()}</td>
                  <td>{mo.toLocaleString()}</td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(MULTS[i] / MULT_MAX) * 90}px` }} />
                      <span className={styles.barText}>{c ? `${MULTS[i].toFixed(2)}배` : '-'}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p>
        눈에 띄는 것은 위대한 운명의 돌파석입니다. 석과 파편이 {Math.min(...OTHER_MULTS).toFixed(1)}~
        {Math.max(...OTHER_MULTS).toFixed(1)}배인 데 비해 돌파석만 {BT_MULT.toFixed(1)}배로 뛰어오릅니다.
        클리어만 하면 주 {NM.clear[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] ?? 0}개인데 더보기를 붙이면{' '}
        {NM.more[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] ?? 0}개가 더 들어옵니다.
        돌파석이 병목인 시점에는 더보기 손익이 시세 계산상 약간 마이너스로 나오더라도 실제로는
        선택할 이유가 생기는 구간입니다. 반대로 석만 남아도는 상황이라면 같은 골드로 거래소에서
        돌파석을 직접 사는 쪽과 비교해 봐야 합니다.
      </p>
      {SAME_QTY && (
        <p>
          코어와 승급 재료는 배율이 1.00배입니다. 더보기를 하면 클리어와 똑같은 수량이 한 번 더
          붙는다는 뜻이고, 이 둘은 거래 불가라 시세 환산 손익에는 잡히지 않습니다. 더보기 판단이
          숫자보다 까다로워지는 이유가 이 지점입니다.
        </p>
      )}

      {ALL_GATE2_WIN && (
        <>
          <h3>한 관문만 더보기한다면 2관문</h3>
          <p>
            골드가 빠듯해 한 관문만 더보기를 산다면 답은 난이도와 관계없이 2관문입니다. 더보기 비용
            1,000골드당 받는 파괴석 결정·수호석 결정·위대한 운명의 돌파석·운명의 파편이 세 난이도 모두
            2관문 쪽이 전부 많습니다. 재료 하나하나를 비교해도 2관문이 앞서니 시세와 상관없이 성립하는
            결론입니다. 우위 폭이 가장 작은 재료를 기준으로 보면{' '}
            {GATE2_WINS.map((w) => `${w.row.name.replace('벨가르딘 ', '')} ${pct(w.minEdge)}`).join(', ')}
            입니다.
            {PROMO_PER_GOLD_EQUAL && ' 승급 재료는 관문 비용에 정확히 비례해서 붙기 때문에 1,000골드당으로는 두 관문이 같습니다.'}
            {CORE_GATE1_BETTER &&
              ' 코어만은 관문마다 같은 수량이 붙어서, 코어가 급하다면 비용이 싼 1관문 더보기가 1골드당 더 많이 주는 셈입니다.'}
          </p>
        </>
      )}

      <h2>완갑 +25까지 몇 주가 걸리나</h2>
      <p>
        벨가르딘을 도는 이유의 상당 부분은 완갑 승급 재료입니다. 승급은 강화 단계가 정해진 지점에 닿을
        때마다 한 번씩 필요하고, 재료는 두 가지 중 하나만 내면 되며 골드는 들지 않습니다. 아래는 죽음의
        손만 쓴다고 했을 때 누적 소모량과, 나이트메어·하드 풀더보기(주 {HAND_PER_WEEK_FULL}개)와 클리어만(주{' '}
        {HAND_PER_WEEK_CLEAR}개) 기준으로 그만큼을 모으는 데 걸리는 주차입니다.
      </p>

      <ol className={styles.stepFlow}>
        {PROMO_STEPS.map((s) => (
          <li key={s.grade} className={styles.stepItem}>
            <strong>
              {s.grade} 승급 (+{s.at})
            </strong>
            죽음의 손 {s.hand}개{s.echo != null ? ` 또는 사령의 잔영 ${s.echo}개` : ' (잔영 불가)'}
            <br />
            누적 {s.cum}개 · 풀더보기 {s.weekFull}주차 · 클리어만 {s.weekClear}주차
          </li>
        ))}
      </ol>

      <p>
        여기서 자주 놓치는 제약이 하나 있습니다.{' '}
        <strong>{HAND_ONLY_GRADES.join('·')} 승급은 죽음의 손으로만 가능합니다.</strong> 사령의 잔영은 노말에서만
        나오므로, 노말만 돌아서는 {LAST_ECHO_GRADE}({ECHO_TO_RELIC}개 소모)까지는 갈 수 있어도 +
        {PROMO_LEVEL(HAND_ONLY_GRADES[0])} 이후로는 한 발짝도 못 나갑니다. {HAND_ONLY_GRADES.join('·')}를 보려면
        하드 이상을 돌아야 합니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>진행 방식</th>
              <th>주간 수급</th>
              <th>전설~고대 총 소모</th>
              <th>필요 주차</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>하드·나메 풀더보기</td>
              <td>죽음의 손 {HAND_PER_WEEK_FULL}개</td>
              <td>{HAND_TOTAL}개</td>
              <td>{WEEKS_FULL}주</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>하드·나메 클리어만</td>
              <td>죽음의 손 {HAND_PER_WEEK_CLEAR}개</td>
              <td>{HAND_TOTAL}개</td>
              <td>{WEEKS_CLEAR}주</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>노말 풀더보기 → 하드 이상</td>
              <td>
                잔영 {ECHO_PER_WEEK_FULL}개 → 손 {HAND_PER_WEEK_FULL}개
              </td>
              <td>
                잔영 {ECHO_TO_RELIC}개 + 손 {HAND_AFTER_ECHO}개
              </td>
              <td>
                {MIX_ECHO_WEEKS}주 + {MIX_HAND_WEEKS}주
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>노말 풀더보기만</td>
              <td>사령의 잔영 {ECHO_PER_WEEK_FULL}개</td>
              <td>
                {LAST_ECHO_GRADE}까지 {ECHO_TO_RELIC}개 ({HAND_ONLY_GRADES.join('·')} 불가)
              </td>
              <td>{MIX_ECHO_WEEKS}주 후 정지</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        한 캐릭터로 하드 이상을 풀더보기로 꾸준히 돌면 고대까지 {WEEKS_FULL}주, 더보기를 생략하면{' '}
        {WEEKS_CLEAR}주가 걸립니다. 거의 두 배 차이입니다. 완갑 진행을 서두르는 중이라면 더보기 비용 주{' '}
        {NM.moreGold.toLocaleString()}골드는 재료값이라기보다 일정을 절반으로 줄이는 값으로 보는 편이 실제에
        가깝습니다.
      </p>
      {ECHO_PER_HAND != null && ECHO_PER_WEEK_FULL === HAND_PER_WEEK_FULL && (
        <p>
          노말과 하드의 차이는 승급 속도에서 더 크게 벌어집니다. 두 난이도 모두 승급 재료가 주{' '}
          {ECHO_PER_WEEK_FULL}개로 수량은 같지만, 전설·유물 승급에서 잔영은 손의 {ECHO_PER_HAND}배가 필요합니다.
          같은 한 주를 돌아도 노말의 승급 진척은 하드의 1/{ECHO_PER_HAND}이라는 뜻입니다. 레벨이 하드 입장
          레벨({ROWS[1].level})에 못 미치는 동안 노말에서 모은 잔영이 버려지는 것은 아닙니다. 전설·유물 승급에 그대로
          쓰고, 하드에 들어간 뒤에는 고대용 손 {HAND_AFTER_ECHO}개만 모으면 됩니다. 이 경로는 총{' '}
          {MIX_ECHO_WEEKS + MIX_HAND_WEEKS}주로 처음부터 하드를 돈 {WEEKS_FULL}주보다 길지만, 입장 레벨이 모자란
          기간을 놀리지 않는다는 점에서 의미가 있습니다.
        </p>
      )}
      <p>
        위 주차는 승급 재료만 따진 것입니다. 실제로는 강화로 +
        {PROMO_STEPS.map((s) => s.at).join('·+')}에 먼저 도달해야 해당 승급을 할 수 있으니, 재료가 모여도
        강화 쪽이 늦으면 그만큼 기다리게 됩니다. 여러 캐릭터로 벨가르딘을 도는 경우에도 승급 재료는 원정대
        단위로 합쳐지지 않습니다. 완갑은 캐릭터마다 따로 올리는 장비라, 위 주차 계산은 그 완갑을 끼울
        캐릭터가 직접 벌어들이는 양 기준으로 읽어야 합니다.
      </p>

      {NORMAL_TWINS.length > 0 && (
        <div className={styles.noteBox}>
          {NORMAL_TWINS.map(({ e, a, bound, special }) => (
            <p key={e.name}>
              벨가르딘 노말과 {josa(e.name, '은', '는')} 입장 레벨({e.level})도, 클리어 골드(주 {fmt(a.gold)}골드)도,
              코어와 재련 재료도 클리어·더보기 모두 같습니다. 차이는 두 가지뿐입니다. 하나는 귀속 골드로, 벨가르딘
              노말은 {NORMAL_BOUND === 0 ? '귀속이 없고' : `${fmt(NORMAL_BOUND)}골드가 귀속이고`}{' '}
              {josa(e.name, '은', '는')} {fmt(bound)}골드{bound === a.gold ? ' 전액이' : '가'} 귀속입니다. 다른 하나는
              고유 재화로, 사령의 잔영 주 {NORMAL.clear[MATERIAL_NAMES.WRAITH_ECHO] ?? 0}개 대{' '}
              {special ? `${special[0]} 주 ${special[1]}개` : '없음'}입니다.
            </p>
          ))}
          <p>
            골드 레이드 자리가 하나만 남았다면 거래 가능한 골드와 완갑 재료가 필요한 쪽은 벨가르딘 노말을,
            귀속 골드로 충분하고 상대 레이드의 고유 재화가 급한 쪽은 그 레이드를 고르면 됩니다.
          </p>
        </div>
      )}

      <h2>거래 불가 재화의 가치를 어떻게 매기나</h2>
      <p>
        사령의 잔영과 죽음의 손은 거래소에 매물이 없습니다. 시세가 존재하지 않는 재화라
        &quot;주간 보상 총 가치&quot; 같은 숫자를 내려면 다른 경로로 값을 추정해야 합니다.
      </p>
      <p>
        로아로골은 벨가르딘 상점의 교환 구성에서 역산합니다. 사령의 재련 재료 상자는 운명의 파편
        15,000개 · 위대한 운명의 돌파석 9개 · 운명의 파괴석 결정 500개 · 운명의 수호석 결정
        1,500개 중 하나가 각각 25% 확률로 나오는 상자입니다. 네 경우의 실시간 시세 환산값에 0.25를
        곱해 더하면 상자 하나의 기댓값이 나오고, 이것을 교환에 필요한 개수로 나누면 재화 1개의
        값이 됩니다. 잔영은 20개, 죽음의 손은 10개가 기준이므로 죽음의 손 단가는 자연히 잔영의
        두 배가 됩니다.{ECHO_PER_HAND === 2 && ' 승급 비용에서 잔영이 손의 두 배로 책정된 것과도 맞아떨어지는 비율입니다.'}
      </p>
      <p>
        이 단가는 이 페이지의 보상 총 가치뿐 아니라 더보기 효율 페이지와 주간 골드 계산기의 손익
        판정에도 같은 값으로 들어갑니다. 세르카의 고통의 가시를 상자 기댓값에서 역산하는 방식과
        동일한 규칙이라, 서로 다른 레이드의 거래 불가 재화를 같은 잣대로 비교할 수 있습니다.
      </p>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 상자 기댓값은 구성 재료의 실시간 시세로 계산되므로, 파편이나 돌파석
          시세가 오르면 잔영·죽음의 손 단가도 같이 오릅니다. 승급 재료를 쌓아 둔 상태에서 재료
          시세가 급등하면 보유 재고의 환산 가치도 함께 올라간다는 뜻입니다.
        </p>
      </div>
    </div>
  );
}
