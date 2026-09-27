import {
  FIXED_GEM_COMBO_MULTIPLIER,
  GEM_RESET_TICKET_CRYSTAL,
  PEON_CRYSTAL,
  TEMPLATES_MAP,
  crystalUnitGold,
} from '@/lib/package-shared';
import { BRACELET_PEON, DEFAULT_TICKET_TIERS, GEM_PEON, TICKET_TIER_LABELS } from '@/lib/hell-reward-calc';
import styles from '@/app/guide/guide.module.css';

/**
 * PackageEfficiencyGuideBody — /package 갤러리 본문.
 *
 * 묶음 배수·페온·크리스탈 환산·티켓 기준 층은 lib/package-shared.ts 와 lib/hell-reward-calc.ts 에서
 * 계산기가 실제로 쓰는 상수로 계산한다. 시세가 필요한 값(패키지별 이득률)은 다루지 않는다 —
 * 그건 갤러리 카드가 실시간으로 보여준다.
 */

// 블루 크리스탈 1개의 원화 — goldPerWon = 1 을 넣으면 크리스탈 환산식이 원화를 그대로 돌려준다
const WON_PER_BC = crystalUnitGold('crystal_blue-crystal-input', 1, 1);
const WON_PER_PEON = PEON_CRYSTAL * WON_PER_BC;

// ── 묶음 배수 ──
const BUNDLES = [
  { type: '2+1', pay: 2, get: 3 },
  { type: '3+1', pay: 3, get: 4 },
].map((b) => ({ ...b, mult: b.get / b.pay, breakeven: b.pay / b.get - 1 }));
const B21 = BUNDLES[0];
const B31 = BUNDLES[1];
const SINGLE_RATES = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2];
const BUNDLE_ROWS = SINGLE_RATES.map((r) => ({
  single: r,
  b21: (1 + r) * B21.mult - 1,
  b31: (1 + r) * B31.mult - 1,
}));
const MAX_RATIO = Math.max(...BUNDLE_ROWS.map((r) => 1 + r.b21));

// ── 크리스탈 환산 아이템 ──
const CRYSTAL_ITEMS = Object.values(TEMPLATES_MAP)
  .filter((t) => t.type === 'crystal' && (t.crystalPerUnit ?? 0) > 0 && t.id !== 'blue-crystal-input')
  .map((t) => ({ name: t.name, bc: t.crystalPerUnit!, won: t.crystalPerUnit! * WON_PER_BC }))
  .sort((a, b) => b.bc - a.bc);
const MAX_BC = Math.max(...CRYSTAL_ITEMS.map((c) => c.bc));

// ── 페온이 붙는 항목 ──
const PEON_ROWS = [
  { name: '영웅 젬 1개 (거래소 등록)', peon: GEM_PEON.hero },
  { name: '희귀 젬 1개 (거래소 등록)', peon: GEM_PEON.rare },
  { name: '팔찌 1개 (지옥·나락 보상 평가)', peon: BRACELET_PEON },
].map((r) => ({ ...r, bc: r.peon * PEON_CRYSTAL, won: r.peon * WON_PER_PEON }));

// ── 티켓 기준 층 ──
const TICKETS = [
  { name: '전설 지옥 티켓', tier: DEFAULT_TICKET_TIERS.hellLegendary },
  { name: '영웅 지옥 티켓', tier: DEFAULT_TICKET_TIERS.hellHeroic },
  { name: '전설 나락 티켓', tier: DEFAULT_TICKET_TIERS.narakLegendary },
];
// 큐브 티켓은 영웅 지옥 티켓 1장의 몇 분의 1인가 — calcTicketUnitByItemId 의 교환 비율
const CUBE_PER_HEROIC = 6;

const TICKET_RESET_WON = GEM_RESET_TICKET_CRYSTAL * WON_PER_BC;

const won = (v: number) => `${parseFloat(v.toFixed(2)).toLocaleString()}원`;
const signed = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;

