import archive from '@/public/data/history_archive.json';
import styles from '@/app/guide/guide.module.css';

/**
 * PriceHistoryAnalysis — 홈 맨 아래 "지난 시세 기록 분석" 섹션 (서버 컴포넌트).
 *
 * 홈 위쪽 시세 카드·차트는 전부 ssr:false 라 JS 를 실행하지 않는 크롤러에는 빈칸으로 보인다.
 * 이 섹션은 빌드에 들어 있는 public/data/history_archive.json 을 서버에서 한 번만 읽어
 * 요약 표로 그린다 — 방문자 번들에 JSON 이 딸려 가지 않고, ISR·Storage 읽기도 없다.
 * 아카이브는 가격 히스토리 롤오버(split) 때만 늘어나므로 기간은 데이터에서 읽어 표기한다.
 */

type Point = { date: string; price: number };
const DATA = archive as unknown as Record<string, Point[]>;

const ITEMS: { id: string; name: string }[] = [
  { id: '66102007', name: '운명의 파괴석 결정' },
  { id: '66102107', name: '운명의 수호석 결정' },
  { id: '66110226', name: '위대한 운명의 돌파석' },
  { id: '6861013', name: '상급 아비도스 융화 재료' },
  { id: '66111131', name: '용암의 숨결' },
  { id: '66111132', name: '빙하의 숨결' },
  { id: '66130143', name: '운명의 파편 주머니(대)' },
  { id: 'auction_gem_fear_10', name: '10레벨 겁화의 보석' },
  { id: 'auction_gem_flame_10', name: '10레벨 작열의 보석' },
];

// 요일 패턴은 매일 거래량이 많은 재련 재료만 본다 (보석은 경매장이라 표본 성격이 다르다)
const WEEKDAY_IDS = ['66102007', '66102107', '66110226', '6861013', '66111131', '66111132'];
const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

// 월평균 표에 넣는 핵심 재료 4종
const MONTHLY_IDS = ['66102007', '66102107', '66110226', '6861013'];

const nameOf = (id: string) => ITEMS.find((i) => i.id === id)!.name;
const series = (id: string): Point[] => DATA[id] ?? [];

// 거래소 등록 직후 며칠은 가격이 비정상적으로 튀어서(예: 수호석 결정 첫날 17.3 → 그달 평균 45) 요약에서 뺀다.
// 변동률도 하루치가 아니라 "처음 7일 평균 → 마지막 7일 평균"으로 잡아 하루짜리 튐에 흔들리지 않게 한다.
const SKIP_DAYS = 7;
const WINDOW = 7;
const avgOf = (ps: Point[]) => ps.reduce((s, p) => s + p.price, 0) / ps.length;

const SUMMARY = ITEMS.filter((i) => series(i.id).length > SKIP_DAYS + WINDOW * 2).map((i) => {
  const a = series(i.id).slice(SKIP_DAYS);
  const head = a.slice(0, WINDOW);
  const tail = a.slice(-WINDOW);
  let min = a[0];
  let max = a[0];
  for (const p of a) {
    if (p.price < min.price) min = p;
    if (p.price > max.price) max = p;
  }
  const firstAvg = avgOf(head);
  const lastAvg = avgOf(tail);
  return {
    ...i,
    first: { date: head[0].date, price: firstAvg },
    last: { date: tail[tail.length - 1].date, price: lastAvg },
    min,
    max,
    change: lastAvg / firstAvg - 1,
  };
});

const ALL_DATES = Object.values(DATA).flatMap((a) => (Array.isArray(a) ? a.map((p) => p.date) : []));
const PERIOD_START = ALL_DATES.reduce((m, d) => (d < m ? d : m), '9999');
const PERIOD_END = ALL_DATES.reduce((m, d) => (d > m ? d : m), '0000');

/**
 * 요일 효과: 각 날짜 가격을 앞뒤 3일 포함 7일 이동평균으로 나눠, 추세를 걷어낸 뒤 요일별로 평균낸다.
 * 값이 -2% 면 "그 주 평균보다 그 요일이 2% 싸다"는 뜻.
 */
