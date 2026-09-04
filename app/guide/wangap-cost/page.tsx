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
          <span className={styles.articleDate}>2026년 7월 29일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            2026년 7월 29일, 벨가르딘 완갑의 강화·승급 정보가 공개되었습니다. 8월 5일 벨가르딘 출시를 앞두고,
            완갑이 어떤 구조로 강화되는지와 +0에서 +25까지 실제로 얼마가 드는지를 로아로골 완갑 시뮬레이터 기준으로 정리했습니다.
          </p>

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
            사령의 잔영과 죽음의 손은 벨가르딘 레이드 전용 재료로 거래가 불가능하며, 승급 자체에 골드는 소모되지 않습니다.
            고대 승급에는 죽음의 손만 사용됩니다.
          </p>
          <p>
            완갑은 방어구와 무기 역할을 겸하기 때문에 강화에 파괴석 결정과 수호석 결정이 모두 들어갑니다.
            수호석 소모량이 파괴석의 약 3배라, 평소 남아돌던 수호석 결정이 처음으로 대량 소모되는 콘텐츠입니다.
          </p>

          <h2>평균 시뮬: +0에서 +25까지 기대 비용</h2>
          <p>
            평균 시뮬은 확률 기반 기대값으로 계산한 평균 소모량입니다. 목표 단계를 설정하면 기본에서 전설(+10), 유물(+15),
            고대(+20)로 이어지는 승급 경로와 함께 필요한 재료 총량을 보여줍니다. 아래는 숨결을 쓰지 않은 기준입니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>재료</th>
                <th>평균 소모량</th>
                <th>골드 환산</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>파괴석 결정</td><td>373,913</td><td>6,366,243</td></tr>
              <tr><td>수호석 결정</td><td>1,160,381</td><td>1,631,496</td></tr>
              <tr><td>위대한 돌파석</td><td>24,382</td><td>480,325</td></tr>
              <tr><td>상급 아비도스</td><td>16,428</td><td>2,644,908</td></tr>
              <tr><td>운명의 파편</td><td>10,636,241</td><td>630,020</td></tr>
              <tr><td>실링</td><td>51,964,540</td><td>-</td></tr>
              <tr><td>성장 비용 (파편)</td><td>7,504,000</td><td>444,487</td></tr>
              <tr><td>성장 비용 (실링)</td><td>75,040,000</td><td>-</td></tr>
              <tr><td>누르는 골드</td><td>-</td><td>3,687,331</td></tr>
              <tr><td><strong>총 소모 골드</strong></td><td>-</td><td><strong>15,884,810</strong></td></tr>
            </tbody>
          </table>
          <p>
            성장 비용은 단계마다 1회 지불하는 고정 비용으로, 시도 횟수와 무관합니다.
            재료를 전부 골드로 산다고 가정한 환산 기준이며, 귀속 재료를 쓰면 실제 골드 지출은 줄어듭니다.
          </p>

          <h2>실제 시뮬: 직접 돌려본 결과</h2>
          <p>
            실제 시뮬은 평균값이 아니라 실제 게임과 동일한 확률로 한 번씩 강화를 굴려보는 기능입니다.
            운에 따라 결과가 크게 달라지는 완갑 강화의 체감을 미리 볼 수 있습니다. 아래는 +0에서 +25까지 한 판을 끝까지 돌린 결과입니다.
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
            평균 기대값(약 1,588만 골드)보다 약 345만 골드 더 들어간 판입니다. 확률 강화 특성상 판마다 편차가 크며,
            같은 조건으로 여러 번 돌려보면 분포를 체감할 수 있습니다.
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
            "dateModified": "2026-07-29",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/wangap-cost`
          })
        }}
      />
    </div>
  );
}
