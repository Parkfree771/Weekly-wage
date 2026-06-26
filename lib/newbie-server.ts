// 뉴비 추천 직업 투표 — 서버 전용 (Neon).
// 단순 다중선택: 계정(uid)당 1표, 한 표에 직업 여러 개 추천 가능.
// 재제출 시 기존 추천 전체 교체(delete-then-insert).
// 테이블은 Neon 콘솔에서 수동 생성 (레포에 마이그레이션 없음):
//   CREATE TABLE IF NOT EXISTS newbie_rec_votes (
//     uid        text NOT NULL,
//     class_id   text NOT NULL,
//     created_at timestamptz NOT NULL DEFAULT now(),
//     PRIMARY KEY (uid, class_id)
//   );
//   CREATE INDEX IF NOT EXISTS idx_newbie_rec_class ON newbie_rec_votes (class_id);
import { sql } from './neon';
import { TIER_CLASSES } from './tier-data';

const VALID_IDS = new Set(TIER_CLASSES.map((c) => c.id));

// 내가 추천한 직업 id 목록 (재진입 프리필)
export async function getMyNewbieRecs(uid: string): Promise<string[]> {
  const rows = (await sql`
    SELECT class_id FROM newbie_rec_votes WHERE uid = ${uid}
  `) as { class_id: string }[];
  return rows.map((r) => r.class_id).filter((id) => VALID_IDS.has(id));
}

// 추천 저장 (기존 것 전체 교체 = 계정당 1표)
export async function saveNewbieRecs(uid: string, ids: string[]): Promise<number> {
  const valid = Array.from(new Set(ids)).filter((id) => VALID_IDS.has(id));

  const queries: ReturnType<typeof sql>[] = [
    sql`DELETE FROM newbie_rec_votes WHERE uid = ${uid}`,
  ];
  for (const id of valid) {
    queries.push(
      sql`INSERT INTO newbie_rec_votes (uid, class_id) VALUES (${uid}, ${id})`
    );
  }
  await sql.transaction(queries);
  return valid.length;
}

// 직업별 추천 수 집계 (내림차순)
export async function getNewbieCounts(): Promise<{ id: string; count: number }[]> {
  const rows = (await sql`
    SELECT class_id, count(*)::int AS cnt
    FROM newbie_rec_votes
    GROUP BY class_id
    ORDER BY cnt DESC, class_id ASC
  `) as { class_id: string; cnt: number }[];
  return rows
    .filter((r) => VALID_IDS.has(r.class_id))
    .map((r) => ({ id: r.class_id, count: r.cnt }));
}

// 참여 인원 (계정 수)
export async function getNewbieVoterTotal(): Promise<number> {
  const rows = (await sql`
    SELECT count(DISTINCT uid)::int AS n FROM newbie_rec_votes
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}
