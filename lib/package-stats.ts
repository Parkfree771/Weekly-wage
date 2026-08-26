// 패키지 게시판 상호작용 집계(조회수·따봉·흠) — Neon `package_stats` 테이블.
//
// 왜 Firestore 문서 카운터에서 뺐나:
// 갤러리·상세는 ISR(5분 스냅샷)이라 문서에 박힌 숫자는 재생성 전까지 남의 표가 안 보였다.
// Firestore 로 "화면 뜰 때마다 최신값" 을 하면 카드 수만큼 읽기가 나간다 — Neon 은 IN 쿼리 1회.
//
// 비용 원칙:
// - HTTP 드라이버(fetch 1회, 커넥션 풀 없음) — Netlify 함수와 궁합, firebase-admin 초기화 비용 없음.
// - 쓰기는 upsert 1문장(RETURNING 으로 최신값까지) — 라우트당 왕복 1회.
// - 읽기는 /api/package/stats 가 CDN 에 짧게 캐시돼 같은 페이지 방문자끼리 공유한다.
// - 행 수 = 글 수(투표자 저장 안 함). 1글 1표 진실은 그대로 httpOnly 쿠키.
import { neon } from '@neondatabase/serverless';

export type PackageStats = { viewCount: number; likeCount: number; sosoCount: number };

let client: ReturnType<typeof neon> | null = null;
function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

type Row = { post_id: string; view_count: number; like_count: number; soso_count: number };
const toStats = (r: Row): PackageStats => ({
  viewCount: Number(r.view_count),
  likeCount: Number(r.like_count),
  sosoCount: Number(r.soso_count),
});

/** 여러 글의 집계를 한 번에. 행이 없는 글은 결과에서 빠진다(= 0 취급) */
export async function readPackageStats(ids: string[]): Promise<Record<string, PackageStats>> {
  if (ids.length === 0) return {};
  const rows = (await sql()`
    SELECT post_id, view_count, like_count, soso_count
    FROM package_stats
    WHERE post_id = ANY(${ids})
  `) as Row[];
  const out: Record<string, PackageStats> = {};
  for (const r of rows) out[r.post_id] = toStats(r);
  return out;
}

/**
 * 증감 적용 + 최신값 반환(왕복 1회). 전부 0 이면 읽기만 한다.
 * 행이 없으면 만든다 — 반응 기능 이전 글도 첫 상호작용에서 자연히 생긴다.
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
    return got[postId] ?? { viewCount: 0, likeCount: 0, sosoCount: 0 };
  }
  const rows = (await sql()`
    INSERT INTO package_stats (post_id, view_count, like_count, soso_count)
    VALUES (${postId}, ${Math.max(0, v)}, ${Math.max(0, l)}, ${Math.max(0, s)})
    ON CONFLICT (post_id) DO UPDATE SET
      view_count = GREATEST(0, package_stats.view_count + ${v}),
      like_count = GREATEST(0, package_stats.like_count + ${l}),
      soso_count = GREATEST(0, package_stats.soso_count + ${s}),
      updated_at = now()
    RETURNING post_id, view_count, like_count, soso_count
  `) as Row[];
  return toStats(rows[0]);
}
