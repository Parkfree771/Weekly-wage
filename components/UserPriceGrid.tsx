'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TRACKED_ITEMS, ItemCategory, getItemsByCategory, findItemById } from '@/lib/items-to-track';
import { CATEGORY_STYLES } from './ItemSelector';
import { fetchPriceData } from '@/lib/price-history-client';
import { useTheme } from './ThemeProvider';
import Image from 'next/image';

const CATEGORY_ORDER: ItemCategory[] = ['refine', 'gem', 'refine_additional', 'engraving', 'accessory', 'bracelet', 'jewel'];

const STORAGE_KEY = 'userPriceGridSlots';
const MAX_SLOTS = 9;

type SlotConfig = {
  itemId: string;
}[];

type PriceEntry = { date: string; price: number };

type ItemStats = {
  current: number;
  min: number;
  max: number;
  avg: number;
  yesterday: number | null;
  changeFromYesterday: number | null;
  changePercent: number | null;
  avg1m: number | null;
  avg3m: number | null;
  avgAll: number | null;
  diffFromAvg: number | null;
  diffFromAvgPercent: number | null;
};

const loadSlots = (): SlotConfig => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SlotConfig;
      return parsed.filter(s => TRACKED_ITEMS.some(t => t.id === s.itemId));
    }
  } catch { /* ignore */ }
  return [];
};

const saveSlots = (slots: SlotConfig) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch { /* ignore */ }
};

