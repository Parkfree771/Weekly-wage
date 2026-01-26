'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import styles from './RefiningStats.module.css';
import {
  getSimulationRecords,
  SimulationRecord,
  getTotalSimulationCount,
  getTotalAdvancedSimulationCount,
} from '../../lib/supabase';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';
import { supabase } from '../../lib/supabase';

// 숨결 아이템 ID
const BREATH_IDS = {
  LAVA: 66111131,
  GLACIER: 66111132,
};

// 상급재련 레코드 타입
interface AdvancedRefiningRecord {
  id: number;
  equipment_type: 'weapon' | 'armor';
  equipment_name: string;
  from_level: number;
  to_level: number;
  total_turns: number;
  success_count: number;
  great_success_count: number;
  super_success_count: number;
  bonus_turns: number;
  ancestor_cards: string;
  guardian_stone: number | null;
  destruction_stone: number | null;
  breakthrough_stone: number | null;
  abidos: number | null;
  fate_fragment: number | null;
  gold: number | null;
  glacier_breath: number | null;
  lava_breath: number | null;
  book_1: number | null;
  book_2: number | null;
  book_3: number | null;
  book_4: number | null;
  auxiliary_pattern: string;
  created_at: string;
}

type RefiningMode = 'normal' | 'advanced';

interface RefiningStatsProps {
  defaultSuccession?: boolean;
}

