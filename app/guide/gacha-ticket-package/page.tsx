import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '가챠 상자와 티켓 패키지, 효율 계산이 어떻게 다른가',
  description:
    '2026년 9월 9일에 올라온 가을 맞이 행운 상자와 낙원 스페셜 패키지를 예로, 확률로 하나만 주는 가챠 상자와 거래소 시세가 없는 지옥·나락 티켓을 각각 어떤 방식으로 골드로 환산하는지 정리했습니다. 층별 티켓 기댓값 표와 두 패키지를 같은 환율로 비교하는 방법까지 다룹니다.',
  keywords:
    '로아 가챠 패키지, 가을 맞이 행운 상자, 낙원 스페셜 패키지, 지옥 티켓 가치, 나락 전설 티켓, 지옥 영웅 티켓, 천상 도전권, 확률 상자 기댓값, 로아 패키지 효율, 패키지 이득률, 로스트아크 패키지 계산',
  alternates: { canonical: '/guide/gacha-ticket-package' },
};

interface GachaRow {
  name: string;
  qty: string;
  prob: string;
  note: string;
}

/** 가을 맞이 행운 상자 구성 — 확률 내림차순, 합 100% */
const GACHA_ITEMS: GachaRow[] = [
  { name: '젬 가공 초기화권', qty: '5개', prob: '12.5', note: '크리스탈 100개짜리 아이템' },
  { name: '영웅 젬 (6종 택1)', qty: '3개', prob: '12.5', note: '질서 3종·혼돈 3종 중 하나' },
  { name: '페온', qty: '40개', prob: '12', note: '크리스탈 8.5개짜리 아이템' },
  { name: '상급 아비도스 융화 재료', qty: '360개', prob: '12', note: '거래소 시세 그대로' },
  { name: '중급 생명의 기운', qty: '10개', prob: '10', note: '크리스탈 23개짜리 아이템' },
  { name: '용암의 숨결', qty: '400개', prob: '9', note: '거래소 시세 그대로' },
  { name: '빙하의 숨결', qty: '400개', prob: '9', note: '거래소 시세 그대로' },
  { name: '어빌리티스톤 키트', qty: '50개', prob: '7.5', note: '크리스탈 76.5개짜리 아이템' },
  { name: '실링', qty: '200만', prob: '7.5', note: '거래되지 않아 골드 환산은 0' },
  { name: '파괴석 결정 1,000 / 수호석 결정 3,000 (택1)', qty: '-', prob: '5', note: '지금 시세로 비싼 쪽을 고른다' },
  { name: '골드', qty: '100,000', prob: '3', note: '가장 낮은 확률' },
];

interface TicketRow {
  tier: string;
  floor: string;
  hell: string;
  narak: string;
}

/**
 * 층(단계)별 티켓 1장 기댓값 — 2026-09-09 거래소 시세, 블루 크리스탈 100개 = 18,333골드 기준.
 * 어빌리티스톤을 평균에서 제외한 값이며(사이트 기본 설정), 시세에 따라 매일 달라진다.
 */
const TICKET_TIERS: TicketRow[] = [
  { tier: '0', floor: '0~9층', hell: '7,444', narak: '37,788' },
  { tier: '2', floor: '20~29층', hell: '15,522', narak: '81,899' },
  { tier: '4', floor: '40~49층', hell: '28,229', narak: '149,322' },
  { tier: '6', floor: '60~69층', hell: '56,432', narak: '290,476' },
  { tier: '7', floor: '70~79층', hell: '78,023', narak: '395,171' },
  { tier: '8', floor: '80~89층', hell: '106,814', narak: '654,532' },
  { tier: '10', floor: '100층', hell: '227,438', narak: '1,215,435' },
];

