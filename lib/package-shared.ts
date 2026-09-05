import { calcTicketUnitByItemId, DEFAULT_TICKET_TIERS, type TicketTiers } from '@/lib/hell-reward-calc';
import { TRACKED_ITEMS, type TrackedItem } from '@/lib/items-to-track';
import { isSaleEnded, toSaleDate } from '@/lib/package-sale';
import { RIFT_TIERS } from '@/data/rewardTable';
import type { PackagePost } from '@/types/package';

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

/**
 * 확률 상자 후보 1개의 개당 골드.
 * 시세 아이템은 현재 시세, 'fixed_' 후보 중 티켓·유물코어·가공젬은 사이트 공통 동적 단가
 * (지옥 보상 평균 등, bcRate = 100블크당 골드), 그 외 fixed 는 goldPerUnit(등록 시점 고정가).
 * 블크·확률표·묶음·선택 후보는 각 타입 규칙대로 현재 시세로 매번 다시 계산한다.
 */
export function getProbBoxCandidateUnit(
  cand: ProbBoxCandidate,
  prices: Record<string, number>,
  bcRate: number = 0,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
  goldPerWon: number = 0,
): number {
  // 블크 환율: 명시값 우선, 없으면 bcRate(100블크당 골드)에서 역산 (100 BC = 2750원)
  const gpw = goldPerWon > 0 ? goldPerWon : bcRate > 0 ? bcRate / 2750 : 0;

  // 블크 기반 (도약의 정수·페온·축복 등)
  if (cand.crystalPerUnit && cand.crystalPerUnit > 0) return cand.crystalPerUnit * gpw * 27.5;

  // 확률표 상자 (영웅 젬 랜덤 상자 등) — Σ(시세 × 확률)
  if (cand.expectedItems && cand.expectedItems.length > 0) {
    return cand.expectedItems.reduce(
      (sum, ei) => sum + getItemUnitPrice(ei.itemId, prices) * ei.probability, 0);
  }

  // 묶음 주머니 — Σ(내부 아이템 시세 × 개수)
  if (cand.bundleItems && cand.bundleItems.length > 0) {
    return cand.bundleItems.reduce(
      (sum, bi) => sum + getItemUnitPrice(bi.itemId, prices) * bi.quantity, 0);
  }

  // 선택 상자 — 등록자가 고른 선택지 기준 (선택지별 개수 반영).
  // 확률 상자는 "이 확률로 이게 나온다"를 적는 곳이라, 다른 곳처럼 최고가로 덮어쓰지 않고 지정한 선택지를 그대로 쓴다.
  if (cand.choiceOptions && cand.choiceOptions.length > 0) {
    const picked = cand.itemId || cand.choiceOptions[0].itemId;
    const qty = cand.choiceOptions.find((c) => c.itemId === picked)?.quantity ?? 1;
    const unit = cand.icon === FIXED_GEM_SELECT_ICON
      ? getFixedGemSelectUnitPrice(picked, prices, gpw)
      : getItemUnitPrice(picked, prices);
    return unit * qty;
  }

  if (!cand.itemId) return cand.goldPerUnit || 0;
  if (cand.itemId.startsWith('fixed_')) {
    const hasPrices = Object.keys(prices).length > 0;
    if (hasPrices && bcRate > 0) {
      const ticket = calcTicketUnitByItemId(cand.itemId, prices, bcRate, tiers);
      if (ticket !== null) return ticket;
    }
    if (hasPrices) {
      if (cand.itemId === 'fixed_relic-core') return getRelicCoreSelectPrice(prices);
      if (PROCESSED_GEM_BOX_GEM[cand.itemId]) return getProcessedGemBoxUnitPrice(cand.itemId, prices);
    }
    return cand.goldPerUnit || 0;
  }
  return getItemUnitPrice(cand.itemId, prices);
}

/** 확률 상자 1개 기댓값 = Σ(개당 시세 × 수량 × 확률/100) — 폼·갤러리·상세 전부 여기로 계산 */
export function getProbBoxExpectedGold(
  candidates: ProbBoxCandidate[] | undefined,
  prices: Record<string, number>,
  bcRate: number = 0,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
  goldPerWon: number = 0,
): number {
  if (!candidates || candidates.length === 0) return 0;
  return candidates.reduce((sum, c) => {
    return sum + getProbBoxCandidateUnit(c, prices, bcRate, tiers, goldPerWon) * c.quantity * ((c.probability || 0) / 100);
  }, 0);
}

