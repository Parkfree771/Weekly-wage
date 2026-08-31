// 패키지 집계(조회·따봉·흠) 클라이언트 캐시 — 브라우저 세션 안에서 "지금까지 본 가장 새로운 값" 한 벌.
//
// 왜 필요한가:
// 숫자가 화면에 닿는 경로가 셋이고 신선도가 제각각이다.
//   1) ISR 스냅샷(갤러리·상세 HTML)      — 최대 5분 낡음
//   2) GET /api/package/stats            — CDN 300초 공유 캐시라 최대 5분 낡음
//   3) POST /api/package/react · view    — 캐시 없음, 항상 최신 (내 표가 이미 들어 있다)
// 아무 방어가 없으면 3번으로 올라간 내 표가 잠시 뒤 도착한 1·2번 응답에 덮여 숫자가 되돌아간다.
// (누른 게 안 먹은 것처럼 보이는 그 현상)
//
// 그래서 서버가 같이 내려주는 updated_at(epoch ms)을 버전으로 삼아, 더 낡은 스냅샷은 그냥 버린다.
// 전부 메모리 안에서 끝나므로 네트워크·DB 조회는 1도 늘지 않는다.

export type ClientStats = {
  viewCount: number;
  likeCount: number;
  sosoCount: number;
  /** epoch ms. 서버가 안 주는 낡은 응답이면 0 */
  updatedAt: number;
};

/** 집계를 달고 다니는 글 — 갤러리 카드·상세가 쓰는 최소 모양 */
type StatCarrier = { id: string; viewCount?: number; likeCount?: number; sosoCount?: number };

const store = new Map<string, ClientStats>();

const norm = (raw: unknown): ClientStats | null => {
  const st = raw as Partial<ClientStats> | null;
  if (!st || typeof st.viewCount !== 'number' || typeof st.likeCount !== 'number') return null;
  return {
    viewCount: st.viewCount,
    likeCount: st.likeCount,
    sosoCount: typeof st.sosoCount === 'number' ? st.sosoCount : 0,
    updatedAt: typeof st.updatedAt === 'number' ? st.updatedAt : 0,
  };
};

/**
 * 서버에서 받은 값을 기억한다. 이미 더 새 값을 알고 있으면 무시하고 false 를 준다.
 * 같은 updated_at 은 받아들인다 — 같은 스냅샷을 다시 받은 것뿐이라 값이 같다.
 */
export function recordStats(postId: string, raw: unknown): boolean {
  const st = norm(raw);
  if (!st) return false;
  const prev = store.get(postId);
  if (prev && st.updatedAt < prev.updatedAt) return false;
  store.set(postId, st);
  return true;
}

/** GET /api/package/stats 응답 통째로 기억 */
export function recordManyStats(stats: Record<string, unknown> | null | undefined): void {
  if (!stats) return;
  for (const [id, st] of Object.entries(stats)) recordStats(id, st);
}

export function getStats(postId: string): ClientStats | undefined {
  return store.get(postId);
}

/**
 * 글 목록에 기억해 둔 값을 입힌다 — 값이 실제로 바뀐 글만 새 객체(불필요한 리렌더 방지).
 * 아는 게 없으면 원본을 그대로 돌려주므로 setState 에 그냥 물려도 안전하다.
 */
export function mergeKnownStats<T extends StatCarrier>(posts: T[]): T[] {
  if (store.size === 0) return posts;
  let changed = false;
  const next = posts.map((p) => {
    const st = store.get(p.id);
    if (!st) return p;
    if ((p.viewCount || 0) === st.viewCount && (p.likeCount || 0) === st.likeCount && (p.sosoCount || 0) === st.sosoCount) return p;
    changed = true;
    return { ...p, viewCount: st.viewCount, likeCount: st.likeCount, sosoCount: st.sosoCount };
  });
  return changed ? next : posts;
}

// ─── 변경 알림 ───
// 카드의 ReactionBar 가 표를 올리면 그 글을 그리는 다른 곳(같은 페이지의 상세, 정렬 기준 숫자)도
// 곧바로 같은 숫자를 보게 한다. 네트워크 없이 메모리 이벤트만 돈다.
type Listener = (postId: string, stats: ClientStats) => void;
const listeners = new Set<Listener>();

export function subscribeStats(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** 기억 + 구독자에게 알림 (react/view 응답처럼 확실히 최신인 값에 쓴다) */
export function publishStats(postId: string, raw: unknown): void {
  if (!recordStats(postId, raw)) return;
  const st = store.get(postId);
  if (!st) return;
  for (const fn of listeners) fn(postId, st);
}

// ─── 조회 POST 생략 (재방문자) ───
// 서버의 조회수 중복 방지 쿠키(pv)는 httpOnly 라 클라이언트가 못 읽는다. 그래서 같은 사실을
// localStorage 에 병행 기록해 두고, 24시간 안에 이미 본 글이면 POST /api/package/view 를
// 아예 보내지 않는다 — 어차피 카운트되지 않는 요청이라 함수 호출·Neon 조회만 태우기 때문.
// 생략된 방문의 숫자는 ISR 스냅샷(최대 5분 낡음) + 세션 캐시로 보인다.
// localStorage 를 못 쓰는 환경이면 그냥 보낸다 — 서버 쿠키가 최종 중복 방어다.
const SEEN_KEY = 'pkg-viewed';
const SEEN_TTL_MS = 24 * 60 * 60 * 1000; // 서버 쿠키 COOKIE_MAX_AGE(24h)와 같은 값
const SEEN_MAX = 60; // 서버 쿠키 MAX_TRACKED 와 같은 값 — 비대화 방지

function readSeen(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const alive: Record<string, number> = {};
    for (const [id, at] of Object.entries(parsed)) {
      if (typeof at === 'number' && now - at < SEEN_TTL_MS) alive[id] = at;
    }
    return alive;
  } catch {
    return {};
  }
}

export function wasViewedRecently(postId: string): boolean {
  return postId in readSeen();
}

export function markViewed(postId: string): void {
  try {
    const seen = readSeen();
    seen[postId] = Date.now();
    const entries = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, SEEN_MAX);
    localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // 저장 실패는 무시 — 다음 방문에 POST 가 한 번 더 갈 뿐, 서버 쿠키가 중복 카운트를 막는다
  }
}