export default function PackageEfficiencyGuideBody() {
  return (
    <div className={styles.articleBody}>
      <h2>패키지 효율이란?</h2>
      <p>
        같은 돈을 내도 패키지 구성에 따라 받는 가치는 크게 달라집니다. 패키지 효율은 구성품을 하나씩 거래소·경매장
        시세로 골드 환산해 더한 값을, 결제 금액을 같은 환율로 골드 환산한 값과 비교한 이득률(%)입니다. 양수면 시세
        기준으로 이득, 음수면 손해입니다. 거래 가능한 아이템은 시세를 그대로 쓰고, 귀속 아이템은 같은 것을 골드로
        얻는 데 드는 비용으로 대신합니다.
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>블루 크리스탈 1개</span>
          <span className={styles.statValue}>{won(WON_PER_BC)}</span>
          <span className={styles.statNote}>100개 = {won(WON_PER_BC * 100)} 고정</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>페온 1개</span>
          <span className={styles.statValue}>{won(WON_PER_PEON)}</span>
          <span className={styles.statNote}>블루 크리스탈 {PEON_CRYSTAL}개</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{B31.type}이 본전이 되는 단품 이득률</span>
          <span className={styles.statValue}>{signed(B31.breakeven)}</span>
          <span className={styles.statNote}>{B21.type}은 {signed(B21.breakeven)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>고정형 영웅 젬 선택 배수</span>
          <span className={styles.statValue}>×{FIXED_GEM_COMBO_MULTIPLIER}</span>
          <span className={styles.statNote}>원하는 옵션 조합 확률 1/{FIXED_GEM_COMBO_MULTIPLIER}의 역수</span>
        </div>
      </div>

      <h2>패키지 유형별 계산식</h2>
      <p>
        같은 &quot;이득률 30%&quot;라도 유형에 따라 계산 근거가 다릅니다. <strong>구성품 가치</strong>는 패키지 1개에 든
        아이템의 실시간 골드 환산 합계, <strong>가격</strong>은 결제 금액을 현재 환율로 골드 환산한 값입니다.
      </p>
      <div className={styles.tableScroll}>
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
            {BUNDLES.map((b) => (
              <tr key={b.type}>
                <td>{b.type}</td>
                <td>{b.pay}회</td>
                <td>{b.get}회</td>
                <td>
                  (구성품 가치 × {b.get}) ÷ (가격 × {b.pay})
                </td>
              </tr>
            ))}
            <tr>
              <td>3+보너스</td>
              <td>3회</td>
              <td>3회 + 보너스 1회</td>
              <td>(구성품 가치 × 3 + 보너스 가치) ÷ (가격 × 3)</td>
            </tr>
            <tr>
              <td>핫딜샵</td>
              <td>칸마다 1회</td>
              <td>칸 전부 + 보너스 1회</td>
              <td>(칸별 가치 합 + 보너스 가치) ÷ 칸별 가격 합</td>
            </tr>
            <tr>
              <td>가챠</td>
              <td>1회</td>
              <td>1개 (확률)</td>
              <td>Σ(아이템 가치 × 확률) ÷ 가격</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        3+1은 <strong>같은 구성품을 한 번 더</strong> 주지만, 3+보너스는 3회 구매 시 <strong>별도 구성의 보너스를 한 번</strong>{' '}
        줍니다. 그래서 확정 구성품은 3배가 되고 보너스는 한 번만 더해집니다. 핫딜샵은 칸마다 값이 다른 상품이 놓이고 모든
        칸을 사면 보너스가 붙는 구조라, 갤러리 정렬은 &quot;전부 구매&quot; 기준으로 칸 가격을 모두 더해 계산합니다.
        보너스가 &quot;N개 선택&quot;이면 목록 전체가 아니라 지금 시세로 가장 비싼 N개만 셉니다.
      </p>

      <h2>묶음으로 사면 이득률이 얼마나 달라지나</h2>
      <p>
        {B31.type}은 {B31.pay}개 값으로 {B31.get}개를 받으니 같은 돈에 대한 가치가 {B31.mult.toFixed(3)}배,{' '}
        {B21.type}은 {B21.mult.toFixed(1)}배가 됩니다. 단품 이득률을 알면 묶음 이득률은 계산 없이 바로 나옵니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>단품 이득률</th>
              <th>{B31.type} 이득률</th>
              <th>{B21.type} 이득률</th>
              <th>{B21.type} 가치 ÷ 가격</th>
            </tr>
          </thead>
          <tbody>
            {BUNDLE_ROWS.map((r) => (
              <tr key={r.single}>
                <td style={{ fontWeight: 600 }}>{signed(r.single)}</td>
                <td>{signed(r.b31)}</td>
                <td>{signed(r.b21)}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${((1 + r.b21) / MAX_RATIO) * 100}px` }} />
                    <span className={styles.barText}>{(1 + r.b21).toFixed(2)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>묶음 이득률 = (1 + 단품 이득률) × 받는 수 ÷ 내는 수 − 1</p>

      <p>
        단품으로 {signed(B31.breakeven)}인 패키지는 {B31.type}로 사면 정확히 본전이고, {B21.type}은 단품{' '}
        {signed(B21.breakeven)}까지 본전이 됩니다. 카드에 단품 기준 손해가 찍혀 있어도 이 선 안쪽이라면 묶음을 끝까지 살
        때는 이득이라는 뜻입니다. 반대로 한두 개만 살 생각이라면 묶음 이득률은 해당이 없으니 단품 이득률을 봐야 합니다.
      </p>

      <h2>크리스탈로 매겨지는 구성품</h2>
      <p>
        거래소에 없는 편의 아이템은 상점의 블루 크리스탈 가격으로 가치를 매깁니다. 블루 크리스탈 100개 = {won(WON_PER_BC * 100)}{' '}
        고정이라 원화 가치는 늘 같고, 골드 가치만 입력한 환율(원당 골드)에 따라 바뀝니다.
      </p>

      <div className={styles.tableScroll}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th>구성품</th>
              <th>블루 크리스탈</th>
              <th>원화 환산</th>
            </tr>
          </thead>
          <tbody>
            {CRYSTAL_ITEMS.map((c) => (
              <tr key={c.name}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className={styles.barCell}>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(c.bc / MAX_BC) * 100}px` }} />
                    <span className={styles.barText}>{c.bc.toLocaleString()}개</span>
                  </div>
                </td>
                <td>{won(c.won)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.tableCaption}>1개당, 골드 가치 = 원화 환산 × 환율(원당 골드)</p>

      <h2>페온 몫은 얼마인가</h2>
      <p>
        귀속 젬이나 팔찌처럼 거래소에 올리려면 페온이 드는 항목은 시세에 그 페온 값을 더해 평가합니다. 페온 1개가{' '}
        {won(WON_PER_PEON)}이니, 항목별로 붙는 몫은 아래와 같습니다.
      </p>

      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>항목</th>
            <th>페온</th>
            <th>블루 크리스탈</th>
            <th>원화 환산</th>
          </tr>
        </thead>
        <tbody>
          {PEON_ROWS.map((r) => (
            <tr key={r.name}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>{r.peon}개</td>
              <td>{r.bc.toLocaleString()}개</td>
              <td>{won(r.won)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        젬 시세가 낮을수록 이 페온 몫이 젬 가치에서 차지하는 비중이 커집니다. 거래소에 팔 생각이 없는 젬이라면 페온 값은
        실제로 돌아오지 않으니, 갤러리의 &quot;페온 가치 제거&quot;를 켜고 이득률을 한 번 더 보는 편이 정확합니다.
        고정형 영웅 젬 선택 상자는 원하는 옵션 조합을 확정으로 주므로 젬 시세에 {FIXED_GEM_COMBO_MULTIPLIER}배를 곱하고,
        추가 초기화 1회분을 더한 뒤 젬 가공 초기화권({GEM_RESET_TICKET_CRYSTAL} 블루 크리스탈 = {won(TICKET_RESET_WON)})
        값을 빼서 계산합니다.
      </p>

      <h2>티켓은 몇 층 기준으로 평가하나</h2>
      <p>
        지옥·나락 티켓은 해당 층의 상자 3개 중 1개를 고르는 기댓값으로 가치를 매깁니다. 층이 높을수록 보상이 커지므로
        어느 층을 기준으로 잡느냐가 곧 티켓 값입니다. 갤러리 카드와 효율순 정렬은 아래 기본 층을 쓰고, 패키지 상세에서만
        층을 바꿔 볼 수 있습니다.
      </p>
      <ol className={styles.stepFlow}>
        {TICKETS.map((t) => (
          <li key={t.name} className={styles.stepItem}>
            <strong>{t.name}</strong>
            {TICKET_TIER_LABELS[t.tier]}층 기준
          </li>
        ))}
        <li className={styles.stepItem}>
          <strong>큐브 티켓</strong>
          영웅 지옥 티켓의 1/{CUBE_PER_HEROIC}
        </li>
      </ol>
      <p>
        본인이 평소 그 층까지 가지 못한다면 상세 페이지에서 층을 낮춰 보는 것이 맞고, 늘 더 깊이 내려간다면 올려 보는
        것이 맞습니다. 티켓 비중이 큰 패키지일수록 이 선택 하나로 이득률의 부호가 바뀌기도 합니다.
      </p>

      <h2>구성품 종류별 가치 산정 규칙</h2>
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
            <td>블루 크리스탈 소요량 × 현재 환율 (100 블크 = {won(WON_PER_BC * 100)} 고정)</td>
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
        선택 상자를 <strong>등록 시점의 선택</strong>이 아니라 <strong>조회 시점의 시세</strong>로 다시 고르는 이유가
        있습니다. 등록할 때는 A가 제일 비쌌더라도 며칠 뒤 B가 역전하면 실제 구매자는 B를 고를 테니, 저장된 선택을 그대로
        쓰면 패키지 가치를 실제보다 낮게 보게 됩니다.
      </p>

      <div className={styles.noteBox}>
        <p>
          가챠 패키지의 기댓값은 여러 번 샀을 때의 평균입니다. 한두 번 구매에서는 결과가 기댓값과 크게 다를 수 있으니,
          가챠의 이득률은 &quot;많이 살수록 이 값에 가까워진다&quot;는 뜻으로 읽는 편이 좋습니다.
        </p>
      </div>
    </div>
  );
}
