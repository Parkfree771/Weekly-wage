// 지옥/나락 보상 계산 공유 라이브러리 (시즌3 · 1730 / 1750)

// 표를 가진 아이템 레벨. 레벨을 안 넘기면 항상 1750 — 패키지 티켓 평가처럼 1750 고정인 곳이 그대로 돌아간다.
export type HellItemLevel = 1730 | 1750;
export const HELL_ITEM_LEVELS: HellItemLevel[] = [1730, 1750];
export const isHellItemLevel = (v: number): v is HellItemLevel => (HELL_ITEM_LEVELS as number[]).includes(v);

// ─── 1750 보상 테이블 (단계 0~10) ───

// 지옥 상자 보상 (1750)
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

// 나락 상자 보상 (1750)
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

// ─── 1730 보상 테이블 (단계 0~10) ───
// 아이템 구성은 1750과 완전히 같고 수량만 다르다. 원본 Category 1015(지옥)·1019(나락).
// 정련된 혼돈의 돌만 한섭 파일이 "상자 안 상자"를 안 풀어줘서 북미 파일(Category 1025·1125)로 교차 확인했다 —
// 단계별 혼돈의 돌 상자는 구간과 무관하게 같은 상자라 개수가 1750과 같다.

export const HELL_BOX_REWARDS_1730: Record<string, string[]> = {
  '어빌리티스톤': ['8', '10', '15', '20', '25', '30', '45', '60', '80', '120', '200'],
  '팔찌': ['3', '5', '7', '10', '15', '20', '25', '35', '50', '70', '120'],
  '젬 선택 상자': ['2(희귀)', '5(희귀)', '7(희귀)', '10(희귀)', '15(희귀)', '1(영웅)', '2(영웅)', '3(영웅)', '4(영웅)', '5(영웅)', '6(영웅)'],
  '용숨/빙숨': ['10/30', '15/45', '20/60', '25/75', '36/108', '48/144', '72/216', '96/288', '132/396', '192/576', '320/960'],
  '특수재련': ['24', '40', '56', '70', '96', '130', '180', '260', '360', '500', '850'],
  '상급아비도스': ['60', '90', '125', '150', '225', '300', '450', '600', '850', '1,200', '2,000'],
  '파괴석/수호석': ['500/1,500', '600/1,800', '900/2,700', '1,200/3,600', '1,600/4,800', '2,200/6,600', '3,000/9,000', '4,500/13,500', '6,500/19,500', '9,000/27,000', '15,000/45,000'],
  '정련된 운명/혼돈의 돌': ['7/7', '12/10', '15/15', '18/20', '27/27', '36/36', '54/54', '72/72', '100/100', '150/144', '240/250'],
  '귀속골드': ['4,500', '7,200', '9,500', '12,000', '16,000', '22,000', '32,000', '45,000', '65,000', '95,000', '130,000'],
  '돌파석': ['25', '36', '48', '64', '90', '130', '190', '250', '350', '500', '850'],
  '천상 도전권': ['-', '-', '-', '-', '-', '2', '4', '7', '10', '15', '20'],
};

export const NARAK_BOX_REWARDS_1730: Record<string, string[]> = {
  '어빌리티스톤': ['40', '50', '75', '100', '125', '150', '225', '300', '400', '600', '1,000'],
  '팔찌': ['15', '25', '35', '50', '75', '100', '125', '175', '250', '350', '600'],
  '젬 선택 상자': ['10(희귀)', '25(희귀)', '35(희귀)', '50(희귀)', '75(희귀)', '5(영웅)', '10(영웅)', '15(영웅)', '20(영웅)', '25(영웅)', '30(영웅)'],
  '용숨/빙숨': ['50/150', '75/225', '100/300', '125/375', '180/540', '240/720', '360/1,080', '480/1,440', '660/1,980', '960/2,880', '1,600/4,800'],
  '귀속 각인서 랜덤 상자': ['2', '4', '6', '8', '10', '12', '18', '24', '36', '48', '80'],
  '정련된 운명/혼돈의 돌': ['35/35', '60/50', '75/75', '90/100', '135/135', '180/180', '270/270', '360/360', '500/500', '750/720', '1,200/1,250'],
  '귀속골드': ['22,500', '36,000', '47,500', '60,000', '80,000', '110,000', '160,000', '225,000', '325,000', '475,000', '650,000'],
  '귀속 보석': ['-', '-', '-', '-', '-', '-', '-', '-', '3', '4', '5'],
  '전설카드팩': ['-', '-', '-', '-', '-', '1', '2', '3', '4', '5', '7'],
};

