import {
  BOX_PICK_COUNT,
  BRACELET_PEON,
  CELESTIAL_TICKET_PRICE,
  CHAOS_STONE_ARMOR_PRICE,
  CHAOS_STONE_WEAPON_PRICE,
  FATE_STONE_PRICE,
  GEM_PEON,
  HELL_BASE_REWARDS_DATA,
  LEGENDARY_CARD_PACK_PRICE,
  PLENTY_MULTIPLIER,
  SPECIAL_REFINING_PER_ATTEMPT,
  SPECIAL_REFINING_RATE,
  TICKET_TIER_LABELS,
  getRewardData,
  parseDualValue,
  parseGemSelectBox,
  parseRewardValue,
} from '@/lib/hell-reward-calc';
import styles from '@/app/guide/guide.module.css';

/**
 * HellRewardGuideBody — /hell-reward 도구 페이지 본문.
 *
 * 가격 산정 방식·특수재련 역산·기댓값 공식은 페이지의 GuideFaq 섹션이 설명하므로, 여기서는
 * lib/hell-reward-calc.ts 의 보상표 자체를 분석한다 (시세 없이 성립하는 구조).
 * 모든 숫자는 모듈 로드 시 보상표에서 계산한다 — 시즌 표가 바뀌면 본문도 따라간다.
 * 진행 규칙(상자 3개 중 1개 선택, 히든층 상자 +1)은 docs/hell-reward/sim-rules.md.
 */

const TIERS = TICKET_TIER_LABELS.map((_, i) => i);
const LAST = TIERS.length - 1;
const HELL = getRewardData('hell', 1750);
const NARAK = getRewardData('narak', 1750);
const HELL_1730 = getRewardData('hell', 1730);

const has = (v: string | undefined) => !!v && v !== '-';
/** 첫 수량 ("600/1,800" → 600, "3(희귀)" → 3) */
const firstQty = (v: string) => parseRewardValue(v.split('/')[0].replace(/\(.*\)/, ''));

// ── 나락 = 지옥 × N : 두 표에 공통으로 있는 항목 전 단계에서 같은 배수인지 ──
const SHARED = Object.keys(NARAK).filter((k) => HELL[k]);
const NARAK_RATIOS = SHARED.flatMap((k) =>
  TIERS.filter((t) => has(HELL[k][t])).map((t) => firstQty(NARAK[k][t]) / firstQty(HELL[k][t]))
);
const NARAK_MULT = NARAK_RATIOS[0];
const NARAK_UNIFORM = NARAK_RATIOS.every((r) => Math.abs(r - NARAK_MULT) < 1e-9);
const HELL_ONLY = Object.keys(HELL).filter((k) => !NARAK[k]);
const NARAK_ONLY = Object.keys(NARAK).filter((k) => !HELL[k]);

// ── 단계별 상자 후보 수와 "특정 상자 하나가 뜰 확률" ──
const poolSize = (data: Record<string, string[]>, t: number) => Object.keys(data).filter((k) => has(data[k][t])).length;
const POOL_ROWS = (() => {
  const rows: { label: string; hell: number; narak: number }[] = [];
  for (const t of TIERS) {
    const h = poolSize(HELL, t);
    const n = poolSize(NARAK, t);
    const prev = rows[rows.length - 1];
    if (prev && prev.hell === h && prev.narak === n) {
      prev.label = `${prev.label.split('~')[0]}~${TICKET_TIER_LABELS[t].split('~').pop()}`;
    } else {
      rows.push({ label: TICKET_TIER_LABELS[t], hell: h, narak: n });
    }
  }
  return rows;
})();
const MIN_POOL = Math.min(...POOL_ROWS.flatMap((r) => [r.hell, r.narak]));

