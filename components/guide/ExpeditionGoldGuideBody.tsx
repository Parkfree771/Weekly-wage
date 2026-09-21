import { RAID_TABLE } from '@/data/rewardTable';
import styles from '@/app/guide/guide.module.css';

/**
 * ExpeditionGoldGuideBody — /expedition-gold 도구 페이지 본문.
 *
 * 아이템 레벨별 주급 계단과 더보기 비용 비율을 data/rewardTable.ts 에서 직접 집계한다.
 * 계단 표는 "캐릭터 1명 · 그룹당 최고 난이도 1개 · 상위 3레이드" 라는 단순화된 기준이며,
 * 시뮬레이터 본체는 원정대 6캐릭 상한과 귀속/유통 구분까지 함께 계산한다.
 */

type Raid = {
  name: string;
  group: string;
  level: number;
  gold: number;
  bound: number;
  moreGold: number;
};

const RAIDS: Raid[] = RAID_TABLE.map((e) => ({
  name: e.name,
  group: e.group,
  level: e.level,
  gold: e.gates.reduce((s, g) => s + g.gold, 0),
  bound: e.gates.reduce((s, g) => s + g.boundGold, 0),
  moreGold: e.gates.reduce((s, g) => s + g.moreGold, 0),
}));

/** 해당 레벨에서 캐릭터 1명이 세는 상위 3레이드 (그룹당 최고 골드 1개) */
function topThree(level: number): Raid[] {
  const best = new Map<string, Raid>();
  for (const r of RAIDS) {
    if (r.level > level) continue;
    const cur = best.get(r.group);
    if (!cur || cur.gold < r.gold) best.set(r.group, r);
  }
  return [...best.values()].sort((a, b) => b.gold - a.gold).slice(0, 3);
}

const LEVELS = [...new Set(RAIDS.map((r) => r.level))].sort((a, b) => a - b);

const STAIRS = LEVELS.map((level, i) => {
  const top = topThree(level);
  const weekly = top.reduce((s, r) => s + r.gold, 0);
  const prev = i === 0 ? null : topThree(LEVELS[i - 1]).reduce((s, r) => s + r.gold, 0);
  return { level, weekly, delta: prev === null ? null : weekly - prev, top };
});

const FIRST = STAIRS[0];
const LAST = STAIRS[STAIRS.length - 1];
const BIGGEST = STAIRS.reduce((a, b) => ((b.delta ?? 0) > (a.delta ?? 0) ? b : a));
const SMALLEST = STAIRS.filter((s) => s.delta !== null).reduce((a, b) =>
  (b.delta ?? 0) < (a.delta ?? 0) ? b : a
);

/** 더보기 비용 / 클리어 골드 비율 — 32% 표준에서 벗어난 레이드 추리기 */
const MORE_RATIOS = RAIDS.map((r) => ({ ...r, pct: (r.moreGold / r.gold) * 100 })).sort(
  (a, b) => a.pct - b.pct
);
const OFF_STANDARD = MORE_RATIOS.filter((r) => Math.abs(r.pct - 32) > 0.5);

