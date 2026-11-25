'use client';
/* eslint-disable @next/next/no-img-element */

// 내 캐릭 이관 미리보기 — 캐릭터명을 검색하면 지금 착용 장비가 2부에서 어떻게 바뀌는지 칸마다 보여준다.
//   왼쪽 8칸: 지금 장비 → 받는 장비(등급 · 연마 · 레벨) + 슬롯 재련 단계
//   오른쪽 8칸: 짝 부위 기준으로 받는 장비 + 마력 주입(주문서)
//   카테고리마다 계단 등급표(Scale, 오른쪽 = 높음)를 위에 깔고, 내 캐릭에 있는 단계에 ▼ 를 단다.
// 규칙은 migration.ts 참고.

import { useState, type FormEvent, type ReactNode } from 'react';
import styles from './GrowthMigration.module.css';
import { ICON, GRADES, MAX_POLISH, REFINE_MAX } from './growthData';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import {
  migrate, levelRow, lowLevelRow, DEALER_TIER_OPTIONS, SUPPORT_TIER_OPTIONS,
  type Migration, type NewGear, type LeftSlot, type RightSlot, type ApiEquip, type ApiProfile,
} from './migration';
import { GRADE_COLORS, ESTHER_COLOR, RANK_COLORS, VALUE_COLORS, tierColor } from './migrationColors';
import { Info, LevelInfo, RefineInfo, ScrollInfo, TierInfo, ValueInfo, StoneInfo, stoneRowKey } from './MigrationInfo';

const fmt2 = (n: number) => n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n: number) => n.toLocaleString('ko-KR');
// 거래 가능 횟수 — 주문서가 그대로 이어받는다
const tradeText = (n: number | null) => (n == null ? null : n > 0 ? `거래 ${n}회 가능` : '거래 불가');

// ---------- 색 (migrationColors.ts) ----------
const ITEM_GRADE_COLOR: Record<string, string> = {
  고급: GRADE_COLORS[0], 희귀: GRADE_COLORS[1], 영웅: GRADE_COLORS[2], 전설: GRADE_COLORS[3],
  유물: GRADE_COLORS[4], 고대: GRADE_COLORS[5], 에스더: ESTHER_COLOR,
};
// 팔찌 티어 — 높은 티어부터 (img/15, img/16)
const DEALER_TIERS = DEALER_TIER_OPTIONS.map(([t]) => t);
const SUPPORT_TIERS = SUPPORT_TIER_OPTIONS.map(([t]) => t);

