import {
  BRACELET_EFFECTS,
  calculateComboProbability,
  formatProbPercent,
  type BraceletEffectDef,
  type EffectRarity,
} from '@/lib/braceletData';
import styles from '@/app/guide/guide.module.css';

/**
 * BraceletGuideBody — /bracelet 도구 페이지 본문.
 *
 * 수치를 문장에 박지 않고 lib/braceletData.ts 의 확률 테이블에서 직접 계산한다.
 * 테이블이 패치로 바뀌면 본문 숫자도 같이 따라가야 하기 때문이다.
 * 계산은 모듈 로드 시 한 번만 돌고(33그룹 3중 루프), 렌더마다 반복되지 않는다.
 */

const RARITY_LABEL: Record<EffectRarity, string> = {
  common: '일반',
  rare: '희귀',
  special: '특수',
};

type GroupInfo = { group: string; rarity: EffectRarity; prob: number };

const GROUPS: GroupInfo[] = (() => {
  const map = new Map<string, GroupInfo>();
  for (const e of BRACELET_EFFECTS) {
    const cur = map.get(e.group);
    if (cur) cur.prob += e.probability;
    else map.set(e.group, { group: e.group, rarity: e.rarity, prob: e.probability });
  }
  return [...map.values()];
})();

const RARITY_ROWS = (['common', 'special', 'rare'] as const).map((rarity) => {
  const rows = GROUPS.filter((g) => g.rarity === rarity);
  const total = rows.reduce((s, g) => s + g.prob, 0);
  return {
    rarity,
    groupCount: rows.length,
    perGroup: total / rows.length,
    total,
  };
});

/** 3개 효과를 뽑을 때 특정 등급이 몇 개 섞이는지의 정확 분포 (그룹 제외 재정규화 반영) */
function rarityCountDistribution(target: EffectRarity): number[] {
  const dist = [0, 0, 0, 0];
  const walk = (used: GroupInfo[], depth: number, prob: number, hit: number) => {
    if (depth === 3) {
      dist[hit] += prob;
      return;
    }
    const pool = 100 - used.reduce((s, g) => s + g.prob, 0);
    for (const g of GROUPS) {
      if (used.includes(g)) continue;
      walk([...used, g], depth + 1, prob * (g.prob / pool), hit + (g.rarity === target ? 1 : 0));
    }
  };
  walk([], 0, 1, 0);
  return dist;
}

const SPECIAL_DIST = rarityCountDistribution('special');
const RARE_DIST = rarityCountDistribution('rare');

const byId = (id: string) => BRACELET_EFFECTS.find((e) => e.id === id)!;

const TARGET_COMBOS: { label: string; note: string; ids: string[] }[] = [
  {
    label: '딜러 상위 티어 정조준',
    note: '치명타 피해 10.0% + 추가 피해 4.0% + 적에게 주는 피해 3.0%',
    ids: ['crit_dmg_10.0', 'add_dmg_4.0', 'deal_dmg_3.0'],
  },
  {
    label: '딜러 하위 티어 타협',
    note: '같은 세 그룹을 낮음 단계로만 맞췄을 때',
    ids: ['crit_dmg_6.8', 'add_dmg_3.0', 'deal_dmg_2.0'],
  },
  {
    label: '서포터 상위 티어 정조준',
    note: '아군 공격력 강화 6.0% + 아군 피해량 강화 9.0% + 파티원 보호 및 회복 3.5%',
    ids: ['ally_atk_6.0', 'ally_dmg_9.0', 'party_heal_3.5'],
  },
  {
    label: '희귀 콤보 2종 + 특수 1종',
    note: '치명타 적중률 콤보 + 치명타 피해 콤보 + 적에게 주는 피해 3.0%',
    ids: ['crit_rate_combo_5.0', 'crit_dmg_combo_10.0', 'deal_dmg_3.0'],
  },
];

const COMBO_ROWS = TARGET_COMBOS.map((c) => {
  const effs: BraceletEffectDef[] = c.ids.map(byId);
  const prob = calculateComboProbability(effs);
  return { ...c, prob, tries: Math.round(100 / prob) };
});

// 등급별 낮음·중간·높음 확률 (그룹 하나 기준) — 6 : 3 : 1 비율을 표에서 직접 확인한다
const TIER_ORDER = ['low', 'mid', 'high'] as const;
const TIER_PROBS = (['common', 'special', 'rare'] as const).map((rarity) => {
  const g = GROUPS.find((x) => x.rarity === rarity)!;
  const probs = TIER_ORDER.map(
    (tier) => BRACELET_EFFECTS.find((e) => e.group === g.group && e.tier === tier)?.probability ?? 0
  );
  return { rarity, probs, ratio: probs.map((p) => p / probs[2]) };
});
const HIGH_SHARE = TIER_PROBS[0].probs[2] / TIER_PROBS[0].probs.reduce((a, b) => a + b, 0);
const LOW_SHARE = TIER_PROBS[0].probs[0] / TIER_PROBS[0].probs.reduce((a, b) => a + b, 0);

