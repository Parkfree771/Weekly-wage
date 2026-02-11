import { calcTicketAverage } from '@/lib/hell-reward-calc';

// ─── 선택지 옵션 ───
export type ChoiceOption = {
  itemId: string;
  name: string;
  icon?: string;
};

// ─── 템플릿 아이템 타입 ───
export type TemplateItem = {
  id: string;
  icon: string;
  name: string;
  type: 'simple' | 'choice' | 'gold' | 'fixed' | 'crystal' | 'expected';
  itemId?: string;
  choices?: ChoiceOption[];
  fixedGold?: number;
  crystalPerUnit?: number;
  boxItem?: boolean;
  expectedItems?: { itemId: string; probability: number }[];
};

// ─── 추가된 아이템 상태 ───
export type AddedItem = {
  templateId: string;
  quantity: number;
  selectedChoiceId?: string;
  goldAmount?: number;
  innerQuantity?: number;
  isCustom?: boolean;
  customName?: string;
  customGoldPerUnit?: number;
};

// ─── 패키지에 넣을 수 있는 아이템 목록 ───
export const TEMPLATE_ITEMS: TemplateItem[] = [
  // ── 결정 ──
  {
    id: 'destruction-crystal',
    icon: '/top-destiny-destruction-stone5.webp',
    name: '운명의 파괴석 결정',
    type: 'simple',
    itemId: '66102007',
  },
  {
    id: 'guardian-crystal',
    icon: '/top-destiny-guardian-stone5.webp',
    name: '운명의 수호석 결정',
    type: 'simple',
    itemId: '66102107',
  },
  {
    id: 'crystal-choice',
    icon: '/vkrhltngh.webp',
    name: '파괴/수호 결정 선택',
    type: 'choice',
    boxItem: true,
    choices: [
      { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/top-destiny-destruction-stone5.webp' },
      { itemId: '66102107', name: '운명의 수호석 결정', icon: '/top-destiny-guardian-stone5.webp' },
    ],
  },
  // ── 돌파석 ──
  {
    id: 'great-breakthrough',
    icon: '/top-destiny-breakthrough-stone5.webp',
    name: '위대한 운명의 돌파석',
    type: 'simple',
    itemId: '66110226',
  },
  {
    id: 'breakthrough-stone',
    icon: '/destiny-breakthrough-stone5.webp',
    name: '운명의 돌파석',
    type: 'simple',
    itemId: '66110225',
  },
  // ── 숨결 ──
  {
    id: 'lava-breath',
    icon: '/breath-lava5.webp',
    name: '용암의 숨결',
    type: 'simple',
    itemId: '66111131',
  },
  {
    id: 'glacier-breath',
    icon: '/breath-glacier5.webp',
    name: '빙하의 숨결',
    type: 'simple',
    itemId: '66111132',
  },
  {
    id: 'breath-choice',
    icon: '/material-select-box.webp',
    name: '용숨/빙숨 선택 상자',
    type: 'choice',
    boxItem: true,
    choices: [
      { itemId: '66111131', name: '용암의 숨결', icon: '/breath-lava5.webp' },
      { itemId: '66111132', name: '빙하의 숨결', icon: '/breath-glacier5.webp' },
    ],
  },
  // ── 아비도스 ──
  {
    id: 'superior-abidos',
    icon: '/top-abidos-fusion5.webp',
    name: '상급 아비도스 융화 재료',
    type: 'simple',
    itemId: '6861013',
  },
  {
    id: 'abidos-fusion',
    icon: '/abidos-fusion5.webp?v=3',
    name: '아비도스 융화 재료',
    type: 'simple',
    itemId: '6861011',
  },
  // ── 파편 ──
  {
    id: 'destiny-shard',
    icon: '/destiny-shard-bag-large5.webp',
    name: '운명의 파편 주머니(대)',
    type: 'simple',
    itemId: '66130143',
  },
  // ── 젬 ──
  {
    id: 'gem-choice',
    icon: '/duddndgmlrnl.webp',
    name: '영웅/희귀 젬 상자',
    type: 'expected',
    expectedItems: [
      // 영웅 10% × 개별 확률
      { itemId: '67400003', probability: 0.03 },   // 안정 30%
      { itemId: '67400103', probability: 0.015 },  // 견고 15%
      { itemId: '67400203', probability: 0.005 },  // 불변 5%
      { itemId: '67410303', probability: 0.03 },   // 침식 30%
      { itemId: '67410403', probability: 0.015 },  // 왜곡 15%
      { itemId: '67410503', probability: 0.005 },  // 붕괴 5%
    ],
  },
  {
    id: 'gem-hero',
    icon: '/gem-hero.webp',
    name: '영웅 젬 상자',
    type: 'choice',
    choices: [
      { itemId: '67400003', name: '질서의 젬 : 안정', icon: '/gem-order-stable.webp?v=3' },
      { itemId: '67400103', name: '질서의 젬 : 견고', icon: '/gem-order-solid.webp?v=3' },
      { itemId: '67400203', name: '질서의 젬 : 불변', icon: '/gem-order-immutable.webp?v=3' },
      { itemId: '67410303', name: '혼돈의 젬 : 침식', icon: '/gem-chaos-erosion.webp?v=3' },
      { itemId: '67410403', name: '혼돈의 젬 : 왜곡', icon: '/gem-chaos-distortion.webp?v=3' },
      { itemId: '67410503', name: '혼돈의 젬 : 붕괴', icon: '/gem-chaos-collapse.webp?v=3' },
    ],
  },
  // ── 유각 ──
  {
    id: 'engraving-choice',
    icon: '/engraving.webp',
    name: '유각 선택 상자',
    type: 'choice',
    choices: [
      { itemId: '65200505', name: '원한' },
      { itemId: '65203905', name: '아드레날린' },
      { itemId: '65203305', name: '돌격대장' },
      { itemId: '65201005', name: '예리한 둔기' },
      { itemId: '65203505', name: '질량 증가' },
      { itemId: '65202805', name: '저주받은 인형' },
      { itemId: '65203005', name: '기습의 대가' },
      { itemId: '65203705', name: '타격의 대가' },
      { itemId: '65203405', name: '각성' },
      { itemId: '65204105', name: '전문의' },
      { itemId: '65200605', name: '슈퍼차지' },
      { itemId: '65201505', name: '결투의 대가' },
    ],
  },
  // ── 티켓 ──
  {
    id: 'celestial-ticket',
    icon: '/cjstkd.webp',
    name: '천상 도전권',
    type: 'fixed',
    fixedGold: 3000,
  },
  {
    id: 'naraka-legendary-ticket',
    icon: '/naraka-legendary-ticket.webp',
    name: '나락 전설 티켓',
    type: 'fixed',
    fixedGold: 80000,
  },
  {
    id: 'hell-legendary-ticket',
    icon: '/hell-legendary-ticket.webp',
    name: '지옥 전설 티켓',
    type: 'fixed',
    fixedGold: 80000,
  },
  {
    id: 'hell-heroic-ticket',
    icon: '/hell-heroic-ticket.webp',
    name: '지옥 영웅 티켓',
    type: 'fixed',
    fixedGold: 70000,
  },
  {
    id: 'cube-ticket',
    icon: '/cube-ticket.webp',
    name: '큐브 티켓',
    type: 'fixed',
    fixedGold: 8000,
  },
  {
    id: 'bracelet-reconversion',
    icon: '/vkfwlwoqusghksrnjs.webp',
    name: '팔찌 재변환권',
    type: 'fixed',
    fixedGold: 50,
  },
  {
    id: 'ninav-blessing',
    icon: '/slskqm.webp',
    name: '니나브의 축복',
    type: 'crystal',
    crystalPerUnit: 360, // 9900원 = 9900 RC, 9900/27.5 = 360 BC 환산
  },
  // ── 카드팩 ──
  {
    id: 'cardpack-legendary',
    icon: '/cardpack-legendary.webp',
    name: '카드팩 (전설~영웅)',
    type: 'fixed',
    fixedGold: 2000,
  },
  {
    id: 'cardpack-rare',
    icon: '/cardpack-rare.webp',
    name: '카드팩 (전설~희귀)',
    type: 'fixed',
    fixedGold: 400,
  },
  {
    id: 'cardpack-all',
    icon: '/cardpack-all.webp',
    name: '전체 카드팩',
    type: 'fixed',
    fixedGold: 50,
  },
  // ── 재화 ──
  {
    id: 'gold-input',
    icon: '/gold.webp',
    name: '골드',
    type: 'fixed',
    fixedGold: 1,
  },
  {
    id: 'blue-crystal-input',
    icon: '/blue.webp',
    name: '블루 크리스탈',
    type: 'crystal',
    crystalPerUnit: 1, // 1 블크 = 1 BC, 환율 자동 계산
  },
  {
    id: 'pheon',
    icon: '/pheon.webp',
    name: '페온',
    type: 'crystal',
    crystalPerUnit: 8.5, // 100개당 850 블크
  },
  {
    id: 'gem-reset-ticket',
    icon: '/gem-reset-ticket.webp',
    name: '젬 가공 초기화권',
    type: 'crystal',
    crystalPerUnit: 100, // 1장당 100 블크
  },
];

export const TEMPLATES_MAP: Record<string, TemplateItem> = Object.fromEntries(
  TEMPLATE_ITEMS.map((t) => [t.id, t]),
);

// 아이콘 크기 오버라이드 (catalog: 기본 90px, box: 기본 32px)
export const ICON_SIZE_CATALOG: Record<string, number> = {
  'gold-input': 60,
  'hell-heroic-ticket': 110,
  'pheon': 110,
  'gem-choice': 110, 'gem-hero': 110,
};
export const ICON_SIZE_BOX: Record<string, number> = {
  'gold-input': 24,
  'hell-heroic-ticket': 42,
  'pheon': 42,
  'gem-choice': 42, 'gem-hero': 42,
};

// 묶음 단위 (API 가격이 이 수량 기준)
export const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102007': 100,   // 운명의 파괴석 결정 (100개 단위)
  '66102107': 100,   // 운명의 수호석 결정 (100개 단위)
  '66130143': 3000,  // 운명의 파편 (3000개 단위)
};

