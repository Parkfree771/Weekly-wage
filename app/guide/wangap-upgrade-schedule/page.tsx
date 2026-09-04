import Link from 'next/link';
import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import styles from '../guide.module.css';

export const metadata: Metadata = {
  title: '완갑 주차별 승급 정리: 몇 주차에 전설·유물·고대가 되나',
  description:
    '벨가르딘 하드 더보기 기준 죽음의 손 주 60개 수급으로 완갑을 몇 주차에 전설·유물·고대로 승급할 수 있는지 계산했습니다. 첫 클리어 보상 유무에 따른 두 가지 일정과 경매·정복전 미션 변수까지 정리합니다.',
  keywords:
    '완갑 승급, 완갑 주차별, 죽음의 손 수급, 완갑 고대 승급, 벨가르딘 하드 더보기, 완갑 전설 승급, 완갑 유물 승급, 로아 완갑 일정',
  alternates: { canonical: '/guide/wangap-upgrade-schedule' },
};

interface ScheduleRow {
  week: string;
  stock: string;
  change: string;
  grade: string;
  range: string;
}

const CASE1: ScheduleRow[] = [
  { week: '1주차', stock: '누적 100개 (60 + 첫 클리어 40)', change: '영웅에서 전설 승급 (100개 사용)', grade: '전설', range: '+0~15강 가능' },
  { week: '2주차', stock: '누적 160 - 승급 100 = 잔여 60개', change: '변화 없음', grade: '전설', range: '' },
  { week: '3주차', stock: '누적 220 - 100 = 잔여 120개', change: '전설에서 유물 승급 (120개 사용)', grade: '유물', range: '+15~20강 가능' },
  { week: '4주차', stock: '누적 280 - 220 = 잔여 60개', change: '변화 없음', grade: '유물', range: '' },
  { week: '5주차', stock: '누적 340 - 220 = 잔여 120개', change: '변화 없음', grade: '유물', range: '' },
  { week: '6주차', stock: '누적 400 - 220 = 잔여 180개', change: '유물에서 고대 승급 (150개 사용)', grade: '고대', range: '+20~25강 가능' },
];

const CASE2: ScheduleRow[] = [
  { week: '1주차', stock: '누적 60개', change: '승급 불가', grade: '영웅', range: '+0~10강' },
  { week: '2주차', stock: '누적 120 - 승급 100 = 잔여 20개', change: '영웅에서 전설 승급 (100개 사용)', grade: '전설', range: '+10~15강 가능' },
  { week: '3주차', stock: '누적 180 - 100 = 잔여 80개', change: '변화 없음', grade: '전설', range: '' },
  { week: '4주차', stock: '누적 240 - 220 = 잔여 20개', change: '전설에서 유물 승급 (120개 사용)', grade: '유물', range: '+15~20강 가능' },
  { week: '5주차', stock: '누적 300 - 220 = 잔여 80개', change: '변화 없음', grade: '유물', range: '' },
  { week: '6주차', stock: '누적 360 - 220 = 잔여 140개', change: '변화 없음', grade: '유물', range: '' },
  { week: '7주차', stock: '누적 420 - 370 = 잔여 50개', change: '유물에서 고대 승급 (150개 사용)', grade: '고대', range: '+20~25강 가능' },
];

