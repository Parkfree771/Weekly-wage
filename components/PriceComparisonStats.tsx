'use client';

import { useMemo, createContext, useContext } from 'react';
import { Card } from 'react-bootstrap';

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

// 비교 차트 데이터 타입 (계승 재료 ↔ 일반 재료)
type ComparisonData = {
  normalHistory: PriceEntry[];       // 일반 재료 히스토리 (가격 × 5 적용됨)
  normalIcon: string;                // 일반 재료 아이콘
  ratio: number;                     // 교환 비율 (5:1)
} | null;

type ReferenceLineType = 'min' | 'avg' | 'max' | 'current';

type PriceContextType = {
  history: PriceEntry[];
  filteredHistory: PriceEntry[];
  selectedPeriod: PeriodOption;
  setSelectedPeriod: (period: PeriodOption) => void;
  comparisonData: ComparisonData;    // 비교 차트 데이터
  isGridView: boolean;
  onToggleGridView: () => void;
  activeReferenceLines: Set<ReferenceLineType>;
  toggleReferenceLine: (type: ReferenceLineType) => void;
  selectItemById: (itemId: string) => void;  // 아이템 ID로 선택
};

export const PriceContext = createContext<PriceContextType>({
  history: [],
  filteredHistory: [],
  selectedPeriod: '1m',
  setSelectedPeriod: () => {},
  comparisonData: null,
  isGridView: false,
  onToggleGridView: () => {},
  activeReferenceLines: new Set<ReferenceLineType>(),
  toggleReferenceLine: () => {},
  selectItemById: () => {},
});

// 그리드 아이콘 SVG 컴포넌트
function GridIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

// 그리드 토글 버튼 컴포넌트 (Context 사용)
export function GridToggleButton() {
  const { isGridView, onToggleGridView } = useContext(PriceContext);

  return (
    <button
      onClick={onToggleGridView}
      title={isGridView ? '단일 차트 보기' : '4분할 차트 보기'}
      style={{
        background: isGridView ? 'var(--card-bg)' : 'transparent',
        border: '2px solid var(--text-secondary)',
        borderRadius: '8px',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s ease',
        color: 'var(--text-secondary)',
      }}
    >
      <GridIcon size={16} color="currentColor" />
    </button>
  );
}

const formatPrice = (value: number, isAverage = false, noDecimal = false) => {
  if (noDecimal) {
    value = Math.round(value);
  }

  if (value >= 1000000) {
    const manValue = value / 10000;
    if (noDecimal) {
      return Math.round(manValue).toLocaleString('ko-KR') + '만 G';
    }
    return manValue.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만 G';
  }
  if (value < 100) {
    if (noDecimal) {
      return Math.round(value).toLocaleString('ko-KR') + ' G';
    }
    return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' G';
  }
  if (isAverage || noDecimal) {
    return Math.floor(value).toLocaleString('ko-KR') + ' G';
  }
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + ' G';
};

