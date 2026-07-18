'use client';

// 숙제 기록 달력 — 앱 loalogol-app/src/components/WeeklyCalendar.tsx 웹 포팅 (기능 1:1, UI는 웹 모달).
// 캐릭터 칩으로 전환하며, 레이드/주간·공통 컨텐츠는 완료한 날짜에 이미지가 겹쳐 쌓이고(최대 3장 + N),
// 일일 숙제(균열/가토)는 체크 상태색(일반/휴게/PC방…) 동그라미로 날짜에 찍힌다.
// 날짜를 누르면 그 날 기록이 펼쳐진다. 하단 모드 바(기록/골드/재료)로 월간 정산 전환.
import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import NextImage from 'next/image';
import type { ActivityEntry, ActivityLog } from '@/lib/activity-log';
import {
  DAILY_COLORS, DAILY_LABELS, CHECKED_GREEN, BOUND_GOLD_COLOR, valueActivityEntry,
} from '@/lib/weekly-rewards';
import styles from './HomeworkCalendar.module.css';

const ACCENT = '#6366f1';
const BOUND_GOLD_FILTER = 'hue-rotate(280deg) saturate(1.0)';

const KIND_ORDER: Record<ActivityEntry['kind'], number> = { raid: 0, weekly: 1, common: 2, daily: 3 };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

type LoggedEntry = ActivityEntry & { id: string };
type DayList = {
  key: string;
  entries: LoggedEntry[];       // 상세 패널용 전체 (정렬됨)
  icons: LoggedEntry[];         // 칸에 이미지로 쌓는 것 (레이드/주간/공통/가토)
  chaos: LoggedEntry | null;    // 균열/전선 — 날짜 숫자 동그라미 색으로 표현
};

/** 선택 캐릭터의 그 날 기록. 공통 컨텐츠(charName 없음)는 어느 캐릭터에서든 보인다. */
function buildDay(log: ActivityLog, key: string, charName: string | null): DayList | null {
  const day = log[key];
  if (!day) return null;
  const entries = Object.entries(day)
    .map(([id, e]) => ({ id, ...e }))
    .filter(e => !charName || !e.charName || e.charName === charName)
    .sort((a, b) => (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) || a.label.localeCompare(b.label));
  if (entries.length === 0) return null;
  return {
    key,
    entries,
    // 가토는 레이드처럼 이미지로 찍고, 균열/전선만 숫자 동그라미로
    icons: entries.filter(e => e.kind !== 'daily' || e.id.includes('|guardianRaid')),
    chaos: entries.find(e => e.kind === 'daily' && e.id.includes('|chaosDungeon')) || null,
  };
}

const MODES = [
  ['log', '기록'],
  ['gold', '골드'],
  ['mats', '재료'],
] as const;
type CalMode = typeof MODES[number][0];

/** 날짜별/월간 정산 값 (골드·재료 이미지별 합) */
type DayVal = { goldFree: number; goldBound: number; mats: Map<string, number> };

const fmtAmount = (v: number) =>
  Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
