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

export default function BraceletGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>부여효과 {BRACELET_EFFECTS.length}종은 어떻게 나뉘어 있나</h2>
      <p>
        찬란한 구원자의 팔찌에 붙을 수 있는 부여효과는 모두 {BRACELET_EFFECTS.length}개이고,
        이것이 {GROUPS.length}개 그룹으로 묶여 있습니다. 한 그룹은 같은 효과의 낮음·중간·높음
        세 단계를 담고 있어서, 팔찌 하나에 같은 그룹의 효과가 두 번 붙는 일은 없습니다.
        그래서 실제로 팔찌를 굴린다는 것은 &quot;{GROUPS.length}개 그룹 중 서로 다른 3개를 뽑고,
        각 그룹 안에서 다시 단계를 뽑는&quot; 과정입니다.
      </p>
      <p>
        여기서 먼저 봐야 할 것은 그룹 개수가 아니라 등급별로 배정된 확률의 총량입니다.
        아래 표는 확률 테이블을 등급별로 합산한 값입니다.
      </p>

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
              <td>{r.total.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        구조가 한눈에 보입니다. 일반 등급은 그룹이 {RARITY_ROWS[0].groupCount}개뿐인데 전체 확률의{' '}
        {RARITY_ROWS[0].total.toFixed(0)}%를 가져갑니다. 반대로 희귀 등급은 그룹 수가{' '}
        {RARITY_ROWS[2].groupCount}개로 셋 중 가장 많은데도 전체 비중은 {RARITY_ROWS[2].total.toFixed(0)}%에
        그칩니다. 치명타 적중률 콤보나 무기 공격력 중첩처럼 옵션 설명이 길고 좋아 보이는 효과가
        유독 안 나오는 이유가 여기 있습니다. 종류는 많지만 각각에 배정된 확률이 그룹당{' '}
        {RARITY_ROWS[2].perGroup.toFixed(3)}%로 잘게 쪼개져 있습니다.
      </p>

      <h2>낮음·중간·높음은 어느 등급이든 6 : 3 : 1</h2>
      <p>
        그룹 안에서 단계가 갈리는 비율은 등급과 무관하게 일정합니다. 일반 등급은 4.2% · 2.1% ·
        0.7%, 특수 등급은 1.0909% · 0.5455% · 0.1818%, 희귀 등급은 0.5% · 0.25% · 0.08333%인데
        어느 쪽이든 낮음 : 중간 : 높음이 정확히 6 : 3 : 1입니다.
      </p>
      <p>
        실무적으로는 이렇게 읽으면 됩니다. 원하는 그룹이 떴을 때 그것이 높음 단계일 확률은 10분의 1,
        낮음 단계일 확률은 10분의 6입니다. 그룹을 맞추는 것과 그 그룹의 최상단 수치를 맞추는 것은
        난이도가 완전히 다른 문제이고, 후자는 그룹을 맞춘 뒤에도 열 번에 한 번입니다.
      </p>

      <h2>팔찌를 처음 생성하면 무엇이 나오나</h2>
      <p>
        확률 테이블을 그대로 돌려서, 새 팔찌 하나를 생성했을 때 특수·희귀 등급이 몇 개나 섞이는지
        분포를 계산했습니다. 그룹이 하나 정해질 때마다 그 그룹 몫의 확률을 풀에서 빼고 나머지를
        다시 100%로 환산하는, 인게임과 같은 방식으로 계산한 값입니다.
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
              <td>{(SPECIAL_DIST[n] * 100).toFixed(3)}%</td>
              <td>{(RARE_DIST[n] * 100).toFixed(3)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        새 팔찌 두 개 중 하나꼴({(SPECIAL_DIST[0] * 100).toFixed(1)}%)로는 특수 등급이 한 개도 붙지
        않습니다. 반대로 세 자리가 전부 특수 등급으로 채워지는 경우는{' '}
        {(SPECIAL_DIST[3] * 100).toFixed(3)}%, 약 {Math.round(1 / SPECIAL_DIST[3]).toLocaleString()}개에
        하나입니다. 희귀 등급 세 개는{' '}
        {(RARE_DIST[3] * 100).toFixed(3)}%로 약 {Math.round(1 / RARE_DIST[3]).toLocaleString()}개에
        하나까지 내려갑니다. 여기서 말하는 것은 아직 &quot;등급이 특수·희귀냐&quot;일 뿐이고
        어떤 옵션인지, 몇 단계인지는 따지지도 않은 상태입니다.
      </p>

      <h2>조합 확률은 왜 단순 곱셈이 아닌가</h2>
      <p>
        효과 카드 아래에 표시되는 조합 확률은 세 효과의 개별 확률을 그냥 곱한 값이 아닙니다.
        첫 번째 효과가 정해지는 순간 그 효과가 속한 그룹 전체가 풀에서 빠지고, 남은 확률이 다시
        100%로 환산된 상태에서 두 번째가 뽑히기 때문입니다. 세 번째도 마찬가지입니다.
      </p>
      <p>
        그래서 같은 세 효과라도 어떤 순서로 뽑히느냐에 따라 경로별 확률이 달라지고, 로아로골은
        가능한 여섯 가지 순서를 모두 계산해 더합니다. 단순 곱셈보다 약간 높은 값이 나오는데,
        이것이 인게임에서 실제로 그 조합이 한 번에 완성될 확률입니다.
      </p>
      <p>
        아래는 실전에서 많이 찾는 목표 조합을 이 방식으로 계산한 결과입니다. 재변환 없이 한 번에
        그 조합이 뜰 확률과, 그 확률의 역수에 해당하는 기대 시도 횟수입니다.
      </p>

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

      <p>
        상위 티어 세 개를 정조준하면 기대 시도가{' '}
        {COMBO_ROWS[0].tries.toLocaleString()}회입니다. 같은 세 그룹을 낮음 단계로만 받아들이면{' '}
        {COMBO_ROWS[1].tries.toLocaleString()}회로 내려갑니다. 그룹은 그대로 두고 단계 욕심만
        내려놓았을 뿐인데 기대 횟수가 {Math.round(COMBO_ROWS[0].tries / COMBO_ROWS[1].tries)}배 가까이
        줄어듭니다. 팔찌에서 현실적인 목표를 잡는다는 것은 대부분 이 지점을 어디에 두느냐의
        문제입니다.
      </p>

      <h2>잠금과 재변환을 어떻게 쓸 것인가</h2>
      <p>
        재변환은 잠그지 않은 자리만 다시 굴리고, 잠근 효과가 속한 그룹은 풀에서 제외됩니다.
        제외된 만큼 남은 확률이 재정규화되므로, 하나를 잠그면 나머지 두 자리에서 원하는 그룹이
        뽑힐 확률은 오히려 아주 조금 올라갑니다. 다만 그 상승폭은 잠근 그룹의 몫만큼이라,
        일반 등급 그룹 하나를 잠그면 {RARITY_ROWS[0].perGroup.toFixed(1)}%가,
        희귀 등급 그룹 하나를 잠그면{' '}
        {RARITY_ROWS[2].perGroup.toFixed(3)}%가 빠지는 정도입니다. 잠금의 가치는 확률을 끌어올리는
        데 있는 것이 아니라 이미 얻은 것을 잃지 않는 데 있습니다.
      </p>
      <p>
        위의 분포표가 말해 주는 실전 지침은 단순합니다. 특수 등급이 두 개 이상 붙은 팔찌는 상위
        약 10%({((SPECIAL_DIST[2] + SPECIAL_DIST[3]) * 100).toFixed(1)}%)에 해당합니다. 그 상태에서
        남은 한 자리만 굴리는 것과, 세 자리를 전부 다시 굴려 처음부터 시작하는 것은 기대값이 전혀
        다릅니다. 두 개가 이미 맞았다면 그 두 개를 잠그고 한 자리만 보는 쪽이 거의 항상 낫습니다.
      </p>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 위 시뮬레이터에서 효과 카드를 잠그고 재변환을 돌리면, 매 시점의
          조합 확률이 이 글과 같은 방식으로 다시 계산되어 카드 하단에 표시됩니다. 목표 조합을
          정해 두고 몇 번 만에 나오는지 직접 굴려 보면, 표의 기대 시도 횟수가 어떤 감각인지
          바로 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