// ── 새 항목이 후보에 들어오는 단계 ──
type Unlock = { tier: number; text: string };
const UNLOCKS: Unlock[] = [];
for (const [mode, data] of [
  ['지옥', HELL],
  ['나락', NARAK],
] as const) {
  for (const k of Object.keys(data)) {
    const first = data[k].findIndex(has);
    if (first > 0) UNLOCKS.push({ tier: first, text: `${mode} ${k} 추가` });
  }
  const gemHero = data['젬 선택 상자']?.findIndex((v) => parseGemSelectBox(v)?.rarity === 'hero') ?? -1;
  if (gemHero > 0) UNLOCKS.push({ tier: gemHero, text: `${mode} 젬 선택 상자 영웅 등급` });
}
const UNLOCK_TIERS = [...new Set(UNLOCKS.map((u) => u.tier))].sort((a, b) => a - b);
const GEM_HERO_1730 = HELL_1730['젬 선택 상자'].findIndex((v) => parseGemSelectBox(v)?.rarity === 'hero');
const GEM_HERO_1750 = HELL['젬 선택 상자'].findIndex((v) => parseGemSelectBox(v)?.rarity === 'hero');

// ── 0단계 → 100 성장 배수 (지옥 1750 상자 + 층 기본 보상) ──
const GROWTH = Object.keys(HELL)
  .filter((k) => k !== '젬 선택 상자') // 등급이 바뀌어 수량 배수가 의미 없다
  .map((k) => {
    const first = HELL[k].findIndex(has);
    const from = firstQty(HELL[k][first]);
    const to = firstQty(HELL[k][LAST]);
    return { name: k, fromLabel: TICKET_TIER_LABELS[first], from, to, mult: to / from, base: false };
  });
const BASE_GROWTH = Object.keys(HELL_BASE_REWARDS_DATA).map((k) => {
  const from = parseRewardValue(HELL_BASE_REWARDS_DATA[k][0]);
  const to = parseRewardValue(HELL_BASE_REWARDS_DATA[k][LAST]);
  return { name: k, fromLabel: TICKET_TIER_LABELS[0], from, to, mult: to / from, base: true };
});
const FULL_START = GROWTH.filter((g) => g.fromLabel === TICKET_TIER_LABELS[0]);
const BOX_MULT_MIN = Math.min(...FULL_START.map((g) => g.mult));
const BOX_MULT_MAX = Math.max(...FULL_START.map((g) => g.mult));
const BASE_MULT_MIN = Math.min(...BASE_GROWTH.map((g) => g.mult));
const BASE_MULT_MAX = Math.max(...BASE_GROWTH.map((g) => g.mult));
const GROWTH_ROWS = [...GROWTH, ...BASE_GROWTH].sort((a, b) => b.mult - a.mult);
const MAX_MULT = GROWTH_ROWS[0].mult;

// 귀속 골드 단계별 증가 — 비율과 절대량
const GOLD = HELL['귀속골드'].map(parseRewardValue);
const GOLD_STEPS = GOLD.slice(1).map((v, i) => ({ to: i + 1, ratio: v / GOLD[i], add: v - GOLD[i] }));
const STEP_MIN = GOLD_STEPS.reduce((a, b) => (b.ratio < a.ratio ? b : a));
const STEP_MAX = GOLD_STEPS.reduce((a, b) => (b.ratio > a.ratio ? b : a));
const LAST_STEP = GOLD_STEPS[GOLD_STEPS.length - 1];

