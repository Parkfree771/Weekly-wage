import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '지옥·나락 보상 가이드 - 골드 가치 환산 원리',
  description:
    '로스트아크 지옥과 나락의 보상 차이, 단계별 보상 구조, 어빌리티스톤·특수재련 재료 같은 거래 불가 재화의 골드 가치 환산 방식을 상세히 설명합니다.',
  keywords:
    '로아 지옥 보상, 로아 나락 보상, 로아 지옥의 나락, 지옥 보상 계산, 로아 특수재련, 로아 어빌리티스톤, 로아 페온 환산, 로스트아크 지옥',
  alternates: { canonical: '/guide/hell-reward' },
};

export default function HellRewardGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>지옥</span>
          <h1 className={styles.articleTitle}>지옥·나락 보상 가이드 - 골드 가치 환산 원리</h1>
          <span className={styles.articleDate}>2026년 7월 18일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>지옥과 나락, 무엇이 다른가?</h2>
          <p>
            지옥과 나락은 서로 다른 보상 구성을 가진 별개의 콘텐츠입니다.
            <strong> 지옥 상자</strong>에는 특수재련 재료, 상급 아비도스 융화 재료,
            파괴석·수호석 결정 선택상자, 위대한 운명의 돌파석, 그리고 높은 단계 한정으로
            천상 도전권이 포함됩니다. <strong>나락 상자</strong>에는 귀속 각인서 랜덤 상자와
            높은 단계 한정으로 귀속 보석, 전설 카드팩이 포함됩니다.
            어빌리티스톤, 팔찌, 젬 선택 상자, 용암·빙하의 숨결, 정련된 운명·혼돈의 돌,
            귀속 골드는 두 콘텐츠에 공통으로 존재하지만 단계별 지급 수량이 서로 다릅니다.
          </p>

          <h2>단계(진행도) 구조</h2>
          <p>
            보상은 진행도 0부터 100까지에 따라 달라집니다. 로아로골 지옥 보상 계산기는
            이를 0~9, 10~19, 20~29 … 90~99, 100의 총 11개 구간으로 나누어
            각 구간의 대표 보상표를 보여줍니다. 단계가 올라갈수록 보상 항목의 수량이 함께
            증가하므로, 자신의 진행도 구간을 선택하면 받을 수 있는 보상 전체를 한눈에 비교할 수 있습니다.
          </p>

          <h2>보상의 골드 가치는 어떻게 매기나?</h2>
          <p>
            지옥·나락 보상에는 거래소에서 바로 시세를 확인할 수 있는 아이템과,
            거래가 불가능해 가치를 추정해야 하는 아이템이 섞여 있습니다.
            로아로골은 가격 산정 방식을 세 가지로 구분해 표시합니다:
          </p>
          <ul>
            <li>
              <strong>실시간 시세:</strong> 파괴석·수호석 결정, 위대한 운명의 돌파석,
              상급 아비도스 융화 재료, 용암·빙하의 숨결, 귀속 각인서, 귀속 보석처럼
              거래소·경매장 시세를 그대로 반영할 수 있는 항목입니다.
            </li>
            <li>
              <strong>고정가:</strong> 천상 도전권, 전설 카드팩, 정련된 운명·혼돈의 돌처럼
              게임 내 고정된 기준가를 사용하는 항목입니다.
            </li>
            <li>
              <strong>환율 환산:</strong> 어빌리티스톤이나 팔찌처럼 블루 크리스탈·로얄 크리스탈
              환율을 거쳐 페온 가치로 환산하는 항목입니다.
            </li>
          </ul>

          <h2>특수재련 재료의 가치 역산</h2>
          <p>
            특수재련 재료는 거래소에서 거래되지 않아 직접적인 시세가 없습니다.
            로아로골은 &quot;일반재련으로 같은 결과를 얻는 데 드는 비용&quot;을 대체 가치로 사용합니다.
            구체적으로는 계승 무기 기준 일반재련(20→21단계) 1회에 드는 총비용을
            성공 확률 1.5% 기준 기하분포의 중앙값 시행 횟수로 나눈 뒤,
            특수재련 1회당 지급 개수(50개)로 다시 나누어 1개당 단가를 역산합니다.
            시세가 없는 재화라도 이런 방식으로 합리적인 골드 가치를 추정할 수 있습니다.
          </p>

          <h2>어빌리티스톤이 평균에서 빠져 있는 이유</h2>
          <p>
            어빌리티스톤은 페온 환산(1개당 9페온 상당)으로 가치를 추정하는데,
            페온의 골드 환산값이 상대적으로 높게 잡히면 전체 평균 기댓값이 왜곡될 수 있습니다.
            그래서 계산기는 기본적으로 어빌리티스톤을 평균 기댓값 계산에서 제외하며,
            체크박스를 해제하면 포함한 값도 확인할 수 있습니다.
          </p>

          <h2>평균 기댓값을 볼 때 주의할 점</h2>
          <p>
            계산기에 표시되는 평균 기댓값은 해당 단계에서 지급 가능한 보상 항목들의 골드 가치를
            모두 더해 항목 수로 나눈 단순 평균입니다. 상자를 열 때 실제로 어떤 보상이 어떤 확률로
            나오는지의 가중치까지는 반영하지 않으므로, &quot;이 단계 보상의 평균적인 가치 수준&quot;을
            가늠하는 참고 지표로 활용하는 것이 적절합니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 지옥·나락을 어느 단계까지 밀지 고민된다면, 로아로골 지옥 보상
              계산기에서 단계별 보상표와 골드 가치를 비교해보세요. 실시간 시세 항목은 매시간
              자동 갱신됩니다.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>단계별 지옥·나락 보상의 골드 가치를 직접 비교해보세요.</p>
            <Link href="/hell-reward" className={styles.guideCtaLink}>
              지옥 보상 계산기 바로가기
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
            "headline": "지옥·나락 보상 가이드 - 골드 가치 환산 원리",
            "description": "지옥과 나락의 보상 차이, 단계별 보상 구조, 거래 불가 재화의 골드 가치 환산 방식을 설명합니다.",
            "datePublished": "2026-07-18",
            "dateModified": "2026-07-18",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/hell-reward`
          })
        }}
      />
    </div>
  );
}
