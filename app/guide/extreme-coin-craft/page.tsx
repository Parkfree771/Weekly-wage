import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '익스트림 주화 3종과 카제로스 익스트림 제작소 정리',
  description:
    '뇌전의 주화, 빛과 어둠의 주화, 혼돈의 주화를 어디서 몇 개 받는지와 카제로스 익스트림 제작소의 고대 코어 랜덤 상자·선택 상자 제작 비용을 정리했습니다. 난이도별 8주 주화 수급량, 제작에 필요한 골드, 만료일까지 계산했습니다.',
  keywords:
    '뇌전의 주화, 빛과 어둠의 주화, 혼돈의 주화, 카제로스 익스트림 제작소, 고대 코어 선택 상자, 고대 코어 랜덤 상자, 익스트림 주화, 익스트림 제작, 익스트림 고대 코어, 로아 익스트림 주화',
  alternates: { canonical: '/guide/extreme-coin-craft' },
};

export default function ExtremeCoinCraftGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>레이드</span>
          <h1 className={styles.articleTitle}>익스트림 주화 3종과 카제로스 익스트림 제작소 정리</h1>
          <span className={styles.articleDate}>2026년 9월 18일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            익스트림에서 나오는 재화는 주화 세 종류입니다. 이름이 비슷해 보이지만 획득 경로와 쓰임이 전부 다르고,
            특히 혼돈의 주화는 전체 기간에 딱 2개만 얻을 수 있어 계획 없이 쓰면 되돌릴 수 없습니다.
            주화가 어디서 몇 개 나오는지, 카제로스 익스트림 제작소에서 무엇을 만들 수 있는지 계산해 정리했습니다.
            난이도별 클리어 보상 자체는 <Link href="/guide/extreme-rewards">익스트림 난이도별 보상 총정리</Link>에 따로 정리했습니다.
          </p>

          <h2>주화 3종의 성격</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>주화</th>
                  <th>나오는 곳</th>
                  <th>획득 방식</th>
                  <th>전체 기간 최대</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>뇌전의 주화</strong></td>
                  <td>3막 익스트림</td>
                  <td>매주 클리어 + 최초 클리어 100</td>
                  <td>900 (하드·나이트메어 기준)</td>
                </tr>
                <tr>
                  <td><strong>빛과 어둠의 주화</strong></td>
                  <td>종막 익스트림</td>
                  <td>매주 클리어 + 최초 클리어 100</td>
                  <td>900 (하드·나이트메어 기준)</td>
                </tr>
                <tr>
                  <td><strong>혼돈의 주화</strong></td>
                  <td>3막 · 종막 공통</td>
                  <td><strong>최초 클리어 보상으로만 1개씩</strong></td>
                  <td><strong>2</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            세 주화 모두 <strong>거래 불가·원정대 보관</strong>이고, <strong>2026년 11월 25일 06시에 만료</strong>됩니다.
            종막 익스트림이 11월 18일 점검 전까지이므로 마지막 주 보상을 받고 쓸 시간은 일주일 정도 남습니다.
            거래가 안 되니 거래소에서 보충할 수도 없고, 남기면 그대로 사라집니다.
          </p>
          <p>
            뇌전의 주화와 빛과 어둠의 주화는 <strong>서로 바꿔 쓸 수 없습니다.</strong> 3막 기간에 모은 뇌전의 주화로 종막 제작 항목을 만들 수 없고,
            반대도 마찬가지입니다. 3막이 끝나고 종막이 시작되면 주화가 리셋되는 게 아니라 종류가 바뀌어 따로 쌓인다고 보면 됩니다.
          </p>

          <h2>난이도별 주화 수급량</h2>
          <p>
            한 막은 4주이고, 매주 원정대 단위로 1회 받습니다. 여기에 그 막의 최초 클리어 보상 100개가 더해집니다.
            아래는 한 막에서 모을 수 있는 최대치입니다. 3막의 뇌전의 주화와 종막의 빛과 어둠의 주화가 각각 이만큼씩 쌓입니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>난이도</th>
                  <th>매주 주화</th>
                  <th>4주 누적</th>
                  <th>최초 클리어</th>
                  <th>막당 합계</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>노말</td><td>150</td><td>600</td><td>+100</td><td><strong>700</strong></td></tr>
                <tr><td>하드</td><td>200</td><td>800</td><td>+100</td><td><strong>900</strong></td></tr>
                <tr><td>나이트메어</td><td>200</td><td>800</td><td>+100</td><td><strong>900</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p>
            한 주라도 빠지면 노말은 150개, 하드 이상은 200개가 그대로 사라집니다. 주화는 거래로 채울 수 없으므로
            제작 계획을 세울 때는 &ldquo;몇 주를 확실히 돌 수 있는가&rdquo;를 먼저 정하는 편이 안전합니다.
          </p>

          <h2>카제로스 익스트림 제작소에서 확인된 항목</h2>
          <p>
            제작소에서는 고대 코어 랜덤 상자와 유물 각인서 상자를 비롯해 각종 재련 재료, 젬 선택 상자, 지옥 열쇠 등을 만들 수 있습니다.
            이 중 공식 안내에서 <strong>제작 비용까지 공개된 항목은 고대 코어 두 가지</strong>입니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>제작 항목</th>
                  <th>구분</th>
                  <th>제작 가능 레벨</th>
                  <th>원정대 제한</th>
                  <th>필요 주화</th>
                  <th>제작 비용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>고대 코어 랜덤 상자</strong></td>
                  <td>3막</td>
                  <td>1770 이상</td>
                  <td>2회</td>
                  <td>뇌전의 주화 100</td>
                  <td>50,000골드</td>
                </tr>
                <tr>
                  <td><strong>고대 코어 선택 상자</strong></td>
                  <td>종막</td>
                  <td>1780 이상</td>
                  <td>1회</td>
                  <td>혼돈의 주화 2 + 빛과 어둠의 주화 100</td>
                  <td>200,000골드</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            나머지 항목은 제작 목록에 이름만 확인되고 비용과 제한은 아직 공개되지 않았습니다.
            특수 제작(3막)에 유물 각인서 랜덤 주머니와 유물 전투 각인서 선택 주머니, 젬 제작(3막)에 젬 선택 상자,
            성장 재료 제작(3막)에 재련 재료와 지옥 열쇠가 있고, 특수 제작(종막)에는 고대 코어 랜덤 상자가 다시 등장합니다.
          </p>

          <h3>선택 상자는 두 막을 모두 클리어해야 만들 수 있다</h3>
          <p>
            고대 코어 선택 상자에 필요한 혼돈의 주화 2개는 <strong>3막 최초 클리어 1개 + 종막 최초 클리어 1개</strong>가 유일한 경로입니다.
            매주 클리어로는 나오지 않고, 한 막만 클리어하면 1개에서 멈춥니다. 즉 선택 상자를 만들려면
            3막 익스트림과 종막 익스트림을 각각 최소 한 번씩은 클리어해야 합니다. 난이도는 상관없어서 노말 클리어로도 혼돈의 주화는 받습니다.
          </p>
          <p>
            다만 제작 조건이 <strong>아이템 레벨 1780 이상</strong>이라, 노말(입장 1730)만 도는 캐릭터라도 원정대에 1780 이상 캐릭터가 있어야 제작할 수 있습니다.
            주화가 원정대 보관이므로 클리어는 낮은 난이도로 하고 제작은 고레벨 캐릭터로 하는 조합이 가능합니다.
          </p>

          <h2>주화와 골드가 얼마나 남나</h2>
          <p>
            확인된 두 항목을 최대로 제작했을 때(3막 랜덤 상자 2회 + 종막 선택 상자 1회) 필요한 양과, 난이도별로 남는 주화를 계산했습니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>난이도</th>
                  <th colSpan={3}>뇌전의 주화 (3막)</th>
                  <th colSpan={3}>빛과 어둠의 주화 (종막)</th>
                </tr>
                <tr>
                  <th>수급</th>
                  <th>랜덤 상자 2회</th>
                  <th>남는 양</th>
                  <th>수급</th>
                  <th>선택 상자 1회</th>
                  <th>남는 양</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>노말</td>
                  <td>700</td><td>-200</td><td><strong>500</strong></td>
                  <td>700</td><td>-100</td><td><strong>600</strong></td>
                </tr>
                <tr>
                  <td>하드</td>
                  <td>900</td><td>-200</td><td><strong>700</strong></td>
                  <td>900</td><td>-100</td><td><strong>800</strong></td>
                </tr>
                <tr>
                  <td>나이트메어</td>
                  <td>900</td><td>-200</td><td><strong>700</strong></td>
                  <td>900</td><td>-100</td><td><strong>800</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            고대 코어 제작에 쓰이는 주화는 생각보다 적습니다. 하드 이상 기준으로 3막에서 700개, 종막에서 800개가 남고,
            노말로만 돌아도 각각 500개와 600개가 남습니다. <strong>주화의 대부분은 아직 비용이 공개되지 않은 나머지 제작 항목</strong>
            (유물 각인서 주머니, 젬 선택 상자, 재련 재료, 지옥 열쇠)에 쓰이게 됩니다.
            만료일이 있으니 고대 코어만 챙기고 남은 주화를 방치하지 않도록 목록이 공개되면 바로 배분을 정하는 게 좋습니다.
          </p>

          <h3>제작 골드가 클리어 골드를 넘는 경우</h3>
          <p>
            고대 코어 두 항목을 모두 만들려면 골드가 <strong>50,000 × 2 + 200,000 = 300,000골드</strong> 듭니다.
            익스트림에서 8주 동안 버는 골드와 비교하면 난이도에 따라 수지가 달라집니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>난이도</th>
                  <th>익스트림 8주 골드</th>
                  <th>고대 코어 제작 비용</th>
                  <th>차액</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>노말</td><td>160,000</td><td>-300,000</td><td style={{ color: '#c0392b' }}><strong>-140,000</strong></td></tr>
                <tr><td>하드</td><td>400,000</td><td>-300,000</td><td><strong>+100,000</strong></td></tr>
                <tr><td>나이트메어</td><td>800,000</td><td>-300,000</td><td><strong>+500,000</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p>
            노말만 도는 경우 익스트림에서 번 골드(160,000)보다 제작 비용(300,000)이 더 큽니다.
            부족한 140,000골드는 다른 콘텐츠에서 채워야 하므로, 노말 위주라면 고대 코어 제작을 할지 말지부터 판단해야 합니다.
            나이트메어는 칭호 보상 40만 골드가 들어오기 때문에 두 항목을 다 만들고도 50만 골드가 남습니다.
            여기에 아직 공개되지 않은 제작 항목들의 골드 비용이 더해지므로, 실제 여유는 이보다 줄어듭니다.
          </p>

          <h2>고대 코어 랜덤 상자와 선택 상자</h2>
          <p>
            같은 고대 코어라도 두 상자의 성격이 다릅니다. 3막의 랜덤 상자는 주화 100개와 50,000골드로 원정대 2회까지 만들 수 있어
            개수를 확보하는 쪽이고, 종막의 선택 상자는 혼돈의 주화 2개와 200,000골드가 들어가는 대신 원하는 코어를 골라 받습니다.
          </p>
          <p>
            <strong>선택 상자는 원정대에서 딱 1회입니다.</strong> 혼돈의 주화가 2개뿐이라 물리적으로도 1회밖에 못 만듭니다.
            어떤 코어를 고를지는 그때 장비 상황에 달렸지만, 되돌릴 수 없는 한 번이라는 점은 미리 알고 있어야 합니다.
            반면 랜덤 상자는 3막 기간에만 만들 수 있으므로, 3막이 끝나기 전에 원정대 2회를 채워두지 않으면 기회가 사라집니다.
            종막 제작 목록에도 고대 코어 랜덤 상자가 있지만 비용이 공개되지 않았고, 종막에서는 빛과 어둠의 주화를 쓸 가능성이 높습니다.
          </p>

          <h2>기간별로 챙길 것</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>시기</th>
                  <th>할 일</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>9/23 ~ 10/21<br />(3막 4주)</td>
                  <td>
                    3막 최초 클리어로 혼돈의 주화 1개 확보 · 매주 뇌전의 주화 수급 ·
                    <strong>3막이 끝나기 전에 고대 코어 랜덤 상자 원정대 2회 제작</strong>
                  </td>
                </tr>
                <tr>
                  <td>10/21 ~ 11/18<br />(종막 4주)</td>
                  <td>
                    종막 최초 클리어로 혼돈의 주화 1개 확보(합계 2) · 매주 빛과 어둠의 주화 수급 ·
                    <strong>고대 코어 선택 상자 1회 제작</strong>
                  </td>
                </tr>
                <tr>
                  <td>~ 11/25 06:00</td>
                  <td><strong>주화 만료</strong> — 남은 뇌전·빛과 어둠의 주화를 나머지 제작 항목에 전부 소진</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            나이트메어 칭호를 노린다면 3막과 종막에서 각각 한 번씩 나이트메어를 클리어해야 하고,
            매주 보상은 하드와 같으므로 칭호를 챙긴 뒤에는 난이도를 낮춰도 주화·골드 손실이 없습니다.
            이 부분은 <Link href="/guide/extreme-rewards">난이도별 보상 총정리</Link>에서 자세히 계산했습니다.
          </p>

          <h2>정리</h2>
          <ul>
            <li>주화는 3종이고 뇌전(3막)·빛과 어둠(종막)은 서로 호환되지 않는다.</li>
            <li>혼돈의 주화는 최초 클리어로만 총 2개 — 고대 코어 선택 상자 1회분에 정확히 맞는다.</li>
            <li>확인된 제작 항목은 고대 코어 랜덤 상자(3막, 뇌전 100 + 5만 골드, 2회)와 선택 상자(종막, 혼돈 2 + 빛과 어둠 100 + 20만 골드, 1회) 둘뿐이다.</li>
            <li>고대 코어를 다 만들어도 주화는 막당 500~800개가 남는다 — 나머지 제작 목록 공개 후 배분이 필요하다.</li>
            <li>제작 골드 30만은 노말 8주 수입(16만)을 넘는다.</li>
            <li>모든 주화는 11월 25일 06시에 사라지고 거래로 보충할 수 없다.</li>
          </ul>

          <div className={styles.guideCta}>
            <p>주화별 획득 경로와 제작 비용을 아이콘으로 정리해 두었습니다. 난이도를 눌러 보상을 비교해 보세요.</p>
            <Link href="/extreme" className={styles.guideCtaLink}>
              익스트림 보상 페이지 바로가기
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
            "headline": "익스트림 주화 3종과 카제로스 익스트림 제작소 정리",
            "description": "뇌전의 주화, 빛과 어둠의 주화, 혼돈의 주화의 획득 경로와 카제로스 익스트림 제작소의 고대 코어 제작 비용, 난이도별 주화 수급량을 정리했습니다.",
            "datePublished": "2026-09-18",
            "dateModified": "2026-09-18",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/extreme-coin-craft`
          })
        }}
      />
    </div>
  );
}
