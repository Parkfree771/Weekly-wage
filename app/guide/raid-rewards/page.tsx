import Link from 'next/link';
import { Metadata } from 'next';
import { raids, upcomingRaids } from '@/data/raids';
import { RAID_TABLE } from '@/data/rewardTable';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '로스트아크 레이드 보상 총정리 (2026)',
  description:
    '로스트아크 전체 레이드 보상을 한눈에 비교하세요. 벨가르딘, 지평의 성당, 세르카, 종막, 4막부터 서막까지 관문별 골드와 더보기 비용, 유통·귀속 골드 비중, 난이도를 올릴 때 늘어나는 골드와 마지막 관문에 몰린 골드 비중까지 정리했습니다.',
  keywords:
    '로아 레이드 보상, 로아 벨가르딘 보상, 로아 세르카 보상, 로아 성당 보상, 로아 종막 보상, 로아 레이드 골드, 로아 더보기 보상, 카제로스 레이드, 로스트아크 레이드 보상 정리',
  alternates: { canonical: '/guide/raid-rewards' },
};

type RaidRow = {
  name: string;
  group: string;
  level: number;
  gates: number;
  gold: number;
  bound: number;
  trade: number;
  more: number;
  lastGate: number;
};

// 활성 레이드만 (raids 는 rewardTable 에서 비활성 레이드를 뺀 목록). group 은 원본 테이블에서 가져온다.
const ACTIVE = new Set(raids.map((r) => r.name));
const ROWS: RaidRow[] = RAID_TABLE.filter((e) => ACTIVE.has(e.name)).map((e) => {
  const gold = e.gates.reduce((s, g) => s + g.gold, 0);
  const bound = e.gates.reduce((s, g) => s + g.boundGold, 0);
  return {
    name: e.name,
    group: e.group,
    level: e.level,
    gates: e.gates.length,
    gold,
    bound,
    trade: gold - bound,
    more: e.gates.reduce((s, g) => s + g.moreGold, 0),
    lastGate: e.gates[e.gates.length - 1].gold,
  };
});

const byName = (name: string) => ROWS.find((r) => r.name === name);
const g = (name: string) => (byName(name)?.gold ?? 0).toLocaleString();

const MAX_GOLD = Math.max(...ROWS.map((r) => r.gold));
const TOP = ROWS.find((r) => r.gold === MAX_GOLD)!;
const FULL_BOUND = ROWS.filter((r) => r.bound === r.gold);
const HALF_BOUND = ROWS.filter((r) => r.bound > 0 && r.bound < r.gold);
const NO_BOUND = ROWS.filter((r) => r.bound === 0);

// 유통 골드 기준 순위
const BY_TRADE = [...ROWS].sort((a, b) => b.trade - a.trade);
/** 동점은 같은 순위 (자기보다 골드가 많은 레이드 수 + 1) */
const goldRank = (name: string) => ROWS.filter((r) => r.gold > (byName(name)?.gold ?? 0)).length + 1;

// 같은 그룹 안에서 한 단계 위 난이도로 갈 때
const STEPS = (() => {
  const groups = [...new Set(ROWS.map((r) => r.group))];
  const out: { from: RaidRow; to: RaidRow; goldUp: number; tradeUp: number | null }[] = [];
  for (const grp of groups) {
    const list = ROWS.filter((r) => r.group === grp).sort((a, b) => a.level - b.level);
    for (let i = 1; i < list.length; i++) {
      const from = list[i - 1];
      const to = list[i];
      out.push({
        from,
        to,
        goldUp: to.gold / from.gold - 1,
        tradeUp: from.trade > 0 ? to.trade / from.trade - 1 : null,
      });
    }
  }
  return out;
})();
const MAX_TRADE_UP = Math.max(...STEPS.map((s) => s.tradeUp ?? 0));
const BOUND_FLIPS = STEPS.filter((s) => s.from.bound > 0 && s.from.bound < s.from.gold && s.to.bound === 0);

// 마지막 관문 비중
const LAST_SHARE = [...ROWS]
  .map((r) => ({ ...r, share: r.lastGate / r.gold }))
  .sort((a, b) => b.share - a.share);
const TWO_GATE = LAST_SHARE.filter((r) => r.gates === 2);
const MULTI_GATE = LAST_SHARE.filter((r) => r.gates > 2);
const minMaxPct = (list: { share: number }[]) => {
  const v = list.map((r) => r.share * 100);
  return [Math.min(...v), Math.max(...v)].map((x) => `${x.toFixed(0)}%`);
};