const MAX_RARITY_TOTAL = Math.max(...RARITY_ROWS.map((r) => r.total));
const SPECIAL_2PLUS = SPECIAL_DIST[2] + SPECIAL_DIST[3];

// 시뮬레이터 재변환 횟수 — app/bracelet/page.tsx 의 MAX_CHANCES(3) + MAX_TICKETS(3)
const SIM_REROLLS = 3 + 3;

const groupTotal = (group: string) => GROUPS.find((g) => g.group === group)!.prob;

/** 두 효과를 잠그고 남은 한 자리를 굴릴 때 — 잠근 그룹은 풀에서 빠지고 나머지로 재정규화 */
const LOCK_ROWS = TARGET_COMBOS.filter((c) =>
  c.ids.every((id) => byId(id).rarity !== 'rare' && byId(id).tier === 'high')
).map((c) => {
  const effs = c.ids.map(byId);
  const last = effs[effs.length - 1];
  const pool = 100 - effs.slice(0, -1).reduce((sum, e) => sum + groupTotal(e.group), 0);
  const exact = last.probability / pool;
  const group = groupTotal(last.group) / pool;
  const fresh = COMBO_ROWS.find((r) => r.label === c.label)!.prob / 100;
  return {
    label: c.label,
    lastName: last.label,
    exact,
    group,
    within: 1 - Math.pow(1 - exact, SIM_REROLLS),
    groupWithin: 1 - Math.pow(1 - group, SIM_REROLLS),
    gain: exact / fresh,
  };
});
const MAX_WITHIN = Math.max(...LOCK_ROWS.map((r) => r.groupWithin));

const pctFixed = (v: number, d: number) => `${v.toFixed(d)}%`;

