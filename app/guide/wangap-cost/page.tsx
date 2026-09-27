import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '벨가르딘 완갑 +0에서 +25까지 강화 비용 정리',
  description:
    '벨가르딘 완갑의 3단계 승급 구조와 +0에서 +25까지 실제로 드는 재료·골드를 평균 시뮬과 실제 시뮬 결과로 정리했습니다. 파괴석·수호석 결정, 돌파석, 상급 아비도스, 성장 비용까지 항목별 소모량을 확인할 수 있습니다.',
  keywords:
    '로아 완갑, 완갑 강화 비용, 벨가르딘 완갑, 완갑 승급, 완갑 25강, 완갑 재료, 사령의 잔영, 죽음의 손, 완갑 시뮬레이터',
  alternates: { canonical: '/guide/wangap-cost' },
};

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <td className={styles.barCell}>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${(value / max) * 100}px` }} />
        <span className={styles.barText}>{label}</span>
      </div>
    </td>
  );
}

/** 평균 시뮬 +0 → +25, 숨결 없음, 재료 전부 구매 가정 골드 환산 (골드 큰 순) */
const MATERIAL_ROWS: { name: string; amount: string; gold: number | null }[] = [
  { name: '파괴석 결정', amount: '373,913', gold: 6366243 },
  { name: '상급 아비도스', amount: '16,428', gold: 2644908 },
  { name: '수호석 결정', amount: '1,160,381', gold: 1631496 },
  { name: '운명의 파편', amount: '10,636,241', gold: 630020 },
  { name: '위대한 돌파석', amount: '24,382', gold: 480325 },
  { name: '성장 비용 (파편)', amount: '7,504,000', gold: 444487 },
  { name: '실링', amount: '51,964,540', gold: null },
  { name: '성장 비용 (실링)', amount: '75,040,000', gold: null },
];
const MATERIAL_GOLD_MAX = 6366243;

/** 등급 구간별 평균 (숨결 없음, 기대값) */
const GRADE_ROWS = [
  { name: '영웅 +0 → +10', tries: 57.4, destruction: '40,283', guardian: '122,123', breakthrough: '2,104', abidos: '1,545', shard: '1,017,751', gold: '362,668' },
  { name: '전설 +10 → +15', tries: 57.2, destruction: '49,947', guardian: '153,447', breakthrough: '2,895', abidos: '1,980', shard: '1,348,409', gold: '473,500' },
  { name: '유물 +15 → +20', tries: 87.4, destruction: '89,376', guardian: '277,302', breakthrough: '5,696', abidos: '3,844', shard: '2,526,646', gold: '877,686' },
  { name: '고대 +20 → +25', tries: 161.8, destruction: '194,306', guardian: '607,510', breakthrough: '13,687', abidos: '9,060', shard: '5,743,435', gold: '1,973,477' },
];

/** +0 → +25 결과 폭 (숨결 없음) */
const RANGE_ROWS = [
  { name: '단계마다 중앙값', tries: 305, triesLabel: '305회', destruction: '311,685', guardian: '966,980', breakthrough: '20,258', abidos: '13,660', gold: '3,069,990' },
  { name: '평균', tries: 363.8, triesLabel: '363.8회', destruction: '373,913', guardian: '1,160,381', breakthrough: '24,382', abidos: '16,428', gold: '3,687,331' },
  { name: '모든 단계 장인의 기운 100%', tries: 840, triesLabel: '840회', destruction: '865,620', guardian: '2,686,690', breakthrough: '56,526', abidos: '38,073', gold: '8,540,920' },
];

export default function WangapCostGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>완갑</span>
          <h1 className={styles.articleTitle}>벨가르딘 완갑 +0에서 +25까지 강화 비용 정리</h1>
          <span className={styles.articleDate}>2026년 7월 29일 작성 · 9월 15일 보강</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            벨가르딘 완갑의 강화·승급 정보는 벨가르딘 출시(8월 5일)를 앞둔 2026년 7월 29일에 공개되었습니다.
            이 글은 완갑이 어떤 구조로 강화되는지, 그리고 +0에서 +25까지 재료와 골드가 어디에 얼마나 들어가는지를
            로아로골 완갑 시뮬레이터로 계산해 정리한 것입니다.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>+0 → +25 평균 총 골드</span>
              <span className={styles.statValue}>약 1,588만</span>
              <span className={styles.statNote}>재료 전부 구매, 숨결 없음</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>평균 시도</span>
              <span className={styles.statValue}>363.8회</span>
              <span className={styles.statNote}>중앙값 305회, 최악 840회</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>고대 구간 시도 비중</span>
              <span className={styles.statValue}>약 44%</span>
              <span className={styles.statNote}>+20 → +25 다섯 단계</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>가장 큰 지출</span>
              <span className={styles.statValue}>파괴석 결정</span>
              <span className={styles.statNote}>총 골드의 약 40%</span>
            </div>
          </div>

          <h2>완갑 승급 구조: 세 번 승급합니다</h2>
          <p>
            완갑은 하나의 장비를 +25까지 계속 강화하는 방식이 아니라, 특정 단계마다 승급 재료를 사용해 등급을 올리는 구조입니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>단계</th>
                <th>등급</th>
                <th>승급 재료</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>+0 ~ +10</td><td>기본 완갑</td><td>-</td></tr>
              <tr><td>+10 승급</td><td>전설 완갑 (+10~15)</td><td>사령의 잔영 200개 또는 죽음의 손 100개</td></tr>
              <tr><td>+15 승급</td><td>유물 완갑 (+15~20)</td><td>사령의 잔영 240개 또는 죽음의 손 120개</td></tr>
              <tr><td>+20 승급</td><td>고대 완갑 (+20~25)</td><td>죽음의 손 150개</td></tr>
            </tbody>
          </table>
          <p>
            사령의 잔영과 죽음의 손은 거래할 수 없는 벨가르딘 레이드 전용 재료이고, 승급 자체에는 골드가 들지 않습니다.
            고대 승급만은 죽음의 손으로만 할 수 있습니다.
          </p>
          <p>
            완갑은 방어구와 무기 역할을 겸해서 강화에 파괴석 결정과 수호석 결정이 함께 들어갑니다.
            개수로는 수호석 결정이 파괴석 결정의 약 3배라, 평소 남아돌던 수호석 결정이 처음으로 대량 소모되는 곳입니다.
          </p>

          <h2>평균 시뮬: +0에서 +25까지 기대 비용</h2>
          <p>
            평균 시뮬은 확률 기반 기대값으로 계산한 평균 소모량입니다. 목표 단계를 설정하면 기본에서 전설(+10), 유물(+15),
            고대(+20)로 이어지는 승급 경로와 함께 필요한 재료 총량을 보여줍니다. 아래는 숨결을 쓰지 않은 기준입니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>재료</th>
                  <th>평균 소모량</th>
                  <th>골드 환산</th>
                </tr>
              </thead>
              <tbody>
                {MATERIAL_ROWS.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.amount}</td>
                    {r.gold === null ? (
                      <td>-</td>
                    ) : (
                      <Bar value={r.gold} max={MATERIAL_GOLD_MAX} label={r.gold.toLocaleString()} />
                    )}
                  </tr>
                ))}
                <tr>
                  <td>누르는 골드</td>
                  <td>-</td>
                  <Bar value={3687331} max={MATERIAL_GOLD_MAX} label="3,687,331" />
                </tr>
                <tr>
                  <td><strong>총 소모 골드</strong></td>
                  <td>-</td>
                  <td><strong>15,884,810</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>평균 시뮬, 숨결 미사용, 재료를 모두 거래소에서 산다고 가정한 환산</p>
          <p>
            골드로 보면 파괴석 결정 하나가 약 637만 골드로 전체의 약 40%를 차지하고, 누르는 골드와 상급 아비도스가 그 뒤를 잇습니다.
            수호석 결정은 개수로는 가장 많지만 골드로는 네 번째입니다. 성장 비용은 단계마다 한 번 내는 고정 비용이라 시도 횟수와 상관없이
            들어가고, 귀속 재료를 쓰는 만큼 실제 골드 지출은 이 표보다 줄어듭니다.
          </p>

          <h2>단계 구간별 성공 확률과 1회 재료</h2>
          <p>
            완갑의 성공 확률은 다섯 단계마다 한 번씩 내려갑니다. 실패하면 다음 시도 확률이 기본 확률의 10%씩 올라 기본의 두 배에서 멈추고,
            시도할 때마다 그 시도의 확률을 2.15로 나눈 만큼 장인의 기운이 쌓여 100%가 되면 다음 시도는 반드시 성공합니다.
            한 번 누를 때 드는 재료는 단계가 오를수록 조금씩 늘어납니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구간</th>
                  <th>기본 확률</th>
                  <th>파괴석 결정 (1회)</th>
                  <th>수호석 결정 (1회)</th>
                  <th>누르는 골드 (1회)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>+0 → +5</td><td>15%</td><td>600 ~ 680</td><td>1,800 ~ 2,055</td><td>5,200 ~ 6,060</td></tr>
                <tr><td>+5 → +10</td><td>10%</td><td>700 ~ 795</td><td>2,125 ~ 2,425</td><td>6,300 ~ 7,360</td></tr>
                <tr><td>+10 → +15</td><td>5%</td><td>820 ~ 930</td><td>2,505 ~ 2,865</td><td>7,650 ~ 8,930</td></tr>
                <tr><td>+15 → +20</td><td>3%</td><td>960 ~ 1,090</td><td>2,965 ~ 3,390</td><td>9,280 ~ 10,840</td></tr>
                <tr><td>+20 → +25</td><td>1.5%</td><td>1,125 ~ 1,280</td><td>3,505 ~ 4,015</td><td>11,270 ~ 13,160</td></tr>
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>범위는 구간 첫 단계와 마지막 단계의 1회 소모량</p>
          <p>
            마지막 구간은 확률이 첫 구간의 10분의 1인데 1회 재료는 약 두 배입니다. 확률이 떨어지는 폭이 재료가 늘어나는 폭보다 훨씬 커서,
            아래에서 보듯 비용 대부분이 뒤쪽 단계에 몰립니다.
          </p>

          <h2>등급 구간별로 나눠 본 평균 소모량</h2>
          <p>
            위 평균 시뮬 총합을 승급 단위로 나눈 표입니다. 같은 계산식(숨결 없음, 기대값 기준)으로 구간만 잘라 계산했습니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구간</th>
                  <th>평균 시도</th>
                  <th>파괴석 결정</th>
                  <th>수호석 결정</th>
                  <th>위대한 돌파석</th>
                  <th>상급 아비도스</th>
                  <th>운명의 파편</th>
                  <th>누르는 골드</th>
                </tr>
              </thead>
              <tbody>
                {GRADE_ROWS.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <Bar value={r.tries} max={161.8} label={`${r.tries}회`} />
                    <td>{r.destruction}</td>
                    <td>{r.guardian}</td>
                    <td>{r.breakthrough}</td>
                    <td>{r.abidos}</td>
                    <td>{r.shard}</td>
                    <td>{r.gold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>운명의 파편은 강화 재료분만, 단계마다 한 번 내는 성장 비용은 제외</p>
          <p>
            고대 구간 다섯 단계가 전체 시도의 약 44%, 파괴석 결정과 누르는 골드의 절반 이상을 차지합니다.
            +0에서 +20까지 쓰는 파괴석 결정(약 18만 개)을 다 합쳐도 +20에서 +25 한 구간(약 19만 개)에 못 미칩니다.
            전설 구간은 다섯 단계뿐인데 평균 시도가 영웅 구간 열 단계와 거의 같다는 점도 눈에 띕니다.
          </p>
          <p>
            표에서 뺀 성장 비용도 뒤로 갈수록 커집니다. 운명의 파편 기준 영웅 구간 157만 8천 개, 전설 126만 8천 개,
            유물 194만 3천 개, 고대 271만 5천 개이고, 실링은 각각 그 10배입니다.
          </p>

          <h2>실제 시뮬: 직접 돌려본 결과</h2>
          <p>
            실제 시뮬은 기대값 대신 게임과 같은 확률로 강화를 한 번씩 굴려 봅니다. 아래는 +0에서 +25까지 한 판을 끝까지 돌린 결과입니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>항목</th>
                <th>수치</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>총 시도</td><td>415회 (성공 25회, 실패 390회)</td></tr>
              <tr><td>파괴석 결정</td><td>453,370개 (7,719,078G)</td></tr>
              <tr><td>수호석 결정</td><td>1,411,355개 (1,984,365G)</td></tr>
              <tr><td>위대한 돌파석</td><td>30,503개 (600,909G)</td></tr>
              <tr><td>상급 아비도스</td><td>20,398개 (3,284,078G)</td></tr>
              <tr><td>운명의 파편</td><td>13,101,050개 (776,019G)</td></tr>
              <tr><td>사령의 잔영 / 죽음의 손</td><td>440개 / 150개</td></tr>
              <tr><td>실링 (강화+성장)</td><td>140,584,000</td></tr>
              <tr><td><strong>총 골드</strong></td><td><strong>19,334,116G</strong></td></tr>
            </tbody>
          </table>
          <p>
            평균 기대값(약 1,588만 골드)보다 약 345만 골드 더 들어간 판입니다.
          </p>
          <div className={styles.noteBox}>
            <p>
              이 결과는 한 판의 기록일 뿐 대표값이 아닙니다. 같은 조건으로 다시 돌리면 시도 횟수와 골드가 크게 달라지니,
              준비량은 아래의 중앙값·평균·최악 기준을 함께 보고 정하는 편이 좋습니다.
            </p>
          </div>

          <h2>운이 좋을 때와 나쁠 때의 폭</h2>
          <p>
            평균 시뮬은 평균 말고도 두 가지 기준을 더 보여 줍니다. 단계마다 절반의 사람이 끝나는 횟수(중앙값)로 끝났을 때와,
            모든 단계에서 장인의 기운 100%까지 채우고 나서야 성공했을 때입니다. 셋 다 +0에서 +25까지, 숨결 없음 기준입니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>기준</th>
                  <th>시도</th>
                  <th>파괴석 결정</th>
                  <th>수호석 결정</th>
                  <th>위대한 돌파석</th>
                  <th>상급 아비도스</th>
                  <th>누르는 골드</th>
                </tr>
              </thead>
              <tbody>
                {RANGE_ROWS.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <Bar value={r.tries} max={840} label={r.triesLabel} />
                    <td>{r.destruction}</td>
                    <td>{r.guardian}</td>
                    <td>{r.breakthrough}</td>
                    <td>{r.abidos}</td>
                    <td>{r.gold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            평균이 중앙값보다 큰 것은 일부 단계에서 장인의 기운까지 가는 경우가 평균을 끌어올리기 때문입니다. 위에서 돌린 415회짜리 판은
            평균보다 운이 나빴던 경우이고, 모든 단계를 최악으로 끝내면 재료가 평균의 약 2.3배까지 늘어납니다.
            그래서 재료는 평균에만 맞추기보다, 적어도 지금 도전하는 단계만큼은 장인의 기운 100%까지 버틸 양을 잡아 두는 편이 안전합니다.
          </p>

          <h2>정리</h2>
          <p>공개된 정보 기준으로 벨가르딘 완갑의 핵심은 세 가지입니다.</p>
          <ul>
            <li>+10, +15, +20에서 세 번 승급하며, 승급 재료(사령의 잔영, 죽음의 손)는 벨가르딘 레이드에서만 얻는 귀속 재료입니다.</li>
            <li>파괴석 결정과 수호석 결정이 동시에 들어가고, 수호석 소모가 훨씬 큽니다.</li>
            <li>+0에서 +25까지 풀골드 환산 기준 평균 약 1,600만 골드가 들며, 실제로는 운에 따라 그보다 훨씬 더 들 수도, 덜 들 수도 있습니다.</li>
          </ul>
          <p>
            주차별로 승급 재료가 얼마나 모이는지, 몇 주차에 어느 등급까지 갈 수 있는지는{' '}
            <Link href="/guide/wangap-upgrade-schedule">완갑 주차별 승급 정리</Link>에서 이어서 다룹니다.
          </p>

          <div className={styles.guideCta}>
            <p>이 글의 수치는 로아로골 완갑 시뮬레이터로 계산했습니다. 평균 시뮬로 기대 비용을 잡고, 실제 시뮬로 직접 굴려볼 수 있습니다.</p>
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
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "벨가르딘 완갑 +0에서 +25까지 강화 비용 정리",
            "description": "벨가르딘 완갑의 3단계 승급 구조와 +0에서 +25까지 드는 재료·골드를 평균 시뮬과 실제 시뮬 결과로 정리했습니다.",
            "datePublished": "2026-07-29",
            "dateModified": "2026-09-27",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/wangap-cost`
          })
        }}
      />
    </div>
  );
}
