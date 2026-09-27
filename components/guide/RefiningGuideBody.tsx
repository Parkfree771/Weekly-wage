import {
  BASE_PROBABILITY,
  JANGIN_ACCUMULATE_DIVIDER,
  SUCCESSION_BASE_PROBABILITY,
  getBreathEffect,
  getSuccessionBreathEffect,
  getSuccessionBookBonus,
  getGrowthCost,
  WEAPON_MATERIAL_COSTS,
  ARMOR_MATERIAL_COSTS,
  SUCCESSION_WEAPON_MATERIAL_COSTS,
  SUCCESSION_ARMOR_MATERIAL_COSTS,
} from '@/lib/refiningData';
import { triesForFixedBookPolicy } from '@/lib/optimalBreath';
import styles from '@/app/guide/guide.module.css';

/**
 * RefiningGuideBody — /refining 도구 페이지 본문.
 *
 * 재료표·확률표는 lib/refiningData.ts, 시도 횟수는 계산기와 같은 정확 DP(lib/optimalBreath 의
 * triesForFixedBookPolicy — 실패 누적 +10%·2배 상한·장인의 기운 ÷2.15)로 모듈 로드 시 계산한다.
 * 몬테카를로가 아니라 결정론적 계산이라 새로고침해도 값이 흔들리지 않는다.
 */

const PROB_LEVELS = Object.keys(BASE_PROBABILITY).map(Number).sort((a, b) => a - b);
const SUCC_LEVELS = Object.keys(SUCCESSION_BASE_PROBABILITY).map(Number).sort((a, b) => a - b);
const BREATH_PROBS = [...new Set(Object.values(BASE_PROBABILITY))].sort((a, b) => b - a);

type Mode = 'average' | 'median' | 'pity';

// ── 계승 후 단계별 시도 횟수와 무기 기대 골드 ──
const SUCC_ROWS = SUCC_LEVELS.map((L) => {
  const p = SUCCESSION_BASE_PROBABILITY[L];
  const be = getSuccessionBreathEffect(p);
  const t = (breath: boolean, mode: Mode, book = 0) => triesForFixedBookPolicy(p, be, breath, book, mode).tries;
  const cost = SUCCESSION_WEAPON_MATERIAL_COSTS[L + 1];
  const avgNone = t(false, 'average');
  const bookBonus = getSuccessionBookBonus(L);
  return {
    level: L,
    prob: p,
    avgNone,
    avgFull: t(true, 'average'),
    avgBook: bookBonus > 0 ? t(false, 'average', bookBonus) : null,
    pityNone: t(false, 'pity'),
    pityFull: t(true, 'pity'),
    goldPerTry: cost?.골드 ?? 0,
    expGold: avgNone * (cost?.골드 ?? 0),
    growthShard: getGrowthCost(L, 'weapon', true).운명파편,
  };
});
const TOTAL_GOLD = SUCC_ROWS.reduce((s, r) => s + r.expGold, 0);
const TOTAL_TRIES_NONE = SUCC_ROWS.reduce((s, r) => s + r.avgNone, 0);
const TOTAL_TRIES_FULL = SUCC_ROWS.reduce((s, r) => s + r.avgFull, 0);
const MAX_PITY = Math.max(...SUCC_ROWS.map((r) => r.pityNone));
const MAX_GOLD_SHARE = Math.max(...SUCC_ROWS.map((r) => r.expGold / TOTAL_GOLD));
const FIRST = SUCC_ROWS[0];
const LAST = SUCC_ROWS[SUCC_ROWS.length - 1];
const LAST_TWO_SHARE = SUCC_ROWS.slice(-2).reduce((s, r) => s + r.expGold, 0) / TOTAL_GOLD;
// 확률이 1.5% 이하로 떨어지는 구간부터의 골드 비중
const LOW_FROM = SUCC_ROWS.find((r) => r.prob <= 0.015)!;
const LOW_SHARE = SUCC_ROWS.filter((r) => r.level >= LOW_FROM.level).reduce((s, r) => s + r.expGold, 0) / TOTAL_GOLD;

