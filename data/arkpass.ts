// ============================================================
// 아크패스 「창공의 안내자」 보상 데이터 (1 ~ 30 레벨)
// ------------------------------------------------------------
// ※ 지난 시즌 표 기준 임시 데이터입니다. 확정 데이터로 교체하세요.
//   - 일반 레벨: 아크패스 보상은 I / II 중 택1 (선택)
//   - Special 레벨(5·10·15·20·25·30): 아크패스/프리미엄은 단일 지급, 슈퍼는 마일스톤(벽지/크리스탈/아바타)
//
// 골드 가치 지정:
//   1) gold        : 개당 고정 골드
//   2) priceKey    : latest.json 아이템 ID 실시간 시세 (+bundle)
//   3) crystalCost : 개당 블루크리스탈 단가(BC) → 환율로 환산 (페온/젬가공권/도약/물약/펫 등)
//   4) category 'crystal' : 블루 크리스탈 그 자체
//   없으면 "가치 미산정"으로 합계 제외.
// ============================================================

export type RewardCategory =
  | 'gold'
  | 'material'
  | 'card'
  | 'gem'
  | 'crystal'
  | 'peon'
  | 'avatar'
  | 'wallpaper'
  | 'pet'
  | 'etc';

/** 상자 구성품 1종 (정보 표시용 — 효율 계산에는 영향 없음) */
export interface BoxItem {
  name: string;
  image?: string;
  qty?: number;
  /** 귀속 여부 (귀속 뱃지 표시) */
  bound?: boolean;
  /** 획득 확률(%) — 랜덤 상자 구성품에 표시 */
  prob?: number;
}

/** 상자 구성 방식: select=택1 / include=전부 포함 / random=확률 1개 */
export type BoxMode = 'select' | 'include' | 'random';

/** 상자 구성품 (마우스 호버 시 표시) */
export interface BoxContents {
  mode: BoxMode;
  /** 상단 안내 문구 (귀속/확률 등) */
  note?: string;
  items: BoxItem[];
}

export interface Reward {
  name: string;
  image?: string;
  qty: number;
  category?: RewardCategory;
  gold?: number;
  priceKey?: string;
  bundle?: number;
  /** 개당 블루크리스탈 단가(BC). 환율로 골드 환산 */
  crystalCost?: number;
  /** 개당 현금 단가(원). 시세 없는 현금 상품(펫/탈것/아바타) 골드 환산 */
  wonCost?: number;
  /** 시세에 더하는 보너스 골드(개당). 가공 완료 젬 등. 효율·표시 모두 반영 */
  bonusGold?: number;
  /** 귀속 여부 — 시세형(choices) 옵션에 귀속 뱃지 표시 */
  bound?: boolean;
  /** 확률 기댓값 가치 — Σ(prob% × 시세). 랜덤 상자(영웅 젬 상자 등) */
  expected?: { priceKey: string; prob: number }[];
  /** 아바타 이미지에서 보여줄 세로 위치(object-position Y) */
  cropY?: string;
  /** 선택 상자: 옵션 중 택1 (효율은 가치 최댓값 옵션 × qty(상자 수) 기준).
   *  각 옵션은 자체 qty/priceKey/gold 를 가진 Reward. */
  choices?: Reward[];
  /** 마우스 호버 시 표시할 상자 구성품 (정보 전용, 효율 계산 무관) */
  contents?: BoxContents;
}

export interface PassLevel {
  level: number;
  /** 아크패스 보상 — 일반 레벨은 2개(택1), Special 레벨은 1개(지급) */
  achievement: Reward[];
  /** 프리미엄 보상 */
  premium: Reward[];
  /** 슈퍼 프리미엄 추가 보상 (Special 레벨만) */
  superPremium?: Reward[];
  /** Special 레벨(5단위) — 아크패스가 선택이 아닌 지급 */
  special?: boolean;
}

