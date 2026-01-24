'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import styles from './RefiningStats.module.css';
import { getSimulationRecords, SimulationRecord } from '../../lib/supabase';
import { MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '../../data/raidRewards';

// 숨결 아이템 ID
const BREATH_IDS = {
  LAVA: 66111131,
  GLACIER: 66111132,
};

interface RefiningStatsProps {
  defaultSuccession?: boolean;
}

export default function RefiningStats({ defaultSuccession = false }: RefiningStatsProps) {
  const [isSuccession, setIsSuccession] = useState(true);
  const [equipmentType, setEquipmentType] = useState<'weapon' | 'armor'>('weapon');
  const [useBreath, setUseBreath] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(20);
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [myAttempts, setMyAttempts] = useState<string>('');

  // 레벨 범위: 11~24 (25가 최대이므로 24→25까지)
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

  // 필터 변경 시 선택 초기화
  useEffect(() => {
    if (!initialLoad) {
      setSelectedLevel(null);
      setRecords([]);
    }
  }, [isSuccession, equipmentType, useBreath, initialLoad]);

  // 레벨 선택 시 결과 로드
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

  // 운 등급 계산
  const getLuckGrade = (percentile: number) => {
    if (percentile >= 90) return { text: '전설', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    if (percentile >= 70) return { text: '영웅', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' };
    if (percentile >= 50) return { text: '희귀', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    if (percentile >= 30) return { text: '고급', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
    return { text: '일반', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)' };
  };

  const avgAttempts = records.length > 0
    ? Math.round((records.reduce((sum, r) => sum + r.attempts, 0) / records.length) * 10) / 10
    : 0;

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsHeader}>
        <h3 className={styles.statsTitle}>시뮬레이션 통계</h3>
        <p className={styles.statsDesc}>다른 유저들의 결과와 비교해보세요</p>
      </div>

      {/* 필터 영역 */}
      <div className={styles.filterArea}>
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
                <div
                  className={styles.rankBadge}
                  style={{
                    color: getLuckGrade(stats.myPercentile).color,
                    backgroundColor: getLuckGrade(stats.myPercentile).bg,
                    borderColor: getLuckGrade(stats.myPercentile).color
                  }}
                >
                  {getLuckGrade(stats.myPercentile).text}
                </div>
                <div className={styles.rankText}>
                  <span className={styles.rankHighlight}>상위 {100 - stats.myPercentile}%</span>
                  <span className={styles.rankDesc}>
                    {stats.myPercentile >= 50
                      ? `${stats.sampleSize}명 중 ${Math.round(stats.sampleSize * stats.myPercentile / 100)}명보다 빠르게 성공!`
                      : `평균(${stats.mean}회)보다 ${stats.myAttemptsNum > stats.mean ? '조금 더 걸렸어요' : '빠르게 성공했어요'}`
                    }
                  </span>
                </div>
                <div className={styles.rankBar}>
                  <div
                    className={styles.rankProgress}
                    style={{
                      width: `${stats.myPercentile}%`,
                      backgroundColor: getLuckGrade(stats.myPercentile).color
                    }}
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
            <span className={styles.insufficientIcon}>📊</span>
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
      </div>
    </div>
  );
}