function calcStats(entries: PriceEntry[], currentPrice: number): ItemStats {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const todayStr = kstNow.toISOString().slice(0, 10);

  // 어제 날짜
  const yesterday = new Date(kstNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // 전체 히스토리 (오늘 제외)
  const historyOnly = entries.filter(e => e.date !== todayStr);
  const allPrices = [...historyOnly.map(e => e.price), currentPrice];

  const yesterdayEntry = historyOnly.find(e => e.date === yesterdayStr);
  const yesterdayPrice = yesterdayEntry?.price ?? null;

  const changeFromYesterday = yesterdayPrice !== null ? currentPrice - yesterdayPrice : null;
  const changePercent = yesterdayPrice !== null && yesterdayPrice > 0
    ? ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100
    : null;

  // 기간별 평균
  const getAvg = (days: number): number | null => {
    const cutoff = new Date(kstNow);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const filtered = historyOnly.filter(e => e.date >= cutoffStr);
    if (filtered.length === 0) return null;
    return filtered.reduce((s, e) => s + e.price, 0) / filtered.length;
  };

  const avgAll = historyOnly.length > 0
    ? historyOnly.reduce((s, e) => s + e.price, 0) / historyOnly.length
    : null;

  const diffFromAvg = avgAll !== null ? currentPrice - avgAll : null;
  const diffFromAvgPercent = avgAll !== null && avgAll > 0
    ? ((currentPrice - avgAll) / avgAll) * 100
    : null;

  return {
    current: currentPrice,
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
    avg: allPrices.reduce((s, p) => s + p, 0) / allPrices.length,
    yesterday: yesterdayPrice,
    changeFromYesterday,
    changePercent,
    avg1m: getAvg(30),
    avg3m: getAvg(90),
    avgAll,
    diffFromAvg,
    diffFromAvgPercent,
  };
}

function formatGold(value: number): string {
  return Math.round(value).toLocaleString();
}

function StatCard({ itemId, stats, theme }: { itemId: string; stats: ItemStats | null; theme: string }) {
  const item = TRACKED_ITEMS.find(t => t.id === itemId);
  const found = item ? findItemById(item.id) : null;
  const catStyle = found ? CATEGORY_STYLES[found.category] : CATEGORY_STYLES.refine;

  if (!item) return null;

  const accentColor = theme === 'dark' ? catStyle.darkThemeColor : catStyle.color;
  const changeColor = (val: number | null) =>
    val === null ? 'var(--text-secondary)' : val > 0 ? '#ef4444' : val < 0 ? '#3b82f6' : 'var(--text-secondary)';

  return (
    <div style={{
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      height: '100%',
    }}>
      {/* 첫 줄: 이미지 + 이름 (왼쪽) / 가격 + 어제대비% (오른쪽, x버튼 옆) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {item.icon && (
          <Image src={item.icon} alt="" width={40} height={40} style={{ borderRadius: '5px', flexShrink: 0 }} />
        )}
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
          flex: 1,
          minWidth: 0,
        }}>
          {item.name}
        </div>
        {stats && (
          <div style={{ textAlign: 'right', flexShrink: 0, paddingRight: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '3px' }}>
              <span style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '-0.5px',
              }}>
                {formatGold(stats.current)}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>G</span>
            </div>
            {stats.changePercent !== null && (
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: changeColor(stats.changeFromYesterday),
                marginTop: '1px',
              }}>
                {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      {!stats ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div className="spinner-border spinner-border-sm text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        /* 통계 행들 */
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 20px',
          fontSize: '0.9rem',
          flex: 1,
          alignContent: 'center',
        }}>
          <StatRow label="최저" value={formatGold(stats.min)} />
          <StatRow label="최고" value={formatGold(stats.max)} />
          {stats.avg1m !== null && <StatRow label="1개월 평균" value={formatGold(stats.avg1m)} />}
          {stats.avg3m !== null && <StatRow label="3개월 평균" value={formatGold(stats.avg3m)} />}
          {stats.avgAll !== null && <StatRow label="전체 평균" value={formatGold(stats.avgAll)} />}
          {stats.diffFromAvgPercent !== null && (
            <StatRow
              label="평균대비"
              value={`${stats.diffFromAvgPercent > 0 ? '+' : ''}${stats.diffFromAvgPercent.toFixed(1)}%`}
              valueColor={changeColor(stats.diffFromAvgPercent)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor || 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}

export default function UserPriceGrid() {
  const { theme } = useTheme();
  const [slots, setSlots] = useState<SlotConfig>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, ItemStats | null>>({});
  const dragItemRef = useRef<string | null>(null);

  useEffect(() => {
    setSlots(loadSlots());
    setMounted(true);
  }, []);

  // 가격 데이터 로드 & 통계 계산
  useEffect(() => {
    if (slots.length === 0) return;

    const itemIds = slots.map(s => s.itemId);

    fetchPriceData().then(({ history, latest }) => {
      const newStats: Record<string, ItemStats | null> = {};

      for (const id of itemIds) {
        const currentPrice = latest[id];
        const entries = history[id] || [];

        if (currentPrice === undefined && entries.length === 0) {
          newStats[id] = null;
          continue;
        }

        const price = currentPrice ?? (entries.length > 0 ? entries[entries.length - 1].price : 0);
        newStats[id] = calcStats(entries, price);
      }

      setStatsMap(newStats);
    }).catch(err => {
      console.error('Failed to fetch price data:', err);
    });
  }, [slots]);

  const updateSlots = useCallback((newSlots: SlotConfig) => {
    setSlots(newSlots);
    saveSlots(newSlots);
  }, []);

  const handleDragStart = (itemId: string) => {
    dragItemRef.current = itemId;
  };

  const handleDrop = (slotIndex: number) => {
    const itemId = dragItemRef.current;
    if (!itemId) return;

    const filtered = slots.filter(s => s.itemId !== itemId);
    const newSlots = [...filtered];

    if (slotIndex >= newSlots.length) {
      if (newSlots.length < MAX_SLOTS) {
        newSlots.push({ itemId });
      }
    } else {
      newSlots.splice(slotIndex, 0, { itemId });
      if (newSlots.length > MAX_SLOTS) newSlots.length = MAX_SLOTS;
    }

    updateSlots(newSlots);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleRemove = (itemId: string) => {
    updateSlots(slots.filter(s => s.itemId !== itemId));
  };

  const handleItemClick = (itemId: string) => {
    if (slots.some(s => s.itemId === itemId)) {
      updateSlots(slots.filter(s => s.itemId !== itemId));
      return;
    }
    if (slots.length >= MAX_SLOTS) return;
    updateSlots([...slots, { itemId }]);
  };

  const categoryItems = selectedCategory ? getItemsByCategory(selectedCategory) : [];
  const catStyle = selectedCategory ? CATEGORY_STYLES[selectedCategory] : CATEGORY_STYLES.refine;

  if (!mounted) return null;

  return (
    <div style={{ marginTop: '24px' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <h3 style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          나의 시세 모아보기
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '8px' }}>
            클릭 또는 드래그로 추가 (최대 {MAX_SLOTS}개)
          </span>
        </h3>
      </div>

      {/* 카테고리 탭 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: selectedCategory ? '10px' : '16px',
        flexWrap: 'wrap',
      }}>
        {CATEGORY_ORDER.map((cat) => {
          const cs = CATEGORY_STYLES[cat];
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(isSelected ? null : cat)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: `2px solid ${isSelected ? (theme === 'dark' ? cs.darkThemeColor : cs.color) : 'var(--border-color)'}`,
                backgroundColor: isSelected ? (theme === 'dark' ? cs.darkBg : cs.lightBg) : 'var(--card-bg)',
                color: isSelected ? (theme === 'dark' ? cs.darkThemeColor : cs.darkColor) : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: isSelected ? 700 : 600,
                transition: 'all 0.2s ease',
                letterSpacing: '0.3px',
              }}
            >
              {cs.label}
            </button>
          );
        })}
      </div>

      {/* 아이템 목록 (카테고리 선택 시만 표시) */}
      {selectedCategory && (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}>
          {categoryItems.map((item) => {
            const isInSlot = slots.some(s => s.itemId === item.id);
            return (
              <button
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onClick={() => handleItemClick(item.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${isInSlot ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.color) : 'var(--border-color)'}`,
                  backgroundColor: isInSlot
                    ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg)
                    : 'var(--card-bg)',
                  color: isInSlot
                    ? (theme === 'dark' ? catStyle.darkThemeColor : catStyle.darkColor)
                    : 'var(--text-secondary)',
                  cursor: 'grab',
                  fontSize: '0.9rem',
                  fontWeight: isInSlot ? 700 : 500,
                  transition: 'all 0.15s ease',
                  opacity: isInSlot ? 1 : 0.85,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {item.icon && (
                  <Image src={item.icon} alt="" width={22} height={22} style={{ borderRadius: '3px' }} />
                )}
                {item.name}
                {isInSlot && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* 통계 카드 그리드 (데스크톱 3열, 모바일 1열) */}
      {slots.length > 0 ? (
        <div className="user-price-grid">
          {slots.map((slot, idx) => {
            const found = findItemById(slot.itemId);
            const itemCatStyle = found ? CATEGORY_STYLES[found.category] : catStyle;

            return (
              <div
                key={slot.itemId}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  border: dragOverIndex === idx
                    ? `2px dashed ${theme === 'dark' ? itemCatStyle.darkThemeColor : itemCatStyle.color}`
                    : '1px solid var(--border-color)',
                  backgroundColor: 'var(--card-bg)',
                  overflow: 'hidden',
                  minHeight: '200px',
                }}
              >
                {/* 제거 버튼 */}
                <button
                  onClick={() => handleRemove(slot.itemId)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    zIndex: 10,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    lineHeight: 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  ✕
                </button>
                <StatCard
                  itemId={slot.itemId}
                  stats={statsMap[slot.itemId] ?? null}
                  theme={theme}
                />
              </div>
            );
          })}

          {/* 빈 슬롯 (드롭 영역) */}
          {slots.length < MAX_SLOTS && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(slots.length); }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => { e.preventDefault(); handleDrop(slots.length); }}
              style={{
                borderRadius: '12px',
                border: dragOverIndex === slots.length
                  ? `2px dashed ${theme === 'dark' ? catStyle.darkThemeColor : catStyle.color}`
                  : '2px dashed var(--border-color)',
                backgroundColor: dragOverIndex === slots.length
                  ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg)
                  : 'transparent',
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                transition: 'all 0.2s ease',
              }}
            >
              드래그하여 추가
            </div>
          )}
        </div>
      ) : (
        /* 비어있는 상태 */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(0); }}
          onDragLeave={() => setDragOverIndex(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(0); }}
          style={{
            borderRadius: '12px',
            border: dragOverIndex === 0
              ? `2px dashed ${theme === 'dark' ? catStyle.darkThemeColor : catStyle.color}`
              : '2px dashed var(--border-color)',
            backgroundColor: dragOverIndex === 0
              ? (theme === 'dark' ? catStyle.darkBg : catStyle.lightBg)
              : 'transparent',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>📊</span>
          <span>위 목록에서 아이템을 클릭하거나 드래그하여 추가하세요</span>
        </div>
      )}
    </div>
  );
}
