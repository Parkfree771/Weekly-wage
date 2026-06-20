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
  /** 아바타 이미지에서 보여줄 세로 위치(object-position Y) */
  cropY?: string;
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
  premium: 19900,
  superPremium: 39900,
};

// ------------------------------------------------------------
// 가격 상수 (패키지 등록 페이지 lib/package-shared.ts 기준)
// ------------------------------------------------------------
const HERO_GEM_KEY = '67400103';   // 영웅 젬(대표가)
const LEGEND_CARDPACK_GOLD = 8000; // 전설 카드팩
const CHAOS_WEAPON_GOLD = 800;     // 정련된 혼돈의 돌(무기)
const CHAOS_ARMOR_GOLD = 300;      // 정련된 혼돈의 돌(방어구)
// 블루크리스탈 단가(BC/개)
const BC_PEON = 8.5;
const BC_GEM_RESET = 100;
const BC_LEAP = 10;
const BC_LIFE_MID = 23;
const BC_PET_FUNC = 60;

// ------------------------------------------------------------
// 보상 헬퍼
// ------------------------------------------------------------
const r = (name: string, image: string, qty: number, extra: Partial<Reward> = {}): Reward =>
  ({ name, image, qty, ...extra });

// 프리미엄/택2 공용 상자 (전시즌 "유랑자의" 접두어 제거)
const battleBox = (q: number) => r('배틀 아이템 선택 상자', '/battle-item-box.webp', q, { category: 'etc', gold: 82 });
const shardBox = (q: number) => r('파편 상자', '/destiny-shard-bag-large.webp', q, { category: 'material' });
const leapBox = (q: number) => r('돌파석 상자', '/destiny-breakthrough-stone2.webp', q, { category: 'material' });
const fusionBox = (q: number) => r('융화 재료 상자', '/abidos-fusion2.webp', q, { category: 'material' });
const supportBox = (q: number) => r('보조 재료 선택 상자', '/material-select-box.webp', q, { category: 'material' });
const gemReset = (q: number) => r('젬 가공 초기화권', '/gem-reset-ticket.webp', q, { category: 'gem', crystalCost: BC_GEM_RESET });
const braceletReconvert = (q: number) => r('팔찌 효과 재변환권 상자', '', q, { category: 'etc', gold: 50 });
const peon = (q: number) => r('페온', '/pheon.webp', q, { category: 'peon', crystalCost: BC_PEON });
const platinum = (q: number) => r('고대의 백금화', '/shilling.webp', q, { category: 'etc', gold: 0 });
const chaosWeapon = (q: number) => r('정련된 혼돈의 돌 상자 (무기)', '/weapon-quality.webp', q, { category: 'material', gold: CHAOS_WEAPON_GOLD });
const chaosArmor = (q: number) => r('정련된 혼돈의 돌 상자 (방어구)', '/armor-quality.webp', q, { category: 'material', gold: CHAOS_ARMOR_GOLD });

// 슈퍼 프리미엄 마일스톤
const wallpaper = (name: string): Reward => ({ name, image: '', qty: 1, category: 'wallpaper' });
const crystalBox = (boxes: number, perBox: number): Reward =>
  ({ name: `크리스탈 ${perBox}개 상자`, image: '/blue.webp', qty: boxes, category: 'crystal', crystalCost: perBox });
const avatarPart = (part: string, cropY: string): Reward => ({
  name: `${part} 선택 상자 (패스)`,
  image: '/arkpass-avatar.webp',
  qty: 1,
  category: 'avatar',
  cropY,
});

