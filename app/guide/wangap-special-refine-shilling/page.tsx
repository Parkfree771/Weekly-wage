import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '완갑 +20~+25 특재돌 배분과 실링 준비량 정리',
  description:
    '완갑 +21~+25 구간에서 실링이 얼마나 드는지 성장 비용과 강화 실링으로 나눠 계산하고, 숨결에 따라 달라지는 실링 총량을 정리했습니다. 특수 재련 한 단계에 필요한 특재돌 개수와 보유량별로 어느 단계에 쓰는 것이 가장 이득인지도 함께 다룹니다.',
  keywords:
    '로아 완갑, 완갑 실링, 완갑 특재, 완갑 특수 재련, 특재돌, 완갑 25강 실링, 완갑 성장 비용, 고대 완갑, 완갑 20강, 벨가르딘 완갑, 완갑 시뮬레이터',
  alternates: { canonical: '/guide/wangap-special-refine-shilling' },
};

interface ShillingStageRow {
  stage: string;
  growth: string;
  perTry: string;
  enhanceAvg: string;
}

/** 단계별 실링 — 성장 비용(1회 고정) · 1회 강화 실링 · 풀숨 평균 시도(21.6회) 기준 강화 실링 */
const SHILLING_STAGES: ShillingStageRow[] = [
  { stage: '+20 → +21', growth: '480만', perTry: '14.4만', enhanceAvg: '약 311만' },
  { stage: '+21 → +22', growth: '513만', perTry: '19.2만', enhanceAvg: '약 415만' },
  { stage: '+22 → +23', growth: '541만', perTry: '19.2만', enhanceAvg: '약 415만' },
  { stage: '+23 → +24', growth: '574만', perTry: '24만', enhanceAvg: '약 518만' },
  { stage: '+24 → +25', growth: '607만', perTry: '24만', enhanceAvg: '약 518만' },
];

interface SpecialPlanRow {
  owned: string;
  stages: string;
  used: string;
  saved: string;
}

/** 보유 특재돌별 배분 (평균 기준, 최적 숨결·재료 전부 구매일 때의 일반 강화 비용과 비교) */
const SPECIAL_PLANS: SpecialPlanRow[] = [
  { owned: '3,500개', stages: '배분 없음 (평균 4,667개가 필요해 한 단계도 못 채움)', used: '0개', saved: '0' },
  { owned: '5,000개', stages: '+24 → +25', used: '약 4,667개', saved: '약 143만' },
  { owned: '10,000개', stages: '+23 → +24, +24 → +25', used: '약 9,333개', saved: '약 283만' },
  { owned: '15,000개', stages: '+22 → +25 세 단계', used: '약 14,000개', saved: '약 418만' },
  { owned: '25,000개', stages: '+20 → +25 다섯 단계 전부', used: '약 23,333개', saved: '약 674만' },
];

export default function WangapSpecialRefineShillingGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>완갑</span>
          <h1 className={styles.articleTitle}>완갑 +20~+25 특재돌 배분과 실링 준비량 정리</h1>
          <span className={styles.articleDate}>2026년 9월 14일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            9월 15일 열리는 완갑 +21~+25 구간에서 골드만큼 발목을 잡는 것이 실링입니다. 성공 확률이 1.5%라 시도가 많고,
            한 번 누를 때 실링이 최대 24만씩 들며, 단계마다 성장 비용으로 480만~607만 실링을 따로 냅니다.
            이 글에서는 +20에서 +25까지 실링을 얼마나 준비해야 하는지와, 실링·재료가 전혀 들지 않는 특수 재련에
            특재돌을 어떻게 나눠 쓰면 좋은지를 정리했습니다.
          </p>
          <p>
            재료별 골드 비용과 숨결 투입 방법은{' '}
            <Link href="/guide/wangap-20-25-cases">완갑 +20에서 +25까지, 숨결·귀속 재료 상황별 강화 비용 정리</Link>에서 먼저 다뤘습니다.
            아래 수치도 같은 계산식과 2026년 9월 14일 거래소 시세를 사용했습니다.
          </p>

          <h2>실링은 두 군데서 나갑니다</h2>
          <p>
            완갑 강화의 실링은 단계를 시작할 때 한 번 내는 성장 비용과, 누를 때마다 내는 강화 실링으로 나뉩니다.
            성장 비용은 몇 번 만에 성공하든 똑같고, 강화 실링은 시도 횟수에 비례합니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>단계</th>
                <th>성장 비용 (1회)</th>
                <th>1회 강화 실링</th>
                <th>강화 실링 (풀숨 평균)</th>
              </tr>
            </thead>
            <tbody>
              {SHILLING_STAGES.map((s) => (
                <tr key={s.stage}>
                  <td>{s.stage}</td>
                  <td>{s.growth}</td>
                  <td>{s.perTry}</td>
                  <td>{s.enhanceAvg}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            성장 비용만 다섯 단계 합계 2,715만 실링이고, 운명의 파편도 271만 5천 개가 따로 듭니다. 이 부분은 특수 재련으로 성공해도 똑같이 냅니다.
            +23부터는 1회 강화 실링이 24만으로 올라, 강화 실링이 성장 비용과 비슷한 규모가 됩니다.
          </p>

          <h2>+20 → +25 실링 총량</h2>
          <p>성장 비용과 강화 실링을 합친 값입니다. 숨결을 얼마나 넣느냐에 따라 시도 횟수가 달라져 강화 실링이 크게 변합니다.</p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>숨결</th>
                <th>평균</th>
                <th>중앙값</th>
                <th>장인의 기운 100%</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>숨결 없음</td><td>5,977만</td><td>5,336만</td><td>1억 376만</td></tr>
              <tr><td>최적 숨결 (시세 기준)</td><td>5,197만</td><td>4,664만</td><td>8,739만</td></tr>
              <tr><td>매번 풀숨</td><td>4,890만</td><td>4,429만</td><td>7,856만</td></tr>
            </tbody>
          </table>
          <p>
            매번 풀숨으로 가면 숨결 없이 가는 것보다 평균 약 1,090만, 운이 나쁜 경우 약 2,520만 실링을 아낍니다.
            골드 기준으로는 숨결을 사서 넣어도 차이가 거의 없었지만, 실링 기준으로는 숨결이 확실히 이득입니다.
            실링은 거래소에서 살 수 없으니, 실링이 모자란 캐릭터라면 골드상 최적보다 풀숨 쪽으로 기우는 것이 맞습니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>넉넉하게는 8,000만~1억 실링을 잡아 두세요.</strong> 평균적으로는 5,000만 안팎이면 되지만,
              다섯 단계가 모두 장인의 기운 100%까지 가면 매번 풀숨이어도 7,856만, 숨결 없이는 1억 실링을 넘깁니다.
              중간에 실링이 끊기면 재료가 있어도 강화를 멈춰야 합니다.
            </p>
          </div>

          <h2>특수 재련: 실링도 재료도 들지 않는 대신 천장이 없다</h2>
          <p>
            특수 재련은 강화 재료·실링·골드를 쓰지 않고 특재돌만 소모합니다. 확률은 일반 강화의 기본 확률과 같은 1.5%로 고정이며,
            실패해도 확률이 오르지 않고 장인의 기운도 쌓이지 않습니다. 그래서 운이 나쁘면 끝없이 돌이 들어갈 수 있습니다.
          </p>
          <p>
            +20 이후 한 번 누를 때 드는 특재돌은 70개로 계산했습니다. 확인된 구간이 15% 50개, 10% 55개, 3%(+15~+20) 65개로
            확률 구간이 한 단계 내려갈 때마다 5개씩 늘었고, 그 규칙을 이어 붙인 값입니다. +21 이후는 아직 실측 전이라,
            실제 개수가 다르면 아래 수치도 그 비율만큼 달라집니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>한 단계 성공까지</th>
                <th>시도 횟수</th>
                <th>특재돌</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>절반이 성공하는 지점 (중앙값)</td><td>46회</td><td>3,220개</td></tr>
              <tr><td>평균</td><td>66.7회</td><td>4,667개</td></tr>
              <tr><td>열에 아홉이 성공하는 지점</td><td>153회</td><td>10,710개</td></tr>
            </tbody>
          </table>
          <p>
            평균이 4,667개인데 열에 한 번은 1만 개를 넘깁니다. 일반 강화는 운이 나빠도 장인의 기운 100%에서 끝나지만 특수 재련은 그런 끝이 없으니,
            갖고 있는 돌이 평균 필요량보다 넉넉할 때 쓰는 것이 안전합니다.
          </p>

          <h2>특재돌은 높은 단계에 아껴 쓰세요</h2>
          <p>
            특재돌을 어느 단계에 쓸지는 돌 1개가 아껴 주는 일반 강화 비용으로 정합니다. 뒤 단계일수록 한 번 누르는 재료가 많아
            같은 돌로 더 많은 골드를 아낍니다. 최적 숨결로 재료를 모두 사는 경우와 비교한 평균 기준 순위는 다음과 같습니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>단계</th>
                <th>일반 강화 평균 비용</th>
                <th>돌 1개당 아끼는 골드</th>
                <th>함께 아끼는 강화 실링</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>+24 → +25</td><td>약 143만</td><td>약 307골드</td><td>약 585만</td></tr>
              <tr><td>+23 → +24</td><td>약 139만</td><td>약 299골드</td><td>약 591만</td></tr>
              <tr><td>+22 → +23</td><td>약 135만</td><td>약 289골드</td><td>약 473만</td></tr>
              <tr><td>+21 → +22</td><td>약 130만</td><td>약 279골드</td><td>약 475만</td></tr>
              <tr><td>+20 → +21</td><td>약 126만</td><td>약 270골드</td><td>약 359만</td></tr>
            </tbody>
          </table>
          <p>
            차이가 크지는 않지만 순서는 분명합니다. +20부터 차례로 올라가야 하니, 앞 단계는 일반 강화로 넘기고 돌은 +24 → +25까지 모아 두는 것이 가장 이득입니다.
            +23 이후는 1회 강화 실링이 24만이라 특수 재련이 아껴 주는 실링도 가장 많습니다.
          </p>

          <h2>보유 특재돌별로 쓸 단계</h2>
          <p>평균 필요량 기준으로 보유한 돌을 효율이 높은 단계부터 채운 결과입니다.</p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>보유량</th>
                <th>특수 재련할 단계</th>
                <th>평균 사용량</th>
                <th>아끼는 골드</th>
              </tr>
            </thead>
            <tbody>
              {SPECIAL_PLANS.map((p) => (
                <tr key={p.owned}>
                  <td>{p.owned}</td>
                  <td>{p.stages}</td>
                  <td>{p.used}</td>
                  <td>{p.saved}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            평균이 아니라 중앙값(절반이 성공하는 지점)으로 잡으면 3,500개로도 +24 → +25 한 단계를 노려볼 수 있고, 이때 약 115만 골드를 아낍니다.
            다만 중앙값은 절반 가까이가 3,220개 안에 끝나지 않는다는 뜻이라, 돌이 모자랄 가능성을 감안하고 선택하세요.
          </p>

          <h2>정리</h2>
          <ul>
            <li>+20 → +25 성장 비용만 2,715만 실링이고, 강화 실링까지 합치면 평균 4,900만~6,000만, 운이 나쁘면 1억 실링까지 듭니다.</li>
            <li>숨결은 골드보다 실링을 크게 아낍니다. 매번 풀숨이면 평균 약 1,090만 실링이 줄어듭니다.</li>
            <li>특수 재련은 한 단계 평균 4,667개(1회 70개 가정)지만 천장이 없어 열에 한 번은 1만 개를 넘깁니다.</li>
            <li>특재돌은 +24 → +25처럼 높은 단계에 쓸수록 돌 1개당 아끼는 골드와 실링이 많습니다.</li>
          </ul>

          <div className={styles.guideCta}>
            <p>보유 특재돌 개수를 넣으면 어느 단계를 특수 재련할지 자동으로 골라 주고, 실링까지 포함한 필요 재료를 계산합니다.</p>
            <Link href="/wangap" className={styles.guideCtaLink}>
              완갑 재련 시뮬레이터 바로가기
            </Link>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: '완갑 +20~+25 특재돌 배분과 실링 준비량 정리',
            description:
              '완갑 +21~+25 구간의 성장 비용·강화 실링 총량을 숨결별로 계산하고, 특수 재련 한 단계에 필요한 특재돌과 보유량별 최적 배분 단계를 정리했습니다.',
            datePublished: '2026-09-14',
            dateModified: '2026-09-14',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/wangap-special-refine-shilling`,
          }),
        }}
      />
    </div>
  );
}
