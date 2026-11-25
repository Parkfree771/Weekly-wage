'use client';
/* eslint-disable @next/next/no-img-element */

// 성장 시뮬 (연마 · 재련 · 마력 주입) — 방송 화면의 배치와 분위기를 따른다.
// 수치 출처와 [예시] 표시는 growthData.ts 참고.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Growth.module.css';
import { GuideNote, NOTES, type NoteData } from './GrowthGuide';
import {
  ICON, EQUIP_SLOTS, ACC_SLOTS, INFUSE_SLOTS, type SlotDef,
  GRADES, MAX_POLISH, itemLevelOf, POLISH_GOLD, POLISH_MAT_COUNT,
  CONVERT_GOLD, CONVERT_MAT_COUNT, FLASH_CHANCE, POLISH_OPTION_POOL, POLISH_DEFAULT_OPTIONS,
  REFINE_MIN, REFINE_MAX, refineBaseProb, JANGIN_ACCUMULATE_DIVIDER,
  REFINE_COST, NEEDLE_COUNT, NEEDLE_BONUS_RATE,
  MAX_PHASE, SATURATION_MAX, INFUSE_LINES, TRANSMUTE_TRIES, INFUSE_GOLD, INFUSE_MAT_COUNT,
  TRANSMUTE_GOLD, TRANSMUTE_MAT_COUNT, SATURATION_GAIN, PHASE_BONUS, PHASE_LUCKY_CHANCE,
  OPTION_GRADES, OPTION_GRADE_COLORS, OPTION_GRADE_WEIGHTS, OPTION_GRADE_POWER,
  INFUSE_OPTION_POOL, INFUSE_START,
} from './growthData';
import type { SimStart } from './migration';

type Tab = 'polish' | 'refine' | 'infuse';
// sub = 그 성장을 어디에 하는지 (연마는 장비·장신구 자체에, 재련·마력 주입은 칸에)
const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: 'polish', label: '연마', sub: '장비 · 장신구' },
  { key: 'refine', label: '재련', sub: '슬롯' },
  { key: 'infuse', label: '마력 주입', sub: '슬롯' },
];

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
const fmt2 = (n: number) => n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct2 = (p: number) => `${(Math.floor(p * 10000) / 100).toFixed(2)}%`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- 작은 조각들 ----------
function TabIcon({ tab }: { tab: Tab }) {
  const common = {
    width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  };
  if (tab === 'polish') {
    return (
      <svg {...common}>
        <path d="M3 14.5h12M5 14.5l1-3h6l1 3M6.5 11.5V9.4h5v2.1" />
        <path d="M9 2l.8 1.8 1.9.3-1.4 1.3.3 1.9L9 6.4l-1.6.9.3-1.9-1.4-1.3 1.9-.3z" />
      </svg>
    );
  }
  if (tab === 'refine') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="9" height="4.5" rx="1" />
        <path d="M12 5.2h3M7.5 7.5v8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="9" cy="9" r="6.5" />
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="9" cy="9" r="0.7" fill="currentColor" />
    </svg>
  );
}
function Coin() {
  return <img src="/gold.webp" alt="골드" className={styles.coin} />;
}
function Silver() {
  return <img src="/shilling.webp" alt="실링" className={styles.coin} />;
}
function LockIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 16 18" aria-hidden>
      <rect x="2" y="8" width="12" height="9" rx="1.5" fill="currentColor" />
      <path d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8" stroke="currentColor" strokeWidth="1.8" fill="none" />
    </svg>
  );
}
function RerollIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden>
      <path d="M14.5 9a5.5 5.5 0 1 1-1.6-3.9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M13.5 2.2v3.4h-3.4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Arrows() {
  return (
    <svg className={styles.arrows} width="26" height="12" viewBox="0 0 26 12" aria-hidden>
      <path d="M2 1.5l5 4.5-5 4.5M10.5 1.5l5 4.5-5 4.5M19 1.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={styles.sectionLabel}>
      <span>{children}</span>
      {right && <span className={styles.sectionRight}>{right}</span>}
    </div>
  );
}
// 재료 한 칸 — 아이콘 / 이름 / 1회 필요량 / 누적 사용량
function Mat({ icon, name, need, used }: { icon: string; name?: string; need: number; used: number }) {
  return (
    <div className={styles.mat}>
      <span className={styles.matIcon}><img src={icon} alt="" /></span>
      {name && <span className={styles.matName}>{name}</span>}
      <span className={styles.matNeed}>{fmt(need)}</span>
      <span className={styles.matUsed}>누적 {fmt(used)}</span>
    </div>
  );
}

