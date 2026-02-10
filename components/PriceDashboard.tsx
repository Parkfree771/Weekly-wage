'use client';

import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import Image from 'next/image';
import { Spinner } from 'react-bootstrap';
import { PriceContext } from './PriceComparisonStats';

type PriceItem = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
};

// 거래소 + 경매장 아이템 표시
const DASHBOARD_ITEMS: PriceItem[] = [
  // 계승 재련 재료
  { id: '66102007', name: '운명의 파괴석 결정', shortName: '파괴석 결정', icon: '/destiny-destruction-stone2.webp?v=3' },
  { id: '66102107', name: '운명의 수호석 결정', shortName: '수호석 결정', icon: '/destiny-guardian-stone2.webp?v=3' },
  { id: '66110226', name: '위대한 운명의 돌파석', shortName: '위대한 돌파석', icon: '/destiny-breakthrough-stone2.webp?v=3' },
  { id: '6861013', name: '상급 아비도스 융화 재료', shortName: '상비도스', icon: '/top-abidos-fusion5.webp' },
  // 일반 재련 재료
  { id: '66102006', name: '운명의 파괴석', shortName: '파괴석', icon: '/destiny-destruction-stone5.webp' },
  { id: '66102106', name: '운명의 수호석', shortName: '수호석', icon: '/destiny-guardian-stone5.webp' },
  { id: '66110225', name: '운명의 돌파석', shortName: '돌파석', icon: '/destiny-breakthrough-stone5.webp' },
  { id: '6861012', name: '아비도스 융화 재료', shortName: '아비도스', icon: '/abidos-fusion5.webp?v=3' },
  { id: '66130143', name: '운명의 파편 주머니(대)', shortName: '운파', icon: '/destiny-shard-bag-large5.webp' },
  // 재련 추가 재료
  { id: '66111131', name: '용암의 숨결', shortName: '용암의 숨결', icon: '/breath-lava5.webp' },
  { id: '66111132', name: '빙하의 숨결', shortName: '빙하의 숨결', icon: '/breath-glacier5.webp' },
  // 유물 각인서 (거래소) - 전체
  { id: '65203905', name: '아드레날린', shortName: '아드레날린', icon: '/engraving.webp' },
  { id: '65200505', name: '원한', shortName: '원한', icon: '/engraving.webp' },
  { id: '65203305', name: '돌격대장', shortName: '돌격대장', icon: '/engraving.webp' },
  { id: '65201005', name: '예리한 둔기', shortName: '예리한 둔기', icon: '/engraving.webp' },
  { id: '65203505', name: '질량 증가', shortName: '질량 증가', icon: '/engraving.webp' },
  { id: '65202805', name: '저주받은 인형', shortName: '저주받은 인형', icon: '/engraving.webp' },
  { id: '65203005', name: '기습의 대가', shortName: '기습의 대가', icon: '/engraving.webp' },
  { id: '65203705', name: '타격의 대가', shortName: '타격의 대가', icon: '/engraving.webp' },
  { id: '65203405', name: '각성', shortName: '각성', icon: '/engraving.webp' },
  { id: '65204105', name: '전문의', shortName: '전문의', icon: '/engraving.webp' },
  { id: '65200605', name: '슈퍼차지', shortName: '슈퍼차지', icon: '/engraving.webp' },
  { id: '65201505', name: '결투의 대가', shortName: '결투의 대가', icon: '/engraving.webp' },
  // 보석 (경매장)
  { id: 'auction_gem_fear_8', name: '8레벨 겁화의 보석', shortName: '8겁화', icon: '/gem-fear-8.webp' },
  { id: 'auction_gem_fear_9', name: '9레벨 겁화의 보석', shortName: '9겁화', icon: '/gem-fear-8.webp' },
  { id: 'auction_gem_fear_10', name: '10레벨 겁화의 보석', shortName: '10겁화', icon: '/gem-fear-10.webp' },
  { id: 'auction_gem_flame_10', name: '10레벨 작열의 보석', shortName: '10작열', icon: '/gem-flame-10.webp' },
  // 악세서리 - 딜러 (경매장)
  { id: 'auction_necklace_ancient_refine3', name: '고대 목걸이 적주피(상)/추피(중)', shortName: '목걸이 상중', icon: '/ancient-necklace.webp' },
  { id: 'auction_necklace_ancient_refine3_high', name: '고대 목걸이 적주피(상)/추피(상)', shortName: '목걸이 상상', icon: '/ancient-necklace.webp' },
  { id: 'auction_ring_ancient_refine3', name: '고대 반지 치피(상)/치적(중)', shortName: '반지 상중', icon: '/ancient-ring.webp' },
  { id: 'auction_ring_ancient_refine3_high', name: '고대 반지 치피(상)/치적(상)', shortName: '반지 상상', icon: '/ancient-ring.webp' },
  { id: 'auction_earring_ancient_refine3', name: '고대 귀걸이 공%(상)/무공%(중)', shortName: '귀걸이 상중', icon: '/ancient-earring.webp' },
  { id: 'auction_earring_ancient_refine3_high', name: '고대 귀걸이 공%(상)/무공%(상)', shortName: '귀걸이 상상', icon: '/ancient-earring.webp' },
  // 악세서리 - 서포터 (경매장)
  { id: 'auction_necklace_support_refine3', name: '고대 목걸이 낙인력(상)/게이지(중)', shortName: '서폿목 상중', icon: '/ancient-necklace.webp' },
  { id: 'auction_necklace_support_refine3_high', name: '고대 목걸이 낙인력(상)/게이지(상)', shortName: '서폿목 상상', icon: '/ancient-necklace.webp' },
  { id: 'auction_ring_support_refine3', name: '고대 반지 아피강(상)/아공강(중)', shortName: '서폿반 상중', icon: '/ancient-ring.webp' },
  { id: 'auction_ring_support_refine3_high', name: '고대 반지 아공강(상)/아피강(상)', shortName: '서폿반 상상', icon: '/ancient-ring.webp' },
];