const WEEKDAY = WEEKDAY_IDS.map((id) => {
  const a = series(id);
  const sum = Array(7).fill(0);
  const cnt = Array(7).fill(0);
  for (let i = 3; i < a.length - 3; i++) {
    let s = 0;
    for (let j = -3; j <= 3; j++) s += a[i + j].price;
    const w = new Date(`${a[i].date}T00:00:00Z`).getUTCDay();
    sum[w] += a[i].price / (s / 7);
    cnt[w]++;
  }
  const eff = sum.map((v, w) => (cnt[w] ? v / cnt[w] - 1 : 0));
  const cheapest = eff.indexOf(Math.min(...eff));
  const priciest = eff.indexOf(Math.max(...eff));
  return { id, name: nameOf(id), eff, cheapest, priciest, spread: eff[priciest] - eff[cheapest] };
});

// 재료 6종 평균 — 요일별로 몇 개 재료가 "가장 싼 날"로 꼽혔는지도 센다
const WEEKDAY_AVG = WEEKDAY_LABEL.map((_, w) => WEEKDAY.reduce((s, r) => s + r.eff[w], 0) / WEEKDAY.length);
const CHEAPEST_COUNT = WEEKDAY_LABEL.map((_, w) => WEEKDAY.filter((r) => r.cheapest === w).length);
const AVG_CHEAPEST = WEEKDAY_AVG.indexOf(Math.min(...WEEKDAY_AVG));
const AVG_PRICIEST = WEEKDAY_AVG.indexOf(Math.max(...WEEKDAY_AVG));
const MAX_ABS_WEEKDAY = Math.max(...WEEKDAY_AVG.map(Math.abs));

// 월평균 — 네 재료가 모두 기록된 달만
const MONTHS = (() => {
  const set = new Set<string>();
  for (const id of MONTHLY_IDS) for (const p of series(id)) set.add(p.date.slice(0, 7));
  return [...set].sort().filter((m) => MONTHLY_IDS.every((id) => series(id).some((p) => p.date.startsWith(m))));
})();

const MONTHLY = MONTHLY_IDS.map((id) => {
  const a = series(id);
  const avg = MONTHS.map((m) => {
    const ps = a.filter((p) => p.date.startsWith(m));
    return ps.reduce((s, p) => s + p.price, 0) / ps.length;
  });
  const peak = avg.indexOf(Math.max(...avg));
  return { id, name: nameOf(id), avg, peak };
});

const BIGGEST_RISE = [...SUMMARY].sort((a, b) => b.change - a.change)[0];
const BIGGEST_DROP = [...SUMMARY].sort((a, b) => a.change - b.change)[0];
const MAX_ABS_CHANGE = Math.max(...SUMMARY.map((s) => Math.abs(s.change)));

const fmtPrice = (v: number) =>
  v >= 1000 ? Math.round(v).toLocaleString() : v >= 100 ? v.toFixed(0) : v.toFixed(1);
const fmtDate = (d: string) => d.slice(2).replace(/-/g, '.');
const fmtMonth = (m: string) => `${m.slice(2, 4)}.${m.slice(5)}`;
// 이름 끝 한글 받침으로 은/는 선택 — 품목명이 데이터에서 오므로 고정 조사를 쓰면 틀린다
const eunNeun = (name: string) => {
  const ch = [...name].reverse().find((c) => c >= '가' && c <= '힣');
  return ch && (ch.charCodeAt(0) - 0xac00) % 28 !== 0 ? '은' : '는';
};
const signed = (v: number, d = 1) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