export default function PriceComparisonStats() {
  const { filteredHistory, activeReferenceLines, toggleReferenceLine } = useContext(PriceContext);

  // 통계 계산 (필터링된 기간의 데이터만 사용)
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const current = filteredHistory[filteredHistory.length - 1].price;
    const min = Math.min(...filteredHistory.map(h => h.price));
    const max = Math.max(...filteredHistory.map(h => h.price));
    const avg = filteredHistory.reduce((sum, h) => sum + h.price, 0) / filteredHistory.length;

    const changeFromMin = min > 0 ? ((current - min) / min) * 100 : 0;
    const changeFromAvg = avg > 0 ? ((current - avg) / avg) * 100 : 0;
    const changeFromMax = max > 0 ? ((current - max) / max) * 100 : 0;

    // 가격 위치 (0~100%, 최저가=0%, 최고가=100%)
    const pricePosition = max === min ? 50 : ((current - min) / (max - min)) * 100;

    return {
      current,
      min,
      max,
      avg,
      changeFromMin,
      changeFromAvg,
      changeFromMax,
      pricePosition,
    };
  }, [filteredHistory]);

  if (!stats || filteredHistory.length === 0) return null;

  // 가격 위치에 따른 색상 계산 (파란색 -> 보라색 -> 빨간색 그라데이션)
  const getPositionColor = (position: number) => {
    if (position <= 30) return '#3b82f6'; // 파란색 (저점)
    if (position >= 70) return '#ef4444'; // 빨간색 (고점)
    return '#8b5cf6'; // 보라색 (중간)
  };

  const positionColor = getPositionColor(stats.pricePosition);

  return (
    <>
      {/* 가격 비교 통계 - 데스크톱 */}
      <Card className="mt-3 d-none d-md-block" style={{ color: 'var(--text-primary)', maxWidth: '1400px', margin: '16px auto 0', overflow: 'hidden' }}>
        <Card.Body className="p-3">
          {/* 가격 위치 바 */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <div
                onClick={() => toggleReferenceLine('min')}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeReferenceLines.has('min') ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: activeReferenceLines.has('min') ? '1px solid #3b82f6' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>최저</div>
                <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>{formatPrice(stats.min, false, true)}</div>
              </div>
              <div
                onClick={() => toggleReferenceLine('current')}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeReferenceLines.has('current') ? `${positionColor}20` : 'transparent',
                  border: activeReferenceLines.has('current') ? `1px solid ${positionColor}` : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>현재</div>
                <div style={{ fontSize: '1.1rem', color: positionColor, fontWeight: '700' }}>{formatPrice(stats.current, false, true)}</div>
              </div>
              <div
                onClick={() => toggleReferenceLine('avg')}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeReferenceLines.has('avg') ? 'rgba(107, 114, 128, 0.15)' : 'transparent',
                  border: activeReferenceLines.has('avg') ? '1px solid #6b7280' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>평균</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{formatPrice(stats.avg, false, true)}</div>
              </div>
              <div
                onClick={() => toggleReferenceLine('max')}
                style={{
                  textAlign: 'right',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: activeReferenceLines.has('max') ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  border: activeReferenceLines.has('max') ? '1px solid #ef4444' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>최고</div>
                <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600' }}>{formatPrice(stats.max, false, true)}</div>
              </div>
            </div>
            <div style={{
              position: 'relative',
              height: '8px',
              borderRadius: '4px',
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #ef4444)',
              opacity: 0.4
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${stats.pricePosition}%`,
                transform: 'translate(-50%, -50%)',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: positionColor,
                border: '3px solid var(--card-bg)',
                boxShadow: `0 0 0 2px ${positionColor}, 0 2px 8px ${positionColor}80`
              }} />
            </div>
          </div>

          {/* 대비 변동률 - 한 줄 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            padding: '8px 0',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '6px' }}>최저가 대비</span>
              <span style={{ fontSize: '0.85rem', color: stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700' }}>
                {stats.changeFromMin >= 0 ? '+' : ''}{stats.changeFromMin.toFixed(1)}%
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '6px' }}>평균 대비</span>
              <span style={{ fontSize: '0.85rem', color: stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700' }}>
                {stats.changeFromAvg >= 0 ? '+' : ''}{stats.changeFromAvg.toFixed(1)}%
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '6px' }}>최고가 대비</span>
              <span style={{ fontSize: '0.85rem', color: stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700' }}>
                {stats.changeFromMax >= 0 ? '+' : ''}{stats.changeFromMax.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 가격 비교 통계 - 모바일 */}
      <Card className="mt-2 d-md-none" style={{ color: 'var(--text-primary)', overflow: 'hidden' }}>
        <Card.Body className="p-2">
          {/* 가격 위치 바 - 모바일 */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
              <div
                onClick={() => toggleReferenceLine('min')}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeReferenceLines.has('min') ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: activeReferenceLines.has('min') ? '1px solid #3b82f6' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>최저</div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600' }}>{formatPrice(stats.min, false, true)}</div>
              </div>
              <div
                onClick={() => toggleReferenceLine('current')}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeReferenceLines.has('current') ? `${positionColor}20` : 'transparent',
                  border: activeReferenceLines.has('current') ? `1px solid ${positionColor}` : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>현재</div>
                <div style={{ fontSize: '0.95rem', color: positionColor, fontWeight: '700' }}>{formatPrice(stats.current, false, true)}</div>
              </div>
              <div
                onClick={() => toggleReferenceLine('avg')}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeReferenceLines.has('avg') ? 'rgba(107, 114, 128, 0.15)' : 'transparent',
                  border: activeReferenceLines.has('avg') ? '1px solid #6b7280' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>평균</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{formatPrice(stats.avg, false, true)}</div>
              </div>
              <div
                onClick={() => toggleReferenceLine('max')}
                style={{
                  textAlign: 'right',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeReferenceLines.has('max') ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  border: activeReferenceLines.has('max') ? '1px solid #ef4444' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>최고</div>
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>{formatPrice(stats.max, false, true)}</div>
              </div>
            </div>
            <div style={{
              position: 'relative',
              height: '6px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #ef4444)',
              opacity: 0.4
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${stats.pricePosition}%`,
                transform: 'translate(-50%, -50%)',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: positionColor,
                border: '2px solid var(--card-bg)',
                boxShadow: `0 0 0 2px ${positionColor}, 0 2px 6px ${positionColor}80`
              }} />
            </div>
          </div>

          {/* 대비 변동률 - 한 줄 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '6px 0',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>최저 대비</div>
              <div style={{ fontSize: '0.8rem', color: stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700' }}>
                {stats.changeFromMin >= 0 ? '+' : ''}{stats.changeFromMin.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>평균 대비</div>
              <div style={{ fontSize: '0.8rem', color: stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700' }}>
                {stats.changeFromAvg >= 0 ? '+' : ''}{stats.changeFromAvg.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>최고 대비</div>
              <div style={{ fontSize: '0.8rem', color: stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700' }}>
                {stats.changeFromMax >= 0 ? '+' : ''}{stats.changeFromMax.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