const STORAGE_KEY = 'priceDashboardConfig';

// 선택된 아이템 ID 목록 (순서대로)
type DashboardConfig = {
  selectedItems: string[];
};

type PriceData = {
  current: number;
  previous: number;
  change: number;
};

// 기본 설정 (사용자 지정)
const DEFAULT_SELECTED_ITEMS = [
  '66102007',  // 파괴석 결정
  '6861013',   // 상비도스
  '65203905',  // 아드레날린
  '65200505',  // 원한
  '65203305',  // 돌격대장
  '65203505',  // 질량 증가
  '65202805',  // 저주받은 인형
  'auction_gem_fear_8',  // 8겁화
  'auction_gem_fear_10', // 10겁화
  'auction_necklace_ancient_refine3', // 목걸이 상중
  'auction_ring_ancient_refine3',     // 반지 상중
];

const getDefaultConfig = (): DashboardConfig => ({
  selectedItems: [...DEFAULT_SELECTED_ITEMS]
});

// localStorage에서 설정 불러오기
const loadConfig = (): DashboardConfig => {
  if (typeof window === 'undefined') return getDefaultConfig();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 새 형식인지 확인 (selectedItems 배열이 있는지)
      if (parsed.selectedItems && Array.isArray(parsed.selectedItems)) {
        const validIds = new Set(DASHBOARD_ITEMS.map(i => i.id));
        parsed.selectedItems = parsed.selectedItems.filter((id: string) => validIds.has(id));
        return parsed as DashboardConfig;
      }
      // 이전 형식이면 기본 설정 반환
      return getDefaultConfig();
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return getDefaultConfig();
};

// localStorage에 설정 저장
const saveConfig = (config: DashboardConfig) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
};