export default function BraceletGuideBody() {
  const dealTop = COMBO_ROWS[0];
  return (
    <div className={styles.articleBody}>
      <h2>팔찌 부여효과, 숫자로 먼저 보기</h2>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>부여효과 / 그룹</span>
          <span className={styles.statValue}>
            {BRACELET_EFFECTS.length}종 / {GROUPS.length}그룹
          </span>
          <span className={styles.statNote}>한 팔찌에 같은 그룹은 하나만</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>일반 등급이 가져가는 확률</span>
          <span className={styles.statValue}>{pctFixed(RARITY_ROWS[0].total, 0)}</span>
          <span className={styles.statNote}>그룹 {RARITY_ROWS[0].groupCount}개로</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>새 팔찌에 특수 2개 이상</span>
          <span className={styles.statValue}>{pctFixed(SPECIAL_2PLUS * 100, 1)}</span>
          <span className={styles.statNote}>약 {Math.round(1 / SPECIAL_2PLUS)}개에 하나</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>딜러 상위 3종 한 번에</span>
          <span className={styles.statValue}>{dealTop.tries.toLocaleString()}회</span>
          <span className={styles.statNote}>기대 시도, 1회 {formatProbPercent(dealTop.prob)}</span>
        </div>
      </div>

      <h2>부여효과 {BRACELET_EFFECTS.length}종은 어떻게 나뉘어 있나</h2>
      <p>
        찬란한 구원자의 팔찌에 붙는 부여효과 {BRACELET_EFFECTS.length}개는 {GROUPS.length}개 그룹으로 묶여 있습니다. 한
        그룹은 같은 효과의 낮음·중간·높음 세 단계를 담고 있어 팔찌 하나에 같은 그룹이 두 번 붙지 않습니다. 그래서 팔찌를
        굴린다는 것은 &quot;{GROUPS.length}개 그룹 중 서로 다른 3개를 뽑고, 각 그룹 안에서 다시 단계를 뽑는&quot;
        과정입니다. 먼저 봐야 할 것은 그룹 개수가 아니라 등급별로 배정된 확률의 총량입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>등급</th>
              <th>그룹 수</th>
              <th>그룹 1개당 확률</th>
              <th>등급 전체 비중</th>
            </tr>
          </thead>
          <tbody>
            {RARITY_ROWS.map((r) => (
              <tr key={r.rarity}>
                <td style={{ fontWeight: 600 }}>{RARITY_LABEL[r.rarity]}</td>
                <td>{r.groupCount}개</td>
                <td>{r.perGroup.toFixed(3)}%</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(r.total / MAX_RARITY_TOTAL) * 100}px` }} />
                    <span className={styles.barText}>{r.total.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        일반 등급은 그룹이 {RARITY_ROWS[0].groupCount}개뿐인데 전체 확률의 {RARITY_ROWS[0].total.toFixed(0)}%를
        가져갑니다. 희귀 등급은 그룹이 {RARITY_ROWS[2].groupCount}개로 가장 많은데도 비중은{' '}
        {RARITY_ROWS[2].total.toFixed(0)}%에 그칩니다. 치명타 적중률 콤보나 무기 공격력 중첩처럼 설명이 길고 좋아 보이는
        효과가 유독 안 나오는 이유가 여기 있습니다. 종류는 많지만 그룹당 {RARITY_ROWS[2].perGroup.toFixed(3)}%로 잘게
        쪼개져 있습니다.
      </p>

      <h2>낮음·중간·높음은 어느 등급이든 같은 비율</h2>
      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>등급</th>
            <th>낮음</th>
            <th>중간</th>
            <th>높음</th>
            <th>비율</th>
          </tr>
        </thead>
        <tbody>
          {TIER_PROBS.map((t) => (
            <tr key={t.rarity}>
              <td style={{ fontWeight: 600 }}>{RARITY_LABEL[t.rarity]}</td>
              {t.probs.map((p, i) => (
                <td key={i}>{parseFloat(p.toFixed(5))}%</td>
              ))}
              <td>{t.ratio.map((r) => Math.round(r)).join(' : ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        원하는 그룹이 떴을 때 그것이 높음 단계일 확률은 {pctFixed(HIGH_SHARE * 100, 0)}, 낮음 단계일 확률은{' '}
        {pctFixed(LOW_SHARE * 100, 0)}입니다. 그룹을 맞추는 것과 그 그룹의 최상단 수치를 맞추는 것은 난이도가 완전히 다른
        문제이고, 후자는 그룹을 맞춘 뒤에도 열 번에 한 번꼴입니다.
      </p>

      <h2>팔찌를 처음 생성하면 무엇이 나오나</h2>
      <p>
        확률 테이블을 그대로 돌려, 새 팔찌 하나에 특수·희귀 등급이 몇 개 섞이는지 분포를 계산했습니다. 그룹이 하나
        정해질 때마다 그 그룹 몫을 풀에서 빼고 나머지를 다시 100%로 환산하는, 인게임과 같은 방식입니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>3개 중 해당 등급 개수</th>
            <th>특수 등급</th>
            <th>희귀 등급</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((n) => (
            <tr key={n}>
              <td style={{ fontWeight: 600 }}>{n}개</td>
              <td className={styles.barCell}>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${SPECIAL_DIST[n] * 100}px` }} />
                  <span className={styles.barText}>{(SPECIAL_DIST[n] * 100).toFixed(3)}%</span>
                </div>
              </td>
              <td className={styles.barCell}>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${RARE_DIST[n] * 100}px` }} />
                  <span className={styles.barText}>{(RARE_DIST[n] * 100).toFixed(3)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        새 팔찌의 {(SPECIAL_DIST[0] * 100).toFixed(1)}%는 특수 등급이 하나도 붙지 않습니다. 세 자리가 전부 특수 등급인
        경우는 {(SPECIAL_DIST[3] * 100).toFixed(3)}%, 약 {Math.round(1 / SPECIAL_DIST[3]).toLocaleString()}개에 하나이고,
        희귀 등급 세 개는 {(RARE_DIST[3] * 100).toFixed(3)}%로 약 {Math.round(1 / RARE_DIST[3]).toLocaleString()}개에 하나까지
        내려갑니다. 여기까지는 아직 등급만 따진 것이고, 어떤 옵션인지와 몇 단계인지는 따지지도 않은 상태입니다.
      </p>

      <h2>조합 확률은 왜 단순 곱셈이 아닌가</h2>
      <p>
        첫 번째 효과가 정해지는 순간 그 그룹 전체가 풀에서 빠지고, 남은 확률이 다시 100%로 환산된 상태에서 두 번째가
        뽑힙니다. 그래서 같은 세 효과라도 뽑히는 순서마다 경로 확률이 다르고, 로아로골은 가능한 여섯 가지 순서를 모두
        계산해 더합니다. 아래는 실전에서 많이 찾는 목표 조합을 이 방식으로 계산한, 재변환 없이 한 번에 그 조합이 뜰
        확률과 기대 시도 횟수입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>목표 조합</th>
              <th>구성</th>
              <th>1회 확률</th>
              <th>기대 시도</th>
            </tr>
          </thead>
          <tbody>
            {COMBO_ROWS.map((r) => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td style={{ fontSize: '0.9em' }}>{r.note}</td>
                <td>{formatProbPercent(r.prob)}</td>
                <td>{r.tries.toLocaleString()}회</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        상위 티어 세 개를 정조준하면 기대 시도가 {COMBO_ROWS[0].tries.toLocaleString()}회입니다. 같은 세 그룹을 낮음
        단계로만 받아들이면 {COMBO_ROWS[1].tries.toLocaleString()}회로 내려갑니다. 단계 욕심만 내려놓았는데 기대 횟수가{' '}
        {Math.round(COMBO_ROWS[0].tries / COMBO_ROWS[1].tries)}배 가까이 줄어듭니다.
      </p>

      <h2>두 개를 잠근 뒤 남은 한 자리</h2>
      <p>
        처음부터 세 개를 한 번에 맞추는 것과, 두 개를 잠그고 마지막 한 자리만 굴리는 것은 전혀 다른 게임입니다. 잠근 두
        그룹이 풀에서 빠지고 남은 확률로 재정규화되므로, 마지막 자리 하나의 확률은 처음 조합 확률보다 훨씬 큽니다.
        시뮬레이터의 재변환은 기회 3번과 재변환권 3회를 합쳐 {SIM_REROLLS}번이고, 새 결과가 나빠도 기존 효과를 고를 수
        있으니 {SIM_REROLLS}번 중 한 번만 맞으면 됩니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>목표 조합</th>
              <th>마지막 자리</th>
              <th>1회 (정확한 단계)</th>
              <th>{SIM_REROLLS}회 안에 (정확한 단계)</th>
              <th>{SIM_REROLLS}회 안에 (그룹만)</th>
            </tr>
          </thead>
          <tbody>
            {LOCK_ROWS.map((r) => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td style={{ fontSize: '0.9em' }}>{r.lastName}</td>
                <td>{formatProbPercent(r.exact * 100)}</td>
                <td>{formatProbPercent(r.within * 100)}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(r.groupWithin / MAX_WITHIN) * 100}px` }} />
                    <span className={styles.barText}>{formatProbPercent(r.groupWithin * 100)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>나머지 두 효과는 이미 잠근 상태, 잠근 그룹 제외 재정규화 기준</p>

      {LOCK_ROWS[0] && (
        <p>
          {LOCK_ROWS[0].label} 기준으로 두 개를 잠그고 나면 마지막 자리의 1회 확률이 처음 조합 확률의 약{' '}
          {Math.round(LOCK_ROWS[0].gain).toLocaleString()}배가 됩니다. 그래도 정확한 높음 단계를 {SIM_REROLLS}번 안에 맞출
          확률은 {formatProbPercent(LOCK_ROWS[0].within * 100)}에 그치고, 그룹만 맞추는 데 만족하면{' '}
          {formatProbPercent(LOCK_ROWS[0].groupWithin * 100)}까지 올라갑니다. 마지막 자리는 단계보다 그룹을 목표로 잡는
          편이 현실적이고, 그룹이 맞은 뒤 단계를 올리는 것은 남은 횟수가 있을 때의 보너스로 보는 편이 좋습니다.
        </p>
      )}

      <div className={styles.noteBox}>
        <p>
          잠금으로 풀에서 빠지는 확률은 잠근 그룹의 몫뿐입니다. 일반 등급 그룹 하나를 잠그면{' '}
          {RARITY_ROWS[0].perGroup.toFixed(1)}%가, 희귀 등급 그룹 하나를 잠그면 {RARITY_ROWS[2].perGroup.toFixed(3)}%가
          빠집니다. 원하는 특수 효과 두 개를 잠갔을 때 마지막 자리 확률이 오르는 것도 이 두 그룹 몫(
          {(RARITY_ROWS[1].perGroup * 2).toFixed(1)}%)만큼 풀이 줄어든 결과라, 잠금 자체가 확률을 크게 끌어올리지는
          않습니다. 잠금의 가치는 이미 얻은 자리를 지키는 데 있습니다.
        </p>
      </div>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 위 시뮬레이터에서 효과 카드를 잠그고 재변환을 돌리면, 매 시점의 조합 확률이 이 글과 같은
          방식으로 다시 계산되어 카드 하단에 표시됩니다. 목표 조합을 정해 두고 몇 번 만에 나오는지 직접 굴려 보면, 표의
          숫자가 어떤 감각인지 바로 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
