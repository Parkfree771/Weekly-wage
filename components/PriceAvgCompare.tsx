'use client';

import { useState, useEffect } from 'react';
import { TRACKED_ITEMS } from '@/lib/items-to-track';
import { fetchPriceData } from '@/lib/price-history-client';
import Image from 'next/image';
import styles from './PriceAvgCompare.module.css';

type Period = '7d' | '1m' | '3m' | 'all';

const PERIODS: { key: Period; label: string; days: number | null; displayLabel: string }[] = [
  { key: '7d', label: '7일', days: 7, displayLabel: '7일' },
  { key: '1m', label: '1개월', days: 30, displayLabel: '1개월' },
  { key: '3m', label: '3개월', days: 90, displayLabel: '3개월' },
  { key: 'all', label: '전체', days: null, displayLabel: '전체' },
];

type ItemCompare = {
  id: string;
  name: string;
  icon: string;
  current: number;
  avg: number;
  diffPercent: number;
};

export default function PriceAvgCompare() {
  const [period, setPeriod] = useState<Period>('1m');
  const [higher, setHigher] = useState<ItemCompare[]>([]);
  const [lower, setLower] = useState<ItemCompare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPriceData().then(({ history, latest }) => {
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = new Date(now.getTime() + kstOffset);
      const todayStr = kstNow.toISOString().slice(0, 10);

      const selected = PERIODS.find(p => p.key === period)!;
      let cutoffStr: string | null = null;
      if (selected.days !== null) {
        const cutoff = new Date(kstNow);
        cutoff.setDate(cutoff.getDate() - selected.days);
        cutoffStr = cutoff.toISOString().slice(0, 10);
      }

      const higherList: ItemCompare[] = [];
      const lowerList: ItemCompare[] = [];

      for (const item of TRACKED_ITEMS) {
        const currentPrice = latest[item.id];
        if (currentPrice === undefined) continue;

        const entries = (history[item.id] || []).filter(e => e.date !== todayStr);
        const filtered = cutoffStr ? entries.filter(e => e.date >= cutoffStr!) : entries;
        if (filtered.length === 0) continue;

        const avg = filtered.reduce((s, e) => s + e.price, 0) / filtered.length;
        const diffPercent = ((currentPrice - avg) / avg) * 100;

        const data: ItemCompare = {
          id: item.id,
          name: item.name,
          icon: item.icon || '',
          current: currentPrice,
          avg,
          diffPercent,
        };

        if (currentPrice > avg) {
          higherList.push(data);
        } else {
          lowerList.push(data);
        }
      }

      higherList.sort((a, b) => b.diffPercent - a.diffPercent);
      lowerList.sort((a, b) => a.diffPercent - b.diffPercent);

      setHigher(higherList);
      setLower(lowerList);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const selectedPeriod = PERIODS.find(p => p.key === period)!;
  const renderItems = (items: ItemCompare[], type: 'higher' | 'lower') => {
    if (items.length === 0) {
      return <span className={styles.empty}>없음</span>;
    }
    return items.map(item => (
      <div
        key={item.id}
        title={`${item.name}\n현재: ${Math.round(item.current).toLocaleString()}G\n평균: ${Math.round(item.avg).toLocaleString()}G\n차이: ${type === 'higher' ? '+' : ''}${item.diffPercent.toFixed(1)}%`}
        className={styles.itemCard}
      >
        <div className={`${styles.itemIcon} ${type === 'higher' ? styles.iconHigher : styles.iconLower}`}>
          {item.icon && (
            <Image
              src={item.icon}
              alt={item.name}
              width={72}
              height={72}
              className={styles.itemImage}
              loading="lazy"
              unoptimized
            />
          )}
          <div className={`${styles.percentBadge} ${type === 'higher' ? styles.badgeHigher : styles.badgeLower}`}>
            {type === 'higher' ? '+' : ''}{item.diffPercent.toFixed(1)}%
          </div>
        </div>
        <span className={styles.itemName}>{item.name}</span>
      </div>
    ));
  };

  return (
    <div className={styles.wrapper}>
      {/* 헤더 */}
      <div className={styles.header}>
        <h3 className={styles.title}>현재 가격은 평균보다 <span className={styles.titleHigher}>높은가</span>? <span className={styles.titleLower}>낮은가</span>?</h3>
        <div className={styles.periodButtons}>
          {PERIODS.map(p => {
            const isActive = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`${styles.periodBtn} ${isActive ? styles.periodActive : ''}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className="spinner-border spinner-border-sm text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {/* 낮다 (데스크톱: 왼쪽, 모바일: 아래) */}
          <div className={`${styles.section} ${styles.sectionLower}`}>
            <div className={styles.sectionTitle} style={{ color: '#3b82f6' }}>
              {selectedPeriod.displayLabel} 평균보다 낮다
              <span className={styles.count}>({lower.length})</span>
            </div>
            <div className={styles.itemGrid}>
              {renderItems(lower, 'lower')}
            </div>
          </div>

          {/* 높다 (데스크톱: 오른쪽, 모바일: 위) */}
          <div className={`${styles.section} ${styles.sectionHigher}`}>
            <div className={styles.sectionTitle} style={{ color: '#ef4444' }}>
              {selectedPeriod.displayLabel} 평균보다 높다
              <span className={styles.count}>({higher.length})</span>
            </div>
            <div className={styles.itemGrid}>
              {renderItems(higher, 'higher')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