// ------------------------------------------------------------
// 패스 가격 (현금, 원)
// ------------------------------------------------------------
export const ARKPASS_PRICE = {
  premium: 19600,
  superPremium: 49200,
};

// ------------------------------------------------------------
// 가격 상수 (패키지 등록 페이지 lib/package-shared.ts 기준)
// ------------------------------------------------------------
// 상자 → 실제 지급 아이템 시세 키 (latest_prices.json, 전부 개당/주머니당 단가 = bundle 1)
const SHARD_BAG_KEY = '66130143';        // 파편 상자 → 운명의 파편 주머니(대)
const GREAT_LEAP_STONE_KEY = '66110226'; // 위대한 운명의 돌파석
const LEAP_STONE_KEY = '66110225';       // 운명의 돌파석
const ADV_ABIDOS_KEY = '6861013';        // 상급 아비도스 융화 재료
const ABIDOS_KEY = '6861012';            // 아비도스 융화 재료
const LAVA_BREATH_KEY = '66111131';      // 용암의 숨결
const GLACIER_BREATH_KEY = '66111132';   // 빙하의 숨결
const METAL_3_KEY = '66112715';          // 장인의 야금술 : 3단계
const METAL_4_KEY = '66112717';          // 장인의 야금술 : 4단계
const TAILOR_3_KEY = '66112716';         // 장인의 재봉술 : 3단계
const TAILOR_4_KEY = '66112718';         // 장인의 재봉술 : 4단계
// 블루크리스탈 단가(BC/개)
const BC_PEON = 8.5;
const BC_GEM_RESET = 100;
const BC_LIFE_MID = 23;

// ------------------------------------------------------------
// 보상 헬퍼
// ------------------------------------------------------------
const r = (name: string, image: string, qty: number, extra: Partial<Reward> = {}): Reward =>
  ({ name, image, qty, ...extra });

// ── 6종 영웅 젬 (질서 3 + 혼돈 3) — 패키지 등록 페이지와 동일 ──────
//   key = latest_prices.json 아이템 ID, prob = 영웅 젬 상자(랜덤) 확률(%)
const HERO_GEMS: { name: string; image: string; key: string; prob: number }[] = [
  { name: '질서의 젬 : 안정', image: '/gem-order-stable.webp',    key: '67400003', prob: 30 },
  { name: '질서의 젬 : 견고', image: '/gem-order-solid.webp',     key: '67400103', prob: 15 },
  { name: '질서의 젬 : 불변', image: '/gem-order-immutable.webp', key: '67400203', prob: 5 },
  { name: '혼돈의 젬 : 침식', image: '/gem-chaos-erosion.webp',   key: '67410303', prob: 30 },
  { name: '혼돈의 젬 : 왜곡', image: '/gem-chaos-distortion.webp', key: '67410403', prob: 15 },
  { name: '혼돈의 젬 : 붕괴', image: '/gem-chaos-collapse.webp',  key: '67410503', prob: 5 },
];
// 랜덤 상자 구성품(확률 표시용). scale: 영웅 상자=1, 희귀~영웅 상자=0.1(영웅 10%)
const heroGemRandomItems = (scale = 1): BoxItem[] =>
  HERO_GEMS.map((g) => ({ name: g.name, image: g.image, prob: g.prob * scale }));
// 확률 기댓값 가치 (패키지 등록/지평의 성당 페이지와 동일 방식)
const heroGemExpected = (scale = 1): { priceKey: string; prob: number }[] =>
  HERO_GEMS.map((g) => ({ priceKey: g.key, prob: g.prob * scale }));
// 선택 상자 옵션(택1, 시세 기반 자동 최고가) — bonus 골드 옵션
const heroGemChoices = (bonus = 0): Reward[] =>
  HERO_GEMS.map((g) => ({
    name: g.name, image: g.image, qty: 1, category: 'gem' as const, priceKey: g.key,
    ...(bonus ? { bonusGold: bonus } : {}),
  }));