// 전액 유통 레이드가 유통 기준 상위를 그대로 차지하는지
const NO_BOUND_ON_TOP = BY_TRADE.slice(0, NO_BOUND.length).every((r) => r.bound === 0);
// 절반 귀속 레이드의 더보기 비용이 귀속분 안에 들어가는지
const HALF_MORE_FITS = HALF_BOUND.every((r) => r.more <= r.bound);

const pct0 = (v: number) => `${(v * 100).toFixed(0)}%`;
const names = (list: RaidRow[]) => list.map((r) => r.name).join(', ');

export default function RaidRewardsGuidePage() {
  const upcomingTotals = upcomingRaids.map((raid) => ({
    ...raid,
    totalGold: raid.gates.reduce((sum, gt) => sum + gt.gold, 0),
    totalMoreGold: raid.gates.reduce((sum, gt) => sum + gt.moreGold, 0),
  }));
  const [twoMin, twoMax] = minMaxPct(TWO_GATE);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>레이드</span>
          <h1 className={styles.articleTitle}>로스트아크 레이드 보상 총정리 (2026)</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성 · 2026년 7월 18일 업데이트</span>
        </div>

        <div className={styles.articleBody}>
          <h2>로스트아크 레이드 시스템 개요</h2>
          <p>
            로스트아크의 레이드는 4인 또는 8인 파티로 진행하는 고난도 보스 전투 콘텐츠입니다.
            각 레이드는 여러 개의 관문으로 나뉘어 있으며, 관문을 클리어할 때마다 골드와 재료를 보상으로 받습니다.
            레이드 난이도는 노말, 하드, 나메(나이트메어)로 구분되며, 높은 난이도일수록 더 많은 보상을 제공합니다.
          </p>
          <p>
            현재 로스트아크에서 진행 가능한 주요 레이드는 카제로스 시리즈(1막~종막)와
            세르카, 지평의 성당, 베히모스, 서막(에키드나), 그리고 2026년 8월 5일 출시된 벨가르딘입니다.
            각 레이드마다 요구하는 최소 아이템 레벨이 다르며,
            주간 골드 보상을 받을 수 있는 횟수도 캐릭터당 1회로 제한됩니다.
            2026년 6월에는 벨가르딘 추가를 앞두고 일부 상위 레이드의 클리어 골드가 하향 조정되었고,
            이 글의 수치는 조정 이후 기준입니다.
          </p>

          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>골드 레이드</span>
              <span className={styles.statValue}>{ROWS.length}개</span>
              <span className={styles.statNote}>난이도별로 따로 셈</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>최고 클리어 골드</span>
              <span className={styles.statValue}>{TOP.gold.toLocaleString()}</span>
              <span className={styles.statNote}>{TOP.name}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>전액 유통 골드</span>
              <span className={styles.statValue}>{NO_BOUND.length}개</span>
              <span className={styles.statNote}>귀속 없이 전부 거래 가능</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>전액 귀속 골드</span>
              <span className={styles.statValue}>{FULL_BOUND.length}개</span>
              <span className={styles.statNote}>지평의 성당 전 단계</span>
            </div>
          </div>

          <h2>전체 레이드 보상 비교표</h2>
          <p>
            아래 표에서 각 레이드의 총 클리어 골드와 그중 유통 골드, 총 더보기 비용을 한눈에 비교할 수
            있습니다. 더보기는 골드를 지불하고 재련 재료를 추가로 받는 선택지로, 재료 시세에 따라 손익이
            달라집니다.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>레이드</th>
                  <th>입장 레벨</th>
                  <th>관문 수</th>
                  <th>총 클리어 골드</th>
                  <th>그중 유통</th>
                  <th>총 더보기 비용</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((raid) => (
                  <tr key={raid.name}>
                    <td style={{ fontWeight: 600 }}>{raid.name}</td>
                    <td>{raid.level}</td>
                    <td>{raid.gates}관문</td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${(raid.gold / MAX_GOLD) * 100}px` }} />
                        <span className={styles.barText}>{raid.gold.toLocaleString()}</span>
                      </div>
                    </td>
                    <td>{raid.trade.toLocaleString()}</td>
                    <td>{raid.more.toLocaleString()}</td>
                  </tr>
                ))}
                {upcomingTotals.map((raid) => (
                  <tr key={raid.name}>
                    <td style={{ fontWeight: 600 }}>
                      {raid.name} ({raid.releaseLabel})
                    </td>
                    <td>{raid.level}</td>
                    <td>{raid.gates.length}관문</td>
                    <td>{raid.totalGold.toLocaleString()}</td>
                    <td>-</td>
                    <td>{raid.totalMoreGold.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableCaption}>유통 = 총 클리어 골드 - 귀속 골드. 막대는 최고 골드 레이드 대비 길이</p>

          <h2>유통 골드로 줄을 세우면 순서가 바뀝니다</h2>
          <p>
            총 클리어 골드 순위와 거래소에서 실제로 쓸 수 있는 유통 골드 순위는 다릅니다. 레이드의 귀속
            비중이 세 갈래로 나뉘기 때문입니다.
          </p>
          <ul>
            <li>
              <strong>전액 유통 ({NO_BOUND.length}개):</strong> {names(NO_BOUND)}
            </li>
            <li>
              <strong>절반 귀속 ({HALF_BOUND.length}개):</strong> {names(HALF_BOUND)}
            </li>
            <li>
              <strong>전액 귀속 ({FULL_BOUND.length}개):</strong> {names(FULL_BOUND)}
            </li>
          </ul>
          <p>
            가장 크게 밀려나는 것은 지평의 성당입니다. 성당 3단계는 총 골드 {g('성당 3단계')}골드로 전체{' '}
            {ROWS.filter((r) => r.gold === byName('성당 3단계')?.gold).length > 1 ? '공동 ' : ''}
            {goldRank('성당 3단계')}위지만, 유통 골드는 0이라 유통 기준으로는 맨 뒤입니다.
            {NO_BOUND_ON_TOP
              ? ` 반대로 전액 유통인 ${NO_BOUND.length}개 레이드는 유통 기준 상위 ${NO_BOUND.length}자리를 그대로 차지합니다.`
              : ''}{' '}
            거래소에서 재료를 사야 하는 주라면 총 골드보다 이 순서가 실제 구매력에 가깝습니다.
          </p>

          <h2>난이도를 한 단계 올리면 골드는 얼마나 늘어나나</h2>
          <p>
            같은 레이드 안에서 한 단계 위 난이도로 갈 때 총 골드와 유통 골드가 몇 % 늘어나는지
            계산했습니다. 대부분의 난이도 차이는 입장 레벨 20이고, 벨가르딘·세르카의 하드와 나이트메어
            사이는 10, 성당 2단계와 3단계 사이는 30입니다.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>난이도 이동</th>
                  <th>레벨 차</th>
                  <th>총 골드</th>
                  <th>유통 골드 증가</th>
                </tr>
              </thead>
              <tbody>
                {STEPS.map((s) => (
                  <tr key={s.to.name}>
                    <td style={{ fontWeight: 600 }}>
                      {s.from.name} → {s.to.name.replace(`${s.to.group} `, '')}
                    </td>
                    <td>+{s.to.level - s.from.level}</td>
                    <td>
                      {s.from.gold.toLocaleString()} → {s.to.gold.toLocaleString()} (+{pct0(s.goldUp)})
                    </td>
                    <td className={styles.barCell}>
                      {s.tradeUp === null ? (
                        '전액 귀속'
                      ) : (
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${(s.tradeUp / MAX_TRADE_UP) * 100}px` }}
                          />
                          <span className={styles.barText}>+{pct0(s.tradeUp)}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            총 골드만 보면 난이도 한 단계는 대략 {pct0(Math.min(...STEPS.map((s) => s.goldUp)))}~
            {pct0(Math.max(...STEPS.map((s) => s.goldUp)))} 증가입니다. 그런데 유통 골드 칸을 보면{' '}
            {BOUND_FLIPS.map((s) => s.to.group).join('·')} {BOUND_FLIPS.length}개 레이드만 증가폭이 튀어 오릅니다. 이 레이드들은
            노말이 절반 귀속이고 하드부터 전액 유통이라, 난이도를 올리는 순간 거래 가능한 골드가 두 배를
            훌쩍 넘게 늘어납니다. 예를 들어 {BOUND_FLIPS[0]?.from.name}의 유통 골드는{' '}
            {BOUND_FLIPS[0]?.from.trade.toLocaleString()}이지만 {BOUND_FLIPS[0]?.to.name}는{' '}
            {BOUND_FLIPS[0]?.to.trade.toLocaleString()}입니다.
          </p>
          <p>
            그래서 이 레이드들의 노말과 하드 사이, 1700~1730 구간 캐릭터에게는 하드 진입의 의미가 총 골드 수치보다 큽니다. 귀속 골드는
            재련에는 쓸 수 있으니 캐릭터 성장만 본다면 차이가 줄어들지만, 거래소 구매나 다른 캐릭터 지원이
            목적이라면 이 구간의 하드 진입이 체감 수입을 가장 크게 바꿉니다.
          </p>

          <h2>골드의 절반 이상은 마지막 관문에 있습니다</h2>
          <p>
            관문별 골드는 균등하지 않습니다. 2관문 레이드는 마지막 관문이 전체 골드의 {twoMin}~{twoMax}를
            차지합니다. 3관문인 {names(MULTI_GATE)}만 마지막 관문 비중이{' '}
            {MULTI_GATE.map((r) => pct0(r.share)).join('·')}로 낮아집니다.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.guideTable}>
              <thead>
                <tr>
                  <th>레이드</th>
                  <th>관문 수</th>
                  <th>마지막 관문 골드</th>
                  <th>전체 대비</th>
                </tr>
              </thead>
              <tbody>
                {LAST_SHARE.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.gates}관문</td>
                    <td>
                      {r.lastGate.toLocaleString()} / {r.gold.toLocaleString()}
                    </td>
                    <td className={styles.barCell}>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${r.share * 100}px` }} />
                        <span className={styles.barText}>{pct0(r.share)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            2관문 레이드끼리 보면 오래된 레이드일수록 마지막 관문 비중이 높습니다.{' '}
            {LAST_SHARE[0].name}은 {pct0(LAST_SHARE[0].share)}가 마지막 관문에 몰려 있고, 벨가르딘·세르카·성당처럼
            최근 레이드는 60% 안팎으로 맞춰져 있습니다. 2관문 레이드에서 마지막 관문을 넘지 못하면 받은 골드가
            전체의 절반에도 못 미친다는 뜻입니다. 주 중에 관문 단위로 나눠 도는 경우라면, 마지막 관문을 남겨 둔
            레이드가 가장 많은 골드를 붙잡고 있다는 점을 기억해 두면 좋습니다.
          </p>

          <h2>레이드별 상세 안내</h2>

          <h3>벨가르딘</h3>
          <p>
            벨가르딘은 노말({byName('벨가르딘 노말')?.level}), 하드({byName('벨가르딘 하드')?.level}),
            나이트메어({byName('벨가르딘 나메')?.level}) 세 난이도의 그림자 레이드입니다. 나이트메어 기준 총{' '}
            {g('벨가르딘 나메')}골드, 하드 {g('벨가르딘 하드')}골드, 노말 {g('벨가르딘 노말')}골드로 현재 최고
            보상 레이드이고, 세 난이도 모두 전액 유통 골드입니다. 관문별 클리어 골드와 더보기 비용, 클리어·더보기
            재련 재료 수량까지 출시 당일 확인한 확정치가 로아로골에 반영되어 있습니다. 관문별 재료는{' '}
            <Link href="/guide/belgardin-rewards">벨가르딘 관문별 보상 정리</Link>에 따로 정리했습니다.
          </p>

          <h3>지평의 성당</h3>
          <p>
            지평의 성당은 1단계({byName('성당 1단계')?.level}), 2단계({byName('성당 2단계')?.level}),
            3단계({byName('성당 3단계')?.level})로 나뉘는 레이드로, 3단계 기준 총 {g('성당 3단계')}골드를
            제공합니다. 다른 레이드와 달리 클리어 골드 전액이
            <strong> 귀속 골드</strong>로 지급되는 것이 특징입니다. 귀속 골드는 거래소에서 쓸 수 없지만
            재련 비용으로는 사용할 수 있으므로, 성장 중인 캐릭터에게는 체감 가치가 충분히 높습니다.
          </p>

          <h3>세르카</h3>
          <p>
            세르카는 나이트메어({byName('세르카 나메')?.level}), 하드({byName('세르카 하드')?.level}),
            노말({byName('세르카 노말')?.level}) 세 가지 난이도가 있으며, 나이트메어 기준 총{' '}
            {g('세르카 나메')}골드, 하드 {g('세르카 하드')}골드, 노말 {g('세르카 노말')}골드를 획득할 수
            있습니다. 벨가르딘 출시 전까지 일반 골드 기준 최고 보상 레이드였고, 고통의 가시 등 세르카 전용
            재화도 함께 드롭됩니다.
          </p>

          <h3>카제로스 종막 (아브렐슈드)</h3>
          <p>
            종막은 카제로스 시리즈의 마지막 레이드로, 하드({byName('종막 하드')?.level})와
            노말({byName('종막 노말')?.level}) 난이도가 있습니다. 하드 기준 총 {g('종막 하드')}골드, 노말 기준{' '}
            {g('종막 노말')}골드를 제공합니다. 노말에서 하드로 올라갈 때 총 골드 증가율이 카제로스 시리즈
            안에서도 큰 편이고, 유통 골드로는 세 배가 됩니다.
          </p>

          <h3>카제로스 4막 (일리아칸)</h3>
          <p>
            4막은 하드({byName('4막 하드')?.level})와 노말({byName('4막 노말')?.level}) 난이도로 진행됩니다.
            하드 기준 총 {g('4막 하드')}골드, 노말 기준 {g('4막 노말')}골드를 보상으로 제공합니다. 2관문으로
            구성되어 있어 비교적 빠르게 클리어할 수 있는 편입니다.
          </p>

          <h3>카제로스 3막 (상아탑)</h3>
          <p>
            3막은 3관문으로 구성된 레이드로, 하드({byName('3막 하드')?.level})와 노말({byName('3막 노말')?.level})
            난이도가 있습니다. 하드 기준 총 {g('3막 하드')}골드, 노말 기준 {g('3막 노말')}골드를 획득할 수
            있습니다. 관문이 3개라 다른 2관문 레이드보다 시간이 더 소요되지만, 골드가 세 관문에 나뉘어 있어
            마지막 관문 비중이 모든 레이드 중 가장 낮습니다.
          </p>

          <h3>카제로스 2막, 1막, 서막, 베히모스</h3>
          <p>
            하위 레이드들은 상대적으로 적은 골드를 보상하지만, 아이템 레벨이 낮은 캐릭터도
            참여할 수 있어 원정대 전체의 주간 골드를 채우는 데 중요한 역할을 합니다.
            2막은 하드 기준 총 {g('2막 하드')}골드, 1막은 하드 기준 총 {g('1막 하드')}골드,
            서막과 베히모스는 각각 총 {g('서막')}골드를 제공합니다. 네 레이드 모두 골드의 절반이 귀속입니다.
          </p>

          <h2>더보기 보상 선택 가이드</h2>
          <p>
            더보기 보상은 골드를 지불하고 재련 재료를 추가로 받는 선택입니다.
            더보기가 이득인지 여부는 재련 재료의 현재 거래소 시세에 달려 있습니다.
            재료 시세가 높을 때는 더보기로 받는 재료의 가치가 지불 골드를 넘어 이득이 되고,
            시세가 낮을 때는 골드를 아끼는 편이 유리합니다.
          </p>
          <div className={styles.noteBox}>
            <p>
              더보기 비용은 귀속 골드에서 먼저 차감되고, 모자란 만큼만 유통 골드에서 빠집니다.
              {HALF_MORE_FITS
                ? ` 절반 귀속 레이드는 전 관문 더보기 비용이 모두 귀속분 안에 들어가서, 더보기를 전부 사도 유통 골드가 줄지 않습니다.`
                : ''}{' '}
              반면 전액 유통 레이드는 더보기 비용만큼 유통 골드가 그대로 줄어듭니다. {TOP.name} 기준으로
              {` ${TOP.trade.toLocaleString()}`}골드가 더보기를 전부 사면 {(TOP.trade - TOP.more).toLocaleString()}골드가 됩니다.
            </p>
          </div>
          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골의 더보기 손익 계산기에서 실시간 거래소 시세를 반영하여
              각 레이드별 더보기 손익을 자동 분석해드립니다. 매주 레이드 전에 확인하세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로아로골에서 내 캐릭터의 레이드 보상을 직접 계산해보세요.</p>
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
            "headline": "로스트아크 레이드 보상 총정리 (2026)",
            "description": "벨가르딘, 성당, 세르카, 종막부터 서막까지 모든 레이드의 관문별 클리어 골드와 더보기 보상을 비교합니다.",
            "datePublished": "2026-02-06",
            "dateModified": "2026-09-27",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/raid-rewards`
          })
        }}
      />
    </div>
  );
}
