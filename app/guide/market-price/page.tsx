import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';
import {
  TRACKED_ITEMS,
  SUCCESSION_TO_NORMAL_MATERIAL_MAP,
  getItemsByCategory,
  type ItemCategory,
} from '@/lib/items-to-track';
import { PRICE_EVENTS, getEventDisplayName } from '@/lib/price-events';
import archive from '@/public/data/history_archive.json';

export const metadata: Metadata = {
  title: '거래소 시세 활용 가이드 - 시세 차트 보는 법',
  description:
    '로스트아크 거래소 시세 활용 가이드. 시세 변동 패턴, 매매 타이밍, 로아로골 시세 차트 활용법, 재련 재료와 보석 시세 분석 방법을 알아보세요. 수수료 본전 계산과 업데이트 전후 실제 시세 변화도 기록으로 확인합니다.',
  keywords:
    '로아 거래소, 로아 시세, 로아 시세 차트, 로아 가격 변동, 로아 거래소 시세, 로아 매매 타이밍, 로아 재련 재료 시세, 로스트아크 거래소 가이드',
  alternates: { canonical: '/guide/market-price' },
};

// ── 추적 범위: lib/items-to-track.ts 에서 직접 센다 ──
const MARKET_COUNT = TRACKED_ITEMS.filter((i) => i.type === 'market').length;
const AUCTION_COUNT = TRACKED_ITEMS.filter((i) => i.type === 'auction').length;

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  refine: '재련 재료',
  refine_additional: '재련 추가 재료',
  gem: '젬',
  engraving: '유물 각인서',
  accessory: '악세',
  bracelet: '팔찌',
  jewel: '보석',
};
const CATEGORIES = (Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((c) => {
  const items = getItemsByCategory(c);
  const auction = items.filter((i) => i.type === 'auction').length;
  return {
    key: c,
    label: CATEGORY_LABELS[c],
    count: items.length,
    where: auction === 0 ? '거래소' : auction === items.length ? '경매장' : '거래소·경매장',
    sample: items[0]?.name ?? '-',
  };
});
const MAX_CAT = Math.max(...CATEGORIES.map((c) => c.count));

// 계승 재료 차트의 비교선 배율 (계승 1개를 일반 재료 몇 개 값과 겹쳐 그리는지)
const SUCCESSION_RATIOS = [...new Set(Object.values(SUCCESSION_TO_NORMAL_MATERIAL_MAP).map((m) => m.ratio))];
const SUCCESSION_NAMES = Object.keys(SUCCESSION_TO_NORMAL_MATERIAL_MAP)
  .map((id) => TRACKED_ITEMS.find((i) => i.id === id)?.name)
  .filter(Boolean)
  .join(', ');

// ── 거래소 수수료 (본문 기준 5%) ──
const FEE = 0.05;
const BREAK_EVEN = 1 / (1 - FEE) - 1;

// ── 이벤트 전후 시세: 빌드에 들어 있는 과거 시세 아카이브(일 단위)에서 계산 ──
type Point = { date: string; price: number };
const ARCHIVE = archive as unknown as Record<string, Point[]>;
const EVENT_ITEMS = [
  { id: '66102007', name: '파괴석 결정' },
  { id: '66102107', name: '수호석 결정' },
  { id: '66110226', name: '위대한 돌파석' },
  { id: '66111131', name: '용암의 숨결' },
  { id: '66130143', name: '파편 주머니(대)' },
];
const WINDOW = 7;
const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

/** 이벤트 직전 7일 평균 → 이벤트 당일 포함 7일 평균 변화율. 어느 쪽이든 7일이 다 없으면 null */
function eventChange(id: string, date: string): number | null {
  const byDate = new Map((ARCHIVE[id] ?? []).map((p) => [p.date, p.price]));
  const pick = (from: number) =>
    Array.from({ length: WINDOW }, (_, i) => byDate.get(addDays(date, from + i))).filter(
      (v): v is number => v !== undefined
    );
  const before = pick(-WINDOW);
  const after = pick(0);
  if (before.length < WINDOW || after.length < WINDOW) return null;
  return avg(after) / avg(before) - 1;
}

const EVENT_ROWS = PRICE_EVENTS.map((e) => ({
  date: e.date,
  name: getEventDisplayName(e),
  changes: EVENT_ITEMS.map((it) => eventChange(it.id, e.date)),
})).filter((r) => r.changes.some((c) => c !== null));

const ALL_CHANGES = EVENT_ROWS.flatMap((r) => r.changes).filter((c): c is number => c !== null);
const BIG_MOVES = ALL_CHANGES.filter((c) => Math.abs(c) >= 0.1).length;
const UP = ALL_CHANGES.filter((c) => c > 0).length;
const DOWN = ALL_CHANGES.filter((c) => c < 0).length;
const BIGGEST_UP = Math.max(...ALL_CHANGES);
const BIGGEST_DOWN = Math.min(...ALL_CHANGES);
const findCell = (v: number) => {
  for (const r of EVENT_ROWS) {
    const i = r.changes.indexOf(v);
    if (i >= 0) return { event: r.name, item: EVENT_ITEMS[i].name };
  }
  return null;
};
const UP_CELL = findCell(BIGGEST_UP);
const DOWN_CELL = findCell(BIGGEST_DOWN);
const MIXED_EVENTS = EVENT_ROWS.filter((r) => {
  const v = r.changes.filter((c): c is number => c !== null);
  return v.some((c) => c > 0) && v.some((c) => c < 0);
}).length;

const ARCHIVE_DATES = Object.values(ARCHIVE).flatMap((a) => (Array.isArray(a) ? a.map((p) => p.date) : []));
const ARCHIVE_START = ARCHIVE_DATES.reduce((m, d) => (d < m ? d : m), '9999');
const ARCHIVE_END = ARCHIVE_DATES.reduce((m, d) => (d > m ? d : m), '0000');

const signedPct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

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
          <span className={styles.articleDate}>2026년 2월 6일 작성 · 2026년 7월 18일 업데이트</span>
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
          <p>
            수수료는 파는 쪽에서만 떼기 때문에, 산 가격 그대로 되팔면 {(FEE * 100).toFixed(0)}%를 잃습니다. 본전이
            되려면 판매가가 매수가의 1 ÷ {(1 - FEE).toFixed(2)}배, 즉 매수가보다 약{' '}
            {(BREAK_EVEN * 100).toFixed(2)}% 높아야 합니다. 1,000골드에 산 물건이라면{' '}
            {Math.ceil(1000 / (1 - FEE)).toLocaleString()}골드 이상에 팔아야 손해가 없습니다.
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
            재련 재료 시세가 크게 상승합니다. 2026년 8월 벨가르딘 출시처럼 대형 업데이트가
            예고된 시기에는 미리 재료를 확보해두면 비용을 절약할 수 있습니다.
            반대로 업데이트 직후에는 이벤트 보상 등으로 공급이 늘어 시세가 안정화되는 패턴을 보입니다.
          </p>

          <h3>이벤트 패턴</h3>
          <p>
            로스트아크에서 재련 지원 이벤트가 진행되면 재련 재료의 수요가 증가합니다.
            반면 재련 재료를 보상으로 주는 이벤트가 있으면 공급이 늘어 가격이 하락합니다.
            공지사항을 주시하고 이벤트에 맞춰 매매 타이밍을 잡는 것이 좋습니다.
          </p>

          <h2>업데이트·방송 전후 시세, 실제 기록으로 보면</h2>
          <p>
            위 패턴이 실제로 어땠는지 로아로골에 쌓인 일 단위 시세 기록({ARCHIVE_START} ~ {ARCHIVE_END})으로
            확인해 봤습니다. 시세 차트에 표시하는 이벤트 가운데 앞뒤 {WINDOW}일 기록이 모두 있는 것만 골라,
            이벤트 직전 {WINDOW}일 평균과 이벤트 당일부터 {WINDOW}일 평균을 비교했습니다.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>비교한 경우</span>
              <span className={styles.statValue}>{ALL_CHANGES.length}건</span>
              <span className={styles.statNote}>이벤트 {EVENT_ROWS.length}개 × 재료</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>오른 경우</span>
              <span className={styles.statValue}>{UP}건</span>
              <span className={styles.statNote}>최대 {signedPct(BIGGEST_UP)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>내린 경우</span>
              <span className={styles.statValue}>{DOWN}건</span>
              <span className={styles.statNote}>최대 {signedPct(BIGGEST_DOWN)}</span>
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>이벤트</th>
                  {EVENT_ITEMS.map((it) => (
                    <th key={it.id}>{it.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVENT_ROWS.map((r) => (
                  <tr key={r.date}>
                    <td style={{ fontWeight: 600 }}>
                      {r.name}
                      <br />
                      <span style={{ fontWeight: 400, fontSize: '0.8em' }}>{r.date}</span>
                    </td>
                    {r.changes.map((c, i) => (
                      <td key={EVENT_ITEMS[i].id}>{c === null ? '-' : signedPct(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>
            직전 {WINDOW}일 평균 대비 당일부터 {WINDOW}일 평균의 변화. 기록이 시작되기 전인 칸은 비워 둠
          </p>

          <p>
            결과는 한 방향이 아니었습니다. {ALL_CHANGES.length}건 중 오른 경우가 {UP}건, 내린 경우가 {DOWN}건이고,
            이벤트 {EVENT_ROWS.length}개 중 {MIXED_EVENTS}개는 같은 이벤트 안에서도 재료에 따라 오르고 내리는
            방향이 갈렸습니다. 가장 크게 오른 것은 {UP_CELL?.event}의 {UP_CELL?.item}({signedPct(BIGGEST_UP)}),
            가장 크게 내린 것은 {DOWN_CELL?.event}의 {DOWN_CELL?.item}({signedPct(BIGGEST_DOWN)})입니다.
          </p>
          <p>
            이벤트 전후로 시세가 크게 움직인다는 점은 기록에서도 확인됩니다. {ALL_CHANGES.length}건 중{' '}
            {BIG_MOVES}건은 방향과 상관없이 10% 이상 움직였습니다. 다만 어떤 재료가 어느 쪽으로 얼마나 움직일지는
            이벤트마다 달랐습니다. 미리 사 두는 판단은 막연한 예상보다, 지금 필요한 재료의 차트에서
            지난 이벤트 때 실제로 어떻게 움직였는지를 확인한 뒤에 내리는 편이 안전합니다.
          </p>

          <h2>로아로골 시세 차트 활용법</h2>
          <p>
            로아로골에서는 로스트아크 공식 API를 통해 거래소 시세를 매시간 수집하고,
            과거 시세 데이터를 차트로 제공합니다. 시세 차트를 활용하면
            아이템의 가격 추이를 한눈에 파악하고, 최적의 매매 타이밍을 찾을 수 있습니다.
          </p>

          <h3>차트 보는 법</h3>
          <ul>
            <li><strong>가격 추이 확인:</strong> 차트에서 가격이 상승 추세인지 하락 추세인지 확인합니다. 하락 추세일 때 매수하면 유리합니다.</li>
            <li><strong>고점과 저점 파악:</strong> 과거 데이터에서 가격의 고점과 저점을 파악하면 현재 가격이 비싼지 싼지 판단할 수 있습니다.</li>
            <li><strong>변동폭 확인:</strong> 가격 변동폭이 클수록 시세 차익을 얻을 기회가 있지만, 리스크도 큽니다.</li>
            <li><strong>여러 아이템 비교:</strong> 로아로골의 오늘의 시세에서 여러 재련 재료의 가격 변동을 동시에 비교할 수 있습니다.</li>
          </ul>

          <h3>차트에 찍히는 점과 비교선</h3>
          <p>
            로아로골 차트에는 가격 선 말고도 읽을거리가 더 있습니다. 매주 수요일 가격은 따로 점으로 표시되어, 주간
            초기화 직후 가격이 어디쯤 있었는지 바로 보입니다. 대형 업데이트나 방송이 있었던 날은 이벤트 점으로
            표시됩니다. 현재 차트에 찍히는 이벤트는 다음과 같습니다.
          </p>
          <ol className={styles.stepFlow}>
            {PRICE_EVENTS.map((e) => (
              <li key={e.date} className={styles.stepItem}>
                <strong>{getEventDisplayName(e)}</strong>
                {e.date}
              </li>
            ))}
          </ol>
          <p>
            {SUCCESSION_NAMES} 차트에는 대응하는 일반 재료 시세를 {SUCCESSION_RATIOS.join('·')}배 한 비교선이
            함께 그려집니다. 계승 재료 1개를 일반 재료 {SUCCESSION_RATIOS.join('·')}개 값과 나란히 놓는 선이라, 두
            선의 간격을 보면 계승 재료가 일반 재료 환산가보다 비싸게 거래되는 시기인지 싸게 거래되는 시기인지 한눈에
            알 수 있습니다.
          </p>

          <h2>묶음 단위 — 시세를 개당 값으로 바꾸기</h2>
          <p>
            거래소 시세를 볼 때 가장 많이 하는 실수가 <strong>묶음 가격을 개당 가격으로 착각</strong>하는
            것입니다. 재련 재료 상당수는 낱개가 아니라 묶음 단위로 호가가 매겨집니다.
            같은 화면에 뜬 두 숫자가 실제로는 100배 차이일 수 있습니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>아이템</th>
                <th>묶음 단위</th>
                <th>개당 단가</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>운명의 파괴석 / 수호석</td>
                <td>100개</td>
                <td>표시가 ÷ 100</td>
              </tr>
              <tr>
                <td>운명의 파괴석 결정 / 수호석 결정</td>
                <td>100개</td>
                <td>표시가 ÷ 100</td>
              </tr>
              <tr>
                <td>운명의 파편 주머니(대)</td>
                <td>3,000개</td>
                <td>표시가 ÷ 3,000</td>
              </tr>
              <tr>
                <td>돌파석 · 융화 재료 · 숨결 · 각인서</td>
                <td>1개</td>
                <td>표시가 그대로</td>
              </tr>
            </tbody>
          </table>
          <p>
            로아로골의 계산기들은 이 변환을 자동으로 처리합니다. 재련 비용이나 패키지 효율에서
            보이는 골드 값은 전부 개당 단가로 정규화한 뒤 수량을 곱한 결과입니다.
          </p>

          <h2>로아로골이 추적하는 시세 범위</h2>
          <p>
            모든 아이템의 시세를 다 받아오지는 않습니다. 계산기에서 실제로 쓰이는 항목만
            추려{' '}
            <strong>
              거래소 {MARKET_COUNT}종 + 경매장 {AUCTION_COUNT}종, 총 {MARKET_COUNT + AUCTION_COUNT}종
            </strong>
            을 매시간 수집합니다. 거래소(market)와 경매장(auction)은 API가 다르고 호가 구조도 달라 따로
            관리합니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>분류</th>
                  <th>수집처</th>
                  <th>종 수</th>
                  <th>예시</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c.key}>
                    <td style={{ fontWeight: 600 }}>{c.label}</td>
                    <td>{c.where}</td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${(c.count / MAX_CAT) * 100}px` }} />
                        <span className={styles.barText}>{c.count}종</span>
                      </div>
                    </td>
                    <td>{c.sample}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>
            재련 추가 재료에는 야금술·재봉술 계열과 용암·빙하의 숨결이 들어갑니다. 각인서는 거래소, 악세·팔찌·보석은 경매장에서 수집합니다
          </p>

          <h2>갱신 주기와 데이터 출처</h2>
          <p>
            시세는 로스트아크 <strong>공식 Open API</strong>를 <strong>매시 정각</strong>에 자동
            조회해 갱신합니다. 수동 입력이나 크롤링이 아니라 공식 응답을 그대로 저장하므로,
            게임 내 거래소 화면과 최대 1시간까지 시차가 날 수 있습니다.
            시세가 급하게 움직이는 업데이트 직후에는 이 시차를 감안해서 보는 것이 좋습니다.
          </p>
          <p>
            차트에 쓰이는 과거 데이터도 같은 방식으로 시간 단위로 쌓입니다.
            그래서 &quot;패치 직후 며칠간 얼마나 올랐다가 얼마나 빠졌는지&quot; 같은 패턴을
            눈으로 확인할 수 있습니다. 아래 매매 타이밍 팁은 이 차트를 보면서 판단하는 것을
            전제로 합니다.
          </p>

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골 메인 페이지에서 주요 재련 재료의 실시간 시세와
              과거 시세 차트를 무료로 확인할 수 있습니다. 매시간 자동으로 업데이트되므로
              항상 최신 정보를 바탕으로 판단하세요.
            </p>
          </div>

          <h2>매매 타이밍 팁</h2>
          <ol>
            <li><strong>급하지 않은 매수:</strong> 시세가 하락 추세일 때 천천히 분할 매수하세요. 한 번에 대량 구매하면 가격 변동 리스크가 큽니다.</li>
            <li><strong>업데이트 전 매수:</strong> 새 콘텐츠 업데이트가 예고되면 미리 필요한 재료를 확보해두세요. 업데이트 후 가격이 오를 가능성이 높습니다.</li>
            <li><strong>이벤트 재료 즉시 판매:</strong> 이벤트로 대량의 재료를 얻었다면 초기에 빠르게 판매하는 것이 유리할 수 있습니다. 시간이 지나면 공급이 늘어 가격이 하락합니다.</li>
            <li>
              <strong>수수료 고려:</strong> 거래소 5% 수수료를 반드시 고려하세요. 시세 차익이 5% 미만이면 손해입니다.
              정확히는 매수가보다 약 {(BREAK_EVEN * 100).toFixed(2)}% 이상 비싸게 팔아야 본전입니다.
            </li>
          </ol>

          <div className={styles.guideCta}>
            <p>로아로골에서 실시간 거래소 시세와 과거 시세 차트를 확인하세요.</p>
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
            "description": "로스트아크 거래소 시세 변동 패턴, 매매 타이밍, 로아로골 시세 차트 활용법을 알려드립니다.",
            "datePublished": "2026-02-06",
            "dateModified": "2026-09-27",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/market-price`
          })
        }}
      />
    </div>
  );
}