// ─── 층 기본 보상 (단계 0~10) ───
// 상자(열쇠)와 별개로 층을 깰 때마다 항상 지급되는 보상. 지옥에만 있고 나락에는 없다.
// 원본: kr_TrinityInfernoRewards.json Category 1026 의 Sub. (Plenty=풍요는 정확히 이 값의 10배)
// 1730(Category 1015)의 Sub 는 1750과 44항목 전부 같은 값이라 표를 공유한다 — 구간을 더 늘릴 땐 반드시 다시 대조할 것.
export const HELL_BASE_REWARDS_DATA: Record<string, string[]> = {
  '운명의 파편': ['5,200', '6,500', '7,700', '9,000', '10,000', '11,500', '13,000', '14,000', '15,500', '17,000', '18,000'],
  '파괴석 결정': ['26', '32', '38', '44', '52', '60', '70', '80', '90', '100', '110'],
  '수호석 결정': ['170', '200', '230', '280', '330', '380', '440', '500', '560', '620', '680'],
  '위대한 돌파석': ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '15'],
};

// 기본 보상 재화 시세 (id, 묶음 단위). 전부 거래소 실시간 시세를 쓴다.
export const BASE_REWARD_PRICE_MAP: Record<string, { id: string; bundle: number }> = {
  '운명의 파편': { id: '66130143', bundle: 3000 },
  '파괴석 결정': { id: '66102007', bundle: 100 },
  '수호석 결정': { id: '66102107', bundle: 100 },
  '위대한 돌파석': { id: '66110226', bundle: 1 },
};

// 풍요(Plenty · Wealth Chest) 배수.
// **층 기본 보상(HELL_BASE_REWARDS_DATA)에만 적용된다.** 상자 보상 목록은 풍요라고 해서
// 10배가 되지 않는다 — 원본에서도 Plenty 배열은 Sub(기본 보상)의 정확히 10배일 뿐이고,
// Main(상자별 보상)에는 손대지 않는다. 11단계 × 4항목 전수 확인.
// 배수를 먹이는 곳은 getBaseRewardRows 하나뿐이다 — 상자 보상 수량에는 절대 곱하지 말 것.
export const PLENTY_MULTIPLIER = 10;

export type BaseRewardRow = { name: string; qty: number; unitPrice: number; gold: number };

// 선택한 단계의 기본 보상 목록 + 각 항목 골드 가치. plenty 면 수량이 10배.
export function getBaseRewardRows(
  mode: 'hell' | 'narak',
  tier: number,
  prices: Record<string, number>,
  plenty: boolean = false
): BaseRewardRow[] {
  if (mode !== 'hell') return [];
  const mul = plenty ? PLENTY_MULTIPLIER : 1;
  return Object.keys(HELL_BASE_REWARDS_DATA).map((name) => {
    const qty = parseRewardValue(HELL_BASE_REWARDS_DATA[name]?.[tier] ?? '0') * mul;
    const m = BASE_REWARD_PRICE_MAP[name];
    const unitPrice = m ? (prices[m.id] || 0) / m.bundle : 0;
    return { name, qty, unitPrice, gold: Math.floor(qty * unitPrice) };
  });
}

// 기본 보상 합계 (골드)
export function calcBaseRewardGold(
  mode: 'hell' | 'narak',
  tier: number,
  prices: Record<string, number>,
  plenty: boolean = false
): number {
  return getBaseRewardRows(mode, tier, prices, plenty).reduce((sum, r) => sum + r.gold, 0);
}

// ─── 시세 연동 아이템 매핑 ───
type PriceItemMapping = Record<string, { id: string; bundle: number; id2?: string; bundle2?: number }>;

export const PRICE_ITEM_MAP: PriceItemMapping = {
  '파괴석/수호석': { id: '66102007', bundle: 100, id2: '66102107', bundle2: 100 }, // 파괴석 결정 / 수호석 결정
  '돌파석': { id: '66110226', bundle: 1 },         // 위대한 운명의 돌파석
  '상급아비도스': { id: '6861013', bundle: 1 },     // 상급 아비도스 융화 재료
  '용숨/빙숨': { id: '66111131', bundle: 1, id2: '66111132', bundle2: 1 }, // 용암의 숨결 / 빙하의 숨결
};

// 영웅 젬 6종 (질서 3종 + 혼돈 3종). 이름·아이콘은 /extreme · /cerka 와 같은 파일을 쓴다.
// 젬 선택 상자는 택1이라 이 중 최고가 하나만 값으로 잡는다 — 시세가 뒤집히면 자동으로 바뀐다.
export const HERO_GEMS = [
  { id: '67400003', name: '질서의 젬 : 안정', short: '안정', icon: '/gem-order-stable.webp' },
  { id: '67400103', name: '질서의 젬 : 견고', short: '견고', icon: '/gem-order-solid.webp' },
  { id: '67400203', name: '질서의 젬 : 불변', short: '불변', icon: '/gem-order-immutable.webp' },
  { id: '67410303', name: '혼돈의 젬 : 침식', short: '침식', icon: '/gem-chaos-erosion.webp' },
  { id: '67410403', name: '혼돈의 젬 : 왜곡', short: '왜곡', icon: '/gem-chaos-distortion.webp' },
  { id: '67410503', name: '혼돈의 젬 : 붕괴', short: '붕괴', icon: '/gem-chaos-collapse.webp' },
];