function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.guideTable}>
        <thead>
          <tr>
            <th>주차</th>
            <th>죽음의 손 누적·잔여</th>
            <th>변화</th>
            <th>등급</th>
            <th>하드·나메 강화 범위</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.week}>
              <td>{r.week}</td>
              <td>{r.stock}</td>
              <td>{r.change}</td>
              <td>{r.grade}</td>
              <td>{r.range || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WangapUpgradeScheduleGuidePage() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <div className={styles.guideContainer} style={{ marginTop: '1.5rem' }}>
        <Link href="/guide" className={styles.backLink}>
          &larr; 가이드 목록
        </Link>

        <div className={styles.articleHeader}>
          <span className={styles.articleCategory}>완갑</span>
          <h1 className={styles.articleTitle}>완갑 주차별 승급 정리: 몇 주차에 전설·유물·고대가 되나</h1>
          <span className={styles.articleDate}>2026년 7월 29일 작성</span>
        </div>

        <div className={styles.articleBody}>
          <p>
            벨가르딘 하드 더보기 기준으로 죽음의 손이 주당 60개 수급된다고 할 때, 완갑을 몇 주차에 승급할 수 있는지 정리했습니다.
            승급 재료 수급 속도가 정해져 있어서 승급 타이밍은 사실상 주차별로 고정됩니다.
          </p>

          <h2>완갑 승급 재료 요약</h2>
          <p>
            영웅 완갑(+0~10)에서 전설(+10~15), 유물(+15~20), 고대(+20~25) 순으로 승급합니다.
            승급 재료는 죽음의 손 기준이며, 사령의 잔영으로도 승급할 수 있습니다(전설 200개, 유물 240개). 고대 승급은 죽음의 손만 사용됩니다.
          </p>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th>구분</th>
                <th>필요 수량</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>주간 수급 (벨가르딘 하드 더보기)</td><td>60개 / 주</td></tr>
              <tr><td>영웅에서 전설 승급</td><td>죽음의 손 100개</td></tr>
              <tr><td>전설에서 유물 승급</td><td>죽음의 손 120개</td></tr>
              <tr><td>유물에서 고대 승급</td><td>죽음의 손 150개</td></tr>
            </tbody>
          </table>

          <h2>경우 1: 첫 클리어 보상으로 죽음의 손 40개를 준다면</h2>
          <p>첫 주에 주간 60개와 첫 클리어 40개를 합쳐 100개로 시작하는 경우입니다.</p>
          <ScheduleTable rows={CASE1} />
          <p>첫 클리어 보상이 있으면 1주차에 즉시 전설 승급, 6주차에 고대 승급까지 도달합니다.</p>

          <h2>경우 2: 첫 클리어 보상에 승급 재료가 없다면</h2>
          <ScheduleTable rows={CASE2} />
          <p>첫 클리어 보상이 없으면 승급이 한 단계씩 밀려 7주차에 고대 승급이 됩니다.</p>

          <h2>변수: 경매, 첫 클리어, 정복전 미션</h2>
          <h3>경매</h3>
          <p>
            죽음의 손이 경매에 뜬다면, 필드에서 재료를 낙찰받는 만큼 승급이 앞당겨집니다. 경우 1처럼 남들보다 1주 빠른 승급이 가능하도록
            설계했을 가능성이 높아 보입니다. 첫 클리어 보상이 없더라도 경매 1회만 성공하면 6주차 고대 승급이 되도록 맞춘 게 아닐까 조심스럽게 예상해 봅니다.
          </p>
          <h3>첫 클리어 보상</h3>
          <p>
            첫 클리어에 죽음의 손 40개가 포함되면 위 경우 1의 일정(6주차 고대)이 그대로 적용됩니다. 포함 여부는 출시 후 확인이 필요합니다.
          </p>
          <h3>정복전 미션</h3>
          <p>
            정복전 미션 달성 시 &quot;캐릭터의 성장과 관련된 보상&quot;을 획득할 수 있다고 안내되어 있습니다.
            여기에 승급 재료가 포함된다면 5~6주차 안에 고대 승급까지 가능할 것으로 보입니다.
          </p>
          <p>
            위 계산은 벨가르딘 하드 더보기(주 60개) 단일 수급 기준의 추정이며, 실제 보상 구성에 따라 달라질 수 있습니다.
            승급 구조와 +25까지의 전체 비용은 <Link href="/guide/wangap-cost">완갑 +0에서 +25까지 강화 비용 정리</Link>를 참고하세요.
          </p>

          <div className={styles.guideCta}>
            <p>완갑 강화 비용은 완갑 시뮬레이터에서 평균 시뮬과 실제 시뮬로 미리 계산해 볼 수 있습니다.</p>
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
            "headline": "완갑 주차별 승급 정리: 몇 주차에 전설·유물·고대가 되나",
            "description": "벨가르딘 하드 더보기 기준 죽음의 손 주 60개 수급으로 완갑을 몇 주차에 승급할 수 있는지 두 가지 경우로 계산했습니다.",
            "datePublished": "2026-07-29",
            "dateModified": "2026-07-29",
            "author": { "@type": "Organization", "name": "로아로골" },
            "publisher": { "@type": "Organization", "name": "로아로골", "url": SITE_URL },
            "mainEntityOfPage": `${SITE_URL}/guide/wangap-upgrade-schedule`
          })
        }}
      />
    </div>
  );
}