// ---------- 등급표 ----------
interface ScaleItem { key: string; label: string; color: string; }
// 계단 등급표 — 전 칸 색을 채우고 오른쪽으로 갈수록 높게 쌓는다 (모든 표가 오른쪽 = 높음).
// 내 캐릭에 있는 칸만 위에 ▼ 를 달고 테두리를 두른다. info 를 주면 제목 아래 "기준" 버튼으로 기준표를 연다.
function Scale({ title, items, active, info }: { title: string; items: ScaleItem[]; active: Set<string>; info?: ReactNode }) {
  return (
    <div className={styles.scale}>
      <span className={styles.scaleTitle}>
        {title}
        {info && <Info title={`${title} 기준`}>{info}</Info>}
      </span>
      <div className={styles.stairs}>
        {items.map((it, i) => {
          const mine = active.has(it.key);
          return (
            <div key={it.key} className={styles.step}>
              <span className={styles.mark}>{mine ? '▼' : ''}</span>
              <span
                className={`${styles.stepBar} ${mine ? styles.stepMine : ''}`}
                style={{ background: it.color, height: `${22 + (i / Math.max(items.length - 1, 1)) * 26}px` }}
              />
              <span className={`${styles.stepLabel} ${mine ? styles.stepLabelMine : ''}`}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
const GRADE_SCALE: ScaleItem[] = GRADES.map((g, i) => ({ key: g, label: g, color: GRADE_COLORS[i] }));
const SCROLL_SCALE: ScaleItem[] = [6, 5, 4, 3, 2, 1].map(n => ({ key: String(n), label: `${n}등급`, color: RANK_COLORS[n - 1] }));
const DEALER_SCALE: ScaleItem[] = [...DEALER_TIERS].reverse().map(t => ({ key: t, label: t, color: tierColor(t) }));
const SUPPORT_SCALE: ScaleItem[] = [...SUPPORT_TIERS].reverse().map(t => ({ key: t, label: t, color: tierColor(t) }));
const VALUE_SCALE: ScaleItem[] = ['하', '중', '상'].map(v => ({ key: v, label: v, color: VALUE_COLORS[v] }));

// ---------- 작은 조각 ----------
function ItemIcon({ src, grade }: { src: string; grade: string }) {
  return (
    <span className={styles.item} style={{ background: ITEM_GRADE_COLOR[grade] ?? GRADE_COLORS[5] }}>
      <img src={src} alt="" />
    </span>
  );
}

function Pips({ n }: { n: number }) {
  return (
    <span className={styles.pips} aria-label={`${n}연마`}>
      {Array.from({ length: MAX_POLISH }, (_, i) => <i key={i} className={i < n ? styles.pipOn : undefined} />)}
    </span>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={styles.badge} style={{ background: color }}>{children}</span>;
}

function Gear({ gear, esther }: { gear: NewGear | null; esther?: boolean }) {
  if (!gear) return <span className={styles.none}>표 범위 밖</span>;
  if (gear.low) {
    return (
      <span className={styles.gear}>
        <Badge color={RANK_COLORS[5]}>{gear.low}</Badge>
        <b className={styles.lv}>{gear.level}</b>
      </span>
    );
  }
  return (
    <span className={styles.gear}>
      {esther
        ? <Badge color={ESTHER_COLOR}>에스더</Badge>
        : <Badge color={GRADE_COLORS[gear.grade]}>{GRADES[gear.grade]}</Badge>}
      <Pips n={gear.polish} />
      <span className={styles.polishTxt}>{gear.polish}연마</span>
      <b className={styles.lv}>{gear.level}</b>
    </span>
  );
}

// 오른쪽 칸 — 슬롯 재련과 주문서를 모양과 굵은 이름으로 갈라 놓는다
//   슬롯 재련: 네모 · 초록 · "슬롯 재련 / 21단계"
//   주문서:   알약 · 등급색 · "주문서 / 4등급"
function RefineTag({ value }: { value: number }) {
  return (
    <span className={`${styles.tag} ${styles.refineTag} ${value > 0 ? '' : styles.tagOff}`}>
      <span className={styles.tagTxt}><small>슬롯 재련</small><b>{value}단계</b></span>
    </span>
  );
}
function ScrollTag({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className={`${styles.tag} ${styles.scrollTag}`} style={{ background: color }}>
      <span className={styles.tagTxt}><small>{label}</small><b>{value}</b></span>
    </span>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <span className={styles.empty}>{children}</span>;
}

// 열 제목 — 각 칸의 숫자가 무엇인지
function Head({ now, slot, info }: { now: string; slot: string; info?: ReactNode }) {
  return (
    <div className={`${styles.row} ${styles.head}`}>
      <span className={styles.hPart}>부위</span>
      <span className={styles.hNow}>{now}</span>
      <span className={styles.hAfter}>2부에 받는 장비</span>
      <span className={styles.hSlot}>
        {slot}
        {info && <Info title={`${slot} 기준`} align="right">{info}</Info>}
      </span>
    </div>
  );
}

function Part({ icon, label }: { icon: string; label: string }) {
  return (
    <div className={styles.part}>
      <span className={styles.icon}><img src={ICON(icon)} alt="" /></span>
      <b>{label}</b>
    </div>
  );
}

function LeftRow({ s }: { s: LeftSlot }) {
  let now;
  if (s.esther) now = <><b className={styles.big}>{s.esther.evo}단계</b><span>엘라 {s.esther.ella} · {s.now?.level}</span></>;
  else if (s.now) now = <><b className={styles.big}>+{s.now.refine}</b>{s.now.level && <span>{s.now.level}</span>}</>;
  else now = <span>{s.key === 'belt' ? '새로 생기는 칸' : '착용 안 함'}</span>;
  return (
    <div className={styles.row}>
      <Part icon={s.icon} label={s.label} />
      <div className={styles.now}>
        {s.now && <ItemIcon src={s.now.icon} grade={s.now.grade} />}
        <div className={styles.nowTxt}>{now}</div>
      </div>
      <span className={styles.arrow} aria-hidden>→</span>
      <div className={styles.after}>
        <Gear gear={s.gear} esther={!!s.esther?.next} />
        {s.esther?.next && <span className={styles.from}>엘라 {s.esther.next.ella}단계</span>}
        {s.esther?.next && s.esther.next.essence > 0 && (
          <span className={styles.from}>환급 에스더의 기운 {s.esther.next.essence} · 로맨틱 재료 키트 {fmt(s.esther.next.kit)} (귀속)</span>
        )}
        {s.gearFrom && <span className={styles.basis}>{s.gearFrom} 기준</span>}
        {s.esther && !s.esther.next && <span className={styles.none}>표에 없는 단계</span>}
      </div>
      <div className={styles.slot}>
        <RefineTag value={s.refine} />
      </div>
    </div>
  );
}

// "상상중" → 상 · 상 · 중 칸. "중중 이하" 같은 건 글자 그대로
function Pattern({ p }: { p: string }) {
  const ranks = p.match(/^[상중하]+/)?.[0];
  if (!ranks || p.includes('이하')) return <b className={styles.patText}>{p}</b>;
  return (
    <span className={styles.pattern}>
      {[...ranks].map((r, i) => <i key={i} style={{ background: VALUE_COLORS[r] }}>{r}</i>)}
      {p.length > ranks.length && <em>{p.slice(ranks.length)}</em>}
    </span>
  );
}

function RightRow({ s }: { s: RightSlot }) {
  let now;
  let infuse;
  if (s.infuse === 'scroll') {
    if (!s.acc) {
      now = <span>착용 안 함</span>;
      infuse = <Empty>없음</Empty>;
    } else if (s.acc.scroll == null) {
      now = <><span>{s.acc.grade} · 품질 {s.acc.quality}</span><span>{s.acc.reason}</span></>;
      infuse = <Empty>{s.acc.reward ?? '기준 없음'}</Empty>;
    } else {
      now = <><Pattern p={s.acc.pattern} /><span>{s.acc.role === '서폿' ? '서폿 · ' : ''}품질 {s.acc.quality}</span></>;
      const trade = tradeText(s.acc.trade);
      infuse = (
        <>
          <ScrollTag label="주문서" value={`${s.acc.scroll}등급`} color={RANK_COLORS[s.acc.scroll - 1]} />
          {trade && <span className={styles.from}>{trade}</span>}
        </>
      );
    }
  } else if (s.infuse === 'seal') {
    const b = s.bracelet;
    now = <span>{b ? '지금 팔찌가 여기로' : '새로 생기는 칸'}</span>;
    if (!b) infuse = <Empty>없음</Empty>;
    else if (b.status === 'seal') infuse = <ScrollTag label="인장 주문서" value="아래 참고" color={RANK_COLORS[2]} />;
    else infuse = <Empty>{BRACELET_REWARD[b.status]}</Empty>;
  } else {
    now = <span>{s.key === 'bracelet' ? '새 칸 (팔찌는 인장으로)' : '새로 생기는 칸'}</span>;
    infuse = <Empty>처음부터</Empty>;
  }
  const src = s.acc ?? s.bracelet;
  return (
    <div className={styles.row}>
      <Part icon={s.icon} label={s.label} />
      <div className={styles.now}>
        {src && <ItemIcon src={src.icon} grade={s.acc?.grade ?? s.bracelet?.grade ?? '고대'} />}
        <div className={styles.nowTxt}>{now}</div>
      </div>
      <span className={styles.arrow} aria-hidden>→</span>
      <div className={styles.after}>
        <Gear gear={s.gear} />
        <span className={styles.basis}>{s.gearFrom} 기준</span>
      </div>
      <div className={styles.slot}>{infuse}</div>
    </div>
  );
}

// 팔찌가 인장 주문서로 안 갈 때 받는 것
const BRACELET_REWARD = { excluded: '이관 제외', decompose: '팔찌 분해 결과물', removed: '제거' } as const;
const BRACELET_TEXT = {
  excluded: '딜러 클래스(바드 · 도화가 · 홀리나이트 · 발키리 외)는 서폿 옵션으로만 된 팔찌가 인장 주문서 이관에서 빠져요.',
  decompose: '효과를 부여하지 않은 팔찌라 팔찌 분해 결과물로 받아요. 분해 결과물은 별도 상점에서 실링으로 바꿀 수 있어요.',
  removed: '티어 3 팔찌는 교체 없이 사라져요.',
} as const;

// 각인 슬롯 5칸 — 올라가는 칸만 단계 표시
function EngravingSlots({ slots, level, bonus }: { slots: number; level: number; bonus: boolean }) {
  return (
    <div className={styles.engSlots}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`${styles.engSlot} ${i < slots ? styles.engOn : ''}`}>
          <small>슬롯 {i + 1}</small>
          <b>{i < slots ? level : 0}단계</b>
        </span>
      ))}
      {bonus && <span className={styles.engBonus}>+ 추가 아이템</span>}
    </div>
  );
}

function Result({ m }: { m: Migration }) {
  const seal = m.right.find(s => s.key === 'seal')?.bracelet;
  const gradeOf = (g: NewGear | null): string | undefined => (g ? GRADES[g.grade] : undefined);
  const leftGrades = new Set(m.left.map(s => (s.esther?.next ? undefined : gradeOf(s.gear))).filter((g): g is string => !!g));
  const rightGrades = new Set(m.right.map(s => gradeOf(s.gear)).filter((g): g is string => !!g));
  const scrolls = new Set(m.right.map(s => s.acc?.scroll).filter((n): n is number => n != null).map(String));
  const lines = seal?.lines ?? [];
  const dealerOn = new Set(lines.map(l => l.dealer).filter((t): t is string => !!t));
  const supportOn = new Set(lines.map(l => l.support).filter((t): t is string => !!t));
  const valueOn = new Set(lines.map(l => l.rank));
  // 기준표에서 짚을 내 줄들 — 방어구는 자기 레벨, 무기 기준 칸은 무기 레벨
  const weapon = m.left[0];
  const weaponRow = levelRow(weapon.now?.level ?? null);
  const armorRows = m.left.filter(s => !['weapon', 'wangap', 'belt'].includes(s.key)).map(s => levelRow(s.now?.level ?? null));
  const leftRows = new Set([...armorRows, weaponRow].filter(i => i >= 0));
  const rightRows = leftRows;
  // 티어 1~3 장비가 걸린 줄 (에스더 무기는 표가 따로)
  const lowRows = new Set(m.left.filter(s => !s.esther && !['wangap', 'belt'].includes(s.key)).map(s => lowLevelRow(s.now?.level ?? null)).filter(i => i >= 0));
  const estherKey = weapon.esther?.key;
  const refineSlots = m.left.map(s => ({
    label: s.label,
    now: s.esther ? `에스더 ${s.esther.evo}단계 엘라 ${s.esther.ella}` : s.now ? `+${s.now.refine}` : '새 칸',
    refine: s.refine,
  }));
  const stoneKey = m.stone ? stoneRowKey(m.stone.points, Math.max(0, ...m.stone.engravings.map(e => e.level))) : '';

  return (
    <>
      <div className={styles.hero}>
        <div className={styles.who}>
          <b>{m.name}</b>
          <span>{m.className}</span>
        </div>
        <div className={styles.levels}>
          <div className={styles.lvBox}>
            <span>지금</span>
            <b>{fmt2(m.nowLevel)}</b>
          </div>
          <span className={styles.bigArrow} aria-hidden>→</span>
          <div className={`${styles.lvBox} ${styles.lvNew}`}>
            <span>2부 (16칸 평균)</span>
            <b>{m.newLevel != null ? fmt2(m.newLevel) : '-'}</b>
          </div>
        </div>
      </div>

      <div className={styles.cols}>
        <section className={styles.col}>
          <h3 className={styles.colHead}>장비 <span>8칸</span></h3>
          <div className={styles.scales}>
            <Scale title="장비 등급" items={GRADE_SCALE} active={leftGrades} info={<LevelInfo rows={leftRows} lowRows={lowRows} />} />
          </div>
          <Head now="지금 강화" slot={`슬롯 재련 (최고 ${REFINE_MAX})`} info={<RefineInfo slots={refineSlots} esther={estherKey} />} />
          {m.left.map(s => <LeftRow key={s.key} s={s} />)}
        </section>
        <section className={styles.col}>
          <h3 className={styles.colHead}>장신구 <span>8칸</span></h3>
          <div className={styles.scales}>
            <Scale title="장비 등급" items={GRADE_SCALE} active={rightGrades} info={<LevelInfo rows={rightRows} lowRows={lowRows} pairs />} />
            <Scale title="주문서" items={SCROLL_SCALE} active={scrolls} info={<ScrollInfo mine={scrolls} />} />
          </div>
          <Head now="지금 연마 옵션" slot="주문서 (최고 1등급)" />
          {m.right.map(s => <RightRow key={s.key} s={s} />)}
        </section>
      </div>

      <div className={styles.cols}>
        <section className={styles.col}>
          <h3 className={styles.colHead}>팔찌 → 인장 주문서 <span>21등급 · 최고 1등급</span></h3>
          {seal ? (
            <>
              <div className={styles.flow}>
                <ItemIcon src={seal.icon} grade={seal.grade} />
                <b>{seal.name}</b>
                <span className={styles.flowArrow} aria-hidden>→</span>
                {seal.status === 'seal' ? (
                  <>
                    <span className={styles.icon}><img src={ICON('seal')} alt="" /></span>
                    <b>인장 마력 주입 주문서</b>
                  </>
                ) : <b>{BRACELET_REWARD[seal.status]}</b>}
              </div>
              {seal.status !== 'seal' && <p className={styles.sub2}>{BRACELET_TEXT[seal.status]}</p>}
              <div className={styles.scales}>
                <Scale title="딜러 티어" items={DEALER_SCALE} active={dealerOn} info={<TierInfo list={DEALER_TIER_OPTIONS} active={dealerOn} />} />
                <Scale title="서폿 티어" items={SUPPORT_SCALE} active={supportOn} info={<TierInfo list={SUPPORT_TIER_OPTIONS} active={supportOn} />} />
                <Scale title="수치" items={VALUE_SCALE} active={valueOn} info={<ValueInfo active={valueOn} />} />
              </div>
              <p className={styles.sub2}>
                1~21등급 점수표는 공지에도 아직 없어요. 줄마다 딜러 · 서폿 티어만 보여드려요 (둘 중 높은 쪽 기준으로 정해져요).
                {seal.grade === '유물' && ' 유물 팔찌는 고대 팔찌 기준으로 환산해 계산해요.'}
              </p>
              {lines.map((l, i) => (
                <div key={i} className={styles.bLine}>
                  <span className={styles.rank} style={{ background: VALUE_COLORS[l.rank] }}>{l.rank}</span>
                  <span className={styles.bText}>{l.text}</span>
                  <span className={styles.tiers}>
                    {l.dealer && <span className={styles.tier} style={{ background: tierColor(l.dealer) }}>딜 {l.dealer}</span>}
                    {l.support && <span className={styles.tier} style={{ background: tierColor(l.support) }}>폿 {l.support}</span>}
                    {!l.dealer && !l.support && <Empty>점수 없음</Empty>}
                  </span>
                </div>
              ))}
            </>
          ) : <p className={styles.sub2}>착용 중인 팔찌가 없어요.</p>}
        </section>

        <section className={styles.col}>
          <h3 className={styles.colHead}>
            어빌리티 스톤 → 각인 슬롯 <span>5칸 · 칸마다 최고 7단계</span>
            <Info title="각인 슬롯 기준"><StoneInfo mine={stoneKey} /></Info>
          </h3>
          {m.stone && m.stone.engravings.length > 0 ? (
            <>
              <div className={styles.flow}>
                <ItemIcon src={m.stone.icon} grade="고대" />
                <b>{m.stone.name}</b>
                <span className={styles.flowArrow} aria-hidden>→</span>
                <span className={styles.icon}><img src="/engraving2.webp" alt="" /></span>
                <b>각인 슬롯</b>
              </div>
              <div className={styles.stone}>
                {m.stone.engravings.map((e, i) => (
                  <span key={e.name} className={styles.stoneEng}>
                    {i > 0 && <i>+</i>}
                    {ENGRAVING_ICONS[e.name] && <img src={ENGRAVING_ICONS[e.name]} alt="" />}
                    {e.name} <b>Lv.{e.level}</b>
                  </span>
                ))}
                <span className={styles.stoneEq}>= {m.stone.points}포인트</span>
              </div>
              {m.stone.slots > 0
                ? <EngravingSlots slots={m.stone.slots} level={m.stone.level} bonus={m.stone.bonus} />
                : <p className={styles.sub2}>{
                    !m.stone.valid ? '유효 각인 조합이 아니라 각인 슬롯에 안 들어가고, 초월의 가루로 받아요.'
                    : m.stone.points < 4 ? '활성화 포인트 합이 4 미만이라 각인 슬롯에 안 들어가요.'
                    : '공지 표에 없는 포인트 조합이에요.'
                  }</p>}
            </>
          ) : <p className={styles.sub2}>착용 중인 어빌리티 스톤이 없어요.</p>}
        </section>
      </div>

      <ul className={styles.notes}>
        <li>11월 25일 공식 이관 공지 기준이에요.</li>
        <li>완갑 · 허리띠 · 팔찌 · 성물 · 인장 장비는 <b>무기 레벨 기준</b>으로 받아요 (1800 이상 에스더는 25강 무기 기준).</li>
        <li>지금 <b>착용 중인</b> 장비로 계산해요. 가방에 더 높은 무기 · 스톤이 있으면 그쪽 기준으로 받아요.</li>
      </ul>
    </>
  );
}

export default function GrowthMigration({ onResult }: { onResult?: (m: Migration) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Migration | null>(null);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    const q = name.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lostark?characterName=${encodeURIComponent(q)}&siblings=0`);
      const data = (await res.json()) as { profile?: ApiProfile | null; equipment?: ApiEquip[] | null; message?: string };
      if (!res.ok) throw new Error(data.message || '캐릭터 정보를 가져오지 못했어요.');
      if (!data.profile || !data.equipment) throw new Error('캐릭터를 찾을 수 없어요.');
      const m = migrate(data.profile, data.equipment);
      setResult(m);
      onResult?.(m);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : '캐릭터 정보를 가져오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>내 장비 이관 미리보기</h2>
      <p className={styles.desc}>캐릭터명을 검색하면 지금 장비가 2부에서 몇 등급 몇 연마로, 슬롯 재련 몇 단계로 넘어가는지 보여드려요. 11월 25일 공식 이관 공지 기준이에요.</p>
      <form className={styles.search} onSubmit={search}>
        <input
          className={styles.input}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="캐릭터명"
          aria-label="캐릭터명"
        />
        <button type="submit" className={styles.btn} disabled={loading}>{loading ? '불러오는 중' : '검색'}</button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {result && <Result m={result} />}
    </section>
  );
}