export const HERO_GEM_IDS = HERO_GEMS.map((g) => g.id);

export type HeroGemPick = { id: string; name: string; short: string; icon: string; price: number };

// 각인서 관련 상수
export const ENGRAVING_IDS = ['65203905', '65200505', '65203305', '65201005', '65203505', '65202805', '65203005', '65203705', '65203405', '65204105', '65200605', '65201505'];
// 비추적 유물 각인서 31종 평균가 합 — 2026-09-07 거래소 전일 평균 거래가로 갱신
// (수집기가 Stats[0].AvgPrice 를 쓰므로 추적 12종과 같은 "전일 평균 거래가" 열을 기준으로 적는다)
// (속전속결602.3 중갑532.8 마나흐름502.2 바리케이드499.2 정기흡수485.3 구슬동자472.8 안정339.4
//  선수필승328.8 승부사300.5 급소236.2 정밀단도231.4 마나효율225.5 긴급구조189.9 추진력186.9
//  시선집중157.3 분쇄109.2 번개의분노104.9 달인의저력84.7 약자무시61.9 강령술44.3 폭발물36.3 불굴20.6
//  탈출의명수13.4 최마증12.8 에테르12.2 위기모면10.2 강화방패8.7
//  + 목록에 안 뜬 3종은 직전 값 유지: 여신의가호2.5 굳은의지2.2 실드관통1.9)
// 부러진뼈는 이번 레이드 특수로 14.6 → 1,861.9 로 튄 일시적인 값이라 직전 값(14.6)을 그대로 쓴다.
// 나머지가 전반적으로 내려서 직전 6,130(2026-08-07) 대비 -299.
export const NON_TRACKED_ENGRAVING_SUM = 5831;
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

// 젬 선택 상자로 받은 젬을 거래소에 올릴 때 드는 페온 (등급별). 고급 젬은 지금 표(1730/1750)에 안 나온다.
export const GEM_PEON = { advanced: 3, rare: 6, hero: 12 } as const;

// 고정 단가
export const RARE_GEM_PRICE = 50;               // 희귀 젬 1개 — 2026-09-11 거래가 50골 수준으로 내려 2,000 → 50
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

