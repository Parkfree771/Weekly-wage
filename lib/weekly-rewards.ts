// 숙제 달력 정산·동기화 헬퍼 — 앱 loalogol-app/src/data/weeklyRewards.ts + WeeklyScreen.tsx syncLogWithState 웹 포팅.
// 값 테이블은 앱과 1:1 동일해야 달력 기록(appActivityLog)이 웹·앱 어디서 만들어져도 같은 정산이 나온다.
import { raids } from '@/data/raids';
import { raidClearRewards } from '@/data/raidClearRewards';
import { raidRewards, MATERIAL_IDS } from '@/data/raidRewards';
import {
  Character, CommonContentState, DailyContentState, WeeklyChecklist,
  getRaidGroupName,
} from '@/types/user';
import {
  ActivityLog, ActivityEntry,
  decodeRaidLogValue, decodeSandLogValue, decodeCommonLogValue,
  encodeRaidLogValue, encodeSandLogValue, encodeCommonLogValue,
  withActivity, weekDayDateKey, todayGameDateKey,
} from '@/lib/activity-log';
// 콘텐츠 수치는 전부 단일 원본 테이블에서 가져온다 (직접 하드코딩 금지)
import {
  EVENT_CONTENTS, EVENT_TIER_KEYS, GUARDIAN_TIERS, RAID_CARD_IMAGES, RIFT_TIERS, SAND_TABLE,
  SAND_GEM_TO_LV1, eventTierOf, sandTierOf, findTier, type SandRow,
} from '@/data/rewardTable';
import { getCurrentGuardian } from '@/lib/daily-content';

const raidMap = new Map(raids.map(r => [r.name, r]));

// 귀속 골드 표기 색 (웹 BOUND_GOLD_TEXT와 동일)
export const BOUND_GOLD_COLOR = '#e879f9';

// 일일 체크 횟수별 색 (mypage dailyX1~4와 동일)
export const DAILY_COLORS = ['', '#16a34a', '#2563eb', '#ea580c', '#9333ea'];
export const DAILY_LABELS = ['', '일반', '휴게', 'PC방', 'PC방+휴게'];
export const CHECKED_GREEN = '#16a34a';

export const EMPTY_DAILY: DailyContentState = { checks: [0, 0, 0, 0, 0, 0, 0] };

// 난이도 라벨 (그룹명 뒤 부분, 단일 난이도면 그룹명 그대로) — 앱 getRaidDifficultyLabel
export function getRaidDifficultyLabel(raidName: string): string {
  const group = getRaidGroupName(raidName);
  const rest = raidName.slice(group.length).trim();
  return rest || raidName;
}

// 레이드 그룹 카드 이미지 — 단일 원본 테이블에서 재수출 (앱과 동일)
export { RAID_CARD_IMAGES };

// ─── 원정대 공통 컨텐츠 (필보/카게) ───

export type CommonContentDef = {
  name: string; shortName: string; image: string; color: string;
  days: number[]; gold: number; level: number;
};

// 원정대 공통 콘텐츠 정의 — 단일 원본 테이블(EVENT_CONTENTS)에서 파생
export function getCommonContents(maxLevel: number): CommonContentDef[] {
  const tier = eventTierOf(maxLevel);
  return EVENT_CONTENTS.map(c => ({
    name: c.name,
    shortName: c.shortName,
    image: c.image,
    color: c.color,
    days: c.days,
    gold: c.gold[tier],
    level: Number(tier),
  }));
}

// 공통 컨텐츠 재화 보상 (1회 기준) — EVENT_CONTENTS 에서 파생, 좁은 칸이라 short 라벨을 쓴다
export type CommonMaterialReward = { image?: string; label: string; amount: number };
export const COMMON_CONTENT_MATERIALS_BY_LEVEL: Record<string, Record<string, CommonMaterialReward[]>> =
  Object.fromEntries(
    EVENT_CONTENTS.map(c => [
      c.name,
      Object.fromEntries(
        EVENT_TIER_KEYS.map(tier => [
          tier,
          c.byTier[tier].map(m => ({ image: m.image, label: m.short, amount: m.amount })),
        ]),
      ),
    ]),
  );

