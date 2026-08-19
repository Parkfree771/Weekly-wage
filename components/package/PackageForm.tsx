'use client';

// 패키지 등록/수정 공용 폼.
//
// 원래 register 와 edit 페이지가 이 내용(상태·핸들러·계산·JSX 전체)을 각각 복제해 들고 있었다
// (2,500여 줄 중 85% 동일). 한쪽만 고치면 다른 쪽이 어긋나는 사고가 실제로 나기 시작해서
// 여기로 합쳤다 — 페이지는 초기값 로딩과 저장(onSubmit)만 담당한다.
//
// 가챠 확률은 아이템을 만드는 시점에 해당 행(added.id)의 값을 바로 붙인다.
// 예전처럼 "만들고 나서 인덱스로 다시 짝짓기"를 하면 매핑에 실패해 드롭된 아이템이
// 하나라도 있을 때 이후 확률이 전부 한 칸씩 밀린다.

import { useState, useEffect, useMemo, useRef } from 'react';
import type { PackageItem, PackagePost, PackageType, PriceCurrency } from '@/types/package';
import {
  type AddedItem,
  type ChoiceBoxCandidate,
  type ProbBoxCandidate,
  type TemplateItem,
  TEMPLATE_ITEMS,
  TEMPLATES_MAP,
  ICON_SIZE_CATALOG,
  ICON_SIZE_BOX,
  ICON_POSITION,
  ICON_SCALE,
  DYNAMIC_TICKET_IDS,
  formatNumber,
  getItemUnitPrice,
  getFixedGemSelectUnitPrice,
  getProbBoxExpectedGold,
  getUnitPrice,
  pickTopNCandidateIds,
} from '@/lib/package-shared';
import { fromDatetimeLocalValue, toDatetimeLocalValue, fromSaleEndDateValue, toDateOnlyValue } from '@/lib/package-sale';
import { fetchLatestPrices } from '@/lib/price-history-client';
import styles from '@/app/package/package.module.css';

// ─── 폼 초기값 / 제출 데이터 ───

export type PackageFormInitial = {
  title: string;
  packageType: PackageType;
  priceCurrency: PriceCurrency;
  royalCrystalPrice: number;
  blueCrystalPrice: number;
  officialGold: number;
  selectableCount: number;
  bonusSelectableCount: number;
  isNewRelease: boolean;
  saleStartInput: string;
  saleEndInput: string;
  saleClosed: boolean;
  addedItems: AddedItem[];
  gachaProbabilities: Record<string, number>;
  /** 로드된 커스텀 아이템 개수 — 새 커스텀의 id 가 겹치지 않게 이어서 센다 */
  customCounterStart: number;
};

export type PackageFormSubmitData = {
  title: string;
  packageType: PackageType;
  /** 원화 환산 가격 (블크 가격 입력 시 27.5원/블크로 환산된 값) */
  royalCrystalPrice: number;
  priceCurrency: PriceCurrency;
  blueCrystalPrice: number;
  items: PackageItem[];
  bonusItems: PackageItem[];
  goldPerWon: number;
  selectableCount: number;
  bonusSelectableCount: number;
  isNewRelease: boolean;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  saleClosed: boolean;
};

// ─── 저장된 PackageItem[] → 폼 상태 역매핑 ───

type MapCtx = { itemCounter: number; customCounter: number };

/**
 * 저장된 아이템 하나를 폼의 AddedItem 으로 되돌린다. 매핑 실패(삭제된 템플릿 등)는 null.
 * id 는 'loaded-{n}-...' 형식이라 새로 추가되는 '{templateId}_{n}' 과 절대 겹치지 않는다.
 */
function mapOneItem(item: PackageItem, ctx: MapCtx): AddedItem | null {
  ctx.itemCounter += 1;
  const n = ctx.itemCounter;

  if (item.itemId.startsWith('custom_')) {
    ctx.customCounter += 1;
    const tid = `custom-${ctx.customCounter}`;
    return {
      id: tid,
      templateId: tid,
      quantity: item.quantity,
      isCustom: true,
      customName: item.name,
      customShortName: item.shortName || '',
      customGoldPerUnit: item.goldOverride || 0,
    };
  }
  if (item.itemId.startsWith('gold_')) {
    const templateId = item.itemId.replace('gold_', '');
    if (TEMPLATES_MAP[templateId]) {
      return { id: `loaded-${n}-${templateId}`, templateId, quantity: 1, goldAmount: item.goldOverride || 0 };
    }
  }
  if (item.itemId.startsWith('fixed_')) {
    const templateId = item.itemId.replace('fixed_', '');
    if (TEMPLATES_MAP[templateId]) {
      return { id: `loaded-${n}-${templateId}`, templateId, quantity: item.quantity };
    }
  }
  // Crystal type (블크 기반 아이템)
  if (item.itemId.startsWith('crystal_')) {
    const templateId = item.itemId.replace('crystal_', '');
    if (TEMPLATES_MAP[templateId]) {
      return { id: `loaded-${n}-${templateId}`, templateId, quantity: item.quantity };
    }
  }
  // Expected type (확률 기대값)
  if (item.itemId.startsWith('expected_')) {
    const templateId = item.itemId.replace('expected_', '');
    if (TEMPLATES_MAP[templateId]) {
      return { id: `loaded-${n}-${templateId}`, templateId, quantity: item.quantity };
    }
  }
  // Choice box (사용자가 직접 담은 후보 중 N개를 택하는 상자)
  if (item.choiceBoxCandidates && item.choiceBoxCandidates.length > 0) {
    return {
      id: `loaded-${n}-custom-choice-box`,
      templateId: 'custom-choice-box',
      quantity: item.quantity || 1,
      isChoiceBox: true,
      choiceBoxName: item.name,
      choiceBoxCandidates: item.choiceBoxCandidates,
      choiceBoxPickCount: item.choiceBoxPickCount || 1,
      choiceBoxSelectedIds: item.choiceBoxSelectedIds || [],
    };
  }
  // Prob box (등록자가 담은 아이템·확률로 기댓값을 계산하는 상자)
  if (item.probBoxCandidates && item.probBoxCandidates.length > 0) {
    return {
      id: `loaded-${n}-custom-prob-box`,
      templateId: 'custom-prob-box',
      quantity: item.quantity || 1,
      isProbBox: true,
      probBoxName: item.name,
      probBoxCandidates: item.probBoxCandidates,
    };
  }
  // Choice type (has choiceOptions)
  if (item.choiceOptions && item.choiceOptions.length > 0) {
    const template = TEMPLATE_ITEMS.find(
      (t) =>
        t.type === 'choice' &&
        t.choices?.some((c) =>
          item.choiceOptions!.some((co) => co.itemId === c.itemId),
        ),
    );
    if (template) {
      return {
        id: `loaded-${n}-${template.id}`,
        templateId: template.id,
        quantity: item.quantity,
        selectedChoiceId: item.itemId,
        choiceQuantities: Object.fromEntries(
          item.choiceOptions.map((co) => [co.itemId, co.quantity ?? 1]),
        ),
      };
    }
  }
  // Simple type
  const template = TEMPLATE_ITEMS.find(
    (t) => t.type === 'simple' && t.itemId === item.itemId,
  );
  if (template) {
    return { id: `loaded-${n}-${template.id}`, templateId: template.id, quantity: item.quantity };
  }
  return null;
}

/**
 * 확률 복원은 여기서 아이템 ↔ AddedItem 을 직접 짝지어 담는다 —
 * 매핑 실패로 드롭된 아이템이 있어도 나머지 확률이 밀리지 않는다.
 */
function mapItemsToAdded(
  items: PackageItem[],
  ctx: MapCtx,
  probs: Record<string, number>,
): AddedItem[] {
  return items
    .map((item) => {
      const mapped = mapOneItem(item, ctx);
      if (mapped && item.probability != null) probs[mapped.id] = item.probability;
      return mapped;
    })
    .filter(Boolean) as AddedItem[];
}

