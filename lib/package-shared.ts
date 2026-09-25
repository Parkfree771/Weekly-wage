import { calcTicketUnitByItemId, DEFAULT_TICKET_TIERS, GEM_PEON, HERO_GEM_IDS, isTicketItemId, type TicketTiers } from '@/lib/hell-reward-calc';
import { TRACKED_ITEMS, type TrackedItem } from '@/lib/items-to-track';
import { isSaleEnded, toSaleDate } from '@/lib/package-sale';
import { RIFT_TIERS } from '@/data/rewardTable';
import type { PackageItem, PackagePost } from '@/types/package';

// ─── 그림이 바뀐 아이콘 ───
/**
 * 이미 등록된 글에 저장된 옛 아이콘 경로 → 새 그림 경로.
 *
 * 글을 저장할 때 아이템의 icon 문자열이 같이 박힌다. 그래서 템플릿 아이콘만 바꾸면
 * 새로 쓴 글만 새 그림이고 예전 글은 옛 그림 그대로다.
 * 그렇다고 같은 파일 이름에 덮어쓸 수도 없다 — public 의 이미지는 1년 immutable 캐시라
 * (next.config.js) 이미 다녀간 사람 브라우저엔 옛 그림이 그대로 남는다.
 * 그래서 새 이름으로 파일을 두고, 읽을 때 옛 경로를 여기서 새 경로로 바꿔 준다.
 */
const RENEWED_ICONS: Record<string, string> = {
  '/vkfwlwoqusghksrnjs.webp': '/bracelet-reconvert.webp', // 팔찌 재변환권
  '/slskqm.webp': '/ninav-blessing.webp',                 // 니나브의 축복
  '/vkrhltngh.webp': '/crystal-choice-pouch.webp',        // 파결·수결 선택/묶음
  '/vkrhltjrtnghtjr.webp': '/stone-choice-pouch.webp',    // 파괴석·수호석 선택 주머니 (반반 합성 → 겹친 그림)
  '/engraving.webp': '/engraving2.webp',                  // 유물 각인서
};

/**
 * 목록·비중 같은 "구성품 한 칸" 표시용 아이콘 — 선택형 젬은 고른 젬 그림이 아니라 상자 그림으로.
 * 옛 글은 젬 선택 상자 아이템에 고른 젬의 아이콘(gem-order-… / gem-chaos-…)이 저장돼 있다.
 * 어떤 젬을 골랐는지는 드롭다운·상세 카드가 보여 주므로, 칸에는 "젬 선택 상자"로 한결같이 보이게 한다.
 */
export function boxDisplayIcon(icon: string): string {
  if (/gem-(order|chaos)-/.test(icon)) return '/gem-hero.webp';
  return icon;
}

/** 옛 아이콘이면 새 그림 경로로, 아니면 그대로 */
export function renewIcon<T extends string | undefined>(icon: T): T {
  if (!icon) return icon;
  const [path, query] = icon.split('?');
  const next = RENEWED_ICONS[path];
  return (next ? (query ? `${next}?${query}` : next) : icon) as T;
}

/** 글 한 편의 아이템 아이콘을 전부 새 그림으로 (갤러리·상세가 읽기 직후에 한 번 돌린다) */
export function renewPostIcons<T extends PackagePost>(post: T): T {
  const item = (it: PackageItem): PackageItem => ({
    ...it,
    icon: renewIcon(it.icon),
    ...(it.choiceOptions ? { choiceOptions: it.choiceOptions.map((c) => ({ ...c, icon: renewIcon(c.icon) })) } : {}),
    ...(it.bundleItems ? { bundleItems: it.bundleItems.map((b) => ({ ...b, icon: renewIcon(b.icon) })) } : {}),
    ...(it.choiceBoxCandidates ? { choiceBoxCandidates: it.choiceBoxCandidates.map((c) => ({ ...c, icon: renewIcon(c.icon) })) } : {}),
    ...(it.probBoxCandidates ? {
      probBoxCandidates: it.probBoxCandidates.map((c) => ({
        ...c,
        icon: renewIcon(c.icon),
        ...(c.bundleItems ? { bundleItems: c.bundleItems.map((b) => ({ ...b, icon: renewIcon(b.icon) })) } : {}),
        ...(c.choiceOptions ? { choiceOptions: c.choiceOptions.map((o) => ({ ...o, icon: renewIcon(o.icon) })) } : {}),
      })),
    } : {}),
  });
  return {
    ...post,
    items: (post.items || []).map(item),
    ...(post.bonusItems ? { bonusItems: post.bonusItems.map(item) } : {}),
  };
}

// ─── 선택지 옵션 ───
export type ChoiceOption = {
  itemId: string;
  name: string;
  icon?: string;
};

// ─── 템플릿 아이템 타입 ───
export type BundleContent = {
  itemId: string;
  name: string;
  icon: string;
};

export type TemplateItem = {
  id: string;
  icon: string;
  name: string;
  type: 'simple' | 'choice' | 'gold' | 'fixed' | 'crystal' | 'expected' | 'bundle' | 'choiceBox' | 'probBox';
  itemId?: string;
  choiceDropdown?: boolean; // choice 선택지가 3개 이하라도 버튼 대신 드롭다운으로 렌더링
  choices?: ChoiceOption[];
  fixedGold?: number;
  crystalPerUnit?: number;
  boxItem?: boolean;
  expectedItems?: { itemId: string; probability: number }[];
  bundleContents?: BundleContent[];
  /** 등록 화면 검색어 별칭 — 이름에 없는 줄임말(파결·수결·용숨…)로도 찾히게 한다 */
  keywords?: string[];
};

// ─── 추가된 아이템 상태 ───
export type AddedItem = {
  id: string; // 인스턴스 고유 ID (같은 템플릿 중복 추가 지원)
  templateId: string;
  quantity: number;
  selectedChoiceId?: string;
  goldAmount?: number;
  innerQuantity?: number;
  isCustom?: boolean;
  customName?: string;
  customShortName?: string; // 갤러리 셀(62px)용 축약 이름. 비우면 갤러리가 customName 을 잘라서 쓴다
  customGoldPerUnit?: number;
  bundleQuantities?: Record<string, number>; // bundle 타입: 각 아이템별 수량
  choiceQuantities?: Record<string, number>; // choice 타입: 선택지별 개수 (예: 파괴석 1000 / 수호석 5000처럼 선택지마다 다를 때). 미설정 시 quantity 사용
  // 선택 상자 (사용자가 직접 담은 아이템 중 N개를 택하는 상자)
  isChoiceBox?: boolean;
  choiceBoxName?: string; // 등록자가 직접 정하는 상자 이름 (비우면 템플릿 기본 이름 사용)
  choiceBoxCandidates?: ChoiceBoxCandidate[];
  choiceBoxPickCount?: number;
  choiceBoxSelectedIds?: string[];
  // 확률 상자 (등록자가 아이템과 확률을 직접 담고, 시세 × 확률로 기댓값을 계산하는 상자)
  isProbBox?: boolean;
  probBoxName?: string; // 등록자가 직접 정하는 상자 이름 (비우면 템플릿 기본 이름 사용)
  probBoxCandidates?: ProbBoxCandidate[];
  // '3+보너스' 패키지 전용: 3개 구매 시 1회만 지급되는 보너스 구성품 여부
  isBonus?: boolean;
  // '핫딜샵' 전용: 이 칸(상품) 하나의 가격 — 글의 통화 단위(원 또는 블크)
  slotPrice?: number;
};

export type ChoiceBoxCandidate = {
  id: string; // 후보 인스턴스 고유 ID
  name: string;
  icon?: string;
  itemId?: string; // 시세 추적 아이템인 경우 (TRACKED_ITEMS id)
  goldPerUnit?: number; // 커스텀 아이템인 경우 개당 골드 (itemId 없을 때 사용)
  quantity: number;
};

export type ProbBoxCandidate = {
  id: string; // 후보 인스턴스 고유 ID
  name: string;
  icon?: string;
  itemId?: string; // 시세 추적 아이템(TRACKED_ITEMS id) / 'fixed_{템플릿id}' / choice 후보의 선택된 선택지 id
  goldPerUnit?: number; // fixed 후보의 정적 골드 폴백 / 커스텀 아이템 개당 골드 (itemId 없을 때 사용)
  quantity: number;
  probability: number; // 0~100 (%)
  // ── 시세·고정가 외 템플릿을 담을 때 쓰는 필드. PackageItem 과 같은 방식으로 비정규화 저장한다
  //    (템플릿이 나중에 바뀌거나 사라져도 등록된 글의 계산이 깨지지 않게) ──
  crystalPerUnit?: number; // crystal 후보: 개당 블루크리스탈 — 환율 바뀌면 같이 움직인다
  expectedItems?: { itemId: string; probability: number }[]; // expected 후보: 내부 확률표 (probability 는 0~1)
  bundleItems?: { itemId: string; name: string; icon?: string; quantity: number }[]; // bundle 후보: 주머니 내부 구성
  choiceOptions?: { itemId: string; name: string; icon?: string; quantity?: number }[]; // choice 후보: 선택지 목록
};

// ─── 페온 ───
// 페온 1개 = 블크 8.5개. 골드로는 8.5 × goldPerWon × 27.5 (100블크 = 2,750원).
// 귀속 젬·어빌리티스톤·팔찌처럼 "거래소에 올리려면 페온이 든다"는 항목은 이 값을 더한다.
// 페온 가치 제거(noPeon)는 뷰어 설정 — 페온을 0골드로 쳐서 젬의 페온 몫, 티켓 안의 페온 몫,
// 그리고 값 전체가 페온인 아이템(페온·어빌리티스톤 키트)을 한꺼번에 0으로 만든다.
export const PEON_CRYSTAL = 8.5;

/** 페온 1개의 골드. noPeon 이면 0 */
export function peonGoldPerUnit(goldPerWon: number | undefined, noPeon: boolean = false): number {
  if (noPeon || !goldPerWon || goldPerWon <= 0) return 0;
  return PEON_CRYSTAL * goldPerWon * 27.5;
}

/** 젬 ID → 거래소 등록 페온. 시세를 추적하는 젬은 영웅 6종뿐이라 12페온만 있다 (희귀 6·고급 3은 표에 없다) */
export const GEM_PEON_BY_ID: Record<string, number> = Object.fromEntries(
  HERO_GEM_IDS.map((id) => [id, GEM_PEON.hero]),
);

/** 값 전체가 페온인 블크 아이템 — 페온 가치 제거 시 0골드 */
export const PEON_CRYSTAL_ITEM_IDS = new Set(['crystal_pheon', 'crystal_ability-stone-kit']);

