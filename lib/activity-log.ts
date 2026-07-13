// 숙제 활동 기록 (달력용) — 앱 loalogol-app/src/data/weeklyActivityLog.ts 웹 포팅.
// 일일 숙제는 06시, 레이드는 수요일 06시에 초기화되어 "언제 했는지"가 남지 않는다.
// 체크하는 순간 게임일(06시 기준) 날짜별 로그를 남겨 달력에서 과거 기록을 볼 수 있게 한다.
// 저장: 로컬(localStorage) 원본 + users/{uid}.appActivityLog 클라우드 백업 (앱과 동일 pack 포맷 → 웹·앱 공유)
import { getThisWeekWednesday6AM } from '@/types/user';

export type ActivityKind = 'raid' | 'daily' | 'weekly' | 'common';

export type ActivityEntry = {
  label: string;
  image?: string;
  charName?: string;
  kind: ActivityKind;
  /**
   * 체크 값 — 종류별 인코딩 (월간 정산이 골드/재료를 정확히 역산할 수 있도록 토글 상태를 담는다)
   * · daily: 1 일반 / 2 휴게 / 3 PC방 / 4 PC방+휴게
   * · raid: 1 + (골드 미획득이면 +2) + (더보기면 +4)  — 구버전 1 = 골드 획득·더보기 없음
   * · weekly(모래시계): 2 + 보상강화레벨(0~5) + (1750 티어면 +8)  — 구버전 1 = 레벨0·티어 추정
   * · weekly(낙원): 1
   * · common(카게/필보): 2 = 1730 티어, 3 = 1750 티어  — 구버전 1 = 현재 레벨로 추정
   */
  value: number;
};

// ─── value 인코딩/디코딩 (앱과 동일 규칙 — 절대 변경 금지) ───

export function encodeRaidLogValue(noGold: boolean, more: boolean): number {
  return 1 + (noGold ? 2 : 0) + (more ? 4 : 0);
}
export function decodeRaidLogValue(value: number): { noGold: boolean; more: boolean } {
  return { noGold: (value & 2) !== 0, more: (value & 4) !== 0 };
}

export function encodeSandLogValue(level: number, is1750: boolean): number {
  return 2 + Math.min(5, Math.max(0, level)) + (is1750 ? 8 : 0);
}
export function decodeSandLogValue(value: number, fallbackMaxLevel: number): { level: number; is1750: boolean } {
  if (value <= 1) return { level: 0, is1750: fallbackMaxLevel >= 1750 }; // 구버전 기록
  const raw = value - 2;
  return { level: Math.min(5, raw & 7), is1750: raw >= 8 };
}

export function encodeCommonLogValue(is1750: boolean): number {
  return is1750 ? 3 : 2;
}
/** @returns 1750 티어 여부 */
export function decodeCommonLogValue(value: number, fallbackMaxLevel: number): boolean {
  if (value >= 2) return value >= 3;
  return fallbackMaxLevel >= 1750; // 구버전 기록
}

/** dateKey(YYYY-MM-DD, 게임일 = KST 06시 경계) → entryId → entry */
export type ActivityLog = Record<string, Record<string, ActivityEntry>>;

const STORAGE_KEY = 'weekly-activity-log-v1';
const KEEP_DAYS = 400;

