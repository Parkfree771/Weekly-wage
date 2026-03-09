'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/hell-sim/hell-sim.module.css';
import { getHellSimDashboardStats, getHellSimTotalCount, type HellSimStatsRow } from '@/lib/supabase';

type GameMode = 'hell' | 'narak-odd' | 'narak-even';
type KeyType = 'rare' | 'epic' | 'legendary';

const MODE_LABELS: Record<GameMode, string> = {
  'hell': '지옥',
  'narak-odd': '나락(홀)',
  'narak-even': '나락(짝)',
};

const KEY_LABELS: Record<KeyType, string> = {
  'rare': '희귀',
  'epic': '영웅',
  'legendary': '전설',
};

const FLOOR_KEYS = [
  'floor_1_10', 'floor_11_20', 'floor_21_30', 'floor_31_40', 'floor_41_50',
  'floor_51_60', 'floor_61_70', 'floor_71_80', 'floor_81_90', 'floor_91_100',
] as const;

const FLOOR_LABELS = [
  '1~10', '11~20', '21~30', '31~40', '41~50',
  '51~60', '61~70', '71~80', '81~90', '91~100',
];

const HIDDEN_REWARDS_HELL = [
  { key: 'hidden_box' as const, label: '상자 +1', color: 'colorOrange' },
  { key: 'hidden_chance' as const, label: '기회 +1', color: 'colorBlue' },
  { key: 'hidden_rocket' as const, label: '로켓점프', color: 'colorYellow' },
  { key: 'hidden_pungyo' as const, label: '풍요', color: 'colorGreen' },
];

const HIDDEN_REWARDS_NARAK = [
  ...HIDDEN_REWARDS_HELL,
  { key: 'hidden_life' as const, label: '목숨 +1', color: 'colorRed' },
];

