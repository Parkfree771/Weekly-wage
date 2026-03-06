// 지옥/나락 보상 계산 공유 라이브러리

// ─── 1730 데이터 ───

// 지옥 상자 보상 (단계별)
export const HELL_BOX_REWARDS_DATA: Record<string, string[]> = {
  '파괴석/수호석': ['500/1,500', '600/1,800', '900/2,700', '1,200/3,600', '1,600/4,800', '2,200/6,600', '3,000/9,000', '4,500/13,500', '6,500/19,500', '9,000/27,000', '15,000/45,000'],
  '돌파석': ['25', '36', '48', '64', '90', '130', '190', '250', '350', '500', '850'],
  '융화재료': ['60', '90', '125', '150', '225', '300', '450', '600', '850', '1,200', '2,000'],
  '재련 보조': ['10/30', '15/45', '20/60', '25/75', '36/108', '48/144', '72/216', '96/288', '132/396', '192/576', '320/960'],
  '귀속골드': ['4,500', '7,200', '9,500', '12,000', '16,000', '22,000', '32,000', '45,000', '65,000', '95,000', '130,000'],
  '어빌리티스톤 키트': ['8', '10', '15', '20', '25', '30', '45', '60', '80', '120', '200'],
  '팔찌': ['고대 x3', '고대 x5', '고대 x7', '고대 x10', '고대 x15', '고대 x20', '고대 x25', '고대 x35', '고대 x50', '고대 x70', '고대 x120'],
  '특수재련': ['24', '40', '56', '70', '96', '130', '180', '260', '360', '500', '850'],
  '천상 도전권': ['-', '-', '-', '-', '-', '2', '4', '7', '10', '15', '20'],
  '젬선택': ['희귀 x3', '희귀 x5', '희귀 x7', '영웅 x1', '영웅 x1, 희귀 질서 x1, 희귀 혼돈 x1', '영웅 x1, 희귀 질서 x2, 희귀 혼돈 x2', '영웅 x2', '영웅 x2, 희귀 질서 x2, 희귀 혼돈 x2', '영웅 x3', '영웅 x4', '영웅 x5'],
  '운명의 돌': ['7', '12', '15', '18', '27', '36', '54', '72', '100', '150', '240'],
};

// 나락 상자 보상 (단계별)
export const NARAK_BOX_REWARDS_DATA: Record<string, string[]> = {
  '재련보조': ['50/150', '75/225', '100/300', '125/375', '180/540', '240/720', '360/1,080', '480/1,440', '660/1,980', '960/2,880', '1,600/4,800'],
  '귀속골드': ['22,500', '36,000', '47,500', '60,000', '80,000', '110,000', '160,000', '225,000', '325,000', '475,000', '650,000'],
  '어빌리티스톤 키트': ['40', '50', '75', '100', '125', '150', '225', '300', '400', '600', '1,000'],
  '팔찌': ['고대 x15', '고대 x25', '고대 x35', '고대 x50', '고대 x75', '고대 x100', '고대 x125', '고대 x175', '고대 x250', '고대 x350', '고대 x600'],
  '귀속 각인서 랜덤': ['2', '4', '6', '8', '10', '12', '18', '24', '36', '48', '80'],
  '귀속 보석': ['-', '-', '-', '-', '-', '-', '-', '-', '3', '4', '5'],
  '젬선택': ['희귀 x15', '희귀 x25', '희귀 x35', '영웅 x5', '영웅 x5, 희귀 질서 x5, 희귀 혼돈 x5', '영웅 x5, 희귀 질서 x10, 희귀 혼돈 x10', '영웅 x10', '영웅 x10, 희귀 질서 x10, 희귀 혼돈 x10', '영웅 x15', '영웅 x20', '영웅 x25'],
  '운명의 돌': ['35', '60', '75', '90', '135', '180', '270', '360', '500', '750', '1,200'],
};

// ─── 1700 데이터 ───

