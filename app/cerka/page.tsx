'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import styles from '../cathedral/cathedral.module.css';

// ─────────────────────────────────────────────────────────────────────────
// 재료 이미지 / 묶음 단위
// ─────────────────────────────────────────────────────────────────────────

const MATERIAL_IMAGES: { [key: string]: string } = {
  '운명의 파괴석 결정': '/destiny-destruction-stone2.webp',
  '운명의 수호석 결정': '/destiny-guardian-stone2.webp',
  '위대한 운명의 돌파석': '/destiny-breakthrough-stone2.webp',
  '운명의 파괴석': '/destiny-destruction-stone.webp',
  '운명의 수호석': '/destiny-guardian-stone.webp',
  '운명의 돌파석': '/destiny-breakthrough-stone.webp',
  '운명의 파편': '/destiny-shard-bag-large.webp',
  '코어': '/cerka-core2.webp',
  '고통의 가시': '/pulsating-thorn.webp',
  '용암의 숨결': '/breath-lava.webp',
  '빙하의 숨결': '/breath-glacier.webp',
};

const BUNDLE_SIZES: { [key: string]: number } = {
  '66102007': 100,
  '66102107': 100,
  '66110226': 1,
  '66130143': 3000,
  '66102006': 100,
  '66102106': 100,
  '66110225': 1,
  '66111131': 1,
  '66111132': 1,
  '66112553': 1,
  '66112554': 1,
};

type Material = {
  name: string;
  itemId: string;
  amount: number;
};

type Gate = {
  gate: number;
  gold: number;
  moreGold: number;
  materials: Material[];
  moreMaterials: Material[];
};

