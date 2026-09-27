import {
  WANGAP_BASE_PROBABILITY,
  WANGAP_GROWTH_COSTS,
  WANGAP_MATERIAL_COSTS,
  WANGAP_MAX_LEVEL,
  WANGAP_PROMOTION_COSTS,
  WANGAP_PROMO_MATERIALS,
  getWangapBreathEffect,
  type WangapOptMatKey,
  type WangapPromotedGrade,
} from '@/lib/wangapData';
import { computeWangapAverage, type WangapBreathMode, type WangapCalcMode } from '@/lib/wangapAverage';
import styles from '@/app/guide/guide.module.css';

/**
 * WangapGuideBody — /wangap 도구 페이지 본문.
 *
 * 비용 총액은 /guide/wangap-cost 등 전용 글이 다루므로, 여기서는 시뮬레이터가 실제로 쓰는
 * 확률 모델(실패 누적·장인의 기운·숨결)이 구간마다 어떻게 작동하는지를 수치로 보여준다.
 * 모든 숫자는 lib/wangapData 테이블과 평균 시뮬 계산기(computeWangapAverage)를 모듈 로드 시
 * 한 번 돌려서 얻는다 — 패치로 테이블이 바뀌면 본문도 따라간다.
 */

const NO_PRICE: Record<WangapOptMatKey, number> = {
  파괴석결정: 0, 수호석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 운명파편: 0, 용암: 0, 빙하: 0,
};
const NOT_BOUND: Record<WangapOptMatKey, boolean> = {
  파괴석결정: false, 수호석결정: false, 위대한돌파석: false, 상급아비도스: false, 운명파편: false, 용암: false, 빙하: false,
};

const gradeAt = (level: number) =>
  level >= 20 ? '고대' : level >= 15 ? '유물' : level >= 10 ? '전설' : '영웅';

/** 한 단계(level → level+1)의 시도 횟수 — 시뮬레이터와 같은 계산기를 그대로 쓴다 */
function stepTries(level: number, mode: WangapCalcMode, breath: WangapBreathMode): number {
  const r = computeWangapAverage({
    startLevel: level,
    targetLevel: level + 1,
    startGrade: gradeAt(level),
    mode,
    lavaMode: breath,
    glacierMode: breath,
    boundFlags: NOT_BOUND,
    unitPrices: NO_PRICE,
  });
  return r.totalTries;
}

// 확률 구간 5개 — 각 구간의 첫 단계를 대표로 계산 (구간 안에서는 확률이 같다)
const TIERS = (() => {
  const seen = new Map<number, number[]>();
  for (let lv = 0; lv < WANGAP_MAX_LEVEL; lv++) {
    const p = WANGAP_BASE_PROBABILITY[lv];
    if (!seen.has(p)) seen.set(p, []);
    seen.get(p)!.push(lv);
  }
  return [...seen.entries()].map(([prob, levels]) => {
    const first = levels[0];
    const eff = getWangapBreathEffect(prob);
    return {
      prob,
      from: first + 1,
      to: levels[levels.length - 1] + 1,
      breathTotal: eff.lavaMax + eff.glacierMax,
      fullProb: prob + (eff.lavaMax + eff.glacierMax) * eff.per,
      avgOff: stepTries(first, 'average', 'off'),
      avgFull: stepTries(first, 'average', 'full'),
      medOff: stepTries(first, 'median', 'off'),
      pityOff: stepTries(first, 'pity', 'off'),
      pityFull: stepTries(first, 'pity', 'full'),
    };
  });
})();

const MAX_PITY = Math.max(...TIERS.map((t) => t.pityOff));

// 실패가 쌓여 확률이 상한(기본×2)에 닿는 시도 — 실패마다 기본의 10%씩, 11번째 시도에서 2배
const CAP_TRY = 11;

// 0 → 25 전 구간, 숨결 없이 평균 기준: 운명의 파편이 강화 재료로 나가는 양 vs 성장 비용으로 나가는 양
const FULL_RUN = computeWangapAverage({
  startLevel: 0,
  targetLevel: WANGAP_MAX_LEVEL,
  startGrade: '영웅',
  mode: 'average',
  lavaMode: 'off',
  glacierMode: 'off',
  boundFlags: NOT_BOUND,
  unitPrices: NO_PRICE,
});

// 구간별 파편 지출 — 성장(고정) vs 강화(시도 횟수 비례)
const SHARD_SPLIT = (() => {
  const rows = TIERS.map((t) => ({ label: `${t.from}~${t.to}강`, growth: 0, enhance: 0 }));
  let tierIdx = 0;
  let enhanceRow = 0;
  const enhanceRows = FULL_RUN.rows.filter((r) => r.type === 'enhance');
  for (let lv = 0; lv < WANGAP_MAX_LEVEL; lv++) {
    while (tierIdx < TIERS.length - 1 && lv + 1 > TIERS[tierIdx].to) tierIdx++;
    rows[tierIdx].growth += WANGAP_GROWTH_COSTS[lv + 1]?.운명파편 ?? 0;
    const row = enhanceRows[enhanceRow++];
    if (row && row.type === 'enhance') {
      rows[tierIdx].enhance += row.tries * (WANGAP_MATERIAL_COSTS[lv + 1]?.운명파편 ?? 0);
    }
  }
  return rows.map((r) => ({ ...r, growthShare: r.growth / (r.growth + r.enhance) }));
})();

