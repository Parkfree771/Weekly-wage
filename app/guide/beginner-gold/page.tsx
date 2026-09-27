import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';
import { raids } from '@/data/raids';
import { EVENT_CONTENTS, GUARDIAN_TIERS, RIFT_TIERS, type EventTierKey } from '@/data/rewardTable';

export const metadata: Metadata = {
  title: '초보자를 위한 골드 수급 가이드',
  description:
    '로스트아크 초보자를 위한 골드 획득 방법 총정리. 레이드, 카오스 던전, 생활 콘텐츠, 거래소 활용까지 효율적인 골드 수급 전략과 캐릭터 육성법을 안내합니다.',
  keywords:
    '로아 초보자, 로아 골드 수급, 로아 골드 모으기, 로아 뉴비 가이드, 로아 캐릭터 육성, 로스트아크 초보, 로아 골드 획득 방법, 로아 입문 가이드',
  alternates: { canonical: '/guide/beginner-gold' },
};

// ── 표·문장 속 숫자는 전부 data/ 원본에서 계산 ──
const RAID_ROWS = [...raids]
  .map((r) => {
    const gold = r.gates.reduce((s, g) => s + g.gold, 0);
    const bound = r.gates.reduce((s, g) => s + g.boundGold, 0);
    return { name: r.name, level: r.level, gates: r.gates.length, gold, bound, share: bound / gold };
  })
  .sort((a, b) => a.level - b.level || a.gold - b.gold);

const MAX_RAID_GOLD = Math.max(...RAID_ROWS.map((r) => r.gold));
const LOWEST = RAID_ROWS[0];
const FIRST_FULL_TRADE = RAID_ROWS.find((r) => r.bound === 0);
const HALF_BELOW = FIRST_FULL_TRADE
  ? RAID_ROWS.filter((r) => r.level < FIRST_FULL_TRADE.level && r.share > 0 && r.share < 1)
  : [];
const ALL_HALF_BELOW =
  FIRST_FULL_TRADE !== undefined &&
  RAID_ROWS.filter((r) => r.level < FIRST_FULL_TRADE.level).every((r) => r.share === 0.5 || r.share === 1);

// 카오스 게이트 — 원정대 대표 캐릭터 1명, 회당 귀속 골드
const GATE = EVENT_CONTENTS.find((e) => e.key === 'gate')!;
const GATE_TIERS = (Object.keys(GATE.gold) as EventTierKey[]).sort();

// 균열·가디언 토벌 최저 티어 (이 사이트 계산의 시작점)
const DAILY_START = Math.min(...RIFT_TIERS.map((t) => t.minLevel), ...GUARDIAN_TIERS.map((t) => t.minLevel));
const EVENT_START = Math.min(...GATE_TIERS.map(Number));

/** 레벨 구간별로 새로 열리는 수입원 */
const MILESTONES = [
  { level: LOWEST.level, title: '첫 골드 레이드', text: `${RAID_ROWS.filter((r) => r.level === LOWEST.level).map((r) => r.name).join('·')}` },
  { level: DAILY_START, title: '일일 콘텐츠 보상 티어 시작', text: '균열·전선, 가디언 토벌' },
  ...(FIRST_FULL_TRADE ? [{ level: FIRST_FULL_TRADE.level, title: '전액 유통 레이드', text: FIRST_FULL_TRADE.name }] : []),
  { level: EVENT_START, title: '주간 콘텐츠 추가', text: '할의 모래시계, 카오스 게이트·필드보스(대표 1캐릭)' },
].sort((a, b) => a.level - b.level);

