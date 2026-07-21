'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import Image from 'next/image';
import styles from './WangapSimulator.module.css';
import {
  WANGAP_BASE_PROBABILITY,
  WANGAP_MATERIAL_COSTS,
  WANGAP_MATERIAL_IDS,
  WANGAP_JANGIN_DIVIDER,
  WANGAP_MAX_LEVEL,
  WANGAP_PROMOTION_AT,
  WANGAP_PROMOTION_COSTS,
  WANGAP_PROMOTION_MATERIALS,
  WANGAP_ITEM_IMAGES,
  WANGAP_GRADE_ORDER,
  WANGAP_GRADE_RANGES,
  getWangapBreathEffect,
  type WangapGrade,
} from '../../lib/wangapData';
import { MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import {
  COST_ROWS,
  PRICED_COST_KEYS,
  createZeroCost,
  type OptMatKey,
  type WangapCostTotals,
} from './wangapShared';

type WangapHistoryEntry =
  | {
      type: 'attempt';
      number: number;
      level: number;          // 시도 당시 레벨
      grade: WangapGrade;     // 시도 당시 등급
      success: boolean;
      guaranteed: boolean;
      probability: number;
      janginBefore: number;
      janginAfter: number;
    }
  | {
      type: 'promotion';
      number: number;
      level: number;          // 승급 당시 레벨
      grade: WangapGrade;     // 승급 후 등급
    };

type AccumulatedCost = WangapCostTotals;

const MANUAL_REVEAL_DELAY = 650;
const AUTO_REVEAL_DELAY = 0; // 자동강화는 배속이 정확히 지켜지도록 즉시 판정
// 자동강화 장시간 구동 시 렌더 비용이 계속 커지지 않도록 기록 "표시"는 최근 N개만 유지
// (총 시도/성공/실패 통계는 별도 카운터로 전체 누적)
const MAX_HISTORY = 300;

export default function WangapSimulator() {
  // === 강화 상태 ===
  const [currentLevel, setCurrentLevel] = useState(0);
  const [grade, setGrade] = useState<WangapGrade>('전설');
  const [jangin, setJangin] = useState(0);
  const [probBonus, setProbBonus] = useState(0);
  const [useLava, setUseLava] = useState(false);
  const [useGlacier, setUseGlacier] = useState(false);

  // 등급 카드 사이 승급 재료 상세 패널
  const [openPromoInfo, setOpenPromoInfo] = useState<'유물' | '고대' | null>(null);
  const [history, setHistory] = useState<WangapHistoryEntry[]>([]);
  // 전체 누적 통계 (기록 리스트는 MAX_HISTORY개만 표시하므로 별도 유지)
  const [totals, setTotals] = useState({ attempts: 0, success: 0, fail: 0 });
  const [accumulatedCost, setAccumulatedCost] = useState<AccumulatedCost>(createZeroCost());
  const [confirmReset, setConfirmReset] = useState(false);

  // === 진행 상태 (연출 없음 — 결과는 강화 기록에만 표시) ===
  const [isBusy, setIsBusy] = useState(false);

  // === 자동강화 ===
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoTargetLevel, setAutoTargetLevel] = useState(0);
  const [autoSettings, setAutoSettings] = useState({ useLava: false, useGlacier: false, speed: 1000 });
  // 현재/목표 단계 직접 입력 초안 (커밋 시 실제 상태 반영)
  const [levelDraft, setLevelDraft] = useState('0');
  const [targetDraft, setTargetDraft] = useState('');

  // === 거래소 시세 ===
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [goldIncludeMap, setGoldIncludeMap] = useState<Record<string, boolean>>({
    파괴석결정: true, 수호석결정: true, 위대한돌파석: true, 상급아비도스: true,
    운명파편: true, 골드: true, 용암: true, 빙하: true,
  });

  const busyRef = useRef(false);
  const isAutoModeRef = useRef(false);
  const entryNoRef = useRef(0); // 기록 번호 — 리스트를 잘라내도 번호가 이어지도록 ref로 관리
  const autoPauseUntilRef = useRef(0); // 자동강화 중 성공 직후 일시정지 시각
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const autoWrapRef = useRef<HTMLDivElement>(null);
  const latestStateRef = useRef({ currentLevel: 0, grade: '전설' as WangapGrade, autoTargetLevel: 0 });
  const attemptRef = useRef<() => void>(() => {});

  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  // 현재 단계 입력칸은 실제 레벨과 동기화 (강화 성공·승급·초기화 반영)
  useEffect(() => {
    setLevelDraft(String(currentLevel));
  }, [currentLevel]);

  // 거래소 가격 로드 — latest.json만 조회 (개당 가격으로 환산)
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { fetchLatestPrices } = await import('@/lib/price-history-client');
        const latest = await fetchLatestPrices();
        const prices: Record<string, number> = {};
        Object.entries(latest).forEach(([itemId, bundlePrice]) => {
          const bundleSize = MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1;
          prices[itemId] = bundlePrice / bundleSize;
        });
        setMarketPrices(prices);
      } catch (error) {
        console.error('Failed to fetch latest prices:', error);
      }
    };
    fetchMarketPrices();
  }, []);

  // 기록 자동 스크롤 (컨테이너 내부만 — 페이지 스크롤은 건드리지 않음)
  useEffect(() => {
    const el = historyContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  // 자동강화 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!showAutoSettings) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (autoWrapRef.current && !autoWrapRef.current.contains(e.target as Node)) {
        setShowAutoSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAutoSettings]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const getBaseProb = (level: number): number => WANGAP_BASE_PROBABILITY[level] ?? 0;

  // 등급별 강화 구간: 전설 0~15 / 유물 15~20 / 고대 20~25
  const gradeRange = WANGAP_GRADE_RANGES[grade];
  const nextGrade = WANGAP_PROMOTION_AT[grade]?.next; // 전설→유물, 유물→고대 (고대는 없음)

  const isMaxed = currentLevel >= WANGAP_MAX_LEVEL;
  const atGradeCap = !isMaxed && currentLevel >= gradeRange.max; // 등급 상한 도달 (전설 +15 / 유물 +20)
  const canEnhance = !isMaxed && !atGradeCap && getBaseProb(currentLevel) > 0;

  // 숨결 개수를 받아 최종 확률 계산
  const calcProbWith = (nLava: number, nGlacier: number): number => {
    const base = getBaseProb(currentLevel);
    if (base === 0) return 0;
    if (jangin >= 1) return 1;
    const capped = Math.min(base + probBonus, base * 2);
    const eff = getWangapBreathEffect(base);
    return Math.min(capped + (nLava + nGlacier) * eff.per, 1);
  };

  // 이번 시도에 사용할 숨결 개수 (수동 토글 = 풀숨)
  const getAttemptBreaths = (level: number): { lava: number; glacier: number } => {
    const eff = getWangapBreathEffect(getBaseProb(level));
    return { lava: useLava ? eff.max : 0, glacier: useGlacier ? eff.max : 0 };
  };

  // === 강화 시도 ===
  const attemptEnhance = () => {
    if (busyRef.current) return;
    const level = latestStateRef.current.currentLevel;
    const base = getBaseProb(level);
    if (base === 0) return;

    busyRef.current = true;
    setIsBusy(true);

    const breaths = getAttemptBreaths(level);
    const finalProb = calcProbWith(breaths.lava, breaths.glacier);
    const guaranteed = jangin >= 1;
    const success = guaranteed || Math.random() < finalProb;
    const janginBefore = jangin;

    // 재료 즉시 소모 (결과와 무관)
    const materialCost = WANGAP_MATERIAL_COSTS[level + 1];
    setAccumulatedCost(prev => {
      const next = { ...prev };
      if (materialCost) {
        next.파괴석결정 += materialCost.파괴석결정;
        next.수호석결정 += materialCost.수호석결정;
        next.위대한돌파석 += materialCost.위대한돌파석;
        next.상급아비도스 += materialCost.상급아비도스;
        next.운명파편 += materialCost.운명파편;
        next.실링 += materialCost.실링;
        next.골드 += materialCost.골드;
      }
      next.용암 += breaths.lava;
      next.빙하 += breaths.glacier;
      return next;
    });

    const delay = isAutoModeRef.current ? AUTO_REVEAL_DELAY : MANUAL_REVEAL_DELAY;
    revealTimerRef.current = setTimeout(() => {
      let janginAfter = janginBefore;

      if (success) {
        const newLevel = level + 1;
        setCurrentLevel(newLevel);
        setJangin(0);
        setProbBonus(0);
        janginAfter = 0;

        // 자동강화: 목표 레벨 또는 현재 등급 상한 도달 시 정지 (승급은 수동)
        const cap = WANGAP_GRADE_RANGES[latestStateRef.current.grade].max;
        if (isAutoModeRef.current && (newLevel >= latestStateRef.current.autoTargetLevel || newLevel >= cap)) {
          stopAutoEnhance();
        } else if (isAutoModeRef.current) {
          // 빠른 배속에서도 성공 순간을 볼 수 있게 잠시 멈췄다가 재개
          autoPauseUntilRef.current = Date.now() + 900;
        }
      } else {
        janginAfter = Math.min(janginBefore + finalProb / WANGAP_JANGIN_DIVIDER, 1);
        setJangin(janginAfter);
        setProbBonus(prev => Math.min(prev + base * 0.1, base));
      }

      setTotals(prev => ({
        attempts: prev.attempts + 1,
        success: prev.success + (success ? 1 : 0),
        fail: prev.fail + (success ? 0 : 1),
      }));
      entryNoRef.current += 1;
      setHistory(prev => {
        const next = [...prev, {
          type: 'attempt' as const,
          number: entryNoRef.current,
          level,
          grade: latestStateRef.current.grade,
          success,
          guaranteed,
          probability: finalProb,
          janginBefore,
          janginAfter,
        }];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });

      busyRef.current = false;
      setIsBusy(false);
    }, delay);
  };

  // === 승급 (강화 플로우와 분리 — 등급 상한 도달 시 수동으로 실행) ===
  const promoteTo = (next: '유물' | '고대') => {
    if (busyRef.current) return;
    const level = latestStateRef.current.currentLevel;

    busyRef.current = true;
    setIsBusy(true);

    const promoCost = WANGAP_PROMOTION_COSTS[next];
    const matKey: keyof AccumulatedCost = next === '유물' ? '승급재료유물' : '승급재료고대';
    setAccumulatedCost(prev => ({
      ...prev,
      [matKey]: prev[matKey] + promoCost.벨가르딘재료,
      골드: prev.골드 + promoCost.골드,
    }));

    revealTimerRef.current = setTimeout(() => {
      setGrade(next);
      setJangin(0);
      setProbBonus(0);

      entryNoRef.current += 1;
      setHistory(prev => {
        const entries = [...prev, {
          type: 'promotion' as const,
          number: entryNoRef.current,
          level,
          grade: next,
        }];
        return entries.length > MAX_HISTORY ? entries.slice(entries.length - MAX_HISTORY) : entries;
      });

      busyRef.current = false;
      setIsBusy(false);
    }, MANUAL_REVEAL_DELAY);
  };

  // === 등급 선택 (장비 설정) ===
  // 상한 도달 상태에서 다음 등급을 고르면 승급으로 처리(재료·골드 합산),
  // 그 외에는 비용 없는 장비 설정 전환으로 해당 등급 시작 레벨부터 진행
  const selectGrade = (g: WangapGrade) => {
    if (g === grade || isBusy || isAutoMode) return;
    if (atGradeCap && nextGrade === g) {
      promoteTo(nextGrade);
      return;
    }
    setGrade(g);
    setCurrentLevel(WANGAP_GRADE_RANGES[g].min);
    setJangin(0);
    setProbBonus(0);
  };

  // 자동강화 interval이 항상 최신 상태·함수를 보도록 렌더마다 ref 갱신
  useEffect(() => {
    latestStateRef.current = { currentLevel, grade, autoTargetLevel };
    attemptRef.current = attemptEnhance;
  });

  // === 자동강화 ===
  const startAutoEnhance = () => {
    const target = Math.min(autoTargetLevel, gradeRange.max);
    if (target <= currentLevel) return;
    if (target !== autoTargetLevel) {
      setAutoTargetLevel(target);
      setTargetDraft(String(target));
    }
    setUseLava(autoSettings.useLava);
    setUseGlacier(autoSettings.useGlacier);
    setShowAutoSettings(false);
    setIsAutoMode(true);
  };

  const stopAutoEnhance = () => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    setIsAutoMode(false);
  };

  useEffect(() => {
    if (!isAutoMode) return;

    autoIntervalRef.current = setInterval(() => {
      if (busyRef.current) return;
      if (Date.now() < autoPauseUntilRef.current) return; // 성공 연출 감상용 일시정지
      const state = latestStateRef.current;

      // 목표 레벨 또는 현재 등급 상한 도달 시 정지 (승급은 사용자가 직접)
      if (state.currentLevel >= state.autoTargetLevel || state.currentLevel >= WANGAP_GRADE_RANGES[state.grade].max) {
        stopAutoEnhance();
        return;
      }

      attemptRef.current();
    }, autoSettings.speed);

    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    };
  }, [isAutoMode, autoSettings.speed]);

  // === 초기화 (2번 클릭 확인) ===
  const resetSimulation = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    stopAutoEnhance();
    busyRef.current = false;
    setIsBusy(false);
    setCurrentLevel(0);
    setGrade('전설');
    setJangin(0);
    setProbBonus(0);
    setUseLava(false);
    setUseGlacier(false);
    setAutoTargetLevel(0);
    setTargetDraft('');
    setHistory([]);
    setTotals({ attempts: 0, success: 0, fail: 0 });
    entryNoRef.current = 0;
    setAccumulatedCost(createZeroCost());
  };

  const handleResetClick = () => {
    if (confirmReset) {
      resetSimulation();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  // === 현재/목표 단계 직접 입력 (현재 등급 구간 내에서만) ===
  const commitLevelDraft = () => {
    if (isAutoMode || isBusy) {
      setLevelDraft(String(currentLevel));
      return;
    }
    const v = parseInt(levelDraft);
    if (isNaN(v)) {
      setLevelDraft(String(currentLevel));
      return;
    }
    const nv = Math.min(Math.max(v, gradeRange.min), gradeRange.max - 1);
    setLevelDraft(String(nv));
    if (nv !== currentLevel) {
      setCurrentLevel(nv);
      setJangin(0);
      setProbBonus(0);
    }
  };

  const commitTargetDraft = () => {
    if (targetDraft === '') {
      setAutoTargetLevel(0);
      return;
    }
    const v = parseInt(targetDraft);
    if (isNaN(v)) {
      setTargetDraft(autoTargetLevel > 0 ? String(autoTargetLevel) : '');
      return;
    }
    const nv = Math.min(Math.max(v, Math.min(currentLevel + 1, gradeRange.max)), gradeRange.max);
    setTargetDraft(String(nv));
    setAutoTargetLevel(nv);
  };

  // === 골드 환산 ===
  const getUnitPrice = (key: OptMatKey): number => {
    const itemId = WANGAP_MATERIAL_IDS[key];
    return itemId ? (marketPrices[String(itemId)] || 0) : 0;
  };

  // 골드 환산: 시세 × 누적 소모량
  const getMaterialGoldCost = (key: OptMatKey, amount: number): number =>
    Math.round(amount * getUnitPrice(key));

  const toggleGoldInclude = (key: string) => {
    setGoldIncludeMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const baseProb = getBaseProb(currentLevel);
  const breathEffect = getWangapBreathEffect(baseProb);
  // 현재 상태 기준 이번 시도의 숨결 개수 (수동) — 표시 확률과 실제 판정이 동일
  const currentBreaths = getAttemptBreaths(currentLevel);
  const finalProb = calcProbWith(currentBreaths.lava, currentBreaths.glacier);
  const materialCost = WANGAP_MATERIAL_COSTS[currentLevel + 1];

  // 골드 분리: 재료 구매 골드(귀속·보유 차감 후) + 누르는 골드(강화 소모 골드) = 총 골드
  const materialBuyGold = PRICED_COST_KEYS.reduce(
    (sum, key) => (goldIncludeMap[key] ? sum + getMaterialGoldCost(key, accumulatedCost[key]) : sum), 0);
  const pressGold = goldIncludeMap['골드'] ? accumulatedCost.골드 : 0;
  const totalGold = Math.round(materialBuyGold + pressGold);

  return (
    <div className={styles.container} data-grade={grade}>
      <div className={styles.mainLayout}>
      {/* ===== 장비 선택 패널 (실제 시뮬 장비 현황과 동일한 상자) ===== */}
      <div className={styles.equipmentPanel}>
        <div className={styles.equipmentPanelTitle}>장비 선택</div>
        <div className={styles.equipmentList}>
          {WANGAP_GRADE_ORDER.map((g, i) => {
            const promoTarget = i > 0 ? (g as '유물' | '고대') : null;
            return (
              <Fragment key={g}>
                {promoTarget && (
                  <>
                    <span className={styles.listArrow} aria-hidden="true">→</span>
                    <button
                      className={`${styles.promoConnector} ${openPromoInfo === promoTarget ? styles.promoConnectorActive : ''}`}
                      onClick={() => setOpenPromoInfo(prev => (prev === promoTarget ? null : promoTarget))}
                      aria-label={`${promoTarget} 승급 재료 정보`}
                    >
                      <span className={styles.promoConnectorIcon}>
                        <Image
                          src={WANGAP_PROMOTION_MATERIALS[promoTarget].icon}
                          alt={WANGAP_PROMOTION_MATERIALS[promoTarget].name}
                          fill
                          sizes="56px"
                          style={{ objectFit: 'contain' }}
                        />
                      </span>
                      <span className={styles.promoConnectorArrow}>승급</span>
                    </button>
                    <span className={styles.listArrow} aria-hidden="true">→</span>
                  </>
                )}
                <button
                  className={`${styles.equipmentItem} ${grade === g ? styles.equipmentItemSelected : ''}`}
                  data-grade={g}
                  onClick={() => selectGrade(g)}
                  disabled={isBusy || isAutoMode}
                >
                  <div className={styles.equipmentName} data-grade={g}>{g} 완갑</div>
                  <span className={styles.equipmentIcon} data-grade={g}>
                    {/* padding: 이미지가 개구부에 꽉 차 링을 침범해 보이지 않게 여백 */}
                    <Image src={WANGAP_ITEM_IMAGES[g]} alt={`완갑 ${g}`} fill sizes="54px" style={{ objectFit: 'contain', padding: '8%' }} />
                    <span className={styles.equipmentFrame}>
                      <Image src="/wjsdbf3.webp" alt="" fill sizes="84px" style={{ objectFit: 'fill' }} unoptimized />
                    </span>
                  </span>
                  <div className={styles.equipmentLevel}>
                    <span className={styles.levelBadge} data-grade={g}>
                      +{WANGAP_GRADE_RANGES[g].min}~{WANGAP_GRADE_RANGES[g].max}
                    </span>
                  </div>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* 승급 재료 상세 */}
      {openPromoInfo && (
        <div className={styles.promoInfoPanel} data-grade={openPromoInfo}>
          <div className={styles.promoInfoTitle}>
            {openPromoInfo === '유물' ? '전설 → 유물 승급' : '유물 → 고대 승급'}
          </div>
          <div className={styles.promoInfoRow}>
            <span className={styles.promoInfoIcon}>
              <Image
                src={WANGAP_PROMOTION_MATERIALS[openPromoInfo].icon}
                alt={WANGAP_PROMOTION_MATERIALS[openPromoInfo].name}
                fill
                sizes="26px"
                style={{ objectFit: 'contain' }}
              />
            </span>
            <span>{WANGAP_PROMOTION_MATERIALS[openPromoInfo].name}</span>
            <strong>{WANGAP_PROMOTION_COSTS[openPromoInfo].벨가르딘재료}개</strong>
          </div>
          <div className={styles.promoInfoRow}>
            <span className={styles.promoInfoIcon}>
              <Image src="/gold.webp" alt="골드" fill sizes="26px" style={{ objectFit: 'contain' }} />
            </span>
            <span>골드</span>
            <strong>{WANGAP_PROMOTION_COSTS[openPromoInfo].골드.toLocaleString()}G</strong>
          </div>
          <div className={styles.promoInfoDesc}>
            벨가르딘 레이드에서 획득하는 특수 재료로, 등급 상한(+{openPromoInfo === '유물' ? 15 : 20}) 도달 후 승급 시 소모됩니다
          </div>
        </div>
      )}

      {/* ===== 시뮬레이터 외곽 패널 + 3상자 (실제 시뮬과 동일 구조) ===== */}
      <div className={styles.simulatorPanel}>
      <div className={styles.mainCard}>
        <section className={`${styles.col} ${styles.stageCol}`}>
          <div className={styles.boxTitle}>
            <span>완갑 강화</span>
            <span className={styles.gradeBadge}>{grade}</span>
          </div>

          {/* 현재/목표 단계 입력 — 상자 → 상자 (라벨은 상자 안에 작게) */}
          <div className={styles.startAdjustRow}>
            <label className={styles.levelBox}>
              <span className={styles.levelBoxLabel}>현재</span>
              <span className={styles.levelBoxValue}>
                <span className={styles.levelInputPrefix}>+</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.levelInput}
                  value={levelDraft}
                  disabled={isAutoMode || isBusy}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) setLevelDraft(v);
                  }}
                  onBlur={commitLevelDraft}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  aria-label="현재 단계"
                />
              </span>
            </label>
            <span className={styles.levelFieldArrow} aria-hidden="true">→</span>
            <label className={styles.levelBox}>
              <span className={styles.levelBoxLabel}>목표</span>
              <span className={styles.levelBoxValue}>
                <span className={styles.levelInputPrefix}>+</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.levelInput}
                  value={targetDraft}
                  disabled={isAutoMode}
                  placeholder={String(gradeRange.max)}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) setTargetDraft(v);
                  }}
                  onBlur={commitTargetDraft}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  aria-label="목표 단계"
                />
              </span>
            </label>
          </div>

          {/* 아이템 슬롯 */}
          <div className={styles.stageArea}>
            <div className={styles.itemSlot}>
              <span className={styles.itemImage}>
                <Image
                  src={WANGAP_ITEM_IMAGES[grade]}
                  alt={`완갑 (${grade})`}
                  fill
                  sizes="96px"
                  style={{ objectFit: 'contain' }}
                />
              </span>
              {/* 세르카 장비 테두리 */}
              <span className={styles.slotFrame}>
                <Image src="/wjsdbf3.webp" alt="" fill sizes="140px" style={{ objectFit: 'fill' }} unoptimized />
              </span>

            </div>

            <div className={styles.itemName}>완갑</div>
          </div>

          {isMaxed ? (
            /* ===== 최고 단계 완료 ===== */
            <div className={styles.maxComplete}>
              <div className={styles.maxCompleteTitle}>강화 완료</div>
              <div className={styles.maxCompleteDesc}>고대 완갑 +25, 최고 단계에 도달했습니다</div>
              <button
                className={`${styles.resetButton} ${confirmReset ? styles.resetButtonConfirm : ''}`}
                onClick={handleResetClick}
              >
                {confirmReset ? '진짜 초기화' : '초기화'}
              </button>
            </div>
          ) : atGradeCap && nextGrade ? (
            /* ===== 등급 상한 도달 — 승급 안내 ===== */
            <div className={styles.promotionPanel}>
              <div className={styles.promotionTitle}>
                {grade} 단계 완료 — <strong>{nextGrade}</strong> 승급이 가능합니다
              </div>
              <div className={styles.promotionDesc}>
                벨가르딘 레이드 특수 재료로 승급하며, 재료와 골드가 누적 비용에 합산됩니다
              </div>
              <div className={styles.promotionCostRow}>
                <div className={styles.promotionCostItem}>
                  <Image src={WANGAP_PROMOTION_MATERIALS[nextGrade].icon} alt={WANGAP_PROMOTION_MATERIALS[nextGrade].name} width={26} height={26} />
                  <span>{WANGAP_PROMOTION_MATERIALS[nextGrade].name}</span>
                  <strong>{WANGAP_PROMOTION_COSTS[nextGrade].벨가르딘재료}</strong>
                </div>
                <div className={styles.promotionCostItem}>
                  <Image src="/gold.webp" alt="골드" width={22} height={22} />
                  <span>골드</span>
                  <strong>{WANGAP_PROMOTION_COSTS[nextGrade].골드.toLocaleString()}</strong>
                </div>
              </div>
              <button className={styles.promoteButton} onClick={() => promoteTo(nextGrade)} disabled={isBusy}>
                {isBusy ? '승급 중...' : `${nextGrade} 등급으로 승급`}
              </button>
            </div>
          ) : (
            <>
              {/* 강화 확률 */}
              <div className={styles.probSection}>
                <div className={styles.probLabel}>강화 확률</div>
                <div className={styles.probValue}>
                  {jangin >= 1 ? (
                    <span className={styles.probGuaranteed}>100% (장인의 기운)</span>
                  ) : (
                    <>
                      <span className={styles.probNumber}>{(finalProb * 100).toFixed(2)}%</span>
                      <span className={styles.probBase}>(기본 {(baseProb * 100).toFixed(1)}%)</span>
                    </>
                  )}
                </div>
              </div>

              {/* 장인의 기운 */}
              <div className={styles.janginSection}>
                <div className={styles.janginHeader}>
                  <span>장인의 기운</span>
                  <span className={styles.janginValue}>{(Math.floor(jangin * 10000) / 100).toFixed(2)}%</span>
                </div>
                <div className={styles.janginBarOuter}>
                  <div
                    className={styles.janginBarInner}
                    style={{ width: `${Math.min(jangin * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* 보조 재료: 숨결 2종 동시 사용 (수동 토글 = 풀숨) */}
              <div className={styles.breathHeader}>
                <span className={styles.breathHeaderLabel}>보조 재료</span>
              </div>
              <div className={styles.breathRow}>
                <button
                  className={`${styles.breathButton} ${useLava ? styles.breathButtonActiveLava : ''}`}
                  onClick={() => setUseLava(!useLava)}
                  disabled={breathEffect.max === 0}
                >
                  <span className={styles.breathIcon}>
                    <Image src="/breath-lava5.webp" alt="용암의 숨결" fill sizes="28px" style={{ objectFit: 'contain' }} />
                  </span>
                  <span className={styles.breathName}>용암의 숨결</span>
                  <span className={styles.breathMeta}>
                    {useLava ? `${breathEffect.max}개 +${(breathEffect.max * breathEffect.per * 100).toFixed(2)}%` : '미사용'}
                  </span>
                </button>
                <button
                  className={`${styles.breathButton} ${useGlacier ? styles.breathButtonActiveGlacier : ''}`}
                  onClick={() => setUseGlacier(!useGlacier)}
                  disabled={breathEffect.max === 0}
                >
                  <span className={styles.breathIcon}>
                    <Image src="/breath-glacier5.webp" alt="빙하의 숨결" fill sizes="28px" style={{ objectFit: 'contain' }} />
                  </span>
                  <span className={styles.breathName}>빙하의 숨결</span>
                  <span className={styles.breathMeta}>
                    {useGlacier ? `${breathEffect.max}개 +${(breathEffect.max * breathEffect.per * 100).toFixed(2)}%` : '미사용'}
                  </span>
                </button>
              </div>

              {/* 1회 강화 비용 */}
              {materialCost && (
                <div className={styles.singleCostSection}>
                  <div className={styles.singleCostTitle}>1회 강화 비용 (+{currentLevel} → +{currentLevel + 1})</div>
                  <div className={styles.singleCostGrid}>
                    <div className={styles.singleCostItem}>
                      <Image src="/top-destiny-destruction-stone5.webp" alt="파괴석 결정" width={30} height={30} />
                      <span>{materialCost.파괴석결정.toLocaleString()}</span>
                    </div>
                    <div className={styles.singleCostItem}>
                      <Image src="/top-destiny-guardian-stone5.webp" alt="수호석 결정" width={30} height={30} />
                      <span>{materialCost.수호석결정.toLocaleString()}</span>
                    </div>
                    <div className={styles.singleCostItem}>
                      <Image src="/top-destiny-breakthrough-stone5.webp" alt="위대한 돌파석" width={30} height={30} />
                      <span>{materialCost.위대한돌파석.toLocaleString()}</span>
                    </div>
                    <div className={styles.singleCostItem}>
                      <Image src="/top-abidos-fusion5.webp" alt="상급 아비도스" width={30} height={30} />
                      <span>{materialCost.상급아비도스.toLocaleString()}</span>
                    </div>
                    <div className={styles.singleCostItem}>
                      <Image src="/destiny-shard-bag-large5.webp" alt="운명의 파편" width={30} height={30} />
                      <span>{materialCost.운명파편.toLocaleString()}</span>
                    </div>
                    <div className={styles.singleCostItem}>
                      <Image src="/shilling.webp" alt="실링" width={30} height={30} />
                      <span>{materialCost.실링.toLocaleString()}</span>
                    </div>
                    <div className={styles.singleCostItem}>
                      <Image src="/gold.webp" alt="골드" width={30} height={30} />
                      <span>{materialCost.골드.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 버튼 영역 */}
              <div className={styles.buttonRow}>
                <button
                  className={styles.enhanceButton}
                  onClick={attemptEnhance}
                  disabled={!canEnhance || isBusy || isAutoMode}
                >
                  {isBusy && !isAutoMode ? '강화 중...' : '강화하기'}
                </button>

                <div className={styles.autoButtonWrap} ref={autoWrapRef}>
                  <button
                    className={`${styles.autoButton} ${isAutoMode ? styles.autoButtonStop : ''}`}
                    onClick={() => {
                      if (isAutoMode) {
                        stopAutoEnhance();
                      } else {
                        setShowAutoSettings(!showAutoSettings);
                      }
                    }}
                    disabled={!canEnhance && !isAutoMode}
                  >
                    {isAutoMode ? '중지' : '자동강화'}
                  </button>

                  {showAutoSettings && !isAutoMode && (
                    <div className={styles.autoDropdown}>
                      <div className={styles.autoDropdownTitle}>자동강화 설정</div>

                      <div className={styles.autoDropdownSection}>
                        <div className={styles.autoDropdownLabel}>보조 재료</div>
                        <div className={styles.autoBreathChecks}>
                          <label className={styles.autoDropdownCheckbox}>
                            <input
                              type="checkbox"
                              checked={autoSettings.useLava}
                              onChange={(e) => setAutoSettings({ ...autoSettings, useLava: e.target.checked })}
                            />
                            용숨 (풀숨)
                          </label>
                          <label className={styles.autoDropdownCheckbox}>
                            <input
                              type="checkbox"
                              checked={autoSettings.useGlacier}
                              onChange={(e) => setAutoSettings({ ...autoSettings, useGlacier: e.target.checked })}
                            />
                            빙숨 (풀숨)
                          </label>
                        </div>
                      </div>

                      <div className={styles.autoDropdownSection}>
                        <div className={styles.autoDropdownLabel}>강화 속도</div>
                        <div className={styles.speedButtonGroup}>
                          {[
                            { label: 'x3', value: 333 },
                            { label: 'x6', value: 167 },
                            { label: 'x9', value: 111 },
                          ].map((option) => (
                            <button
                              key={option.value}
                              className={`${styles.speedButton} ${autoSettings.speed === option.value ? styles.speedButtonActive : ''}`}
                              onClick={() => setAutoSettings({ ...autoSettings, speed: autoSettings.speed === option.value ? 1000 : option.value })}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.autoDropdownHint}>
                        {autoTargetLevel > currentLevel
                          ? `+${currentLevel} → +${Math.min(autoTargetLevel, gradeRange.max)} 자동 진행 (승급은 직접 선택)`
                          : '상단의 목표 단계를 먼저 입력하세요'}
                      </div>

                      <button
                        className={styles.autoDropdownStartBtn}
                        onClick={startAutoEnhance}
                        disabled={autoTargetLevel <= currentLevel}
                      >
                        자동강화 시작
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                className={`${styles.resetButton} ${confirmReset ? styles.resetButtonConfirm : ''}`}
                onClick={handleResetClick}
                disabled={isAutoMode}
              >
                {confirmReset ? '진짜 초기화' : '초기화'}
              </button>
            </>
          )}
        </section>

        {/* ===== 강화 기록 ===== */}
        <section className={`${styles.col} ${styles.historyCol}`}>
          <div className={styles.boxTitle}>강화 기록</div>
          <div className={styles.historyContainer} ref={historyContainerRef}>
            {history.length === 0 ? (
              <div className={styles.historyEmpty}>강화 버튼을 눌러 시뮬레이션을 시작하세요</div>
            ) : (
              <div className={styles.historyList}>
                {history.map((entry) => (
                  entry.type === 'promotion' ? (
                    <div key={`p-${entry.number}`} className={styles.historyPromotion} data-grade={entry.grade}>
                      <span className={styles.historyItemNumber}>#{entry.number}</span>
                      <span className={styles.historyPromotionText}>{entry.grade} 등급 승급 (+{entry.level})</span>
                    </div>
                  ) : (
                    <div
                      key={`a-${entry.number}`}
                      className={`${styles.historyItem} ${entry.success ? styles.historyItemSuccess : styles.historyItemFail}`}
                    >
                      <div className={styles.historyItemHeader}>
                        <span className={styles.historyItemNumber}>#{entry.number}</span>
                        <span className={styles.historyItemLevel}>+{entry.level} → +{entry.level + 1}</span>
                        <span className={`${styles.historyItemResult} ${entry.success ? styles.historyResultSuccess : styles.historyResultFail}`}>
                          {entry.success ? (entry.guaranteed ? '확정 성공' : '성공') : '실패'}
                        </span>
                      </div>
                      <div className={styles.historyItemDetails}>
                        <span>확률 {(entry.probability * 100).toFixed(2)}%</span>
                        {!entry.success && (
                          <span>장인 {(Math.floor(entry.janginBefore * 10000) / 100).toFixed(2)}% → {(Math.floor(entry.janginAfter * 10000) / 100).toFixed(2)}%</span>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
          <div className={styles.historyStats}>
            <div className={styles.historyStatItem}>
              <span>총 시도</span>
              <span>{totals.attempts}회</span>
            </div>
            <div className={styles.historyStatItem}>
              <span>성공</span>
              <span className={styles.statSuccess}>{totals.success}회</span>
            </div>
            <div className={styles.historyStatItem}>
              <span>실패</span>
              <span className={styles.statFail}>{totals.fail}회</span>
            </div>
          </div>
        </section>

        {/* ===== 누적 비용 ===== */}
        <section className={styles.col}>
          <div className={styles.boxTitle}>누적 비용</div>
          <div className={styles.totalCostContainer}>
            <div className={styles.totalMaterialsList}>
              {COST_ROWS.map(row => {
                const amount = accumulatedCost[row.key];
                if (amount <= 0) return null;
                const matKey = row.priced ? (row.key as OptMatKey) : null;
                return (
                  <div
                    key={row.key}
                    className={`${styles.totalMaterialItem} ${row.priced ? styles.totalMaterialItemCheckable : ''}`}
                    onClick={row.priced ? () => toggleGoldInclude(row.key) : undefined}
                  >
                    {row.priced && (
                      <input
                        type="checkbox"
                        className={styles.materialCheckbox}
                        checked={goldIncludeMap[row.key]}
                        onChange={() => toggleGoldInclude(row.key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <Image src={row.icon} alt={row.label} width={26} height={26} />
                    <span className={styles.materialName}>{row.label}</span>
                    <span className={styles.materialAmount}>
                      {amount.toLocaleString()}
                    </span>
                    {matKey ? (
                      <span className={`${styles.materialGold} ${!goldIncludeMap[matKey] ? styles.materialGoldExcluded : ''}`}>
                        {getMaterialGoldCost(matKey, amount).toLocaleString()}G
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
              {accumulatedCost.골드 > 0 && (
                <div className={`${styles.totalMaterialItem} ${styles.totalMaterialItemCheckable}`} onClick={() => toggleGoldInclude('골드')}>
                  <input
                    type="checkbox"
                    className={styles.materialCheckbox}
                    checked={goldIncludeMap['골드']}
                    onChange={() => toggleGoldInclude('골드')}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Image src="/gold.webp" alt="골드" width={26} height={26} />
                  <span className={styles.materialName}>강화 골드</span>
                  <span />
                  <span className={`${styles.materialGold} ${!goldIncludeMap['골드'] ? styles.materialGoldExcluded : ''}`}>
                    {accumulatedCost.골드.toLocaleString()}G
                  </span>
                </div>
              )}
              {history.length === 0 && (
                <div className={styles.costEmpty}>아직 소모한 재료가 없습니다</div>
              )}
            </div>

            {/* 등급/단계 진행 표시 */}
            {history.length > 0 && (
              <div className={styles.progressSummary}>
                <span className={styles.progressLabel}>진행 상황</span>
                <div className={styles.progressValue}>
                  <span className={styles.progressGradeBadge} data-grade={grade}>{grade}</span>
                  <span className={styles.progressLevel}>+{currentLevel}</span>
                </div>
              </div>
            )}

            {/* 골드 요약: 누르는 골드 / 재료 구매 골드 / 총 골드 */}
            <div className={styles.goldSummarySection}>
              <div className={styles.goldSummaryRow}>
                <Image src="/gold.webp" alt="골드" width={20} height={20} />
                <span className={styles.goldSummaryLabel}>누르는 골드</span>
                <span className={styles.goldSummaryValue}>{pressGold.toLocaleString()}G</span>
              </div>
              <div className={styles.goldSummaryRow}>
                <Image src="/gold.webp" alt="골드" width={20} height={20} />
                <span className={styles.goldSummaryLabel}>재료 구매 골드</span>
                <span className={styles.goldSummaryValue}>{Math.round(materialBuyGold).toLocaleString()}G</span>
              </div>
              <div className={`${styles.goldSummaryRow} ${styles.goldSummaryTotal}`}>
                <Image src="/gold.webp" alt="골드" width={24} height={24} />
                <span className={styles.goldSummaryLabel}>총 골드</span>
                <span className={styles.goldSummaryValue}>{totalGold.toLocaleString()}G</span>
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>
      </div>

      <div className={styles.tempNotice}>
        완갑은 아직 인게임 스펙이 공개되지 않아 확률·재료 소모량·승급 비용이 전부 임시값입니다. 공개 후 실제 수치로 교체됩니다.
      </div>
    </div>
  );
}
