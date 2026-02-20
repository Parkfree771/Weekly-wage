'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Row, Col, Spinner } from 'react-bootstrap';
import { raids } from '@/data/raids';
import { raidClearRewards } from '@/data/raidClearRewards';
import { raidRewards, MATERIAL_IDS } from '@/data/raidRewards';
import { usePriceData } from '@/contexts/PriceContext';
import styles from './MaterialSummary.module.css';

type Character = {
  characterName: string;
  itemLevel: number;
};

type GateSelection = {
  [key: string]: {
    [key: string]: {
      [key: string]: 'none' | 'withMore' | 'withoutMore';
    };
  };
};

type MaterialSummaryProps = {
  selectedCharacters: Character[];
  gateSelection: GateSelection;
  characterGold: { [char: string]: number };
};

type AggregatedMaterial = {
  itemId: number;
  itemName: string;
  amount: number;
  hasMore: boolean;
};

// 재료 이미지 매핑
const getMaterialImage = (itemName: string): string => {
  const imageMap: { [key: string]: string } = {
    '운명의 파괴석': 'destiny-destruction-stone5.webp',
    '운명의 수호석': 'destiny-guardian-stone5.webp',
    '운명의 파편': 'destiny-shard-bag-large5.webp',
    '운명의 돌파석': 'destiny-breakthrough-stone5.webp',
    '운명의 파괴석 결정': 'top-destiny-destruction-stone5.webp',
    '운명의 수호석 결정': 'top-destiny-guardian-stone5.webp',
    '위대한 운명의 돌파석': 'top-destiny-breakthrough-stone5.webp',
  };
  return imageMap[itemName] || 'default-material.webp';
};

// 재료 표시 순서
const MATERIAL_ORDER = [
  MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL,
  MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL,
  MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE,
  MATERIAL_IDS.FATE_DESTRUCTION_STONE,
  MATERIAL_IDS.FATE_GUARDIAN_STONE,
  MATERIAL_IDS.FATE_BREAKTHROUGH_STONE,
  MATERIAL_IDS.FATE_FRAGMENT,
];

