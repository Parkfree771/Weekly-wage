// 숙제 달력 정산·동기화 헬퍼 — 앱 loalogol-app/src/data/weeklyRewards.ts + WeeklyScreen.tsx syncLogWithState 웹 포팅.
// 값 테이블은 앱과 1:1 동일해야 달력 기록(appActivityLog)이 웹·앱 어디서 만들어져도 같은 정산이 나온다.
import { raids } from '@/data/raids';
import { raidClearRewards } from '@/data/raidClearRewards';
import { raidRewards, MATERIAL_IDS } from '@/data/raidRewards';
import {
  Character, CharacterWeeklyState, CommonContentState, DailyContentState, WeeklyChecklist,
  getRaidGroupName, getCurrentWeekStart,
} from '@/types/user';
import {
  ActivityLog, ActivityEntry,
  decodeRaidLogValue, decodeSandLogValue, decodeCommonLogValue,
  encodeRaidLogValue, encodeSandLogValue, encodeCommonLogValue,
  withActivity, weekDayDateKey, todayGameDateKey,
} from '@/lib/activity-log';

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

// 레이드 그룹 카드 이미지 (앱 RAID_CARD_IMAGES와 동일)
export const RAID_CARD_IMAGES: Record<string, string> = {
  '지평의 성당': '/wlvuddmltjdekd1.webp',
  '성당': '/wlvuddmltjdekd1.webp',
  '세르카': '/cerka2.webp',
  '종막': '/abrelshud.webp',
  '4막': '/illiakan.webp',
  '3막': '/ivory-tower.webp',
  '2막': '/kazeros.webp',
  '1막': '/aegir.webp',
  '서막': '/echidna.webp',
  '베히모스': '/behemoth.webp',
};

// ─── 원정대 공통 컨텐츠 (필보/카게) ───

export type CommonContentDef = {
  name: string; shortName: string; image: string; color: string;
  days: number[]; gold: number; level: number;
};

const COMMON_CONTENT_BY_LEVEL: Record<string, Record<string, CommonContentDef>> = {
  '필드보스': {
    '1730': { name: '필드보스', shortName: '필보', image: '/field-boss.webp', color: '#b91c1c', days: [2, 5, 0], gold: 0, level: 1730 },
    '1750': { name: '필드보스', shortName: '필보', image: '/field-boss.webp', color: '#b91c1c', days: [2, 5, 0], gold: 0, level: 1750 },
  },
  '카오스 게이트': {
    '1730': { name: '카오스 게이트', shortName: '카게', image: '/chaos-gate.webp', color: '#6b21a8', days: [1, 4, 6, 0], gold: 3500, level: 1730 },
    '1750': { name: '카오스 게이트', shortName: '카게', image: '/chaos-gate.webp', color: '#6b21a8', days: [1, 4, 6, 0], gold: 5000, level: 1750 },
  },
};

export function getCommonContents(maxLevel: number): CommonContentDef[] {
  const tier = maxLevel >= 1750 ? '1750' : '1730';
  return Object.values(COMMON_CONTENT_BY_LEVEL).map(byLevel => byLevel[tier]);
}

// 공통 컨텐츠 재화 보상 (1회 기준)
export type CommonMaterialReward = { image?: string; label: string; amount: number };
export const COMMON_CONTENT_MATERIALS_BY_LEVEL: Record<string, Record<string, CommonMaterialReward[]>> = {
  '카오스 게이트': {
    '1730': [
      { image: '/breath-lava5.webp', label: '용숨', amount: 6 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 6 },
      { image: '/gold.webp', label: '귀속골드', amount: 3500 },
      { image: '/destiny-shard-bag-large5.webp', label: '운파', amount: 12000 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 6 },
    ],
    '1750': [
      { image: '/breath-lava5.webp', label: '용숨', amount: 7 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 7 },
      { image: '/gold.webp', label: '귀속골드', amount: 5000 },
      { image: '/destiny-shard-bag-large5.webp', label: '운파', amount: 13200 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 7 },
    ],
  },
  '필드보스': {
    '1730': [
      { image: '/top-destiny-destruction-stone5.webp', label: '파결', amount: 486.3 },
      { image: '/top-destiny-guardian-stone5.webp', label: '수결', amount: 1484.4 },
      { image: '/top-destiny-breakthrough-stone5.webp', label: '위돌', amount: 41.1 },
      { image: '/breath-lava5.webp', label: '용숨', amount: 3 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 3 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 21 },
      { image: '/cjstkd.webp', label: '천상', amount: 0.6 },
    ],
    '1750': [
      { image: '/top-destiny-destruction-stone5.webp', label: '파결', amount: 699.3 },
      { image: '/top-destiny-guardian-stone5.webp', label: '수결', amount: 2077.3 },
      { image: '/top-destiny-breakthrough-stone5.webp', label: '위돌', amount: 51 },
      { image: '/breath-lava5.webp', label: '용숨', amount: 3 },
      { image: '/breath-glacier5.webp', label: '빙숨', amount: 3 },
      { image: '/1fpqrjqghk.webp', label: '보석', amount: 21 },
      { image: '/cjstkd.webp', label: '천상', amount: 0.5 },
    ],
  },
};

