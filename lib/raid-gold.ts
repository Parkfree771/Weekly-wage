// 레이드 클골 정리(/raid-gold) 계산. 수치는 전부 data/rewardTable.ts 에서 읽는다.
//
// 자동 선택 기준은 주간 레이드와 같다: 그룹별로 갈 수 있는 최고 난이도를 고르고,
// 그중 골드가 많은 순으로 상위 3개 (lib/gold-projection.ts 의 charClearGold 와 같은 결과).
import { RAID_TABLE, type RaidTableEntry } from '@/data/rewardTable';
import { raids } from '@/data/raids';
import { GOLD_RAID_LIMIT, type GoldSplit, type SortBasis } from '@/lib/gold-projection';

export type RaidGroup = {
  group: string;
  image: string;
  entries: RaidTableEntry[]; // 입장 레벨 내림차순 (높은 난이도 먼저)
};

export type RankedGroup = { group: RaidGroup; entry: RaidTableEntry };

// 비활성(출시 예정) 레이드는 data/raids.ts 기준으로 뺀다
const ACTIVE_NAMES = new Set(raids.map((r) => r.name));

export const RAID_GROUPS: RaidGroup[] = Array.from(
  RAID_TABLE.filter((e) => ACTIVE_NAMES.has(e.name)).reduce((map, entry) => {
    const cur = map.get(entry.group);
    if (cur) cur.entries.push(entry);
    else map.set(entry.group, { group: entry.group, image: entry.image, entries: [entry] });
    return map;
  }, new Map<string, RaidGroup>()).values(),
).map((g) => ({ ...g, entries: [...g.entries].sort((a, b) => b.level - a.level) }));

// 레이드 목록에 까는 난이도별 전체 목록 (그룹끼리 붙여서 높은 난이도부터)
export const RAID_ENTRIES: RankedGroup[] = RAID_GROUPS.flatMap((group) =>
  group.entries.map((entry) => ({ group, entry })),
);

// 레이드 전 관문 클리어 골드 합 (더보기 비용 제외)
export function raidGold(entry: RaidTableEntry): GoldSplit {
  const total = entry.gates.reduce((s, g) => s + g.gold, 0);
  const bound = entry.gates.reduce((s, g) => s + g.boundGold, 0);
  return { free: total - bound, bound, total };
}

// 그 레벨에서 갈 수 있는 레이드 그룹 (그룹별 최고 난이도, 골드 많은 순)
export function rankGroups(itemLevel: number, basis: SortBasis): RankedGroup[] {
  const key = (e: RaidTableEntry) => {
    const gold = raidGold(e);
    return basis === 'free' ? gold.free : gold.total;
  };
  return RAID_GROUPS.flatMap((group) => {
    const entry = group.entries.find((e) => itemLevel >= e.level);
    return entry ? [{ group, entry }] : [];
  }).sort((a, b) => key(b.entry) - key(a.entry) || raidGold(b.entry).total - raidGold(a.entry).total);
}

// 자동 선택 레이드 이름 ('세르카 나메' 등)
export const autoPick = (itemLevel: number, basis: SortBasis): string[] =>
  rankGroups(itemLevel, basis).slice(0, GOLD_RAID_LIMIT).map((r) => r.entry.name);

// 더보기 비용 정산 — 귀속에서 먼저 빠지고, 모자라면 유통에서 빠진다
export function settleMoreCost(gold: GoldSplit, moreCost: number): GoldSplit {
  const remain = gold.bound - moreCost;
  const bound = Math.max(remain, 0);
  const free = gold.free + Math.min(remain, 0);
  return { free, bound, total: free + bound };
}
