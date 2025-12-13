'use client';

import { useMemo, createContext, useContext } from 'react';
import { Card } from 'react-bootstrap';
import { useTheme } from './ThemeProvider';

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string;
};

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

type PriceContextType = {
  history: PriceEntry[];
  filteredHistory: PriceEntry[];
  selectedPeriod: PeriodOption;
  setSelectedPeriod: (period: PeriodOption) => void;
};

export const PriceContext = createContext<PriceContextType>({
  history: [],
  filteredHistory: [],
  selectedPeriod: '1m',
  setSelectedPeriod: () => {},
});

const formatPrice = (value: number) => {
  if (value < 100) {
    return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G';
  }
  return value.toLocaleString('ko-KR') + ' G';
};

export default function PriceComparisonStats() {
  const { theme } = useTheme();
  const { filteredHistory } = useContext(PriceContext);

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

    // 연속 상승/하락일 계산
    let consecutiveDays = 0;
    let isRising = true;
    for (let i = filteredHistory.length - 1; i > 0; i--) {
      const prevPrice = filteredHistory[i - 1].price;
      const currPrice = filteredHistory[i].price;

      if (i === filteredHistory.length - 1) {
        isRising = currPrice > prevPrice;
      }

      if ((isRising && currPrice > prevPrice) || (!isRising && currPrice < prevPrice)) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    // 노동 가치 환산 (종막 하드 기준 52,000골드)
    const jongmakHardCount = Math.ceil(current / 52000);

    // 매수 타이밍 계산
    const priceRatio = max > min ? (current - min) / (max - min) : 0.5;
    let buyingSignal: '매수 적기' | '관망 추천' | '과열 주의';
    let buyingColor: string;

    if (priceRatio <= 0.3) {
      buyingSignal = '매수 적기';
      buyingColor = '#3b82f6'; // 파란색
    } else if (priceRatio <= 0.7) {
      buyingSignal = '관망 추천';
      buyingColor = '#f59e0b'; // 주황색
    } else {
      buyingSignal = '과열 주의';
      buyingColor = '#ef4444'; // 빨간색
    }

    return {
      current,
      min,
      max,
      avg,
      changeFromMin,
      changeFromAvg,
      changeFromMax,
      consecutiveDays,
      isRising,
      jongmakHardCount,
      buyingSignal,
      buyingColor,
      priceRatio,
    };
  }, [filteredHistory]);

  if (!stats || filteredHistory.length === 0) return null;

  return (
    <>
      {/* 가격 비교 통계 - 데스크톱 */}
      <Card className="border-0 shadow-lg mt-3 d-none d-md-block" style={{ borderRadius: '16px', background: 'var(--card-body-bg-stone)', color: 'var(--text-primary)', maxWidth: '1400px', margin: '16px auto 0', overflow: 'hidden' }}>
        <Card.Header
          className="text-center py-3 border-0"
          style={{
            background: 'var(--card-header-bg-stone)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h4
            className="mb-0"
            style={{
              fontWeight: '600',
              fontSize: '1.1rem',
              background: 'var(--gradient-text-stone)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em'
            }}
          >
            가격 변동 분석
          </h4>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="row g-2">
            <div className="col-md-4">
              <div
                style={{
                  backgroundColor: stats.changeFromMin >= 0
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '12px',
                  border: `2px solid ${stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6'}`,
                  padding: '8px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = stats.changeFromMin >= 0
                    ? '0 8px 24px rgba(239, 68, 68, 0.25)'
                    : '0 8px 24px rgba(59, 130, 246, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    최저가 대비
                  </div>
                  <div style={{ fontSize: '1.6rem', color: stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>
                    {stats.changeFromMin >= 0 ? '+' : '-'}{Math.abs(stats.changeFromMin).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: `1px solid ${stats.changeFromMin >= 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`, paddingTop: '4px' }}>
                    최저가: {formatPrice(stats.min)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div
                style={{
                  backgroundColor: stats.changeFromAvg >= 0
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '12px',
                  border: `2px solid ${stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6'}`,
                  padding: '8px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = stats.changeFromAvg >= 0
                    ? '0 8px 24px rgba(239, 68, 68, 0.25)'
                    : '0 8px 24px rgba(59, 130, 246, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    평균가 대비
                  </div>
                  <div style={{ fontSize: '1.6rem', color: stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>
                    {stats.changeFromAvg >= 0 ? '+' : '-'}{Math.abs(stats.changeFromAvg).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: `1px solid ${stats.changeFromAvg >= 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`, paddingTop: '4px' }}>
                    평균가: {formatPrice(stats.avg)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div
                style={{
                  backgroundColor: stats.changeFromMax >= 0
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '12px',
                  border: `2px solid ${stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6'}`,
                  padding: '8px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = stats.changeFromMax >= 0
                    ? '0 8px 24px rgba(239, 68, 68, 0.25)'
                    : '0 8px 24px rgba(59, 130, 246, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    최고가 대비
                  </div>
                  <div style={{ fontSize: '1.6rem', color: stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>
                    {stats.changeFromMax >= 0 ? '+' : '-'}{Math.abs(stats.changeFromMax).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: `1px solid ${stats.changeFromMax >= 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`, paddingTop: '4px' }}>
                    최고가: {formatPrice(stats.max)}
                  </div>
                </div>
              </div>
            </div>

            {/* 연속 상승/하락일 */}
            <div className="col-md-4">
              <div
                style={{
                  backgroundColor: stats.isRising
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '12px',
                  border: `2px solid ${stats.isRising ? '#ef4444' : '#3b82f6'}`,
                  padding: '8px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = stats.isRising
                    ? '0 8px 24px rgba(239, 68, 68, 0.25)'
                    : '0 8px 24px rgba(59, 130, 246, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    연속 {stats.isRising ? '상승' : '하락'}
                  </div>
                  <div style={{ fontSize: '1.6rem', color: stats.isRising ? '#ef4444' : '#3b82f6', fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>
                    {stats.consecutiveDays}일
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: `1px solid ${stats.isRising ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`, paddingTop: '4px' }}>
                    {stats.isRising ? '상승세' : '하락세'}
                  </div>
                </div>
              </div>
            </div>

            {/* 노동 가치 환산 */}
            <div className="col-md-4">
              <div
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',
                  borderRadius: '12px',
                  border: '2px solid #a855f7',
                  padding: '8px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    노동 가치
                  </div>
                  <div style={{ fontSize: '1.6rem', color: '#a855f7', fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>
                    {stats.jongmakHardCount}회
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: '1px solid rgba(168, 85, 247, 0.3)', paddingTop: '4px' }}>
                    종막 하드 클리어 골드
                  </div>
                </div>
              </div>
            </div>

            {/* 매수 타이밍 */}
            <div className="col-md-4">
              <div
                style={{
                  backgroundColor: theme === 'dark'
                    ? `${stats.buyingColor}26`
                    : `${stats.buyingColor}14`,
                  borderRadius: '12px',
                  border: `2px solid ${stats.buyingColor}`,
                  padding: '8px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${stats.buyingColor}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    매수 타이밍
                  </div>
                  <div style={{ fontSize: '1.6rem', color: stats.buyingColor, fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>
                    {stats.buyingSignal}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', borderTop: `1px solid ${stats.buyingColor}4D`, paddingTop: '4px' }}>
                    가격 구간: {(stats.priceRatio * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 가격 비교 통계 - 모바일 */}
      <Card className="border-0 shadow-lg mt-2 d-md-none" style={{ borderRadius: '12px', background: 'var(--card-body-bg-stone)', color: 'var(--text-primary)', overflow: 'hidden' }}>
        <Card.Header
          className="text-center py-2 border-0"
          style={{
            background: 'var(--card-header-bg-stone)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <h5
            className="mb-0"
            style={{
              fontWeight: '600',
              fontSize: '0.9rem',
              background: 'var(--gradient-text-stone)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em'
            }}
          >
            가격 변동 분석
          </h5>
        </Card.Header>
        <Card.Body className="p-2">
          <div className="d-flex gap-2" style={{ overflowX: 'auto', padding: '4px 0' }}>
            <div style={{ minWidth: '110px', flex: '1 1 0' }}>
              <div
                style={{
                  backgroundColor: stats.changeFromMin >= 0
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '10px',
                  border: `2px solid ${stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6'}`,
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    최저가 대비
                  </div>
                  <div style={{ fontSize: '1.1rem', color: stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '800', lineHeight: '1' }}>
                    {stats.changeFromMin >= 0 ? '+' : '-'}{Math.abs(stats.changeFromMin).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            <div style={{ minWidth: '110px', flex: '1 1 0' }}>
              <div
                style={{
                  backgroundColor: stats.changeFromAvg >= 0
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '10px',
                  border: `2px solid ${stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6'}`,
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    평균가 대비
                  </div>
                  <div style={{ fontSize: '1.1rem', color: stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '800', lineHeight: '1' }}>
                    {stats.changeFromAvg >= 0 ? '+' : '-'}{Math.abs(stats.changeFromAvg).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            <div style={{ minWidth: '110px', flex: '1 1 0' }}>
              <div
                style={{
                  backgroundColor: stats.changeFromMax >= 0
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '10px',
                  border: `2px solid ${stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6'}`,
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    최고가 대비
                  </div>
                  <div style={{ fontSize: '1.1rem', color: stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '800', lineHeight: '1' }}>
                    {stats.changeFromMax >= 0 ? '+' : '-'}{Math.abs(stats.changeFromMax).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 연속 상승/하락일 - 모바일 */}
            <div style={{ minWidth: '110px', flex: '1 1 0' }}>
              <div
                style={{
                  backgroundColor: stats.isRising
                    ? (theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                    : (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'),
                  borderRadius: '10px',
                  border: `2px solid ${stats.isRising ? '#ef4444' : '#3b82f6'}`,
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    연속 {stats.isRising ? '상승' : '하락'}
                  </div>
                  <div style={{ fontSize: '1.1rem', color: stats.isRising ? '#ef4444' : '#3b82f6', fontWeight: '800', lineHeight: '1' }}>
                    {stats.consecutiveDays}일
                  </div>
                </div>
              </div>
            </div>

            {/* 노동 가치 환산 - 모바일 */}
            <div style={{ minWidth: '110px', flex: '1 1 0' }}>
              <div
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',
                  borderRadius: '10px',
                  border: '2px solid #a855f7',
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    노동 가치
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#a855f7', fontWeight: '800', lineHeight: '1' }}>
                    {stats.jongmakHardCount}회
                  </div>
                </div>
              </div>
            </div>

            {/* 매수 타이밍 - 모바일 */}
            <div style={{ minWidth: '110px', flex: '1 1 0' }}>
              <div
                style={{
                  backgroundColor: theme === 'dark'
                    ? `${stats.buyingColor}26`
                    : `${stats.buyingColor}14`,
                  borderRadius: '10px',
                  border: `2px solid ${stats.buyingColor}`,
                  padding: '12px 8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    매수 타이밍
                  </div>
                  <div style={{ fontSize: '1.1rem', color: stats.buyingColor, fontWeight: '800', lineHeight: '1' }}>
                    {stats.buyingSignal}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