// 1700 지옥 상자 보상 (단계별)
export const HELL_BOX_REWARDS_DATA_1700: Record<string, string[]> = {
  '파괴석/수호석': ['1,800/5,400', '2,500/7,500', '3,500/10,500', '4,200/12,600', '6,400/19,200', '8,500/25,500', '12,000/36,000', '18,000/54,000', '24,000/72,000', '35,000/105,000', '56,000/168,000'],
  '돌파석': ['70', '100', '140', '180', '270', '360', '540', '700', '950', '1,500', '2,400'],
  '융화재료': ['60', '90', '125', '150', '225', '300', '450', '600', '850', '1,200', '2,000'],
  '재련 보조': ['8/24', '12/36', '15/45', '20/60', '30/90', '40/120', '60/180', '75/225', '105/315', '155/465', '256/768'],
  '귀속골드': ['3,500', '5,500', '7,500', '9,000', '13,500', '18,000', '27,000', '36,000', '50,000', '72,000', '108,000'],
  '어빌리티스톤 키트': ['6', '8', '10', '12', '18', '24', '36', '48', '60', '90', '150'],
  '팔찌': ['고대 x2', '고대 x3', '고대 x5', '고대 x7', '고대 x9', '고대 x12', '고대 x18', '고대 x25', '고대 x35', '고대 x50', '고대 x80'],
  '특수재련': ['60', '90', '130', '160', '200', '320', '450', '650', '850', '1,250', '2,100'],
  '천상 도전권': ['-', '-', '-', '-', '-', '2', '4', '7', '10', '15', '20'],
  '젬랜덤': ['희귀~영웅 x1', '희귀~영웅 x2', '희귀~영웅 x3', '희귀~영웅 x4', '희귀~영웅 x5', '희귀~영웅 x6', '희귀~영웅 x7', '희귀~영웅 x8', '희귀~영웅 x9', '희귀~영웅 x10', '희귀~영웅 x11'],
  '운명의 돌': ['6', '9', '12', '15', '20', '30', '45', '60', '80', '120', '200'],
};

// 1700 나락 상자 보상 (단계별)
export const NARAK_BOX_REWARDS_DATA_1700: Record<string, string[]> = {
  '재련보조': ['40/120', '60/180', '75/225', '100/300', '150/450', '200/600', '300/900', '375/1,125', '525/1,575', '775/2,325', '1,280/3,840'],
  '귀속골드': ['17,500', '27,500', '37,500', '45,000', '67,500', '90,000', '135,000', '180,000', '250,000', '360,000', '540,000'],
  '어빌리티스톤 키트': ['30', '40', '50', '60', '90', '120', '180', '240', '300', '450', '750'],
  '팔찌': ['고대 x10', '고대 x15', '고대 x25', '고대 x35', '고대 x45', '고대 x60', '고대 x90', '고대 x125', '고대 x175', '고대 x250', '고대 x400'],
  '귀속 각인서 랜덤': ['2', '3', '4', '6', '8', '10', '15', '20', '25', '36', '60'],
  '귀속 보석': ['-', '-', '-', '-', '-', '-', '-', '-', '2', '3', '4'],
  '젬랜덤': ['희귀~영웅 x5', '희귀~영웅 x10', '희귀~영웅 x15', '희귀~영웅 x20', '희귀~영웅 x25', '희귀~영웅 x30', '희귀~영웅 x35', '희귀~영웅 x40', '희귀~영웅 x45', '희귀~영웅 x50', '희귀~영웅 x55'],
  '운명의 돌': ['30', '45', '60', '75', '100', '150', '225', '300', '400', '600', '1,000'],
};

// JSON 시세 아이템 매핑
type PriceItemMapping = Record<string, { id: string; bundle: number; fallbackId?: string; fallbackBundle?: number; id2?: string; bundle2?: number; fallbackId2?: string; fallbackBundle2?: number }>;

// 1730: 계승 재료 (fallback은 일반 재료 × 5 환산)
export const PRICE_ITEM_MAP: PriceItemMapping = {
  '파괴석/수호석': { id: '66102007', bundle: 100, fallbackId: '66102006', fallbackBundle: 100, id2: '66102107', bundle2: 100, fallbackId2: '66102106', fallbackBundle2: 100 },
  '돌파석': { id: '66110226', bundle: 1, fallbackId: '66110225', fallbackBundle: 1 },
  '융화재료': { id: '6861013', bundle: 1, fallbackId: '6861012', fallbackBundle: 1 },
  '재련 보조': { id: '66111131', bundle: 1, id2: '66111132', bundle2: 1 },
  '재련보조': { id: '66111131', bundle: 1, id2: '66111132', bundle2: 1 },
};

