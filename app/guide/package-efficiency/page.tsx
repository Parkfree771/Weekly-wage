import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '패키지 효율 계산 가이드 - 현질 전에 확인할 것들',
  description:
    '로스트아크 패키지 효율 계산 완벽 가이드. 패키지 이득률 계산 원리, 3+1·2+1 묶음 계산법, 가챠 패키지 기대값, 크리스탈 환율 적용, 선택형 패키지 판단 기준을 정리했습니다.',
  keywords:
    '로아 패키지 효율, 로아 패키지 계산, 로아 패키지 추천, 로아 현질 효율, 로아 3+1 패키지, 로아 가챠 패키지, 로얄 크리스탈 환율, 로스트아크 패키지',
  alternates: { canonical: '/guide/package-efficiency' },
};

export default function PackageEfficiencyGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>패키지</span>
          <h1 className={styles.articleTitle}>패키지 효율 계산 가이드 - 현질 전에 확인할 것들</h1>
          <span className={styles.articleDate}>2026년 7월 18일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <h2>패키지 효율이란?</h2>
          <p>
            로스트아크 상점에는 현금 또는 크리스탈로 구매하는 다양한 패키지가 판매됩니다.
            같은 돈을 쓰더라도 패키지 구성에 따라 받는 가치가 크게 달라지기 때문에,
            구매 전에 <strong>패키지에 포함된 아이템의 골드 환산 가치</strong>를 따져보는 것이 중요합니다.
            패키지 효율은 구성품 하나하나를 거래소·경매장 실시간 시세로 환산해 합산한
            총 골드 가치를 결제 금액과 비교한 이득률(%)로 표현합니다.
            이득률이 양수면 시세 기준으로 이득, 음수면 손해라는 뜻입니다.
          </p>

          <h2>이득률 계산의 기본 원리</h2>
          <p>
            핵심은 &quot;이 패키지의 구성품을 전부 골드로 바꾸면 얼마인가&quot;를 구하는 것입니다.
            거래 가능한 아이템은 거래소 시세를 그대로 쓰면 되고, 귀속 아이템은
            같은 효과를 골드로 얻으려면 얼마가 드는지(대체 비용)로 환산합니다.
            여기에 결제 금액을 골드 가치로 환산해 비교하면 이득률이 나옵니다.
            현금 결제 패키지라면 로얄 크리스탈을 골드로 바꾸는 환율을 거쳐 계산합니다.
          </p>

          <h2>3+1, 2+1 묶음 패키지 계산법</h2>
          <p>
            &quot;3+1&quot; 패키지는 3개를 결제하면 4개를 받는 방식입니다. 이 경우 실제 지불 금액은
            3개분, 받는 구성품은 4개분으로 계산해야 정확한 이득률이 나옵니다.
            2+1도 마찬가지로 2개 결제·3개 수령 기준으로 계산합니다.
            묶음 구매 이득률은 단품 구매 이득률보다 항상 높으므로, 어차피 살 패키지라면
            묶음 한도까지 사는 것이 유리한지, 단품으로 충분한지를 이득률 차이로 판단하면 됩니다.
          </p>

          <h2>가챠(뽑기)형 패키지는 기대값으로</h2>
          <p>
            무엇이 나올지 확정되지 않은 뽑기형 패키지는 단순 합산으로 계산할 수 없습니다.
            대신 각 아이템의 당첨 확률과 골드 가치를 곱해 더한 <strong>기대값</strong>을 기준으로
            효율을 계산합니다. 예를 들어 1% 확률로 10만 골드짜리 아이템이 나오는 뽑기라면
            그 항목의 기대 가치는 1,000골드입니다. 기대값은 여러 번 구매했을 때의 평균값이므로,
            소수 구매에서는 실제 결과가 기대값과 크게 다를 수 있다는 점을 항상 염두에 두세요.
          </p>

          <h2>크리스탈 환율은 직접 확인</h2>
          <p>
            로얄 크리스탈을 골드로 환전하는 비율은 시장 상황에 따라 계속 변동합니다.
            환율이 달라지면 같은 패키지의 이득률도 달라지므로, 패키지 효율을 볼 때는
            반드시 <strong>현재 시점의 환율</strong>로 계산해야 합니다.
            로아로골 패키지 효율 페이지에서는 게시물 작성 시점의 환율을 기본값으로 보여주되,
            조회 시점의 실제 환율을 직접 입력하면 총 골드 가치와 이득률이 즉시 재계산됩니다.
          </p>

          <h2>선택형 패키지 판단법</h2>
          <p>
            구성품 중 정해진 개수만 골라 받는 &quot;선택형&quot; 패키지는 무엇을 고르느냐에 따라
            가치가 달라집니다. 기본적으로는 골드 가치가 가장 높은 아이템 순으로 고르는 것이
            효율상 최선이지만, 본인에게 당장 필요한 재료가 있다면 표시 가치보다
            실질 가치가 높을 수 있습니다. 로아로골에서는 선택형 패키지의 항목을 직접 클릭해
            내가 고를 구성 기준으로 이득률을 다시 계산해볼 수 있습니다.
          </p>

          <h2>패키지 구매 전 체크리스트</h2>
          <ol>
            <li><strong>이득률 확인:</strong> 시세 기준 이득률이 양수인지, 비슷한 가격대의 다른 패키지보다 나은지 비교하세요.</li>
            <li><strong>구성품 활용도:</strong> 이득률이 높아도 쓰지 않을 아이템이 대부분이라면 실질 가치는 떨어집니다.</li>
            <li><strong>환율 갱신:</strong> 크리스탈 환율은 수시로 변하므로 구매 직전에 다시 확인하세요.</li>
            <li><strong>묶음 여부:</strong> 3+1, 2+1 한도가 남아 있다면 묶음 기준 이득률로 판단하세요.</li>
          </ol>

          <h2>패키지 유형별 계산식 한눈에</h2>
          <p>
            같은 &quot;이득률 30%&quot;라도 유형에 따라 계산 근거가 다릅니다. 로아로골이 유형별로
            어떤 식을 쓰는지 정리하면 다음과 같습니다. <strong>구성품 가치</strong>는 패키지 1개에
            들어 있는 아이템의 실시간 골드 환산 합계, <strong>가격</strong>은 결제 금액을
            현재 환율로 골드 환산한 값입니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>유형</th>
                <th>구매</th>
                <th>지급</th>
                <th>비교하는 값</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>일반</td>
                <td>1회</td>
                <td>1회</td>
                <td>구성품 가치 ÷ 가격</td>
              </tr>
              <tr>
                <td>2+1</td>
                <td>2회</td>
                <td>3회</td>
                <td>(구성품 가치 × 3) ÷ (가격 × 2)</td>
              </tr>
              <tr>
                <td>3+1</td>
                <td>3회</td>
                <td>4회</td>
                <td>(구성품 가치 × 4) ÷ (가격 × 3)</td>
              </tr>
              <tr>
                <td>3+보너스</td>
                <td>3회</td>
                <td>3회 + 보너스 1회</td>
                <td>(구성품 가치 × 3 + 보너스 가치) ÷ (가격 × 3)</td>
              </tr>
              <tr>
                <td>가챠</td>
                <td>1회</td>
                <td>1개 (확률)</td>
                <td>Σ(아이템 가치 × 확률) ÷ 가격</td>
              </tr>
            </tbody>
          </table>
          <p>
            묶음 패키지의 &quot;1개 구매&quot; 이득률은 보너스를 빼고 순수 1회 기준으로만 계산합니다.
            3회를 다 살 생각이 없다면 이 값을 봐야 하고, 끝까지 살 계획이라면 아래의 묶음 기준
            이득률을 봐야 합니다. 같은 패키지가 1개 기준으로는 손해, 3+1 기준으로는 이득인 경우가
            흔한 이유가 이것입니다.
          </p>

          <h2>3+보너스가 3+1과 다른 점</h2>
          <p>
            3+1은 <strong>같은 구성품을 한 번 더</strong> 주지만, 3+보너스는 3회 구매 시
            <strong> 별도로 구성된 보너스 구성품을 한 번</strong> 줍니다. 그래서 확정 구성품은
            3배가 되고 보너스는 배수가 아닌 고정값으로 한 번만 더해집니다.
            보너스가 &quot;N개 선택&quot; 형태라면 실제로 받는 건 보너스 목록 전체가 아니라 고른 N개뿐이므로,
            로아로골은 현재 시세 기준 가장 비싼 N개를 골라 계산합니다. 갤러리 카드에서 직접
            다른 조합으로 바꿔 보면 이득률이 어떻게 달라지는지 바로 확인할 수 있습니다.
          </p>

          <h2>구성품 종류별 가치 산정 규칙</h2>
          <p>
            패키지에는 거래소에서 바로 시세가 나오는 아이템만 들어 있지 않습니다.
            묶음 단위로 거래되는 재료, 크리스탈로 환산해야 하는 아이템, 열어봐야 아는 상자가
            섞여 있어서 종류별로 다른 규칙을 씁니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>구성품 종류</th>
                <th>가치 산정 방식</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>일반 시세 아이템</td>
                <td>거래소·경매장 현재가 × 수량</td>
              </tr>
              <tr>
                <td>묶음 거래 재료</td>
                <td>묶음 시세 ÷ 묶음 단위 = 개당 단가 (파괴석·수호석 100개, 운명의 파편 3,000개)</td>
              </tr>
              <tr>
                <td>크리스탈 환산 아이템</td>
                <td>블루 크리스탈 소요량 × 현재 환율 (100 블크 = 2,750원 고정)</td>
              </tr>
              <tr>
                <td>선택 상자 (택N)</td>
                <td>후보 중 현재 시세 상위 N개 조합</td>
              </tr>
              <tr>
                <td>확률 상자</td>
                <td>Σ(후보 가치 × 확률) — 기댓값</td>
              </tr>
              <tr>
                <td>티켓·입장권</td>
                <td>해당 콘텐츠의 평균 보상 가치로 역산 (지옥·나락 티켓 등)</td>
              </tr>
            </tbody>
          </table>
          <p>
            선택 상자를 <strong>등록 시점의 선택</strong>이 아니라 <strong>조회 시점의 시세</strong>로
            다시 고르는 이유가 있습니다. 등록할 때는 A가 제일 비쌌더라도 며칠 뒤 B가 역전하면
            실제 구매자는 B를 고를 테니, 저장된 선택을 그대로 쓰면 패키지 가치를 실제보다
            낮게 보게 됩니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골 패키지 효율 페이지에서는 유저들이 등록한 패키지의
              이득률을 실시간 시세로 확인하고, 좋아요·댓글로 의견을 나눌 수 있습니다.
              로그인하면 새 패키지를 직접 등록할 수도 있습니다.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>지금 판매 중인 패키지들의 실시간 이득률을 확인해보세요.</p>
            <Link href="/package" className={styles.guideCtaLink}>
              패키지 효율 계산기 바로가기
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
            "headline": "패키지 효율 계산 가이드 - 현질 전에 확인할 것들",
            "description": "패키지 이득률 계산 원리, 3+1·2+1 묶음 계산법, 가챠 기대값, 크리스탈 환율 적용까지 패키지 구매 판단 기준을 정리했습니다.",
            "datePublished": "2026-07-18",
            "dateModified": "2026-08-20",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/package-efficiency`
          })
        }}
      />
    </div>
  );
}
