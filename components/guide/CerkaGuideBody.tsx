import { RAID_TABLE, MATERIAL_NAMES, type RaidTableEntry, type MaterialReward } from '@/data/rewardTable';
import styles from '@/app/guide/guide.module.css';

/**
 * CerkaGuideBody — /cerka 도구 페이지 본문.
 *
 * 난이도별 골드·귀속 비율·재료 배율을 data/rewardTable.ts 에서 집계한다.
 * 노말만 비계승 재료를 주기 때문에 재료 배율 표는 난이도별로 자기 계열 재료를 찾아 쓴다.
 * "클리어 재료가 같은 레이드"는 관문별 거래 가능 재료 구성이 한 개도 다르지 않은 레이드를
 * 테이블 전체에서 찾아 짝지은 것이다 — 패치로 수치가 바뀌면 짝도 자동으로 다시 맞춰진다.
 */

const ORDER = ['세르카 노말', '세르카 하드', '세르카 나메'] as const;

const sumMats = (list: MaterialReward[], into: Record<string, number>) => {
  for (const mat of list) into[mat.itemName] = (into[mat.itemName] ?? 0) + mat.amount;
};

const aggregate = (entry: RaidTableEntry) => {
  const clear: Record<string, number> = {};
  const more: Record<string, number> = {};
  for (const g of entry.gates) {
    sumMats(g.clear, clear);
    sumMats(g.more, more);
  }
  const gold = entry.gates.reduce((s, g) => s + g.gold, 0);
  const bound = entry.gates.reduce((s, g) => s + g.boundGold, 0);
  return {
    gold,
    bound,
    moreGold: entry.gates.reduce((s, g) => s + g.moreGold, 0),
    clear,
    more,
  };
};

const ROWS = ORDER.map((name) => {
  const entry = RAID_TABLE.find((e) => e.name === name)!;
  const a = aggregate(entry);
  return {
    entry,
    label: name.replace('세르카 ', ''),
    level: entry.level,
    ...a,
    tradable: a.gold - a.bound,
    // 노말은 비계승, 하드·나메는 계승 계열
    stone: a.clear[MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL] != null
      ? MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_NAMES.FATE_DESTRUCTION_STONE,
    breakthrough: a.clear[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] != null
      ? MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE
      : MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE,
    thorn: a.clear[MATERIAL_NAMES.PULSATING_THORN] ?? 0,
    thornFull: (a.clear[MATERIAL_NAMES.PULSATING_THORN] ?? 0) + (a.more[MATERIAL_NAMES.PULSATING_THORN] ?? 0),
    core: a.clear[MATERIAL_NAMES.CERKA_CORE] ?? 0,
  };
});
type Row = (typeof ROWS)[number];

const ratio = (row: Row, mat: string) => {
  const c = row.clear[mat] ?? 0;
  const m = row.more[mat] ?? 0;
  return c ? m / c : 0;
};

const NORMAL = ROWS[0];
const HARD = ROWS[1];
const NM = ROWS[2];

const pct = (v: number) => `${Math.round(v * 100)}%`;
const fmt = (v: number) => Math.round(v).toLocaleString();

/** 받침 유무로 조사 선택 */
const josa = (word: string, withBatchim: string, without: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : false;
  return `${word}${has ? withBatchim : without}`;
};

// 더보기 비용 비율 — 세 난이도가 같은 값인지 확인해서 문장에 쓴다
const MORE_RATIOS = ROWS.map((r) => r.moreGold / r.gold);
const MORE_RATIO_SAME = MORE_RATIOS.every((v) => Math.abs(v - MORE_RATIOS[0]) < 0.0005);
const BT_RATIOS = ROWS.map((r) => ratio(r, r.breakthrough));
const STONE_RATIOS = ROWS.map((r) => ratio(r, r.stone));
const STONE_RISING = STONE_RATIOS.every((v, i) => i === 0 || v > STONE_RATIOS[i - 1]);