// 기존 패키지 하위 호환: crystalPerUnit 없는 구 데이터용 폴백
export const CRYSTAL_PER_UNIT_FALLBACK: Record<string, number> = {
  'crystal_blue-crystal-input': 1,
  'crystal_pheon': 8.5,
  'crystal_gem-reset-ticket': 100,
  'crystal_ninav-blessing': 360,
};

// 동적 티켓 ID (fixed 뱃지 숨김용)
export const DYNAMIC_TICKET_IDS = new Set([
  'hell-legendary-ticket',
  'hell-heroic-ticket',
  'naraka-legendary-ticket',
]);

export function formatNumber(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 1) return n.toFixed(3);
  if (n % 1 !== 0 && Math.abs(n) < 100) return n.toFixed(2);
  return Math.round(n).toLocaleString('ko-KR');
}

export function getItemUnitPrice(itemId: string, prices: Record<string, number>): number {
  const raw = prices[itemId] || 0;
  const bundle = PRICE_BUNDLE_SIZE[itemId] || 1;
  return raw / bundle;
}

export function getUnitPrice(
  added: AddedItem,
  template: TemplateItem,
  prices: Record<string, number>,
  goldPerWon?: number,
  officialGoldRate?: number,
): number {
  switch (template.type) {
    case 'simple':
      return getItemUnitPrice(template.itemId!, prices);
    case 'choice':
      return added.selectedChoiceId ? getItemUnitPrice(added.selectedChoiceId, prices) : 0;
    case 'gold':
      return added.goldAmount || 0;
    case 'fixed': {
      const bcRate = officialGoldRate || 8500;
      if (template.id === 'hell-legendary-ticket')
        return calcTicketAverage('hell', 7, prices, bcRate);
      if (template.id === 'hell-heroic-ticket')
        return calcTicketAverage('hell', 6, prices, bcRate);
      if (template.id === 'naraka-legendary-ticket')
        return calcTicketAverage('narak', 2, prices, bcRate);
      return template.fixedGold || 0;
    }
    case 'crystal':
      return (template.crystalPerUnit || 0) * (goldPerWon || 0) * 27.5;
    case 'expected':
      return (template.expectedItems || []).reduce((sum, ei) => {
        return sum + getItemUnitPrice(ei.itemId, prices) * ei.probability;
      }, 0);
    default:
      return 0;
  }
}