export default function HellSimDashboard() {
  const [stats, setStats] = useState<HellSimStatsRow[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<GameMode>('hell');
  const [selectedKey, setSelectedKey] = useState<KeyType>('rare');

  useEffect(() => {
    Promise.all([
      getHellSimDashboardStats(),
      getHellSimTotalCount(),
    ]).then(([statsData, count]) => {
      setStats(statsData);
      setTotalCount(count);
      setLoading(false);
    });
  }, []);

  const currentStat = stats.find(
    s => s.game_mode === selectedMode && s.key_type === selectedKey
  );

  const isNarak = selectedMode.startsWith('narak');

  // 히스토그램 데이터
  const floorData = currentStat
    ? FLOOR_KEYS.map((key, i) => ({
        label: FLOOR_LABELS[i],
        count: currentStat[key] as number,
        percentage: currentStat.total_count > 0
          ? ((currentStat[key] as number) / currentStat.total_count * 100)
          : 0,
      }))
    : [];

  const maxPercentage = Math.max(...floorData.map(d => d.percentage), 1);

  // 히든 보상 데이터
  const hiddenRewards = isNarak ? HIDDEN_REWARDS_NARAK : HIDDEN_REWARDS_HELL;
  const hiddenTotal = currentStat
    ? hiddenRewards.reduce((sum, r) => sum + ((currentStat[r.key] as number) || 0), 0)
    : 0;

  // 부활 후 도전 총 횟수 (생존 + 사망)
  const reviveContinueTotal = currentStat
    ? (currentStat.revive_then_survived || 0) + (currentStat.revive_then_death || 0)
    : 0;

  const getKeyCount = (keyType: KeyType) => {
    const s = stats.find(r => r.game_mode === selectedMode && r.key_type === keyType);
    return s?.total_count ?? 0;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardCard}>
        {/* 카드 헤더 */}
        <div className={styles.dashboardHead}>
          <div className={styles.dashboardHeadTitle}>
            시뮬레이션 통계
          </div>
          {totalCount !== null && totalCount > 0 && (
            <span className={styles.dashboardHeadBadge}>
              총 {totalCount.toLocaleString()}건
            </span>
          )}
        </div>

        {/* 카드 본문 */}
        <div className={styles.dashboardBody}>
          {loading ? (
            <div className={styles.dashboardLoading}>통계 불러오는 중...</div>
          ) : stats.length === 0 ? (
            <div className={styles.noData}>
              아직 통계 데이터가 없습니다.
              {totalCount !== null && totalCount > 0 && (
                <div className={styles.noDataSub}>
                  수집된 데이터: {totalCount.toLocaleString()}건 (집계 대기중)
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 모드 탭 */}
              <div className={styles.modeTabs}>
                {(Object.entries(MODE_LABELS) as [GameMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    className={`${styles.modeTab} ${selectedMode === mode ? styles.modeTabActive : ''}`}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 열쇠 세그먼트 토글 */}
              <div className={styles.keyTabs}>
                {(Object.entries(KEY_LABELS) as [KeyType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.keyTab} ${selectedKey === key ? styles.keyTabActive : ''}`}
                    onClick={() => setSelectedKey(key)}
                  >
                    {label}
                    <span className={styles.keyTabBadge}>{getKeyCount(key)}</span>
                  </button>
                ))}
              </div>

              {!currentStat ? (
                <div className={styles.noData}>
                  해당 조합의 데이터가 아직 없습니다.
                </div>
              ) : (
                <>
                  {/* 요약 카드 */}
                  <div className={styles.summaryGridTwo}>
                    <div className={styles.summaryCard}>
                      <div className={`${styles.summaryValue} ${styles.colorIndigo}`}>
                        {currentStat.total_count.toLocaleString()}
                      </div>
                      <div className={styles.summaryLabel}>시뮬 횟수</div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={`${styles.summaryValue} ${styles.colorBlue}`}>
                        {currentStat.avg_floor}층
                      </div>
                      <div className={styles.summaryLabel}>평균 도달</div>
                    </div>
                  </div>

                  {/* 히스토그램 */}
                  <div className={styles.histogramSection}>
                    <div className={styles.histogramTitle}>
                      도달 층수 분포
                    </div>
                    <div className={styles.histogramBars}>
                      {floorData.map((d, i) => (
                        <div key={i} className={styles.histogramCol}>
                          <div className={styles.histogramValue}>
                            {d.percentage >= 1
                              ? `${d.percentage.toFixed(0)}%`
                              : d.percentage > 0
                                ? `${d.percentage.toFixed(1)}%`
                                : ''}
                          </div>
                          <div className={styles.histogramBarWrap}>
                            <div
                              className={`${styles.histogramBar} ${isNarak ? styles.histogramBarNarak : ''}`}
                              style={{
                                height: `${(d.percentage / maxPercentage) * 100}%`,
                                opacity: d.percentage > 0 ? 0.45 + (d.percentage / maxPercentage) * 0.55 : 1,
                              }}
                            />
                          </div>
                          <div className={styles.histogramLabel}>{d.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 히든 보상 통계 */}
                  <div className={styles.hiddenSection}>
                    <div className={styles.hiddenTitle}>
                      히든층 보상 획득 비율
                      <span className={styles.hiddenTotalBadge}>총 {hiddenTotal}회</span>
                    </div>
                    <div className={styles.hiddenGrid}>
                      {hiddenRewards.map(r => {
                        const count = (currentStat[r.key] as number) || 0;
                        const pct = hiddenTotal > 0 ? (count / hiddenTotal * 100) : 0;
                        return (
                          <div key={r.key} className={styles.hiddenItem}>
                            <span className={styles.hiddenItemName}>{r.label}</span>
                            <div className={styles.hiddenBarTrack}>
                              <div
                                className={`${styles.hiddenBarFill} ${styles[r.color + 'Bg']}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className={`${styles.hiddenItemPct} ${styles[r.color]}`}>
                              {pct.toFixed(1)}%
                            </span>
                            <span className={styles.hiddenItemCount}>{count}회</span>
                          </div>
                        );
                      })}
                    </div>
                    {currentStat.avg_hidden_count > 0 && (
                      <div className={styles.hiddenAvg}>
                        평균 히든 보상 수: <strong>{currentStat.avg_hidden_count}</strong>개 / 시뮬
                      </div>
                    )}
                  </div>

                  {/* 나락 전용 통계 */}
                  {isNarak && (
                    <>
                      <div className={styles.dashboardDivider} />

                      {/* 보상 미획득 / 부활 요약 */}
                      <div className={styles.narakStatsGridTwo}>
                        <div className={styles.narakStatCard}>
                          <div className={`${styles.narakStatValue} ${styles.colorRed}`}>
                            {currentStat.no_reward_rate}%
                          </div>
                          <div className={styles.narakStatLabel}>보상 미획득률</div>
                        </div>
                        <div className={styles.narakStatCard}>
                          <div className={`${styles.narakStatValue} ${styles.colorPurple}`}>
                            {currentStat.revive_rate}%
                          </div>
                          <div className={styles.narakStatLabel}>부활 사용률</div>
                        </div>
                      </div>

                      {/* 부활 후 행동 분석 */}
                      {currentStat.revive_count > 0 && (
                        <div className={styles.reviveBreakdown}>
                          <div className={styles.reviveBreakdownTitle}>
                            부활 사용 후 결과
                            <span className={styles.hiddenTotalBadge}>{currentStat.revive_count}명 부활</span>
                          </div>
                          <div className={styles.reviveBreakdownGrid}>
                            <div className={styles.reviveBreakdownItem}>
                              <span className={styles.reviveBreakdownLabel}>중단하고 보상 획득</span>
                              <span className={`${styles.reviveBreakdownValue} ${styles.colorYellow}`}>
                                {currentStat.revive_then_stop}회
                                {currentStat.revive_count > 0 && (
                                  <span className={styles.reviveBreakdownPct}>
                                    ({(currentStat.revive_then_stop / currentStat.revive_count * 100).toFixed(1)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className={styles.reviveBreakdownItem}>
                              <span className={styles.reviveBreakdownLabel}>계속 도전 → 생존 (더 많은 보상)</span>
                              <span className={`${styles.reviveBreakdownValue} ${styles.colorGreen}`}>
                                {currentStat.revive_then_survived}회
                                {reviveContinueTotal > 0 && (
                                  <span className={styles.reviveBreakdownPct}>
                                    (도전 중 {(currentStat.revive_then_survived / reviveContinueTotal * 100).toFixed(1)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className={styles.reviveBreakdownItem}>
                              <span className={styles.reviveBreakdownLabel}>계속 도전 → 사망 (보상 없음)</span>
                              <span className={`${styles.reviveBreakdownValue} ${styles.colorRed}`}>
                                {currentStat.revive_then_death}회
                                {reviveContinueTotal > 0 && (
                                  <span className={styles.reviveBreakdownPct}>
                                    (도전 중 {(currentStat.revive_then_death / reviveContinueTotal * 100).toFixed(1)}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 마지막 업데이트 */}
                  {currentStat.updated_at && (
                    <div className={styles.updatedAt}>
                      마지막 집계: {formatDate(currentStat.updated_at)}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
