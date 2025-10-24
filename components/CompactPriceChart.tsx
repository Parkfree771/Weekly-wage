'use client';

import { useState, useEffect } from 'react';
import { Card, Button, ButtonGroup, Spinner, Badge } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import { TrackedItem } from '@/lib/items-to-track';

type PriceEntry = {
  price: number;
  timestamp: string;
};

type CompactPriceChartProps = {
  items: TrackedItem[];
};

export default function CompactPriceChart({ items }: CompactPriceChartProps) {
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(items?.[0] || null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 가격 히스토리 불러오기
  useEffect(() => {
    if (!selectedItem?.id) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/market/price-history/${selectedItem.id}`);
        setHistory(response.data.history || []);
      } catch (err) {
        console.error('가격 히스토리 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedItem]);

  // 차트 데이터 포맷팅
  const chartData = history.map((entry, index) => {
    const date = new Date(entry.timestamp);
    return {
      날짜: `${date.getMonth() + 1}/${date.getDate()}`,
      시간: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      가격: entry.price,
      rawTime: date.getTime()
    };
  });

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('ko-KR');
  };

  const formatTooltipPrice = (value: number) => value.toLocaleString('ko-KR') + ' G';

  // 통계 계산
  const stats = history.length > 0 ? {
    current: history[history.length - 1].price,
    min: Math.min(...history.map(h => h.price)),
    max: Math.max(...history.map(h => h.price)),
    avg: history.reduce((sum, h) => sum + h.price, 0) / history.length,
  } : null;

  // 변화율 계산
  const changeRate = history.length >= 2
    ? ((history[history.length - 1].price - history[0].price) / history[0].price) * 100
    : 0;

  // 아이템이 없거나 선택된 아이템이 없으면 에러 표시
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">표시할 아이템이 없습니다.</p>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  return (
    <div>
      {/* 아이템 선택 버튼 */}
      <div className="mb-3 d-flex flex-wrap gap-2 justify-content-center">
        {items.map((item) => (
          <Button
            key={item.id}
            variant={selectedItem.id === item.id ? 'success' : 'outline-success'}
            onClick={() => setSelectedItem(item)}
            size="sm"
            style={{
              borderRadius: '20px',
              padding: '8px 16px',
              fontWeight: selectedItem.id === item.id ? '600' : '500',
              fontSize: '0.85rem',
              transition: 'all 0.2s ease',
              boxShadow: selectedItem.id === item.id ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none'
            }}
          >
            {item.name}
            {selectedItem.id === item.id && (
              <Badge bg="light" text="success" className="ms-2" style={{ fontSize: '0.7rem' }}>
                선택됨
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* 차트 카드 */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <Card.Header
          className="py-3 border-0"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1" style={{ fontWeight: '700', color: '#16a34a' }}>
                {selectedItem.name}
              </h5>
              <small className="text-muted">
                {selectedItem.type === 'market' ? '거래소' : '경매장'} • 최근 30일
              </small>
            </div>
            {stats && (
              <div className="text-end">
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>
                  {formatTooltipPrice(stats.current)}
                </div>
                <div style={{ fontSize: '0.85rem', color: changeRate >= 0 ? '#ef4444' : '#3b82f6' }}>
                  {changeRate >= 0 ? '▲' : '▼'} {Math.abs(changeRate).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </Card.Header>

        <Card.Body className="p-2 p-md-3" style={{ backgroundColor: '#fafffe' }}>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="success" />
              <p className="mt-3 text-muted">데이터 로딩 중...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>📊</div>
              <p className="text-muted mt-2">아직 수집된 데이터가 없습니다</p>
              <small className="text-muted">가격 수집 후 차트가 표시됩니다</small>
            </div>
          ) : (
            <>
              {/* 통계 */}
              {stats && (
                <div className="row g-2 mb-3">
                  <div className="col-6 col-md-3">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#f0fdf4',
                      borderRadius: '10px',
                      border: '1px solid #dcfce7'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>현재가</small>
                      <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>
                        {formatTooltipPrice(stats.current)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#eff6ff',
                      borderRadius: '10px',
                      border: '1px solid #dbeafe'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>최저가</small>
                      <strong style={{ fontSize: '0.95rem', color: '#3b82f6' }}>
                        {formatTooltipPrice(stats.min)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#fef2f2',
                      borderRadius: '10px',
                      border: '1px solid #fecaca'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>최고가</small>
                      <strong style={{ fontSize: '0.95rem', color: '#ef4444' }}>
                        {formatTooltipPrice(stats.max)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#faf5ff',
                      borderRadius: '10px',
                      border: '1px solid #e9d5ff'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.7rem' }}>평균가</small>
                      <strong style={{ fontSize: '0.95rem', color: '#a855f7' }}>
                        {formatTooltipPrice(Math.round(stats.avg))}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 차트 */}
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="5 5"
                      stroke="#d1d5db"
                      strokeWidth={1}
                      vertical={true}
                      horizontal={true}
                    />

                    <XAxis
                      dataKey="날짜"
                      tick={{
                        fontSize: 16,
                        fill: '#374151',
                        fontWeight: '700'
                      }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                      stroke="#6b7280"
                      strokeWidth={2}
                      tickLine={{ stroke: '#9ca3af', strokeWidth: 2 }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 2 }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 16,
                        fill: '#374151',
                        fontWeight: '700'
                      }}
                      tickFormatter={formatPrice}
                      width={90}
                      domain={['dataMin - 500', 'dataMax + 500']}
                      stroke="#6b7280"
                      strokeWidth={2}
                      tickLine={{ stroke: '#9ca3af', strokeWidth: 2 }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 2 }}
                    />

                    <Tooltip
                      formatter={(value: number) => [formatTooltipPrice(value), '가격']}
                      labelFormatter={(label) => {
                        const item = chartData.find(d => d.날짜 === label);
                        return `${label} ${item?.시간 || ''}`;
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '3px solid #16a34a',
                        borderRadius: '12px',
                        fontSize: '15px',
                        padding: '14px 18px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                        fontWeight: '600'
                      }}
                      labelStyle={{
                        fontWeight: '700',
                        color: '#16a34a',
                        marginBottom: '6px',
                        fontSize: '16px'
                      }}
                      cursor={{ stroke: '#16a34a', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />

                    <Line
                      type="monotone"
                      dataKey="가격"
                      stroke="#16a34a"
                      strokeWidth={4}
                      dot={{
                        r: 6,
                        fill: '#16a34a',
                        strokeWidth: 3,
                        stroke: '#fff'
                      }}
                      activeDot={{
                        r: 9,
                        fill: '#22c55e',
                        stroke: '#fff',
                        strokeWidth: 4
                      }}
                      fill="url(#colorPrice)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