const GROWTH_TOTAL = FULL_RUN.growth.운명파편;
const ENHANCE_SHARD_TOTAL = FULL_RUN.totals.운명파편;
const GROWTH_SHARE = GROWTH_TOTAL / (GROWTH_TOTAL + ENHANCE_SHARD_TOTAL);

// 1회 강화 골드가 첫 단계 대비 몇 배까지 오르는지
const GOLD_FIRST = WANGAP_MATERIAL_COSTS[1].골드;
const GOLD_LAST = WANGAP_MATERIAL_COSTS[WANGAP_MAX_LEVEL].골드;

const PROMO_STEPS: { grade: WangapPromotedGrade; at: number }[] = [
  { grade: '전설', at: 10 },
  { grade: '유물', at: 15 },
  { grade: '고대', at: 20 },
];

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(/\.0+$/, '')}%`;
const fmt = (v: number) => Math.round(v).toLocaleString();
const tries = (v: number) => (v >= 10 ? v.toFixed(1) : v.toFixed(2));

export default function WangapGuideBody() {
  const last = TIERS[TIERS.length - 1];
  const first = TIERS[0];

  return (
    <div className={styles.articleBody}>
      <h2>한눈에 보는 완갑 강화</h2>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>확률 구간</span>
          <span className={styles.statValue}>{TIERS.length}단계</span>
          <span className={styles.statNote}>
            {pct(first.prob)}에서 {pct(last.prob)}까지
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>+0 → +{WANGAP_MAX_LEVEL} 평균 시도</span>
          <span className={styles.statValue}>{fmt(FULL_RUN.totalTries)}회</span>
          <span className={styles.statNote}>숨결 미사용 기준</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>1회 강화 골드</span>
          <span className={styles.statValue}>{(GOLD_LAST / GOLD_FIRST).toFixed(1)}배</span>
          <span className={styles.statNote}>
            {fmt(GOLD_FIRST)}G에서 {fmt(GOLD_LAST)}G로
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>파편 중 성장 비용 비중</span>
          <span className={styles.statValue}>{pct(GROWTH_SHARE)}</span>
          <span className={styles.statNote}>실패와 무관한 고정 지출</span>
        </div>
      </div>

      <p>
        완갑은 +{WANGAP_MAX_LEVEL}까지 {TIERS.length}개의 확률 구간을 지나갑니다. 구간이 바뀔 때마다 성공
        확률이 떨어지고, 한 번 누를 때 드는 재료는 단계마다 조금씩 늘어납니다. 아래 내용은 이 페이지의
        평균 시뮬이 실제로 쓰는 계산기를 그대로 돌려서 얻은 값이라, 위 시뮬레이터에서 같은 조건을 넣으면
        같은 숫자가 나옵니다.
      </p>

      <h2>등급과 승급 지점</h2>
      <ol className={styles.stepFlow}>
        <li className={styles.stepItem}>
          <strong>영웅</strong>
          +0 ~ +10
        </li>
        {PROMO_STEPS.map(({ grade, at }) => (
          <li key={grade} className={styles.stepItem}>
            <strong>{grade}</strong>+{at}에서 승급
            <br />
            {WANGAP_PROMOTION_COSTS[grade]
              .map((c) => `${WANGAP_PROMO_MATERIALS[c.material].name} ${c.amount}개`)
              .join(' 또는 ')}
          </li>
        ))}
      </ol>
      <p>
        승급 재료는 두 가지 중 하나만 내면 됩니다. 다만 고대 승급만은 선택지가 없어서 죽음의 손이
        반드시 필요합니다. 사령의 잔영을 아무리 모아도 +20에서 멈추게 되는 이유입니다. 두 재료 모두
        거래가 안 되는 귀속 재료라 골드 견적에는 들어가지 않습니다.
      </p>

      <h2>구간별로 몇 번 눌러야 끝나나</h2>
      <p>
        완갑 강화에는 두 가지 안전장치가 있습니다. 실패할 때마다 성공 확률이 기본 확률의 10%씩 올라
        {` ${CAP_TRY}`}번째 시도에서 두 배에 닿고, 그 사이 장인의 기운이 쌓여 100%가 되면 다음 시도가
        확정 성공합니다. 아래 표는 이 두 장치를 모두 반영한 시도 횟수입니다. 최악은 장인의 기운이 가득
        찰 때까지 한 번도 성공하지 못한 경우, 즉 천장입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>구간</th>
              <th>기본 확률</th>
              <th>평균 시도</th>
              <th>중앙값</th>
              <th>최악(천장)</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t.prob}>
                <td style={{ fontWeight: 600 }}>
                  +{t.from} ~ +{t.to}
                </td>
                <td>{pct(t.prob)}</td>
                <td>{tries(t.avgOff)}회</td>
                <td>{t.medOff}회</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(t.pityOff / MAX_PITY) * 100}px` }} />
                    <span className={styles.barText}>{t.pityOff}회</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>숨결 미사용, 각 구간 첫 단계 1회 강화 기준</p>

      <p>
        눈여겨볼 점은 평균과 천장의 거리입니다. {pct(first.prob)} 구간은 평균 {tries(first.avgOff)}회에
        천장이 {first.pityOff}회라 운이 나빠도 크게 벗어나지 않습니다. 반면 {pct(last.prob)} 구간은 평균이{' '}
        {tries(last.avgOff)}회인데 천장이 {last.pityOff}회까지 벌어집니다. 확률이 낮은 구간일수록 결과의
        폭이 넓어지니, +20 이후는 평균만 보고 재료를 맞추면 모자랄 가능성이 큽니다. 여유분을 천장
        쪽으로 잡아 두는 편이 안전합니다.
      </p>

      <h2>숨결을 가득 넣으면 달라지는 것</h2>
      <p>
        용암의 숨결과 빙하의 숨결은 구간마다 넣을 수 있는 개수가 정해져 있고, 상한까지 넣으면 어느
        구간이든 기본 확률이 정확히 두 배가 됩니다. 그런데 시도 횟수가 절반으로 줄지는 않습니다. 실패
        누적과 장인의 기운이 이미 확률을 끌어올리고 있어서, 숨결이 더해 주는 몫이 그만큼 겹치기
        때문입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>구간</th>
              <th>숨결 상한</th>
              <th>풀숨 확률</th>
              <th>평균 시도 (노숨 → 풀숨)</th>
              <th>천장 (노숨 → 풀숨)</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t.prob}>
                <td style={{ fontWeight: 600 }}>
                  +{t.from} ~ +{t.to}
                </td>
                <td>{t.breathTotal}개</td>
                <td>{pct(t.fullProb)}</td>
                <td>
                  {tries(t.avgOff)} → {tries(t.avgFull)}회 ({pct(1 - t.avgFull / t.avgOff, 0)} 감소)
                </td>
                <td>
                  {t.pityOff} → {t.pityFull}회
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tipBox}>
        <p>
          숨결이 이득인지는 &quot;줄어드는 시도 횟수 × 1회 재료값&quot;과 &quot;숨결 값&quot;을 비교해야
          알 수 있습니다. 위 평균 시뮬의 보조재료 최적화는 이 비교를 현재 거래소 시세로 회차마다 해서
          가장 싼 투입 개수를 찾아 줍니다. 숨결 시세가 싼 날과 비싼 날의 답이 다른 이유입니다.
        </p>
      </div>

      <h2>운명의 파편은 어디로 나가나</h2>
      <p>
        운명의 파편은 두 경로로 빠져나갑니다. 하나는 강화를 누를 때마다 드는 재료이고, 다른 하나는
        단계를 시작할 때 한 번만 내는 장비 성장 비용입니다. 성장 비용은 몇 번을 실패하든 늘지 않으니,
        파편 견적을 낼 때 둘을 따로 봐야 합니다. +0에서 +{WANGAP_MAX_LEVEL}까지 숨결 없이 평균으로
        계산하면 성장 비용 {fmt(GROWTH_TOTAL)}개, 강화 재료 {fmt(ENHANCE_SHARD_TOTAL)}개입니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>구간</th>
              <th>성장 비용 (고정)</th>
              <th>강화 재료 (평균)</th>
              <th>고정 지출 비중</th>
            </tr>
          </thead>
          <tbody>
            {SHARD_SPLIT.map((r) => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td>{fmt(r.growth)}</td>
                <td>{fmt(r.enhance)}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${r.growthShare * 100}px` }} />
                    <span className={styles.barText}>{pct(r.growthShare)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        확률이 높은 초반 구간은 시도 횟수가 적어서 파편 대부분이 성장 비용으로 나갑니다. 확률이 낮아질수록
        시도가 늘어 강화 재료 쪽 비중이 커집니다. 초반에는 파편이 &quot;얼마나 운이 좋냐&quot;와 거의
        상관없이 정해진 양만큼 들고, 후반으로 갈수록 운에 따라 크게 흔들린다는 뜻입니다. 실링은 성장 비용이
        파편의 정확히 10배로 붙으니, 파편 계획을 세우면 실링도 함께 가늠할 수 있습니다.
      </p>

      <div className={styles.noteBox}>
        <p>
          숨결 상한 개수 중 {pct(TIERS[0].prob)}·{pct(TIERS[3].prob)} 구간은 인게임 실측으로 확정된
          값이고, 나머지 구간은 제보를 바탕으로 넣었습니다. 실측값이 새로 확인되면 표와 시뮬레이터가
          함께 바뀝니다.
        </p>
      </div>
    </div>
  );
}
