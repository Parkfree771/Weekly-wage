// 지옥/나락 보상 계산 공유 라이브러리 (시즌3 · 1750)

// ─── 보상 테이블 (단계 0~10) ───

// 지옥 상자 보상
export const HELL_BOX_REWARDS_DATA: Record<string, string[]> = {
  '어빌리티스톤': ['9', '12', '18', '25', '33', '45', '60', '80', '110', '150', '220'],
  '팔찌': ['4', '6', '8', '12', '18', '24', '30', '42', '60', '90', '150'],
  '젬 선택 상자': ['3(희귀)', '6(희귀)', '8(희귀)', '12(희귀)', '1(영웅)', '2(영웅)', '3(영웅)', '4(영웅)', '5(영웅)', '6(영웅)', '7(영웅)'],
  '용숨/빙숨': ['12/36', '18/54', '24/72', '30/90', '40/120', '60/180', '90/270', '130/390', '180/540', '260/780', '380/1,140'],
  '특수재련': ['28', '45', '62', '84', '115', '155', '220', '310', '430', '600', '1,000'],
  '상급아비도스': ['75', '110', '150', '200', '270', '360', '540', '720', '1,000', '1,440', '2,400'],
  '파괴석/수호석': ['600/1,800', '750/2,250', '1,100/3,300', '1,500/4,500', '2,000/6,000', '2,700/8,100', '3,600/10,800', '5,400/16,200', '7,800/23,400', '10,800/32,400', '18,000/54,000'],
  '정련된 운명/혼돈의 돌': ['9/7', '13/10', '18/15', '24/20', '33/27', '45/36', '72/54', '90/72', '120/100', '180/144', '300/250'],
  '귀속골드': ['5,500', '8,200', '11,000', '14,400', '19,200', '26,400', '38,400', '54,000', '78,000', '114,000', '156,000'],
  '돌파석': ['30', '42', '56', '76', '108', '160', '230', '320', '450', '650', '1,000'],
  '천상 도전권': ['-', '-', '-', '-', '-', '2', '4', '7', '10', '15', '20'],
};

// 나락 상자 보상
export const NARAK_BOX_REWARDS_DATA: Record<string, string[]> = {
  '어빌리티스톤': ['45', '60', '90', '125', '165', '225', '300', '400', '550', '750', '1,100'],
  '팔찌': ['20', '30', '40', '60', '90', '120', '150', '210', '300', '450', '750'],
  '젬 선택 상자': ['15(희귀)', '30(희귀)', '40(희귀)', '60(희귀)', '5(영웅)', '10(영웅)', '15(영웅)', '20(영웅)', '25(영웅)', '30(영웅)', '35(영웅)'],
  '용숨/빙숨': ['60/180', '90/270', '120/360', '150/450', '200/600', '300/900', '450/1,350', '650/1,950', '900/2,700', '1,300/3,900', '1,900/5,700'],
  '귀속 각인서 랜덤 상자': ['3', '5', '7', '10', '13', '16', '24', '32', '48', '65', '100'],
  '정련된 운명/혼돈의 돌': ['45/35', '65/50', '90/75', '120/100', '165/135', '225/180', '360/270', '450/360', '600/500', '900/720', '1,500/1,250'],
  '귀속골드': ['27,500', '41,000', '55,000', '72,000', '96,000', '132,000', '192,000', '270,000', '390,000', '570,000', '780,000'],
  '귀속 보석': ['-', '-', '-', '-', '-', '-', '-', '-', '4', '5', '6'],
  '전설카드팩': ['-', '-', '-', '-', '-', '1', '2', '3', '4', '5', '7'],
};

// ─── 시세 연동 아이템 매핑 ───
type PriceItemMapping = Record<string, { id: string; bundle: number; id2?: string; bundle2?: number }>;

export const PRICE_ITEM_MAP: PriceItemMapping = {
  '파괴석/수호석': { id: '66102007', bundle: 100, id2: '66102107', bundle2: 100 }, // 파괴석 결정 / 수호석 결정
  '돌파석': { id: '66110226', bundle: 1 },         // 위대한 운명의 돌파석
  '상급아비도스': { id: '6861013', bundle: 1 },     // 상급 아비도스 융화 재료
  '용숨/빙숨': { id: '66111131', bundle: 1, id2: '66111132', bundle2: 1 }, // 용암의 숨결 / 빙하의 숨결
};

// 영웅 젬 아이템 IDs (질서 3종 + 혼돈 3종)
export const HERO_GEM_IDS = ['67400003', '67400103', '67400203', '67410303', '67410403', '67410503'];

// 각인서 관련 상수
export const ENGRAVING_IDS = ['65203905', '65200505', '65203305', '65201005', '65203505', '65202805', '65203005', '65203705', '65203405', '65204105', '65200605', '65201505'];
export const NON_TRACKED_ENGRAVING_SUM = 33080;
export const TOTAL_ENGRAVINGS = 43;

