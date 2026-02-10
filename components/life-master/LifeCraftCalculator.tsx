'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { useTheme } from '@/components/ThemeProvider';
import styles from './LifeCraftCalculator.module.css';

// 아이템 ID
const PREMIUM_ABIDOS_FUSION_ID = '6861013';
const ABIDOS_FUSION_ID = '6861012';

// 제작 정보
const CRAFTING_INFO = {
  premium: {
    id: PREMIUM_ABIDOS_FUSION_ID,
    name: '상급 아비도스 융화 재료',
    icon: '/abidos-fusion2.webp?v=3',
    materials: {
      abidos: 43,
      soft: 59,
      normal: 112,
    },
    goldCost: 520,
    output: 10,
  },
  normal: {
    id: ABIDOS_FUSION_ID,
    name: '아비도스 융화 재료',
    icon: '/abidos-fusion.webp?v=3',
    materials: {
      abidos: 33,
      soft: 45,
      normal: 86,
    },
    goldCost: 400,
    output: 10,
  },
};

// 재료 정보
const MATERIALS = {
  abidos: { id: '6884308', name: '아비도스 목재', icon: '/wood1.webp' },
  soft: { id: '6882304', name: '부드러운 목재', icon: '/wood3.webp' },
  normal: { id: '6882301', name: '목재', icon: '/wood2.webp' },
  sturdy: { id: '6882302', name: '튼튼한 목재', icon: '/wood4.webp' },
};

// 교환 비율
const EXCHANGE_RATES = {
  // 직접 교환
  SOFT_TO_NORMAL: 2,      // 부드러운 1개 → 목재 2개 (25→50)
  STURDY_TO_NORMAL: 10,   // 튼튼한 1개 → 목재 10개 (5→50)
  // 가루 변환
  NORMAL_TO_GARU: 0.8,    // 목재 1개 → 가루 0.8개 (100→80)
  SOFT_TO_GARU: 1.6,      // 부드러운 1개 → 가루 1.6개 (50→80)
  // 가루 → 재료
  GARU_TO_SOFT: 0.5,      // 가루 1개 → 부드러운 0.5개 (100→50)
  GARU_TO_STURDY: 0.1,    // 가루 1개 → 튼튼한 0.1개 (100→10)
  GARU_TO_ABIDOS: 0.1,    // 가루 1개 → 아비도스 0.1개 (100→10)
};

const SALE_FEE_PERCENT = 5;
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000; // 10분

type ItemType = 'premium' | 'normal';
type CraftMode = 'buy' | 'owned';
type MaterialPrices = { [key: string]: number };

