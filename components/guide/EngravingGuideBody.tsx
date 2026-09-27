import { TIER_CLASSES, GROUP_ORDER, roleOf } from '@/lib/tier-data';
import { ENGRAVING_BUILDS } from '@/lib/engraving-builds.generated';
import { ENGRAVING_OVERRIDES, type EngSlot } from '@/lib/engraving-overrides';
import styles from '@/app/guide/guide.module.css';

/**
 * EngravingGuideBody — /engraving 페이지 본문 분석 글.
 *
 * 문장 속 숫자는 전부 lib/engraving-builds.generated.ts(유저 장착 각인 집계)에
 * lib/engraving-overrides.ts(수동 보정)를 덮어쓴 결과에서 계산한다. 생성기를 다시 돌리거나
 * 보정을 고치면 본문 숫자도 같이 따라가야 하기 때문이다.
 * 병합·사멸 분류 규칙은 app/engraving/page.tsx 와 같다 — 저쪽 규칙을 바꾸면 여기도 같이 바꾼다.
 * 계산은 모듈 로드 시 한 번만 돌고(60여 세팅 × 5칸), 렌더마다 반복되지 않는다.
 */

// ── page.tsx 와 같은 병합 규칙 ──
const EXCLUDED_SPEC_IDS = new Set<string>([]);
const PROVISIONAL_SPEC_IDS = new Set(['차원 공간검사', '차원 시간관리자']);

const ALL_SPECS = TIER_CLASSES.filter(
  (c) => !EXCLUDED_SPEC_IDS.has(c.id) && (ENGRAVING_BUILDS[c.id] || ENGRAVING_OVERRIDES[c.id]?.slots)
);

type MergedBuild = { slots: EngSlot[]; stat: string; sample: number };
const BUILDS: Record<string, MergedBuild> = {};
for (const s of ALL_SPECS) {
  const ov = ENGRAVING_OVERRIDES[s.id];
  BUILDS[s.id] = (ov ? { ...ENGRAVING_BUILDS[s.id], ...ov } : ENGRAVING_BUILDS[s.id]) as MergedBuild;
}

const poolOf = (s: EngSlot): string[] => (Array.isArray(s) ? s : s.pool);
const pickOf = (s: EngSlot): number => (Array.isArray(s) ? 1 : s.pick);
const isFixed = (s: EngSlot): boolean => Array.isArray(s) && s.length === 1;

// 분석 대상: 유저 표본이 있는 세팅만. 잠정 세팅(신규 직업)은 손으로 넣은 빌드라 통계에서 뺀다.
const PROVISIONAL = ALL_SPECS.filter((s) => PROVISIONAL_SPEC_IDS.has(s.id));
const SPECS = ALL_SPECS.filter((s) => !PROVISIONAL_SPEC_IDS.has(s.id));
const DEALERS = SPECS.filter((s) => roleOf(s.id) === 'dealer');
const SUPPORTS = SPECS.filter((s) => roleOf(s.id) === 'support');

const engSetOf = (id: string) => new Set(BUILDS[id].slots.flatMap(poolOf));
const fixedSetOf = (id: string) =>
  new Set(BUILDS[id].slots.filter(isFixed).map((sl) => poolOf(sl)[0]));

// 사멸 분류 (page.tsx styleOf 와 동일)
type PlayStyle = 'back' | 'head' | 'normal';
const STYLE_OVERRIDE: Record<string, PlayStyle> = { '버서커 광기': 'normal' };
const styleOf = (id: string): PlayStyle => {
  if (STYLE_OVERRIDE[id]) return STYLE_OVERRIDE[id];
  const set = engSetOf(id);
  if (set.has('기습의 대가')) return 'back';
  if (set.has('결투의 대가')) return 'head';
  return 'normal';
};
const STYLE_LABEL: Record<PlayStyle, string> = { back: '백사멸', head: '헤드사멸', normal: '타대' };
const STYLES: PlayStyle[] = ['back', 'head', 'normal'];

