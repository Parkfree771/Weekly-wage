import Link from 'next/link';
import { Metadata } from 'next';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: 'T4 재련 비용 완벽 가이드 - 일반 vs 상급 비교',
  description: '로스트아크 T4 재련 시스템 완벽 가이드. 일반 재련과 상급 재련의 차이, 장인의 기운, 재련 재료, 비용 절약 팁을 상세히 설명합니다.',
  keywords: '로아 재련, 로아 T4 재련, 로아 재련 비용, 로아 장인의 기운, 로아 장기백, 로아 상급재련, 로아 일반재련, 로아 재련 재료, 로스트아크 재련 가이드',
  alternates: { canonical: 'https://lostarkweeklygold.kr/guide/refining' },
};

export default function RefiningGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>재련</span>
          <h1 className={styles.articleTitle}>T4 재련 비용 완벽 가이드 - 일반 vs 상급 비교</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>T4 재련 시스템 개요</h2>
          <p>
            재련은 로스트아크에서 캐릭터의 장비 아이템 레벨을 올리는 핵심 성장 시스템입니다.
            T4(4티어) 장비는 현재 로스트아크의 최신 장비 단계로, 재련을 통해 아이템 레벨을
            높이면 더 높은 난이도의 레이드와 콘텐츠에 참여할 수 있습니다.
            재련에는 골드와 다양한 재련 재료가 필요하며, 성공 확률이 존재하여
            실패할 경우 재료와 골드가 소모됩니다.
          </p>

          <h2>재련 재료 종류</h2>
          <p>T4 재련에 필요한 주요 재료는 다음과 같습니다:</p>
          <ul>
            <li><strong>운명의 파편:</strong> 모든 재련 단계에서 필요한 기본 재료입니다. 카오스 던전, 레이드 더보기 보상 등에서 획득할 수 있습니다.</li>
            <li><strong>운명의 파괴석:</strong> 무기 재련에 사용되는 재료입니다. 레이드 클리어 보상, 가디언 토벌 등에서 주로 획득합니다.</li>
            <li><strong>운명의 수호석:</strong> 방어구 재련에 사용되는 재료입니다. 파괴석과 비슷한 경로로 획득할 수 있습니다.</li>
            <li><strong>운명의 돌파석:</strong> 모든 장비 재련에 필요한 핵심 재료로, 수량이 적어 가격이 비싼 편입니다.</li>
            <li><strong>골드:</strong> 매 재련 시도마다 일정량의 골드가 소모됩니다. 재련 단계가 높아질수록 소모 골드도 증가합니다.</li>
          </ul>

          <h2>일반 재련 vs 상급 재련</h2>
          <p>
            T4 장비 재련에는 일반 재련과 상급 재련 두 가지 방식이 있습니다. 각 방식의 특징과 차이를 이해하면
            상황에 맞게 효율적으로 재련할 수 있습니다.
          </p>

          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>구분</th>
                <th>일반 재련</th>
                <th>상급 재련</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>적용 구간</td>
                <td>전 구간</td>
                <td>14강 이상</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>재료 소모</td>
                <td>기본량</td>
                <td>일반 대비 약 60~70%</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>성공 확률</td>
                <td>기본 확률</td>
                <td>일반보다 낮음</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>장인의 기운 적용</td>
                <td>적용</td>
                <td>적용</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>장점</td>
                <td>높은 기본 확률</td>
                <td>재료 소모 적음</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>추천 상황</td>
                <td>재료가 충분할 때</td>
                <td>재료가 부족하거나 비쌀 때</td>
              </tr>
            </tbody>
          </table>

          <h2>장인의 기운(장기백)이란?</h2>
          <p>
            장인의 기운은 재련 실패 시 누적되는 보너스 시스템입니다. 재련에 실패할 때마다 일정량의
            장인의 기운이 쌓이며, 장인의 기운이 100%에 도달하면 다음 재련은 반드시 성공합니다.
            이를 흔히 &quot;장기백(장인의 기운 100%)&quot;이라고 부릅니다.
          </p>
          <p>
            장인의 기운 덕분에 재련에 영원히 실패하는 것은 불가능하지만, 장기백까지 가는 데
            상당한 재료와 골드가 소모될 수 있습니다. 로골로골의 재련 시뮬레이터에서는
            실제 장기백까지 필요한 평균 횟수와 비용을 시뮬레이션할 수 있습니다.
          </p>

          <h2>재련 비용 절약 팁</h2>
          <h3>1. 시세를 고려한 재련 방식 선택</h3>
          <p>
            재련 재료의 거래소 시세가 비쌀 때는 상급 재련이 유리할 수 있고,
            시세가 쌀 때는 일반 재련이 효율적일 수 있습니다.
            로골로골의 재련 비용 계산기에서 현재 시세를 기반으로 두 방식의 예상 비용을 비교해보세요.
          </p>

          <h3>2. 숨결 아이템 활용</h3>
          <p>
            재련 시 숨결(재련 확률 증가 아이템)을 사용하면 성공 확률을 높일 수 있습니다.
            숨결의 가격 대비 확률 증가량을 계산하여, 효율적인 단계에서만 사용하는 것이 좋습니다.
            일반적으로 낮은 확률 구간(15강 이상)에서 숨결을 사용하는 것이 가성비가 좋습니다.
          </p>

          <h3>3. 보조 재료 사전 확보</h3>
          <p>
            레이드 더보기 보상, 카오스 던전, 가디언 토벌 등을 통해 재련 재료를 미리 확보해두세요.
            거래소에서 재료를 구매할 때는 시세가 낮은 시점을 노려 매입하면 비용을 아낄 수 있습니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로골로골의 재련 시뮬레이터에서 실제 재련과 동일한 확률로
              시뮬레이션을 체험할 수 있습니다. 실제 재련 전에 예상 비용과 장기백 횟수를 확인해보세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로골로골 재련 계산기로 내 장비의 재련 비용을 정확히 계산해보세요.</p>
            <Link href="/refining" className={styles.guideCtaLink}>
              재련 비용 계산기 바로가기
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
            "headline": "T4 재련 비용 완벽 가이드 - 일반 vs 상급 비교",
            "description": "T4 재련 시스템, 장인의 기운, 일반 재련과 상급 재련의 차이, 재련 비용 절약 팁을 상세히 설명합니다.",
            "datePublished": "2026-02-06",
            "author": { "@type": "Organization", "name": "로골로골" },
            "publisher": { "@type": "Organization", "name": "로골로골", "url": "https://lostarkweeklygold.kr" },
            "mainEntityOfPage": "https://lostarkweeklygold.kr/guide/refining"
          })
        }}
      />
    </div>
  );
}