// ------------------------------------------------------------
// 1 ~ 30 레벨
//   일반: achievement = [I 고유 보상, II = 프리미엄 상자]  (택1)
//   Special: achievement = [지급 보상 1개], special: true
// ------------------------------------------------------------
export const ARKPASS_LEVELS: PassLevel[] = [
  { level: 1,  achievement: [r('마법학회 광택 시약', '', 30, { category: 'etc' }), battleBox(1)], premium: [battleBox(1)] },
  { level: 2,  achievement: [r('마법학회 패턴 시약', '', 30, { category: 'etc' }), battleBox(1)], premium: [battleBox(1)] },
  { level: 3,  achievement: [r('마법학회 염색 시약', '', 50, { category: 'etc' }), battleBox(2)], premium: [battleBox(2)] },
  { level: 4,  achievement: [r('마법학회 염색 시약', '', 50, { category: 'etc' }), battleBox(2)], premium: [battleBox(2)] },
  { level: 5,  special: true,
               achievement: [r('낙타 펫 선택 상자 (패스)', '', 1, { category: 'pet' })],
               premium: [r('탈것 선택 상자 (패스)', '', 1, { category: 'pet' })],
               superPremium: [wallpaper('벽지 : 죽음의 대지')] },
  { level: 6,  achievement: [platinum(30), gemReset(1)], premium: [gemReset(1)] },
  { level: 7,  achievement: [platinum(30), gemReset(1)], premium: [gemReset(1)] },
  { level: 8,  achievement: [platinum(30), braceletReconvert(1)], premium: [braceletReconvert(1)] },
  { level: 9,  achievement: [platinum(30), braceletReconvert(1)], premium: [braceletReconvert(1)] },
  { level: 10, special: true,
               achievement: [r('펫 기능&효과 이용권 상자 (14일)', '/pet-function.webp', 2, { category: 'pet', crystalCost: BC_PET_FUNC })],
               premium: [r('펫 기능&효과 이용권 상자 (14일)', '/pet-function.webp', 2, { category: 'pet', crystalCost: BC_PET_FUNC })],
               superPremium: [crystalBox(2, 500)] },
  { level: 11, achievement: [chaosArmor(3), shardBox(1)], premium: [shardBox(1)] },
  { level: 12, achievement: [chaosArmor(3), leapBox(1)], premium: [leapBox(1)] },
  { level: 13, achievement: [chaosWeapon(1), fusionBox(1)], premium: [fusionBox(1)] },
  { level: 14, achievement: [chaosWeapon(1), supportBox(1)], premium: [supportBox(1)] },
  { level: 15, special: true,
               achievement: [peon(25)], premium: [peon(25)],
               superPremium: [avatarPart('머리', '0%')] },
  { level: 16, achievement: [r('옷감', '', 3, { category: 'etc' }), shardBox(1)], premium: [shardBox(1)] },
  { level: 17, achievement: [r('옷감', '', 5, { category: 'etc' }), leapBox(1)], premium: [leapBox(1)] },
  { level: 18, achievement: [r('옷감', '', 7, { category: 'etc' }), fusionBox(1)], premium: [fusionBox(1)] },
  { level: 19, achievement: [r('요즈의 항아리 : 영원', '', 1, { category: 'etc' }), supportBox(1)], premium: [supportBox(1)] },
  { level: 20, special: true,
               achievement: [peon(25)], premium: [peon(25)],
               superPremium: [avatarPart('얼굴2', '14%')] },
  { level: 21, achievement: [r('초급 생명의 기운 회복물약', '/life-energy.webp', 7, { category: 'etc' }), shardBox(2)], premium: [shardBox(2)] },
  { level: 22, achievement: [r('중급 생명의 기운 회복물약', '/life-energy.webp', 3, { category: 'etc', crystalCost: BC_LIFE_MID }), leapBox(2)], premium: [leapBox(2)] },
  { level: 23, achievement: [r('도약의 정수', '/leap-essence.webp', 5, { category: 'material', crystalCost: BC_LEAP }), fusionBox(2)], premium: [fusionBox(2)] },
  { level: 24, achievement: [r('도약의 정수', '/leap-essence.webp', 5, { category: 'material', crystalCost: BC_LEAP }), supportBox(2)], premium: [supportBox(2)] },
  { level: 25, special: true,
               achievement: [r('전설 카드 팩 IV', '/cardpack-legendary.webp', 1, { category: 'card', gold: LEGEND_CARDPACK_GOLD })],
               premium: [r('전설 카드 팩 IV', '/cardpack-legendary.webp', 1, { category: 'card', gold: LEGEND_CARDPACK_GOLD })],
               superPremium: [avatarPart('상의', '40%')] },
  { level: 26, achievement: [r('반짝이는 고급 카드 선택 팩', '/cardpack-rare.webp', 5, { category: 'card' }), shardBox(2)], premium: [shardBox(2)] },
  { level: 27, achievement: [r('반짝이는 희귀 카드 선택 팩', '/cardpack-rare.webp', 5, { category: 'card' }), leapBox(2)], premium: [leapBox(2)] },
  { level: 28, achievement: [r('전설~희귀 카드 팩 IV', '/cardpack-legendary.webp', 10, { category: 'card', gold: 400 }), fusionBox(2)], premium: [fusionBox(2)] },
  { level: 29, achievement: [r('전설~영웅 카드 팩 IV', '/cardpack-legendary.webp', 10, { category: 'card', gold: 2000 }), supportBox(2)], premium: [supportBox(2)] },
  { level: 30, special: true,
               achievement: [r('영웅 젬 상자', '/gem-hero.webp', 1, { category: 'gem', priceKey: HERO_GEM_KEY })],
               premium: [r('영웅 젬 상자', '/gem-hero.webp', 1, { category: 'gem', priceKey: HERO_GEM_KEY })],
               superPremium: [avatarPart('하의', '82%')] },
];