// 받침 유무로 조사 고르기 (각인·직업명이 데이터에서 오므로 고정 문구로 못 박는다)
const hasBatchim = (word: string) => {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
};
const eunNeun = (w: string) => `${w}${hasBatchim(w) ? '은' : '는'}`;
const iGa = (w: string) => `${w}${hasBatchim(w) ? '이' : '가'}`;
const euroRo = (w: string) => {
  const code = w.charCodeAt(w.length - 1);
  const jong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
  return `${w}${jong === 0 || jong === 8 ? '로' : '으로'}`;
};
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

// ── 핵심 수치 ──
let totalSeats = 0;
let fixedSeats = 0;
for (const s of SPECS) {
  for (const sl of BUILDS[s.id].slots) {
    totalSeats += pickOf(sl);
    if (isFixed(sl)) fixedSeats += 1;
  }
}
const TOTAL_SAMPLE = SPECS.reduce((a, s) => a + BUILDS[s.id].sample, 0);
const SORTED_SAMPLES = SPECS.map((s) => BUILDS[s.id].sample).sort((a, b) => a - b);
const MEDIAN_SAMPLE = SORTED_SAMPLES.length
  ? SORTED_SAMPLES.length % 2
    ? SORTED_SAMPLES[(SORTED_SAMPLES.length - 1) / 2]
    : (SORTED_SAMPLES[SORTED_SAMPLES.length / 2 - 1] + SORTED_SAMPLES[SORTED_SAMPLES.length / 2]) / 2
  : 0;
const DEALER_ENGS = new Set(DEALERS.flatMap((s) => [...engSetOf(s.id)]));
const SUPPORT_ENGS = new Set(SUPPORTS.flatMap((s) => [...engSetOf(s.id)]));
const ALL_ENGS = new Set([...DEALER_ENGS, ...SUPPORT_ENGS]);
const SHARED_ROLE_ENGS = [...DEALER_ENGS].filter((n) => SUPPORT_ENGS.has(n));

