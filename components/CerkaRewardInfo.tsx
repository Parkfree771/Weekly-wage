'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, Table, Spinner } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidRewards, MATERIAL_IDS, MATERIAL_BUNDLE_SIZES } from '@/data/raidRewards';
import { fetchPriceData } from '@/lib/price-history-client';
import styles from './CerkaRewardInfo.module.css';

// 재료 이미지 매핑
const getMaterialImage = (itemName: string): string => {
  const imageMap: { [key: string]: string } = {
    '운명의 파괴석 결정': 'destiny-destruction-stone2.webp',
    '운명의 수호석 결정': 'destiny-guardian-stone2.webp',
    '위대한 운명의 돌파석': 'destiny-breakthrough-stone2.webp',
    '운명의 파편': 'destiny-shard-bag-large.webp',
    '코어': 'cerka-core.webp',
    '고통의 가시': 'pulsating-thorn.webp',
  };
  return imageMap[itemName] || 'default-material.webp';
};

// 기본 클리어 보상 데이터
const basicClearRewards = {
  '세르카 나이트메어': [
    {
      gate: 1,
      materials: [
        { itemId: 66102007, itemName: '운명의 파괴석 결정', amount: 405 },
        { itemId: 66102107, itemName: '운명의 수호석 결정', amount: 810 },
        { itemId: 66110226, itemName: '위대한 운명의 돌파석', amount: 8 },
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

type CerkaData = {
  raidName: string;
  level: number;
  image: string;
  gates: GateData[];
  totalClearGold: number;
  totalMoreGold: number;
  totalBasicMaterialValue: number;
  totalMoreMaterialValue: number;
  finalValue: number; // 클골 + 기본재료 + 더보기재료 - 더보기비용
};

const CerkaRewardInfo: React.FC = () => {
  const [cerkaData, setCerkaData] = useState<CerkaData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedRaid, setSelectedRaid] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestPrices();
  }, []);

  const fetchLatestPrices = async () => {
    setLoading(true);
    try {
      const { latest } = await fetchPriceData();

      const unitPrices: { [itemId: number]: number } = {};
      Object.entries(MATERIAL_IDS).forEach(([, itemId]) => {
        const bundlePrice = latest[String(itemId)] || 0;
        const bundleSize = MATERIAL_BUNDLE_SIZES[itemId] || 1;
        unitPrices[itemId] = bundlePrice / bundleSize;
      });

      const targetRaids = ['세르카 나이트메어', '세르카 하드'];
      const result: CerkaData[] = [];

      targetRaids.forEach(raidName => {
        const raidInfo = raids.find(r => r.name === raidName);
        if (!raidInfo) return;

        const moreRewardData = raidRewards.filter(r => r.raidName === raidName);
        const basicRewardData = basicClearRewards[raidName as keyof typeof basicClearRewards];

        let totalClearGold = 0;
        let totalMoreGold = 0;
        let totalBasicMaterialValue = 0;
        let totalMoreMaterialValue = 0;

        const gates: GateData[] = raidInfo.gates.map(gateInfo => {
          // 기본 클리어 재료
          const basicGate = basicRewardData?.find(r => r.gate === gateInfo.gate);
          const basicMaterials: MaterialWithPrice[] = basicGate?.materials.map(mat => {
            const unitPrice = unitPrices[mat.itemId] || 0;
            const totalPrice = mat.itemId === 0 ? 0 : unitPrice * mat.amount;
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
            const unitPrice = unitPrices[mat.itemId] || 0;
            const totalPrice = mat.itemId === 0 ? 0 : unitPrice * mat.amount;
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
          finalValue: totalClearGold + totalBasicMaterialValue + totalMoreMaterialValue - totalMoreGold
        });
      });

      setCerkaData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setLoading(false);
    }
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

  const selectedData = cerkaData.find(r => r.raidName === selectedRaid);

  return (
    <div>
      {/* 레이드 카드 그리드 */}
      <div className={styles.raidCardsGrid}>
        {cerkaData.map((raid) => {
          const isSelected = selectedRaid === raid.raidName;
          return (
            <div
              key={raid.raidName}
              className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleRaidSelect(raid.raidName)}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={raid.image}
                  alt={raid.raidName}
                  fill
                  className={styles.raidImage}
                  sizes="(max-width: 768px) 150px, 200px"
                />
                <div className={styles.overlay} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.raidName}>{raid.raidName}</h3>
                <p className={styles.raidLevel}>Lv. {raid.level}</p>
                <div className={styles.goldBadge}>
                  {raid.finalValue.toLocaleString()}G
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 가격 갱신 정보 */}
      <div className="text-end mb-3">
        <small className="text-muted">
          {lastUpdated ? (
            <>
              {lastUpdated.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })} 기준 가격
            </>
          ) : '가격 정보를 불러오는 중...'}
        </small>
      </div>

      {/* 선택된 레이드 상세 정보 */}
      {selectedData && (
        <Card className={styles.detailCard}>
          <Card.Header className={styles.detailHeader}>
            {selectedData.raidName} 클리어 보상
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
                        <th>재료</th>
                        <th>수량</th>
                        <th>단가</th>
                        <th>총가치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gate.basicMaterials.map((mat, idx) => (
                        <tr key={idx}>
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
                          <td>{mat.amount.toLocaleString()}</td>
                          <td>
                            {mat.itemId === 0 ? '-' :
                              (mat.unitPrice >= 1 ? mat.unitPrice.toFixed(2) : mat.unitPrice.toFixed(4))}
                          </td>
                          <td>
                            {mat.itemId === 0 ? '-' : mat.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.subtotalRow}>
                        <td colSpan={3}>재료 가치</td>
                        <td>{gate.basicMaterialValue.toLocaleString()}</td>
                      </tr>
                      <tr className={styles.gateTotalRow}>
                        <td colSpan={3}><strong>{gate.gate}관문 합계</strong></td>
                        <td>
                          <strong>{(gate.clearGold + gate.basicMaterialValue).toLocaleString()}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              ))}
            </div>

            {/* 더보기 보상 (1관문, 2관문) */}
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
                  <Table size="sm" className={styles.materialTable}>
                    <thead>
                      <tr>
                        <th>재료</th>
                        <th>수량</th>
                        <th>단가</th>
                        <th>총가치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gate.moreMaterials.map((mat, idx) => (
                        <tr key={idx}>
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
                          <td>{mat.amount.toLocaleString()}</td>
                          <td>
                            {mat.itemId === 0 ? '-' :
                              (mat.unitPrice >= 1 ? mat.unitPrice.toFixed(2) : mat.unitPrice.toFixed(4))}
                          </td>
                          <td>
                            {mat.itemId === 0 ? '-' : mat.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.subtotalRow}>
                        <td colSpan={3}>재료 가치</td>
                        <td>{gate.moreMaterialValue.toLocaleString()}</td>
                      </tr>
                      <tr className={styles.gateTotalRow}>
                        <td colSpan={3}><strong>더보기 손익</strong></td>
                        <td>
                          <strong className={gate.moreMaterialValue - gate.moreGold >= 0 ? styles.profit : styles.loss}>
                            {(gate.moreMaterialValue - gate.moreGold) >= 0 ? '+' : ''}
                            {(gate.moreMaterialValue - gate.moreGold).toLocaleString()}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              ))}
            </div>

            {/* 최종 합계 */}
            <div className={styles.finalSection}>
              <div className={styles.finalTitle}>더보기 포함 총 가치</div>
              <div className={styles.finalGrid}>
                <div className={styles.finalGridItem}>
                  <div className={styles.finalLabel}>클리어 골드</div>
                  <div className={styles.finalItemValue}>{selectedData.totalClearGold.toLocaleString()}</div>
                </div>
                <div className={styles.finalGridItem}>
                  <div className={styles.finalLabel}>기본 재료 가치</div>
                  <div className={styles.finalItemValue}>+{selectedData.totalBasicMaterialValue.toLocaleString()}</div>
                </div>
                <div className={styles.finalGridItem}>
                  <div className={styles.finalLabel}>더보기 재료 가치</div>
                  <div className={styles.finalItemValue}>+{selectedData.totalMoreMaterialValue.toLocaleString()}</div>
                </div>
                <div className={styles.finalGridItem}>
                  <div className={styles.finalLabel}>더보기 비용</div>
                  <div className={`${styles.finalItemValue} ${styles.calcCost}`}>-{selectedData.totalMoreGold.toLocaleString()}</div>
                </div>
                <div className={`${styles.finalGridItem} ${styles.finalTotalItem}`}>
                  <div className={styles.finalLabel}>총 가치</div>
                  <div className={styles.finalValueWrapper}>
                    <Image src="/gold.webp" alt="골드" width={24} height={24} />
                    <span className={styles.finalValue}>{selectedData.finalValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default CerkaRewardInfo;
