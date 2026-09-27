import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { RAID_TABLE, MATERIAL_NAMES, type RaidTableEntry } from '@/data/rewardTable';
import { WANGAP_MAX_LEVEL, WANGAP_PROMOTION_COSTS, type WangapOptMatKey } from '@/lib/wangapData';
import { computeWangapAverage } from '@/lib/wangapAverage';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '벨가르딘 관문별 클리어 보상과 더보기 정리 (노말·하드·나이트메어)',
  description:
    '2026년 8월 5일 출시 벨가르딘의 노말·하드·나이트메어 난이도별 관문 클리어 골드, 재료 보상, 더보기 비용과 보상을 표로 정리했습니다. 승급 재료(사령의 잔영·죽음의 손) 주간 수급량과 코어 수급, 더보기 실수령 골드, 관문별 더보기 효율과 완갑 재료 대비 비중까지 확인할 수 있습니다.',
  keywords:
    '벨가르딘 보상, 벨가르딘 클리어 골드, 벨가르딘 더보기, 벨가르딘 나이트메어, 벨가르딘 하드, 죽음의 손, 사령의 잔영, 벨가르딘 코어, 로아 벨가르딘',
  alternates: { canonical: '/guide/belgardin-rewards' },
};

// ── 원본: data/rewardTable.ts (출시 당일 인게임 확정치) ──
const N = MATERIAL_NAMES;
const DIFFS = [
  { name: '벨가르딘 나메', label: '나이트메어', promo: N.HAND_OF_DEATH },
  { name: '벨가르딘 하드', label: '하드', promo: N.HAND_OF_DEATH },
  { name: '벨가르딘 노말', label: '노말', promo: N.WRAITH_ECHO },
] as const;

const MAT_ROWS: { key: string; label: string }[] = [
  { key: N.FATE_DESTRUCTION_STONE_CRYSTAL, label: '파괴석 결정' },
  { key: N.FATE_GUARDIAN_STONE_CRYSTAL, label: '수호석 결정' },
  { key: N.GREAT_FATE_BREAKTHROUGH_STONE, label: '위대한 돌파석' },
  { key: N.FATE_FRAGMENT, label: '운명의 파편' },
  { key: N.CERKA_CORE, label: '코어' },
];

const matOf = (list: { itemName: string; amount: number }[], key: string) =>
  list.find((m) => m.itemName === key)?.amount ?? 0;

type Block = {
  name: string;
  label: string;
  level: number;
  promo: string;
  entry: RaidTableEntry;
  gold: number;
  moreGold: number;
  net: number;
  clear: (key: string) => number;
  more: (key: string) => number;
  total: (key: string) => number;
};

const BLOCKS: Block[] = DIFFS.map((d) => {
  const entry = RAID_TABLE.find((e) => e.name === d.name)!;
  const clear = (key: string) => entry.gates.reduce((s, g) => s + matOf(g.clear, key), 0);
  const more = (key: string) => entry.gates.reduce((s, g) => s + matOf(g.more, key), 0);
  const gold = entry.gates.reduce((s, g) => s + g.gold, 0);
  const moreGold = entry.gates.reduce((s, g) => s + g.moreGold, 0);
  return {
    name: d.name,
    label: d.label,
    level: entry.level,
    promo: d.promo,
    entry,
    gold,
    moreGold,
    net: gold - moreGold,
    clear,
    more,
    total: (key: string) => clear(key) + more(key),
  };
});

const [NM, HD, NR] = BLOCKS;
const BY_LEVEL = [NR, HD, NM];

const fmt = (v: number) => v.toLocaleString();
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));
const ratio = (b: Block, key: string) => b.more(key) / b.clear(key);
const MORE_RATE = NM.moreGold / NM.gold;

// 관문별 더보기 1,000골드당 재료
const PER_K = BLOCKS.flatMap((b) =>
  b.entry.gates.map((g) => ({
    key: `${b.label}-${g.gate}`,
    label: `${b.label} ${g.gate}관`,
    cost: g.moreGold,
    stone: (matOf(g.more, N.GREAT_FATE_BREAKTHROUGH_STONE) / g.moreGold) * 1000,
    frag: (matOf(g.more, N.FATE_FRAGMENT) / g.moreGold) * 1000,
    promo: (matOf(g.more, b.promo) / g.moreGold) * 1000,
    promoName: b.promo,
  }))
);
const MAX_STONE_PER_K = Math.max(...PER_K.map((r) => r.stone));

