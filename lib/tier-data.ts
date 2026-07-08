// 직업(각인) 티어 데이터 레이어. 엔트리는 자동 생성(scripts/gen-tier-icons.mjs).
// 집계: "남들이 그 직업을 못 이긴다고 한 정도"를 표 수로 정규화한 평균 → 1~5티어.
// 표 없는 초기에는 SEED(통념 메타 placeholder)를 prior로 사용.

import { TIER_ENTRIES, type TierEntry } from './tier-entries.generated';

export type { TierEntry };
export type TierClass = TierEntry;

export const TIER_CLASSES: TierClass[] = TIER_ENTRIES;

// '기타'(신규 직업)는 맨 앞에 노출
export const GROUP_ORDER = ['기타', '전사', '무도가', '헌터', '마법사', '암살자', '스페셜리스트'];

// 그룹별 묶음 (미배치 풀·직업 선택용)
export const TIER_GROUPS: { group: string; entries: TierEntry[] }[] = GROUP_ORDER
  .map((group) => ({ group, entries: TIER_ENTRIES.filter((e) => e.group === group) }))
  .filter((g) => g.entries.length > 0);

// 5단계 척도 (내 직업 기준). score는 내 직업의 강함 점수.
export const MATCHUP_SCALE = [
  { value: 1, score: 2, label: '무조건 이김' },
  { value: 2, score: 1, label: '대부분 이김 · 관문별 다름' },
  { value: 3, score: 0, label: '비슷' },
  { value: 4, score: -1, label: '대부분 지지만 가끔 이김' },
  { value: 5, score: -2, label: '때려죽여도 못 이김' },
] as const;

export type MatchupValue = 1 | 2 | 3 | 4 | 5;

// compareTo: 직전 시즌 id. 지정하면 그 시즌 대비 티어가 오른 직업에 '상승' 표식.
export type Season = { id: string; label: string; basis: string; compareTo?: string };

// 시즌 = 밸런스 패치 날짜 기준. 최신이 배열 맨 앞. 새 패치 나오면 위에 추가.
export const SEASONS: Season[] = [
  {
    id: '2026-06-24',
    label: '2026.06.24 패치',
    basis: '2026.06.24 클래스 밸런스 패치 기준',
    compareTo: '2026-05-17',
  },
  {
    id: '2026-05-17',
    label: '2026.05.17 패치',
    basis: '2026.05.17 클래스 밸런스 패치 기준',
  },
];

export const CURRENT_SEASON: Season = SEASONS[0];

// 서포터 직업각인 스펙. 딜러와 1:1 딜 비교가 무의미하므로 티어표를 분리한다.
// (바드=절실한 구원, 도화가=만개, 홀나=축복, 발키리=해방자 → 전부 서포터)
// 나머지는 전부 딜러. (도화가 회귀는 딜러)
export const SUPPORT_IDS = new Set<string>([
  '바드 절구',
  '도화가 만개',
  '홀나 축오',
  '발키리 해방자',
]);

export type TierRole = 'dealer' | 'support';

export function roleOf(id: string): TierRole {
  return SUPPORT_IDS.has(id) ? 'support' : 'dealer';
}

// 서포터 4종 (선호 순위 투표용 평탄 목록)
export const SUPPORT_ENTRIES: TierEntry[] = TIER_ENTRIES.filter(
  (e) => SUPPORT_IDS.has(e.id)
);

export const ROLE_LABEL: Record<TierRole, string> = {
  dealer: '딜러',
  support: '서포터',
};

// 역할별 그룹 묶음 (투표 화면에서 같은 역할끼리만 평가하도록)
export function tierGroupsForRole(
  role: TierRole
): { group: string; entries: TierEntry[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    entries: TIER_ENTRIES.filter(
      (e) => e.group === group && roleOf(e.id) === role
    ),
  })).filter((g) => g.entries.length > 0);
}

// 초기 세팅(SEED) placeholder: id 해시로 -1.8~1.8 균등 분포. 그룹과 무관하게 섞이게.
// 실제 투표가 쌓이면 이 prior에서 크라우드 평균으로 수렴.
export function seedScore(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const t = (h % 1000) / 1000;
  return Number((1.8 - t * 3.6).toFixed(2));
}

// 매치업 점수(1~5)별 색: 1~2 이김(초록)/3 비슷(회색)/4~5 짐(빨강)
export function matchupColor(value: number): string {
  if (value <= 2) return 'var(--profit-color)';
  if (value === 3) return 'var(--neutral-color)';
  return 'var(--loss-color)';
}