// 책 = 풀숨? — 책이 있는 단계에서 두 평균 시도가 같은지
const BOOK_ROWS = SUCC_ROWS.filter((r) => r.avgBook !== null);
const BOOK_EQUALS_BREATH = BOOK_ROWS.every((r) => Math.abs((r.avgBook ?? 0) - r.avgFull) < 0.05);

// ── 장인의 기운: 기본 확률별 천장 (계승 전 표, 숨결·책 없음) ──
const PITY_BY_PROB = BREATH_PROBS.map((p) => {
  const be = getBreathEffect(p);
  const naive = Math.ceil(1 / (p / JANGIN_ACCUMULATE_DIVIDER)) + 1;
  return {
    prob: p,
    pity: triesForFixedBookPolicy(p, be, false, 0, 'pity').tries,
    avg: triesForFixedBookPolicy(p, be, false, 0, 'average').tries,
    naive,
  };
});
const TOP = PITY_BY_PROB[0];

const pct = (p: number) => `${parseFloat((p * 100).toFixed(2))}%`;
const fmt = (v: number) => Math.round(v).toLocaleString();
const share = (v: number) => `${(v * 100).toFixed(1)}%`;
const tries = (v: number) => v.toFixed(v >= 100 ? 0 : 2);

export default function RefiningGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>계승 후 +11에서 +25까지, 숫자로 먼저</h2>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>무기 평균 재련 골드</span>
          <span className={styles.statValue}>{(TOTAL_GOLD / 10000).toFixed(0)}만G</span>
          <span className={styles.statNote}>
            +{FIRST.level} → +{LAST.level + 1}, 숨결 미사용
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>마지막 두 단계 비중</span>
          <span className={styles.statValue}>{share(LAST_TWO_SHARE)}</span>
          <span className={styles.statNote}>
            +{LAST.level - 1} → +{LAST.level + 1} 구간 몫
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>1회 골드 vs 평균 시도</span>
          <span className={styles.statValue}>
            {(LAST.goldPerTry / FIRST.goldPerTry).toFixed(1)}배 / {(LAST.avgNone / FIRST.avgNone).toFixed(1)}배
          </span>
          <span className={styles.statNote}>첫 단계 대비 마지막 단계</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>풀숨 시 총 시도</span>
          <span className={styles.statValue}>-{share(1 - TOTAL_TRIES_FULL / TOTAL_TRIES_NONE)}</span>
          <span className={styles.statNote}>
            {fmt(TOTAL_TRIES_NONE)}회 → {fmt(TOTAL_TRIES_FULL)}회
          </span>
        </div>
      </div>

      <h2>T4 재련 시스템 개요</h2>
      <p>
        재련은 장비 아이템 레벨을 올리는 핵심 성장 수단입니다. 시도마다 골드와 재료를 쓰고, 정해진 확률로 성공하며, 실패하면
        소모한 재료만 사라진 채 단계가 유지됩니다. 장비를 <strong>계승</strong>하면 단계가 11부터 다시 시작되고 재료도
        파괴석·수호석 결정, 위대한 돌파석, 상급 아비도스 융화 재료로 바뀝니다. 이 글의 비용 분석은 지금 대부분이 진행하는
        계승 후 무기를 기준으로 합니다.
      </p>

      <h2>재련 재료 종류</h2>
      <ul>
        <li>
          <strong>운명의 파편:</strong> 모든 단계에서 드는 기본 재료이고, 단계를 시작할 때 내는 장비 성장 비용으로도 한 번 더
          나갑니다.
        </li>
        <li>
          <strong>파괴석·수호석 (결정):</strong> 무기는 파괴석, 방어구는 수호석을 씁니다. 계승 후에는 결정으로 바뀝니다.
        </li>
        <li>
          <strong>돌파석 (위대한 돌파석):</strong> 모든 장비에 필요한 핵심 재료로 1회 소모량이 적지만 단가가 높습니다.
        </li>
        <li>
          <strong>아비도스 융화 재료 (상급):</strong> 벌목 재료로 제작하거나 거래소에서 삽니다.
        </li>
        <li>
          <strong>골드·실링:</strong> 매 시도 일정량이 들고, 단계가 오를수록 늘어납니다.
        </li>
      </ul>

      <h2>단계별 재료 소모량 (1회 시도 기준)</h2>
      <p>
        아래 표는 재련 시뮬레이터가 비용 계산에 쓰는 1회 소모량입니다. 실패해도 같은 양이 들므로 목표까지의 재료는 (1회
        소모량 × 시도 횟수)에 단계별 성장 비용을 더한 값입니다.
      </p>

      <h3>계승 전 — 무기</h3>
      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>목표 단계</th>
              <th>파괴석</th>
              <th>돌파석</th>
              <th>아비도스</th>
              <th>운명 파편</th>
              <th>실링</th>
              <th>골드</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(WEAPON_MATERIAL_COSTS).map(([level, c]) => (
              <tr key={level}>
                <td>{level}단계</td>
                <td>{c.파괴석.toLocaleString()}</td>
                <td>{c.돌파석}</td>
                <td>{c.아비도스}</td>
                <td>{c.운명파편.toLocaleString()}</td>
                <td>{c.실링.toLocaleString()}</td>
                <td>{c.골드.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>계승 전 — 방어구</h3>
      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>목표 단계</th>
              <th>수호석</th>
              <th>돌파석</th>
              <th>아비도스</th>
              <th>운명 파편</th>
              <th>실링</th>
              <th>골드</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ARMOR_MATERIAL_COSTS).map(([level, c]) => (
              <tr key={level}>
                <td>{level}단계</td>
                <td>{c.수호석.toLocaleString()}</td>
                <td>{c.돌파석}</td>
                <td>{c.아비도스}</td>
                <td>{c.운명파편.toLocaleString()}</td>
                <td>{c.실링.toLocaleString()}</td>
                <td>{c.골드.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>계승 후 — 무기</h3>
      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>목표 단계</th>
              <th>파괴석 결정</th>
              <th>위대한 돌파석</th>
              <th>상급 아비도스</th>
              <th>운명 파편</th>
              <th>실링</th>
              <th>골드</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SUCCESSION_WEAPON_MATERIAL_COSTS).map(([level, c]) => (
              <tr key={level}>
                <td>{level}단계</td>
                <td>{c.파괴석결정.toLocaleString()}</td>
                <td>{c.위대한돌파석}</td>
                <td>{c.상급아비도스}</td>
                <td>{c.운명파편.toLocaleString()}</td>
                <td>{c.실링.toLocaleString()}</td>
                <td>{c.골드.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>계승 후 — 방어구</h3>
      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>목표 단계</th>
              <th>수호석 결정</th>
              <th>위대한 돌파석</th>
              <th>상급 아비도스</th>
              <th>운명 파편</th>
              <th>실링</th>
              <th>골드</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SUCCESSION_ARMOR_MATERIAL_COSTS).map(([level, c]) => (
              <tr key={level}>
                <td>{level}단계</td>
                <td>{c.수호석결정.toLocaleString()}</td>
                <td>{c.위대한돌파석}</td>
                <td>{c.상급아비도스}</td>
                <td>{c.운명파편.toLocaleString()}</td>
                <td>{c.실링.toLocaleString()}</td>
                <td>{c.골드.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>일반 재련의 확률 구조</h2>
      <p>
        계승 전에는 {PROB_LEVELS[0]}→{PROB_LEVELS[0] + 1}단계가 {pct(BASE_PROBABILITY[PROB_LEVELS[0]])}로 가장 높고, 마지막
        구간은 {pct(BASE_PROBABILITY[PROB_LEVELS[PROB_LEVELS.length - 1]])}까지 떨어집니다. 계승 후에는{' '}
        {SUCC_LEVELS[0]}→{SUCC_LEVELS[0] + 1}단계부터 {pct(SUCCESSION_BASE_PROBABILITY[SUCC_LEVELS[0]])}로 다시 시작합니다.
        책·숨결을 쓰지 않은 기본 확률입니다.
      </p>
      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>재련 구간</th>
            <th>계승 전 확률</th>
            <th>계승 후 확률</th>
          </tr>
        </thead>
        <tbody>
          {PROB_LEVELS.map((level) => (
            <tr key={level}>
              <td>
                {level}→{level + 1}단계
              </td>
              <td>{pct(BASE_PROBABILITY[level])}</td>
              <td>
                {SUCCESSION_BASE_PROBABILITY[level] !== undefined ? pct(SUCCESSION_BASE_PROBABILITY[level]) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>계승 후, 비용은 어디에 몰리나</h2>
      <p>
        확률이 떨어지는 속도가 1회 비용이 오르는 속도보다 훨씬 빠릅니다. {FIRST.level}→{FIRST.level + 1} 단계와{' '}
        {LAST.level}→{LAST.level + 1} 단계를 비교하면 1회 골드는{' '}
        {(LAST.goldPerTry / FIRST.goldPerTry).toFixed(1)}배 오르는 데 그치지만 평균 시도는{' '}
        {(LAST.avgNone / FIRST.avgNone).toFixed(1)}배로 늘어납니다. 두 값을 곱한 단계별 기대 골드를 보면 비용이 뒤쪽에 몰리는
        모양이 뚜렷합니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>단계</th>
              <th>기본 확률</th>
              <th>평균 (노숨 / 풀숨)</th>
              <th>천장 (노숨)</th>
              <th>무기 기대 골드</th>
            </tr>
          </thead>
          <tbody>
            {SUCC_ROWS.map((r) => (
              <tr key={r.level}>
                <td style={{ fontWeight: 600 }}>
                  {r.level}→{r.level + 1}
                </td>
                <td>{pct(r.prob)}</td>
                <td>
                  {tries(r.avgNone)} / {tries(r.avgFull)}회
                </td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(r.pityNone / MAX_PITY) * 100}px` }} />
                    <span className={styles.barText}>{r.pityNone}회</span>
                  </div>
                </td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(r.expGold / TOTAL_GOLD / MAX_GOLD_SHARE) * 100}px` }}
                    />
                    <span className={styles.barText}>
                      {fmt(r.expGold)} ({share(r.expGold / TOTAL_GOLD)})
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        계승 후 무기, 기대 골드 = 평균 시도(노숨) × 1회 골드. 재료·성장 비용 제외
      </p>

      <p>
        {LOW_FROM.level}→{LOW_FROM.level + 1}부터 마지막까지, 즉 확률이 {pct(LOW_FROM.prob)} 이하인 구간이 전체 골드의{' '}
        {share(LOW_SHARE)}를 차지합니다. 마지막 두 단계만 떼어 봐도 {share(LAST_TWO_SHARE)}입니다. 같은 한 단계라도 마지막 단계의
        기대 골드는 첫 단계의 {(LAST.expGold / FIRST.expGold).toFixed(0)}배라, 예산이 빠듯하다면 뒤쪽 단계부터 계획을 다시 보는
        편이 효과가 큽니다. 천장도 같은 모양이라 {pct(LAST.prob)} 구간은 운이 나쁘면 {LAST.pityNone}회까지 갑니다.
      </p>

      <h2>장인의 기운(장기백)이란?</h2>
      <p>
        시도할 때마다 그 순간의 최종 성공 확률을 {JANGIN_ACCUMULATE_DIVIDER}로 나눈 만큼 장인의 기운이 쌓이고, 100%가 되면
        다음 시도는 확정 성공합니다. 여기에 실패할 때마다 성공 확률이 기본 확률의 10%씩 올라 두 배에서 멈추는 보정이
        겹칩니다. 그래서 천장은 &quot;기본 확률로만 게이지를 채우는&quot; 단순 계산보다 빨리 옵니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>기본 확률</th>
            <th>단순 계산 천장</th>
            <th>실제 천장</th>
            <th>평균 시도</th>
          </tr>
        </thead>
        <tbody>
          {PITY_BY_PROB.map((r) => (
            <tr key={r.prob}>
              <td style={{ fontWeight: 600 }}>{pct(r.prob)}</td>
              <td>{r.naive}회</td>
              <td>{r.pity}회</td>
              <td>{tries(r.avg)}회</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.tableCaption}>숨결·책 미사용. 단순 계산 = 기본 확률 ÷ {JANGIN_ACCUMULATE_DIVIDER}로만 게이지를 채웠을 때</p>

      <p>
        예를 들어 {pct(TOP.prob)} 구간은 기본 확률로만 채우면 {TOP.naive}회째에 확정이 나오지만, 실패 보정으로 확률이 계속
        오르기 때문에 실제 천장은 {TOP.pity}회입니다. 재료를 천장 기준으로 준비할 때는 이 실제 값을 써야 과하게 쌓아 두지
        않습니다.
      </p>

      <h2>재련 책과 숨결 활용법</h2>
      <p>
        <strong>재련 책</strong>은 기본 확률만큼을 더해 주어 확률을 두 배로 만듭니다. 계승 전 업화 책은 11~20단계, 계승 후 전율
        책은 {BOOK_ROWS[0]?.level}~{BOOK_ROWS[BOOK_ROWS.length - 1]?.level}단계(도전 {(BOOK_ROWS[0]?.level ?? 0) + 1}~
        {(BOOK_ROWS[BOOK_ROWS.length - 1]?.level ?? 0) + 1}단계)에서만 쓸 수 있습니다.{' '}
        <strong>숨결</strong>은 전 구간에서 쓸 수 있고, 구간마다 최대 개수와 개당 상승폭이 다릅니다.
      </p>
      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>기본 확률 구간</th>
            <th>최대 투입 개수</th>
            <th>개당 확률 상승</th>
            <th>최대 투입 시 총 상승</th>
          </tr>
        </thead>
        <tbody>
          {BREATH_PROBS.map((prob) => {
            const e = getBreathEffect(prob);
            return (
              <tr key={prob}>
                <td>{pct(prob)}</td>
                <td>{e.max}개</td>
                <td>+{pct(e.per)}</td>
                <td>+{pct(e.max * e.per)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        계승 후에는 3% 구간만 다르게 적용됩니다. 최대 {getSuccessionBreathEffect(0.03).max}개까지 넣을 수 있고 개당 +
        {pct(getSuccessionBreathEffect(0.03).per)}씩 오릅니다. 표를 보면 0.5% 구간을 뺀 모든 구간에서 숨결을 가득 넣은
        상승폭이 기본 확률과 같습니다.
      </p>

      {BOOK_EQUALS_BREATH && BOOK_ROWS.length > 0 && (
        <div className={styles.noteBox}>
          <p>
            그래서 계승 후 책이 있는 {BOOK_ROWS[0].level}~{BOOK_ROWS[BOOK_ROWS.length - 1].level}단계에서는 책 한 권과 풀숨이
            평균 시도를 똑같이 줄입니다(+{BOOK_ROWS[0].level} 기준 {tries(BOOK_ROWS[0].avgNone)}회 →{' '}
            {tries(BOOK_ROWS[0].avgFull)}회). 둘 중 하나만 쓴다면 &quot;책 1권 값&quot;과 &quot;숨결{' '}
            {getSuccessionBreathEffect(BOOK_ROWS[0].prob).max}개 값&quot; 중 싼 쪽을 고르면 되고, 둘 다 쓰면 기본 확률이 세 배가
            됩니다. 시뮬레이터의 보조재료 최적화가 이 비교를 현재 시세로 대신 해 줍니다.
          </p>
        </div>
      )}

      <h2>일반 재련 vs 상급 재련</h2>
      <p>
        상급 재련은 실패가 없습니다. 시도마다 성공·대성공·초대성공 중 하나로 경험치가 쌓이고, 요구 경험치를 채우면 다음
        단계로 넘어갑니다. 운이 나빠도 최소한의 진행이 보장되는 대신 재료 소모와 진행 방식이 일반 재련과 전혀 다르므로, 두
        방식의 예상 비용은 시뮬레이터에서 같은 목표로 비교해 보는 편이 정확합니다.
      </p>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 평균은 운이 나쁜 경우를 대비한 값이 아닙니다. 계산기의 계산 모드를 중앙값·평균·천장으로
          바꿔 가며 세 값을 함께 보고, 특히 확률 {pct(LOW_FROM.prob)} 이하 단계는 천장 쪽 예산까지 확인해 두는 편이 안전합니다.
        </p>
      </div>
    </div>
  );
}