// 일반 재련 비용 - 계승 무기 20→21 기준 (참조 15회분) — 특수재련 단가 산출용
export const NORMAL_REFINING_MATS = {
  파괴석결정: 53550,
  위대한돌파석: 555,
  상비도스: 585,
  운명의파편: 500400,
  용암의숨결: 375,
  골드: 127500,
};

// 특수재련 확률 및 소모
export const SPECIAL_REFINING_RATE = 0.015; // 1.5%
export const SPECIAL_REFINING_PER_ATTEMPT = 50;

// 고정 단가
export const RARE_GEM_PRICE = 2000;             // 희귀 젬 1개
export const FATE_STONE_PRICE = 900;            // 정련된 운명의 돌 1개
export const CHAOS_STONE_WEAPON_PRICE = 800;    // 정련된 혼돈의 돌(무기) 1개
export const CHAOS_STONE_ARMOR_PRICE = 300;     // 정련된 혼돈의 돌(방어구) 1개
export const LEGENDARY_CARD_PACK_PRICE = 8000;  // 전설 카드팩 1개
export const CELESTIAL_TICKET_PRICE = 3000;     // 천상 도전권 1개

// 팔찌 상수
export const BRACELET_USEFUL_PROB = 0.002188;
export const BRACELET_USEFUL_PRICE = 20000;
export const BRACELET_PEON = 20;

// ─── 파싱 유틸 ───

export function parseRewardValue(str: string): number {
  if (!str || str === '-') return 0;
  return Number(str.replace(/,/g, ''));
}

export function parseDualValue(str: string): [number, number] {
  const parts = str.split('/');
  return [parseRewardValue(parts[0]), parseRewardValue(parts[1])];
}

// 젬 선택 상자 파싱 ("3(희귀)" / "1(영웅)")
export function parseGemSelectBox(str: string): { count: number; rarity: 'rare' | 'hero' } | null {
  if (!str || str === '-') return null;
  const m = str.match(/(\d[\d,]*)\s*\(\s*(희귀|영웅)\s*\)/);
  if (!m) return null;
  return { count: parseRewardValue(m[1]), rarity: m[2] === '영웅' ? 'hero' : 'rare' };
}

// ─── 가격 계산 ───

export function getRewardData(mode: 'hell' | 'narak'): Record<string, string[]> {
  return mode === 'hell' ? HELL_BOX_REWARDS_DATA : NARAK_BOX_REWARDS_DATA;
}

// 단가 (1묶음 = bundle개)
export function getUnitPrice(id: string, bundle: number, prices: Record<string, number>): number {
  return (prices[id] || 0) / bundle;
}

// 특수재련 1개당 가격 — 일반재련(계승 무기 20→21) 총비용 ÷ (중앙값 시행 × 50개)
export function calcSpecialRefiningUnitCost(prices: Record<string, number>): number {
  const 파괴석단가 = getUnitPrice('66102007', 100, prices);
  const 돌파석단가 = getUnitPrice('66110226', 1, prices);
  const 상비도스단가 = getUnitPrice('6861013', 1, prices);
  const 파편단가 = (prices['66130143'] || 0) / 3000;
  const 용암단가 = getUnitPrice('66111131', 1, prices);

  const normalCost =
    NORMAL_REFINING_MATS.파괴석결정 * 파괴석단가 +
    NORMAL_REFINING_MATS.위대한돌파석 * 돌파석단가 +
    NORMAL_REFINING_MATS.상비도스 * 상비도스단가 +
    NORMAL_REFINING_MATS.운명의파편 * 파편단가 +
    NORMAL_REFINING_MATS.용암의숨결 * 용암단가 +
    NORMAL_REFINING_MATS.골드;

  // 기하분포 중앙값: ceil(ln(0.5) / ln(1 - p))
  const medianAttempts = Math.ceil(Math.log(0.5) / Math.log(1 - SPECIAL_REFINING_RATE));
  const totalItems = medianAttempts * SPECIAL_REFINING_PER_ATTEMPT;
  return totalItems > 0 ? Math.floor(normalCost / totalItems) : 0;
}

