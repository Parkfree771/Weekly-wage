'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import styles from './belgardin.module.css';
import GuideFaq from '@/components/common/GuideFaq';
import AdBanner from '@/components/ads/AdBanner';
import { faqData } from './faq-data';
import { RAID_TABLE } from '@/data/rewardTable';

// 재료 이미지 매핑
const MATERIAL_IMAGES: { [key: string]: string } = {
  '운명의 파괴석 결정': '/destiny-destruction-stone2.webp',
  '운명의 수호석 결정': '/destiny-guardian-stone2.webp',
  '위대한 운명의 돌파석': '/destiny-breakthrough-stone2.webp',
  '운명의 파편': '/destiny-shard-bag-large.webp',
  '코어': '/cerka-core2.webp',
  '사령의 잔영': '/wangap-promo-wraith-echo.webp',
  '죽음의 손': '/wangap-promo-hand-of-death.webp',
};

// 완갑 승급(해방) 재료 — 난이도별 고유 보상이라 카드 배지에 총량을 따로 표기한다.
const PROMO_MATERIAL_NAMES = ['사령의 잔영', '죽음의 손'];

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

// ─── 벨가르딘 단계별 보상 — 수치는 단일 원본 테이블(data/rewardTable.ts)에서 가져온다 ───
// 2026-08-05 출시 확정치 반영 완료. 수량 수정은 rewardTable 에서만 한다.

// 테이블 명칭('벨가르딘 나메') → 페이지 표시 명칭
const DISPLAY_NAMES: { [tableName: string]: string } = {
  '벨가르딘 나메': '벨가르딘 나이트메어',
  '벨가르딘 하드': '벨가르딘 하드',
  '벨가르딘 노말': '벨가르딘 노말',
};

const toPageMats = (mats: { itemId: number; itemName: string; amount: number }[]): Material[] =>
  mats.map((mat) => ({ name: mat.itemName, itemId: String(mat.itemId), amount: mat.amount }));

const STAGES: {
  name: string;
  level: number;
  image: string;
  gates: Gate[];
}[] = ['벨가르딘 나메', '벨가르딘 하드', '벨가르딘 노말'].map((tableName) => {
  const entry = RAID_TABLE.find((e) => e.name === tableName)!;
  return {
    name: DISPLAY_NAMES[tableName],
    level: entry.level,
    image: entry.image,
    gates: entry.gates.map((g) => ({
      gate: g.gate,
      gold: g.gold,
      moreGold: g.moreGold,
      materials: toPageMats(g.clear),
      moreMaterials: toPageMats(g.more),
    })),
  };
});

// 테마 색상 매핑
const THEME_COLORS: { [key: string]: { name: string; accent: string; bg: string; border: string; iconBg: string } } = {
  ancient:   { name: 'var(--text-primary)', accent: '#b89d6a', bg: 'rgba(201, 168, 76, 0.06)', border: 'rgba(184, 157, 106, 0.25)', iconBg: 'rgba(201, 168, 76, 0.08)' },
  relic:     { name: 'var(--text-primary)', accent: '#b85c1e', bg: 'rgba(184, 92, 30, 0.06)', border: 'rgba(184, 92, 30, 0.2)', iconBg: 'rgba(184, 92, 30, 0.06)' },
  refine:    { name: 'var(--text-primary)', accent: '#c0392b', bg: 'rgba(192, 57, 43, 0.06)', border: 'rgba(192, 57, 43, 0.2)',  iconBg: 'rgba(192, 57, 43, 0.06)' },
  aux:       { name: 'var(--text-primary)', accent: '#3a7bb8', bg: 'rgba(58, 123, 184, 0.06)', border: 'rgba(58, 123, 184, 0.2)',  iconBg: 'rgba(58, 123, 184, 0.06)' },
  kit:       { name: 'var(--text-primary)', accent: '#7c5cbf', bg: 'rgba(124, 92, 191, 0.06)', border: 'rgba(124, 92, 191, 0.2)',  iconBg: 'rgba(124, 92, 191, 0.06)' },
};

