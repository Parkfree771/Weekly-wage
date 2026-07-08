'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';
import styles from './homework.module.css';
import GuideFaq from '@/components/common/GuideFaq';
import { faqData } from './faq-data';
import {
  RIFT_TIERS,
  GUARDIAN_TIERS,
  EVENT_CONTENTS,
  getSandMaterials,
  getCurrentGuardian,
  findTier,
  type Material,
} from '@/lib/daily-content';

const LEVELS = [1750, 1730, 1720, 1700, 1680];

const PERIODS = [
  { key: 'day', label: '1일', days: 1, weeks: 1 },
  { key: 'week', label: '1주일', days: 7, weeks: 1 },
  { key: 'month', label: '1달', days: 30, weeks: 4 },
] as const;
type PeriodKey = (typeof PERIODS)[number]['key'];

// 휴게/PC방 배수
const RIFT_MULTS = [
  { n: 1, desc: '기본' },
  { n: 2, desc: '휴게' },
  { n: 3, desc: '기본+PC방' },
  { n: 4, desc: '휴게+PC방' },
];
const GUARDIAN_MULTS = [
  { n: 1, desc: '기본' },
  { n: 2, desc: '휴게' },
];

function fmt(n: number) {
  const v = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return v.toLocaleString();
}

// 보석 합성: 같은 레벨 3개 = 다음 레벨 1개 (최대 10레벨). 1레벨 개수를 레벨별로 분해
function gemBreakdown(count: number): { level: number; qty: number }[] {
  let rem = Math.round(count);
  const out: { level: number; qty: number }[] = [];
  for (let lv = 1; lv <= 10; lv++) {
    if (lv === 10) {
      if (rem > 0) out.push({ level: 10, qty: rem });
    } else {
      const q = rem % 3;
      if (q > 0) out.push({ level: lv, qty: q });
      rem = Math.floor(rem / 3);
    }
  }
  return out.reverse(); // 높은 레벨 먼저
}

// KST 6시 리셋 기준 오늘 요일 (0=일 ~ 6=토)
function getTodayDow(): number {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  let d = kst.getUTCDay();
  if (kst.getUTCHours() < 6) d = (d + 6) % 7;
  return d;
}

type Row = { key: string; icon: string; title: string; runs: number; mats: Material[] };