// 각인서 1개당 기댓값
export function calcEngravingExpectedValue(prices: Record<string, number>): number {
  let trackedSum = 0;
  for (const id of ENGRAVING_IDS) trackedSum += prices[id] || 0;
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

// 상자 보상 골드 가치
export function calcBoxRewardGold(
  rewardName: string,
  tier: number,
  prices: Record<string, number>,
  mode: 'hell' | 'narak',
  peonGoldValue: number,
  specialRefiningCost: number
): number | null {
  const data = getRewardData(mode);
  const rawVal = data[rewardName]?.[tier];
  if (!rawVal || rawVal === '-') return 0;

  // 직접 지급 / 고정가
  if (rewardName === '귀속골드') return parseRewardValue(rawVal);
  if (rewardName === '천상 도전권') return Math.floor(parseRewardValue(rawVal) * CELESTIAL_TICKET_PRICE);
  if (rewardName === '전설카드팩') return Math.floor(parseRewardValue(rawVal) * LEGENDARY_CARD_PACK_PRICE);

  // 정련된 운명/혼돈의 돌 — 선택상자(택1): 더 비싼 쪽, 고정가
  // 혼돈 선택 시 같은 개수로 무기·방어구 혼돈의 돌을 둘 다 지급 → 혼돈 단위가 = 무기 + 방어구
  if (rewardName === '정련된 운명/혼돈의 돌') {
    const [fate, chaos] = parseDualValue(rawVal);
    const fateValue = fate * FATE_STONE_PRICE;
    const chaosValue = chaos * (CHAOS_STONE_WEAPON_PRICE + CHAOS_STONE_ARMOR_PRICE);
    return Math.floor(Math.max(fateValue, chaosValue));
  }

  // 팔찌 — 고대 N개 × 유효확률 × (유효품 시세 + 페온 가치)
  if (rewardName === '팔찌') {
    const qty = parseRewardValue(rawVal);
    return Math.floor(qty * BRACELET_USEFUL_PROB * (BRACELET_USEFUL_PRICE + BRACELET_PEON * peonGoldValue));
  }

  // 어빌리티스톤 — N개 × 9페온
  if (rewardName === '어빌리티스톤') return Math.floor(parseRewardValue(rawVal) * 9 * peonGoldValue);

  // 특수재련
  if (rewardName === '특수재련') return Math.floor(parseRewardValue(rawVal) * specialRefiningCost);

  // 젬 선택 상자 — 영웅: 최고가 시세 / 희귀: 고정가
  if (rewardName === '젬 선택 상자') {
    const gem = parseGemSelectBox(rawVal);
    if (!gem) return 0;
    const unit = gem.rarity === 'hero' ? getHeroGemMaxPrice(prices) : RARE_GEM_PRICE;
    return Math.floor(gem.count * unit);
  }

  // 귀속 보석 — 8레벨 겁화 보석 시세
  if (rewardName === '귀속 보석') {
    const count = parseRewardValue(rawVal);
    return Math.floor(count * Math.round(prices['auction_gem_fear_8'] || 0));
  }

  // 귀속 각인서 랜덤 상자
  if (rewardName === '귀속 각인서 랜덤 상자') {
    return Math.floor(parseRewardValue(rawVal) * calcEngravingExpectedValue(prices));
  }

  // 파괴석 결정 / 수호석 결정 — 선택상자(택1): 더 비싼 쪽
  if (rewardName === '파괴석/수호석') {
    const [v1, v2] = parseDualValue(rawVal);
    const m = PRICE_ITEM_MAP[rewardName];
    const unit1 = getUnitPrice(m.id, m.bundle, prices);
    const unit2 = m.id2 && m.bundle2 ? getUnitPrice(m.id2, m.bundle2, prices) : 0;
    return Math.floor(Math.max(v1 * unit1, v2 * unit2));
  }

  // 용숨/빙숨 — 둘 다 지급(합산)
  if (rewardName === '용숨/빙숨') {
    const [v1, v2] = parseDualValue(rawVal);
    const m = PRICE_ITEM_MAP[rewardName];
    const unit1 = getUnitPrice(m.id, m.bundle, prices);
    const unit2 = m.id2 && m.bundle2 ? getUnitPrice(m.id2, m.bundle2, prices) : 0;
    return Math.floor(v1 * unit1 + v2 * unit2);
  }

  // 단일 시세 아이템 (상급아비도스, 돌파석)
  const mapping = PRICE_ITEM_MAP[rewardName];
  if (!mapping) return null;
  return Math.floor(parseRewardValue(rawVal) * getUnitPrice(mapping.id, mapping.bundle, prices));
}

// 티켓(열쇠) 평균 골드 가치
export function calcTicketAverage(
  mode: 'hell' | 'narak',
  tier: number,
  prices: Record<string, number>,
  bcRate: number,
  excludeAbilityStone: boolean = true
): number {
  const peonGoldValue = 8.5 * (bcRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices);
  const data = getRewardData(mode);

  let sum = 0;
  let count = 0;
  for (const name of Object.keys(data)) {
    if (excludeAbilityStone && name === '어빌리티스톤') continue;
    const rawVal = data[name]?.[tier];
    if (!rawVal || rawVal === '-') continue;
    const val = calcBoxRewardGold(name, tier, prices, mode, peonGoldValue, specialRefiningCost);
    if (val === null) continue;
    sum += val;
    count++;
  }
  return count > 0 ? Math.floor(sum / count) : 0;
}
