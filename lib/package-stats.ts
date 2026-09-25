// 패키지 게시판 상호작용 집계(조회수·따봉·흠) — Firestore `packageStats/all` 문서 1개.
//
// 구조: { [postId]: { view, like, soso, updatedAt } } — 모든 글의 숫자를 문서 하나에 모은다.
// 어디서 읽든(갤러리 전체든 글 하나든) 읽기 1회라, 글 수·방문자 수가 늘어도 읽기가 늘지 않는다.
//
// 왜 Neon 에서 돌아왔나 (2026-09-25):
// Neon 무료 플랜은 "깨어 있는 시간"으로 과금한다. 5분 안에 요청이 한 번만 와도 계속 깨어 있어서,
// 방문자가 꾸준한 게시판은 최적화와 무관하게 월 한도(100 CU-시간)를 넘겼다(9/25 소진).
// Firestore 는 읽기·쓰기 횟수 과금이라 이 사이트 규모에서는 무료 한도 안에서 끝난다.
//
// 무결성: 이 문서는 서버(Admin SDK)만 쓴다. 브라우저·앱은 /api/package/* 응답만 받는다.
// 콘솔 보안 규칙에서 packageStats 쓰기를 허용하지 말 것(Admin SDK 는 규칙과 무관하게 쓴다).
//
// 비용 원칙:
// - 읽기: 문서 1회. /api/package/stats 는 CDN durable 300초, ISR 은 재생성 때만 — 방문자 수와 무관.
// - 쓰기: 행동 1번 = 트랜잭션 1회(읽기 1 + 쓰기 1). 최신값을 정확히 돌려줘야 화면이 서버 값으로 되맞춰진다.
// - 한 문서의 지속 쓰기 한계는 초당 1회 정도다 — 지금 트래픽(하루 수백 회)의 수백 배 여유.
import { FieldPath } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin';

// updatedAt = 이 글의 숫자가 마지막으로 바뀐 시각(epoch ms). 클라이언트가 스냅샷의 신선도를 비교하는 데 쓴다 —
// /api/package/stats 는 CDN 에 300초 캐시되므로, 방금 내 표가 반영된 값보다 낡은 응답이 나중에 도착할 수 있다.
// 그때 이 값이 작으면 클라이언트가 버린다(내 표가 잠깐 사라졌다 돌아오는 현상 방지).
// 그래서 이 값은 글마다 절대 줄어들면 안 된다 — 쓸 때 max(지금, 이전 + 1) 로 기록한다.
export type PackageStats = { viewCount: number; likeCount: number; sosoCount: number; updatedAt: number };

type Entry = { view?: number; like?: number; soso?: number; updatedAt?: number };

const statsDoc = () => getAdminFirestore().collection('packageStats').doc('all');

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const toStats = (e: Entry): PackageStats => ({
  viewCount: Math.max(0, num(e.view)),
  likeCount: Math.max(0, num(e.like)),
  sosoCount: Math.max(0, num(e.soso)),
  updatedAt: num(e.updatedAt),
});

const isEntry = (v: unknown): v is Entry => !!v && typeof v === 'object';

/** 여러 글의 집계를 한 번에(문서 읽기 1회). 기록이 없는 글은 결과에서 빠진다(= 0 취급) */
export async function readPackageStats(ids: string[]): Promise<Record<string, PackageStats>> {
  if (ids.length === 0) return {};
  const snap = await statsDoc().get();
  const data = snap.data() || {};
  const out: Record<string, PackageStats> = {};
  for (const id of ids) {
    const e = data[id];
    if (isEntry(e)) out[id] = toStats(e);
  }
  return out;
}

/**
 * 증감 적용 + 최신값 반환(트랜잭션 1회). 전부 0 이면 읽기만 한다.
 * 기록이 없는 글이면 새로 만든다 — 새 글도 첫 상호작용에서 자연히 생긴다.
 * 숫자는 0 아래로 내려가지 않는다(취소가 중복으로 들어와도 음수 방지).
 */
export async function bumpPackageStats(
  postId: string,
  delta: { view?: number; like?: number; soso?: number },
): Promise<PackageStats> {
  const v = delta.view ?? 0;
  const l = delta.like ?? 0;
  const s = delta.soso ?? 0;
  if (v === 0 && l === 0 && s === 0) {
    const got = await readPackageStats([postId]);
    return got[postId] ?? { viewCount: 0, likeCount: 0, sosoCount: 0, updatedAt: 0 };
  }
  const ref = statsDoc();
  return getAdminFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    // FieldPath 로 읽는다 — 글 ID 를 필드 경로 문법으로 해석하지 않게
    const raw = snap.exists ? snap.get(new FieldPath(postId)) : undefined;
    const cur = toStats(isEntry(raw) ? raw : {});
    const next: PackageStats = {
      viewCount: Math.max(0, cur.viewCount + v),
      likeCount: Math.max(0, cur.likeCount + l),
      sosoCount: Math.max(0, cur.sosoCount + s),
      updatedAt: Math.max(Date.now(), cur.updatedAt + 1),
    };
    const entry: Entry = { view: next.viewCount, like: next.likeCount, soso: next.sosoCount, updatedAt: next.updatedAt };
    tx.set(ref, { [postId]: entry }, { merge: true });
    return next;
  });
}

/**
 * ISR 서버 페이지용 — 글 목록에 최신 집계를 입힌다.
 *
 * 글 문서의 viewCount·likeCount·sosoCount 는 2026-08-26 시점 값에서 멈춰 있다(그 뒤로는 집계가 따로 산다).
 * 그대로 내려보내면 첫 화면이 몇 달 전 숫자로 떴다가 클라이언트 조회가 도착할 때 확 바뀐다
 * (숫자가 사라졌다 나오는 현상). 여기서 갈아 끼우면 HTML 이 처음부터 옳은 값을 들고 나간다.
 *
 * 비용: 문서 읽기 1회 — ISR 재생성 때(구간당 5분에 1번)만 돈다. 방문자당 조회는 0.
 * 실패하면 원본을 그대로 돌려준다 — 화면은 예전과 같이 동작한다.
 */
export async function applyStatsToPosts<
  T extends { id: string; viewCount?: number; likeCount?: number; sosoCount?: number },
>(posts: T[]): Promise<T[]> {
  if (posts.length === 0) return posts;
  try {
    const stats = await readPackageStats(posts.map((p) => p.id));
    return posts.map((p) => {
      const st = stats[p.id];
      // updatedAt 도 같이 보낸다 — 클라이언트가 이 값을 기준으로 낡은 CDN 응답을 걸러낸다
      return st
        ? { ...p, viewCount: st.viewCount, likeCount: st.likeCount, sosoCount: st.sosoCount, statsUpdatedAt: st.updatedAt }
        : p;
    });
  } catch (err) {
    console.error('집계 병합 실패 — 글 문서 값 유지:', err);
    return posts;
  }
}
