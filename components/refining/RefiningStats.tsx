'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';
import styles from './RefiningStats.module.css';
import {
  getRefiningStatsSummary,
  getRefiningStatsSummaryAll,
  RefiningStatsSummary,
  getTotalSimulationCount,
} from '../../lib/supabase';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';

// 숨결 아이템 ID
const BREATH_IDS = {
  LAVA: 66111131,
  GLACIER: 66111132,
};

type BreathType = 'all' | 'full' | 'partial' | 'none';

export default function RefiningStats() {
  // 일반 재련 상태 (계승 후 고정)
  const [equipmentType, setEquipmentType] = useState<'weapon' | 'armor'>('weapon');
  const [breathType, setBreathType] = useState<BreathType>('full');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(20);
  const [summaryData, setSummaryData] = useState<RefiningStatsSummary | null>(null);

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 구간 합산 상태
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeTotals, setRangeTotals] = useState<{
    attempts: number;
    destructionCrystal: number;
    guardianCrystal: number;
    greatBreakthrough: number;
    advancedAbidos: number;
    fateFragment: number;
    gold: number;
    lavaBreath: number;
    glacierBreath: number;
    // 평균값 합산
    avgAttempts: number;
    avgDestructionCrystal: number;
    avgGuardianCrystal: number;
    avgGreatBreakthrough: number;
    avgAdvancedAbidos: number;
    avgFateFragment: number;
    avgGold: number;
    avgLavaBreath: number;
    avgGlacierBreath: number;
    hasAvgData: boolean;
    levelsWithData: number;
    totalLevels: number;
  } | null>(null);
  const [rangeGoldInclude, setRangeGoldInclude] = useState<Record<string, boolean>>({
    stone: true, breakthrough: true, abidos: true, fragment: true, breath: true, gold: true,
  });
  const toggleRangeGold = (key: string) => {
    setRangeGoldInclude(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 모바일 감지 및 마운트 상태
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    setIsMounted(true);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 일반 재련 레벨 범위: 11~24 (25가 최대이므로 24→25까지)
  const levelRange = Array.from({ length: 14 }, (_, i) => i + 11);

  // 거래소 가격 로드
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { fetchPriceData } = await import('@/lib/price-history-client');
        const { latest } = await fetchPriceData();
        const prices: Record<string, number> = {};
        Object.entries(latest).forEach(([itemId, bundlePrice]) => {
          const bundleSize = MATERIAL_BUNDLE_SIZES[Number(itemId)] || 1;
          prices[itemId] = bundlePrice / bundleSize;
        });
        setMarketPrices(prices);
      } catch (error) {
        console.error('Failed to fetch market prices:', error);
      }
    };
    fetchMarketPrices();
  }, []);

  // 전체 기록 수 로드
  useEffect(() => {
    const fetchTotalCount = async () => {
      const count = await getTotalSimulationCount();
      setTotalCount(count);
    };
    fetchTotalCount();
  }, []);

  // 집계 데이터 로드 함수
  const loadSummaryData = async (
    eqType: 'weapon' | 'armor',
    bType: BreathType,
    level: number
  ) => {
    setLoading(true);
    try {
      let data: RefiningStatsSummary | null;
      if (bType === 'all') {
        data = await getRefiningStatsSummaryAll(eqType, level);
      } else {
        data = await getRefiningStatsSummary(eqType, bType, level);
      }
      setSummaryData(data);
    } catch (error) {
      console.error('Failed to load summary data:', error);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  // 구간 합산 (무기 풀숨 고정)
  const RANGE_TO = 25;
  const RANGE_PRESETS = [20, 21, 22, 23] as const;

  // 구간 합산 데이터 로드
  const loadRangeData = async (from: number, to: number, eqType: 'weapon' | 'armor', bType: BreathType) => {
    setRangeLoading(true);
    try {
      const levels = Array.from({ length: to - from }, (_, i) => from + i);
      const promises = levels.map(level => {
        if (bType === 'all') return getRefiningStatsSummaryAll(eqType, level);
        return getRefiningStatsSummary(eqType, bType, level);
      });

      const results = await Promise.all(promises);

      let attempts = 0, destructionCrystal = 0, guardianCrystal = 0;
      let greatBreakthrough = 0, advancedAbidos = 0, fateFragment = 0;
      let gold = 0, lavaBreath = 0, glacierBreath = 0;
      let avgAttempts = 0, avgDestructionCrystal = 0, avgGuardianCrystal = 0;
      let avgGreatBreakthrough = 0, avgAdvancedAbidos = 0, avgFateFragment = 0;
      let avgGold = 0, avgLavaBreath = 0, avgGlacierBreath = 0;
      let hasAvgData = false;
      let levelsWithData = 0;

      results.forEach(data => {
        if (data && data.total_count >= 100) {
          attempts += data.median_attempts || 0;
          destructionCrystal += data.median_destruction_crystal || 0;
          guardianCrystal += data.median_guardian_crystal || 0;
          greatBreakthrough += data.median_great_breakthrough || 0;
          advancedAbidos += data.median_advanced_abidos || 0;
          fateFragment += data.median_fate_fragment || 0;
          gold += data.median_gold || 0;
          lavaBreath += data.median_lava_breath || 0;
          glacierBreath += data.median_glacier_breath || 0;
          // 평균값 합산
          if (data.avg_attempts != null) {
            hasAvgData = true;
            avgAttempts += Number(data.avg_attempts) || 0;
            avgDestructionCrystal += Number(data.avg_destruction_crystal) || 0;
            avgGuardianCrystal += Number(data.avg_guardian_crystal) || 0;
            avgGreatBreakthrough += Number(data.avg_great_breakthrough) || 0;
            avgAdvancedAbidos += Number(data.avg_advanced_abidos) || 0;
            avgFateFragment += Number(data.avg_fate_fragment) || 0;
            avgGold += Number(data.avg_gold) || 0;
            avgLavaBreath += Number(data.avg_lava_breath) || 0;
            avgGlacierBreath += Number(data.avg_glacier_breath) || 0;
          }
          levelsWithData++;
        }
      });

      setRangeTotals({
        attempts, destructionCrystal, guardianCrystal, greatBreakthrough,
        advancedAbidos, fateFragment, gold, lavaBreath, glacierBreath,
        avgAttempts: Math.round(avgAttempts * 10) / 10,
        avgDestructionCrystal: Math.round(avgDestructionCrystal * 10) / 10,
        avgGuardianCrystal: Math.round(avgGuardianCrystal * 10) / 10,
        avgGreatBreakthrough: Math.round(avgGreatBreakthrough * 10) / 10,
        avgAdvancedAbidos: Math.round(avgAdvancedAbidos * 10) / 10,
        avgFateFragment: Math.round(avgFateFragment * 10) / 10,
        avgGold: Math.round(avgGold * 10) / 10,
        avgLavaBreath: Math.round(avgLavaBreath * 10) / 10,
        avgGlacierBreath: Math.round(avgGlacierBreath * 10) / 10,
        hasAvgData,
        levelsWithData, totalLevels: levels.length,
      });
    } catch (error) {
      console.error('Failed to load range data:', error);
      setRangeTotals(null);
    } finally {
      setRangeLoading(false);
    }
  };

  const handleRangeClick = (from: number) => {
    if (selectedRange && selectedRange.from === from) {
      setSelectedRange(null);
      setRangeTotals(null);
      return;
    }
    setSelectedLevel(null);
    setSummaryData(null);
    setSelectedRange({ from, to: RANGE_TO });
    loadRangeData(from, RANGE_TO, 'weapon', 'full');
  };

  // 구간 합산 재료별 골드 계산 (무기 풀숨 고정)
  const getRangeMaterialGold = (key: string): number => {
    if (!rangeTotals) return 0;
    switch (key) {
      case 'stone':
        return Math.round(rangeTotals.destructionCrystal * (marketPrices[MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL] || 0));
      case 'breakthrough':
        return Math.round(rangeTotals.greatBreakthrough * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0));
      case 'abidos':
        return Math.round(rangeTotals.advancedAbidos * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0));
      case 'fragment':
        return Math.round(rangeTotals.fateFragment * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0));
      case 'breath':
        return Math.round(rangeTotals.lavaBreath * (marketPrices[BREATH_IDS.LAVA] || 0));
      case 'gold':
        return rangeTotals.gold;
      default:
        return 0;
    }
  };

  const calculateRangeTotalGold = (): number => {
    if (!rangeTotals) return 0;
    let total = 0;
    if (rangeGoldInclude.stone) total += getRangeMaterialGold('stone');
    if (rangeGoldInclude.breakthrough) total += getRangeMaterialGold('breakthrough');
    if (rangeGoldInclude.abidos) total += getRangeMaterialGold('abidos');
    if (rangeGoldInclude.fragment) total += getRangeMaterialGold('fragment');
    if (rangeGoldInclude.breath) total += getRangeMaterialGold('breath');
    if (rangeGoldInclude.gold) total += getRangeMaterialGold('gold');
    return total;
  };

  // 구간 합산 평균값 골드 계산
  const getRangeAvgMaterialGold = (key: string): number => {
    if (!rangeTotals || !rangeTotals.hasAvgData) return 0;
    switch (key) {
      case 'stone':
        return Math.round(rangeTotals.avgDestructionCrystal * (marketPrices[MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL] || 0));
      case 'breakthrough':
        return Math.round(rangeTotals.avgGreatBreakthrough * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0));
      case 'abidos':
        return Math.round(rangeTotals.avgAdvancedAbidos * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0));
      case 'fragment':
        return Math.round(rangeTotals.avgFateFragment * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0));
      case 'breath':
        return Math.round(rangeTotals.avgLavaBreath * (marketPrices[BREATH_IDS.LAVA] || 0));
      case 'gold':
        return Math.round(rangeTotals.avgGold);
      default:
        return 0;
    }
  };

  const calculateRangeAvgTotalGold = (): number => {
    if (!rangeTotals || !rangeTotals.hasAvgData) return 0;
    let total = 0;
    if (rangeGoldInclude.stone) total += getRangeAvgMaterialGold('stone');
    if (rangeGoldInclude.breakthrough) total += getRangeAvgMaterialGold('breakthrough');
    if (rangeGoldInclude.abidos) total += getRangeAvgMaterialGold('abidos');
    if (rangeGoldInclude.fragment) total += getRangeAvgMaterialGold('fragment');
    if (rangeGoldInclude.breath) total += getRangeAvgMaterialGold('breath');
    if (rangeGoldInclude.gold) total += getRangeAvgMaterialGold('gold');
    return total;
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (initialLoad) {
      loadSummaryData('weapon', 'full', 20);
      setInitialLoad(false);
    }
  }, [initialLoad]);

  // breathType 또는 equipmentType 변경 시 데이터 재조회
  useEffect(() => {
    if (selectedLevel === null || initialLoad) return;
    loadSummaryData(equipmentType, breathType, selectedLevel);
  }, [breathType, equipmentType, selectedLevel]);

  // 장비 타입 변경 시 초기화
  useEffect(() => {
    if (!initialLoad) {
      setSelectedLevel(null);
      setSummaryData(null);
      setSelectedRange(null);
      setRangeTotals(null);
    }
  }, [equipmentType, initialLoad]);

  // 레벨 선택 시 결과 로드
  const handleLevelClick = async (level: number) => {
    if (selectedLevel === level) {
      setSelectedLevel(null);
      setSummaryData(null);
      return;
    }

    setSelectedRange(null);
    setRangeTotals(null);
    setSelectedLevel(level);
    loadSummaryData(equipmentType, breathType, level);
  };

  // 총 비용 계산 함수 (집계 데이터 기반 - 중앙값)
  const calculateTotalCost = (data: RefiningStatsSummary): number => {
    let totalCost = data.median_gold || 0;

    const stoneId = equipmentType === 'weapon'
      ? MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL;
    const stoneAmount = equipmentType === 'weapon'
      ? data.median_destruction_crystal || 0
      : data.median_guardian_crystal || 0;

    totalCost += stoneAmount * (marketPrices[stoneId] || 0);
    totalCost += (data.median_great_breakthrough || 0) * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0);
    totalCost += (data.median_advanced_abidos || 0) * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0);
    totalCost += (data.median_fate_fragment || 0) * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0);

    const breathId = equipmentType === 'weapon' ? BREATH_IDS.LAVA : BREATH_IDS.GLACIER;
    const breathAmount = equipmentType === 'weapon'
      ? data.median_lava_breath || 0
      : data.median_glacier_breath || 0;
    totalCost += breathAmount * (marketPrices[breathId] || 0);

    return Math.round(totalCost);
  };

  // 총 비용 계산 함수 (평균값)
  const calculateAvgTotalCost = (data: RefiningStatsSummary): number => {
    if (data.avg_attempts == null) return 0;
    let totalCost = Number(data.avg_gold) || 0;

    const stoneId = equipmentType === 'weapon'
      ? MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL;
    const stoneAmount = equipmentType === 'weapon'
      ? Number(data.avg_destruction_crystal) || 0
      : Number(data.avg_guardian_crystal) || 0;

    totalCost += stoneAmount * (marketPrices[stoneId] || 0);
    totalCost += (Number(data.avg_great_breakthrough) || 0) * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0);
    totalCost += (Number(data.avg_advanced_abidos) || 0) * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0);
    totalCost += (Number(data.avg_fate_fragment) || 0) * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0);

    const breathId = equipmentType === 'weapon' ? BREATH_IDS.LAVA : BREATH_IDS.GLACIER;
    const breathAmount = equipmentType === 'weapon'
      ? Number(data.avg_lava_breath) || 0
      : Number(data.avg_glacier_breath) || 0;
    totalCost += breathAmount * (marketPrices[breathId] || 0);

    return Math.round(totalCost);
  };

  // 집계 데이터를 화면에 표시할 형태로 변환
  const stats = useMemo(() => {
    if (!summaryData) return null;

    const totalCount = summaryData.total_count;
    if (totalCount === 0) return null;

    // 히스토그램 데이터 생성
    const histData = [
      { range: '0-10', count: summaryData.hist_0_10 },
      { range: '10-20', count: summaryData.hist_10_20 },
      { range: '20-30', count: summaryData.hist_20_30 },
      { range: '30-40', count: summaryData.hist_30_40 },
      { range: '40-50', count: summaryData.hist_40_50 },
      { range: '50-60', count: summaryData.hist_50_60 },
      { range: '60-70', count: summaryData.hist_60_70 },
      { range: '70-80', count: summaryData.hist_70_80 },
      { range: '80-90', count: summaryData.hist_80_90 },
      { range: '90-100', count: summaryData.hist_90_100 },
    ];

    const chartData = histData.map(bin => ({
      range: bin.range,
      count: bin.count,
      percent: Math.round((bin.count / totalCount) * 1000) / 10,
    }));

    // 중앙값 기준 재료 소모량
    const medianMaterials = {
      attempts: summaryData.median_attempts || 0,
      destructionStone: 0,
      guardianStone: 0,
      destructionCrystal: summaryData.median_destruction_crystal || 0,
      guardianCrystal: summaryData.median_guardian_crystal || 0,
      breakthroughStone: 0,
      greatBreakthrough: summaryData.median_great_breakthrough || 0,
      abidos: 0,
      advancedAbidos: summaryData.median_advanced_abidos || 0,
      fateFragment: summaryData.median_fate_fragment || 0,
      gold: summaryData.median_gold || 0,
      lavaBreath: summaryData.median_lava_breath || 0,
      glacierBreath: summaryData.median_glacier_breath || 0,
    };

    // 평균값 기준 재료 소모량
    const hasAvg = summaryData.avg_attempts != null;
    const avgMaterials = hasAvg ? {
      attempts: Number(summaryData.avg_attempts) || 0,
      destructionCrystal: Number(summaryData.avg_destruction_crystal) || 0,
      guardianCrystal: Number(summaryData.avg_guardian_crystal) || 0,
      greatBreakthrough: Number(summaryData.avg_great_breakthrough) || 0,
      advancedAbidos: Number(summaryData.avg_advanced_abidos) || 0,
      fateFragment: Number(summaryData.avg_fate_fragment) || 0,
      gold: Number(summaryData.avg_gold) || 0,
      lavaBreath: Number(summaryData.avg_lava_breath) || 0,
      glacierBreath: Number(summaryData.avg_glacier_breath) || 0,
    } : null;

    return {
      jangin: {
        mean: Number(summaryData.jangin_avg) || 0,
        min: Number(summaryData.jangin_min) || 0,
        max: Number(summaryData.jangin_max) || 0,
        stdDev: Number(summaryData.jangin_stddev) || 0,
        p25: Number(summaryData.jangin_p25) || 0,
        p50: Number(summaryData.jangin_p50) || 0,
        p75: Number(summaryData.jangin_p75) || 0,
        count: totalCount,
      },
      chartData,
      materials: medianMaterials,
      avgMaterials,
      totalRecords: totalCount,
    };
  }, [summaryData]);

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsHeader}>
        <h3 className={styles.statsTitle}>시뮬레이션 통계</h3>
        <p className={styles.statsDesc}>
          다른 유저들의 결과와 비교해보세요
          {totalCount > 0 && (
            <span className={styles.totalCount}> (총 {totalCount.toLocaleString()}건)</span>
          )}
        </p>
      </div>

      {/* 필터 영역 */}
      <div className={styles.filterArea}>
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterBtn} ${styles.filterBtnArmor} ${equipmentType === 'armor' ? styles.filterBtnActive : ''}`}
            onClick={() => setEquipmentType('armor')}
          >
            방어구
          </button>
          <button
            className={`${styles.filterBtn} ${styles.filterBtnWeapon} ${equipmentType === 'weapon' ? styles.filterBtnActive : ''}`}
            onClick={() => setEquipmentType('weapon')}
          >
            무기
          </button>
        </div>

        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterBtn} ${breathType === 'all' ? (equipmentType === 'weapon' ? styles.filterBtnActiveWeapon : styles.filterBtnActiveArmor) : ''}`}
            onClick={() => setBreathType('all')}
          >
            전체
          </button>
          <button
            className={`${styles.filterBtn} ${breathType === 'full' ? (equipmentType === 'weapon' ? styles.filterBtnActiveWeapon : styles.filterBtnActiveArmor) : ''}`}
            onClick={() => setBreathType('full')}
          >
            풀숨
          </button>
          <button
            className={`${styles.filterBtn} ${breathType === 'partial' ? (equipmentType === 'weapon' ? styles.filterBtnActiveWeapon : styles.filterBtnActiveArmor) : ''}`}
            onClick={() => setBreathType('partial')}
          >
            부분숨
          </button>
          <button
            className={`${styles.filterBtn} ${breathType === 'none' ? (equipmentType === 'weapon' ? styles.filterBtnActiveWeapon : styles.filterBtnActiveArmor) : ''}`}
            onClick={() => setBreathType('none')}
          >
            노숨
          </button>
        </div>
      </div>

      {/* 레벨 버튼들 */}
      <div className={styles.levelGrid}>
        {levelRange.map(level => {
          const isActive = selectedLevel === level;
          return (
            <button
              key={level}
              className={`${styles.levelBtn} ${isActive ? styles.levelBtnActive : ''} ${equipmentType === 'weapon' ? styles.levelBtnWeapon : styles.levelBtnArmor}`}
              onClick={() => handleLevelClick(level)}
            >
              <span className={styles.levelNum}>{level}→{level + 1}</span>
            </button>
          );
        })}
      </div>

      {/* 구간 합산 버튼 (무기 풀숨일 때만 표시) */}
      {equipmentType === 'weapon' && breathType === 'full' && (
        <div className={styles.rangeSection}>
          <div className={styles.rangeButtons}>
            {RANGE_PRESETS.map(from => (
              <button
                key={from}
                className={`${styles.rangeBtn} ${selectedRange?.from === from ? styles.rangeBtnActiveWeapon : ''}`}
                onClick={() => handleRangeClick(from)}
              >
                {from}→{RANGE_TO} 구간 합산
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 결과 영역 */}
      <div className={styles.resultsArea}>
        <div className={styles.resultsHeader}>
              <div className={styles.resultsInfo}>
                <span className={styles.resultsLevel}>
                  {selectedRange
                    ? `${selectedRange.from}→${selectedRange.to} 무기 풀숨`
                    : selectedLevel === null
                      ? '레벨을 선택하세요'
                      : `${selectedLevel}→${selectedLevel + 1} 강화`}
                </span>
                {selectedLevel !== null && stats && (
                  <span className={styles.resultsAvg}>평균 장기백 {stats.jangin.mean}%</span>
                )}
                {selectedRange && rangeTotals && rangeTotals.levelsWithData > 0 && (
                  <span className={styles.resultsAvg}>시도 {rangeTotals.attempts.toLocaleString()}회</span>
                )}
              </div>
              <span className={styles.resultsTotal}>
                {selectedLevel !== null && stats ? `${stats.jangin.count}건` : ''}
                {selectedRange && rangeTotals ? `${rangeTotals.levelsWithData}/${rangeTotals.totalLevels}개 구간` : ''}
              </span>
            </div>

            {/* 통계 표시 - 100개 이상일 때만 */}
            {selectedLevel !== null && stats && stats.jangin.count >= 100 && stats.materials && !loading && (
              <div className={styles.statsSection}>
                {/* 장인의 기운 분포 */}
                <div className={styles.distributionCard}>
                  <div className={styles.distributionTitle}>장인의 기운 분포</div>

                  {/* 히스토그램 차트 */}
                  <div className={styles.chartWrapper}>
                    {isMounted ? (
                    <ResponsiveContainer width="100%" height={260} minHeight={260}>
                      <BarChart
                        data={stats.chartData}
                        margin={{ top: 30, right: 15, left: 15, bottom: 10 }}
                        barCategoryGap="20%"
                      >
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                            <stop offset="50%" stopColor="#9333ea" stopOpacity={1} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={1} />
                          </linearGradient>
                          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.3"/>
                          </filter>
                        </defs>
                        <XAxis
                          dataKey="range"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 7 : 12, fontWeight: 600 }}
                          interval={0}
                          tickFormatter={(v) => `${v}%`}
                          dy={8}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(168, 85, 247, 0.08)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className={styles.chartTooltip}>
                                  <div className={styles.tooltipRange}>{data.range}%</div>
                                  <div className={styles.tooltipValue}>{data.count}명 ({data.percent}%)</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="url(#barGradient)"
                          radius={[6, 6, 0, 0]}
                          animationDuration={800}
                          animationEasing="ease-out"
                          style={{ filter: 'url(#barShadow)' }}
                        >
                          <LabelList
                            dataKey="count"
                            position="top"
                            fill="var(--text-primary)"
                            fontSize={13}
                            fontWeight={700}
                            offset={8}
                          />
                          {stats.chartData.map((entry, index) => {
                            const maxCount = Math.max(...stats.chartData.map(d => d.count));
                            const opacity = 0.5 + (entry.count / maxCount) * 0.5;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={`rgba(168, 85, 247, ${opacity})`}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                        <div className="spinner-border spinner-border-sm" role="status" />
                      </div>
                    )}
                  </div>

                  {/* 핵심 통계 수치 */}
                  <div className={styles.keyStats}>
                    <div className={styles.keyStat}>
                      <span className={styles.keyStatLabel}>최소</span>
                      <span className={styles.keyStatValue}>{stats.jangin.min}%</span>
                    </div>
                    <div className={styles.keyStat}>
                      <span className={styles.keyStatLabel}>하위 25%</span>
                      <span className={styles.keyStatValue}>{stats.jangin.p25}%</span>
                    </div>
                    <div className={styles.keyStat}>
                      <span className={styles.keyStatLabel}>중앙값</span>
                      <span className={styles.keyStatValue}>{stats.jangin.p50}%</span>
                    </div>
                    <div className={styles.keyStat}>
                      <span className={styles.keyStatLabel}>상위 25%</span>
                      <span className={styles.keyStatValue}>{stats.jangin.p75}%</span>
                    </div>
                    <div className={styles.keyStat}>
                      <span className={styles.keyStatLabel}>최대</span>
                      <span className={styles.keyStatValue}>{stats.jangin.max}%</span>
                    </div>
                  </div>
                </div>

                {/* 중앙값 기준 재료 소모량 */}
                <div className={styles.materialsCard}>
                  <div className={styles.materialsTitle}>중앙값 기준 재료 소모량 (장기백 {stats.jangin.p50}%)</div>
                  <div className={styles.materialsGrid}>
                    <div className={styles.materialItem}>
                      <span className={styles.materialLabel}>시도 횟수</span>
                      <span className={styles.materialValue}>{stats.materials.attempts}회</span>
                    </div>
                    <div className={styles.materialItem}>
                      <Image
                        src={equipmentType === 'weapon' ? '/top-destiny-destruction-stone5.webp' : '/top-destiny-guardian-stone5.webp'}
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span className={styles.materialValue}>
                        {equipmentType === 'weapon' ? stats.materials.destructionCrystal : stats.materials.guardianCrystal}
                      </span>
                    </div>
                    <div className={styles.materialItem}>
                      <Image
                        src="/top-destiny-breakthrough-stone5.webp"
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span className={styles.materialValue}>
                        {stats.materials.greatBreakthrough}
                      </span>
                    </div>
                    <div className={styles.materialItem}>
                      <Image
                        src="/top-abidos-fusion5.webp"
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span className={styles.materialValue}>
                        {stats.materials.advancedAbidos}
                      </span>
                    </div>
                    <div className={styles.materialItem}>
                      <Image src="/destiny-shard-bag-large5.webp" alt="" width={24} height={24} />
                      <span className={styles.materialValue}>{stats.materials.fateFragment.toLocaleString()}</span>
                    </div>
                    {breathType !== 'none' && (
                      <div className={styles.materialItem}>
                        <Image
                          src={equipmentType === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'}
                          alt=""
                          width={24}
                          height={24}
                        />
                        <span className={styles.materialValue}>
                          {equipmentType === 'weapon' ? stats.materials.lavaBreath : stats.materials.glacierBreath}
                        </span>
                      </div>
                    )}
                    <div className={styles.materialItem}>
                      <Image src="/gold.webp" alt="" width={24} height={24} />
                      <span className={styles.materialValue}>{stats.materials.gold.toLocaleString()}</span>
                    </div>
                  </div>
                  {summaryData && (
                    <div className={styles.totalCostSection}>
                      <span className={styles.totalCostLabel}>예상 총비용</span>
                      <span className={styles.totalCostValue}>
                        {calculateTotalCost(summaryData).toLocaleString()}G
                      </span>
                    </div>
                  )}
                </div>

                {/* 평균값 기준 재료 소모량 */}
                {stats.avgMaterials && (
                  <div className={styles.materialsCard}>
                    <div className={styles.materialsTitle}>평균값 기준 재료 소모량</div>
                    <div className={styles.materialsGrid}>
                      <div className={styles.materialItem}>
                        <span className={styles.materialLabel}>시도 횟수</span>
                        <span className={styles.materialValue}>{stats.avgMaterials.attempts}회</span>
                      </div>
                      <div className={styles.materialItem}>
                        <Image
                          src={equipmentType === 'weapon' ? '/top-destiny-destruction-stone5.webp' : '/top-destiny-guardian-stone5.webp'}
                          alt=""
                          width={24}
                          height={24}
                        />
                        <span className={styles.materialValue}>
                          {equipmentType === 'weapon' ? stats.avgMaterials.destructionCrystal.toLocaleString() : stats.avgMaterials.guardianCrystal.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.materialItem}>
                        <Image src="/top-destiny-breakthrough-stone5.webp" alt="" width={24} height={24} />
                        <span className={styles.materialValue}>{stats.avgMaterials.greatBreakthrough.toLocaleString()}</span>
                      </div>
                      <div className={styles.materialItem}>
                        <Image src="/top-abidos-fusion5.webp" alt="" width={24} height={24} />
                        <span className={styles.materialValue}>{stats.avgMaterials.advancedAbidos.toLocaleString()}</span>
                      </div>
                      <div className={styles.materialItem}>
                        <Image src="/destiny-shard-bag-large5.webp" alt="" width={24} height={24} />
                        <span className={styles.materialValue}>{stats.avgMaterials.fateFragment.toLocaleString()}</span>
                      </div>
                      {breathType !== 'none' && (
                        <div className={styles.materialItem}>
                          <Image
                            src={equipmentType === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'}
                            alt=""
                            width={24}
                            height={24}
                          />
                          <span className={styles.materialValue}>
                            {equipmentType === 'weapon' ? stats.avgMaterials.lavaBreath.toLocaleString() : stats.avgMaterials.glacierBreath.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className={styles.materialItem}>
                        <Image src="/gold.webp" alt="" width={24} height={24} />
                        <span className={styles.materialValue}>{stats.avgMaterials.gold.toLocaleString()}</span>
                      </div>
                    </div>
                    {summaryData && (
                      <div className={styles.totalCostSection}>
                        <span className={styles.totalCostLabel}>예상 총비용</span>
                        <span className={styles.totalCostValue}>
                          {calculateAvgTotalCost(summaryData).toLocaleString()}G
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 통계 부족 메시지 */}
            {selectedLevel !== null && summaryData && stats && stats.jangin.count < 100 && !loading && (
              <div className={styles.insufficientData}>
                <span className={styles.insufficientText}>
                  통계 부족 ({stats?.jangin.count || 0}/100)
                </span>
                <span className={styles.insufficientDesc}>
                  100건 이상의 장인의 기운 데이터가 수집되면 통계가 표시됩니다
                </span>
              </div>
            )}

            {/* 구간 합산 결과 */}
            {selectedRange && !rangeLoading && rangeTotals && rangeTotals.levelsWithData > 0 && (
              <div className={styles.rangeResultsSection}>
                {rangeTotals.levelsWithData < rangeTotals.totalLevels && (
                  <div className={styles.rangeWarning}>
                    {rangeTotals.totalLevels}개 구간 중 {rangeTotals.levelsWithData}개만 통계 데이터 보유 (100건 이상)
                  </div>
                )}

                <div className={styles.materialsCard}>
                  <div className={styles.materialsTitle}>중앙값 기준 재료 소모량</div>

                  {/* 시도 횟수 (1줄) */}
                  <div className={styles.rangeAttemptsRow}>
                    <span className={styles.materialLabel}>시도 횟수</span>
                    <span className={styles.materialValue}>{rangeTotals.attempts.toLocaleString()}회</span>
                  </div>

                  {/* 재료 3개씩 */}
                  <div className={styles.rangeGrid}>
                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('stone')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.stone} onChange={() => toggleRangeGold('stone')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-destiny-destruction-stone5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{rangeTotals.destructionCrystal.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.stone ? styles.materialGoldExcluded : ''}`}>{getRangeMaterialGold('stone').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('breakthrough')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.breakthrough} onChange={() => toggleRangeGold('breakthrough')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-destiny-breakthrough-stone5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{rangeTotals.greatBreakthrough.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.breakthrough ? styles.materialGoldExcluded : ''}`}>{getRangeMaterialGold('breakthrough').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('abidos')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.abidos} onChange={() => toggleRangeGold('abidos')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-abidos-fusion5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{rangeTotals.advancedAbidos.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.abidos ? styles.materialGoldExcluded : ''}`}>{getRangeMaterialGold('abidos').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('fragment')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.fragment} onChange={() => toggleRangeGold('fragment')} onClick={e => e.stopPropagation()} />
                      <Image src="/destiny-shard-bag-large5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{rangeTotals.fateFragment.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.fragment ? styles.materialGoldExcluded : ''}`}>{getRangeMaterialGold('fragment').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('breath')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.breath} onChange={() => toggleRangeGold('breath')} onClick={e => e.stopPropagation()} />
                      <Image src="/breath-lava5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{rangeTotals.lavaBreath.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.breath ? styles.materialGoldExcluded : ''}`}>{getRangeMaterialGold('breath').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('gold')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.gold} onChange={() => toggleRangeGold('gold')} onClick={e => e.stopPropagation()} />
                      <Image src="/gold.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.gold ? styles.materialGoldExcluded : ''}`}>{getRangeMaterialGold('gold').toLocaleString()}G</span>
                    </div>
                  </div>

                  {/* 합계 */}
                  <div className={styles.totalCostSection}>
                    <span className={styles.totalCostLabel}>예상 총비용</span>
                    <span className={styles.totalCostValue}>{calculateRangeTotalGold().toLocaleString()}G</span>
                  </div>
                </div>

                {/* 평균값 기준 재료 소모량 */}
                {rangeTotals.hasAvgData && (
                  <div className={styles.materialsCard}>
                    <div className={styles.materialsTitle}>평균값 기준 재료 소모량</div>

                    <div className={styles.rangeAttemptsRow}>
                      <span className={styles.materialLabel}>시도 횟수</span>
                      <span className={styles.materialValue}>{rangeTotals.avgAttempts.toLocaleString()}회</span>
                    </div>

                    <div className={styles.rangeGrid}>
                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('stone')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.stone} onChange={() => toggleRangeGold('stone')} onClick={e => e.stopPropagation()} />
                        <Image src="/top-destiny-destruction-stone5.webp" alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{rangeTotals.avgDestructionCrystal.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.stone ? styles.materialGoldExcluded : ''}`}>{getRangeAvgMaterialGold('stone').toLocaleString()}G</span>
                      </div>

                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('breakthrough')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.breakthrough} onChange={() => toggleRangeGold('breakthrough')} onClick={e => e.stopPropagation()} />
                        <Image src="/top-destiny-breakthrough-stone5.webp" alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{rangeTotals.avgGreatBreakthrough.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.breakthrough ? styles.materialGoldExcluded : ''}`}>{getRangeAvgMaterialGold('breakthrough').toLocaleString()}G</span>
                      </div>

                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('abidos')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.abidos} onChange={() => toggleRangeGold('abidos')} onClick={e => e.stopPropagation()} />
                        <Image src="/top-abidos-fusion5.webp" alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{rangeTotals.avgAdvancedAbidos.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.abidos ? styles.materialGoldExcluded : ''}`}>{getRangeAvgMaterialGold('abidos').toLocaleString()}G</span>
                      </div>

                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('fragment')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.fragment} onChange={() => toggleRangeGold('fragment')} onClick={e => e.stopPropagation()} />
                        <Image src="/destiny-shard-bag-large5.webp" alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{rangeTotals.avgFateFragment.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.fragment ? styles.materialGoldExcluded : ''}`}>{getRangeAvgMaterialGold('fragment').toLocaleString()}G</span>
                      </div>

                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('breath')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.breath} onChange={() => toggleRangeGold('breath')} onClick={e => e.stopPropagation()} />
                        <Image src="/breath-lava5.webp" alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{rangeTotals.avgLavaBreath.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.breath ? styles.materialGoldExcluded : ''}`}>{getRangeAvgMaterialGold('breath').toLocaleString()}G</span>
                      </div>

                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleRangeGold('gold')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={rangeGoldInclude.gold} onChange={() => toggleRangeGold('gold')} onClick={e => e.stopPropagation()} />
                        <Image src="/gold.webp" alt="" width={22} height={22} />
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!rangeGoldInclude.gold ? styles.materialGoldExcluded : ''}`}>{getRangeAvgMaterialGold('gold').toLocaleString()}G</span>
                      </div>
                    </div>

                    <div className={styles.totalCostSection}>
                      <span className={styles.totalCostLabel}>예상 총비용</span>
                      <span className={styles.totalCostValue}>{calculateRangeAvgTotalGold().toLocaleString()}G</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedRange && rangeLoading && (
              <div className={styles.loadingState}>구간 데이터 로딩 중...</div>
            )}
            {selectedRange && !rangeLoading && rangeTotals && rangeTotals.levelsWithData === 0 && (
              <div className={styles.insufficientData}>
                <span className={styles.insufficientText}>데이터 부족</span>
                <span className={styles.insufficientDesc}>해당 구간의 모든 레벨에 100건 이상의 데이터가 없습니다</span>
              </div>
            )}

            {selectedLevel === null && !selectedRange && (
              <div className={styles.emptyState}>위에서 레벨 또는 구간을 선택하세요</div>
            )}
            {selectedLevel !== null && loading && (
              <div className={styles.loadingState}>로딩 중...</div>
            )}
            {selectedLevel !== null && !loading && !summaryData && (
              <div className={styles.emptyState}>해당 조건의 기록이 없습니다</div>
            )}
      </div>
    </div>
  );
}
