// 레벨업 시 원정대 주간 레이드 클리어 골드가 얼마나 변하는지 계산한다.
//
// 주간 레이드 페이지에 저장된 사용자 설정(더보기 구매 여부·난이도 수동 선택·관문 체크)은
// 일부러 무시한다. 이 계산은 항상 "그 레벨에서 받을 수 있는 최고 클리어 골드" 기준이며,
// 더보기 비용도 넣지 않는다 (순수 클리어 골드만).
import { raids } from '@/data/raids';
import { getRaidGroupName } from '@/types/user';

export type GoldSplit = { free: number; bound: number; total: number };

// 상위 3레이드를 고르는 기준
//  total: 귀속·유통 구분 없이 순수 골드량이 많은 순
//  free : 거래소에서 쓸 수 있는 유통 골드가 많은 순 (성당처럼 전액 귀속인 레이드는 밀린다)
export type SortBasis = 'total' | 'free';

// 캐릭터당 주간 골드를 받을 수 있는 레이드 수
const GOLD_RAID_LIMIT = 3;
// 원정대에서 주간 골드가 인정되는 캐릭터 수
const GOLD_CHAR_LIMIT = 6;

export const ZERO_GOLD: GoldSplit = { free: 0, bound: 0, total: 0 };

export function addGold(a: GoldSplit, b: GoldSplit): GoldSplit {
  return { free: a.free + b.free, bound: a.bound + b.bound, total: a.total + b.total };
}

export function subGold(a: GoldSplit, b: GoldSplit): GoldSplit {
  return { free: a.free - b.free, bound: a.bound - b.bound, total: a.total - b.total };
}

// 레이드 전 관문 클리어 골드 합 (더보기 비용 제외)
function raidClearGold(raid: (typeof raids)[number]): GoldSplit {
  let total = 0;
  let bound = 0;
  for (const g of raid.gates) {
    total += g.gold;
    bound += g.boundGold;
  }
  return { free: total - bound, bound, total };
}

const RAID_GOLD = new Map(raids.map((r) => [r.name, raidClearGold(r)]));

// 보상이 실제로 바뀌는 레벨 = 레이드 입장 레벨. 그 사이 구간은 아무리 올려도 골드가 그대로다.
export const LEVEL_BREAKPOINTS: number[] = Array.from(new Set(raids.map((r) => r.level))).sort(
  (a, b) => a - b,
);

export type PickedRaid = { name: string; gold: GoldSplit };

export type CharProjection = {
  gold: GoldSplit;
  picked: PickedRaid[];
};

const keyOf = (basis: SortBasis) => (g: GoldSplit) => (basis === 'free' ? g.free : g.total);

// 캐릭터 1명의 주간 클리어 골드 — 그룹별 최고 난이도 중 상위 3개
export function charClearGold(itemLevel: number, basis: SortBasis): CharProjection {
  const best = new Map<string, { name: string; level: number; gold: GoldSplit }>();
  for (const raid of raids) {
    if (itemLevel < raid.level) continue;
    const group = getRaidGroupName(raid.name);
    const cur = best.get(group);
    if (!cur || raid.level > cur.level) {
      best.set(group, { name: raid.name, level: raid.level, gold: RAID_GOLD.get(raid.name)! });
    }
  }

  const key = keyOf(basis);
  const picked = Array.from(best.values())
    .sort((a, b) => key(b.gold) - key(a.gold) || b.gold.total - a.gold.total)
    .slice(0, GOLD_RAID_LIMIT)
    .map((r) => ({ name: r.name, gold: r.gold }));

  return { gold: picked.reduce((s, r) => addGold(s, r.gold), ZERO_GOLD), picked };
}

export type ExpeditionRow = {
  name: string;
  itemLevel: number;
  gold: GoldSplit;
  picked: PickedRaid[];
  counted: boolean; // 원정대 골드 인정 6캐릭에 드는지
};

export type ExpeditionProjection = {
  rows: ExpeditionRow[];
  total: GoldSplit;
};

// 원정대 주간 클리어 골드 — 상위 6캐릭만 골드가 인정된다.
// 레벨을 바꿔 비교할 때는 반드시 전/후를 각각 통째로 계산해서 빼야 한다.
// 상위 3·상위 6 제한 때문에 증분식(새로 열린 레이드 골드 = 증가분)은 틀린 값이 나온다.
export function expeditionClearGold(
  chars: { name: string; itemLevel: number }[],
  basis: SortBasis,
): ExpeditionProjection {
  const key = keyOf(basis);
  const scored = chars.map((c) => ({ ...c, ...charClearGold(c.itemLevel, basis) }));

  const countedNames = new Set(
    [...scored]
      .sort((a, b) => key(b.gold) - key(a.gold) || b.gold.total - a.gold.total)
      .slice(0, GOLD_CHAR_LIMIT)
      .map((c) => c.name),
  );

  const rows: ExpeditionRow[] = scored.map((c) => ({ ...c, counted: countedNames.has(c.name) }));
  const total = rows.reduce((s, r) => (r.counted ? addGold(s, r.gold) : s), ZERO_GOLD);

  return { rows, total };
}
