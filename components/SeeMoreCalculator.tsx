'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Table, Spinner } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MaterialReward, MATERIAL_IDS, MATERIAL_NAMES } from '@/data/raidRewards';
import styles from './SeeMoreCalculator.module.css';

type RaidProfitData = {
  raidName: string;
  gate: number;
  totalValue: number;
  moreGold: number;
  profitLoss: number;
  materials: (MaterialReward & { unitPrice: number; totalPrice: number })[];
};

type CachedPriceData = {
  prices: { [itemId: number]: number };
  timestamp: number;
};

const CACHE_KEY = 'seeMorePrices';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

const SeeMoreCalculator: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);
  const [profitData, setProfitData] = useState<{ [key: string]: RaidProfitData[] }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRaidSelect = (raidName: string) => {
    setSelectedRaid(selectedRaid === raidName ? null : raidName);
  };

  // 캐시에서 가격 데이터 가져오기
  const getCachedPrices = (): CachedPriceData | null => {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  };

  // 캐시에 가격 데이터 저장
  const setCachedPrices = (prices: { [itemId: number]: number }) => {
    if (typeof window === 'undefined') return;
    const data: CachedPriceData = {
      prices,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  };

  // 오전 10시 30분인지 확인 (한국 시간)
  const isUpdateTime = (): boolean => {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);
    const kstHour = kstTime.getUTCHours();
    const kstMinute = kstTime.getUTCMinutes();
    return kstHour === 10 && kstMinute >= 30 && kstMinute < 35;
  };

  // 캐시가 만료되었는지 확인
  const isCacheExpired = (timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_DURATION;
  };

  // 캐시에 유효한 가격이 있는지 확인 (모든 가격이 0이 아닌지)
  const hasValidPrices = (prices: { [itemId: number]: number }): boolean => {
    const priceValues = Object.values(prices);
    if (priceValues.length === 0) return false;
    // 최소 하나 이상의 가격이 0보다 크면 유효
    return priceValues.some(price => price > 0);
  };

  // 컴포넌트 마운트시 캐시 확인 후 필요시 갱신
  useEffect(() => {
    const cached = getCachedPrices();

    // 캐시가 있고 만료되지 않았으며 유효한 가격이 있으면 캐시 사용
    if (cached && !isCacheExpired(cached.timestamp) && hasValidPrices(cached.prices)) {
      console.log('Using cached prices from:', new Date(cached.timestamp));
      calculateWithPrices(cached.prices);
      setLastUpdated(new Date(cached.timestamp));
    } else {
      // 캐시가 없거나 만료됐거나 가격이 0이면 새로 가져오기
      if (cached && !hasValidPrices(cached.prices)) {
        console.log('Cache has invalid prices (0), fetching new prices...');
      }
      fetchYesterdayPrices();
    }

    // 다음 오전 10시 30분까지의 시간 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);

    let nextUpdate = new Date(kstNow);
    nextUpdate.setUTCHours(10, 30, 0, 0);

    // 이미 10시 30분 지났으면 다음 날
    if (kstNow.getUTCHours() > 10 || (kstNow.getUTCHours() === 10 && kstNow.getUTCMinutes() >= 30)) {
      nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
    }

    const timeUntilNextUpdate = nextUpdate.getTime() - kstNow.getTime();
    console.log(`Next price update in ${Math.round(timeUntilNextUpdate / 1000 / 60)} minutes`);

    // 타이머 설정: 다음 10시 5분에 갱신
    const timer = setTimeout(() => {
      fetchYesterdayPrices();

      // 이후 24시간마다 갱신
      const interval = setInterval(() => {
        fetchYesterdayPrices();
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(interval);
    }, timeUntilNextUpdate);

    return () => clearTimeout(timer);
  }, []);

  // 어제 평균가 가져오기
  const fetchYesterdayPrices = async () => {
    setLoading(true);
    try {
      console.log('Fetching yesterday average prices...');

      const searchPrices: { [itemId: number]: number } = {};

      const pricePromises = Object.entries(MATERIAL_IDS).map(async ([key, itemId]) => {
        try {
          const response = await fetch('/api/market/yesterday-avg-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
          });

          if (!response.ok) {
            console.error(`Failed to fetch price for ${key}`);
            return { itemId, price: 0 };
          }

          const data = await response.json();
          console.log(`Yesterday avg price for ${key}: ${data.price}`);
          return { itemId, price: data.price || 0 };
        } catch (error) {
          console.error(`Error fetching price for ${key}:`, error);
          return { itemId, price: 0 };
        }
      });

      const priceResults = await Promise.all(pricePromises);
      priceResults.forEach(({ itemId, price }) => {
        searchPrices[itemId] = price;
      });

      console.log('All fetched yesterday average prices:', searchPrices);

      // 유효한 가격이 있을 때만 캐시 저장
      if (hasValidPrices(searchPrices)) {
        console.log('Valid prices fetched, saving to cache');
        setCachedPrices(searchPrices);
        setLastUpdated(new Date());
      } else {
        console.warn('All prices are 0, not saving to cache');
      }

      // 계산 수행 (가격이 0이어도 계산은 수행)
      calculateWithPrices(searchPrices);

    } catch (error) {
      console.error('Failed to fetch yesterday average prices:', error);
    } finally {
      setLoading(false);
    }
  };

  // 가격으로 수익 계산
  const calculateWithPrices = (searchPrices: { [itemId: number]: number }) => {
    try {
      console.log('Calculating raid profits with prices:', searchPrices);

      // 동일한 계산 로직 사용
      const newProfitData: { [key: string]: RaidProfitData[] } = {};

      const groupedRewards = raidRewards.reduce((acc, reward) => {
        if (!acc[reward.raidName]) {
          acc[reward.raidName] = [];
        }
        acc[reward.raidName].push(reward);
        return acc;
      }, {} as { [key: string]: typeof raidRewards });

      Object.entries(groupedRewards).forEach(([raidName, rewards]) => {
        newProfitData[raidName] = rewards.map(reward => {
          const materialsWithPrices = reward.materials.map(material => {
            const unitPrice = searchPrices[material.itemId] || 0;
            const totalPrice = unitPrice * material.amount;

            console.log(`${material.itemName} - 단위가격: ${unitPrice}, 수량: ${material.amount}, 총가격: ${totalPrice}`);

            return {
              ...material,
              unitPrice: unitPrice,
              totalPrice: Math.round(totalPrice)
            };
          });

          const totalValue = materialsWithPrices.reduce((sum, mat) => sum + mat.totalPrice, 0);
          const raidInfo = raids.find(r => r.name === raidName);
          const gateInfo = raidInfo?.gates.find(g => g.gate === reward.gate);
          const moreGold = gateInfo?.moreGold || 0;
          const profitLoss = totalValue - moreGold;

          console.log(`${raidName} ${reward.gate}관문 - 총 가치: ${totalValue}, 더보기 비용: ${moreGold}, 손익: ${profitLoss}`);

          return {
            raidName,
            gate: reward.gate,
            totalValue,
            moreGold,
            profitLoss,
            materials: materialsWithPrices
          };
        });
      });

      setProfitData(newProfitData);
      console.log('Successfully calculated raid profits with yesterday average prices:', newProfitData);
    } catch (error) {
      console.error('Failed to calculate raid profits:', error);
    }
  };

  // 손익 계산 함수
  const calculateProfitLoss = (raidName: string): number => {
    const raidData = profitData[raidName];
    if (!raidData) return 0;
    
    // Return total profit/loss for all gates
    const totalProfitLoss = raidData.reduce((sum, gate) => sum + gate.profitLoss, 0);
    return totalProfitLoss;
  };

  // 손익에 따른 CSS 클래스 결정
  const getProfitLossClass = (raidName: string) => {
    const profitLoss = calculateProfitLoss(raidName);
    if (profitLoss > 0) return styles.profitRaid;
    if (profitLoss < 0) return styles.lossRaid;
    return styles.neutralRaid;
  };

  return (
    <div>
      {/* 레이드 목록 버튼들 */}
      <div className={styles.raidGrid}>
        {raids.map((raid) => (
          <Button
            key={raid.name}
            variant={selectedRaid === raid.name ? "primary" : "outline-secondary"}
            className={`${styles.raidButton} ${getProfitLossClass(raid.name)}`}
            onClick={() => handleRaidSelect(raid.name)}
          >
            <div className={styles.raidButtonContent}>
              <span className={styles.raidName}>{raid.name}</span>
              <div className={styles.raidInfo}>
                <Badge bg="secondary" className={styles.raidLevel}>Lv. {raid.level}</Badge>
                {profitData[raid.name] && (
                  <Badge 
                    bg={calculateProfitLoss(raid.name) > 0 ? 'success' : calculateProfitLoss(raid.name) < 0 ? 'danger' : 'secondary'}
                    className={styles.profitBadge}
                  >
                    {calculateProfitLoss(raid.name) > 0 ? '+' : ''}{Math.round(calculateProfitLoss(raid.name)).toLocaleString()}골드
                  </Badge>
                )}
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* 가격 정보 및 갱신 상태 */}
      <div className="d-flex justify-content-between align-items-center mt-3 mb-3">
        <div className="d-flex gap-2">
          {loading && (
            <div className="d-flex align-items-center text-muted">
              <Spinner animation="border" size="sm" className="me-2" />
              <span>최근 거래가 갱신 중...</span>
            </div>
          )}
        </div>
        
        <div className="text-end">
          <small className="text-muted d-block">
            {lastUpdated ?
              `전일 평균가 (매일 오전 10시 30분 갱신) | 실시간 시세와 차이가 있을 수 있습니다` :
              '가격 정보를 불러오는 중...'
            }
          </small>
        </div>
      </div>
      
      {/* 선택된 레이드의 더보기 정보 표시 영역 */}
      {selectedRaid && profitData[selectedRaid] && (
        <Card className={`mt-4 ${styles.selectedRaidCard}`} style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <Card.Header as="h5" style={{ backgroundColor: 'var(--card-header-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            {selectedRaid} 더보기 보상
          </Card.Header>
          <Card.Body>
            {profitData[selectedRaid].map((gateData, index) => (
              <div key={index} className={`${styles.gateSection} ${gateData.profitLoss > 0 ? styles.profit : gateData.profitLoss < 0 ? styles.loss : styles.neutral}`} style={{ borderColor: 'var(--border-color)' }}>
                <h6 className="mb-3" style={{ color: 'var(--text-primary)' }}>
                  {gateData.gate}관문 
                  <Badge 
                    bg={gateData.profitLoss > 0 ? 'success' : gateData.profitLoss < 0 ? 'danger' : 'secondary'}
                    className="ms-2"
                  >
                    {gateData.profitLoss > 0 ? '+' : ''}{Math.round(gateData.profitLoss).toLocaleString()}골드
                  </Badge>
                </h6>
                
                <Row className="mb-3" style={{ color: 'var(--text-secondary)' }}>
                  <Col md={4}>
                    <strong>더보기 비용:</strong> {gateData.moreGold.toLocaleString()}골드
                  </Col>
                  <Col md={4}>
                    <strong>재료 가치:</strong> {Math.round(gateData.totalValue).toLocaleString()}골드
                  </Col>
                  <Col md={4}>
                    <strong className={gateData.profitLoss > 0 ? 'text-success' : gateData.profitLoss < 0 ? 'text-danger' : 'text-secondary'}>
                      {gateData.profitLoss > 0 ? '이익' : gateData.profitLoss < 0 ? '손실' : '중립'}: 
                      {gateData.profitLoss > 0 ? '+' : ''}{Math.round(gateData.profitLoss).toLocaleString()}골드
                    </strong>
                  </Col>
                </Row>
                
                <Table striped bordered hover size="sm" style={{ color: 'var(--text-primary)' }}>
                  <thead>
                    <tr>
                      <th>재료명</th>
                      <th>수량</th>
                      <th>단가</th>
                      <th>총 가치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateData.materials.map((material, matIndex) => (
                      <tr key={matIndex}>
                        <td>{material.itemName}</td>
                        <td>{material.amount.toLocaleString()}</td>
                        <td>{material.unitPrice >= 1 ? material.unitPrice.toLocaleString() : material.unitPrice.toFixed(4)}골드</td>
                        <td>{Math.round(material.totalPrice).toLocaleString()}골드</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default SeeMoreCalculator;