export default function HomeworkPage() {
  const [level, setLevel] = useState(1750);
  const [riftMult, setRiftMult] = useState(1);
  const [guardianMult, setGuardianMult] = useState(1);
  const [sandEnhance, setSandEnhance] = useState(0);
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [todayDow, setTodayDow] = useState<number | null>(null);

  useEffect(() => { setTodayDow(getTodayDow()); }, []);

  const pd = PERIODS.find(p => p.key === period)!;
  const eventTier: '1730' | '1750' = level >= 1750 ? '1750' : '1730';
  const isDay = period === 'day';

  // 1일: 오늘 요일에 열리는 횟수만 / 그 외: 주 발생횟수 × 주수
  const eventRuns = (days: number[], perWeek: number) =>
    isDay ? (todayDow != null && days.includes(todayDow) ? 1 : 0) : perWeek * pd.weeks;

  // 콘텐츠 행 (균열 · 가토 · 필보 · 카게 · 할모시)
  const rows: Row[] = [];
  const rift = findTier(RIFT_TIERS, level);
  rows.push({ key: 'rift', icon: level >= 1730 ? '/zkejs.webp' : '/wjstjs.webp', title: rift.label, runs: riftMult * pd.days, mats: rift.materials });

  const gato = findTier(GUARDIAN_TIERS, level);
  const guardian = getCurrentGuardian(level);
  rows.push({ key: 'gato', icon: guardian.image, title: gato.label, runs: guardianMult * pd.days, mats: gato.materials });

  if (level >= 1730) {
    const boss = EVENT_CONTENTS.find(c => c.key === 'boss')!;
    const gate = EVENT_CONTENTS.find(c => c.key === 'gate')!;
    rows.push({ key: 'boss', icon: boss.image, title: boss.name, runs: eventRuns(boss.days, boss.perWeek), mats: boss.byTier[eventTier] });
    rows.push({ key: 'gate', icon: gate.image, title: gate.name, runs: eventRuns(gate.days, gate.perWeek), mats: gate.byTier[eventTier] });
    rows.push({ key: 'sand', icon: '/gkf.webp', title: '할의 모래시계', runs: isDay ? 0 : pd.weeks, mats: getSandMaterials(level >= 1750, sandEnhance) });
  }

  const visibleRows = rows.filter(r => r.runs > 0);

  // 전체 합계 (재화 종류별 합산)
  const totalMap = new Map<string, { image: string; label: string; amount: number }>();
  visibleRows.forEach(r => r.mats.forEach(m => {
    const k = `${m.image}|${m.label}`;
    const add = m.amount * r.runs;
    const cur = totalMap.get(k);
    if (cur) cur.amount += add;
    else totalMap.set(k, { image: m.image, label: m.label, amount: add });
  }));
  const totals = Array.from(totalMap.values());

  const renderMats = (mats: { image: string; label: string; amount: number }[], runs: number) => (
    <div className={styles.rowMats}>
      {mats.map((m, i) => (
        <span key={i} className={styles.matChip} title={m.label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.image} alt={m.label} />
          <span className={styles.matChipAmt}>×{fmt(m.amount * runs)}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>
        {/* 타이틀 */}
        <div className="text-center" style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.7rem)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            일일/주간 숙제 정리
          </h1>
        </div>

        {/* 컨트롤 */}
        <div className={styles.panel}>
          {/* 레벨 */}
          <div className={styles.ctrlRow}>
            <span className={styles.ctrlLabel}>레벨</span>
            <div className={styles.btnGroup}>
              <span className={styles.chipUpcoming} title="8월 출시 예정">
                1770<small>8월 출시 예정</small>
              </span>
              {LEVELS.map(opt => (
                <button key={opt} className={`${styles.chip} ${level === opt ? styles.chipActive : ''}`} onClick={() => setLevel(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 휴게 / 강화 — 한 줄 */}
          <div className={styles.ctrlRow}>
            <div className={styles.subCtrl}>
              <span className={styles.subLabel}>균열 휴게</span>
              <div className={styles.btnGroup}>
                {RIFT_MULTS.map(m => (
                  <div key={m.n} className={styles.multCol}>
                    <button
                      className={`${styles.chip} ${styles.multChip} ${styles[`mult${m.n}`]} ${riftMult === m.n ? styles.multChipActive : ''}`}
                      onClick={() => setRiftMult(m.n)}
                    >
                      ×{m.n}
                    </button>
                    <span className={styles.multCap}>{m.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.subCtrl}>
              <span className={styles.subLabel}>가토 휴게</span>
              <div className={styles.btnGroup}>
                {GUARDIAN_MULTS.map(m => (
                  <div key={m.n} className={styles.multCol}>
                    <button
                      className={`${styles.chip} ${styles.multChip} ${styles[`mult${m.n}`]} ${guardianMult === m.n ? styles.multChipActive : ''}`}
                      onClick={() => setGuardianMult(m.n)}
                    >
                      ×{m.n}
                    </button>
                    <span className={styles.multCap}>{m.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {level >= 1730 && (
              <div className={styles.subCtrl}>
                <span className={styles.subLabel}>모래시계 강화</span>
                <div className={styles.sandGauge}>
                  {[1, 2, 3, 4, 5].map(lv => (
                    <button
                      key={lv}
                      type="button"
                      aria-label={`보상강화 ${lv}`}
                      className={`${styles.sandSeg} ${lv <= sandEnhance ? styles.sandSegOn : ''}`}
                      onClick={() => setSandEnhance(sandEnhance === lv ? lv - 1 : lv)}
                    />
                  ))}
                  <span className={styles.sandLevelText}>{sandEnhance}</span>
                </div>
              </div>
            )}
          </div>

          {/* 기간 */}
          <div className={styles.ctrlRow}>
            <span className={styles.ctrlLabel}>기간</span>
            <div className={styles.btnGroup}>
              {PERIODS.map(p => (
                <button key={p.key} className={`${styles.chip} ${period === p.key ? styles.chipActive : ''}`} onClick={() => setPeriod(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 결과 — 콘텐츠별 한 줄 + 합계 */}
        <div className={styles.contentList}>
          {visibleRows.map(r => (
            <div key={r.key} className={styles.contentRow}>
              <div className={styles.rowHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.rowIcon} src={r.icon} alt="" />
                <span className={styles.rowName}>
                  <span className={styles.rowTitle}>{r.title}</span>
                  <span className={styles.rowMeta}>총 {fmt(r.runs)}회</span>
                </span>
              </div>
              {renderMats(r.mats, r.runs)}
            </div>
          ))}

          {totals.length > 0 && (
            <div className={`${styles.contentRow} ${styles.totalRow}`}>
              <div className={styles.rowHead}>
                <span className={styles.rowName}>
                  <span className={styles.rowTitle}>합계</span>
                  <span className={styles.rowMeta}>{pd.label} 누적</span>
                </span>
              </div>
              <div className={styles.rowMats}>
                {totals.map((m, i) => {
                  const bd = m.image === '/1fpqrjqghk.webp' ? gemBreakdown(m.amount) : null;
                  return (
                    <span key={i} className={styles.matChip} title={m.label}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt={m.label} />
                      <span className={styles.matChipAmt}>×{fmt(m.amount)}</span>
                      {bd && bd.length > 0 && (
                        <span className={styles.gemConv}>= {bd.map(b => `${b.level}레벨×${fmt(b.qty)}`).join(' ')}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 마이페이지 유도 */}
        <Link href="/mypage" className={styles.mypageCta}>
          <span className={styles.mypageCtaText}>
            <span className={styles.mypageCtaTitle}>원정대 전체 수급 조회</span>
            <span className={styles.mypageCtaSub}>캐릭터별 주간 골드 · 재화를 한 번에 — 마이페이지</span>
          </span>
          <span className={styles.mypageCtaArrow} aria-hidden>→</span>
        </Link>

        <GuideFaq
          sections={[
            {
              heading: '이 페이지가 다루는 콘텐츠',
              paragraphs: [
                '레이드를 제외한 일일·주간 콘텐츠 재화를 정리했습니다. 아이템 레벨 1730 이상은 균열, 1720 이하는 전선으로 이름은 다르지만 매일 도는 같은 성격의 콘텐츠이고, 여기에 가디언 토벌(가토)이 매일 콘텐츠로 함께 계산됩니다.',
                '아이템 레벨 1730 이상 캐릭터에는 카오스 게이트, 필드보스, 할의 모래시계 세 가지가 추가로 표시됩니다. 카오스 게이트는 주 4회, 필드보스는 주 3회 정해진 요일에만 열리고, 할의 모래시계는 레이드 관문처럼 주 1회만 참여할 수 있는 콘텐츠입니다.',
              ],
            },
            {
              heading: '레벨·휴게·PC방 설정이 결과에 미치는 영향',
              paragraphs: [
                '레벨을 바꾸면 균열(전선)·가토의 티어와 카오스 게이트·필드보스의 보상 등급(1730/1750 기준)이 함께 바뀌어 정확한 레벨별 재화량을 확인할 수 있습니다.',
                '균열 휴게는 기본(×1)·휴게(×2)·기본+PC방(×3)·휴게+PC방(×4) 네 단계, 가토 휴게는 기본(×1)·휴게(×2) 두 단계로 선택할 수 있습니다. 실제 보유한 휴게 포인트와 PC방 이용 여부에 맞춰 배수를 선택해야 실제로 얻을 재화량과 일치합니다. 아이템 레벨 1730 이상에서는 할의 모래시계 보상강화 0~5단계도 함께 조절해 지급량을 반영할 수 있습니다.',
              ],
            },
            {
              heading: '기간별 계산과 초기화 주기',
              paragraphs: [
                '기간을 1일로 두면 오늘 요일에 실제로 열리는 카오스 게이트·필드보스만 반영되고, 1주일·1달로 두면 각 콘텐츠의 주간 발생 횟수를 기간에 맞춰 누적한 값으로 계산됩니다. 균열(전선)·가토처럼 매일 도는 콘텐츠는 매일 새벽 6시(KST) 초기화를 기준으로 날짜당 입장 횟수가 정해지고, 할의 모래시계처럼 주 1회 제공되는 콘텐츠는 매주 수요일 새벽 6시(KST)에 초기화됩니다.',
                '결과 하단 합계에서 보석 수량 옆에 표시되는 "N레벨×수량" 표기는 여러 콘텐츠에서 얻는 1레벨 보석을 모두 더한 뒤, 같은 레벨 보석 3개를 상위 1레벨로 승급 합성하는 규칙을 적용해 최종적으로 어떤 레벨의 보석이 몇 개 나오는지 미리 환산해 보여주는 값입니다.',
              ],
            },
          ]}
          faqs={faqData}
        />

        <p className={styles.footNote}>
          ※ 1일은 오늘 요일에 열리는 카게 · 필보만 계산됩니다 (모래시계는 주간). 1주/1달은 주 단위 합산 — 카게 주 4회 · 필보 주 3회 · 모래시계 주 1회.
        </p>
      </Container>
    </div>
  );
}
