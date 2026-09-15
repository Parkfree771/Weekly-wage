import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '벨가르딘 관문별 클리어 보상과 더보기 정리 (노말·하드·나이트메어)',
  description:
    '2026년 8월 5일 출시 벨가르딘의 노말·하드·나이트메어 난이도별 관문 클리어 골드, 재료 보상, 더보기 비용과 보상을 표로 정리했습니다. 승급 재료(사령의 잔영·죽음의 손) 주간 수급량과 코어 수급, 더보기 실수령 골드까지 확인할 수 있습니다.',
  keywords:
    '벨가르딘 보상, 벨가르딘 클리어 골드, 벨가르딘 더보기, 벨가르딘 나이트메어, 벨가르딘 하드, 죽음의 손, 사령의 잔영, 벨가르딘 코어, 로아 벨가르딘',
  alternates: { canonical: '/guide/belgardin-rewards' },
};

type Triple = [string, string, string];

interface RewardRow {
  name: string;
  clear: Triple;
  more: Triple;
  total: string;
}

interface DifficultyBlock {
  title: string;
  gold: { clear: Triple; more: Triple; net: string };
  rows: RewardRow[];
}

const BLOCKS: DifficultyBlock[] = [
  {
    title: '벨가르딘 나이트메어 Lv.1780',
    gold: { clear: ['30,000', '45,000', '75,000'], more: ['-9,600', '-14,400', '-24,000'], net: '51,000' },
    rows: [
      { name: '파괴석 결정', clear: ['565', '690', '1,255'], more: ['1,300', '1,980', '3,280'], total: '4,535' },
      { name: '수호석 결정', clear: ['1,130', '1,380', '2,510'], more: ['2,600', '3,960', '6,560'], total: '9,070' },
      { name: '위대한 돌파석', clear: ['12', '18', '30'], more: ['49', '83', '132'], total: '162' },
      { name: '운명의 파편', clear: ['12,550', '15,180', '27,730'], more: ['26,220', '44,440', '70,660'], total: '98,390' },
      { name: '코어', clear: ['4', '4', '8'], more: ['4', '4', '8'], total: '16' },
      { name: '죽음의 손', clear: ['12', '18', '30'], more: ['12', '18', '30'], total: '60' },
    ],
  },
  {
    title: '벨가르딘 하드 Lv.1770',
    gold: { clear: ['25,000', '37,000', '62,000'], more: ['-8,000', '-11,840', '-19,840'], net: '42,160' },
    rows: [
      { name: '파괴석 결정', clear: ['490', '600', '1,090'], more: ['1,130', '1,720', '2,850'], total: '3,940' },
      { name: '수호석 결정', clear: ['980', '1,200', '2,180'], more: ['2,260', '3,440', '5,700'], total: '7,880' },
      { name: '위대한 돌파석', clear: ['10', '15', '25'], more: ['43', '72', '115'], total: '140' },
      { name: '운명의 파편', clear: ['10,920', '13,200', '24,120'], more: ['22,800', '38,640', '61,440'], total: '85,560' },
      { name: '코어', clear: ['3', '3', '6'], more: ['3', '3', '6'], total: '12' },
      { name: '죽음의 손', clear: ['12', '18', '30'], more: ['12', '18', '30'], total: '60' },
    ],
  },
  {
    title: '벨가르딘 노말 Lv.1750',
    gold: { clear: ['20,000', '30,000', '50,000'], more: ['-6,400', '-9,600', '-16,000'], net: '34,000' },
    rows: [
      { name: '파괴석 결정', clear: ['405', '500', '905'], more: ['860', '1,430', '2,290'], total: '3,195' },
      { name: '수호석 결정', clear: ['810', '1,000', '1,810'], more: ['1,720', '2,860', '4,580'], total: '6,390' },
      { name: '위대한 돌파석', clear: ['8', '12', '20'], more: ['36', '60', '96'], total: '116' },
      { name: '운명의 파편', clear: ['9,100', '11,000', '20,100'], more: ['19,000', '32,200', '51,200'], total: '71,300' },
      { name: '코어', clear: ['3', '3', '6'], more: ['3', '3', '6'], total: '12' },
      { name: '사령의 잔영', clear: ['12', '18', '30'], more: ['12', '18', '30'], total: '60' },
    ],
  },
];