// 완갑 +0 → +25 평균 소모 (숨결 미사용) — 완갑 시뮬레이터와 같은 계산기
const NO_PRICE: Record<WangapOptMatKey, number> = {
  파괴석결정: 0, 수호석결정: 0, 위대한돌파석: 0, 상급아비도스: 0, 운명파편: 0, 용암: 0, 빙하: 0,
};
const NOT_BOUND: Record<WangapOptMatKey, boolean> = {
  파괴석결정: false, 수호석결정: false, 위대한돌파석: false, 상급아비도스: false, 운명파편: false, 용암: false, 빙하: false,
};
const WANGAP = computeWangapAverage({
  startLevel: 0,
  targetLevel: WANGAP_MAX_LEVEL,
  startGrade: '영웅',
  mode: 'average',
  lavaMode: 'off',
  glacierMode: 'off',
  boundFlags: NOT_BOUND,
  unitPrices: NO_PRICE,
}).totals;

const WANGAP_ROWS = [
  { label: '파괴석 결정', key: N.FATE_DESTRUCTION_STONE_CRYSTAL, need: WANGAP.파괴석결정 },
  { label: '수호석 결정', key: N.FATE_GUARDIAN_STONE_CRYSTAL, need: WANGAP.수호석결정 },
  { label: '위대한 돌파석', key: N.GREAT_FATE_BREAKTHROUGH_STONE, need: WANGAP.위대한돌파석 },
];
const MAX_WEEKS = Math.max(...WANGAP_ROWS.map((r) => r.need / NM.total(r.key)));

const promoAmt = (grade: '전설' | '유물' | '고대', mat: '사령의잔영' | '죽음의손') =>
  WANGAP_PROMOTION_COSTS[grade].find((c) => c.material === mat)?.amount ?? 0;

