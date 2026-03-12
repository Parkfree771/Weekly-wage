'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import styles from './cathedral.module.css';

// 영웅 젬 구성 요소
const GEM_COMPONENTS = [
  { itemId: '67400003', name: '질서의 젬 : 안정', icon: '/gem-order-stable.webp' },
  { itemId: '67400103', name: '질서의 젬 : 견고', icon: '/gem-order-solid.webp' },
  { itemId: '67400203', name: '질서의 젬 : 불변', icon: '/gem-order-immutable.webp' },
  { itemId: '67410303', name: '혼돈의 젬 : 침식', icon: '/gem-chaos-erosion.webp' },
  { itemId: '67410403', name: '혼돈의 젬 : 왜곡', icon: '/gem-chaos-distortion.webp' },
  { itemId: '67410503', name: '혼돈의 젬 : 붕괴', icon: '/gem-chaos-collapse.webp' },
];

// 재련 재료 상자 구성 요소
const REFINE_COMPONENTS = [
  { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/destiny-destruction-stone2.webp' },
  { itemId: '66102107', name: '운명의 수호석 결정', icon: '/destiny-guardian-stone2.webp' },
  { itemId: '66110226', name: '위대한 운명의 돌파석', icon: '/destiny-breakthrough-stone2.webp' },
  { itemId: '66130143', name: '운명의 파편 주머니(대)', icon: '/destiny-shard-bag-large.webp' },
];

// 야금술 상자 구성 요소
const METALLURGY_COMPONENTS = [
  { itemId: '66112715', name: '장인의 야금술 : 3단계', icon: '/master-metallurgy-3.webp' },
  { itemId: '66112717', name: '장인의 야금술 : 4단계', icon: '/master-metallurgy-4.webp' },
  { itemId: '66112551', name: '야금술 : 업화 [15-18]', icon: '/metallurgy-karma.webp' },
  { itemId: '66112553', name: '야금술 : 업화 [19-20]', icon: '/metallurgy-karma.webp' },
];

// 재봉술 상자 구성 요소
const TAILORING_COMPONENTS = [
  { itemId: '66112716', name: '장인의 재봉술 : 3단계', icon: '/master-tailoring-3.webp' },
  { itemId: '66112718', name: '장인의 재봉술 : 4단계', icon: '/master-tailoring-4.webp' },
  { itemId: '66112552', name: '재봉술 : 업화 [15-18]', icon: '/tailoring-karma.webp' },
  { itemId: '66112554', name: '재봉술 : 업화 [19-20]', icon: '/tailoring-karma.webp' },
];

// 고대 코어 구성 요소
const ANCIENT_CORE_COMPONENTS = [
  { itemId: '0', name: '질서의 해', icon: '/wlftjdmlgo.webp' },
  { itemId: '0', name: '질서의 달', icon: '/wlftjdmlekf.webp' },
  { itemId: '0', name: '질서의 별', icon: '/wlftjdmlquf.webp' },
  { itemId: '0', name: '혼돈의 해', icon: '/ghsehsdmlgo.webp' },
  { itemId: '0', name: '혼돈의 달', icon: '/ghsehsdmlekf.webp' },
  { itemId: '0', name: '혼돈의 별', icon: '/ghsehsdmlquf.webp' },
];

// 유물 코어 구성 요소
const RELIC_CORE_COMPONENTS = [
  { itemId: '0', name: '질서의 해', icon: '/wlftjdmlgo2.png' },
  { itemId: '0', name: '질서의 달', icon: '/wlftjdmlekf2.png' },
  { itemId: '0', name: '질서의 별', icon: '/wlftjdmlquf2.png' },
  { itemId: '0', name: '혼돈의 해', icon: '/ghsehsdmlgo2.png' },
  { itemId: '0', name: '혼돈의 달', icon: '/ghsehsdmlekf2.png' },
  { itemId: '0', name: '혼돈의 별', icon: '/ghsehsdmlquf2.png' },
];

// 재료 이미지 매핑
const MATERIAL_IMAGES: { [key: string]: string } = {
  '운명의 파괴석 결정': '/destiny-destruction-stone2.webp',
  '운명의 수호석 결정': '/destiny-guardian-stone2.webp',
  '위대한 운명의 돌파석': '/destiny-breakthrough-stone2.webp',
  '운명의 파괴석': '/destiny-destruction-stone.webp',
  '운명의 수호석': '/destiny-guardian-stone.webp',
  '운명의 돌파석': '/destiny-breakthrough-stone.webp',
  '운명의 파편': '/destiny-shard-bag-large.webp',
  '코어': '/cerka-core2.webp',
};

// 묶음 단위 (개당 가격 = 시세 / bundleSize)
const BUNDLE_SIZES: { [key: string]: number } = {
  '66102007': 100,  // 파괴석 결정
  '66102107': 100,  // 수호석 결정
  '66110226': 1,    // 위대한 돌파석
  '66130143': 3000, // 운명의 파편 주머니(대) = 3000파편
  '66102006': 100,  // 파괴석
  '66102106': 100,  // 수호석
  '66110225': 1,    // 돌파석
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

// 지평의 성당 단계별 보상 데이터
const STAGES: {
  name: string;
  level: number;
  image: string;
  gates: Gate[];
}[] = [
  {
    name: '지평의 성당 3단계', level: 1750, image: '/wlvuddmltjdekd2.webp',
    gates: [
      { gate: 1, gold: 20000, moreGold: 6400,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 24 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 24 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
      },
      { gate: 2, gold: 30000, moreGold: 9600,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 36 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 0 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 0 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 36 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
      },
    ],
  },
  {
    name: '지평의 성당 2단계', level: 1720, image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 16000, moreGold: 5120,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 12 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 12 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
      { gate: 2, gold: 24000, moreGold: 7680,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 18 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 18 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
    ],
  },
  {
    name: '지평의 성당 1단계', level: 1700, image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 13500, moreGold: 4320,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 4 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 4 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
      { gate: 2, gold: 16500, moreGold: 5280,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 6 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 0 },
          { name: '운명의 수호석', itemId: '66102106', amount: 0 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 0 },
          { name: '운명의 파편', itemId: '66130143', amount: 0 },
          { name: '은총의 파편', itemId: '0', amount: 6 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
    ],
  },
];

// 테마 색상 매핑
const THEME_COLORS: { [key: string]: { name: string; accent: string; bg: string; border: string; iconBg: string } } = {
  ancient:   { name: '#d4c5a0', accent: '#b89d6a', bg: 'rgba(212, 197, 160, 0.06)', border: 'rgba(184, 157, 106, 0.3)', iconBg: 'rgba(42, 26, 10, 0.8)' },
  relic:     { name: '#e8944c', accent: '#b85c1e', bg: 'rgba(184, 92, 30, 0.06)', border: 'rgba(184, 92, 30, 0.3)', iconBg: 'rgba(26, 10, 0, 0.8)' },
  gem:       { name: '#a78bfa', accent: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.06)', border: 'rgba(139, 92, 246, 0.3)', iconBg: 'rgba(55, 30, 100, 0.8)' },
  craft:     { name: '#c9a84c', accent: '#a8893a', bg: 'rgba(201, 168, 76, 0.06)', border: 'rgba(201, 168, 76, 0.3)', iconBg: 'rgba(60, 45, 15, 0.8)' },
  refine:    { name: '#e06050', accent: '#c0392b', bg: 'rgba(192, 57, 43, 0.06)', border: 'rgba(192, 57, 43, 0.3)', iconBg: 'rgba(50, 15, 15, 0.8)' },
  gemRandom: { name: '#9b8dd4', accent: '#7c5cbf', bg: 'rgba(124, 92, 191, 0.06)', border: 'rgba(124, 92, 191, 0.3)', iconBg: 'rgba(40, 25, 80, 0.8)' },
};

// 은총의 파편 상점 데이터
const SHOP_ITEMS = [
  {
    id: 1, name: '유물 코어 랜덤 선택 상자', qty: 1, requiredLevel: 1700,
    image: '/dbanfzhdj.webp', theme: 'relic', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 10 }, { name: '골드', amount: 20000 }],
    limit: '영구 캐릭터 1회', limitType: 'once' as const,
  },
  {
    id: 2, name: '유물 코어 선택 상자', qty: 1, requiredLevel: 1720,
    image: '/dbanfzhdj.webp', theme: 'relic', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 100 }, { name: '골드', amount: 50000 }],
    limit: '영구 캐릭터 1회', limitType: 'once' as const,
  },
  {
    id: 3, name: '고대 코어 선택 상자', qty: 1, requiredLevel: 1760,
    image: '/rheozhdj.webp', theme: 'ancient', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 400 }, { name: '코어 정수', amount: 400 }, { name: '골드', amount: 200000 }],
    limit: '영구 캐릭터 1회', limitType: 'once' as const,
  },
  {
    id: 4, name: '영웅 젬 선택 상자', qty: 1, requiredLevel: 1700,
    image: '/gem-hero.webp', theme: 'gem', hasBg: false,
    costs: [], limit: '영구 캐릭터 1회', limitType: 'once' as const,
  },
  {
    id: 5, name: '영웅 젬 선택 상자', qty: 1, requiredLevel: 1720,
    image: '/gem-hero.webp', theme: 'gem', hasBg: false,
    costs: [{ name: '은총의 파편', amount: 10 }, { name: '골드', amount: 10000 }],
    limit: '영구 캐릭터 1회', limitType: 'once' as const,
  },
  {
    id: 6, name: '영웅 젬 선택 상자', qty: 2, requiredLevel: 1750,
    image: '/gem-hero.webp', theme: 'gem', hasBg: false,
    costs: [], limit: '영구 캐릭터 1회', limitType: 'once' as const,
  },
  {
    id: 7, name: '지평의 야금술 선택 상자', qty: 1, requiredLevel: 1700,
    image: '/master-metallurgy-4.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 10 }],
    limit: '제한 없음', limitType: 'unlimited' as const,
  },
  {
    id: 8, name: '지평의 재봉술 선택 상자', qty: 3, requiredLevel: 1700,
    image: '/master-tailoring-4.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 10 }],
    limit: '제한 없음', limitType: 'unlimited' as const,
  },
  {
    id: 9, name: '지평의 재련 재료 상자', qty: 1, requiredLevel: 1730,
    image: '/wofuswofy.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 60 }],
    limit: '제한 없음', limitType: 'unlimited' as const,
  },
  {
    id: 10, name: '젬 랜덤 상자', qty: 1, requiredLevel: 1700,
    image: '/duddndgmlrnl.webp', theme: 'gemRandom', hasBg: false,
    costs: [{ name: '은총의 파편', amount: 10 }],
    limit: '제한 없음', limitType: 'unlimited' as const,
  },
  {
    id: 11, name: '고대 코어 랜덤 상자', qty: 1, requiredLevel: 1750,
    image: '/rheozhdj.webp', theme: 'ancient', hasBg: true,
    costs: [{ name: '은총의 파편', amount: 400 }, { name: '코어 정수', amount: 400 }, { name: '골드', amount: 100000 }],
    limit: '제한 없음', limitType: 'unlimited' as const,
  },
];