// 창공의 배틀 선택 상자 — 1종 선택 (전부 귀속, 각 30개)
const BATTLE_ITEMS: BoxItem[] = [
  { name: '빛나는 정령의 회복약', qty: 30, bound: true },
  { name: '빛나는 회오리 수류탄', qty: 30, bound: true },
  { name: '빛나는 암흑 수류탄', qty: 30, bound: true },
  { name: '빛나는 성스러운 부적', qty: 30, bound: true },
  { name: '빛나는 성스러운 폭탄', qty: 30, bound: true },
  { name: '빛나는 파괴 폭탄', qty: 30, bound: true },
  { name: '빛나는 부식 폭탄', qty: 30, bound: true },
  { name: '아드로핀 물약', qty: 30, bound: true },
  { name: '각성 물약', qty: 30, bound: true },
];

// 프리미엄/슈퍼 공용 「창공의」 선택 상자
// 가치 = 빛나는 정령의 회복약 기준(개당 300G × 30개 = 9,000G/상자)
const battleBox = (q: number) => r('창공의 배틀 선택 상자', '/gong-battle.webp', q, {
  category: 'etc', gold: 9000,
  contents: { mode: 'select', note: '획득 시 원정대 귀속 · 1종 선택 · 빛나는 정령의 회복약 기준 개당 300G', items: BATTLE_ITEMS },
});
// 시세 옵션 헬퍼 (각 옵션 = 자체 수량/시세키, 전부 귀속)
const opt = (name: string, image: string, qty: number, priceKey?: string): Reward =>
  ({ name, image, qty, category: 'material', bound: true, ...(priceKey ? { priceKey } : {}) });

// 창공의 파편 상자 — 상자당 운명의 파편 주머니(대) 100개 (포함)
const shardBox = (q: number) => r('창공의 파편 상자', '/gong-shard.webp', q, {
  category: 'material',
  choices: [opt('운명의 파편 주머니(대)', '/destiny-shard-bag-large5.webp', 100, SHARD_BAG_KEY)],
});

// ── 「창공의」 선택 상자 — 실제 수량 × LATEST.JSON 시세, 자동 최고가 ──
const leapBox = (q: number) => r('창공의 돌파 선택 상자', '/gong-leap.webp', q, {
  category: 'material',
  choices: [
    opt('운명의 돌파석', '/destiny-breakthrough-stone5.webp', 1200, LEAP_STONE_KEY),
    opt('위대한 운명의 돌파석', '/top-destiny-breakthrough-stone5.webp', 400, GREAT_LEAP_STONE_KEY),
  ],
});
const fusionBox = (q: number) => r('창공의 융화 선택 상자', '/gong-fusion.webp', q, {
  category: 'material',
  choices: [
    opt('아비도스 융화 재료', '/abidos-fusion5.webp', 240, ABIDOS_KEY),
    opt('상급 아비도스 융화 재료', '/top-abidos-fusion5.webp', 180, ADV_ABIDOS_KEY),
  ],
});
const supportBox = (q: number) => r('창공의 보조 선택 상자', '/gong-support.webp', q, {
  category: 'material',
  choices: [
    opt('용암의 숨결', '/breath-lava5.webp', 70, LAVA_BREATH_KEY),
    opt('빙하의 숨결', '/breath-glacier5.webp', 90, GLACIER_BREATH_KEY),
    opt('장인의 야금술 : 3단계', '/master-metallurgy-3.webp', 20, METAL_3_KEY),
    opt('장인의 야금술 : 4단계', '/master-metallurgy-4.webp', 10, METAL_4_KEY),
    opt('장인의 재봉술 : 3단계', '/master-tailoring-3.webp', 20, TAILOR_3_KEY),
    opt('장인의 재봉술 : 4단계', '/master-tailoring-4.webp', 10, TAILOR_4_KEY),
  ],
});
const gemReset = (q: number) => r('젬 가공 초기화권', '/gem-reset-ticket.webp', q, { category: 'gem', crystalCost: BC_GEM_RESET });
const braceletReconvert = (q: number) => r('팔찌 효과 재변환권 상자', '/gong-bracelet-reconvert.webp', q, {
  category: 'etc', gold: 50,
  contents: { mode: 'include', note: '상자 1개당 아래 구성품 포함', items: [{ name: '팔찌 효과 재변환권', qty: 3 }] },
});
const peon = (q: number) => r('페온', '/pheon-pass.webp', q, { category: 'peon', crystalCost: BC_PEON });
const SHILLING_PER_PLATINUM = 20000; // 백금화 1개 = 2만 실링
const platinum = (q: number) => r('고대의 백금화', '/shilling.webp', q, {
  category: 'etc', gold: 0,
  contents: { mode: 'include', items: [],
    note: `1개당 ${SHILLING_PER_PLATINUM.toLocaleString()} 실링 · 총 ${(q * SHILLING_PER_PLATINUM).toLocaleString()} 실링` },
});