// MOCK: 직업 a 유저들이 b를 평가한 "투표 분포" [1번수, 2번수, 3번수, 4번수, 5번수].
// 같은 상대라도 사람마다 다른 점수를 줄 수 있으므로 분포로 표현. 일부는 0표(듬성듬성).
// Neon 붙으면 실제 집계 분포로 교체.
export function mockMatchupDist(aId: string, bId: string): number[] {
  let h = 0;
  const s = aId + '>' + bId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const total = h % 9; // 0~8표 (0이면 미평가)
  const dist = [0, 0, 0, 0, 0];
  if (total === 0) return dist;
  const center = Math.floor(h / 9) % 5; // 0~4
  for (let v = 0; v < total; v++) {
    const off = ((h >> (v % 28)) % 3) - 1; // -1 / 0 / 1
    let idx = center + off;
    if (idx < 0) idx = 0;
    if (idx > 4) idx = 4;
    dist[idx]++;
  }
  return dist;
}

export function scoreToTier(s: number): number {
  if (s >= 1.1) return 1;
  if (s >= 0.35) return 2;
  if (s > -0.35) return 3;
  if (s > -1.1) return 4;
  return 5;
}

// 티어 라벨 채움색 (1티어 강조 → 하위 차분). 흰 숫자와 대비되게.
export const TIER_COLORS: Record<number, string> = {
  1: '#e8722a',
  2: '#3b50b5',
  3: '#5a6fd6',
  4: '#8b96c8',
  5: '#7c8696',
};

export const TIER_META: Record<number, { label: string; desc: string }> = {
  1: { label: '1티어', desc: '최상위' },
  2: { label: '2티어', desc: '상위' },
  3: { label: '3티어', desc: '평균' },
  4: { label: '4티어', desc: '하위' },
  5: { label: '5티어', desc: '최하위' },
};

// 내부 점수(-2~2)를 0~100 표시 점수로 변환
export function scoreTo100(s: number): number {
  return Math.max(0, Math.min(100, Math.round(((s + 2) / 4) * 100)));
}

// 0~100 점수 구간별 배지 색 (높을수록 뜨겁게)
export function score100Color(n: number): string {
  if (n >= 90) return '#d63a3a';
  if (n >= 80) return '#e8722a';
  if (n >= 70) return '#e0992a';
  if (n >= 60) return '#3b9e54';
  if (n >= 50) return '#3b50b5';
  if (n >= 40) return '#5a6fd6';
  return '#8890a4';
}

// 표본 부족 기준 (투표 수). 미만이면 티어 미배정 → '표본 부족' 칸.
// 1 = 투표 1표 이상부터 티어 배치. 0표 직업은 티어 칸이 아닌 '표본 부족'으로 빠진다
// (투표 없는 시즌이면 티어 1~5는 비고 전부 표본 부족).
export const MIN_VOTES = 1;
export const SUPPORT_MIN_VOTES = 1;

// MOCK 투표 수 (placeholder). Neon 붙으면 실제 집계 수로 교체.
export function mockVotes(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return 5 + (h % 45); // 5~49
}

export type RankedClass = {
  rank: number;
  cls: TierClass;
  score: number;
  score100: number;
  tier: number; // 0 = 표본 부족
  votes: number;
};

// 분포 기반 티어: 점수 절대값이 아니라 순위 비율로 1~5 분배
// (상위 15% / 20% / 30% / 20% / 15%) → 데이터가 몰려도 항상 고르게 갈림
export function rankToTier(index: number, total: number): number {
  const pct = total > 1 ? index / total : 0;
  if (pct < 0.15) return 1;
  if (pct < 0.35) return 2;
  if (pct < 0.65) return 3;
  if (pct < 0.85) return 4;
  return 5;
}

export function getSeedRanking(): RankedClass[] {
  const all = TIER_CLASSES.map((cls) => ({
    cls,
    score: seedScore(cls.id),
    votes: mockVotes(cls.id),
  }));

  // 표본 충분 → 점수순 정렬 후 분포 기반 티어
  const ranked = all
    .filter((x) => x.votes >= MIN_VOTES)
    .sort((a, b) => b.score - a.score);
  const n = ranked.length;
  const tiered: RankedClass[] = ranked.map((x, i) => ({
    rank: i + 1,
    cls: x.cls,
    score: x.score,
    score100: scoreTo100(x.score),
    tier: rankToTier(i, n),
    votes: x.votes,
  }));

  // 표본 부족 → 티어 0 (이름순)
  const insufficient: RankedClass[] = all
    .filter((x) => x.votes < MIN_VOTES)
    .sort((a, b) => a.cls.name.localeCompare(b.cls.name, 'ko'))
    .map((x) => ({
      rank: 0,
      cls: x.cls,
      score: x.score,
      score100: scoreTo100(x.score),
      tier: 0,
      votes: x.votes,
    }));

  return [...tiered, ...insufficient];
}

// 점수(-2~2)를 막대 길이(0~100%)로 변환
export function scoreToBarPercent(s: number): number {
  return Math.round(((s + 2) / 4) * 100);
}
