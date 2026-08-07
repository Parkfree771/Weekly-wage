// ─── 아제나의 축복 [28일] — 코드로 박아둔 공식 패키지 ───
// 유저 등록 글이 아니라 사이트가 직접 제공하는 고정 패키지다.
// 갤러리 카드·상세 페이지(/package/azena-blessing)가 이 파일 하나를 단일 원본으로 쓴다.
// 구성·확률은 2025-10-01 공식 판매 공지 + 이후 편린 확률 변경 공지 기준.

import { getItemUnitPrice, TEMPLATES_MAP } from '@/lib/package-shared';
import { getItemsByCategory } from '@/lib/items-to-track';
import { calcEngravingExpectedValue } from '@/lib/hell-reward-calc';

export const AZENA_POST_ID = 'azena-blessing';
export const AZENA_TITLE = '아제나의 축복 [28일]';
export const AZENA_ROYAL_CRYSTAL = 7700; // 판매가 7,700 로열 크리스탈
export const AZENA_PRICE_WON = 7700;     // 현금가 7,700원
export const AZENA_DAYS = 28;
export const AZENA_WEEKS = 4;
export const AZENA_SALE_START = '25.10.01';
// 환율 미입력 시 기본값 (100골드당 원) — 갤러리 공통 환율이 들어오면 그쪽이 우선
export const AZENA_DEFAULT_WON_PER_100_GOLD = 15;

// ─── 커스텀 옵션 ───
export type AzenaDailyChoice = 'auto' | 'abidos' | 'lava' | 'glacier';

// 아이템 레벨 구간 — 1730 이상(기본)과 이하는 일일 융화 재료·레이드 재련 상자 구성이 다르다
export type AzenaTier = 'high' | 'low';

export type AzenaOptions = {
  tier: AzenaTier;               // 1730 이상('high', 기본) / 1730 이하('low')
  dailyChoice: AzenaDailyChoice; // 일일 선택 상자에서 뭘 고를지 (auto = 시세 최고가)
  paradiseSeason: boolean;       // 낙원 시즌 진행 중 — 아닐 땐 천상 도전권 미지급
  weeklyRaidClears: number;      // 엔드 컨텐츠 1관문 주간 클리어 수 (0~3) → 보너스 상자 개수
  resonanceCount: number;        // 공명의 기운 사용 개수 (28일 총합, 균열 +1회씩)
  restPotionCount: number;       // 휴게 물약 사용 개수 (균열 +1회씩)
  pcRoomVisits: number;          // PC방 방문 횟수 (방문당 균열 +2회)
};

export const AZENA_DEFAULT_OPTIONS: AzenaOptions = {
  tier: 'high',
  dailyChoice: 'auto',
  paradiseSeason: true,
  weeklyRaidClears: 3,
  resonanceCount: 0,
  restPotionCount: 0,
  pcRoomVisits: 0,
};

export const AZENA_MAX_WEEKLY_RAID_CLEARS = 3;

// ─── 일일 보상 ───
// 도약의 정수 ×1 + 아제나의 축복이 깃든 선택 상자 ×1 (매일, 총 28회)
// 선택 상자는 3택1이지만 카드 팩 선택지는 계산에서 제외한다 (융화/재련 보조가 항상 이득).
// 융화 재료는 티어에 따라 다르다: 1730 이상 = 상급 아비도스 ×10, 1730 이하 = 아비도스 ×20.
export type AzenaDailyBoxOption = {
  key: Exclude<AzenaDailyChoice, 'auto'>;
  name: string;
  shortName: string;
  itemId: string;
  quantity: number;
  icon: string;
};

const DAILY_BREATH_OPTIONS: AzenaDailyBoxOption[] = [
  { key: 'lava', name: '용암의 숨결', shortName: '용숨', itemId: '66111131', quantity: 3, icon: '/breath-lava5.webp' },
  { key: 'glacier', name: '빙하의 숨결', shortName: '빙숨', itemId: '66111132', quantity: 9, icon: '/breath-glacier5.webp' },
];