export default function PriceHistoryAnalysis() {
  if (SUMMARY.length === 0) return null;

  return (
    <section className="mt-5">
      <div className={styles.articleBody}>
        <h2>
          지난 시세 기록 분석 ({fmtDate(PERIOD_START)} ~ {fmtDate(PERIOD_END)})
        </h2>
        <p>
          로아로골은 거래소와 경매장 최저가를 매일 기록해 두고 있습니다. 위 차트가 지금 가격을 보여준다면, 이 섹션은
          쌓아 둔 일별 기록을 요약한 것입니다. 기간이 지난 기록은 사이트 데이터 파일로 옮겨 보관하는데, 그 보관분을
          기준으로 계산했습니다.
        </p>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>기록 품목</span>
            <span className={styles.statValue}>{Object.keys(DATA).length}종</span>
            <span className={styles.statNote}>거래소 재료 · 경매장 장신구 · 보석</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>가장 많이 오른 재료</span>
            <span className={styles.statValue}>{signed(BIGGEST_RISE.change, 0)}</span>
            <span className={styles.statNote}>{BIGGEST_RISE.name}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>가장 많이 내린 재료</span>
            <span className={styles.statValue}>{signed(BIGGEST_DROP.change, 0)}</span>
            <span className={styles.statNote}>{BIGGEST_DROP.name}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>재련 재료가 가장 싼 요일</span>
            <span className={styles.statValue}>{WEEKDAY_LABEL[AVG_CHEAPEST]}요일</span>
            <span className={styles.statNote}>
              주간 평균 대비 {signed(WEEKDAY_AVG[AVG_CHEAPEST])}
            </span>
          </div>
        </div>

        <h3>품목별 기록 요약</h3>
        <div className={styles.tableScroll}>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>품목</th>
                <th>처음 7일 평균</th>
                <th>마지막 7일 평균</th>
                <th>변동</th>
                <th>최저가</th>
                <th>최고가</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, textAlign: 'left' }}>{s.name}</td>
                  <td>
                    {fmtPrice(s.first.price)}
                    <br />
                    <small>{fmtDate(s.first.date)}</small>
                  </td>
                  <td>
                    {fmtPrice(s.last.price)}
                    <br />
                    <small>{fmtDate(s.last.date)}</small>
                  </td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${(Math.abs(s.change) / MAX_ABS_CHANGE) * 70}px`,
                          background: s.change < 0 ? '#3b82f6' : undefined,
                        }}
                      />
                      <span className={styles.barText}>{signed(s.change, 0)}</span>
                    </div>
                  </td>
                  <td>
                    {fmtPrice(s.min.price)}
                    <br />
                    <small>{fmtDate(s.min.date)}</small>
                  </td>
                  <td>
                    {fmtPrice(s.max.price)}
                    <br />
                    <small>{fmtDate(s.max.date)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.tableCaption}>
          가격 단위는 거래소·경매장 표시 기준 골드. 거래소 등록 직후 7일은 가격이 튀어서 제외했고, 품목마다 기록을 시작한 날짜가 달라 시작일이 다릅니다.
        </p>

        <p>
          같은 기간이라도 재료마다 방향이 정반대였습니다. {BIGGEST_RISE.name}{eunNeun(BIGGEST_RISE.name)} 처음 7일 평균 대비{' '}
          {signed(BIGGEST_RISE.change, 0)}로 가장 크게 올랐고, {BIGGEST_DROP.name}{eunNeun(BIGGEST_DROP.name)} {signed(BIGGEST_DROP.change, 0)}로
          가장 크게 내렸습니다. 한 재료의 흐름만 보고 &quot;재련 재료가 싸졌다, 비싸졌다&quot;고 말하기 어려운 이유입니다.
          재련 비용을 계산할 때 재료별 현재가를 따로 넣어야 하는 것도 같은 까닭입니다.
        </p>

        <h3>재료가 싼 요일, 비싼 요일</h3>
        <p>
          일별 가격을 앞뒤 사흘을 포함한 7일 평균으로 나눠 큰 흐름을 걷어낸 다음, 요일별로 평균을 냈습니다. 값이
          음수면 그 요일이 그 주 평균보다 쌌다는 뜻입니다.
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>품목</th>
                {WEEKDAY_LABEL.map((l) => (
                  <th key={l}>{l}</th>
                ))}
                <th>폭</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAY.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, textAlign: 'left' }}>{r.name}</td>
                  {r.eff.map((v, w) => (
                    <td
                      key={w}
                      style={{
                        fontWeight: w === r.cheapest || w === r.priciest ? 700 : undefined,
                        color: w === r.cheapest ? '#3b82f6' : w === r.priciest ? '#ef4444' : undefined,
                      }}
                    >
                      {signed(v)}
                    </td>
                  ))}
                  <td>{(r.spread * 100).toFixed(1)}%p</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 700, textAlign: 'left' }}>6종 평균</td>
                {WEEKDAY_AVG.map((v, w) => (
                  <td key={w} style={{ fontWeight: 700 }}>
                    {signed(v)}
                  </td>
                ))}
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.tableCaption}>파란색 = 그 재료가 가장 싼 요일, 빨간색 = 가장 비싼 요일</p>

        <div className={styles.statGrid}>
          {WEEKDAY_LABEL.map((l, w) => (
            <div key={l} className={styles.statCard}>
              <span className={styles.statLabel}>{l}요일</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${(Math.abs(WEEKDAY_AVG[w]) / MAX_ABS_WEEKDAY) * 60}px`,
                    background: WEEKDAY_AVG[w] < 0 ? '#3b82f6' : undefined,
                  }}
                />
                <span className={styles.barText}>{signed(WEEKDAY_AVG[w])}</span>
              </div>
              <span className={styles.statNote}>최저 요일로 꼽힌 재료 {CHEAPEST_COUNT[w]}종</span>
            </div>
          ))}
        </div>

        <p>
          재련 재료 6종을 평균하면 {WEEKDAY_LABEL[AVG_CHEAPEST]}요일이 {signed(WEEKDAY_AVG[AVG_CHEAPEST])}로 가장 싸고{' '}
          {WEEKDAY_LABEL[AVG_PRICIEST]}요일이 {signed(WEEKDAY_AVG[AVG_PRICIEST])}로 가장 비쌌습니다. 6종 중{' '}
          {CHEAPEST_COUNT[AVG_CHEAPEST]}종이 {WEEKDAY_LABEL[AVG_CHEAPEST]}요일에 가장 쌌습니다. 수요일 정기 점검으로 주간
          콘텐츠가 초기화되기 직전에 재료를 정리해 파는 물량이 몰리고, 초기화 이후 재련을 시작하는 수요가 목요일부터
          붙는 흐름으로 보입니다. 급하지 않은 재료라면 주 후반보다 초기화 직전에 사는 편이 대체로 유리했습니다.
        </p>

        <div className={styles.noteBox}>
          <p>
            요일 차이는 몇 퍼센트 수준이라, 패치나 이벤트로 가격이 크게 움직이는 주에는 금방 묻힙니다. 과거 기록에서
            나타난 경향일 뿐 앞으로도 같다는 보장은 없습니다. 큰 수량을 살 때는 위 차트에서 최근 흐름을 함께 확인하세요.
          </p>
        </div>

        <h3>핵심 재료 월평균</h3>
        <div className={styles.tableScroll}>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>품목</th>
                {MONTHS.map((m) => (
                  <th key={m}>{fmtMonth(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHLY.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, textAlign: 'left' }}>{r.name}</td>
                  {r.avg.map((v, i) => (
                    <td key={i} style={{ fontWeight: i === r.peak ? 700 : undefined }}>
                      {fmtPrice(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.tableCaption}>굵은 글씨 = 해당 품목의 월평균이 가장 높았던 달</p>
        <p>
          월평균이 가장 높았던 달은{' '}
          {MONTHLY.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ', '}
              {r.name} {fmtMonth(MONTHS[r.peak])}
            </span>
          ))}
          로 재료마다 다릅니다. 새 레이드나 재련 구간이 열리는 시점마다 수요가 몰리는 재료가 바뀌기 때문입니다. 재련
          재료를 미리 사 둘지 고민된다면, 다음 업데이트에서 어떤 재료의 수요가 늘지를 먼저 보는 편이 월별 흐름을 외우는
          것보다 정확합니다.
        </p>
      </div>
    </section>
  );
}
