// 레벨업 시 원정대 주간 레이드 클리어 골드가 얼마나 변하는지 계산한다.
//
// 주간 레이드 페이지에 저장된 사용자 설정(더보기 구매 여부·난이도 수동 선택·관문 체크)은
// 일부러 무시한다. 이 계산은 항상 "그 레벨에서 받을 수 있는 최고 클리어 골드" 기준이며,
// 더보기 비용도 넣지 않는다 (순수 클리어 골드만).
import { raids } from '@/data/raids';
import { raidClearRewards } from '@/data/raidClearRewards';
import {
  EVENT_CONTENTS,
  GUARDIAN_TIERS,
  RIFT_TIERS,
  eventTierOf,
  findTier,
  getSandMaterials,
  type ContentMaterial as DailyMaterial,
} from '@/lib/daily-content';
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

// ─── 재련 재료 (골드+재료 탭 전용) ───
//
// 클리어 기본 보상(raidClearRewards) 중 재련 재료만 집계한다.
// 코어·승급 재료는 재련 재료가 아니라 제외. 벨가르딘은 재련 재료 수량이
// 미공개라 데이터 자체가 없어 0으로 잡힌다 (출시 후 데이터만 채우면 반영됨).
export const REFINING_MATERIALS = [
  '운명의 파괴석 결정',
  '운명의 수호석 결정',
  '위대한 운명의 돌파석',
  '운명의 파괴석',
  '운명의 수호석',
  '운명의 돌파석',
  '운명의 파편',
  '은총의 파편',
  '고통의 가시',
  '용암의 숨결',
  '빙하의 숨결',
  '1레벨 보석',
  '천상 입장권',
] as const;

const REFINING_SET = new Set<string>(REFINING_MATERIALS);

// itemName -> 수량
export type MaterialCounts = Record<string, number>;

export function addMaterials(a: MaterialCounts, b: MaterialCounts): MaterialCounts {
  const out: MaterialCounts = { ...a };
  for (const [name, amount] of Object.entries(b)) {
    out[name] = (out[name] ?? 0) + amount;
  }
  return out;
}

// 레이드 전 관문 클리어 재련 재료 합
const RAID_MATERIALS: Map<string, MaterialCounts> = (() => {
  const map = new Map<string, MaterialCounts>();
  for (const reward of raidClearRewards) {
    const cur = map.get(reward.raidName) ?? {};
    for (const m of reward.materials) {
      if (!REFINING_SET.has(m.itemName)) continue;
      cur[m.itemName] = (cur[m.itemName] ?? 0) + m.amount;
    }
    map.set(reward.raidName, cur);
  }
  return map;
})();

// 상위 3에 뽑힌 레이드들의 재련 재료 합
export function pickedMaterials(picked: PickedRaid[]): MaterialCounts {
  return picked.reduce<MaterialCounts>(
    (s, p) => addMaterials(s, RAID_MATERIALS.get(p.name) ?? {}),
    {},
  );
}

// ─── 레이드 외 콘텐츠 재료 (균열/전선·가토·모래시계·카오스 게이트·필드보스) ───
//
// 수치는 lib/daily-content.ts 공용 테이블을 그대로 쓴다.
// 콘텐츠 표의 짧은 라벨('파괴석 결정', '용숨' 등)을 레이드 테이블과 같은 정식 명칭으로 맞춘다.
const CONTENT_LABEL_TO_NAME: Record<string, string> = {
  '파괴석 결정': '운명의 파괴석 결정',
  '수호석 결정': '운명의 수호석 결정',
  '위대한 돌파석': '위대한 운명의 돌파석',
  '파괴석': '운명의 파괴석',
  '수호석': '운명의 수호석',
  '돌파석': '운명의 돌파석',
  '운명의 파편': '운명의 파편',
  '용숨': '용암의 숨결',
  '빙숨': '빙하의 숨결',
  '1레벨 보석': '1레벨 보석',
  '천상 입장권': '천상 입장권',
  // 귀속골드는 재료가 아니라 골드로 따로 더한다.
};

// 콘텐츠 최소 입장 레벨 — 이 아래는 해당 콘텐츠 수급이 없다.
const RIFT_MIN_LEVEL = 1680;    // 균열/전선(카오스 던전)
const GUARDIAN_MIN_LEVEL = 1680; // 가디언 토벌
const EVENT_MIN_LEVEL = 1730;    // 할의 모래시계 · 카오스 게이트 · 필드보스

