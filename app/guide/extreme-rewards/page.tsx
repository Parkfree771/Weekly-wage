import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '익스트림 3막·종막 난이도별 보상 총정리 (노말·하드·나이트메어)',
  description:
    '2026년 9월 23일 시작하는 카제로스 레이드 3막·종막 익스트림의 난이도별 클리어 골드와 전용 주화, 최초 클리어 보상, 나이트메어 전설 칭호와 20만 골드까지 표로 정리했습니다. 8주 동안 난이도별로 받는 총 골드와 주화, 하드와 나이트메어의 실제 차이도 계산했습니다.',
  keywords:
    '익스트림 보상, 익스트림 3막, 익스트림 종막, 익스트림 나이트메어, 익스트림 하드, 익스트림 노말, 뇌전의 군주, 파멸의 군주, 익스트림 칭호, 익스트림 20만 골드, 모르둠 익스트림, 카제로스 익스트림, 로아 익스트림 보상',
  alternates: { canonical: '/guide/extreme-rewards' },
};

export default function ExtremeRewardsGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>레이드</span>
          <h1 className={styles.articleTitle}>익스트림 3막·종막 난이도별 보상 총정리</h1>
          <span className={styles.articleDate}>2026년 9월 18일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            9월 23일 정기 점검 이후부터 카제로스 레이드 3막과 종막에 익스트림이 추가됩니다.
            3막에서는 심연의 징벌자 모르둠, 종막에서는 대악마 카제로스에 다시 도전하게 되고,
            두 레이드 모두 각 레이드의 최종 관문을 기반으로 만들어진 콘텐츠입니다.
            보상은 매주 반복되는 클리어 보상과 막마다 한 번만 받는 최초 클리어 보상으로 나뉘며,
            나이트메어에는 전설 등급 칭호와 20만 골드가 따로 붙습니다.
          </p>

          <h2>일정과 입장 조건</h2>
          <p>
            3막이 먼저 4주, 이어서 종막이 4주 진행됩니다. 두 막이 겹치는 기간은 없고, 전체 기간은 8주입니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>구분</th>
                  <th>보스</th>
                  <th>기간</th>
                  <th>전용 주화</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>3막 익스트림</strong></td>
                  <td>심연의 징벌자, 모르둠</td>
                  <td>9월 23일(수) 점검 후 ~ 10월 21일(수) 점검 전</td>
                  <td>뇌전의 주화</td>
                </tr>
                <tr>
                  <td><strong>종막 익스트림</strong></td>
                  <td>대악마, 카제로스</td>
                  <td>10월 21일(수) 점검 후 ~ 11월 18일(수) 점검 전</td>
                  <td>빛과 어둠의 주화</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            난이도는 세 단계이고, 입장 아이템 레벨과 부활 규칙이 다릅니다.
            노말과 하드는 익스트림에서 부활 규칙이 조정되어 횟수 제한 없이 부활하며 도전을 이어갈 수 있고,
            나이트메어만 기존과 동일하게 부활이 불가능합니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>난이도</th>
                  <th>입장 아이템 레벨</th>
                  <th>부활</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>노말</td><td>1730 이상</td><td>횟수 제한 없음</td></tr>
                <tr><td>하드</td><td>1770 이상</td><td>횟수 제한 없음</td></tr>
                <tr><td><strong>나이트메어</strong></td><td>1780 이상</td><td>부활 불가</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            하드와 나이트메어의 입장 레벨 차이는 10입니다. 1770에서 1780으로 올리는 것이 나이트메어 진입의 조건이고,
            뒤에서 보겠지만 그 10 레벨이 가져오는 것은 매주 보상이 아니라 한 번뿐인 칭호 보상입니다.
          </p>

          <h2>매주 클리어 보상</h2>
          <p>
            <strong>원정대 단위로 주 1회</strong>입니다. 캐릭터를 여러 개 돌려서 중복으로 받을 수 없다는 뜻이라,
            일반 레이드처럼 캐릭터 수만큼 곱해지지 않습니다. 3막 기간에는 뇌전의 주화가, 종막 기간에는 빛과 어둠의 주화가 지급되고
            골드와 주화 수량은 두 막이 같습니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>난이도</th>
                  <th>클리어 골드</th>
                  <th>전용 주화</th>
                  <th>4주 골드 (한 막)</th>
                  <th>4주 주화 (한 막)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>노말</td><td>20,000</td><td>150</td><td>80,000</td><td>600</td></tr>
                <tr><td>하드</td><td>50,000</td><td>200</td><td>200,000</td><td>800</td></tr>
                <tr><td><strong>나이트메어</strong></td><td>50,000</td><td>200</td><td>200,000</td><td>800</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            표에서 바로 보이듯 <strong>하드와 나이트메어의 매주 보상은 완전히 같습니다.</strong> 골드도 50,000으로 동일하고 주화도 200개로 같습니다.
            노말만 골드가 20,000으로 30,000 적고, 주화가 150개로 50개 적습니다.
          </p>

          <h2>최초 클리어 보상</h2>
          <p>
            난이도와 관계없이 3막 익스트림과 종막 익스트림을 각각 처음 클리어하면 받는 보상입니다.
            노말로 클리어해도 같은 구성을 받습니다. 두 막에서 각각 한 번씩이므로 전체 기간에 두 번 받게 됩니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>보상</th>
                  <th>3막 최초 클리어</th>
                  <th>종막 최초 클리어</th>
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>도약의 전설 카드 선택 팩 II</td><td>1</td><td>1</td><td>2</td></tr>
                <tr><td>영웅 젬 선택 상자</td><td>1</td><td>1</td><td>2</td></tr>
                <tr><td>젬 가공 초기화권</td><td>1</td><td>1</td><td>2</td></tr>
                <tr><td><strong>혼돈의 주화</strong></td><td>1</td><td>1</td><td><strong>2</strong></td></tr>
                <tr><td>전용 주화</td><td>뇌전의 주화 100</td><td>빛과 어둠의 주화 100</td><td>각 100</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            여기서 <strong>혼돈의 주화</strong>가 중요합니다. 매주 클리어로는 나오지 않고 오직 최초 클리어 보상으로만 1개씩,
            두 막을 합쳐 총 2개만 얻을 수 있습니다. 종막의 고대 코어 선택 상자를 제작할 때 정확히 2개가 필요하기 때문에,
            3막과 종막을 모두 클리어해야 선택 상자를 만들 수 있는 구조입니다.
            주화 쪽 계산은 <Link href="/guide/extreme-coin-craft">익스트림 주화와 제작소 정리</Link>에서 따로 다뤘습니다.
          </p>

          <h2>나이트메어 추가 보상</h2>
          <p>
            나이트메어 난이도를 처음 클리어하면 위의 최초 클리어 보상과 <strong>별개로</strong> 다음을 추가로 받습니다. 막마다 한 번씩입니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>보상</th>
                  <th>3막 나이트메어</th>
                  <th>종막 나이트메어</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>전설 등급 칭호</td><td>뇌전의 군주</td><td>파멸의 군주</td></tr>
                <tr><td><strong>골드</strong></td><td><strong>200,000</strong></td><td><strong>200,000</strong></td></tr>
                <tr><td>특별 이모티콘</td><td>지급</td><td>지급</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            여기에 더해 <strong>3막 익스트림과 종막 익스트림의 나이트메어를 모두 클리어하면 심볼이 포함된 유물 등급 칭호</strong>를 추가로 획득합니다.
            전설 칭호 두 개와는 별개의 보상이므로, 나이트메어를 양쪽 다 클리어하면 칭호는 전설 2개 + 유물 1개로 총 3개가 됩니다.
          </p>

          <h2>8주 총합: 난이도별로 얼마나 차이 나나</h2>
          <p>
            3막 4주와 종막 4주를 같은 난이도로 계속 진행했다고 가정한 총량입니다.
            골드는 매주 클리어 골드 8회분에 나이트메어의 칭호 보상 골드(막마다 20만, 2막이면 40만)를 더한 값입니다.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>난이도</th>
                  <th colSpan={3}>골드</th>
                  <th colSpan={2}>주화 (막당)</th>
                </tr>
                <tr>
                  <th>클리어 8주</th>
                  <th>칭호 보상</th>
                  <th>총 골드</th>
                  <th>매주 4주분</th>
                  <th>최초 포함 합계</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>노말</td>
                  <td>160,000</td><td>-</td><td><strong>160,000</strong></td>
                  <td>600</td><td>700</td>
                </tr>
                <tr>
                  <td>하드</td>
                  <td>400,000</td><td>-</td><td><strong>400,000</strong></td>
                  <td>800</td><td>900</td>
                </tr>
                <tr>
                  <td><strong>나이트메어</strong></td>
                  <td>400,000</td><td>+400,000</td><td><strong>800,000</strong></td>
                  <td>800</td><td>900</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            주화는 막마다 따로 계산해야 합니다. 3막에서 뇌전의 주화를, 종막에서 빛과 어둠의 주화를 받으므로
            나이트메어 기준으로 뇌전의 주화 900개와 빛과 어둠의 주화 900개를 각각 모으게 됩니다. 두 주화는 서로 바꿔 쓸 수 없습니다.
          </p>

          <h2>난이도를 한 단계 올리면 달라지는 것</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>노말 → 하드</th>
                  <th>하드 → 나이트메어</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>입장 레벨</td><td>1730 → 1770 (+40)</td><td>1770 → 1780 (+10)</td></tr>
                <tr><td>매주 클리어 골드</td><td>+30,000</td><td>변화 없음</td></tr>
                <tr><td>매주 전용 주화</td><td>+50</td><td>변화 없음</td></tr>
                <tr><td>8주 골드</td><td>+240,000</td><td>+400,000 (칭호 보상)</td></tr>
                <tr><td>막당 주화</td><td>+200</td><td>변화 없음</td></tr>
                <tr><td>칭호</td><td>없음</td><td>전설 2개 + 유물 1개</td></tr>
                <tr><td>부활</td><td>제한 없음 유지</td><td>부활 불가</td></tr>
              </tbody>
            </table>
          </div>

          <h3>노말에서 하드로: 반복 보상이 늘어난다</h3>
          <p>
            노말과 하드의 차이는 전부 매주 반복되는 쪽에 있습니다. 주당 골드가 20,000에서 50,000으로 2.5배가 되고 주화도 150에서 200으로 늘어납니다.
            8주를 채우면 골드 차이만 240,000이고, 막당 주화도 200개 더 쌓입니다.
            입장 레벨이 1730에서 1770으로 40이나 벌어져 있어 진입 자체가 쉽지는 않지만, 올라갈 수 있다면 매주 돌아오는 이득이 그만큼 큽니다.
          </p>

          <h3>하드에서 나이트메어로: 반복 보상은 그대로, 한 번뿐인 보상만 늘어난다</h3>
          <p>
            이 구간은 성격이 다릅니다. <strong>매주 받는 골드와 주화가 완전히 같기 때문에</strong>, 나이트메어를 매주 도는 것과
            하드를 매주 도는 것은 반복 수익이 동일합니다. 나이트메어에만 있는 것은 최초 클리어 한 번에 붙는
            전설 칭호, 이모티콘, 그리고 20만 골드입니다.
          </p>
          <p>
            뒤집어 말하면 <strong>나이트메어는 막마다 한 번만 클리어하면 받을 것을 다 받습니다.</strong>
            3막 기간에 나이트메어를 한 번 뚫어 칭호와 20만 골드를 챙긴 뒤, 남은 주차는 하드로 돌아도 손해가 없습니다.
            나이트메어는 부활이 불가능해 시도 부담이 크므로, 공격대 사정에 따라 &ldquo;첫 주에 나이트메어 한 번, 이후 하드&rdquo;라는 선택이
            보상 손실 없이 가능하다는 점은 알아두면 좋습니다. 다만 두 막의 나이트메어를 모두 클리어해야 유물 등급 칭호가 나오므로,
            칭호를 노린다면 3막과 종막 양쪽에서 각각 한 번씩은 뚫어야 합니다.
          </p>

          <h2>다른 레이드와 비교하면</h2>
          <p>
            익스트림 나이트메어의 매주 클리어 골드는 50,000입니다. 벨가르딘 나이트메어가 더보기까지 전부 구매했을 때
            실수령 51,000골드인 것과 비슷한 수준인데, <strong>익스트림에는 더보기가 없어 골드를 되돌려주는 지출이 없습니다.</strong>
            벨가르딘은 클리어 골드 75,000에서 더보기 비용 24,000을 빼서 51,000이 남는 구조지만, 익스트림은 50,000이 그대로 남습니다.
            레이드별 클리어 골드와 더보기 구조 비교는 <Link href="/guide/raid-rewards">레이드 보상 총정리</Link>와{' '}
            <Link href="/guide/belgardin-rewards">벨가르딘 관문별 보상 정리</Link>에 정리해 두었습니다.
          </p>
          <p>
            대신 결정적인 차이가 하나 있습니다. 익스트림은 <strong>원정대 단위 주 1회</strong>라 캐릭터를 늘려도 보상이 늘지 않습니다.
            일반 레이드는 캐릭터마다 주간 골드를 받을 수 있어 부캐 수만큼 곱해지지만, 익스트림은 원정대에서 한 번입니다.
            그래서 8주 총 800,000골드(나이트메어)는 원정대 전체가 그 기간에 얻는 값이고, 주 평균으로는 100,000골드가 됩니다.
            캐릭터별 주간 골드 한도와 귀속 골드 구조는 <Link href="/weekly-gold">주간 골드 계산기</Link>에서 확인할 수 있습니다.
          </p>

          <h2>놓치기 쉬운 것</h2>
          <ul>
            <li>
              <strong>주화 만료일</strong> — 뇌전의 주화와 빛과 어둠의 주화는 모두 2026년 11월 25일 06시에 만료됩니다.
              종막 익스트림 종료(11월 18일)보다 일주일 뒤이므로, 마지막 주에 받은 주화까지 쓸 시간은 있지만 남겨두면 사라집니다.
            </li>
            <li>
              <strong>거래 불가·원정대 보관</strong> — 세 주화 모두 거래할 수 없고 원정대 단위로 보관됩니다. 캐릭터끼리 나눠 모을 필요가 없습니다.
            </li>
            <li>
              <strong>최초 클리어 보상은 난이도를 가리지 않습니다</strong> — 노말로 클리어해도 카드 팩, 영웅 젬 선택 상자, 혼돈의 주화, 젬 가공 초기화권,
              전용 주화 100개를 그대로 받습니다. 나이트메어 추가분(칭호·이모티콘·20만 골드)만 난이도 조건이 붙습니다.
            </li>
            <li>
              <strong>패턴 변화</strong> — 3막은 협동이 중요해지는 패턴이 새로 등장하고, 종막은 카제로스의 공격이 강조되는 대신
              반복 구간이 덜어져 전투가 더 빠르게 진행됩니다. 기존 3막·종막과 같은 흐름이라고 생각하면 당황할 수 있습니다.
            </li>
            <li>
              <strong>익스트림 드롭스 이벤트</strong>가 같은 기간에 진행될 예정입니다. 드롭스 페이지에서 계정을 연동하고 방송을 시청하면 별도 보상을 받습니다.
            </li>
          </ul>

          <div className={styles.guideCta}>
            <p>난이도 카드를 눌러 3막·종막 보상을 나란히 비교하고, 주화 제작소 비용까지 한 화면에서 볼 수 있습니다.</p>
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
            "headline": "익스트림 3막·종막 난이도별 보상 총정리",
            "description": "카제로스 레이드 3막·종막 익스트림의 난이도별 클리어 골드와 전용 주화, 최초 클리어 보상, 나이트메어 전설 칭호와 20만 골드를 표로 정리했습니다.",
            "datePublished": "2026-09-18",
            "dateModified": "2026-09-18",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/extreme-rewards`
          })
        }}
      />
    </div>
  );
}