// ─── 할의 모래시계 보상 (보상강화 레벨별) ───

type SandReward = SandRow;

export function getSandOfTimeRewards(itemLevel: number): SandReward[] {
  return SAND_TABLE[sandTierOf(itemLevel)];
}

// ─── 가디언 토벌 로테이션 ─── (단일 원본 테이블 기반, lib/daily-content 와 같은 함수)
export { getCurrentGuardian };

// ─── 카던(균열/전선)·가토 라벨 및 일일 재화 ───

// 라벨·일일 재화 전부 단일 원본 테이블(RIFT_TIERS / GUARDIAN_TIERS)에서 파생한다.
export function getChaosDungeonLabel(itemLevel: number): string {
  return findTier(RIFT_TIERS, itemLevel)?.label ?? '';
}

export function getGuardianRaidLabel(itemLevel: number): string {
  return findTier(GUARDIAN_TIERS, itemLevel)?.label ?? '';
}

type DailyRewardDef = { minLevel: number; materials: { image: string; alt: string; daily: number }[] };

const toDaily = (tiers: typeof RIFT_TIERS): DailyRewardDef[] =>
  tiers.map(t => ({
    minLevel: t.minLevel,
    materials: t.materials.map(m => ({ image: m.image, alt: m.short, daily: m.amount })),
  }));

const CHAOS_DAILY_REWARDS: DailyRewardDef[] = toDaily(RIFT_TIERS);
const GUARDIAN_DAILY_REWARDS: DailyRewardDef[] = toDaily(GUARDIAN_TIERS);
export function getChaosDailyReward(itemLevel: number): DailyRewardDef | null {
  return CHAOS_DAILY_REWARDS.find(r => itemLevel >= r.minLevel) || null;
}

export function getGuardianDailyReward(itemLevel: number): DailyRewardDef | null {
  return GUARDIAN_DAILY_REWARDS.find(r => itemLevel >= r.minLevel) || null;
}

// ─── 달력 월간 정산 — 활동 로그 엔트리 → 골드/재료 역산 (앱 valueActivityEntry와 동일) ───
// · 레이드: «그룹 난이도» 라벨로 레이드 역조회, 전 관문 클리어 기준.
//   골드 미획득이면 골드 0(재료는 그대로), 더보기면 더보기 재료 추가 + 비용은 귀속 골드 먼저 차감(부족분 유통, 음수 가능)
// · 균열/전선·가토: 라벨의 티어(예: «1730 균열») × 체크값(휴게 2배 등)
// · 모래시계: value의 보상강화 레벨·티어로 보상표 조회 (보석은 1레벨 환산 — 주간 수급량과 동일)
// · 공통(카게/필보): value의 티어로 회당 보상표 (카게 골드는 귀속)
// · 낙원: 정산 대상 아님

// itemId → 이미지 (mypage itemIdInfoRef와 동일)
const ITEM_ID_INFO: Record<number, { name: string; image: string }> = {
  [MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL]: { name: '운명의 파괴석 결정', image: '/top-destiny-destruction-stone5.webp' },
  [MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL]: { name: '운명의 수호석 결정', image: '/top-destiny-guardian-stone5.webp' },
  [MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE]: { name: '위대한 운명의 돌파석', image: '/top-destiny-breakthrough-stone5.webp' },
  [MATERIAL_IDS.FATE_DESTRUCTION_STONE]: { name: '운명의 파괴석', image: '/destiny-destruction-stone5.webp' },
  [MATERIAL_IDS.FATE_GUARDIAN_STONE]: { name: '운명의 수호석', image: '/destiny-guardian-stone5.webp' },
  [MATERIAL_IDS.FATE_BREAKTHROUGH_STONE]: { name: '운명의 돌파석', image: '/destiny-breakthrough-stone5.webp' },
  [MATERIAL_IDS.FATE_FRAGMENT]: { name: '운명의 파편', image: '/destiny-shard-bag-large5.webp' },
};