const DAILY_BOX_OPTIONS_BY_TIER: Record<AzenaTier, AzenaDailyBoxOption[]> = {
  high: [
    { key: 'abidos', name: '상급 아비도스 융화 재료', shortName: '상비도스', itemId: '6861013', quantity: 10, icon: '/top-abidos-fusion5.webp' },
    ...DAILY_BREATH_OPTIONS,
  ],
  low: [
    { key: 'abidos', name: '아비도스 융화 재료', shortName: '아비도스', itemId: '6861012', quantity: 20, icon: '/abidos-fusion5.webp?v=4' },
    ...DAILY_BREATH_OPTIONS,
  ],
};

export function getAzenaDailyBoxOptions(tier: AzenaTier): AzenaDailyBoxOption[] {
  return DAILY_BOX_OPTIONS_BY_TIER[tier];
}

// 도약의 정수 — 패키지 등록 템플릿과 같은 블크 환산 (10 BC/개)
const LEAP_ESSENCE_BC = TEMPLATES_MAP['leap-essence']?.crystalPerUnit || 10;

// ─── 주간 보상 ───
// 천상 도전 횟수 +1 ×1 (매주, 총 4회) — 낙원 시즌 중에만 지급
const CELESTIAL_TICKET_GOLD = TEMPLATES_MAP['celestial-ticket']?.fixedGold || 3000;

// ─── 전용 버프 ───
// 요리(명인의 허브 스테이크)와 중복 불가인 스탯 버프 → 허브 스테이크 대체 가치로 환산.
// 레이드 3회 = 주당 스테이크 3개를 아낀다고 본다. 시세 미추적 아이템이라 고정가.
export const AZENA_BUFF_STEAK_GOLD = 1500;
export const AZENA_BUFF_STEAK_PER_WEEK = 3;

// ─── 축복의 편린 (균열·가디언 토벌 1판당 7.5% 등장) ───
export const FRAGMENT_DROP_RATE = 0.075;
// 기본 판수: 균열 1회/일 + 가디언 토벌 1회/일 × 28일
export const FRAGMENT_BASE_RIFT_RUNS = AZENA_DAYS;
export const FRAGMENT_BASE_GUARDIAN_RUNS = AZENA_DAYS;

// 편린 구성 — 변경 공지(300,000 골드 더미 추가) 반영 확률
export const FRAGMENT_GOLD_TABLE: { gold: number; p: number }[] = [
  { gold: 10000, p: 40 },
  { gold: 20000, p: 25 },
  { gold: 50000, p: 9.6 },
  { gold: 100000, p: 3 },
  { gold: 200000, p: 1.6 },
  { gold: 300000, p: 0.8 },
];
export const FRAGMENT_ENGRAVING_RANDOM_P = 4.5; // 유물 각인서 주머니 (랜덤) — 12종 균등
export const FRAGMENT_ENGRAVING_SELECT_P = 0.5; // 유물 각인서 주머니 (선택)
export const FRAGMENT_LEGENDARY_PACK_P = 2.85 * 4 + 3.15; // 진격 I·II, 기백 I·II, 염원 — 전설 카드팩류는 가치 동일
export const FRAGMENT_SELECT_PACK_P = 0.45;               // 도약의 전설 카드 선택 팩 II

// 카드팩 가치 — 패키지 등록 템플릿 고정가 재활용 (편린 팝업 표시용으로 export)
export const LEGENDARY_PACK_GOLD = TEMPLATES_MAP['legendary-cardpack']?.fixedGold || 8000;
export const LEGENDARY_SELECT_PACK_GOLD = TEMPLATES_MAP['legendary-card-select']?.fixedGold || 16000;

// 유물 각인서 12종 — 시세 추적 목록 재활용 (랜덤 = 평균가, 선택 = 최고가)
const ENGRAVING_IDS = getItemsByCategory('engraving').map((i) => i.id);

