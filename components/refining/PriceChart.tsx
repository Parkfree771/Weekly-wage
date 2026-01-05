'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriceHistory {
  date: string;
  price: number;
  timestamp: string;
}

interface PriceChartProps {
  itemIds: { id: string; name: string; color: string }[];
  title?: string;
}

export default function PriceChart({ itemIds, title = '가격 추이' }: PriceChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Firebase Storage에서 직접 JSON 다운로드하여 모든 아이템 가격 히스토리 가져오기
        const { getMultipleItemPriceHistory } = await import('@/lib/price-history-client');
        const itemIdList = itemIds.map(item => item.id);
        const historyByItem = await getMultipleItemPriceHistory(itemIdList, 30);

        // 날짜별로 데이터 병합
        const dateMap = new Map<string, any>();

        itemIds.forEach(item => {
          const history = historyByItem[item.id] || [];
          history.forEach((entry: PriceHistory) => {
            if (!dateMap.has(entry.date)) {
              dateMap.set(entry.date, { date: entry.date });
            }
            const dateEntry = dateMap.get(entry.date);
            dateEntry[item.id] = entry.price;
          });
        });

        // Map을 배열로 변환하고 날짜순 정렬
        const sortedData = Array.from(dateMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        setChartData(sortedData);
      } catch (err) {
        setError('가격 데이터를 불러오는데 실패했습니다.');
        console.error('Price chart error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [itemIds]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </div>
        <p className="mt-2 text-muted">가격 데이터 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        표시할 가격 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="price-chart-container">
      <h5 className="mb-3">{title}</h5>
      <ResponsiveContainer width="100%" height={300} minHeight={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // YYYY-MM-DD를 MM-DD로 변환
              const [, month, day] = value.split('-');
              return `${month}-${day}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}G`}
          />
          <Tooltip
            formatter={(value: number | undefined) => [`${value || 0}G`, '']}
            labelFormatter={(label) => `날짜: ${label}`}
          />
          <Legend />
          {itemIds.map(item => (
            <Line
              key={item.id}
              type="monotone"
              dataKey={item.id}
              stroke={item.color}
              name={item.name}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
