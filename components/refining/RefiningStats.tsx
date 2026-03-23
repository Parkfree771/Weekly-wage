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
  getStatsData,
  getStatsDataForRange,
  BreathFilterType,
  StatsData,
  MaterialStats,
} from '../../lib/refiningStatsData';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';

// 숨결 아이템 ID
const BREATH_IDS = {
  LAVA: 66111131,
  GLACIER: 66111132,
};

export default function RefiningStats() {
  // 일반 재련 상태 (계승 후 고정)
  const [equipmentType, setEquipmentType] = useState<'weapon' | 'armor'>('weapon');
  const [breathType, setBreathType] = useState<BreathFilterType>('full');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(20);

  // 공통 상태
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 구간 합산 상태
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null);
  const [rangeTotals, setRangeTotals] = useState<{
    attempts: number;
    destructionCrystal: number;
    guardianCrystal: number;
    greatBreakthrough: number;
    advancedAbidos: number;
    fateFragment: number;
    gold: number;
    shilling: number;
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
    avgShilling: number;
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

  // 개별 통계 골드 포함 체크박스 (중앙값)
  const [singleGoldInclude, setSingleGoldInclude] = useState<Record<string, boolean>>({
    stone: true, breakthrough: true, abidos: true, fragment: true, breath: true, gold: true,
  });
  const toggleSingleGold = (key: string) => {
    setSingleGoldInclude(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 개별 통계 골드 포함 체크박스 (평균값)
  const [avgGoldInclude, setAvgGoldInclude] = useState<Record<string, boolean>>({
    stone: true, breakthrough: true, abidos: true, fragment: true, breath: true, gold: true,
  });
  const toggleAvgGold = (key: string) => {
    setAvgGoldInclude(prev => ({ ...prev, [key]: !prev[key] }));
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

  // 정적 데이터에서 현재 선택된 레벨의 데이터 가져오기
  const currentStatsData = useMemo(() => {
    if (selectedLevel === null) return null;
    return getStatsData(selectedLevel, breathType);
  }, [selectedLevel, breathType]);

  // 현재 장비 타입에 맞는 재료 통계
  const currentMaterialStats = useMemo((): MaterialStats | null => {
    if (!currentStatsData) return null;
    return equipmentType === 'weapon' ? currentStatsData.weapon : currentStatsData.armor;
  }, [currentStatsData, equipmentType]);

  // 구간 합산 (무기 풀숨 고정)
  const RANGE_TO = 25;
  const RANGE_PRESETS = [20, 21, 22, 23] as const;

  // 구간 합산 데이터 계산 (동기)
  const computeRangeData = (from: number, to: number, eqType: 'weapon' | 'armor', bType: BreathFilterType) => {
    const levels = Array.from({ length: to - from }, (_, i) => from + i);
    const results = levels.map(level => getStatsData(level, bType));

    let attempts = 0, destructionCrystal = 0, guardianCrystal = 0;
    let greatBreakthrough = 0, advancedAbidos = 0, fateFragment = 0;
    let gold = 0, shilling = 0, lavaBreath = 0, glacierBreath = 0;
    let avgAttempts = 0, avgDestructionCrystal = 0, avgGuardianCrystal = 0;
    let avgGreatBreakthrough = 0, avgAdvancedAbidos = 0, avgFateFragment = 0;
    let avgGold = 0, avgShilling = 0, avgLavaBreath = 0, avgGlacierBreath = 0;
    let levelsWithData = 0;

    results.forEach(data => {
      if (data) {
        const mat = eqType === 'weapon' ? data.weapon : data.armor;
        attempts += data.medianAttempts;
        destructionCrystal += mat.medianStone;
        guardianCrystal += mat.medianStone;
        greatBreakthrough += mat.medianBreakthrough;
        advancedAbidos += mat.medianAbidos;
        fateFragment += mat.medianFragment;
        gold += mat.medianGold;
        shilling += mat.medianShilling;
        lavaBreath += mat.medianBreath;
        glacierBreath += mat.medianBreath;
        // 평균값 합산
        avgAttempts += data.avgAttempts;
        avgDestructionCrystal += mat.avgStone;
        avgGuardianCrystal += mat.avgStone;
        avgGreatBreakthrough += mat.avgBreakthrough;
        avgAdvancedAbidos += mat.avgAbidos;
        avgFateFragment += mat.avgFragment;
        avgGold += mat.avgGold;
        avgShilling += mat.avgShilling;
        avgLavaBreath += mat.avgBreath;
        avgGlacierBreath += mat.avgBreath;
        levelsWithData++;
      }
    });

    setRangeTotals({
      attempts, destructionCrystal, guardianCrystal, greatBreakthrough,
      advancedAbidos, fateFragment, gold, shilling, lavaBreath, glacierBreath,
      avgAttempts: Math.round(avgAttempts * 10) / 10,
      avgDestructionCrystal: Math.round(avgDestructionCrystal * 10) / 10,
      avgGuardianCrystal: Math.round(avgGuardianCrystal * 10) / 10,
      avgGreatBreakthrough: Math.round(avgGreatBreakthrough * 10) / 10,
      avgAdvancedAbidos: Math.round(avgAdvancedAbidos * 10) / 10,
      avgFateFragment: Math.round(avgFateFragment * 10) / 10,
      avgGold: Math.round(avgGold * 10) / 10,
      avgShilling: Math.round(avgShilling * 10) / 10,
      avgLavaBreath: Math.round(avgLavaBreath * 10) / 10,
      avgGlacierBreath: Math.round(avgGlacierBreath * 10) / 10,
      hasAvgData: levelsWithData > 0,
      levelsWithData, totalLevels: levels.length,
    });
  };

  const handleRangeClick = (from: number) => {
    if (selectedRange && selectedRange.from === from) {
      setSelectedRange(null);
      setRangeTotals(null);
      return;
    }
    setSelectedLevel(null);
    setSelectedRange({ from, to: RANGE_TO });
    computeRangeData(from, RANGE_TO, 'weapon', 'full');
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

  // 장비 타입 변경 시 초기화
  useEffect(() => {
    setSelectedLevel(null);
    setSelectedRange(null);
    setRangeTotals(null);
  }, [equipmentType]);

  // 레벨 선택
  const handleLevelClick = (level: number) => {
    if (selectedLevel === level) {
      setSelectedLevel(null);
      return;
    }
    setSelectedRange(null);
    setRangeTotals(null);
    setSelectedLevel(level);
  };

  // 개별 통계 재료별 골드 계산 (중앙값)
  const getSingleMaterialGold = (mat: MaterialStats, key: string): number => {
    const stoneId = equipmentType === 'weapon'
      ? MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL;
    const breathId = equipmentType === 'weapon' ? BREATH_IDS.LAVA : BREATH_IDS.GLACIER;
    switch (key) {
      case 'stone':
        return Math.round(mat.medianStone * (marketPrices[stoneId] || 0));
      case 'breakthrough':
        return Math.round(mat.medianBreakthrough * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0));
      case 'abidos':
        return Math.round(mat.medianAbidos * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0));
      case 'fragment':
        return Math.round(mat.medianFragment * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0));
      case 'breath':
        return Math.round(mat.medianBreath * (marketPrices[breathId] || 0));
      case 'gold':
        return mat.medianGold;
      default:
        return 0;
    }
  };

  // 총 비용 계산 함수 (중앙값)
  const calculateTotalCost = (mat: MaterialStats): number => {
    let total = 0;
    if (singleGoldInclude.stone) total += getSingleMaterialGold(mat, 'stone');
    if (singleGoldInclude.breakthrough) total += getSingleMaterialGold(mat, 'breakthrough');
    if (singleGoldInclude.abidos) total += getSingleMaterialGold(mat, 'abidos');
    if (singleGoldInclude.fragment) total += getSingleMaterialGold(mat, 'fragment');
    if (singleGoldInclude.breath) total += getSingleMaterialGold(mat, 'breath');
    if (singleGoldInclude.gold) total += getSingleMaterialGold(mat, 'gold');
    return total;
  };

  // 개별 통계 재료별 골드 계산 (평균값)
  const getSingleAvgMaterialGold = (mat: MaterialStats, key: string): number => {
    const stoneId = equipmentType === 'weapon'
      ? MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL;
    const breathId = equipmentType === 'weapon' ? BREATH_IDS.LAVA : BREATH_IDS.GLACIER;
    switch (key) {
      case 'stone':
        return Math.round(mat.avgStone * (marketPrices[stoneId] || 0));
      case 'breakthrough':
        return Math.round(mat.avgBreakthrough * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0));
      case 'abidos':
        return Math.round(mat.avgAbidos * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0));
      case 'fragment':
        return Math.round(mat.avgFragment * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0));
      case 'breath':
        return Math.round(mat.avgBreath * (marketPrices[breathId] || 0));
      case 'gold':
        return Math.round(mat.avgGold);
      default:
        return 0;
    }
  };

  // 총 비용 계산 함수 (평균값)
  const calculateAvgTotalCost = (mat: MaterialStats): number => {
    let total = 0;
    if (avgGoldInclude.stone) total += getSingleAvgMaterialGold(mat, 'stone');
    if (avgGoldInclude.breakthrough) total += getSingleAvgMaterialGold(mat, 'breakthrough');
    if (avgGoldInclude.abidos) total += getSingleAvgMaterialGold(mat, 'abidos');
    if (avgGoldInclude.fragment) total += getSingleAvgMaterialGold(mat, 'fragment');
    if (avgGoldInclude.breath) total += getSingleAvgMaterialGold(mat, 'breath');
    if (avgGoldInclude.gold) total += getSingleAvgMaterialGold(mat, 'gold');
    return total;
  };

  // 정적 데이터를 화면에 표시할 형태로 변환
  const stats = useMemo(() => {
    if (!currentStatsData || !currentMaterialStats) return null;

    const totalCount = currentStatsData.totalCount;
    const hist = currentStatsData.histogram;

    // 히스토그램 데이터 생성
    const histLabels = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'];
    const chartData = histLabels.map((range, i) => ({
      range,
      count: hist[i] || 0,
      percent: Math.round(((hist[i] || 0) / totalCount) * 1000) / 10,
    }));

    return {
      jangin: {
        mean: currentStatsData.janginAvg,
        min: currentStatsData.janginMin,
        max: currentStatsData.janginMax,
        p25: currentStatsData.janginP25,
        p50: currentStatsData.janginP50,
        p75: currentStatsData.janginP75,
      },
      chartData,
      medianAttempts: currentStatsData.medianAttempts,
      avgAttempts: currentStatsData.avgAttempts,
    };
  }, [currentStatsData, currentMaterialStats]);

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsHeader}>
        <h3 className={styles.statsTitle}>시뮬레이션 통계</h3>
        <p className={styles.statsDesc}>
          수학적 계산 기반 (표본 1,000,000회)
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
            className={`${styles.filterBtn} ${breathType === 'full' ? (equipmentType === 'weapon' ? styles.filterBtnActiveWeapon : styles.filterBtnActiveArmor) : ''}`}
            onClick={() => setBreathType('full')}
          >
            풀숨
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
                {selectedRange && rangeTotals && rangeTotals.levelsWithData > 0 && (
                  <span className={styles.resultsAvg}>시도 {rangeTotals.attempts.toLocaleString()}회</span>
                )}
              </div>
              <span className={styles.resultsTotal}>
                {selectedRange && rangeTotals ? `${rangeTotals.levelsWithData}/${rangeTotals.totalLevels}개 구간` : ''}
              </span>
            </div>

            {/* 통계 표시 */}
            {selectedLevel !== null && stats && currentMaterialStats && (
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
                  <div className={styles.materialsTitle}>중앙값 기준 재료 소모량 (장인의 기운 {stats.jangin.p50}%)</div>

                  <div className={styles.rangeAttemptsRow}>
                    <span className={styles.materialLabel}>시도 횟수</span>
                    <span className={styles.materialValue}>{stats.medianAttempts}회</span>
                  </div>

                  <div className={styles.rangeGrid}>
                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleSingleGold('stone')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={singleGoldInclude.stone} onChange={() => toggleSingleGold('stone')} onClick={e => e.stopPropagation()} />
                      <Image src={equipmentType === 'weapon' ? '/top-destiny-destruction-stone5.webp' : '/top-destiny-guardian-stone5.webp'} alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.medianStone.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!singleGoldInclude.stone ? styles.materialGoldExcluded : ''}`}>{getSingleMaterialGold(currentMaterialStats, 'stone').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleSingleGold('breakthrough')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={singleGoldInclude.breakthrough} onChange={() => toggleSingleGold('breakthrough')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-destiny-breakthrough-stone5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.medianBreakthrough.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!singleGoldInclude.breakthrough ? styles.materialGoldExcluded : ''}`}>{getSingleMaterialGold(currentMaterialStats, 'breakthrough').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleSingleGold('abidos')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={singleGoldInclude.abidos} onChange={() => toggleSingleGold('abidos')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-abidos-fusion5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.medianAbidos.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!singleGoldInclude.abidos ? styles.materialGoldExcluded : ''}`}>{getSingleMaterialGold(currentMaterialStats, 'abidos').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleSingleGold('fragment')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={singleGoldInclude.fragment} onChange={() => toggleSingleGold('fragment')} onClick={e => e.stopPropagation()} />
                      <Image src="/destiny-shard-bag-large5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.medianFragment.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!singleGoldInclude.fragment ? styles.materialGoldExcluded : ''}`}>{getSingleMaterialGold(currentMaterialStats, 'fragment').toLocaleString()}G</span>
                    </div>

                    {breathType !== 'none' && (
                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleSingleGold('breath')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={singleGoldInclude.breath} onChange={() => toggleSingleGold('breath')} onClick={e => e.stopPropagation()} />
                        <Image src={equipmentType === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'} alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{currentMaterialStats.medianBreath.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!singleGoldInclude.breath ? styles.materialGoldExcluded : ''}`}>{getSingleMaterialGold(currentMaterialStats, 'breath').toLocaleString()}G</span>
                      </div>
                    )}

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleSingleGold('gold')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={singleGoldInclude.gold} onChange={() => toggleSingleGold('gold')} onClick={e => e.stopPropagation()} />
                      <Image src="/gold.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!singleGoldInclude.gold ? styles.materialGoldExcluded : ''}`}>{getSingleMaterialGold(currentMaterialStats, 'gold').toLocaleString()}G</span>
                    </div>

                    {currentMaterialStats.medianShilling > 0 && (
                      <div className={styles.rangeGridItem}>
                        <Image src="/shilling.webp" alt="실링" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{currentMaterialStats.medianShilling.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.totalCostSection}>
                    <span className={styles.totalCostLabel}>예상 총비용</span>
                    <span className={styles.totalCostValue}>
                      {calculateTotalCost(currentMaterialStats).toLocaleString()}G
                    </span>
                  </div>
                </div>

                {/* 평균값 기준 재료 소모량 */}
                <div className={styles.materialsCard}>
                  <div className={styles.materialsTitle}>평균값 기준 재료 소모량 (장인의 기운 {stats.jangin.mean}%)</div>

                  <div className={styles.rangeAttemptsRow}>
                    <span className={styles.materialLabel}>시도 횟수</span>
                    <span className={styles.materialValue}>{stats.avgAttempts}회</span>
                  </div>

                  <div className={styles.rangeGrid}>
                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleAvgGold('stone')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={avgGoldInclude.stone} onChange={() => toggleAvgGold('stone')} onClick={e => e.stopPropagation()} />
                      <Image src={equipmentType === 'weapon' ? '/top-destiny-destruction-stone5.webp' : '/top-destiny-guardian-stone5.webp'} alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.avgStone.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!avgGoldInclude.stone ? styles.materialGoldExcluded : ''}`}>{getSingleAvgMaterialGold(currentMaterialStats, 'stone').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleAvgGold('breakthrough')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={avgGoldInclude.breakthrough} onChange={() => toggleAvgGold('breakthrough')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-destiny-breakthrough-stone5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.avgBreakthrough.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!avgGoldInclude.breakthrough ? styles.materialGoldExcluded : ''}`}>{getSingleAvgMaterialGold(currentMaterialStats, 'breakthrough').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleAvgGold('abidos')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={avgGoldInclude.abidos} onChange={() => toggleAvgGold('abidos')} onClick={e => e.stopPropagation()} />
                      <Image src="/top-abidos-fusion5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.avgAbidos.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!avgGoldInclude.abidos ? styles.materialGoldExcluded : ''}`}>{getSingleAvgMaterialGold(currentMaterialStats, 'abidos').toLocaleString()}G</span>
                    </div>

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleAvgGold('fragment')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={avgGoldInclude.fragment} onChange={() => toggleAvgGold('fragment')} onClick={e => e.stopPropagation()} />
                      <Image src="/destiny-shard-bag-large5.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridMul}>×</span>
                      <span className={styles.materialValue}>{currentMaterialStats.avgFragment.toLocaleString()}</span>
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!avgGoldInclude.fragment ? styles.materialGoldExcluded : ''}`}>{getSingleAvgMaterialGold(currentMaterialStats, 'fragment').toLocaleString()}G</span>
                    </div>

                    {breathType !== 'none' && (
                      <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleAvgGold('breath')}>
                        <input type="checkbox" className={styles.rangeCheckbox} checked={avgGoldInclude.breath} onChange={() => toggleAvgGold('breath')} onClick={e => e.stopPropagation()} />
                        <Image src={equipmentType === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'} alt="" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{currentMaterialStats.avgBreath.toLocaleString()}</span>
                        <span className={styles.rangeGridEq}>=</span>
                        <span className={`${styles.rangeGridGold} ${!avgGoldInclude.breath ? styles.materialGoldExcluded : ''}`}>{getSingleAvgMaterialGold(currentMaterialStats, 'breath').toLocaleString()}G</span>
                      </div>
                    )}

                    <div className={`${styles.rangeGridItem} ${styles.materialItemClickable}`} onClick={() => toggleAvgGold('gold')}>
                      <input type="checkbox" className={styles.rangeCheckbox} checked={avgGoldInclude.gold} onChange={() => toggleAvgGold('gold')} onClick={e => e.stopPropagation()} />
                      <Image src="/gold.webp" alt="" width={22} height={22} />
                      <span className={styles.rangeGridEq}>=</span>
                      <span className={`${styles.rangeGridGold} ${!avgGoldInclude.gold ? styles.materialGoldExcluded : ''}`}>{getSingleAvgMaterialGold(currentMaterialStats, 'gold').toLocaleString()}G</span>
                    </div>

                    {currentMaterialStats.avgShilling > 0 && (
                      <div className={styles.rangeGridItem}>
                        <Image src="/shilling.webp" alt="실링" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{currentMaterialStats.avgShilling.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.totalCostSection}>
                    <span className={styles.totalCostLabel}>예상 총비용</span>
                    <span className={styles.totalCostValue}>
                      {calculateAvgTotalCost(currentMaterialStats).toLocaleString()}G
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 구간 합산 결과 */}
            {selectedRange && rangeTotals && rangeTotals.levelsWithData > 0 && (
              <div className={styles.rangeResultsSection}>
                {rangeTotals.levelsWithData < rangeTotals.totalLevels && (
                  <div className={styles.rangeWarning}>
                    {rangeTotals.totalLevels}개 구간 중 {rangeTotals.levelsWithData}개만 통계 데이터 보유
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

                    {rangeTotals.shilling > 0 && (
                      <div className={styles.rangeGridItem}>
                        <Image src="/shilling.webp" alt="실링" width={22} height={22} />
                        <span className={styles.rangeGridMul}>×</span>
                        <span className={styles.materialValue}>{rangeTotals.shilling.toLocaleString()}</span>
                      </div>
                    )}
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

                      {rangeTotals.avgShilling > 0 && (
                        <div className={styles.rangeGridItem}>
                          <Image src="/shilling.webp" alt="실링" width={22} height={22} />
                          <span className={styles.rangeGridMul}>×</span>
                          <span className={styles.materialValue}>{rangeTotals.avgShilling.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.totalCostSection}>
                      <span className={styles.totalCostLabel}>예상 총비용</span>
                      <span className={styles.totalCostValue}>{calculateRangeAvgTotalGold().toLocaleString()}G</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedRange && rangeTotals && rangeTotals.levelsWithData === 0 && (
              <div className={styles.insufficientData}>
                <span className={styles.insufficientText}>데이터 부족</span>
                <span className={styles.insufficientDesc}>해당 구간의 데이터가 없습니다</span>
              </div>
            )}

            {selectedLevel === null && !selectedRange && (
              <div className={styles.emptyState}>위에서 레벨 또는 구간을 선택하세요</div>
            )}
            {selectedLevel !== null && !currentStatsData && (
              <div className={styles.emptyState}>해당 조건의 데이터가 없습니다</div>
            )}
      </div>
    </div>
  );
}
