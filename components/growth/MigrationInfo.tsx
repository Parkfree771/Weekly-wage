'use client';
/* eslint-disable @next/next/no-img-element */

// 이관 미리보기 "기준" 말풍선 — 등급표 옆 버튼을 누르면 그 등급이 어떻게 정해지는지 표로 보여준다.
// 내 캐릭에 해당하는 줄은 색을 채워 짚는다. 표 내용은 migration.ts 의 규칙 표를 그대로 쓴다.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './GrowthMigration.module.css';
import { GRADES, itemLevelOf } from './growthData';
import { ENGRAVING_ICONS } from '@/lib/engraving-icons.generated';
import {
  LEVEL_TABLE, LOW_LEVEL_TABLE, ESTHER_TABLE, DEALER_RULE, SUPPORT_RULE, DEALER_ENGRAVINGS, SUPPORT_ENGRAVINGS,
} from './migration';
import { GRADE_COLORS, ESTHER_COLOR, RANK_COLORS, VALUE_COLORS, tierColor } from './migrationColors';

// ---------- 말풍선 ----------
// 버튼을 누르면 열리고, 바깥을 누르거나 Esc 로 닫힌다. align='right' 면 오른쪽 끝에 맞춰 연다
export function Info({ title, align, children }: { title: string; align?: 'right'; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <span ref={ref} className={styles.info}>
      <button
        type="button"
        className={`${styles.infoBtn} ${open ? styles.infoBtnOn : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        기준
      </button>
      {open && (
        <div className={`${styles.infoPanel} ${align === 'right' ? styles.infoRight : ''}`} role="dialog" aria-label={title}>
          <div className={styles.infoHead}>
            <b>{title}</b>
            <button type="button" className={styles.infoClose} onClick={() => setOpen(false)} aria-label="닫기">✕</button>
          </div>
          {children}
        </div>
      )}
    </span>
  );
}

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return <span className={styles.badge} style={{ background: color }}>{children}</span>;
}
const mineCls = (on: boolean) => (on ? styles.infoMine : undefined);

// ---------- 장비 레벨 → 등급 · 연마 ----------
// rows = 내 캐릭 장비가 걸린 줄 번호(LEVEL_TABLE 순서), lowRows = 티어 1~3 표 줄 번호. 높은 구간이 위
export function LevelInfo({ rows, lowRows, pairs }: { rows: Set<number>; lowRows: Set<number>; pairs?: boolean }) {
  const low = LOW_LEVEL_TABLE.map((r, i) => ({ i, lo: r[0], hi: LOW_LEVEL_TABLE[i + 1]?.[0] ?? 1600, name: r[1], level: r[2] })).reverse();
  const list = LEVEL_TABLE.map((r, i) => ({ i, lo: r[0], hi: LEVEL_TABLE[i + 1]?.[0] ?? 1800, grade: r[1], polish: r[2] })).reverse();
  return (
    <>
      {pairs && (
        <table className={styles.infoTable}>
          <thead><tr><th>받는 칸</th><th>어느 부위 레벨로</th></tr></thead>
          <tbody>
            <tr><td>목걸이</td><td>투구</td></tr>
            <tr><td>귀걸이 · 귀걸이</td><td>견갑 · 상의</td></tr>
            <tr><td>반지 · 반지</td><td>하의 · 장갑</td></tr>
            <tr><td>팔찌 · 성물 · 인장</td><td>무기</td></tr>
          </tbody>
        </table>
      )}
      <table className={styles.infoTable}>
        <thead><tr><th>지금 레벨</th><th>받는 장비</th><th>2부 레벨</th></tr></thead>
        <tbody>
          {list.map(r => {
            const lv = itemLevelOf(r.grade, r.polish);
            return (
              <tr key={r.i} className={mineCls(rows.has(r.i))}>
                <td>{r.lo} 초과 ~ {r.hi} 이하</td>
                <td><Badge color={GRADE_COLORS[r.grade]}>{GRADES[r.grade]}</Badge> {r.polish}연마</td>
                <td><b>{lv}</b>{lv > r.hi && <em className={styles.infoPlus}>+{lv - r.hi}</em>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.infoSub}>장비마다 자기 아이템 레벨로 정해요. 1770 초과부터는 레벨이 더 올라가요(+표시). 아래는 1600 이하 (연마 0)</p>
      <table className={styles.infoTable}>
        <thead><tr><th>지금 레벨</th><th>받는 장비</th><th>2부 레벨</th></tr></thead>
        <tbody>
          {low.map(r => (
            <tr key={r.i} className={mineCls(lowRows.has(r.i))}>
              <td>{r.lo} 초과 ~ {r.hi} 이하</td>
              <td>{r.name}</td>
              <td><b>{r.level}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ---------- 슬롯 재련 ----------
// slots = 내 칸들(지금 강화 → 슬롯 재련). 에스더 무기를 낀 캐릭만 에스더 표를 붙인다
// esther = 내 에스더 무기 키("10-3" = 진화 10단계 · 엘라 3)
export function RefineInfo({ slots, esther }: { slots: { label: string; now: string; refine: number }[]; esther?: string }) {
  // 공지 표 순서 그대로 아래부터 → 높은 단계가 위
  const rows = Object.entries(ESTHER_TABLE).reverse();
  return (
    <>
      <table className={styles.infoTable}>
        <thead><tr><th>칸</th><th>지금</th><th>슬롯 재련</th></tr></thead>
        <tbody>
          {slots.map(s => (
            <tr key={s.label}>
              <td>{s.label}</td>
              <td>{s.now}</td>
              <td><b>{s.refine}단계</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.infoSub}>지금 강화 단계가 같은 부위 슬롯 재련으로 그대로 넘어가요. 완갑도 그대로, 허리띠는 새 칸이라 0단계부터. 장인의 기운도 같은 수치로 남아요</p>
      {esther && <>
        <table className={styles.infoTable}>
          <thead><tr><th>에스더 무기</th><th>받는 무기</th><th>슬롯 재련</th><th>환급 (귀속)</th></tr></thead>
          <tbody>
            {rows.map(([k, v]) => {
              const [evo, ella] = k.split('-');
              return (
                <tr key={k} className={mineCls(esther === k)}>
                  <td>{evo}단계{ella !== '0' && ` 엘라 ${ella}`} · {v.from}</td>
                  <td><Badge color={ESTHER_COLOR}>엘라 {v.ella}</Badge> {v.polish ? `${v.polish}연마 ` : ''}{v.level}</td>
                  <td><b>{v.refine}단계</b></td>
                  <td>{v.essence ? `기운 ${v.essence} · 키트 ${v.kit.toLocaleString('ko-KR')}` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={styles.infoSub}>환급 = 에스더의 기운 · 로맨틱 재료 키트. 쓴 재료와 바뀐 뒤 그 단계까지 필요한 재료의 차이만큼. 2부 에스더 무기는 연마로 성장하고, 연마하면 아이템 레벨과 무기 슬롯 재련 단계가 같이 올라요</p>
      </>}
    </>
  );
}

// ---------- 장신구 → 주문서 ----------
const optText = (k: string) => k.replace(/%$/, ' %');
export function ScrollInfo({ mine }: { mine: Set<string> }) {
  const main: [string, number][] = [['상상상', 1], ['상상중', 2], ['상상', 3], ['상중', 4], ['상하', 5], ['중중 이하', 6]];
  const parts = ['목걸이', '귀걸이', '반지'];
  return (
    <>
      <table className={styles.infoTable}>
        <thead><tr><th>유효 옵션 상중하</th><th>주문서</th></tr></thead>
        <tbody>
          {main.map(([p, n]) => (
            <tr key={p} className={mineCls(mine.has(String(n)))}>
              <td><b>{p}</b></td>
              <td><Badge color={RANK_COLORS[n - 1]}>{n}등급</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.infoSub}>4티어 고대 · 품질 67 이상. 3옵션은 상상상 · 상상중일 때만 본다. 서폿 귀걸이는 한 칸씩 낮음(상상상 최대 생명력 2등급 · 보호막/회복 3등급 · 상상중 4 · 상상 5 · 상중 이하 6) · 4티어 유물은 서폿 목걸이 · 반지 상상만 5등급</p>
      <p className={styles.infoSub}>유효 옵션이 없거나 품질 67 미만 → 연마 단계에 따라 영롱한 보석 파편(실링으로 교환). 티어 3 이하 → 제거. 주문서 거래 횟수는 지금 장신구 그대로</p>
      <table className={styles.infoTable}>
        <thead><tr><th>부위</th><th>앞 두 자리 (1 · 2옵션)</th><th>끝자리 (3옵션)</th></tr></thead>
        <tbody>
          {parts.map(p => (
            <tr key={`d-${p}`}>
              <td>딜러 {p}</td>
              <td>{DEALER_RULE[p].main.map(optText).join(' · ')}</td>
              <td>{DEALER_RULE[p].third.map(optText).join(' · ')} +</td>
            </tr>
          ))}
          {parts.map(p => (
            <tr key={`s-${p}`}>
              <td>서폿 {p}</td>
              <td>{SUPPORT_RULE[p].main.map(optText).join(' · ')}</td>
              <td>{SUPPORT_RULE[p].third.map(optText).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ---------- 팔찌 티어 ----------
export function TierInfo({ list, active }: { list: [string, string[]][]; active: Set<string> }) {
  return (
    <table className={styles.infoTable}>
      <thead><tr><th>티어</th><th>옵션</th></tr></thead>
      <tbody>
        {list.map(([t, opts]) => (
          <tr key={t} className={mineCls(active.has(t))}>
            <td><Badge color={tierColor(t)}>{t}</Badge></td>
            <td>{opts.map(o => <div key={o}>{o}</div>)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- 상 · 중 · 하 ----------
export function ValueInfo({ active }: { active: Set<string> }) {
  const rows: [string, string][] = [['상', '툴팁 주황 글자'], ['중', '툴팁 보라 글자'], ['하', '툴팁 파랑 글자']];
  return (
    <>
      <table className={styles.infoTable}>
        <thead><tr><th>수치</th><th>게임에서 보이는 색</th></tr></thead>
        <tbody>
          {rows.map(([v, t]) => (
            <tr key={v} className={mineCls(active.has(v))}>
              <td><Badge color={VALUE_COLORS[v]}>{v}</Badge></td>
              <td>{t}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.infoSub}>같은 티어라도 상이 하보다 성능이 높다. 줄마다 점수를 더해 1~21등급 (점수표는 아직 미공개)</p>
    </>
  );
}

// ---------- 스톤 → 각인 슬롯 ----------
const STONE_ROWS: { key: string; label: string; result: string }[] = [
  { key: '8', label: '8 (4+4)', result: '5칸 7단계 + 추가 아이템' },
  { key: '7', label: '7 (4+3)', result: '5칸 7단계' },
  { key: '6-3', label: '6 (3+3)', result: '4칸 7단계' },
  { key: '6-4', label: '6 (4+2)', result: '3칸 7단계' },
  { key: '5', label: '5 (4+1 · 3+2)', result: '2칸 7단계' },
  { key: '4-3', label: '4 (3+1)', result: '1칸 5단계' },
  { key: '4-2', label: '4 (2+2)', result: '1칸 3단계' },
];
// points · hi(두 각인 중 높은 레벨) → 표의 줄
export const stoneRowKey = (points: number, hi: number) =>
  points >= 8 ? '8' : points === 7 ? '7' : points === 5 ? '5' : points === 6 || points === 4 ? `${points}-${hi}` : '';

function EngList({ names }: { names: string[] }) {
  return (
    <div className={styles.infoEngs}>
      {names.map(n => (
        <span key={n}>{ENGRAVING_ICONS[n] && <img src={ENGRAVING_ICONS[n]} alt="" />}{n}</span>
      ))}
    </div>
  );
}
export function StoneInfo({ mine }: { mine: string }) {
  return (
    <>
      <table className={styles.infoTable}>
        <thead><tr><th>스톤 각인 레벨 합</th><th>각인 슬롯</th></tr></thead>
        <tbody>
          {STONE_ROWS.map(r => (
            <tr key={r.key} className={mineCls(mine === r.key)}>
              <td>{r.label}</td>
              <td><b>{r.result}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.infoSub}>세공 완료 · 증가 각인 두 개가 유효 각인일 때만. 딜러는 딜러 각인 2개, 서포터(바드 · 홀리나이트 · 도화가 · 발키리)는 서폿 각인 2개 또는 딜러 각인 2개. 각성은 양쪽 다 유효. 감소 효과는 상관없음. 여러 개면 합이 가장 높은 스톤 하나</p>
      <p className={styles.infoSub}>각인 슬롯에 안 들어간 세공 완료 스톤: 유효 조합 5포인트 이상 → 장신구 슬롯 성장 재료, 유효 조합 4포인트 → 초월의 가루. 미세공 · 유효하지 않은 조합 → 초월의 가루</p>
      <b className={styles.infoLabel}>딜러 유효 각인</b>
      <EngList names={DEALER_ENGRAVINGS} />
      <b className={styles.infoLabel}>서폿 유효 각인</b>
      <EngList names={SUPPORT_ENGRAVINGS} />
    </>
  );
}
