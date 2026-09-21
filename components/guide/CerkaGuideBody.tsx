import { RAID_TABLE, MATERIAL_NAMES } from '@/data/rewardTable';
import styles from '@/app/guide/guide.module.css';

/**
 * CerkaGuideBody — /cerka 도구 페이지 본문.
 *
 * 난이도별 골드·귀속 비율·재료 배율을 data/rewardTable.ts 에서 집계한다.
 * 노말만 비계승 재료를 주기 때문에 재료 배율 표는 난이도별로 자기 계열 재료를 찾아 쓴다.
 */

const ORDER = ['세르카 노말', '세르카 하드', '세르카 나메'] as const;

const sumMats = (list: { itemName: string; amount: number }[], into: Record<string, number>) => {
  for (const mat of list) into[mat.itemName] = (into[mat.itemName] ?? 0) + mat.amount;
};

const ROWS = ORDER.map((name) => {
  const entry = RAID_TABLE.find((e) => e.name === name)!;
  const clear: Record<string, number> = {};
  const more: Record<string, number> = {};
  for (const g of entry.gates) {
    sumMats(g.clear, clear);
    sumMats(g.more, more);
  }
  const gold = entry.gates.reduce((s, g) => s + g.gold, 0);
  const bound = entry.gates.reduce((s, g) => s + g.boundGold, 0);
  return {
    label: name.replace('세르카 ', ''),
    level: entry.level,
    gold,
    bound,
    tradable: gold - bound,
    moreGold: entry.gates.reduce((s, g) => s + g.moreGold, 0),
    clear,
    more,
    // 노말은 비계승, 하드·나메는 계승 계열
    stone: clear[MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL] != null
      ? MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_NAMES.FATE_DESTRUCTION_STONE,
    breakthrough: clear[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] != null
      ? MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE
      : MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE,
    thorn: clear[MATERIAL_NAMES.PULSATING_THORN] ?? 0,
  };
});

const ratio = (row: (typeof ROWS)[number], mat: string) => {
  const c = row.clear[mat] ?? 0;
  const m = row.more[mat] ?? 0;
  return c ? m / c : 0;
};

const NORMAL = ROWS[0];
const NM = ROWS[2];

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
        {ROWS[1].thorn}개로 뜁니다. 하드와 나이트메어의 가시 수급량은 {ROWS[1].thorn}개로 같아서,
        가시만 놓고 보면 나이트메어를 도는 추가 이득은 없습니다.
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
                    <span style={{ opacity: 0.7 }}>
                      {' '}
                      ({Math.round((r.bound / r.gold) * 100)}%)
                    </span>
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
        {NORMAL.gold.toLocaleString()}골드 중 {NORMAL.bound.toLocaleString()}골드, 정확히 절반이
        귀속으로 들어옵니다. 하드와 나이트메어는 전액이 거래 가능한 유통 골드입니다.
      </p>
      <p>
        그래서 거래소에서 쓸 골드를 모으는 중이라면 노말의 실질 수익은 표기된 숫자의 절반인{' '}
        {NORMAL.tradable.toLocaleString()}골드로 봐야 합니다. 반대로 재련 비용에 쓸 골드가
        급한 상황이면 귀속 골드도 그대로 쓸 수 있으니 액면가로 세도 됩니다. 더보기 비용 역시 귀속
        골드에서 먼저 빠져나가기 때문에, 귀속이 쌓여 있는 캐릭터는 더보기 부담이 생각보다 가볍습니다.
      </p>

      <h2>더보기는 상위 난이도일수록 이득 폭이 커진다</h2>
      <p>
        더보기 비용은 세 난이도 모두 클리어 골드의 32%로 같은 비율입니다. 그런데 그 돈을 내고
        받는 재료의 배수는 난이도마다 다릅니다. 아래는 주간 기준으로 더보기가 클리어 수령량의
        몇 배를 추가로 주는지 계산한 값입니다.
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
        석 계열을 보면 노말 {ratio(NORMAL, NORMAL.stone).toFixed(2)}배, 하드{' '}
        {ratio(ROWS[1], ROWS[1].stone).toFixed(2)}배, 나이트메어{' '}
        {ratio(NM, NM.stone).toFixed(2)}배로 난이도를 올릴수록 더보기의 배수가 커집니다. 비용
        비율은 32%로 고정인데 받는 배수만 늘어나므로, 더보기의 상대적 이득은 상위 난이도에서 더
        큽니다. &quot;노말은 더보기를 건너뛰고 나이트메어만 더보기를 챙긴다&quot;는 운영이 수치상으로도
        설명되는 셈입니다.
      </p>
      <p>
        돌파석 계열은 난이도와 무관하게 4.4~4.8배로 압도적입니다. 세르카 더보기의 값어치는 사실상
        돌파석에서 나온다고 봐도 무방하고, 돌파석 시세가 오르는 시기에는 다른 재료 시세가 내려도
        더보기가 이득으로 뒤집히는 일이 자주 생깁니다.
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
        같은 잣대가 적용됩니다.
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