/** 선택 상자: 선택된 후보들의 가치 합산 (등록/수정 폼과 저장된 게시물 양쪽에서 재사용) */
export function getChoiceBoxGold(
  candidates: ChoiceBoxCandidate[] | undefined,
  selectedIds: string[] | undefined,
  prices: Record<string, number>,
): number {
  if (!candidates || !selectedIds || selectedIds.length === 0) return 0;
  return candidates
    .filter((c) => selectedIds.includes(c.id))
    .reduce((sum, c) => {
      const unit = c.itemId ? getItemUnitPrice(c.itemId, prices) : (c.goldPerUnit || 0);
      return sum + unit * c.quantity;
    }, 0);
}

/** 선택 상자: 후보들 중 가치(단가×수량)가 가장 높은 N개의 id를 반환 (등록 시 기본 선택값) */
export function pickTopNCandidateIds(
  candidates: ChoiceBoxCandidate[],
  pickCount: number,
  prices: Record<string, number>,
): string[] {
  const withValue = candidates.map((c) => ({
    id: c.id,
    value: (c.itemId ? getItemUnitPrice(c.itemId, prices) : (c.goldPerUnit || 0)) * c.quantity,
  }));
  withValue.sort((a, b) => b.value - a.value);
  return withValue.slice(0, Math.max(0, pickCount)).map((v) => v.id);
}

/** 선택 상자: 현재 시세 기준 가치 상위 N개 합 — 저장된 선택(등록 시점 시세)이 아닌 최신 시세로 항상 최고 조합 */
export function getChoiceBoxBestGold(
  candidates: ChoiceBoxCandidate[] | undefined,
  pickCount: number | undefined,
  prices: Record<string, number>,
): number {
  if (!candidates || candidates.length === 0) return 0;
  const n = Math.max(1, pickCount || 1);
  return getChoiceBoxGold(candidates, pickTopNCandidateIds(candidates, n, prices), prices);
}

/** 일반 choice 아이템: 선택지 중 현재 시세 최고가 (단가 × 선택지별 수량) — 상자 1개 기준.
    저장된 선택은 등록 시점 시세라 이후 시세가 뒤집히면 낮은 아이템으로 계산되는 문제 방지 */