// ── 하드 → 나메: 올리면 무엇이 얼마나 느나 ──
const UPGRADE_ITEMS: { label: string; hard: number; nm: number; unit: string }[] = [
  { label: '클리어 골드', hard: HARD.gold, nm: NM.gold, unit: '' },
  { label: '파괴석 결정', hard: HARD.clear[HARD.stone] ?? 0, nm: NM.clear[NM.stone] ?? 0, unit: '개' },
  { label: '위대한 돌파석', hard: HARD.clear[HARD.breakthrough] ?? 0, nm: NM.clear[NM.breakthrough] ?? 0, unit: '개' },
  {
    label: '운명의 파편',
    hard: HARD.clear[MATERIAL_NAMES.FATE_FRAGMENT] ?? 0,
    nm: NM.clear[MATERIAL_NAMES.FATE_FRAGMENT] ?? 0,
    unit: '개',
  },
  { label: '코어', hard: HARD.core, nm: NM.core, unit: '개' },
  { label: '고통의 가시', hard: HARD.thorn, nm: NM.thorn, unit: '개' },
];
const UP_MAX = Math.max(...UPGRADE_ITEMS.map((i) => (i.hard ? i.nm / i.hard - 1 : 0)));
const GOLD_UP = NM.gold / HARD.gold - 1;
const STONE_UP = (NM.clear[NM.stone] ?? 0) / (HARD.clear[HARD.stone] ?? 1) - 1;
const CORE_UP = HARD.core ? NM.core / HARD.core - 1 : 0;

// ── 클리어 재료가 완전히 같은 다른 레이드 ──
const tradeSig = (ms: MaterialReward[]) =>
  ms
    .filter((m) => m.itemId !== 0)
    .map((m) => `${m.itemName}:${m.amount}`)
    .sort()
    .join('|');
const raidSig = (e: RaidTableEntry, side: 'clear' | 'more') => e.gates.map((g) => tradeSig(g[side])).join('#');

/** 거래 불가 고유 재화 (코어 제외) */
const specialOf = (a: ReturnType<typeof aggregate>) =>
  Object.entries(a.clear)
    .filter(
      ([k]) =>
        k === MATERIAL_NAMES.PULSATING_THORN ||
        k === MATERIAL_NAMES.GRACE_FRAGMENT ||
        k === MATERIAL_NAMES.WRAITH_ECHO ||
        k === MATERIAL_NAMES.HAND_OF_DEATH,
    )
    .map(([k, v]) => `${k} ${v}개`)
    .join(', ') || '없음';

const TWINS = ROWS.flatMap((row) =>
  RAID_TABLE.filter((o) => o.group !== row.entry.group && raidSig(o, 'clear') === raidSig(row.entry, 'clear')).map(
    (o) => {
      const a = aggregate(o);
      const sameMore = raidSig(o, 'more') === raidSig(row.entry, 'more');
      // 더보기 재료가 다르면 세르카 쪽이 모든 재료에서 더 많이 주는지(같은 비용 또는 1,000골드당)
      const tradKeys = Object.keys(row.more).filter((k) =>
        row.entry.gates.some((g) => g.more.some((m) => m.itemName === k && m.itemId !== 0)),
      );
      const cerkaMorePerGold = tradKeys.every(
        (k) => (row.more[k] ?? 0) / row.moreGold >= (a.more[k] ?? 0) / a.moreGold,
      );
      const cerkaMoreAbs = tradKeys.every((k) => (row.more[k] ?? 0) >= (a.more[k] ?? 0));
      return {
        cerka: row,
        other: o,
        a,
        sameMore,
        cerkaMorePerGold,
        cerkaMoreAbs,
        goldDiff: row.gold - a.gold,
        freeDiff: row.tradable - (a.gold - a.bound),
        moreDiff: row.moreGold - a.moreGold,
        coreSame: (a.clear[MATERIAL_NAMES.CERKA_CORE] ?? 0) === row.core,
      };
    },
  ),
);

const ALL_HAVE_TWIN = ROWS.every((r) => TWINS.some((t) => t.cerka === r));
const TWIN_CORES_SAME = TWINS.every((t) => t.coreSame);
const GAINS_IN_GOLD_CORE = UPGRADE_ITEMS.slice(1, 4).every((i) => i.nm / i.hard - 1 < Math.min(GOLD_UP, CORE_UP));

