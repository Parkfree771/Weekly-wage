import styles from '@/app/guide/guide.module.css';

/**
 * LifeContentGuideBody — /life-master 도구 페이지 본문.
 *
 * 레시피·교환 비율은 components/life-master/LifeCraftCalculator.tsx 의 CRAFTING_INFO·EXCHANGE 와
 * 같은 값이다. 계산기가 클라이언트 컴포넌트라 상수를 가져올 수 없어 여기 한 벌을 두었다 —
 * 계산기 쪽 값이 바뀌면 이 두 표도 같이 고칠 것. 본문의 배수·비율은 전부 이 두 표에서 계산한다.
 * 시세는 쓰지 않는다 (목재 시세는 가격 히스토리에 없다). 그래서 이 글은 "시세가 어떻든 성립하는"
 * 손익분기 배수만 다룬다.
 */

const RECIPES = {
  normal: { name: '아비도스 융화 재료', abidos: 33, soft: 45, normal: 86, gold: 400, output: 10 },
  premium: { name: '상급 아비도스 융화 재료', abidos: 43, soft: 59, normal: 112, gold: 520, output: 10 },
} as const;

const EXCHANGE = {
  sturdyToNormal: { from: 5, to: 50 },
  softToNormal: { from: 25, to: 50 },
  normalToDust: { from: 100, to: 80 },
  softToDust: { from: 50, to: 80 },
  dustToSoft: { from: 100, to: 50 },
  dustToSturdy: { from: 100, to: 10 },
  dustToAbidos: { from: 100, to: 10 },
} as const;

const SALE_FEE = 0.05;

// ── 교환 비율에서 나오는 등가 관계 ──
const DUST_PER_NORMAL = EXCHANGE.normalToDust.to / EXCHANGE.normalToDust.from; // 목재 1개 → 가루
const DUST_PER_SOFT = EXCHANGE.softToDust.to / EXCHANGE.softToDust.from; // 부드러운 1개 → 가루
const DUST_PER_ABIDOS = EXCHANGE.dustToAbidos.from / EXCHANGE.dustToAbidos.to; // 아비도스 1개에 드는 가루
const NORMAL_PER_ABIDOS = DUST_PER_ABIDOS / DUST_PER_NORMAL;
const SOFT_PER_ABIDOS = DUST_PER_ABIDOS / DUST_PER_SOFT;
const SOFT_AS_NORMAL_DIRECT = EXCHANGE.softToNormal.to / EXCHANGE.softToNormal.from;
const SOFT_AS_NORMAL_DUST = DUST_PER_SOFT / DUST_PER_NORMAL;

// 왕복 손실 — 가루로 갔다가 되돌아오면 얼마나 남나
const SOFT_ROUNDTRIP = DUST_PER_SOFT * (EXCHANGE.dustToSoft.to / EXCHANGE.dustToSoft.from);
const NORMAL_VIA_STURDY =
  DUST_PER_NORMAL *
  (EXCHANGE.dustToSturdy.to / EXCHANGE.dustToSturdy.from) *
  (EXCHANGE.sturdyToNormal.to / EXCHANGE.sturdyToNormal.from);

// 가루가 남지 않는 최소 교환 묶음 — 재료→가루 n회가 가루→아비도스 교환 단위로 딱 떨어지는 n
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
function losslessBatch(src: { from: number; to: number }) {
  const dust = lcm(src.to, EXCHANGE.dustToAbidos.from);
  const times = dust / src.to;
  return { times, input: times * src.from, dust, abidos: (dust / EXCHANGE.dustToAbidos.from) * EXCHANGE.dustToAbidos.to };
}
const BATCH_NORMAL = losslessBatch(EXCHANGE.normalToDust);
const BATCH_SOFT = losslessBatch(EXCHANGE.softToDust);
// 교환 1회 가루가 가루→아비도스 단위에 모자라는 양
const ONE_SHOT_SHORT = EXCHANGE.dustToAbidos.from - (EXCHANGE.normalToDust.to % EXCHANGE.dustToAbidos.from);

