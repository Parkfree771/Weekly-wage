'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

// 젬 랜덤 상자 영웅 확률 (5% × 개별 확률)
const GEM_RANDOM_HERO_PROBS: { itemId: string; name: string; icon: string; probability: number }[] = [
  { itemId: '67400003', name: '질서의 젬 : 안정', icon: '/gem-order-stable.webp', probability: 0.015 },
  { itemId: '67400103', name: '질서의 젬 : 견고', icon: '/gem-order-solid.webp', probability: 0.0075 },
  { itemId: '67400203', name: '질서의 젬 : 불변', icon: '/gem-order-immutable.webp', probability: 0.0025 },
  { itemId: '67410303', name: '혼돈의 젬 : 침식', icon: '/gem-chaos-erosion.webp', probability: 0.015 },
  { itemId: '67410403', name: '혼돈의 젬 : 왜곡', icon: '/gem-chaos-distortion.webp', probability: 0.0075 },
  { itemId: '67410503', name: '혼돈의 젬 : 붕괴', icon: '/gem-chaos-collapse.webp', probability: 0.0025 },
];

// 재련 재료 상자 구성 요소 (은총 60개 소모)
const REFINE_COMPONENTS = [
  { itemId: '66102007', name: '운명의 파괴석 결정', icon: '/destiny-destruction-stone2.webp', amount: 2000 },
  { itemId: '66102107', name: '운명의 수호석 결정', icon: '/destiny-guardian-stone2.webp', amount: 4000 },
  { itemId: '66110226', name: '위대한 운명의 돌파석', icon: '/destiny-breakthrough-stone2.webp', amount: 60 },
  { itemId: '66130143', name: '운명의 파편', icon: '/destiny-shard-bag-large.webp', amount: 22500 },
];
const REFINE_BOX_GRACE_COST = 60; // 재련 상자 1개당 은총 소모량

// 야금술 상자 구성 요소
const METALLURGY_COMPONENTS = [
  { itemId: '66112553', name: '야금술 : 업화 [19-20]', icon: '/metallurgy-karma.webp', amount: 1 },
  { itemId: '66112717', name: '장인의 야금술 : 4단계', icon: '/master-metallurgy-4.webp', amount: 1 },
  { itemId: '66112715', name: '장인의 야금술 : 3단계', icon: '/master-metallurgy-3.webp', amount: 2 },
];

// 재봉술 상자 구성 요소
const TAILORING_COMPONENTS = [
  { itemId: '66112554', name: '재봉술 : 업화 [19-20]', icon: '/tailoring-karma.webp', amount: 1 },
  { itemId: '66112718', name: '장인의 재봉술 : 4단계', icon: '/master-tailoring-4.webp', amount: 1 },
  { itemId: '66112716', name: '장인의 재봉술 : 3단계', icon: '/master-tailoring-3.webp', amount: 2 },
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
  { itemId: '0', name: '질서의 해', icon: '/wlftjdmlgo2.webp' },
  { itemId: '0', name: '질서의 달', icon: '/wlftjdmlekf2.webp' },
  { itemId: '0', name: '질서의 별', icon: '/wlftjdmlquf2.webp' },
  { itemId: '0', name: '혼돈의 해', icon: '/ghsehsdmlgo2.webp' },
  { itemId: '0', name: '혼돈의 달', icon: '/ghsehsdmlekf2.webp' },
  { itemId: '0', name: '혼돈의 별', icon: '/ghsehsdmlquf2.webp' },
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
  '은총의 파편': '/dmschddmlvkvus.webp',
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

// 성당 단계별 보상 데이터
const STAGES: {
  name: string;
  level: number;
  image: string;
  gates: Gate[];
}[] = [
  {
    name: '성당 3단계', level: 1750, image: '/wlvuddmltjdekd2.webp',
    gates: [
      { gate: 1, gold: 20000, moreGold: 6400,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 405 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 810 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 8 },
          { name: '운명의 파편', itemId: '66130143', amount: 9100 },
          { name: '은총의 파편', itemId: '0', amount: 24 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 860 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 1720 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 36 },
          { name: '운명의 파편', itemId: '66130143', amount: 19000 },
          { name: '은총의 파편', itemId: '0', amount: 24 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
      },
      { gate: 2, gold: 30000, moreGold: 9600,
        materials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 500 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 1000 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 12 },
          { name: '운명의 파편', itemId: '66130143', amount: 11000 },
          { name: '은총의 파편', itemId: '0', amount: 36 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석 결정', itemId: '66102007', amount: 1430 },
          { name: '운명의 수호석 결정', itemId: '66102107', amount: 2860 },
          { name: '위대한 운명의 돌파석', itemId: '66110226', amount: 60 },
          { name: '운명의 파편', itemId: '66130143', amount: 32200 },
          { name: '은총의 파편', itemId: '0', amount: 36 },
          { name: '코어', itemId: '0', amount: 3 },
        ],
      },
    ],
  },
  {
    name: '성당 2단계', level: 1720, image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 16000, moreGold: 5120,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 980 },
          { name: '운명의 수호석', itemId: '66102106', amount: 1960 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 11 },
          { name: '운명의 파편', itemId: '66130143', amount: 6800 },
          { name: '은총의 파편', itemId: '0', amount: 12 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 1680 },
          { name: '운명의 수호석', itemId: '66102106', amount: 3360 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 53 },
          { name: '운명의 파편', itemId: '66130143', amount: 14250 },
          { name: '은총의 파편', itemId: '0', amount: 12 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
      { gate: 2, gold: 24000, moreGold: 7680,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 1150 },
          { name: '운명의 수호석', itemId: '66102106', amount: 2300 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 16 },
          { name: '운명의 파편', itemId: '66130143', amount: 8600 },
          { name: '은총의 파편', itemId: '0', amount: 18 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 2880 },
          { name: '운명의 수호석', itemId: '66102106', amount: 5760 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 94 },
          { name: '운명의 파편', itemId: '66130143', amount: 24200 },
          { name: '은총의 파편', itemId: '0', amount: 18 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
    ],
  },
  {
    name: '성당 1단계', level: 1700, image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 13500, moreGold: 4320,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 820 },
          { name: '운명의 수호석', itemId: '66102106', amount: 1640 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 9 },
          { name: '운명의 파편', itemId: '66130143', amount: 5400 },
          { name: '은총의 파편', itemId: '0', amount: 4 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 960 },
          { name: '운명의 수호석', itemId: '66102106', amount: 1920 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 12 },
          { name: '운명의 파편', itemId: '66130143', amount: 6800 },
          { name: '은총의 파편', itemId: '0', amount: 4 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
      { gate: 2, gold: 16500, moreGold: 5280,
        materials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 1400 },
          { name: '운명의 수호석', itemId: '66102106', amount: 2800 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 44 },
          { name: '운명의 파편', itemId: '66130143', amount: 11880 },
          { name: '은총의 파편', itemId: '0', amount: 6 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
        moreMaterials: [
          { name: '운명의 파괴석', itemId: '66102006', amount: 2400 },
          { name: '운명의 수호석', itemId: '66102106', amount: 4800 },
          { name: '운명의 돌파석', itemId: '66110225', amount: 78 },
          { name: '운명의 파편', itemId: '66130143', amount: 20160 },
          { name: '은총의 파편', itemId: '0', amount: 6 },
          { name: '코어', itemId: '0', amount: 2 },
        ],
      },
    ],
  },
];

