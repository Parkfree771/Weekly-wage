import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '완갑 +20에서 +25까지, 숨결·귀속 재료 상황별 강화 비용 정리',
  description:
    '9월 15일 열리는 완갑 +21~+25 강화를 숨결 사용 여부, 귀속 숨결 보유, 파괴석·수호석 결정 귀속 여부로 나눠 평균·중앙값·장인의 기운 100% 기준 골드를 계산했습니다. 단계별 1회 재료와 성공 확률, 숨결을 몇 번째 시도까지 넣는 게 이득인지도 정리했습니다.',
  keywords:
    '로아 완갑, 완갑 25강, 완갑 20강, 완갑 강화 비용, 완갑 숨결, 고대 완갑, 완갑 파괴석 결정, 완갑 수호석 결정, 완갑 장기백, 벨가르딘 완갑, 완갑 시뮬레이터',
  alternates: { canonical: '/guide/wangap-20-25-cases' },
};

interface StageRow {
  stage: string;
  destruction: string;
  guardian: string;
  breakthrough: string;
  abidos: string;
  shard: string;
  gold: string;
  perTry: string;
}

/** 단계별 1회 강화 재료 (공식 데이터) + 2026-09-14 거래소 시세 기준 1회 골드 환산 */
const STAGES: StageRow[] = [
  { stage: '+20 → +21', destruction: '1,125', guardian: '3,505', breakthrough: '76', abidos: '50', shard: '32,650', gold: '11,270', perTry: '39,630' },
  { stage: '+21 → +22', destruction: '1,160', guardian: '3,625', breakthrough: '80', abidos: '53', shard: '34,020', gold: '11,720', perTry: '41,302' },
  { stage: '+22 → +23', destruction: '1,200', guardian: '3,750', breakthrough: '84', abidos: '56', shard: '35,440', gold: '12,180', perTry: '43,043' },
  { stage: '+23 → +24', destruction: '1,240', guardian: '3,880', breakthrough: '89', abidos: '59', shard: '36,920', gold: '12,660', perTry: '44,827' },
  { stage: '+24 → +25', destruction: '1,280', guardian: '4,015', breakthrough: '94', abidos: '62', shard: '38,470', gold: '13,160', perTry: '46,642' },
];

interface CaseRow {
  name: string;
  average: string;
  median: string;
  pity: string;
}

/** +20 → +25 전 구간 골드 (강화 재료 + 누르는 골드, 실링·성장 비용 제외) */
const CASES: CaseRow[] = [
  { name: '숨결 없이, 재료 전부 구매', average: '697만', median: '560만', pity: '1,637만' },
  { name: '매번 풀숨, 재료·숨결 전부 구매', average: '689만', median: '544만', pity: '1,622만' },
  { name: '최적 숨결, 재료·숨결 전부 구매', average: '674만', median: '542만', pity: '1,583만' },
  { name: '귀속 숨결로 매번 풀숨', average: '465만', median: '366만', pity: '1,099만' },
  { name: '파괴석 결정 귀속 + 최적 숨결', average: '509만', median: '414만', pity: '1,189만' },
  { name: '파괴석·수호석 결정 귀속 + 최적 숨결', average: '430만', median: '351만', pity: '1,001만' },
  { name: '숨결·파괴석·수호석 결정 모두 귀속', average: '283만', median: '223만', pity: '669만' },
];