export default function RefiningStats({ defaultSuccession = false }: RefiningStatsProps) {
  // 재련 모드 (일반/상급)
  const [refiningMode, setRefiningMode] = useState<RefiningMode>('normal');

  // 일반 재련 상태
  const [isSuccession, setIsSuccession] = useState(true);
  const [equipmentType, setEquipmentType] = useState<'weapon' | 'armor'>('weapon');
  const [useBreath, setUseBreath] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(20);
  const [records, setRecords] = useState<SimulationRecord[]>([]);

  // 상급 재련 상태
  const [advancedRecords, setAdvancedRecords] = useState<AdvancedRefiningRecord[]>([]);
  const [selectedAdvancedLevel, setSelectedAdvancedLevel] = useState<number | null>(null);

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [myAttempts, setMyAttempts] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [advancedTotalCount, setAdvancedTotalCount] = useState<number>(0);

  // 일반 재련 레벨 범위: 11~24 (25가 최대이므로 24→25까지)
  const levelRange = Array.from({ length: 14 }, (_, i) => i + 11);

  // 상급 재련 레벨 범위: 0, 10, 20, 30 (각각 +10씩)
  const advancedLevelRange = [0, 10, 20, 30];

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
      const advCount = await getTotalAdvancedSimulationCount();
      setAdvancedTotalCount(advCount);
    };
    fetchTotalCount();
  }, []);

  // 상급재련 레코드 로드 함수
  const fetchAdvancedRecords = async (fromLevel: number) => {
    setLoading(true);
    try {
      const equipmentName = equipmentType === 'weapon' ? '업화 무기' : '업화 방어구';
      const toLevel = fromLevel + 10;

      const { data, error } = await supabase
        .from('advanced_refining_results')
        .select('*')
        .eq('equipment_name', equipmentName)
        .eq('from_level', fromLevel)
        .eq('to_level', toLevel)
        .order('total_turns', { ascending: true })
        .limit(1000);

      if (error) {
        console.error('Error fetching advanced records:', error);
        setAdvancedRecords([]);
      } else {
        setAdvancedRecords(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setAdvancedRecords([]);
    }
    setLoading(false);
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoad) {
        setLoading(true);
        const data = await getSimulationRecords(true, 'weapon', true, 20);
        setRecords(data);
        setLoading(false);
        setInitialLoad(false);
      }
    };
    loadInitialData();
  }, [initialLoad]);

  // 필터 변경 시 선택 초기화 (일반 재련)
  useEffect(() => {
    if (!initialLoad && refiningMode === 'normal') {
      setSelectedLevel(null);
      setRecords([]);
    }
  }, [isSuccession, useBreath, initialLoad, refiningMode]);

  // 장비 타입 변경 시 (상급 재련은 재조회, 일반 재련은 초기화)
  useEffect(() => {
    if (!initialLoad) {
      if (refiningMode === 'normal') {
        setSelectedLevel(null);
        setRecords([]);
      } else if (selectedAdvancedLevel !== null) {
        // 상급 재련이고 레벨이 선택되어 있으면 재조회
        fetchAdvancedRecords(selectedAdvancedLevel);
      }
    }
  }, [equipmentType, initialLoad, refiningMode]);

  // 모드 변경 시 초기화
  useEffect(() => {
    setSelectedLevel(null);
    setRecords([]);
    setSelectedAdvancedLevel(null);
    setAdvancedRecords([]);
    setMyAttempts('');
  }, [refiningMode]);

  // 일반 재련 레벨 선택 시 결과 로드
  const handleLevelClick = async (level: number) => {
    if (selectedLevel === level) {
      setSelectedLevel(null);
      setRecords([]);
      return;
    }

    setSelectedLevel(level);
    setLoading(true);
    const data = await getSimulationRecords(isSuccession, equipmentType, useBreath, level);
    setRecords(data);
    setLoading(false);
  };

  // 상급 재련 레벨 선택 시 결과 로드
  const handleAdvancedLevelClick = async (fromLevel: number) => {
    if (selectedAdvancedLevel === fromLevel) {
      setSelectedAdvancedLevel(null);
      setAdvancedRecords([]);
      return;
    }

    setSelectedAdvancedLevel(fromLevel);
    await fetchAdvancedRecords(fromLevel);
  };

  // 총 비용 계산 함수
  const calculateTotalCost = (record: SimulationRecord): number => {
    let totalCost = record.gold || 0;

    if (isSuccession) {
      const stoneId = equipmentType === 'weapon'
        ? MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL
        : MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL;
      const stoneAmount = equipmentType === 'weapon'
        ? record.destruction_crystal || 0
        : record.guardian_crystal || 0;

      totalCost += stoneAmount * (marketPrices[stoneId] || 0);
      totalCost += (record.great_breakthrough || 0) * (marketPrices[MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE] || 0);
      totalCost += (record.advanced_abidos || 0) * (marketPrices[MATERIAL_IDS.ADVANCED_ABIDOS_FUSION] || 0);
    } else {
      const stoneId = equipmentType === 'weapon'
        ? MATERIAL_IDS.FATE_DESTRUCTION_STONE
        : MATERIAL_IDS.FATE_GUARDIAN_STONE;
      const stoneAmount = equipmentType === 'weapon'
        ? record.destruction_stone || 0
        : record.guardian_stone || 0;

      totalCost += stoneAmount * (marketPrices[stoneId] || 0);
      totalCost += (record.breakthrough_stone || 0) * (marketPrices[MATERIAL_IDS.FATE_BREAKTHROUGH_STONE] || 0);
      totalCost += (record.abidos || 0) * (marketPrices[MATERIAL_IDS.ABIDOS_FUSION] || 0);
    }

    totalCost += (record.fate_fragment || 0) * (marketPrices[MATERIAL_IDS.FATE_FRAGMENT] || 0);

    if (useBreath) {
      const breathId = equipmentType === 'weapon' ? BREATH_IDS.LAVA : BREATH_IDS.GLACIER;
      const breathAmount = equipmentType === 'weapon'
        ? record.lava_breath || 0
        : record.glacier_breath || 0;
      totalCost += breathAmount * (marketPrices[breathId] || 0);
    }

    return Math.round(totalCost);
  };

  // 통계 계산
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    const attempts = records.map(r => r.attempts).sort((a, b) => a - b);
    const n = attempts.length;
    const sum = attempts.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const min = attempts[0];
    const max = attempts[n - 1];

    // 내 시도 횟수의 순위 계산
    const myAttemptsNum = parseInt(myAttempts) || 0;
    let betterThan = 0;
    if (myAttemptsNum > 0) {
      betterThan = attempts.filter(a => a > myAttemptsNum).length;
    }
    const percentile = myAttemptsNum > 0 ? Math.round((betterThan / n) * 100) : 0;

    return {
      mean: Math.round(mean * 10) / 10,
      min,
      max,
      sampleSize: n,
      myPercentile: percentile,
      myAttemptsNum,
    };
  }, [records, myAttempts]);

  const avgAttempts = records.length > 0
    ? Math.round((records.reduce((sum, r) => sum + r.attempts, 0) / records.length) * 10) / 10
    : 0;

  // 상급재련 통계 계산
  const advancedStats = useMemo(() => {
    if (advancedRecords.length === 0) return null;

    const turns = advancedRecords.map(r => r.total_turns).sort((a, b) => a - b);
    const n = turns.length;
    const sum = turns.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const min = turns[0];
    const max = turns[n - 1];

    // 내 시도 횟수의 순위 계산
    const myAttemptsNum = parseInt(myAttempts) || 0;
    let betterThan = 0;
    if (myAttemptsNum > 0) {
      betterThan = turns.filter(t => t > myAttemptsNum).length;
    }
    const percentile = myAttemptsNum > 0 ? Math.round((betterThan / n) * 100) : 0;

    // 성공 등급 평균
    const avgSuccess = advancedRecords.reduce((s, r) => s + r.success_count, 0) / n;
    const avgGreat = advancedRecords.reduce((s, r) => s + r.great_success_count, 0) / n;
    const avgSuper = advancedRecords.reduce((s, r) => s + r.super_success_count, 0) / n;

    return {
      mean: Math.round(mean * 10) / 10,
      min,
      max,
      sampleSize: n,
      myPercentile: percentile,
      myAttemptsNum,
      avgSuccess: Math.round(avgSuccess * 10) / 10,
      avgGreat: Math.round(avgGreat * 10) / 10,
      avgSuper: Math.round(avgSuper * 10) / 10,
    };
  }, [advancedRecords, myAttempts]);

  const avgAdvancedTurns = advancedRecords.length > 0
    ? Math.round((advancedRecords.reduce((sum, r) => sum + r.total_turns, 0) / advancedRecords.length) * 10) / 10
    : 0;

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsHeader}>
        <h3 className={styles.statsTitle}>시뮬레이션 통계</h3>
        <p className={styles.statsDesc}>
          다른 유저들의 결과와 비교해보세요
          {refiningMode === 'normal' && totalCount > 0 && (
            <span className={styles.totalCount}> (총 {totalCount.toLocaleString()}건)</span>
          )}
          {refiningMode === 'advanced' && advancedTotalCount > 0 && (
            <span className={styles.totalCount}> (총 {advancedTotalCount.toLocaleString()}건)</span>
          )}
        </p>
      </div>

      {/* 통합 필터 영역 */}
      <div className={styles.filterArea}>
        {/* 모드 선택 */}
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterBtn} ${refiningMode === 'normal' ? styles.filterBtnActive : ''}`}
            onClick={() => setRefiningMode('normal')}
          >
            일반
          </button>
          <button
            className={`${styles.filterBtn} ${refiningMode === 'advanced' ? styles.filterBtnActive : ''}`}
            onClick={() => setRefiningMode('advanced')}
          >
            상급
          </button>
        </div>

        {refiningMode === 'normal' && (
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${!isSuccession ? styles.filterBtnActive : ''}`}
              onClick={() => setIsSuccession(false)}
            >
              계승 전
            </button>
            <button
              className={`${styles.filterBtn} ${isSuccession ? styles.filterBtnActive : ''}`}
              onClick={() => setIsSuccession(true)}
            >
              계승 후
            </button>
          </div>
        )}

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

        {refiningMode === 'normal' && (
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${!useBreath ? styles.filterBtnActive : ''}`}
              onClick={() => setUseBreath(false)}
            >
              숨결 미사용
            </button>
            <button
              className={`${styles.filterBtn} ${useBreath ? styles.filterBtnActive : ''}`}
              onClick={() => setUseBreath(true)}
            >
              숨결 사용
            </button>
          </div>
        )}
      </div>

      {/* 레벨 버튼들 */}
      <div className={styles.levelGrid}>
        {refiningMode === 'normal' ? (
          levelRange.map(level => {
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
          })
        ) : (
          advancedLevelRange.map(fromLevel => {
            const isActive = selectedAdvancedLevel === fromLevel;
            return (
              <button
                key={fromLevel}
                className={`${styles.levelBtn} ${styles.advancedLevelBtn} ${isActive ? styles.levelBtnActive : ''} ${equipmentType === 'weapon' ? styles.levelBtnWeapon : styles.levelBtnArmor}`}
                onClick={() => handleAdvancedLevelClick(fromLevel)}
              >
                <span className={styles.levelNum}>{fromLevel}→{fromLevel + 10}</span>
              </button>
            );
          })
        )}
      </div>

      {/* 결과 영역 */}
      <div className={styles.resultsArea}>
        {refiningMode === 'normal' ? (
          <>
            <div className={styles.resultsHeader}>
              <div className={styles.resultsInfo}>
                <span className={styles.resultsLevel}>
                  {selectedLevel !== null ? `${selectedLevel}→${selectedLevel + 1} 강화` : '레벨을 선택하세요'}
                </span>
                {selectedLevel !== null && records.length > 0 && (
                  <span className={styles.resultsAvg}>평균 {avgAttempts}회</span>
                )}
              </div>
              <span className={styles.resultsTotal}>{selectedLevel !== null ? `${records.length}건` : ''}</span>
            </div>

            {/* 내 시도 횟수 비교 - 100개 이상일 때만 표시 */}
            {selectedLevel !== null && records.length >= 100 && !loading && (
              <div className={styles.compareSection}>
                <div className={styles.compareInput}>
                  <label className={styles.compareLabel}>내 시도 횟수</label>
                  <input
                    type="number"
                    className={styles.compareField}
                    placeholder="숫자 입력"
                    value={myAttempts}
                    onChange={(e) => setMyAttempts(e.target.value)}
                    min="1"
                  />
                </div>

                {stats && stats.myAttemptsNum > 0 && (
                  <div className={styles.compareResult}>
                    <div className={styles.rankText}>
                      <span className={styles.rankHighlight}>상위 {100 - stats.myPercentile}%</span>
                    </div>
                    <div className={styles.rankBar}>
                      <div
                        className={styles.rankProgress}
                        style={{ width: `${stats.myPercentile}%` }}
                      />
                      <div
                        className={styles.rankMarker}
                        style={{ left: `${stats.myPercentile}%` }}
                      />
                    </div>
                    <div className={styles.rankScale}>
                      <span>운 나쁨</span>
                      <span>평균</span>
                      <span>운 좋음</span>
                    </div>
                  </div>
                )}

                {/* 간단한 통계 요약 */}
                <div className={styles.quickStats}>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>최소</span>
                    <span className={styles.quickStatValue}>{stats?.min || '-'}회</span>
                  </div>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>평균</span>
                    <span className={styles.quickStatValue}>{stats?.mean || '-'}회</span>
                  </div>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>최대</span>
                    <span className={styles.quickStatValue}>{stats?.max || '-'}회</span>
                  </div>
                </div>
              </div>
            )}

            {/* 통계 부족 메시지 - 100개 미만일 때 */}
            {selectedLevel !== null && records.length > 0 && records.length < 100 && !loading && (
              <div className={styles.insufficientData}>
                <span className={styles.insufficientText}>
                  통계 부족 ({records.length}/100)
                </span>
                <span className={styles.insufficientDesc}>
                  100건 이상의 데이터가 수집되면 통계가 표시됩니다
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
                      {isSuccession ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <th>
                            <Image src={equipmentType === 'weapon' ? '/destiny-destruction-stone5.webp' : '/destiny-guardian-stone5.webp'} alt="" width={32} height={32} />
                          </th>
                          <th>
                            <Image src="/destiny-breakthrough-stone5.webp" alt="" width={32} height={32} />
                          </th>
                          <th>
                            <Image src="/abidos-fusion5.webp" alt="" width={32} height={32} />
                          </th>
                        </>
                      )}
                      <th>
                        <Image src="/destiny-shard-bag-large5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/gold.webp" alt="" width={32} height={32} />
                      </th>
                      {useBreath && (
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
                        {isSuccession ? (
                          <>
                            <td>{equipmentType === 'weapon' ? record.destruction_crystal?.toLocaleString() : record.guardian_crystal?.toLocaleString()}</td>
                            <td>{record.great_breakthrough?.toLocaleString()}</td>
                            <td>{record.advanced_abidos?.toLocaleString()}</td>
                            <td>{record.shilling?.toLocaleString()}</td>
                          </>
                        ) : (
                          <>
                            <td>{equipmentType === 'weapon' ? record.destruction_stone?.toLocaleString() : record.guardian_stone?.toLocaleString()}</td>
                            <td>{record.breakthrough_stone?.toLocaleString()}</td>
                            <td>{record.abidos?.toLocaleString()}</td>
                          </>
                        )}
                        <td>{record.fate_fragment?.toLocaleString()}</td>
                        <td className={styles.cellGold}>{record.gold?.toLocaleString()}</td>
                        {useBreath && (
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
          </>
        ) : (
          /* 상급 재련 결과 영역 */
          <>
            <div className={styles.resultsHeader}>
              <div className={styles.resultsInfo}>
                <span className={styles.resultsLevel}>
                  {selectedAdvancedLevel !== null ? `${selectedAdvancedLevel}→${selectedAdvancedLevel + 10} 상급재련` : '레벨을 선택하세요'}
                </span>
                {selectedAdvancedLevel !== null && advancedRecords.length > 0 && (
                  <span className={styles.resultsAvg}>평균 {avgAdvancedTurns}회</span>
                )}
              </div>
              <span className={styles.resultsTotal}>{selectedAdvancedLevel !== null ? `${advancedRecords.length}건` : ''}</span>
            </div>

            {/* 내 시도 횟수 비교 - 100개 이상일 때만 표시 */}
            {selectedAdvancedLevel !== null && advancedRecords.length >= 100 && !loading && (
              <div className={styles.compareSection}>
                <div className={styles.compareInput}>
                  <label className={styles.compareLabel}>내 시도 횟수</label>
                  <input
                    type="number"
                    className={styles.compareField}
                    placeholder="숫자 입력"
                    value={myAttempts}
                    onChange={(e) => setMyAttempts(e.target.value)}
                    min="1"
                  />
                </div>

                {advancedStats && advancedStats.myAttemptsNum > 0 && (
                  <div className={styles.compareResult}>
                    <div className={styles.rankText}>
                      <span className={styles.rankHighlight}>상위 {100 - advancedStats.myPercentile}%</span>
                    </div>
                    <div className={styles.rankBar}>
                      <div
                        className={styles.rankProgress}
                        style={{ width: `${advancedStats.myPercentile}%` }}
                      />
                      <div
                        className={styles.rankMarker}
                        style={{ left: `${advancedStats.myPercentile}%` }}
                      />
                    </div>
                    <div className={styles.rankScale}>
                      <span>운 나쁨</span>
                      <span>평균</span>
                      <span>운 좋음</span>
                    </div>
                  </div>
                )}

                {/* 간단한 통계 요약 */}
                <div className={styles.quickStats}>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>최소</span>
                    <span className={styles.quickStatValue}>{advancedStats?.min || '-'}회</span>
                  </div>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>평균</span>
                    <span className={styles.quickStatValue}>{advancedStats?.mean || '-'}회</span>
                  </div>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>최대</span>
                    <span className={styles.quickStatValue}>{advancedStats?.max || '-'}회</span>
                  </div>
                </div>

                {/* 성공 등급 평균 */}
                <div className={styles.quickStats} style={{ marginTop: '0.5rem' }}>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>성공</span>
                    <span className={styles.quickStatValue}>{advancedStats?.avgSuccess || '-'}회</span>
                  </div>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>대성공</span>
                    <span className={styles.quickStatValue}>{advancedStats?.avgGreat || '-'}회</span>
                  </div>
                  <div className={styles.quickStatItem}>
                    <span className={styles.quickStatLabel}>대대성공</span>
                    <span className={styles.quickStatValue}>{advancedStats?.avgSuper || '-'}회</span>
                  </div>
                </div>
              </div>
            )}

            {/* 통계 부족 메시지 - 100개 미만일 때 */}
            {selectedAdvancedLevel !== null && advancedRecords.length > 0 && advancedRecords.length < 100 && !loading && (
              <div className={styles.insufficientData}>
                <span className={styles.insufficientText}>
                  통계 부족 ({advancedRecords.length}/100)
                </span>
                <span className={styles.insufficientDesc}>
                  100건 이상의 데이터가 수집되면 통계가 표시됩니다
                </span>
              </div>
            )}

            {selectedAdvancedLevel === null ? (
              <div className={styles.tableWrapper}>
                <div className={styles.emptyState}>위에서 레벨을 선택하세요</div>
              </div>
            ) : loading ? (
              <div className={styles.tableWrapper}>
                <div className={styles.loadingState}>로딩 중...</div>
              </div>
            ) : advancedRecords.length === 0 ? (
              <div className={styles.tableWrapper}>
                <div className={styles.emptyState}>해당 조건의 기록이 없습니다</div>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.recordsTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>턴</th>
                      <th>성공</th>
                      <th>대성공</th>
                      <th>대대성공</th>
                      <th>
                        <Image src={equipmentType === 'weapon' ? '/destiny-destruction-stone5.webp' : '/destiny-guardian-stone5.webp'} alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/destiny-breakthrough-stone5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/abidos-fusion5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/destiny-shard-bag-large5.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src="/gold.webp" alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image src={equipmentType === 'weapon' ? '/breath-lava5.webp' : '/breath-glacier5.webp'} alt="" width={32} height={32} />
                      </th>
                      <th>
                        <Image
                          src={equipmentType === 'weapon'
                            ? `/master-metallurgy-${selectedAdvancedLevel === 0 ? 1 : selectedAdvancedLevel === 10 ? 2 : selectedAdvancedLevel === 20 ? 3 : 4}-5.webp`
                            : `/master-tailoring-${selectedAdvancedLevel === 0 ? 1 : selectedAdvancedLevel === 10 ? 2 : selectedAdvancedLevel === 20 ? 3 : 4}-5.webp`
                          }
                          alt=""
                          width={32}
                          height={32}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {advancedRecords.map((record, idx) => {
                      const breathCount = equipmentType === 'weapon' ? record.lava_breath : record.glacier_breath;
                      const bookCount = (record.book_1 || 0) + (record.book_2 || 0) + (record.book_3 || 0) + (record.book_4 || 0);
                      return (
                        <tr key={record.id}>
                          <td className={styles.cellNum}>{idx + 1}</td>
                          <td className={styles.cellAttempts}>{record.total_turns}회</td>
                          <td>{record.success_count}</td>
                          <td>{record.great_success_count}</td>
                          <td>{record.super_success_count}</td>
                          <td>{equipmentType === 'weapon' ? record.destruction_stone?.toLocaleString() : record.guardian_stone?.toLocaleString()}</td>
                          <td>{record.breakthrough_stone?.toLocaleString()}</td>
                          <td>{record.abidos?.toLocaleString()}</td>
                          <td>{record.fate_fragment?.toLocaleString()}</td>
                          <td className={styles.cellGold}>{record.gold?.toLocaleString()}</td>
                          <td className={styles.cellBreath}>{breathCount || 0}</td>
                          <td>{bookCount || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