/** 블크 아이템 개당 골드. 페온·어빌리티스톤 키트는 페온 가치 제거 시 0 */
export function crystalUnitGold(
  itemId: string,
  crystalPerUnit: number | undefined,
  goldPerWon: number | undefined,
  noPeon: boolean = false,
): number {
  if (!crystalPerUnit || crystalPerUnit <= 0 || !goldPerWon || goldPerWon <= 0) return 0;
  if (noPeon && PEON_CRYSTAL_ITEM_IDS.has(itemId)) return 0;
  return crystalPerUnit * goldPerWon * 27.5;
}

/**
 * 확률 상자 후보 1개의 개당 골드.
 * 시세 아이템은 현재 시세, 'fixed_' 후보 중 티켓·유물코어·가공젬은 사이트 공통 동적 단가
 * (지옥 보상 기댓값 등, bcRate = 100블크당 골드), 그 외 fixed 는 goldPerUnit(등록 시점 고정가).
 * 블크·확률표·묶음·선택 후보는 각 타입 규칙대로 현재 시세로 매번 다시 계산한다.
 */
export function getProbBoxCandidateUnit(
  cand: ProbBoxCandidate,
  prices: Record<string, number>,
  bcRate: number = 0,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
  goldPerWon: number = 0,
  noPeon: boolean = false,
): number {
  // 블크 환율: 명시값 우선, 없으면 bcRate(100블크당 골드)에서 역산 (100 BC = 2750원)
  const gpw = goldPerWon > 0 ? goldPerWon : bcRate > 0 ? bcRate / 2750 : 0;
  const peonGold = peonGoldPerUnit(gpw, noPeon);

  // 블크 기반 (도약의 정수·페온·축복 등)
  if (cand.crystalPerUnit && cand.crystalPerUnit > 0) return crystalUnitGold(cand.itemId || '', cand.crystalPerUnit, gpw, noPeon);

  // 확률표 상자 (영웅 젬 랜덤 상자 등) — Σ(시세 × 확률)
  if (cand.expectedItems && cand.expectedItems.length > 0) {
    return cand.expectedItems.reduce(
      (sum, ei) => sum + getItemUnitPrice(ei.itemId, prices, peonGold) * ei.probability, 0);
  }

  // 묶음 주머니 — Σ(내부 아이템 시세 × 개수)
  if (cand.bundleItems && cand.bundleItems.length > 0) {
    return cand.bundleItems.reduce(
      (sum, bi) => sum + getItemUnitPrice(bi.itemId, prices, peonGold) * bi.quantity, 0);
  }

  // 선택 상자 — 등록자가 고른 선택지 기준 (선택지별 개수 반영).
  // 확률 상자는 "이 확률로 이게 나온다"를 적는 곳이라, 다른 곳처럼 최고가로 덮어쓰지 않고 지정한 선택지를 그대로 쓴다.
  if (cand.choiceOptions && cand.choiceOptions.length > 0) {
    const picked = cand.itemId || cand.choiceOptions[0].itemId;
    const qty = cand.choiceOptions.find((c) => c.itemId === picked)?.quantity ?? 1;
    const unit = cand.icon === FIXED_GEM_SELECT_ICON
      ? getFixedGemSelectUnitPrice(picked, prices, gpw, noPeon)
      : getItemUnitPrice(picked, prices, peonGold);
    return unit * qty;
  }

  if (!cand.itemId) return cand.goldPerUnit || 0;
  if (cand.itemId.startsWith('fixed_')) {
    const hasPrices = Object.keys(prices).length > 0;
    if (hasPrices && bcRate > 0) {
      const ticket = calcTicketUnitByItemId(cand.itemId, prices, bcRate, tiers, noPeon);
      if (ticket !== null) return ticket;
    }
    if (hasPrices) {
      if (cand.itemId === 'fixed_relic-core') return getRelicCoreSelectPrice(prices);
      if (PROCESSED_GEM_BOX_GEM[cand.itemId]) return getProcessedGemBoxUnitPrice(cand.itemId, prices, peonGold);
    }
    return cand.goldPerUnit || 0;
  }
  return getItemUnitPrice(cand.itemId, prices, peonGold);
}

/** 확률 상자 1개 기댓값 = Σ(개당 시세 × 수량 × 확률/100) — 폼·갤러리·상세 전부 여기로 계산 */
export function getProbBoxExpectedGold(
  candidates: ProbBoxCandidate[] | undefined,
  prices: Record<string, number>,
  bcRate: number = 0,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
  goldPerWon: number = 0,
  noPeon: boolean = false,
): number {
  if (!candidates || candidates.length === 0) return 0;
  return candidates.reduce((sum, c) => {
    return sum + getProbBoxCandidateUnit(c, prices, bcRate, tiers, goldPerWon, noPeon) * c.quantity * ((c.probability || 0) / 100);
  }, 0);
}

/** 선택 상자: 선택된 후보들의 가치 합산 (등록/수정 폼과 저장된 게시물 양쪽에서 재사용) */
export function getChoiceBoxGold(
  candidates: ChoiceBoxCandidate[] | undefined,
  selectedIds: string[] | undefined,
  prices: Record<string, number>,
  peonGold: number = 0,
): number {
  if (!candidates || !selectedIds || selectedIds.length === 0) return 0;
  return candidates
    .filter((c) => selectedIds.includes(c.id))
    .reduce((sum, c) => {
      const unit = c.itemId ? getItemUnitPrice(c.itemId, prices, peonGold) : (c.goldPerUnit || 0);
      return sum + unit * c.quantity;
    }, 0);
}

/** 선택 상자: 후보들 중 가치(단가×수량)가 가장 높은 N개의 id를 반환 (등록 시 기본 선택값) */
export function pickTopNCandidateIds(
  candidates: ChoiceBoxCandidate[],
  pickCount: number,
  prices: Record<string, number>,
  peonGold: number = 0,
): string[] {
  const withValue = candidates.map((c) => ({
    id: c.id,
    value: (c.itemId ? getItemUnitPrice(c.itemId, prices, peonGold) : (c.goldPerUnit || 0)) * c.quantity,
  }));
  withValue.sort((a, b) => b.value - a.value);
  return withValue.slice(0, Math.max(0, pickCount)).map((v) => v.id);
}

/** 선택 상자: 현재 시세 기준 가치 상위 N개 합 — 저장된 선택(등록 시점 시세)이 아닌 최신 시세로 항상 최고 조합 */
export function getChoiceBoxBestGold(
  candidates: ChoiceBoxCandidate[] | undefined,
  pickCount: number | undefined,
  prices: Record<string, number>,
  peonGold: number = 0,
): number {
  if (!candidates || candidates.length === 0) return 0;
  const n = Math.max(1, pickCount || 1);
  return getChoiceBoxGold(candidates, pickTopNCandidateIds(candidates, n, prices, peonGold), prices, peonGold);
}

/** 일반 choice 아이템: 선택지 중 현재 시세 최고가 (단가 × 선택지별 수량) — 상자 1개 기준.
    저장된 선택은 등록 시점 시세라 이후 시세가 뒤집히면 낮은 아이템으로 계산되는 문제 방지 */
export function getChoiceBestValue(
  choiceOptions: { itemId: string; quantity?: number }[],
  fallbackItemId: string,
  prices: Record<string, number>,
  peonGold: number = 0,
): number {
  let best = getItemUnitPrice(fallbackItemId, prices, peonGold)
    * (choiceOptions.find((c) => c.itemId === fallbackItemId)?.quantity ?? 1);
  for (const c of choiceOptions) {
    const v = getItemUnitPrice(c.itemId, prices, peonGold) * (c.quantity ?? 1);
    if (v > best) best = v;
  }
  return best;
}

