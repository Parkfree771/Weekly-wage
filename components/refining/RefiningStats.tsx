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
  getSimulationRecords,
  SimulationRecord,
  getTotalSimulationCount,
} from '../../lib/supabase';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';

// 히스토그램 데이터 생성 (10% 구간)
const generateHistogramData = (janginValues: number[]) => {
  const bins = [
    { range: '0-10', min: 0, max: 10, count: 0 },
    { range: '10-20', min: 10, max: 20, count: 0 },
    { range: '20-30', min: 20, max: 30, count: 0 },
    { range: '30-40', min: 30, max: 40, count: 0 },
    { range: '40-50', min: 40, max: 50, count: 0 },
    { range: '50-60', min: 50, max: 60, count: 0 },
    { range: '60-70', min: 60, max: 70, count: 0 },
    { range: '70-80', min: 70, max: 80, count: 0 },
    { range: '80-90', min: 80, max: 90, count: 0 },
    { range: '90-100', min: 90, max: 100.01, count: 0 },
  ];

  for (const value of janginValues) {
    for (const bin of bins) {
      if (value >= bin.min && value < bin.max) {
        bin.count++;
        break;
      }
    }
  }

  const total = janginValues.length;
  return bins.map(bin => ({
    range: bin.range,
    count: bin.count,
    percent: Math.round((bin.count / total) * 1000) / 10,
  }));
};

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
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [allRecords, setAllRecords] = useState<SimulationRecord[]>([]);

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
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

  // 레벨별 숨결 최대 개수 (계승 후 기준)
  const getMaxBreathForLevel = (level: number): number => {
    // 계승 후 확률 기준
    // 11-12: 5% → max 20
    // 13-15: 4% → max 20
    // 16-18: 3% → max 20
    // 19-20: 1.5% → max 25
    // 21-22: 1% → max 25
    // 23-24: 0.5% → max 50
    if (level >= 23) return 50;
    if (level >= 19) return 25;
    return 20;
  };

  // 숨결 타입에 따른 필터링 함수
  const filterByBreathType = (data: SimulationRecord[], type: BreathType, level: number): SimulationRecord[] => {
    if (type === 'all') return data;

    const maxBreath = getMaxBreathForLevel(level);

    return data.filter(record => {
      const breath = equipmentType === 'weapon'
        ? (record.lava_breath || 0)
        : (record.glacier_breath || 0);
      const breathPerAttempt = record.attempts > 0 ? breath / record.attempts : 0;

      switch (type) {
        case 'full':
          return breathPerAttempt === maxBreath; // 100%
        case 'partial':
          return breathPerAttempt > 0 && breathPerAttempt < maxBreath; // 0% ~ 100% 사이
        case 'none':
          return breathPerAttempt === 0; // 0%
        default:
          return true;
      }
    });
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoad) {
        setLoading(true);
        const data = await getSimulationRecords(true, 'weapon', true, 20);
        setAllRecords(data);
        setRecords(filterByBreathType(data, breathType, 20));
        setLoading(false);
        setInitialLoad(false);
      }
    };
    loadInitialData();
  }, [initialLoad]);

  // breathType 변경 시 데이터 재조회 또는 필터링
  useEffect(() => {
    if (selectedLevel === null) return;

    const refetchData = async () => {
      setLoading(true);
      if (breathType === 'none') {
        // 노숨: use_breath = false 데이터 가져오기
        const data = await getSimulationRecords(true, equipmentType, false, selectedLevel);
        setAllRecords(data);
        setRecords(data);
      } else {
        // 전체/풀숨/부분숨: use_breath = true 데이터에서 필터링
        const data = await getSimulationRecords(true, equipmentType, true, selectedLevel);
        setAllRecords(data);
        setRecords(filterByBreathType(data, breathType, selectedLevel));
      }
      setLoading(false);
    };

    refetchData();
  }, [breathType, equipmentType, selectedLevel]);

  // 장비 타입 변경 시 초기화
  useEffect(() => {
    if (!initialLoad) {
      setSelectedLevel(null);
      setRecords([]);
    }
  }, [equipmentType, initialLoad]);

  // 레벨 선택 시 결과 로드
  const handleLevelClick = async (level: number) => {
    if (selectedLevel === level) {
      setSelectedLevel(null);
      setRecords([]);
      setAllRecords([]);
      return;
    }

    setSelectedLevel(level);
    setLoading(true);

    if (breathType === 'none') {
      // 노숨: use_breath = false 데이터
      const data = await getSimulationRecords(true, equipmentType, false, level);
      setAllRecords(data);
      setRecords(data);
    } else {
      // 전체/풀숨/부분숨: use_breath = true 데이터에서 필터링
      const data = await getSimulationRecords(true, equipmentType, true, level);
      setAllRecords(data);
      setRecords(filterByBreathType(data, breathType, level));
    }
    setLoading(false);
  };

  // 총 비용 계산 함수 (계승 후 고정)
  const calculateTotalCost = (record: SimulationRecord): number => {
    let totalCost = record.gold || 0;

    const stoneId = equipmentType === 'weapon'
      ? MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL
      : MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL;
    const stoneAmount = equipmentType === 'weapon'
      ? record.destruction_crystal || 0
      : record.guardian_crystal || 0;

    totalCost += stoneAmount * (marketPrices[stoneId] || 0);
    totalCost += (record.great_breakthrough || 0) * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0);
    totalCost += (record.advanced_abidos || 0) * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0);
    totalCost += (record.fate_fragment || 0) * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0);

    // 숨결 비용은 레코드에 데이터가 있으면 항상 포함
    const breathId = equipmentType === 'weapon' ? BREATH_IDS.LAVA : BREATH_IDS.GLACIER;
    const breathAmount = equipmentType === 'weapon'
      ? record.lava_breath || 0
      : record.glacier_breath || 0;
    totalCost += breathAmount * (marketPrices[breathId] || 0);

    return Math.round(totalCost);
  };

  // 일반 재련 통계 계산 (장인의 기운 중심)
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    // 장인의 기운 통계 (null이 아닌 값만)
    const janginValues = records
      .map(r => r.final_jangin)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);

    if (janginValues.length === 0) return null;

    const n = janginValues.length;
    const sum = janginValues.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const min = janginValues[0];
    const max = janginValues[n - 1];

    // 표준편차 계산
    const squaredDiffs = janginValues.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(variance);

    // 백분위수 계산
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * n) - 1;
      return janginValues[Math.max(0, Math.min(index, n - 1))];
    };

    // 중앙값(p50)에 해당하는 레코드 찾기
    const p50Value = getPercentile(50);
    const sortedByJangin = [...records]
      .filter(r => r.final_jangin != null)
      .sort((a, b) => (a.final_jangin || 0) - (b.final_jangin || 0));
    const medianIndex = Math.floor(sortedByJangin.length / 2);
    const medianRecord = sortedByJangin[medianIndex];

    // 중앙값 기준 재료 소모량
    const medianMaterials = {
      attempts: medianRecord?.attempts || 0,
      destructionStone: medianRecord?.destruction_stone || 0,
      guardianStone: medianRecord?.guardian_stone || 0,
      destructionCrystal: medianRecord?.destruction_crystal || 0,
      guardianCrystal: medianRecord?.guardian_crystal || 0,
      breakthroughStone: medianRecord?.breakthrough_stone || 0,
      greatBreakthrough: medianRecord?.great_breakthrough || 0,
      abidos: medianRecord?.abidos || 0,
      advancedAbidos: medianRecord?.advanced_abidos || 0,
      fateFragment: medianRecord?.fate_fragment || 0,
      gold: medianRecord?.gold || 0,
      lavaBreath: medianRecord?.lava_breath || 0,
      glacierBreath: medianRecord?.glacier_breath || 0,
    };

    // 히스토그램 차트 데이터 생성
    const chartData = generateHistogramData(janginValues);

    return {
      jangin: {
        mean: Math.round(mean * 10) / 10,
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        p25: Math.round(getPercentile(25) * 10) / 10,
        p50: Math.round(getPercentile(50) * 10) / 10,
        p75: Math.round(getPercentile(75) * 10) / 10,
        count: n,
      },
      chartData,
      materials: medianMaterials,
      medianRecord,
      totalRecords: records.length,
    };
  }, [records]);

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

      {/* 결과 영역 */}
      <div className={styles.resultsArea}>
        <div className={styles.resultsHeader}>
              <div className={styles.resultsInfo}>
                <span className={styles.resultsLevel}>
                  {selectedLevel !== null ? `${selectedLevel}→${selectedLevel + 1} 강화` : '레벨을 선택하세요'}
                </span>
                {selectedLevel !== null && stats && (
                  <span className={styles.resultsAvg}>평균 장기백 {stats.jangin.mean}%</span>
                )}
              </div>
              <span className={styles.resultsTotal}>{selectedLevel !== null && stats ? `${stats.jangin.count}건` : ''}</span>
            </div>

            {/* 통계 표시 - 100개 이상일 때만 */}
            {selectedLevel !== null && stats && stats.jangin.count >= 100 && !loading && (
              <div className={styles.statsSection}>
                {/* 장인의 기운 분포 */}
                <div className={styles.distributionCard}>
                  <div className={styles.distributionTitle}>장인의 기운 분포</div>

                  {/* 히스토그램 차트 */}
                  <div className={styles.chartWrapper}>
                    <ResponsiveContainer width="100%" height={260}>
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
                  {stats.medianRecord && (
                    <div className={styles.totalCostSection}>
                      <span className={styles.totalCostLabel}>예상 총비용</span>
                      <span className={styles.totalCostValue}>
                        {calculateTotalCost(stats.medianRecord).toLocaleString()}G
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 통계 부족 메시지 - 장인의 기운 데이터가 100개 미만일 때 */}
            {selectedLevel !== null && records.length > 0 && (!stats || stats.jangin.count < 100) && !loading && (
              <div className={styles.insufficientData}>
                <span className={styles.insufficientText}>
                  통계 부족 ({stats?.jangin.count || 0}/100)
                </span>
                <span className={styles.insufficientDesc}>
                  100건 이상의 장인의 기운 데이터가 수집되면 통계가 표시됩니다
                </span>
              </div>
            )}

            {selectedLevel === null ? (
              <div className={styles.tableWrapper}>
                <div className={styles.emptyState}>위에서 레벨을 선택하세요</div>
              </div>
            ) : loading ? (
              <div className={styles.tableWrapper}>
                <div className={styles.loadingState}>로딩 중...</div>
              </div>
            ) : records.length === 0 ? (
              <div className={styles.tableWrapper}>
                <div className={styles.emptyState}>해당 조건의 기록이 없습니다</div>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.recordsTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>시도</th>
                      <th>장기</th>
                      <th>
                        <Image src={equipmentType === 'weapon' ? '/top-destiny-destruction-stone5.webp' : '/top-destiny-guardian-stone5.webp'} alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/top-destiny-breakthrough-stone5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/top-abidos-fusion5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/shilling.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/destiny-shard-bag-large5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/gold.webp" alt="" width={32} height={32} />
                      </th>
                      {breathType !== 'none' && (
                        <th>
                          <Image src={equipmentType === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'} alt="" width={32} height={32} />
                        </th>
                      )}
                      <th>총 비용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => (
                      <tr key={record.id}>
                        <td className={styles.cellNum}>{idx + 1}</td>
                        <td className={styles.cellAttempts}>{record.attempts}회</td>
                        <td className={styles.cellJangin}>{record.final_jangin != null ? `${record.final_jangin}%` : '-'}</td>
                        <td>{equipmentType === 'weapon' ? record.destruction_crystal?.toLocaleString() : record.guardian_crystal?.toLocaleString()}</td>
                        <td>{record.great_breakthrough?.toLocaleString()}</td>
                        <td>{record.advanced_abidos?.toLocaleString()}</td>
                        <td>{record.shilling?.toLocaleString()}</td>
                        <td>{record.fate_fragment?.toLocaleString()}</td>
                        <td className={styles.cellGold}>{record.gold?.toLocaleString()}</td>
                        {breathType !== 'none' && (
                          <td className={styles.cellBreath}>
                            {equipmentType === 'weapon' ? record.lava_breath : record.glacier_breath}
                          </td>
                        )}
                        <td className={styles.cellTotal}>{calculateTotalCost(record).toLocaleString()}G</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    </div>
  );
}
