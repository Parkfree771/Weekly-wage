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

    // RSI 계산 (선택된 차트 기간 전체 사용)
    const period = filteredHistory.length - 1;
    let avgGain = 0;
    let avgLoss = 0;

    if (period > 0) {
      for (let i = 1; i < filteredHistory.length; i++) {
        const change = filteredHistory[i].price - filteredHistory[i - 1].price;
        if (change > 0) {
          avgGain += change;
        } else {
          avgLoss += Math.abs(change);
        }
      }
      avgGain /= period;
      avgLoss /= period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    let rsiStatus: string;
    let rsiMessage: string;
    if (rsi <= 30) {
      rsiStatus = '저평가';
      rsiMessage = '과매도';
    } else if (rsi >= 70) {
      rsiStatus = '고평가';
      rsiMessage = '과매수';
    } else {
      rsiStatus = '보통';
      rsiMessage = '중립';
    }

    // Stochastic 계산 (선택된 차트 기간 전체 사용)
    const stochPeriod = filteredHistory.length;
    const recentPrices = filteredHistory.map(h => h.price);
    const periodMin = Math.min(...recentPrices);
    const periodMax = Math.max(...recentPrices);

    const stochastic = periodMax === periodMin ? 50 : ((current - periodMin) / (periodMax - periodMin)) * 100;

    let stochStatus: string;
    let stochMessage: string;
    if (stochastic <= 20) {
      stochStatus = '최저가 근접';
      stochMessage = '바닥권';
    } else if (stochastic >= 80) {
      stochStatus = '최고가 근접';
      stochMessage = '천장권';
    } else {
      stochStatus = '변동 중';
      stochMessage = '중간';
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
      rsi,
      rsiStatus,
      rsiMessage,
      stochastic,
      stochStatus,
      stochMessage,
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
          <div className="row g-3">
            {/* 통계 상자 - 첫 번째 줄 */}
            <div className="col-md-3">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    현재가
                  </div>
                  <div style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.current, false, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    평균가
                  </div>
                  <div style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.avg, false, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    최저가
                  </div>
                  <div style={{ fontSize: '1.8rem', color: '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.min, false, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    최고가
                  </div>
                  <div style={{ fontSize: '1.8rem', color: '#ef4444', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.max, false, true)}
                  </div>
                </div>
              </div>
            </div>

            {/* 가격 변동 분석 - 두 번째 줄 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    최저가 대비
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                    <img src={stats.changeFromMin >= 0 ? '/up.png' : '/down.png'} alt="" style={{ width: '24px', height: '24px' }} />
                    <div style={{ fontSize: '1.8rem', color: stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.changeFromMin >= 0 ? '+' : ''}{stats.changeFromMin.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {formatPrice(stats.min)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    평균가 대비
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                    <img src={stats.changeFromAvg >= 0 ? '/up.png' : '/down.png'} alt="" style={{ width: '24px', height: '24px' }} />
                    <div style={{ fontSize: '1.8rem', color: stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.changeFromAvg >= 0 ? '+' : ''}{stats.changeFromAvg.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {formatPrice(stats.avg, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    최고가 대비
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                    <img src={stats.changeFromMax >= 0 ? '/up.png' : '/down.png'} alt="" style={{ width: '24px', height: '24px' }} />
                    <div style={{ fontSize: '1.8rem', color: stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.changeFromMax >= 0 ? '+' : ''}{stats.changeFromMax.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {formatPrice(stats.max)}
                  </div>
                </div>
              </div>
            </div>

            {/* 연속 상승/하락일 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    연속 {stats.isRising ? '상승' : '하락'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                    <img src={stats.isRising ? '/up.png' : '/down.png'} alt="" style={{ width: '24px', height: '24px' }} />
                    <div style={{ fontSize: '1.8rem', color: stats.isRising ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.consecutiveDays}일
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {stats.isRising ? '상승세' : '하락세'}
                  </div>
                </div>
              </div>
            </div>

            {/* RSI */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    RSI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                    <img src={stats.rsi <= 30 ? '/cold.png' : stats.rsi >= 70 ? '/hot.png' : '/soso.png'} alt="" style={{ width: '24px', height: '24px' }} />
                    <div style={{
                      fontSize: '1.8rem',
                      color: stats.rsi <= 30 ? '#3b82f6' : stats.rsi >= 70 ? '#ef4444' : 'var(--text-primary)',
                      fontWeight: '700',
                      lineHeight: '1'
                    }}>
                      {stats.rsi.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {stats.rsiMessage}
                    {stats.rsi <= 30 && (
                      <>
                        {' '}(<img src="/up.png" alt="" style={{ width: '12px', height: '12px', display: 'inline' }} /> 매수 추천)
                      </>
                    )}
                    {stats.rsi >= 70 && (
                      <>
                        {' '}(<img src="/down.png" alt="" style={{ width: '12px', height: '12px', display: 'inline' }} /> 매도 추천)
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 스토캐스틱 */}
            <div className="col-md-4">
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                    Stochastic
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                    <img src={stats.stochastic <= 20 ? '/cold.png' : stats.stochastic >= 80 ? '/hot.png' : '/soso.png'} alt="" style={{ width: '24px', height: '24px' }} />
                    <div style={{
                      fontSize: '1.8rem',
                      color: stats.stochastic <= 20 ? '#3b82f6' : stats.stochastic >= 80 ? '#ef4444' : 'var(--text-primary)',
                      fontWeight: '700',
                      lineHeight: '1'
                    }}>
                      {stats.stochastic.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {stats.stochMessage}
                    {stats.stochastic <= 20 && (
                      <>
                        {' '}(<img src="/up.png" alt="" style={{ width: '12px', height: '12px', display: 'inline' }} /> 매수 추천)
                      </>
                    )}
                    {stats.stochastic >= 80 && (
                      <>
                        {' '}(<img src="/down.png" alt="" style={{ width: '12px', height: '12px', display: 'inline' }} /> 매도 추천)
                      </>
                    )}
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
          <div className="row g-2">
            {/* 통계 상자 - 첫 번째 줄 */}
            <div className="col-3">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '14px 6px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    현재가
                  </div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.current, false, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-3">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '14px 6px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    평균가
                  </div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.avg, false, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-3">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '14px 6px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    최저가
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.min, false, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-3">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '14px 6px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    최고가
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#ef4444', fontWeight: '700', lineHeight: '1' }}>
                    {formatPrice(stats.max, false, true)}
                  </div>
                </div>
              </div>
            </div>

            {/* 가격 변동 분석 - 두 번째 줄 */}
            <div className="col-4">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '10px 4px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    최저가 대비
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                    <img src={stats.changeFromMin >= 0 ? '/up.png' : '/down.png'} alt="" style={{ width: '16px', height: '16px' }} />
                    <div style={{ fontSize: '1.1rem', color: stats.changeFromMin >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.changeFromMin >= 0 ? '+' : ''}{stats.changeFromMin.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>
                    {formatPrice(stats.min)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '10px 4px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    평균가 대비
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                    <img src={stats.changeFromAvg >= 0 ? '/up.png' : '/down.png'} alt="" style={{ width: '16px', height: '16px' }} />
                    <div style={{ fontSize: '1.1rem', color: stats.changeFromAvg >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.changeFromAvg >= 0 ? '+' : ''}{stats.changeFromAvg.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>
                    {formatPrice(stats.avg, true)}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '10px 4px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    최고가 대비
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                    <img src={stats.changeFromMax >= 0 ? '/up.png' : '/down.png'} alt="" style={{ width: '16px', height: '16px' }} />
                    <div style={{ fontSize: '1.1rem', color: stats.changeFromMax >= 0 ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.changeFromMax >= 0 ? '+' : ''}{stats.changeFromMax.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>
                    {formatPrice(stats.max)}
                  </div>
                </div>
              </div>
            </div>

            {/* 연속 상승/하락일 - 모바일 */}
            <div className="col-4">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '10px 4px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    연속 {stats.isRising ? '상승' : '하락'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                    <img src={stats.isRising ? '/up.png' : '/down.png'} alt="" style={{ width: '16px', height: '16px' }} />
                    <div style={{ fontSize: '1.1rem', color: stats.isRising ? '#ef4444' : '#3b82f6', fontWeight: '700', lineHeight: '1' }}>
                      {stats.consecutiveDays}일
                    </div>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>
                    {stats.isRising ? '상승세' : '하락세'}
                  </div>
                </div>
              </div>
            </div>

            {/* RSI - 모바일 */}
            <div className="col-4">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '10px 4px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    RSI
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                    <img src={stats.rsi <= 30 ? '/cold.png' : stats.rsi >= 70 ? '/hot.png' : '/soso.png'} alt="" style={{ width: '16px', height: '16px' }} />
                    <div style={{
                      fontSize: '1.1rem',
                      color: stats.rsi <= 30 ? '#3b82f6' : stats.rsi >= 70 ? '#ef4444' : 'var(--text-primary)',
                      fontWeight: '700',
                      lineHeight: '1'
                    }}>
                      {stats.rsi.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', flexWrap: 'wrap' }}>
                    <span>{stats.rsiMessage}</span>
                    {stats.rsi <= 30 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                        (<img src="/up.png" alt="" style={{ width: '9px', height: '9px', display: 'inline' }} />매수)
                      </span>
                    )}
                    {stats.rsi >= 70 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                        (<img src="/down.png" alt="" style={{ width: '9px', height: '9px', display: 'inline' }} />매도)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 스토캐스틱 - 모바일 */}
            <div className="col-4">
              <div
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '10px 4px',
                  backgroundColor: 'transparent'
                }}
              >
                <div className="text-center">
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '5px' }}>
                    Stochastic
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                    <img src={stats.stochastic <= 20 ? '/cold.png' : stats.stochastic >= 80 ? '/hot.png' : '/soso.png'} alt="" style={{ width: '16px', height: '16px' }} />
                    <div style={{
                      fontSize: '1.1rem',
                      color: stats.stochastic <= 20 ? '#3b82f6' : stats.stochastic >= 80 ? '#ef4444' : 'var(--text-primary)',
                      fontWeight: '700',
                      lineHeight: '1'
                    }}>
                      {stats.stochastic.toFixed(1)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', flexWrap: 'wrap' }}>
                    <span>{stats.stochMessage}</span>
                    {stats.stochastic <= 20 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                        (<img src="/up.png" alt="" style={{ width: '9px', height: '9px', display: 'inline' }} />매수)
                      </span>
                    )}
                    {stats.stochastic >= 80 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                        (<img src="/down.png" alt="" style={{ width: '9px', height: '9px', display: 'inline' }} />매도)
                      </span>
                    )}
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