// 상급 / 일반 레시피 배수
type Key = 'abidos' | 'soft' | 'normal' | 'gold';
const KEYS: { key: Key; label: string }[] = [
  { key: 'abidos', label: '아비도스 목재' },
  { key: 'soft', label: '부드러운 목재' },
  { key: 'normal', label: '목재' },
  { key: 'gold', label: '제작 골드' },
];
const RATIOS = KEYS.map(({ key, label }) => ({
  label,
  normal: RECIPES.normal[key],
  premium: RECIPES.premium[key],
  ratio: RECIPES.premium[key] / RECIPES.normal[key],
}));
const RATIO_MIN = Math.min(...RATIOS.map((r) => r.ratio));
const RATIO_MAX = Math.max(...RATIOS.map((r) => r.ratio));

// 레시피를 가루로 환산했을 때 재료별 무게 (교환 비율만으로 본 비중)
function dustWeight(r: (typeof RECIPES)['normal' | 'premium']) {
  const rows = [
    { label: '아비도스 목재', qty: r.abidos, dust: r.abidos * DUST_PER_ABIDOS },
    { label: '부드러운 목재', qty: r.soft, dust: r.soft * DUST_PER_SOFT },
    { label: '목재', qty: r.normal, dust: r.normal * DUST_PER_NORMAL },
  ];
  const total = rows.reduce((s, x) => s + x.dust, 0);
  return { rows: rows.map((x) => ({ ...x, share: x.dust / total })), total };
}
const WEIGHT_NORMAL = dustWeight(RECIPES.normal);
const WEIGHT_PREMIUM = dustWeight(RECIPES.premium);
const ABIDOS_SHARE = WEIGHT_NORMAL.rows[0].share;

const SELL_BREAKEVEN = 1 / (1 - SALE_FEE) - 1;

const num = (v: number, d = 2) => parseFloat(v.toFixed(d)).toLocaleString();
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