export default function CathedralPage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedShopItem, setSelectedShopItem] = useState<number | null>(null);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [materialChecks, setMaterialChecks] = useState<Record<string, Record<string, Record<string, boolean>>>>({});

  const selectedStageData = STAGES.find(s => s.name === selectedStage);

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
                지평의 성당
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                어비스 던전 지평의 성당 클리어 보상과 은총의 파편 교환 상점
              </p>
            </div>

            {/* 3개 단계 이미지 카드 */}
            <div className={styles.raidCardsGrid}>
              {STAGES.map((stage, index) => {
                const isSelected = selectedStage === stage.name;
                const totalGold = stage.gates.reduce((sum, g) => sum + g.gold, 0);
                const totalGrace = stage.gates.reduce((sum, g) => {
                  const grace = g.materials.find(m => m.name === '은총의 파편');
                  return sum + (grace?.amount || 0);
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
                      <div className={styles.goldBadge}>{totalGold.toLocaleString()}G</div>
                      <div className={styles.graceBadge}>은총 {totalGrace}개</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 선택한 단계 상세 */}
            {selectedStageData && (() => {
              const sn = selectedStageData.name;
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
              const getCheckedValue = (mats: Material[], type: string, gate: number) =>
                mats.reduce((s, m) => s + (isChecked(sn, type, gate, m.itemId) ? getMaterialValue(m) : 0), 0);

              const totalClearGold = selectedStageData.gates.reduce((s, g) => s + g.gold, 0);
              const totalMoreGold = selectedStageData.gates.reduce((s, g) => s + g.moreGold, 0);
              const totalBasicValue = selectedStageData.gates.reduce((s, g) => s + getCheckedValue(g.materials, 'basic', g.gate), 0);
              const totalMoreValue = selectedStageData.gates.reduce((s, g) => s + getCheckedValue(g.moreMaterials, 'more', g.gate), 0);
              const finalValue = totalClearGold + totalBasicValue + totalMoreValue - totalMoreGold;

              const renderMaterialTable = (mats: Material[], type: string, gate: number, colSpan: number) => (
                <table className={styles.materialTable}>
                  <colgroup>
                    <col style={{ width: '32px' }} />
                    <col />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '115px' }} />
                  </colgroup>
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
                              <Image src={MATERIAL_IMAGES[mat.name]} alt={mat.name} width={38} height={38} />
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

            {/* 은총의 파편 상점 */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Card className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: 'transparent' }}>
                <Card.Header
                  className="text-center py-2 border-0"
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    borderBottom: '2px solid rgba(201, 168, 76, 0.3)',
                  }}
                >
                  <h3 className="mb-0" style={{
                    fontWeight: 700,
                    fontSize: 'clamp(1.05rem, 2.2vw, 1.2rem)',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.025em'
                  }}>
                    은총의 파편 상점
                  </h3>
                </Card.Header>
                <Card.Body className="p-0" style={{ backgroundColor: 'var(--card-bg)' }}>
                  {/* 데스크톱: 좌우 분할 */}
                  <div className={styles.shopContainer}>
                    <div className={styles.shopList}>
                      <div className={styles.shopListHeader}>
                        은총의 파편 교환 목록
                      </div>
                      {SHOP_ITEMS.map((item) => {
                        const tc = THEME_COLORS[item.theme];
                        const isActive = selectedShopItem === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`${styles.shopItem} ${isActive ? styles.active : ''}`}
                            onClick={() => setSelectedShopItem(isActive ? null : item.id)}
                            style={isActive ? {
                              background: tc.bg,
                              borderLeftColor: tc.accent,
                            } : undefined}
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
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.shopDetail}>
                      {selectedShopData ? (() => {
                        const tc = THEME_COLORS[selectedShopData.theme];
                        const components = selectedShopData.theme === 'gem' ? GEM_COMPONENTS
                          : selectedShopData.theme === 'refine' ? REFINE_COMPONENTS
                          : selectedShopData.theme === 'ancient' ? ANCIENT_CORE_COMPONENTS
                          : selectedShopData.theme === 'relic' ? RELIC_CORE_COMPONENTS
                          : selectedShopData.id === 7 ? METALLURGY_COMPONENTS
                          : selectedShopData.id === 8 ? TAILORING_COMPONENTS
                          : null;
                        return (
                          <div className={styles.shopDetailContent}>
                            {/* 1. 아이콘 + 이름 */}
                            <div className={styles.shopDetailTop}>
                              {selectedShopData.hasBg ? (
                                <div className={styles.shopDetailIconFill}>
                                  <Image src={selectedShopData.image} alt="" width={130} height={130} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                </div>
                              ) : (
                                <div className={styles.shopDetailIcon} style={{ borderColor: tc.border, background: tc.iconBg }}>
                                  <Image src={selectedShopData.image} alt="" width={110} height={110} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                </div>
                              )}
                              <div className={styles.shopDetailName} style={{ color: tc.name }}>
                                {selectedShopData.name}{selectedShopData.qty > 1 && <span style={{ color: tc.accent }}> x{selectedShopData.qty}</span>}
                              </div>
                            </div>

                            {/* 2. 레벨 + 제한 */}
                            <div className={styles.shopCompactInfo}>
                              <span className={styles.shopCompactItem} style={{ color: tc.accent }}>
                                Lv.{selectedShopData.requiredLevel}
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
                                {selectedShopData.limitType === 'once' ? '캐릭터 1회' : '무제한'}
                              </span>
                            </div>

                            {/* 3. 교환 비용 (항상 같은 영역) */}
                            <div className={styles.shopDetailSection}>
                              <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>교환 비용</div>
                              {selectedShopData.costs.length > 0 ? (
                                <div className={styles.shopDetailCostList}>
                                  {selectedShopData.costs.map((cost, idx) => (
                                    <div key={idx} className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                      {cost.name === '골드' && (
                                        <Image src="/gold.webp" alt="골드" width={24} height={24} />
                                      )}
                                      {cost.name === '코어 정수' && (
                                        <Image src="/wjdtn.webp?v=2" alt="코어 정수" width={24} height={24} />
                                      )}
                                      <span>{cost.name === '골드' ? '' : `${cost.name} `}{cost.amount.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className={styles.shopDetailCostList}>
                                  <div className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                    <span>무료</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 4. 구성 요소 (해당 시) */}
                            {components && (
                              <div className={styles.shopDetailSection}>
                                <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소</div>
                                <div className={styles.gemGrid}>
                                  {components.map((comp) => comp.itemId === '0' ? (
                                    <div key={comp.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                      <Image src={comp.icon} alt={comp.name} width={100} height={100} />
                                      <span className={styles.gemName}>{comp.name}</span>
                                    </div>
                                  ) : (
                                    <div key={comp.name} className={styles.gemCard} style={{ background: tc.bg, borderColor: tc.border }}>
                                      <Image src={comp.icon} alt={comp.name} width={48} height={48} />
                                      <span className={styles.gemName}>{comp.name}</span>
                                      <div className={styles.gemPrice}>
                                        <Image src="/gold.webp" alt="골드" width={16} height={16} />
                                        <span>{priceLoading ? '—' : latestPrices[comp.itemId] ? latestPrices[comp.itemId].toLocaleString() : '-'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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
