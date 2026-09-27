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

/**
 * 카제로스 익스트림 제작소 — 2026-09-25 인게임 제작 화면 기준 (app/extreme/page.tsx CRAFT_ITEMS 와 같은 값).
 * 3막·종막 목록이 같고 주화만 다르다. gold: 숫자 = 1회 제작 골드, 0 = 제작 비용 없음, null = 미확인.
 */
type CraftRow = { group: string; name: string; level: number; limit: number; coin: number; gold: number | null };
const CRAFT_ROWS: CraftRow[] = [
  { group: '특수', name: '고대 코어 랜덤 상자', level: 1770, limit: 2, coin: 50, gold: 50000 },
  { group: '특수', name: '유물 각인서 랜덤 주머니', level: 1780, limit: 2, coin: 20, gold: 5000 },
  { group: '특수', name: '유물 전투 각인서 선택 주머니', level: 1730, limit: 1, coin: 100, gold: 30000 },
  { group: '특수', name: '비상의 돌 각인 지정 키트 상자', level: 1730, limit: 40, coin: 3, gold: null },
  { group: '특수', name: '희귀 지옥 열쇠 교환권 (이벤트)', level: 1730, limit: 4, coin: 10, gold: 15000 },
  { group: '젬', name: '영웅 젬 선택 상자', level: 1730, limit: 2, coin: 20, gold: 10000 },
  { group: '젬', name: '영웅 젬 선택 상자', level: 1770, limit: 2, coin: 20, gold: 10000 },
  { group: '젬', name: '고정형 영웅 젬 선택 상자', level: 1780, limit: 1, coin: 100, gold: 10000 },
  { group: '성장 재료', name: '운명의 파괴/수호석 결정 주머니', level: 1770, limit: 4, coin: 15, gold: 3000 },
  { group: '성장 재료', name: '운명의 파괴/수호석 결정 주머니', level: 1780, limit: 4, coin: 15, gold: 3000 },
  { group: '성장 재료', name: '상급 아비도스 융화 재료 상자', level: 1730, limit: 2, coin: 10, gold: 5000 },
  { group: '성장 재료', name: '상급 아비도스 융화 재료 상자', level: 1770, limit: 2, coin: 10, gold: 5000 },
  { group: '성장 재료', name: '상급 아비도스 융화 재료 상자', level: 1780, limit: 2, coin: 10, gold: 5000 },
  { group: '성장 재료', name: '야금술 선택 상자 VI', level: 1730, limit: 2, coin: 5, gold: 0 },
  { group: '성장 재료', name: '재봉술 선택 상자 VI', level: 1730, limit: 5, coin: 5, gold: 0 },
  { group: '성장 재료', name: '정련된 운명의 돌', level: 1730, limit: 100, coin: 1, gold: null },
  { group: '성장 재료', name: '영롱한 혼돈의 돌 (무기)', level: 1730, limit: 1, coin: 50, gold: null },
  { group: '성장 재료', name: '영롱한 혼돈의 돌 (방어구)', level: 1730, limit: 2, coin: 50, gold: null },
];
const coinAll = (r: CraftRow) => r.coin * r.limit;
const CRAFT_COIN_MAX = Math.max(...CRAFT_ROWS.map(coinAll));
/** 한 막에서 모든 항목을 제한까지 만들 때 필요한 전용 주화 */
const ACT_COIN_ALL = CRAFT_ROWS.reduce((s, r) => s + coinAll(r), 0);
/** 종막에만 있는 고대 코어 선택 상자 (빛과 어둠의 주화 100 + 혼돈의 주화 2) */
const SELECT_BOX_COIN = 100;
const FINAL_COIN_ALL = ACT_COIN_ALL + SELECT_BOX_COIN;
/** 막당 최대 수급 (하드 이상) */
const ACT_COIN_MAX = 900;
const goldLabel = (g: number | null) => (g === null ? '미확인' : g === 0 ? '없음' : g.toLocaleString());

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

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>막당 전용 주화</span>
              <span className={styles.statValue}>최대 {ACT_COIN_MAX}개</span>
              <span className={styles.statNote}>하드 이상, 노말은 700개</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>제작소 전부 만들 때</span>
              <span className={styles.statValue}>{ACT_COIN_ALL.toLocaleString()}개</span>
              <span className={styles.statNote}>3막 기준, 종막은 {FINAL_COIN_ALL.toLocaleString()}개</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>혼돈의 주화</span>
              <span className={styles.statValue}>2개</span>
              <span className={styles.statNote}>선택 상자 1회분과 정확히 같음</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>주화 만료</span>
              <span className={styles.statValue}>11월 25일</span>
              <span className={styles.statNote}>06시, 거래로 보충 불가</span>
            </div>
          </div>

          <h2>주화 3종의 성격</h2>
          <div className={styles.tableScroll}>
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
            종막 익스트림이 11월 18일 점검 전까지라 마지막 주 보상을 받고 쓸 시간은 일주일 정도입니다.
            거래가 안 되니 모자라도 보충할 수 없고, 남기면 그대로 사라집니다.
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
          <div className={styles.tableScroll}>
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

          <h2>카제로스 익스트림 제작소 전체 목록</h2>
          <p>
            제작소는 특수 제작, 젬 제작, 성장 재료 제작 세 갈래이고, <strong>제작 목록은 3막과 종막이 똑같습니다.</strong>{' '}
            쓰는 주화만 3막은 뇌전의 주화, 종막은 빛과 어둠의 주화로 바뀌고, 고대 코어 선택 상자만 종막 목록에 하나 더 있습니다.
            같은 이름이 레벨별로 여러 번 나오는 것은 제작 조건이 다른 별개 항목이라, 원정대 제한도 각각 따로 붙습니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>분류</th>
                  <th>제작 항목</th>
                  <th>레벨</th>
                  <th>원정대 제한</th>
                  <th>1회 주화</th>
                  <th>1회 골드</th>
                  <th>제한까지 주화</th>
                </tr>
              </thead>
              <tbody>
                {CRAFT_ROWS.map((r) => (
                  <tr key={`${r.name}-${r.level}`}>
                    <td>{r.group}</td>
                    <td>{r.name}</td>
                    <td>{r.level}</td>
                    <td>{r.limit}회</td>
                    <td>{r.coin}</td>
                    <td>{goldLabel(r.gold)}</td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${(coinAll(r) / CRAFT_COIN_MAX) * 100}px` }} />
                        <span className={styles.barText}>{coinAll(r)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>특수 (종막)</td>
                  <td><strong>고대 코어 선택 상자</strong></td>
                  <td>1780</td>
                  <td>1회</td>
                  <td>{SELECT_BOX_COIN} + 혼돈 2</td>
                  <td>200,000</td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(SELECT_BOX_COIN / CRAFT_COIN_MAX) * 100}px` }} />
                      <span className={styles.barText}>{SELECT_BOX_COIN}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>
            2026년 9월 25일 인게임 제작 화면 기준 · 주화는 3막 뇌전, 종막 빛과 어둠 · 제한까지 주화 = 1회 주화 × 원정대 제한
          </p>

          <div className={styles.noteBox}>
            <p>
              공식 안내(GM 노트)에는 고대 코어 랜덤 상자가 주화 100개로 나와 있었지만, 실제 제작 화면에서는 50개입니다. 이 글도 처음에는
              100개로 계산했다가 실제 값으로 바로잡았습니다.
            </p>
            <p>
              1회 골드가 &quot;미확인&quot;인 항목은 제작 화면 캡쳐에 비용이 잡히지 않은 것입니다. 주화 개수는 확인된 값이라 아래 주화 계산에는
              그대로 들어갑니다.
            </p>
          </div>

          <h3>한 막의 주화로는 전부 만들 수 없다</h3>
          <p>
            모든 항목을 원정대 제한까지 만들려면 3막에서 뇌전의 주화 {ACT_COIN_ALL.toLocaleString()}개, 종막에서 빛과 어둠의 주화{' '}
            {FINAL_COIN_ALL.toLocaleString()}개가 필요합니다. 하드 이상으로 한 주도 빠지지 않고 모아도 막당 {ACT_COIN_MAX}개라, 3막은{' '}
            {ACT_COIN_ALL - ACT_COIN_MAX}개, 종막은 {FINAL_COIN_ALL - ACT_COIN_MAX}개가 모자랍니다. 노말(막당 700개)이면 격차가 200개씩 더 벌어집니다.
          </p>
          <p>
            막대를 보면 주화가 어디로 많이 빠지는지 드러납니다. 한 번에 드는 주화는 적어도 제한 횟수가 큰 비상의 돌 각인 지정 키트(3개 × 40회)와
            정련된 운명의 돌(1개 × 100회), 고대 코어 랜덤 상자(50개 × 2회), 그리고 한 번에 100개가 드는 유물 전투 각인서 선택 주머니·고정형 영웅 젬 선택 상자·영롱한 혼돈의 돌(방어구)이
            큰 덩어리입니다. 결국 무엇을 뺄지 골라야 하는데, 항목마다 받는 물건의 시세가 달라 정답은 그날 시세에 따라 바뀝니다.{' '}
            <Link href="/extreme">익스트림 보상 페이지</Link>의 제작소는 운명의 파괴/수호석 결정 주머니를 기준(100%)으로 삼아 나머지 항목의 교환 효율을
            실시간 시세로 매겨 줍니다.
          </p>

          <h3>선택 상자는 두 막을 모두 클리어해야 만들 수 있다</h3>
          <p>
            고대 코어 선택 상자에 필요한 혼돈의 주화 2개는 <strong>3막 최초 클리어 1개 + 종막 최초 클리어 1개</strong>가 유일한 경로입니다.
            매주 클리어로는 나오지 않고, 한 막만 클리어하면 1개에서 멈춥니다. 난이도는 상관없어서 노말 클리어로도 혼돈의 주화는 받습니다.
          </p>
          <p>
            다만 제작 조건이 <strong>아이템 레벨 1780 이상</strong>이라, 노말(입장 1730)만 도는 경우에도 원정대에 1780 이상 캐릭터가 있어야 제작할 수 있습니다.
            주화가 원정대 보관이므로 클리어는 낮은 난이도로 하고 제작은 고레벨 캐릭터로 하는 조합이 가능합니다. 1770·1780 조건이 붙은
            다른 항목(고대 코어 랜덤 상자, 유물 각인서 랜덤 주머니, 고정형 영웅 젬 선택 상자 등)도 마찬가지입니다.
          </p>

          <h2>고대 코어만 챙길 때 주화와 골드</h2>
          <p>
            제작소에서 가장 먼저 손이 가는 것은 고대 코어입니다. 고대 코어 항목만 제한까지 만든다고 하면 3막은 랜덤 상자 2회(주화 100개),
            종막은 랜덤 상자 2회와 선택 상자 1회(주화 200개)입니다. 난이도별로 남는 주화는 다음과 같습니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th rowSpan={2}>난이도</th>
                  <th colSpan={3}>뇌전의 주화 (3막)</th>
                  <th colSpan={3}>빛과 어둠의 주화 (종막)</th>
                </tr>
                <tr>
                  <th>수급</th>
                  <th>랜덤 2회</th>
                  <th>남는 양</th>
                  <th>수급</th>
                  <th>랜덤 2회 + 선택 1회</th>
                  <th>남는 양</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>노말</td>
                  <td>700</td><td>-100</td><td><strong>600</strong></td>
                  <td>700</td><td>-200</td><td><strong>500</strong></td>
                </tr>
                <tr>
                  <td>하드</td>
                  <td>900</td><td>-100</td><td><strong>800</strong></td>
                  <td>900</td><td>-200</td><td><strong>700</strong></td>
                </tr>
                <tr>
                  <td>나이트메어</td>
                  <td>900</td><td>-100</td><td><strong>800</strong></td>
                  <td>900</td><td>-200</td><td><strong>700</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            고대 코어에 드는 주화는 막당 100~200개로 수급량의 일부입니다. 남는 500~800개는 위 목록의 나머지 항목에 나눠 쓰게 되고,
            앞에서 본 것처럼 전부 만들기엔 모자라니 효율 순으로 고르는 것이 좋습니다.
          </p>

          <h3>제작 골드가 클리어 골드를 넘는 경우</h3>
          <p>
            고대 코어 항목만 모두 만들어도 골드가 <strong>50,000 × 4 + 200,000 = 400,000골드</strong> 듭니다.
            익스트림에서 8주 동안 버는 골드와 비교하면 난이도에 따라 수지가 갈립니다.
          </p>
          <div className={styles.tableScroll}>
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
                <tr><td>노말</td><td>160,000</td><td>-400,000</td><td style={{ color: '#c0392b' }}><strong>-240,000</strong></td></tr>
                <tr><td>하드</td><td>400,000</td><td>-400,000</td><td><strong>0</strong></td></tr>
                <tr><td>나이트메어</td><td>800,000</td><td>-400,000</td><td><strong>+400,000</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p>
            노말만 도는 경우 익스트림에서 번 골드(160,000)로는 고대 코어 제작비의 절반도 안 되고, 하드는 정확히 맞아떨어집니다.
            나이트메어는 칭호 보상 40만 골드 덕분에 고대 코어를 다 만들고도 40만 골드가 남습니다. 여기에 다른 항목의 제작 골드가 더해지니
            실제 여유는 이보다 줄어듭니다.
          </p>

          <h2>고대 코어 랜덤 상자와 선택 상자</h2>
          <p>
            같은 고대 코어라도 두 상자의 성격이 다릅니다. 랜덤 상자는 주화 50개와 50,000골드로 막마다 원정대 2회까지 만들 수 있어
            개수를 확보하는 쪽이고, 종막의 선택 상자는 혼돈의 주화 2개와 빛과 어둠의 주화 100개, 200,000골드가 들어가는 대신 원하는 코어를 골라 받습니다.
          </p>
          <p>
            <strong>선택 상자는 원정대에서 딱 1회입니다.</strong> 혼돈의 주화가 2개뿐이라 물리적으로도 1회밖에 못 만듭니다.
            어떤 코어를 고를지는 그때 장비 상황에 달렸지만, 되돌릴 수 없는 한 번이라는 점은 미리 알고 있어야 합니다.
            랜덤 상자는 막마다 제한이 따로라, 3막에서 뇌전의 주화로 2회를 채우지 않고 넘기면 그 몫은 종막에서 되찾을 수 없습니다.
          </p>

          <h2>기간별로 챙길 것</h2>
          <ol className={styles.stepFlow}>
            <li className={styles.stepItem}>
              <strong>3막 · 9/23 ~ 10/21</strong>
              최초 클리어로 혼돈의 주화 1개, 매주 뇌전의 주화. 고대 코어 랜덤 상자 2회를 포함해 뇌전의 주화를 3막 안에 배분
            </li>
            <li className={styles.stepItem}>
              <strong>종막 · 10/21 ~ 11/18</strong>
              최초 클리어로 혼돈의 주화 1개(합계 2), 매주 빛과 어둠의 주화. 고대 코어 선택 상자 1회와 랜덤 상자 2회
            </li>
            <li className={styles.stepItem}>
              <strong>11/25 06:00 주화 만료</strong>
              남은 뇌전·빛과 어둠의 주화를 나머지 제작 항목에 전부 소진
            </li>
          </ol>
          <p>
            나이트메어 칭호를 노린다면 3막과 종막에서 각각 한 번씩 나이트메어를 클리어해야 하고,
            매주 보상은 하드와 같으므로 칭호를 챙긴 뒤에는 난이도를 낮춰도 주화·골드 손실이 없습니다.
            이 부분은 <Link href="/guide/extreme-rewards">난이도별 보상 총정리</Link>에서 자세히 계산했습니다.
          </p>

          <h2>정리</h2>
          <ul>
            <li>주화는 3종이고 뇌전(3막)·빛과 어둠(종막)은 서로 호환되지 않습니다.</li>
            <li>혼돈의 주화는 최초 클리어로만 총 2개이고, 고대 코어 선택 상자 1회분에 정확히 맞습니다.</li>
            <li>제작 목록은 3막·종막이 같고, 종막에만 고대 코어 선택 상자가 더 있습니다. 고대 코어 랜덤 상자는 주화 50개 + 5만 골드, 막마다 2회입니다.</li>
            <li>모든 항목을 제한까지 만들려면 막당 {ACT_COIN_ALL.toLocaleString()}~{FINAL_COIN_ALL.toLocaleString()}개가 필요해, 최대 수급 {ACT_COIN_MAX}개로는 모자랍니다.</li>
            <li>고대 코어 항목 제작 골드 40만은 노말 8주 수입(16만)을 넘고, 하드 8주 수입(40만)과 같습니다.</li>
            <li>모든 주화는 11월 25일 06시에 사라지고 거래로 보충할 수 없습니다.</li>
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
            "dateModified": "2026-09-27",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/extreme-coin-craft`
          })
        }}
      />
    </div>
  );
}