// ── 시세와 무관하게 값이 정해지는 상자끼리 비교 ──
function fixedRow(data: Record<string, string[]>, t: number) {
  const gold = parseRewardValue(data['귀속골드'][t]);
  const [fate, chaos] = parseDualValue(data['정련된 운명/혼돈의 돌'][t]);
  const stone = Math.max(fate * FATE_STONE_PRICE, chaos * (CHAOS_STONE_WEAPON_PRICE + CHAOS_STONE_ARMOR_PRICE));
  const pack = has(data['전설카드팩']?.[t]) ? parseRewardValue(data['전설카드팩'][t]) * LEGENDARY_CARD_PACK_PRICE : 0;
  const ticket = has(data['천상 도전권']?.[t]) ? parseRewardValue(data['천상 도전권'][t]) * CELESTIAL_TICKET_PRICE : 0;
  return { gold, stone, extra: pack || ticket, extraName: pack ? '전설카드팩' : ticket ? '천상 도전권' : '' };
}
const FIXED_TIERS = [0, 5, LAST];
const FIXED_HELL = FIXED_TIERS.map((t) => ({ t, ...fixedRow(HELL, t) }));
const STONE_OVER_GOLD = TIERS.every((t) => {
  const r = fixedRow(HELL, t);
  const n = fixedRow(NARAK, t);
  return r.stone > r.gold && n.stone > n.gold;
});

// ── 1750 / 1730 수량 비 (100 단계) ──
const LEVEL_RATIOS = Object.keys(HELL).map((k) => ({
  name: k,
  ratio: firstQty(HELL[k][LAST]) / firstQty(HELL_1730[k][LAST]),
}));
const SAME_1730 = LEVEL_RATIOS.filter((r) => Math.abs(r.ratio - 1) < 1e-9).map((r) => r.name);
const DIFF_1730 = LEVEL_RATIOS.filter((r) => Math.abs(r.ratio - 1) >= 1e-9);
const LR_MIN = Math.min(...DIFF_1730.map((r) => r.ratio));
const LR_MAX = Math.max(...DIFF_1730.map((r) => r.ratio));

const SPECIAL_MEDIAN = Math.ceil(Math.log(0.5) / Math.log(1 - SPECIAL_REFINING_RATE));

const fmt = (v: number) => Math.round(v).toLocaleString();
const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;
const mult = (v: number) => `${v.toFixed(1)}배`;