// 세르카가 골드가 적은 짝 — 가시로 메워야 하는 차액과 손익분기 단가
const THORN_BREAKEVEN = TWINS.filter((t) => t.goldDiff < 0 && t.cerka.thorn > 0).map((t) => ({
  ...t,
  perThorn: -t.goldDiff / t.cerka.thorn,
}));
// 더보기 재료까지 같은 짝 — 풀더보기 후 남는 골드 차이
const SAME_MORE_TWINS = TWINS.filter((t) => t.sameMore);

// ── 레벨 구간별 골드 상위 3레이드에 세르카가 들어가는지 ──
const LEVELS = [...new Set(RAID_TABLE.map((r) => r.level))].sort((a, b) => a - b);
const totalOf = (e: RaidTableEntry) => e.gates.reduce((s, g) => s + g.gold, 0);
const top3At = (level: number) => {
  const best = new Map<string, RaidTableEntry>();
  for (const r of RAID_TABLE) {
    if (r.level > level) continue;
    const cur = best.get(r.group);
    if (!cur || totalOf(r) > totalOf(cur)) best.set(r.group, r);
  }
  return [...best.values()].sort((a, b) => totalOf(b) - totalOf(a)).slice(0, 3);
};
const CERKA_IN_TOP = LEVELS.filter((l) => l >= NORMAL.level).map((l) => ({
  level: l,
  pick: top3At(l).find((r) => r.group === NORMAL.entry.group),
}));
const CERKA_ALWAYS_TOP = CERKA_IN_TOP.every((c) => c.pick);
const MAX_LEVEL = LEVELS[LEVELS.length - 1];