// ─── 엔드 컨텐츠 보너스 상자 (아제나의 축복이 깃든 상자, 1관문 클리어 시 주 3회) ───
// 소/중/대 구성은 현행 인게임 기준 (판매 공지의 찬란한/운명 택1 구조는 옛 정보).
export const AZENA_RAID_BOX_TABLE: { key: 'small' | 'medium' | 'large'; label: string; p: number }[] = [
  { key: 'small', label: '축복의 재련 재료 선택 상자 (소)', p: 56 },
  { key: 'medium', label: '축복의 재련 재료 선택 상자 (중)', p: 16 },
  { key: 'large', label: '축복의 재련 재료 선택 상자 (대)', p: 8 },
];
export const AZENA_RAID_BOX_GOLD: { gold: number; p: number }[] = [
  { gold: 1500, p: 18 },
  { gold: 3000, p: 2 },
];
const REFINE_BOX_CONTENTS_BY_TIER: Record<AzenaTier, Record<'small' | 'medium' | 'large', { itemId: string; label: string; amount: number; icon: string }[]>> = {
  // 1730 이상 — 계승 재료 (결정·위대한 돌파석)
  high: {
    small: [
      { itemId: '66130143', label: '운명의 파편', amount: 6000, icon: '/fate-fragment.webp' },
      { itemId: '66110226', label: '위대한 운명의 돌파석', amount: 15, icon: '/destiny-breakthrough-stone2.webp' },
      { itemId: '66102107', label: '운명의 수호석 결정', amount: 700, icon: '/top-destiny-guardian-stone5.webp' },
      { itemId: '66102007', label: '운명의 파괴석 결정', amount: 350, icon: '/top-destiny-destruction-stone5.webp' },
    ],
    medium: [
      { itemId: '66130143', label: '운명의 파편', amount: 12000, icon: '/fate-fragment.webp' },
      { itemId: '66110226', label: '위대한 운명의 돌파석', amount: 30, icon: '/destiny-breakthrough-stone2.webp' },
      { itemId: '66102107', label: '운명의 수호석 결정', amount: 1500, icon: '/top-destiny-guardian-stone5.webp' },
      { itemId: '66102007', label: '운명의 파괴석 결정', amount: 750, icon: '/top-destiny-destruction-stone5.webp' },
    ],
    large: [
      { itemId: '66130143', label: '운명의 파편', amount: 24000, icon: '/fate-fragment.webp' },
      { itemId: '66110226', label: '위대한 운명의 돌파석', amount: 60, icon: '/destiny-breakthrough-stone2.webp' },
      { itemId: '66102107', label: '운명의 수호석 결정', amount: 3000, icon: '/top-destiny-guardian-stone5.webp' },
      { itemId: '66102007', label: '운명의 파괴석 결정', amount: 1500, icon: '/top-destiny-destruction-stone5.webp' },
    ],
  },
  // 1730 이하 — 일반 재료 (운명의 돌파석·수호석·파괴석)
  low: {
    small: [
      { itemId: '66130143', label: '운명의 파편', amount: 4500, icon: '/fate-fragment.webp' },
      { itemId: '66110225', label: '운명의 돌파석', amount: 30, icon: '/destiny-breakthrough-stone.webp' },
      { itemId: '66102106', label: '운명의 수호석', amount: 1400, icon: '/destiny-guardian-stone.webp' },
      { itemId: '66102006', label: '운명의 파괴석', amount: 700, icon: '/destiny-destruction-stone.webp' },
    ],
    medium: [
      { itemId: '66130143', label: '운명의 파편', amount: 9000, icon: '/fate-fragment.webp' },
      { itemId: '66110225', label: '운명의 돌파석', amount: 60, icon: '/destiny-breakthrough-stone.webp' },
      { itemId: '66102106', label: '운명의 수호석', amount: 3000, icon: '/destiny-guardian-stone.webp' },
      { itemId: '66102006', label: '운명의 파괴석', amount: 1500, icon: '/destiny-destruction-stone.webp' },
    ],
    large: [
      { itemId: '66130143', label: '운명의 파편', amount: 18000, icon: '/fate-fragment.webp' },
      { itemId: '66110225', label: '운명의 돌파석', amount: 120, icon: '/destiny-breakthrough-stone.webp' },
      { itemId: '66102106', label: '운명의 수호석', amount: 5000, icon: '/destiny-guardian-stone.webp' },
      { itemId: '66102006', label: '운명의 파괴석', amount: 2500, icon: '/destiny-destruction-stone.webp' },
    ],
  },
};

