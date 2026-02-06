import Link from 'next/link';
import { Metadata } from 'next';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '거래소 시세 활용 가이드 - 시세 차트 보는 법',
  description: '로스트아크 거래소 시세 활용 가이드. 시세 변동 패턴, 매매 타이밍, 로골로골 시세 차트 활용법, 재련 재료와 보석 시세 분석 방법을 알아보세요.',
  keywords: '로아 거래소, 로아 시세, 로아 시세 차트, 로아 가격 변동, 로아 거래소 시세, 로아 매매 타이밍, 로아 재련 재료 시세, 로스트아크 거래소 가이드',
  alternates: { canonical: 'https://lostarkweeklygold.kr/guide/market-price' },
};

export default function MarketPriceGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>거래소</span>
          <h1 className={styles.articleTitle}>거래소 시세 활용 가이드 - 시세 차트 보는 법</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>로스트아크 거래소 시스템</h2>
          <p>
            거래소는 로스트아크에서 플레이어 간에 아이템을 사고팔 수 있는 시스템입니다.
            재련 재료, 보석, 각인서, 생활 재료 등 대부분의 아이템을 거래소를 통해 거래할 수 있습니다.
            거래소 시세는 수요와 공급에 따라 실시간으로 변동하며,
            이 시세를 잘 활용하면 골드를 효율적으로 관리할 수 있습니다.
          </p>
          <p>
            거래소에서 아이템을 판매할 때는 5%의 수수료가 부과됩니다.
            따라서 실제 수령하는 골드는 등록 가격의 95%가 됩니다.
            이 수수료를 고려하여 가격을 설정하는 것이 중요합니다.
          </p>

          <h2>주요 거래 아이템과 시세</h2>

          <h3>재련 재료</h3>
          <p>
            운명의 파괴석, 수호석, 돌파석, 파편 등 재련 재료는 가장 활발하게 거래되는 아이템입니다.
            재련 수요가 높은 시기(새 레이드 업데이트, 이벤트 등)에는 가격이 상승하고,
            수요가 줄면 가격이 하락하는 패턴을 보입니다.
          </p>

          <h3>융화재료</h3>
          <p>
            아비도스 융화재료는 생활 콘텐츠 제작으로 공급되는 T4 재련 필수 재료입니다.
            수요가 꾸준하여 비교적 안정적인 시세를 유지하지만,
            업데이트 시기에는 급등할 수 있으므로 시세 추이를 주시해야 합니다.
          </p>

          <h3>보석</h3>
          <p>
            보석은 캐릭터의 스킬 데미지와 쿨타임을 강화하는 아이템입니다.
            레벨이 높은 보석일수록 가격이 급격히 상승하며,
            인기 직업의 보석이 더 높은 가격에 거래되는 경향이 있습니다.
          </p>

          <h2>시세 변동 패턴</h2>
          <p>
            로스트아크 거래소 시세에는 몇 가지 주기적인 패턴이 있습니다:
          </p>

          <h3>주간 패턴</h3>
          <p>
            매주 수요일 레이드 초기화 후 재련 재료의 공급이 증가하면서 가격이 하락하는 경향이 있습니다.
            반면 주말에는 플레이어 활동이 증가하여 수요가 늘고, 가격이 소폭 상승할 수 있습니다.
            재련 재료를 저렴하게 구매하려면 수요일~목요일 사이가 유리할 수 있습니다.
          </p>

          <h3>업데이트 패턴</h3>
          <p>
            새로운 레이드나 콘텐츠가 업데이트되면 재련 수요가 급증하면서
            재련 재료 시세가 크게 상승합니다. 업데이트 전에 미리 재료를 확보해두면
            비용을 절약할 수 있습니다. 반대로 업데이트 직후에는 이벤트 보상 등으로
            공급이 늘어 시세가 안정화되는 패턴을 보입니다.
          </p>

          <h3>이벤트 패턴</h3>
          <p>
            로스트아크에서 재련 지원 이벤트가 진행되면 재련 재료의 수요가 증가합니다.
            반면 재련 재료를 보상으로 주는 이벤트가 있으면 공급이 늘어 가격이 하락합니다.
            공지사항을 주시하고 이벤트에 맞춰 매매 타이밍을 잡는 것이 좋습니다.
          </p>

          <h2>로골로골 시세 차트 활용법</h2>
          <p>
            로골로골에서는 로스트아크 공식 API를 통해 거래소 시세를 실시간으로 수집하고,
            과거 시세 데이터를 차트로 제공합니다. 시세 차트를 활용하면
            아이템의 가격 추이를 한눈에 파악하고, 최적의 매매 타이밍을 찾을 수 있습니다.
          </p>

          <h3>차트 보는 법</h3>
          <ul>
            <li><strong>가격 추이 확인:</strong> 차트에서 가격이 상승 추세인지 하락 추세인지 확인합니다. 하락 추세일 때 매수하면 유리합니다.</li>
            <li><strong>고점과 저점 파악:</strong> 과거 데이터에서 가격의 고점과 저점을 파악하면 현재 가격이 비싼지 싼지 판단할 수 있습니다.</li>
            <li><strong>변동폭 확인:</strong> 가격 변동폭이 클수록 시세 차익을 얻을 기회가 있지만, 리스크도 큽니다.</li>
            <li><strong>여러 아이템 비교:</strong> 로골로골의 오늘의 시세에서 여러 재련 재료의 가격 변동을 동시에 비교할 수 있습니다.</li>
          </ul>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로골로골 메인 페이지에서 주요 재련 재료의 실시간 시세와
              과거 시세 차트를 무료로 확인할 수 있습니다. 매시간 자동으로 업데이트되므로
              항상 최신 정보를 바탕으로 판단하세요.
            </p>
          </div>

          <h2>매매 타이밍 팁</h2>
          <ol>
            <li><strong>급하지 않은 매수:</strong> 시세가 하락 추세일 때 천천히 분할 매수하세요. 한 번에 대량 구매하면 가격 변동 리스크가 큽니다.</li>
            <li><strong>업데이트 전 매수:</strong> 새 콘텐츠 업데이트가 예고되면 미리 필요한 재료를 확보해두세요. 업데이트 후 가격이 오를 가능성이 높습니다.</li>
            <li><strong>이벤트 재료 즉시 판매:</strong> 이벤트로 대량의 재료를 얻었다면 초기에 빠르게 판매하는 것이 유리할 수 있습니다. 시간이 지나면 공급이 늘어 가격이 하락합니다.</li>
            <li><strong>수수료 고려:</strong> 거래소 5% 수수료를 반드시 고려하세요. 시세 차익이 5% 미만이면 손해입니다.</li>
          </ol>

          <div className={styles.guideCta}>
            <p>로골로골에서 실시간 거래소 시세와 과거 시세 차트를 확인하세요.</p>
            <Link href="/" className={styles.guideCtaLink}>
              시세 차트 확인하기
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
            "headline": "거래소 시세 활용 가이드 - 시세 차트 보는 법",
            "description": "로스트아크 거래소 시세 변동 패턴, 매매 타이밍, 로골로골 시세 차트 활용법을 알려드립니다.",
            "datePublished": "2026-02-06",
            "author": { "@type": "Organization", "name": "로골로골" },
            "publisher": { "@type": "Organization", "name": "로골로골", "url": "https://lostarkweeklygold.kr" },
            "mainEntityOfPage": "https://lostarkweeklygold.kr/guide/market-price"
          })
        }}
      />
    </div>
  );
}