// ─── 벨가르딘 상점 데이터 ───
// 노말 상점은 사령의 잔영, 하드·나메 상점은 죽음의 손으로 같은 구성의 상자를 교환한다.
// 잔영·죽음의 손 단가는 사령의 재련 재료 상자 기댓값을 교환 비용으로 나눠 역산한다
// (세르카 고통의 가시와 같은 방식 — contexts/PriceContext.tsx 의 WRAITH_BOX 와 짝).

// 사령의 재련 재료 상자 (4개 중 25% 확률 1종)
const REFINE_RANDOM_COMPONENTS: { itemId: string; name: string; icon: string; amount: number; probability: number }[] = [
  { itemId: '66130143', name: '운명의 파편',           icon: '/destiny-shard-bag-large.webp',     amount: 15000, probability: 0.25 },
  { itemId: '66110226', name: '위대한 운명의 돌파석',   icon: '/destiny-breakthrough-stone2.webp', amount: 9,     probability: 0.25 },
  { itemId: '66102007', name: '운명의 파괴석 결정',     icon: '/destiny-destruction-stone2.webp',  amount: 500,   probability: 0.25 },
  { itemId: '66102107', name: '운명의 수호석 결정',     icon: '/destiny-guardian-stone2.webp',     amount: 1500,  probability: 0.25 },
];
// 재련 재료 상자 교환 비용 — 잔영·죽음의 손 단가 역산의 기준값
const REFINE_BOX_ECHO_COST = 20; // 노말: 사령의 잔영 20개
const REFINE_BOX_HAND_COST = 10; // 하드·나메: 죽음의 손 10개

// 사령의 보조 재료 주머니 (2개 중 50% 확률 1종)
const AUX_RANDOM_COMPONENTS: { itemId: string; name: string; icon: string; amount: number; probability: number }[] = [
  { itemId: '66111131', name: '용암의 숨결', icon: '/breath-lava.webp',    amount: 5,  probability: 0.5 },
  { itemId: '66111132', name: '빙하의 숨결', icon: '/breath-glacier.webp', amount: 15, probability: 0.5 },
];

// 재화 아이콘
const CURRENCY_IMAGES: { [key: string]: string } = {
  '사령의 잔영': '/wangap-promo-wraith-echo.webp',
  '죽음의 손': '/wangap-promo-hand-of-death.webp',
};

// 난이도 배지 색 — 주간 골드 계산기의 난이도 배지(노말 노랑 · 나메 보라)와 통일.
// 채운 배경 + 흰 글자. 하드·나메는 묶음 상점이라 상위 난이도(나메) 보라를 쓴다.
const DIFFICULTY_BADGE_COLORS: { [key: string]: string } = {
  '노말': '#eab308',
  '하드·나메': '#7e22ce',
};

type ShopItem = {
  id: number;
  name: string;
  qty: number;
  difficulty: '노말' | '하드·나메';
  image: string;
  theme: string;
  hasBg: boolean;
  costs: { name: string; amount: number }[];
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 1, name: '사령의 재련 재료 상자', qty: 1, difficulty: '노말',
    image: '/wofuswofy.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '사령의 잔영', amount: 20 }],
  },
  {
    id: 2, name: '사령의 보조 재료 주머니', qty: 1, difficulty: '노말',
    image: '/material-select-box.webp', theme: 'aux', hasBg: true,
    costs: [{ name: '사령의 잔영', amount: 20 }],
  },
  {
    id: 3, name: '비상의 돌 각인 지정 키트', qty: 1, difficulty: '노말',
    image: '/djqlfflxltmxhs.webp', theme: 'kit', hasBg: true,
    costs: [{ name: '사령의 잔영', amount: 10 }],
  },
  {
    id: 4, name: '사령의 재련 재료 상자', qty: 1, difficulty: '하드·나메',
    image: '/wofuswofy.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '죽음의 손', amount: 10 }],
  },
  {
    id: 5, name: '사령의 보조 재료 주머니', qty: 1, difficulty: '하드·나메',
    image: '/material-select-box.webp', theme: 'aux', hasBg: true,
    costs: [{ name: '죽음의 손', amount: 10 }],
  },
  {
    id: 6, name: '비상의 돌 각인 지정 키트', qty: 1, difficulty: '하드·나메',
    image: '/djqlfflxltmxhs.webp', theme: 'kit', hasBg: true,
    costs: [{ name: '죽음의 손', amount: 5 }],
  },
];

