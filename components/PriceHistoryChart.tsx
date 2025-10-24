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

  // 차트 데이터 포맷팅
  const chartData = history.map((entry) => ({
    time: new Date(entry.timestamp).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: entry.price,
  }));

  // 가격 포맷팅
  const formatPrice = (value: number) => {
    return value.toLocaleString('ko-KR');
  };

  // 통계 계산
  const stats = history.length > 0 ? {
    current: history[history.length - 1].price,
    min: Math.min(...history.map(h => h.price)),
    max: Math.max(...history.map(h => h.price)),
    avg: Math.round(history.reduce((sum, h) => sum + h.price, 0) / history.length),
  } : null;

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
                    <strong className="text-primary">{formatPrice(stats.avg)}G</strong>
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
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatPrice}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value) + ' G', '가격']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #16a34a',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="가격"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center mt-2">
              <small className="text-muted">
                총 {history.length}개의 데이터 포인트
              </small>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