// ─── 패키지에 넣을 수 있는 아이템 목록 ───
export const TEMPLATE_ITEMS: TemplateItem[] = [
  // ── 결정 ──
  {
    id: 'destruction-crystal',
    icon: '/destruction-stone-crystal.webp',
    name: '운명의 파괴석 결정',
    keywords: ['파결'],
    type: 'simple',
    itemId: '66102007',
  },
  {
    id: 'guardian-crystal',
    icon: '/guardian-stone-crystal.webp',
    name: '운명의 수호석 결정',
    keywords: ['수결'],
    type: 'simple',
    itemId: '66102107',
  },
  {
    // 파괴석 결정 OR 수호석 결정 중 하나만 선택하는 아이템.
    // 예전엔 type: 'bundle'로 잘못 구현되어 있어 둘 다 합산되는 버그가 있었음 → 'choice'로 수정.
    id: 'crystal-choice',
    icon: '/crystal-choice-pouch.webp',
    name: '파결·수결 선택',
    keywords: ['파괴석 결정', '수호석 결정', '결정 선택'],
    type: 'choice',
    choices: [
      { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/destruction-stone-crystal.webp' },
      { itemId: '66102107', name: '운명의 수호석 결정', icon: '/guardian-stone-crystal.webp' },
    ],
  },
  {
    id: 'crystal-bundle',
    icon: '/crystal-choice-pouch.webp',
    name: '파결·수결 묶음',
    keywords: ['파괴석 결정', '수호석 결정', '주머니', '결정 묶음'],
    type: 'bundle',
    bundleContents: [
      { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/destruction-stone-crystal.webp' },
      { itemId: '66102107', name: '운명의 수호석 결정', icon: '/guardian-stone-crystal.webp' },
    ],
  },
  {
    // 파괴석 OR 수호석 중 하나만 선택하는 주머니 (결정 아님, 일반 돌)
    id: 'stone-choice-pouch',
    // 파괴석·수호석 낱개 아이콘을 앞뒤로 겹쳐 합성한 그림 (반반 합성 이미지 vkrhltjrtnghtjr.webp 대체)
    icon: '/stone-choice-pouch.webp',
    name: '파괴석·수호석 선택',
    keywords: ['파석', '수석', '주머니'],
    type: 'choice',
    choices: [
      { itemId: '66102006', name: '운명의 파괴석', icon: '/destruction-stone.webp' },
      { itemId: '66102106', name: '운명의 수호석', icon: '/guardian-stone.webp' },
    ],
  },
  // ── 선택 상자 (직접 구성) ──
  {
    // 등록자가 시세 아이템 후보를 직접 담고, 보는 사람이 그중 N개를 골라보는 범용 상자
    id: 'custom-choice-box',
    icon: '/magic-reagent-select.webp',
    name: '선택 상자',
    type: 'choiceBox',
  },
  // ── 확률 상자 (직접 구성) ──
  {
    // 등록자가 시세 아이템과 확률(%)을 직접 담고, 시세 × 확률 기댓값으로 계산하는 상자
    id: 'custom-prob-box',
    icon: '/prob-box-art.webp',
    name: '확률 상자',
    type: 'probBox',
  },
  // ── 돌파석 ──
  {
    id: 'great-breakthrough',
    icon: '/breakthrough-stone-crystal.webp',
    name: '위대한 운명의 돌파석',
    type: 'simple',
    itemId: '66110226',
  },
  {
    id: 'breakthrough-stone',
    icon: '/breakthrough-stone.webp',
    name: '운명의 돌파석',
    type: 'simple',
    itemId: '66110225',
  },
  // ── 숨결 ──
  {
    id: 'lava-breath',
    icon: '/breath-lava5.webp',
    name: '용암의 숨결',
    keywords: ['용숨'],
    type: 'simple',
    itemId: '66111131',
  },
  {
    id: 'glacier-breath',
    icon: '/breath-glacier5.webp',
    name: '빙하의 숨결',
    keywords: ['빙숨'],
    type: 'simple',
    itemId: '66111132',
  },
  {
    id: 'breath-choice',
    icon: '/gong-support.webp',
    name: '용암·빙하 숨결 선택',
    keywords: ['용숨', '빙숨', '숨결 상자'],
    type: 'choice',
    boxItem: true,
    choices: [
      { itemId: '66111131', name: '용암의 숨결', icon: '/breath-lava5.webp' },
      { itemId: '66111132', name: '빙하의 숨결', icon: '/breath-glacier5.webp' },
    ],
  },
  // ── 파괴석 / 수호석 ──
  {
    id: 'destruction-stone',
    icon: '/destruction-stone.webp',
    name: '운명의 파괴석',
    keywords: ['파석'],
    type: 'simple',
    itemId: '66102006',
  },
  {
    id: 'guardian-stone',
    icon: '/guardian-stone.webp',
    name: '운명의 수호석',
    keywords: ['수석'],
    type: 'simple',
    itemId: '66102106',
  },
  // ── 아비도스 ──
  {
    id: 'superior-abidos',
    icon: '/top-abidos-fusion5.webp',
    name: '상비도스',
    keywords: ['상급 아비도스 융화 재료', '상비'],
    type: 'simple',
    itemId: '6861013',
  },
  {
    id: 'abidos-fusion',
    icon: '/abidos-fusion5.webp?v=4',
    name: '아비도스 융화 재료',
    keywords: ['아비'],
    type: 'simple',
    itemId: '6861012',
  },
  // ── 장인의 야금술/재봉술 ──
  {
    id: 'metallurgy-karma-19-20',
    icon: '/metallurgy-karma.webp',
    name: '야금술 : 업화 [19-20]',
    type: 'simple',
    itemId: '66112553',
  },
  {
    id: 'metallurgy-karma-19-20-enhanced',
    icon: '/metallurgy-karma.webp',
    name: '강화 야금술 : 업화 [19-20]',
    type: 'simple',
    itemId: '66112555',
  },
  {
    id: 'tailoring-karma-19-20',
    icon: '/tailoring-karma.webp',
    name: '재봉술 : 업화 [19-20]',
    type: 'simple',
    itemId: '66112554',
  },
  {
    id: 'tailoring-karma-19-20-enhanced',
    icon: '/tailoring-karma.webp',
    name: '강화 재봉술 : 업화 [19-20]',
    type: 'simple',
    itemId: '66112556',
  },
  // 전율 — 벨가르딘 업데이트 신규 보조 재료 (계승 후 전용). 업화와 달리 구간이 둘로 나뉜다
  {
    id: 'metallurgy-thrill-12-15',
    icon: '/metallurgy-thrill.webp',
    name: '야금술 : 전율 [12-15]',
    type: 'simple',
    itemId: '66112561',
  },
  {
    id: 'metallurgy-thrill-16-19',
    icon: '/metallurgy-thrill.webp',
    name: '야금술 : 전율 [16-19]',
    type: 'simple',
    itemId: '66112562',
  },
  {
    id: 'tailoring-thrill-12-15',
    icon: '/tailoring-thrill.webp',
    name: '재봉술 : 전율 [12-15]',
    type: 'simple',
    itemId: '66112564',
  },
  {
    id: 'tailoring-thrill-16-19',
    icon: '/tailoring-thrill.webp',
    name: '재봉술 : 전율 [16-19]',
    type: 'simple',
    itemId: '66112565',
  },
  {
    id: 'master-metallurgy-3',
    icon: '/master-metallurgy-3.webp',
    name: '장인의 야금술 : 3단계',
    type: 'simple',
    itemId: '66112715',
  },
  {
    id: 'master-metallurgy-4',
    icon: '/master-metallurgy-4.webp',
    name: '장인의 야금술 : 4단계',
    type: 'simple',
    itemId: '66112717',
  },
  {
    id: 'master-tailoring-3',
    icon: '/master-tailoring-3.webp',
    name: '장인의 재봉술 : 3단계',
    type: 'simple',
    itemId: '66112716',
  },
  {
    id: 'master-tailoring-4',
    icon: '/master-tailoring-4.webp',
    name: '장인의 재봉술 : 4단계',
    type: 'simple',
    itemId: '66112718',
  },
  // ── 파편 ──
  {
    id: 'destiny-shard',
    icon: '/fate-fragment.webp',
    name: '운명의 파편',
    type: 'simple',
    itemId: '66130143',
  },
  // ── 운명의 돌 / 어빌리티스톤 키트 ──
  {
    id: 'karma-stone',
    icon: '/dnsauddmlehf.webp',
    name: '운명의 돌',
    type: 'fixed',
    fixedGold: 900,
  },
  {
    id: 'ability-stone-kit',
    icon: '/djqlfflxltmxhs.webp',
    name: '어빌리티스톤 키트',
    type: 'crystal',
    crystalPerUnit: 76.5, // 9 페온 × 8.5 블크/페온
  },
  // ── 젬 ──
  {
    id: 'gem-choice',
    icon: '/duddndgmlrnl.webp',
    name: '영웅·희귀 젬 랜덤 상자',
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
    name: '영웅 젬 선택 상자',
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
  {
    id: 'gem-hero-random',
    icon: '/gem-hero.webp',
    name: '영웅 젬 랜덤 상자',
    type: 'expected',
    expectedItems: [
      { itemId: '67400003', probability: 0.30 },   // 안정 30%
      { itemId: '67400103', probability: 0.15 },   // 견고 15%
      { itemId: '67400203', probability: 0.05 },   // 불변 5%
      { itemId: '67410303', probability: 0.30 },   // 침식 30%
      { itemId: '67410403', probability: 0.15 },   // 왜곡 15%
      { itemId: '67410503', probability: 0.05 },   // 붕괴 5%
    ],
  },
  {
    id: 'gem-order-processed',
    icon: '/fixed-hero-gem-select.webp',
    name: '가공 완료 질서의 젬 상자',
    type: 'fixed',
    fixedGold: 8100,
  },
  {
    id: 'gem-chaos-processed',
    icon: '/fixed-hero-gem-select.webp',
    name: '가공 완료 혼돈의 젬 상자',
    type: 'fixed',
    fixedGold: 8100,
  },
  {
    id: 'gem-hero-fixed-select',
    icon: '/fixed-hero-gem-select.webp',
    name: '고정형 영웅 젬 선택 상자',
    type: 'choice',
    choices: [
      // 공격형: 추가 피해 / 공격력 / 보스 피해 중 2종 고정 (itemId에 :atk/:sup 접미사로 구분 — 안정 등 실제 시세 조회 시 접미사 제거)
      { itemId: '67400003:atk', name: '공격형 질서의 젬 : 안정 (추가 피해/공격력)', icon: '/gem-order-stable.webp?v=3' },
      { itemId: '67400103:atk', name: '공격형 질서의 젬 : 견고 (보스 피해/공격력)', icon: '/gem-order-solid.webp?v=3' },
      { itemId: '67400203:atk', name: '공격형 질서의 젬 : 불변 (보스 피해/추가 피해)', icon: '/gem-order-immutable.webp?v=3' },
      { itemId: '67410303:atk', name: '공격형 혼돈의 젬 : 침식 (공격력/추가 피해)', icon: '/gem-chaos-erosion.webp?v=3' },
      { itemId: '67410403:atk', name: '공격형 혼돈의 젬 : 왜곡 (보스 피해/공격력)', icon: '/gem-chaos-distortion.webp?v=3' },
      { itemId: '67410503:atk', name: '공격형 혼돈의 젬 : 붕괴 (보스 피해/추가 피해)', icon: '/gem-chaos-collapse.webp?v=3' },
      // 지원형: 아군 공격 강화 / 아군 피해 강화 / 낙인력 중 2종 고정
      { itemId: '67400003:sup', name: '지원형 질서의 젬 : 안정 (아군 피해 강화/낙인력)', icon: '/gem-order-stable.webp?v=3' },
      { itemId: '67400103:sup', name: '지원형 질서의 젬 : 견고 (아군 공격 강화/아군 피해 강화)', icon: '/gem-order-solid.webp?v=3' },
      { itemId: '67400203:sup', name: '지원형 질서의 젬 : 불변 (아군 공격 강화/낙인력)', icon: '/gem-order-immutable.webp?v=3' },
      { itemId: '67410303:sup', name: '지원형 혼돈의 젬 : 침식 (아군 피해 강화/낙인력)', icon: '/gem-chaos-erosion.webp?v=3' },
      { itemId: '67410403:sup', name: '지원형 혼돈의 젬 : 왜곡 (아군 공격 강화/아군 피해 강화)', icon: '/gem-chaos-distortion.webp?v=3' },
      { itemId: '67410503:sup', name: '지원형 혼돈의 젬 : 붕괴 (아군 공격 강화/낙인력)', icon: '/gem-chaos-collapse.webp?v=3' },
    ],
  },
  {
    id: 'gem-fear-8',
    icon: '/gem-radiance-8.png',
    name: '8레벨 광휘의 보석 (귀속)',
    type: 'simple',
    itemId: 'auction_gem_fear_8',
  },
  {
    id: 'gem-radiance-7',
    icon: '/gem-radiance-7.png',
    name: '7레벨 광휘의 보석 (귀속)',
    type: 'fixed',
    fixedGold: 20000,
  },
  // ── 유각 ──
  {
    id: 'engraving-choice',
    icon: '/engraving2.webp',
    name: '유각 선택 상자',
    keywords: ['각인서', '유물 각인'],
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
    fixedGold: 8000, // 폴백 전용 — 실제 가격은 영웅 지옥 티켓 평균가 ÷ 6 동적 계산 (getUnitPrice)
  },
  {
    id: 'bracelet-reconversion',
    icon: '/bracelet-reconvert.webp',
    name: '팔찌 재변환권',
    type: 'fixed',
    fixedGold: 50,
  },
  {
    id: 'ninav-blessing',
    icon: '/ninav-blessing.webp',
    name: '니나브의 축복 (15일)',
    type: 'crystal',
    crystalPerUnit: 180, // 4950원 = 9900/2, 4950/27.5 = 180 BC 환산
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
  // ── 축복 / 펫 ──
  {
    id: 'beatrice-blessing',
    icon: '/beatrice-blessing.webp',
    name: '베아트리스의 축복 (15일)',
    type: 'crystal',
    crystalPerUnit: 180, // 4950원 = 9900/2, 4950/27.5 = 180 BC 환산
  },
  {
    id: 'azena-blessing',
    icon: '/azena-blessing.png',
    name: '아제나의 축복 (28일)',
    type: 'crystal',
    crystalPerUnit: 280, // 7700원 / 27.5 = 280 BC 환산
  },
  {
    id: 'pet-function',
    icon: '/pet-function.webp',
    name: '펫 기능 (15일)',
    type: 'crystal',
    crystalPerUnit: 60, // 60 블루 크리스탈
  },
  {
    id: 'pet-support',
    icon: '/pet-support.webp',
    name: '펫 지원 효과 (15일)',
    type: 'crystal',
    crystalPerUnit: 60, // 60 블루 크리스탈
  },
  // ── 공명의 기운 / 휴게 물약 — 둘 다 "균열 1회 클리어 증가분"이라 가치가 같다 ──
  // 가상 itemId(rift-run-레벨)는 getItemUnitPrice 에서 RIFT_TIERS 수급량 × 시세로 환산.
  // 1730/1750/1770 레벨 선택, 기본 선택은 최고가(=1770)라 자연히 1770이 기본이 된다.
  {
    id: 'resonance-energy',
    icon: '/resonance-energy.webp',
    name: '공명의 기운',
    type: 'choice',
    choiceDropdown: true,
    choices: [
      { itemId: 'rift-run-1770', name: '공명의 기운 [1770]', icon: '/resonance-energy.webp' },
      { itemId: 'rift-run-1750', name: '공명의 기운 [1750]', icon: '/resonance-energy.webp' },
      { itemId: 'rift-run-1730', name: '공명의 기운 [1730]', icon: '/resonance-energy.webp' },
    ],
  },
  {
    id: 'rest-potion',
    icon: '/rest-potion.webp',
    name: '휴게 물약',
    type: 'choice',
    choiceDropdown: true,
    choices: [
      { itemId: 'rift-run-1770', name: '휴게 물약 [1770]', icon: '/rest-potion.webp' },
      { itemId: 'rift-run-1750', name: '휴게 물약 [1750]', icon: '/rest-potion.webp' },
      { itemId: 'rift-run-1730', name: '휴게 물약 [1730]', icon: '/rest-potion.webp' },
    ],
  },
  // ── 기타 ──
  {
    id: 'leap-essence',
    icon: '/leap-essence.webp',
    name: '도약의 정수',
    type: 'crystal',
    crystalPerUnit: 10, // 1개당 10 블루 크리스탈
  },
  {
    id: 'life-energy',
    icon: '/life-energy.webp',
    name: '중급 생명의 기운',
    type: 'crystal',
    crystalPerUnit: 23, // 23 블루 크리스탈
  },
  {
    id: 'legendary-cardpack',
    icon: '/legendary-cardpack.webp',
    name: '전설 카드팩',
    type: 'fixed',
    fixedGold: 8000,
  },
  {
    id: 'legendary-card-select',
    icon: '/legendary-cardpack.webp',
    name: '전설 카드 선택팩',
    type: 'fixed',
    fixedGold: 16000,
  },
  {
    id: 'battle-item-box',
    icon: '/battle-item-box.webp',
    name: '배틀 아이템 상자',
    type: 'fixed',
    fixedGold: 82, // 정령 회복약 기준
  },
  // ── 품질 ──
  {
    id: 'weapon-quality',
    icon: '/weapon-quality.webp',
    name: '무기 품질',
    type: 'fixed',
    fixedGold: 800,
  },
  {
    id: 'armor-quality',
    icon: '/armor-quality.webp',
    name: '방어구 품질',
    type: 'fixed',
    fixedGold: 300,
  },
  {
    id: 'quality-confirm',
    icon: '/quality-confirm.webp',
    name: '품질 확정권',
    type: 'fixed',
    fixedGold: 300000, // 30만골
  },
  {
    id: 'shilling',
    icon: '/shilling.webp',
    name: '실링',
    type: 'fixed',
    fixedGold: 0,
  },
  {
    id: 'relic-core',
    icon: '/cerka-core2.webp',
    name: '유물 코어 (선택)',
    type: 'fixed',
    fixedGold: 300000, // 30만골
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
    keywords: ['블크'],
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

/* ─── 등록 화면 아이템 목록 배치 ───
 * 위 TEMPLATE_ITEMS 는 "무엇을 계산할 수 있나"의 목록이고, 여기는 "등록 화면에 어떻게 보여 주나"다.
 * 예전엔 목록 순서 그대로 65칸을 한 줄로 늘어놓아 결정·선택·묶음·상자가 뒤섞여 보였다 —
 * 계열별로 칸을 나누고, 한 계열 안에서도 낱개 재료와 '선택/묶음' 변형을 따로 묶는다.
 *
 * · cat: 상단 필터 칩 단위 (같은 cat 이 여러 섹션에 걸칠 수 있다 — 재련 재료 낱개 / 선택·묶음)
 * · 여기에 안 적힌 템플릿은 자동으로 '기타' 섹션에 들어간다 — 새 템플릿을 추가하고 배치를 깜빡해도 목록에서 사라지지 않는다.
 * · 선택 상자·확률 상자(직접 구성)는 섹션이 아니라 등록 화면이 별도 줄로 그린다.
 */
export type CatalogCategory = 'refine' | 'craft' | 'gem' | 'ticket' | 'card' | 'buff' | 'quality' | 'currency' | 'etc';

export type CatalogSection = {
  cat: CatalogCategory;
  title: string;
  hint?: string;
  ids: string[];
};

export const CATALOG_CATEGORY_LABEL: Record<CatalogCategory, string> = {
  refine: '재련 재료',
  craft: '야금술·재봉술',
  gem: '젬·유각',
  ticket: '티켓·입장권',
  card: '카드',
  buff: '축복·펫·편의',
  quality: '품질·장비',
  currency: '재화',
  etc: '기타',
};

/** 직접 구성하는 상자 — 섹션 그리드가 아니라 별도 줄에 그린다 */
export const CATALOG_CUSTOM_BOX_IDS = ['custom-choice-box', 'custom-prob-box'];

const CATALOG_SECTIONS_BASE: CatalogSection[] = [
  {
    cat: 'refine', title: '재련 재료',
    ids: [
      'destruction-stone', 'guardian-stone', 'destruction-crystal', 'guardian-crystal',
      'breakthrough-stone', 'great-breakthrough', 'lava-breath', 'glacier-breath',
      'abidos-fusion', 'superior-abidos', 'destiny-shard', 'karma-stone',
    ],
  },
  {
    cat: 'refine', title: '재련 재료 — 선택 · 묶음', hint: '둘 중 하나를 고르거나, 둘을 함께 주는 주머니',
    ids: ['stone-choice-pouch', 'crystal-choice', 'crystal-bundle', 'breath-choice'],
  },
  {
    cat: 'craft', title: '야금술 · 재봉술',
    ids: [
      'metallurgy-karma-19-20', 'metallurgy-karma-19-20-enhanced', 'metallurgy-thrill-12-15', 'metallurgy-thrill-16-19', 'master-metallurgy-3', 'master-metallurgy-4',
      'tailoring-karma-19-20', 'tailoring-karma-19-20-enhanced', 'tailoring-thrill-12-15', 'tailoring-thrill-16-19', 'master-tailoring-3', 'master-tailoring-4',
    ],
  },
  {
    cat: 'gem', title: '젬 · 유각 · 어빌리티 스톤',
    ids: [
      'gem-hero', 'gem-hero-random', 'gem-choice', 'gem-hero-fixed-select', 'gem-order-processed', 'gem-chaos-processed',
      'gem-fear-8', 'gem-radiance-7', 'gem-reset-ticket', 'engraving-choice', 'ability-stone-kit',
    ],
  },
  {
    cat: 'ticket', title: '티켓 · 입장권',
    ids: ['celestial-ticket', 'naraka-legendary-ticket', 'hell-legendary-ticket', 'hell-heroic-ticket', 'cube-ticket', 'resonance-energy', 'rest-potion'],
  },
  {
    cat: 'card', title: '카드',
    ids: ['cardpack-legendary', 'cardpack-rare', 'cardpack-all', 'legendary-cardpack', 'legendary-card-select'],
  },
  {
    cat: 'buff', title: '축복 · 펫 · 편의',
    ids: ['ninav-blessing', 'beatrice-blessing', 'azena-blessing', 'pet-function', 'pet-support', 'leap-essence', 'life-energy', 'battle-item-box', 'bracelet-reconversion'],
  },
  {
    cat: 'quality', title: '품질 · 장비',
    ids: ['weapon-quality', 'armor-quality', 'quality-confirm', 'relic-core'],
  },
  {
    cat: 'currency', title: '재화',
    ids: ['gold-input', 'blue-crystal-input', 'pheon', 'shilling'],
  },
];

/**
 * 등록 화면 목록 칸에 이름을 두 줄로 나눠 그리는 표 ("\n" 이 줄 경계).
 * 원칙: 첫 줄 = 계열(야금술 · 영웅 젬 · 니나브의 축복), 둘째 줄 = 그 안의 구분(업화 [19-20] · 선택 상자 · (15일)).
 * 같은 계열 칸들이 같은 자리에 같은 것을 두게 해서 훑어 읽기 쉽게 한다. 한 줄은 8자 이하 —
 * 모바일(칸 90px, 0.7rem)에서도 한 줄이 다시 갈라지지 않는 길이다.
 * 여기 없는 템플릿은 이름을 그대로 한 줄로 그린다 (짧은 이름은 나눌 필요가 없다).
 * 저장되는 name 과는 무관 — 갤러리 · 상세는 이 표를 보지 않는다.
 */
export const CATALOG_DISPLAY_NAME: Record<string, string> = {
  // 재련 재료
  'destruction-crystal': '운명의 파괴석\n결정',
  'guardian-crystal': '운명의 수호석\n결정',
  'great-breakthrough': '위대한\n운명의 돌파석',
  'abidos-fusion': '아비도스\n융화 재료',
  'stone-choice-pouch': '파괴석·수호석\n선택',
  'crystal-choice': '파결·수결\n선택',
  'crystal-bundle': '파결·수결\n묶음',
  'breath-choice': '용암·빙하 숨결\n선택',
  // 야금술 · 재봉술 — 첫 줄 기술, 둘째 줄 종류와 구간
  'metallurgy-karma-19-20': '야금술\n업화 [19-20]',
  'metallurgy-karma-19-20-enhanced': '강화 야금술\n업화 [19-20]',
  'metallurgy-thrill-12-15': '야금술\n전율 [12-15]',
  'metallurgy-thrill-16-19': '야금술\n전율 [16-19]',
  'master-metallurgy-3': '장인의 야금술\n3단계',
  'master-metallurgy-4': '장인의 야금술\n4단계',
  'tailoring-karma-19-20': '재봉술\n업화 [19-20]',
  'tailoring-karma-19-20-enhanced': '강화 재봉술\n업화 [19-20]',
  'tailoring-thrill-12-15': '재봉술\n전율 [12-15]',
  'tailoring-thrill-16-19': '재봉술\n전율 [16-19]',
  'master-tailoring-3': '장인의 재봉술\n3단계',
  'master-tailoring-4': '장인의 재봉술\n4단계',
  // 젬 · 유각
  'gem-hero': '영웅 젬\n선택 상자',
  'gem-hero-random': '영웅 젬\n랜덤 상자',
  'gem-choice': '영웅·희귀 젬\n랜덤 상자',
  'gem-hero-fixed-select': '고정형 영웅 젬\n선택 상자',
  'gem-order-processed': '가공 완료\n질서의 젬 상자',
  'gem-chaos-processed': '가공 완료\n혼돈의 젬 상자',
  'gem-fear-8': '8레벨 광휘의 보석\n(귀속)',
  'gem-radiance-7': '7레벨 광휘의 보석\n(귀속)',
  'gem-reset-ticket': '젬 가공\n초기화권',
  'ability-stone-kit': '어빌리티스톤\n키트',
  // 카드
  'cardpack-legendary': '카드팩\n(전설~영웅)',
  'cardpack-rare': '카드팩\n(전설~희귀)',
  // 축복 · 펫
  'ninav-blessing': '니나브의 축복\n(15일)',
  'beatrice-blessing': '베아트리스의 축복\n(15일)',
  'azena-blessing': '아제나의 축복\n(28일)',
  'pet-function': '펫 기능\n(15일)',
  'pet-support': '펫 지원 효과\n(15일)',
  // 품질 · 장비
  'relic-core': '유물 코어\n(선택)',
};

export const CATALOG_SECTIONS: CatalogSection[] = (() => {
  const placed = new Set<string>([...CATALOG_CUSTOM_BOX_IDS, ...CATALOG_SECTIONS_BASE.flatMap((s) => s.ids)]);
  // 실제 존재하는 템플릿만 남긴다 (오타·삭제된 id 가 빈 칸으로 그려지지 않게)
  const sections = CATALOG_SECTIONS_BASE
    .map((s) => ({ ...s, ids: s.ids.filter((id) => TEMPLATES_MAP[id]) }))
    .filter((s) => s.ids.length > 0);
  const leftovers = TEMPLATE_ITEMS.filter((t) => !placed.has(t.id)).map((t) => t.id);
  if (leftovers.length > 0) sections.push({ cat: 'etc', title: '기타', ids: leftovers });
  return sections;
})();

/**
 * 저장된 expected_ 아이템(영웅 젬 랜덤 상자 등)의 개당 기댓값을 현재 시세로 재계산.
 * 등록 시 goldOverride 에 박제된 등록 시점 기댓값 대신 항상 이 값을 먼저 쓴다 —
 * 템플릿이 사라졌거나 시세가 아직 안 왔으면 null 을 돌려주고 호출부가 goldOverride 로 폴백한다.
 */
export function getExpectedBoxUnitPrice(itemId: string, prices: Record<string, number>, peonGold: number = 0): number | null {
  if (!itemId.startsWith('expected_')) return null;
  if (Object.keys(prices).length === 0) return null;
  const expectedItems = TEMPLATES_MAP[itemId.slice('expected_'.length)]?.expectedItems;
  if (!expectedItems || expectedItems.length === 0) return null;
  return expectedItems.reduce((sum, ei) => sum + getItemUnitPrice(ei.itemId, prices, peonGold) * ei.probability, 0);
}

export type ExpectedBoxRow = {
  itemId: string;
  name: string;
  icon?: string;
  /** % 단위 (30, 1.5 등) */
  probabilityPct: number;
  /** 개당 현재 시세 */
  unit: number;
};

// 이름·아이콘 조회용 — findItemById 는 호출마다 목록을 선형 탐색해서, 렌더마다 도는 내역 계산에는 Map 으로 한 번만 만든다
const TRACKED_ITEMS_MAP: Map<string, TrackedItem> = new Map(TRACKED_ITEMS.map((t) => [t.id, t]));

/**
 * expected_ 상자의 내용물 내역 — 어떤 아이템이 몇 %로 나오고 지금 시세가 얼마인지.
 * 상세 페이지 카드에 확률 상자(probBox)처럼 펼쳐 보여줄 때 쓴다.
 * 이름·아이콘은 시세 추적 목록(TRACKED_ITEMS)에서 찾는다 — 없으면 내역을 만들지 않는다.
 */
export function getExpectedBoxBreakdown(itemId: string, prices: Record<string, number>, peonGold: number = 0): ExpectedBoxRow[] | null {
  if (!itemId.startsWith('expected_')) return null;
  const expectedItems = TEMPLATES_MAP[itemId.slice('expected_'.length)]?.expectedItems;
  if (!expectedItems || expectedItems.length === 0) return null;
  return expectedItems.map((ei) => {
    const tracked = TRACKED_ITEMS_MAP.get(ei.itemId);
    return {
      itemId: ei.itemId,
      name: tracked?.name || ei.itemId,
      icon: tracked?.icon,
      // 0.015 × 100 = 1.5000000000000002 같은 부동소수 찌꺼기 제거
      probabilityPct: parseFloat((ei.probability * 100).toFixed(2)),
      unit: getItemUnitPrice(ei.itemId, prices, peonGold),
    };
  });
}

/* ─── 구성품 표시 순서 ───
 * 등록자가 담은 순서와 상관없이 어느 글이든 같은 배열로 보여 준다.
 * 순서 기준은 새 표를 만들지 않고 등록 화면 배치(CATALOG_SECTIONS)를 그대로 쓴다 —
 * 그 배치가 재련 재료 · 야금/재봉 · 젬 · 티켓 · 카드 · 재화처럼 계열별로 묶여 있어서,
 * 따라가기만 하면 비슷한 것끼리 모이고 어느 카드를 봐도 같은 자리에 같은 계열이 온다.
 * (등록 화면에서 보는 순서와 갤러리 카드의 순서가 같아 등록자가 결과를 예측할 수 있다.)
 *
 * 저장된 데이터는 건드리지 않는다 — 그리는 순서만 바꾸므로 이미 올라온 글도 즉시 정돈되고,
 * 수정 화면에서는 등록자가 담은 순서가 그대로 남는다.
 */
const CATALOG_ORDER: TemplateItem[] = [
  ...CATALOG_SECTIONS.flatMap((s) => s.ids.map((id) => TEMPLATES_MAP[id])),
  ...CATALOG_CUSTOM_BOX_IDS.map((id) => TEMPLATES_MAP[id]),
].filter(Boolean);
const TEMPLATE_RANK = new Map<string, number>();   // 템플릿 id → 카탈로그 순번
const MARKET_ID_RANK = new Map<string, number>();  // 시세 itemId → 카탈로그 순번
CATALOG_ORDER.forEach((t, i) => {
  if (!TEMPLATE_RANK.has(t.id)) TEMPLATE_RANK.set(t.id, i);
  // simple 은 시세 itemId 를 그대로, choice 는 고른 선택지의 itemId 를 그대로 쓴다 —
  // 접두사가 없으므로 원래 어느 템플릿에서 나왔는지 되짚을 표가 필요하다
  if (t.itemId && !MARKET_ID_RANK.has(t.itemId)) MARKET_ID_RANK.set(t.itemId, i);
  t.choices?.forEach((c) => {
    const base = c.itemId.split(':')[0]; // 고정형 젬의 :atk/:sup 접미사 제거
    if (!MARKET_ID_RANK.has(base)) MARKET_ID_RANK.set(base, i);
  });
});

// 접두사가 붙는 형식들(gold_·fixed_ 등)은 뒤쪽이 템플릿 id 다.
// choicebox_·probbox_ 는 뒤가 런타임 id 라 해당 템플릿으로 직접 이어 준다.
const PREFIX_TEMPLATE: Record<string, string> = {
  'choicebox_': 'custom-choice-box',
  'probbox_': 'custom-prob-box',
};
const TEMPLATE_ID_PREFIXES = ['gold_', 'fixed_', 'crystal_', 'expected_', 'bundle_'];

function itemCategoryRank(itemId: string): number {
  const unknown = TEMPLATE_ITEMS.length;
  if (!itemId) return unknown;
  // 기타(직접 입력)는 계열이 없으므로 항상 맨 뒤
  if (itemId.startsWith('custom_')) return unknown + 1;
  for (const [prefix, templateId] of Object.entries(PREFIX_TEMPLATE)) {
    if (itemId.startsWith(prefix)) return TEMPLATE_RANK.get(templateId) ?? unknown;
  }
  for (const prefix of TEMPLATE_ID_PREFIXES) {
    if (itemId.startsWith(prefix)) {
      return TEMPLATE_RANK.get(itemId.slice(prefix.length)) ?? unknown;
    }
  }
  return MARKET_ID_RANK.get(itemId.split(':')[0]) ?? unknown;
}

/**
 * 구성품을 계열끼리 묶어 그릴 순서(원본 인덱스 배열)를 낸다.
 * 인덱스를 돌려주는 이유: 체크 상태·소계 같은 것들이 전부 원본 인덱스로 매여 있어서,
 * 배열 자체를 재정렬하면 그 연결이 어긋난다. 같은 계열 안에서는 등록 순서를 유지한다.
 */
export function getDisplayOrder(items: { itemId: string }[]): number[] {
  return items
    .map((_, i) => i)
    .sort((a, b) => {
      const ra = itemCategoryRank(items[a].itemId);
      const rb = itemCategoryRank(items[b].itemId);
      return ra !== rb ? ra - rb : a - b;
    });
}

// 아이콘 크기 오버라이드 (catalog: 기본 90px, box: 기본 32px)
// 갤러리 카드와 같은 원칙 — 원본 그림의 여백이 제각각이라 같은 px 로 그리면 크기가 달라 보인다.
// 여백이 많은 쪽(선택·랜덤 젬 상자 256x244)을 꽉 찬 쪽(고정형 64x64)보다 크게 잡아 맞춘다.
export const ICON_SIZE_CATALOG: Record<string, number> = {
  'gold-input': 74, // 바로 아래 실링(65)보다 작아서 눈에 띄게 작아 보였다
  'hell-heroic-ticket': 110,
  'celestial-ticket': 110, 'naraka-legendary-ticket': 110,
  'hell-legendary-ticket': 110, 'cube-ticket': 110, 'gem-reset-ticket': 110,
  'pheon': 110,
  'gem-choice': 118, 'gem-hero': 122, 'gem-hero-random': 122,
  // 고정형 계열은 원본이 64x64 로 프레임을 꽉 채워, 같은 값이면 제일 커 보인다 — 한 단계 내린다
  'gem-order-processed': 100, 'gem-chaos-processed': 100, 'gem-hero-fixed-select': 100,
  'weapon-quality': 110, 'armor-quality': 110, 'karma-stone': 110,
  'shilling': 65, 'blue-crystal-input': 65,
  'master-tailoring-3': 65, 'master-tailoring-4': 65,
  'master-metallurgy-3': 65, 'master-metallurgy-4': 65,
  'metallurgy-karma-19-20': 65, 'metallurgy-karma-19-20-enhanced': 65,
  'tailoring-karma-19-20': 65, 'tailoring-karma-19-20-enhanced': 65,
  'metallurgy-thrill-12-15': 65, 'metallurgy-thrill-16-19': 65,
  'tailoring-thrill-12-15': 65, 'tailoring-thrill-16-19': 65,
  'bracelet-reconversion': 65,
  'relic-core': 65,
  'cardpack-legendary': 65, 'cardpack-rare': 65, 'cardpack-all': 65,
  'ninav-blessing': 65, 'engraving-choice': 65,
  'destruction-stone': 65, 'guardian-stone': 65,
  'destruction-crystal': 65, 'guardian-crystal': 65, 'crystal-choice': 65, 'crystal-bundle': 65,
  'stone-choice-pouch': 80, // 두 돌을 겹친 그림이라 낱개(65)와 같은 값이면 돌 하나가 작아 보인다
  'great-breakthrough': 65, 'breakthrough-stone': 65,
  'lava-breath': 65, 'glacier-breath': 65, 'breath-choice': 65,
  'superior-abidos': 65, 'abidos-fusion': 65,
  'gem-fear-8': 65, 'gem-radiance-7': 65, 'azena-blessing': 65,
  'resonance-energy': 65, 'rest-potion': 65,
};
export const ICON_SIZE_BOX: Record<string, number> = {};

// 아이콘 위치 오버라이드 (object-position)
export const ICON_POSITION: Record<string, string> = {};

// 아이콘 위치 미세 조정 (transform)
export const ICON_SCALE: Record<string, string> = {
  'weapon-quality': 'translateY(-7px) scale(0.93)',
};

// 묶음 단위 (API 가격이 이 수량 기준) — 원본은 data/priceItems.ts.
// 시세 화면들도 같은 표를 써야 해서 데이터 쪽으로 옮기고 여기선 재수출만 한다.
import { PRICE_BUNDLE_SIZE } from '@/data/priceItems';
export { PRICE_BUNDLE_SIZE };

// 기존 패키지 하위 호환: crystalPerUnit 없는 구 데이터용 폴백
export const CRYSTAL_PER_UNIT_FALLBACK: Record<string, number> = {
  'crystal_blue-crystal-input': 1,
  'crystal_pheon': 8.5,
  'crystal_gem-reset-ticket': 100,
  'crystal_ninav-blessing': 180,
  'crystal_beatrice-blessing': 180,
  'crystal_pet-function': 60,
  'crystal_pet-support': 60,
  'crystal_leap-essence': 10,
  'crystal_life-energy': 23,
};

// 동적 티켓 ID (fixed 뱃지 숨김용)
export const DYNAMIC_TICKET_IDS = new Set([
  'hell-legendary-ticket',
  'hell-heroic-ticket',
  'naraka-legendary-ticket',
  'cube-ticket',
  'relic-core',
  'gem-order-processed',
  'gem-chaos-processed',
]);

export function formatNumber(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 1) return n.toFixed(3);
  if (n % 1 !== 0 && Math.abs(n) < 100) return n.toFixed(2);
  return Math.round(n).toLocaleString('ko-KR');
}

// ── 공명의 기운 / 휴게 물약: "균열 1회 클리어 증가분" 가치 ──
// rewardTable의 RIFT_TIERS(1회·휴게 미적용 실측 수급량) × 거래소 시세로 환산한다.
// 두 아이템은 같은 가상 itemId(rift-run-레벨)를 공유하므로 가격도 항상 동일하다.
export const RIFT_RUN_ITEM_PREFIX = 'rift-run-';
const RIFT_MATERIAL_ITEM_ID: Record<string, string> = {
  '파괴석 결정': '66102007',
  '수호석 결정': '66102107',
  '위대한 돌파석': '66110226',
  '운명의 파편': '66130143',
  // 실링: 시세 없음 → 0골드 환산 (제외)
};

export function isRiftRunId(itemId: string): boolean {
  return itemId.startsWith(RIFT_RUN_ITEM_PREFIX);
}

/** 'rift-run-1770' → 1770 */
export function getRiftRunLevel(itemId: string): number {
  return parseInt(itemId.slice(RIFT_RUN_ITEM_PREFIX.length), 10);
}

export type RiftRunBreakdown = {
  materials: { label: string; amount: number; unitPrice: number; subtotal: number }[];
  total: number;
};

/** 균열 1회 클리어 보상 기댓값의 재료별 분해 (상세 페이지 계산 근거 표시용) */
export function getRiftRunBreakdown(level: number, prices: Record<string, number>): RiftRunBreakdown {
  const tier = RIFT_TIERS.find((t) => t.minLevel === level);
  const materials = (tier?.materials || [])
    .filter((m) => RIFT_MATERIAL_ITEM_ID[m.label])
    .map((m) => {
      const unitPrice = getItemUnitPrice(RIFT_MATERIAL_ITEM_ID[m.label], prices);
      return { label: m.label, amount: m.amount, unitPrice, subtotal: unitPrice * m.amount };
    });
  return { materials, total: materials.reduce((s, m) => s + m.subtotal, 0) };
}

/** 균열 1회 클리어 가치 = Σ(수급량 × 개당 시세) */
export function getRiftRunGold(level: number, prices: Record<string, number>): number {
  return getRiftRunBreakdown(level, prices).total;
}

/**
 * 시세 아이템 개당 골드.
 * peonGold(페온 1개의 골드)를 넘기면 귀속 젬에는 거래소 등록 페온(영웅 12개)이 더해진다 —
 * 젬을 값으로 치는 곳은 전부 여기를 지나므로 젬 페온은 이 한 곳에서만 붙인다.
 */
export function getItemUnitPrice(itemId: string, prices: Record<string, number>, peonGold: number = 0): number {
  if (itemId.startsWith(RIFT_RUN_ITEM_PREFIX)) {
    return getRiftRunGold(parseInt(itemId.slice(RIFT_RUN_ITEM_PREFIX.length), 10), prices);
  }
  const raw = prices[itemId] || 0;
  const bundle = PRICE_BUNDLE_SIZE[itemId] || 1;
  const gemPeon = peonGold > 0 && raw > 0 ? (GEM_PEON_BY_ID[itemId] || 0) * peonGold : 0;
  return raw / bundle + gemPeon;
}

// 고정형 영웅 젬 선택 상자: 아이콘으로 template 식별 (choiceOptions만 저장되고 templateId는 저장 안 되므로)
export const FIXED_GEM_SELECT_ICON = '/fixed-hero-gem-select.webp';

// 젬 가공은 4개 스탯 중 2개가 중복 없이 붙음 → 원하는 2종 조합(딜러/서폿 유효옵션)이 뜰 확률 = 1/6.
// 고정형 상자는 그 조합을 확정으로 주므로 확률을 뒤집어(×6) 곱해 프리미엄을 반영.
// 초기화는 옵션이 고정된 초기 상태로 되돌리므로, 추가 초기화 1회 = 확정 조합 가치(×6) 한 번 더 − 초기화권(100크리스탈) 비용.
export const FIXED_GEM_COMBO_MULTIPLIER = 6; // 1 ÷ (1/6)
export const GEM_RESET_TICKET_CRYSTAL = 100; // 젬 가공 초기화권 1장 = 100 크리스탈

/** 고정형 젬 공식의 각 항 분해 (상세 페이지 공식 표시용).
    페온은 프리미엄(×6)에 곱하지 않고 마지막에 젬 1개분(12페온)만 한 번 더한다 — 결국 손에 남는 젬은 1개다 */
export function getFixedGemSelectBreakdown(
  choiceItemId: string,
  prices: Record<string, number>,
  goldPerWon?: number,
  noPeon: boolean = false,
): { base: number; multiplier: number; comboValue: number; ticketGold: number; peonGold: number; total: number } {
  const gemItemId = choiceItemId.split(':')[0]; // '67400003:atk' → '67400003'
  const base = getItemUnitPrice(gemItemId, prices);
  const comboValue = base * FIXED_GEM_COMBO_MULTIPLIER;
  const ticketGold = (goldPerWon || 0) * GEM_RESET_TICKET_CRYSTAL * 27.5;
  const peonGold = base > 0 ? (GEM_PEON_BY_ID[gemItemId] || 0) * peonGoldPerUnit(goldPerWon, noPeon) : 0;
  return {
    base,
    multiplier: FIXED_GEM_COMBO_MULTIPLIER,
    comboValue,
    ticketGold,
    peonGold,
    total: comboValue + comboValue - ticketGold + peonGold,
  };
}

/** 고정형 영웅 젬 선택 상자의 선택지 1개 가치 = 젬 시세 × 6 (확률 역수) + 젬 시세 × 6 (추가 초기화 1회) − 초기화권 골드 + 젬 페온(1개분) */
export function getFixedGemSelectUnitPrice(
  choiceItemId: string,
  prices: Record<string, number>,
  goldPerWon?: number,
  noPeon: boolean = false,
): number {
  return getFixedGemSelectBreakdown(choiceItemId, prices, goldPerWon, noPeon).total;
}

/** 고정형 젬 상자: 선택지 중 현재 시세 최고가 — 뷰어 선택이 없는 곳(갤러리 소계·효율 정렬)에서 시세 변동 따라 항상 최고가로 계산 */
export function getFixedGemSelectBestUnitPrice(
  choiceOptions: { itemId: string }[] | undefined,
  fallbackItemId: string,
  prices: Record<string, number>,
  goldPerWon?: number,
  noPeon: boolean = false,
): number {
  let best = getFixedGemSelectUnitPrice(fallbackItemId, prices, goldPerWon, noPeon);
  for (const c of choiceOptions || []) {
    const v = getFixedGemSelectUnitPrice(c.itemId, prices, goldPerWon, noPeon);
    if (v > best) best = v;
  }
  return best;
}

// 가공 완료 젬 상자: 등록 시 저장된 goldOverride 대신 항상 최신 시세(latest_prices)로 재계산
export const PROCESSED_GEM_BOX_GEM: Record<string, string> = {
  'fixed_gem-order-processed': '67400003', // 질서의 젬 : 안정
  'fixed_gem-chaos-processed': '67410303', // 혼돈의 젬 : 침식
};
export const PROCESSED_GEM_BOX_EXTRA_GOLD = 8100; // 가공 완료에 소모되는 골드

// 가공 완료 젬 상자 구성 정보 (상세 페이지 공식/옵션 표시용, 인게임 툴팁 기준)
export const PROCESSED_GEM_BOX_INFO: Record<string, { gemShort: string; gemName: string; options: string }> = {
  'fixed_gem-order-processed': {
    gemShort: '안정',
    gemName: '질서의 젬 : 안정',
    options: '의지력 효율 Lv.5 · 질서 포인트 Lv.4 · 공격력 Lv.1 · 아군 피해 강화 Lv.1',
  },
  'fixed_gem-chaos-processed': {
    gemShort: '침식',
    gemName: '혼돈의 젬 : 침식',
    options: '의지력 효율 Lv.5 · 혼돈 포인트 Lv.4 · 공격력 Lv.1 · 아군 피해 강화 Lv.1',
  },
};

/** 가공 완료 젬 상자 단가 = 연결 젬 실시간 시세(+ 젬 페온) + 8,100골드 */
export function getProcessedGemBoxUnitPrice(fixedItemId: string, prices: Record<string, number>, peonGold: number = 0): number {
  const gemId = PROCESSED_GEM_BOX_GEM[fixedItemId];
  if (!gemId) return 0;
  return getItemUnitPrice(gemId, prices, peonGold) + PROCESSED_GEM_BOX_EXTRA_GOLD;
}

// 은총의 파편 1개 가치 = 재련 재료 상자 구성 가치 합 ÷ 60 (지평의 성당 페이지와 동일)
const REFINE_BOX_COMPONENTS: { itemId: string; amount: number }[] = [
  { itemId: '66102007', amount: 2000 },  // 운명의 파괴석 결정
  { itemId: '66102107', amount: 4000 },  // 운명의 수호석 결정
  { itemId: '66110226', amount: 60 },    // 위대한 운명의 돌파석
  { itemId: '66130143', amount: 22500 }, // 운명의 파편
];
const REFINE_BOX_GRACE_COST = 60;

export function getGraceUnitPrice(prices: Record<string, number>): number {
  return REFINE_BOX_COMPONENTS.reduce(
    (sum, c) => sum + getItemUnitPrice(c.itemId, prices) * c.amount,
    0,
  ) / REFINE_BOX_GRACE_COST;
}

// 유물 코어 선택 상자 가격 = 은총 100개 환산 + 골드 50,000
export function getRelicCoreSelectPrice(prices: Record<string, number>): number {
  return Math.round(getGraceUnitPrice(prices) * 100) + 50000;
}

/**
 * 티켓 기댓값용 환율(100블크당 골드).
 * 넘어온 값 → 패키지 환율(goldPerWon)에서 역산 → 마지막 폴백(8500) 순.
 * goldPerWon 이 있는데 8500 으로 떨어지면 티켓값이 절반 밑으로 깎여, 같은 층인데
 * 갤러리·상세(둘 다 goldPerWon × 2750 사용)와 숫자가 어긋난다.
 */
function ticketBcRate(officialGoldRate?: number, goldPerWon?: number): number {
  if (officialGoldRate && officialGoldRate > 0) return officialGoldRate;
  if (goldPerWon && goldPerWon > 0) return goldPerWon * 2750;
  return 8500;
}

export function getUnitPrice(
  added: AddedItem,
  template: TemplateItem,
  prices: Record<string, number>,
  goldPerWon?: number,
  officialGoldRate?: number,
  noPeon: boolean = false,
): number {
  const peonGold = peonGoldPerUnit(goldPerWon, noPeon);
  switch (template.type) {
    case 'simple':
      return getItemUnitPrice(template.itemId!, prices, peonGold);
    case 'choice':
      if (!added.selectedChoiceId) return 0;
      if (template.id === 'gem-hero-fixed-select')
        return getFixedGemSelectUnitPrice(added.selectedChoiceId, prices, goldPerWon, noPeon);
      return getItemUnitPrice(added.selectedChoiceId, prices, peonGold);
    case 'gold':
      return added.goldAmount || 0;
    case 'fixed': {
      // 지옥/나락/큐브 티켓 기댓값에 쓰는 환율은 반드시 "이 패키지의 환율"이다 —
      // 지옥 보상 페이지의 환율 입력(그 페이지 로컬 state)과는 아무 관계가 없다.
      // officialGoldRate 는 폼이 넘기는 같은 값(goldPerWon × 2750)이고,
      // 안 넘어오면 goldPerWon 에서 직접 만든다. 8500 은 환율을 아예 모를 때의 마지막 폴백.
      const bcRate = ticketBcRate(officialGoldRate, goldPerWon);
      const ticket = calcTicketUnitByItemId('fixed_' + template.id, prices, bcRate, undefined, noPeon);
      if (ticket !== null) return ticket;
      if (template.id === 'relic-core')
        return getRelicCoreSelectPrice(prices);
      if (PROCESSED_GEM_BOX_GEM[`fixed_${template.id}`])
        return getProcessedGemBoxUnitPrice(`fixed_${template.id}`, prices, peonGold);
      return template.fixedGold || 0;
    }
    case 'crystal':
      return crystalUnitGold(`crystal_${template.id}`, template.crystalPerUnit, goldPerWon, noPeon);
    case 'expected':
      return (template.expectedItems || []).reduce((sum, ei) => {
        return sum + getItemUnitPrice(ei.itemId, prices, peonGold) * ei.probability;
      }, 0);
    case 'bundle':
      return (template.bundleContents || []).reduce((sum, bc) => {
        const qty = added.bundleQuantities?.[bc.itemId] || 0;
        return sum + getItemUnitPrice(bc.itemId, prices, peonGold) * qty;
      }, 0);
    case 'choiceBox':
      return getChoiceBoxGold(added.choiceBoxCandidates, added.choiceBoxSelectedIds, prices, peonGold);
    case 'probBox':
      // 티켓류 후보의 동적 단가용 bcRate — fixed 케이스와 같은 규칙(이 패키지의 환율)
      return getProbBoxExpectedGold(added.probBoxCandidates, prices, ticketBcRate(officialGoldRate, goldPerWon), undefined, goldPerWon, noPeon);
    default:
      return 0;
  }
}

// ─── 페온 배지 판정 ───
// "이 구성품 값에 페온이 들어 있다" — 갤러리 셀·상세 카드·폼 목록에 페온 배지를 붙일 때 쓴다.
// 값 계산 경로와 같은 기준: 젬(영웅 6종), 페온·어빌리티스톤 키트, 지옥/나락/큐브 티켓(팔찌·젬 페온), 가공 완료 젬 상자.
const hasGemPeonId = (itemId: string | undefined): boolean =>
  !!itemId && (GEM_PEON_BY_ID[itemId.split(':')[0]] || 0) > 0;

function expectedTemplateHasPeon(itemId: string): boolean {
  if (!itemId.startsWith('expected_')) return false;
  const rows = TEMPLATES_MAP[itemId.slice('expected_'.length)]?.expectedItems;
  return !!rows && rows.some((ei) => hasGemPeonId(ei.itemId));
}

/** 확률 상자 후보 하나에 페온이 들어 있는지 */
export function probBoxCandidateHasPeon(cand: ProbBoxCandidate): boolean {
  if (cand.crystalPerUnit && cand.crystalPerUnit > 0) return PEON_CRYSTAL_ITEM_IDS.has(cand.itemId || '');
  if (cand.expectedItems && cand.expectedItems.length > 0) return cand.expectedItems.some((ei) => hasGemPeonId(ei.itemId));
  if (cand.bundleItems && cand.bundleItems.length > 0) return cand.bundleItems.some((bi) => hasGemPeonId(bi.itemId));
  if (cand.choiceOptions && cand.choiceOptions.length > 0) return cand.choiceOptions.some((c) => hasGemPeonId(c.itemId));
  if (!cand.itemId) return false;
  if (isTicketItemId(cand.itemId)) return true;
  if (PROCESSED_GEM_BOX_GEM[cand.itemId]) return true;
  return hasGemPeonId(cand.itemId);
}

/** 저장된 구성품(PackageItem)에 페온이 들어 있는지 */
export function packageItemHasPeon(item: {
  itemId: string;
  crystalPerUnit?: number;
  choiceOptions?: { itemId: string }[];
  bundleItems?: { itemId: string }[];
  choiceBoxCandidates?: { itemId?: string }[];
  probBoxCandidates?: ProbBoxCandidate[];
}): boolean {
  if (item.probBoxCandidates && item.probBoxCandidates.length > 0) return item.probBoxCandidates.some(probBoxCandidateHasPeon);
  if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) return item.choiceBoxCandidates.some((c) => hasGemPeonId(c.itemId));
  if (item.bundleItems && item.bundleItems.length > 0) return item.bundleItems.some((bi) => hasGemPeonId(bi.itemId));
  if (item.choiceOptions && item.choiceOptions.length > 0) return item.choiceOptions.some((c) => hasGemPeonId(c.itemId));
  if (PEON_CRYSTAL_ITEM_IDS.has(item.itemId)) return true;
  if (isTicketItemId(item.itemId)) return true;
  if (PROCESSED_GEM_BOX_GEM[item.itemId]) return true;
  if (expectedTemplateHasPeon(item.itemId)) return true;
  return hasGemPeonId(item.itemId);
}

/** 등록/수정 폼의 추가 아이템(템플릿 + 입력 상태)에 페온이 들어 있는지 */
export function addedItemHasPeon(added: AddedItem, template: TemplateItem): boolean {
  switch (template.type) {
    case 'simple': return hasGemPeonId(template.itemId);
    case 'choice': return (template.choices || []).some((c) => hasGemPeonId(c.itemId));
    case 'fixed': return isTicketItemId(`fixed_${template.id}`) || !!PROCESSED_GEM_BOX_GEM[`fixed_${template.id}`];
    case 'crystal': return PEON_CRYSTAL_ITEM_IDS.has(`crystal_${template.id}`);
    case 'expected': return (template.expectedItems || []).some((ei) => hasGemPeonId(ei.itemId));
    case 'bundle': return (template.bundleContents || []).some((bc) => hasGemPeonId(bc.itemId));
    case 'choiceBox': return (added.choiceBoxCandidates || []).some((c) => hasGemPeonId(c.itemId));
    case 'probBox': return (added.probBoxCandidates || []).some(probBoxCandidateHasPeon);
    default: return false;
  }
}

/** 단일 가챠 아이템의 골드 가치 계산 */
export function calculateGachaItemGold(
  item: import('@/types/package').PackageItem,
  prices: Record<string, number>,
  goldPerWon: number,
  bcRate: number,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
  noPeon: boolean = false,
): number {
  const peonGold = peonGoldPerUnit(goldPerWon, noPeon);
  // 크리스탈 기반 아이템
  if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
    return crystalUnitGold(item.itemId, item.crystalPerUnit, goldPerWon, noPeon) * item.quantity;
  }
  if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
    const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
    if (fallback) return crystalUnitGold(item.itemId, fallback, goldPerWon, noPeon) * item.quantity;
  }
  // 선택 상자 → 현재 시세 기준 가치 상위 N개 합
  if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
    const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
    return getChoiceBoxBestGold(item.choiceBoxCandidates, n, prices, peonGold) * item.quantity;
  }
  // 확률 상자 → 현재 시세 기준 기댓값
  if (item.probBoxCandidates && item.probBoxCandidates.length > 0) {
    return getProbBoxExpectedGold(item.probBoxCandidates, prices, bcRate, tiers, goldPerWon, noPeon) * item.quantity;
  }
  // 묶음 주머니 → 내부 아이템 시세 합산 × 주머니 수량
  if (item.bundleItems && item.bundleItems.length > 0) {
    const perBundleValue = item.bundleItems.reduce((sum, bi) => {
      return sum + getItemUnitPrice(bi.itemId, prices, peonGold) * bi.quantity;
    }, 0);
    return perBundleValue * item.quantity;
  }
  // 선택(choice) 아이템 → 선택지 중 최고가 (선택지별 수량 반영)
  if (item.choiceOptions && item.choiceOptions.length > 0) {
    if (item.icon === FIXED_GEM_SELECT_ICON) {
      let maxPrice = 0;
      for (const c of item.choiceOptions) {
        const p = getFixedGemSelectUnitPrice(c.itemId, prices, goldPerWon, noPeon);
        if (p > maxPrice) maxPrice = p;
      }
      return maxPrice * item.quantity;
    }
    return getChoiceBestValue(item.choiceOptions, item.itemId, prices, peonGold) * item.quantity;
  }
  // 확률표 상자(expected_) → 현재 시세 기준 기댓값 재계산 (goldOverride 는 등록 시점 박제값)
  const expectedUnit = getExpectedBoxUnitPrice(item.itemId, prices, peonGold);
  if (expectedUnit !== null) return expectedUnit * item.quantity;
  // 동적 티켓
  if (item.goldOverride != null) {
    if (PROCESSED_GEM_BOX_GEM[item.itemId] && Object.keys(prices).length > 0)
      return getProcessedGemBoxUnitPrice(item.itemId, prices, peonGold) * item.quantity;
    if (bcRate > 0) {
      const ticket = calcTicketUnitByItemId(item.itemId, prices, bcRate, tiers, noPeon);
      if (ticket !== null) return ticket * item.quantity;
    }
    return item.goldOverride * item.quantity;
  }
  // 시세 아이템
  return getItemUnitPrice(item.itemId, prices, peonGold) * item.quantity;
}

/** 가챠 기대값 = Σ(아이템골드 × 확률/100) */
export function calculateGachaExpectedValue(
  items: import('@/types/package').PackageItem[],
  prices: Record<string, number>,
  goldPerWon: number,
  bcRate: number,
  noPeon: boolean = false,
): number {
  return items.reduce((sum, item) => {
    const gold = calculateGachaItemGold(item, prices, goldPerWon, bcRate, undefined, noPeon);
    return sum + gold * ((item.probability || 0) / 100);
  }, 0);
}

/** 10회 가챠 결과를 중복 그룹핑 (빈도순 정렬) */
export function groupMultiResults(
  results: number[],
): { origIdx: number; count: number }[] {
  const map = new Map<number, number>();
  for (const idx of results) map.set(idx, (map.get(idx) || 0) + 1);
  return Array.from(map.entries())
    .map(([origIdx, count]) => ({ origIdx, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── 신작 판정 ───

/** "신규 출시"로 등록된 글이 신작으로 취급되는 기간 (등록일 기준) */
export const NEW_BADGE_DAYS = 30;

/**
 * 신작인지 — 신규 출시로 등록됐고, 등록 후 30일이 지나지 않았고, 판매 종료가 아닌 글.
 * 갤러리 카드의 NEW 배지와 "신작순" 정렬이 어긋나지 않도록 판정은 여기 한 곳에서만 한다.
 */
export function isNewReleasePost(post: PackagePost): boolean {
  if (!post.isNewRelease) return false;
  if (isSaleEnded(post)) return false;
  const created = toSaleDate(post.createdAt);
  if (!created) return false;
  return Date.now() - created.getTime() < NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * 패키지 게시물의 효율(G/원)을 계산 — 갤러리 정렬용.
 *
 * goldPerWonOverride: 갤러리 공통 환율이 적용 중일 때 그 값을 넘긴다.
 * 모든 글이 같은 환율을 쓰게 되므로 이 효율값의 순서가 카드에 찍히는 이득률 순서와 일치한다.
 * (넘기지 않으면 글마다 등록 시점 환율이 달라 순서가 이득률과 어긋날 수 있다)
 */
export function calculatePostEfficiency(
  post: PackagePost,
  latestPrices: Record<string, number>,
  goldPerWonOverride?: number,
  noPeon: boolean = false,
): number {
  const goldPerWon =
    goldPerWonOverride && goldPerWonOverride > 0 ? goldPerWonOverride : post.goldPerWon || 0;
  const bcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
  const hasPrices = Object.keys(latestPrices).length > 0;
  const peonGold = peonGoldPerUnit(goldPerWon, noPeon);

  // 가챠 패키지: 기대값 기반 효율
  if (post.packageType === '가챠') {
    const expectedGold = calculateGachaExpectedValue(post.items, latestPrices, goldPerWon, bcRate, noPeon);
    return post.royalCrystalPrice > 0 ? expectedGold / post.royalCrystalPrice : 0;
  }

  const getTicketUnit = (itemId: string, fallback: number): number => {
    if (PROCESSED_GEM_BOX_GEM[itemId] && hasPrices)
      return getProcessedGemBoxUnitPrice(itemId, latestPrices, peonGold);
    if (bcRate > 0 && hasPrices) {
      const ticket = calcTicketUnitByItemId(itemId, latestPrices, bcRate, undefined, noPeon);
      if (ticket !== null) return ticket;
    }
    return fallback;
  };

  const itemValue = (item: import('@/types/package').PackageItem): number => {
    if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
      // 저장된 선택 대신 현재 시세 상위 N개로 계산 (등록 후 시세 역전 대응)
      const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
      return getChoiceBoxBestGold(item.choiceBoxCandidates, n, latestPrices, peonGold) * item.quantity;
    }
    if (item.probBoxCandidates && item.probBoxCandidates.length > 0) {
      return getProbBoxExpectedGold(item.probBoxCandidates, latestPrices, bcRate, undefined, goldPerWon, noPeon) * item.quantity;
    }
    if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
      return crystalUnitGold(item.itemId, item.crystalPerUnit, goldPerWon, noPeon) * item.quantity;
    }
    if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
      const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
      if (fallback) return crystalUnitGold(item.itemId, fallback, goldPerWon, noPeon) * item.quantity;
    }
    // 묶음 주머니 → 내부 아이템 시세 합산 (goldOverride 박제값 대신)
    if (item.bundleItems && item.bundleItems.length > 0) {
      return item.bundleItems.reduce(
        (sum, bi) => sum + getItemUnitPrice(bi.itemId, latestPrices, peonGold) * bi.quantity, 0) * item.quantity;
    }
    // 확률표 상자(expected_) → 현재 시세 기준 기댓값 재계산
    const expectedUnit = getExpectedBoxUnitPrice(item.itemId, latestPrices, peonGold);
    if (expectedUnit !== null) return expectedUnit * item.quantity;
    if (item.goldOverride != null) {
      return getTicketUnit(item.itemId, item.goldOverride) * item.quantity;
    }
    // choice 타입: 저장된 선택이 아닌 현재 시세 최고가 선택지 기준 (item.quantity = 박스 개수)
    if (item.choiceOptions && item.choiceOptions.length > 0) {
      if (item.icon === FIXED_GEM_SELECT_ICON) {
        const qty = item.quantity * (item.choiceOptions.find((c) => c.itemId === item.itemId)?.quantity ?? 1);
        return getFixedGemSelectBestUnitPrice(item.choiceOptions, item.itemId, latestPrices, goldPerWon, noPeon) * qty;
      }
      return getChoiceBestValue(item.choiceOptions, item.itemId, latestPrices, peonGold) * item.quantity;
    }
    return getItemUnitPrice(item.itemId, latestPrices, peonGold) * item.quantity;
  };

  const itemValues = post.items.map(itemValue);

  let totalGold: number;
  if (post.selectableCount && post.selectableCount > 0) {
    const sorted = [...itemValues].sort((a, b) => b - a);
    totalGold = sorted.slice(0, post.selectableCount).reduce((s, v) => s + v, 0);
  } else {
    totalGold = itemValues.reduce((s, v) => s + v, 0);
  }

  // '3+보너스': 3개 구매 시 1회만 지급되는 고정 보상. 3개 단위로 균등 배분해 개당 효율에 반영.
  // 보너스 택N이면 보너스 중 최고가 N개만 합산 (뷰어가 최고가 조합을 고른다고 가정).
  // '핫딜샵': 칸마다 값이 다른 상품을 전부 사면 보너스 1회. 갤러리 정렬 효율은 "전부 구매" 기준 —
  // 가격(칸 가격 합)은 이미 royalCrystalPrice 에 들어 있고, 가치는 칸 가치 합 + 보너스.
  if (post.packageType === '3+보너스' || post.packageType === '핫딜샵') {
    const bonusValues = (post.bonusItems || []).map(itemValue);
    let bonusGold: number;
    if (post.bonusSelectableCount && post.bonusSelectableCount > 0) {
      const sorted = [...bonusValues].sort((a, b) => b - a);
      bonusGold = sorted.slice(0, post.bonusSelectableCount).reduce((s, v) => s + v, 0);
    } else {
      bonusGold = bonusValues.reduce((s, v) => s + v, 0);
    }
    const adjustedTotalGold = post.packageType === '핫딜샵' ? totalGold + bonusGold : totalGold + bonusGold / 3;
    return post.royalCrystalPrice > 0 ? adjustedTotalGold / post.royalCrystalPrice : 0;
  }

  const multiplier = post.packageType === '3+1' ? 4 / 3 : post.packageType === '2+1' ? 3 / 2 : 1;
  return post.royalCrystalPrice > 0 ? (totalGold * multiplier) / post.royalCrystalPrice : 0;
}