export default function MaterialSummary({ selectedCharacters, gateSelection, characterGold }: MaterialSummaryProps) {
  const { unitPrices, loading } = usePriceData();

  // 캐릭터별 재료 합산 계산
  const characterMaterials = useMemo(() => {
    const result: {
      [charName: string]: {
        materials: AggregatedMaterial[];
        totalMaterialValue: number;
        rawGold: number;
        moreCost: number;
        netGold: number;
        grandTotal: number;
        hasMore: boolean;
      };
    } = {};

    for (const character of selectedCharacters) {
      const charName = character.characterName;
      const charSelection = gateSelection[charName];
      if (!charSelection) continue;

      const materialMap: { [itemId: number]: { itemName: string; amount: number; hasMore: boolean } } = {};
      let rawGold = 0;
      let moreCost = 0;
      let hasMore = false;

      for (const raidName in charSelection) {
        for (const gate in charSelection[raidName]) {
          const selection = charSelection[raidName][gate];
          if (selection === 'none') continue;

          const gateNum = parseInt(gate);

          // 골드 계산: 원래 클리어 골드와 더보기 비용 분리
          const raid = raids.find(r => r.name === raidName);
          if (raid) {
            const gateInfo = raid.gates.find(g => g.gate === gateNum);
            if (gateInfo) {
              rawGold += gateInfo.gold;
              if (selection === 'withoutMore') {
                moreCost += gateInfo.moreGold;
                hasMore = true;
              }
            }
          }

          // 1. 클리어 보상 (항상 포함)
          const clearReward = raidClearRewards.find(
            r => r.raidName === raidName && r.gate === gateNum
          );
          if (clearReward) {
            for (const mat of clearReward.materials) {
              if (mat.itemId === 0) continue;
              if (!materialMap[mat.itemId]) {
                materialMap[mat.itemId] = { itemName: mat.itemName, amount: 0, hasMore: false };
              }
              materialMap[mat.itemId].amount += mat.amount;
            }
          }

          // 2. 더보기 보상 (withoutMore 선택 시만)
          if (selection === 'withoutMore') {
            const moreReward = raidRewards.find(
              r => r.raidName === raidName && r.gate === gateNum
            );
            if (moreReward) {
              for (const mat of moreReward.materials) {
                if (mat.itemId === 0) continue;
                if (!materialMap[mat.itemId]) {
                  materialMap[mat.itemId] = { itemName: mat.itemName, amount: 0, hasMore: false };
                }
                materialMap[mat.itemId].amount += mat.amount;
                materialMap[mat.itemId].hasMore = true;
              }
            }
          }
        }
      }

      const materials: AggregatedMaterial[] = MATERIAL_ORDER
        .filter(id => materialMap[id])
        .map(id => ({
          itemId: id,
          itemName: materialMap[id].itemName,
          amount: materialMap[id].amount,
          hasMore: materialMap[id].hasMore,
        }));

      let totalMaterialValue = 0;
      for (const mat of materials) {
        const price = unitPrices[mat.itemId] || 0;
        totalMaterialValue += price * mat.amount;
      }
      totalMaterialValue = Math.round(totalMaterialValue);

      const netGold = rawGold - moreCost;

      result[charName] = {
        materials,
        totalMaterialValue,
        rawGold,
        moreCost,
        netGold,
        grandTotal: netGold + totalMaterialValue,
        hasMore,
      };
    }

    return result;
  }, [selectedCharacters, gateSelection, characterGold, unitPrices]);

  // 전체 합산
  const grandTotals = useMemo(() => {
    let totalRawGold = 0;
    let totalMoreCost = 0;
    let totalMaterial = 0;
    for (const charName in characterMaterials) {
      totalRawGold += characterMaterials[charName].rawGold;
      totalMoreCost += characterMaterials[charName].moreCost;
      totalMaterial += characterMaterials[charName].totalMaterialValue;
    }
    const totalNetGold = totalRawGold - totalMoreCost;
    return {
      totalRawGold,
      totalMoreCost,
      totalNetGold,
      totalMaterial,
      grandTotal: totalNetGold + totalMaterial,
    };
  }, [characterMaterials]);

  const hasAnyMaterials = Object.values(characterMaterials).some(
    c => c.materials.length > 0
  );
  if (!hasAnyMaterials) return null;

  if (loading || Object.keys(unitPrices).length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Spinner animation="border" size="sm" className="me-2" />
          재료 시세를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 캐릭터별 가로 한줄 배치 */}
      <Row className="align-items-stretch g-2">
        {selectedCharacters.map(character => {
          const data = characterMaterials[character.characterName];
          if (!data || data.materials.length === 0) return null;

          return (
            <Col lg={2} md={4} sm={6} key={character.characterName}>
              <div className={styles.characterCard}>
                {/* 캐릭터 헤더 */}
                <div className={styles.charHeader}>
                  <span className={styles.charName}>{character.characterName}</span>
                  <span className={styles.charLevel}>Lv.{character.itemLevel}</span>
                  {data.hasMore && <span className={styles.moreBadge}>더보기</span>}
                </div>

                {/* 재료 목록 */}
                <div className={styles.materialsList}>
                  {data.materials.map(mat => {
                    const price = unitPrices[mat.itemId] || 0;
                    const totalValue = Math.round(price * mat.amount);
                    return (
                      <div key={mat.itemId} className={styles.materialRow}>
                        <Image
                          src={`/${getMaterialImage(mat.itemName)}`}
                          alt={mat.itemName}
                          width={26}
                          height={26}
                          className={styles.matIcon}
                        />
                        <span className={styles.matOp}>×</span>
                        <span className={styles.matAmount}>{mat.amount.toLocaleString()}</span>
                        <span className={styles.matOp}>×</span>
                        <span className={styles.matPrice}>{price.toFixed(2)}</span>
                        <span className={styles.matEquals}>=</span>
                        <span className={styles.matValue}>
                          {totalValue.toLocaleString()}
                          <Image src="/gold.webp" alt="골드" width={14} height={14} style={{ borderRadius: '2px', marginLeft: '2px' }} />
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 캐릭터 합산 */}
                <div className={styles.charTotal}>
                  <div className={styles.charTotalLine}>
                    <span className={styles.charTotalGold}>
                      <Image src="/gold.webp" alt="골드" width={12} height={12} style={{ borderRadius: '2px' }} />
                      {data.rawGold.toLocaleString()}
                    </span>
                    {data.moreCost > 0 && (
                      <>
                        <span className={styles.charTotalOp}>-</span>
                        <span className={styles.charTotalMoreCost}>{data.moreCost.toLocaleString()}</span>
                      </>
                    )}
                    <span className={styles.charTotalOp}>+</span>
                    <span className={styles.charTotalMaterial}>{data.totalMaterialValue.toLocaleString()}</span>
                  </div>
                  <div className={styles.charTotalResult}>
                    = {data.grandTotal.toLocaleString()}
                    <Image src="/gold.webp" alt="골드" width={14} height={14} style={{ borderRadius: '2px', marginLeft: '3px' }} />
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* 전체 합산 */}
      <div className={styles.grandTotalBox}>
        <div className={styles.grandTotalRow}>
          <span className={styles.grandTotalItem}>
            <Image src="/gold.webp" alt="골드" width={16} height={16} style={{ borderRadius: '3px' }} />
            <span className={styles.grandTotalLabel}>클리어 골드</span>
            <span className={styles.grandTotalValue}>{grandTotals.totalRawGold.toLocaleString()}</span>
          </span>
          {grandTotals.totalMoreCost > 0 && (
            <>
              <span className={styles.grandTotalOp}>-</span>
              <span className={styles.grandTotalItem}>
                <span className={styles.grandTotalLabel}>더보기</span>
                <span className={styles.grandTotalMoreCost}>{grandTotals.totalMoreCost.toLocaleString()}</span>
              </span>
            </>
          )}
          <span className={styles.grandTotalOp}>+</span>
          <span className={styles.grandTotalItem}>
            <span className={styles.grandTotalLabel}>재료 가치</span>
            <span className={styles.grandTotalMaterial}>{grandTotals.totalMaterial.toLocaleString()}</span>
          </span>
        </div>
        <div className={styles.grandTotalFinalRow}>
          <span className={styles.grandTotalFinalLabel}>총 합산 가치</span>
          <span className={styles.grandTotalFinal}>
            {grandTotals.grandTotal.toLocaleString()}
            <Image src="/gold.webp" alt="골드" width={20} height={20} style={{ borderRadius: '3px', marginLeft: '4px' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