export default function LifeContentGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>생활 제작은 목재 세 가지의 교환 문제다</h2>
      <p>
        생활 콘텐츠는 생활 에너지를 써서 자원을 모으는 전투 밖 성장 수단입니다. 벌목·채광·고고학·낚시·수렵·채집이
        있고, 이 페이지가 다루는 아비도스 융화 재료는 그중 벌목에서 나오는 목재 세 가지로 만듭니다. 융화 재료는 T4
        재련 매 시도에 들어가는 재료라 수요가 끊기지 않습니다.
      </p>
      <p>
        제작 손익을 따지려면 먼저 세 목재가 서로 어떻게 바뀌는지를 알아야 합니다. 교환은 한 방향으로만 흐르는
        사다리 구조이고, 가운데 다리 역할을 하는 것이 생활의 가루(계산기에는 벌목의 가루로 표시)입니다.
      </p>

      <ol className={styles.stepFlow}>
        <li className={styles.stepItem}>
          <strong>목재</strong>
          {EXCHANGE.normalToDust.from}개 → 가루 {EXCHANGE.normalToDust.to}
          <br />
          1개 = 가루 {num(DUST_PER_NORMAL)}
        </li>
        <li className={styles.stepItem}>
          <strong>부드러운 목재</strong>
          {EXCHANGE.softToDust.from}개 → 가루 {EXCHANGE.softToDust.to}
          <br />
          1개 = 가루 {num(DUST_PER_SOFT)}
        </li>
        <li className={styles.stepItem}>
          <strong>생활의 가루</strong>
          {EXCHANGE.dustToAbidos.from}개 → 아비도스 {EXCHANGE.dustToAbidos.to}
          <br />
          아비도스 1개 = 가루 {num(DUST_PER_ABIDOS)}
        </li>
        <li className={styles.stepItem}>
          <strong>아비도스 목재</strong>
          목재 {num(NORMAL_PER_ABIDOS)}개 또는
          <br />
          부드러운 목재 {num(SOFT_PER_ABIDOS)}개 분량
        </li>
      </ol>

      <p>
        부드러운 목재는 목재로 직접 바꿔도({EXCHANGE.softToNormal.from}개 → {EXCHANGE.softToNormal.to}개) 1개가 목재{' '}
        {num(SOFT_AS_NORMAL_DIRECT)}개이고, 가루로 따져도 {num(DUST_PER_SOFT)} ÷ {num(DUST_PER_NORMAL)} = 목재{' '}
        {num(SOFT_AS_NORMAL_DUST)}개입니다. 두 경로가 같은 비율로 맞물려 있어서, 교환표 안에서 부드러운 목재는 언제나
        목재 {num(SOFT_AS_NORMAL_DIRECT)}개의 값어치로 움직입니다.
      </p>

      <h2>시세와 상관없이 성립하는 손익분기 배수</h2>
      <p>
        시세는 매일 바뀌지만, 교환 비율과 레시피는 고정입니다. 그래서 &quot;어느 쪽이 싸다&quot;의 기준선은 시세 비율
        몇 개로 미리 정리해 둘 수 있습니다.
      </p>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>가루 경유가 직접 구매보다 싼 조건</span>
          <span className={styles.statValue}>{num(NORMAL_PER_ABIDOS)}배</span>
          <span className={styles.statNote}>아비도스 시세 &gt; 목재 시세 × {num(NORMAL_PER_ABIDOS)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>부드러운 목재 경유 기준</span>
          <span className={styles.statValue}>{num(SOFT_PER_ABIDOS)}배</span>
          <span className={styles.statNote}>아비도스 시세 &gt; 부드러운 시세 × {num(SOFT_PER_ABIDOS)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>가루 재료로 부드러운 쪽이 나은 조건</span>
          <span className={styles.statValue}>{num(SOFT_AS_NORMAL_DUST)}배 미만</span>
          <span className={styles.statNote}>부드러운 시세 &lt; 목재 시세 × {num(SOFT_AS_NORMAL_DUST)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>판매 제작이 남는 조건</span>
          <span className={styles.statValue}>+{pct(SELL_BREAKEVEN)}</span>
          <span className={styles.statNote}>개당 제작비 대비 시세 여유, 수수료 {pct(SALE_FEE, 0)}</span>
        </div>
      </div>
      <p>
        계산기 사이드바의 &quot;생활의 가루 최적화&quot;가 하는 일이 첫 두 칸의 비교입니다. 목재 시세의{' '}
        {num(NORMAL_PER_ABIDOS)}배와 부드러운 목재 시세의 {num(SOFT_PER_ABIDOS)}배, 아비도스 목재 시세 가운데 가장 낮은
        값이 그날 아비도스 목재 1개의 실제 원가입니다. 판매 목적 제작은 수수료를 떼고도 남아야 하므로, 개당 제작비보다
        시세가 {pct(SELL_BREAKEVEN)} 이상 높아야 손해가 아닙니다. 직접 쓸 융화 재료라면 수수료가 없으니 시세가
        제작비보다 조금이라도 높으면 만드는 쪽이 이득입니다.
      </p>

      <h2>일반과 상급, 레시피는 약 {num(RATIO_MIN, 1)}배 차이</h2>
      <p>
        두 융화 재료 모두 한 번에 {RECIPES.normal.output}개가 완성됩니다. 들어가는 재료를 항목별로 나눠 보면 상급 쪽이
        모든 항목에서 거의 같은 배수만큼 많습니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>재료</th>
              <th>일반 (1회)</th>
              <th>상급 (1회)</th>
              <th>상급 ÷ 일반</th>
              <th>상급 완성품 1개당</th>
            </tr>
          </thead>
          <tbody>
            {RATIOS.map((r) => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td>{r.normal.toLocaleString()}</td>
                <td>{r.premium.toLocaleString()}</td>
                <td>{r.ratio.toFixed(3)}배</td>
                <td>{num(r.premium / RECIPES.premium.output, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>완성 수량은 두 레시피 모두 {RECIPES.normal.output}개</p>

      <p>
        배수가 {RATIO_MIN.toFixed(3)}에서 {RATIO_MAX.toFixed(3)} 사이에 모여 있어서, 상급 제작비는 목재 시세가 어떻게
        움직여도 일반 제작비의 약 {num(RATIO_MIN, 2)}배입니다. 따라서 판단 기준도 하나로 줄어듭니다. 상급 융화 재료
        시세가 일반 융화 재료 시세의 {num(RATIO_MAX, 2)}배보다 높으면 상급의 손익률이, {num(RATIO_MIN, 2)}배보다 낮으면
        일반의 손익률이 높습니다. 계산기에서 두 품목을 번갈아 선택해 비교하는 것과 같은 결론을 시세 두 개만 보고 낼 수
        있고, 두 배수 사이에 걸린 날만 계산기로 확인하면 됩니다.
      </p>

      <h2>제작비 대부분은 아비도스 목재에서 나온다</h2>
      <p>
        세 목재를 교환 비율로 같은 단위(생활의 가루)에 맞추면, 레시피 안에서 각 재료가 차지하는 무게가 보입니다.
        시세가 아니라 교환표만으로 본 비중이지만, 가루 경유가 원가를 정하는 날에는 이 비중이 그대로 원가 비중이
        됩니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>재료</th>
              <th>일반 레시피 (가루 환산)</th>
              <th>상급 레시피 (가루 환산)</th>
            </tr>
          </thead>
          <tbody>
            {WEIGHT_NORMAL.rows.map((r, i) => {
              const p = WEIGHT_PREMIUM.rows[i];
              return (
                <tr key={r.label}>
                  <td style={{ fontWeight: 600 }}>{r.label}</td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${r.share * 100}px` }} />
                      <span className={styles.barText}>
                        {num(r.dust, 1)} ({pct(r.share)})
                      </span>
                    </div>
                  </td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${p.share * 100}px` }} />
                      <span className={styles.barText}>
                        {num(p.dust, 1)} ({pct(p.share)})
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>
        아비도스 1개 = 가루 {num(DUST_PER_ABIDOS)}, 부드러운 1개 = 가루 {num(DUST_PER_SOFT)}, 목재 1개 = 가루{' '}
        {num(DUST_PER_NORMAL)} 기준
      </p>

      <p>
        개수로는 목재가 가장 많이 들지만, 무게로는 아비도스 목재가 약 {pct(ABIDOS_SHARE, 0)}를 차지합니다. 목재 원가가
        움직일 때 가장 크게 반영되는 것도 아비도스 목재이고, 가루 최적화로 아비도스 1개 원가를
        조금만 낮춰도 제작 1회 전체 원가가 눈에 띄게 내려가는 이유도 여기 있습니다.
      </p>

      <h2>가루는 {BATCH_NORMAL.times}회 단위로 바꿔야 남지 않는다</h2>
      <p>
        교환은 정해진 묶음 단위로만 됩니다. 목재 {EXCHANGE.normalToDust.from}개는 가루 {EXCHANGE.normalToDust.to}개가
        되는데, 아비도스 목재로 바꾸려면 가루가 {EXCHANGE.dustToAbidos.from}개 단위로 필요합니다. 1회만 바꾸면 가루가
        모자라고, 2회를 바꿔 아비도스로 한 번 교환하면 가루 {(EXCHANGE.normalToDust.to * 2) % EXCHANGE.dustToAbidos.from}
        개가 남습니다. 딱 떨어지는 최소 묶음은 아래와 같습니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>가루 재료</th>
            <th>교환 횟수</th>
            <th>투입</th>
            <th>가루</th>
            <th>아비도스 목재</th>
          </tr>
        </thead>
        <tbody>
          {[
            { label: '목재', b: BATCH_NORMAL },
            { label: '부드러운 목재', b: BATCH_SOFT },
          ].map(({ label, b }) => (
            <tr key={label}>
              <td style={{ fontWeight: 600 }}>{label}</td>
              <td>{b.times}회</td>
              <td>{b.input.toLocaleString()}개</td>
              <td>{b.dust.toLocaleString()}</td>
              <td>{b.abidos}개</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        두 경로 모두 재료→가루 교환 {BATCH_NORMAL.times}회가 가루 {BATCH_NORMAL.dust}개, 아비도스 목재{' '}
        {BATCH_NORMAL.abidos}개로 정확히 떨어집니다. 교환 1회에 나오는 가루 {EXCHANGE.normalToDust.to}개는{' '}
        {EXCHANGE.dustToAbidos.from}개 단위보다 {ONE_SHOT_SHORT}개 적고, 이 차이가 {BATCH_NORMAL.times}번 쌓여야 단위와
        맞아떨어지기 때문입니다. 남은 가루는 사라지지 않고 다음 교환에 이어서 쓸 수 있지만, 이번
        제작에 필요한 아비도스 목재 수를 맞추려고 교환 횟수를 잡을 때는 이 {BATCH_NORMAL.times}회 묶음을 기준으로 잡으면
        계산이 깔끔합니다.
      </p>

      <div className={styles.noteBox}>
        <p>
          교환은 되돌리면 손해입니다. 부드러운 목재를 가루로 바꿨다가 다시 부드러운 목재로 받으면{' '}
          {pct(SOFT_ROUNDTRIP, 0)}만 돌아오고, 목재를 가루 → 튼튼한 목재 → 목재로 한 바퀴 돌려도{' '}
          {pct(NORMAL_VIA_STURDY, 0)}만 남습니다. 모든 순환 경로가 {pct(1 - SOFT_ROUNDTRIP, 0)}씩 깎이는 구조라,
          교환은 부족한 재료를 채울 만큼만 하고 &quot;일단 가루로 바꿔 두는&quot; 식의 선교환은 피하는 편이 좋습니다.
        </p>
      </div>

      <h2>교환표 전체</h2>
      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>교환 종류</th>
            <th>지불</th>
            <th>획득</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2}>재료 → 가루</td>
            <td>목재 {EXCHANGE.normalToDust.from}개</td>
            <td>생활의 가루 {EXCHANGE.normalToDust.to}개</td>
          </tr>
          <tr>
            <td>부드러운 목재 {EXCHANGE.softToDust.from}개</td>
            <td>생활의 가루 {EXCHANGE.softToDust.to}개</td>
          </tr>
          <tr>
            <td rowSpan={3}>가루 → 재료</td>
            <td>생활의 가루 {EXCHANGE.dustToSoft.from}개</td>
            <td>부드러운 목재 {EXCHANGE.dustToSoft.to}개</td>
          </tr>
          <tr>
            <td>생활의 가루 {EXCHANGE.dustToSturdy.from}개</td>
            <td>튼튼한 목재 {EXCHANGE.dustToSturdy.to}개</td>
          </tr>
          <tr>
            <td>생활의 가루 {EXCHANGE.dustToAbidos.from}개</td>
            <td>아비도스 목재 {EXCHANGE.dustToAbidos.to}개</td>
          </tr>
          <tr>
            <td rowSpan={2}>재료 직접 교환</td>
            <td>부드러운 목재 {EXCHANGE.softToNormal.from}개</td>
            <td>목재 {EXCHANGE.softToNormal.to}개</td>
          </tr>
          <tr>
            <td>튼튼한 목재 {EXCHANGE.sturdyToNormal.from}개</td>
            <td>목재 {EXCHANGE.sturdyToNormal.to}개</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.tipBox}>
        <p>
          <strong>TIP:</strong> 보유 제작 모드에 가진 목재를 입력하면, 계산기가 위 교환표로 남는 재료를 가루로 돌려
          부족한 재료를 채우는 과정을 끝까지 시뮬레이션해 추가 제작 횟수와 교환창에서 눌러야 할 횟수를 알려 줍니다.
          위 손익분기 배수로 오늘 어느 경로가 싼지 먼저 가늠한 뒤 계산기 결과와 맞춰 보면 됩니다.
        </p>
      </div>
    </div>
  );
}