export default function ExpeditionGoldGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>주급은 매끄럽게 오르지 않고 계단으로 오른다</h2>
      <p>
        아이템 레벨을 1씩 올린다고 주간 골드가 1씩 늘지는 않습니다. 새 레이드의 입장 레벨을 넘는
        순간에만 값이 바뀌고, 그 사이는 완전히 평평합니다. 아래 표는 현재 레이드 데이터로
        계산한 계단입니다. 캐릭터 한 명이 같은 레이드 그룹에서는 가장 골드가 많은 난이도 하나만
        세고, 그렇게 고른 것 중 상위 3개를 합산하는 기준입니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>도달 레벨</th>
            <th>주간 골드</th>
            <th>증가분</th>
            <th>세는 레이드 3개</th>
          </tr>
        </thead>
        <tbody>
          {STAIRS.map((s) => (
            <tr key={s.level}>
              <td style={{ fontWeight: 600 }}>{s.level}</td>
              <td>{s.weekly.toLocaleString()}</td>
              <td>{s.delta === null ? '-' : `+${s.delta.toLocaleString()}`}</td>
              <td style={{ fontSize: '0.9em' }}>{s.top.map((r) => r.name).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        {FIRST.level}에서 {LAST.level}까지, 주급은 {FIRST.weekly.toLocaleString()}골드에서{' '}
        {LAST.weekly.toLocaleString()}골드로 올라갑니다. 약{' '}
        {(LAST.weekly / FIRST.weekly).toFixed(1)}배입니다. 다만 그 사이가 고르지 않다는 것이
        이 표의 핵심입니다.
      </p>

      <h2>큰 계단과 헛계단</h2>
      <p>
        가장 큰 폭으로 뛰는 지점은 {BIGGEST.level}입니다. 여기서 주급이 한 번에{' '}
        {BIGGEST.delta?.toLocaleString()}골드 늘어납니다. 반대로 가장 작은 계단은{' '}
        {SMALLEST.level} 구간이고, 증가분이 {SMALLEST.delta?.toLocaleString()}골드에 그칩니다.
        같은 &quot;레이드 하나가
        새로 열리는&quot; 사건인데도 체감이 이렇게 다른 이유는, 새 레이드가 기존에 세던 3개 중 가장
        낮은 하나를 밀어내기 때문입니다. 실제 이득은 새 레이드의 골드가 아니라 <strong>새 레이드와
        밀려난 레이드의 차액</strong>입니다.
      </p>
      <p>
        표의 마지막 칸을 따라 읽어 보면 이 교체가 보입니다. 레벨이 오를 때마다 세 칸 중 하나씩만
        바뀌고, 나머지 둘은 그대로 남습니다. 그래서 목표 레벨을 정할 때는 &quot;거기서 무슨 레이드가
        열리는가&quot;가 아니라 &quot;그게 지금 세고 있는 셋 중 무엇을 밀어내는가&quot;를 봐야 합니다.
      </p>
      <p>
        그리고 이 표에 아예 나타나지 않는 구간이 있습니다. 레이드 입장 레벨이 아닌 값은 행이
        생기지 않습니다. 재련은 레벨이 오를수록 가팔라지는데 그 구간의 주급 증가는 0입니다.
        다음 입장 레벨까지 한 번에 도달할 재화가 없다면, 중간에서 멈추는 것은 비용만 쓰고 수익은
        그대로인 선택이 됩니다.
      </p>

      <h2>원정대 단위에서는 6캐릭 상한이 한 번 더 걸린다</h2>
      <p>
        위 표는 캐릭터 한 명 기준입니다. 원정대 주급에는 제한이 하나 더 붙습니다. 주간 골드가
        인정되는 캐릭터는 상위 6명까지입니다. 7번째 캐릭터를 아무리 올려도 원정대 주급은 그대로이고,
        오히려 그 캐릭터가 6위 안으로 들어오면 기존 6위가 밖으로 밀려납니다.
      </p>
      <p>
        그래서 원정대 단위 이득은 캐릭터 단위 계단을 그냥 더해서 구할 수 없습니다. 레벨업 전
        원정대와 후 원정대의 주급을 각각 처음부터 끝까지 계산해 차이를 내야 정확한 값이 나옵니다.
        위 시뮬레이터가 증분 합산 대신 전후 전체 재계산 방식을 쓰는 이유입니다.
      </p>

      <h2>더보기 비용 비율은 레이드마다 같지 않다</h2>
      <p>
        더보기 비용은 대체로 클리어 골드의 32%입니다. 벨가르딘·세르카·지평의 성당·종막처럼
        최근에 정비된 레이드는 예외 없이 정확히 32%로 맞춰져 있습니다. 비율이 어긋나는 것은
        그보다 오래된 레이드들입니다.
      </p>

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
              <td>{r.gold.toLocaleString()}</td>
              <td>{r.moreGold.toLocaleString()}</td>
              <td>{r.pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        가장 눈에 띄는 것은 {MORE_RATIOS[0].name}입니다. 비율이 {MORE_RATIOS[0].pct.toFixed(1)}%로
        표준보다 10%p 낮습니다. 저레벨 구간을 지나는 캐릭터라면 같은 골드로 얻는 재료가 다른
        레이드보다 유리하다는 뜻이라, 주급이 적다고 더보기까지 일괄로 건너뛸 이유는 없습니다.
      </p>
      <p>
        반대로 33% 대인 레이드들은 표준보다 비쌉니다. 차이가 크지는 않지만, 더보기 손익이 아슬아슬하게
        갈리는 시세 구간에서는 이 1%p가 부호를 바꾸기도 합니다. 시뮬레이터가 &quot;골드만&quot; 탭에서
        더보기 비용을 빼고 계산하는 것도 이런 변수를 레벨업 비교에서 분리하기 위해서입니다.
      </p>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 목표 레벨을 고를 때는 위 계단 표에서 다음 행이 어디인지 먼저 보고,
          그 레벨까지의 재련 비용을 재련 시뮬레이터에서 뽑아 비교하면 됩니다. 계단 사이에서
          멈추는 계획이라면 그 레벨업은 주급이 아니라 재료 수급 티어 상승이나 파티 입장 조건 쪽에서
          이유를 찾아야 합니다.
        </p>
      </div>
    </div>
  );
}
