'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import styles from './belgardin.module.css';

// 재료 이미지 매핑
const MATERIAL_IMAGES: { [key: string]: string } = {
  '운명의 파괴석 결정': '/destiny-destruction-stone2.webp',
  '운명의 수호석 결정': '/destiny-guardian-stone2.webp',
  '위대한 운명의 돌파석': '/destiny-breakthrough-stone2.webp',
  '운명의 파편': '/destiny-shard-bag-large.webp',
  '코어': '/cerka-core2.webp',
};

// 묶음 단위 (개당 가격 = 시세 / bundleSize)
const BUNDLE_SIZES: { [key: string]: number } = {
  '66102007': 100,  // 파괴석 결정
  '66102107': 100,  // 수호석 결정
  '66110226': 1,    // 위대한 돌파석
  '66130143': 3000, // 운명의 파편 주머니(대) = 3000파편
};

type Material = {
  name: string;
  itemId: string; // 가격 조회용 (0이면 거래 불가)
  amount: number;
};

type Gate = {
  gate: number;
  gold: number;
  moreGold: number;
  materials: Material[];
  moreMaterials: Material[];
};

// ─── 벨가르딘 단계별 보상 데이터 ───
// 클리어 골드·더보기 비용: data/raids.ts 기준. 코어 수량은 미확정(0).
// TODO: 코어 수량 확정되면 amount 채우기
const STAGES: {
  name: string;
  level: number;
  image: string;
  gates: Gate[];
}[] = [
  {
    name: '벨가르딘 나이트메어', level: 1780, image: '/belgardin2.webp',
    gates: [
      { gate: 1, gold: 30000, moreGold: 9600,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
      },
      { gate: 2, gold: 45000, moreGold: 14400,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
      },
    ],
  },
  {
    name: '벨가르딘 하드', level: 1770, image: '/belgardin2.webp',
    gates: [
      { gate: 1, gold: 25000, moreGold: 8000,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
      },
      { gate: 2, gold: 37000, moreGold: 11840,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
      },
    ],
  },
  {
    name: '벨가르딘 노말', level: 1750, image: '/belgardin2.webp',
    gates: [
      { gate: 1, gold: 20000, moreGold: 6400,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
      },
      { gate: 2, gold: 30000, moreGold: 9600,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '코어', itemId: '0', amount: 0 },
        ],
      },
    ],
  },
];

// 테마 색상 매핑
const THEME_COLORS: { [key: string]: { name: string; accent: string; bg: string; border: string; iconBg: string } } = {
  ancient:   { name: 'var(--text-primary)', accent: '#b89d6a', bg: 'rgba(201, 168, 76, 0.06)', border: 'rgba(184, 157, 106, 0.25)', iconBg: 'rgba(201, 168, 76, 0.08)' },
  relic:     { name: 'var(--text-primary)', accent: '#b85c1e', bg: 'rgba(184, 92, 30, 0.06)', border: 'rgba(184, 92, 30, 0.2)', iconBg: 'rgba(184, 92, 30, 0.06)' },
};

// ─── 벨가르딘 상점 데이터 (정보 미확정 — 비워둠) ───
// TODO: 상점 교환 목록 확정되면 채우기
type ShopItem = {
  id: number;
  name: string;
  qty: number;
  requiredLevel: number;
  image: string;
  theme: string;
  hasBg: boolean;
  costs: { name: string; amount: number }[];
  limit: string;
  limitType: 'once' | 'unlimited';
};
const SHOP_ITEMS: ShopItem[] = [];