export default function GachaTicketPackageGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>패키지</span>
          <h1 className={styles.articleTitle}>가챠 상자와 티켓 패키지, 효율 계산이 어떻게 다른가</h1>
          <span className={styles.articleDate}>2026년 9월 9일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            같은 &quot;패키지&quot;라고 불러도 안에 무엇이 들어 있느냐에 따라 값을 매기는 방법이 완전히 달라집니다.
            파괴석이나 숨결처럼 거래소에 시세가 찍히는 재료라면 개수에 시세를 곱하면 끝이지만,
            확률로 하나만 뽑아 주는 상자나 아예 거래가 되지 않는 입장 티켓은 그렇게 계산할 수가 없습니다.
          </p>
          <p>
            2026년 9월 9일에 로아로골 패키지 게시판에 올라온 두 패키지가 마침 이 두 유형을 하나씩 대표합니다.
            하나는 열한 가지 중 하나만 나오는 가챠 상자이고, 다른 하나는 지옥·나락 입장 티켓만 다섯 장 들어 있는 묶음입니다.
            이 글에서는 두 패키지를 예로 들어 각각 어떤 규칙으로 골드 가치를 매기는지,
            그리고 서로 다른 유형을 같은 잣대로 비교하려면 무엇을 맞춰야 하는지 정리합니다.
          </p>

          <h2>이번에 올라온 두 패키지</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>패키지</th>
                  <th>유형</th>
                  <th>가격</th>
                  <th>구성</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>가을 맞이 행운 상자</td>
                  <td>가챠</td>
                  <td>3,300원</td>
                  <td>11종 중 확률로 1종</td>
                </tr>
                <tr>
                  <td>낙원 스페셜 패키지</td>
                  <td>일반</td>
                  <td>22,000원</td>
                  <td>지옥·나락 티켓 5장 + 천상 도전권 3장</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            둘 다 판매 기간은 9월 23일 오전 6시까지로 같습니다.
            가격 차이가 여섯 배가 넘지만, 그렇다고 비싼 쪽이 여섯 배 이득이라는 뜻은 전혀 아닙니다.
            애초에 두 패키지는 &quot;확실한 것을 사는 쪽&quot;과 &quot;확률을 사는 쪽&quot;으로 성격이 다르기 때문입니다.
          </p>

          <h2>가챠 상자: 열한 칸 중 한 칸만 열린다</h2>
          <p>
            가을 맞이 행운 상자는 아래 열한 가지 중 정확히 하나가 나오는 구조입니다.
            확률의 합이 100퍼센트로 딱 맞아떨어지므로 빈손으로 끝나는 칸은 없습니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>나오는 것</th>
                  <th>수량</th>
                  <th>확률</th>
                  <th>골드로 바꾸는 방법</th>
                </tr>
              </thead>
              <tbody>
                {GACHA_ITEMS.map((it) => (
                  <tr key={it.name}>
                    <td>{it.name}</td>
                    <td>{it.qty}</td>
                    <td>{it.prob}%</td>
                    <td>{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            이런 상자의 가치는 기댓값으로 잡습니다.
            각 칸의 골드 가치에 그 칸의 확률을 곱해 전부 더하는 방식이고, 식으로 쓰면 다음과 같습니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>가챠 상자 기댓값</strong> = Σ (칸의 개당 가치 × 수량 × 확률 ÷ 100)
            </p>
          </div>
          <p>
            표를 보면 계산 방법이 칸마다 다르다는 것을 알 수 있습니다.
            숨결이나 상급 아비도스 융화 재료는 거래소 시세를 그대로 쓰지만,
            페온·젬 가공 초기화권·생명의 기운·어빌리티스톤 키트는 거래소에 올라오지 않는 크리스탈 상품이라
            &quot;크리스탈 몇 개짜리인가&quot;를 골드로 환산해 값을 매깁니다.
            그래서 이 칸들의 가치는 거래소 시세가 아니라 여러분이 입력한 환율에 따라 움직입니다.
          </p>
          <p>
            눈여겨볼 칸이 두 군데 있습니다.
            먼저 <strong>실링 200만</strong>은 거래되는 재화가 아니라서 골드 환산이 0으로 잡힙니다.
            실링이 아쉬운 사람에게는 분명 쓸모가 있는 칸이지만, 계산기의 이득률에는 한 푼도 잡히지 않는다는 뜻입니다.
            확률이 7.5퍼센트니까 열세 번에 한 번꼴로 &quot;계산상 0원짜리&quot;가 나오는 셈입니다.
          </p>
          <p>
            다음으로 <strong>선택지가 있는 칸</strong>입니다.
            영웅 젬 칸은 질서 3종·혼돈 3종 중 하나를 고르는 구조이고,
            마지막 칸은 파괴석 결정 1,000개와 수호석 결정 3,000개 중 하나를 고르는 구조입니다.
            이런 칸은 등록자가 골라둔 선택지를 그대로 쓰지 않고, 지금 시세로 가장 비싼 쪽을 다시 고릅니다.
            수호석 3,000개가 파괴석 1,000개보다 쌀 수도 있기 때문에 개수까지 곱해서 비교합니다.
          </p>
          <p>
            그리고 가챠에서 가장 중요한 것은 기댓값이 <strong>여러 번 샀을 때의 평균</strong>이라는 점입니다.
            골드 10만 칸은 확률이 3퍼센트로 가장 낮은데, 기댓값에는 이 칸도 평평하게 섞여 들어갑니다.
            한 번만 사는 사람에게 실제로 일어나는 일은 기댓값이 아니라 위 확률표 그대로입니다.
            표에서 확률이 높은 순서대로 보면 젬 가공 초기화권과 영웅 젬이 각 12.5퍼센트로 가장 자주 나오고,
            이 둘만 합쳐도 네 번에 한 번입니다. 기댓값보다 이 줄을 먼저 보는 편이 체감에 가깝습니다.
          </p>

          <h2>티켓 패키지: 시세가 없는 물건에 값을 매기는 법</h2>
          <p>
            낙원 스페셜 패키지는 확률이 전혀 없습니다. 다음 다섯 종류가 확정으로 들어 있습니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구성품</th>
                  <th>수량</th>
                  <th>값을 매기는 방법</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>나락 전설 티켓</td>
                  <td>1장</td>
                  <td>나락 층 보상 평균으로 역산</td>
                </tr>
                <tr>
                  <td>지옥 전설 티켓</td>
                  <td>1장</td>
                  <td>지옥 층 보상 평균으로 역산</td>
                </tr>
                <tr>
                  <td>지옥 영웅 티켓</td>
                  <td>3장</td>
                  <td>지옥 층 보상 평균으로 역산</td>
                </tr>
                <tr>
                  <td>천상 도전권</td>
                  <td>3장</td>
                  <td>1장 3,000골드 고정가</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            문제는 이 티켓들이 전부 거래 불가라는 점입니다. 거래소에 시세가 없으니 곱할 숫자가 없습니다.
            그래서 로아로골은 티켓 자체가 아니라 <strong>그 티켓으로 열 상자의 기댓값</strong>으로 값을 매깁니다.
            지옥·나락 보상표에서 해당 층의 상자 보상을 전부 골드로 환산해 평균을 낸 값이 곧 티켓 1장의 가치입니다.
          </p>
          <p>
            여기서 층을 몇 층으로 잡느냐가 결정적입니다. 아래는 2026년 9월 9일 시세 기준으로 계산한 티켓 1장의 기댓값입니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>단계</th>
                  <th>층</th>
                  <th>지옥 티켓 1장</th>
                  <th>나락 티켓 1장</th>
                </tr>
              </thead>
              <tbody>
                {TICKET_TIERS.map((t) => (
                  <tr key={t.tier}>
                    <td>{t.tier}</td>
                    <td>{t.floor}</td>
                    <td>{t.hell}G</td>
                    <td>{t.narak}G</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            0층대와 100층의 차이가 지옥은 서른 배, 나락은 서른두 배입니다.
            같은 티켓 한 장인데 &quot;몇 층을 돌 사람이냐&quot;에 따라 가치가 이렇게 벌어집니다.
            그래서 층을 고르지 않고 티켓 패키지의 이득률을 말하는 것은 사실상 의미가 없습니다.
          </p>
          <p>
            로아로골은 기본값으로 지옥 전설 70~79층, 지옥 영웅 60~69층, 나락 전설 20~29층을 씁니다.
            이 기준으로 낙원 스페셜 패키지의 티켓 다섯 장을 더하면 오늘 시세로 약 33만 골드,
            여기에 천상 도전권 3장(9,000골드)이 붙습니다.
            자기 층이 다르다면 상세 페이지의 티켓 카드 안에서 층을 직접 바꿀 수 있고, 그 선택은 브라우저에 기억됩니다.
          </p>
          <div className={styles.tipBox}>
            <p>
              <strong>참고:</strong> 층별 보상 수치 자체는 <Link href="/hell-reward">지옥·나락 보상 계산기</Link>에서
              단계별로 직접 확인할 수 있습니다. 아이템 레벨 1730과 1750 구간을 각각 볼 수 있고,
              층을 깰 때마다 확정으로 받는 기본 보상(운명의 파편·파괴석 결정·수호석 결정·위대한 돌파석)도 함께 계산됩니다.
              패키지의 티켓 평가는 현재 최고 구간인 1750 표를 기준으로 합니다.
            </p>
          </div>
          <p>
            제목에 붙은 &quot;시즌4 보상 반영x&quot;는 이 지점을 짚은 것입니다.
            티켓 가치는 지금 시점의 보상표로 계산한 값이라, 시즌이 바뀌어 보상 구성이 달라지면 같은 티켓의 가치도 달라집니다.
            판매 기간이 시즌 경계에 걸쳐 있다면 이 부분을 감안하고 봐야 합니다.
          </p>

          <h2>가격이 다른 두 패키지를 같은 잣대로 놓기</h2>
          <p>
            여기까지 오면 두 패키지 모두 구성품 가치를 골드로 구할 수 있습니다.
            그런데 가격은 원 단위입니다. 3,300원과 22,000원을 골드로 옮겨야 비교가 되는데,
            이때 쓰는 환율은 사람마다 다릅니다.
          </p>
          <p>
            실제로 이번 두 글은 등록자가 서로 다른 환율을 넣었습니다.
            가을 맞이 행운 상자는 1원당 6.4골드, 낙원 스페셜 패키지는 1원당 약 7.34골드로 등록되어 있습니다.
            환율이 다르면 같은 22,000원도 140,800골드가 되기도 하고 161,500골드가 되기도 합니다.
            이 상태로 두 패키지의 이득률을 나란히 놓고 비교하면 구성품이 아니라 환율 차이를 비교하는 꼴이 됩니다.
          </p>
          <p>
            그래서 갤러리 상단의 공통 환율을 한 번 입력해 두는 것이 중요합니다.
            공통 환율을 넣으면 모든 글이 같은 환율로 다시 환산되므로,
            그때부터는 이득률 순서와 효율순 정렬이 정확히 일치하고 패키지끼리의 비교도 의미를 갖습니다.
          </p>

          <h2>사기 전에 확인할 것</h2>
          <p>
            마지막으로 이 두 유형을 볼 때 각각 짚어야 할 지점을 정리하면 다음과 같습니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>유형</th>
                  <th>이득률 숫자의 성격</th>
                  <th>확인할 것</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>가챠 상자</td>
                  <td>여러 번 샀을 때의 평균</td>
                  <td>한 번만 살 거라면 확률표를 먼저 볼 것. 계산상 0원인 칸이 있는지도 확인</td>
                </tr>
                <tr>
                  <td>티켓 패키지</td>
                  <td>특정 층을 돈다는 가정 위의 값</td>
                  <td>내가 실제로 도는 층으로 바꿔서 볼 것. 안 도는 콘텐츠면 가치는 0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            공통으로는 구성품이 지금 나에게 필요한 것인지가 결국 마지막 판단 기준입니다.
            이득률이 높아도 전부 쓰지 않는 재료라면 실질 가치는 그만큼 되지 않고,
            반대로 당장 재련에 막혀 있다면 표시값보다 체감 가치가 높습니다.
            계산기의 숫자는 &quot;지금 시세로 바꾸면 얼마인가&quot;를 알려 줄 뿐,
            &quot;나에게 얼마짜리인가&quot;까지 답해 주지는 않습니다.
          </p>
          <p>
            구성품 하나하나를 어떤 규칙으로 골드로 바꾸는지 더 자세히 보고 싶다면{' '}
            <Link href="/guide/package-value-formula">패키지 구성품 골드 환산 공식 정리</Link>에
            항목별로 정리되어 있습니다.
          </p>

          <div className={styles.guideCta}>
            <p>두 패키지의 이득률을 지금 시세로 직접 확인해 보세요.</p>
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
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: '가챠 상자와 티켓 패키지, 효율 계산이 어떻게 다른가',
            description:
              '2026년 9월 9일 등록된 가을 맞이 행운 상자와 낙원 스페셜 패키지를 예로, 확률 상자의 기댓값 계산과 거래 불가 티켓의 층 기댓값 역산 방식을 비교해 정리했습니다.',
            datePublished: '2026-09-09',
            dateModified: '2026-09-09',
            author: { '@type': 'Organization', name: '로아로골' },
            publisher: { '@type': 'Organization', name: '로아로골', url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}/guide/gacha-ticket-package`,
          }),
        }}
      />
    </div>
  );
}