// ─── 할의 모래시계 보상 (보상강화 레벨별) ───

type SandReward = { gems: number; stones: number; lavaBreath: number; glacierBreath: number };

const SAND_OF_TIME_REWARDS_1750: SandReward[] = [
  { gems: 6, stones: 12, lavaBreath: 12, glacierBreath: 12 },
  { gems: 12, stones: 24, lavaBreath: 24, glacierBreath: 24 },
  { gems: 18, stones: 36, lavaBreath: 36, glacierBreath: 36 },
  { gems: 24, stones: 48, lavaBreath: 48, glacierBreath: 48 },
  { gems: 30, stones: 60, lavaBreath: 60, glacierBreath: 60 },
  { gems: 36, stones: 72, lavaBreath: 72, glacierBreath: 72 },
];

const SAND_OF_TIME_REWARDS_1730: SandReward[] = [
  { gems: 15, stones: 30, lavaBreath: 10, glacierBreath: 10 },
  { gems: 30, stones: 36, lavaBreath: 20, glacierBreath: 20 },
  { gems: 45, stones: 42, lavaBreath: 30, glacierBreath: 30 },
  { gems: 60, stones: 48, lavaBreath: 40, glacierBreath: 40 },
  { gems: 75, stones: 54, lavaBreath: 50, glacierBreath: 50 },
  { gems: 90, stones: 60, lavaBreath: 60, glacierBreath: 60 },
];

export function getSandOfTimeRewards(itemLevel: number): SandReward[] {
  return itemLevel >= 1750 ? SAND_OF_TIME_REWARDS_1750 : SAND_OF_TIME_REWARDS_1730;
}

// ─── 가디언 토벌 로테이션 ───

const GUARDIAN_ROTATION = [
  { name: '쿤겔라니움', element: '뇌구', image: '/znsrpf.webp' },
  { name: '하누마탄', element: '무속성', image: '/gksn.webp' },
  { name: '데스칼루다', element: '수구', image: '/eptm.webp' },
  { name: '이그렉시온', element: '화구', image: '/dlrm.webp' },
  { name: '벨가누스', element: '세구', image: '/qpfrk.webp' },
  { name: '아카테스', element: '암구', image: '/dkzk.webp' },
  { name: '엘버하스틱', element: '수구', image: '/dpfqj.webp' },
];

const GUARDIAN_FIXED = [
  { minLevel: 1720, name: '크라티오스', element: '뇌구', image: '/zmfk.webp' },
  { minLevel: 1700, name: '드렉탈라스', element: '화구', image: '/emfpr.webp' },
  { minLevel: 1680, name: '스콜라키아', element: '토구', image: '/tmzhf.webp' },
  { minLevel: 1640, name: '아게오로스', element: '세구', image: '/dkrp.webp' },
];

const GUARDIAN_REF_WEEK = '2026-06-24'; // 기준주(수) = 쿤겔라니움(인덱스 0)

