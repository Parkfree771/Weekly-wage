import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '더보기 보상 손익 판단 가이드 - 언제 사야 이득일까',
  description:
    '로스트아크 더보기 보상 완벽 가이드. 더보기 손익 계산 공식, 귀속 골드 우선 차감 원리, 레이드별 더보기 우선순위, 거래 불가 재료의 가치 판단까지 정리했습니다.',
  keywords:
    '로아 더보기, 로아 더보기 효율, 로아 더보기 손익, 로아 더보기 계산, 레이드 더보기, 더보기 골드, 로아 더보기 가격, 로스트아크 더보기 보상',
  alternates: { canonical: '/guide/more-reward' },
};

export default function MoreRewardGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>골드</span>
          <h1 className={styles.articleTitle}>더보기 보상 손익 판단 가이드 - 언제 사야 이득일까</h1>
          <span className={styles.articleDate}>2026년 7월 18일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>더보기 보상이란?</h2>
          <p>
            레이드 관문을 클리어하면 기본 보상과 별개로, 골드를 추가로 지불하고 재련 재료
            (파괴석·수호석, 돌파석, 파편 등)를 더 받을 수 있는 선택지가 있습니다.
            이것을 흔히 <strong>더보기</strong>라고 부릅니다. 더보기 비용은 관문마다 정해져 있지만,
            받는 재료의 실제 가치는 거래소 시세에 따라 매일 달라지기 때문에
            같은 더보기라도 어떤 날은 이득이고 어떤 날은 손해가 됩니다.
          </p>

          <h2>더보기 손익 계산 공식</h2>
          <p>
            더보기 손익은 단순합니다. 관문별 더보기로 받는 재료 전체를 현재 거래소 시세로 환산한
            총 가치에서, 더보기 비용(골드)을 빼면 됩니다.
          </p>
          <p>
            <strong>더보기 손익 = 받는 재료의 시세 환산 총 가치 − 더보기 비용</strong>
          </p>
          <p>
            이 값이 양수(+)면 더보기를 사는 것이 같은 재료를 거래소에서 직접 사는 것보다 저렴하다는
            뜻이고, 음수(−)면 그냥 골드를 아끼고 필요한 재료만 거래소에서 사는 편이 낫다는 뜻입니다.
            재료를 당장 쓰지 않고 판매할 계획이라면 거래소 수수료 5%도 감안해야 하므로,
            손익이 소폭 양수인 경우에는 신중하게 판단하는 것이 좋습니다.
          </p>

          <h2>더보기 비용은 귀속 골드에서 우선 차감</h2>
          <p>
            많은 유저가 놓치는 부분인데, 더보기 비용은 <strong>귀속 골드에서 우선 차감</strong>되고
            부족한 만큼만 일반 골드에서 빠져나갑니다. 지평의 성당처럼 전액 귀속 골드를 주는 레이드나
            노말 난이도처럼 절반이 귀속으로 지급되는 레이드를 돌고 있다면,
            귀속 골드는 어차피 거래소에서 쓸 수 없는 골드이므로 더보기의 실질 비용이
            표시 금액보다 훨씬 가볍게 느껴질 수 있습니다.
            귀속 골드가 남아도는 원정대라면 손익분기점을 조금 더 관대하게 잡아도 된다는 의미입니다.
          </p>

          <h2>어떤 레이드부터 더보기를 사야 할까?</h2>
          <p>
            일반적으로 최신 레이드일수록 더보기로 주는 재료의 양이 많아 이득 폭이 큽니다.
            하지만 시세 변동에 따라 순위가 바뀌므로, 레이드를 돌기 전에 그날의 손익을
            확인하는 것이 가장 정확합니다. 로아로골의 더보기 효율 페이지에서는 레이드 카드마다
            전체 관문 합산 더보기 손익과 손익률(%)을 표시하므로,
            초록색 숫자가 큰 레이드부터 더보기를 사면 됩니다.
          </p>

          <h2>거래 불가 재료는 어떻게 계산하나?</h2>
          <p>
            은총의 파편이나 아크그리드용 코어처럼 거래소에서 거래되지 않는 재료는 시세가 없어
            손익 계산에서 제외됩니다. 즉, 표시되는 더보기 손익은 거래 가능한 재료만으로 계산한
            보수적인 수치이며, 해당 재료가 본인에게 필요하다면 실질 가치는 표시된 손익보다
            더 높다고 볼 수 있습니다. 특히 성장 구간에서 은총의 파편이 부족한 캐릭터라면
            손익이 소폭 음수라도 더보기가 실질적으로는 이득일 수 있습니다.
          </p>

          <h2>시세 타이밍과 더보기</h2>
          <p>
            재련 재료 시세는 매주 수요일 초기화 이후 공급이 늘며 하락하는 경향이 있고,
            대형 업데이트를 앞두고는 재련 수요 증가로 상승하는 경향이 있습니다.
            재료 시세가 높은 시기에는 더보기 이득 폭이 커지므로,
            신규 레이드 출시 전후처럼 시세가 들썩이는 시기에는 더보기 손익을 더 자주 확인해보세요.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골 더보기 효율 페이지의 시세는 거래소 데이터 기준으로
              매시간 자동 갱신됩니다. 클리어 보상과 더보기 보상을 관문별로 모두 정리해두었으니,
              레이드 한 번에 재료가 총 얼마나 나오는지도 함께 확인할 수 있습니다.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>오늘 시세 기준으로 어떤 레이드의 더보기가 이득인지 바로 확인해보세요.</p>
            <Link href="/more-reward" className={styles.guideCtaLink}>
              더보기 효율 계산기 바로가기
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
            "headline": "더보기 보상 손익 판단 가이드 - 언제 사야 이득일까",
            "description": "더보기 보상의 구조, 귀속 골드 우선 차감 원리, 시세 기반 손익 계산법과 레이드별 우선순위 판단 기준을 설명합니다.",
            "datePublished": "2026-07-18",
            "dateModified": "2026-07-18",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/more-reward`
          })
        }}
      />
    </div>
  );
}