/** 저장된 게시물 → 폼 초기값 (수정 페이지에서 사용) */
export function postToFormInitial(post: PackagePost): PackageFormInitial {
  const ctx: MapCtx = { itemCounter: 0, customCounter: 0 };
  const probs: Record<string, number> = {};
  const main = mapItemsToAdded(post.items, ctx, probs);
  const bonus = mapItemsToAdded(post.bonusItems || [], ctx, probs).map((a) => ({ ...a, isBonus: true }));
  const isBc = post.priceCurrency === 'blueCrystal' && !!post.blueCrystalPrice;
  return {
    title: post.title,
    packageType: post.packageType,
    priceCurrency: post.priceCurrency || 'cash',
    royalCrystalPrice: isBc ? 0 : post.royalCrystalPrice,
    blueCrystalPrice: isBc ? post.blueCrystalPrice! : 0,
    officialGold: post.goldPerWon && post.goldPerWon > 0 ? Math.round(post.goldPerWon * 2750) : 0,
    selectableCount: post.selectableCount && post.selectableCount > 0 ? post.selectableCount : 0,
    bonusSelectableCount: post.bonusSelectableCount && post.bonusSelectableCount > 0 ? post.bonusSelectableCount : 0,
    isNewRelease: !!post.isNewRelease,
    saleStartInput: toDatetimeLocalValue(post.saleStartAt),
    saleEndInput: toDateOnlyValue(post.saleEndAt),
    saleClosed: post.saleClosed === true,
    addedItems: [...main, ...bonus],
    gachaProbabilities: post.packageType === '가챠' ? probs : {},
    customCounterStart: ctx.customCounter,
  };
}

// ─── 폼 본체 ───

type Props = {
  mode: 'register' | 'edit';
  /** 수정 모드 초기값 — 로드가 끝난 뒤에 폼을 마운트해야 한다 (상태 초기화는 마운트 1회) */
  initial?: PackageFormInitial;
  /** 검증 통과 후 호출. 실패 시 throw 하면 폼이 실패 메시지를 띄운다 */
  onSubmit: (data: PackageFormSubmitData) => Promise<void>;
};