// ─── 계산 결과 구조 ───
export type AzenaBreakdown = {
  daily: {
    essenceUnitGold: number;   // 도약의 정수 1개 골드 환산
    essenceGold: number;       // ×28
    boxChoice: Exclude<AzenaDailyChoice, 'auto'>; // auto가 풀린 실제 선택
    boxUnitGold: number;       // 선택 상자 1개 가치
    boxGold: number;           // ×28
    total: number;
  };
  weekly: {
    included: boolean;
    ticketUnitGold: number;
    total: number; // ×4 (미포함이면 0)
  };
  fragments: {
    baseRuns: number;       // 균열 28 + 가토 28
    extraRuns: number;      // 공명 + 휴게 + PC방×2
    totalRuns: number;
    expectedCount: number;  // 판수 × 7.5%
    perFragment: {
      goldEV: number;
      engravingAvg: number;
      engravingMax: number;
      engravingEV: number;
      cardpackEV: number;
      total: number;
    };
    total: number;
  };
  raidBoxes: {
    count: number; // 주간 클리어 수 × 4주
    boxValues: { small: number; medium: number; large: number };
    perBoxEV: number;
    total: number;
  };
  buff: {
    unitGold: number;
    count: number; // 주 3개 × 4주
    total: number;
  };
  totalGold: number;
};

/** 재련 재료 상자(소/중/대)의 내용물 목록 — 상세 페이지 아이콘 표시용 (티어 연동) */
export function getAzenaRefineBoxContents(
  size: 'small' | 'medium' | 'large',
  tier: AzenaTier,
): { itemId: string; label: string; amount: number; icon: string }[] {
  return REFINE_BOX_CONTENTS_BY_TIER[tier][size];
}

/** 재련 재료 상자(소/중/대) 1개 가치 = Σ(수량 × 개당 시세) */
export function getAzenaRefineBoxGold(
  size: 'small' | 'medium' | 'large',
  prices: Record<string, number>,
  tier: AzenaTier,
): number {
  return REFINE_BOX_CONTENTS_BY_TIER[tier][size].reduce(
    (sum, c) => sum + getItemUnitPrice(c.itemId, prices) * c.amount,
    0,
  );
}

/** 일일 선택 상자 옵션 1개 가치 */
export function getAzenaDailyBoxOptionGold(
  key: Exclude<AzenaDailyChoice, 'auto'>,
  prices: Record<string, number>,
  tier: AzenaTier,
): number {
  const opt = getAzenaDailyBoxOptions(tier).find((o) => o.key === key)!;
  return getItemUnitPrice(opt.itemId, prices) * opt.quantity;
}

/** auto 선택을 실제 최고가 옵션으로 풀어준다 */
export function resolveAzenaDailyChoice(
  choice: AzenaDailyChoice,
  prices: Record<string, number>,
  tier: AzenaTier,
): Exclude<AzenaDailyChoice, 'auto'> {
  if (choice !== 'auto') return choice;
  let best: Exclude<AzenaDailyChoice, 'auto'> = 'abidos';
  let bestGold = -1;
  for (const opt of getAzenaDailyBoxOptions(tier)) {
    const gold = getItemUnitPrice(opt.itemId, prices) * opt.quantity;
    if (gold > bestGold) { bestGold = gold; best = opt.key; }
  }
  return best;
}

/** 유물 각인서 랜덤 주머니 평균가·선택 주머니 최고가.
    랜덤은 전체 유물 각인서가 균등 확률이므로 추적 12종 평균이 아니라
    지옥 보상 계산기와 같은 식(추적 12종 시세 합 + 비추적 31종 고정 합 ÷ 총 43종)을 쓴다.
    추적 12종 평균으로 잡으면 원한·아드 같은 메타 각인서 때문에 크게 과대평가된다. */
export function getAzenaEngravingStats(prices: Record<string, number>): { avg: number; max: number } {
  const values = ENGRAVING_IDS.map((id) => prices[id] || 0).filter((v) => v > 0);
  if (values.length === 0) return { avg: 0, max: 0 };
  return {
    avg: calcEngravingExpectedValue(prices),
    max: Math.max(...values),
  };
}