export default function CerkaGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>난이도가 바뀌면 재료 계열 자체가 바뀐다</h2>
      <p>
        세르카에서 난이도 선택은 단순히 보상의 많고 적음이 아닙니다. 노말은 운명의 파괴석·수호석·
        돌파석 같은 비계승 재료를 주고, 하드와 나이트메어는 운명의 파괴석 결정·수호석 결정·위대한
        운명의 돌파석이라는 상위 계열을 줍니다. 쓰임이 다른 재료라 시세도 따로 놀고, 지금 올리는
        장비가 어느 구간이냐에 따라 같은 보상이라도 체감 가치가 완전히 달라집니다.
      </p>
      <p>
        고통의 가시도 마찬가지입니다. 노말은 주 {NORMAL.thorn}개인데 하드부터 주{' '}
        {HARD.thorn}개로 뜁니다. 하드와 나이트메어의 가시 수급량은 {HARD.thorn}개로 같아서,
        가시만 놓고 보면 나이트메어를 도는 추가 이득은 없습니다. 가시는 더보기를 하면 클리어와 같은 수량이
        한 번 더 들어오므로, 하드 이상 풀더보기 기준으로는 주 {HARD.thornFull}개입니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>난이도</th>
            <th>입장 레벨</th>
            <th>주간 클리어 골드</th>
            <th>그중 귀속</th>
            <th>더보기 총비용</th>
            <th>고통의 가시</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td style={{ fontWeight: 600 }}>{r.label}</td>
              <td>{r.level}</td>
              <td>{r.gold.toLocaleString()}</td>
              <td>
                {r.bound === 0 ? (
                  '없음'
                ) : (
                  <>
                    {r.bound.toLocaleString()}
                    <span style={{ opacity: 0.7 }}> ({pct(r.bound / r.gold)})</span>
                  </>
                )}
              </td>
              <td>{r.moreGold.toLocaleString()}</td>
              <td>{r.thorn}개</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>노말만 골드의 절반이 귀속이다</h2>
      <p>
        표에서 놓치기 쉬운 칸이 귀속 골드입니다. 세르카 노말은 클리어 골드{' '}
        {NORMAL.gold.toLocaleString()}골드 중 {NORMAL.bound.toLocaleString()}골드
        {NORMAL.bound * 2 === NORMAL.gold ? ', 정확히 절반이' : '가'} 귀속으로 들어옵니다. 하드와
        나이트메어는 전액이 거래 가능한 유통 골드입니다.
      </p>
      <p>
        그래서 거래소에서 쓸 골드를 모으는 중이라면 노말의 실질 수익은 표기된 숫자보다 적은{' '}
        {NORMAL.tradable.toLocaleString()}골드로 봐야 합니다. 반대로 재련 비용에 쓸 골드가
        급한 상황이면 귀속 골드도 그대로 쓸 수 있으니 액면가로 세도 됩니다. 더보기 비용 역시 귀속
        골드에서 먼저 빠져나가기 때문에, 노말은 더보기 총비용 {fmt(NORMAL.moreGold)}골드가 자기 귀속 골드{' '}
        {fmt(NORMAL.bound)}골드 안에서 {NORMAL.moreGold <= NORMAL.bound ? '전부' : '일부'} 해결됩니다.
      </p>

      <h2>하드에서 나이트메어로 올리면 무엇이 늘어나나</h2>
      <p>
        하드와 나이트메어는 입장 레벨이 {NM.level - HARD.level}밖에 차이 나지 않고 재료 계열도 같습니다.
        그래서 &quot;나이트메어로 올릴 가치가 있나&quot;는 항목별 증가 폭으로 따져 보면 명확해집니다.
        아래는 주간 클리어 보상 기준입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>항목</th>
              <th>하드</th>
              <th>나이트메어</th>
              <th>증가율</th>
            </tr>
          </thead>
          <tbody>
            {UPGRADE_ITEMS.map((it) => {
              const up = it.hard ? it.nm / it.hard - 1 : 0;
              return (
                <tr key={it.label}>
                  <td style={{ fontWeight: 600 }}>{it.label}</td>
                  <td>
                    {fmt(it.hard)}
                    {it.unit}
                  </td>
                  <td>
                    {fmt(it.nm)}
                    {it.unit}
                  </td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${UP_MAX > 0 ? Math.max(2, (up / UP_MAX) * 90) : 2}px` }}
                      />
                      <span className={styles.barText}>{up === 0 ? '변화 없음' : `+${pct(up)}`}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>주간(1·2관문 합산) 클리어 보상, 더보기 미포함</p>

      <p>
        차이가 뚜렷하게 갈립니다. 클리어 골드는 {pct(GOLD_UP)}, 코어는 {pct(CORE_UP)} 늘어나는 반면 파괴석
        결정은 {pct(STONE_UP)} 느는 데 그치고 가시는 그대로입니다.
        {GAINS_IN_GOLD_CORE && ' 나이트메어로 올리는 이득은 재련 재료보다 골드와 코어에 몰려 있다는 뜻입니다.'} 코어가 필요 없고 재련 재료만 보고 도는 캐릭터라면 나이트메어의
        추가 보상은 사실상 주 {fmt(NM.gold - HARD.gold)}골드로 보면 됩니다. 반대로 더보기 비용도{' '}
        {fmt(NM.moreGold - HARD.moreGold)}골드 늘어나니, 더보기까지 사는 캐릭터는 그만큼을 빼고 비교해야
        합니다.
      </p>

      <h2>세르카와 클리어 재료가 똑같은 레이드</h2>
      <p>
        세르카는 {ALL_HAVE_TWIN ? '세 난이도 모두' : '일부 난이도가'} 다른 레이드와 관문별 클리어 재료 구성이 한
        개도 다르지 않은 짝이 있습니다.
        재련 재료가 같으니{TWIN_CORES_SAME ? '(코어 수량까지 같습니다)' : ''} 둘의 차이는 골드와 고유 재화뿐입니다. 캐릭터당 골드 레이드가 세 개로 묶여 있어
        어느 쪽에 골드 자리를 줄지 고민될 때 이 비교가 기준이 됩니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>세르카</th>
              <th>재료가 같은 레이드</th>
              <th>주간 골드 차이</th>
              <th>상대의 고유 재화</th>
              <th>더보기</th>
            </tr>
          </thead>
          <tbody>
            {TWINS.map((t) => (
              <tr key={`${t.cerka.label}-${t.other.name}`}>
                <td style={{ fontWeight: 600 }}>{t.cerka.label}</td>
                <td>
                  {t.other.name} ({t.other.level})
                </td>
                <td>
                  {t.goldDiff === 0 ? '같음' : `세르카 ${t.goldDiff > 0 ? '+' : '−'}${fmt(Math.abs(t.goldDiff))}`}
                  {t.freeDiff !== t.goldDiff && (
                    <span style={{ opacity: 0.7 }}> (유통 {t.freeDiff > 0 ? '+' : '−'}{fmt(Math.abs(t.freeDiff))})</span>
                  )}
                </td>
                <td>{specialOf(t.a)}</td>
                <td>
                  {t.sameMore
                    ? `재료 같음, 세르카 ${t.moreDiff > 0 ? '+' : '−'}${fmt(Math.abs(t.moreDiff))}G`
                    : t.moreDiff === 0 && t.cerkaMoreAbs
                      ? '같은 비용에 세르카가 모두 많음'
                      : t.cerkaMorePerGold
                        ? '1,000골드당 세르카가 모두 많음'
                        : '재료마다 엇갈림'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        세르카 고유 재화: 노말 가시 {NORMAL.thorn}개, 하드·나메 가시 {HARD.thorn}개 (주간 클리어 기준)
      </p>

      {THORN_BREAKEVEN.map((t) => (
        <p key={t.other.name}>
          세르카 {josa(t.cerka.label, '과', '와')} {josa(t.other.name, '은', '는')} 재련 재료가 같은데 골드는{' '}
          {josa(t.other.name, '이', '가')}{' '}
          {fmt(-t.goldDiff)}골드 많습니다. 세르카 쪽에는 대신 고통의 가시 {t.cerka.thorn}개가 붙으니, 클리어
          보상만 놓고 보면 <strong>가시 1개를 {fmt(t.perThorn)}골드 넘게 칠 때</strong> 세르카가 앞섭니다. 이
          페이지 위쪽 상점 계산기가 보여 주는 가시 1개 가치와 이 숫자를 비교하면 됩니다.
          {t.cerkaMorePerGold &&
            ` 다만 더보기는 세르카 ${t.cerka.label} 쪽이 1,000골드당 모든 재료를 더 많이 주므로, 더보기까지 사는 캐릭터라면 세르카 쪽으로 저울이 더 기웁니다.`}
        </p>
      ))}

      {SAME_MORE_TWINS.length > 0 && (
        <div className={styles.noteBox}>
          <p>
            세르카 {josa(NM.label, '은', '는')} {josa(SAME_MORE_TWINS.map((t) => t.other.name).join('·'), '과', '와')} 클리어 재료는 물론 더보기
            재료까지 똑같습니다. 재련 재료 쪽 차이는 없고 골드와 고유 재화만 다른데, 세르카 쪽이 클리어 골드는{' '}
            {fmt(SAME_MORE_TWINS[0].goldDiff)}골드 많고 더보기 비용은 {fmt(SAME_MORE_TWINS[0].moreDiff)}골드
            비쌉니다. 두 관문을 모두 더보기해도 세르카 {josa(NM.label, '이', '가')}{' '}
            {fmt(SAME_MORE_TWINS[0].goldDiff - SAME_MORE_TWINS[0].moreDiff)}골드 더 남습니다.
          </p>
          <p>
            같은 캐릭터가 둘 다 돈다면, 더보기를 한쪽만 사는 경우 재료가 같은 상대 레이드 쪽 더보기를 사는
            편이 싸게 먹힙니다. 고유 재화(가시, 잔영, 은총의 파편)는 더보기 여부와 관계없이 클리어만으로
            들어오는 몫이 있으니, 그 재화가 급한 쪽을 기준으로 정하면 됩니다.
          </p>
        </div>
      )}

      {CERKA_ALWAYS_TOP && (
        <p>
          골드 자리 싸움에서 세르카는 꾸준히 살아남습니다. 입장 가능한 레이드 중 클리어 골드 상위 세 개를
          고르면, 세르카는 {NORMAL.level}부터 최고 구간 {MAX_LEVEL}까지 모든 레벨 구간에서 그 안에 들어갑니다.
          벨가르딘이 추가된 뒤에도 세르카 {NM.label}의 주 {fmt(NM.gold)}골드는 여전히 상위권이라, {NM.level} 이상
          캐릭터에게 세르카는 빼기 어려운 레이드입니다.
        </p>
      )}

      <h2>더보기는 상위 난이도일수록 이득 폭이 커진다</h2>
      <p>
        {MORE_RATIO_SAME
          ? `더보기 비용은 세 난이도 모두 클리어 골드의 ${pct(MORE_RATIOS[0])}로 같은 비율입니다.`
          : `더보기 비용은 클리어 골드의 ${MORE_RATIOS.map(pct).join('·')}입니다.`}{' '}
        그런데 그 돈을 내고 받는 재료의 배수는 난이도마다 다릅니다. 아래는 주간 기준으로 더보기가 클리어
        수령량의 몇 배를 추가로 주는지 계산한 값입니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>난이도</th>
            <th>파괴석 계열</th>
            <th>돌파석 계열</th>
            <th>운명의 파편</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td style={{ fontWeight: 600 }}>{r.label}</td>
              <td>{ratio(r, r.stone).toFixed(2)}배</td>
              <td>{ratio(r, r.breakthrough).toFixed(2)}배</td>
              <td>{ratio(r, MATERIAL_NAMES.FATE_FRAGMENT).toFixed(2)}배</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        석 계열을 보면 노말 {STONE_RATIOS[0].toFixed(2)}배, 하드 {STONE_RATIOS[1].toFixed(2)}배, 나이트메어{' '}
        {STONE_RATIOS[2].toFixed(2)}배입니다.
        {STONE_RISING && MORE_RATIO_SAME && (
          <>
            {' '}난이도를 올릴수록 더보기의 배수가 커지는데 비용 비율은 고정이므로, 더보기의 상대적 이득은 상위
            난이도에서 더 큽니다. &quot;노말은 더보기를 건너뛰고 나이트메어만 더보기를 챙긴다&quot;는 운영이
            수치상으로도 설명되는 셈입니다.
          </>
        )}
      </p>
      <p>
        돌파석 계열은 난이도와 무관하게 {Math.min(...BT_RATIOS).toFixed(1)}~{Math.max(...BT_RATIOS).toFixed(1)}배로
        압도적입니다. 세르카 더보기의 값어치는 사실상 돌파석에서 나온다고 봐도 무방하고, 돌파석 시세가 오르는
        시기에는 다른 재료 시세가 내려도 더보기가 이득으로 뒤집히는 일이 자주 생깁니다.
      </p>

      <h2>고통의 가시 단가는 어디서 오나</h2>
      <p>
        고통의 가시는 거래소 매물이 없는 재화입니다. 그런데 이 페이지와 더보기 효율 페이지는
        가시가 포함된 보상의 총 가치를 골드로 표시합니다. 그 숫자는 상점 교환 구성에서 역산한
        값입니다.
      </p>
      <p>
        기준이 되는 항목은 고통의 재련 재료 상자입니다. 운명의 파편·위대한 운명의 돌파석·운명의
        파괴석 결정·운명의 수호석 결정 네 가지가 각각 25% 확률로 나오므로, 네 경우의 실시간 시세
        환산값에 0.25씩을 곱해 더하면 상자 하나의 기댓값이 나옵니다. 이 상자는 가시 5개로
        교환하니, 기댓값을 5로 나눈 것이 가시 1개의 값입니다.
      </p>
      <p>
        이렇게 구한 단가를 야금술·재봉술 업화, 보조 재료 주머니, 젬 랜덤 상자 같은 다른 교환
        항목에도 그대로 적용합니다. 그러면 &quot;가시 20개 + 골드 3,000으로 야금술 업화를 사는 것&quot;과
        &quot;가시 5개로 재련 재료 상자를 여는 것&quot;을 같은 단위로 비교할 수 있습니다. 벨가르딘의
        사령의 잔영·죽음의 손도 동일한 규칙으로 산출하므로, 서로 다른 레이드의 거래 불가 재화끼리도
        같은 잣대가 적용됩니다. 위의 &quot;가시 1개를 몇 골드 넘게 칠 때&quot; 비교도 이 단가와 나란히 놓고
        보면 됩니다.
      </p>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 가시 단가는 구성 재료 시세를 따라 움직입니다. 돌파석이나 파편이
          비싼 주에는 가시 1개의 환산 가치도 함께 올라가므로, 상점 교환을 미뤄 두고 가시를 모아
          두었다면 그 재고의 가치도 같이 오른 상태입니다. 교환 시점을 고를 수 있는 항목이라면
          시세를 한 번 확인하고 결정하는 편이 낫습니다.
        </p>
      </div>
    </div>
  );
}