export default function PackageForm({ mode, initial, onSubmit }: Props) {
  const isEdit = mode === 'edit';

  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);

  const [addedItems, setAddedItems] = useState<AddedItem[]>(initial?.addedItems ?? []);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [packageType, setPackageType] = useState<PackageType>(initial?.packageType ?? '일반');
  const [priceCurrency, setPriceCurrency] = useState<PriceCurrency>(initial?.priceCurrency ?? 'cash');
  const [royalCrystalPrice, setRoyalCrystalPrice] = useState<number>(initial?.royalCrystalPrice ?? 0);
  const [blueCrystalPrice, setBlueCrystalPrice] = useState<number>(initial?.blueCrystalPrice ?? 0);
  const [tradeMode, setTradeMode] = useState<'unofficial' | 'official'>('official');
  // 엄거래: 100골드 : ?원
  const [unofficialRate, setUnofficialRate] = useState<number>(0);
  // 공식 거래: 2750 RC(=2750원) = 100 BC = ?골드 (RC/BC 고정)
  const [officialGold, setOfficialGold] = useState<number>(initial?.officialGold ?? 0);
  const [selectableCount, setSelectableCount] = useState<number>(initial?.selectableCount ?? 0);
  // '3+보너스' 전용: 보너스 구성품 중 N개 선택 (0 = 전체 지급)
  const [bonusSelectableCount, setBonusSelectableCount] = useState<number>(initial?.bonusSelectableCount ?? 0);
  const [isNewRelease, setIsNewRelease] = useState<boolean>(initial?.isNewRelease ?? false); // 갤러리 NEW 배지 (30일)
  // 판매 기간 (선택 — 상시 판매 패키지는 비워두면 된다)
  const [saleStartInput, setSaleStartInput] = useState<string>(initial?.saleStartInput ?? '');
  const [saleEndInput, setSaleEndInput] = useState<string>(initial?.saleEndInput ?? '');
  const [saleClosed, setSaleClosed] = useState<boolean>(initial?.saleClosed ?? false); // 기간과 무관하게 직접 판매 종료 처리 (수정 전용)
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [gachaProbabilities, setGachaProbabilities] = useState<Record<string, number>>(
    initial?.gachaProbabilities ?? {},
  );
  // '3+보너스' 패키지 전용: 아이템 클릭 시 확정 구성품/보너스 구성품 중 어디에 추가할지
  const [addTarget, setAddTarget] = useState<'main' | 'bonus'>('main');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const customCounterRef = useRef(initial?.customCounterStart ?? 0);
  const itemCounterRef = useRef(0);

  // 가격 fetch — fetchLatestPrices 는 모듈 메모리 캐시가 있어 페이지 간 이동 시 재요청이 없다
  useEffect(() => {
    fetchLatestPrices()
      .then((data) => { setLatestPrices(data); setPriceLoading(false); })
      .catch(() => setPriceLoading(false));
  }, []);

  // 아이템이 하나 "추가될 때만" 목록을 맨 아래로 — 삭제 시에도 발화하면 목록이 아래로 튄다
  const prevAddedLenRef = useRef(addedItems.length);
  useEffect(() => {
    const prev = prevAddedLenRef.current;
    prevAddedLenRef.current = addedItems.length;
    if (addedItems.length !== prev + 1) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [addedItems.length]);

  // 아이템 추가 (항상 새 인스턴스 추가, 같은 템플릿 중복 가능)
  const handleAddItem = (templateId: string) => {
    const template = TEMPLATES_MAP[templateId];
    if (!template) return;

    itemCounterRef.current += 1;
    const newItem: AddedItem = { id: `${templateId}_${itemCounterRef.current}`, templateId, quantity: 1 };
    if (packageType === '3+보너스' && addTarget === 'bonus') {
      newItem.isBonus = true;
    }
    if (template.type === 'choice' && template.choices?.length) {
      // 시세상 가장 비싼 선택지를 기본 선택
      const priceOf = (itemId: string) => template.id === 'gem-hero-fixed-select'
        ? getFixedGemSelectUnitPrice(itemId, latestPrices, goldPerWon)
        : getItemUnitPrice(itemId, latestPrices);
      const best = template.choices.reduce((max, c) =>
        priceOf(c.itemId) > priceOf(max.itemId) ? c : max,
        template.choices[0]);
      newItem.selectedChoiceId = best.itemId;
    }
    if (template.type === 'gold') {
      newItem.goldAmount = 0;
    }
    if (template.boxItem) {
      newItem.innerQuantity = 1;
    }
    if (template.type === 'bundle' && template.bundleContents) {
      newItem.bundleQuantities = {};
      template.bundleContents.forEach(bc => { newItem.bundleQuantities![bc.itemId] = 0; });
    }
    if (template.type === 'choiceBox') {
      newItem.isChoiceBox = true;
      newItem.choiceBoxCandidates = [];
      newItem.choiceBoxPickCount = 1;
      newItem.choiceBoxSelectedIds = [];
    }
    if (template.type === 'probBox') {
      newItem.isProbBox = true;
      newItem.probBoxCandidates = [];
    }
    setAddedItems((prev) => [...prev, newItem]);
  };

  const choiceBoxCandidateCounterRef = useRef(0);

  const handleChoiceBoxPickCountChange = (itemId: string, pickCount: number) => {
    setAddedItems((prev) =>
      prev.map((a) => {
        if (a.id !== itemId) return a;
        const candidates = a.choiceBoxCandidates || [];
        return {
          ...a,
          choiceBoxPickCount: pickCount,
          choiceBoxSelectedIds: pickTopNCandidateIds(candidates, pickCount, latestPrices),
        };
      }),
    );
  };

  const handleChoiceBoxNameChange = (itemId: string, name: string) => {
    setAddedItems((prev) =>
      prev.map((a) => (a.id === itemId ? { ...a, choiceBoxName: name } : a)),
    );
  };

  const handleChoiceBoxAddCandidate = (itemId: string, candidateTemplateId: string) => {
    const candidateTemplate = TEMPLATES_MAP[candidateTemplateId];
    if (!candidateTemplate || !candidateTemplate.itemId) return;
    choiceBoxCandidateCounterRef.current += 1;
    const newCandidate: ChoiceBoxCandidate = {
      id: `cand_${choiceBoxCandidateCounterRef.current}`,
      name: candidateTemplate.name,
      icon: candidateTemplate.icon,
      itemId: candidateTemplate.itemId,
      quantity: 1,
    };
    setAddedItems((prev) =>
      prev.map((a) => {
        if (a.id !== itemId) return a;
        const candidates = [...(a.choiceBoxCandidates || []), newCandidate];
        return {
          ...a,
          choiceBoxCandidates: candidates,
          choiceBoxSelectedIds: pickTopNCandidateIds(candidates, a.choiceBoxPickCount || 1, latestPrices),
        };
      }),
    );
  };

  const handleChoiceBoxRemoveCandidate = (itemId: string, candidateId: string) => {
    setAddedItems((prev) =>
      prev.map((a) => {
        if (a.id !== itemId) return a;
        const candidates = (a.choiceBoxCandidates || []).filter((c) => c.id !== candidateId);
        return {
          ...a,
          choiceBoxCandidates: candidates,
          choiceBoxSelectedIds: pickTopNCandidateIds(candidates, a.choiceBoxPickCount || 1, latestPrices),
        };
      }),
    );
  };

  const handleChoiceBoxCandidateQuantityChange = (itemId: string, candidateId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) => {
        if (a.id !== itemId) return a;
        const candidates = (a.choiceBoxCandidates || []).map((c) =>
          c.id === candidateId ? { ...c, quantity: Math.max(1, qty) } : c,
        );
        return {
          ...a,
          choiceBoxCandidates: candidates,
          choiceBoxSelectedIds: pickTopNCandidateIds(candidates, a.choiceBoxPickCount || 1, latestPrices),
        };
      }),
    );
  };

  // ── 확률 상자 핸들러 ──
  const probBoxCandidateCounterRef = useRef(0);

  const handleProbBoxNameChange = (itemId: string, name: string) => {
    setAddedItems((prev) =>
      prev.map((a) => (a.id === itemId ? { ...a, probBoxName: name } : a)),
    );
  };

  const handleProbBoxAddCandidate = (itemId: string, candidateTemplateId: string) => {
    const candidateTemplate = TEMPLATES_MAP[candidateTemplateId];
    if (!candidateTemplate || !candidateTemplate.itemId) return;
    probBoxCandidateCounterRef.current += 1;
    const newCandidate: ProbBoxCandidate = {
      id: `pcand_${probBoxCandidateCounterRef.current}`,
      name: candidateTemplate.name,
      icon: candidateTemplate.icon,
      itemId: candidateTemplate.itemId,
      quantity: 1,
      probability: 0,
    };
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId
          ? { ...a, probBoxCandidates: [...(a.probBoxCandidates || []), newCandidate] }
          : a,
      ),
    );
  };

  const handleProbBoxRemoveCandidate = (itemId: string, candidateId: string) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId
          ? { ...a, probBoxCandidates: (a.probBoxCandidates || []).filter((c) => c.id !== candidateId) }
          : a,
      ),
    );
  };

  const handleProbBoxCandidateQuantityChange = (itemId: string, candidateId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId
          ? {
              ...a,
              probBoxCandidates: (a.probBoxCandidates || []).map((c) =>
                c.id === candidateId ? { ...c, quantity: Math.max(1, qty) } : c,
              ),
            }
          : a,
      ),
    );
  };

  const handleProbBoxCandidateProbChange = (itemId: string, candidateId: string, prob: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId
          ? {
              ...a,
              probBoxCandidates: (a.probBoxCandidates || []).map((c) =>
                c.id === candidateId ? { ...c, probability: Math.min(100, Math.max(0, prob)) } : c,
              ),
            }
          : a,
      ),
    );
  };

  const handleBundleQuantityChange = (itemId: string, contentItemId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, bundleQuantities: { ...a.bundleQuantities, [contentItemId]: Math.max(0, qty) } } : a,
      ),
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setAddedItems((prev) => prev.filter((a) => a.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, quantity: Math.max(0, qty) } : a,
      ),
    );
  };

  const handleInnerQuantityChange = (itemId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, innerQuantity: Math.max(0, qty) } : a,
      ),
    );
  };

  const handleAddCustomItem = () => {
    customCounterRef.current += 1;
    const cid = `custom-${customCounterRef.current}`;
    setAddedItems((prev) => [...prev, {
      id: cid,
      templateId: cid,
      quantity: 1,
      isCustom: true,
      customName: '',
      customShortName: '',
      customGoldPerUnit: 0,
      ...(packageType === '3+보너스' && addTarget === 'bonus' ? { isBonus: true } : {}),
    }]);
  };

  const handleCustomNameChange = (itemId: string, name: string) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, customName: name } : a,
      ),
    );
  };

  const handleCustomShortNameChange = (itemId: string, shortName: string) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, customShortName: shortName } : a,
      ),
    );
  };

  const handleCustomGoldChange = (itemId: string, gold: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, customGoldPerUnit: gold } : a,
      ),
    );
  };

  const handleChoiceChange = (itemId: string, choiceId: string) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, selectedChoiceId: choiceId } : a,
      ),
    );
  };

  // 선택지별 개수 (예: 파괴석 1000개 / 수호석 5000개처럼 선택지마다 개수가 다를 때 개별 지정)
  const handleChoiceQuantityChange = (itemId: string, choiceId: string, qty: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, choiceQuantities: { ...a.choiceQuantities, [choiceId]: Math.max(0, qty) } } : a,
      ),
    );
  };

  const handleGoldChange = (itemId: string, amount: number) => {
    setAddedItems((prev) =>
      prev.map((a) =>
        a.id === itemId ? { ...a, goldAmount: amount } : a,
      ),
    );
  };

  // 골드:현금 비율 계산 (1 RC = 1원, 100 BC = 2750 RC 고정)
  const goldPerWon = tradeMode === 'unofficial'
    ? (unofficialRate > 0 ? 100 / unofficialRate : 0)
    : (officialGold > 0 ? officialGold / 2750 : 0);

  // 블크 → 원 환산 가격 (100 BC = 2750원)
  const effectiveCashPrice = priceCurrency === 'cash'
    ? royalCrystalPrice
    : blueCrystalPrice * 27.5;

  // choice 타입: 박스 개수(added.quantity) × 선택지별 박스당 개수 (미지정 선택지는 1배 = 기존과 동일)
  const getChoiceQty = (added: AddedItem, template: TemplateItem): number => {
    const choiceId = added.selectedChoiceId || template.choices?.[0]?.itemId || '';
    return added.quantity * (added.choiceQuantities?.[choiceId] ?? 1);
  };

  // 카탈로그 셀(65개)마다 addedItems.filter 를 돌리지 않도록 템플릿별 담긴 개수를 한 번만 센다
  const addedCountByTemplate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of addedItems) counts[a.templateId] = (counts[a.templateId] || 0) + 1;
    return counts;
  }, [addedItems]);

  // 아이템별 소계 계산
  const itemSubtotals = useMemo(() => {
    return addedItems.map((added) => {
      if (added.isCustom) {
        return (added.customGoldPerUnit || 0) * added.quantity;
      }
      const template = TEMPLATES_MAP[added.templateId];
      if (!template) return 0;
      const unitPrice = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
      const qty = template.type === 'gold' ? 1 : template.type === 'choice' ? getChoiceQty(added, template) : added.quantity;
      const inner = template.boxItem ? (added.innerQuantity || 1) : 1;
      return unitPrice * qty * inner;
    });
  }, [addedItems, latestPrices, goldPerWon, officialGold]);

  // selectableCount > 0일 때 가장 비싼 N개 자동 선택.
  // 보너스 구성품은 확정 구성품과 별도로, bonusSelectableCount > 0이면 보너스끼리 최고가 N개만 선택된다.
  useEffect(() => {
    const mainEntries = addedItems.map((a, idx) => ({ a, idx })).filter(({ a }) => !a.isBonus);
    const bonusEntries = addedItems.map((a, idx) => ({ a, idx })).filter(({ a }) => a.isBonus);
    const newChecked = new Set<string>();
    if (bonusSelectableCount <= 0 || bonusEntries.length === 0) {
      bonusEntries.forEach(({ a }) => newChecked.add(a.id));
    } else {
      const withValue = bonusEntries.map(({ a, idx }) => ({ id: a.id, value: itemSubtotals[idx] || 0 }));
      withValue.sort((x, y) => y.value - x.value);
      withValue.slice(0, bonusSelectableCount).forEach((v) => newChecked.add(v.id));
    }
    if (selectableCount <= 0 || mainEntries.length === 0) {
      mainEntries.forEach(({ a }) => newChecked.add(a.id));
    } else {
      const withValue = mainEntries.map(({ a, idx }) => ({ id: a.id, value: itemSubtotals[idx] || 0 }));
      withValue.sort((x, y) => y.value - x.value);
      withValue.slice(0, selectableCount).forEach((v) => newChecked.add(v.id));
    }
    // 내용이 같으면 setState 를 건너뛴다 — 항상 새 Set 을 넣으면 모든 키 입력마다 리렌더가 한 번 더 강제된다
    setCheckedItemIds((prev) => {
      if (prev.size === newChecked.size && [...newChecked].every((id) => prev.has(id))) return prev;
      return newChecked;
    });
  }, [addedItems, itemSubtotals, selectableCount, bonusSelectableCount]);

  // 총 골드 계산 (확정 구성품은 체크된 것만, 순수 1개 구매 기준 — 보너스 미반영)
  const totalGoldValue = useMemo(() => {
    return addedItems.reduce((sum, added, idx) => {
      if (added.isBonus) return sum;
      if (selectableCount > 0 && !checkedItemIds.has(added.id)) return sum;
      return sum + (itemSubtotals[idx] || 0);
    }, 0);
  }, [addedItems, itemSubtotals, selectableCount, checkedItemIds]);

  const bonusGoldValue = useMemo(() => {
    return addedItems.reduce((sum, added, idx) => {
      if (!added.isBonus) return sum;
      // 보너스 택N: 선택된(최고가 N개) 보너스만 합산
      if (bonusSelectableCount > 0 && !checkedItemIds.has(added.id)) return sum;
      return sum + (itemSubtotals[idx] || 0);
    }, 0);
  }, [addedItems, itemSubtotals, bonusSelectableCount, checkedItemIds]);

  const multiplier = packageType === '3+1' ? 4 / 3 : packageType === '2+1' ? 3 / 2 : 1;
  const adjustedValue = totalGoldValue * multiplier;
  const efficiency = effectiveCashPrice > 0 ? adjustedValue / effectiveCashPrice : 0;
  // 100:X 비율 (100골드 당 원)
  const ratePer100 = goldPerWon > 0 ? Math.round(100 / goldPerWon) : 0;
  // 1개 구매 기준 (보너스 가정 없이 순수 1회 구매)
  const singleCashGold = effectiveCashPrice * goldPerWon;
  const singleBenefit = singleCashGold > 0
    ? ((totalGoldValue - singleCashGold) / singleCashGold) * 100
    : 0;
  // N+1 / 3+보너스 전부 구매 기준 (3+1: 3개값 내고 4개 받음, 2+1: 2개값 내고 3개 받음,
  // 3+보너스: 3개값 내고 확정 구성품 3배 + 보너스 구성품 1회 고정 지급)
  const isBonusPkg = packageType === '3+보너스';
  const buyCount = packageType === '3+1' ? 3 : packageType === '2+1' ? 2 : isBonusPkg ? 3 : 1;
  const getCount = packageType === '3+1' ? 4 : packageType === '2+1' ? 3 : 1;
  const fullCashGold = effectiveCashPrice * buyCount * goldPerWon;
  const fullPackageGold = isBonusPkg ? totalGoldValue * 3 + bonusGoldValue : totalGoldValue * getCount;
  const fullBenefit = fullCashGold > 0
    ? ((fullPackageGold - fullCashGold) / fullCashGold) * 100
    : 0;

  // 구성품 한 줄 렌더링 (확정/보너스 구역 공용)
  const renderAddedRow = (added: AddedItem) => {
    // ── 커스텀 아이템 ──
    if (added.isCustom) {
      const cSubtotal = (added.customGoldPerUnit || 0) * added.quantity;
      const isChecked = checkedItemIds.has(added.id);
      return (
        <div key={added.id} className={`${styles.packageBoxItem} ${(added.isBonus ? bonusSelectableCount > 0 : selectableCount > 0) && !isChecked ? styles.packageBoxItemUnchecked : ''}`}>
          <div className={styles.customItemRow}>
            <input type="text" className={styles.customNameInput}
              value={added.customName || ''}
              onChange={(e) => handleCustomNameChange(added.id, e.target.value)}
              placeholder="아이템 이름" maxLength={30} />
            {/* 갤러리 셀은 62px 라 30자가 안 들어간다 — 거기 쓸 축약 이름을 따로 받는다 */}
            <input type="text" className={styles.customShortNameInput}
              value={added.customShortName || ''}
              onChange={(e) => handleCustomShortNameChange(added.id, e.target.value)}
              placeholder="갤러리 표시" maxLength={8}
              title="갤러리 카드에 표시할 짧은 이름 (비우면 위 이름을 잘라서 표시)" />
            <input type="number" className={styles.quantityInput}
              value={added.customGoldPerUnit || ''}
              onChange={(e) => handleCustomGoldChange(added.id, parseInt(e.target.value) || 0)}
              placeholder="골드" style={{ width: '80px' }} min={0} />
            <span className={styles.packageBoxItemX}>x</span>
            <input type="number" className={styles.quantityInput}
              value={added.quantity || ''}
              onChange={(e) => handleQuantityChange(added.id, parseInt(e.target.value) || 0)}
              min={0} />
            <span className={styles.packageBoxItemSubtotal}>{formatNumber(cSubtotal)}G</span>
            {packageType === '가챠' && (
              <>
                <input type="number" className={styles.gachaProbInput}
                  value={gachaProbabilities[added.id] ?? ''}
                  onChange={(e) => setGachaProbabilities((p) => ({ ...p, [added.id]: parseFloat(e.target.value) || 0 }))}
                  placeholder="%" min={0} max={100} step={0.1} />
                <span className={styles.gachaProbUnit}>%</span>
              </>
            )}
            <button type="button" className={styles.removeItemBtn}
              onClick={() => handleRemoveItem(added.id)} title="제거">&times;</button>
          </div>
        </div>
      );
    }
    // ── 일반 아이템 ──
    const template = TEMPLATES_MAP[added.templateId];
    if (!template) return null;
    const unitPrice = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
    const qty = template.type === 'gold' ? 1 : template.type === 'choice' ? getChoiceQty(added, template) : added.quantity;
    const inner = template.boxItem ? (added.innerQuantity || 1) : 1;
    const subtotal = unitPrice * qty * inner;
    const isChecked = checkedItemIds.has(added.id);
    return (
      <div key={added.id} className={`${styles.packageBoxItem} ${(added.isBonus ? bonusSelectableCount > 0 : selectableCount > 0) && !isChecked ? styles.packageBoxItemUnchecked : ''}`}>
        <div className={styles.packageBoxItemMain}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={template.icon} alt={template.name}
            className={styles.packageBoxItemIcon}
            style={{
              ...(ICON_SIZE_BOX[template.id] ? { width: ICON_SIZE_BOX[template.id], height: ICON_SIZE_BOX[template.id] } : {}),
              ...(ICON_POSITION[template.id] ? { objectFit: 'cover' as const, objectPosition: ICON_POSITION[template.id] } : {}),
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className={styles.packageBoxItemName}>
            {template.type === 'choiceBox' ? (added.choiceBoxName?.trim() || template.name)
              : template.type === 'probBox' ? (added.probBoxName?.trim() || template.name)
              : template.name}
          </span>
          {template.type === 'gold' ? (
            <input type="number" className={styles.quantityInput}
              value={added.goldAmount || ''}
              onChange={(e) => handleGoldChange(added.id, parseInt(e.target.value) || 0)}
              placeholder="골드" style={{ width: '100px' }} />
          ) : (
            <>
              <span className={styles.packageBoxItemX}>x</span>
              <input type="number" className={styles.quantityInput}
                value={added.quantity || ''}
                onChange={(e) => handleQuantityChange(added.id, parseInt(e.target.value) || 0)}
                min={0} />
            </>
          )}
          <span className={styles.packageBoxItemSubtotal}>{formatNumber(subtotal)}G</span>
          {packageType === '가챠' && (
            <>
              <input type="number" className={styles.gachaProbInput}
                value={gachaProbabilities[added.id] ?? ''}
                onChange={(e) => setGachaProbabilities((p) => ({ ...p, [added.id]: parseFloat(e.target.value) || 0 }))}
                placeholder="%" min={0} max={100} step={0.1} />
              <span className={styles.gachaProbUnit}>%</span>
            </>
          )}
          <button type="button" className={styles.removeItemBtn}
            onClick={() => handleRemoveItem(added.id)} title="제거">&times;</button>
        </div>
        {template.type === 'choice' && template.choices && template.choices.length <= 3 && !template.choiceDropdown && (
          <div className={styles.choiceBranch}>
            {template.choices.map((choice) => {
              const isSelected = added.selectedChoiceId === choice.itemId;
              const choicePrice = template.id === 'gem-hero-fixed-select'
                ? getFixedGemSelectUnitPrice(choice.itemId, latestPrices, goldPerWon)
                : getItemUnitPrice(choice.itemId, latestPrices);
              const perBoxQty = added.choiceQuantities?.[choice.itemId] ?? 1;
              const choiceTotalQty = added.quantity * perBoxQty;
              return (
                <div key={choice.itemId} className={styles.choiceOptionRow}>
                  <button type="button"
                    className={`${styles.choiceOption} ${isSelected ? styles.choiceOptionSelected : ''}`}
                    onClick={() => handleChoiceChange(added.id, choice.itemId)}>
                    {choice.icon && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img loading="lazy" decoding="async" src={choice.icon} alt={choice.name} className={styles.choiceOptionIcon}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span className={styles.choiceOptionName}>{choice.name}</span>
                    <span className={styles.choiceOptionPrice}>
                      {priceLoading ? '...' : `${formatNumber(choicePrice)}G`}
                    </span>
                  </button>
                  <input type="number"
                    className={`${styles.quantityInput} ${styles.choiceOptionQtyInput}`}
                    value={perBoxQty || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleChoiceQuantityChange(added.id, choice.itemId, parseInt(e.target.value) || 0)}
                    min={0} title="박스 1개당 개수 (박스 개수와 곱해져 총 개수가 계산됩니다)" />
                  <span className={styles.choiceOptionTotalHint}>
                    ×{added.quantity} = {formatNumber(choiceTotalQty)}개
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {template.type === 'choice' && template.choices && (template.choices.length > 3 || template.choiceDropdown) && (
          <div className={styles.choiceDropdown}>
            <select className={styles.choiceSelect} value={added.selectedChoiceId || ''}
              onChange={(e) => handleChoiceChange(added.id, e.target.value)}>
              {template.choices.map((choice) => {
                const choicePrice = template.id === 'gem-hero-fixed-select'
                  ? getFixedGemSelectUnitPrice(choice.itemId, latestPrices, goldPerWon)
                  : getItemUnitPrice(choice.itemId, latestPrices);
                return (
                  <option key={choice.itemId} value={choice.itemId}>
                    {choice.name} ({formatNumber(choicePrice)}G)
                  </option>
                );
              })}
            </select>
          </div>
        )}
        {template.boxItem && (
          <div className={styles.innerQuantityRow}>
            <span className={styles.innerQuantityLabel}>상자당</span>
            <input type="number" className={styles.quantityInput}
              value={added.innerQuantity || ''}
              onChange={(e) => handleInnerQuantityChange(added.id, parseInt(e.target.value) || 0)}
              min={0} />
            <span className={styles.innerQuantityLabel}>개</span>
          </div>
        )}
        {template.type === 'bundle' && template.bundleContents && (
          <div className={styles.bundleContentsRow}>
            {template.bundleContents.map((bc) => (
              <div key={bc.itemId} className={styles.innerQuantityRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src={bc.icon} alt={bc.name} style={{ width: 20, height: 20 }} />
                <span className={styles.innerQuantityLabel}>{bc.name}</span>
                <input type="number" className={styles.quantityInput}
                  value={added.bundleQuantities?.[bc.itemId] || ''}
                  onChange={(e) => handleBundleQuantityChange(added.id, bc.itemId, parseInt(e.target.value) || 0)}
                  min={0} />
                <span className={styles.innerQuantityLabel}>개</span>
              </div>
            ))}
          </div>
        )}
        {template.type === 'choiceBox' && (
          <div className={styles.bundleContentsRow}>
            <div className={styles.innerQuantityRow}>
              <span className={styles.innerQuantityLabel}>상자 이름</span>
              <input type="text" className={styles.customNameInput}
                value={added.choiceBoxName ?? ''}
                onChange={(e) => handleChoiceBoxNameChange(added.id, e.target.value)}
                placeholder={template.name} maxLength={30} />
            </div>
            <div className={styles.innerQuantityRow}>
              <span className={styles.innerQuantityLabel}>선택 개수 (N)</span>
              <input type="number" className={styles.quantityInput}
                value={added.choiceBoxPickCount ?? 1}
                onChange={(e) => handleChoiceBoxPickCountChange(added.id, Math.max(1, parseInt(e.target.value) || 1))}
                min={1} />
              <span className={styles.innerQuantityLabel}>개 (보는 사람이 직접 선택)</span>
            </div>
            {(added.choiceBoxCandidates || []).map((cand) => {
              const isTopSelected = (added.choiceBoxSelectedIds || []).includes(cand.id);
              const candPrice = cand.itemId ? getItemUnitPrice(cand.itemId, latestPrices) : (cand.goldPerUnit || 0);
              return (
                <div key={cand.id} className={styles.innerQuantityRow}>
                  {cand.icon && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img loading="lazy" decoding="async" src={cand.icon} alt={cand.name} style={{ width: 20, height: 20 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <span className={styles.innerQuantityLabel} style={{ opacity: isTopSelected ? 1 : 0.55 }}>
                    {cand.name}
                  </span>
                  <input type="number" className={styles.quantityInput}
                    value={cand.quantity}
                    onChange={(e) => handleChoiceBoxCandidateQuantityChange(added.id, cand.id, parseInt(e.target.value) || 1)}
                    min={1} style={{ width: '60px' }} />
                  <span className={styles.innerQuantityLabel}>{formatNumber(candPrice)}G</span>
                  <button type="button" className={styles.removeItemBtn}
                    onClick={() => handleChoiceBoxRemoveCandidate(added.id, cand.id)} title="후보 제거">&times;</button>
                </div>
              );
            })}
            <div className={styles.choiceDropdown}>
              <select className={styles.choiceSelect} value=""
                onChange={(e) => {
                  if (e.target.value) handleChoiceBoxAddCandidate(added.id, e.target.value);
                  e.target.value = '';
                }}>
                <option value="">+ 후보 아이템 추가</option>
                {TEMPLATE_ITEMS.filter((t) => t.type === 'simple').map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {template.type === 'probBox' && (
          <div className={styles.bundleContentsRow}>
            <div className={styles.innerQuantityRow}>
              <span className={styles.innerQuantityLabel}>상자 이름</span>
              <input type="text" className={styles.customNameInput}
                value={added.probBoxName ?? ''}
                onChange={(e) => handleProbBoxNameChange(added.id, e.target.value)}
                placeholder={template.name} maxLength={30} />
            </div>
            {(added.probBoxCandidates || []).map((cand) => {
              const candUnit = cand.itemId ? getItemUnitPrice(cand.itemId, latestPrices) : (cand.goldPerUnit || 0);
              return (
                <div key={cand.id} className={styles.innerQuantityRow}>
                  {cand.icon && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img loading="lazy" decoding="async" src={cand.icon} alt={cand.name} style={{ width: 20, height: 20 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <span className={styles.innerQuantityLabel}>{cand.name}</span>
                  <input type="number" className={styles.quantityInput}
                    value={cand.quantity}
                    onChange={(e) => handleProbBoxCandidateQuantityChange(added.id, cand.id, parseInt(e.target.value) || 1)}
                    min={1} style={{ width: '60px' }} title="개수" />
                  <span className={styles.innerQuantityLabel}>개</span>
                  <input type="number" className={styles.gachaProbInput}
                    value={cand.probability || ''}
                    onChange={(e) => handleProbBoxCandidateProbChange(added.id, cand.id, parseFloat(e.target.value) || 0)}
                    placeholder="%" min={0} max={100} step={0.1} title="등장 확률 (%)" />
                  <span className={styles.gachaProbUnit}>%</span>
                  <span className={styles.innerQuantityLabel}>{formatNumber(candUnit * cand.quantity)}G</span>
                  <button type="button" className={styles.removeItemBtn}
                    onClick={() => handleProbBoxRemoveCandidate(added.id, cand.id)} title="아이템 제거">&times;</button>
                </div>
              );
            })}
            {(added.probBoxCandidates || []).length > 0 && (() => {
              const probSum = (added.probBoxCandidates || []).reduce((s, c) => s + (c.probability || 0), 0);
              const isOk = Math.abs(probSum - 100) < 0.01;
              return (
                <div className={`${styles.gachaProbSum} ${isOk ? styles.gachaProbSumOk : styles.gachaProbSumError}`}>
                  확률 합계: {probSum.toFixed(1)}% {isOk ? `· 기댓값 ${formatNumber(getProbBoxExpectedGold(added.probBoxCandidates, latestPrices))}G` : '(100%가 되어야 합니다)'}
                </div>
              );
            })()}
            <div className={styles.choiceDropdown}>
              <select className={styles.choiceSelect} value=""
                onChange={(e) => {
                  if (e.target.value) handleProbBoxAddCandidate(added.id, e.target.value);
                  e.target.value = '';
                }}>
                <option value="">+ 확률 아이템 추가</option>
                {TEMPLATE_ITEMS.filter((t) => t.type === 'simple').map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {template.type === 'fixed' && (template.fixedGold ?? 0) > 0 &&
          !DYNAMIC_TICKET_IDS.has(template.id) && (
          <div className={styles.fixedPriceBadge}>{formatNumber(template.fixedGold || 0)}G</div>
        )}
      </div>
    );
  };

  // 제출 — 검증 → 아이템 빌드 → onSubmit(페이지가 등록/수정을 결정)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // 더블클릭·Enter 연타 중복 제출 방지

    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = '제목을 입력해주세요.';
    if (addedItems.filter((a) => !a.isBonus).length === 0) errors.items = '아이템을 1개 이상 추가해주세요.';
    if (priceCurrency === 'cash' && royalCrystalPrice <= 0) errors.price = '현금 가격을 입력해주세요.';
    if (priceCurrency === 'blueCrystal' && blueCrystalPrice <= 0) errors.price = '블루크리스탈 가격을 입력해주세요.';
    if (goldPerWon <= 0) errors.rate = '환율을 입력해주세요.';
    // 판매 기간은 선택 입력 — 둘 다 넣었을 때만 순서를 검사한다
    const saleStartDate = fromDatetimeLocalValue(saleStartInput);
    const saleEndDate = fromSaleEndDateValue(saleEndInput); // 날짜만 받고 시각은 오전 6시(KST) 고정
    if (saleStartDate && saleEndDate && saleEndDate.getTime() <= saleStartDate.getTime()) {
      errors.salePeriod = '판매 종료 일시는 시작 일시보다 뒤여야 합니다.';
    }
    if (packageType === '가챠') {
      // 확률은 확정 구성품(main)에만 있다 — 보너스 행을 합산에 넣으면 100% 검증이 어긋난다
      const probSum = addedItems.filter((a) => !a.isBonus)
        .reduce((s, a) => s + (gachaProbabilities[a.id] || 0), 0);
      if (Math.abs(probSum - 100) >= 0.1) errors.prob = '확률 합계가 100%여야 합니다.';
    }
    // 확률 상자: 아이템이 1개 이상 담겨 있고 확률 합계가 100%여야 한다
    for (const a of addedItems) {
      if (!a.isProbBox) continue;
      const cands = a.probBoxCandidates || [];
      const boxName = a.probBoxName?.trim() || '확률 상자';
      if (cands.length === 0) {
        errors.probBox = `${boxName}에 아이템을 1개 이상 담아주세요.`;
        break;
      }
      const sum = cands.reduce((s, c) => s + (c.probability || 0), 0);
      if (Math.abs(sum - 100) >= 0.1) {
        errors.probBox = `${boxName}의 확률 합계가 100%여야 합니다. (현재 ${sum.toFixed(1)}%)`;
        break;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError('');

    try {
      const buildOne = (added: AddedItem): PackageItem | null => {
        if (added.isCustom) {
          return {
            itemId: `custom_${added.templateId}`,
            name: added.customName || '기타',
            ...(added.customShortName ? { shortName: added.customShortName } : {}),
            quantity: added.quantity,
            goldOverride: added.customGoldPerUnit || 0,
          };
        }
        const template = TEMPLATES_MAP[added.templateId];
        if (!template) return null;

        switch (template.type) {
          case 'simple':
            return {
              itemId: template.itemId!,
              name: template.name,
              quantity: added.quantity,
              icon: template.icon,
            };
          case 'choice': {
            const selectedId = added.selectedChoiceId || template.choices?.[0]?.itemId || '';
            const choice = template.choices?.find((c) => c.itemId === selectedId);
            const inner = template.boxItem ? (added.innerQuantity || 1) : 1;
            const boxCount = added.quantity * inner;
            // 선택지별 "박스 1개당 개수"(예: 파괴석 1000개/수호석 5000개처럼 다를 때). 미지정 시 1배(기존과 동일)
            // 최종 개수 = 박스 개수(quantity) × 선택지별 배수 — 상세페이지에서 다른 선택지로 바꿔도 재계산됨
            const choiceOptions = template.choices?.map((c) => ({
              itemId: c.itemId,
              name: c.name,
              ...(c.icon ? { icon: c.icon } : {}),
              quantity: added.choiceQuantities?.[c.itemId] ?? 1,
            }));
            return {
              itemId: selectedId,
              name: choice?.name || template.name,
              quantity: boxCount,
              icon: template.icon,
              choiceOptions,
            };
          }
          case 'gold':
            return {
              itemId: `gold_${template.id}`,
              name: template.name,
              quantity: 1,
              icon: template.icon,
              goldOverride: added.goldAmount || 0,
            };
          case 'fixed': {
            const fixedUnitGold = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
            return {
              itemId: `fixed_${template.id}`,
              name: template.name,
              quantity: added.quantity,
              icon: template.icon,
              goldOverride: Math.round(fixedUnitGold),
            };
          }
          case 'crystal': {
            const unitGold = (template.crystalPerUnit || 0) * goldPerWon * 27.5;
            return {
              itemId: `crystal_${template.id}`,
              name: template.name,
              quantity: added.quantity,
              icon: template.icon,
              goldOverride: unitGold,
              crystalPerUnit: template.crystalPerUnit || 0,
            };
          }
          case 'expected': {
            const expectedGold = (template.expectedItems || []).reduce((sum, ei) => {
              return sum + getItemUnitPrice(ei.itemId, latestPrices) * ei.probability;
            }, 0);
            return {
              itemId: `expected_${template.id}`,
              name: template.name,
              quantity: added.quantity,
              icon: template.icon,
              goldOverride: expectedGold,
            };
          }
          case 'bundle': {
            const bundleItems = (template.bundleContents || [])
              .filter(bc => (added.bundleQuantities?.[bc.itemId] || 0) > 0)
              .map(bc => ({
                itemId: bc.itemId,
                name: bc.name,
                icon: bc.icon,
                quantity: added.bundleQuantities?.[bc.itemId] || 0,
              }));
            const bundleName = bundleItems.map(bi => `${bi.name} ${bi.quantity}개`).join(' + ');
            return {
              itemId: `bundle_${template.id}`,
              name: bundleName || template.name,
              quantity: added.quantity,
              icon: template.icon,
              goldOverride: getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0),
              bundleItems,
            };
          }
          case 'choiceBox':
            return {
              itemId: `choicebox_${added.id}`,
              name: added.choiceBoxName?.trim() || template.name,
              quantity: added.quantity || 1,
              icon: template.icon,
              choiceBoxCandidates: added.choiceBoxCandidates || [],
              choiceBoxPickCount: added.choiceBoxPickCount || 1,
              choiceBoxSelectedIds: added.choiceBoxSelectedIds || [],
            };
          case 'probBox':
            return {
              itemId: `probbox_${added.id}`,
              name: added.probBoxName?.trim() || template.name,
              quantity: added.quantity || 1,
              icon: template.icon,
              probBoxCandidates: added.probBoxCandidates || [],
            };
          default:
            return null;
        }
      };

      // 확률은 만들면서 그 행(added.id)의 값을 바로 붙인다 — 드롭된 아이템이 있어도 안 밀린다
      const buildItems = (list: AddedItem[], withProb: boolean): PackageItem[] => list
        .map((added) => {
          const item = buildOne(added);
          if (!item) return null;
          if (withProb) item.probability = gachaProbabilities[added.id] || 0;
          return item;
        })
        .filter(Boolean) as PackageItem[];

      const mainAdded = addedItems.filter((a) => !a.isBonus);
      const bonusAdded = addedItems.filter((a) => a.isBonus);
      const items = buildItems(mainAdded, packageType === '가챠');
      const bonusItems = packageType === '3+보너스' ? buildItems(bonusAdded, false) : [];

      await onSubmit({
        title: title.trim(),
        packageType,
        royalCrystalPrice: effectiveCashPrice,
        priceCurrency,
        blueCrystalPrice,
        items,
        bonusItems,
        goldPerWon,
        selectableCount,
        bonusSelectableCount: packageType === '3+보너스' ? bonusSelectableCount : 0,
        isNewRelease,
        saleStartAt: saleStartDate,
        saleEndAt: saleEndDate,
        saleClosed,
      });
    } catch (err: any) {
      console.error(isEdit ? '수정 실패:' : '등록 실패:', err);
      setError(isEdit ? '수정에 실패했습니다. 다시 시도해주세요.' : '등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.registerWrapper}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{isEdit ? '패키지 수정' : '패키지 등록'}</h1>
        <p className={styles.pageSubtitle}>
          {isEdit ? '아래 아이템을 클릭하여 패키지를 수정하세요' : '아래 아이템을 클릭하여 패키지에 추가하세요'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.topSplitRow}>
          {/* 좌측: 패키지 구성 */}
          <div className={`${styles.packageBox} ${addedItems.length > 0 ? styles.packageBoxFilled : ''}`}>
            <h2 className={styles.packageBoxTitle}>패키지 구성</h2>
            <div className={styles.packageBoxScroll} ref={scrollRef}>
              {addedItems.length === 0 ? (
                <div className={styles.packageBoxEmpty}>
                  아래 목록에서 아이템을 클릭하여 추가하세요
                </div>
              ) : (
                <div className={styles.packageBoxList}>
                  {addedItems.filter((a) => !a.isBonus).map(renderAddedRow)}
                  {packageType === '3+보너스' && addedItems.some((a) => a.isBonus) && (
                    <div style={{ padding: '0.6rem 0.2rem 0.3rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', marginTop: '0.3rem' }}>
                      보너스 구성품 (3회 구매 시 1회 지급{bonusSelectableCount > 0 ? ` · ${bonusSelectableCount}개 선택` : ''})
                    </div>
                  )}
                  {packageType === '3+보너스' && addedItems.filter((a) => a.isBonus).map(renderAddedRow)}
                </div>
              )}
            </div>
            {addedItems.length > 0 && packageType !== '가챠' && (
              <div className={styles.packageBoxTotal}>
                <span>총 골드 가치</span>
                <span className={styles.packageBoxTotalValue}>{formatNumber(totalGoldValue)} G</span>
              </div>
            )}
            {addedItems.length > 0 && packageType === '가챠' && (() => {
              const probSum = addedItems.filter((a) => !a.isBonus)
                .reduce((s, a) => s + (gachaProbabilities[a.id] || 0), 0);
              const isOk = Math.abs(probSum - 100) < 0.01;
              return (
                <div className={`${styles.gachaProbSum} ${isOk ? styles.gachaProbSumOk : styles.gachaProbSumError}`}>
                  확률 합계: {probSum.toFixed(1)}% {isOk ? '' : '(100%가 되어야 합니다)'}
                </div>
              );
            })()}
          </div>

          {/* 우측: 패키지 정보 + 골드 환율 */}
          <div className={styles.rightPanel}>
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>패키지 정보</h2>
              <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                <label className={styles.formLabel} htmlFor="pkg-title">패키지 이름 *</label>
                <input id="pkg-title" type="text" className={`${styles.formInput} ${fieldErrors.title ? styles.formInputError : ''}`}
                  value={title} onChange={(e) => { setTitle(e.target.value); if (fieldErrors.title) setFieldErrors((p) => { const n = { ...p }; delete n.title; return n; }); }}
                  placeholder="예: 2025 설날 패키지" maxLength={50} />
                {fieldErrors.title && <p className={styles.fieldErrorMsg}>{fieldErrors.title}</p>}
              </div>
              <div className={styles.typeButtonRow}>
                {(['일반', '2+1', '3+1', '3+보너스', '가챠'] as PackageType[]).map((t) => (
                  <button key={t} type="button"
                    className={`${styles.typeButton} ${packageType === t ? styles.typeButtonActive : ''}`}
                    onClick={() => setPackageType(t)}>{t}</button>
                ))}
              </div>
              {packageType !== '가챠' && (
              <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                <label className={styles.formLabel} htmlFor="pkg-selectable">N선택 (0=전체)</label>
                <div className={styles.selectableCountRow}>
                  <input id="pkg-selectable" type="number" className={styles.selectableCountInput}
                    value={selectableCount || ''}
                    onChange={(e) => setSelectableCount(parseInt(e.target.value) || 0)}
                    placeholder="0" min={0} />
                  {selectableCount > 0 && (
                    <span className={styles.selectableCountHint}>
                      {addedItems.length}개 중 {selectableCount}개 선택
                    </span>
                  )}
                </div>
              </div>
              )}
              {packageType === '3+보너스' && (
              <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                <label className={styles.formLabel} htmlFor="pkg-bonus-selectable">보너스 N선택 (0=전체)</label>
                <div className={styles.selectableCountRow}>
                  <input id="pkg-bonus-selectable" type="number" className={styles.selectableCountInput}
                    value={bonusSelectableCount || ''}
                    onChange={(e) => setBonusSelectableCount(parseInt(e.target.value) || 0)}
                    placeholder="0" min={0} />
                  {bonusSelectableCount > 0 && (
                    <span className={styles.selectableCountHint}>
                      보너스 {addedItems.filter((a) => a.isBonus).length}개 중 {bonusSelectableCount}개 선택
                    </span>
                  )}
                </div>
              </div>
              )}
              <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                <label className={styles.formLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginBottom: 0 }}>
                  <input type="checkbox" checked={isNewRelease}
                    onChange={(e) => setIsNewRelease(e.target.checked)} />
                  신규 출시 패키지 (갤러리에 30일간 NEW 배지)
                </label>
              </div>
              <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                <label className={styles.formLabel}>판매 기간 (선택)</label>
                <div className={styles.salePeriodRow}>
                  <input type="datetime-local" className={styles.salePeriodInput}
                    value={saleStartInput}
                    onChange={(e) => { setSaleStartInput(e.target.value); if (fieldErrors.salePeriod) setFieldErrors((p) => { const n = { ...p }; delete n.salePeriod; return n; }); }}
                    aria-label="판매 시작 일시" />
                  <span className={styles.salePeriodSep}>~</span>
                  <input type="date" className={styles.salePeriodInput}
                    value={saleEndInput}
                    onChange={(e) => { setSaleEndInput(e.target.value); if (fieldErrors.salePeriod) setFieldErrors((p) => { const n = { ...p }; delete n.salePeriod; return n; }); }}
                    aria-label="판매 종료일 (오전 6시 종료)" />
                </div>
                <p className={styles.salePeriodHint}>
                  종료는 날짜만 고르면 그 날 오전 6시로 저장됩니다. 지나면 갤러리에서 자동으로 판매 종료로 표시되며, 상시 판매 패키지는 비워두세요.
                </p>
                {isEdit && (
                  <label className={styles.saleClosedToggle}>
                    <input type="checkbox" checked={saleClosed}
                      onChange={(e) => setSaleClosed(e.target.checked)} />
                    판매 종료 처리 (기간과 무관하게 즉시 종료로 표시)
                  </label>
                )}
                {fieldErrors.salePeriod && <p className={styles.fieldErrorMsg}>{fieldErrors.salePeriod}</p>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>패키지 가격 *</label>
                <div className={styles.priceCurrencyToggle}>
                  <button type="button"
                    className={`${styles.priceCurrencyBtn} ${priceCurrency === 'cash' ? styles.priceCurrencyBtnActive : ''}`}
                    onClick={() => setPriceCurrency('cash')}>현금 (원)</button>
                  <button type="button"
                    className={`${styles.priceCurrencyBtn} ${priceCurrency === 'blueCrystal' ? styles.priceCurrencyBtnActive : ''}`}
                    onClick={() => setPriceCurrency('blueCrystal')}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/blue.webp" alt="" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} />
                    블루크리스탈
                  </button>
                </div>
                {priceCurrency === 'cash' ? (
                  <input id="pkg-rc" type="number" className={`${styles.formInput} ${fieldErrors.price ? styles.formInputError : ''}`}
                    value={royalCrystalPrice || ''}
                    onChange={(e) => { setRoyalCrystalPrice(parseInt(e.target.value) || 0); if (fieldErrors.price) setFieldErrors((p) => { const n = { ...p }; delete n.price; return n; }); }}
                    placeholder="예: 33000" min={0} />
                ) : (
                  <div className={styles.bcPriceRow}>
                    <input id="pkg-bc" type="number" className={`${styles.formInput} ${fieldErrors.price ? styles.formInputError : ''}`}
                      value={blueCrystalPrice || ''}
                      onChange={(e) => { setBlueCrystalPrice(parseInt(e.target.value) || 0); if (fieldErrors.price) setFieldErrors((p) => { const n = { ...p }; delete n.price; return n; }); }}
                      placeholder="예: 500" min={0} />
                    {effectiveCashPrice > 0 && (
                      <span className={styles.bcPriceHint}>= {formatNumber(effectiveCashPrice)}원</span>
                    )}
                  </div>
                )}
                {fieldErrors.price && <p className={styles.fieldErrorMsg}>{fieldErrors.price}</p>}
              </div>
            </div>

            <div className={`${styles.rateSection} ${fieldErrors.rate ? styles.rateCardError : ''}`}>
              <div className={styles.rateSectionHeader}>
                <h2 className={styles.sectionTitle}>골드 환율</h2>
                <div className={styles.tradeModeToggle}>
                  <button type="button"
                    className={`${styles.tradeModeBtn} ${tradeMode === 'official' ? styles.tradeModeBtnActive : ''}`}
                    onClick={() => setTradeMode('official')}>공식 거래</button>
                  <button type="button"
                    className={`${styles.tradeModeBtn} ${tradeMode === 'unofficial' ? styles.tradeModeBtnActive : ''}`}
                    onClick={() => setTradeMode('unofficial')}>엄거래</button>
                </div>
              </div>
              {tradeMode === 'unofficial' ? (
                <div className={styles.rateCard}>
                  <div className={styles.ratioRow}>
                    <span className={styles.ratioFixed}>100</span>
                    <span className={styles.ratioSeparator}>:</span>
                    <input type="number" className={styles.ratioInput}
                      value={unofficialRate || ''}
                      onChange={(e) => setUnofficialRate(parseInt(e.target.value) || 0)}
                      placeholder="22" min={0} />
                  </div>
                  <div className={styles.rateResult}>
                    {goldPerWon > 0 ? `1원 = ${goldPerWon.toFixed(2)} G` : '-'}
                  </div>
                </div>
              ) : (
                <div className={styles.rateCard}>
                  <div className={styles.ratioRow}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/royal.webp" alt="" className={styles.officialRateIcon} />
                    <span className={styles.ratioFixed}>2750</span>
                    <span className={styles.ratioSeparator}>=</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/blue.webp" alt="" className={styles.officialRateIcon} />
                    <span className={styles.ratioFixed}>100</span>
                    <span className={styles.ratioSeparator}>=</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src="/gold.webp" alt="" className={styles.officialRateIcon} />
                    <input type="number" className={styles.ratioInput}
                      value={officialGold || ''}
                      onChange={(e) => setOfficialGold(parseInt(e.target.value) || 0)}
                      placeholder="9500" min={0} />
                  </div>
                  <div className={styles.rateResult}>
                    {goldPerWon > 0 ? `100 : ${ratePer100} (1원 = ${goldPerWon.toFixed(2)} G)` : '-'}
                  </div>
                </div>
              )}
              {fieldErrors.rate && <p className={styles.fieldErrorMsg}>{fieldErrors.rate}</p>}
            </div>
          </div>
        </div>{/* topSplitRow */}

        {/* 아이템 추가 그리드 */}
        <div className={styles.availableSection}>
          <h2 className={styles.sectionTitle}>아이템 추가</h2>
          {packageType === '3+보너스' && (
            <div className={styles.typeButtonRow} style={{ marginBottom: '0.6rem' }}>
              <button type="button"
                className={`${styles.typeButton} ${addTarget === 'main' ? styles.typeButtonActive : ''}`}
                onClick={() => setAddTarget('main')}>확정 구성품에 추가</button>
              <button type="button"
                className={`${styles.typeButton} ${addTarget === 'bonus' ? styles.typeButtonActive : ''}`}
                onClick={() => setAddTarget('bonus')}>보너스 구성품에 추가 (3회 구매 시 1회)</button>
            </div>
          )}
          <div className={styles.availableGrid}>
            {TEMPLATE_ITEMS.map((template) => {
              const addedCount = addedCountByTemplate[template.id] || 0;
              return (
                <button key={template.id} type="button"
                  className={`${styles.availableItem} ${addedCount > 0 ? styles.availableItemAdded : ''}`}
                  onClick={() => handleAddItem(template.id)}>
                  <div className={styles.availableItemIconWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={template.icon} alt={template.name}
                      className={styles.availableItemIcon}
                      style={{
                        ...(ICON_SIZE_CATALOG[template.id] ? { maxWidth: ICON_SIZE_CATALOG[template.id], maxHeight: ICON_SIZE_CATALOG[template.id] } : {}),
                        ...(ICON_POSITION[template.id] ? { objectFit: 'cover' as const, objectPosition: ICON_POSITION[template.id] } : {}),
                        ...(ICON_SCALE[template.id] ? { transform: ICON_SCALE[template.id] } : {}),
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {addedCount > 1 && (
                      <span className={styles.availableItemCount}>{addedCount}</span>
                    )}
                  </div>
                  <span className={styles.availableItemName}>{template.name}</span>
                </button>
              );
            })}
            <button type="button"
              className={`${styles.availableItem} ${styles.availableItemCustom}`}
              onClick={handleAddCustomItem}>
              <span className={styles.availableItemCustomPlus}>+</span>
              <span className={styles.availableItemName}>기타 항목 추가</span>
            </button>
          </div>
        </div>

        {/* 계산 결과 사이드바 (fixed) */}
        <div className={styles.calcSidebar}>
          <h3 className={styles.calcSidebarTitle}>계산 결과</h3>
          {packageType === '가챠' && addedItems.length > 0 && effectiveCashPrice > 0 ? (() => {
            // 가챠: 기대값 기반 계산
            const gachaItems: PackageItem[] = addedItems.map((added) => {
              if (added.isCustom) {
                return { itemId: `custom_${added.templateId}`, name: added.customName || '기타', quantity: added.quantity, goldOverride: added.customGoldPerUnit || 0, probability: gachaProbabilities[added.id] || 0 };
              }
              const template = TEMPLATES_MAP[added.templateId];
              if (!template) return { itemId: '', name: '', quantity: 0, probability: 0 };
              const unitPrice = getUnitPrice(added, template, latestPrices, goldPerWon, officialGold || 0);
              const qty = template.type === 'gold' ? 1 : added.quantity;
              const inner = template.boxItem ? (added.innerQuantity || 1) : 1;
              return { itemId: template.itemId || `fixed_${template.id}`, name: template.name, quantity: qty * inner, goldOverride: unitPrice, probability: gachaProbabilities[added.id] || 0 };
            });
            const expectedGold = gachaItems.reduce((s, it) => s + (it.goldOverride || 0) * it.quantity * ((it.probability || 0) / 100), 0);
            const gachaEfficiency = effectiveCashPrice > 0 ? expectedGold / effectiveCashPrice : 0;
            return (
              <>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>기대값</span>
                  <span className={styles.calcValue}>{formatNumber(expectedGold)} G</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>가챠 가격</span>
                  <span className={styles.calcValue}>
                    {priceCurrency === 'blueCrystal'
                      ? `${formatNumber(blueCrystalPrice)} 블크 (${formatNumber(effectiveCashPrice)}원)`
                      : `${formatNumber(effectiveCashPrice)}원`}
                  </span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>기대 효율</span>
                  <span className={styles.calcEfficiency}>{formatNumber(gachaEfficiency)} G/원</span>
                </div>
              </>
            );
          })() : addedItems.length > 0 && effectiveCashPrice > 0 && (
            <>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>1개 골드 가치</span>
                <span className={styles.calcValue}>{formatNumber(totalGoldValue)} G</span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>패키지 가격</span>
                <span className={styles.calcValue}>
                  {priceCurrency === 'blueCrystal'
                    ? `${formatNumber(blueCrystalPrice)} 블크 (${formatNumber(effectiveCashPrice)}원)`
                    : `${formatNumber(effectiveCashPrice)}원`}
                </span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>효율</span>
                <span className={styles.calcEfficiency}>{formatNumber(efficiency)} G/원</span>
              </div>
              {goldPerWon > 0 && (
                <>
                  <hr className={styles.calcDivider} />
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>현금 골드 구매 시</span>
                    <span className={styles.calcValue}>{formatNumber(singleCashGold)} G</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.calcLabel}>1개 구매 이득률</span>
                    <span className={`${styles.calcEfficiency} ${singleBenefit >= 0 ? styles.calcPositive : styles.calcNegative}`}>
                      {singleBenefit >= 0 ? '+' : ''}{singleBenefit.toFixed(1)}%
                    </span>
                  </div>
                  {packageType !== '일반' && (
                    <>
                      <hr className={styles.calcDivider} />
                      {isBonusPkg && bonusGoldValue > 0 && (
                        <div className={styles.calcRow}>
                          <span className={styles.calcLabel}>보너스 구성품 가치 (3회당 1회, 배수 아님)</span>
                          <span className={styles.calcValue}>{formatNumber(bonusGoldValue)}G</span>
                        </div>
                      )}
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>{packageType} 지출</span>
                        <span className={styles.calcValue}>
                          {formatNumber(effectiveCashPrice * buyCount)}원
                        </span>
                      </div>
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>{packageType} 획득</span>
                        <span className={styles.calcValue}>{formatNumber(fullPackageGold)}G</span>
                      </div>
                      <div className={styles.calcRow}>
                        <span className={styles.calcLabel}>{packageType} 이득률</span>
                        <span className={`${styles.calcEfficiency} ${fullBenefit >= 0 ? styles.calcPositive : styles.calcNegative}`}>
                          {fullBenefit >= 0 ? '+' : ''}{fullBenefit.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {error && <p className={styles.errorMsg}>{error}</p>}
          <button type="submit" className={styles.registerButton}
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}>
            {submitting ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정 완료' : '등록하기')}
          </button>
        </div>
      </form>
    </div>
  );
}
