'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, Badge, Button, Row, Col, Table, Spinner, Form } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MaterialReward, MATERIAL_IDS, MATERIAL_NAMES, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';
import { usePriceData } from '@/contexts/PriceContext';
import styles from './SeeMoreCalculator.module.css';

// 재료 이름에 따른 이미지 파일명 매핑
const getMaterialImage = (itemName: string): string => {
  const imageMap: { [key: string]: string } = {
    // 기존 재료
    '운명의 파괴석': 'destiny-destruction-stone.webp',
    '운명의 수호석': 'destiny-guardian-stone.webp',
    '운명의 파편': 'destiny-shard-bag-large.webp',
    '운명의 돌파석': 'destiny-breakthrough-stone.webp',
    // 계승 재료 (세르카 레이드)
    '운명의 파괴석 결정': 'destiny-destruction-stone2.webp?v=3',
    '운명의 수호석 결정': 'destiny-guardian-stone2.webp?v=3',
    '위대한 운명의 돌파석': 'destiny-breakthrough-stone2.webp?v=3',
    // 특수 재료 (거래 불가)
    '코어': 'cerka-core.webp',
    '고통의 가시': 'pulsating-thorn.webp',
    '은총의 파편': 'dmschddmlvkvus.webp',
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

// 오늘 날짜를 "YYYY년 M월 D일 평균 거래가" 형식으로 반환
const getTodayPriceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 평균 거래가`;
};

const SeeMoreCalculator: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);
  // 재료 체크 상태 관리: { [raidName]: { [gate]: { [itemId]: boolean } } }
  const [materialChecks, setMaterialChecks] = useState<{
    [raidName: string]: { [gate: number]: { [itemId: number]: boolean } }
  }>({});

  // Context에서 가격 데이터 가져오기
  const { unitPrices, loading } = usePriceData();

  const handleRaidSelect = (raidName: string) => {
    setSelectedRaid(selectedRaid === raidName ? null : raidName);
  };

  // 재료가 체크되어 있는지 확인
  const isMaterialChecked = (raidName: string, gate: number, itemId: number): boolean => {
    return materialChecks[raidName]?.[gate]?.[itemId] ?? true;
  };

  // 재료 체크 토글 함수
  const handleMaterialCheck = (raidName: string, gate: number, itemId: number) => {
    setMaterialChecks(prev => ({
      ...prev,
      [raidName]: {
        ...prev[raidName],
        [gate]: {
          ...prev[raidName]?.[gate],
          [itemId]: !prev[raidName]?.[gate]?.[itemId]
        }
      }
    }));
  };

  // 가격 데이터를 기반으로 수익 계산 (메모이제이션)
  const profitData = useMemo(() => {
    if (Object.keys(unitPrices).length === 0) {
      return {};
    }

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
          const unitPrice = unitPrices[material.itemId] || 0;
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

    return newProfitData;
  }, [unitPrices]);

  // 재료 체크 상태 초기화 (레이드 선택 시 또는 profitData 변경 시)
  useEffect(() => {
    if (selectedRaid && profitData[selectedRaid]) {
      setMaterialChecks(prev => {
        // 이미 해당 레이드의 체크 상태가 있으면 유지
        if (prev[selectedRaid]) return prev;

        // 없으면 모든 재료를 체크된 상태로 초기화
        const raidChecks: { [gate: number]: { [itemId: number]: boolean } } = {};
        profitData[selectedRaid].forEach(gateData => {
          raidChecks[gateData.gate] = {};
          gateData.materials.forEach(material => {
            raidChecks[gateData.gate][material.itemId] = true;
          });
        });
        return { ...prev, [selectedRaid]: raidChecks };
      });
    }
  }, [selectedRaid, profitData]);

  // 손익 계산 함수 (체크된 재료만 계산)
  const calculateProfitLoss = (raidName: string): number => {
    const raidData = profitData[raidName];
    if (!raidData) return 0;

    const totalProfitLoss = raidData.reduce((sum, gate) => {
      const checkedMaterialsValue = gate.materials.reduce((matSum, material) => {
        const isChecked = isMaterialChecked(raidName, gate.gate, material.itemId);
        return matSum + (isChecked ? material.totalPrice : 0);
      }, 0);
      return sum + (checkedMaterialsValue - gate.moreGold);
    }, 0);
    return totalProfitLoss;
  };

  // 관문별 손익 계산 함수 (체크된 재료만 계산)
  const calculateGateProfitLoss = (raidName: string, gateData: RaidProfitData): { totalValue: number; profitLoss: number } => {
    const checkedMaterialsValue = gateData.materials.reduce((sum, material) => {
      const isChecked = isMaterialChecked(raidName, gateData.gate, material.itemId);
      return sum + (isChecked ? material.totalPrice : 0);
    }, 0);
    return {
      totalValue: checkedMaterialsValue,
      profitLoss: checkedMaterialsValue - gateData.moreGold
    };
  };

  return (
    <div>
      {/* 레이드 목록 카드들 */}
      <div className={styles.raidCardsGrid}>
        {raids.map((raid, index) => {
          const profitLoss = calculateProfitLoss(raid.name);
          const isProfit = profitLoss > 0;
          const isLoss = profitLoss < 0;
          const isSelected = selectedRaid === raid.name;

          // LCP 최적화: 처음 6개 이미지는 priority 로딩
          const isPriorityImage = index < 6;

          return (
            <div
              key={raid.name}
              className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleRaidSelect(raid.name)}
              style={{ opacity: 1, cursor: 'pointer' }}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={raid.image || '/behemoth.webp'}
                  alt={raid.name}
                  fill
                  className={styles.raidImage}
                  sizes="(max-width: 768px) 150px, 200px"
                  priority={isPriorityImage}
                />
                <div className={styles.overlay} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.raidName} style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {raid.name}
                </h3>
                <p className={styles.raidLevel} style={{ color: '#f0f0f0', opacity: 0.9 }}>
                  Lv. {raid.level}
                </p>

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
            {getTodayPriceDate()} | 실시간 시세와 차이가 있을 수 있습니다
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
              {profitData[selectedRaid].map((gateData, index) => {
                const calculatedGate = calculateGateProfitLoss(selectedRaid, gateData);
                return (
                <div key={index} className={`${styles.gateSection} ${calculatedGate.profitLoss > 0 ? styles.profit : calculatedGate.profitLoss < 0 ? styles.loss : styles.neutral}`}>
                <h6 className={`mb-2 ${styles.gateSectionHeader}`}>
                  {gateData.gate}관문
                  <Badge
                    bg={calculatedGate.profitLoss > 0 ? 'success' : calculatedGate.profitLoss < 0 ? 'danger' : 'secondary'}
                    className="ms-2"
                  >
                    {calculatedGate.profitLoss > 0 ? '+' : ''}{Math.round(calculatedGate.profitLoss).toLocaleString()}골드
                  </Badge>
                </h6>

                <div className={`mb-2 ${styles.gateSummaryRow}`}>
                  <span className={styles.summaryFirstLine}>
                    <strong>더보기비용:</strong> {gateData.moreGold.toLocaleString()}골드
                    <strong>재료 가치:</strong> {Math.round(calculatedGate.totalValue).toLocaleString()}골드
                  </span>
                  <span className={styles.summarySecondLine}>
                    <strong>손익:</strong> {Math.round(calculatedGate.totalValue).toLocaleString()} - {gateData.moreGold.toLocaleString()} = <span className={calculatedGate.profitLoss > 0 ? 'text-success' : calculatedGate.profitLoss < 0 ? 'text-danger' : 'text-secondary'} style={{ fontWeight: 700 }}>
                      {calculatedGate.profitLoss > 0 ? '+' : ''}{Math.round(calculatedGate.profitLoss).toLocaleString()}골드
                    </span>
                  </span>
                </div>
                
                <Table
                  hover
                  size="sm"
                  className={styles.materialTable}
                >
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={`${styles.tableHeaderCell} ${styles.checkboxCol}`}></th>
                      <th className={styles.tableHeaderCell}>재료</th>
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>수량</th>
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>단가</th>
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRight}`}>총 가치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateData.materials.map((material, matIndex) => {
                      const isChecked = isMaterialChecked(selectedRaid, gateData.gate, material.itemId);
                      return (
                      <tr
                        key={matIndex}
                        className={`${styles.tableRow} ${isChecked ? '' : styles.uncheckedRow}`}
                      >
                        <td className={`${styles.tableCell} ${styles.checkboxCol}`}>
                          <Form.Check
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMaterialCheck(selectedRaid, gateData.gate, material.itemId)}
                            className={styles.materialCheckbox}
                          />
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.materialCellContent}>
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
                        <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                          {material.amount === 0 ? '?' : material.amount.toLocaleString()}
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellRight} ${styles.tableCellPrice}`}>
                          {material.itemId === 0 ? '-' : (material.unitPrice >= 1 ? material.unitPrice.toLocaleString() : material.unitPrice.toFixed(4)) + '골드'}
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellRight} ${styles.tableCellTotal}`}>
                          {material.itemId === 0 ? '-' : Math.round(material.totalPrice).toLocaleString() + '골드'}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </Table>
                </div>
              );
              })}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default SeeMoreCalculator;