export default function Wangap2025CasesGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>완갑</span>
          <h1 className={styles.articleTitle}>완갑 +20에서 +25까지, 숨결·귀속 재료 상황별 강화 비용 정리</h1>
          <span className={styles.articleDate}>2026년 9월 14일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            9월 15일부터 고대 완갑의 +21~+25 강화가 열립니다. 이 구간은 성공 확률이 1.5%로 완갑에서 가장 낮고,
            한 번 누를 때 드는 재료도 가장 많습니다. 그래서 같은 +25를 가도 숨결을 얼마나 갖고 있는지,
            파괴석 결정이 귀속인지에 따라 드는 골드가 두 배 넘게 벌어집니다.
          </p>
          <p>
            아래 수치는 모두 로아로골 완갑 평균 시뮬과 같은 계산식으로, 2026년 9월 14일 거래소 시세를 넣어 구했습니다.
            시세가 바뀌면 골드 값도 달라지므로, 표는 상황끼리 비교하는 용도로 보시고 정확한 값은 시뮬레이터에서 확인하세요.
          </p>

          <h2>+20 이후 한 번 누를 때 드는 재료</h2>
          <p>
            다섯 단계 모두 기본 성공 확률은 1.5%입니다. 실패할 때마다 확률이 기본값의 10%씩 올라 3%까지 오르고,
            장인의 기운이 100%가 되면 다음 시도는 반드시 성공합니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>단계</th>
                  <th>파괴석 결정</th>
                  <th>수호석 결정</th>
                  <th>위대한 돌파석</th>
                  <th>상급 아비도스</th>
                  <th>운명의 파편</th>
                  <th>누르는 골드</th>
                  <th>1회 골드 환산</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((s) => (
                  <tr key={s.stage}>
                    <td>{s.stage}</td>
                    <td>{s.destruction}</td>
                    <td>{s.guardian}</td>
                    <td>{s.breakthrough}</td>
                    <td>{s.abidos}</td>
                    <td>{s.shard}</td>
                    <td>{s.gold}</td>
                    <td>{s.perTry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            1회 골드 환산은 재료를 모두 사고 누르는 골드까지 더한 값입니다. 오늘 시세에서는 파괴석 결정이 한 번에 약 1.1만~1.3만 골드,
            상급 아비도스가 약 1만~1.2만 골드로 가장 큰 몫을 차지합니다. 수호석 결정은 개수는 가장 많지만 개당 1.3골드라 비중이 작습니다.
          </p>

          <h2>숨결을 넣으면 몇 번 만에 끝나나</h2>
          <p>
            +20 이후 구간은 용암의 숨결과 빙하의 숨결을 각각 30개까지, 합쳐서 60개 넣을 수 있습니다(제보 기준).
            60개를 다 넣으면 기본 확률이 1.5%에서 3%로 두 배가 됩니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>한 단계 기준</th>
                <th>숨결 없음</th>
                <th>매번 풀숨</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>절반이 끝나는 횟수 (중앙값)</td><td>26회</td><td>17회</td></tr>
              <tr><td>평균 시도 횟수</td><td>32.4회</td><td>21.6회</td></tr>
              <tr><td>장인의 기운 100%까지 (최악)</td><td>76회</td><td>51회</td></tr>
            </tbody>
          </table>
          <p>
            풀숨은 시도 횟수를 3분의 1가량 줄입니다. 한 단계를 풀숨으로 끝낼 때 숨결은 중앙값 기준 용암·빙하 각 510개,
            평균 각 약 650개, 최악의 경우 각 1,530개가 듭니다. +20에서 +25까지 다섯 단계를 풀숨으로 가면
            평균 각 3,220개, 최악의 경우 각 7,500개입니다.
          </p>

          <h2>상황별 +20 → +25 총 골드</h2>
          <p>
            아래 표는 강화 재료와 누르는 골드를 합친 값입니다. 실링과 단계마다 한 번 내는 성장 비용은 빠져 있습니다.
            귀속이라고 표시한 재료는 이미 갖고 있어 골드가 들지 않는다고 보고 계산했습니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>상황</th>
                  <th>평균</th>
                  <th>중앙값</th>
                  <th>장인의 기운 100%</th>
                </tr>
              </thead>
              <tbody>
                {CASES.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.average}</td>
                    <td>{c.median}</td>
                    <td>{c.pity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            눈에 띄는 점은 숨결을 사서 넣어도 골드는 거의 줄지 않는다는 것입니다. 숨결 없이 697만, 매번 풀숨이 689만으로 차이가 8만 골드뿐입니다.
            숨결 값만큼 재료 값이 줄어 서로 상쇄되기 때문입니다. 반대로 귀속 숨결이 있으면 465만으로 230만 골드 넘게 줄어듭니다.
          </p>

          <h2>숨결 상황별로 이렇게 넣으면 됩니다</h2>
          <h3>귀속 숨결이 넉넉하다</h3>
          <p>
            매 시도 용암 30개, 빙하 30개를 모두 넣으세요. 공짜 숨결은 확률을 올릴수록 무조건 이득이고,
            시도 횟수가 줄어드는 만큼 실링도 크게 아낍니다. 다섯 단계 평균 각 3,220개가 기준입니다.
          </p>
          <h3>숨결을 거래소에서 사야 한다</h3>
          <p>
            오늘 시세(용암 409골드, 빙하 288골드)로는 매번 풀숨이 가장 싼 방법이 아닙니다. 평균 시뮬의 최적 숨결 계산을 따르면
            단계마다 처음 5~8번째 시도까지만 용암·빙하를 30개씩 넣고, 그 뒤로는 빙하 30개만 넣는 것이 가장 쌉니다.
            실패가 쌓여 확률이 오르면 비싼 용암의 숨결이 올려 주는 확률의 값어치가 떨어지기 때문입니다.
            이렇게 하면 다섯 단계 평균 용암 약 900개, 빙하 약 3,700개를 쓰고 674만 골드로 끝납니다.
          </p>
          <h3>숨결이 조금만 있다</h3>
          <p>
            갖고 있는 숨결은 단계 초반 시도에 몰아 넣는 것이 좋습니다. 숨결 60개가 올려 주는 확률은 몇 번째 시도든 1.5%p로 같지만,
            앞쪽 시도에서 성공하면 그 뒤에 남은 수십 번의 시도를 통째로 아끼게 됩니다. 뒤쪽 시도는 장인의 기운이 이미 차 있어
            어차피 곧 끝날 단계라, 같은 숨결로 아끼는 시도 수가 적습니다.
          </p>

          <h2>파괴석·수호석 결정이 귀속이라면</h2>
          <p>
            파괴석 결정이 귀속이면 평균 674만에서 509만으로 약 165만 골드가 줄어듭니다. 수호석 결정까지 귀속이면 430만입니다.
            필요한 개수는 숨결에 따라 달라지는데, 풀숨 기준으로 +20에서 +25까지 파괴석 결정이 평균 약 13만 개(중앙값 10만 개, 최악 31만 개),
            수호석 결정이 평균 약 41만 개(중앙값 32만 개, 최악 96만 개) 필요합니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>귀속 결정이 있으면 숨결을 덜 사도 됩니다.</strong> 재료가 공짜에 가까워지면 한 번 누르는 값이 싸져서,
              확률을 올리려고 숨결을 사는 가치도 같이 떨어집니다. 파괴석 결정만 귀속이면 단계마다 처음 1~3번째만 풀숨,
              그다음 7~10번째까지는 빙하 30개만 넣고 이후는 숨결 없이 누르는 것이 최적입니다.
              파괴석·수호석 결정이 모두 귀속이면 +20~+24 단계는 처음 4~6번만 빙하 30개를 넣고 나머지는 숨결 없이 누르면 되고,
              +24 → +25만 첫 시도 풀숨 뒤 7번째까지 빙하 30개를 넣습니다.
            </p>
          </div>
          <p>
            다만 숨결을 줄이면 시도 횟수가 늘어나 실링이 더 듭니다. 파괴석 결정 귀속에 최적 숨결로 가면 평균 시도가 150회로,
            매번 풀숨(108회)보다 40회 이상 많습니다. 실링이 빠듯하다면 골드를 조금 더 쓰더라도 숨결을 넣는 편이 낫습니다.
            실링과 특재돌 이야기는{' '}
            <Link href="/guide/wangap-special-refine-shilling">완갑 +20~+25 특재돌 배분과 실링 준비량 정리</Link>에서 이어서 다룹니다.
          </p>

          <h2>정리</h2>
          <ul>
            <li>+21~+25는 다섯 단계 모두 기본 1.5%이고, 풀숨이면 3%입니다. 한 단계 평균 32회, 풀숨이면 22회 안팎입니다.</li>
            <li>재료를 모두 사면 +20에서 +25까지 평균 약 670만~700만 골드, 운이 나쁘면 1,600만 골드까지 듭니다.</li>
            <li>숨결을 사서 넣는 것은 골드 절약보다 시도 횟수와 실링 절약 효과가 큽니다. 귀속 숨결이 있다면 무조건 풀숨입니다.</li>
            <li>숨결을 산다면 단계 초반만 풀숨, 이후는 빙하의 숨결만 넣는 것이 오늘 시세 기준 가장 쌉니다.</li>
            <li>파괴석 결정 귀속은 약 165만 골드 가치가 있고, 이때는 숨결을 덜 넣는 쪽이 골드상 이득입니다.</li>
          </ul>

          <div className={styles.guideCta}>
            <p>내 귀속 재료와 숨결 설정을 넣으면 오늘 시세로 최적 숨결 계획과 필요한 재료를 바로 계산해 줍니다.</p>
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
            headline: '완갑 +20에서 +25까지, 숨결·귀속 재료 상황별 강화 비용 정리',
            description:
              '완갑 +21~+25 강화를 숨결 사용 여부, 귀속 숨결, 파괴석·수호석 결정 귀속 여부로 나눠 평균·중앙값·장인의 기운 100% 기준 골드와 최적 숨결 투입 시점을 정리했습니다.',
            datePublished: '2026-09-14',
            dateModified: '2026-09-14',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/wangap-20-25-cases`,
          }),
        }}
      />
    </div>
  );
}