// 1700: 운명의 재료 (직접 연결)
export const PRICE_ITEM_MAP_1700: PriceItemMapping = {
  '파괴석/수호석': { id: '66102006', bundle: 100, id2: '66102106', bundle2: 100 },
  '돌파석': { id: '66110225', bundle: 1 },
  '융화재료': { id: '6861012', bundle: 1 },
  '재련 보조': { id: '66111131', bundle: 1, id2: '66111132', bundle2: 1 },
  '재련보조': { id: '66111131', bundle: 1, id2: '66111132', bundle2: 1 },
};

// 레벨에 맞는 가격 매핑 반환
export function getPriceItemMap(level: '1700' | '1730' = '1730'): PriceItemMapping {
  return level === '1700' ? PRICE_ITEM_MAP_1700 : PRICE_ITEM_MAP;
}

// 영웅 젬 아이템 IDs
export const HERO_GEM_IDS = ['67400003', '67400103', '67400203', '67410303', '67410403', '67410503'];

// 각인서 관련 상수
export const ENGRAVING_IDS = ['65203905', '65200505', '65203305', '65201005', '65203505', '65202805', '65203005', '65203705', '65203405', '65204105', '65200605', '65201505'];
export const NON_TRACKED_ENGRAVING_SUM = 33080;
export const TOTAL_ENGRAVINGS = 43;

// 일반 재련 비용 - 계승 무기 20→21 기준 (참조 15회분)
export const NORMAL_REFINING_MATS = {
  파괴석결정: 53550,
  위대한돌파석: 555,
  상비도스: 585,
  운명의파편: 500400,
  용암의숨결: 375,
  골드: 127500,
};

// 일반 재련 비용 - 업화 무기 20→21 기준 (참조 15회분)
export const NORMAL_REFINING_MATS_1700 = {
  파괴석: 48000,       // 3200 × 15
  돌파석: 720,          // 48 × 15
  아비도스: 525,        // 35 × 15
  운명의파편: 256500,   // 17100 × 15
  용암의숨결: 375,      // 25 × 15
  골드: 62400,          // 4160 × 15
};

// 특수재련 확률 및 소모
export const SPECIAL_REFINING_RATE = 0.015; // 1.5%
export const SPECIAL_REFINING_PER_ATTEMPT = 50;

export const RARE_GEM_PRICE = 2000;

// 젬랜덤 확률 (영웅 10%, 희귀 90%)
export const RANDOM_GEM_HERO_PROBS: { id: string; prob: number }[] = [
  { id: '67400003', prob: 0.03 },   // 질서 안정
  { id: '67400103', prob: 0.015 },  // 질서 견고
  { id: '67400203', prob: 0.005 },  // 질서 불변
  { id: '67410303', prob: 0.03 },   // 혼돈 침식
  { id: '67410403', prob: 0.015 },  // 혼돈 왜곡
  { id: '67410503', prob: 0.005 },  // 혼돈 붕괴
];
export const RANDOM_GEM_RARE_PROB = 0.9;

// 젬랜덤 1개당 기댓값
export function calcRandomGemExpectedValue(prices: Record<string, number>): number {
  let heroExpected = 0;
  for (const { id, prob } of RANDOM_GEM_HERO_PROBS) {
    heroExpected += (prices[id] || 0) * prob;
  }
  return Math.floor(heroExpected + RANDOM_GEM_RARE_PROB * RARE_GEM_PRICE);
}

// 팔찌 상수
export const BRACELET_USEFUL_PROB = 0.002188;
export const BRACELET_USEFUL_PRICE = 20000;
export const BRACELET_PEON = 20;

// 보상 문자열 파싱
export function parseRewardValue(str: string): number {
  if (!str || str === '-') return 0;
  return Number(str.replace(/,/g, ''));
}

export function parseDualValue(str: string): [number, number] {
  const parts = str.split('/');
  return [parseRewardValue(parts[0]), parseRewardValue(parts[1])];
}