function DifficultyTable({ block }: { block: DifficultyBlock }) {
  return (
    <>
      <h3>{block.title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.guideTable}>
          <thead>
            <tr>
              <th rowSpan={2}>항목</th>
              <th colSpan={3}>클리어 보상</th>
              <th colSpan={3}>더보기 보상</th>
              <th rowSpan={2}>총합</th>
            </tr>
            <tr>
              <th>1관</th><th>2관</th><th>합계</th>
              <th>1관</th><th>2관</th><th>합계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>유통 골드</strong></td>
              {block.gold.clear.map((v, i) => <td key={`c${i}`}>{v}</td>)}
              {block.gold.more.map((v, i) => <td key={`m${i}`}>{v}</td>)}
              <td><strong>{block.gold.net}</strong></td>
            </tr>
            {block.rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                {r.clear.map((v, i) => <td key={`c${i}`}>{v}</td>)}
                {r.more.map((v, i) => <td key={`m${i}`}>{v}</td>)}
                <td>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BelgardinRewardsGuidePage() {
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
            벨가르딘은 2026년 8월 5일 출시되었고 입장 레벨은 노말 1750, 하드 1770, 나이트메어 1780입니다.
          </p>

          <h2>난이도별 관문 보상표</h2>
          <p>
            더보기 보상 열의 골드는 더보기 비용(음수)이고, 유통 골드 행의 총합은 더보기까지 구매했을 때의 실수령 골드입니다.
          </p>
          {BLOCKS.map((b) => <DifficultyTable key={b.title} block={b} />)}
          <p>클리어 골드는 전량 유통 골드이며 귀속 골드는 없습니다. 더보기 비용은 관문 골드의 32%입니다.</p>

          <h2>핵심 정리</h2>
          <h3>승급 재료 수급</h3>
          <p>
            난이도와 무관하게 승급 재료는 클리어 30개와 더보기 30개를 합쳐 주당 최대 60개입니다.
            노말은 사령의 잔영, 하드와 나이트메어는 죽음의 손으로 지급됩니다.
            이 수급량을 기준으로 몇 주차에 어느 등급까지 승급할 수 있는지는{' '}
            <Link href="/guide/wangap-upgrade-schedule">완갑 주차별 승급 정리</Link>에서 계산했습니다.
          </p>
          <h3>코어</h3>
          <p>클리어와 더보기에서 각각 지급되어 나이트메어는 주 16개, 하드와 노말은 주 12개까지 확보할 수 있습니다.</p>
          <h3>골드 효율</h3>
          <p>
            더보기까지 구매하면 실수령은 나이트메어 51,000골드, 하드 42,160골드, 노말 34,000골드입니다.
            재료 가치를 감안한 더보기 구매 가치는 파괴석·수호석 결정 시세에 따라 달라지므로, 실시간 시세로 계산한 손익은{' '}
            <Link href="/belgardin">벨가르딘 보상 페이지</Link>에서 확인하세요.
          </p>

          <h2>난이도를 한 단계 올리면 달라지는 것</h2>
          <p>
            위 표의 총합(클리어와 더보기를 모두 받은 기준)을 난이도끼리 빼 보면, 한 단계 올릴 때 늘어나는 양이 생각보다 고르게 나뉩니다.
          </p>
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
                <tr><td>실수령 골드</td><td>+8,160</td><td>+8,840</td></tr>
                <tr><td>파괴석 결정</td><td>+745</td><td>+595</td></tr>
                <tr><td>수호석 결정</td><td>+1,490</td><td>+1,190</td></tr>
                <tr><td>위대한 돌파석</td><td>+24</td><td>+22</td></tr>
                <tr><td>운명의 파편</td><td>+14,260</td><td>+12,830</td></tr>
                <tr><td>코어</td><td>변화 없음 (12개)</td><td>+4</td></tr>
                <tr><td>승급 재료</td><td>사령의 잔영 → 죽음의 손</td><td>변화 없음 (죽음의 손 60개)</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            노말에서 하드로 올라갈 때 가장 큰 변화는 골드나 재료가 아니라 승급 재료의 종류입니다. 사령의 잔영은 전설·유물 승급에만 쓸 수 있고,
            필요 개수도 죽음의 손의 두 배(전설 200개 대 100개, 유물 240개 대 120개)라서 같은 60개를 받아도 승급 속도는 절반입니다.
            고대 승급은 죽음의 손 150개만 받기 때문에, 노말만 가는 캐릭터는 유물 완갑(+20)에서 멈춥니다.
          </p>
          <p>
            하드에서 나이트메어로 올라갈 때는 승급 재료 수급이 같습니다. 대신 코어가 주 12개에서 16개로 늘고, 실수령 골드가 8,840골드 더 많습니다.
            나이트메어 입장 레벨(1780)이 하드(1770)보다 10 높으므로, 레벨이 된다면 골드와 코어를 위해 올리는 난이도라고 보면 됩니다.
          </p>

          <h2>더보기에서 나오는 재료가 더 많다</h2>
          <p>
            벨가르딘은 더보기 보상이 클리어 보상보다 큽니다. 세 난이도 모두 더보기로 받는 파괴석·수호석 결정과 운명의 파편이 클리어 보상의 약 2.5배,
            위대한 돌파석은 4.4~4.8배입니다. 코어와 승급 재료는 클리어와 더보기가 같은 수량이라, 더보기를 건너뛰면 절반만 받습니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>난이도</th>
                <th>파괴석 결정 (더보기 ÷ 클리어)</th>
                <th>위대한 돌파석 (더보기 ÷ 클리어)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>나이트메어</td><td>3,280 ÷ 1,255 = 2.6배</td><td>132 ÷ 30 = 4.4배</td></tr>
              <tr><td>하드</td><td>2,850 ÷ 1,090 = 2.6배</td><td>115 ÷ 25 = 4.6배</td></tr>
              <tr><td>노말</td><td>2,290 ÷ 905 = 2.5배</td><td>96 ÷ 20 = 4.8배</td></tr>
            </tbody>
          </table>
          <p>
            관문끼리 비교하면 2관 더보기가 1관보다 비용 대비 재료가 많습니다. 나이트메어 기준으로 더보기 1,000골드당 위대한 돌파석은
            1관 약 5.1개, 2관 약 5.8개이고, 운명의 파편은 1관 약 2,730개, 2관 약 3,090개입니다. 하드(돌파석 약 5.4개 대 6.1개)와
            노말(약 5.6개 대 6.3개)도 같은 방향입니다. 골드가 부족해 한 관문만 더보기를 산다면 2관 쪽이 재료를 더 많이 돌려받습니다.
            다만 승급 재료는 관문당 12개와 18개로 비용에 비례해 나오므로, 승급만 보면 어느 관문이든 골드당 수량은 거의 같습니다.
          </p>

          <h2>완갑 강화량과 비교해 보면</h2>
          <p>
            나이트메어를 매주 더보기까지 받으면 파괴석 결정 4,535개, 수호석 결정 9,070개, 위대한 돌파석 162개가 들어옵니다.
            완갑을 +0에서 +25까지 숨결 없이 올릴 때 평균 소모량이 파괴석 결정 373,913개, 수호석 결정 1,160,381개, 위대한 돌파석 24,382개이므로,
            벨가르딘 한 캐릭터의 한 주 보상은 파괴석 결정 기준 약 1.2%, 위대한 돌파석 기준 약 0.7%에 해당합니다.
            벨가르딘 보상만으로 완갑 재료를 채우는 구조가 아니라, 승급 재료(죽음의 손)가 진행 속도를 정하고 강화 재료는 대부분 거래소나 다른 콘텐츠에서 채우는 구조입니다.
            단계별 평균 소모량은 <Link href="/guide/wangap-cost">완갑 +0에서 +25까지 강화 비용 정리</Link>에 구간별로 나눠 두었습니다.
          </p>

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
            "dateModified": "2026-09-15",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/belgardin-rewards`
          })
        }}
      />
    </div>
  );
}