export default function BelgardinPage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedShopItem, setSelectedShopItem] = useState<number | null>(null);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [materialChecks, setMaterialChecks] = useState<Record<string, Record<string, Record<string, boolean>>>>({});

  const selectedStageData = STAGES.find(s => s.name === selectedStage);

  // 가격 계산 헬퍼
  const getUnitPrice = (itemId: string) => {
    if (itemId === '0') return 0;
    const bundlePrice = latestPrices[itemId] || 0;
    const bundleSize = BUNDLE_SIZES[itemId] || 1;
    return bundlePrice / bundleSize;
  };

  const getMaterialValue = (mat: Material) => {
    if (mat.itemId === '0' || mat.amount === 0) return 0;
    return Math.round(getUnitPrice(mat.itemId) * mat.amount);
  };

  // 체크 상태 확인 (기본 true)
  const isChecked = (stage: string, type: string, gate: number, itemId: string) =>
    materialChecks[stage]?.[type]?.[`${gate}-${itemId}`] ?? true;

  const toggleCheck = (stage: string, type: string, gate: number, itemId: string) => {
    setMaterialChecks(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [type]: {
          ...prev[stage]?.[type],
          [`${gate}-${itemId}`]: !isChecked(stage, type, gate, itemId),
        },
      },
    }));
  };
  const selectedShopData = SHOP_ITEMS.find(s => s.id === selectedShopItem);

  // 시세 조회 (latest만, history 다운로드 안 함)
  useEffect(() => {
    (async () => {
      try {
        const { fetchLatestPrices } = await import('@/lib/price-history-client');
        const latest = await fetchLatestPrices();
        setLatestPrices(latest);
      } catch (e) {
        console.error('Failed to fetch prices:', e);
      } finally {
        setPriceLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>
            {/* 타이틀 */}
            <div className="text-center mb-2">
              <h1 style={{
                fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: 0,
                marginBottom: '0.5rem'
              }}>
                벨가르딘
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                벨가르딘 난이도별 클리어 보상과 상점
              </p>
            </div>

            {/* 3개 단계 이미지 카드 */}
            <div className={styles.raidCardsGrid}>
              {STAGES.map((stage, index) => {
                const isSelected = selectedStage === stage.name;
                const totalGold = stage.gates.reduce((sum, g) => sum + g.gold, 0);
                const totalBasicValueCard = stage.gates.reduce((sum, g) =>
                  sum + g.materials.reduce((s, m) => s + getMaterialValue(m), 0), 0);
                const cardFinalValue = totalGold + totalBasicValueCard;
                const totalCore = stage.gates.reduce((sum, g) => {
                  const core = g.materials.find(m => m.name === '코어');
                  return sum + (core?.amount || 0);
                }, 0);
                return (
                  <div
                    key={stage.name}
                    className={`${styles.raidCard} ${isSelected ? styles.selected : ''}`}
                    onClick={() => setSelectedStage(isSelected ? null : stage.name)}
                  >
                    <div className={styles.imageWrapper}>
                      <Image
                        src={stage.image}
                        alt={stage.name}
                        fill
                        className={styles.raidImage}
                        sizes="(max-width: 768px) 170px, 200px"
                        priority={index < 3}
                      />
                      <div className={styles.overlay} />
                    </div>
                    <div className={styles.cardContent}>
                      <h3 className={styles.raidName}>{stage.name}</h3>
                      <p className={styles.raidLevel}>Lv. {stage.level}</p>
                      <div className={styles.goldBadge}>
                        {priceLoading ? `${totalGold.toLocaleString()}G` : `${cardFinalValue.toLocaleString()}G`}
                      </div>
                      <div className={styles.graceBadge}>코어 {totalCore}개</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택한 단계 상세 */}
            {selectedStageData && (() => {
              const sn = selectedStageData.name;
              const getCheckedValue = (mats: Material[], type: string, gate: number) =>
                mats.reduce((s, m) => s + (isChecked(sn, type, gate, m.itemId) ? getMaterialValue(m) : 0), 0);

              const totalClearGold = selectedStageData.gates.reduce((s, g) => s + g.gold, 0);
              const totalMoreGold = selectedStageData.gates.reduce((s, g) => s + g.moreGold, 0);
              const totalBasicValue = selectedStageData.gates.reduce((s, g) => s + getCheckedValue(g.materials, 'basic', g.gate), 0);
              const totalMoreValue = selectedStageData.gates.reduce((s, g) => s + getCheckedValue(g.moreMaterials, 'more', g.gate), 0);
              const finalValue = totalClearGold + totalBasicValue + totalMoreValue - totalMoreGold;

              const renderMaterialTable = (mats: Material[], type: string, gate: number) => (
                <table className={styles.materialTable}>
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
                    {mats.map((mat, idx) => {
                      const checked = isChecked(sn, type, gate, mat.itemId);
                      const unitPrice = getUnitPrice(mat.itemId);
                      const totalPrice = getMaterialValue(mat);
                      return (
                      <tr key={idx} style={!checked ? { opacity: 0.4 } : undefined}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCheck(sn, type, gate, mat.itemId)}
                            className={styles.materialCheckbox}
                          />
                        </td>
                        <td>
                          <div className={styles.materialCell}>
                            {MATERIAL_IMAGES[mat.name] && (
                              <Image src={MATERIAL_IMAGES[mat.name]} alt={mat.name} width={22} height={22} />
                            )}
                            <span>{mat.name}</span>
                          </div>
                        </td>
                        <td>{mat.amount > 0 ? mat.amount.toLocaleString() : '미정'}</td>
                        <td>{mat.itemId === '0' ? '-' : priceLoading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)}</td>
                        <td>{mat.itemId === '0' || mat.amount === 0 ? '-' : priceLoading ? '—' : totalPrice.toLocaleString()}</td>
                      </tr>
                      );
                    })}
                    {mats.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.75rem' }}>미정</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className={styles.subtotalRow}>
                      <td colSpan={4}>재료 가치</td>
                      <td>{priceLoading ? '—' : getCheckedValue(mats, type, gate).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              );

              return (
              <div className={styles.rewardWide}>
              <Card className={styles.detailCard}>
                <Card.Header className={styles.detailHeader}>
                  {selectedStageData.name} 클리어 보상
                </Card.Header>
                <Card.Body className={styles.detailBody}>
                  {/* 기본 클리어 보상 */}
                  <div className={styles.sectionTitle}>기본 클리어 보상</div>
                  <div className={styles.gatesGrid}>
                    {selectedStageData.gates.map((gate) => (
                      <div key={`basic-${gate.gate}`} className={styles.gateSection}>
                        <div className={styles.gateHeader}>
                          <span className={styles.gateName}>{gate.gate}관문</span>
                        </div>
                        <div className={`${styles.infoRow} ${styles.goldRow}`}>
                          <div className={styles.infoLabel}>
                            <Image src="/gold.webp" alt="골드" width={18} height={18} />
                            <span>클리어 골드</span>
                          </div>
                          <div className={styles.goldValue}>{gate.gold > 0 ? gate.gold.toLocaleString() : '미정'}</div>
                        </div>
                        {renderMaterialTable(gate.materials, 'basic', gate.gate)}
                        <div className={styles.gateTotalRow} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.5rem 0', fontWeight: 700 }}>
                          <span>{gate.gate}관문 합계</span>
                          <span>{(gate.gold + getCheckedValue(gate.materials, 'basic', gate.gate)).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 더보기 보상 */}
                  <div className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>더보기 보상</div>
                  <div className={styles.gatesGrid}>
                    {selectedStageData.gates.map((gate) => {
                      const moreValue = getCheckedValue(gate.moreMaterials, 'more', gate.gate);
                      const profit = moreValue - gate.moreGold;
                      return (
                      <div key={`more-${gate.gate}`} className={styles.gateSection}>
                        <div className={styles.gateHeader}>
                          <span className={styles.gateName}>{gate.gate}관문 더보기</span>
                        </div>
                        <div className={`${styles.infoRow} ${styles.costRow}`}>
                          <div className={styles.infoLabel}>
                            <Image src="/gold.webp" alt="골드" width={18} height={18} />
                            <span>더보기 비용</span>
                          </div>
                          <div className={styles.costValue}>{gate.moreGold > 0 ? `-${gate.moreGold.toLocaleString()}` : '미정'}</div>
                        </div>
                        {renderMaterialTable(gate.moreMaterials, 'more', gate.gate)}
                        <div className={styles.gateTotalRow} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.5rem 0', fontWeight: 700 }}>
                          <span>더보기 손익</span>
                          <span style={{ color: profit >= 0 ? '#27ae60' : '#c0392b' }}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* 총 가치 */}
                  <div className={styles.finalSection}>
                    <div className={styles.finalTitle}>더보기 포함 총 가치</div>
                    <div className={styles.finalGrid}>
                      <div className={styles.finalGridItem}>
                        <div className={styles.finalLabel}>클리어 골드</div>
                        <div className={styles.finalItemValue} style={{ color: '#c9a84c' }}>
                          {totalClearGold.toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.finalGridItem}>
                        <div className={styles.finalLabel}>기본 재료 가치</div>
                        <div className={styles.finalItemValue}>
                          {priceLoading ? '—' : `+${totalBasicValue.toLocaleString()}`}
                        </div>
                      </div>
                      <div className={styles.finalGridItem}>
                        <div className={styles.finalLabel}>더보기 재료 가치</div>
                        <div className={styles.finalItemValue}>
                          {priceLoading ? '—' : `+${totalMoreValue.toLocaleString()}`}
                        </div>
                      </div>
                      <div className={styles.finalGridItem}>
                        <div className={styles.finalLabel}>더보기 비용</div>
                        <div className={styles.finalItemValue} style={{ color: '#c0392b' }}>
                          -{totalMoreGold.toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.finalGridItem} style={{ gridColumn: '1 / -1', borderTop: '2px solid rgba(201, 168, 76, 0.3)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <div className={styles.finalLabel}>총 가치</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <Image src="/gold.webp" alt="골드" width={24} height={24} />
                          <span className={styles.finalItemValue} style={{ color: '#c9a84c', fontSize: '1.15rem' }}>
                            {priceLoading ? '—' : finalValue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              </div>
              );
            })()}

            {/* 벨가르딘 상점 */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Card className={styles.shopCard}>
                <Card.Header className={styles.shopCardHeader}>
                  <h3 className={styles.shopCardTitle}>
                    벨가르딘 상점
                  </h3>
                </Card.Header>
                <Card.Body className="p-0">
                  {/* 데스크톱: 좌우 분할 */}
                  <div className={styles.shopContainer}>
                    <div className={styles.shopList}>
                      <div className={styles.shopListHeader}>
                        벨가르딘 교환 목록
                      </div>
                      {SHOP_ITEMS.length === 0 && (
                        <div className={styles.shopDetailEmpty} style={{ padding: '1.5rem 1rem' }}>
                          상점 정보 준비 중입니다
                        </div>
                      )}
                      {SHOP_ITEMS.map((item) => {
                        const tc = THEME_COLORS[item.theme] || THEME_COLORS.ancient;
                        const isActive = selectedShopItem === item.id;
                        const isFree = item.costs.length === 0;
                        return (
                          <div
                            key={item.id}
                            className={`${styles.shopItem} ${isActive ? styles.active : ''}`}
                            onClick={() => setSelectedShopItem(isActive ? null : item.id)}
                          >
                            {item.hasBg ? (
                              <div className={styles.shopItemIconFill}>
                                <Image src={item.image} alt="" width={52} height={52} style={{ borderRadius: '6px', objectFit: 'cover', width: '100%', height: '100%' }} />
                              </div>
                            ) : (
                              <div className={styles.shopItemIcon} style={{ borderColor: tc.border, background: tc.iconBg }}>
                                <Image src={item.image} alt="" width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span className={styles.shopItemName} style={{ color: tc.name, display: 'block' }}>
                                {item.name}{item.qty > 1 && <span style={{ color: tc.accent, fontWeight: 700 }}> x{item.qty}</span>}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Lv.{item.requiredLevel}</span>
                                <span
                                  className={styles.limitBadge}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.35rem',
                                    color: tc.accent,
                                    background: `${tc.accent}18`,
                                    border: `1px solid ${tc.accent}40`,
                                  }}
                                >
                                  {item.limitType === 'once' ? '1회' : '무제한'}
                                </span>
                              </div>
                            </div>
                            <div className={styles.shopItemCostBadge}>
                              {isFree ? (
                                <span className={styles.shopItemFree}>무료</span>
                              ) : (
                                <span className={styles.shopItemCostValue}>—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.shopDetail}>
                      {selectedShopData ? (
                        <div className={styles.shopDetailContent}>
                          <div className={styles.shopDetailName} style={{ color: 'var(--text-primary)' }}>
                            {selectedShopData.name}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.shopDetailEmpty}>
                          상점 정보 준비 중입니다
                        </div>
                      )}
                    </div>
                  </div>

                </Card.Body>
              </Card>
            </div>

          </Col>
        </Row>
      </Container>
    </div>
  );
}