// ── 신규 시즌 고유 보상 ──────────────────────────────────────
// 영웅 젬 상자 — 6종 랜덤(영웅 보장). 확률 기댓값으로 가치 산정
const heroGem = (q: number) => r('영웅 젬 상자', '/gem-hero.webp', q, {
  category: 'gem', expected: heroGemExpected(),
  contents: { mode: 'random', note: '6종 영웅 젬 확률 획득 · 기댓값 기준 가치', items: heroGemRandomItems() },
});
// 영웅 젬 선택 상자 — 6종 택1, 시세 기반 자동 최고가
const heroGemSelect = (q: number) => r('영웅 젬 선택 상자', '/gem-hero.webp', q, {
  category: 'gem', choices: heroGemChoices(),
});
// 고정형 영웅 젬 선택 상자 — 영웅 젬 선택 상자와 동일(이름만 다름)
const fixedHeroGemSelect = (q: number) => r('고정형 영웅 젬 선택 상자', '/fixed-hero-gem-select.webp', q, {
  category: 'gem', choices: heroGemChoices(),
});
// 희귀~영웅 젬 상자 — 영웅 젬 10% 확률(나머지 희귀). 기댓값으로 가치 산정
const rareHeroGemBox = (q: number) => r('희귀~영웅 젬 상자', '/duddndgmlrnl.webp', q, {
  category: 'gem', expected: heroGemExpected(0.1),
  contents: { mode: 'random', note: '영웅 젬 10% 확률(나머지 희귀) · 기댓값 기준 가치', items: heroGemRandomItems(0.1) },
});
// 가공 완료 젬 선택 상자 II — 6종 택1 + 가공 완료 보너스 +8,100G(900×9)
const FINISHED_GEM_BONUS = 8100;
const finishedGemSelect = (q: number) => r('가공 완료 젬 선택 상자 II', '/finished-gem-select.webp', q, {
  category: 'gem', bonusGold: FINISHED_GEM_BONUS, choices: heroGemChoices(FINISHED_GEM_BONUS),
});
const engraveKit = (q: number) => r('비상의 돌 각인 지정 키트', '/engrave-kit.webp', q, { category: 'etc', gold: 0 });
const menelik = (q: number) => r('메넬리크의 서', '/menelik.webp', q, { category: 'etc', gold: 0 });
const lifeMid = (q: number) => r('중급 생명의 기운 회복물약', '/life-energy.webp', q, { category: 'etc', crystalCost: BC_LIFE_MID });
const territoryEnergy = (q: number) => r('영지의 기운 (중)', '/territory-energy.webp', q, { category: 'etc', gold: 0 });
// 펫 기능&효과 상자 — 기능(120BC) + 지원(120BC) = 상자당 240 BC
const petFunc = (q: number) => r('펫 기능&효과 이용권 상자 (14일)', '/pet-function-box.webp', q, {
  category: 'pet', crystalCost: 240,
  contents: { mode: 'include', note: '상자 1개당 아래 구성품 포함 (각 120 BC)', items: [
    { name: '펫 기능 이용권 (14일)', image: '/pet-function.webp', qty: 1 },
    { name: '펫 지원 효과 이용권 (14일)', image: '/pet-support.webp', qty: 1 },
  ] },
});
// 마법학회 시약 선택 상자 — 3종 택1(자동 최고가). 상자당 100개, BC/개 단가
const magicReagent = (q: number) => r('마법학회 시약 선택 상자', '/magic-reagent-select.webp', q, {
  category: 'etc',
  choices: [
    { name: '마법학회 염색 시약', image: '/reagent-dye.webp',     qty: 100, category: 'etc', crystalCost: 3.6 },
    { name: '마법학회 패턴 시약', image: '/reagent-pattern.webp', qty: 100, category: 'etc', crystalCost: 2.7 },
    { name: '마법학회 광택 시약', image: '/reagent-gloss.webp',   qty: 100, category: 'etc', crystalCost: 1.8 },
  ],
});
const cloth = (q: number) => r('옷감', '/cloth.webp', q, { category: 'etc', gold: 0 });
const yozJar = (q: number) => r('요즈의 항아리 : 영원', '/yoz-jar.webp', q, { category: 'etc', crystalCost: 100 });
const passPet = (name: string, image: string, wonCost: number) => r(name, image, 1, { category: 'pet', wonCost });
// 환희 카드 팩
const joyCardAll = (q: number) => r('환희의 전체 카드 팩', '/cardpack-all.webp', q, { category: 'card', gold: 50 });
const joyCardRare = (q: number) => r('환희의 전설~희귀 카드 팩', '/cardpack-rare.webp', q, { category: 'card', gold: 400 });
const joyCardHero = (q: number) => r('환희의 전설~영웅 카드 팩', '/cardpack-legendary.webp', q, { category: 'card', gold: 2000 });
const joyCardLegend = (q: number) => r('환희의 전설 카드 팩', '/joy-card-legend.webp', q, { category: 'card', gold: 8000 });
// 반짝이는 카드 선택 팩 (영웅/희귀/고급 = 0골드)
const shinyCardUncommon = (q: number) => r('반짝이는 고급 카드 선택 팩', '/shiny-card-uncommon.webp', q, { category: 'card', gold: 0 });
const shinyCardRare = (q: number) => r('반짝이는 희귀 카드 선택 팩', '/shiny-card-rare.webp', q, { category: 'card', gold: 0 });
const shinyCardHero = (q: number) => r('반짝이는 영웅 카드 선택 팩', '/shiny-card-hero.webp', q, { category: 'card', gold: 0 });
const leapCardSelect = (q: number) => r('도약의 전설 카드 선택 팩 III', '/legendary-cardpack.webp', q, { category: 'card', gold: 16000 });