// 달력 칸용 골드 축약 (만 단위, 음수 대응 — 더보기 비용이 골드보다 클 때)
const fmtMan = (v: number) =>
  (Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1).replace(/\.0$/, '')}만` : v.toLocaleString());

function MiniIcon({ image, fallback, size }: { image?: string; fallback: string; size: number }) {
  return (
    <span className={styles.miniIcon} style={{ width: size, height: size }}>
      {image ? (
        <NextImage src={image} alt={fallback} width={size} height={size} unoptimized loading="lazy" style={{ objectFit: 'cover', width: size, height: size }} />
      ) : (
        <span className={styles.miniIconFallback}>{fallback}</span>
      )}
    </span>
  );
}

type Props = {
  show: boolean;
  onClose: () => void;
  log: ActivityLog;
  /** 오늘(게임일) 날짜 키 — 화면과 기록의 '오늘'을 일치시키기 위해 밖에서 주입 */
  todayKey: string;
  /** 원정대 캐릭터 목록 (캐릭터별 달력 전환용) */
  characters: { name: string; imageUrl?: string }[];
  /** 열 때 선택할 캐릭터 (캐릭터 카드의 달력 버튼에서 주입) */
  initialChar?: string | null;
  /** 원정대 최고 아이템레벨 — 공통 컨텐츠(카게/필보) 보상 티어 판정용 */
  maxLevel?: number;
};

export default function HomeworkCalendar({ show, onClose, log, todayKey, characters, initialChar, maxLevel = 0 }: Props) {
  const [ty, tm] = todayKey.split('-').map(Number);
  const [viewYear, setViewYear] = useState(ty);
  const [viewMonth, setViewMonth] = useState(tm - 1); // 0-based
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selChar, setSelChar] = useState<string | null>(characters[0]?.name ?? null);
  const [mode, setMode] = useState<CalMode>('log');

  // 열릴 때: 달력 버튼을 누른 캐릭터로 선택 (없으면 첫 캐릭터) + 이번 달로 복귀
  useEffect(() => {
    if (!show) return;
    const valid = initialChar && characters.some(c => c.name === initialChar)
      ? initialChar
      : characters[0]?.name ?? null;
    setSelChar(valid);
    setSelected(null);
    setViewYear(ty);
    setViewMonth(tm - 1);
    setPickerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, initialChar]);

  // 달력 칸 — 앞쪽 빈칸(요일 맞춤) + 1..말일, 마지막 주를 7칸으로 채움
  const cells = useMemo(() => {
    const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i += 1) arr.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
    setSelected(null);
  };

  const selectChar = (name: string) => {
    setSelChar(name);
    setSelected(null);
  };

  const switchMode = (m: CalMode) => {
    setMode(m);
    setSelected(null);
  };

  // 골드/재료 모드: 선택 캐릭터의 보이는 달 날짜별 정산 + 월 합계
  const monthVal = useMemo(() => {
    if (mode === 'log') return null;
    const days = new Map<string, DayVal>();
    const total: DayVal = { goldFree: 0, goldBound: 0, mats: new Map() };
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const day = log[key];
      if (!day) continue;
      const dv: DayVal = { goldFree: 0, goldBound: 0, mats: new Map() };
      Object.entries(day).forEach(([id, e]) => {
        if (selChar && e.charName && e.charName !== selChar) return;
        const v = valueActivityEntry(id, e, maxLevel);
        if (!v) return;
        dv.goldFree += v.goldFree;
        dv.goldBound += v.goldBound;
        v.mats.forEach(m => dv.mats.set(m.image, (dv.mats.get(m.image) || 0) + m.amount));
      });
      if (dv.goldFree === 0 && dv.goldBound === 0 && dv.mats.size === 0) continue;
      days.set(key, dv);
      total.goldFree += dv.goldFree;
      total.goldBound += dv.goldBound;
      dv.mats.forEach((amt, img) => total.mats.set(img, (total.mats.get(img) || 0) + amt));
    }
    return { days, total };
  }, [mode, log, viewYear, viewMonth, selChar, maxLevel]);

  const sortedMats = (mats: Map<string, number>) =>
    [...mats.entries()].sort((a, b) => b[1] - a[1]);

  const selectedDay = mode === 'log' && selected ? buildDay(log, selected, selChar) : null;
  const selectedVal = mode !== 'log' && selected ? monthVal?.days.get(selected) ?? null : null;
  // 골드 모드 상세 — 그 날 골드가 나온 출처별 내역 (레이드/카게)
  const selectedGoldRows = mode === 'gold' && selected && log[selected]
    ? Object.entries(log[selected])
        .filter(([, e]) => !selChar || !e.charName || e.charName === selChar)
        .map(([id, e]) => ({ id, e, v: valueActivityEntry(id, e, maxLevel) }))
        .filter(r => r.v && (r.v.goldFree !== 0 || r.v.goldBound !== 0))
        .sort((a, b) => (b.v!.goldFree + b.v!.goldBound) - (a.v!.goldFree + a.v!.goldBound))
    : [];
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      contentClassName={styles.modalContent}
      dialogClassName={styles.modalDialog}
      backdropClassName={styles.noDim}
    >
      <div className={styles.sheet}>
        {/* 헤더 — 월 이동 + 제목(클릭 시 연/월 선택) + 닫기 */}
        <div className={styles.header}>
          <button className={styles.navBtn} onClick={() => goMonth(-1)}>‹</button>
          <button className={styles.titleBtn} onClick={() => setPickerOpen(v => !v)}>
            <span className={styles.titleText}>{viewYear}년 {viewMonth + 1}월</span>
            <span className={styles.titleCaret} style={{ transform: pickerOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
          </button>
          <button className={styles.navBtn} onClick={() => goMonth(1)}>›</button>
          <button className={styles.navBtn} onClick={onClose}>✕</button>
        </div>

        {/* 캐릭터 칩 — 캐릭터별 달력 전환 */}
        {characters.length > 0 && (
          <div className={styles.charRow}>
            {characters.map(c => {
              const on = c.name === selChar;
              return (
                <button
                  key={c.name}
                  onClick={() => selectChar(c.name)}
                  className={`${styles.charChip} ${on ? styles.charChipOn : ''}`}
                >
                  <span className={styles.charChipAvatar}>
                    {c.imageUrl ? (
                      <NextImage src={c.imageUrl} alt={c.name} width={22} height={44} unoptimized loading="lazy" className={styles.charChipAvatarImg} />
                    ) : (
                      <span className={styles.charChipInitial}>{c.name[0]}</span>
                    )}
                  </span>
                  <span className={styles.charChipName}>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {pickerOpen ? (
          /* 연/월 빠른 선택 — 연도 스테퍼 + 12개월 그리드 */
          <div className={styles.picker}>
            <div className={styles.yearRow}>
              <button className={styles.navBtn} onClick={() => setViewYear(viewYear - 1)}>‹</button>
              <span className={styles.yearText}>{viewYear}년</span>
              <button className={styles.navBtn} onClick={() => setViewYear(viewYear + 1)}>›</button>
            </div>
            <div className={styles.monthGrid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setViewMonth(i); setSelected(null); setPickerOpen(false); }}
                  className={`${styles.monthCell} ${i === viewMonth ? styles.monthCellOn : ''}`}
                >
                  {i + 1}월
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 요일 */}
            <div className={styles.weekRow}>
              {weekdays.map((w, i) => (
                <div key={i} className={styles.weekCell} style={i === 0 ? { color: '#ef4444' } : undefined}>{w}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className={styles.grid}>
              {cells.map((day, idx) => {
                if (day == null) return <div key={idx} className={styles.cell} />;
                const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                const isToday = key === todayKey;
                const isSel = key === selected;

                // 골드/재료 정산 모드 — 날짜 숫자 + 그 날 수급(골드 합계 텍스트 / 재료 아이콘 스택)
                if (mode !== 'log') {
                  const dv = monthVal?.days.get(key) ?? null;
                  const gold = dv ? dv.goldFree + dv.goldBound : 0;
                  const matTop = mode === 'mats' && dv ? sortedMats(dv.mats).slice(0, 3) : [];
                  const matExtra = mode === 'mats' && dv ? dv.mats.size - matTop.length : 0;
                  const has = mode === 'gold' ? gold !== 0 : matTop.length > 0;
                  return (
                    <button
                      key={idx}
                      disabled={!has}
                      onClick={() => setSelected(isSel ? null : key)}
                      className={`${styles.cell} ${styles.cellBtn} ${isSel ? styles.cellSel : ''}`}
                    >
                      {isToday ? (
                        <span className={styles.dayNumBox} style={{ background: ACCENT }}>{day}</span>
                      ) : (
                        <span className={`${styles.dayNum} ${has ? styles.dayNumHas : ''}`}>{day}</span>
                      )}
                      {mode === 'gold' ? (
                        <span className={styles.valBox}>
                          {gold !== 0 && <span className={styles.goldText}>{fmtMan(gold)}</span>}
                        </span>
                      ) : (
                        <span className={styles.coversBox}>
                          {matTop
                            .map(([img], j) => ({ img, j }))
                            .reverse()
                            .map(({ img, j }) => (
                              <span key={img} className={styles.coverItem} style={{ left: j * 4, top: j * 4, zIndex: 3 - j }}>
                                <MiniIcon image={img} fallback="·" size={21} />
                              </span>
                            ))}
                          {matExtra > 0 && <span className={styles.extraBadge}>+{matExtra}</span>}
                        </span>
                      )}
                    </button>
                  );
                }

                const data = buildDay(log, key, selChar);
                const shown = data ? data.icons.slice(0, 3) : [];
                const extra = data ? data.icons.length - shown.length : 0;
                // 균열/전선 → 날짜 숫자를 채우는 동그라미 색 (일반/휴게/PC방 상태색), 숫자는 흰색
                const chaosFill = data?.chaos ? (DAILY_COLORS[data.chaos.value] || CHECKED_GREEN) : null;
                return (
                  <button
                    key={idx}
                    disabled={!data}
                    onClick={() => setSelected(isSel ? null : key)}
                    className={`${styles.cell} ${styles.cellBtn} ${isSel ? styles.cellSel : ''}`}
                  >
                    {chaosFill ? (
                      <span
                        className={styles.dayNumBox}
                        style={{ background: chaosFill, boxShadow: isToday ? `0 0 0 1.5px ${ACCENT}` : undefined }}
                      >
                        {day}
                      </span>
                    ) : isToday ? (
                      <span className={styles.dayNumBox} style={{ background: ACCENT }}>{day}</span>
                    ) : (
                      <span className={`${styles.dayNum} ${data ? styles.dayNumHas : ''}`}>
                        {day}
                        {data ? <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5 L5 9 L9.5 3.2" stroke={CHECKED_GREEN} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                      </span>
                    )}
                    {/* 레이드/주간/공통 — 이미지 스택 (여러 개면 겹침) */}
                    <span className={styles.coversBox}>
                      {shown
                        .map((e, j) => ({ e, j }))
                        .reverse()
                        .map(({ e, j }) => (
                          <span key={e.id} className={styles.coverItem} style={{ left: j * 4, top: j * 4, zIndex: 3 - j }}>
                            <MiniIcon image={e.image} fallback={e.label[0]} size={21} />
                          </span>
                        ))}
                      {extra > 0 && <span className={styles.extraBadge}>+{extra}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 선택한 날 상세 */}
            {mode === 'gold' && selectedVal ? (
              <div className={styles.detail}>
                <div className={styles.detailHeader}>
                  <span className={styles.detailTitle}>{viewMonth + 1}월 {Number(selected!.slice(8))}일</span>
                  {!!selChar && <span className={styles.detailChar}>{selChar}</span>}
                  <span style={{ flex: 1 }} />
                  <span className={styles.detailGoldTotal}>{fmtAmount(selectedVal.goldFree + selectedVal.goldBound)}G</span>
                </div>
                <div className={styles.goldRows}>
                  {selectedGoldRows.map(({ id, e, v }) => (
                    <div key={id} className={styles.goldRow}>
                      <span className={styles.goldRowLabel}>{e.label}</span>
                      {v!.goldFree !== 0 && (
                        <span className={styles.goldRowVal}>
                          <NextImage src="/gold.webp" alt="일반" width={12} height={12} unoptimized />
                          <span style={{ color: v!.goldFree > 0 ? undefined : '#ef4444' }}>{fmtAmount(v!.goldFree)}</span>
                        </span>
                      )}
                      {v!.goldBound !== 0 && (
                        <span className={styles.goldRowVal} style={{ color: BOUND_GOLD_COLOR }}>
                          <NextImage src="/gold.webp" alt="귀속" width={12} height={12} unoptimized style={{ filter: BOUND_GOLD_FILTER }} />
                          <span>{fmtAmount(v!.goldBound)}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : mode === 'mats' && selectedVal ? (
              /* 선택한 날 상세 — 재료 모드: 그 날 재료 수급량 */
              <div className={styles.detail}>
                <div className={styles.detailHeader}>
                  <span className={styles.detailTitle}>{viewMonth + 1}월 {Number(selected!.slice(8))}일</span>
                  {!!selChar && <span className={styles.detailChar}>{selChar}</span>}
                </div>
                <div className={styles.matWrap}>
                  {sortedMats(selectedVal.mats).map(([img, amt]) => (
                    <span key={img} className={styles.matWrapItem}>
                      <MiniIcon image={img} fallback="·" size={18} />
                      <span className={styles.matAmount}>×{fmtAmount(amt)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : mode === 'log' && selectedDay ? (
              <div className={styles.detail}>
                <div className={styles.detailHeader}>
                  <span className={styles.detailTitle}>{viewMonth + 1}월 {Number(selected!.slice(8))}일</span>
                  {!!selChar && <span className={styles.detailChar}>{selChar}</span>}
                  <span className={styles.detailCount}>{selectedDay.entries.length}개 완료</span>
                </div>
                <div className={styles.spreadRow}>
                  {selectedDay.entries.map(e => {
                    const isDaily = e.kind === 'daily';
                    const chipColor = isDaily ? (DAILY_COLORS[e.value] || CHECKED_GREEN) : CHECKED_GREEN;
                    const chipLabel = isDaily ? (DAILY_LABELS[e.value] || '완료') : '완료';
                    return (
                      <div key={e.id} className={styles.spreadItem}>
                        <span
                          className={styles.bigIcon}
                          style={{ borderColor: isDaily ? chipColor : 'var(--border-color)', borderWidth: isDaily ? 2 : 1 }}
                        >
                          {e.image ? (
                            <NextImage src={e.image} alt={e.label} width={52} height={52} unoptimized loading="lazy" style={{ objectFit: 'cover', width: 52, height: 52 }} />
                          ) : (
                            <span className={styles.bigIconFallback}>{e.label[0]}</span>
                          )}
                        </span>
                        <span className={styles.spreadLabel}>{e.label}</span>
                        {!e.charName && <span className={styles.spreadCommon}>공통</span>}
                        <span className={styles.chip} style={{ background: `${chipColor}22`, color: chipColor }}>{chipLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={styles.hintWrap}>
                {mode === 'gold'
                  ? '골드가 표시된 날짜를 누르면 출처별 내역이 보여요'
                  : mode === 'mats'
                    ? '재료가 표시된 날짜를 누르면 그 날 수급량이 보여요'
                    : '체크 표시가 있는 날짜를 누르면 그 날 완료한 숙제가 보여요'}
              </div>
            )}

            {/* 월 합계 — 골드/재료 모드 (한 달치 정산) */}
            {mode !== 'log' && monthVal && (
              <div className={styles.monthSum}>
                <div className={styles.monthSumHeader}>
                  <span className={styles.monthSumTitle}>{viewMonth + 1}월 합계</span>
                  {!!selChar && <span className={styles.detailChar}>{selChar}</span>}
                  <span style={{ flex: 1 }} />
                  {mode === 'gold' && (
                    <span className={styles.detailGoldTotal}>{fmtAmount(monthVal.total.goldFree + monthVal.total.goldBound)}G</span>
                  )}
                </div>
                {mode === 'gold' ? (
                  <div className={styles.monthSumGold}>
                    <span className={styles.goldRowVal}>
                      <NextImage src="/gold.webp" alt="일반" width={13} height={13} unoptimized />
                      <span>{fmtAmount(monthVal.total.goldFree)}</span>
                      <span className={styles.goldRowUnit}>유통</span>
                    </span>
                    <span className={styles.goldRowVal} style={{ color: BOUND_GOLD_COLOR }}>
                      <NextImage src="/gold.webp" alt="귀속" width={13} height={13} unoptimized style={{ filter: BOUND_GOLD_FILTER }} />
                      <span>{fmtAmount(monthVal.total.goldBound)}</span>
                      <span className={styles.goldRowUnit} style={{ color: BOUND_GOLD_COLOR }}>귀속</span>
                    </span>
                  </div>
                ) : monthVal.total.mats.size > 0 ? (
                  <div className={styles.matWrap}>
                    {sortedMats(monthVal.total.mats).map(([img, amt]) => (
                      <span key={img} className={styles.matWrapItem}>
                        <MiniIcon image={img} fallback="·" size={18} />
                        <span className={styles.matAmount}>×{fmtAmount(amt)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className={styles.monthSumEmpty}>이 달에는 기록이 없어요</div>
                )}
              </div>
            )}
          </>
        )}

        {/* 모드 바 — 기록/골드/재료 */}
        <div className={styles.modeBar}>
          {MODES.map(([m, label]) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnOn : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