export default function HellRewardGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>보상표를 숫자로 요약하면</h2>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>나락 상자 수량</span>
          <span className={styles.statValue}>지옥 × {NARAK_MULT}</span>
          <span className={styles.statNote}>공통 {SHARED.length}항목, 전 단계{NARAK_UNIFORM ? ' 동일 배수' : ''}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>상자 후보 수</span>
          <span className={styles.statValue}>
            {POOL_ROWS[0].hell}~{POOL_ROWS[POOL_ROWS.length - 1].hell} / {POOL_ROWS[0].narak}~
            {POOL_ROWS[POOL_ROWS.length - 1].narak}개
          </span>
          <span className={styles.statNote}>지옥 / 나락, 그중 {BOX_PICK_COUNT}개가 뜬다</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>0단계 → 100 상자 수량</span>
          <span className={styles.statValue}>
            {BOX_MULT_MIN.toFixed(0)}~{BOX_MULT_MAX.toFixed(0)}배
          </span>
          <span className={styles.statNote}>0단계부터 있는 지옥 상자 항목</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>같은 구간 층 기본 보상</span>
          <span className={styles.statValue}>
            {BASE_MULT_MIN.toFixed(1)}~{BASE_MULT_MAX.toFixed(1)}배
          </span>
          <span className={styles.statNote}>지옥 전용, 풍요 시 ×{PLENTY_MULTIPLIER}</span>
        </div>
      </div>

      <h2>지옥과 나락, 무엇이 다른가?</h2>
      <p>
        두 콘텐츠의 상자는 구성이 일부만 겹칩니다. 지옥에만 {HELL_ONLY.join('·')}이 있고, 나락에만{' '}
        {NARAK_ONLY.join('·')}이 있습니다. 겹치는 {SHARED.length}항목({SHARED.join('·')})은{' '}
        {NARAK_UNIFORM ? (
          <>
            모든 단계에서 나락 수량이 지옥의 정확히 <strong>{NARAK_MULT}배</strong>입니다.
          </>
        ) : (
          <>단계마다 배수가 조금씩 다릅니다.</>
        )}{' '}
        대신 지옥은 층을 깰 때마다 상자와 별개로 파편·결정·위대한 돌파석을 기본 보상으로 받고, 나락은 이 기본 보상이
        없습니다. 같은 단계라면 나락 상자 하나가 훨씬 크지만, 지옥은 가는 길에 쌓이는 몫이 따로 있다는 뜻입니다.
      </p>

      <h2>상자 후보가 몇 개냐가 확률을 정한다</h2>
      <p>
        끝난 층의 단계 보상 목록에서 상자 {BOX_PICK_COUNT}개가 중복 없이 같은 확률로 뜨고, 그중 하나를 고릅니다. 후보가
        n개라면 원하는 상자 하나가 {BOX_PICK_COUNT}개 안에 들어올 확률은 {BOX_PICK_COUNT}/n입니다. 그래서 새 항목이
        목록에 추가되는 단계에서는 기존 항목이 뜰 확률이 오히려 내려갑니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>단계</th>
              <th>지옥 후보</th>
              <th>특정 상자가 뜰 확률</th>
              <th>나락 후보</th>
              <th>특정 상자가 뜰 확률</th>
            </tr>
          </thead>
          <tbody>
            {POOL_ROWS.map((r) => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td>{r.hell}개</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(BOX_PICK_COUNT / r.hell / (BOX_PICK_COUNT / MIN_POOL)) * 100}px` }}
                    />
                    <span className={styles.barText}>{pct(BOX_PICK_COUNT / r.hell)}</span>
                  </div>
                </td>
                <td>{r.narak}개</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(BOX_PICK_COUNT / r.narak / (BOX_PICK_COUNT / MIN_POOL)) * 100}px` }}
                    />
                    <span className={styles.barText}>{pct(BOX_PICK_COUNT / r.narak)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        상자 {BOX_PICK_COUNT}개 기준. 히든층 &quot;상자 +1&quot;을 받으면 {BOX_PICK_COUNT + 1}/n으로 오른다
      </p>

      <p>
        나락은 후보가 적어서 같은 상자가 뜰 확률이 지옥보다 높습니다. {POOL_ROWS[0].label} 구간에서는 특정 상자 하나가{' '}
        {pct(BOX_PICK_COUNT / POOL_ROWS[0].narak)} 확률로 보이지만, 후보가 늘어난{' '}
        {POOL_ROWS[POOL_ROWS.length - 1].label} 구간에서는{' '}
        {pct(BOX_PICK_COUNT / POOL_ROWS[POOL_ROWS.length - 1].narak)}까지 내려갑니다. 원하는 상자가 정해져 있다면 단계를
        올려 수량을 키우는 것과 후보가 늘어 덜 보이게 되는 것 사이의 균형을 보는 셈입니다.
      </p>

      <h2>새 항목이 들어오는 단계</h2>
      <ol className={styles.stepFlow}>
        {UNLOCK_TIERS.map((t) => (
          <li key={t} className={styles.stepItem}>
            <strong>{TICKET_TIER_LABELS[t]}</strong>
            {UNLOCKS.filter((u) => u.tier === t).map((u, i) => (
              <span key={u.text}>
                {i > 0 && <br />}
                {u.text}
              </span>
            ))}
          </li>
        ))}
      </ol>
      <p>
        고가 항목은 대부분 {TICKET_TIER_LABELS[UNLOCK_TIERS[1] ?? UNLOCK_TIERS[0]]} 구간에서 한꺼번에 열립니다. 젬 선택
        상자는 이 무렵 희귀에서 영웅 등급으로 바뀌는데, 1750 표는 {TICKET_TIER_LABELS[GEM_HERO_1750]}, 1730 표는{' '}
        {TICKET_TIER_LABELS[GEM_HERO_1730]} 구간부터 영웅입니다. 영웅 젬은 거래소 시세가 붙고 등록 페온도 희귀(
        {GEM_PEON.rare}개)의 두 배인 {GEM_PEON.hero}개라, 이 전환 한 번으로 젬 상자의 평가액이 크게 달라집니다.
      </p>

      <h2>단계가 오를수록 무엇이 커지나</h2>
      <p>
        상자 수량은 단계마다 3~5할씩 불어나 누적되면 수십 배가 되지만, 층 기본 보상은 훨씬 완만하게 늘어납니다. 아래는 지옥 1750 표에서
        각 항목이 처음 등장한 단계 대비 100 단계 수량의 배수입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>항목</th>
              <th>구분</th>
              <th>처음 등장</th>
              <th>100 단계</th>
              <th>배수</th>
            </tr>
          </thead>
          <tbody>
            {GROWTH_ROWS.map((g) => (
              <tr key={`${g.base ? 'b' : 'x'}-${g.name}`}>
                <td style={{ fontWeight: 600 }}>{g.name}</td>
                <td>{g.base ? '층 기본' : '상자'}</td>
                <td>
                  {fmt(g.from)} ({g.fromLabel})
                </td>
                <td>{fmt(g.to)}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(g.mult / MAX_MULT) * 100}px` }} />
                    <span className={styles.barText}>{mult(g.mult)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>두 재료를 함께 주는 항목은 앞쪽 재료 수량 기준, 젬 선택 상자는 등급이 바뀌어 제외</p>

      <p>
        귀속 골드로 보면 단계 하나를 올릴 때마다 {STEP_MIN.ratio.toFixed(2)}~{STEP_MAX.ratio.toFixed(2)}배씩 늘어납니다.
        비율로는 {TICKET_TIER_LABELS[STEP_MAX.to - 1]}에서 {TICKET_TIER_LABELS[STEP_MAX.to]}로 넘어갈 때가 가장 크고,
        절대량으로는 마지막 {TICKET_TIER_LABELS[LAST - 1]}에서 100으로 넘어갈 때 {fmt(LAST_STEP.add)}골드가 한 번에
        늘어납니다. 반면 층 기본 보상은 0단계에서 100까지 가도 {BASE_MULT_MIN.toFixed(1)}~{BASE_MULT_MAX.toFixed(1)}배에
        그칩니다. 낮은 단계에서는 기본 보상이 전체 수확에서 차지하는 비중이 크고, 높은 단계로 갈수록 마지막 상자 하나가
        거의 전부를 결정합니다.
      </p>

      <h2>시세 없이 값이 정해지는 상자끼리 비교</h2>
      <p>
        귀속 골드는 그 자체가 금액이고, 정련된 운명·혼돈의 돌과 천상 도전권·전설 카드팩은 계산기가 고정가(운명의 돌{' '}
        {fmt(FATE_STONE_PRICE)} · 혼돈의 돌 무기 {fmt(CHAOS_STONE_WEAPON_PRICE)} + 방어구 {fmt(CHAOS_STONE_ARMOR_PRICE)} ·
        천상 도전권 {fmt(CELESTIAL_TICKET_PRICE)} · 카드팩 {fmt(LEGENDARY_CARD_PACK_PRICE)}골드)로 평가합니다. 그래서 이
        상자들끼리는 거래소 시세와 무관하게 순서가 정해집니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>지옥 단계</th>
            <th>귀속 골드</th>
            <th>정련된 돌 (고정가)</th>
            <th>돌 ÷ 골드</th>
            <th>천상 도전권</th>
          </tr>
        </thead>
        <tbody>
          {FIXED_HELL.map((r) => (
            <tr key={r.t}>
              <td style={{ fontWeight: 600 }}>{TICKET_TIER_LABELS[r.t]}</td>
              <td>{fmt(r.gold)}</td>
              <td>{fmt(r.stone)}</td>
              <td>{(r.stone / r.gold).toFixed(2)}배</td>
              <td>{r.extra ? fmt(r.extra) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        {STONE_OVER_GOLD
          ? '지옥·나락 모든 단계에서 정련된 돌 상자가 귀속 골드 상자보다 높게 평가됩니다. '
          : '대부분의 단계에서 정련된 돌 상자가 귀속 골드 상자보다 높게 평가됩니다. '}
        돌 상자는 운명의 돌과 혼돈의 돌 중 더 비싼 쪽으로 치고, 혼돈을 고르면 무기·방어구 돌을 같은 개수로 둘 다 받기
        때문입니다. 다만 이 값은 고정가 기준이라, 정련된 돌을 당장 쓸 곳이 없다면 체감 가치는 골드 쪽이 높을 수 있습니다.
        계산기의 기댓값이 돌 상자에 크게 기대고 있다면 이 전제를 한 번 떠올려 보는 편이 좋습니다.
      </p>

      <h2>가격 산정 방식 정리</h2>
      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>산정 방식</th>
            <th>대표 항목</th>
            <th>근거</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>실시간 시세</td>
            <td>파괴석·수호석 결정, 위대한 돌파석, 상급 아비도스, 숨결, 귀속 각인서, 귀속 보석, 영웅 젬</td>
            <td>거래소·경매장 현재가</td>
          </tr>
          <tr>
            <td>고정가</td>
            <td>천상 도전권, 전설 카드팩, 정련된 운명·혼돈의 돌, 희귀 젬</td>
            <td>계산기 기준가</td>
          </tr>
          <tr>
            <td>페온 환산</td>
            <td>
              어빌리티스톤, 팔찌({BRACELET_PEON}페온), 젬 등록 페온(희귀 {GEM_PEON.rare} · 영웅 {GEM_PEON.hero})
            </td>
            <td>블루 크리스탈 환율</td>
          </tr>
          <tr>
            <td>비용 역산</td>
            <td>특수재련 재료</td>
            <td>
              계승 무기 20→21 일반재련 기준 비용 ÷ ({SPECIAL_MEDIAN}회 × {SPECIAL_REFINING_PER_ATTEMPT}개)
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        특수재련 역산의 {SPECIAL_MEDIAN}회는 성공 확률 {pct(SPECIAL_REFINING_RATE)}에서 절반의 사람이 성공하는 시도
        횟수(기하분포 중앙값)입니다. 즉 특수재련 재료 {fmt(SPECIAL_MEDIAN * SPECIAL_REFINING_PER_ATTEMPT)}개를 같은 단계 일반재련
        기준 비용과 같은 값으로 보는 셈입니다. 페온 환산과 비용 역산은 환율·재련 비용이 바뀌면 함께 움직이므로, 이 둘이
        기댓값의 큰 비중을 차지할 때는 숫자를 절대적으로 받아들이지 않는 편이 좋습니다.
      </p>

      <h2>1730 표와 1750 표의 차이</h2>
      <p>
        두 표는 항목 구성이 완전히 같고 수량만 다릅니다. 100 단계 기준 1750 수량은 1730의 {LR_MIN.toFixed(2)}~
        {LR_MAX.toFixed(2)}배이고,
        {SAME_1730.length > 0 ? ` ${SAME_1730.join('·')}만 두 표가 같은 수량입니다.` : ''} 층 기본 보상은 두 레벨이 같은
        표를 씁니다. 1750에 막 도달한 캐릭터라면 같은 진행도에서 상자 수량이 대략 1.2배 커진다고 보면 됩니다.
      </p>

      <div className={styles.noteBox}>
        <p>
          보상 수량은 게임 데이터 원본의 지옥·나락 보상 카테고리를 옮긴 값이고, 1730 표의 정련된 혼돈의 돌만 한국 서버
          파일에서 상자 안 내용이 풀리지 않아 북미 서버 파일로 교차 확인했습니다. 이 글의 숫자는 전부 계산기와 같은 표에서
          계산하므로, 새 시즌 표가 들어가면 본문도 함께 바뀝니다.
        </p>
      </div>
    </div>
  );
}