/** 편린 1개 기대 가치의 항목별 분해 */
export function getAzenaFragmentEV(prices: Record<string, number>): AzenaBreakdown['fragments']['perFragment'] {
  const goldEV = FRAGMENT_GOLD_TABLE.reduce((s, r) => s + r.gold * (r.p / 100), 0);
  const { avg, max } = getAzenaEngravingStats(prices);
  const engravingEV = avg * (FRAGMENT_ENGRAVING_RANDOM_P / 100) + max * (FRAGMENT_ENGRAVING_SELECT_P / 100);
  const cardpackEV =
    LEGENDARY_PACK_GOLD * (FRAGMENT_LEGENDARY_PACK_P / 100) +
    LEGENDARY_SELECT_PACK_GOLD * (FRAGMENT_SELECT_PACK_P / 100);
  return {
    goldEV,
    engravingAvg: avg,
    engravingMax: max,
    engravingEV,
    cardpackEV,
    total: goldEV + engravingEV + cardpackEV,
  };
}

/** 28일 전체 기대 가치 계산 — 갤러리 카드·상세 페이지 공용 */
export function calcAzenaBreakdown(
  prices: Record<string, number>,
  goldPerWon: number,
  options: AzenaOptions,
): AzenaBreakdown {
  // 1. 일일 보상
  const essenceUnitGold = LEAP_ESSENCE_BC * goldPerWon * 27.5;
  const essenceGold = essenceUnitGold * AZENA_DAYS;
  const boxChoice = resolveAzenaDailyChoice(options.dailyChoice, prices, options.tier);
  const boxUnitGold = getAzenaDailyBoxOptionGold(boxChoice, prices, options.tier);
  const boxGold = boxUnitGold * AZENA_DAYS;

  // 2. 주간 보상 (천상 도전권 — 낙원 시즌 중에만)
  const weeklyTotal = options.paradiseSeason ? CELESTIAL_TICKET_GOLD * AZENA_WEEKS : 0;

  // 3. 축복의 편린
  const baseRuns = FRAGMENT_BASE_RIFT_RUNS + FRAGMENT_BASE_GUARDIAN_RUNS;
  const extraRuns =
    Math.max(0, options.resonanceCount) +
    Math.max(0, options.restPotionCount) +
    Math.max(0, options.pcRoomVisits) * 2;
  const totalRuns = baseRuns + extraRuns;
  const expectedCount = totalRuns * FRAGMENT_DROP_RATE;
  const perFragment = getAzenaFragmentEV(prices);

  // 4. 엔드 컨텐츠 보너스 상자
  const clears = Math.max(0, Math.min(AZENA_MAX_WEEKLY_RAID_CLEARS, options.weeklyRaidClears));
  const boxCount = clears * AZENA_WEEKS;
  const boxValues = {
    small: getAzenaRefineBoxGold('small', prices, options.tier),
    medium: getAzenaRefineBoxGold('medium', prices, options.tier),
    large: getAzenaRefineBoxGold('large', prices, options.tier),
  };
  const perBoxEV =
    AZENA_RAID_BOX_TABLE.reduce((s, r) => s + boxValues[r.key] * (r.p / 100), 0) +
    AZENA_RAID_BOX_GOLD.reduce((s, r) => s + r.gold * (r.p / 100), 0);

  // 5. 전용 버프 (허브 스테이크 대체 가치)
  const buffCount = AZENA_BUFF_STEAK_PER_WEEK * AZENA_WEEKS;
  const buffTotal = AZENA_BUFF_STEAK_GOLD * buffCount;

  const daily = {
    essenceUnitGold,
    essenceGold,
    boxChoice,
    boxUnitGold,
    boxGold,
    total: essenceGold + boxGold,
  };
  const fragments = {
    baseRuns,
    extraRuns,
    totalRuns,
    expectedCount,
    perFragment,
    total: expectedCount * perFragment.total,
  };
  const raidBoxes = {
    count: boxCount,
    boxValues,
    perBoxEV,
    total: boxCount * perBoxEV,
  };

  return {
    daily,
    weekly: {
      included: options.paradiseSeason,
      ticketUnitGold: CELESTIAL_TICKET_GOLD,
      total: weeklyTotal,
    },
    fragments,
    raidBoxes,
    buff: { unitGold: AZENA_BUFF_STEAK_GOLD, count: buffCount, total: buffTotal },
    totalGold: daily.total + weeklyTotal + fragments.total + raidBoxes.total + buffTotal,
  };
}
