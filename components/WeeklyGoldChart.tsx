'use client';

import { useMemo } from 'react';
import styles from './WeeklyGoldChart.module.css';
import { WeeklyGoldRecord } from '@/types/user';

type Props = {
  history: WeeklyGoldRecord[];
  currentWeekGold: number;
  currentWeekLabel: string;
};

export default function WeeklyGoldChart({ history, currentWeekGold, currentWeekLabel }: Props) {
  // 최근 8주 데이터 + 현재 주
  const chartData = useMemo(() => {
    const recentHistory = history.slice(-7); // 최근 7주
    const allData = [
      ...recentHistory.map(h => ({
        label: h.weekLabel,
        gold: h.totalGold,
        isCurrent: false,
      })),
      {
        label: currentWeekLabel,
        gold: currentWeekGold,
        isCurrent: true,
      },
    ];
    return allData;
  }, [history, currentWeekGold, currentWeekLabel]);

  // 최대값 계산 (차트 스케일용) - 기본 50만골, 초과시 반응형
  const maxGold = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.gold), 1);
    // 50만골 이하면 50만골 고정, 초과시 10만 단위로 올림
    if (max <= 500000) {
      return 500000;
    }
    return Math.ceil(max / 100000) * 100000;
  }, [chartData]);

  // Y축 라벨 생성 (10만골 단위)
  const yAxisLabels = useMemo(() => {
    const labels = [];
    const step = 100000;
    for (let i = maxGold; i >= 0; i -= step) {
      labels.push(i);
    }
    return labels;
  }, [maxGold]);

  // 데이터 없으면 표시
  if (chartData.length === 1 && chartData[0].gold === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>주간 골드 기록</h3>
        </div>
        <div className={styles.emptyState}>
          <p>아직 기록된 데이터가 없습니다.</p>
          <p className={styles.emptyHint}>레이드를 체크하면 이번 주 골드가 표시됩니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>주간 골드 기록</h3>
          <span className={styles.subtitle}>최근 8주</span>
        </div>
      </div>

      <div className={styles.chartWrapper}>
        {/* Y축 레이블 (10만골 단위) */}
        <div className={styles.yAxis}>
          {yAxisLabels.map((value, idx) => (
            <span key={idx} className={styles.yLabel}>
              {value.toLocaleString()}
            </span>
          ))}
        </div>

        {/* 막대 그래프 */}
        <div className={styles.chartArea}>
          {/* 그리드 라인 */}
          <div className={styles.gridLines}>
            {yAxisLabels.map((_, idx) => (
              <div key={idx} className={styles.gridLine} />
            ))}
          </div>

          {/* 막대들 */}
          <div className={styles.barsContainer}>
            {chartData.map((data, idx) => {
              const heightPercent = (data.gold / maxGold) * 100;

              return (
                <div key={idx} className={styles.barWrapper}>
                  {/* 골드 수치 */}
                  <span className={`${styles.barValue} ${data.isCurrent ? styles.currentValue : ''}`}>
                    {data.gold.toLocaleString()}
                  </span>

                  {/* 막대 */}
                  <div
                    className={`${styles.bar} ${data.isCurrent ? styles.currentBar : ''}`}
                    style={{ height: data.gold === 0 ? '0' : `${Math.max(heightPercent, 3)}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X축 라벨 */}
          <div className={styles.xAxisLabels}>
            {chartData.map((data, idx) => (
              <span key={idx} className={`${styles.xLabel} ${data.isCurrent ? styles.currentLabel : ''}`}>
                {data.label}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
