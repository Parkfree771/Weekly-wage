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
    const dayOfWeek = date.getDay(); // 0=일요일, 3=수요일
    return {
      날짜: `${date.getMonth() + 1}/${date.getDate()}`,
      가격: entry.price,
      rawTime: date.getTime(),
      isWednesday: dayOfWeek === 3, // 수요일 여부
      fullDate: date
    };
  });

  const formatPrice = (value: number) => {
    // 모든 아이템 전체 가격으로 표시 (축약 없음)
    // 아비도스 융화재료만 소수점 첫째 자리, 나머지는 정수
    if (selectedItem?.id === '6861012' && value < 1000) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  };

  const formatTooltipPrice = (value: number) => {
    // 아비도스 융화재료만 소수점 첫째 자리까지, 나머지는 정수
    if (selectedItem?.id === '6861012' && value < 1000) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G';
    }
    return value.toLocaleString('ko-KR') + ' G';
  };

  // 통계 계산
  const stats = history.length > 0 ? {
    current: history[history.length - 1].price,
    min: Math.min(...history.map(h => h.price)),
    max: Math.max(...history.map(h => h.price)),
    avg: history.reduce((sum, h) => sum + h.price, 0) / history.length,
  } : null;

  // Y축 범위 및 틱 설정
  const yAxisConfig = stats ? (() => {
    const priceRange = stats.max - stats.min;
    const isAbidos = selectedItem?.id === '6861012';

    // 가격대에 따른 적절한 단위 결정
    let tickUnit = 1;
    let tickCount = 6;

    if (stats.max >= 1000000) {
      // 100만 이상: 10만 단위
      tickUnit = 100000;
      tickCount = 6;
    } else if (stats.max >= 100000) {
      // 10만~100만: 1만 단위
      tickUnit = 10000;
      tickCount = 6;
    } else if (stats.max >= 10000) {
      // 1만~10만: 1000 단위
      tickUnit = 1000;
      tickCount = 6;
    } else if (stats.max >= 1000) {
      // 1000~1만: 100 단위
      tickUnit = 100;
      tickCount = 6;
    } else if (stats.max >= 100) {
      // 100~1000: 10 단위
      tickUnit = 10;
      tickCount = 6;
    } else {
      // 100 미만: 1 단위 (아비도스용)
      tickUnit = isAbidos ? 0.1 : 1;
      tickCount = 6;
    }

    const padding = Math.max(priceRange * 0.1, tickUnit);

    // 단위에 맞춰 반올림
    const minValue = isAbidos && stats.max < 100
      ? Math.floor((stats.min - padding) * 10) / 10
      : Math.floor((stats.min - padding) / tickUnit) * tickUnit;
    const maxValue = isAbidos && stats.max < 100
      ? Math.ceil((stats.max + padding) * 10) / 10
      : Math.ceil((stats.max + padding) / tickUnit) * tickUnit;

    return {
      domain: [minValue, maxValue],
      tickCount: tickCount
    };
  })() : { domain: ['auto', 'auto'], tickCount: 5 };

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
            className="d-none d-md-inline-block"
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
        {/* 모바일 버튼 */}
        {items.map((item) => (
          <Button
            key={item.id}
            variant={selectedItem.id === item.id ? 'success' : 'outline-success'}
            onClick={() => setSelectedItem(item)}
            size="sm"
            className="d-md-none"
            style={{
              borderRadius: '16px',
              padding: '6px 12px',
              fontWeight: selectedItem.id === item.id ? '600' : '500',
              fontSize: '0.75rem',
              transition: 'all 0.2s ease',
              boxShadow: selectedItem.id === item.id ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none',
              minWidth: '75px'
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>

      {/* 차트 카드 */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        {/* 데스크톱 헤더 */}
        <Card.Header
          className="py-3 border-0 d-none d-md-block"
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

        {/* 모바일 헤더 */}
        <Card.Header
          className="py-2 border-0 d-md-none"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)',
            borderBottom: '1.5px solid #e5e7eb',
          }}
        >
          <div className="text-center">
            <h6 className="mb-1" style={{ fontWeight: '700', color: '#16a34a', fontSize: '0.95rem' }}>
              {selectedItem.name}
            </h6>
            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
              {selectedItem.type === 'market' ? '거래소' : '경매장'} • 최근 30일
            </small>
            {stats && (
              <div className="mt-2">
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#16a34a' }}>
                  {formatTooltipPrice(stats.current)}
                </div>
                <div style={{ fontSize: '0.75rem', color: changeRate >= 0 ? '#ef4444' : '#3b82f6' }}>
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
              {/* 통계 - 데스크톱 */}
              {stats && (
                <div className="row g-2 mb-3 d-none d-md-flex">
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
                        {selectedItem?.id === '6861012' && stats.avg < 1000
                          ? stats.avg.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G'
                          : formatTooltipPrice(Math.round(stats.avg))
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 통계 - 모바일 */}
              {stats && (
                <div className="row g-2 mb-3 d-md-none">
                  <div className="col-6">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#eff6ff',
                      borderRadius: '8px',
                      border: '1px solid #dbeafe'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.65rem' }}>최저가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                        {formatTooltipPrice(stats.min)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fecaca'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.65rem' }}>최고가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                        {formatTooltipPrice(stats.max)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="text-center p-2" style={{
                      backgroundColor: '#faf5ff',
                      borderRadius: '8px',
                      border: '1px solid #e9d5ff'
                    }}>
                      <small className="text-muted d-block mb-1" style={{ fontSize: '0.65rem' }}>평균가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#a855f7' }}>
                        {selectedItem?.id === '6861012' && stats.avg < 1000
                          ? stats.avg.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G'
                          : formatTooltipPrice(Math.round(stats.avg))
                        }
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 차트 - 반응형 */}
              <div className="d-none d-md-block" style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 15, right: 15, left: stats && stats.max >= 1000000 ? 20 : 0, bottom: 5 }}
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
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const dataIndex = chartData.findIndex(d => d.날짜 === payload.value);
                        const isWednesday = dataIndex >= 0 ? chartData[dataIndex].isWednesday : false;

                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={16}
                              textAnchor="end"
                              fill="#374151"
                              fontSize={16}
                              fontWeight="700"
                              transform="rotate(-35)"
                            >
                              {payload.value}
                            </text>
                            {isWednesday && (
                              <text
                                x={0}
                                y={18}
                                dy={16}
                                textAnchor="end"
                                fill="#ef4444"
                                fontSize={12}
                                fontWeight="700"
                                transform="rotate(-35)"
                              >
                                수요일
                              </text>
                            )}
                          </g>
                        );
                      }}
                      height={80}
                      stroke="#6b7280"
                      strokeWidth={2}
                      tickLine={{ stroke: '#9ca3af', strokeWidth: 2 }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 2 }}
                    />

                    <YAxis
                      tick={{
                        fontSize: stats && stats.max >= 1000000 ? 14 : 16,
                        fill: '#374151',
                        fontWeight: '700'
                      }}
                      tickFormatter={formatPrice}
                      width={stats && stats.max >= 1000000 ? 150 : stats && stats.max >= 100000 ? 130 : 110}
                      domain={yAxisConfig.domain}
                      tickCount={yAxisConfig.tickCount}
                      stroke="#6b7280"
                      strokeWidth={2}
                      tickLine={{ stroke: '#9ca3af', strokeWidth: 2 }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 2 }}
                    />

                    <Tooltip
                      formatter={(value: number) => [formatTooltipPrice(value), '가격']}
                      labelFormatter={(label) => label}
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

              {/* 모바일 차트 */}
              <div className="d-md-none" style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 5, left: stats && stats.max >= 100000 ? 5 : -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorPriceMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#d1d5db"
                      strokeWidth={0.5}
                      vertical={false}
                      horizontal={true}
                    />

                    <XAxis
                      dataKey="날짜"
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const dataIndex = chartData.findIndex(d => d.날짜 === payload.value);
                        const isWednesday = dataIndex >= 0 ? chartData[dataIndex].isWednesday : false;

                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={10}
                              textAnchor="end"
                              fill="#6b7280"
                              fontSize={9}
                              fontWeight="600"
                              transform="rotate(-45)"
                            >
                              {payload.value}
                            </text>
                            {isWednesday && (
                              <text
                                x={0}
                                y={10}
                                dy={10}
                                textAnchor="end"
                                fill="#ef4444"
                                fontSize={7}
                                fontWeight="700"
                                transform="rotate(-45)"
                              >
                                수
                              </text>
                            )}
                          </g>
                        );
                      }}
                      height={55}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      tickLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      axisLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    />

                    <YAxis
                      tick={{
                        fontSize: stats && stats.max >= 1000000 ? 7 : 9,
                        fill: '#6b7280',
                        fontWeight: '600'
                      }}
                      tickFormatter={formatPrice}
                      width={stats && stats.max >= 1000000 ? 90 : stats && stats.max >= 100000 ? 75 : 60}
                      domain={yAxisConfig.domain}
                      tickCount={yAxisConfig.tickCount}
                      stroke="#9ca3af"
                      strokeWidth={1}
                      tickLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      axisLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    />

                    <Tooltip
                      formatter={(value: number) => [formatTooltipPrice(value), '가격']}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid #16a34a',
                        borderRadius: '8px',
                        fontSize: '11px',
                        padding: '8px 10px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontWeight: '600'
                      }}
                      labelStyle={{
                        fontWeight: '700',
                        color: '#16a34a',
                        marginBottom: '4px',
                        fontSize: '12px'
                      }}
                      cursor={{ stroke: '#16a34a', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />

                    <Line
                      type="monotone"
                      dataKey="가격"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{
                        r: 3,
                        fill: '#16a34a',
                        strokeWidth: 2,
                        stroke: '#fff'
                      }}
                      activeDot={{
                        r: 6,
                        fill: '#22c55e',
                        stroke: '#fff',
                        strokeWidth: 2
                      }}
                      fill="url(#colorPriceMobile)"
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