// ── 딜러 각인 채용 현황 ──
type EngRow = { name: string; fixed: number; choice: number; total: number };
const ENG_ROWS: EngRow[] = (() => {
  const map = new Map<string, EngRow>();
  for (const s of DEALERS) {
    const fx = fixedSetOf(s.id);
    for (const n of engSetOf(s.id)) {
      const row = map.get(n) ?? { name: n, fixed: 0, choice: 0, total: 0 };
      if (fx.has(n)) row.fixed += 1;
      else row.choice += 1;
      row.total += 1;
      map.set(n, row);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.total - a.total || b.fixed - a.fixed || a.name.localeCompare(b.name, 'ko')
  );
})();
const ENG_TABLE = ENG_ROWS.filter((r) => r.total >= 2);
const ENG_SINGLE = ENG_ROWS.filter((r) => r.total < 2);
const ENG_MAX = ENG_ROWS[0]?.total ?? 1;
const UNIVERSAL = ENG_ROWS.filter((r) => r.total === DEALERS.length);
const NEXT_ROW = ENG_ROWS.find((r) => r.total < DEALERS.length);
const MOST_CHOICE = [...ENG_ROWS].sort(
  (a, b) => b.choice - a.choice || a.name.localeCompare(b.name, 'ko')
)[0];
// 고정 칸 기준 상위 5개(공통 코어)가 딜러 고정 칸을 얼마나 채우는지
const BY_FIXED = [...ENG_ROWS]
  .filter((r) => r.fixed > 0)
  .sort((a, b) => b.fixed - a.fixed || a.name.localeCompare(b.name, 'ko'));
const CORE5 = BY_FIXED.slice(0, 5).map((r) => r.name);
const CORE_REST = BY_FIXED.slice(5, 8);
const CORE_COVER = (() => {
  let hit = 0;
  let seats = 0;
  for (const s of DEALERS) {
    for (const sl of BUILDS[s.id].slots) {
      if (!isFixed(sl)) continue;
      seats += 1;
      if (CORE5.includes(poolOf(sl)[0])) hit += 1;
    }
  }
  return { hit, seats };
})();

// ── 선택 칸 수 분포 (딜러) ──
const choiceSeatsOf = (id: string) =>
  BUILDS[id].slots.filter((sl) => !isFixed(sl)).reduce((a, sl) => a + pickOf(sl), 0);
const CHOICE_BUCKETS = [0, 1, 2, 3].map((n) => {
  const specs = DEALERS.filter((s) =>
    n === 3 ? choiceSeatsOf(s.id) >= 3 : choiceSeatsOf(s.id) === n
  );
  return { label: n === 3 ? '3칸 이상' : `${n}칸`, specs };
});
const ALL_FIXED = CHOICE_BUCKETS[0].specs;
const MAX_CHOICE = Math.max(0, ...DEALERS.map((s) => choiceSeatsOf(s.id)));
const MOST_FLEX = DEALERS.filter((s) => choiceSeatsOf(s.id) === MAX_CHOICE && MAX_CHOICE > 0);
const PICK_N = DEALERS.filter((s) =>
  BUILDS[s.id].slots.some((sl) => !Array.isArray(sl) && sl.pick > 1)
);

// ── 직업군 × 사멸 ──
const GROUP_ROWS = GROUP_ORDER.map((g) => {
  const specs = DEALERS.filter((s) => s.group === g);
  const count: Record<PlayStyle, number> = { back: 0, head: 0, normal: 0 };
  for (const s of specs) count[styleOf(s.id)] += 1;
  return { group: g, total: specs.length, count, positional: count.back + count.head };
}).filter((r) => r.total > 0);
const STYLE_TOTAL: Record<PlayStyle, number> = { back: 0, head: 0, normal: 0 };
for (const s of DEALERS) STYLE_TOTAL[styleOf(s.id)] += 1;
const HEAD_SPECS = DEALERS.filter((s) => styleOf(s.id) === 'head');
const HEAD_GROUPS = GROUP_ROWS.filter((r) => r.count.head > 0).sort(
  (a, b) => b.count.head - a.count.head
);
const BACK_TOP = [...GROUP_ROWS].sort(
  (a, b) => b.count.back / b.total - a.count.back / a.total || b.total - a.total
)[0];
const NORMAL_TOP = [...GROUP_ROWS].sort(
  (a, b) => b.count.normal / b.total - a.count.normal / a.total || b.total - a.total
)[0];

// ── 전투 특성 × 사멸 ──
const STAT_ROWS = (() => {
  const map = new Map<string, Record<PlayStyle, number> & { total: number }>();
  for (const s of DEALERS) {
    const stat = BUILDS[s.id].stat;
    if (!stat) continue;
    const row = map.get(stat) ?? { back: 0, head: 0, normal: 0, total: 0 };
    row[styleOf(s.id)] += 1;
    row.total += 1;
    map.set(stat, row);
  }
  return [...map.entries()]
    .map(([stat, r]) => ({ stat, ...r }))
    .sort((a, b) => b.total - a.total || a.stat.localeCompare(b.stat, 'ko'));
})();
const STAT_DEALERS = STAT_ROWS.reduce((a, r) => a + r.total, 0);
const STAT_MAX = STAT_ROWS[0]?.total ?? 1;
const STAT_RARE = STAT_ROWS.filter((r) => r.total <= 3);
const specsWithStat = (stat: string) =>
  DEALERS.filter((s) => BUILDS[s.id].stat === stat).map((s) => s.name);

// ── 서포터 ──
const slotKey = (id: string) =>
  BUILDS[id].slots
    .map((sl) => `${pickOf(sl)}:${[...poolOf(sl)].sort().join('/')}`)
    .sort()
    .join('|');
const SUPPORT_IDENTICAL =
  SUPPORTS.length > 1 && SUPPORTS.every((s) => slotKey(s.id) === slotKey(SUPPORTS[0].id));
const SUPPORT_FIXED_COMMON = SUPPORTS.length
  ? [...fixedSetOf(SUPPORTS[0].id)].filter((n) => SUPPORTS.every((s) => fixedSetOf(s.id).has(n)))
  : [];
const SUPPORT_CHOICE_POOL = [
  ...new Set(
    SUPPORTS.flatMap((s) => BUILDS[s.id].slots.filter((sl) => !isFixed(sl)).flatMap(poolOf))
  ),
];
const SUPPORT_SAMPLE = SUPPORTS.reduce((a, s) => a + BUILDS[s.id].sample, 0);

// ── 표본 주의 ──
const LOW_SAMPLE = 5; // 이 값 미만이면 한두 명의 선택이 빌드를 바꿀 수 있는 수준
const LOW_SPECS = SPECS.filter((s) => BUILDS[s.id].sample < LOW_SAMPLE).sort(
  (a, b) => BUILDS[a.id].sample - BUILDS[b.id].sample || a.name.localeCompare(b.name, 'ko')
);
const TOP_SAMPLE = [...SPECS]
  .sort((a, b) => BUILDS[b.id].sample - BUILDS[a.id].sample)
  .slice(0, 3);
const TOP3_SHARE = pct(
  TOP_SAMPLE.reduce((a, s) => a + BUILDS[s.id].sample, 0),
  TOTAL_SAMPLE
);

const joinNames = (names: string[]) => names.join(', ');

function Bar({ value, max, text }: { value: number; max: number; text: string }) {
  return (
    <td className={styles.barCell}>
      <div className={styles.barTrack}>
        <span className={styles.barFill} style={{ width: `${(value / max) * 70}%` }} />
        <span className={styles.barText}>{text}</span>
      </div>
    </td>
  );
}

export default function EngravingGuideBody() {
  const fixedPct = pct(fixedSeats, totalSeats);
  return (
    <div className={styles.articleBody}>
      <h2>{SPECS.length}개 세팅의 각인을 모아 보면</h2>
      <p>
        이 페이지의 카드는 실제 캐릭터들이 장착한 각인을 세팅별로 집계해서 만들었습니다. 카드
        하나만 보면 &quot;이 직업은 이걸 쓴다&quot;는 정보에 그치지만, {SPECS.length}개 세팅을
        한꺼번에 놓고 보면 전체 메타가 어떤 모양인지가 드러납니다. 아래 수치는 유저 표본이 있는
        세팅만 대상으로 했고, 아직 표본이 없는 신규 직업 세팅 {PROVISIONAL.length}개는 계산에서
        뺐습니다.
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>분석한 세팅</span>
          <span className={styles.statValue}>{SPECS.length}개</span>
          <span className={styles.statNote}>
            딜러 {DEALERS.length} · 서포터 {SUPPORTS.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>집계 캐릭터</span>
          <span className={styles.statValue}>{TOTAL_SAMPLE.toLocaleString()}명</span>
          <span className={styles.statNote}>세팅당 중앙값 {MEDIAN_SAMPLE}명</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>등장한 각인</span>
          <span className={styles.statValue}>{ALL_ENGS.size}종</span>
          <span className={styles.statNote}>
            딜러 {DEALER_ENGS.size}종 · 서포터 {SUPPORT_ENGS.size}종
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>고정 칸 비율</span>
          <span className={styles.statValue}>{fixedPct}%</span>
          <span className={styles.statNote}>
            전체 {totalSeats}칸 중 {fixedSeats}칸
          </span>
        </div>
      </div>

      <p>
        가장 먼저 눈에 띄는 숫자는 고정 칸 비율입니다. 세팅마다 각인 5칸을 채우니 전체는{' '}
        {totalSeats}칸인데, 그중 {fixedSeats}칸({fixedPct}%)은 유저 대부분이 같은 각인을 넣는
        자리입니다. 취향이나 보유 각인서에 따라 갈리는 자리는 {totalSeats - fixedSeats}칸뿐입니다.
        등장하는 각인도 {ALL_ENGS.size}종이 전부입니다. 딜러로 좁히면 {DEALER_ENGS.size}종이고, 그중
        두 세팅 이상에서 쓰이는 각인은 {ENG_TABLE.length}종에 그칩니다. 직업은 많아도 실전에서
        돌아가는 각인의 폭은 꽤 좁습니다.
      </p>

      <h2>딜러 {DEALERS.length}개 세팅이 공유하는 각인</h2>
      <p>
        딜러 세팅만 따로 떼어, 각 각인이 몇 개 세팅에 들어가는지 셌습니다. 고정 칸으로 들어간
        경우와 &quot;or&quot;로 묶인 선택 칸 후보로만 들어간 경우를 나눠 적었습니다. 막대는 전체
        딜러 세팅 대비 채용 비율입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>각인</th>
              <th>고정</th>
              <th>선택 후보</th>
              <th>채용 세팅 비율</th>
            </tr>
          </thead>
          <tbody>
            {ENG_TABLE.map((r) => (
              <tr key={r.name}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.fixed}</td>
                <td>{r.choice}</td>
                <Bar
                  value={r.total}
                  max={ENG_MAX}
                  text={`${r.total}개 · ${pct(r.total, DEALERS.length)}%`}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        딜러 {DEALERS.length}개 세팅 기준. 두 개 이상의 세팅에서 쓰이는 각인만 표시.
      </p>

      {UNIVERSAL.length > 0 ? (
        <p>
          {eunNeun(UNIVERSAL.map((r) => r.name).join('·'))} 딜러 {DEALERS.length}개 세팅 전부에
          들어갑니다. 직업과 세팅을 가리지 않는 유일한 공통분모라서, 어떤 딜러를 새로 키우든 이
          각인서만큼은 다른 캐릭터와 돌려쓸 수 있습니다.
          {NEXT_ROW && (
            <>
              {' '}
              그다음인 {eunNeun(NEXT_ROW.name)} {NEXT_ROW.total}개 세팅(
              {pct(NEXT_ROW.total, DEALERS.length)}%)에서 쓰이고, 그중 {NEXT_ROW.fixed}개에서는
              선택지가 아니라 고정 칸입니다.
            </>
          )}
        </p>
      ) : (
        NEXT_ROW && (
          <p>
            모든 딜러 세팅에 공통으로 들어가는 각인은 없습니다. 가장 널리 쓰이는{' '}
            {eunNeun(NEXT_ROW.name)} {NEXT_ROW.total}개 세팅(
            {pct(NEXT_ROW.total, DEALERS.length)}%)에 들어갑니다.
          </p>
        )
      )}
      {MOST_CHOICE && MOST_CHOICE.choice > 0 && (
        <p>
          선택 칸에서 가장 자주 이름이 오르는 각인은 {euroRo(MOST_CHOICE.name)},{' '}
          {MOST_CHOICE.choice}개 세팅에서 &quot;or&quot; 후보로 등장합니다.{' '}
          {MOST_CHOICE.fixed < MOST_CHOICE.choice
            ? `고정으로 박힌 세팅은 ${MOST_CHOICE.fixed}개라, 쓰는 곳은 많아도 반드시 필요한 각인이라기보다 마지막 한 칸을 채우는 무난한 선택지에 가깝습니다.`
            : `고정으로 쓰는 세팅도 ${MOST_CHOICE.fixed}개나 되어, 빠지는 일이 드문 각인입니다.`}{' '}
          선택 칸이 갈리는 세팅이라면 이 각인서를 먼저 확보해 두는 편이 여러 캐릭터에 두루 쓰입니다.
        </p>
      )}
      <p>
        고정 칸으로 가장 많이 쓰이는 5개({CORE5.join(', ')})만으로 딜러 고정 칸{' '}
        {CORE_COVER.seats}칸 중 {CORE_COVER.hit}칸({pct(CORE_COVER.hit, CORE_COVER.seats)}%)이
        채워집니다.
        {CORE_REST.length > 0 && (
          <>
            {' '}
            남은 {CORE_COVER.seats - CORE_COVER.hit}칸은{' '}
            {CORE_REST.map((r) => `${r.name}(${r.fixed})`).join(', ')} 순으로 나눠 가지는데,
            이 자리가 사실상 직업마다 성격이 갈리는 지점입니다.
          </>
        )}
        {ENG_SINGLE.length > 0 && (
          <>
            {' '}
            단 한 세팅에서만 등장하는 각인도 {ENG_SINGLE.length}종(
            {ENG_SINGLE.map((r) => r.name).join(', ')}) 있습니다.
          </>
        )}
      </p>

      <h2>빌드가 굳은 세팅과 갈리는 세팅</h2>
      <p>
        같은 딜러라도 5칸이 전부 정해진 세팅이 있고, 두세 칸을 유저가 골라야 하는 세팅이 있습니다.
        선택 칸 수로 딜러 세팅을 나눠 보면 다음과 같습니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>선택 칸 수</th>
              <th>세팅 수</th>
              <th>비율</th>
            </tr>
          </thead>
          <tbody>
            {CHOICE_BUCKETS.map((b) => (
              <tr key={b.label}>
                <td style={{ fontWeight: 600 }}>{b.label}</td>
                <td>{b.specs.length}개</td>
                <Bar
                  value={b.specs.length}
                  max={Math.max(1, ...CHOICE_BUCKETS.map((x) => x.specs.length))}
                  text={`${pct(b.specs.length, DEALERS.length)}%`}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        택N 슬롯은 N칸으로 계산. 딜러 {DEALERS.length}개 세팅 기준.
      </p>

      <p>
        선택 칸이 하나도 없는 세팅은 {ALL_FIXED.length}개({pct(ALL_FIXED.length, DEALERS.length)}
        %)입니다. {ALL_FIXED.length > 0 && `${iGa(joinNames(ALL_FIXED.map((s) => s.name)))} 여기에 속합니다. `}
        이런 세팅은 카드에 적힌 5개를 그대로 맞추면 되고, 각인서를 살 때도 고민할 게 거의 없습니다.
        {MOST_FLEX.length > 0 && (
          <>
            {' '}
            반대쪽 끝에는 선택 칸이 {MAX_CHOICE}칸까지 늘어나는 세팅이 {MOST_FLEX.length}개 있습니다(
            {joinNames(MOST_FLEX.map((s) => s.name))}). 고정 각인이 적다는 것은 유저마다 세팅이 넓게 흩어져 있다는 뜻이라, 카드의
            후보 중 무엇을 고를지는 본인의 스킬 트리와 보유 각인서를 기준으로 판단해야 합니다.
          </>
        )}
        {PICK_N.length > 0 && (
          <>
            {' '}
            {joinNames(PICK_N.map((s) => s.name))}처럼 한 슬롯에서 여러 개를 골라 쓰는
            &quot;택N&quot; 구성은 후보 풀이 넓어 조합 수가 가장 많습니다.
          </>
        )}
      </p>

      <h2>직업군별 백사멸·헤드사멸·타대 분포</h2>
      <p>
        카드에 붙는 사멸 배지는 위 이용 가이드의 기준(기습의 대가 채용은 백사멸, 결투의 대가 채용은
        헤드사멸, 둘 다 없으면 타대)으로 나뉩니다. 이 분류를 직업군별로 세면 직업군마다 성향이 꽤
        뚜렷하게 갈립니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>직업군</th>
              <th>딜러 세팅</th>
              <th>백사멸</th>
              <th>헤드사멸</th>
              <th>타대</th>
              <th>포지션 각인 비율</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_ROWS.map((r) => (
              <tr key={r.group}>
                <td style={{ fontWeight: 600 }}>{r.group}</td>
                <td>{r.total}</td>
                <td>{r.count.back}</td>
                <td>{r.count.head}</td>
                <td>{r.count.normal}</td>
                <Bar
                  value={r.positional}
                  max={Math.max(1, r.total)}
                  text={`${pct(r.positional, r.total)}%`}
                />
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 600 }}>전체</td>
              <td>{DEALERS.length}</td>
              <td>{STYLE_TOTAL.back}</td>
              <td>{STYLE_TOTAL.head}</td>
              <td>{STYLE_TOTAL.normal}</td>
              <Bar
                value={STYLE_TOTAL.back + STYLE_TOTAL.head}
                max={Math.max(1, DEALERS.length)}
                text={`${pct(STYLE_TOTAL.back + STYLE_TOTAL.head, DEALERS.length)}%`}
              />
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        포지션 각인 비율 = (백사멸 + 헤드사멸) / 딜러 세팅. 서포터는 분류 대상이 아니어서 제외.
      </p>

      <p>
        전체 딜러 중 타대가 {STYLE_TOTAL.normal}개({pct(STYLE_TOTAL.normal, DEALERS.length)}%)로
        가장 많고, 백사멸이 {STYLE_TOTAL.back}개, 헤드사멸이 {STYLE_TOTAL.head}개입니다.
        {BACK_TOP && BACK_TOP.count.back > 0 && (
          <>
            {' '}
            백사멸 비중이 가장 높은 직업군은 {euroRo(BACK_TOP.group)}, 딜러 {BACK_TOP.total}개
            세팅 중 {BACK_TOP.count.back}개가 기습의 대가를 씁니다.
          </>
        )}
        {NORMAL_TOP && (
          <>
            {' '}
            반면 {NORMAL_TOP.group} 쪽은{' '}
            {NORMAL_TOP.count.normal === NORMAL_TOP.total
              ? `${NORMAL_TOP.total}개 세팅이 모두`
              : `${NORMAL_TOP.total}개 중 ${NORMAL_TOP.count.normal}개가`}{' '}
            타대라, 보스 방향을 신경 쓰는 부담이 상대적으로 적은 직업군입니다.
          </>
        )}
      </p>
      {HEAD_SPECS.length > 0 && (
        <p>
          헤드사멸은 {HEAD_SPECS.length}개 세팅({joinNames(HEAD_SPECS.map((s) => s.name))})뿐이고,
          {HEAD_GROUPS.length === 1
            ? ` 전부 ${HEAD_GROUPS[0].group} 직업군입니다.`
            : ` 그중 ${HEAD_GROUPS[0].count.head}개가 ${HEAD_GROUPS[0].group} 직업군입니다.`}{' '}
          결투의 대가 각인서는 쓰는 세팅이 이만큼 좁기 때문에, 다른 딜러와 돌려쓸 가능성이 가장 낮은
          각인이기도 합니다. 부캐 육성 계획을 세울 때 각인서 재활용까지 따진다면 이 점을 감안할
          만합니다.
        </p>
      )}

      <h2>전투 특성 조합과 사멸의 관계</h2>
      <p>
        카드의 직업명 옆에 붙은 특치·치신·특신 배지는 해당 세팅 유저들이 주로 올리는 전투 특성 두 가지입니다.
        이것을 사멸 분류와 교차해 보면 다음과 같습니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>특성 조합</th>
              <th>세팅 수</th>
              <th>백사멸</th>
              <th>헤드사멸</th>
              <th>타대</th>
            </tr>
          </thead>
          <tbody>
            {STAT_ROWS.map((r) => (
              <tr key={r.stat}>
                <td style={{ fontWeight: 600 }}>{r.stat}</td>
                <Bar value={r.total} max={STAT_MAX} text={`${r.total}개 · ${pct(r.total, STAT_DEALERS)}%`} />
                <td>{r.back}</td>
                <td>{r.head}</td>
                <td>{r.normal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        딜러 {STAT_DEALERS}개 세팅 기준. &quot;·&quot;로 이어진 조합은 두 빌드가 비슷한 비율로 공존하는 세팅.
      </p>

      {STAT_ROWS.length >= 2 && (
        <p>
          가장 많은 조합은 {STAT_ROWS[0].stat}({STAT_ROWS[0].total}개), 그다음이{' '}
          {STAT_ROWS[1].stat}({STAT_ROWS[1].total}개)이고, 둘을 합치면 딜러 전체의{' '}
          {pct(STAT_ROWS[0].total + STAT_ROWS[1].total, STAT_DEALERS)}%입니다.
          {STAT_RARE.map((r) => (
            <span key={r.stat}>
              {' '}
              {r.stat} 조합은 {joinNames(specsWithStat(r.stat))} {r.total}개 세팅에서만 보입니다.
            </span>
          ))}{' '}
          특성은 각인과 달리 세팅 안에서도 유저 성향에 따라 바뀔 수 있으니, 배지는 &quot;이 세팅을
          하는 사람들이 가장 많이 고른 조합&quot; 정도로 읽는 것이 정확합니다.
        </p>
      )}

      {SUPPORTS.length > 0 && (
        <>
          <h2>서포터 {SUPPORTS.length}종의 각인 구성</h2>
          <p>
            서포터 세팅({joinNames(SUPPORTS.map((s) => s.name))})은 합계 {SUPPORT_SAMPLE}명의
            캐릭터를 집계했습니다.
            {SUPPORT_FIXED_COMMON.length > 0 && (
              <>
                {' '}
                고정 칸의 {eunNeun(SUPPORT_FIXED_COMMON.join(', '))} {SUPPORTS.length}개 세팅 모두에
                똑같이 들어가고,
              </>
            )}
            {SUPPORT_CHOICE_POOL.length > 0 && (
              <>
                {' '}
                갈리는 칸은 {SUPPORT_CHOICE_POOL.join(', ')} 중에서 고릅니다.
              </>
            )}
            {SUPPORT_IDENTICAL
              ? ' 슬롯 구성까지 완전히 같아서, 서포터끼리는 각인서를 그대로 돌려쓸 수 있습니다.'
              : ' 세부 구성에는 직업별 차이가 조금 있습니다.'}
          </p>
          <p>
            딜러와 비교하면 차이가 분명합니다. 딜러 세팅에서 쓰이는 {DEALER_ENGS.size}종과
            서포터가 쓰는 {SUPPORT_ENGS.size}종 사이에 겹치는 각인은{' '}
            {SHARED_ROLE_ENGS.length === 0
              ? '하나도 없습니다'
              : `${SHARED_ROLE_ENGS.length}종(${SHARED_ROLE_ENGS.join(', ')})뿐입니다`}
            . 딜러를 키우다 서포터를 새로 시작하면 각인서를 처음부터 다시 모아야 한다는 뜻이고,
            반대로 서포터를 여러 명 키울 때는 한 벌로 여러 캐릭터를 맞출 수 있습니다.
          </p>
        </>
      )}

      <div className={styles.noteBox}>
        <p>
          <strong>표본 수 주의:</strong> 집계 캐릭터는 세팅마다 편차가 큽니다. 가장 많은{' '}
          {joinNames(TOP_SAMPLE.map((s) => `${s.name} ${BUILDS[s.id].sample}명`))} 세 세팅이 전체
          표본의 {TOP3_SHARE}%를 차지하는 반면,
          {LOW_SPECS.length > 0
            ? ` 표본이 ${LOW_SAMPLE}명 미만인 세팅이 ${LOW_SPECS.length}개 있습니다(${joinNames(
                LOW_SPECS.map((s) => `${s.name} ${BUILDS[s.id].sample}명`)
              )}).`
            : ` 모든 세팅이 최소 ${LOW_SAMPLE}명 이상의 표본을 갖고 있습니다.`}{' '}
          표본이 적은 세팅은 한두 명의 선택만으로 고정·선택 칸이 뒤바뀔 수 있어서, 자동 집계가
          통념과 다른 경우 수동 보정을 덧씌워 두었습니다.
        </p>
        {PROVISIONAL.length > 0 && (
          <p>
            {eunNeun(joinNames(PROVISIONAL.map((s) => s.name)))} 아직 유저 표본이 없어 잠정 빌드로만
            노출 중이며, 이 글의 모든 수치에서 제외했습니다. 표본이 쌓이면 자동 집계로 교체됩니다.
          </p>
        )}
      </div>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 위 표에서 궁금한 각인이 생겼다면, 페이지 상단의 각인 칩을 눌러
          &quot;포함&quot;으로 두면 그 각인을 쓰는 세팅만 바로 걸러집니다. 두 개 이상을 포함으로
          걸면 가진 각인서 조합으로 키울 수 있는 직업을 찾는 용도로도 쓸 수 있습니다.
        </p>
      </div>
    </div>
  );
}