// ---------- 왼쪽 슬롯 목록 ----------
function SlotList({ slots, selected, onSelect, sub }: {
  slots: SlotDef[]; selected: string; onSelect: (k: string) => void; sub: (s: SlotDef) => string;
}) {
  const groups: string[] = [];
  slots.forEach(s => { if (!groups.includes(s.group)) groups.push(s.group); });
  return (
    <div className={styles.slotList}>
      {groups.map(g => (
        <div key={g} className={styles.slotGroup}>
          <div className={styles.slotGroupTitle}>{g}</div>
          <div className={styles.slotGroupItems}>
            {slots.filter(s => s.group === g).map(s => (
              <button
                key={s.key}
                type="button"
                className={`${styles.slotItem} ${selected === s.key ? styles.slotItemActive : ''}`}
                onClick={() => onSelect(s.key)}
              >
                <span className={styles.slotIcon}><img src={ICON(s.icon)} alt="" /></span>
                <span className={styles.slotText}>
                  <span className={styles.slotSub}>{sub(s)}</span>
                  <span className={styles.slotName}>{s.itemName}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 가운데 패널 공통 틀
// 화면 부분(.secMain)은 말풍선과 무관하게 제자리에 쌓인다. 말풍선(.note)은 오른쪽 칸에 따로 떠 있고
// (서로 겹치면 아래로만 밀림), 각 부분과 말풍선 사이를 선으로 잇는다. 그래서 말풍선이 길어져도
// 화면 부분의 위치는 달라지지 않는다. 위치는 그려진 뒤 실제 크기를 재서 정한다.
interface Link { sec: number; top: number; bottom: number; noteY: number; }
const NOTE_GAP = 10;      // 말풍선끼리 세로 간격
const NOTE_ANCHOR = 22;   // 말풍선 위에서 선이 닿는 높이

function Panel({ tone, wide, children }: { tone: string; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<Link[] | null>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      const secs = Array.from(root.querySelectorAll<HTMLElement>('[data-sec]'));
      const pairs = secs.map(sec => ({
        main: sec.querySelector<HTMLElement>('[data-main]'),
        note: sec.querySelector<HTMLElement>('[data-note]'),
      }));
      const first = pairs.find(x => x.note)?.note;
      // 좁은 화면에서는 말풍선이 각 부분 아래로 내려간다(CSS) — 선도 위치 계산도 필요 없다
      if (!first || getComputedStyle(first).position !== 'absolute') {
        pairs.forEach(({ note }) => { if (note) note.style.top = ''; });
        root.style.minHeight = '';
        setLinks(prev => (prev === null ? prev : null));
        return;
      }
      const next: Link[] = [];
      let prevBottom = 0;
      pairs.forEach(({ main, note }, sec) => {
        if (!main || !note) return;
        const top = Math.max(main.offsetTop, prevBottom === 0 ? 0 : prevBottom + NOTE_GAP);
        note.style.top = `${top}px`;
        prevBottom = top + note.offsetHeight;
        next.push({ sec, top: main.offsetTop, bottom: main.offsetTop + main.offsetHeight, noteY: top + Math.min(NOTE_ANCHOR, note.offsetHeight / 2) });
      });
      // 말풍선이 화면 부분보다 아래로 더 내려가면 패널만 그만큼 길어진다
      root.style.minHeight = `${prevBottom}px`;
      setLinks(prev => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll('[data-main], [data-note]').forEach(el => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  const onOver = (e: React.MouseEvent) => {
    const sec = (e.target as HTMLElement).closest<HTMLElement>('[data-sec]');
    const idx = sec && ref.current ? Array.from(ref.current.querySelectorAll('[data-sec]')).indexOf(sec) : -1;
    setActive(idx);
  };

  return (
    <div className={`${styles.panel} ${tone} ${wide ? styles.panelWide : ''}`}>
      <div
        ref={ref}
        className={`${styles.secs} ${links ? styles.secsReady : ''}`}
        onMouseOver={onOver}
        onMouseLeave={() => setActive(-1)}
      >
        {children}
        {links && (
          <svg className={styles.links} aria-hidden>
            {links.map((l, i) => {
              const y1 = l.top + 3;
              const y2 = l.bottom - 3;
              const mid = (y1 + y2) / 2;
              return (
                <g key={i} className={l.sec === active ? styles.linkOn : undefined}>
                  {/* 이 설명이 가리키는 범위 */}
                  <path d={`M5 ${y1} H11 V${y2} H5`} />
                  {/* 범위 가운데 → 말풍선 */}
                  <path d={`M11 ${mid} H26 V${l.noteY} H40`} />
                  <circle cx="40" cy={l.noteY} r="2.5" />
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <p className={styles.source}>설명은 11월 20일 방송 · 11월 25일 공지 기준. 확률 · 비용 · 옵션 수치는 아직 공개되지 않아 예시 값이에요</p>
    </div>
  );
}
// note 가 없으면 설명 없이 화면 부분만 놓인다
function Sec({ note, children }: { note?: NoteData; children: ReactNode }) {
  return (
    <section className={styles.sec} data-sec>
      <div className={styles.secMain} data-main>{children}</div>
      {note && <GuideNote note={note} />}
    </section>
  );
}

// =====================================================================
// 연마
// =====================================================================
interface PolishOpt { name: string; value: number; flash?: boolean; }
interface PolishState { grade: number; polish: number; options: PolishOpt[]; }

// 위에서 캐릭터를 검색했으면 칸마다 이관 등급 · 연마로, 아니면 전부 고대 0단계에서 시작
const initPolish = (slots: SlotDef[], start: SimStart['polish'] = {}): Record<string, PolishState> =>
  Object.fromEntries(slots.map(s => [s.key, {
    grade: start[s.key]?.grade ?? GRADES.length - 1,
    polish: start[s.key]?.polish ?? 0,
    options: POLISH_DEFAULT_OPTIONS.map(o => ({ ...o })),
  }]));

function polishValueText(o: PolishOpt) {
  const def = POLISH_OPTION_POOL.find(d => d.name === o.name);
  return def?.pct ? `+${o.value.toFixed(2)}%` : `+${fmt(o.value)}`;
}
function polishValueColor(o: PolishOpt) {
  const def = POLISH_OPTION_POOL.find(d => d.name === o.name);
  const r = def ? (o.value - def.min) / (def.max - def.min) : 0;
  if (o.flash || r >= 0.95) return '#ffb347';
  if (r >= 0.6) return '#c98bff';
  if (r >= 0.3) return '#6cb8ff';
  return '#8ad977';
}

function PolishTab({ start }: { start?: SimStart }) {
  const [sub, setSub] = useState<'equip' | 'acc'>('equip');
  const [equip, setEquip] = useState(() => initPolish(EQUIP_SLOTS, start?.polish));
  const [acc, setAcc] = useState(() => initPolish(ACC_SLOTS, start?.polish));
  const [selEquip, setSelEquip] = useState('weapon');
  const [selAcc, setSelAcc] = useState('necklace');
  const [used, setUsed] = useState({ gold: 0, mats: 0, convertMats: 0 });
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const slots = sub === 'equip' ? EQUIP_SLOTS : ACC_SLOTS;
  const data = sub === 'equip' ? equip : acc;
  const setData = sub === 'equip' ? setEquip : setAcc;
  const sel = sub === 'equip' ? selEquip : selAcc;
  const setSel = sub === 'equip' ? setSelEquip : setSelAcc;
  const slot = slots.find(s => s.key === sel)!;
  const st = data[sel];
  // 검색한 캐릭이 에스더 무기면 무기 칸은 이관 상태만 보여준다 (에스더 연마 비용 · 구간 미공개)
  const esther = sub === 'equip' && sel === 'weapon' ? start?.esther : undefined;
  const isAncient = !esther && st.grade === GRADES.length - 1;
  const atMax = st.polish >= MAX_POLISH;

  const update = (patch: Partial<PolishState>) => setData(prev => ({ ...prev, [sel]: { ...prev[sel], ...patch } }));

  const doPolish = () => {
    if (atMax) return;
    update({ polish: st.polish + 1 });
    setUsed(u => ({ ...u, gold: u.gold + POLISH_GOLD, mats: u.mats + POLISH_MAT_COUNT }));
    setFlashMsg(null);
  };

  const doConvert = (idx: number) => {
    const def = POLISH_OPTION_POOL[Math.floor(Math.random() * POLISH_OPTION_POOL.length)];
    // 번뜩임은 한 번 뜨면 그 줄에 남는다 — 이후로는 어떤 옵션이 나와도 수치는 항상 최고값
    const had = !!st.options[idx].flash;
    const flash = had || Math.random() < FLASH_CHANCE;
    let value = flash ? def.max : rand(def.min, def.max);
    value = def.pct ? Math.round(value * 100) / 100 : Math.round(value);
    update({ options: st.options.map((o, i) => (i === idx ? { name: def.name, value, flash } : o)) });
    setUsed(u => ({ ...u, gold: u.gold + CONVERT_GOLD, convertMats: u.convertMats + CONVERT_MAT_COUNT }));
    setFlashMsg(!had && flash ? '번뜩임 발동 — 이 줄은 이제 항상 최고값' : null);
  };

  const curLv = itemLevelOf(st.grade, st.polish);
  // 에스더 무기도 연마 1번에 +5 (공지 표: 엘라 4단계 1840 → 연마 5단계 1865)
  const estherBase = esther ? esther.level - esther.polish * 5 : 0;

  return (
    <div className={styles.body}>
      <SlotList
        slots={slots}
        selected={sel}
        onSelect={k => { setSel(k); setFlashMsg(null); }}
        sub={s => (sub === 'equip' && s.key === 'weapon' && start?.esther ? `에스더 ${start.esther.polish}단계` : `${data[s.key].polish}단계`)}
      />
      <Panel tone={styles.tonePolish} wide={sub === 'equip'}>
        {esther ? (
          <Sec note={NOTES.polish.esther}>
            <div className={styles.subTabs}>
              <button type="button" className={`${styles.subTab} ${styles.subTabActive}`} onClick={() => setSub('equip')}>장비 연마</button>
              <button type="button" className={styles.subTab} onClick={() => setSub('acc')}>장신구 연마</button>
            </div>
            <div className={styles.head}>
              <div className={styles.headIcon}><img src={ICON(slot.icon)} alt="" /></div>
              <div className={styles.headName}>에스더 무기 · 엘라 {esther.ella}단계</div>
              <div className={styles.ilvNow}>
                <span className={styles.ilvNowLabel}>아이템 레벨</span>
                <span className={styles.ilvNowVal}>{fmt2(esther.level)}</span>
              </div>
            </div>
            {esther.ella === 4 && (
              <div className={styles.pTrack}>
                <div className={styles.pBase}>
                  <span className={styles.pStep}>엘라 4</span>
                  <span className={styles.pLv}>{estherBase}</span>
                </div>
                {Array.from({ length: MAX_POLISH }).map((_, i) => (
                  <div key={i} className={`${styles.pSeg} ${i < esther.polish ? styles.pSegDone : ''} ${i === esther.polish ? styles.pSegNext : ''}`}>
                    <span className={styles.pStep}>{i + 1}단계</span>
                    <span className={styles.pLv}>{estherBase + (i + 1) * 5}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.result}>에스더 무기 연마 비용 · 재료는 아직 공개되지 않아 이관 상태만 보여드려요</div>
          </Sec>
        ) : (<>
        <Sec note={sub === 'equip' ? NOTES.polish.head : NOTES.polish.headAcc}>
          <div className={styles.subTabs}>
            <button type="button" className={`${styles.subTab} ${sub === 'equip' ? styles.subTabActive : ''}`} onClick={() => setSub('equip')}>장비 연마</button>
            <button type="button" className={`${styles.subTab} ${sub === 'acc' ? styles.subTabActive : ''}`} onClick={() => setSub('acc')}>장신구 연마</button>
          </div>
          <div className={styles.head}>
            <div className={styles.headIcon}><img src={ICON(slot.icon)} alt="" /></div>
            <div className={styles.headName}>{slot.itemName}</div>
            <div className={styles.ilvNow}>
              <span className={styles.ilvNowLabel}>아이템 레벨</span>
              <span className={styles.ilvNowVal}>{fmt2(curLv)}</span>
              {!atMax && <span className={styles.ilvNowNext}>다음 연마 +5</span>}
            </div>
          </div>
          {/* 연마 5칸 — 칠해진 칸 = 한 연마, 테두리 칸 = 다음 연마. 칸 안 숫자 = 그 단계의 아이템 레벨 */}
          <div className={styles.pTrack}>
            <div className={styles.pBase}>
              <span className={styles.pStep}>{GRADES[st.grade]}</span>
              <span className={styles.pLv}>{itemLevelOf(st.grade, 0)}</span>
            </div>
            {Array.from({ length: MAX_POLISH }).map((_, i) => (
              <div
                key={i}
                className={`${styles.pSeg} ${i < st.polish ? styles.pSegDone : ''} ${i === st.polish ? styles.pSegNext : ''}`}
              >
                <span className={styles.pStep}>{i + 1}단계</span>
                <span className={styles.pLv}>{itemLevelOf(st.grade, i + 1)}</span>
              </div>
            ))}
          </div>
        </Sec>

        {/* 옵션 개방·변환은 방송에서 "고대 등급 장비"로만 설명됐다. 장신구 옵션은 마력 주입 쪽 */}
        {sub === 'equip' && (
        <Sec note={NOTES.polish.options}>
          <SectionLabel right={!isAncient ? '고대 등급만 열림' : `${Math.min(st.polish, MAX_POLISH)} / ${MAX_POLISH} 줄`}>개방된 옵션</SectionLabel>
          <div className={styles.optArea}>
          <div className={styles.optRows}>
            {Array.from({ length: MAX_POLISH }).map((_, i) => {
              const open = isAncient && i < st.polish;
              const o = st.options[i];
              return (
                <div key={i} className={`${styles.optRow} ${!open ? styles.optRowLocked : ''} ${open && o.flash ? styles.optRowFlash : ''}`}>
                  {open ? (
                    <>
                      {o.flash && <span className={styles.flashMark} title="번뜩임 — 이 줄은 항상 최고값">번뜩임</span>}
                      <span className={styles.optText}>
                        {o.name}<b style={{ color: polishValueColor(o) }}>{polishValueText(o)}</b>
                      </span>
                      <button type="button" className={styles.reroll} onClick={() => doConvert(i)} title="옵션 변환" aria-label="옵션 변환">
                        <RerollIcon />
                      </button>
                    </>
                  ) : (
                    <span className={styles.lock}><LockIcon /></span>
                  )}
                </div>
              );
            })}
          </div>
          {/* 방송 화면 그대로 옵션 줄 오른쪽에 붙는 효과 변환 정보 */}
          <div className={styles.convertBox}>
            <div className={styles.convertTitle}>효과 변환 정보</div>
            <span className={styles.matIcon}><img src={ICON('convert_mat')} alt="" /></span>
            <div className={styles.convertNeed}>변환석 {CONVERT_MAT_COUNT}개</div>
            <div className={styles.convertTitle}>변환 비용</div>
            <div className={styles.convertNeed}>{fmt(CONVERT_GOLD)} <Coin /></div>
            <div className={styles.matUsed}>누적 {fmt(used.convertMats)}회</div>
          </div>
          </div>
          <div className={styles.result}>{flashMsg}</div>
        </Sec>
        )}

        <Sec note={NOTES.polish.mats}>
          <SectionLabel>재료 장비</SectionLabel>
          <div className={styles.matRow}>
            <span className={styles.matIcon}><img src={ICON(slot.icon)} alt="" /></span>
            <span className={styles.matRowText}>{slot.itemName}</span>
            <span className={styles.matRowRight}>
              <span>{POLISH_MAT_COUNT}개</span>
              <small>누적 {fmt(used.mats)}</small>
            </span>
          </div>
        </Sec>

        <Sec>
          <div className={styles.costTable}>
            <div><span>연마 비용</span><span>{fmt(POLISH_GOLD)} <Coin /></span></div>
            <div><span>누적 사용</span><span>{fmt(used.gold)} <Coin /></span></div>
          </div>
          <div className={styles.btnRow}>
            <button type="button" className={styles.btn} disabled={atMax} onClick={doPolish}>{atMax ? '최대 단계' : '연마'}</button>
          </div>
        </Sec>
        </>)}
      </Panel>
    </div>
  );
}

// =====================================================================
// 슬롯 재련
// =====================================================================
interface RefineState { stage: number; jangin: number; }
// 전 칸 같은 단계에서 시작. 성공률을 아는 가장 낮은 단계가 11이라 11부터 (growthData REFINE_MIN)
const REFINE_START: Record<string, number> = Object.fromEntries(EQUIP_SLOTS.map(s => [s.key, REFINE_MIN]));
// 검색한 캐릭은 칸마다 이관 단계 그대로. 11 아래(허리띠 0 등)는 성공률을 몰라 재련 버튼을 막는다
const initRefine = (start?: SimStart) => Object.fromEntries(EQUIP_SLOTS.map(s => [s.key, {
  stage: start ? start.refine[s.key] ?? REFINE_MIN : REFINE_START[s.key],
  jangin: 0,
}])) as Record<string, RefineState>;
const REFINE_SLOTS: SlotDef[] = EQUIP_SLOTS.map(s => ({ ...s, itemName: `${s.label} 슬롯` }));

function RefineTab({ start }: { start?: SimStart }) {
  const [data, setData] = useState(() => initRefine(start));
  const [sel, setSel] = useState('weapon');
  const [needle, setNeedle] = useState(false);
  const [used, setUsed] = useState({ tries: 0, stone: 0, orange: 0, silver: 0, gold: 0, needles: 0 });
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const slot = REFINE_SLOTS.find(s => s.key === sel)!;
  const st = data[sel];
  const atMax = st.stage >= REFINE_MAX;
  const unknown = st.stage < REFINE_MIN;
  const base = refineBaseProb(st.stage);
  const prob = st.jangin >= 1 ? 1 : Math.min(1, base + (needle ? base * NEEDLE_BONUS_RATE : 0));
  // 방송 예시는 투구라 파란 재료. 무기 쪽(무기·완갑)은 빨간 재료
  const isWeaponSide = slot.group === '무기';

  const attempt = (times: number) => {
    if (unknown) return;
    let s = { ...st };
    let tries = 0, okAt = -1;
    for (let i = 0; i < times && s.stage < REFINE_MAX; i++) {
      tries++;
      const b = refineBaseProb(s.stage);
      const p = s.jangin >= 1 ? 1 : Math.min(1, b + (needle ? b * NEEDLE_BONUS_RATE : 0));
      if (Math.random() < p) {
        s = { stage: s.stage + 1, jangin: 0 };
        okAt = i;
        break;
      }
      // 실패 마일리지가 처음부터 가득 찬 상태라 실패해도 확률은 더 오르지 않는다. 장인의 기운만 쌓인다
      s = { stage: s.stage, jangin: Math.min(1, s.jangin + p / JANGIN_ACCUMULATE_DIVIDER) };
    }
    if (tries === 0) return;
    setData(prev => ({ ...prev, [sel]: s }));
    setUsed(u => ({
      tries: u.tries + tries,
      stone: u.stone + REFINE_COST.blue * tries,
      orange: u.orange + REFINE_COST.orange * tries,
      silver: u.silver + REFINE_COST.silver * tries,
      gold: u.gold + REFINE_COST.gold * tries,
      needles: u.needles + (needle ? NEEDLE_COUNT * tries : 0),
    }));
    setResult(okAt >= 0
      ? { ok: true, text: `재련 성공 — ${s.stage} 단계` }
      : { ok: false, text: tries > 1 ? `재련 실패 ${tries}회` : '재련 실패' });
  };

  return (
    <div className={styles.body}>
      <SlotList
        slots={REFINE_SLOTS}
        selected={sel}
        onSelect={k => { setSel(k); setResult(null); }}
        sub={s => `${data[s.key].stage} 단계`}
      />
      <Panel tone={styles.toneRefine}>
        <Sec note={NOTES.refine.head}>
          <div className={styles.head}>
            <div className={styles.headIcon}><img src={ICON(slot.icon)} alt="" /></div>
            <div className={styles.headName}>{slot.itemName}</div>
            <div className={styles.headStage}>
              {atMax ? <span>{st.stage} 단계 · 최대</span> : (
                <>
                  <span>{st.stage} 단계</span>
                  <Arrows />
                  <span className={styles.next}>{st.stage + 1} 단계</span>
                </>
              )}
            </div>
          </div>
        </Sec>

        <Sec note={NOTES.refine.rate}>
          <div className={styles.rateFrame}>
            <div className={styles.rateLabel}>재련 성공률</div>
            <div className={styles.rateValue}>{atMax ? '최대' : unknown ? '미공개' : `${(prob * 100).toFixed(2)}%`}</div>
            <div className={styles.janginRow}>
              <span>장인의 기운</span>
              <span className={styles.janginBar}><i style={{ width: `${Math.min(100, st.jangin * 100)}%` }} /></span>
              <span className={styles.janginVal}>{pct2(st.jangin)}</span>
            </div>
          </div>
          <div className={`${styles.result} ${result && !result.ok ? styles.resultBad : ''}`}>
            {unknown ? `${REFINE_MIN}단계 아래 성공률은 아직 공개되지 않아 재련할 수 없어요` : result?.text}
          </div>
        </Sec>

        <Sec>
          <SectionLabel right={`누적 ${fmt(used.needles)}개`}>보조 재료</SectionLabel>
          <div className={styles.needleRow}>
            <span className={styles.matIcon}><img src={ICON('needle')} alt="" /></span>
            <span className={styles.needleText}>
              위대한 바늘
              <small>1회 {NEEDLE_COUNT}개</small>
            </span>
            <button type="button" className={`${styles.toggle} ${needle ? styles.toggleOn : ''}`} onClick={() => setNeedle(v => !v)} aria-pressed={needle}>
              {needle ? '사용 중' : '사용하기'}
            </button>
          </div>
        </Sec>

        <Sec note={NOTES.refine.mats}>
          <SectionLabel>재련 재료 (1회)</SectionLabel>
          <div className={styles.mats}>
            <Mat icon={ICON(isWeaponSide ? 'stone_red' : 'stone_blue')} name={isWeaponSide ? '파괴석' : '수호석'} need={REFINE_COST.blue} used={used.stone} />
            <Mat icon={ICON('stone_orange')} need={REFINE_COST.orange} used={used.orange} />
          </div>
        </Sec>

        <Sec>
          <div className={styles.costTable}>
            <div>
              <span>재련 비용</span>
              <span>{fmt(REFINE_COST.silver)} <Silver /><i className={styles.gap} />{fmt(REFINE_COST.gold)} <Coin /></span>
            </div>
            <div>
              <span>누적 사용 · {fmt(used.tries)}회</span>
              <span>{fmt(used.silver)} <Silver /><i className={styles.gap} />{fmt(used.gold)} <Coin /></span>
            </div>
          </div>
          <div className={styles.btnRow}>
            <button type="button" className={styles.btn} disabled={atMax || unknown} onClick={() => attempt(1)}>슬롯 재련</button>
            <button type="button" className={`${styles.btn} ${styles.btnSub}`} disabled={atMax || unknown} onClick={() => attempt(3)}>슬롯 재련 3회</button>
          </div>
        </Sec>
      </Panel>
    </div>
  );
}

// =====================================================================
// 마력 주입
// =====================================================================
interface InfuseOpt { idx: number; grade: number; }
interface InfuseState { phase: number; saturation: number; saved: InfuseOpt[] | null; cand: InfuseOpt[] | null; tries: number; }

const initInfuse = () => Object.fromEntries(INFUSE_SLOTS.map(s => [s.key, {
  phase: INFUSE_START[s.key].phase, saturation: INFUSE_START[s.key].saturation, saved: null, cand: null, tries: 0,
}])) as Record<string, InfuseState>;

function rollGrade() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < OPTION_GRADE_WEIGHTS.length; i++) { acc += OPTION_GRADE_WEIGHTS[i]; if (r < acc) return i; }
  return 0;
}
function rollLine(exclude: number[]): InfuseOpt {
  const pool = INFUSE_OPTION_POOL.map((_, i) => i).filter(i => !exclude.includes(i));
  return { idx: pool[Math.floor(Math.random() * pool.length)], grade: rollGrade() };
}
const phaseMul = (phase: number) => 1 + PHASE_BONUS * (phase - 1);
function powerOf(base: number, opts: InfuseOpt[] | null, phase: number) {
  if (!opts) return base;
  return base + opts.reduce((a, o) => a + OPTION_GRADE_POWER[o.grade], 0) * phaseMul(phase);
}
function infuseValueText(o: InfuseOpt, phase: number) {
  const def = INFUSE_OPTION_POOL[o.idx];
  const v = def.values[o.grade] * phaseMul(phase);
  return def.pct ? `+${v.toFixed(2)}%` : `+${fmt(v)}`;
}

function InfuseTab() {
  const [data, setData] = useState(initInfuse);
  const [sel, setSel] = useState('relic');
  const [used, setUsed] = useState({ gold: 0, mats: 0, controllers: 0 });
  const [msg, setMsg] = useState<string | null>(null);

  const slot = INFUSE_SLOTS.find(s => s.key === sel)!;
  const st = data[sel];
  const basePower = INFUSE_START[sel].basePower;
  const shown = st.cand ?? st.saved;
  const curPower = powerOf(basePower, st.saved, st.phase);
  const nextPower = st.cand ? powerOf(basePower, st.cand, st.phase) : null;

  const update = (patch: Partial<InfuseState>) => setData(prev => ({ ...prev, [sel]: { ...prev[sel], ...patch } }));

  const doInfuse = () => {
    const cand: InfuseOpt[] = [];
    for (let i = 0; i < INFUSE_LINES; i++) cand.push(rollLine(cand.map(c => c.idx)));
    let phase = st.phase;
    let saturation = st.saturation;
    let text: string | null = null;
    if (phase < MAX_PHASE) {
      saturation += Math.round(rand(SATURATION_GAIN[0], SATURATION_GAIN[1]));
      if (saturation >= SATURATION_MAX) {
        phase += 1;
        saturation = phase >= MAX_PHASE ? SATURATION_MAX : saturation - SATURATION_MAX;
        text = `제 ${phase}위상 도달`;
      } else if (Math.random() < PHASE_LUCKY_CHANCE) {
        // 가끔 게이지를 다 채우지 않아도 다음 위상으로 넘어간다
        phase += 1;
        saturation = phase >= MAX_PHASE ? SATURATION_MAX : 0;
        text = `운 좋게 제 ${phase}위상으로 넘어감`;
      }
    }
    update({ cand, tries: TRANSMUTE_TRIES, phase, saturation });
    setUsed(u => ({ ...u, gold: u.gold + INFUSE_GOLD, mats: u.mats + INFUSE_MAT_COUNT }));
    setMsg(text);
  };

  const doTransmute = (line: number) => {
    if (!st.cand || st.tries <= 0) return;
    const others = st.cand.filter((_, i) => i !== line).map(c => c.idx);
    update({ cand: st.cand.map((c, i) => (i === line ? rollLine(others) : c)), tries: st.tries - 1 });
    setUsed(u => ({ ...u, gold: u.gold + TRANSMUTE_GOLD, controllers: u.controllers + TRANSMUTE_MAT_COUNT }));
    setMsg(null);
  };

  const doSave = () => {
    if (!st.cand) return;
    update({ saved: st.cand, cand: null, tries: 0 });
    setMsg('저장 완료');
  };

  const satPct = st.phase >= MAX_PHASE ? 100 : (st.saturation / SATURATION_MAX) * 100;
  const canTransmute = !!st.cand && st.tries > 0;

  return (
    <div className={styles.body}>
      <SlotList
        slots={INFUSE_SLOTS}
        selected={sel}
        onSelect={k => { setSel(k); setMsg(null); }}
        sub={s => `제 ${data[s.key].phase}위상`}
      />
      <Panel tone={styles.toneInfuse}>
        <Sec note={NOTES.infuse.head}>
          <div className={styles.head}>
            <div className={styles.headIcon}><img src={ICON(slot.icon)} alt="" /></div>
            <div className={styles.headName}>{slot.label}</div>
            <div className={styles.headStage}>
              <span className={styles.powerLabel}>전투력</span>
              <span className={styles.power}>{fmt2(curPower)}</span>
              {nextPower !== null && (
                <>
                  <Arrows />
                  <span className={`${styles.power} ${nextPower > curPower ? styles.up : nextPower < curPower ? styles.down : ''}`}>{fmt2(nextPower)}</span>
                </>
              )}
            </div>
          </div>
        </Sec>

        <Sec note={NOTES.infuse.saturation}>
          <SectionLabel right={st.phase >= MAX_PHASE ? '최대 위상' : `가득 차면 제 ${st.phase + 1}위상`}>마력 포화도</SectionLabel>
          <div className={styles.satRow}>
            <b className={styles.phasePill}>제 {st.phase}위상</b>
            <div className={styles.satBar}>
              <i style={{ width: `${satPct}%` }} />
              <span>{st.phase >= MAX_PHASE ? '최대' : `${fmt(st.saturation)} / ${fmt(SATURATION_MAX)}`}</span>
            </div>
          </div>
        </Sec>

        <Sec note={NOTES.infuse.effects}>
          <SectionLabel right={st.cand ? '새로 뽑은 옵션' : '저장된 옵션'}>마력 효과</SectionLabel>
          {/* 변성(줄 다시 뽑기) 재료와 비용 — 방송 화면처럼 옵션 줄 바로 위 */}
          <div className={styles.matRow}>
            <span className={styles.matIcon}><img src={ICON('controller')} alt="" /></span>
            <span className={styles.matRowText}>
              보구 마력 제어기
              <small>{TRANSMUTE_MAT_COUNT}개 · 누적 {fmt(used.controllers)}</small>
            </span>
            <span className={styles.matRowRight}>
              <small>변성 비용</small>
              <span>{fmt(TRANSMUTE_GOLD)} <Coin /></span>
            </span>
          </div>
          <div className={styles.effects}>
            {Array.from({ length: INFUSE_LINES }).map((_, i) => {
              const o = shown?.[i];
              const btn = (
                <button type="button" className={styles.reroll} disabled={!canTransmute} onClick={() => doTransmute(i)} title="마력 변성" aria-label="마력 변성">
                  <RerollIcon />
                </button>
              );
              return (
                <div key={i} className={`${styles.effectRow} ${!o ? styles.effectRowEmpty : ''}`}>
                  {btn}
                  <span className={styles.effectName}>{o ? INFUSE_OPTION_POOL[o.idx].name : '비어 있음'}</span>
                  <span className={styles.effectVal} style={o ? { color: OPTION_GRADE_COLORS[o.grade] } : undefined}>
                    {o ? `${infuseValueText(o, st.phase)} (${OPTION_GRADES[o.grade]})` : '-'}
                  </span>
                  {btn}
                </div>
              );
            })}
          </div>
          <div className={styles.tries}>마력 변성 시도 {st.cand ? st.tries : 0} / {TRANSMUTE_TRIES}</div>
          <div className={styles.result}>{msg}</div>
        </Sec>

        <Sec note={NOTES.infuse.mats}>
          <div className={styles.mats}>
            <Mat icon={ICON('infuse_mat')} need={INFUSE_MAT_COUNT} used={used.mats} />
          </div>
        </Sec>

        <Sec note={NOTES.infuse.action}>
          <div className={styles.costTable}>
            <div><span>주입 비용</span><span>{fmt(INFUSE_GOLD)} <Coin /></span></div>
            <div><span>누적 사용</span><span>{fmt(used.gold)} <Coin /></span></div>
          </div>
          <div className={styles.btnRow}>
            <button type="button" className={`${styles.btn} ${styles.btnSub}`} disabled={!st.cand} onClick={doSave}>저장</button>
            <button type="button" className={styles.btn} onClick={doInfuse}>마력 주입</button>
          </div>
        </Sec>
      </Panel>
    </div>
  );
}

// =====================================================================
export default function GrowthSimulator({ start }: { start?: SimStart }) {
  const [tab, setTab] = useState<Tab>('polish');
  return (
    <div className={styles.wrap}>
      {start && <div className={styles.startFrom}><b>{start.name}</b> 이관 상태에서 시작</div>}
      <div className={styles.tabBar} role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            <TabIcon tab={t.key} />
            {t.label}
            <span className={styles.tabSub}>{t.sub}</span>
          </button>
        ))}
      </div>
      {tab === 'polish' && <PolishTab start={start} />}
      {tab === 'refine' && <RefineTab start={start} />}
      {tab === 'infuse' && <InfuseTab />}
    </div>
  );
}