// 주간 반복 횟수 — 균열/전선·가토는 하루 1회(휴게 미적용) 기준으로 주 7일.
export const RIFT_RUNS_PER_WEEK = 7;
export const GUARDIAN_RUNS_PER_WEEK = 7;
// 할의 모래시계 보상강화 단계 (0~5). 주 1회이고, 대부분 1단계라 그 기준으로 계산한다.
export const SAND_ENHANCE_LEVEL = 1;

function contentMaterials(mats: DailyMaterial[], times: number): MaterialCounts {
  const out: MaterialCounts = {};
  for (const m of mats) {
    const name = CONTENT_LABEL_TO_NAME[m.label];
    if (!name) continue;
    out[name] = (out[name] ?? 0) + m.amount * times;
  }
  return out;
}

export type ContentBreakdown = {
  rift: MaterialCounts;      // 균열/전선 (주 7회)
  guardian: MaterialCounts;  // 가디언 토벌 (주 7회)
  sand: MaterialCounts;      // 할의 모래시계 (주 1회)
  event: MaterialCounts;     // 카오스 게이트 + 필드보스 (대표 캐릭터만)
  eventBoundGold: number;    // 카오스 게이트 귀속 골드 (대표 캐릭터만)
  // 지금 어느 티어를 먹고 있는지 (예: '1730 균열'). 못 가는 콘텐츠는 빈 문자열.
  labels: { rift: string; guardian: string; sand: string; event: string };
};

// 캐릭터 1명의 레이드 외 콘텐츠 주간 수급.
// isRepresentative 인 캐릭터만 원정대 공통 콘텐츠(카오스 게이트·필드보스)를 함께 센다.
export function charContentRewards(itemLevel: number, isRepresentative: boolean): ContentBreakdown {
  const riftTier = itemLevel >= RIFT_MIN_LEVEL ? findTier(RIFT_TIERS, itemLevel) : null;
  const guardianTier = itemLevel >= GUARDIAN_MIN_LEVEL ? findTier(GUARDIAN_TIERS, itemLevel) : null;
  const rift = riftTier ? contentMaterials(riftTier.materials, RIFT_RUNS_PER_WEEK) : {};
  const guardian = guardianTier ? contentMaterials(guardianTier.materials, GUARDIAN_RUNS_PER_WEEK) : {};
  const sand =
    itemLevel >= EVENT_MIN_LEVEL
      ? contentMaterials(getSandMaterials(eventTierOf(itemLevel), SAND_ENHANCE_LEVEL), 1)
      : {};

  let event: MaterialCounts = {};
  let eventBoundGold = 0;
  if (isRepresentative && itemLevel >= EVENT_MIN_LEVEL) {
    const tier = eventTierOf(itemLevel);
    for (const content of EVENT_CONTENTS) {
      const mats = content.byTier[tier];
      event = addMaterials(event, contentMaterials(mats, content.perWeek));
      const gold = mats.find((m) => m.label === '귀속골드');
      if (gold) eventBoundGold += gold.amount * content.perWeek;
    }
  }

  const eventTier = eventTierOf(itemLevel);
  return {
    rift,
    guardian,
    sand,
    event,
    eventBoundGold,
    labels: {
      rift: riftTier?.label ?? '',
      guardian: guardianTier?.label ?? '',
      sand: itemLevel >= EVENT_MIN_LEVEL ? eventTier : '',
      event: isRepresentative && itemLevel >= EVENT_MIN_LEVEL ? eventTier : '',
    },
  };
}

export function contentTotal(c: ContentBreakdown): MaterialCounts {
  return [c.rift, c.guardian, c.sand, c.event].reduce<MaterialCounts>(addMaterials, {});
}

// ─── 재료 → 골드 환산 ───
// 재료명 → 개당 골드. 시세는 PriceContext 가 들고 있으므로 화면에서 만들어 넘긴다.
export type MaterialPrices = Record<string, number>;

export function materialsValue(counts: MaterialCounts, prices: MaterialPrices): number {
  let sum = 0;
  for (const [name, amount] of Object.entries(counts)) {
    sum += (prices[name] ?? 0) * amount;
  }
  return sum;
}
