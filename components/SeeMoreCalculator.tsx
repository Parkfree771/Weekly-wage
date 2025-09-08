'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Table, Spinner } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MaterialReward, MATERIAL_IDS, MATERIAL_NAMES } from '@/data/raidRewards';
import { marketPriceService } from '@/utils/marketPriceService';
import styles from './SeeMoreCalculator.module.css';

type RaidProfitData = {
  raidName: string;
  gate: number;
  totalValue: number;
  moreGold: number;
  profitLoss: number;
  materials: (MaterialReward & { unitPrice: number; totalPrice: number })[];
};

const SeeMoreCalculator: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);
  const [profitData, setProfitData] = useState<{ [key: string]: RaidProfitData[] }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRaidSelect = (raidName: string) => {
    setSelectedRaid(selectedRaid === raidName ? null : raidName);
  };

  // 컴포넌트 마운트시 및 1시간마다 정각 갱신
  useEffect(() => {
    calculateRaidProfitsWithCurrentPrices();
    
    // 다음 정각까지의 시간 계산
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const timeUntilNextHour = nextHour.getTime() - now.getTime();
    
    // 첫 번째 타이머: 다음 정각까지
    const firstTimer = setTimeout(() => {
      calculateRaidProfitsWithCurrentPrices();
      
      // 이후 1시간마다 정각 갱신
      const interval = setInterval(() => {
        calculateRaidProfitsWithCurrentPrices();
      }, 60 * 60 * 1000); // 1시간마다 실행
      
      return () => clearInterval(interval);
    }, timeUntilNextHour);
    
    return () => clearTimeout(firstTimer);
  }, []);


  // 최근 거래가로 수익 계산 (자동으로 5분마다 실행)
  const calculateRaidProfitsWithCurrentPrices = async () => {
    setLoading(true);
    try {
      console.log('Starting price calculation with current prices...');
      
      const searchPrices: { [itemId: number]: number } = {};
      
      // 최근 거래가 가져오기 (5분 캐시 사용)
      const pricePromises = Object.entries(MATERIAL_NAMES).map(async ([key, itemName]) => {
        const itemId = MATERIAL_IDS[key as keyof typeof MATERIAL_IDS];
        
        // 5분 캐시를 활용한 최근 거래가 가져오기
        let price = await marketPriceService.getCurrentLowestPrice(itemName);
        
        console.log(`Current price for ${itemName}: ${price}`);
        return { itemId, price };
      });
      
      const priceResults = await Promise.all(pricePromises);
      priceResults.forEach(({ itemId, price }) => {
        searchPrices[itemId] = price;
      });
      
      console.log('All fetched prices (current prices):', searchPrices);
      
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
            
            console.log(`${material.itemName} - API단위가격: ${unitPrice}, 수량: ${material.amount}, 총가격: ${totalPrice}`);
            
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
      setLastUpdated(new Date());
      console.log('Successfully calculated raid profits with trading average prices:', newProfitData);
    } catch (error) {
      console.error('Failed to calculate raid profits with trading average prices:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    calculateRaidProfitsWithCurrentPrices();
  }, []);
  
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
              `최신 거래 평균가 (매시 정각 갱신) | 게임과 다소 차이가 있을 수 있으니 양해 부탁드립니다` : 
              '가격 정보를 불러오는 중...'
            }
          </small>
        </div>
      </div>
      
      {/* 선택된 레이드의 더보기 정보 표시 영역 */}
      {selectedRaid && profitData[selectedRaid] && (
        <Card className={`mt-4 ${styles.selectedRaidCard}`}>
          <Card.Header as="h5">
            {selectedRaid} 더보기 보상
          </Card.Header>
          <Card.Body>
            {profitData[selectedRaid].map((gateData, index) => (
              <div key={index} className={`${styles.gateSection} ${gateData.profitLoss > 0 ? styles.profit : gateData.profitLoss < 0 ? styles.loss : styles.neutral}`}>
                <h6 className="mb-3">
                  {gateData.gate}관문 
                  <Badge 
                    bg={gateData.profitLoss > 0 ? 'success' : gateData.profitLoss < 0 ? 'danger' : 'secondary'}
                    className="ms-2"
                  >
                    {gateData.profitLoss > 0 ? '+' : ''}{Math.round(gateData.profitLoss).toLocaleString()}골드
                  </Badge>
                </h6>
                
                <Row className="mb-3">
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
                
                <Table striped bordered hover size="sm">
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
