'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Row, Col, Table, Spinner } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MaterialReward, MATERIAL_IDS, MATERIAL_NAMES, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';
import { fetchPriceData } from '@/lib/price-history-client';
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

  // 컴포넌트 마운트시 가격 가져오기
  useEffect(() => {
    fetchLatestPrices();
  }, []);

  // latest_prices.json에서 최신 가격 가져오기
  const fetchLatestPrices = async () => {
    setLoading(true);
    try {
      const { latest } = await fetchPriceData();

      const searchPrices: { [itemId: number]: number } = {};

      Object.entries(MATERIAL_IDS).forEach(([key, itemId]) => {
        const bundlePrice = latest[String(itemId)] || 0;
        const bundleSize = MATERIAL_BUNDLE_SIZES[itemId] || 1;
        const unitPrice = bundlePrice / bundleSize; // 묶음 가격 → 개당 가격 변환
        searchPrices[itemId] = unitPrice;
      });

      setLastUpdated(new Date());
      calculateWithPrices(searchPrices);

    } catch (error) {
      console.error('Failed to fetch latest prices:', error);
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
            const unitPrice = searchPrices[material.itemId] || 0; // API에서 이미 개당 가격으로 반환
            const totalPrice = unitPrice * material.amount;

            console.log(`${material.itemName} - 개당가격: ${unitPrice}, 수량: ${material.amount}, 총가격: ${totalPrice}`);

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
            {lastUpdated ? (
              <>
                {lastUpdated.toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })} 기준 가격 | 실시간 시세와 차이가 있을 수 있습니다
              </>
            ) : '가격 정보를 불러오는 중...'}
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
                
                <Table
                  hover
                  size="sm"
                  style={{
                    color: 'var(--text-primary)',
                    marginBottom: 0,
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    overflow: 'hidden',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <thead>
                    <tr style={{
                      backgroundColor: 'var(--card-header-bg)',
                      borderBottom: '2px solid var(--border-color)'
                    }}>
                      <th style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        borderRight: '1px solid var(--border-color)'
                      }}>재료명</th>
                      <th style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        borderRight: '1px solid var(--border-color)',
                        textAlign: 'right'
                      }}>수량</th>
                      <th style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        borderRight: '1px solid var(--border-color)',
                        textAlign: 'right'
                      }}>단가</th>
                      <th style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        textAlign: 'right'
                      }}>총 가치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateData.materials.map((material, matIndex) => (
                      <tr
                        key={matIndex}
                        style={{
                          backgroundColor: matIndex % 2 === 0 ? 'transparent' : 'var(--table-row-alternate)',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td style={{
                          padding: '0.65rem 1rem',
                          fontSize: '0.875rem',
                          borderRight: '1px solid var(--border-color)',
                          borderTop: matIndex === 0 ? 'none' : '1px solid var(--border-color)'
                        }}>{material.itemName}</td>
                        <td style={{
                          padding: '0.65rem 1rem',
                          fontSize: '0.875rem',
                          borderRight: '1px solid var(--border-color)',
                          borderTop: matIndex === 0 ? 'none' : '1px solid var(--border-color)',
                          textAlign: 'right'
                        }}>{material.amount.toLocaleString()}</td>
                        <td style={{
                          padding: '0.65rem 1rem',
                          fontSize: '0.875rem',
                          borderRight: '1px solid var(--border-color)',
                          borderTop: matIndex === 0 ? 'none' : '1px solid var(--border-color)',
                          textAlign: 'right',
                          fontWeight: 500
                        }}>{material.unitPrice >= 1 ? material.unitPrice.toLocaleString() : material.unitPrice.toFixed(4)}골드</td>
                        <td style={{
                          padding: '0.65rem 1rem',
                          fontSize: '0.875rem',
                          borderTop: matIndex === 0 ? 'none' : '1px solid var(--border-color)',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--brand-primary)'
                        }}>{Math.round(material.totalPrice).toLocaleString()}골드</td>
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
