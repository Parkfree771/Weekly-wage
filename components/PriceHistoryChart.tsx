'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';

type PriceEntry = {
  price: number;
  timestamp: string;
};

type PriceHistoryChartProps = {
  itemId: string;
  itemName: string;
  autoCollect?: boolean;
  collectInterval?: number; // 분 단위
};

export default function PriceHistoryChart({
  itemId,
  itemName,
  autoCollect = false,
  collectInterval = 60, // 기본 60분
}: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCollected, setLastCollected] = useState<string | null>(null);

  // 가격 히스토리 불러오기
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/market/price-history/${itemId}`);
      setHistory(response.data.history || []);
    } catch (err: any) {
      console.error('가격 히스토리 조회 오류:', err);
      setError('가격 히스토리를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 현재 가격 수집
  const collectPrice = async () => {
    try {
      setCollecting(true);
      setError(null);
      const response = await axios.post('/api/market/price-history/collect', {
        itemId,
      });

      if (response.data.success) {
        setLastCollected(new Date().toLocaleString('ko-KR'));
        // 히스토리 다시 불러오기
        await fetchHistory();
      }
    } catch (err: any) {
      console.error('가격 수집 오류:', err);
      setError('가격 수집에 실패했습니다.');
    } finally {
      setCollecting(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchHistory();
  }, [itemId]);

  // 자동 수집 설정
  useEffect(() => {
    if (!autoCollect) return;

    const interval = setInterval(() => {
      collectPrice();
    }, collectInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoCollect, collectInterval]);

  // 차트 데이터 포맷팅 (날짜만 표시 - 일별 데이터이므로)
  const chartData = history.map((entry) => ({
    time: new Date(entry.timestamp).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    }),
    price: entry.price,
  }));

  // 가격 포맷팅
  const formatPrice = (value: number) => {
    // 100골드 이하는 소수점 첫째 자리까지 표시
    if (value < 100) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  };

  // 통계 계산
  const stats = history.length > 0 ? {
    current: history[history.length - 1].price,
    min: Math.min(...history.map(h => h.price)),
    max: Math.max(...history.map(h => h.price)),
    avg: history.reduce((sum, h) => sum + h.price, 0) / history.length,
  } : null;

  // Y축 범위 및 틱 설정
  const yAxisDomain = stats ? (() => {
    const priceRange = stats.max - stats.min;

    // 가격대에 따른 적절한 단위 결정
    let tickUnit = 1;
    if (stats.max >= 1000000) {
      tickUnit = 100000; // 100만 이상: 10만 단위
    } else if (stats.max >= 100000) {
      tickUnit = 10000; // 10만~100만: 1만 단위
    } else if (stats.max >= 10000) {
      tickUnit = 1000; // 1만~10만: 1000 단위
    } else if (stats.max >= 1000) {
      tickUnit = 100; // 1000~1만: 100 단위
    } else if (stats.max >= 100) {
      tickUnit = 10; // 100~1000: 10 단위
    } else {
      tickUnit = 0.1; // 100 미만
    }

    const padding = Math.max(priceRange * 0.1, tickUnit);

    const minValue = stats.max < 100
      ? Math.floor((stats.min - padding) * 10) / 10
      : Math.floor((stats.min - padding) / tickUnit) * tickUnit;
    const maxValue = stats.max < 100
      ? Math.ceil((stats.max + padding) * 10) / 10
      : Math.ceil((stats.max + padding) / tickUnit) * tickUnit;

    return [minValue, maxValue];
  })() : ['auto', 'auto'];

  return (
    <Card className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      <Card.Header
        className="text-center py-2 border-0"
        style={{
          background: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.1)',
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <h3
            className="mb-0 flex-grow-1"
            style={{
              fontWeight: '600',
              fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
              background: 'linear-gradient(145deg, #16a34a, #15803d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
            }}
          >
            {itemName} 가격 추이
          </h3>
          <Button
            variant="success"
            size="sm"
            onClick={collectPrice}
            disabled={collecting}
            style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}
          >
            {collecting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-1" />
                수집 중...
              </>
            ) : (
              '가격 수집'
            )}
          </Button>
        </div>
        {lastCollected && (
          <p className="small text-muted mb-0 mt-1" style={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.8rem)' }}>
            마지막 수집: {lastCollected}
          </p>
        )}
      </Card.Header>
      <Card.Body className="p-2 p-md-3" style={{ backgroundColor: '#fafffe' }}>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
            <p className="mt-2 text-muted">데이터를 불러오는 중...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted mb-3">아직 가격 데이터가 없습니다.</p>
            <Button variant="success" onClick={collectPrice} disabled={collecting}>
              {collecting ? '수집 중...' : '첫 가격 수집하기'}
            </Button>
          </div>
        ) : (
          <>
            {/* 통계 정보 */}
            {stats && (
              <div className="row g-2 mb-3">
                <div className="col-6 col-md-3">
                  <div className="text-center p-2 bg-light rounded">
                    <small className="text-muted d-block">현재가</small>
                    <strong className="text-success">{formatPrice(stats.current)}G</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-center p-2 bg-light rounded">
                    <small className="text-muted d-block">평균가</small>
                    <strong className="text-primary">
                      {stats.avg < 100
                        ? stats.avg.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                        : Math.round(stats.avg).toLocaleString('ko-KR')
                      }G
                    </strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-center p-2 bg-light rounded">
                    <small className="text-muted d-block">최저가</small>
                    <strong className="text-info">{formatPrice(stats.min)}G</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-center p-2 bg-light rounded">
                    <small className="text-muted d-block">최고가</small>
                    <strong className="text-danger">{formatPrice(stats.max)}G</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 차트 */}
            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: stats && stats.max >= 100000 ? 10 : stats && stats.max >= 10000 ? 5 : 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: stats && stats.max >= 1000000 ? 7 : 9 }}
                    tickFormatter={formatPrice}
                    width={stats && stats.max >= 1000000 ? 85 : stats && stats.max >= 100000 ? 70 : stats && stats.max >= 10000 ? 65 : 50}
                    domain={yAxisDomain}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value) + ' G', '가격']}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #16a34a',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
