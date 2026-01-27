'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { PriceContext } from './PriceComparisonStats';

type PriceItem = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
};

// 거래소 아이템만 표시
const DASHBOARD_ITEMS: PriceItem[] = [
  // 계승 재련 재료
  { id: '66102007', name: '운명의 파괴석 결정', shortName: '파괴석 결정', icon: '/top-destiny-destruction-stone5.webp' },
  { id: '66102107', name: '운명의 수호석 결정', shortName: '수호석 결정', icon: '/top-destiny-guardian-stone5.webp' },
  { id: '66110226', name: '위대한 운명의 돌파석', shortName: '위대한 돌파석', icon: '/top-destiny-breakthrough-stone5.webp' },
  { id: '6861013', name: '상급 아비도스 융화 재료', shortName: '상비도스', icon: '/top-abidos-fusion5.webp' },
  // 일반 재련 재료
  { id: '66102006', name: '운명의 파괴석', shortName: '파괴석', icon: '/destiny-destruction-stone5.webp' },
  { id: '66102106', name: '운명의 수호석', shortName: '수호석', icon: '/destiny-guardian-stone5.webp' },
  { id: '66110225', name: '운명의 돌파석', shortName: '돌파석', icon: '/destiny-breakthrough-stone5.webp' },
  { id: '6861012', name: '아비도스 융화 재료', shortName: '아비도스', icon: '/abidos-fusion5.webp' },
  { id: '66130143', name: '운명의 파편 주머니(대)', shortName: '운파', icon: '/destiny-shard-bag-large5.webp' },
  // 재련 추가 재료
  { id: '66111131', name: '용암의 숨결', shortName: '용숨', icon: '/breath-lava5.webp' },
  { id: '66111132', name: '빙하의 숨결', shortName: '빙숨', icon: '/breath-glacier5.webp' },
];

type PriceData = {
  current: number;
  previous: number;
  change: number;
};

export default function PriceDashboard() {
  const { selectItemById } = useContext(PriceContext);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // 차트와 같은 방식으로 데이터 가져오기
        const { getItemPriceHistory } = await import('@/lib/price-history-client');

        const priceMap: Record<string, PriceData> = {};

        // 모든 아이템의 가격 히스토리를 병렬로 가져오기
        await Promise.all(
          DASHBOARD_ITEMS.map(async (item) => {
            try {
              const history = await getItemPriceHistory(item.id, 30); // 최근 30일

              if (history.length > 0) {
                const currentPrice = history[history.length - 1]?.price || 0;
                const previousPrice = history.length >= 2
                  ? history[history.length - 2]?.price || currentPrice
                  : currentPrice;

                const change = previousPrice > 0
                  ? ((currentPrice - previousPrice) / previousPrice) * 100
                  : 0;

                priceMap[item.id] = {
                  current: currentPrice,
                  previous: previousPrice,
                  change: change
                };
              }
            } catch (err) {
              console.error(`Failed to fetch price for ${item.id}:`, err);
            }
          })
        );

        setPrices(priceMap);

        // 마지막 업데이트 날짜
        const now = new Date();
        setLastUpdate(`${now.getMonth() + 1}월 ${now.getDate()}일`);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [loading]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000) {
      return Math.round(price).toLocaleString('ko-KR');
    }
    if (price >= 100) {
      return Math.round(price).toLocaleString('ko-KR');
    }
    return price.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  if (loading) {
    return (
      <div className="price-dashboard-section">
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="price-dashboard-section">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0
        }}>
          오늘의 시세
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {lastUpdate && `${lastUpdate} 기준`}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        {/* 왼쪽 스크롤 버튼 */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="d-none d-md-flex"
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            ‹
          </button>
        )}

        {/* 오른쪽 스크롤 버튼 */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="d-none d-md-flex"
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            ›
          </button>
        )}

        {/* 스크롤 컨테이너 */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            padding: '4px 0',
          }}
        >
          {DASHBOARD_ITEMS.map(item => {
            const priceData = prices[item.id];
            const changeClass = priceData?.change > 0.1 ? 'up' : priceData?.change < -0.1 ? 'down' : 'neutral';

            return (
              <div
                key={item.id}
                className="price-dashboard-item"
                onClick={() => selectItemById(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  width: '120px',
                  height: '140px',
                  flexShrink: 0,
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={44}
                  height={44}
                  style={{ marginBottom: '8px', borderRadius: '6px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon.png';
                  }}
                />
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  marginBottom: '6px',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap'
                }}>
                  {item.shortName}
                </span>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  {formatPrice(priceData?.current || 0)}
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: changeClass === 'up' ? '#ef4444' : changeClass === 'down' ? '#3b82f6' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px'
                  }}
                >
                  {priceData?.change !== 0 && (
                    <Image
                      src={priceData?.change > 0 ? '/up.png' : '/down.png'}
                      alt=""
                      width={14}
                      height={14}
                    />
                  )}
                  {priceData?.change === 0 && '─'}
                  {Math.abs(priceData?.change || 0).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
