import Link from 'next/link';
import { Metadata } from 'next';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '초보자를 위한 골드 수급 가이드',
  description: '로스트아크 초보자를 위한 골드 획득 방법 총정리. 레이드, 카오스 던전, 생활 콘텐츠, 거래소 활용까지 효율적인 골드 수급 전략과 캐릭터 육성법을 안내합니다.',
  keywords: '로아 초보자, 로아 골드 수급, 로아 골드 모으기, 로아 뉴비 가이드, 로아 캐릭터 육성, 로스트아크 초보, 로아 골드 획득 방법, 로아 입문 가이드',
  alternates: { canonical: 'https://lostarkweeklygold.kr/guide/beginner-gold' },
};

export default function BeginnerGoldGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>초보자</span>
          <h1 className={styles.articleTitle}>초보자를 위한 골드 수급 가이드</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>로스트아크에서 골드의 중요성</h2>
          <p>
            골드는 로스트아크의 기본 화폐로, 장비 재련, 거래소 아이템 구매, 각인서 구매 등
            캐릭터 성장의 거의 모든 과정에서 필요합니다. 안정적인 골드 수급 없이는 캐릭터 성장이 어렵기 때문에,
            초보자도 골드 획득 방법을 빠르게 파악하는 것이 중요합니다.
            이 가이드에서는 초보자가 알아야 할 주요 골드 획득 방법과 효율적인 사용 전략을 소개합니다.
          </p>

          <h2>골드 획득 방법 총정리</h2>

          <h3>1. 군단장 레이드 (주간 골드의 핵심)</h3>
          <p>
            레이드 클리어는 로스트아크에서 가장 큰 골드 수입원입니다.
            매주 수요일 오전 6시에 초기화되며, 원정대 내 최대 6캐릭터가 골드를 획득할 수 있습니다.
            캐릭터의 아이템 레벨에 따라 참여 가능한 레이드가 결정되므로,
            아이템 레벨을 올려 더 높은 보상의 레이드에 참여하는 것이 목표입니다.
          </p>

          <h3>2. 카오스 던전</h3>
          <p>
            카오스 던전은 매일 2회씩 입장할 수 있는 던전으로, 재련 재료와 장신구 등을 보상으로 받습니다.
            직접적인 골드 보상은 적지만, 획득한 재료를 거래소에 판매하면 간접적으로 골드를 얻을 수 있습니다.
            매일 꾸준히 진행하면 상당한 재료가 쌓이므로, 일과에 포함시키는 것을 권장합니다.
          </p>

          <h3>3. 가디언 토벌</h3>
          <p>
            가디언 토벌 역시 매일 진행할 수 있는 콘텐츠로, 재련 재료와 돌파석을 보상으로 제공합니다.
            특히 돌파석은 거래소에서 비교적 높은 가격에 거래되므로, 골드 수급에 도움이 됩니다.
            레이드만큼 큰 보상은 아니지만 꾸준히 하면 차이가 납니다.
          </p>

          <h3>4. 생활 콘텐츠</h3>
          <p>
            벌목, 채광, 고고학 등 생활 콘텐츠에서 획득한 자원으로 융화재료를 제작하면
            추가 골드 수입을 얻을 수 있습니다. 생활 에너지가 자동으로 회복되므로,
            에너지가 가득 차기 전에 주기적으로 생활 콘텐츠를 진행하는 것이 좋습니다.
          </p>

          <h3>5. 거래소 활용</h3>
          <p>
            거래소에서 아이템을 사고파는 것도 골드를 얻는 방법입니다.
            레이드에서 획득한 불필요한 장신구, 보석, 재료 등을 거래소에 등록하여 판매하세요.
            시세를 잘 파악하면 저가 매수 후 고가 매도를 통해 시세 차익을 얻을 수도 있습니다.
          </p>

          <h2>초보자 추천 골드 수급 루틴</h2>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>주기</th>
                <th>콘텐츠</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>매일</td>
                <td>카오스 던전 2회</td>
                <td>재련 재료, 장신구 획득</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매일</td>
                <td>가디언 토벌 2회</td>
                <td>돌파석, 재련 재료 획득</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매일</td>
                <td>에포나 의뢰</td>
                <td>명예의 파편, 실링 등 획득</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>수시</td>
                <td>생활 콘텐츠</td>
                <td>에너지 소비, 융화재료 제작</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매주</td>
                <td>레이드 클리어</td>
                <td>주간 골드 핵심 수입원</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매주</td>
                <td>어비스 던전</td>
                <td>골드, 재료, 카드 획득</td>
              </tr>
            </tbody>
          </table>

          <h2>골드 사용 우선순위</h2>
          <p>
            초보자는 골드를 효율적으로 사용하는 것이 중요합니다. 다음 우선순위를 참고하세요:
          </p>
          <ol>
            <li><strong>장비 재련:</strong> 아이템 레벨을 올려야 더 높은 보상의 콘텐츠에 참여할 수 있습니다. 재련은 최우선 투자 대상입니다.</li>
            <li><strong>각인서 및 보석:</strong> 전투 능력을 높여 레이드 클리어를 수월하게 합니다. 재련으로 레벨이 충분해진 후 투자하세요.</li>
            <li><strong>재련 재료 매입:</strong> 시세가 낮을 때 재련 재료를 미리 구매해두면 비용을 절약할 수 있습니다.</li>
            <li><strong>외형 아이템:</strong> 기능에 영향을 주지 않으므로 여유가 생긴 후에 고려하세요.</li>
          </ol>

          <h2>효율적인 캐릭터 육성 방법</h2>
          <p>
            초보자가 가장 빠르게 골드 수급 구조를 갖추려면 다음 전략을 참고하세요:
          </p>
          <ul>
            <li>메인 캐릭터 1개를 먼저 집중적으로 육성하여 높은 레이드에 진입합니다.</li>
            <li>서브 캐릭터를 순차적으로 육성하여 원정대의 주간 골드 총량을 늘립니다.</li>
            <li>6캐릭터가 모두 레이드에 참여하면 주간 골드가 크게 증가합니다.</li>
            <li>각 캐릭터의 아이템 레벨을 레이드 입장 레벨에 맞춰 효율적으로 올리세요.</li>
          </ul>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로골로골의 주간 골드 계산기에 캐릭터명을 입력하면
              원정대 전체의 예상 주간 골드를 자동으로 계산해줍니다. 현재 내 원정대의 수익 구조를 파악하고
              어떤 캐릭터를 먼저 육성할지 전략을 세워보세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로골로골에서 내 원정대의 주간 골드 수익을 확인해보세요.</p>
            <Link href="/weekly-gold" className={styles.guideCtaLink}>
              주간 골드 계산기 바로가기
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
            "headline": "초보자를 위한 골드 수급 가이드",
            "description": "로스트아크를 시작한 초보자가 알아야 할 골드 획득 방법, 우선순위, 효율적인 캐릭터 육성법을 소개합니다.",
            "datePublished": "2026-02-06",
            "author": { "@type": "Organization", "name": "로골로골" },
            "publisher": { "@type": "Organization", "name": "로골로골", "url": "https://lostarkweeklygold.kr" },
            "mainEntityOfPage": "https://lostarkweeklygold.kr/guide/beginner-gold"
          })
        }}
      />
    </div>
  );
}