function DifficultyTable({ block }: { block: Block }) {
  const gates = block.entry.gates;
  const rows = [...MAT_ROWS, { key: block.promo, label: block.promo }];
  return (
    <>
      <h3>
        벨가르딘 {block.label} Lv.{block.level}
      </h3>
      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th rowSpan={2}>항목</th>
              <th colSpan={gates.length + 1}>클리어 보상</th>
              <th colSpan={gates.length + 1}>더보기 보상</th>
              <th rowSpan={2}>총합</th>
            </tr>
            <tr>
              {gates.map((g) => (
                <th key={`hc${g.gate}`}>{g.gate}관</th>
              ))}
              <th>합계</th>
              {gates.map((g) => (
                <th key={`hm${g.gate}`}>{g.gate}관</th>
              ))}
              <th>합계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>유통 골드</strong></td>
              {gates.map((g) => (
                <td key={`c${g.gate}`}>{fmt(g.gold)}</td>
              ))}
              <td>{fmt(block.gold)}</td>
              {gates.map((g) => (
                <td key={`m${g.gate}`}>{fmt(-g.moreGold)}</td>
              ))}
              <td>{fmt(-block.moreGold)}</td>
              <td><strong>{fmt(block.net)}</strong></td>
            </tr>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                {gates.map((g) => (
                  <td key={`c${g.gate}`}>{fmt(matOf(g.clear, r.key))}</td>
                ))}
                <td>{fmt(block.clear(r.key))}</td>
                {gates.map((g) => (
                  <td key={`m${g.gate}`}>{fmt(matOf(g.more, r.key))}</td>
                ))}
                <td>{fmt(block.more(r.key))}</td>
                <td>{fmt(block.total(r.key))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BelgardinRewardsGuidePage() {
  const stoneRatios = BLOCKS.map((b) => ratio(b, N.GREAT_FATE_BREAKTHROUGH_STONE));
  const crystalRatios = BLOCKS.map((b) => ratio(b, N.FATE_DESTRUCTION_STONE_CRYSTAL));
  const nmGates = PER_K.filter((r) => r.label.startsWith('나이트메어'));
  const hdGates = PER_K.filter((r) => r.label.startsWith('하드'));
  const nrGates = PER_K.filter((r) => r.label.startsWith('노말'));

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>레이드</span>
          <h1 className={styles.articleTitle}>벨가르딘 관문별 클리어 보상과 더보기 정리</h1>
          <span className={styles.articleDate}>2026년 8월 5일 작성 · 9월 15일 보강</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            벨가르딘 관문별 보상 정보가 공개되었습니다. 난이도별로 클리어 골드와 재료, 더보기 보상까지 관문 단위로 정리했습니다.
            노말은 사령의 잔영, 하드와 나이트메어는 죽음의 손이 승급 재료로 나옵니다.
            벨가르딘은 2026년 8월 5일 출시되었고 입장 레벨은 노말 {NR.level}, 하드 {HD.level}, 나이트메어 {NM.level}입니다.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>나이트메어 실수령</span>
              <span className={styles.statValue}>{fmt(NM.net)}</span>
              <span className={styles.statNote}>클리어 {fmt(NM.gold)} - 더보기 {fmt(NM.moreGold)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>승급 재료 주간 최대</span>
              <span className={styles.statValue}>{NM.total(NM.promo)}개</span>
              <span className={styles.statNote}>세 난이도 동일 수량</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>코어 주간 최대</span>
              <span className={styles.statValue}>{NM.total(N.CERKA_CORE)}개</span>
              <span className={styles.statNote}>
                하드·노말 {HD.total(N.CERKA_CORE)}개
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>더보기 비용</span>
              <span className={styles.statValue}>{(MORE_RATE * 100).toFixed(0)}%</span>
              <span className={styles.statNote}>관문 클리어 골드 대비</span>
            </div>
          </div>

          <h2>난이도별 관문 보상표</h2>
          <p>
            더보기 보상 열의 골드는 더보기 비용(음수)이고, 유통 골드 행의 총합은 더보기까지 구매했을 때의 실수령 골드입니다.
          </p>
          {BLOCKS.map((b) => (
            <DifficultyTable key={b.name} block={b} />
          ))}
          <p>
            클리어 골드는 전량 유통 골드이며 귀속 골드는 없습니다. 더보기 비용은 관문 골드의{' '}
            {(MORE_RATE * 100).toFixed(0)}%입니다.
          </p>

          <h2>핵심 정리</h2>
          <h3>승급 재료 수급</h3>
          <p>
            난이도와 무관하게 승급 재료는 클리어 {NM.clear(NM.promo)}개와 더보기 {NM.more(NM.promo)}개를 합쳐
            주당 최대 {NM.total(NM.promo)}개입니다. 노말은 사령의 잔영, 하드와 나이트메어는 죽음의 손으로 지급됩니다.
            이 수급량을 기준으로 몇 주차에 어느 등급까지 승급할 수 있는지는{' '}
            <Link href="/guide/wangap-upgrade-schedule">완갑 주차별 승급 정리</Link>에서 계산했습니다.
          </p>
          <h3>코어</h3>
          <p>
            클리어와 더보기에서 각각 지급되어 나이트메어는 주 {NM.total(N.CERKA_CORE)}개, 하드와 노말은 주{' '}
            {HD.total(N.CERKA_CORE)}개까지 확보할 수 있습니다.
          </p>
          <h3>골드 효율</h3>
          <p>
            더보기까지 구매하면 실수령은 나이트메어 {fmt(NM.net)}골드, 하드 {fmt(HD.net)}골드, 노말 {fmt(NR.net)}골드입니다.
            재료 가치를 감안한 더보기 구매 가치는 파괴석·수호석 결정 시세에 따라 달라지므로, 실시간 시세로 계산한 손익은{' '}
            <Link href="/belgardin">벨가르딘 보상 페이지</Link>에서 확인하세요.
          </p>

          <h2>난이도를 한 단계 올리면 달라지는 것</h2>
          <p>
            위 표의 총합(클리어와 더보기를 모두 받은 기준)을 난이도끼리 빼 보면, 한 단계 올릴 때 늘어나는 양이 생각보다 고르게 나뉩니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>노말 → 하드</th>
                  <th>하드 → 나이트메어</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>실수령 골드</td>
                  <td>{signed(HD.net - NR.net)}</td>
                  <td>{signed(NM.net - HD.net)}</td>
                </tr>
                {MAT_ROWS.map((r) => {
                  const a = HD.total(r.key) - NR.total(r.key);
                  const b = NM.total(r.key) - HD.total(r.key);
                  return (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td>{a === 0 ? `변화 없음 (${HD.total(r.key)}개)` : signed(a)}</td>
                      <td>{b === 0 ? `변화 없음 (${NM.total(r.key)}개)` : signed(b)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td>승급 재료</td>
                  <td>사령의 잔영 → 죽음의 손</td>
                  <td>변화 없음 (죽음의 손 {NM.total(NM.promo)}개)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            노말에서 하드로 올라갈 때 가장 큰 변화는 골드나 재료가 아니라 승급 재료의 종류입니다. 사령의 잔영은 전설·유물 승급에만 쓸 수 있고,
            필요 개수도 죽음의 손의 두 배(전설 {promoAmt('전설', '사령의잔영')}개 대 {promoAmt('전설', '죽음의손')}개,
            유물 {promoAmt('유물', '사령의잔영')}개 대 {promoAmt('유물', '죽음의손')}개)라서 같은 {NM.total(NM.promo)}개를 받아도
            승급 속도는 절반입니다. 고대 승급은 죽음의 손 {promoAmt('고대', '죽음의손')}개만 받기 때문에, 노말만 가는 캐릭터는
            유물 완갑(+20)에서 멈춥니다.
          </p>
          <p>
            하드에서 나이트메어로 올라갈 때는 승급 재료 수급이 같습니다. 대신 코어가 주 {HD.total(N.CERKA_CORE)}개에서{' '}
            {NM.total(N.CERKA_CORE)}개로 늘고, 실수령 골드가 {fmt(NM.net - HD.net)}골드 더 많습니다. 나이트메어 입장
            레벨({NM.level})이 하드({HD.level})보다 {NM.level - HD.level} 높으므로, 레벨이 된다면 골드와 코어를 위해 올리는
            난이도라고 보면 됩니다.
          </p>

          <h2>더보기에서 나오는 재료가 더 많다</h2>
          <p>
            벨가르딘은 더보기 보상이 클리어 보상보다 큽니다. 세 난이도 모두 더보기로 받는 파괴석·수호석 결정이 클리어 보상의{' '}
            {Math.min(...crystalRatios).toFixed(1)}~{Math.max(...crystalRatios).toFixed(1)}배, 위대한 돌파석은{' '}
            {Math.min(...stoneRatios).toFixed(1)}~{Math.max(...stoneRatios).toFixed(1)}배입니다. 코어와 승급 재료는 클리어와
            더보기가 같은 수량이라, 더보기를 건너뛰면 절반만 받습니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>난이도</th>
                  <th>파괴석 결정 (더보기 ÷ 클리어)</th>
                  <th>위대한 돌파석 (더보기 ÷ 클리어)</th>
                </tr>
              </thead>
              <tbody>
                {BLOCKS.map((b) => (
                  <tr key={b.name}>
                    <td>{b.label}</td>
                    <td>
                      {fmt(b.more(N.FATE_DESTRUCTION_STONE_CRYSTAL))} ÷ {fmt(b.clear(N.FATE_DESTRUCTION_STONE_CRYSTAL))} ={' '}
                      {ratio(b, N.FATE_DESTRUCTION_STONE_CRYSTAL).toFixed(1)}배
                    </td>
                    <td>
                      {fmt(b.more(N.GREAT_FATE_BREAKTHROUGH_STONE))} ÷ {fmt(b.clear(N.GREAT_FATE_BREAKTHROUGH_STONE))} ={' '}
                      {ratio(b, N.GREAT_FATE_BREAKTHROUGH_STONE).toFixed(1)}배
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>관문별 더보기 효율: 2관이 더 많이 돌려준다</h2>
          <p>
            관문끼리 비교하면 2관 더보기가 1관보다 비용 대비 재료가 많습니다. 아래는 더보기에 1,000골드를 낼 때마다 받는
            재료 수량입니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>관문</th>
                  <th>더보기 비용</th>
                  <th>위대한 돌파석</th>
                  <th>운명의 파편</th>
                  <th>승급 재료</th>
                </tr>
              </thead>
              <tbody>
                {PER_K.map((r) => (
                  <tr key={r.key}>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td>{fmt(r.cost)}</td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${(r.stone / MAX_STONE_PER_K) * 100}px` }} />
                        <span className={styles.barText}>{r.stone.toFixed(1)}개</span>
                      </div>
                    </td>
                    <td>{fmt(Math.round(r.frag))}개</td>
                    <td>{r.promo.toFixed(2)}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>더보기 1,000골드당 수량 = 관문 더보기 재료 ÷ 관문 더보기 비용 × 1,000. 승급 재료는 노말이 사령의 잔영, 하드·나이트메어가 죽음의 손</p>
          <p>
            나이트메어 기준으로 위대한 돌파석은 1관 약 {nmGates[0].stone.toFixed(1)}개, 2관 약 {nmGates[1].stone.toFixed(1)}개이고,
            운명의 파편은 1관 약 {fmt(Math.round(nmGates[0].frag))}개, 2관 약 {fmt(Math.round(nmGates[1].frag))}개입니다.
            하드(돌파석 약 {hdGates[0].stone.toFixed(1)}개 대 {hdGates[1].stone.toFixed(1)}개)와 노말(약{' '}
            {nrGates[0].stone.toFixed(1)}개 대 {nrGates[1].stone.toFixed(1)}개)도 같은 방향입니다. 골드가 부족해 한 관문만
            더보기를 산다면 2관 쪽이 재료를 더 많이 돌려받습니다. 다만 승급 재료는 관문당{' '}
            {matOf(NM.entry.gates[0].more, NM.promo)}개와 {matOf(NM.entry.gates[1].more, NM.promo)}개로 비용에 비례해 나오므로,
            승급만 보면 어느 관문이든 골드당 수량은 거의 같습니다.
          </p>
          <p>
            같은 표를 세로로 읽으면 난이도가 낮을수록 1,000골드당 돌파석이 조금씩 많습니다. 노말 2관이{' '}
            {nrGates[1].stone.toFixed(1)}개로 가장 높고 나이트메어 1관이 {nmGates[0].stone.toFixed(1)}개로 가장 낮습니다. 더보기
            비용이 클리어 골드에 비례해 오르는 만큼 재료는 그보다 덜 늘어나기 때문입니다. 원정대에 노말과 나이트메어를 도는
            캐릭터가 섞여 있고 더보기 예산이 한정되어 있다면, 강화 재료 수량만 놓고 볼 때는 노말 쪽 더보기가 골드당 더 많이 돌려줍니다.
          </p>

          <h2>완갑 강화량과 비교해 보면</h2>
          <p>
            완갑을 +0에서 +{WANGAP_MAX_LEVEL}까지 숨결 없이 올릴 때 평균 소모량을 벨가르딘 한 캐릭터의 주간 풀더보기 수급과
            나란히 놓았습니다. 소모량은 완갑 시뮬레이터가 쓰는 평균 계산기를 그대로 돌린 값입니다.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>재료</th>
                  <th>+0 → +{WANGAP_MAX_LEVEL} 평균 소모</th>
                  <th>나이트메어 주간</th>
                  <th>한 주 몫</th>
                  <th>이것만으로 채우면</th>
                </tr>
              </thead>
              <tbody>
                {WANGAP_ROWS.map((r) => {
                  const weekly = NM.total(r.key);
                  const weeks = r.need / weekly;
                  return (
                    <tr key={r.key}>
                      <td style={{ fontWeight: 600 }}>{r.label}</td>
                      <td>{fmt(Math.round(r.need))}</td>
                      <td>{fmt(weekly)}</td>
                      <td>{((weekly / r.need) * 100).toFixed(1)}%</td>
                      <td className={styles.barCell}>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${(weeks / MAX_WEEKS) * 100}px` }} />
                          <span className={styles.barText}>{Math.ceil(weeks)}주</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>
            벨가르딘 한 캐릭터의 한 주 보상은 파괴석 결정 기준 약{' '}
            {((NM.total(N.FATE_DESTRUCTION_STONE_CRYSTAL) / WANGAP.파괴석결정) * 100).toFixed(1)}%, 위대한 돌파석 기준 약{' '}
            {((NM.total(N.GREAT_FATE_BREAKTHROUGH_STONE) / WANGAP.위대한돌파석) * 100).toFixed(1)}%에 해당합니다. 벨가르딘
            보상만으로 완갑 재료를 채우는 구조가 아니라, 승급 재료(죽음의 손)가 진행 속도를 정하고 강화 재료는 대부분 거래소나
            다른 콘텐츠에서 채우는 구조입니다. 단계별 평균 소모량은{' '}
            <Link href="/guide/wangap-cost">완갑 +0에서 +25까지 강화 비용 정리</Link>에 구간별로 나눠 두었습니다.
          </p>

          <div className={styles.noteBox}>
            <p>
              위 주차는 평균 소모 기준이고 숨결을 넣지 않은 값입니다. 운이 나쁘면 소모가 평균보다 크게 늘어나는 구간(+20
              이후)이 있으므로, 실제 계획은 완갑 시뮬레이터에서 천장 기준까지 함께 확인하는 편이 안전합니다.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>벨가르딘 더보기 손익은 실시간 거래소 시세로, 완갑 강화 비용은 완갑 시뮬레이터에서 미리 계산해 볼 수 있습니다.</p>
            <Link href="/wangap" className={styles.guideCtaLink}>
              완갑 재련 시뮬레이터 바로가기
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
            "headline": "벨가르딘 관문별 클리어 보상과 더보기 정리",
            "description": "벨가르딘 노말·하드·나이트메어 난이도별 관문 클리어 골드, 재료 보상, 더보기 비용과 보상을 표로 정리했습니다.",
            "datePublished": "2026-08-05",
            "dateModified": "2026-09-27",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/belgardin-rewards`
          })
        }}
      />
    </div>
  );
}
