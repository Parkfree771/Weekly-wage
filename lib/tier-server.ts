// 서버 전용: 티어 투표 저장 + 집계 스냅샷 캐시. (API 라우트에서만 import)
import { sql } from './neon';
import {
  TIER_CLASSES,
  scoreTo100,
  rankToTier,
  MIN_VOTES,
  SUPPORT_MIN_VOTES,
  CURRENT_SEASON,
  roleOf,
  SUPPORT_IDS,
  type TierRole,
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
  role: TierRole;
  score100: number;
  tier: number; // 0 = 표본 부족
  votes: number;
};

export type TierStats = {
  season: string;
  computedAt: string;
  voteTotal: number;
  classes: StatsClass[];
  // 모달용: 평가받은직업 → 평가한직업 → [1번수..5번수] (평가받은 직업 관점)
  // 예: 받은값 1 = 남들이 "이 직업은 무조건 이긴다"고 본 표
  received: Record<string, Record<string, number[]>>;
  // 서포터 선호 체크에 참여한 총 인원 (서포터 점수 = 선택 인원 / 이 값)
  supportVoterTotal: number;
  // 서포터 모달용: 서포터id → 선택한 사람의 주력딜러id → 인원수
  supportPickers: Record<string, Record<string, number>>;
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

  // 평가받은직업 → 평가한직업 → [1번수..5번수] (평가자가 실제로 찍은 값 그대로)
  // 예: 소서가 '나는 인파 못 이김(5)'이면 received['인파'][소서][4] += 1
  const received: Record<string, Record<string, number[]>> = {};
  let voteTotal = 0;

  for (const r of rows) {
    const v = r.value;
    const cnt = r.cnt;
    if (v < 1 || v > 5) continue;
    // 역할이 다른 매치업(딜러↔서포터)은 비교 의미가 없어 집계 제외
    if (roleOf(r.voter_class) !== roleOf(r.opponent_class)) continue;
    voteTotal += cnt;
    const a = advantage(v);
    // 점수는 '받은 평가'만 반영 — 평가자 본인(self-vote)은 가산하지 않음.
    // 상대(평가받은 직업)에 우위의 반대값을 부여: 상대가 '못 이김(5)'이면 +2.
    bump(r.opponent_class, -a * cnt, cnt);
    // 모달용: 평가자가 찍은 값 그대로 (뒤집지 않음)
    const m = (received[r.opponent_class] ||= {});
    const arr = (m[r.voter_class] ||= [0, 0, 0, 0, 0]);
    arr[v - 1] += cnt;
  }

  const classes: StatsClass[] = [];

  // ── 딜러: 매치업 우위 점수로 순위·티어 ──
  const dealers = TIER_CLASSES.filter((c) => roleOf(c.id) === 'dealer').map(
    (c) => {
      const a = acc.get(c.id) || { sum: 0, n: 0 };
      // shrinkage: prior 0(중립)으로 당김. n 적으면 0 근처, 많으면 실제 평균
      const score = a.n > 0 ? a.sum / (a.n + SHRINK_M) : 0;
      return { cls: c, score, votes: a.n };
    }
  );
  const dealerSufficient = dealers
    .filter((x) => x.votes >= MIN_VOTES)
    .sort((a, b) => b.score - a.score);
  const dealerInsufficient = dealers
    .filter((x) => x.votes < MIN_VOTES)
    .sort((a, b) => a.cls.name.localeCompare(b.cls.name, 'ko'));
  dealerSufficient.forEach((x, i) => {
    classes.push({
      id: x.cls.id,
      name: x.cls.name,
      group: x.cls.group,
      icon: x.cls.icon,
      role: 'dealer',
      score100: scoreTo100(x.score),
      tier: rankToTier(i, dealerSufficient.length),
      votes: x.votes,
    });
  });
  dealerInsufficient.forEach((x) => {
    classes.push({
      id: x.cls.id,
      name: x.cls.name,
      group: x.cls.group,
      icon: x.cls.icon,
      role: 'dealer',
      score100: scoreTo100(x.score),
      tier: 0,
      votes: x.votes,
    });
  });

  // ── 서포터: 선호순위(Borda) 점수로 순위·티어 ──
  // 한 표 = (uid, 평가 직업) 단위. 같은 계정도 직업별로 각각 한 표를 던진다
  // (직업마다 선호 서포터가 다르므로). rank 1위=N-1점 … 꼴찌=0점 (N=서포터 수).
  const N_SUP = SUPPORT_IDS.size;
  const supRows = (await sql`
    SELECT support_class, rank, count(*)::int AS cnt
    FROM support_votes
    WHERE season = ${season}
    GROUP BY support_class, rank
  `) as { support_class: string; rank: number; cnt: number }[];
  // 전체 표 수 = 서로 다른 (uid, voter_class) 조합 수
  const supBallotRows = (await sql`
    SELECT count(*)::int AS n FROM (
      SELECT 1 FROM support_votes WHERE season = ${season} GROUP BY uid, voter_class
    ) t
  `) as { n: number }[];
  const supportVoterTotal = supBallotRows[0]?.n ?? 0;

  // Borda 점수 합 + 이 서포터를 순위에 넣은 표 수
  const supPoints = new Map<string, number>();
  const supBallots = new Map<string, number>();
  for (const r of supRows) {
    const pts = Math.max(0, N_SUP - r.rank); // rank1 → N-1 … rankN → 0
    supPoints.set(r.support_class, (supPoints.get(r.support_class) ?? 0) + pts * r.cnt);
    supBallots.set(
      r.support_class,
      (supBallots.get(r.support_class) ?? 0) + r.cnt
    );
    voteTotal += r.cnt;
  }

  // 모달용: 이 서포터를 선호 순위에 넣은 표의 직업 분포 (표 단위)
  const pickerRows = (await sql`
    SELECT support_class, voter_class, count(*)::int AS cnt
    FROM support_votes
    WHERE season = ${season} AND voter_class IS NOT NULL
    GROUP BY support_class, voter_class
  `) as { support_class: string; voter_class: string; cnt: number }[];
  const supportPickers: Record<string, Record<string, number>> = {};
  for (const r of pickerRows) {
    (supportPickers[r.support_class] ||= {})[r.voter_class] = r.cnt;
  }

  // 선호 지수 = 최고 Borda 점수를 100으로 둔 상대 점수(서포터끼리 비교).
  const maxPts = Math.max(1, ...Array.from(supPoints.values()));
  const supports = TIER_CLASSES.filter((c) => roleOf(c.id) === 'support').map(
    (c) => {
      const pts = supPoints.get(c.id) ?? 0;
      const ballots = supBallots.get(c.id) ?? 0;
      const score100 = Math.round((pts / maxPts) * 100);
      return { cls: c, votes: ballots, score100 };
    }
  );
  const supSufficient = supports
    .filter((x) => x.votes >= SUPPORT_MIN_VOTES)
    .sort((a, b) => b.score100 - a.score100); // 선호 지수 높을수록 상위
  const supInsufficient = supports
    .filter((x) => x.votes < SUPPORT_MIN_VOTES)
    .sort((a, b) => a.cls.name.localeCompare(b.cls.name, 'ko'));
  // 티어는 점수 기준 — 같은 점수면 같은 티어 (서폿 4개가 다 100점이면 전부 1티어).
  // 점수가 다를 때만 순위 분포로 갈린다.
  let supPrevScore: number | null = null;
  let supPrevTier = 0;
  supSufficient.forEach((x, i) => {
    const tier =
      supPrevScore !== null && x.score100 === supPrevScore
        ? supPrevTier
        : rankToTier(i, supSufficient.length);
    supPrevScore = x.score100;
    supPrevTier = tier;
    classes.push({
      id: x.cls.id,
      name: x.cls.name,
      group: x.cls.group,
      icon: x.cls.icon,
      role: 'support',
      score100: x.score100,
      tier,
      votes: x.votes,
    });
  });
  supInsufficient.forEach((x) => {
    classes.push({
      id: x.cls.id,
      name: x.cls.name,
      group: x.cls.group,
      icon: x.cls.icon,
      role: 'support',
      score100: x.score100,
      tier: 0,
      votes: x.votes,
    });
  });

  return {
    season,
    computedAt: new Date().toISOString(),
    voteTotal,
    classes,
    received,
    supportVoterTotal,
    supportPickers,
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

// 투표 저장 직후 집계 스냅샷 캐시 무효화 → 다음 조회 때 즉시 재계산.
// (CDN 캐시는 라우트에서 purgeCache 태그로 별도 무효화)
export async function invalidateTierStats(
  season: string = CURRENT_SEASON.id
): Promise<void> {
  await sql`DELETE FROM tier_stats_cache WHERE season = ${season}`;
}

// 한 직업 기준 투표 저장 (기존 것 교체). ratings: { 상대직업id: 1~5 }
export async function saveVotes(
  season: string,
  uid: string,
  voterClass: string,
  ratings: Record<string, number>
): Promise<number> {
  if (!VALID_IDS.has(voterClass)) throw new Error('invalid voterClass');

  const voterRole = roleOf(voterClass);
  const entries = Object.entries(ratings).filter(
    ([opp, val]) =>
      VALID_IDS.has(opp) &&
      opp !== voterClass &&
      roleOf(opp) === voterRole && // 같은 역할끼리만 비교
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

// 서포터 선호 체크 저장 (기존 것 교체). ids: 선택한 서포터id 목록 (중복 선택 = 여러 개)
// voterClass: 선택한 사람의 주력 딜러(통계용). 없으면 null.
export async function saveSupportPicks(
  season: string,
  uid: string,
  voterClass: string | null,
  ids: string[]
): Promise<number> {
  // ids는 선호 순서대로 들어온다(0번이 1순위). rank = 배열 위치 + 1.
  const valid = Array.from(new Set(ids))
    .filter((id) => SUPPORT_IDS.has(id))
    .slice(0, SUPPORT_IDS.size);
  const vc = voterClass && VALID_IDS.has(voterClass) ? voterClass : null;

  // 직업(voter_class)별로 따로 저장 — 직업마다 선호 서포터가 다르므로.
  // 다른 직업으로 투표해도 이 직업의 선택만 교체되고 나머지는 유지된다.
  const queries: ReturnType<typeof sql>[] = [
    sql`DELETE FROM support_votes WHERE season = ${season} AND uid = ${uid} AND voter_class IS NOT DISTINCT FROM ${vc}`,
  ];
  valid.forEach((id, i) => {
    queries.push(
      sql`INSERT INTO support_votes (season, uid, support_class, rank, voter_class)
          VALUES (${season}, ${uid}, ${id}, ${i + 1}, ${vc})`
    );
  });
  await sql.transaction(queries);
  return valid.length;
}

// 사용자가 특정 직업으로 선택한 서포터 목록 불러오기 (직업별 프리필).
// voterClass 없으면(직업 미선택) 빈 목록.
export async function getMySupportPicks(
  season: string,
  uid: string,
  voterClass: string | null = null
): Promise<string[]> {
  const vc = voterClass && VALID_IDS.has(voterClass) ? voterClass : null;
  const rows = (await sql`
    SELECT support_class FROM support_votes
    WHERE season = ${season} AND uid = ${uid} AND voter_class IS NOT DISTINCT FROM ${vc}
    ORDER BY rank
  `) as { support_class: string }[];
  return rows.map((r) => r.support_class);
}