// 세르카 단계별 보상 데이터
const STAGES: {
  name: string;
  level: number;
  image: string;
  gates: Gate[];
}[] = [
  {
    name: '세르카 나메', level: 1740, image: '/cerka.webp',
    gates: [
      { gate: 1, gold: 21000, moreGold: 6720,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 405 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 810 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 8 },
          { name: '운명의 파편', itemId: '66130143', amount: 9100 },
          { name: '고통의 가시', itemId: '0', amount: 10 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 860 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 1720 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 36 },
          { name: '운명의 파편', itemId: '66130143', amount: 19000 },
          { name: '고통의 가시', itemId: '0', amount: 10 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
      },
      { gate: 2, gold: 33000, moreGold: 10560,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 500 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 1000 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 12 },
          { name: '운명의 파편', itemId: '66130143', amount: 11000 },
          { name: '고통의 가시', itemId: '0', amount: 15 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 1430 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 2860 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 60 },
          { name: '운명의 파편', itemId: '66130143', amount: 32200 },
          { name: '고통의 가시', itemId: '0', amount: 15 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
      },
    ],
  },
  {
    name: '세르카 하드', level: 1730, image: '/cerka.webp',
    gates: [
      { gate: 1, gold: 17500, moreGold: 5600,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 385 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 770 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 7 },
          { name: '운명의 파편', itemId: '66130143', amount: 8300 },
          { name: '고통의 가시', itemId: '0', amount: 10 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 750 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 1500 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 30 },
          { name: '운명의 파편', itemId: '66130143', amount: 17500 },
          { name: '고통의 가시', itemId: '0', amount: 10 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
      { gate: 2, gold: 26500, moreGold: 8480,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 475 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 950 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 10 },
          { name: '운명의 파편', itemId: '66130143', amount: 10100 },
          { name: '고통의 가시', itemId: '0', amount: 15 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 1130 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 2260 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 45 },
          { name: '운명의 파편', itemId: '66130143', amount: 26820 },
          { name: '고통의 가시', itemId: '0', amount: 15 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
    ],
  },
  {
    name: '세르카 노말', level: 1710, image: '/cerka.webp',
    gates: [
      { gate: 1, gold: 14000, moreGold: 4480,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 880 },
          { name: '운명의 수호석', itemId: '66102106', amount: 1760 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 12 },
          { name: '운명의 파편', itemId: '66130143', amount: 6200 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 1610 },
          { name: '운명의 수호석', itemId: '66102106', amount: 3220 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 50 },
          { name: '운명의 파편', itemId: '66130143', amount: 13650 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
      { gate: 2, gold: 21000, moreGold: 6720,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 1100 },
          { name: '운명의 수호석', itemId: '66102106', amount: 2200 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 15 },
          { name: '운명의 파편', itemId: '66130143', amount: 7900 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 2480 },
          { name: '운명의 수호석', itemId: '66102106', amount: 4960 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 82 },
          { name: '운명의 파편', itemId: '66130143', amount: 20880 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
    ],
  },
];

// 테마 색상
const THEME_COLORS: { [key: string]: { name: string; accent: string; bg: string; border: string; iconBg: string } } = {
  craft:        { name: 'var(--text-primary)', accent: '#a8893a', bg: 'rgba(201, 168, 76, 0.06)', border: 'rgba(201, 168, 76, 0.25)', iconBg: 'rgba(201, 168, 76, 0.08)' },
  refine:       { name: 'var(--text-primary)', accent: '#c0392b', bg: 'rgba(192, 57, 43, 0.06)', border: 'rgba(192, 57, 43, 0.2)',  iconBg: 'rgba(192, 57, 43, 0.06)' },
  aux:          { name: 'var(--text-primary)', accent: '#3a7bb8', bg: 'rgba(58, 123, 184, 0.06)', border: 'rgba(58, 123, 184, 0.2)',  iconBg: 'rgba(58, 123, 184, 0.06)' },
  gemRandom:    { name: 'var(--text-primary)', accent: '#7c5cbf', bg: 'rgba(124, 92, 191, 0.06)', border: 'rgba(124, 92, 191, 0.2)',  iconBg: 'rgba(124, 92, 191, 0.06)' },
};

// ─────────────────────────────────────────────────────────────────────────
// 상점 구성요소 데이터
// ─────────────────────────────────────────────────────────────────────────

// 거래가능 단일 아이템 (야금술/재봉술)
const CRAFT_TRADEABLE: { [id: number]: { itemId: string; name: string; icon: string } } = {
  1: { itemId: '66112553', name: '야금술 : 업화 [19-20]', icon: '/metallurgy-karma.webp' },
  2: { itemId: '66112554', name: '재봉술 : 업화 [19-20]', icon: '/tailoring-karma.webp' },
};

// 고통의 재련 재료 상자 (25% 확률 4개 중 1개)
const REFINE_RANDOM_COMPONENTS: { itemId: string; name: string; icon: string; amount: number; probability: number }[] = [
  { itemId: '66130143', name: '운명의 파편',           icon: '/destiny-shard-bag-large.webp',     amount: 6000, probability: 0.25 },
  { itemId: '66110226', name: '위대한 운명의 돌파석',   icon: '/destiny-breakthrough-stone2.webp', amount: 3,    probability: 0.25 },
  { itemId: '66102007', name: '운명의 파괴석 결정',     icon: '/destiny-destruction-stone2.webp',  amount: 100,  probability: 0.25 },
  { itemId: '66102107', name: '운명의 수호석 결정',     icon: '/destiny-guardian-stone2.webp',     amount: 300,  probability: 0.25 },
];
const REFINE_RANDOM_THORN_COST = 5; // 가시 5개 = 상자 1개

// 고통의 재련 보조 재료 주머니 (50% 확률 2개 중 1개)
const AUX_RANDOM_COMPONENTS: { itemId: string; name: string; icon: string; amount: number; probability: number }[] = [
  { itemId: '66111131', name: '용암의 숨결', icon: '/breath-lava.webp',    amount: 4,  probability: 0.5 },
  { itemId: '66111132', name: '빙하의 숨결', icon: '/breath-glacier.webp', amount: 12, probability: 0.5 },
];

// 영웅 ~ 고급 젬 랜덤 상자 — 영웅 등급 5% (개별 확률은 0.05 × 등급 비율)
// (안정/침식 30% 비율 → 1.5% / 견고/왜곡 15% → 0.75% / 불변/붕괴 5% → 0.25%)
const GEM_RANDOM_HERO_PROBS: { itemId: string; name: string; icon: string; probability: number }[] = [
  { itemId: '67400003', name: '질서의 젬 : 안정', icon: '/gem-order-stable.webp',     probability: 0.015 },
  { itemId: '67400103', name: '질서의 젬 : 견고', icon: '/gem-order-solid.webp',      probability: 0.0075 },
  { itemId: '67400203', name: '질서의 젬 : 불변', icon: '/gem-order-immutable.webp',  probability: 0.0025 },
  { itemId: '67410303', name: '혼돈의 젬 : 침식', icon: '/gem-chaos-erosion.webp',    probability: 0.015 },
  { itemId: '67410403', name: '혼돈의 젬 : 왜곡', icon: '/gem-chaos-distortion.webp', probability: 0.0075 },
  { itemId: '67410503', name: '혼돈의 젬 : 붕괴', icon: '/gem-chaos-collapse.webp',   probability: 0.0025 },
];

// ─────────────────────────────────────────────────────────────────────────
// 상점 아이템
// ─────────────────────────────────────────────────────────────────────────
type LimitKind = 'weekly-char' | 'weekly-roster' | 'unlimited';
type BoundType = 'tradeable' | 'roster-bound' | 'character-bound';

type ShopItem = {
  id: number;
  name: string;
  qty: number;
  requiredLevel: number;
  image: string;
  theme: string;
  hasBg: boolean;
  costs: { name: string; amount: number }[];
  limitKind: LimitKind;
  limitCount?: number;
  boundType: BoundType;
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 1, name: '야금술 : 업화 [19-20]', qty: 1, requiredLevel: 1710,
    image: '/metallurgy-karma.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '고통의 가시', amount: 20 }, { name: '골드', amount: 3000 }],
    limitKind: 'weekly-char', limitCount: 2,
    boundType: 'tradeable',
  },
  {
    id: 2, name: '재봉술 : 업화 [19-20]', qty: 1, requiredLevel: 1710,
    image: '/tailoring-karma.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '고통의 가시', amount: 10 }, { name: '골드', amount: 1500 }],
    limitKind: 'weekly-char', limitCount: 10,
    boundType: 'tradeable',
  },
  {
    id: 3, name: '야금술 : 업화 [19-20]', qty: 1, requiredLevel: 1710,
    image: '/metallurgy-karma.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '고통의 가시', amount: 20 }],
    limitKind: 'weekly-roster', limitCount: 1,
    boundType: 'roster-bound',
  },
  {
    id: 4, name: '재봉술 : 업화 [19-20]', qty: 5, requiredLevel: 1710,
    image: '/tailoring-karma.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '고통의 가시', amount: 10 }],
    limitKind: 'weekly-roster', limitCount: 5,
    boundType: 'roster-bound',
  },
  {
    id: 5, name: '고통의 재련 재료 상자', qty: 1, requiredLevel: 1710,
    image: '/wofuswofy.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '고통의 가시', amount: 5 }],
    limitKind: 'unlimited',
    boundType: 'character-bound',
  },
  {
    id: 6, name: '고통의 재련 보조 재료 주머니', qty: 1, requiredLevel: 1710,
    image: '/material-select-box.webp', theme: 'aux', hasBg: true,
    costs: [{ name: '고통의 가시', amount: 5 }],
    limitKind: 'unlimited',
    boundType: 'character-bound',
  },
  {
    id: 7, name: '젬 랜덤 상자 (영웅 ~ 고급)', qty: 1, requiredLevel: 1710,
    image: '/duddndgmlrnl.webp', theme: 'gemRandom', hasBg: false,
    costs: [{ name: '고통의 가시', amount: 5 }],
    limitKind: 'unlimited',
    boundType: 'character-bound',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 한도 / 귀속 라벨 헬퍼
// ─────────────────────────────────────────────────────────────────────────
function limitLabel(item: ShopItem, short = false): string {
  if (item.limitKind === 'unlimited') return '무제한';
  const count = item.limitCount ?? 0;
  if (item.limitKind === 'weekly-char') return short ? `주간 ${count}회` : `캐릭터 주간 ${count}회`;
  if (item.limitKind === 'weekly-roster') return short ? `원정대 ${count}회` : `원정대 주간 ${count}회`;
  return '무제한';
}

function boundLabel(item: ShopItem): string {
  if (item.boundType === 'tradeable') return '거래 가능';
  if (item.boundType === 'roster-bound') return '원정대 귀속';
  return '캐릭터 귀속';
}

function boundColor(item: ShopItem): string {
  if (item.boundType === 'tradeable') return '#27ae60';
  if (item.boundType === 'roster-bound') return '#3a7bb8';
  return '#7c8a99';
}

export default function CerkaPage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedShopItem, setSelectedShopItem] = useState<number | null>(null);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [materialChecks, setMaterialChecks] = useState<Record<string, Record<string, Record<string, boolean>>>>({});

  // 재련 재료 상자 체크 상태 (가시 단가 산출에 포함할지)
  const [refineRandomChecks, setRefineRandomChecks] = useState<Record<string, boolean>>({});
  const isRefineRandomChecked = (itemId: string) => refineRandomChecks[itemId] ?? true;
  const toggleRefineRandomCheck = (itemId: string) => setRefineRandomChecks(prev => ({ ...prev, [itemId]: !isRefineRandomChecked(itemId) }));

  // 보조 재료 주머니 체크 상태
  const [auxRandomChecks, setAuxRandomChecks] = useState<Record<string, boolean>>({});
  const isAuxRandomChecked = (itemId: string) => auxRandomChecks[itemId] ?? true;
  const toggleAuxRandomCheck = (itemId: string) => setAuxRandomChecks(prev => ({ ...prev, [itemId]: !isAuxRandomChecked(itemId) }));

  const selectedStageData = STAGES.find(s => s.name === selectedStage);

  // 가격 헬퍼
  const getUnitPrice = (itemId: string) => {
    if (itemId === '0') return 0;
    const bundlePrice = latestPrices[itemId] || 0;
    const bundleSize = BUNDLE_SIZES[itemId] || 1;
    return bundlePrice / bundleSize;
  };

  // 고통의 가시 1개 가치 = 재련 재료 상자 기댓값 ÷ 5
  const thornUnitPrice = REFINE_RANDOM_COMPONENTS.reduce((sum, comp) => {
    if (!isRefineRandomChecked(comp.itemId)) return sum;
    return sum + getUnitPrice(comp.itemId) * comp.amount * comp.probability;
  }, 0) / REFINE_RANDOM_THORN_COST;

  const getMaterialValue = (mat: Material) => {
    if (mat.name === '고통의 가시') return Math.round(thornUnitPrice * mat.amount);
    if (mat.itemId === '0' || mat.amount === 0) return 0;
    return Math.round(getUnitPrice(mat.itemId) * mat.amount);
  };

  // 체크 상태 (기본 true)
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

  // 시세 조회
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
                세르카 계산
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                세르카 클리어 보상과 고통의 가시 교환 효율
              </p>
            </div>

            {/* 3개 단계 이미지 카드 */}
            <div className={styles.raidCardsGrid}>
              {STAGES.map((stage, index) => {
                const isSelected = selectedStage === stage.name;
                const totalGold = stage.gates.reduce((sum, g) => sum + g.gold, 0);
                const totalMoreGoldCard = stage.gates.reduce((sum, g) => sum + g.moreGold, 0);
                const totalBasicValueCard = stage.gates.reduce((sum, g) =>
                  sum + g.materials.reduce((s, m) => s + getMaterialValue(m), 0), 0);
                const totalMoreValueCard = stage.gates.reduce((sum, g) =>
                  sum + g.moreMaterials.reduce((s, m) => s + getMaterialValue(m), 0), 0);
                const cardFinalValue = totalGold + totalBasicValueCard + totalMoreValueCard - totalMoreGoldCard;
                const totalThorn = stage.gates.reduce((sum, g) => {
                  const basicThorn = g.materials.find(m => m.name === '고통의 가시');
                  const moreThorn = g.moreMaterials.find(m => m.name === '고통의 가시');
                  return sum + (basicThorn?.amount || 0) + (moreThorn?.amount || 0);
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
                      {totalThorn > 0 && (
                        <div className={styles.graceBadge}>가시 {totalThorn}개</div>
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
                mats.reduce((s, m) => s + (isChecked(sn, type, gate, m.itemId) ? getMaterialValue(m) : 0), 0);

              const totalClearGold = selectedStageData.gates.reduce((s, g) => s + g.gold, 0);
              const totalMoreGold = selectedStageData.gates.reduce((s, g) => s + g.moreGold, 0);
              const totalBasicValue = selectedStageData.gates.reduce((s, g) => s + getCheckedValue(g.materials, 'basic', g.gate), 0);
              const totalMoreValue = selectedStageData.gates.reduce((s, g) => s + getCheckedValue(g.moreMaterials, 'more', g.gate), 0);
              const finalValue = totalClearGold + totalBasicValue + totalMoreValue - totalMoreGold;

              const renderMaterialTable = (mats: Material[], type: string, gate: number, _colSpan: number) => (
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
                        <td>{mat.name === '고통의 가시' ? (priceLoading ? '—' : thornUnitPrice >= 1 ? thornUnitPrice.toFixed(2) : thornUnitPrice.toFixed(4)) : mat.itemId === '0' ? '-' : priceLoading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)}</td>
                        <td>{mat.name === '고통의 가시' ? (priceLoading ? '—' : totalPrice.toLocaleString()) : mat.itemId === '0' || mat.amount === 0 ? '-' : priceLoading ? '—' : totalPrice.toLocaleString()}</td>
                      </tr>
                      );
                    })}
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
                          <div className={styles.goldValue}>{gate.gold.toLocaleString()}</div>
                        </div>
                        {renderMaterialTable(gate.materials, 'basic', gate.gate, 4)}
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
                          <div className={styles.costValue}>-{gate.moreGold.toLocaleString()}</div>
                        </div>
                        {renderMaterialTable(gate.moreMaterials, 'more', gate.gate, 4)}
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

            {/* 고통의 가시 상점 */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Card className={styles.shopCard}>
                <Card.Header className={styles.shopCardHeader}>
                  <h3 className={styles.shopCardTitle}>
                    고통의 가시 상점
                  </h3>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className={styles.shopContainer}>
                    <div className={styles.shopList}>
                      <div className={styles.shopListHeader}>
                        고통의 가시 교환 목록
                      </div>
                      {SHOP_ITEMS.map((item) => {
                        const tc = THEME_COLORS[item.theme] || THEME_COLORS.craft;
                        const isActive = selectedShopItem === item.id;
                        const thornCost = item.costs.find(c => c.name === '고통의 가시')?.amount || 0;
                        const goldCost = item.costs.find(c => c.name === '골드')?.amount || 0;
                        const totalGoldCost = Math.round(thornCost * thornUnitPrice) + goldCost;
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
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
                                  {limitLabel(item, true)}
                                </span>
                                <span
                                  className={styles.limitBadge}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '0.1rem 0.35rem',
                                    color: boundColor(item),
                                    background: `${boundColor(item)}18`,
                                    border: `1px solid ${boundColor(item)}40`,
                                  }}
                                >
                                  {boundLabel(item)}
                                </span>
                              </div>
                            </div>
                            <div className={styles.shopItemCostBadge}>
                              {isFree ? (
                                <span className={styles.shopItemFree}>무료</span>
                              ) : priceLoading ? (
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
                        const tc = THEME_COLORS[sd.theme] || THEME_COLORS.craft;

                        const thornCost = sd.costs.find(c => c.name === '고통의 가시')?.amount || 0;
                        const goldCost = sd.costs.find(c => c.name === '골드')?.amount || 0;
                        const totalGoldCost = Math.round(thornCost * thornUnitPrice) + goldCost;
                        const isFree = sd.costs.length === 0;

                        // 아이템 가치 / 명칭 (효율 표시용)
                        let itemValue = 0;
                        let valueName = '';
                        let canShowEfficiency = false;

                        if (sd.theme === 'craft') {
                          const c = CRAFT_TRADEABLE[sd.id];
                          if (c) {
                            const unit = latestPrices[c.itemId] || 0;
                            itemValue = Math.round(unit * sd.qty);
                            valueName = '아이템 가치';
                            canShowEfficiency = true;
                          }
                        } else if (sd.theme === 'refine') {
                          // 박스 기댓값 = Σ(price × amount × prob), 체크된 항목만
                          const expected = REFINE_RANDOM_COMPONENTS.reduce((sum, comp) => {
                            if (!isRefineRandomChecked(comp.itemId)) return sum;
                            return sum + getUnitPrice(comp.itemId) * comp.amount * comp.probability;
                          }, 0);
                          itemValue = Math.round(expected * sd.qty);
                          valueName = '상자 기댓값';
                          canShowEfficiency = true;
                        } else if (sd.theme === 'aux') {
                          const expected = AUX_RANDOM_COMPONENTS.reduce((sum, comp) => {
                            if (!isAuxRandomChecked(comp.itemId)) return sum;
                            return sum + getUnitPrice(comp.itemId) * comp.amount * comp.probability;
                          }, 0);
                          itemValue = Math.round(expected * sd.qty);
                          valueName = '상자 기댓값';
                          canShowEfficiency = true;
                        } else if (sd.theme === 'gemRandom') {
                          itemValue = Math.round(GEM_RANDOM_HERO_PROBS.reduce((sum, gem) => sum + (latestPrices[gem.itemId] || 0) * gem.probability, 0) * sd.qty);
                          valueName = '상자 기댓값';
                          canShowEfficiency = true;
                        }

                        return (
                          <div className={styles.shopDetailContent} style={(sd.theme === 'gemRandom') ? { maxWidth: '600px' } : (sd.theme === 'refine' || sd.theme === 'aux') ? { maxWidth: '550px' } : undefined}>
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

                            {/* 2. 레벨 + 한도 + 귀속 */}
                            <div className={styles.shopCompactInfo}>
                              <span className={styles.shopCompactItem} style={{ color: tc.accent }}>
                                Lv.{sd.requiredLevel}
                              </span>
                              <span className={styles.shopCompactDivider}>·</span>
                              <span
                                className={styles.limitBadge}
                                style={{
                                  color: tc.accent,
                                  background: `${tc.accent}18`,
                                  border: `1px solid ${tc.accent}40`,
                                }}
                              >
                                {limitLabel(sd)}
                              </span>
                              <span className={styles.shopCompactDivider}>·</span>
                              <span
                                className={styles.limitBadge}
                                style={{
                                  color: boundColor(sd),
                                  background: `${boundColor(sd)}18`,
                                  border: `1px solid ${boundColor(sd)}40`,
                                }}
                              >
                                {boundLabel(sd)}
                              </span>
                            </div>

                            {/* 3. 교환 비용 */}
                            <div className={styles.shopDetailSection}>
                              <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>교환 비용</div>
                              {sd.costs.length > 0 ? (
                                <div className={styles.shopDetailCostList}>
                                  {sd.costs.map((cost, idx) => (
                                    <div key={idx} className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                      {cost.name === '골드' && (
                                        <Image src="/gold.webp" alt="골드" width={24} height={24} />
                                      )}
                                      {cost.name === '고통의 가시' && (
                                        <Image src="/pulsating-thorn.webp" alt="고통의 가시" width={24} height={24} />
                                      )}
                                      <span className={styles.costName}>{cost.name === '골드' ? '' : `${cost.name} `}</span>
                                      <span className={styles.costShortName}>{cost.name === '고통의 가시' ? '가시 ' : cost.name === '골드' ? '' : `${cost.name} `}</span>
                                      <span>{cost.amount.toLocaleString()}</span>
                                    </div>
                                  ))}
                                  {!priceLoading && thornUnitPrice > 0 && thornCost > 0 && (
                                    <div className={styles.costTotalRow}>
                                      <span className={styles.costTotalEquals}>=</span>
                                      <Image src="/gold.webp" alt="" width={18} height={18} />
                                      <span className={styles.costTotalValue}>{totalGoldCost.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={styles.shopDetailCostList}>
                                  <div className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                    <span>무료</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 4. 구성 요소 — 테마별 렌더링 */}
                            {sd.theme === 'craft' && (() => {
                              const c = CRAFT_TRADEABLE[sd.id] || CRAFT_TRADEABLE[1];
                              const unit = latestPrices[c.itemId] || 0;
                              const value = Math.round(unit * sd.qty);
                              return (
                                <div className={styles.shopDetailSection}>
                                  <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소</div>
                                  <table className={styles.materialTable} style={{ marginBottom: '0.75rem' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ textAlign: 'center' }}>아이템</th>
                                        <th style={{ textAlign: 'center' }}>수량</th>
                                        <th style={{ textAlign: 'center' }}>단가</th>
                                        <th style={{ textAlign: 'center' }}>가치</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td style={{ textAlign: 'center' }}>
                                          <Image src={c.icon} alt={c.name} width={32} height={32} title={c.name} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{sd.qty.toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Image src="/gold.webp" alt="" width={14} height={14} />
                                            <span>{priceLoading ? '—' : unit ? unit.toLocaleString() : '-'}</span>
                                          </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Image src="/gold.webp" alt="" width={14} height={14} />
                                            <span>{priceLoading ? '—' : value.toLocaleString()}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}

                            {sd.theme === 'refine' && (() => {
                              let boxExpected = 0;
                              const rows = REFINE_RANDOM_COMPONENTS.map(comp => {
                                const unit = getUnitPrice(comp.itemId);
                                const checked = isRefineRandomChecked(comp.itemId);
                                const expected = unit * comp.amount * comp.probability;
                                if (checked) boxExpected += expected;
                                return { ...comp, unit, expected, checked };
                              });
                              const thornGraceValue = Math.round(boxExpected / REFINE_RANDOM_THORN_COST);
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
                                            <span>{priceLoading ? '—' : Math.round(boxExpected).toLocaleString()}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                  <div className={styles.graceValueCard}>
                                    <div className={styles.graceValueRow}>
                                      <div className={styles.graceValueLabel}>
                                        <Image src="/pulsating-thorn.webp" alt="고통의 가시" width={28} height={28} />
                                        <span>고통의 가시 1개 가치</span>
                                      </div>
                                      <div className={styles.graceValueAmount}>
                                        <Image src="/gold.webp" alt="골드" width={20} height={20} />
                                        <span>{priceLoading ? '—' : thornGraceValue.toLocaleString()}</span>
                                        <span className={styles.graceValueUnit}>G</span>
                                      </div>
                                    </div>
                                    <div className={styles.graceValueFormula}>
                                      상자 기댓값 {priceLoading ? '—' : Math.round(boxExpected).toLocaleString()}G ÷ 가시 {REFINE_RANDOM_THORN_COST}개
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
                                        <td colSpan={5}>상자 기댓값</td>
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

                            {sd.theme === 'gemRandom' && (
                              <div className={styles.shopDetailSection}>
                                <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소 (영웅 ~ 고급)</div>
                                <div className={styles.gemTableRow}>
                                  {[GEM_RANDOM_HERO_PROBS.slice(0, 3), GEM_RANDOM_HERO_PROBS.slice(3, 6)].map((gems, gi) => (
                                    <table key={gi} className={styles.materialTable} style={{ flex: 1 }}>
                                      <thead>
                                        <tr>
                                          <th style={{ width: '33%' }}>{gi === 0 ? '질서' : '혼돈'}</th>
                                          <th style={{ textAlign: 'center', width: '28%' }}>확률</th>
                                          <th style={{ textAlign: 'center', width: '39%' }}>시세</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {gems.map((gem) => {
                                          const price = latestPrices[gem.itemId] || 0;
                                          return (
                                            <tr key={gem.itemId}>
                                              <td>
                                                <div className={styles.materialCell}>
                                                  <Image src={gem.icon} alt={gem.name} width={28} height={28} />
                                                  <span>{gem.name.replace(/질서의 젬 : |혼돈의 젬 : /, '')}</span>
                                                </div>
                                              </td>
                                              <td style={{ textAlign: 'center' }}>{(gem.probability * 100).toFixed(2)}%</td>
                                              <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                  <Image src="/gold.webp" alt="" width={14} height={14} />
                                                  <span>{priceLoading ? '—' : price.toLocaleString()}</span>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  ))}
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
                                    {!isFree && (
                                      <div className={styles.efficiencyRow}>
                                        <span className={styles.efficiencyLabel}>교환 비용</span>
                                        <span className={styles.efficiencyValue}>
                                          <Image src="/gold.webp" alt="" width={16} height={16} />
                                          {totalGoldCost.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    <div className={styles.efficiencyResultRow}>
                                      <span className={styles.efficiencyResultLabel}>
                                        {isFree ? '순이익' : '효율'}
                                      </span>
                                      {isFree ? (
                                        <span className={styles.efficiencyResultValue} style={{ color: '#27ae60' }}>
                                          +{itemValue.toLocaleString()}G
                                        </span>
                                      ) : efficiency !== null ? (
                                        <span className={styles.efficiencyResultValue} style={{ color: efficiency >= 100 ? '#27ae60' : '#c0392b' }}>
                                          {efficiency}%
                                          <span className={styles.efficiencyProfitTag} style={{
                                            color: efficiency >= 100 ? '#27ae60' : '#c0392b',
                                            background: efficiency >= 100 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(192, 57, 43, 0.1)',
                                          }}>
                                            {efficiency >= 100 ? `+${(itemValue - totalGoldCost).toLocaleString()}G` : `${(itemValue - totalGoldCost).toLocaleString()}G`}
                                          </span>
                                        </span>
                                      ) : null}
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

          </Col>
        </Row>
      </Container>
    </div>
  );
}