export default function BeginnerGoldGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>초보자</span>
          <h1 className={styles.articleTitle}>초보자를 위한 골드 수급 가이드</h1>
          <span className={styles.articleDate}>2026년 2월 6일 작성 · 2026년 7월 18일 업데이트</span>
        </div>

        <div className={styles.articleBody}>
          <h2>로스트아크에서 골드의 중요성</h2>
          <p>
            골드는 로스트아크의 기본 화폐로, 장비 재련, 거래소 아이템 구매, 각인서 구매 등
            캐릭터 성장의 거의 모든 과정에서 필요합니다. 안정적인 골드 수급 없이는 캐릭터 성장이 어렵기 때문에,
            초보자도 골드 획득 방법을 빠르게 파악하는 것이 중요합니다.
            이 가이드에서는 초보자가 알아야 할 주요 골드 획득 방법과 효율적인 사용 전략을 소개합니다.
          </p>

          <h2>골드 획득 방법 총정리</h2>

          <h3>1. 레이드 (주간 골드의 핵심)</h3>
          <p>
            레이드 클리어는 로스트아크에서 가장 큰 골드 수입원입니다.
            매주 수요일 오전 6시에 초기화되며, 원정대 내 최대 6캐릭터가 골드를 획득할 수 있습니다.
            캐릭터의 아이템 레벨에 따라 참여 가능한 레이드가 결정되므로,
            아이템 레벨을 올려 더 높은 보상의 레이드에 참여하는 것이 목표입니다.
            일부 레이드는 골드의 전부 또는 절반을 거래 불가능한 귀속 골드로 지급하니,
            거래소에서 쓸 골드가 필요하다면 이 점도 함께 고려하세요.
          </p>

          <h3>2. 카오스 던전</h3>
          <p>
            카오스 던전은 매일 입장할 수 있는 던전으로, 재련 재료와 장신구 등을 보상으로 받습니다.
            직접적인 골드 보상은 적지만, 획득한 재료를 거래소에 판매하면 간접적으로 골드를 얻을 수 있습니다.
            매일 꾸준히 진행하면 상당한 재료가 쌓이므로, 일과에 포함시키는 것을 권장합니다.
          </p>

          <h3>3. 가디언 토벌</h3>
          <p>
            가디언 토벌 역시 매일 진행할 수 있는 콘텐츠로, 로아로골이 보상을 집계하는 {DAILY_START} 이상 구간에서는 보석을 주 보상으로 제공합니다.
            보석은 캐릭터 성능과 직결되는 아이템이라 직접 쓰거나 판매해 골드로 바꿀 수 있습니다.
            레이드만큼 큰 보상은 아니지만 꾸준히 하면 차이가 납니다.
          </p>

          <h3>4. 생활 콘텐츠</h3>
          <p>
            벌목, 채광, 고고학 등 생활 콘텐츠에서 획득한 자원으로 아비도스 융화재료를 제작하면
            추가 골드 수입을 얻을 수 있습니다. 생활 에너지가 자동으로 회복되므로,
            에너지가 가득 차기 전에 주기적으로 생활 콘텐츠를 진행하는 것이 좋습니다.
          </p>

          <h3>5. 거래소 활용</h3>
          <p>
            거래소에서 아이템을 사고파는 것도 골드를 얻는 방법입니다.
            레이드에서 획득한 불필요한 장신구, 보석, 재료 등을 거래소에 등록하여 판매하세요.
            시세를 잘 파악하면 저가 매수 후 고가 매도를 통해 시세 차익을 얻을 수도 있습니다.
          </p>

          <h3>6. 카오스 게이트 (원정대 대표 캐릭터)</h3>
          <p>
            {EVENT_START} 이상 캐릭터가 있다면 카오스 게이트도 챙길 만합니다. 원정대 대표 캐릭터 한 명만
            받는 보상이고, 주 {GATE.perWeek}회 열리며 회당 귀속 골드를 줍니다. 아래는 대표 캐릭터의 레벨
            구간별 금액입니다.
          </p>
          <div className={styles.statGrid}>
            {GATE_TIERS.map((t) => (
              <div key={t} className={styles.statCard}>
                <span className={styles.statLabel}>{t} 이상</span>
                <span className={styles.statValue}>{(GATE.gold[t] * GATE.perWeek).toLocaleString()} G</span>
                <span className={styles.statNote}>
                  회당 {GATE.gold[t].toLocaleString()} × 주 {GATE.perWeek}회, 귀속
                </span>
              </div>
            ))}
          </div>
          <p>
            레이드처럼 캐릭터마다 받는 골드가 아니라서 원정대 전체 수입에서 비중이 크지는 않지만, 대표
            캐릭터의 레벨만 올려 두면 추가 조건 없이 들어오는 귀속 골드입니다.
          </p>

          <h2>레벨 구간별로 열리는 수입원</h2>
          <p>
            처음 시작하면 무엇이 언제 열리는지부터 헷갈립니다. 로아로골 계산기가 쓰는 데이터 기준으로,
            레벨이 오르면서 수입 구조가 바뀌는 지점을 순서대로 놓으면 다음과 같습니다.
          </p>
          <ol className={styles.stepFlow}>
            {MILESTONES.map((m) => (
              <li key={`${m.level}-${m.title}`} className={styles.stepItem}>
                <strong>{m.level}</strong>
                {m.title}
                <br />
                {m.text}
              </li>
            ))}
          </ol>

          <h2>초보자 추천 골드 수급 루틴</h2>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>주기</th>
                <th>콘텐츠</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>매일</td>
                <td>카오스 던전</td>
                <td>재련 재료, 장신구 획득</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매일</td>
                <td>가디언 토벌</td>
                <td>보석 획득</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매일</td>
                <td>일일 의뢰</td>
                <td>파편, 실링 등 획득</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>수시</td>
                <td>생활 콘텐츠</td>
                <td>에너지 소비, 융화재료 제작</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>매주</td>
                <td>레이드 클리어</td>
                <td>주간 골드 핵심 수입원</td>
              </tr>
            </tbody>
          </table>

          <h2>골드 사용 우선순위</h2>
          <p>
            초보자는 골드를 효율적으로 사용하는 것이 중요합니다. 다음 우선순위를 참고하세요:
          </p>
          <ol>
            <li><strong>장비 재련:</strong> 아이템 레벨을 올려야 더 높은 보상의 콘텐츠에 참여할 수 있습니다. 재련은 최우선 투자 대상입니다.</li>
            <li><strong>각인서 및 보석:</strong> 전투 능력을 높여 레이드 클리어를 수월하게 합니다. 재련으로 레벨이 충분해진 후 투자하세요.</li>
            <li><strong>재련 재료 매입:</strong> 시세가 낮을 때 재련 재료를 미리 구매해두면 비용을 절약할 수 있습니다.</li>
            <li><strong>외형 아이템:</strong> 기능에 영향을 주지 않으므로 여유가 생긴 후에 고려하세요.</li>
          </ol>

          <h2>효율적인 캐릭터 육성 방법</h2>
          <p>
            초보자가 가장 빠르게 골드 수급 구조를 갖추려면 다음 전략을 참고하세요:
          </p>
          <ul>
            <li>메인 캐릭터 1개를 먼저 집중적으로 육성하여 높은 레이드에 진입합니다.</li>
            <li>서브 캐릭터를 순차적으로 육성하여 원정대의 주간 골드 총량을 늘립니다.</li>
            <li>6캐릭터가 모두 레이드에 참여하면 주간 골드가 크게 증가합니다.</li>
            <li>각 캐릭터의 아이템 레벨을 레이드 입장 레벨에 맞춰 효율적으로 올리세요.</li>
          </ul>

          <h2>레이드별 클리어 골드 한눈에</h2>
          <p>
            어느 레이드부터 들어갈 수 있고 한 주에 얼마가 들어오는지 감을 잡는 게 먼저입니다.
            아래 표는 로아로골 계산기가 쓰는 것과 같은 데이터입니다.
            <strong>총 골드</strong>는 모든 관문을 클리어했을 때 받는 합계이고,
            그중 <strong>귀속</strong>은 거래소에서 쓸 수 없고 더보기 비용 등에 먼저 차감되는 몫입니다.
          </p>
          <div className={styles.tableScroll}>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>레이드</th>
                <th>요구 레벨</th>
                <th>관문</th>
                <th>총 클리어 골드</th>
                <th>그중 귀속</th>
                <th>귀속 비중</th>
              </tr>
            </thead>
            <tbody>
              {RAID_ROWS.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.level.toLocaleString()}</td>
                  <td>{r.gates}관문</td>
                  <td className={styles.barCell}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(r.gold / MAX_RAID_GOLD) * 100}px` }} />
                      <span className={styles.barText}>{r.gold.toLocaleString()} G</span>
                    </div>
                  </td>
                  <td>{r.bound.toLocaleString()} G</td>
                  <td>{Math.round(r.share * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className={styles.tableCaption}>요구 레벨 순. 막대는 최고 골드 레이드 대비 길이</p>
          <p>
            표를 보면 알 수 있듯 요구 레벨이 오를수록 골드가 계단식으로 뜁니다.
            그래서 초반에는 <strong>골드를 모으는 것보다 다음 레벨 구간에 들어가는 것</strong>이
            훨씬 큰 수익 개선입니다. 아래 &quot;골드 사용 우선순위&quot;에서 재련을 앞에 둔 이유이기도 합니다.
          </p>

          <h2>귀속 골드와 유통 골드를 구분해야 하는 이유</h2>
          <p>
            클리어 골드는 전부 같은 골드가 아닙니다. <strong>유통 골드</strong>는 거래소에서
            재료를 사거나 다른 캐릭터로 옮길 수 있지만, <strong>귀속 골드</strong>는 해당 원정대 안에서
            소모만 가능합니다. 더보기 보상을 구매할 때는 귀속 골드가 먼저 차감되고 모자란 만큼만
            유통 골드에서 빠져나갑니다.
          </p>
          <p>
            그래서 &quot;이번 주에 골드를 얼마 벌었나&quot;를 유통 골드 기준으로만 세면 실제보다 적게 보이고,
            총합으로만 세면 실제로 쓸 수 있는 돈보다 많게 보입니다.
            로아로골 숙제 체크는 이 둘을 나눠서 집계하므로, 재료를 사려고 모으는 중이라면
            유통 골드 쪽 숫자를 기준으로 계획하세요.
          </p>
          {FIRST_FULL_TRADE && (
            <div className={styles.noteBox}>
              <p>
                위 표에서 귀속 비중 칸을 따라 내려가 보면, 귀속이 0%인 첫 레이드는 {FIRST_FULL_TRADE.level}의{' '}
                {FIRST_FULL_TRADE.name}입니다.
                {ALL_HALF_BELOW
                  ? ` 그보다 낮은 레이드는 지평의 성당(전액 귀속)을 빼면 전부 골드의 절반이 귀속입니다(${HALF_BELOW.length}개).`
                  : ''}{' '}
                초반 캐릭터로 번 골드의 상당 부분은 거래소에서 쓸 수 없다는 뜻이라, 거래소 구매 계획은 유통 골드만
                따로 세어서 세우는 편이 정확합니다.
              </p>
            </div>
          )}

          <div className={styles.tipBox}>
            <p>
              <strong>TIP:</strong> 로아로골의 주간 골드 계산기에 캐릭터명을 입력하면
              원정대 전체의 예상 주간 골드를 자동으로 계산해줍니다. 현재 내 원정대의 수익 구조를 파악하고
              어떤 캐릭터를 먼저 육성할지 전략을 세워보세요.
            </p>
          </div>

          <div className={styles.guideCta}>
            <p>로아로골에서 내 원정대의 주간 골드 수익을 확인해보세요.</p>
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
            "headline": "초보자를 위한 골드 수급 가이드",
            "description": "로스트아크를 시작한 초보자가 알아야 할 골드 획득 방법, 우선순위, 효율적인 캐릭터 육성법을 소개합니다.",
            "datePublished": "2026-02-06",
            "dateModified": "2026-09-27",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/beginner-gold`
          })
        }}
      />
    </div>
  );
}