export default function PriceDashboard() {
  const { selectItemById } = useContext(PriceContext);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // 설정 관련 state
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>(getDefaultConfig());
  const [tempConfig, setTempConfig] = useState<DashboardConfig>(getDefaultConfig());

  // 컴포넌트 마운트 시 설정 불러오기
  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
    setTempConfig(loaded);
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { getItemPriceHistory } = await import('@/lib/price-history-client');
        const priceMap: Record<string, PriceData> = {};

        await Promise.all(
          DASHBOARD_ITEMS.map(async (item) => {
            try {
              const history = await getItemPriceHistory(item.id, 30);
              if (history.length > 0) {
                const currentPrice = history[history.length - 1]?.price || 0;
                const previousPrice = history.length >= 2
                  ? history[history.length - 2]?.price || currentPrice
                  : currentPrice;
                const change = previousPrice > 0
                  ? ((currentPrice - previousPrice) / previousPrice) * 100
                  : 0;
                priceMap[item.id] = { current: currentPrice, previous: previousPrice, change };
              }
            } catch (err) {
              console.error(`Failed to fetch price for ${item.id}:`, err);
            }
          })
        );

        setPrices(priceMap);
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
  }, [loading, config]);

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
    if (price >= 100000) {
      const man = price / 10000;
      return man >= 100 ? `${Math.round(man)}만` : `${man.toFixed(1)}만`;
    }
    if (price >= 10000) {
      const man = price / 10000;
      return `${man.toFixed(2)}만`;
    }
    if (price >= 100) {
      return Math.round(price).toLocaleString('ko-KR');
    }
    return price.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  // 설정 모달 열기
  const openSettings = () => {
    setTempConfig({ ...config });
    setShowSettings(true);
  };

  // 설정 저장
  const saveSettings = () => {
    setConfig(tempConfig);
    saveConfig(tempConfig);
    setShowSettings(false);
  };

  // 설정 초기화 (모든 선택 해제)
  const resetSettings = () => {
    setTempConfig({ selectedItems: [] });
  };

  // 아이템 토글 (클릭하면 추가, 다시 클릭하면 제거)
  const toggleItem = (itemId: string) => {
    setTempConfig(prev => {
      const selected = [...prev.selectedItems];
      const index = selected.indexOf(itemId);
      if (index >= 0) {
        // 이미 선택됨 -> 제거
        selected.splice(index, 1);
      } else {
        // 선택 안됨 -> 추가 (맨 뒤에)
        selected.push(itemId);
      }
      return { ...prev, selectedItems: selected };
    });
  };

  // 표시할 아이템 목록 (선택된 순서대로)
  const getVisibleItems = useCallback(() => {
    const itemMap = new Map(DASHBOARD_ITEMS.map(item => [item.id, item]));
    return config.selectedItems
      .filter(id => itemMap.has(id))
      .map(id => itemMap.get(id)!);
  }, [config]);

  // 선택된 아이템 번호 가져오기
  const getSelectedIndex = useCallback((itemId: string) => {
    const index = tempConfig.selectedItems.indexOf(itemId);
    return index >= 0 ? index + 1 : null;
  }, [tempConfig.selectedItems]);

  if (loading) {
    return (
      <div className="price-dashboard-section">
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    );
  }

  const visibleItems = getVisibleItems();

  return (
    <div className="price-dashboard-section">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0
          }}>
            오늘의 시세
          </h2>
          {/* 톱니바퀴 버튼 */}
          <button
            onClick={openSettings}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="시세 설정"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {lastUpdate && `${lastUpdate} 기준`}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
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
          {visibleItems.map(item => {
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
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap'
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

      {/* 설정 모달 */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* 모달 헤더 */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                시세 표시 설정
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* 모달 바디 */}
            <div style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
            }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                클릭하면 선택, 다시 클릭하면 해제됩니다. 클릭한 순서대로 표시됩니다.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}>
                {DASHBOARD_ITEMS.map((item) => {
                  const selectedIndex = getSelectedIndex(item.id);
                  const isSelected = selectedIndex !== null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 6px',
                        backgroundColor: isSelected ? '#3b82f620' : 'var(--card-bg)',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* 선택 번호 배지 */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {selectedIndex}
                        </div>
                      )}

                      {/* 아이콘 */}
                      <Image
                        src={item.icon}
                        alt={item.name}
                        width={32}
                        height={32}
                        style={{ borderRadius: '6px' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/icon.png';
                        }}
                      />

                      {/* 이름 */}
                      <span style={{
                        fontSize: '0.7rem',
                        color: isSelected ? '#3b82f6' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 400,
                        textAlign: 'center',
                        lineHeight: 1.2,
                        wordBreak: 'keep-all',
                      }}>
                        {item.shortName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={resetSettings}
                style={{
                  padding: '10px 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                초기화
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={saveSettings}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