// 젬 수량 파싱
export function parseGemCount(str: string): { hero: number; rare: number } {
  if (!str || str === '-') return { hero: 0, rare: 0 };
  let hero = 0;
  let rare = 0;
  const parts = str.split(',').map(s => s.trim());
  for (const part of parts) {
    const match = part.match(/x\s*(\d+)/);
    const count = match ? parseInt(match[1]) : 0;
    if (part.startsWith('영웅')) hero += count;
    else if (part.startsWith('희귀')) rare += count;
  }
  return { hero, rare };
}

// 랜덤 젬 수량 파싱 ("희귀~영웅 xN")
export function parseRandomGemCount(str: string): number {
  if (!str || str === '-') return 0;
  const match = str.match(/x\s*(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// 레벨+모드에 맞는 보상 데이터 선택
export function getRewardDataByLevel(
  mode: 'hell' | 'narak',
  level: '1700' | '1730' = '1730'
): Record<string, string[]> {
  if (level === '1700') {
    return mode === 'hell' ? HELL_BOX_REWARDS_DATA_1700 : NARAK_BOX_REWARDS_DATA_1700;
  }
  return mode === 'hell' ? HELL_BOX_REWARDS_DATA : NARAK_BOX_REWARDS_DATA;
}

// 단가 계산 (fallback: 하위 재료 × 5 환산)
export function getUnitPrice(id: string, bundle: number, prices: Record<string, number>, fallbackId?: string, fallbackBundle?: number): number {
  let price = (prices[id] || 0) / bundle;
  if (price === 0 && fallbackId && fallbackBundle) {
    price = ((prices[fallbackId] || 0) / fallbackBundle) * 5;
  }
  return price;
}

// 특수재련 1개당 가격 계산 (일반재련 비용 기반)
// 산출: 일반재련 총 비용 ÷ (중앙값 시행횟수 × 50개)
export function calcSpecialRefiningUnitCost(prices: Record<string, number>, level: '1700' | '1730' = '1730'): number {
  let normalCost: number;

  if (level === '1700') {
    // 업화 무기 20→21 기준 (운명의 재료)
    const 파괴석단가 = getUnitPrice('66102006', 100, prices);
    const 돌파석단가 = getUnitPrice('66110225', 1, prices);
    const 아비도스단가 = getUnitPrice('6861012', 1, prices);
    const 파편단가 = (prices['66130143'] || 0) / 3000;
    const 용암단가 = getUnitPrice('66111131', 1, prices);

    normalCost =
      NORMAL_REFINING_MATS_1700.파괴석 * 파괴석단가 +
      NORMAL_REFINING_MATS_1700.돌파석 * 돌파석단가 +
      NORMAL_REFINING_MATS_1700.아비도스 * 아비도스단가 +
      NORMAL_REFINING_MATS_1700.운명의파편 * 파편단가 +
      NORMAL_REFINING_MATS_1700.용암의숨결 * 용암단가 +
      NORMAL_REFINING_MATS_1700.골드;
  } else {
    // 계승 무기 20→21 기준 (세르카)
    const 파괴석단가 = getUnitPrice('66102007', 100, prices, '66102006', 100);
    const 돌파석단가 = getUnitPrice('66110226', 1, prices, '66110225', 1);
    const 상비도스단가 = getUnitPrice('6861013', 1, prices, '6861012', 1);
    const 파편단가 = (prices['66130143'] || 0) / 3000;
    const 용암단가 = getUnitPrice('66111131', 1, prices);

    normalCost =
      NORMAL_REFINING_MATS.파괴석결정 * 파괴석단가 +
      NORMAL_REFINING_MATS.위대한돌파석 * 돌파석단가 +
      NORMAL_REFINING_MATS.상비도스 * 상비도스단가 +
      NORMAL_REFINING_MATS.운명의파편 * 파편단가 +
      NORMAL_REFINING_MATS.용암의숨결 * 용암단가 +
      NORMAL_REFINING_MATS.골드;
  }

  // 기하분포 중앙값: ceil(ln(0.5) / ln(1 - p))
  const medianAttempts = Math.ceil(Math.log(0.5) / Math.log(1 - SPECIAL_REFINING_RATE));
  const totalItems = medianAttempts * SPECIAL_REFINING_PER_ATTEMPT;

  return totalItems > 0 ? Math.floor(normalCost / totalItems) : 0;
}

// 각인서 1개당 기댓값
export function calcEngravingExpectedValue(prices: Record<string, number>): number {
  let trackedSum = 0;
  for (const id of ENGRAVING_IDS) {
    trackedSum += prices[id] || 0;
  }
  return Math.floor((trackedSum + NON_TRACKED_ENGRAVING_SUM) / TOTAL_ENGRAVINGS);
}

// 영웅 젬 최고가
export function getHeroGemMaxPrice(prices: Record<string, number>): number {
  let maxPrice = 0;
  for (const id of HERO_GEM_IDS) {
    if (prices[id] && prices[id] > maxPrice) maxPrice = prices[id];
  }
  return maxPrice;
}

// 상자 보상 골드 가치 계산
export function calcBoxRewardGold(
  rewardName: string,
  tier: number,
  prices: Record<string, number>,
  mode: 'hell' | 'narak',
  peonGoldValue: number,
  specialRefiningCost: number,
  level: '1700' | '1730' = '1730'
): number | null {
  const data = getRewardDataByLevel(mode, level);
  const rawVal = data[rewardName]?.[tier];
  if (!rawVal || rawVal === '-') return 0;

  if (rewardName === '귀속골드') return parseRewardValue(rawVal);
  if (rewardName === '운명의 돌') return Math.floor(parseRewardValue(rawVal) * 900);
  if (rewardName === '천상 도전권') return Math.floor(parseRewardValue(rawVal) * 3000);

  if (rewardName === '팔찌') {
    const match = rawVal.match(/x\s*(\d+)/);
    if (!match) return 0;
    const qty = parseInt(match[1]);
    return Math.floor(qty * BRACELET_USEFUL_PROB * (BRACELET_USEFUL_PRICE + BRACELET_PEON * peonGoldValue));
  }

  if (rewardName === '어빌리티스톤 키트') return Math.floor(parseRewardValue(rawVal) * 9 * peonGoldValue);
  if (rewardName === '특수재련') return Math.floor(parseRewardValue(rawVal) * specialRefiningCost);

  if (rewardName === '젬선택') {
    const { hero, rare } = parseGemCount(rawVal);
    return Math.floor(hero * getHeroGemMaxPrice(prices) + rare * RARE_GEM_PRICE);
  }

  if (rewardName === '젬랜덤') {
    const count = parseRandomGemCount(rawVal);
    return Math.floor(count * calcRandomGemExpectedValue(prices));
  }

  if (rewardName === '귀속 보석') {
    const count = parseRewardValue(rawVal);
    const gemPrice = Math.round(prices['auction_gem_fear_8'] || 0);
    return Math.floor(count * gemPrice);
  }

  if (rewardName === '귀속 각인서 랜덤') {
    const count = parseRewardValue(rawVal);
    return Math.floor(count * calcEngravingExpectedValue(prices));
  }

  const priceMap = getPriceItemMap(level);
  const mapping = priceMap[rewardName];
  if (!mapping) return null;

  if (mapping.id2 && mapping.bundle2 !== undefined) {
    const [qty1, qty2] = parseDualValue(rawVal);
    const unitPrice1 = getUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
    const unitPrice2 = getUnitPrice(mapping.id2, mapping.bundle2, prices, mapping.fallbackId2, mapping.fallbackBundle2);
    return Math.floor(qty1 * unitPrice1 + qty2 * unitPrice2);
  }

  const qty = parseRewardValue(rawVal);
  const unitPrice = getUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
  return Math.floor(qty * unitPrice);
}

// 티켓 평균 골드 가치 계산
export function calcTicketAverage(
  mode: 'hell' | 'narak',
  tier: number,
  prices: Record<string, number>,
  bcRate: number,
  level: '1700' | '1730' = '1730'
): number {
  const peonGoldValue = 8.5 * (bcRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices);

  const data = getRewardDataByLevel(mode, level);
  const rewardNames = Object.keys(data);

  let sum = 0;
  let count = 0;
  for (const name of rewardNames) {
    const rawVal = data[name]?.[tier];
    if (!rawVal || rawVal === '-') continue;
    const val = calcBoxRewardGold(name, tier, prices, mode, peonGoldValue, specialRefiningCost, level);
    if (val === null) continue;
    sum += val;
    count++;
  }

  return count > 0 ? Math.floor(sum / count) : 0;
}
