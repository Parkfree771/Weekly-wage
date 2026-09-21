import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import {
  SUCCESS_RATES,
  SUCCESS_EXP,
  ANCESTOR_CARDS_1_20,
  ANCESTOR_CARDS_21_40,
  AVERAGE_TRIES_1_20,
  AVERAGE_TRIES_21_40,
  TURN_RATIO_1_20,
  TURN_RATIO_21_40,
  TURNS_FOR_BONUS,
  GAHO_CHARGE_PER_TURN,
  EXP_PER_LEVEL,
  EXP_PER_STAGE,
  ARMOR_MATERIALS,
  WEAPON_MATERIALS,
  type MaterialCombo,
} from '@/lib/advancedRefiningData';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '상급 재련 선조의 가호 구조와 숨결·책 투입 순서 정리',
  description:
    '상급 재련이 성공·실패가 아니라 경험치 누적으로 돌아가는 구조를 정리하고, 숨결과 책을 넣었을 때 시도 1회의 기대 경험치가 얼마나 오르는지 계산했습니다. 일반턴과 선조턴 중 어디에 보조 재료를 넣어야 시도 횟수가 더 줄어드는지도 조합 16가지 평균 시도 횟수로 비교했습니다.',
  keywords:
    '상급 재련, 선조의 가호, 선조 카드, 갈라투르, 겔라르, 쿠훔바르, 테메르, 나베르, 에베르, 상급 재련 숨결, 상급 재련 책, 야금술, 재봉술, 상급 재련 평균 시도, 로아 상급 재련',
  alternates: { canonical: '/guide/advanced-refining-ancestor' },
};

const COMBO_LABEL: Record<MaterialCombo, string> = {
  none: '아무것도 안 넣음',
  breath: '숨결만',
  book: '책만',
  both: '숨결 + 책',
};

const COMBOS: MaterialCombo[] = ['none', 'breath', 'book', 'both'];

/** 시도 1회의 기대 경험치 — 성공 등급 확률 × 등급별 경험치 */
const expectedExp = (combo: MaterialCombo) => {
  const r = SUCCESS_RATES[combo];
  return r.success * SUCCESS_EXP.success + r.great * SUCCESS_EXP.great + r.super * SUCCESS_EXP.super;
};

const BASE_EXP = expectedExp('none');

/** 일반턴 조합 × 선조턴 조합 평균 시도 횟수 */
const triesOf = (table: Record<string, number>, normal: MaterialCombo, bonus: MaterialCombo) =>
  table[`${normal}_${bonus}`];

const STAGE_KEYS = ['1-10', '11-20', '21-30', '31-40'] as const;

export default function AdvancedRefiningAncestorGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>재련</span>
          <h1 className={styles.articleTitle}>상급 재련 선조의 가호 구조와 숨결·책 투입 순서</h1>
          <span className={styles.articleDate}>2026년 9월 21일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            상급 재련은 일반 재련과 완전히 다른 방식으로 돌아갑니다. 일반 재련이 확률에 걸어 성공하면
            한 단계가 오르고 실패하면 장인의 기운만 쌓이는 구조라면, 상급 재련에는 실패가 없습니다.
            누르면 반드시 경험치가 들어오고, 그 경험치가 쌓여 단계가 오릅니다. 그래서 &quot;몇 퍼센트짜리를
            뚫는다&quot;는 감각이 아니라 &quot;경험치를 얼마나 싸게 채우느냐&quot;의 문제가 됩니다.
          </p>
          <p>
            이 글에서는 경험치가 어떤 규칙으로 들어오는지, 숨결과 책이 그 값을 얼마나 끌어올리는지,
            그리고 보조 재료를 일반턴과 선조턴 중 어디에 넣어야 전체 시도 횟수가 줄어드는지를
            정리합니다.
          </p>

          <h2>한 단계는 경험치 {EXP_PER_LEVEL}, 한 구간은 {EXP_PER_STAGE}</h2>
          <p>
            상급 재련은 단계마다 경험치 {EXP_PER_LEVEL}이 필요하고, 10단계가 모여 한 구간이 되므로
            구간 하나를 통과하려면 경험치 {EXP_PER_STAGE.toLocaleString()}을 채워야 합니다. 시도할
            때마다 성공·대성공·초대성공 중 하나가 뜨고, 등급에 따라 들어오는 경험치가 다릅니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>성공 등급</th>
                  <th>획득 경험치</th>
                  <th>단계 환산</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>성공</strong></td>
                  <td>{SUCCESS_EXP.success}</td>
                  <td>{EXP_PER_LEVEL / SUCCESS_EXP.success}번 모으면 1단계</td>
                </tr>
                <tr>
                  <td><strong>대성공</strong></td>
                  <td>{SUCCESS_EXP.great}</td>
                  <td>{EXP_PER_LEVEL / SUCCESS_EXP.great}번 모으면 1단계</td>
                </tr>
                <tr>
                  <td><strong>초대성공</strong></td>
                  <td>{SUCCESS_EXP.super}</td>
                  <td>{EXP_PER_LEVEL / SUCCESS_EXP.super}번 남짓이면 1단계</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>숨결과 책은 확률이 아니라 등급을 바꾼다</h2>
          <p>
            상급 재련에서 보조 재료는 성공 확률을 올리는 물건이 아닙니다. 성공은 어차피 확정이고,
            숨결과 책은 <strong>어떤 등급으로 성공할지</strong>의 분포를 바꿉니다. 아래가 조합별
            등급 확률이고, 여기에 등급별 경험치를 곱하면 시도 1회의 기대 경험치가 나옵니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>투입</th>
                  <th>성공</th>
                  <th>대성공</th>
                  <th>초대성공</th>
                  <th>기대 경험치</th>
                  <th>기본 대비</th>
                </tr>
              </thead>
              <tbody>
                {COMBOS.map((c) => {
                  const r = SUCCESS_RATES[c];
                  const exp = expectedExp(c);
                  return (
                    <tr key={c}>
                      <td><strong>{COMBO_LABEL[c]}</strong></td>
                      <td>{(r.success * 100).toFixed(0)}%</td>
                      <td>{(r.great * 100).toFixed(0)}%</td>
                      <td>{(r.super * 100).toFixed(0)}%</td>
                      <td>{exp.toFixed(1)}</td>
                      <td>{(exp / BASE_EXP).toFixed(2)}배</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p>
            아무것도 넣지 않으면 시도당 기대 경험치가 {BASE_EXP.toFixed(0)}입니다. 숨결과 책을 함께
            넣으면 {expectedExp('both').toFixed(0)}으로, 정확히{' '}
            {(expectedExp('both') / BASE_EXP).toFixed(2)}배가 됩니다. 눈에 띄는 것은 둘 다 넣었을 때
            일반 성공 확률이 0%가 된다는 점입니다. 반드시 대성공 이상이 뜹니다.
          </p>
          <p>
            책만 넣는 쪽({expectedExp('book').toFixed(0)})이 숨결만 넣는 쪽(
            {expectedExp('breath').toFixed(0)})보다 기대 경험치가 높다는 것도 기억해 둘 만합니다.
            다만 책은 야금술·재봉술 등급이 구간마다 달라 값도 달라지므로, 어느 쪽이 이득인지는
            그날 시세를 봐야 결정됩니다.
          </p>

          <h2>선조턴은 몇 번에 한 번 오나</h2>
          <p>
            상급 재련에는 일반턴과 선조턴이 있습니다. 일반턴을 한 번 쓸 때마다 선조의 가호 기운이{' '}
            {GAHO_CHARGE_PER_TURN}칸씩 차고, {TURNS_FOR_BONUS}칸이 되면 다음 시도가 선조턴이 됩니다.
            산술적으로는 일반턴 {TURNS_FOR_BONUS / GAHO_CHARGE_PER_TURN}번마다 선조턴 1번입니다.
          </p>
          <p>
            그런데 실제 비율은 이 값과 다릅니다. 선조 카드 중에 가호를 재충전하거나 다음 시도를
            공짜로 만들어 주는 것이 섞여 있어서, 돌려 보면 선조턴 비중이 계산보다 높게 나옵니다.
            로아로골은 조합별로 100만 회씩 시뮬레이션을 돌려 이 비율을 실측했습니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구간</th>
                  <th>일반턴 비중</th>
                  <th>선조턴 비중</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>1~20단계</strong></td>
                  <td>{(TURN_RATIO_1_20.normal * 100).toFixed(1)}%</td>
                  <td>{(TURN_RATIO_1_20.bonus * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td><strong>21~40단계</strong></td>
                  <td>{(TURN_RATIO_21_40.normal * 100).toFixed(1)}%</td>
                  <td>{(TURN_RATIO_21_40.bonus * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            21단계 위로 올라가면 선조턴 비중이{' '}
            {(TURN_RATIO_1_20.bonus * 100).toFixed(1)}%에서{' '}
            {(TURN_RATIO_21_40.bonus * 100).toFixed(1)}%로 늘어납니다. 이 구간부터 나베르와 에베르가
            카드 풀에 추가되고, 쿠훔바르와 나베르가 가호를 재충전해 주기 때문입니다.
          </p>

          <h2>선조 카드 확률</h2>
          <p>
            선조턴에는 카드가 한 장 뽑힙니다. 1~20단계는 4종, 21~40단계는 6종이고 확률 배분도
            다릅니다.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>카드</th>
                  <th>효과</th>
                  <th>1~20단계</th>
                  <th>21~40단계</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(ANCESTOR_CARDS_21_40) as (keyof typeof ANCESTOR_CARDS_21_40)[]).map(
                  (key) => {
                    const late = ANCESTOR_CARDS_21_40[key];
                    const early = (ANCESTOR_CARDS_1_20 as Record<string, { probability: number }>)[key];
                    return (
                      <tr key={key}>
                        <td><strong>{late.name}</strong></td>
                        <td>{late.effect}</td>
                        <td>{early ? `${(early.probability * 100).toFixed(1)}%` : '없음'}</td>
                        <td>{(late.probability * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          <p>
            경험치를 배수로 불리는 갈라투르와 겔라르는 선조턴에 보조 재료를 넣어 두었을 때 값어치가
            커집니다. 기본 경험치가 클수록 곱해지는 값도 커지기 때문입니다. 반대로 쿠훔바르와
            테메르는 고정값을 더하는 방식이라 보조 재료 투입과 무관하게 같은 양이 들어옵니다.
            나베르가 뜨면 다음 선조턴의 카드가 강화판으로 바뀌어 갈라투르가 경험치 7배,
            겔라르가 5배가 됩니다.
          </p>

          <h2>보조 재료는 일반턴에 먼저 넣는다</h2>
          <p>
            여기가 이 글의 핵심입니다. 숨결과 책을 일반턴에만 넣을지, 선조턴에만 넣을지, 양쪽 다
            넣을지에 따라 구간 하나를 끝내는 데 필요한 평균 유료 시도 횟수가 달라집니다. 아래는
            조합별 평균 시도 횟수를 정리한 표입니다. 가로가 선조턴 투입, 세로가 일반턴 투입입니다.
          </p>

          <h3>1~20단계</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>일반턴 투입</th>
                  {COMBOS.map((c) => (
                    <th key={c}>{COMBO_LABEL[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMBOS.map((n) => (
                  <tr key={n}>
                    <td><strong>{COMBO_LABEL[n]}</strong></td>
                    {COMBOS.map((b) => (
                      <td key={b}>{triesOf(AVERAGE_TRIES_1_20, n, b).toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>21~40단계</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>일반턴 투입</th>
                  {COMBOS.map((c) => (
                    <th key={c}>{COMBO_LABEL[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMBOS.map((n) => (
                  <tr key={n}>
                    <td><strong>{COMBO_LABEL[n]}</strong></td>
                    {COMBOS.map((b) => (
                      <td key={b}>{triesOf(AVERAGE_TRIES_21_40, n, b).toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            표에서 두 칸만 비교하면 결론이 바로 나옵니다. 1~20단계에서 보조 재료를 일반턴에만 넣으면
            평균 {triesOf(AVERAGE_TRIES_1_20, 'both', 'none').toFixed(1)}회, 선조턴에만 넣으면{' '}
            {triesOf(AVERAGE_TRIES_1_20, 'none', 'both').toFixed(1)}회입니다. 같은 양을 쓰는데도
            일반턴 쪽이 {(
              triesOf(AVERAGE_TRIES_1_20, 'none', 'both') - triesOf(AVERAGE_TRIES_1_20, 'both', 'none')
            ).toFixed(1)}회 적습니다. 일반턴이 전체 시도의{' '}
            {(TURN_RATIO_1_20.normal * 100).toFixed(1)}%를 차지하니 당연한 결과입니다.
          </p>
          <p>
            21~40단계에서는 {triesOf(AVERAGE_TRIES_21_40, 'both', 'none').toFixed(1)}회 대{' '}
            {triesOf(AVERAGE_TRIES_21_40, 'none', 'both').toFixed(1)}회로 격차가{' '}
            {(
              triesOf(AVERAGE_TRIES_21_40, 'none', 'both') - triesOf(AVERAGE_TRIES_21_40, 'both', 'none')
            ).toFixed(1)}회까지 좁혀집니다. 선조턴 비중이 늘어난 만큼 선조턴 투자의 값어치도
            올라갔기 때문입니다. 그래도 순서는 바뀌지 않습니다. <strong>예산이 한정되어 있다면
            일반턴부터 채우는 것이 언제나 낫습니다.</strong>
          </p>
          <p>
            양쪽 모두 가득 채우면 1~20단계 기준{' '}
            {triesOf(AVERAGE_TRIES_1_20, 'both', 'both').toFixed(1)}회로, 아무것도 넣지 않은{' '}
            {triesOf(AVERAGE_TRIES_1_20, 'none', 'none').toFixed(1)}회의 절반 수준까지 내려갑니다.
            다만 시도 횟수가 절반이 된다고 비용이 절반이 되는 것은 아닙니다. 줄어든 시도마다
            숨결과 책 값이 추가로 붙기 때문에, 실제 이득은 그날 보조 재료 시세에 달려 있습니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골{' '}
              <Link href="/refining">T4 재련 시뮬레이터</Link>의 상급 재련 탭은 위 16가지 조합을
              전부 계산한 뒤 실시간 숨결·책 시세를 곱해 기대 비용이 가장 낮은 조합을 골라 줍니다.
              시세가 바뀌면 정답도 바뀌므로, 재련 전에 한 번 눌러 보는 편이 좋습니다.
            </p>
          </div>

          <h2>구간별 재료 소모량</h2>
          <p>
            시도 1회에 드는 재료는 구간이 올라갈수록 가파르게 늘어납니다. 21단계를 넘어가는 순간
            소모량이 크게 뛰므로, 위 평균 시도 횟수와 곱해 예산을 잡아야 합니다.
          </p>

          <h3>무기</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구간</th>
                  <th>파괴석</th>
                  <th>돌파석</th>
                  <th>아비도스</th>
                  <th>운명의 파편</th>
                  <th>골드</th>
                  <th>책</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_KEYS.map((k) => {
                  const w = WEAPON_MATERIALS[k];
                  return (
                    <tr key={k}>
                      <td><strong>{k}단계</strong></td>
                      <td>{w.파괴석.toLocaleString()}</td>
                      <td>{w.돌파석}</td>
                      <td>{w.아비도스}</td>
                      <td>{w.운명파편.toLocaleString()}</td>
                      <td>{w.골드.toLocaleString()}</td>
                      <td>{w.책}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3>방어구</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구간</th>
                  <th>수호석</th>
                  <th>돌파석</th>
                  <th>아비도스</th>
                  <th>운명의 파편</th>
                  <th>골드</th>
                  <th>책</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_KEYS.map((k) => {
                  const a = ARMOR_MATERIALS[k];
                  return (
                    <tr key={k}>
                      <td><strong>{k}단계</strong></td>
                      <td>{a.수호석.toLocaleString()}</td>
                      <td>{a.돌파석}</td>
                      <td>{a.아비도스}</td>
                      <td>{a.운명파편.toLocaleString()}</td>
                      <td>{a.골드.toLocaleString()}</td>
                      <td>{a.책}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p>
            무기 21~30단계는 한 번 누를 때 파괴석{' '}
            {WEAPON_MATERIALS['21-30'].파괴석.toLocaleString()}개가 나갑니다. 11~20단계(
            {WEAPON_MATERIALS['11-20'].파괴석.toLocaleString()}개)의 약{' '}
            {(WEAPON_MATERIALS['21-30'].파괴석 / WEAPON_MATERIALS['11-20'].파괴석).toFixed(1)}배입니다.
            평균 시도 횟수가 구간마다 크게 다르지 않다는 점을 생각하면, 21단계 진입이 실질적인
            비용 분기점입니다.
          </p>

          <h2>정리</h2>
          <ul>
            <li>상급 재련에 실패는 없고, 시도마다 경험치가 들어와 {EXP_PER_LEVEL}마다 한 단계 오릅니다.</li>
            <li>
              숨결·책은 확률이 아니라 성공 등급 분포를 바꿉니다. 둘 다 넣으면 기대 경험치가{' '}
              {(expectedExp('both') / BASE_EXP).toFixed(2)}배가 되고 일반 성공은 아예 나오지 않습니다.
            </li>
            <li>
              보조 재료는 일반턴에 먼저 넣습니다. 일반턴이 전체 시도의 68~74%를 차지하기 때문입니다.
            </li>
            <li>21단계 진입 시 시도당 재료 소모가 크게 뛰므로 예산을 따로 잡아야 합니다.</li>
          </ul>

          <div className={styles.guideCta}>
            <p>실시간 숨결·책 시세로 최적 투입 조합과 예상 비용을 계산해 보세요.</p>
            <Link href="/refining" className={styles.guideCtaLink}>
              T4 재련 시뮬레이터에서 직접 계산하기
            </Link>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "상급 재련 선조의 가호 구조와 숨결·책 투입 순서",
            "description": "상급 재련의 경험치 누적 구조와 선조 카드 확률, 숨결·책 조합별 기대 경험치와 평균 시도 횟수를 정리했습니다.",
            "datePublished": "2026-09-21",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/advanced-refining-ancestor`
          })
        }}
      />
    </div>
  );
}
