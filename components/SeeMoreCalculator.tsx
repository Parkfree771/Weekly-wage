'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, Badge, Button, Row, Col, Table, Spinner } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MaterialReward, MATERIAL_IDS, MATERIAL_NAMES, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';
import { fetchPriceData } from '@/lib/price-history-client';
import styles from './SeeMoreCalculator.module.css';

// 재료 이름에 따른 이미지 파일명 매핑
const getMaterialImage = (itemName: string): string => {
  const imageMap: { [key: string]: string } = {
    '운명의 파괴석': 'destiny-destruction-stone.webp',
    '운명의 수호석': 'destiny-guardian-stone.webp',
    '운명의 파편': 'destiny-shard-bag-large.webp',
    '운명의 돌파석': 'destiny-breakthrough-stone.webp',
  };

  return imageMap[itemName] || 'default-material.webp';
};

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
    } catch (error) {
      console.error('Failed to calculate raid profits:', error);
    }
  };

  // 손익 계산 함수
  const calculateProfitLoss = (raidName: string): number => {
    const raidData = profitData[raidName];
    if (!raidData) return 0;
    const totalProfitLoss = raidData.reduce((sum, gate) => sum + gate.profitLoss, 0);
    return totalProfitLoss;
  };

  return (
    <div>
      {/* 레이드 목록 카드들 */}
      <div className={styles.raidCardsGrid}>
        {raids.map((raid) => {
          const profitLoss = calculateProfitLoss(raid.name);
          const isProfit = profitLoss > 0;
          const isLoss = profitLoss < 0;
          const isSelected = selectedRaid === raid.name;
          
          // 세르카 레이드인지 확인
          const isCerka = raid.name.includes('세르카');

          return (
            <div
      key={raid.name}
      className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
      
      /* 👇 [수정 1] 클릭 제한 해제 (disabled여도 클릭 됨) */
      onClick={() => handleRaidSelect(raid.name)}
      
      /* 👇 [수정 2] 흐리게 만드는 스타일 삭제 (항상 선명하게) */
      style={{ 
        opacity: 1, 
        cursor: 'pointer' 
      }}
    >
              <div className={styles.imageWrapper}>
                <Image
                  src={raid.image || '/behemoth.webp'}
                  alt={raid.name}
                  fill
                  className={styles.raidImage}
                  sizes="(max-width: 768px) 150px, 200px"
                />
                <div className={styles.overlay} />
              </div>
              <div className={styles.cardContent}>
                {/* [수정 포인트] 
                    1. 세르카인 경우: 특별한 이름과 출시일 표시 
                    2. 일반 레이드인 경우: 기존 방식대로 표시
                    3. 공통: style={{ color: '#fff' }}를 추가하여 라이트모드에서도 흰색 글씨 강제
                */}
                {isCerka ? (
                  <>
                    <h3 className={styles.raidName} style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {raid.name}
                    </h3>
                    <p className={styles.raidLevel} style={{ color: '#f0f0f0', opacity: 0.9, marginTop: '4px', fontWeight: 600 }}>
                      1월 7일 출시 예정
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className={styles.raidName} style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {raid.name} {raid.disabled && !isCerka && '(1/7 출시)'}
                    </h3>
                    <p className={styles.raidLevel} style={{ color: '#f0f0f0', opacity: 0.9 }}>
                      Lv. {raid.level}
                    </p>
                  </>
                )}
                
                {profitData[raid.name] && (
                  <div className={`${styles.goldBadge} ${isProfit ? styles.profitBadge : isLoss ? styles.lossBadge : styles.neutralBadge}`}>
                    {isProfit ? '+' : ''}{Math.round(profitLoss).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
            <div className={styles.gatesGrid}>
              {profitData[selectedRaid].map((gateData, index) => (
                <div key={index} className={`${styles.gateSection} ${gateData.profitLoss > 0 ? styles.profit : gateData.profitLoss < 0 ? styles.loss : styles.neutral}`}>
                <h6 className={`mb-2 ${styles.gateSectionHeader}`}>
                  {gateData.gate}관문
                  <Badge
                    bg={gateData.profitLoss > 0 ? 'success' : gateData.profitLoss < 0 ? 'danger' : 'secondary'}
                    className="ms-2"
                  >
                    {gateData.profitLoss > 0 ? '+' : ''}{Math.round(gateData.profitLoss).toLocaleString()}골드
                  </Badge>
                </h6>

                <div className={`mb-2 ${styles.gateSummaryRow}`}>
                  <strong>더보기비용:</strong> {gateData.moreGold.toLocaleString()}골드
                  <strong>재료 가치:</strong> {Math.round(gateData.totalValue).toLocaleString()}골드
                  <strong>손익:</strong> {Math.round(gateData.totalValue).toLocaleString()} - {gateData.moreGold.toLocaleString()} = <span className={gateData.profitLoss > 0 ? 'text-success' : gateData.profitLoss < 0 ? 'text-danger' : 'text-secondary'} style={{ fontWeight: 700 }}>
                    {gateData.profitLoss > 0 ? '+' : ''}{Math.round(gateData.profitLoss).toLocaleString()}골드
                  </span>
                </div>
                
                <Table
                  hover
                  size="sm"
                  className={styles.materialTable}
                >
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>재료</th>
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>수량</th>
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>단가</th>
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>총 가치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateData.materials.map((material, matIndex) => (
                      <tr key={matIndex} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Image
                              src={`/${getMaterialImage(material.itemName)}`}
                              alt={material.itemName}
                              width={32}
                              height={32}
                              className={styles.materialIcon}
                            />
                            <span>{material.itemName}</span>
                          </div>
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellRight}`}>{material.amount.toLocaleString()}</td>
                        <td className={`${styles.tableCell} ${styles.tableCellRight} ${styles.tableCellPrice}`}>{material.unitPrice >= 1 ? material.unitPrice.toLocaleString() : material.unitPrice.toFixed(4)}골드</td>
                        <td className={`${styles.tableCell} ${styles.tableCellRight} ${styles.tableCellTotal}`}>{Math.round(material.totalPrice).toLocaleString()}골드</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default SeeMoreCalculator;