// 슈퍼 프리미엄 마일스톤
const crystalBox = (boxes: number, perBox: number): Reward =>
  ({ name: `크리스탈 ${perBox}개 상자`, image: '/blue.webp', qty: boxes, category: 'crystal', crystalCost: perBox });
// 아바타 4부위(상의·하의·얼굴·머리) 합산 24,000원 → 3개 상자(머리/의상/얼굴1)에 균등 분배
const AVATAR_PART_WON = 8000;
const avatarPart = (part: string, cropY: string): Reward => ({
  name: `창공의 안내자 ${part} 선택 상자 (패스)`,
  image: '/arkpass-avatar.webp',
  qty: 1,
  category: 'avatar',
  cropY,
  wonCost: AVATAR_PART_WON,
});

// ------------------------------------------------------------
// 1 ~ 30 레벨
//   일반: achievement = [I 고유 보상, II = 프리미엄 상자]  (택1)
//   Special: achievement = [지급 보상 1개], special: true
// ------------------------------------------------------------
// 일반 레벨: achievement = [I, II] (택1), premium = [프리미엄], 슈퍼 없음
// 스페셜 레벨(5·10·15·20·25·30): achievement = [I지급], premium = [II], superPremium = [슈퍼]
export const ARKPASS_LEVELS: PassLevel[] = [
  { level: 1,  achievement: [rareHeroGemBox(10), engraveKit(7)],  premium: [engraveKit(10)] },
  { level: 2,  achievement: [heroGem(1), engraveKit(15)],         premium: [engraveKit(20)] },
  { level: 3,  achievement: [gemReset(1), braceletReconvert(3)],  premium: [braceletReconvert(5)] },
  { level: 4,  achievement: [gemReset(1), braceletReconvert(3)],  premium: [braceletReconvert(5)] },
  { level: 5,  special: true,
               achievement: [finishedGemSelect(1)],   premium: [finishedGemSelect(1)],   superPremium: [avatarPart('머리', '0%')] },
  { level: 6,  achievement: [menelik(5), battleBox(1)],           premium: [heroGem(3)] },
  { level: 7,  achievement: [joyCardAll(10), battleBox(1)],       premium: [heroGemSelect(2)] },
  { level: 8,  achievement: [joyCardRare(10), battleBox(2)],      premium: [gemReset(3)] },
  { level: 9,  achievement: [joyCardHero(10), battleBox(2)],      premium: [gemReset(3)] },
  { level: 10, special: true,
               achievement: [joyCardLegend(1)],       premium: [fixedHeroGemSelect(3)],  superPremium: [avatarPart('의상', '14%')] },
  { level: 11, achievement: [lifeMid(7), shardBox(1)],            premium: [shardBox(2)] },
  { level: 12, achievement: [lifeMid(7), leapBox(1)],             premium: [leapBox(2)] },
  { level: 13, achievement: [territoryEnergy(10), fusionBox(1)],  premium: [fusionBox(2)] },
  { level: 14, achievement: [territoryEnergy(10), supportBox(1)], premium: [supportBox(2)] },
  { level: 15, special: true,
               achievement: [passPet('코기 펫 선택 상자 (패스)', '/pass-pet-corgi.webp', 15000)], premium: [passPet('구르미 탈것 선택 상자 (패스)', '/pass-mount-carrier.webp', 19800)], superPremium: [avatarPart('얼굴1', '40%')] },
  { level: 16, achievement: [petFunc(2), shardBox(1)],            premium: [shardBox(2)] },
  { level: 17, achievement: [platinum(50), leapBox(1)],           premium: [leapBox(2)] },
  { level: 18, achievement: [platinum(50), fusionBox(1)],         premium: [fusionBox(2)] },
  { level: 19, achievement: [platinum(50), supportBox(1)],        premium: [supportBox(2)] },
  { level: 20, special: true,
               achievement: [peon(30)],               premium: [peon(30)],               superPremium: [crystalBox(1, 200)] },
  { level: 21, achievement: [magicReagent(1), shardBox(1)],       premium: [shardBox(2)] },
  { level: 22, achievement: [magicReagent(1), leapBox(1)],        premium: [leapBox(2)] },
  { level: 23, achievement: [cloth(15), fusionBox(1)],            premium: [fusionBox(2)] },
  { level: 24, achievement: [yozJar(1), supportBox(1)],           premium: [supportBox(2)] },
  { level: 25, special: true,
               achievement: [peon(30)],               premium: [peon(30)],               superPremium: [crystalBox(1, 300)] },
  { level: 26, achievement: [menelik(5), shardBox(1)],            premium: [shardBox(2)] },
  { level: 27, achievement: [shinyCardUncommon(5), leapBox(1)],   premium: [leapBox(2)] },
  { level: 28, achievement: [shinyCardRare(5), fusionBox(1)],     premium: [fusionBox(2)] },
  { level: 29, achievement: [shinyCardHero(3), supportBox(1)],    premium: [supportBox(2)] },
  { level: 30, special: true,
               achievement: [joyCardLegend(1)],       premium: [leapCardSelect(1)],      superPremium: [crystalBox(1, 500)] },
];
