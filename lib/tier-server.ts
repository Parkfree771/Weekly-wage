// 서버 전용: 티어 투표 저장 + 집계 스냅샷 캐시. (API 라우트에서만 import)
import { sql } from './neon';
import {
  TIER_CLASSES,
  scoreTo100,
  rankToTier,
  MIN_VOTES,
  CURRENT_SEASON,
} from './tier-data';

export const STATS_TTL_MS = 30 * 60 * 1000; // 30분 캐시
const SHRINK_M = 10; // 베이지안 shrinkage 표본 가중 (prior=0 중립)

// 유효한 직업 id 집합
const VALID_IDS = new Set(TIER_CLASSES.map((c) => c.id));

// 매치업 점수(1~5) → 평가자의 우위 점수
function advantage(value: number): number {
  return [0, 2, 1, 0, -1, -2][value] ?? 0;
}

export type StatsClass = {
  id: string;
  name: string;
  group: string;
  icon: string;
  score100: number;
  tier: number; // 0 = 표본 부족
  votes: number;
};

export type TierStats = {
  season: string;
  computedAt: string;
  voteTotal: number;
  classes: StatsClass[];
  // 모달용: 평가자직업 → 상대직업 → [1번수,2번수,3번수,4번수,5번수]
  matchups: Record<string, Record<string, number[]>>;
};

// 투표 원본 → 집계 스냅샷 계산
async function computePayload(season: string): Promise<TierStats> {
  const rows = (await sql`
    SELECT voter_class, opponent_class, value, count(*)::int AS cnt
    FROM tier_votes
    WHERE season = ${season}
    GROUP BY voter_class, opponent_class, value
  `) as { voter_class: string; opponent_class: string; value: number; cnt: number }[];

  const acc = new Map<string, { sum: number; n: number }>();
  const bump = (id: string, addSum: number, addN: number) => {
    const a = acc.get(id) || { sum: 0, n: 0 };
    a.sum += addSum;
    a.n += addN;
    acc.set(id, a);
  };

  const matchups: Record<string, Record<string, number[]>> = {};
  let voteTotal = 0;

  for (const r of rows) {
    const v = r.value;
    const cnt = r.cnt;
    if (v < 1 || v > 5) continue;
    voteTotal += cnt;
    const a = advantage(v);
    // 양방향: 평가자 우위 + 상대는 그 반대
    bump(r.voter_class, a * cnt, cnt);
    bump(r.opponent_class, -a * cnt, cnt);
    // 모달용 분포 (평가자 관점)
    const m = (matchups[r.voter_class] ||= {});
    const arr = (m[r.opponent_class] ||= [0, 0, 0, 0, 0]);
    arr[v - 1] += cnt;
  }

  const scored = TIER_CLASSES.map((c) => {
    const a = acc.get(c.id) || { sum: 0, n: 0 };
    // shrinkage: prior 0(중립)으로 당김. n 적으면 0 근처, 많으면 실제 평균
    const score = a.n > 0 ? a.sum / (a.n + SHRINK_M) : 0;
    return { cls: c, score, votes: a.n };
  });

  const sufficient = scored
    .filter((x) => x.votes >= MIN_VOTES)
    .sort((a, b) => b.score - a.score);
  const insufficient = scored
    .filter((x) => x.votes < MIN_VOTES)
    .sort((a, b) => a.cls.name.localeCompare(b.cls.name, 'ko'));

  const total = sufficient.length;
  const classes: StatsClass[] = [];
  sufficient.forEach((x, i) => {
    classes.push({
      id: x.cls.id,
      name: x.cls.name,
      group: x.cls.group,
      icon: x.cls.icon,
      score100: scoreTo100(x.score),
      tier: rankToTier(i, total),
      votes: x.votes,
    });
  });
  insufficient.forEach((x) => {
    classes.push({
      id: x.cls.id,
      name: x.cls.name,
      group: x.cls.group,
      icon: x.cls.icon,
      score100: scoreTo100(x.score),
      tier: 0,
      votes: x.votes,
    });
  });

  return {
    season,
    computedAt: new Date().toISOString(),
    voteTotal,
    classes,
    matchups,
  };
}

// TTL 캐시: 신선하면 스냅샷 그대로, 만료면 1회 재계산 후 저장
export async function getTierStats(
  season: string = CURRENT_SEASON.id
): Promise<TierStats> {
  const cached = (await sql`
    SELECT payload, computed_at FROM tier_stats_cache WHERE season = ${season}
  `) as { payload: TierStats; computed_at: string }[];

  if (cached[0]) {
    const age = Date.now() - new Date(cached[0].computed_at).getTime();
    if (age < STATS_TTL_MS) return cached[0].payload;
  }

  const payload = await computePayload(season);
  await sql`
    INSERT INTO tier_stats_cache (season, payload, vote_total, computed_at)
    VALUES (${season}, ${JSON.stringify(payload)}::jsonb, ${payload.voteTotal}, now())
    ON CONFLICT (season) DO UPDATE
      SET payload = EXCLUDED.payload,
          vote_total = EXCLUDED.vote_total,
          computed_at = now()
  `;
  return payload;
}

// 한 직업 기준 투표 저장 (기존 것 교체). ratings: { 상대직업id: 1~5 }
export async function saveVotes(
  season: string,
  uid: string,
  voterClass: string,
  ratings: Record<string, number>
): Promise<number> {
  if (!VALID_IDS.has(voterClass)) throw new Error('invalid voterClass');

  const entries = Object.entries(ratings).filter(
    ([opp, val]) =>
      VALID_IDS.has(opp) &&
      opp !== voterClass &&
      Number.isInteger(val) &&
      val >= 1 &&
      val <= 5
  );

  const queries: ReturnType<typeof sql>[] = [
    sql`DELETE FROM tier_votes WHERE season = ${season} AND uid = ${uid} AND voter_class = ${voterClass}`,
  ];
  for (const [opp, val] of entries) {
    queries.push(
      sql`INSERT INTO tier_votes (season, uid, voter_class, opponent_class, value)
          VALUES (${season}, ${uid}, ${voterClass}, ${opp}, ${val})`
    );
  }
  await sql.transaction(queries);
  return entries.length;
}

// 사용자가 한 직업에 대해 매긴 기존 평가 불러오기
export async function getMyVotes(
  season: string,
  uid: string,
  voterClass: string
): Promise<Record<string, number>> {
  const rows = (await sql`
    SELECT opponent_class, value FROM tier_votes
    WHERE season = ${season} AND uid = ${uid} AND voter_class = ${voterClass}
  `) as { opponent_class: string; value: number }[];
  return Object.fromEntries(rows.map((r) => [r.opponent_class, r.value]));
}
