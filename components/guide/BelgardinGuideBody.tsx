import { RAID_TABLE, MATERIAL_NAMES } from '@/data/rewardTable';
import { WANGAP_PROMOTION_COSTS } from '@/lib/wangapData';
import styles from '@/app/guide/guide.module.css';

/**
 * BelgardinGuideBody — /belgardin 도구 페이지 본문.
 *
 * 골드·재료 수치는 data/rewardTable.ts(단일 원본)에서 직접 집계한다.
 * 승급 비용은 lib/wangapData.ts 의 WANGAP_PROMOTION_COSTS 를 그대로 쓴다.
 * 두 원본이 패치로 갱신되면 본문 표와 문장 속 숫자도 함께 따라간다.
 */

const ORDER = ['벨가르딘 노말', '벨가르딘 하드', '벨가르딘 나메'] as const;

type Agg = {
  name: string;
  level: number;
  gold: number;
  moreGold: number;
  clear: Record<string, number>;
  more: Record<string, number>;
};

const sumMats = (list: { itemName: string; amount: number }[], into: Record<string, number>) => {
  for (const mat of list) into[mat.itemName] = (into[mat.itemName] ?? 0) + mat.amount;
};

const ROWS: Agg[] = ORDER.map((name) => {
  const entry = RAID_TABLE.find((e) => e.name === name)!;
  const clear: Record<string, number> = {};
  const more: Record<string, number> = {};
  for (const g of entry.gates) {
    sumMats(g.clear, clear);
    sumMats(g.more, more);
  }
  return {
    name,
    level: entry.level,
    gold: entry.gates.reduce((s, g) => s + g.gold, 0),
    moreGold: entry.gates.reduce((s, g) => s + g.moreGold, 0),
    clear,
    more,
  };
});

const NM = ROWS[2];

/** 더보기로 추가되는 재료가 클리어 수령분의 몇 배인지 */
const MAT_KEYS = [
  MATERIAL_NAMES.FATE_DESTRUCTION_STONE_CRYSTAL,
  MATERIAL_NAMES.FATE_GUARDIAN_STONE_CRYSTAL,
  MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE,
  MATERIAL_NAMES.FATE_FRAGMENT,
];

const promoAmount = (grade: '전설' | '유물' | '고대', mat: '사령의잔영' | '죽음의손') =>
  WANGAP_PROMOTION_COSTS[grade].find((c) => c.material === mat)?.amount ?? null;

const HAND_TOTAL =
  (promoAmount('전설', '죽음의손') ?? 0) +
  (promoAmount('유물', '죽음의손') ?? 0) +
  (promoAmount('고대', '죽음의손') ?? 0);

const ECHO_TO_RELIC = (promoAmount('전설', '사령의잔영') ?? 0) + (promoAmount('유물', '사령의잔영') ?? 0);

/** 주간 승급 재료 수급 — 클리어분 + 더보기 추가분 */
const weeklyPromo = (row: Agg, matName: string) => (row.clear[matName] ?? 0) + (row.more[matName] ?? 0);

const HAND_PER_WEEK_FULL = weeklyPromo(NM, MATERIAL_NAMES.HAND_OF_DEATH);
const HAND_PER_WEEK_CLEAR = NM.clear[MATERIAL_NAMES.HAND_OF_DEATH] ?? 0;
const ECHO_PER_WEEK_FULL = weeklyPromo(ROWS[0], MATERIAL_NAMES.WRAITH_ECHO);