export function getChoiceBestValue(
  choiceOptions: { itemId: string; quantity?: number }[],
  fallbackItemId: string,
  prices: Record<string, number>,
): number {
  let best = getItemUnitPrice(fallbackItemId, prices)
    * (choiceOptions.find((c) => c.itemId === fallbackItemId)?.quantity ?? 1);
  for (const c of choiceOptions) {
    const v = getItemUnitPrice(c.itemId, prices) * (c.quantity ?? 1);
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
    type: 'simple',
    itemId: '66102007',
  },
  {
    id: 'guardian-crystal',
    icon: '/guardian-stone-crystal.webp',
    name: '운명의 수호석 결정',
    type: 'simple',
    itemId: '66102107',
  },
  {
    // 파괴석 결정 OR 수호석 결정 중 하나만 선택하는 아이템.
    // 예전엔 type: 'bundle'로 잘못 구현되어 있어 둘 다 합산되는 버그가 있었음 → 'choice'로 수정.
    id: 'crystal-choice',
    icon: '/vkrhltngh.webp',
    name: '파괴/수호 결정 선택',
    type: 'choice',
    choices: [
      { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/destruction-stone-crystal.webp' },
      { itemId: '66102107', name: '운명의 수호석 결정', icon: '/guardian-stone-crystal.webp' },
    ],
  },
  {
    id: 'crystal-bundle',
    icon: '/vkrhltngh.webp',
    name: '파결+수결 묶음 주머니',
    type: 'bundle',
    bundleContents: [
      { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/destruction-stone-crystal.webp' },
      { itemId: '66102107', name: '운명의 수호석 결정', icon: '/guardian-stone-crystal.webp' },
    ],
  },
  {
    // 파괴석 OR 수호석 중 하나만 선택하는 주머니 (결정 아님, 일반 돌)
    id: 'stone-choice-pouch',
    icon: '/vkrhltjrtnghtjr.webp',
    name: '파괴석/수호석 선택 주머니',
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
    icon: '/gong-support.webp',
    name: '용숨/빙숨 선택 상자',
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
    type: 'simple',
    itemId: '66102006',
  },
  {
    id: 'guardian-stone',
    icon: '/guardian-stone.webp',
    name: '운명의 수호석',
    type: 'simple',
    itemId: '66102106',
  },
  // ── 아비도스 ──
  {
    id: 'superior-abidos',
    icon: '/top-abidos-fusion5.webp',
    name: '상비도스',
    type: 'simple',
    itemId: '6861013',
  },
  {
    id: 'abidos-fusion',
    icon: '/abidos-fusion5.webp?v=4',
    name: '아비도스 융화 재료',
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
    fixedGold: 8000, // 폴백 전용 — 실제 가격은 영웅 지옥 티켓 평균가 ÷ 6 동적 계산 (getUnitPrice)
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

/**
 * 저장된 expected_ 아이템(영웅 젬 랜덤 상자 등)의 개당 기댓값을 현재 시세로 재계산.
 * 등록 시 goldOverride 에 박제된 등록 시점 기댓값 대신 항상 이 값을 먼저 쓴다 —
 * 템플릿이 사라졌거나 시세가 아직 안 왔으면 null 을 돌려주고 호출부가 goldOverride 로 폴백한다.
 */
export function getExpectedBoxUnitPrice(itemId: string, prices: Record<string, number>): number | null {
  if (!itemId.startsWith('expected_')) return null;
  if (Object.keys(prices).length === 0) return null;
  const expectedItems = TEMPLATES_MAP[itemId.slice('expected_'.length)]?.expectedItems;
  if (!expectedItems || expectedItems.length === 0) return null;
  return expectedItems.reduce((sum, ei) => sum + getItemUnitPrice(ei.itemId, prices) * ei.probability, 0);
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
export function getExpectedBoxBreakdown(itemId: string, prices: Record<string, number>): ExpectedBoxRow[] | null {
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
      unit: getItemUnitPrice(ei.itemId, prices),
    };
  });
}

/* ─── 구성품 표시 순서 ───
 * 등록자가 담은 순서와 상관없이 어느 글이든 같은 배열로 보여 준다.
 * 순서 기준은 새 표를 만들지 않고 TEMPLATE_ITEMS 의 나열 순서를 그대로 쓴다 —
 * 그 목록이 이미 재료 · 젬 · 유각 · 티켓 · 상자 · 재화처럼 계열별로 묶여 있어서,
 * 따라가기만 하면 비슷한 것끼리 모이고 어느 카드를 봐도 같은 자리에 같은 계열이 온다.
 * (순서표를 따로 두면 카탈로그에 아이템을 추가할 때마다 두 곳을 맞춰야 한다.)
 *
 * 저장된 데이터는 건드리지 않는다 — 그리는 순서만 바꾸므로 이미 올라온 글도 즉시 정돈되고,
 * 수정 화면에서는 등록자가 담은 순서가 그대로 남는다.
 */
const TEMPLATE_RANK = new Map<string, number>();   // 템플릿 id → 카탈로그 순번
const MARKET_ID_RANK = new Map<string, number>();  // 시세 itemId → 카탈로그 순번
TEMPLATE_ITEMS.forEach((t, i) => {
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
  'destruction-crystal': 65, 'guardian-crystal': 65, 'crystal-choice': 65, 'crystal-bundle': 65, 'stone-choice-pouch': 65,
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

export function getItemUnitPrice(itemId: string, prices: Record<string, number>): number {
  if (itemId.startsWith(RIFT_RUN_ITEM_PREFIX)) {
    return getRiftRunGold(parseInt(itemId.slice(RIFT_RUN_ITEM_PREFIX.length), 10), prices);
  }
  const raw = prices[itemId] || 0;
  const bundle = PRICE_BUNDLE_SIZE[itemId] || 1;
  return raw / bundle;
}

// 고정형 영웅 젬 선택 상자: 아이콘으로 template 식별 (choiceOptions만 저장되고 templateId는 저장 안 되므로)
export const FIXED_GEM_SELECT_ICON = '/fixed-hero-gem-select.webp';

// 젬 가공은 4개 스탯 중 2개가 중복 없이 붙음 → 원하는 2종 조합(딜러/서폿 유효옵션)이 뜰 확률 = 1/6.
// 고정형 상자는 그 조합을 확정으로 주므로 확률을 뒤집어(×6) 곱해 프리미엄을 반영.
// 초기화는 옵션이 고정된 초기 상태로 되돌리므로, 추가 초기화 1회 = 확정 조합 가치(×6) 한 번 더 − 초기화권(100크리스탈) 비용.
export const FIXED_GEM_COMBO_MULTIPLIER = 6; // 1 ÷ (1/6)
export const GEM_RESET_TICKET_CRYSTAL = 100; // 젬 가공 초기화권 1장 = 100 크리스탈

/** 고정형 젬 공식의 각 항 분해 (상세 페이지 공식 표시용) */
export function getFixedGemSelectBreakdown(
  choiceItemId: string,
  prices: Record<string, number>,
  goldPerWon?: number,
): { base: number; multiplier: number; comboValue: number; ticketGold: number; total: number } {
  const gemItemId = choiceItemId.split(':')[0]; // '67400003:atk' → '67400003'
  const base = getItemUnitPrice(gemItemId, prices);
  const comboValue = base * FIXED_GEM_COMBO_MULTIPLIER;
  const ticketGold = (goldPerWon || 0) * GEM_RESET_TICKET_CRYSTAL * 27.5;
  return {
    base,
    multiplier: FIXED_GEM_COMBO_MULTIPLIER,
    comboValue,
    ticketGold,
    total: comboValue + comboValue - ticketGold,
  };
}

/** 고정형 영웅 젬 선택 상자의 선택지 1개 가치 = 젬 시세 × 6 (확률 역수) + 젬 시세 (추가 초기화 1회) − 초기화권 골드 */
export function getFixedGemSelectUnitPrice(
  choiceItemId: string,
  prices: Record<string, number>,
  goldPerWon?: number,
): number {
  return getFixedGemSelectBreakdown(choiceItemId, prices, goldPerWon).total;
}

/** 고정형 젬 상자: 선택지 중 현재 시세 최고가 — 뷰어 선택이 없는 곳(갤러리 소계·효율 정렬)에서 시세 변동 따라 항상 최고가로 계산 */
export function getFixedGemSelectBestUnitPrice(
  choiceOptions: { itemId: string }[] | undefined,
  fallbackItemId: string,
  prices: Record<string, number>,
  goldPerWon?: number,
): number {
  let best = getFixedGemSelectUnitPrice(fallbackItemId, prices, goldPerWon);
  for (const c of choiceOptions || []) {
    const v = getFixedGemSelectUnitPrice(c.itemId, prices, goldPerWon);
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

/** 가공 완료 젬 상자 단가 = 연결 젬 실시간 시세 + 8,100골드 */
export function getProcessedGemBoxUnitPrice(fixedItemId: string, prices: Record<string, number>): number {
  const gemId = PROCESSED_GEM_BOX_GEM[fixedItemId];
  if (!gemId) return 0;
  return getItemUnitPrice(gemId, prices) + PROCESSED_GEM_BOX_EXTRA_GOLD;
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
      if (!added.selectedChoiceId) return 0;
      if (template.id === 'gem-hero-fixed-select')
        return getFixedGemSelectUnitPrice(added.selectedChoiceId, prices, goldPerWon);
      return getItemUnitPrice(added.selectedChoiceId, prices);
    case 'gold':
      return added.goldAmount || 0;
    case 'fixed': {
      const bcRate = officialGoldRate || 8500;
      const ticket = calcTicketUnitByItemId('fixed_' + template.id, prices, bcRate);
      if (ticket !== null) return ticket;
      if (template.id === 'relic-core')
        return getRelicCoreSelectPrice(prices);
      if (PROCESSED_GEM_BOX_GEM[`fixed_${template.id}`])
        return getProcessedGemBoxUnitPrice(`fixed_${template.id}`, prices);
      return template.fixedGold || 0;
    }
    case 'crystal':
      return (template.crystalPerUnit || 0) * (goldPerWon || 0) * 27.5;
    case 'expected':
      return (template.expectedItems || []).reduce((sum, ei) => {
        return sum + getItemUnitPrice(ei.itemId, prices) * ei.probability;
      }, 0);
    case 'bundle':
      return (template.bundleContents || []).reduce((sum, bc) => {
        const qty = added.bundleQuantities?.[bc.itemId] || 0;
        return sum + getItemUnitPrice(bc.itemId, prices) * qty;
      }, 0);
    case 'choiceBox':
      return getChoiceBoxGold(added.choiceBoxCandidates, added.choiceBoxSelectedIds, prices);
    case 'probBox':
      // 티켓류 후보의 동적 단가용 bcRate — fixed 케이스와 같은 기본값 사용
      return getProbBoxExpectedGold(added.probBoxCandidates, prices, officialGoldRate || 8500, undefined, goldPerWon);
    default:
      return 0;
  }
}

/** 단일 가챠 아이템의 골드 가치 계산 */
export function calculateGachaItemGold(
  item: import('@/types/package').PackageItem,
  prices: Record<string, number>,
  goldPerWon: number,
  bcRate: number,
  tiers: TicketTiers = DEFAULT_TICKET_TIERS,
): number {
  // 크리스탈 기반 아이템
  if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
    return item.crystalPerUnit * goldPerWon * 27.5 * item.quantity;
  }
  if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
    const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
    if (fallback) return fallback * goldPerWon * 27.5 * item.quantity;
  }
  // 선택 상자 → 현재 시세 기준 가치 상위 N개 합
  if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
    const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
    return getChoiceBoxBestGold(item.choiceBoxCandidates, n, prices) * item.quantity;
  }
  // 확률 상자 → 현재 시세 기준 기댓값
  if (item.probBoxCandidates && item.probBoxCandidates.length > 0) {
    return getProbBoxExpectedGold(item.probBoxCandidates, prices, bcRate, tiers, goldPerWon) * item.quantity;
  }
  // 묶음 주머니 → 내부 아이템 시세 합산 × 주머니 수량
  if (item.bundleItems && item.bundleItems.length > 0) {
    const perBundleValue = item.bundleItems.reduce((sum, bi) => {
      return sum + getItemUnitPrice(bi.itemId, prices) * bi.quantity;
    }, 0);
    return perBundleValue * item.quantity;
  }
  // 선택(choice) 아이템 → 선택지 중 최고가 (선택지별 수량 반영)
  if (item.choiceOptions && item.choiceOptions.length > 0) {
    if (item.icon === FIXED_GEM_SELECT_ICON) {
      let maxPrice = 0;
      for (const c of item.choiceOptions) {
        const p = getFixedGemSelectUnitPrice(c.itemId, prices, goldPerWon);
        if (p > maxPrice) maxPrice = p;
      }
      return maxPrice * item.quantity;
    }
    return getChoiceBestValue(item.choiceOptions, item.itemId, prices) * item.quantity;
  }
  // 확률표 상자(expected_) → 현재 시세 기준 기댓값 재계산 (goldOverride 는 등록 시점 박제값)
  const expectedUnit = getExpectedBoxUnitPrice(item.itemId, prices);
  if (expectedUnit !== null) return expectedUnit * item.quantity;
  // 동적 티켓
  if (item.goldOverride != null) {
    if (PROCESSED_GEM_BOX_GEM[item.itemId] && Object.keys(prices).length > 0)
      return getProcessedGemBoxUnitPrice(item.itemId, prices) * item.quantity;
    if (bcRate > 0) {
      const ticket = calcTicketUnitByItemId(item.itemId, prices, bcRate, tiers);
      if (ticket !== null) return ticket * item.quantity;
    }
    return item.goldOverride * item.quantity;
  }
  // 시세 아이템
  const raw = prices[item.itemId] || 0;
  const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
  return (raw / bundle) * item.quantity;
}

/** 가챠 기대값 = Σ(아이템골드 × 확률/100) */
export function calculateGachaExpectedValue(
  items: import('@/types/package').PackageItem[],
  prices: Record<string, number>,
  goldPerWon: number,
  bcRate: number,
): number {
  return items.reduce((sum, item) => {
    const gold = calculateGachaItemGold(item, prices, goldPerWon, bcRate);
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
): number {
  const goldPerWon =
    goldPerWonOverride && goldPerWonOverride > 0 ? goldPerWonOverride : post.goldPerWon || 0;
  const bcRate = goldPerWon > 0 ? goldPerWon * 2750 : 0;
  const hasPrices = Object.keys(latestPrices).length > 0;

  // 가챠 패키지: 기대값 기반 효율
  if (post.packageType === '가챠') {
    const expectedGold = calculateGachaExpectedValue(post.items, latestPrices, goldPerWon, bcRate);
    return post.royalCrystalPrice > 0 ? expectedGold / post.royalCrystalPrice : 0;
  }

  const getTicketUnit = (itemId: string, fallback: number): number => {
    if (PROCESSED_GEM_BOX_GEM[itemId] && hasPrices)
      return getProcessedGemBoxUnitPrice(itemId, latestPrices);
    if (bcRate > 0 && hasPrices) {
      const ticket = calcTicketUnitByItemId(itemId, latestPrices, bcRate);
      if (ticket !== null) return ticket;
    }
    return fallback;
  };

  const itemValue = (item: import('@/types/package').PackageItem): number => {
    if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
      // 저장된 선택 대신 현재 시세 상위 N개로 계산 (등록 후 시세 역전 대응)
      const n = item.choiceBoxPickCount || item.choiceBoxSelectedIds?.length || 1;
      return getChoiceBoxBestGold(item.choiceBoxCandidates, n, latestPrices) * item.quantity;
    }
    if (item.probBoxCandidates && item.probBoxCandidates.length > 0) {
      return getProbBoxExpectedGold(item.probBoxCandidates, latestPrices, bcRate, undefined, goldPerWon) * item.quantity;
    }
    if (item.crystalPerUnit && item.crystalPerUnit > 0 && goldPerWon > 0) {
      return item.crystalPerUnit * goldPerWon * 27.5 * item.quantity;
    }
    if (!item.crystalPerUnit && item.itemId.startsWith('crystal_') && goldPerWon > 0) {
      const fallback = CRYSTAL_PER_UNIT_FALLBACK[item.itemId];
      if (fallback) return fallback * goldPerWon * 27.5 * item.quantity;
    }
    // 묶음 주머니 → 내부 아이템 시세 합산 (goldOverride 박제값 대신)
    if (item.bundleItems && item.bundleItems.length > 0) {
      return item.bundleItems.reduce(
        (sum, bi) => sum + getItemUnitPrice(bi.itemId, latestPrices) * bi.quantity, 0) * item.quantity;
    }
    // 확률표 상자(expected_) → 현재 시세 기준 기댓값 재계산
    const expectedUnit = getExpectedBoxUnitPrice(item.itemId, latestPrices);
    if (expectedUnit !== null) return expectedUnit * item.quantity;
    if (item.goldOverride != null) {
      return getTicketUnit(item.itemId, item.goldOverride) * item.quantity;
    }
    // choice 타입: 저장된 선택이 아닌 현재 시세 최고가 선택지 기준 (item.quantity = 박스 개수)
    if (item.choiceOptions && item.choiceOptions.length > 0) {
      if (item.icon === FIXED_GEM_SELECT_ICON) {
        const qty = item.quantity * (item.choiceOptions.find((c) => c.itemId === item.itemId)?.quantity ?? 1);
        return getFixedGemSelectBestUnitPrice(item.choiceOptions, item.itemId, latestPrices, goldPerWon) * qty;
      }
      return getChoiceBestValue(item.choiceOptions, item.itemId, latestPrices) * item.quantity;
    }
    const raw = latestPrices[item.itemId] || 0;
    const bundle = PRICE_BUNDLE_SIZE[item.itemId] || 1;
    return (raw / bundle) * item.quantity;
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
  if (post.packageType === '3+보너스') {
    const bonusValues = (post.bonusItems || []).map(itemValue);
    let bonusGold: number;
    if (post.bonusSelectableCount && post.bonusSelectableCount > 0) {
      const sorted = [...bonusValues].sort((a, b) => b - a);
      bonusGold = sorted.slice(0, post.bonusSelectableCount).reduce((s, v) => s + v, 0);
    } else {
      bonusGold = bonusValues.reduce((s, v) => s + v, 0);
    }
    const adjustedTotalGold = totalGold + bonusGold / 3;
    return post.royalCrystalPrice > 0 ? adjustedTotalGold / post.royalCrystalPrice : 0;
  }

  const multiplier = post.packageType === '3+1' ? 4 / 3 : post.packageType === '2+1' ? 3 / 2 : 1;
  return post.royalCrystalPrice > 0 ? (totalGold * multiplier) / post.royalCrystalPrice : 0;
}