export type EntryValuation = {
  goldFree: number;
  goldBound: number;
  mats: { image: string; amount: number }[];
};

// 로그 라벨(syncLogWithState와 동일한 «그룹 난이도» 형식) → 레이드
let raidByLogLabelCache: Map<string, (typeof raids)[number]> | null = null;
function raidByLogLabel(label: string) {
  if (!raidByLogLabelCache) {
    raidByLogLabelCache = new Map();
    raids.forEach(r => {
      const group = getRaidGroupName(r.name);
      raidByLogLabelCache!.set(`${group} ${getRaidDifficultyLabel(r.name)}`.trim(), r);
    });
  }
  return raidByLogLabelCache.get(label);
}

export function valueActivityEntry(
  id: string,
  entry: { label: string; value: number },
  maxLevel: number,
): EntryValuation | null {
  if (id.startsWith('raid|')) {
    const raid = raidByLogLabel(entry.label);
    if (!raid) return null;
    const { noGold, more } = decodeRaidLogValue(entry.value);
    let gold = 0;
    let bound = 0;
    let moreCost = 0;
    const amountMap: Record<number, number> = {};
    const addMats = (mats: { itemId: number; amount: number }[] | undefined) => {
      mats?.forEach(m => {
        if (m.itemId === 0 || m.amount === 0) return;
        amountMap[m.itemId] = (amountMap[m.itemId] || 0) + m.amount;
      });
    };
    raid.gates.forEach((g, i) => {
      if (!noGold) {
        gold += g.gold;
        bound += g.boundGold;
      }
      if (more) moreCost += g.moreGold;
      addMats(raidClearRewards.find(r => r.raidName === raid.name && r.gate === i + 1)?.materials);
      if (more) addMats(raidRewards.find(r => r.raidName === raid.name && r.gate === i + 1)?.materials);
    });
    // 더보기 비용은 귀속 골드에서 우선 차감, 부족분은 유통에서 (음수 가능)
    const baseFree = gold - bound;
    const boundDeduct = Math.min(bound, moreCost);
    return {
      goldFree: baseFree - (moreCost - boundDeduct),
      goldBound: bound - boundDeduct,
      mats: Object.entries(amountMap)
        .filter(([iid]) => ITEM_ID_INFO[Number(iid)])
        .map(([iid, amt]) => ({ image: ITEM_ID_INFO[Number(iid)].image, amount: amt })),
    };
  }
  if (id.startsWith('daily|')) {
    const tier = parseInt(entry.label, 10);
    if (!tier) return null;
    const def = id.endsWith('|chaosDungeon')
      ? getChaosDailyReward(tier)
      : id.endsWith('|guardianRaid')
        ? getGuardianDailyReward(tier)
        : null;
    if (!def) return null;
    const mult = entry.value > 0 ? entry.value : 1;
    return {
      goldFree: 0,
      goldBound: 0,
      mats: def.materials.map(m => ({ image: m.image, amount: m.daily * mult })),
    };
  }
  if (id.startsWith('weekly|') && id.endsWith('|sandOfTime')) {
    const { level, tier } = decodeSandLogValue(entry.value, maxLevel);
    const reward = SAND_TABLE[tier][level];
    if (!reward) return null;
    return {
      goldFree: 0,
      goldBound: 0,
      mats: [
        // 보석은 1레벨 환산 (1730=2레벨 ×3, 1750·1770=3레벨 ×9 — 주간 수급량과 동일)
        { image: '/1fpqrjqghk.webp', amount: reward.gems * SAND_GEM_TO_LV1[tier] },
        { image: '/top-destiny-breakthrough-stone5.webp', amount: reward.stones },
        { image: '/breath-lava5.webp', amount: reward.lavaBreath },
        { image: '/breath-glacier5.webp', amount: reward.glacierBreath },
      ].filter(m => m.amount > 0),
    };
  }
  if (id.startsWith('common|')) {
    const name = id.slice('common|'.length);
    const tier = decodeCommonLogValue(entry.value, maxLevel);
    const rewards = COMMON_CONTENT_MATERIALS_BY_LEVEL[name]?.[tier];
    if (!rewards || rewards.length === 0) return null;
    const goldRow = rewards.find(r => r.image === '/gold.webp');
    return {
      goldFree: 0,
      goldBound: goldRow?.amount || 0,
      mats: rewards
        .filter(r => r.image && r.image !== '/gold.webp')
        .map(r => ({ image: r.image!, amount: r.amount })),
    };
  }
  return null;
}