export function getRewardData(mode: 'hell' | 'narak', level: HellItemLevel = 1750): Record<string, string[]> {
  if (level === 1730) return mode === 'hell' ? HELL_BOX_REWARDS_1730 : NARAK_BOX_REWARDS_1730;
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

// 최고가 영웅 젬 (어떤 젬이 뽑혔는지까지 알려준다). 시세가 없으면 null.
export function getHeroGemMax(prices: Record<string, number>): HeroGemPick | null {
  let best: HeroGemPick | null = null;
  for (const g of HERO_GEMS) {
    const price = prices[g.id] || 0;
    if (price > 0 && (!best || price > best.price)) best = { ...g, price };
  }
  return best;
}

// 영웅 젬 최고가
export function getHeroGemMaxPrice(prices: Record<string, number>): number {
  return getHeroGemMax(prices)?.price ?? 0;
}

// 상자 보상 골드 가치
export function calcBoxRewardGold(
  rewardName: string,
  tier: number,
  prices: Record<string, number>,
  mode: 'hell' | 'narak',
  peonGoldValue: number,
  specialRefiningCost: number,
  level: HellItemLevel = 1750
): number | null {
  const data = getRewardData(mode, level);
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

  // 젬 선택 상자 — (영웅: 최고가 시세 / 희귀: 고정가) + 등급별 페온
  if (rewardName === '젬 선택 상자') {
    const gem = parseGemSelectBox(rawVal);
    if (!gem) return 0;
    const unit = gem.rarity === 'hero' ? getHeroGemMaxPrice(prices) : RARE_GEM_PRICE;
    return Math.floor(gem.count * (unit + GEM_PEON[gem.rarity] * peonGoldValue));
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

// 단계(0~10) → 층 라벨. 지옥 보상 페이지와 패키지 상세의 층 선택이 같은 표를 쓴다
export const TICKET_TIER_LABELS = ['0~9', '10~19', '20~29', '30~39', '40~49', '50~59', '60~69', '70~79', '80~89', '90~99', '100'];

// 패키지 티켓 평가에 쓰는 층(단계). 갤러리 카드·효율순 정렬은 항상 기본값이고,
// 상세 페이지에서만 사용자가 바꿀 수 있다(localStorage 에 기억).
// 큐브 티켓은 "6장 = 영웅 지옥 티켓 1장" 교환이라 영웅 층을 따른다.
export type TicketTiers = { hellLegendary: number; hellHeroic: number; narakLegendary: number };
export const DEFAULT_TICKET_TIERS: TicketTiers = { hellLegendary: 7, hellHeroic: 6, narakLegendary: 2 };

/** 패키지 아이템 ID(fixed_…)가 지옥/나락/큐브 티켓이면 1장 가치, 아니면 null */
export function calcTicketUnitByItemId(
  itemId: string,
  prices: Record<string, number>,
  bcRate: number,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
  noPeon: boolean = false,
): number | null {
  switch (itemId) {
    case 'fixed_hell-legendary-ticket': return calcTicketAverage('hell', tiers.hellLegendary, prices, bcRate, true, noPeon);
    case 'fixed_hell-heroic-ticket': return calcTicketAverage('hell', tiers.hellHeroic, prices, bcRate, true, noPeon);
    case 'fixed_naraka-legendary-ticket': return calcTicketAverage('narak', tiers.narakLegendary, prices, bcRate, true, noPeon);
    case 'fixed_cube-ticket': return calcTicketAverage('hell', tiers.hellHeroic, prices, bcRate, true, noPeon) / 6;
    default: return null;
  }
}

export const isTicketItemId = (itemId: string): boolean =>
  itemId === 'fixed_hell-legendary-ticket' || itemId === 'fixed_hell-heroic-ticket' ||
  itemId === 'fixed_naraka-legendary-ticket' || itemId === 'fixed_cube-ticket';

// ─── 상자 기댓값 ───
// 지옥/나락을 끝내면 그 단계 보상 목록에서 상자가 3개(히든층 '상자 +1'을 받았으면 4개) 중복 없이 뜨고,
// 그중 1개를 고른다. 그래서 상자 하나의 기댓값은 목록 평균이 아니라 "뜬 k개 중 최고값의 기댓값"이다.
// 진행 규칙은 docs/hell-reward/sim-rules.md.
export const BOX_PICK_COUNT = 3;
export const BOX_PICK_COUNT_BONUS = 4;

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** values 에서 k개를 중복 없이 균등하게 뽑아 최고값을 고를 때의 기댓값 */
export function calcPickBestExpected(values: number[], k: number): number {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return 0;
  const kk = Math.min(k, n);
  const total = comb(n, kk);
  let e = 0;
  // 오름차순 i번째 값이 뽑힌 kk개 중 최고가 될 확률 = C(i, kk-1) / C(n, kk)
  for (let i = 0; i < n; i++) e += v[i] * (comb(i, kk - 1) / total);
  return e;
}

/**
 * 단계 상자 기댓값 (기본 보상 제외).
 * 어빌리티스톤 제외는 "후보 자리는 차지하되 0골드" — 뜨는 확률은 그대로고 가치만 안 친다.
 */
export function calcBoxExpectedGold(
  mode: 'hell' | 'narak',
  tier: number,
  prices: Record<string, number>,
  bcRate: number,
  opts: { boxCount?: number; excludeAbilityStone?: boolean; level?: HellItemLevel; noPeon?: boolean } = {},
): number {
  const { boxCount = BOX_PICK_COUNT, excludeAbilityStone = true, level = 1750, noPeon = false } = opts;
  // noPeon: 페온 가치 제거 — 팔찌·젬·어빌리티스톤에 붙는 페온 몫을 0으로 친다
  const peonGoldValue = noPeon ? 0 : 8.5 * (bcRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices);
  const data = getRewardData(mode, level);

  const values: number[] = [];
  for (const name of Object.keys(data)) {
    const rawVal = data[name]?.[tier];
    if (!rawVal || rawVal === '-') continue;
    const val = calcBoxRewardGold(name, tier, prices, mode, peonGoldValue, specialRefiningCost, level);
    if (val === null) continue;
    values.push(excludeAbilityStone && name === '어빌리티스톤' ? 0 : val);
  }
  return Math.floor(calcPickBestExpected(values, boxCount));
}

// 티켓(열쇠) 1장 골드 가치 = 상자 3개 중 택1 기댓값 — 패키지·익스트림의 티켓 평가는 1750 표 고정이라 레벨 인자를 두지 않는다
export function calcTicketAverage(
  mode: 'hell' | 'narak',
  tier: number,
  prices: Record<string, number>,
  bcRate: number,
  excludeAbilityStone: boolean = true,
  noPeon: boolean = false,
): number {
  return calcBoxExpectedGold(mode, tier, prices, bcRate, { excludeAbilityStone, noPeon });
}