export function getCurrentGuardian(itemLevel: number): { name: string; element: string; image: string } {
  if (itemLevel >= 1730) {
    const refDate = new Date(GUARDIAN_REF_WEEK + 'T00:00:00+09:00');
    const currentWeek = new Date(getCurrentWeekStart() + 'T00:00:00+09:00');
    const diffWeeks = Math.round((currentWeek.getTime() - refDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const index = ((diffWeeks % GUARDIAN_ROTATION.length) + GUARDIAN_ROTATION.length) % GUARDIAN_ROTATION.length;
    return GUARDIAN_ROTATION[index];
  }
  for (const g of GUARDIAN_FIXED) {
    if (itemLevel >= g.minLevel) return g;
  }
  return { name: '가디언 토벌', element: '', image: '' };
}

// ─── 카던(균열/전선)·가토 라벨 및 일일 재화 ───

export function getChaosDungeonLabel(itemLevel: number): string {
  if (itemLevel >= 1750) return '1750 균열';
  if (itemLevel >= 1730) return '1730 균열';
  if (itemLevel >= 1720) return '1720 전선';
  if (itemLevel >= 1700) return '1700 전선';
  if (itemLevel >= 1680) return '1680 전선';
  return '';
}

export function getGuardianRaidLabel(itemLevel: number): string {
  if (itemLevel >= 1750) return '1750 가토';
  if (itemLevel >= 1730) return '1730 가토';
  if (itemLevel >= 1720) return '1720 가토';
  if (itemLevel >= 1700) return '1700 가토';
  if (itemLevel >= 1680) return '1680 가토';
  return '';
}

type DailyRewardDef = { minLevel: number; materials: { image: string; alt: string; daily: number }[] };

const CHAOS_DAILY_REWARDS: DailyRewardDef[] = [
  {
    minLevel: 1750,
    materials: [
      { image: '/top-destiny-destruction-stone5.webp', alt: '파괴석 결정', daily: 438.8 },
      { image: '/top-destiny-guardian-stone5.webp', alt: '수호석 결정', daily: 1177.5 },
      { image: '/top-destiny-breakthrough-stone5.webp', alt: '위대한 돌파석', daily: 18.8 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 54412.6 },
    ],
  },
  {
    minLevel: 1730,
    materials: [
      { image: '/top-destiny-destruction-stone5.webp', alt: '파괴석 결정', daily: 361.5 },
      { image: '/top-destiny-guardian-stone5.webp', alt: '수호석 결정', daily: 1092.2 },
      { image: '/top-destiny-breakthrough-stone5.webp', alt: '위대한 돌파석', daily: 17.7 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 43801.2 },
    ],
  },
  {
    minLevel: 1720,
    materials: [
      { image: '/destiny-destruction-stone5-v2.webp', alt: '파괴석', daily: 745.8 },
      { image: '/destiny-guardian-stone5-v2.webp', alt: '수호석', daily: 2058.2 },
      { image: '/destiny-breakthrough-stone5.webp', alt: '돌파석', daily: 47 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 40311.9 },
    ],
  },
  {
    minLevel: 1700,
    materials: [
      { image: '/destiny-destruction-stone5-v2.webp', alt: '파괴석', daily: 593.9 },
      { image: '/destiny-guardian-stone5-v2.webp', alt: '수호석', daily: 1733.4 },
      { image: '/destiny-breakthrough-stone5.webp', alt: '돌파석', daily: 41.3 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 33557 },
    ],
  },
  {
    minLevel: 1680,
    materials: [
      { image: '/destiny-destruction-stone5-v2.webp', alt: '파괴석', daily: 416.7 },
      { image: '/destiny-guardian-stone5-v2.webp', alt: '수호석', daily: 1190.3 },
      { image: '/destiny-breakthrough-stone5.webp', alt: '돌파석', daily: 36.2 },
      { image: '/destiny-shard-bag-large5.webp', alt: '파편', daily: 32445.4 },
    ],
  },
];

const GUARDIAN_DAILY_REWARDS: DailyRewardDef[] = [
  { minLevel: 1750, materials: [{ image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 11.9 }] },
  { minLevel: 1730, materials: [{ image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 10.5 }] },
  { minLevel: 1720, materials: [{ image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 6.4 }] },
  { minLevel: 1700, materials: [{ image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 5.3 }] },
  { minLevel: 1680, materials: [{ image: '/1fpqrjqghk.webp', alt: '1레벨 보석', daily: 5.2 }] },
];

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
    const { level, is1750 } = decodeSandLogValue(entry.value, maxLevel);
    const reward = getSandOfTimeRewards(is1750 ? 1750 : 1730)[level];
    if (!reward) return null;
    return {
      goldFree: 0,
      goldBound: 0,
      mats: [
        // 보석은 1레벨 환산 (1750+ ×9, 미만 ×3 — 주간 수급량과 동일)
        { image: '/1fpqrjqghk.webp', amount: is1750 ? reward.gems * 9 : reward.gems * 3 },
        { image: '/top-destiny-breakthrough-stone5.webp', amount: reward.stones },
        { image: '/breath-lava5.webp', amount: reward.lavaBreath },
        { image: '/breath-glacier5.webp', amount: reward.glacierBreath },
      ].filter(m => m.amount > 0),
    };
  }
  if (id.startsWith('common|')) {
    const name = id.slice('common|'.length);
    const tier = decodeCommonLogValue(entry.value, maxLevel) ? '1750' : '1730';
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
          value: encodeSandLogValue(cs.sandOfTimeLevel || 0, lvl >= 1750),
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
  const commonDefs = getCommonContents(maxLevel);
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
      value: encodeCommonLogValue(maxLevel >= 1750),
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