export default function BelgardinGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>난이도별 주간 수령액 한눈에</h2>
      <p>
        벨가르딘은 어느 난이도든 1관문·2관문 두 관문 구성이라, 한 캐릭터가 한 주에 받는 양은
        두 관문을 더한 값입니다. 아래는 클리어 골드와 더보기 비용, 그리고 완갑 승급 재료의 주간
        합계입니다. 더보기 재료 수량은 다음 항목에서 따로 다룹니다.
      </p>

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

      <p>
        더보기 비용은 세 난이도 모두 해당 관문 클리어 골드의 정확히 32%입니다. 나이트메어 2관문이
        45,000골드에 더보기 14,400골드인 것도, 노말 1관문이 20,000골드에 6,400골드인 것도 같은
        비율입니다. 난이도를 올린다고 더보기가 상대적으로 비싸지거나 싸지지는 않는다는 뜻이라,
        더보기 여부는 난이도와 분리해서 판단하면 됩니다.
      </p>

      <h2>더보기는 재료를 몇 배로 주나</h2>
      <p>
        벨가르딘에서 더보기의 값어치는 골드 대비 재료 비율로 봐야 합니다. 아래는 나이트메어 기준
        주간 클리어 수령량과 더보기로 <strong>추가</strong>되는 양, 그리고 그 배율입니다.
      </p>

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
          {MAT_KEYS.map((k) => {
            const c = NM.clear[k] ?? 0;
            const mo = NM.more[k] ?? 0;
            return (
              <tr key={k}>
                <td style={{ fontWeight: 600 }}>{k}</td>
                <td>{c.toLocaleString()}</td>
                <td>{mo.toLocaleString()}</td>
                <td>{c ? `${(mo / c).toFixed(2)}배` : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p>
        눈에 띄는 것은 위대한 운명의 돌파석입니다. 석과 파편이 2.5배 안팎인 데 비해 돌파석만{' '}
        {(
          (NM.more[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] ?? 0) /
          (NM.clear[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] ?? 1)
        ).toFixed(1)}배로 뛰어오릅니다. 클리어만 하면 주{' '}
        {NM.clear[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] ?? 0}개인데 더보기를 붙이면{' '}
        {NM.more[MATERIAL_NAMES.GREAT_FATE_BREAKTHROUGH_STONE] ?? 0}개가 더 들어옵니다.
        돌파석이 병목인 시점에는 더보기 손익이 시세 계산상 약간 마이너스로 나오더라도 실제로는
        선택할 이유가 생기는 구간입니다. 반대로 석만 남아도는 상황이라면 같은 골드로 거래소에서
        돌파석을 직접 사는 쪽과 비교해 봐야 합니다.
      </p>
      <p>
        코어와 승급 재료는 배율이 1.00배입니다. 더보기를 하면 클리어와 똑같은 수량이 한 번 더
        붙는다는 뜻이고, 이 둘은 거래 불가라 시세 환산 손익에는 잡히지 않습니다. 더보기 판단이
        숫자보다 까다로워지는 이유가 이 지점입니다.
      </p>

      <h2>완갑 +25까지 몇 주가 걸리나</h2>
      <p>
        벨가르딘을 도는 이유의 상당 부분은 완갑 승급 재료입니다. 전설 승급은 사령의 잔영{' '}
        {promoAmount('전설', '사령의잔영')}개 또는 죽음의 손 {promoAmount('전설', '죽음의손')}개,
        유물 승급은 {promoAmount('유물', '사령의잔영')}개 또는 {promoAmount('유물', '죽음의손')}개,
        고대 승급은 죽음의 손 {promoAmount('고대', '죽음의손')}개로 고정입니다. 두 재료 중 하나만
        내면 되고 골드는 들지 않습니다.
      </p>
      <p>
        여기서 자주 놓치는 제약이 하나 있습니다. <strong>고대 승급은 죽음의 손으로만 가능합니다.</strong>{' '}
        사령의 잔영은 노말에서만 나오므로, 노말만 돌아서는 유물({ECHO_TO_RELIC}개 소모)까지는
        갈 수 있어도 +20 이후로는 한 발짝도 못 나갑니다. 고대를 보려면 하드 이상을 돌아야 합니다.
      </p>

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
            <td>{Math.ceil(HAND_TOTAL / HAND_PER_WEEK_FULL)}주</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>하드·나메 클리어만</td>
            <td>죽음의 손 {HAND_PER_WEEK_CLEAR}개</td>
            <td>{HAND_TOTAL}개</td>
            <td>{Math.ceil(HAND_TOTAL / HAND_PER_WEEK_CLEAR)}주</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>노말 풀더보기</td>
            <td>사령의 잔영 {ECHO_PER_WEEK_FULL}개</td>
            <td>유물까지 {ECHO_TO_RELIC}개 (고대 불가)</td>
            <td>{Math.ceil(ECHO_TO_RELIC / ECHO_PER_WEEK_FULL)}주 후 정지</td>
          </tr>
        </tbody>
      </table>

      <p>
        한 캐릭터로 하드 이상을 풀더보기로 꾸준히 돌면 고대까지{' '}
        {Math.ceil(HAND_TOTAL / HAND_PER_WEEK_FULL)}주, 더보기를 생략하면{' '}
        {Math.ceil(HAND_TOTAL / HAND_PER_WEEK_CLEAR)}주가 걸립니다. 거의 두 배 차이입니다. 완갑 진행을
        서두르는 중이라면 더보기 비용 주 {NM.moreGold.toLocaleString()}골드는 재료값이라기보다
        일정을 절반으로 줄이는 값으로 보는 편이 실제에 가깝습니다.
      </p>
      <p>
        여러 캐릭터로 벨가르딘을 도는 경우 승급 재료는 원정대 단위로 합쳐지지 않습니다. 완갑은
        캐릭터마다 따로 올리는 장비라, 위 주차 계산은 그 완갑을 끼울 캐릭터가 직접 벌어들이는 양
        기준으로 읽어야 합니다.
      </p>

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
        두 배가 됩니다.
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