export default function BelgardinPage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // 기본 선택 = 사령의 재련 재료 상자 노말 (SHOP_ITEMS id 1)
  const [selectedShopItem, setSelectedShopItem] = useState<number | null>(1);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [materialChecks, setMaterialChecks] = useState<Record<string, Record<string, Record<string, boolean>>>>({});

  // 재련 재료 상자 체크 상태 (잔영·죽음의 손 단가 산출에 포함할지)
  const [refineRandomChecks, setRefineRandomChecks] = useState<Record<string, boolean>>({});
  const isRefineRandomChecked = (itemId: string) => refineRandomChecks[itemId] ?? true;
  const toggleRefineRandomCheck = (itemId: string) => setRefineRandomChecks(prev => ({ ...prev, [itemId]: !isRefineRandomChecked(itemId) }));

  // 보조 재료 주머니 체크 상태
  const [auxRandomChecks, setAuxRandomChecks] = useState<Record<string, boolean>>({});
  const isAuxRandomChecked = (itemId: string) => auxRandomChecks[itemId] ?? true;
  const toggleAuxRandomCheck = (itemId: string) => setAuxRandomChecks(prev => ({ ...prev, [itemId]: !isAuxRandomChecked(itemId) }));

  const selectedStageData = STAGES.find(s => s.name === selectedStage);

  // 가격 계산 헬퍼
  const getUnitPrice = (itemId: string) => {
    if (itemId === '0') return 0;
    const bundlePrice = latestPrices[itemId] || 0;
    const bundleSize = BUNDLE_SIZES[itemId] || 1;
    return bundlePrice / bundleSize;
  };

  // 사령의 재련 재료 상자 기댓값 → 잔영·죽음의 손 1개 가치 역산
  const refineBoxExpected = REFINE_RANDOM_COMPONENTS.reduce((sum, comp) => {
    if (!isRefineRandomChecked(comp.itemId)) return sum;
    return sum + getUnitPrice(comp.itemId) * comp.amount * comp.probability;
  }, 0);
  const echoUnitPrice = refineBoxExpected / REFINE_BOX_ECHO_COST;
  const handUnitPrice = refineBoxExpected / REFINE_BOX_HAND_COST;
  const currencyUnitPrice = (name: string) =>
    name === '사령의 잔영' ? echoUnitPrice : name === '죽음의 손' ? handUnitPrice : 0;

  const getMaterialValue = (mat: Material) => {
    if (PROMO_MATERIAL_NAMES.includes(mat.name)) return Math.round(currencyUnitPrice(mat.name) * mat.amount);
    if (mat.itemId === '0' || mat.amount === 0) return 0;
    return Math.round(getUnitPrice(mat.itemId) * mat.amount);
  };

  // 체크 상태 확인 (기본 true)
  // 키는 itemId 가 아니라 재료명 — 거래 불가 재료(코어·승급 재료)는 itemId 가 모두 '0' 이라 겹친다.
  const isChecked = (stage: string, type: string, gate: number, itemName: string) =>
    materialChecks[stage]?.[type]?.[`${gate}-${itemName}`] ?? true;

  const toggleCheck = (stage: string, type: string, gate: number, itemName: string) => {
    setMaterialChecks(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [type]: {
          ...prev[stage]?.[type],
          [`${gate}-${itemName}`]: !isChecked(stage, type, gate, itemName),
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
    <div className={styles.pageTheme} style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
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
                // 카드 배지는 이 레이드에서 실제로 받는 고유 보상(승급 재료) 총량 —
                // 클리어분과 더보기분을 모두 더한 값이다(관문당 클리어 12/18 + 더보기 12/18 = 60).
                const promoMats = stage.gates
                  .flatMap(g => [...g.materials, ...g.moreMaterials])
                  .filter(m => PROMO_MATERIAL_NAMES.includes(m.name));
                const promoLabel = promoMats[0]?.name || '';
                const totalPromo = promoMats.reduce((sum, m) => sum + m.amount, 0);
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
                      {totalPromo > 0 && (
                        <div className={styles.graceBadge}>{promoLabel} {totalPromo}개</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택한 단계 상세 */}
            {selectedStageData && (() => {
              const sn = selectedStageData.name;
              const getCheckedValue = (mats: Material[], type: string, gate: number) =>
                mats.reduce((s, m) => s + (isChecked(sn, type, gate, m.name) ? getMaterialValue(m) : 0), 0);

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
                      const checked = isChecked(sn, type, gate, mat.name);
                      const isPromo = PROMO_MATERIAL_NAMES.includes(mat.name);
                      const unitPrice = isPromo ? currencyUnitPrice(mat.name) : getUnitPrice(mat.itemId);
                      const totalPrice = getMaterialValue(mat);
                      return (
                      <tr key={idx} style={!checked ? { opacity: 0.4 } : undefined}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCheck(sn, type, gate, mat.name)}
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
                        <td>{isPromo ? (priceLoading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)) : mat.itemId === '0' ? '-' : priceLoading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)}</td>
                        <td>{isPromo ? (priceLoading ? '—' : totalPrice.toLocaleString()) : mat.itemId === '0' || mat.amount === 0 ? '-' : priceLoading ? '—' : totalPrice.toLocaleString()}</td>
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
                      {SHOP_ITEMS.map((item) => {
                        const tc = THEME_COLORS[item.theme] || THEME_COLORS.ancient;
                        const isActive = selectedShopItem === item.id;
                        const currencyCost = item.costs.reduce((sum, c) => sum + currencyUnitPrice(c.name) * c.amount, 0);
                        const totalGoldCost = Math.round(currencyCost);
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span
                                  className={styles.limitBadge}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.35rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    background: DIFFICULTY_BADGE_COLORS[item.difficulty],
                                    border: 'none',
                                  }}
                                >
                                  {item.difficulty}
                                </span>
                              </div>
                            </div>
                            <div className={styles.shopItemCostBadge}>
                              {priceLoading || totalGoldCost === 0 ? (
                                <span className={styles.shopItemCostValue}>—</span>
                              ) : (
                                <span className={styles.shopItemCostValue}>
                                  <Image src="/gold.webp" alt="" width={14} height={14} />
                                  {totalGoldCost.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.shopDetail}>
                      {selectedShopData ? (() => {
                        const sd = selectedShopData;
                        const tc = THEME_COLORS[sd.theme] || THEME_COLORS.ancient;

                        const totalGoldCost = Math.round(sd.costs.reduce((sum, c) => sum + currencyUnitPrice(c.name) * c.amount, 0));

                        // 아이템 가치 / 명칭 (효율 표시용)
                        let itemValue = 0;
                        let valueName = '';
                        let canShowEfficiency = false;

                        if (sd.theme === 'refine') {
                          // 박스 기댓값 = Σ(price × amount × prob), 체크된 항목만
                          itemValue = Math.round(refineBoxExpected * sd.qty);
                          valueName = '상자 기댓값';
                          canShowEfficiency = true;
                        } else if (sd.theme === 'aux') {
                          const expected = AUX_RANDOM_COMPONENTS.reduce((sum, comp) => {
                            if (!isAuxRandomChecked(comp.itemId)) return sum;
                            return sum + getUnitPrice(comp.itemId) * comp.amount * comp.probability;
                          }, 0);
                          itemValue = Math.round(expected * sd.qty);
                          valueName = '주머니 기댓값';
                          canShowEfficiency = true;
                        }

                        return (
                          <div className={styles.shopDetailContent} style={(sd.theme === 'refine' || sd.theme === 'aux') ? { maxWidth: '550px' } : undefined}>
                            {/* 1. 아이콘 + 이름 */}
                            <div className={styles.shopDetailTop}>
                              {sd.hasBg ? (
                                <div className={styles.shopDetailIconFill}>
                                  <Image src={sd.image} alt="" width={130} height={130} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                </div>
                              ) : (
                                <div className={styles.shopDetailIcon} style={{ borderColor: tc.border, background: tc.iconBg }}>
                                  <Image src={sd.image} alt="" width={110} height={110} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                </div>
                              )}
                              <div className={styles.shopDetailName} style={{ color: tc.name }}>
                                {sd.name}{sd.qty > 1 && <span style={{ color: tc.accent }}> x{sd.qty}</span>}
                              </div>
                            </div>

                            {/* 2. 난이도 상점 구분 */}
                            <div className={styles.shopCompactInfo}>
                              <span
                                className={styles.limitBadge}
                                style={{
                                  fontWeight: 700,
                                  color: '#fff',
                                  background: DIFFICULTY_BADGE_COLORS[sd.difficulty],
                                  border: 'none',
                                }}
                              >
                                {sd.difficulty} 상점
                              </span>
                            </div>

                            {/* 3. 교환 비용 */}
                            <div className={styles.shopDetailSection}>
                              <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>교환 비용</div>
                              <div className={styles.shopDetailCostList}>
                                {sd.costs.map((cost, idx) => (
                                  <div key={idx} className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                    {CURRENCY_IMAGES[cost.name] && (
                                      <Image src={CURRENCY_IMAGES[cost.name]} alt={cost.name} width={24} height={24} />
                                    )}
                                    <span className={styles.costName}>{cost.name} </span>
                                    <span className={styles.costShortName}>{cost.name === '사령의 잔영' ? '잔영 ' : `${cost.name} `}</span>
                                    <span>{cost.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                                {!priceLoading && totalGoldCost > 0 && (
                                  <div className={styles.costTotalRow}>
                                    <span className={styles.costTotalEquals}>=</span>
                                    <Image src="/gold.webp" alt="" width={18} height={18} />
                                    <span className={styles.costTotalValue}>{totalGoldCost.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 4. 구성 요소 — 테마별 렌더링 */}
                            {sd.theme === 'refine' && (() => {
                              const rows = REFINE_RANDOM_COMPONENTS.map(comp => {
                                const unit = getUnitPrice(comp.itemId);
                                const checked = isRefineRandomChecked(comp.itemId);
                                const expected = unit * comp.amount * comp.probability;
                                return { ...comp, unit, expected, checked };
                              });
                              const currencyName = sd.costs[0].name;
                              const currencyCostCount = currencyName === '사령의 잔영' ? REFINE_BOX_ECHO_COST : REFINE_BOX_HAND_COST;
                              const currencyValue = Math.round(refineBoxExpected / currencyCostCount);
                              return (
                                <div className={styles.shopDetailSection}>
                                  <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소 (4개 중 25% 확률)</div>
                                  <table className={styles.materialTable} style={{ marginBottom: '0.75rem' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ textAlign: 'center' }}></th>
                                        <th>아이템</th>
                                        <th style={{ textAlign: 'center' }}>확률</th>
                                        <th style={{ textAlign: 'center' }}>수량</th>
                                        <th style={{ textAlign: 'center' }}>단가</th>
                                        <th style={{ textAlign: 'center' }}>기댓값</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row) => (
                                        <tr key={row.itemId} style={{ cursor: 'pointer', opacity: row.checked ? 1 : 0.5 }} onClick={() => toggleRefineRandomCheck(row.itemId)}>
                                          <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{row.checked ? '✅' : '⬜'}</td>
                                          <td>
                                            <div className={styles.materialCell}>
                                              <Image src={row.icon} alt={row.name} width={32} height={32} />
                                              <span style={{ fontSize: '0.8rem' }}>{row.name}</span>
                                            </div>
                                          </td>
                                          <td style={{ textAlign: 'center' }}>{(row.probability * 100).toFixed(0)}%</td>
                                          <td style={{ textAlign: 'center' }}>{row.amount.toLocaleString()}</td>
                                          <td style={{ textAlign: 'center' }}>{priceLoading ? '—' : row.unit >= 1 ? row.unit.toFixed(1) : row.unit.toFixed(3)}</td>
                                          <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <Image src="/gold.webp" alt="" width={14} height={14} />
                                              <span>{priceLoading ? '—' : Math.round(row.expected).toLocaleString()}</span>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className={styles.subtotalRow}>
                                        <td colSpan={5}>상자 기댓값</td>
                                        <td style={{ textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Image src="/gold.webp" alt="" width={14} height={14} />
                                            <span>{priceLoading ? '—' : Math.round(refineBoxExpected).toLocaleString()}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                  <div className={styles.graceValueCard}>
                                    <div className={styles.graceValueRow}>
                                      <div className={styles.graceValueLabel}>
                                        <Image src={CURRENCY_IMAGES[currencyName]} alt={currencyName} width={28} height={28} />
                                        <span>{currencyName} 1개 가치</span>
                                      </div>
                                      <div className={styles.graceValueAmount}>
                                        <Image src="/gold.webp" alt="골드" width={20} height={20} />
                                        <span>{priceLoading ? '—' : currencyValue.toLocaleString()}</span>
                                        <span className={styles.graceValueUnit}>G</span>
                                      </div>
                                    </div>
                                    <div className={styles.graceValueFormula}>
                                      상자 기댓값 {priceLoading ? '—' : Math.round(refineBoxExpected).toLocaleString()}G ÷ {currencyName} {currencyCostCount}개
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {sd.theme === 'aux' && (() => {
                              let boxExpected = 0;
                              const rows = AUX_RANDOM_COMPONENTS.map(comp => {
                                const unit = getUnitPrice(comp.itemId);
                                const checked = isAuxRandomChecked(comp.itemId);
                                const expected = unit * comp.amount * comp.probability;
                                if (checked) boxExpected += expected;
                                return { ...comp, unit, expected, checked };
                              });
                              return (
                                <div className={styles.shopDetailSection}>
                                  <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소 (2개 중 50% 확률)</div>
                                  <table className={styles.materialTable} style={{ marginBottom: '0.75rem' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ textAlign: 'center' }}></th>
                                        <th>아이템</th>
                                        <th style={{ textAlign: 'center' }}>확률</th>
                                        <th style={{ textAlign: 'center' }}>수량</th>
                                        <th style={{ textAlign: 'center' }}>단가</th>
                                        <th style={{ textAlign: 'center' }}>기댓값</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((row) => (
                                        <tr key={row.itemId} style={{ cursor: 'pointer', opacity: row.checked ? 1 : 0.5 }} onClick={() => toggleAuxRandomCheck(row.itemId)}>
                                          <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>{row.checked ? '✅' : '⬜'}</td>
                                          <td>
                                            <div className={styles.materialCell}>
                                              <Image src={row.icon} alt={row.name} width={32} height={32} />
                                              <span style={{ fontSize: '0.8rem' }}>{row.name}</span>
                                            </div>
                                          </td>
                                          <td style={{ textAlign: 'center' }}>{(row.probability * 100).toFixed(0)}%</td>
                                          <td style={{ textAlign: 'center' }}>{row.amount.toLocaleString()}</td>
                                          <td style={{ textAlign: 'center' }}>{priceLoading ? '—' : row.unit.toLocaleString()}</td>
                                          <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <Image src="/gold.webp" alt="" width={14} height={14} />
                                              <span>{priceLoading ? '—' : Math.round(row.expected).toLocaleString()}</span>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className={styles.subtotalRow}>
                                        <td colSpan={5}>주머니 기댓값</td>
                                        <td style={{ textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Image src="/gold.webp" alt="" width={14} height={14} />
                                            <span>{priceLoading ? '—' : Math.round(boxExpected).toLocaleString()}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              );
                            })()}

                            {sd.theme === 'kit' && (
                              <div className={styles.shopDetailSection}>
                                <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소</div>
                                <div className={styles.shopDetailCostList} style={{ marginBottom: '0.75rem' }}>
                                  <div className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                    <Image src="/djqlfflxltmxhs.webp" alt="어빌리티스톤 키트" width={24} height={24} />
                                    <span style={{ whiteSpace: 'nowrap' }}>어빌리티스톤 키트</span>
                                    <span>1개</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  어빌리티스톤 키트는 거래소 시세가 없어 골드 가치 계산에서 제외됩니다.
                                </div>
                              </div>
                            )}

                            {/* 5. 교환 효율 */}
                            {!priceLoading && canShowEfficiency && itemValue > 0 && (() => {
                              const efficiency = totalGoldCost > 0 ? Math.round((itemValue / totalGoldCost) * 100) : null;
                              return (
                                <div className={styles.efficiencySection}>
                                  <div className={styles.efficiencyTitle}>교환 효율</div>
                                  <div className={styles.efficiencyGrid}>
                                    <div className={styles.efficiencyRow}>
                                      <span className={styles.efficiencyLabel}>{valueName}</span>
                                      <span className={styles.efficiencyValue}>
                                        <Image src="/gold.webp" alt="" width={16} height={16} />
                                        {itemValue.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className={styles.efficiencyRow}>
                                      <span className={styles.efficiencyLabel}>교환 비용</span>
                                      <span className={styles.efficiencyValue}>
                                        <Image src="/gold.webp" alt="" width={16} height={16} />
                                        {totalGoldCost.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className={styles.efficiencyResultRow}>
                                      <span className={styles.efficiencyResultLabel}>효율</span>
                                      {efficiency !== null && (
                                        <span className={styles.efficiencyResultValue} style={{ color: efficiency >= 100 ? '#27ae60' : '#c0392b' }}>
                                          {efficiency}%
                                          <span className={styles.efficiencyProfitTag} style={{
                                            color: efficiency >= 100 ? '#27ae60' : '#c0392b',
                                            background: efficiency >= 100 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(192, 57, 43, 0.1)',
                                          }}>
                                            {efficiency >= 100 ? `+${(itemValue - totalGoldCost).toLocaleString()}G` : `${(itemValue - totalGoldCost).toLocaleString()}G`}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })() : (
                        <div className={styles.shopDetailEmpty}>
                          아이템을 선택하면 상세 정보를 확인할 수 있습니다
                        </div>
                      )}
                    </div>
                  </div>

                </Card.Body>
              </Card>
            </div>

            {/* 모바일 인-콘텐츠 광고 — 본문 아래·가이드 위 (앱 배치와 유사) */}
            <div className="d-block d-lg-none my-3">
              <AdBanner slot="8616653628" />
            </div>

            <GuideFaq
              relatedGuides={['/guide/belgardin-rewards', '/guide/wangap-upgrade-schedule', '/guide/raid-rewards']}
              guideTitle="벨가르딘 이용 가이드"
              sections={[
                {
                  heading: '벨가르딘 보상 정보 — 출시 확정치 반영',
                  paragraphs: [
                    '벨가르딘은 2026년 8월 5일 출시된 그림자 레이드입니다. 이 페이지의 난이도별 관문 구조와 클리어 골드·더보기 비용·재료 수량은 출시 당일 인게임에서 확인한 확정치이며, 주간 골드 계산기와 마이페이지에서도 그대로 체크하고 합산할 수 있습니다.',
                    '클리어 보상에는 운명의 파괴석 결정 · 운명의 수호석 결정 · 위대한 운명의 돌파석 · 운명의 파편과 아크그리드 코어, 완갑 승급 재료(사령의 잔영 · 죽음의 손)가 포함되며, 재료 수량에 실시간 거래소 시세를 곱한 총 가치를 관문별로 계산해 보여줍니다.',
                  ],
                },
                {
                  heading: '난이도별 관문 구조와 클리어 골드',
                  paragraphs: [
                    '다른 최신 레이드와 마찬가지로 노말(1750) · 하드(1770) · 나메(1780) 세 난이도 모두 1관문 · 2관문 2개 관문으로 구성됩니다. 클리어 골드는 노말 1관문 20,000골드 · 2관문 30,000골드, 하드 1관문 25,000골드 · 2관문 37,000골드, 나메 1관문 30,000골드 · 2관문 45,000골드입니다.',
                    '더보기(모험의 서약) 비용은 난이도와 무관하게 해당 관문 클리어 골드의 32% 수준으로 책정되어 있습니다. 예를 들어 나메 1관문은 클리어 골드 30,000골드에 더보기 비용 9,600골드로 정확히 32%이고, 노말 · 하드의 각 관문 역시 동일한 비율입니다. 더보기 재료별 손익 비교는 더보기 효율 페이지에서 실시간 시세 기준으로 확인할 수 있습니다.',
                  ],
                },
                {
                  heading: '벨가르딘 상점 — 사령의 잔영·죽음의 손 교환',
                  paragraphs: [
                    '벨가르딘 상점은 노말 클리어로 얻는 사령의 잔영, 하드·나메 클리어로 얻는 죽음의 손으로 교환하는 두 상점으로 나뉩니다. 교환 항목은 사령의 재련 재료 상자, 사령의 보조 재료 주머니, 비상의 돌 각인 지정 키트 3종으로 양쪽이 동일하고, 노말은 잔영 20·20·10개, 하드·나메는 죽음의 손 10·10·5개를 소모합니다.',
                    '사령의 재련 재료 상자는 운명의 파편 15,000 · 위대한 운명의 돌파석 9개 · 운명의 파괴석 결정 500개 · 운명의 수호석 결정 1,500개 중 1종이 25% 확률로 나오는 랜덤 상자이고, 사령의 보조 재료 주머니는 용암의 숨결 5개 또는 빙하의 숨결 15개가 50% 확률로 나옵니다. 비상의 돌 각인 지정 키트는 어빌리티스톤 키트 1개를 지급합니다.',
                  ],
                },
                {
                  heading: '사령의 잔영·죽음의 손 단가는 어떻게 산출되나요',
                  paragraphs: [
                    '두 재화 모두 거래소에서 직접 거래되지 않기 때문에, 세르카의 고통의 가시와 같은 방식으로 사령의 재련 재료 상자의 기댓값(각 재료 실시간 시세 × 수량 × 25%의 합)을 교환 비용으로 나누어 역산합니다. 사령의 잔영 1개는 상자 기댓값 ÷ 20, 죽음의 손 1개는 상자 기댓값 ÷ 10이 됩니다.',
                    '이렇게 산출한 단가는 이 페이지의 클리어 보상 · 더보기 보상 총 가치에 반영되고, 더보기 효율 페이지와 주간 골드 계산기의 더보기 손익 계산에도 동일하게 적용됩니다.',
                  ],
                },
              ]}
              faqs={faqData}
            />

          </Col>
        </Row>
      </Container>
    </div>
  );
}