// KST(+9h)에서 6시간을 빼면 06시 이전이 전날로 넘어간다 → 게임일 날짜
const GAME_OFFSET_MS = (9 - 6) * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function keyOf(realTime: Date): string {
  const t = new Date(realTime.getTime() + GAME_OFFSET_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 오늘(게임일)의 날짜 키 */
export function todayGameDateKey(): string {
  return keyOf(new Date());
}

/** 이번 게임 주(수요일 06시 시작)의 dayIdx(0=수 ~ 6=화)번째 날의 날짜 키 */
export function weekDayDateKey(dayIdx: number): string {
  const start = getThisWeekWednesday6AM();
  return keyOf(new Date(start.getTime() + dayIdx * DAY_MS));
}

export function loadActivityLog(): ActivityLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** 오래된 날짜 정리 후 저장 (실패해도 페이지 동작에는 영향 없음) */
export function persistActivityLog(log: ActivityLog): void {
  if (typeof window === 'undefined') return;
  const cutoff = keyOf(new Date(Date.now() - KEEP_DAYS * DAY_MS));
  let pruned = log;
  const oldKeys = Object.keys(log).filter(k => k < cutoff);
  if (oldKeys.length > 0) {
    pruned = { ...log };
    oldKeys.forEach(k => { delete pruned[k]; });
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // 저장 실패는 무시 (다음 저장에서 재시도)
  }
}

/** entry를 기록(덮어쓰기)하거나 null이면 제거한 새 로그 반환 */
export function withActivity(
  log: ActivityLog,
  dateKey: string,
  id: string,
  entry: ActivityEntry | null,
): ActivityLog {
  const day = { ...(log[dateKey] || {}) };
  if (entry) day[id] = entry;
  else delete day[id];
  const next = { ...log };
  if (Object.keys(day).length > 0) next[dateKey] = day;
  else delete next[dateKey];
  return next;
}

/** 주간 초기화 항목(레이드·모래시계·낙원) 체크 해제 시: 이번 주 전체에서 해당 id 제거 */
export function withActivityRemovedThisWeek(log: ActivityLog, id: string): ActivityLog {
  const weekStart = weekDayDateKey(0);
  let next = log;
  Object.keys(log).forEach(dateKey => {
    if (dateKey >= weekStart && log[dateKey][id]) {
      next = withActivity(next, dateKey, id, null);
    }
  });
  return next;
}

// ─── 클라우드 백업 (users/{uid}.appActivityLog 문자열 필드 — 앱과 동일 포맷) ───
// 라벨/이미지/캐릭터명이 매일 반복되므로 사전(dict)으로 빼고
// 날짜별로 «사전 인덱스: 체크값»만 저장해 용량을 줄인다 (400일 ≈ 100KB).
// Firestore 문서 1MB 한도를 위해 packActivityLog는 크기가 넘치면 보관 일수를 줄여 재시도한다.

type PackedDictEntry = { id: string; l: string; i?: string; c?: string; k: ActivityKind };
type PackedLog = { v: 1; dict: PackedDictEntry[]; days: Record<string, Record<string, number>> };

const PACK_SIZE_LIMIT = 700_000; // 문서 내 다른 필드(체크리스트·골드 기록) 몫을 남긴 여유치
const PACK_DAY_STEPS = [400, 180, 90];

function packWithCutoff(log: ActivityLog, keepDays: number): string {
  const cutoff = keyOf(new Date(Date.now() - keepDays * DAY_MS));
  const dict: PackedDictEntry[] = [];
  const dictIdx = new Map<string, number>();
  const days: Record<string, Record<string, number>> = {};
  Object.keys(log).sort().forEach(dateKey => {
    if (dateKey < cutoff) return;
    const packedDay: Record<string, number> = {};
    Object.entries(log[dateKey]).forEach(([id, e]) => {
      const key = [id, e.label, e.image || '', e.charName || '', e.kind].join('|');
      let idx = dictIdx.get(key);
      if (idx === undefined) {
        idx = dict.length;
        dict.push({
          id, l: e.label, k: e.kind,
          ...(e.image ? { i: e.image } : {}),
          ...(e.charName ? { c: e.charName } : {}),
        });
        dictIdx.set(key, idx);
      }
      packedDay[String(idx)] = e.value;
    });
    if (Object.keys(packedDay).length > 0) days[dateKey] = packedDay;
  });
  const packed: PackedLog = { v: 1, dict, days };
  return JSON.stringify(packed);
}

/** 클라우드 업로드용 직렬화 (크기 초과 시 보관 일수를 줄여 재시도) */
export function packActivityLog(log: ActivityLog): string {
  for (const days of PACK_DAY_STEPS) {
    const raw = packWithCutoff(log, days);
    if (raw.length <= PACK_SIZE_LIMIT) return raw;
  }
  return packWithCutoff(log, PACK_DAY_STEPS[PACK_DAY_STEPS.length - 1]);
}

/** 클라우드 문자열 → ActivityLog (형식이 안 맞으면 null) */
export function unpackActivityLog(raw: string | null | undefined): ActivityLog | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const p = JSON.parse(raw) as PackedLog;
    if (!p || p.v !== 1 || !Array.isArray(p.dict) || !p.days || typeof p.days !== 'object') return null;
    const log: ActivityLog = {};
    Object.entries(p.days).forEach(([dateKey, day]) => {
      if (!day || typeof day !== 'object') return;
      const out: Record<string, ActivityEntry> = {};
      Object.entries(day).forEach(([idxStr, value]) => {
        const d = p.dict[Number(idxStr)];
        if (!d || typeof d.id !== 'string') return;
        out[d.id] = {
          label: d.l || '',
          image: d.i || undefined,
          charName: d.c || undefined,
          kind: d.k || 'raid',
          value: typeof value === 'number' && value > 0 ? value : 1,
        };
      });
      if (Object.keys(out).length > 0) log[dateKey] = out;
    });
    return log;
  } catch {
    return null;
  }
}

/** 클라우드 로그를 로컬에 병합 — 로컬 우선, 클라우드는 빈 자리만 채움. 변화 없으면 같은 참조 반환 */
export function mergeCloudActivityLog(local: ActivityLog, cloud: ActivityLog): ActivityLog {
  let next = local;
  Object.entries(cloud).forEach(([dateKey, day]) => {
    Object.entries(day).forEach(([id, entry]) => {
      if (!next[dateKey]?.[id]) next = withActivity(next, dateKey, id, entry);
    });
  });
  return next;
}

// ─── 업로드 중복 방지 캐시 (앱 weeklyStorage.ts pushedLogCache와 동일 역할) ───
// 마지막으로 업로드(또는 다운로드)에 성공한 백업 내용 — 같으면 다음 저장에서 필드를 생략해
// 전송량과 문서 재기록을 줄인다 (새로고침 시 캐시가 비므로 첫 저장은 항상 포함).
const pushedLogCache: Record<string, string> = {};

/** 업로드할 pack 문자열을 반환. 지난 업로드/다운로드와 동일하면 null (생략) */
export function packForUpload(uid: string, log: ActivityLog): string | null {
  if (Object.keys(log).length === 0) return null;
  const packed = packActivityLog(log);
  if (pushedLogCache[uid] === packed) return null;
  return packed;
}

/** 업로드 성공(또는 클라우드에서 내려받음) 시 캐시 갱신 */
export function markLogSynced(uid: string, packed: string): void {
  pushedLogCache[uid] = packed;
}