// 테마 색상 매핑
const THEME_COLORS: { [key: string]: { name: string; accent: string; bg: string; border: string; iconBg: string } } = {
  ancient:   { name: 'var(--text-primary)', accent: '#b89d6a', bg: 'rgba(201, 168, 76, 0.06)', border: 'rgba(184, 157, 106, 0.25)', iconBg: 'rgba(201, 168, 76, 0.08)' },
  relic:     { name: 'var(--text-primary)', accent: '#b85c1e', bg: 'rgba(184, 92, 30, 0.06)', border: 'rgba(184, 92, 30, 0.2)', iconBg: 'rgba(184, 92, 30, 0.06)' },
  gem:       { name: 'var(--text-primary)', accent: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.06)', border: 'rgba(139, 92, 246, 0.2)', iconBg: 'rgba(139, 92, 246, 0.06)' },
  craft:     { name: 'var(--text-primary)', accent: '#a8893a', bg: 'rgba(201, 168, 76, 0.06)', border: 'rgba(201, 168, 76, 0.25)', iconBg: 'rgba(201, 168, 76, 0.08)' },
  refine:    { name: 'var(--text-primary)', accent: '#c0392b', bg: 'rgba(192, 57, 43, 0.06)', border: 'rgba(192, 57, 43, 0.2)', iconBg: 'rgba(192, 57, 43, 0.06)' },
  gemRandom: { name: 'var(--text-primary)', accent: '#7c5cbf', bg: 'rgba(124, 92, 191, 0.06)', border: 'rgba(124, 92, 191, 0.2)', iconBg: 'rgba(124, 92, 191, 0.06)' },
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
    id: 10, name: '젬 랜덤 상자 (영웅 ~ 고급)', qty: 1, requiredLevel: 1700,
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

// ─── 은총 달력 ───
const CALENDAR_START = new Date(2026, 2, 18); // 2026-03-18 (수요일)

// 레벨별 주당 은총 수급량
const GRACE_BY_LEVEL: Record<number, { basic: number; more: number }> = {
  1700: { basic: 10, more: 20 },
  1720: { basic: 30, more: 60 },
  1750: { basic: 60, more: 120 },
};

const CAL_LEVELS = [1700, 1720, 1750] as const;

type CalShopItem = {
  id: number;
  name: string;
  image: string;
  theme: string;
  hasBg: boolean;
  qty: number;
  graceCost: number;
  goldCost: number;
  limitType: 'once' | 'unlimited';
  requiredLevel: number;
};

const CAL_SHOP_ITEMS: CalShopItem[] = SHOP_ITEMS
  .filter(s => s.costs.some(c => c.name === '은총의 파편' && c.amount > 0))
  .map(s => ({
    id: s.id, name: s.name, image: s.image, theme: s.theme, hasBg: s.hasBg, qty: s.qty,
    graceCost: s.costs.find(c => c.name === '은총의 파편')?.amount || 0,
    goldCost: s.costs.find(c => c.name === '골드')?.amount || 0,
    limitType: s.limitType as 'once' | 'unlimited',
    requiredLevel: Math.min(s.requiredLevel, 1750),
  }));

// 교환 체크된 아이템의 은총 소비를 반영하여, 각 아이템의 필요 주차 계산
function calcWeekNeeded(item: CalShopItem, perWeek: number, consumedGrace: number): number {
  if (item.graceCost === 0) return 1;
  const needed = item.graceCost + consumedGrace;
  return Math.ceil(needed / perWeek);
}

type CalendarWeek = {
  week: number;
  startDate: Date;
  endDate: Date;
  cumulative: number;
  items: (CalShopItem & { weekNeeded: number; isExchanged: boolean; isDisabled: boolean })[];
  isCurrent: boolean;
};

type ExchangeMap = Map<number, Set<number>>;

function getConsumedGrace(exchangeMap: ExchangeMap, level: number): number {
  return CAL_SHOP_ITEMS
    .filter(s => s.requiredLevel <= level)
    .reduce((sum, s) => {
      const checks = exchangeMap.get(s.id);
      return sum + (checks ? s.graceCost * checks.size : 0);
    }, 0);
}

function buildCalendar(perWeek: number, totalWeeks: number, exchangeMap: ExchangeMap, level: number): CalendarWeek[] {
  const levelItems = CAL_SHOP_ITEMS.filter(s => s.requiredLevel <= level);
  const consumedGrace = getConsumedGrace(exchangeMap, level);

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const weeks: CalendarWeek[] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const startDate = new Date(CALENDAR_START);
    startDate.setDate(startDate.getDate() + w * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekNum = w + 1;
    const cumulative = weekNum * perWeek - consumedGrace;

    const weekItems: (CalShopItem & { weekNeeded: number; isExchanged: boolean; isDisabled: boolean })[] = [];

    for (const s of levelItems) {
      const checks = exchangeMap.get(s.id);
      const isCheckedHere = checks?.has(weekNum) || false;

      if (s.limitType === 'once') {
        const checkedAnywhere = checks && checks.size > 0;
        if (checkedAnywhere) {
          if (isCheckedHere) weekItems.push({ ...s, weekNeeded: weekNum, isExchanged: true, isDisabled: false });
        } else {
          if (cumulative >= s.graceCost) weekItems.push({ ...s, weekNeeded: weekNum, isExchanged: false, isDisabled: false });
        }
      } else {
        if (cumulative >= s.graceCost || isCheckedHere) {
          weekItems.push({ ...s, weekNeeded: weekNum, isExchanged: isCheckedHere, isDisabled: false });
        }
      }
    }

    weekItems.sort((a, b) => a.graceCost - b.graceCost);

    weeks.push({
      week: weekNum, startDate, endDate,
      cumulative,
      items: weekItems,
      isCurrent: kstNow >= startDate && kstNow <= endDate,
    });
  }
  return weeks;
}

export default function CathedralPage() {
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
    if (mat.name === '은총의 파편') return Math.round(graceUnitPrice * mat.amount);
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

  // 선택 상자 체크 상태 (shopItemId → 선택된 itemId)
  const [shopSelectItem, setShopSelectItem] = useState<Record<number, string>>({});

  // 재련 상자 체크 상태 (itemId → boolean, 기본 true)
  const [refineChecks, setRefineChecks] = useState<Record<string, boolean>>({});
  const isRefineChecked = (itemId: string) => refineChecks[itemId] ?? true;
  const toggleRefineCheck = (itemId: string) => setRefineChecks(prev => ({ ...prev, [itemId]: !isRefineChecked(itemId) }));

  // 은총의 파편 1개 가치 = 재련 상자 총 가치(체크된 것만) ÷ 60
  const graceUnitPrice = REFINE_COMPONENTS.reduce((sum, comp) => {
    if (!isRefineChecked(comp.itemId)) return sum;
    return sum + getUnitPrice(comp.itemId) * comp.amount;
  }, 0) / REFINE_BOX_GRACE_COST;

  // 선택 상자에서 가치(단가 × 수량)가 가장 높은 아이템 자동 선택
  const getSelectedItemId = (shopId: number, components: { itemId: string; name: string; amount?: number }[]): string => {
    if (shopSelectItem[shopId]) return shopSelectItem[shopId];
    let maxValue = -1;
    let maxId = components[0]?.itemId || '';
    components.forEach(comp => {
      if (comp.itemId === '0') return;
      const price = latestPrices[comp.itemId] || 0;
      const amount = (comp as { amount?: number }).amount || 1;
      const value = price * amount;
      if (value > maxValue) {
        maxValue = value;
        maxId = comp.itemId;
      }
    });
    return maxId;
  };

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
                지평의 성당 계산
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                지평의 성당 클리어 보상과 은총의 파편 교환 상점
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
                const totalGrace = stage.gates.reduce((sum, g) => {
                  const basicGrace = g.materials.find(m => m.name === '은총의 파편');
                  const moreGrace = g.moreMaterials.find(m => m.name === '은총의 파편');
                  return sum + (basicGrace?.amount || 0) + (moreGrace?.amount || 0);
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
                      <div className={styles.graceBadge}>은총 {totalGrace}개</div>
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

              const renderMaterialTable = (mats: Material[], type: string, gate: number, colSpan: number) => (
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
                        <td>{mat.name === '은총의 파편' ? (priceLoading ? '—' : graceUnitPrice >= 1 ? graceUnitPrice.toFixed(2) : graceUnitPrice.toFixed(4)) : mat.itemId === '0' ? '-' : priceLoading ? '—' : unitPrice >= 1 ? unitPrice.toFixed(2) : unitPrice.toFixed(4)}</td>
                        <td>{mat.name === '은총의 파편' ? (priceLoading ? '—' : totalPrice.toLocaleString()) : mat.itemId === '0' || mat.amount === 0 ? '-' : priceLoading ? '—' : totalPrice.toLocaleString()}</td>
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

            {/* 모바일 광고 */}

            {/* 은총의 파편 상점 */}
            <div style={{ marginTop: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <Card className={styles.shopCard}>
                <Card.Header className={styles.shopCardHeader}>
                  <h3 className={styles.shopCardTitle}>
                    은총의 파편 상점
                  </h3>
                </Card.Header>
                <Card.Body className="p-0">
                  {/* 데스크톱: 좌우 분할 */}
                  <div className={styles.shopContainer}>
                    <div className={styles.shopList}>
                      <div className={styles.shopListHeader}>
                        은총의 파편 교환 목록
                      </div>
                      {SHOP_ITEMS.map((item) => {
                        const tc = THEME_COLORS[item.theme];
                        const isActive = selectedShopItem === item.id;
                        // 교환 비용 골드 환산
                        const graceCost = item.costs.find(c => c.name === '은총의 파편')?.amount || 0;
                        const goldCost = item.costs.find(c => c.name === '골드')?.amount || 0;
                        const totalGoldCost = Math.round(graceCost * graceUnitPrice) + goldCost;
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
                            {/* 교환 비용 골드 환산 */}
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
                        const tc = THEME_COLORS[selectedShopData.theme];
                        const components = selectedShopData.theme === 'gem' ? GEM_COMPONENTS
                          : selectedShopData.theme === 'refine' ? REFINE_COMPONENTS
                          : selectedShopData.theme === 'ancient' ? ANCIENT_CORE_COMPONENTS
                          : selectedShopData.theme === 'relic' ? RELIC_CORE_COMPONENTS
                          : selectedShopData.id === 7 ? METALLURGY_COMPONENTS
                          : selectedShopData.id === 8 ? TAILORING_COMPONENTS
                          : null;
                        return (
                          <div className={styles.shopDetailContent} style={(selectedShopData.theme === 'gem' || selectedShopData.theme === 'gemRandom') ? { maxWidth: '600px' } : (selectedShopData.id === 7 || selectedShopData.id === 8 || selectedShopData.theme === 'refine') ? { maxWidth: '550px' } : undefined}>
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
                                      {cost.name === '은총의 파편' && (
                                        <Image src="/dmschddmlvkvus.webp" alt="은총의 파편" width={24} height={24} />
                                      )}
                                      {cost.name === '코어 정수' && (
                                        <Image src="/wjdtn.webp?v=2" alt="코어 정수" width={24} height={24} />
                                      )}
                                      <span className={styles.costName}>{cost.name === '골드' ? '' : `${cost.name} `}</span>
                                      <span className={styles.costShortName}>{cost.name === '은총의 파편' ? '은총 ' : cost.name === '코어 정수' ? '정수 ' : cost.name === '골드' ? '' : `${cost.name} `}</span>
                                      <span>{cost.amount.toLocaleString()}</span>
                                    </div>
                                  ))}
                                  {/* 골드 환산 합계 */}
                                  {!priceLoading && graceUnitPrice > 0 && (() => {
                                    const hGrace = selectedShopData.costs.find(c => c.name === '은총의 파편')?.amount || 0;
                                    const hGold = selectedShopData.costs.find(c => c.name === '골드')?.amount || 0;
                                    if (hGrace === 0) return null;
                                    const hTotal = Math.round(hGrace * graceUnitPrice) + hGold;
                                    return (
                                      <div className={styles.costTotalRow}>
                                        <span className={styles.costTotalEquals}>=</span>
                                        <Image src="/gold.webp" alt="" width={18} height={18} />
                                        <span className={styles.costTotalValue}>{hTotal.toLocaleString()}</span>
                                      </div>
                                    );
                                  })()}
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
                                {selectedShopData.theme === 'refine' ? (() => {
                                  // 재련 재료 상자: 수량 × 단가 = 가치 테이블
                                  const refineComps = components as typeof REFINE_COMPONENTS;
                                  let boxTotalValue = 0;
                                  const rows = refineComps.map(comp => {
                                    const bundleSize = BUNDLE_SIZES[comp.itemId] || 1;
                                    const bundlePrice = latestPrices[comp.itemId] || 0;
                                    const unitPrice = bundlePrice / bundleSize;
                                    const checked = isRefineChecked(comp.itemId);
                                    const totalValue = Math.round(unitPrice * comp.amount);
                                    if (checked) boxTotalValue += totalValue;
                                    return { ...comp, unitPrice, totalValue, checked };
                                  });
                                  const graceValue = Math.round(boxTotalValue / REFINE_BOX_GRACE_COST);
                                  return (
                                    <>
                                      <table className={styles.materialTable} style={{ marginBottom: '0.75rem' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ textAlign: 'center' }}></th>
                                            <th>아이템</th>
                                            <th style={{ textAlign: 'center' }}>수량</th>
                                            <th style={{ textAlign: 'center' }}>단가</th>
                                            <th style={{ textAlign: 'center' }}>가치</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rows.map((row) => (
                                            <tr
                                              key={row.name}
                                              style={{ cursor: 'pointer', opacity: row.checked ? 1 : 0.5 }}
                                              onClick={() => toggleRefineCheck(row.itemId)}
                                            >
                                              <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                                                {row.checked ? '✅' : '⬜'}
                                              </td>
                                              <td>
                                                <div className={styles.materialCell}>
                                                  <Image src={row.icon} alt={row.name} width={32} height={32} />
                                                  <span style={{ fontSize: '0.8rem' }}>{row.name}</span>
                                                </div>
                                              </td>
                                              <td style={{ textAlign: 'center' }}>{row.amount.toLocaleString()}</td>
                                              <td style={{ textAlign: 'center' }}>{priceLoading ? '—' : row.unitPrice >= 1 ? row.unitPrice.toFixed(1) : row.unitPrice.toFixed(3)}</td>
                                              <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                  <Image src="/gold.webp" alt="" width={14} height={14} />
                                                  <span>{priceLoading ? '—' : row.totalValue.toLocaleString()}</span>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr className={styles.subtotalRow}>
                                            <td colSpan={4}>상자 총 가치</td>
                                            <td style={{ textAlign: 'center' }}>
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <Image src="/gold.webp" alt="" width={14} height={14} />
                                                <span>{priceLoading ? '—' : boxTotalValue.toLocaleString()}</span>
                                              </div>
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                      <div className={styles.graceValueCard}>
                                        <div className={styles.graceValueRow}>
                                          <div className={styles.graceValueLabel}>
                                            <Image src="/dmschddmlvkvus.webp" alt="은총의 파편" width={28} height={28} />
                                            <span>은총의 파편 1개 가치</span>
                                          </div>
                                          <div className={styles.graceValueAmount}>
                                            <Image src="/gold.webp" alt="골드" width={20} height={20} />
                                            <span>{priceLoading ? '—' : graceValue.toLocaleString()}</span>
                                            <span className={styles.graceValueUnit}>G</span>
                                          </div>
                                        </div>
                                        <div className={styles.graceValueFormula}>
                                          상자 가치 {priceLoading ? '—' : boxTotalValue.toLocaleString()}G ÷ 은총 {REFINE_BOX_GRACE_COST}개
                                        </div>
                                      </div>
                                    </>
                                  );
                                })() : (selectedShopData.id === 7 || selectedShopData.id === 8) ? (() => {
                                  // 야금술/재봉술 선택 상자: 라디오 + 수량 + 단가 + 가치
                                  const craftComps = components as typeof METALLURGY_COMPONENTS;
                                  const selectedId = getSelectedItemId(selectedShopData.id, craftComps);
                                  return (
                                    <>
                                      <table className={styles.materialTable} style={{ marginBottom: '0.75rem' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ textAlign: 'center' }}></th>
                                            <th>아이템</th>
                                            <th style={{ textAlign: 'center' }}>수량</th>
                                            <th style={{ textAlign: 'center' }}>단가</th>
                                            <th style={{ textAlign: 'center' }}>가치</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {craftComps.map((comp) => {
                                            const isSelected = comp.itemId === selectedId;
                                            const unitPrice = latestPrices[comp.itemId] || 0;
                                            const value = Math.round(unitPrice * comp.amount);
                                            return (
                                              <tr
                                                key={comp.itemId}
                                                style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.5 }}
                                                onClick={() => setShopSelectItem(prev => ({ ...prev, [selectedShopData.id]: comp.itemId }))}
                                              >
                                                <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                                                  {isSelected ? '✅' : '⬜'}
                                                </td>
                                                <td>
                                                  <div className={styles.materialCell}>
                                                    <Image src={comp.icon} alt={comp.name} width={32} height={32} />
                                                    <span style={{ fontSize: '0.8rem' }}>{comp.name}</span>
                                                  </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{comp.amount.toLocaleString()}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <Image src="/gold.webp" alt="" width={14} height={14} />
                                                    <span>{priceLoading ? '—' : unitPrice ? unitPrice.toLocaleString() : '-'}</span>
                                                  </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <Image src="/gold.webp" alt="" width={14} height={14} />
                                                    <span>{priceLoading ? '—' : value.toLocaleString()}</span>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </>
                                  );
                                })() : components.every(c => c.itemId !== '0') ? (() => {
                                  // 젬 선택 상자: 질서/혼돈 표 2개 나란히
                                  const selectedId = getSelectedItemId(selectedShopData.id, components);
                                  const selectedComp = components.find(c => c.itemId === selectedId);
                                  const selectedPrice = selectedComp ? (latestPrices[selectedComp.itemId] || 0) : 0;
                                  const qty = selectedShopData.qty;
                                  const totalValue = Math.round(selectedPrice * qty);
                                  const orderGems = components.slice(0, 3);
                                  const chaosGems = components.slice(3, 6);
                                  const renderGemTable = (gems: typeof components, title: string) => (
                                    <table className={styles.materialTable} style={{ flex: 1 }}>
                                      <thead>
                                        <tr>
                                          <th style={{ textAlign: 'center', width: '30px' }}></th>
                                          <th>{title}</th>
                                          <th style={{ textAlign: 'center' }}>시세</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {gems.map((comp) => {
                                          const isSelected = comp.itemId === selectedId;
                                          const price = latestPrices[comp.itemId] || 0;
                                          return (
                                            <tr
                                              key={comp.itemId}
                                              style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.5 }}
                                              onClick={() => setShopSelectItem(prev => ({ ...prev, [selectedShopData.id]: comp.itemId }))}
                                            >
                                              <td className={styles.gemCheckCell}>
                                                {isSelected ? '✅' : '⬜'}
                                              </td>
                                              <td>
                                                <div className={styles.materialCell}>
                                                  <Image src={comp.icon} alt={comp.name} width={28} height={28} />
                                                  <span>{comp.name.replace(/질서의 젬 : |혼돈의 젬 : /, '')}</span>
                                                </div>
                                              </td>
                                              <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                  <Image src="/gold.webp" alt="" width={14} height={14} />
                                                  <span>{priceLoading ? '—' : price ? price.toLocaleString() : '-'}</span>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  );
                                  const allGems = [...orderGems, ...chaosGems];
                                  return (
                                    <>
                                      {/* 데스크톱: 질서/혼돈 좌우 2개 */}
                                      <div className={styles.gemTableRow}>
                                        {renderGemTable(orderGems, '질서')}
                                        {renderGemTable(chaosGems, '혼돈')}
                                      </div>
                                      {/* 모바일: 하나의 표 */}
                                      <table className={`${styles.materialTable} ${styles.gemTableMobile}`}>
                                        <thead>
                                          <tr>
                                            <th className={styles.gemMobileCheckTh}></th>
                                            <th>젬</th>
                                            <th style={{ textAlign: 'center' }}>시세</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {allGems.map((comp) => {
                                            const isSelected = comp.itemId === selectedId;
                                            const price = latestPrices[comp.itemId] || 0;
                                            return (
                                              <tr
                                                key={comp.itemId}
                                                style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.5 }}
                                                onClick={() => setShopSelectItem(prev => ({ ...prev, [selectedShopData.id]: comp.itemId }))}
                                              >
                                                <td className={styles.gemCheckCell}>
                                                  {isSelected ? '✅' : '⬜'}
                                                </td>
                                                <td>
                                                  <div className={styles.materialCell}>
                                                    <Image src={comp.icon} alt={comp.name} width={22} height={22} />
                                                    <span>{comp.name.replace(/질서의 젬 : |혼돈의 젬 : /, '')}</span>
                                                  </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                  <div className={styles.gemMobilePrice}>
                                                    <Image src="/gold.webp" alt="" width={12} height={12} />
                                                    <span>{priceLoading ? '—' : price ? price.toLocaleString() : '-'}</span>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </>
                                  );
                                })() : (
                                  // 코어 (itemId === '0') — 시세 없음, 기존 그리드
                                  <div className={styles.gemGrid}>
                                    {components.map((comp) => (
                                      <div key={comp.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                        <Image src={comp.icon} alt={comp.name} width={100} height={100} />
                                        <span className={styles.gemName}>{comp.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 젬 랜덤 상자 기대값 */}
                            {selectedShopData.theme === 'gemRandom' && (
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

                            {/* 5. 교환 효율 (가치 계산 가능한 아이템만) */}
                            {!priceLoading && graceUnitPrice > 0 && (() => {
                              const effGraceCost = selectedShopData.costs.find(c => c.name === '은총의 파편')?.amount || 0;
                              const effGoldCost = selectedShopData.costs.find(c => c.name === '골드')?.amount || 0;
                              const effTotalCost = Math.round(effGraceCost * graceUnitPrice) + effGoldCost;
                              const isFreeItem = selectedShopData.costs.length === 0;

                              let itemValue = 0;
                              let valueName = '';

                              // 젬 선택 상자 (id 4, 5, 6)
                              if (selectedShopData.theme === 'gem' && components && components.every(c => c.itemId !== '0')) {
                                const selId = getSelectedItemId(selectedShopData.id, components);
                                const selPrice = latestPrices[selId] || 0;
                                itemValue = Math.round(selPrice * selectedShopData.qty);
                                valueName = '선택 젬 가치';
                              }
                              // 야금술 (id 7), 재봉술 (id 8)
                              else if (selectedShopData.id === 7 || selectedShopData.id === 8) {
                                const craftComps = components as typeof METALLURGY_COMPONENTS;
                                const selId = getSelectedItemId(selectedShopData.id, craftComps);
                                const sel = craftComps.find(c => c.itemId === selId);
                                if (sel) {
                                  itemValue = Math.round((latestPrices[sel.itemId] || 0) * sel.amount * selectedShopData.qty);
                                }
                                valueName = '선택 아이템 가치';
                              }
                              // 젬 랜덤 상자 (id 10)
                              else if (selectedShopData.theme === 'gemRandom') {
                                itemValue = Math.round(GEM_RANDOM_HERO_PROBS.reduce((sum, gem) => sum + (latestPrices[gem.itemId] || 0) * gem.probability, 0));
                                valueName = '상자 기대값';
                              }

                              if (itemValue <= 0) return null;

                              const efficiency = effTotalCost > 0 ? Math.round((itemValue / effTotalCost) * 100) : null;

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
                                    {!isFreeItem && (
                                      <div className={styles.efficiencyRow}>
                                        <span className={styles.efficiencyLabel}>교환 비용</span>
                                        <span className={styles.efficiencyValue}>
                                          <Image src="/gold.webp" alt="" width={16} height={16} />
                                          {effTotalCost.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    <div className={styles.efficiencyResultRow}>
                                      <span className={styles.efficiencyResultLabel}>
                                        {isFreeItem ? '순이익' : '효율'}
                                      </span>
                                      {isFreeItem ? (
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
                                            {efficiency >= 100 ? `+${(itemValue - effTotalCost).toLocaleString()}G` : `${(itemValue - effTotalCost).toLocaleString()}G`}
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

            {/* ─── 은총의 파편 주간 달력 ─── */}
            <GraceCalendar />

          </Col>
        </Row>
      </Container>
    </div>
  );
}

// ─── 은총의 파편 주간 달력 컴포넌트 ───
const GRACE_CAL_STORAGE_KEY = 'graceCalendarExchanges';

function saveExchangeMap(map: ExchangeMap) {
  try {
    const obj: Record<string, number[]> = {};
    map.forEach((weeks, id) => { obj[String(id)] = Array.from(weeks); });
    localStorage.setItem(GRACE_CAL_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

function loadExchangeMap(): ExchangeMap {
  try {
    const raw = localStorage.getItem(GRACE_CAL_STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, number[]>;
    const map: ExchangeMap = new Map();
    Object.entries(obj).forEach(([id, weeks]) => map.set(Number(id), new Set(weeks)));
    return map;
  } catch { return new Map(); }
}

function GraceCalendar() {
  const [level, setLevel] = useState<number>(1750);
  const [mode, setMode] = useState<'basic' | 'more'>('more');
  const [exchangeMap, setExchangeMap] = useState<ExchangeMap>(new Map());
  const [mounted, setMounted] = useState(false);
  const TOTAL_WEEKS = 24;

  // localStorage에서 복원
  useEffect(() => {
    setExchangeMap(loadExchangeMap());
    setMounted(true);
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (mounted) saveExchangeMap(exchangeMap);
  }, [exchangeMap, mounted]);

  // 마우스 드래그 스크롤 (관성 포함)
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, lastX: 0, velocity: 0, raf: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    cancelAnimationFrame(drag.current.raf);
    drag.current.active = true;
    drag.current.startX = e.pageX;
    drag.current.scrollLeft = scrollRef.current.scrollLeft;
    drag.current.lastX = e.pageX;
    drag.current.velocity = 0;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.scrollBehavior = 'auto';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.current.active || !scrollRef.current) return;
    e.preventDefault();
    const dx = e.pageX - drag.current.startX;
    scrollRef.current.scrollLeft = drag.current.scrollLeft - dx;
    drag.current.velocity = e.pageX - drag.current.lastX;
    drag.current.lastX = e.pageX;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!drag.current.active || !scrollRef.current) return;
    drag.current.active = false;
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.scrollBehavior = 'smooth';
    // 관성 스크롤
    let v = drag.current.velocity * 2;
    const coast = () => {
      if (!scrollRef.current || Math.abs(v) < 0.5) return;
      scrollRef.current.scrollLeft -= v;
      v *= 0.92;
      drag.current.raf = requestAnimationFrame(coast);
    };
    coast();
  }, []);

  // 스크롤 컨테이너 높이 고정 — 체크로 아이템 사라져도 줄어들지 않게
  useEffect(() => {
    if (!scrollRef.current) return;
    const h = scrollRef.current.scrollHeight;
    scrollRef.current.style.minHeight = `${h}px`;
  }, [level, mode]);

  const toggleExchange = (id: number, weekNum: number) => {
    setExchangeMap(prev => {
      const next = new Map(prev);
      const checks = new Set(prev.get(id) || []);
      if (checks.has(weekNum)) checks.delete(weekNum); else checks.add(weekNum);
      if (checks.size === 0) next.delete(id); else next.set(id, checks);
      return next;
    });
  };

  const gracePerWeek = GRACE_BY_LEVEL[level]?.[mode] || 60;

  const weeks = useMemo(() => {
    return buildCalendar(gracePerWeek, TOTAL_WEEKS, exchangeMap, level);
  }, [gracePerWeek, exchangeMap, level]);

  const consumedGrace = useMemo(() => getConsumedGrace(exchangeMap, level), [exchangeMap, level]);

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div className={styles.calendarSection}>
      {/* 헤더 */}
      <div className={styles.calHeader}>
        <div>
          <h2 className={styles.calTitle}>주간 교환 달력</h2>
          <p className={styles.calSubtitle}>은총의 파편 수급 및 교환 계획</p>
        </div>
        <div className={styles.calControls}>
          {/* 레벨 선택 */}
          <div className={styles.calToggle}>
            {CAL_LEVELS.map(lv => {
              const isActive = level === lv;
              return (
                <button
                  key={lv}
                  className={`${styles.calToggleBtn} ${isActive ? styles.calToggleLvActive : ''}`}
                  style={isActive ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : undefined}
                  onClick={() => { setLevel(lv); setExchangeMap(new Map()); }}
                >
                  {lv}
                </button>
              );
            })}
          </div>
          {/* 기본/더보기 */}
          <div className={styles.calToggle}>
            <button
              className={`${styles.calToggleBtn} ${mode === 'basic' ? styles.calToggleModeActive : ''}`}
              style={mode === 'basic' ? { color: 'var(--color-primary)' } : undefined}
              onClick={() => setMode('basic')}
            >
              기본
            </button>
            <button
              className={`${styles.calToggleBtn} ${mode === 'more' ? styles.calToggleModeActive : ''}`}
              style={mode === 'more' ? { color: 'var(--color-accent)' } : undefined}
              onClick={() => setMode('more')}
            >
              더보기
            </button>
          </div>
        </div>
      </div>

      {/* 수급 정보 + 초기화 */}
      <div className={styles.calInfoRow}>
        <div className={styles.calWeeklyInfo}>
          <Image src="/dmschddmlvkvus.webp" alt="" width={16} height={16} unoptimized />
          <span>Lv.{level} · 주당 {gracePerWeek}개</span>
          {consumedGrace > 0 && (
            <span className={styles.calConsumedInfo}>· 소비 {consumedGrace}개</span>
          )}
        </div>
        <button className={styles.calResetBtn} onClick={() => setExchangeMap(new Map())}>
          초기화
        </button>
      </div>
      {/* 주차별 카드 */}
      <div
        className={styles.calWeekList}
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {weeks.map((w) => {
          const hasItems = w.items.length > 0;

          return (
            <div key={w.week} className={`${styles.calWeekCard} ${w.isCurrent ? styles.calWeekCardCurrent : ''}`}>
              {/* 주차 헤더 */}
              <div className={styles.calWeekCardHeader}>
                <div className={styles.calWeekCardLeft}>
                  {w.isCurrent && <span className={styles.calWeekNowDot} />}
                  <span className={styles.calWeekNum}>{w.week}주차</span>
                  <span className={styles.calWeekDate}>{fmt(w.startDate)} ~ {fmt(w.endDate)}</span>
                </div>
                <div className={styles.calWeekGrace}>
                  <Image src="/dmschddmlvkvus.webp" alt="" width={20} height={20} unoptimized />
                  <span>{w.cumulative}</span>
                </div>
              </div>

              {/* 아이템 목록 */}
              <div className={styles.calWeekItems}>
                {!hasItems && (
                  <div className={styles.calWeekEmpty}>신규 교환 가능 아이템 없음</div>
                )}
                {w.items.map((item, idx) => {
                  const tc = THEME_COLORS[item.theme] || THEME_COLORS.ancient;
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`${styles.calWeekItem} ${item.isExchanged ? styles.calWeekItemChecked : ''} ${item.isDisabled ? styles.calWeekItemDisabled : ''}`}
                      onClick={() => !item.isDisabled && toggleExchange(item.id, w.week)}
                    >
                      {/* 체크박스 */}
                      <div className={`${styles.calWkCheckbox} ${item.isExchanged ? styles.calWkCheckboxOn : ''}`}>
                        {item.isExchanged && <span>✓</span>}
                      </div>

                      {/* 아이콘 */}
                      {item.hasBg ? (
                        <div className={styles.calWkIconFill}>
                          <Image src={item.image} alt={item.name} width={52} height={52} unoptimized />
                        </div>
                      ) : (
                        <div className={styles.calWkIcon}>
                          <Image src={item.image} alt={item.name} width={48} height={48} unoptimized style={{ transform: 'scale(1.15)' }} />
                        </div>
                      )}

                      {/* 정보 */}
                      <div className={styles.calWkInfo}>
                        <span className={styles.calWkName}>
                          {item.name.split(/(유물|고대)/).map((part, pi) =>
                            part === '유물' ? <span key={pi} className={styles.calWkGradeRelic}>{part}</span>
                            : part === '고대' ? <span key={pi} className={styles.calWkGradeAncient}>{part}</span>
                            : <span key={pi}>{part}</span>
                          )}
                          {item.qty > 1 && <span className={styles.calWkQty}> ×{item.qty}</span>}
                        </span>
                        <div className={styles.calWkCosts}>
                          {item.graceCost > 0 ? (
                            <span className={styles.calWkCostTag}>
                              <Image src="/dmschddmlvkvus.webp" alt="" width={14} height={14} unoptimized />
                              {item.graceCost}
                            </span>
                          ) : (
                            <span className={styles.calWkFree}>무료</span>
                          )}
                          {item.goldCost > 0 && (
                            <span className={styles.calWkCostTag}>
                              <Image src="/gold.webp" alt="" width={14} height={14} unoptimized />
                              {item.goldCost.toLocaleString()}
                            </span>
                          )}
                          <span className={item.limitType === 'once' ? styles.calWkBadgeOnce : styles.calWkBadgeRepeat}>
                            {item.limitType === 'once' ? '1회' : '무제한'}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 교환 내역 — 레벨별 전체 아이템 고정 표시 */}
      {(() => {
        const levelItems = CAL_SHOP_ITEMS.filter(s => s.requiredLevel <= level)
          .sort((a, b) => a.graceCost - b.graceCost);
        const totalGrace = levelItems.reduce((s, item) => {
          const count = exchangeMap.get(item.id)?.size || 0;
          return s + item.graceCost * count;
        }, 0);
        const totalGold = levelItems.reduce((s, item) => {
          const count = exchangeMap.get(item.id)?.size || 0;
          return s + item.goldCost * count;
        }, 0);

        return (
          <div className={styles.calSummary}>
            <div className={styles.calSummaryHeader}>
              <span className={styles.calSummaryTitle}>교환 내역</span>
              <div className={styles.calSummaryTotals}>
                <span className={styles.calSummaryTotal}>
                  <Image src="/dmschddmlvkvus.webp" alt="" width={18} height={18} unoptimized />
                  {totalGrace.toLocaleString()}
                </span>
                {totalGold > 0 && (
                  <span className={styles.calSummaryTotal}>
                    <Image src="/gold.webp" alt="" width={18} height={18} unoptimized />
                    {totalGold.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.calSummaryList}>
              {levelItems.map((item) => {
                const count = exchangeMap.get(item.id)?.size || 0;
                const active = count > 0;
                return (
                  <div key={item.id} className={`${styles.calSummaryItem} ${active ? styles.calSummaryItemActive : styles.calSummaryItemInactive}`}>
                    {item.hasBg ? (
                      <div className={styles.calSummaryIconFill}>
                        <Image src={item.image} alt="" width={56} height={56} unoptimized />
                      </div>
                    ) : (
                      <div className={styles.calSummaryIcon}>
                        <Image src={item.image} alt="" width={48} height={48} unoptimized style={{ transform: 'scale(1.1)' }} />
                      </div>
                    )}
                    <span className={styles.calSummaryItemName}>
                      {item.name.split(/(유물|고대)/).map((part, pi) =>
                        part === '유물' ? <span key={pi} className={styles.calWkGradeRelic}>{part}</span>
                        : part === '고대' ? <span key={pi} className={styles.calWkGradeAncient}>{part}</span>
                        : <span key={pi}>{part}</span>
                      )}
                    </span>
                    <span className={active ? styles.calSummaryCount : styles.calSummaryNone}>
                      {active ? `${count}회` : '—'}
                    </span>
                    <span className={styles.calSummaryItemCost}>
                      <Image src="/dmschddmlvkvus.webp" alt="" width={14} height={14} unoptimized />
                      {active ? (item.graceCost * count).toLocaleString() : '0'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
