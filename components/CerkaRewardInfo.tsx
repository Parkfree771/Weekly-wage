'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, Table, Spinner, Form } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';
import { usePriceData } from '@/contexts/PriceContext';
import styles from './CerkaRewardInfo.module.css';

// 오늘 날짜를 "YYYY년 M월 D일 평균 거래가" 형식으로 반환
const getTodayPriceDate = () => {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 평균 거래가`;
};

// raids 배열을 Map으로 변환 (O(1) 조회용)
const raidMap = new Map(raids.map(r => [r.name, r]));

// 재료 이미지 매핑
const getMaterialImage = (itemName: string): string => {
  const imageMap: { [key: string]: string } = {
    '운명의 파괴석 결정': 'destiny-destruction-stone2.webp?v=3',
    '운명의 수호석 결정': 'destiny-guardian-stone2.webp?v=3',
    '위대한 운명의 돌파석': 'destiny-breakthrough-stone2.webp?v=3',
    '운명의 파괴석': 'destiny-destruction-stone.webp',
    '운명의 수호석': 'destiny-guardian-stone.webp',
    '운명의 돌파석': 'destiny-breakthrough-stone.webp',
    '운명의 파편': 'destiny-shard-bag-large.webp',
    '코어': 'cerka-core.webp',
    '고통의 가시': 'pulsating-thorn.webp',
    '은총의 파편': 'dmschddmlvkvus.webp',
  };
  return imageMap[itemName] || 'default-material.webp';
};

// 기본 클리어 보상 데이터
const basicClearRewards: { [key: string]: { gate: number; materials: { itemId: number; itemName: string; amount: number }[] }[] } = {
  '성당 3단계': [
    {
      gate: 1,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 405 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 810 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 8 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 9100 },
        { itemId: 0, itemName: '은총의 파편', amount: 24 },
        { itemId: 0, itemName: '코어', amount: 3 },
      ]
    },
    {
      gate: 2,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 500 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 1000 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 12 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 11000 },
        { itemId: 0, itemName: '은총의 파편', amount: 36 },
        { itemId: 0, itemName: '코어', amount: 3 },
      ]
    }
  ],
  '성당 2단계': [
    {
      gate: 1,
      materials: [
        { itemId: 66102006, itemName: '운명의 파괴석', amount: 980 },
        { itemId: 66102106, itemName: '운명의 수호석', amount: 1960 },
        { itemId: 66110225, itemName: '운명의 돌파석', amount: 11 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 6800 },
        { itemId: 0, itemName: '은총의 파편', amount: 12 },
        { itemId: 0, itemName: '코어', amount: 2 },
      ]
    },
    {
      gate: 2,
      materials: [
        { itemId: 66102006, itemName: '운명의 파괴석', amount: 1150 },
        { itemId: 66102106, itemName: '운명의 수호석', amount: 2300 },
        { itemId: 66110225, itemName: '운명의 돌파석', amount: 16 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 8600 },
        { itemId: 0, itemName: '은총의 파편', amount: 18 },
        { itemId: 0, itemName: '코어', amount: 2 },
      ]
    }
  ],
  '성당 1단계': [
    {
      gate: 1,
      materials: [
        { itemId: 66102006, itemName: '운명의 파괴석', amount: 820 },
        { itemId: 66102106, itemName: '운명의 수호석', amount: 1640 },
        { itemId: 66110225, itemName: '운명의 돌파석', amount: 9 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 5400 },
        { itemId: 0, itemName: '은총의 파편', amount: 4 },
        { itemId: 0, itemName: '코어', amount: 2 },
      ]
    },
    {
      gate: 2,
      materials: [
        { itemId: 66102006, itemName: '운명의 파괴석', amount: 1400 },
        { itemId: 66102106, itemName: '운명의 수호석', amount: 2800 },
        { itemId: 66110225, itemName: '운명의 돌파석', amount: 44 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 11880 },
        { itemId: 0, itemName: '은총의 파편', amount: 6 },
        { itemId: 0, itemName: '코어', amount: 2 },
      ]
    }
  ],
  '세르카 나메': [
    {
      gate: 1,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 405 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 810 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 8 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 9100 },
        { itemId: 0, itemName: '고통의 가시', amount: 10 },
        { itemId: 0, itemName: '코어', amount: 3 },
      ]
    },
    {
      gate: 2,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 500 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 1000 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 12 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 11000 },
        { itemId: 0, itemName: '고통의 가시', amount: 15 },
        { itemId: 0, itemName: '코어', amount: 3 },
      ]
    }
  ],
  '세르카 하드': [
    {
      gate: 1,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 385 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 770 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 7 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 8300 },
        { itemId: 0, itemName: '고통의 가시', amount: 10 },
        { itemId: 0, itemName: '코어', amount: 2 },
      ]
    },
    {
      gate: 2,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 475 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 950 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 10 },
        { itemId: 66130143, itemName: '운명의 파편', amount: 10100 },
        { itemId: 0, itemName: '고통의 가시', amount: 15 },
        { itemId: 0, itemName: '코어', amount: 2 },
      ]
    }
  ]
};

type MaterialWithPrice = {
  itemId: number;
  itemName: string;
  amount: number;
  unitPrice: number;
  totalPrice: number;
};

type GateData = {
  gate: number;
  clearGold: number;
  moreGold: number;
  basicMaterials: MaterialWithPrice[];
  basicMaterialValue: number;
  moreMaterials: MaterialWithPrice[];
  moreMaterialValue: number;
};

type RewardData = {
  raidName: string;
  level: number;
  image: string;
  gates: GateData[];
  totalClearGold: number;
  totalMoreGold: number;
  totalBasicMaterialValue: number;
  totalMoreMaterialValue: number;
  finalValue: number; // 클골 + 기본재료 + 더보기재료 - 더보기비용
  disabled: boolean; // 비활성화 (정보 미확정)
};

const CerkaRewardInfo: React.FC = () => {
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);
  // 재료 체크 상태 관리: { [raidName]: { basic: { [gate]: { [itemId]: boolean } }, more: { [gate]: { [itemId]: boolean } } } }
  const [materialChecks, setMaterialChecks] = useState<{
    [raidName: string]: {
      basic: { [gate: number]: { [itemId: number]: boolean } };
      more: { [gate: number]: { [itemId: number]: boolean } };
    }
  }>({});

  // Context에서 가격 데이터 가져오기
  const { unitPrices, loading } = usePriceData();

  // 재료가 체크되어 있는지 확인
  const isMaterialChecked = (raidName: string, type: 'basic' | 'more', gate: number, itemId: number): boolean => {
    return materialChecks[raidName]?.[type]?.[gate]?.[itemId] ?? true;
  };

  // 재료 체크 토글 함수
  const handleMaterialCheck = (raidName: string, type: 'basic' | 'more', gate: number, itemId: number) => {
    setMaterialChecks(prev => ({
      ...prev,
      [raidName]: {
        ...prev[raidName],
        basic: prev[raidName]?.basic || {},
        more: prev[raidName]?.more || {},
        [type]: {
          ...prev[raidName]?.[type],
          [gate]: {
            ...prev[raidName]?.[type]?.[gate],
            [itemId]: !isMaterialChecked(raidName, type, gate, itemId)
          }
        }
      }
    }));
  };

  // 은총의 파편 1개 가치 = 재련 상자 총 가치 ÷ 60
  const graceUnitPrice = useMemo(() => {
    const refineBox = [
      { itemId: 66102007, amount: 2000 },  // 파괴석 결정
      { itemId: 66102107, amount: 4000 },  // 수호석 결정
      { itemId: 66110226, amount: 60 },    // 위대한 돌파석
      { itemId: 66130143, amount: 22500 }, // 운명의 파편
    ];
    const boxValue = refineBox.reduce((sum, comp) => sum + (unitPrices[comp.itemId] || 0) * comp.amount, 0);
    return boxValue / 60;
  }, [unitPrices]);

  // 고통의 가시 1개 가치 = 고통의 재련 재료 상자 기댓값 ÷ 5
  // (운파 6000 / 위돌 3 / 파괴석 결정 100 / 수호석 결정 300, 25%×4)
  const thornUnitPrice = useMemo(() => {
    const refineRandomBox = [
      { itemId: 66130143, amount: 6000, probability: 0.25 },
      { itemId: 66110226, amount: 3,    probability: 0.25 },
      { itemId: 66102007, amount: 100,  probability: 0.25 },
      { itemId: 66102107, amount: 300,  probability: 0.25 },
    ];
    const expected = refineRandomBox.reduce((sum, c) => sum + (unitPrices[c.itemId] || 0) * c.amount * c.probability, 0);
    return expected / 5;
  }, [unitPrices]);

  // 가격 데이터를 기반으로 보상 계산 (메모이제이션)
  const rewardData = useMemo(() => {
    if (Object.keys(unitPrices).length === 0) {
      return [];
    }

    const targetRaids = ['성당 3단계', '성당 2단계', '세르카 나메', '세르카 하드'];
    const result: RewardData[] = [];

    targetRaids.forEach(raidName => {
      const raidInfo = raidMap.get(raidName);
      if (!raidInfo) return;

      const moreRewardData = raidRewards.filter(r => r.raidName === raidName);
      const basicRewardData = basicClearRewards[raidName];

      let totalClearGold = 0;
      let totalMoreGold = 0;
      let totalBasicMaterialValue = 0;
      let totalMoreMaterialValue = 0;

      const gates: GateData[] = raidInfo.gates.map(gateInfo => {
        // 기본 클리어 재료
        const basicGate = basicRewardData?.find(r => r.gate === gateInfo.gate);
        const basicMaterials: MaterialWithPrice[] = basicGate?.materials.map(mat => {
          const isGrace = mat.itemName === '은총의 파편';
          const isThorn = mat.itemName === '고통의 가시';
          const unitPrice = isGrace ? graceUnitPrice : isThorn ? thornUnitPrice : (unitPrices[mat.itemId] || 0);
          const totalPrice = (mat.itemId === 0 && !isGrace && !isThorn) ? 0 : unitPrice * mat.amount;
          return {
            itemId: mat.itemId,
            itemName: mat.itemName,
            amount: mat.amount,
            unitPrice,
            totalPrice: Math.round(totalPrice)
          };
        }) || [];

        // 더보기 재료
        const moreGate = moreRewardData.find(r => r.gate === gateInfo.gate);
        const moreMaterials: MaterialWithPrice[] = moreGate?.materials.map(mat => {
          const isGrace = mat.itemName === '은총의 파편';
          const isThorn = mat.itemName === '고통의 가시';
          const unitPrice = isGrace ? graceUnitPrice : isThorn ? thornUnitPrice : (unitPrices[mat.itemId] || 0);
          const totalPrice = (mat.itemId === 0 && !isGrace && !isThorn) ? 0 : unitPrice * mat.amount;
          return {
            itemId: mat.itemId,
            itemName: mat.itemName,
            amount: mat.amount,
            unitPrice,
            totalPrice: Math.round(totalPrice)
          };
        }) || [];

        const basicMaterialValue = basicMaterials.reduce((sum, m) => sum + m.totalPrice, 0);
        const moreMaterialValue = moreMaterials.reduce((sum, m) => sum + m.totalPrice, 0);

        totalClearGold += gateInfo.gold;
        totalMoreGold += gateInfo.moreGold;
        totalBasicMaterialValue += basicMaterialValue;
        totalMoreMaterialValue += moreMaterialValue;

        return {
          gate: gateInfo.gate,
          clearGold: gateInfo.gold,
          moreGold: gateInfo.moreGold,
          basicMaterials,
          basicMaterialValue,
          moreMaterials,
          moreMaterialValue
        };
      });

      result.push({
        raidName,
        level: raidInfo.level,
        image: raidInfo.image,
        gates,
        totalClearGold,
        totalMoreGold,
        totalBasicMaterialValue,
        totalMoreMaterialValue,
        finalValue: totalClearGold + totalBasicMaterialValue + totalMoreMaterialValue - totalMoreGold,
        disabled: false
      });
    });

    return result;
  }, [unitPrices, graceUnitPrice, thornUnitPrice]);

  // 체크된 재료만 계산한 관문별 기본 재료 가치
  const getCheckedBasicMaterialValue = (raidName: string, gate: GateData): number => {
    return gate.basicMaterials.reduce((sum, mat) => {
      const isChecked = isMaterialChecked(raidName, 'basic', gate.gate, mat.itemId);
      return sum + (isChecked ? mat.totalPrice : 0);
    }, 0);
  };

  // 체크된 재료만 계산한 관문별 더보기 재료 가치
  const getCheckedMoreMaterialValue = (raidName: string, gate: GateData): number => {
    return gate.moreMaterials.reduce((sum, mat) => {
      const isChecked = isMaterialChecked(raidName, 'more', gate.gate, mat.itemId);
      return sum + (isChecked ? mat.totalPrice : 0);
    }, 0);
  };

  // 체크 상태 반영한 총 가치 계산
  const getCalculatedFinalValue = (raidData: RewardData): number => {
    let totalBasic = 0;
    let totalMore = 0;
    raidData.gates.forEach(gate => {
      totalBasic += getCheckedBasicMaterialValue(raidData.raidName, gate);
      totalMore += getCheckedMoreMaterialValue(raidData.raidName, gate);
    });
    return raidData.totalClearGold + totalBasic + totalMore - raidData.totalMoreGold;
  };

  const handleRaidSelect = (raidName: string) => {
    setSelectedRaid(selectedRaid === raidName ? null : raidName);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">가격 정보를 불러오는 중...</p>
      </div>
    );
  }

  const selectedData = rewardData.find(r => r.raidName === selectedRaid);

  return (
    <div>
      {/* 레이드 카드 그리드 */}
      <div className={styles.raidCardsGrid}>
        {rewardData.map((raid, index) => {
          const isSelected = selectedRaid === raid.raidName;
          return (
            <div
              key={raid.raidName}
              className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => !raid.disabled && handleRaidSelect(raid.raidName)}
              style={raid.disabled ? { cursor: 'default', opacity: 0.7 } : undefined}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={raid.image}
                  alt={raid.raidName}
                  fill
                  className={styles.raidImage}
                  sizes="(max-width: 768px) 150px, 200px"
                  priority={index < 3}
                />
                <div className={styles.overlay} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.raidName}>{raid.raidName}</h3>
                <p className={styles.raidLevel}>Lv. {raid.level}</p>
                {raid.disabled ? (
                  <div className={styles.goldBadge} style={{ opacity: 0.6 }}>
                    준비중
                  </div>
                ) : (
                  <div className={styles.goldBadge}>
                    {getCalculatedFinalValue(raid).toLocaleString()}G
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 가격 갱신 정보 */}
      <div className="text-end mb-3">
        <small className="text-muted">
          {getTodayPriceDate()} | 실시간 시세와 차이가 있을 수 있습니다
        </small>
      </div>

      {/* 선택된 레이드 상세 정보 */}
      {selectedData && (
        <Card className={styles.detailCard}>
          <Card.Header
            className={styles.detailHeader}
            style={{
              background: `linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-accent) 100%)`,
              backgroundColor: 'var(--color-primary-dark)'
            }}
          >
            <span style={{
              color: 'var(--text-primary)',
              WebkitTextFillColor: 'var(--text-primary)'
            }}>
              {selectedData.raidName} 클리어 보상
            </span>
          </Card.Header>
          <Card.Body className={styles.detailBody}>

            {/* 기본 클리어 보상 (1관문, 2관문) */}
            <div className={styles.sectionTitle}>기본 클리어 보상</div>
            <div className={styles.gatesGrid}>
              {selectedData.gates.map((gate) => (
                <div key={`basic-${gate.gate}`} className={styles.gateSection}>
                  <div className={styles.gateHeader}>
                    <span className={styles.gateName}>{gate.gate}관문</span>
                  </div>

                  {/* 클리어 골드 */}
                  <div className={styles.goldRow}>
                    <div className={styles.goldLabel}>
                      <Image src="/gold.webp" alt="골드" width={18} height={18} />
                      <span>클리어 골드</span>
                    </div>
                    <div className={styles.goldValue}>
                      {gate.clearGold.toLocaleString()}
                    </div>
                  </div>

                  {/* 재료 테이블 */}
                  <Table size="sm" className={styles.materialTable}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>재료</th>
                        <th>수량</th>
                        <th>단가</th>
                        <th>총가치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gate.basicMaterials.map((mat, idx) => {
                        const isChecked = isMaterialChecked(selectedData.raidName, 'basic', gate.gate, mat.itemId);
                        return (
                        <tr key={idx} className={isChecked ? '' : styles.uncheckedRow}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleMaterialCheck(selectedData.raidName, 'basic', gate.gate, mat.itemId)}
                              className={styles.materialCheckbox}
                            />
                          </td>
                          <td>
                            <div className={styles.materialCell}>
                              <Image
                                src={`/${getMaterialImage(mat.itemName)}`}
                                alt={mat.itemName}
                                width={22}
                                height={22}
                              />
                              <span>{mat.itemName}</span>
                            </div>
                          </td>
                          <td>{mat.amount > 0 ? mat.amount.toLocaleString() : '-'}</td>
                          <td>
                            {mat.itemId === 0 && mat.itemName !== '은총의 파편' && mat.itemName !== '고통의 가시' ? '-' :
                              (mat.unitPrice >= 1 ? mat.unitPrice.toFixed(2) : mat.unitPrice.toFixed(4))}
                          </td>
                          <td>
                            {mat.itemId === 0 && mat.itemName !== '은총의 파편' && mat.itemName !== '고통의 가시' ? '-' : mat.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={styles.subtotalRow}>
                        <td colSpan={4}>재료 가치</td>
                        <td>{getCheckedBasicMaterialValue(selectedData.raidName, gate).toLocaleString()}</td>
                      </tr>
                      <tr className={styles.gateTotalRow}>
                        <td colSpan={4}><strong>{gate.gate}관문 합계</strong></td>
                        <td>
                          <strong>{(gate.clearGold + getCheckedBasicMaterialValue(selectedData.raidName, gate)).toLocaleString()}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              ))}
            </div>

            {/* 더보기 보상 (1관문, 2관문) */}
            {selectedData.gates.some(g => g.moreMaterials.length > 0) && (
              <>
                <div className={styles.sectionTitle}>더보기 보상</div>
                <div className={styles.gatesGrid}>
                  {selectedData.gates.map((gate) => (
                    <div key={`more-${gate.gate}`} className={`${styles.gateSection} ${styles.moreSection}`}>
                      <div className={styles.gateHeader}>
                        <span className={styles.gateName}>{gate.gate}관문 더보기</span>
                      </div>

                      {/* 더보기 비용 */}
                      <div className={`${styles.goldRow} ${styles.costRow}`}>
                        <div className={styles.goldLabel}>
                          <Image src="/gold.webp" alt="골드" width={18} height={18} />
                          <span>더보기 비용</span>
                        </div>
                        <div className={styles.costValue}>
                          -{gate.moreGold.toLocaleString()}
                        </div>
                      </div>

                      {/* 재료 테이블 */}
                      {gate.moreMaterials.length > 0 ? (
                        <Table size="sm" className={styles.materialTable}>
                          <thead>
                            <tr>
                              <th></th>
                              <th>재료</th>
                              <th>수량</th>
                              <th>단가</th>
                              <th>총가치</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gate.moreMaterials.map((mat, idx) => {
                              const isChecked = isMaterialChecked(selectedData.raidName, 'more', gate.gate, mat.itemId);
                              return (
                              <tr key={idx} className={isChecked ? '' : styles.uncheckedRow}>
                                <td>
                                  <Form.Check
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleMaterialCheck(selectedData.raidName, 'more', gate.gate, mat.itemId)}
                                    className={styles.materialCheckbox}
                                  />
                                </td>
                                <td>
                                  <div className={styles.materialCell}>
                                    <Image
                                      src={`/${getMaterialImage(mat.itemName)}`}
                                      alt={mat.itemName}
                                      width={22}
                                      height={22}
                                    />
                                    <span>{mat.itemName}</span>
                                  </div>
                                </td>
                                <td>{mat.amount > 0 ? mat.amount.toLocaleString() : '-'}</td>
                                <td>
                                  {mat.itemId === 0 && mat.itemName !== '은총의 파편' && mat.itemName !== '고통의 가시' ? '-' :
                                    (mat.unitPrice >= 1 ? mat.unitPrice.toFixed(2) : mat.unitPrice.toFixed(4))}
                                </td>
                                <td>
                                  {mat.itemId === 0 && mat.itemName !== '은총의 파편' && mat.itemName !== '고통의 가시' ? '-' : mat.totalPrice.toLocaleString()}
                                </td>
                              </tr>
                            );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className={styles.subtotalRow}>
                              <td colSpan={4}>재료 가치</td>
                              <td>{getCheckedMoreMaterialValue(selectedData.raidName, gate).toLocaleString()}</td>
                            </tr>
                            <tr className={styles.gateTotalRow}>
                              <td colSpan={4}><strong>더보기 손익</strong></td>
                              <td>
                                <strong className={getCheckedMoreMaterialValue(selectedData.raidName, gate) - gate.moreGold >= 0 ? styles.profit : styles.loss}>
                                  {(getCheckedMoreMaterialValue(selectedData.raidName, gate) - gate.moreGold) >= 0 ? '+' : ''}
                                  {(getCheckedMoreMaterialValue(selectedData.raidName, gate) - gate.moreGold).toLocaleString()}
                                </strong>
                              </td>
                            </tr>
                          </tfoot>
                        </Table>
                      ) : (
                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.85rem' }}>
                          재료 정보 업데이트 예정
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 최종 합계 */}
            {(() => {
              const totalCheckedBasic = selectedData.gates.reduce((sum, gate) =>
                sum + getCheckedBasicMaterialValue(selectedData.raidName, gate), 0);
              const totalCheckedMore = selectedData.gates.reduce((sum, gate) =>
                sum + getCheckedMoreMaterialValue(selectedData.raidName, gate), 0);
              const calculatedFinal = selectedData.totalClearGold + totalCheckedBasic + totalCheckedMore - selectedData.totalMoreGold;

              return (
              <div className={styles.finalSection}>
                <div className={styles.finalTitle}>더보기 포함 총 가치</div>
                <div className={styles.finalGrid}>
                  <div className={styles.finalGridItem}>
                    <div className={styles.finalLabel}>클리어 골드</div>
                    <div className={styles.finalItemValue}>{selectedData.totalClearGold.toLocaleString()}</div>
                  </div>
                  <div className={styles.finalGridItem}>
                    <div className={styles.finalLabel}>기본 재료 가치</div>
                    <div className={styles.finalItemValue}>+{totalCheckedBasic.toLocaleString()}</div>
                  </div>
                  <div className={styles.finalGridItem}>
                    <div className={styles.finalLabel}>더보기 재료 가치</div>
                    <div className={styles.finalItemValue}>+{totalCheckedMore.toLocaleString()}</div>
                  </div>
                  <div className={styles.finalGridItem}>
                    <div className={styles.finalLabel}>더보기 비용</div>
                    <div className={`${styles.finalItemValue} ${styles.calcCost}`}>-{selectedData.totalMoreGold.toLocaleString()}</div>
                  </div>
                  <div className={`${styles.finalGridItem} ${styles.finalTotalItem}`}>
                    <div className={styles.finalLabel}>총 가치</div>
                    <div className={styles.finalValueWrapper}>
                      <Image src="/gold.webp" alt="골드" width={24} height={24} />
                      <span className={styles.finalValue}>{calculatedFinal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}

          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default CerkaRewardInfo;
