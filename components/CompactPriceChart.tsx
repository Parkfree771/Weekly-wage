'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, ButtonGroup, Spinner, Badge } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrackedItem, ItemCategory, getItemsByCategory } from '@/lib/items-to-track';

type PriceEntry = {
  price: number;
  timestamp: string;
  date?: string; // YYYY-MM-DD 형식
};

type CompactPriceChartProps = {
  items: TrackedItem[];
};

// 카테고리 메타데이터
const CATEGORY_STYLES: Record<ItemCategory, { label: string; color: string; darkColor: string; lightBg: string; }> = {
  fusion: { label: '융화재료', color: '#ffb366', darkColor: '#D97706', lightBg: '#fff7ed' },
  gem: { label: '젬', color: '#e8ca7a', darkColor: '#CA8A04', lightBg: '#fefce8' },
  engraving: { label: '유물 각인서', color: '#ff9b7a', darkColor: '#E11D48', lightBg: '#fff1f2' },
  accessory: { label: '악세', color: '#5fd4e8', darkColor: '#0E7490', lightBg: '#ecfeff' },
  jewel: { label: '보석', color: '#b87ff2', darkColor: '#7E22CE', lightBg: '#f5f3ff' }
};

// 아이템 이름에서 (상)과 (중)에 색상을 입히는 헬퍼 함수
function ColoredItemName({ name }: { name: string }) {
  // (상)은 골드색 #FFB800, (중)은 보라색 #A020F0으로 표시
  // 숫자%와 (상)/(중) 또는 단독 (상)/(중)에 색상 적용
  // 예1: "치명타 피해 4.0% (상)" -> "치명타 피해 " + "4.0% (상)"(골드색)
  // 예2: "공%(상)" -> "공%" + "(상)"(골드색)

  // 정규식: (숫자.숫자% 또는 단어) 바로 뒤에 (상) 또는 (중)이 오는 패턴 매칭
  const regex = /(\d+\.?\d*%)\s*(\(상\))|(\d+\.?\d*%)\s*(\(중\))|(\(상\))|(\(중\))/g;

  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(name)) !== null) {
    // 매칭되기 전 텍스트 추가
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex, match.index)}</span>);
    }

    if (match[2] === '(상)') {
      // "숫자% (상)" 패턴 -> 골드색
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[1]} {match[2]}
        </span>
      );
    } else if (match[4] === '(중)') {
      // "숫자% (중)" 패턴 -> 보라색
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[3]} {match[4]}
        </span>
      );
    } else if (match[5] === '(상)') {
      // 단독 "(상)" 패턴 -> 골드색
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#FFB800', fontWeight: '700' }}>
          {match[5]}
        </span>
      );
    } else if (match[6] === '(중)') {
      // 단독 "(중)" 패턴 -> 보라색
      parts.push(
        <span key={`match-${match.index}`} style={{ color: '#A020F0', fontWeight: '700' }}>
          {match[6]}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // 나머지 텍스트 추가
  if (lastIndex < name.length) {
    parts.push(<span key={`text-${lastIndex}`}>{name.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

export default function CompactPriceChart({ items }: CompactPriceChartProps) {
  // 기본값: 융화재료 카테고리, 첫 번째 아이템 (아비도스)
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('fusion');
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 카테고리에 따른 아이템 목록
  const categoryItems = useMemo(() => {
    return getItemsByCategory(selectedCategory);
  }, [selectedCategory]);

  // 카테고리 변경 시 첫 번째 아이템 선택
  useEffect(() => {
    if (categoryItems.length > 0) {
      setSelectedItem(categoryItems[0]);
    }
  }, [categoryItems]);

  // 초기 로드 시 융화재료의 첫 아이템 선택
  useEffect(() => {
    const fusionItems = getItemsByCategory('fusion');
    if (fusionItems.length > 0 && !selectedItem) {
      setSelectedItem(fusionItems[0]);
    }
  }, []);

  // 가격 히스토리 불러오기 (최적화: fetch API 사용)
  useEffect(() => {
    if (!selectedItem?.id) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/market/price-history/${selectedItem.id}`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        } else {
          console.error('가격 히스토리 조회 실패:', response.status);
          setHistory([]);
        }
      } catch (err) {
        console.error('가격 히스토리 조회 오류:', err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedItem]);

  // 차트 데이터 포맷팅 (메모이제이션으로 최적화)
  const chartData = useMemo(() => {
    // 날짜별로 그룹화하여 중복 제거 (같은 날짜면 마지막 데이터 사용)
    const dateMap = new Map<string, any>();

    history.forEach((entry) => {
      // entry.date 필드가 있으면 그걸 사용 (YYYY-MM-DD)
      let month: number, day: number, year: number;

      if (entry.date) {
        // API에서 보낸 date 문자열 사용 (가장 정확)
        [year, month, day] = entry.date.split('-').map(Number);
      } else {
        // 없으면 timestamp에서 UTC 기준으로 추출
        const date = new Date(entry.timestamp);
        year = date.getUTCFullYear();
        month = date.getUTCMonth() + 1;
        day = date.getUTCDate();
      }

      const dateKey = `${month}/${day}`;

      // 요일 계산을 위한 Date 객체 (UTC 기준)
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dateObj.getUTCDay(); // 0=일요일, 3=수요일

      // 같은 날짜면 덮어씀 (최신 데이터 우선)
      dateMap.set(dateKey, {
        날짜: dateKey,
        가격: entry.price,
        rawTime: dateObj.getTime(),
        isWednesday: dayOfWeek === 3, // 수요일 여부
        fullDate: dateObj
      });
    });

    // Map을 배열로 변환하고 시간순 정렬
    return Array.from(dateMap.values()).sort((a, b) => a.rawTime - b.rawTime);
  }, [history]);

  const formatPrice = useCallback((value: number) => {
    // 모든 아이템 전체 가격으로 표시 (축약 없음)
    // 아비도스 융화재료만 소수점 첫째 자리, 나머지는 정수
    if (selectedItem?.id === '6861012' && value < 1000) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return Math.round(value).toLocaleString('ko-KR');
  }, [selectedItem?.id]);

  const formatTooltipPrice = useCallback((value: number) => {
    // 아비도스 융화재료만 소수점 첫째 자리까지, 나머지는 정수
    if (selectedItem?.id === '6861012' && value < 1000) {
      return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' G';
    }
    return value.toLocaleString('ko-KR') + ' G';
  }, [selectedItem?.id]);

  // 통계 계산 (메모이제이션으로 최적화)
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    return {
      current: history[history.length - 1].price,
      min: Math.min(...history.map(h => h.price)),
      max: Math.max(...history.map(h => h.price)),
      avg: history.reduce((sum, h) => sum + h.price, 0) / history.length,
    };
  }, [history]);

  // Y축 범위 및 틱 설정 (메모이제이션으로 최적화)
  const yAxisConfig = useMemo(() => {
    if (!stats) return { domain: ['auto', 'auto'], tickCount: 5 };

    return (() => {
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
    })();
  }, [stats, selectedItem?.id]);

  // 전날 대비 변화율 계산 (메모이제이션으로 최적화)
  const changeRate = useMemo(() => {
    if (chartData.length < 2) return 0;
    const today = chartData[chartData.length - 1].가격;
    const yesterday = chartData[chartData.length - 2].가격;
    return ((today - yesterday) / yesterday) * 100;
  }, [chartData]);

  // 평균가 계산
  const averagePrice = useMemo(() => {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, entry) => acc + entry.price, 0);
    return sum / history.length;
  }, [history]);

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
      {/* 카테고리 탭 - 데스크톱 */}
      <div className="mb-3 d-none d-md-block">
        <div className="d-flex gap-2 justify-content-center">
          {(Object.keys(CATEGORY_STYLES) as ItemCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                flex: '1',
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '0.9rem',
                padding: '10px 16px',
                backgroundColor: selectedCategory === cat ? CATEGORY_STYLES[cat].lightBg : '#ffffff',
                border: `2px solid ${selectedCategory === cat ? CATEGORY_STYLES[cat].color : '#d1d5db'}`,
                borderRadius: '10px',
                color: selectedCategory === cat ? CATEGORY_STYLES[cat].color : '#6b7280',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                letterSpacing: '0.3px'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== cat) {
                  e.currentTarget.style.backgroundColor = CATEGORY_STYLES[cat].lightBg;
                  e.currentTarget.style.borderColor = CATEGORY_STYLES[cat].color;
                  e.currentTarget.style.color = CATEGORY_STYLES[cat].darkColor;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== cat) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              {CATEGORY_STYLES[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 탭 - 모바일 */}
      <div className="mb-3 d-md-none">
        <div className="d-flex gap-2 justify-content-center">
          {(Object.keys(CATEGORY_STYLES) as ItemCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                flex: '1',
                fontWeight: selectedCategory === cat ? '700' : '600',
                fontSize: '0.7rem',
                padding: '8px 6px',
                backgroundColor: selectedCategory === cat ? CATEGORY_STYLES[cat].lightBg : '#ffffff',
                border: `2px solid ${selectedCategory === cat ? CATEGORY_STYLES[cat].color : '#d1d5db'}`,
                borderRadius: '8px',
                color: selectedCategory === cat ? CATEGORY_STYLES[cat].color : '#6b7280',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {CATEGORY_STYLES[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 아이템 선택 버튼 - 데스크톱 */}
      <div className="mb-3 d-none d-md-block">
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-start',
          flexWrap: 'wrap'
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontWeight: selectedItem.id === item.id ? '700' : '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${selectedItem.id === item.id ? categoryStyle.color : '#e5e7eb'}`,
                  color: selectedItem.id === item.id ? categoryStyle.darkColor : '#6b7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (selectedItem.id !== item.id) {
                    e.currentTarget.style.backgroundColor = categoryStyle.lightBg;
                    e.currentTarget.style.borderColor = categoryStyle.color;
                    e.currentTarget.style.color = categoryStyle.darkColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedItem.id !== item.id) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                <ColoredItemName name={item.name} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 아이템 선택 버튼 - 모바일 */}
      <div className="mb-3 d-md-none">
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          padding: '4px'
        }}>
          {categoryItems.map((item) => {
            const categoryStyle = CATEGORY_STYLES[selectedCategory];

            return (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontWeight: selectedItem.id === item.id ? '700' : '600',
                  fontSize: '0.7rem',
                  transition: 'all 0.2s ease',
                  border: `2px solid ${selectedItem.id === item.id ? categoryStyle.darkColor : '#e5e7eb'}`,
                  color: selectedItem.id === item.id ? categoryStyle.darkColor : '#6b7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <ColoredItemName name={item.name} />
              </button>
            );
          })}
        </div>
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
            <div className="d-flex align-items-center gap-2">
              {selectedItem.icon && (
                <img
                  src={selectedItem.icon}
                  alt={selectedItem.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    border: `2px solid ${selectedItem.iconBorderColor || '#16a34a'}`,
                    boxShadow: `0 2px 8px ${selectedItem.iconBorderColor ? selectedItem.iconBorderColor + '33' : 'rgba(22, 163, 74, 0.2)'}`
                  }}
                />
              )}
              <div>
                <h5 className="mb-1" style={{ fontWeight: '700', color: '#16a34a' }}>
                  <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
                </h5>
                <small className="text-muted">
                  {selectedItem.type === 'market' ? '거래소' : '경매장'} • 최근 30일
                </small>
              </div>
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
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              {selectedItem.icon && (
                <img
                  src={selectedItem.icon}
                  alt={selectedItem.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: `2px solid ${selectedItem.iconBorderColor || '#16a34a'}`,
                    boxShadow: `0 2px 6px ${selectedItem.iconBorderColor ? selectedItem.iconBorderColor + '33' : 'rgba(22, 163, 74, 0.2)'}`
                  }}
                />
              )}
              <div>
                <h6
                  className="mb-0"
                  style={{
                    fontWeight: '700',
                    color: '#16a34a',
                    fontSize: '0.75rem',
                    lineHeight: '1.3',
                    wordBreak: 'keep-all',
                    whiteSpace: 'normal'
                  }}
                >
                  <ColoredItemName name={selectedItem.displayName || selectedItem.name} />
                </h6>
                <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                  {selectedItem.type === 'market' ? '거래소' : '경매장'} • 30일
                </small>
              </div>
            </div>
            {stats && (
              <div className="text-end">
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#16a34a' }}>
                  {formatTooltipPrice(stats.current)}
                </div>
                <div style={{ fontSize: '0.7rem', color: changeRate >= 0 ? '#ef4444' : '#3b82f6' }}>
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
                <div className="d-none d-md-flex mb-4 justify-content-center gap-2">
                  <div style={{ width: '260px' }}>
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '2px solid #16a34a',
                      padding: '10px 8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#15803d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#16a34a';
                    }}>
                      <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>현재가</small>
                      <strong style={{ fontSize: '1rem', color: '#16a34a', fontWeight: '700' }}>
                        {formatTooltipPrice(stats.current)}
                      </strong>
                    </div>
                  </div>
                  <div style={{ width: '260px' }}>
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '2px solid #3b82f6',
                      padding: '10px 8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.borderColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}>
                      <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>최저가</small>
                      <strong style={{ fontSize: '1rem', color: '#3b82f6', fontWeight: '700' }}>
                        {formatTooltipPrice(stats.min)}
                      </strong>
                    </div>
                  </div>
                  <div style={{ width: '260px' }}>
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '2px solid #ef4444',
                      padding: '10px 8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.borderColor = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}>
                      <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>최고가</small>
                      <strong style={{ fontSize: '1rem', color: '#ef4444', fontWeight: '700' }}>
                        {formatTooltipPrice(stats.max)}
                      </strong>
                    </div>
                  </div>
                  <div style={{ width: '260px' }}>
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      border: '2px solid #a855f7',
                      padding: '10px 8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#faf5ff';
                      e.currentTarget.style.borderColor = '#9333ea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#a855f7';
                    }}>
                      <small className="d-block mb-1" style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>평균가</small>
                      <strong style={{ fontSize: '1rem', color: '#a855f7', fontWeight: '700' }}>
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
                  <div className="col-3">
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '2px solid #16a34a',
                      padding: '4px 2px'
                    }}>
                      <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>현재가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '700' }}>
                        {formatPrice(stats.current)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '2px solid #3b82f6',
                      padding: '4px 2px'
                    }}>
                      <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>최저가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '700' }}>
                        {formatPrice(stats.min)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '2px solid #ef4444',
                      padding: '4px 2px'
                    }}>
                      <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>최고가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '700' }}>
                        {formatPrice(stats.max)}
                      </strong>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="text-center" style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '2px solid #a855f7',
                      padding: '4px 2px'
                    }}>
                      <small className="d-block" style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>평균가</small>
                      <strong style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: '700' }}>
                        {formatPrice(Math.round(stats.avg))}
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
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
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
                              dy={10}
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
                                y={12}
                                dy={10}
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
                      height={60}
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
                      width={stats && stats.max >= 1000000 ? 95 : stats && stats.max >= 100000 ? 80 : 60}
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

                    {/* 평균가 기준선 */}
                    <ReferenceLine
                      y={averagePrice}
                      stroke="#4ade80"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: `AVG ${formatPrice(averagePrice)}`,
                        position: 'left',
                        fill: '#16a34a',
                        fontSize: 13,
                        fontWeight: '700'
                      }}
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
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
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
                              dy={8}
                              textAnchor="end"
                              fill="#374151"
                              fontSize={9}
                              fontWeight="700"
                              transform="rotate(-45)"
                            >
                              {payload.value}
                            </text>
                            {isWednesday && (
                              <text
                                x={0}
                                y={8}
                                dy={8}
                                textAnchor="end"
                                fill="#ef4444"
                                fontSize={7}
                                fontWeight="700"
                                transform="rotate(-45)"
                              >
                                수요일
                              </text>
                            )}
                          </g>
                        );
                      }}
                      height={45}
                      stroke="#6b7280"
                      strokeWidth={1.5}
                      tickLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 1.5 }}
                    />

                    <YAxis
                      tick={{
                        fontSize: stats && stats.max >= 1000000 ? 7 : 9,
                        fill: '#374151',
                        fontWeight: '700'
                      }}
                      tickFormatter={formatPrice}
                      width={stats && stats.max >= 1000000 ? 55 : stats && stats.max >= 100000 ? 45 : 35}
                      domain={yAxisConfig.domain}
                      tickCount={yAxisConfig.tickCount}
                      stroke="#6b7280"
                      strokeWidth={1.5}
                      tickLine={{ stroke: '#9ca3af', strokeWidth: 1.5 }}
                      axisLine={{ stroke: '#6b7280', strokeWidth: 1.5 }}
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

                    {/* 평균가 기준선 */}
                    <ReferenceLine
                      y={averagePrice}
                      stroke="#4ade80"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: `${formatPrice(averagePrice)}`,
                        position: 'left',
                        fill: '#16a34a',
                        fontSize: 9,
                        fontWeight: '700'
                      }}
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
