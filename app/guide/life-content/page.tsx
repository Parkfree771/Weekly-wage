import Link from 'next/link';
import { Metadata } from 'next';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '생활 콘텐츠 수익 가이드 - 융화재료 제작과 효율 분석',
  description: '로스트아크 생활 콘텐츠 수익 완벽 가이드. 벌목, 채광, 고고학 등 생활 콘텐츠 종류와 아비도스 융화재료 제작 시스템, 생활의 가루, 수익 계산법을 알아보세요.',
  keywords: '로아 생활 콘텐츠, 로아 벌목, 로아 채광, 로아 고고학, 로아 융화재료, 로아 아비도스, 로아 생활의 가루, 로아 생활 수익, 로스트아크 생활 가이드',
  alternates: { canonical: 'https://lostarkweeklygold.kr/guide/life-content' },
};

export default function LifeContentGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>생활</span>
          <h1 className={styles.articleTitle}>생활 콘텐츠 수익 가이드 - 융화재료 제작과 효율 분석</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>생활 콘텐츠란?</h2>
          <p>
            생활 콘텐츠는 로스트아크에서 전투 외에 자원을 채집하고 가공하여 수익을 얻는 시스템입니다.
            레이드와 달리 혼자서 진행할 수 있으며, 생활 에너지를 소모하여 자원을 획득합니다.
            생활 에너지는 시간이 지나면 자동으로 회복되며, 최대 치까지 채워지면 더 이상 회복되지 않으므로
            꾸준히 소비하는 것이 효율적입니다.
          </p>

          <h2>생활 콘텐츠 종류</h2>

          <h3>벌목</h3>
          <p>
            벌목은 나무를 채집하여 목재를 획득하는 생활 콘텐츠입니다.
            획득한 목재는 거래소에서 판매하거나, 융화재료 제작에 사용할 수 있습니다.
            벌목은 비교적 진입 장벽이 낮고, 안정적인 수익을 제공하여 많은 플레이어가 선호합니다.
          </p>

          <h3>채광</h3>
          <p>
            채광은 광석을 캐서 광물 자원을 획득하는 콘텐츠입니다.
            철광석, 운석 등을 채집할 수 있으며, 벌목과 마찬가지로 융화재료 제작 재료로 활용됩니다.
            맵에 따라 채광 효율이 다르므로, 효율이 좋은 맵을 파악해두는 것이 중요합니다.
          </p>

          <h3>고고학</h3>
          <p>
            고고학은 유물을 발굴하는 생활 콘텐츠로, 희귀한 재료나 귀중한 아이템을 획득할 수 있습니다.
            다른 생활 콘텐츠에 비해 랜덤성이 높지만, 고가 아이템이 나올 경우 큰 수익을 기대할 수 있습니다.
          </p>

          <h3>낚시, 수렵, 채집</h3>
          <p>
            낚시, 수렵, 채집도 생활 콘텐츠에 포함됩니다. 각 콘텐츠마다 고유한 자원을 획득할 수 있으며,
            이 자원들은 거래소에서 판매하거나 제작 재료로 사용됩니다.
            수익성은 거래소 시세에 따라 변동하므로, 시세를 확인하고 가장 효율적인 콘텐츠를 선택하세요.
          </p>

          <h2>아비도스 융화재료 제작 시스템</h2>
          <p>
            아비도스 융화재료는 생활 콘텐츠에서 획득한 재료를 가공하여 만드는 T4 재련 필수 재료입니다.
            융화재료는 거래소에서 높은 가격에 거래되기 때문에, 직접 제작하면 상당한 수익을 올릴 수 있습니다.
            제작에는 생활 재료(목재, 광석 등)와 생활의 가루가 필요합니다.
          </p>

          <h3>융화재료 제작 수익 계산법</h3>
          <p>
            융화재료 제작의 실제 수익을 계산하려면 다음 요소를 고려해야 합니다:
          </p>
          <ol>
            <li><strong>생활 재료 가격:</strong> 직접 채집한 재료의 거래소 시세 (기회비용)</li>
            <li><strong>생활의 가루 비용:</strong> 제작에 필요한 생활의 가루의 가치</li>
            <li><strong>융화재료 판매가:</strong> 완성된 융화재료의 거래소 시세</li>
            <li><strong>수수료:</strong> 거래소 판매 시 발생하는 수수료 (5%)</li>
          </ol>
          <p>
            실제 수익 = 융화재료 판매가 x 0.95 - 생활 재료 가격 - 생활의 가루 비용
          </p>

          <h2>생활의 가루 시스템</h2>
          <p>
            생활의 가루는 생활 콘텐츠 활동 시 부산물로 획득하는 재화입니다.
            융화재료 제작에 반드시 필요한 재료이며, 거래소에서 구매할 수도 있습니다.
            생활의 가루는 생활 에너지를 소모하는 모든 활동에서 획득 가능하므로,
            어떤 생활 콘텐츠를 하든 자연스럽게 모을 수 있습니다.
          </p>

          <h2>생활 콘텐츠 효율 비교</h2>
          <p>
            각 생활 콘텐츠의 효율은 거래소 시세에 따라 매일 변동합니다.
            일반적으로 벌목과 채광이 안정적인 수익을 제공하며,
            고고학은 변동폭이 크지만 기대값이 높을 수 있습니다.
            가장 중요한 것은 현재 시세를 확인하고, 가장 수익성이 높은 콘텐츠를 선택하는 것입니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로골로골의 생활 제작 계산기에서 현재 거래소 시세를 반영하여
              각 생활 콘텐츠의 제작 손익을 실시간으로 비교할 수 있습니다.
              제작 전에 반드시 확인하여 손해를 방지하세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로골로골 생활 제작 계산기로 현재 가장 효율적인 생활 콘텐츠를 확인하세요.</p>
            <Link href="/life-master" className={styles.guideCtaLink}>
              생활 제작 계산기 바로가기
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
            "headline": "생활 콘텐츠 수익 가이드 - 융화재료 제작과 효율 분석",
            "description": "벌목, 채광, 고고학 등 생활 콘텐츠의 수익 구조와 아비도스 융화재료 제작 손익을 분석합니다.",
            "datePublished": "2026-02-06",
            "author": { "@type": "Organization", "name": "로골로골" },
            "publisher": { "@type": "Organization", "name": "로골로골", "url": "https://lostarkweeklygold.kr" },
            "mainEntityOfPage": "https://lostarkweeklygold.kr/guide/life-content"
          })
        }}
      />
    </div>
  );
}
