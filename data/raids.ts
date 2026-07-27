// 각 게이트의 gold 는 총 골드 (= 일반 + 귀속). boundGold 는 그중 귀속 비중.
// 일반 골드 = gold - boundGold. 더보기 비용(moreGold) 은 귀속에서 우선 차감하고 부족하면 일반에서 차감.
// 수치 원본은 data/rewardTable.ts (단일 원본 테이블) — 골드·비용 수정은 거기서만 한다.
import { RAID_TABLE } from './rewardTable';

const ALL_RAIDS = RAID_TABLE.map((entry) => ({
  name: entry.name,
  level: entry.level,
  image: entry.image,
  gates: entry.gates.map((g) => ({
    gate: g.gate,
    gold: g.gold,
    boundGold: g.boundGold,
    moreGold: g.moreGold,
  })),
}));

// 비활성화 레이드 (데이터·이미지는 유지, 계산에서만 제외).
// 벨가르딘은 2026-08-05 출시 전이지만 미리 활성화했다 (수치는 역산 기준, 출시 후 확정치로 갱신).
const DISABLED_RAID_NAMES = new Set<string>([]);

// 출시 예정(비활성) 레이드 그룹별 안내 문구
const RAID_RELEASE_LABELS: Record<string, string> = {};

// 신규 레이드 배지 — 그룹명 → 배지 문구. 출시 후 해당 항목만 지우면 배지가 사라진다.
const RAID_NEW_LABELS: Record<string, string> = {
  '벨가르딘': 'NEW · 8/5',
};

// 레이드명(또는 그룹명)에 붙일 신규 배지 문구. 없으면 undefined.
export function getRaidNewLabel(raidName: string): string | undefined {
  for (const group of Object.keys(RAID_NEW_LABELS)) {
    if (raidName === group || raidName.startsWith(`${group} `)) return RAID_NEW_LABELS[group];
  }
  return undefined;
}

// 계산에 사용하는 활성 레이드만
export const raids = ALL_RAIDS.filter((r) => !DISABLED_RAID_NAMES.has(r.name));

// 비활성(출시 예정) 레이드 — 골드/코어 계산에는 절대 포함하지 않고, UI에 '출시 예정'으로만 노출.
export type UpcomingRaid = (typeof ALL_RAIDS)[number] & { releaseLabel: string };
export const upcomingRaids: UpcomingRaid[] = ALL_RAIDS
  .filter((r) => DISABLED_RAID_NAMES.has(r.name))
  .map((r) => {
    const group = r.name.split(' ').slice(0, -1).join(' ') || r.name;
    return { ...r, releaseLabel: RAID_RELEASE_LABELS[group] || '출시 예정' };
  });