// ─── 달력 로그 ↔ 체크리스트(DB 원본) 동기화 (이번 주) — 앱 syncLogWithState와 동일 ───
// 탭 순간에만 기록하면 기능 추가 전·앱/다른 기기에서 체크한 것이 달력에 안 보인다.
// 일숙(균열/가토)은 요일별 값이 상태에 그대로 있으므로 상태가 항상 원본.
// 레이드/모래시계/낙원/공통은 체크 날짜를 상태가 모르므로: 로그에 없으면 해당 날짜(공통은 요일, 그 외 오늘)로 보정,
// 상태에서 해제됐으면 이번 주 로그에서 제거. 변경이 없으면 같은 참조를 돌려줘 무한 갱신을 막는다.

export type ActivitySyncState = {
  characters: Character[];
  weeklyChecklist: WeeklyChecklist;
  commonContent?: CommonContentState;
  /** 카게·필보 티어 기준이 되는 대표 캐릭터 이름. 없으면 원정대 최고 레벨로 잡는다 */
  representativeChar?: string;
};

export function syncLogWithState(log: ActivityLog, state: ActivitySyncState): ActivityLog {
  let next = log;
  const weekKeys: string[] = [];
  for (let i = 0; i < 7; i++) weekKeys.push(weekDayDateKey(i));
  const todayKey = todayGameDateKey();

  const setIfDiff = (dateKey: string, id: string, entry: ActivityEntry | null) => {
    const curr = next[dateKey]?.[id];
    if (!entry) {
      if (curr) next = withActivity(next, dateKey, id, null);
      return;
    }
    if (curr && curr.value === entry.value && curr.label === entry.label && curr.image === entry.image) return;
    next = withActivity(next, dateKey, id, entry);
  };
  const hasInWeek = (id: string) => weekKeys.some(k => !!next[k]?.[id]);
  const removeInWeek = (id: string) => {
    weekKeys.forEach(k => { if (next[k]?.[id]) next = withActivity(next, k, id, null); });
  };

  state.characters.forEach(char => {
    const cs = state.weeklyChecklist[char.name];
    if (!cs) return;
    const lvl = char.itemLevel;

    // 일숙 — 요일별 상태 그대로 반영 (값 0이면 제거)
    (['chaosDungeon', 'guardianRaid'] as const).forEach(field => {
      const st: DailyContentState =
        cs[field] && typeof cs[field] === 'object' ? cs[field] as DailyContentState : EMPTY_DAILY;
      for (let d = 0; d < 7; d++) {
        const raw = st.checks[d];
        const val = typeof raw === 'number' ? raw : (raw ? 1 : 0);
        setIfDiff(weekKeys[d], `daily|${char.name}|${field}`, val > 0 ? {
          label: (field === 'chaosDungeon' ? getChaosDungeonLabel(lvl) : getGuardianRaidLabel(lvl))
            || (field === 'chaosDungeon' ? '균열/전선' : '가디언 토벌'),
          image: field === 'chaosDungeon'
            ? (lvl >= 1730 ? '/zkejs.webp' : '/wjstjs.webp')
            : (getCurrentGuardian(lvl).image || undefined),
          charName: char.name, kind: 'daily', value: val,
        } : null);
      }
    });

    // 레이드 — 전 관문 체크면 기록 보장, 해제면 이번 주에서 제거.
    // value에 골드 미획득/더보기 토글을 인코딩 — 토글을 나중에 바꿔도 이번 주 기록이 따라 갱신됨
    Object.entries(cs.raids || {}).forEach(([raidName, gates]) => {
      const group = getRaidGroupName(raidName);
      const id = `raid|${char.name}|${group}`;
      const checked = !!gates && gates.length > 0 && gates.every(Boolean);
      if (checked) {
        const dayKey = weekKeys.find(k => !!next[k]?.[id]) || todayKey;
        setIfDiff(dayKey, id, {
          label: `${group} ${getRaidDifficultyLabel(raidName)}`.trim(),
          image: RAID_CARD_IMAGES[group] || raidMap.get(raidName)?.image,
          charName: char.name, kind: 'raid',
          value: encodeRaidLogValue(
            cs.raidGoldReceive?.[raidName] === false,
            cs.raidMoreGoldExclude?.[raidName] === true,
          ),
        });
      } else {
        removeInWeek(id);
      }
    });

    // 모래시계 — value에 보상강화 레벨·티어 인코딩 (레벨을 나중에 바꿔도 이번 주 기록이 따라 갱신됨)
    {
      const id = `weekly|${char.name}|sandOfTime`;
      if (cs.sandOfTime) {
        const dayKey = weekKeys.find(k => !!next[k]?.[id]) || todayKey;
        setIfDiff(dayKey, id, {
          label: '모래시계', image: '/gkf.webp', charName: char.name, kind: 'weekly',
          value: encodeSandLogValue(cs.sandOfTimeLevel || 0, lvl),
        });
      } else {
        removeInWeek(id);
      }
    }
    // 낙원
    {
      const id = `weekly|${char.name}|paradise`;
      if (cs.paradise) {
        if (!hasInWeek(id)) setIfDiff(todayKey, id, { label: '낙원', image: '/skrdnjs.webp', charName: char.name, kind: 'weekly', value: 1 });
      } else {
        removeInWeek(id);
      }
    }
  });

  // 공통 컨텐츠 — key `${jsDay}-${이름}` → 이번 주 해당 요일 날짜로 기록, 해제분은 정리
  const JS_TO_WEEK: Record<number, number> = { 3: 0, 4: 1, 5: 2, 6: 3, 0: 4, 1: 5, 2: 6 };
  const maxLevel = state.characters.reduce((m, c) => Math.max(m, c.itemLevel), 0);
  // 카게·필보는 대표 캐릭터가 도는 콘텐츠라 대표 레벨로 티어를 잡는다 (mypage 표시와 같은 기준).
  // 대표를 못 찾으면 종전대로 원정대 최고 레벨.
  const commonLevel =
    state.characters.find(c => c.name === state.representativeChar)?.itemLevel ?? maxLevel;
  const commonDefs = getCommonContents(commonLevel);
  const checkedPairs = new Set<string>();
  Object.entries(state.commonContent?.checks || {}).forEach(([key, v]) => {
    if (v !== true) return;
    const dash = key.indexOf('-');
    const jsDay = Number(key.slice(0, dash));
    const name = key.slice(dash + 1);
    const wIdx = JS_TO_WEEK[jsDay];
    if (wIdx === undefined || Number.isNaN(wIdx)) return;
    const def = commonDefs.find(c => c.name === name);
    const id = `common|${name}`;
    checkedPairs.add(`${weekKeys[wIdx]}|${id}`);
    setIfDiff(weekKeys[wIdx], id, {
      label: def?.shortName || name, image: def?.image, kind: 'common',
      value: encodeCommonLogValue(commonLevel),
    });
  });
  weekKeys.forEach(k => {
    const day = next[k];
    if (!day) return;
    Object.keys(day).forEach(id => {
      if (id.startsWith('common|') && !checkedPairs.has(`${k}|${id}`)) {
        next = withActivity(next, k, id, null);
      }
    });
  });

  return next;
}