export default function LifeCraftCalculator() {
  const { theme } = useTheme();

  // 상태
  const [selectedItem, setSelectedItem] = useState<ItemType>('premium');
  const [craftMode, setCraftMode] = useState<CraftMode>('buy');
  const [feeReduction, setFeeReduction] = useState<number>(0);

  // 보유 재료 (보유 모드용)
  const [ownedAbidos, setOwnedAbidos] = useState<number>(0);
  const [ownedSoft, setOwnedSoft] = useState<number>(0);
  const [ownedNormal, setOwnedNormal] = useState<number>(0);
  const [ownedSturdy, setOwnedSturdy] = useState<number>(0);
  const [applyExtraCrafts, setApplyExtraCrafts] = useState<boolean>(false);

  // 가격 데이터 (API에서 가져온 원본 가격)
  const [materialPrices, setMaterialPrices] = useState<MaterialPrices>({});
  const [fusionPrices, setFusionPrices] = useState<{ premium: number; normal: number }>({ premium: 0, normal: 0 });

  // 사용자 직접 입력 가격 (null이면 API 가격 사용)
  const [customMaterialPrices, setCustomMaterialPrices] = useState<{ abidos: number | null; soft: number | null; normal: number | null }>({
    abidos: null,
    soft: null,
    normal: null,
  });
  const [customFusionPrice, setCustomFusionPrice] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceDate, setPriceDate] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [hasManualRefreshed, setHasManualRefreshed] = useState(false);

  // 현재 선택된 아이템 정보
  const currentItem = CRAFTING_INFO[selectedItem];
  // 사용자 입력 가격이 있으면 사용, 없으면 API 가격
  const currentPrice = customFusionPrice !== null ? customFusionPrice : fusionPrices[selectedItem];

  // 모든 가격 데이터 로드 (페이지 방문 시)
  const fetchAllPrices = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      // 모든 아이템 ID (융화재료 2개 + 재료 3개)
      const allItemIds = [
        PREMIUM_ABIDOS_FUSION_ID,
        ABIDOS_FUSION_ID,
        ...Object.values(MATERIALS).map(m => m.id),
      ];

      const response = await fetch('/api/market/batch-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: allItemIds }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.prices) {
          // 융화재료 가격 설정
          const premiumItem = data.prices.find((p: { itemId: string }) => p.itemId === PREMIUM_ABIDOS_FUSION_ID);
          const normalItem = data.prices.find((p: { itemId: string }) => p.itemId === ABIDOS_FUSION_ID);

          setFusionPrices({
            premium: premiumItem?.price || 0,
            normal: normalItem?.price || 0,
          });

          // 재료 가격 설정
          const prices: MaterialPrices = {};
          data.prices.forEach((item: { itemId: string; price: number }) => {
            if (item.itemId !== PREMIUM_ABIDOS_FUSION_ID && item.itemId !== ABIDOS_FUSION_ID) {
              prices[item.itemId] = item.price;
            }
          });
          setMaterialPrices(prices);

          // 현재 시간 저장
          const now = new Date();
          const yy = String(now.getFullYear()).slice(2);
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const hh = String(now.getHours()).padStart(2, '0');
          const min = String(now.getMinutes()).padStart(2, '0');
          setPriceDate(`${yy}.${mm}.${dd} ${hh}:${min}`);

          // 갱신 버튼 누를 때만 쿨다운 시작 (초기 로드 시에는 쿨다운 없음)
          if (!isInitial) {
            setLastRefreshTime(now.getTime());
            setHasManualRefreshed(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 페이지 방문 시 가격 로드
  useEffect(() => {
    fetchAllPrices(true);
  }, [fetchAllPrices]);

  // 쿨다운 타이머 (갱신 버튼 누른 후에만 작동)
  useEffect(() => {
    if (!hasManualRefreshed) return;

    const interval = setInterval(() => {
      if (lastRefreshTime > 0) {
        const elapsed = Date.now() - lastRefreshTime;
        const remaining = Math.max(0, REFRESH_COOLDOWN_MS - elapsed);
        setCooldownRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRefreshTime, hasManualRefreshed]);

  // 가격 갱신 (쿨다운 체크)
  const refreshPrices = useCallback(async () => {
    if (hasManualRefreshed && cooldownRemaining > 0) return;
    await fetchAllPrices(false);
  }, [cooldownRemaining, fetchAllPrices, hasManualRefreshed]);

  // 쿨다운 표시 포맷
  const formatCooldown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // 실제 사용할 100개당 가격 (사용자 입력 우선, 없으면 API 가격)
  // 보유 모드에서는 보유 재료가 있으면 해당 재료 가격 = 0
  const effectiveMaterialPrices = useMemo(() => {
    const baseAbidos = customMaterialPrices.abidos !== null ? customMaterialPrices.abidos : (materialPrices[MATERIALS.abidos.id] || 0);
    const baseSoft = customMaterialPrices.soft !== null ? customMaterialPrices.soft : (materialPrices[MATERIALS.soft.id] || 0);
    const baseNormal = customMaterialPrices.normal !== null ? customMaterialPrices.normal : (materialPrices[MATERIALS.normal.id] || 0);

    // 보유 모드: 보유한 재료는 가격 0
    if (craftMode === 'owned') {
      return {
        abidos: ownedAbidos > 0 ? 0 : baseAbidos,
        soft: ownedSoft > 0 ? 0 : baseSoft,
        normal: ownedNormal > 0 ? 0 : baseNormal,
      };
    }

    return { abidos: baseAbidos, soft: baseSoft, normal: baseNormal };
  }, [materialPrices, customMaterialPrices, craftMode, ownedAbidos, ownedSoft, ownedNormal]);

  // 재료 단가 (개당)
  const materialUnitPrices = useMemo(() => ({
    abidos: effectiveMaterialPrices.abidos / 100,
    soft: effectiveMaterialPrices.soft / 100,
    normal: effectiveMaterialPrices.normal / 100,
  }), [effectiveMaterialPrices]);

  // 보유 모드: 최대 제작 가능 횟수 (모든 재료가 필요)
  const maxCraftsFromOwned = useMemo(() => {
    const { materials } = currentItem;

    // 모든 재료가 필요하므로 하나라도 0이면 제작 불가
    if (ownedAbidos === 0 || ownedSoft === 0 || ownedNormal === 0) return 0;

    const maxByAbidos = Math.floor(ownedAbidos / materials.abidos);
    const maxBySoft = Math.floor(ownedSoft / materials.soft);
    const maxByNormal = Math.floor(ownedNormal / materials.normal);

    return Math.min(maxByAbidos, maxBySoft, maxByNormal);
  }, [currentItem, ownedAbidos, ownedSoft, ownedNormal]);

  // 가루 교환 최적화 계산 (새 알고리즘)
  const garuOptimization = useMemo(() => {
    // 아비도스 1개 획득 비용 비교
    const abidosDirect = materialUnitPrices.abidos;
    const abidosFromNormal = materialUnitPrices.normal * 12.5;
    const abidosFromSoft = materialUnitPrices.soft * 6.25;

    const methods = [
      { name: '직접 구매', cost: abidosDirect, icon: '/wood1.webp' },
      { name: '목재 교환', cost: abidosFromNormal, icon: '/wood2.webp', detail: '목재 12.5 → 가루 10 → 아비도스 1' },
      { name: '부드러운 교환', cost: abidosFromSoft, icon: '/wood3.webp', detail: '부드러운 6.25 → 가루 10 → 아비도스 1' },
    ].sort((a, b) => a.cost - b.cost);

    const bestMethod = methods[0];
    const savings = abidosDirect > 0 ? ((abidosDirect - bestMethod.cost) / abidosDirect) * 100 : 0;

    let extraCrafts = 0;
    let extraDetail: {
      sturdyConverted: number;
      sturdyToNormal: number;
      softToNormalConverted: number;
      softToNormal: number;
      normalToSoftConverted: number;
      normalToSoft: number;
      softUsedForGaru: number;
      normalUsedForGaru: number;
      garuFromSoft: number;
      garuFromNormal: number;
      totalGaru: number;
      extraAbidos: number;
      dustToSoft: number;
      dustToTimber: number;
      usedForCraft: { soft: number; normal: number };
      finalLeftover: {
        abidos: number;
        soft: number;
        normal: number;
        sturdy: number;
        garu: number;
      };
    } | null = null;

    // 재료가 하나라도 있으면 계산
    if (craftMode === 'owned' && (ownedAbidos > 0 || ownedSoft > 0 || ownedNormal > 0 || ownedSturdy > 0)) {
      const { materials } = currentItem;
      const COST_A = materials.abidos; // 43 (상급) or 33 (일반)
      const COST_S = materials.soft;   // 59 or 45
      const COST_T = materials.normal; // 112 or 86

      // 기본 제작 후 남는 재료
      let abydos = maxCraftsFromOwned > 0 ? ownedAbidos - maxCraftsFromOwned * COST_A : ownedAbidos;
      let soft = maxCraftsFromOwned > 0 ? ownedSoft - maxCraftsFromOwned * COST_S : ownedSoft;
      let timber = maxCraftsFromOwned > 0 ? ownedNormal - maxCraftsFromOwned * COST_T : ownedNormal;
      let sturdy = ownedSturdy;
      let dust = 0;

      // 변환 추적용
      let totalSturdyConverted = 0;
      let totalSturdyToTimber = 0;
      let totalDirectSoftToTimber = 0; // 직접 부드러운 → 목재
      let totalTimberToDust = 0;
      let totalSoftToDust = 0;
      let totalDustToAbydos = 0;
      let totalDustToSoft = 0;
      let totalDustToTimber = 0; // 가루 → 부드러운 → 목재 (100가루 → 100목재)

      let craftCount = 0;
      const MAX_ITERATIONS = 100000; // 무한루프 방지

      for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let canCraft = true;

        // Priority 1: 아비도스 목재 채우기 (목표: COST_A)
        if (abydos < COST_A) {
          const needed = COST_A - abydos;
          const costInDust = needed * 10; // 아비도스 1개 = 가루 10개

          // 가루 부족 시 하위 재료 갈아서 가루 확보
          while (dust < costInDust) {
            if (sturdy >= 5) {
              // 튼튼한 → 목재 → 가루 (5튼튼한 → 50목재)
              sturdy -= 5;
              timber += 50;
              totalSturdyConverted += 5;
              totalSturdyToTimber += 50;
            } else if (timber >= 100) {
              // 목재 → 가루 (100목재 → 80가루)
              timber -= 100;
              dust += 80;
              totalTimberToDust += 100;
            } else if (soft >= 50) {
              // 부드러운 → 가루 (50부드러운 → 80가루) - 최후의 수단
              soft -= 50;
              dust += 80;
              totalSoftToDust += 50;
            } else {
              break; // 더 이상 가루를 만들 재료 없음
            }
          }

          // 가루가 충분하면 아비도스 구매
          if (dust >= costInDust) {
            dust -= costInDust;
            abydos += needed;
            totalDustToAbydos += needed;
          } else {
            canCraft = false;
          }
        }

        if (!canCraft) break;

        // Priority 2: 부드러운 목재 채우기 (목표: COST_S)
        if (soft < COST_S) {
          const needed = COST_S - soft;
          const costInDust = needed * 2; // 부드러운 1개 = 가루 2개 (100가루 = 50부드러운)

          // 가루 부족 시 갈아서 확보 (단, soft 갈기는 제외)
          while (dust < costInDust) {
            if (sturdy >= 5) {
              sturdy -= 5;
              timber += 50;
              totalSturdyConverted += 5;
              totalSturdyToTimber += 50;
            } else if (timber >= 100) {
              timber -= 100;
              dust += 80;
              totalTimberToDust += 100;
            } else {
              break;
            }
          }

          if (dust >= costInDust) {
            dust -= costInDust;
            soft += needed;
            totalDustToSoft += needed;
          } else {
            canCraft = false;
          }
        }

        if (!canCraft) break;

        // Priority 3: 일반 목재 채우기 (목표: COST_T)
        if (timber < COST_T) {
          // 3-1. 튼튼한 목재 사용 (1순위: 5개 → 50개)
          while (timber < COST_T && sturdy >= 5) {
            sturdy -= 5;
            timber += 50;
            totalSturdyConverted += 5;
            totalSturdyToTimber += 50;
          }

          // 3-2. 부드러운 목재 여유분 사용 (2순위: 25개 → 50개)
          // 단, 부드러운 목재가 필요량(COST_S) 아래로 내려가면 안됨
          while (timber < COST_T && soft >= (COST_S + 25)) {
            soft -= 25;
            timber += 50;
            totalDirectSoftToTimber += 25;
          }

          // 3-3. 가루 사용 (최후 순위: 100가루 → 50부드러운 → 100목재)
          while (timber < COST_T) {
            if (dust >= 100) {
              dust -= 100;
              timber += 100; // 100가루 → 50부드러운 → 100목재
              totalDustToTimber += 100;
            } else {
              break;
            }
          }

          if (timber < COST_T) {
            canCraft = false;
          }
        }

        if (!canCraft) break;

        // 최종 제작 가능 여부 확인
        if (abydos >= COST_A && soft >= COST_S && timber >= COST_T) {
          abydos -= COST_A;
          soft -= COST_S;
          timber -= COST_T;
          craftCount++;
        } else {
          break;
        }
      }

      if (craftCount > 0) {
        extraCrafts = craftCount;
        extraDetail = {
          sturdyConverted: totalSturdyConverted,
          sturdyToNormal: totalSturdyToTimber,
          softToNormalConverted: totalDirectSoftToTimber,
          softToNormal: totalDirectSoftToTimber * 2, // 25개당 50목재
          normalToSoftConverted: 0,
          normalToSoft: 0,
          softUsedForGaru: totalSoftToDust,
          normalUsedForGaru: totalTimberToDust,
          garuFromSoft: Math.floor(totalSoftToDust * 1.6), // 50 → 80
          garuFromNormal: Math.floor(totalTimberToDust * 0.8), // 100 → 80
          totalGaru: Math.floor(totalSoftToDust * 1.6) + Math.floor(totalTimberToDust * 0.8),
          extraAbidos: totalDustToAbydos,
          dustToSoft: totalDustToSoft,
          dustToTimber: totalDustToTimber,
          usedForCraft: {
            soft: craftCount * COST_S,
            normal: craftCount * COST_T,
          },
          finalLeftover: {
            abidos: abydos,
            soft: soft,
            normal: timber,
            sturdy: sturdy,
            garu: dust,
          }
        };
      }
    }

    return {
      methods,
      bestMethod,
      savings,
      extraCrafts,
      extraDetail,
      prices: {
        abidosDirect,
        abidosFromNormal,
        abidosFromSoft,
      }
    };
  }, [materialUnitPrices, craftMode, maxCraftsFromOwned, currentItem, ownedAbidos, ownedSoft, ownedNormal, ownedSturdy]);

  // 실제 제작 횟수 (구매 모드는 항상 1회, 보유 모드는 최대 + 추가 제작)
  const actualCraftCount = craftMode === 'owned'
    ? maxCraftsFromOwned + (applyExtraCrafts ? garuOptimization.extraCrafts : 0)
    : 1;

  // 보유 재료 변경 시 추가 제작 적용 해제
  useEffect(() => {
    setApplyExtraCrafts(false);
  }, [ownedAbidos, ownedSoft, ownedNormal, ownedSturdy, selectedItem]);

  // 비용 계산
  const calculations = useMemo(() => {
    const { materials, goldCost, output } = currentItem;

    // 재료 비용 (구매 모드만)
    const materialCost = craftMode === 'buy'
      ? (materials.abidos * materialUnitPrices.abidos +
         materials.soft * materialUnitPrices.soft +
         materials.normal * materialUnitPrices.normal) * actualCraftCount
      : 0;

    // 골드 비용 (수수료 감소 적용)
    const actualGoldCost = goldCost * (1 - feeReduction / 100) * actualCraftCount;

    // 총 비용
    const totalCost = materialCost + actualGoldCost;

    // 생산량
    const totalOutput = output * actualCraftCount;

    // 개당 비용
    const costPerUnit = totalOutput > 0 ? totalCost / totalOutput : 0;

    // 직접 사용 손익
    const directProfit = currentPrice - costPerUnit;
    const directProfitTotal = directProfit * totalOutput;
    const directProfitPercent = costPerUnit > 0 ? (directProfit / costPerUnit) * 100 : 0;

    // 판매 손익 (수수료 5%)
    const salePrice = currentPrice * (1 - SALE_FEE_PERCENT / 100);
    const saleProfit = salePrice - costPerUnit;
    const saleProfitTotal = saleProfit * totalOutput;
    const saleProfitPercent = costPerUnit > 0 ? (saleProfit / costPerUnit) * 100 : 0;

    return {
      materialCost,
      actualGoldCost,
      totalCost,
      totalOutput,
      costPerUnit,
      directProfit,
      directProfitTotal,
      directProfitPercent,
      saleProfit,
      saleProfitTotal,
      saleProfitPercent,
    };
  }, [currentItem, craftMode, actualCraftCount, materialUnitPrices, feeReduction, currentPrice]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner animation="border" />
        <p>데이터 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        {/* 메인 카드 */}
        <div className={styles.mainCard}>
        {/* 아이템 선택 */}
        <div className={styles.itemSelector}>
          <button
            className={`${styles.itemBtn} ${selectedItem === 'premium' ? styles.active : ''}`}
            onClick={() => setSelectedItem('premium')}
          >
            <Image src={CRAFTING_INFO.premium.icon} alt="상급" width={32} height={32} />
            <span>상급 아비도스</span>
          </button>
          <button
            className={`${styles.itemBtn} ${selectedItem === 'normal' ? styles.active : ''}`}
            onClick={() => setSelectedItem('normal')}
          >
            <Image src={CRAFTING_INFO.normal.icon} alt="일반" width={32} height={32} />
            <span>아비도스</span>
          </button>
        </div>

        {/* 아이템 정보 헤더 */}
        <div className={styles.itemHeader}>
          <Image
            src={currentItem.icon}
            alt={currentItem.name}
            width={56}
            height={56}
            className={styles.itemIcon}
          />
          <div className={styles.itemInfo}>
            <h2 className={styles.itemName}>{currentItem.name} ×{currentItem.output}</h2>
            <div className={styles.itemPriceRow}>
              <span className={styles.priceLabel}>판매가:</span>
              <div className={styles.priceInputWrapper}>
                <input
                  type="number"
                  value={customFusionPrice !== null ? customFusionPrice : fusionPrices[selectedItem]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomFusionPrice(val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                  }}
                  className={styles.priceInput}
                />
                <span className={styles.priceUnit}>G</span>
              </div>
            </div>
          </div>
        </div>

        {/* 모드 선택 */}
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeBtn} ${craftMode === 'buy' ? styles.active : ''}`}
            onClick={() => setCraftMode('buy')}
          >
            재료 구매 제작
          </button>
          <button
            className={`${styles.modeBtn} ${craftMode === 'owned' ? styles.active : ''}`}
            onClick={() => setCraftMode('owned')}
          >
            재료 보유 제작
          </button>
        </div>

        {/* 보유 재료 입력 (보유 모드만) */}
        {craftMode === 'owned' && (
          <div className={styles.ownedSection}>
            <span className={styles.sectionLabel}>보유 재료 입력</span>
            <div className={styles.ownedInputs}>
              <div className={styles.ownedInput}>
                <Image src={MATERIALS.abidos.icon} alt="아비도스" width={32} height={32} />
                <input
                  type="number"
                  value={ownedAbidos || ''}
                  onChange={(e) => setOwnedAbidos(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
                <span className={styles.requiredAmount}>/{currentItem.materials.abidos}</span>
              </div>
              <div className={styles.ownedInput}>
                <Image src={MATERIALS.sturdy.icon} alt="튼튼한" width={32} height={32} />
                <input
                  type="number"
                  value={ownedSturdy || ''}
                  onChange={(e) => setOwnedSturdy(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
                <span className={styles.requiredAmount}>(교환용)</span>
              </div>
              <div className={styles.ownedInput}>
                <Image src={MATERIALS.soft.icon} alt="부드러운" width={32} height={32} />
                <input
                  type="number"
                  value={ownedSoft || ''}
                  onChange={(e) => setOwnedSoft(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
                <span className={styles.requiredAmount}>/{currentItem.materials.soft}</span>
              </div>
              <div className={styles.ownedInput}>
                <Image src={MATERIALS.normal.icon} alt="목재" width={32} height={32} />
                <input
                  type="number"
                  value={ownedNormal || ''}
                  onChange={(e) => setOwnedNormal(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
                <span className={styles.requiredAmount}>/{currentItem.materials.normal}</span>
              </div>
            </div>
            {maxCraftsFromOwned > 0 && (
              <div className={styles.maxCrafts}>
                최대 제작 가능: <span>{maxCraftsFromOwned}회</span> ({maxCraftsFromOwned * currentItem.output}개)
              </div>
            )}
          </div>
        )}

        {/* 필요 재료 (구매 모드만) */}
        {craftMode === 'buy' && (
          <div className={styles.materialsSection}>
            <div className={styles.materialHeader}>
              <span className={styles.sectionLabel}>필요 재료 (100개당 가격)</span>
            </div>

            <div className={styles.materialsList}>
              <div className={styles.materialItem}>
                <Image src={MATERIALS.abidos.icon} alt="아비도스" width={40} height={40} className={styles.materialIcon} />
                <div className={styles.materialInfo}>
                  <span className={styles.materialName}>아비도스 목재</span>
                  <span className={styles.materialQty}>
                    {currentItem.materials.abidos * actualCraftCount} <span>/ {currentItem.materials.abidos}</span>
                  </span>
                </div>
                <div className={styles.materialPriceInput}>
                  <input
                    type="number"
                    value={customMaterialPrices.abidos !== null ? customMaterialPrices.abidos : (materialPrices[MATERIALS.abidos.id] || 0)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomMaterialPrices(prev => ({
                        ...prev,
                        abidos: val === '' ? 0 : Math.max(0, parseInt(val) || 0)
                      }));
                    }}
                    className={styles.matPriceField}
                  />
                  <span>G</span>
                </div>
              </div>

              <div className={styles.materialItem}>
                <Image src={MATERIALS.soft.icon} alt="부드러운" width={40} height={40} className={styles.materialIcon} />
                <div className={styles.materialInfo}>
                  <span className={styles.materialName}>부드러운 목재</span>
                  <span className={styles.materialQty}>
                    {currentItem.materials.soft * actualCraftCount} <span>/ {currentItem.materials.soft}</span>
                  </span>
                </div>
                <div className={styles.materialPriceInput}>
                  <input
                    type="number"
                    value={customMaterialPrices.soft !== null ? customMaterialPrices.soft : (materialPrices[MATERIALS.soft.id] || 0)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomMaterialPrices(prev => ({
                        ...prev,
                        soft: val === '' ? 0 : Math.max(0, parseInt(val) || 0)
                      }));
                    }}
                    className={styles.matPriceField}
                  />
                  <span>G</span>
                </div>
              </div>

              <div className={styles.materialItem}>
                <Image src={MATERIALS.normal.icon} alt="목재" width={40} height={40} className={styles.materialIcon} />
                <div className={styles.materialInfo}>
                  <span className={styles.materialName}>목재</span>
                  <span className={styles.materialQty}>
                    {currentItem.materials.normal * actualCraftCount} <span>/ {currentItem.materials.normal}</span>
                  </span>
                </div>
                <div className={styles.materialPriceInput}>
                  <input
                    type="number"
                    value={customMaterialPrices.normal !== null ? customMaterialPrices.normal : (materialPrices[MATERIALS.normal.id] || 0)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomMaterialPrices(prev => ({
                        ...prev,
                        normal: val === '' ? 0 : Math.max(0, parseInt(val) || 0)
                      }));
                    }}
                    className={styles.matPriceField}
                  />
                  <span>G</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 비용 계산 섹션 - 재료 구매 모드 */}
        {craftMode === 'buy' && (
          <div className={styles.costCalcSection}>
            <div className={styles.costCalcHeader}>
              <span className={styles.costCalcTitle}>비용 계산</span>
              <div className={styles.feeInputInline}>
                <span>수수료 감소</span>
                <input
                  type="number"
                  value={feeReduction || ''}
                  onChange={(e) => setFeeReduction(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  placeholder="0"
                />
                <span>%</span>
              </div>
            </div>
            <div className={styles.costCalcBody}>
              <div className={styles.costCalcRow}>
                <span>제작 비용</span>
                <div className={styles.costCalcValue}>
                  <span>{Math.round(calculations.actualGoldCost).toLocaleString()}</span>
                  <Image src="/gold.webp" alt="골드" width={14} height={14} />
                </div>
              </div>
              <div className={styles.costCalcRow}>
                <span>재료 비용</span>
                <div className={styles.costCalcValue}>
                  <span>{Math.round(calculations.materialCost).toLocaleString()}</span>
                  <Image src="/gold.webp" alt="골드" width={14} height={14} />
                </div>
              </div>
              <div className={`${styles.costCalcRow} ${styles.costCalcTotal}`}>
                <span>총 비용 ({calculations.totalOutput}개)</span>
                <div className={styles.costCalcValue}>
                  <span>{Math.round(calculations.totalCost).toLocaleString()}</span>
                  <Image src="/gold.webp" alt="골드" width={14} height={14} />
                </div>
              </div>
              <div className={`${styles.costCalcRow} ${styles.costCalcPerUnit}`}>
                <span>개당 제작 비용</span>
                <div className={styles.costCalcValue}>
                  <span className={styles.perUnitValue}>{calculations.costPerUnit.toFixed(1)}</span>
                  <Image src="/gold.webp" alt="골드" width={16} height={16} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 제작 결과 & 비용 계산 섹션 - 재료 보유 모드 */}
        {craftMode === 'owned' && actualCraftCount > 0 && (
          <div className={styles.craftResultSection}>
            {/* 왼쪽: 제작 결과물 */}
            <div className={styles.craftResultLeft}>
              <div className={styles.craftResultMain}>
                <Image
                  src={currentItem.icon}
                  alt={currentItem.name}
                  width={56}
                  height={56}
                  className={styles.craftResultIcon}
                />
                <span className={styles.craftResultCount}>× {calculations.totalOutput}</span>
              </div>
              <div className={styles.craftResultValue}>
                <div className={styles.valueRow}>
                  <span>판매가</span>
                  <div className={styles.valueAmount}>
                    <span>{(calculations.totalOutput * currentPrice).toLocaleString()}</span>
                    <Image src="/gold.webp" alt="골드" width={14} height={14} />
                  </div>
                </div>
                <div className={styles.valueRow}>
                  <span>수수료 제외</span>
                  <div className={styles.valueAmount}>
                    <span className={styles.netValue}>{Math.floor(calculations.totalOutput * currentPrice * 0.95).toLocaleString()}</span>
                    <Image src="/gold.webp" alt="골드" width={14} height={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 비용 계산 */}
            <div className={styles.costCalcRight}>
              <div className={styles.costCalcHeader}>
                <span className={styles.costCalcTitle}>비용 계산</span>
                <div className={styles.feeInputInline}>
                  <span>수수료 감소</span>
                  <input
                    type="number"
                    value={feeReduction || ''}
                    onChange={(e) => setFeeReduction(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className={styles.costCalcBody}>
                <div className={styles.costCalcRow}>
                  <span>제작 비용</span>
                  <div className={styles.costCalcValue}>
                    <span>{Math.round(calculations.actualGoldCost).toLocaleString()}</span>
                    <Image src="/gold.webp" alt="골드" width={14} height={14} />
                  </div>
                </div>
                <div className={`${styles.costCalcRow} ${styles.costCalcTotal}`}>
                  <span>총 비용</span>
                  <div className={styles.costCalcValue}>
                    <span>{Math.round(calculations.totalCost).toLocaleString()}</span>
                    <Image src="/gold.webp" alt="골드" width={14} height={14} />
                  </div>
                </div>
                <div className={`${styles.costCalcRow} ${styles.costCalcPerUnit}`}>
                  <span>개당 비용</span>
                  <div className={styles.costCalcValue}>
                    <span className={styles.perUnitValue}>{calculations.costPerUnit.toFixed(1)}</span>
                    <Image src="/gold.webp" alt="골드" width={16} height={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 손익 결과 - 카드형 */}
        {actualCraftCount > 0 && (
          <div className={styles.resultSection}>
            <div className={styles.priceCards}>
              <div className={styles.priceCard}>
                <span className={styles.cardLabel}>개당 제작 비용</span>
                <div className={styles.cardValueRow}>
                  <span className={styles.cardValue}>{calculations.costPerUnit.toFixed(1)}</span>
                  <Image src="/gold.webp" alt="골드" width={18} height={18} />
                </div>
              </div>
              <div className={styles.priceCard}>
                <span className={styles.cardLabel}>개당 판매가</span>
                <div className={styles.cardValueRow}>
                  <span className={styles.cardValue}>{currentPrice.toLocaleString()}</span>
                  <Image src="/gold.webp" alt="골드" width={18} height={18} />
                </div>
                <span className={styles.cardSub}>(5% 제외: {(currentPrice * 0.95).toFixed(1)})</span>
              </div>
              <div className={styles.profitCardNew}>
                <div className={`${styles.profitItem} ${calculations.directProfit >= 0 ? styles.profitBg : styles.lossBg}`}>
                  <span className={styles.profitLabel}>직접사용</span>
                  <span className={styles.profitPercent}>
                    {calculations.directProfit >= 0 ? '+' : ''}{calculations.directProfitPercent.toFixed(1)}%
                  </span>
                </div>
                <div className={`${styles.profitItem} ${calculations.saleProfit >= 0 ? styles.profitBg : styles.lossBg}`}>
                  <span className={styles.profitLabel}>판매시</span>
                  <span className={styles.profitPercent}>
                    {calculations.saleProfit >= 0 ? '+' : ''}{calculations.saleProfitPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* 사이드바 */}
        <div className={styles.sidebar}>
          {/* 시세 갱신 버튼 */}
          <div className={styles.refreshCard}>
            <button
              onClick={refreshPrices}
              disabled={isRefreshing || (hasManualRefreshed && cooldownRemaining > 0)}
              className={styles.refreshBtnSidebar}
            >
              {isRefreshing ? (
                <Spinner animation="border" size="sm" />
              ) : hasManualRefreshed && cooldownRemaining > 0 ? (
                <>
                  <span>갱신 대기</span>
                  <span className={styles.cooldownTimer}>{formatCooldown(cooldownRemaining)}</span>
                </>
              ) : (
                <>
                  <Image src="/gold.webp" alt="골드" width={20} height={20} />
                  <span>시세 갱신</span>
                </>
              )}
            </button>
            {priceDate && (
              <span className={styles.priceDateSidebar}>기준: {priceDate}</span>
            )}
          </div>

          {/* 가루 교환 최적화 */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <Image src="/rkfn.webp" alt="가루" width={24} height={24} />
              <span>생활의 가루 최적화</span>
            </div>

            {craftMode === 'buy' ? (
              // 구매 모드: 최저가 획득 방법
              <div className={styles.sidebarContent}>
                <div className={styles.sidebarTitle}>아비도스 목재 1개 획득 비용</div>

                {garuOptimization.methods.map((method, idx) => (
                  <div
                    key={method.name}
                    className={`${styles.methodRow} ${idx === 0 ? styles.bestMethod : ''}`}
                  >
                    <div className={styles.methodInfo}>
                      <Image src={method.icon} alt={method.name} width={28} height={28} />
                      <span className={styles.methodName}>{method.name}</span>
                    </div>
                    <span className={styles.methodCost}>
                      {method.cost > 0 ? `${method.cost.toFixed(2)} G` : '-'}
                    </span>
                  </div>
                ))}

                {garuOptimization.bestMethod.name !== '직접 구매' && garuOptimization.savings > 0 && (
                  <div className={styles.savingsBox}>
                    <div className={styles.savingsTitle}>
                      {garuOptimization.bestMethod.name}이 최적!
                    </div>
                    <div className={styles.savingsPercent}>
                      {garuOptimization.savings.toFixed(1)}% 절약
                    </div>
                    <div className={styles.savingsDetail}>
                      {garuOptimization.bestMethod.detail}
                    </div>
                  </div>
                )}

                {garuOptimization.bestMethod.name === '직접 구매' && (
                  <div className={styles.directBestBox}>
                    직접 구매가 가장 저렴합니다
                  </div>
                )}
              </div>
            ) : (
              // 보유 모드: 남는 재료 활용
              <div className={styles.sidebarContent}>
                <div className={styles.sidebarTitle}>남는 재료 활용</div>

                {garuOptimization.extraCrafts > 0 && garuOptimization.extraDetail ? (
                  <>
                    <div className={styles.extraBox}>
                      <div className={styles.extraTitle}>
                        추가 {garuOptimization.extraCrafts}회 제작 가능!
                      </div>
                      <div className={styles.extraOutput}>
                        (+{garuOptimization.extraCrafts * currentItem.output}개)
                      </div>
                    </div>

                    <div className={styles.exchangeSteps}>
                      <div className={styles.stepTitle}>교환 과정</div>

                      {/* 튼튼한 → 목재 변환 */}
                      {garuOptimization.extraDetail.sturdyConverted > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/wood4.webp" alt="튼튼한" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.sturdyConverted}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/wood2.webp" alt="목재" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.sturdyToNormal}개</span>
                        </div>
                      )}

                      {/* 부드러운 → 목재 변환 */}
                      {garuOptimization.extraDetail.softToNormalConverted > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/wood3.webp" alt="부드러운" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.softToNormalConverted}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/wood2.webp" alt="목재" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.softToNormal}개</span>
                        </div>
                      )}

                      {/* 목재 → 가루 → 부드러운 변환 */}
                      {garuOptimization.extraDetail.normalToSoftConverted > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/wood2.webp" alt="목재" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.normalToSoftConverted}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/wood3.webp" alt="부드러운" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.normalToSoft}개</span>
                        </div>
                      )}

                      {/* 부드러운 → 가루 변환 */}
                      {garuOptimization.extraDetail.softUsedForGaru > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/wood3.webp" alt="부드러운" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.softUsedForGaru}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/rkfn.webp" alt="가루" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.garuFromSoft}개</span>
                        </div>
                      )}

                      {/* 목재 → 가루 변환 */}
                      {garuOptimization.extraDetail.normalUsedForGaru > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/wood2.webp" alt="목재" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.normalUsedForGaru}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/rkfn.webp" alt="가루" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.garuFromNormal}개</span>
                        </div>
                      )}

                      {/* 가루 → 아비도스 변환 */}
                      {garuOptimization.extraDetail.extraAbidos > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/rkfn.webp" alt="가루" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.extraAbidos * 10}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/wood1.webp" alt="아비도스" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.extraAbidos}개</span>
                        </div>
                      )}

                      {/* 가루 → 부드러운 변환 */}
                      {garuOptimization.extraDetail.dustToSoft > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/rkfn.webp" alt="가루" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.dustToSoft * 2}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/wood3.webp" alt="부드러운" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.dustToSoft}개</span>
                        </div>
                      )}

                      {/* 가루 → 목재 변환 (via 부드러운) */}
                      {garuOptimization.extraDetail.dustToTimber > 0 && (
                        <div className={styles.stepRow}>
                          <Image src="/rkfn.webp" alt="가루" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.dustToTimber}개</span>
                          <span className={styles.arrow}>→</span>
                          <Image src="/wood2.webp" alt="목재" width={24} height={24} />
                          <span>{garuOptimization.extraDetail.dustToTimber}개</span>
                        </div>
                      )}
                    </div>

                    {/* 적용하기 버튼 */}
                    <button
                      onClick={() => setApplyExtraCrafts(!applyExtraCrafts)}
                      className={`${styles.applyExtraBtn} ${applyExtraCrafts ? styles.applied : ''}`}
                    >
                      {applyExtraCrafts ? '적용 해제' : '계산에 적용하기'}
                    </button>
                    {applyExtraCrafts && (
                      <>
                        <div className={styles.appliedNotice}>
                          총 {actualCraftCount}회 ({actualCraftCount * currentItem.output}개) 계산 중
                        </div>
                        {garuOptimization.extraDetail?.finalLeftover && (
                          <div className={styles.leftoverSection}>
                            <div className={styles.leftoverTitle}>제작 후 남는 재료</div>
                            <div className={styles.leftoverItems}>
                              {garuOptimization.extraDetail.finalLeftover.abidos > 0 && (
                                <div className={styles.leftoverItem}>
                                  <Image src="/wood1.webp" alt="아비도스" width={20} height={20} />
                                  <span>{garuOptimization.extraDetail.finalLeftover.abidos}</span>
                                </div>
                              )}
                              {garuOptimization.extraDetail.finalLeftover.soft > 0 && (
                                <div className={styles.leftoverItem}>
                                  <Image src="/wood3.webp" alt="부드러운" width={20} height={20} />
                                  <span>{garuOptimization.extraDetail.finalLeftover.soft}</span>
                                </div>
                              )}
                              {garuOptimization.extraDetail.finalLeftover.normal > 0 && (
                                <div className={styles.leftoverItem}>
                                  <Image src="/wood2.webp" alt="목재" width={20} height={20} />
                                  <span>{garuOptimization.extraDetail.finalLeftover.normal}</span>
                                </div>
                              )}
                              {garuOptimization.extraDetail.finalLeftover.sturdy > 0 && (
                                <div className={styles.leftoverItem}>
                                  <Image src="/wood4.webp" alt="튼튼한" width={20} height={20} />
                                  <span>{garuOptimization.extraDetail.finalLeftover.sturdy}</span>
                                </div>
                              )}
                              {garuOptimization.extraDetail.finalLeftover.garu > 0 && (
                                <div className={styles.leftoverItem}>
                                  <Image src="/rkfn.webp" alt="가루" width={20} height={20} />
                                  <span>{garuOptimization.extraDetail.finalLeftover.garu}</span>
                                </div>
                              )}
                              {garuOptimization.extraDetail.finalLeftover.abidos === 0 &&
                               garuOptimization.extraDetail.finalLeftover.soft === 0 &&
                               garuOptimization.extraDetail.finalLeftover.normal === 0 &&
                               garuOptimization.extraDetail.finalLeftover.sturdy === 0 &&
                               garuOptimization.extraDetail.finalLeftover.garu === 0 && (
                                <span className={styles.noLeftover}>남는 재료 없음</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : maxCraftsFromOwned > 0 ? (
                  <div className={styles.noExtraBox}>
                    남는 재료로 추가 제작이 어렵습니다
                  </div>
                ) : (
                  <div className={styles.noExtraBox}>
                    보유 재료를 입력해주세요
                  </div>
                )}
              </div>
            )}

            {/* 교환 비율 참고 */}
            <div className={styles.exchangeRef}>
              <div className={styles.refTitle}>직접 교환</div>
              <div className={styles.refRow}>부드러운 25 → 목재 50</div>
              <div className={styles.refRow}>튼튼한 5 → 목재 50</div>
              <div className={styles.refTitle} style={{ marginTop: '8px' }}>가루 변환</div>
              <div className={styles.refRow}>목재 100 → 가루 80</div>
              <div className={styles.refRow}>부드러운 50 → 가루 80</div>
              <div className={styles.refTitle} style={{ marginTop: '8px' }}>가루 → 재료</div>
              <div className={styles.refRow}>가루 100 → 부드러운 50</div>
              <div className={styles.refRow}>가루 100 → 튼튼한 10</div>
              <div className={styles.refRow}>가루 100 → 아비도스 10</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
