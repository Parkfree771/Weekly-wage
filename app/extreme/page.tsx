'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Container, Row, Col, Card } from 'react-bootstrap';
import styles from './extreme.module.css';
import { calcTicketAverage } from '@/lib/hell-reward-calc';

// ─── 일정 데이터 ───
const EVENT_START = new Date(2026, 3, 22, 10, 0, 0); // 2026-04-22 수요일 오전 10시 (KST)
const TOTAL_WEEKS = 8;

// ─── 난이도별 보상 ───
type Difficulty = {
  name: string;
  level: number;
  gold: number;
  token: number;
  gates: number;
};

const DIFFICULTIES: Difficulty[] = [
  { name: '나이트메어', level: 1770, gold: 45000, token: 200, gates: 1 },
  { name: '하드', level: 1750, gold: 45000, token: 200, gates: 1 },
  { name: '노말', level: 1720, gold: 20000, token: 150, gates: 1 },
];

function formatFullDate(d: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ─── 토큰 상점 테마 색상 ───
const SHOP_THEME_COLORS: { [key: string]: { name: string; accent: string; border: string; iconBg: string } } = {
  engraving:  { name: 'var(--text-primary)', accent: '#b85c1e', border: 'rgba(184, 92, 30, 0.25)',  iconBg: 'rgba(184, 92, 30, 0.08)' },
  hell:       { name: 'var(--text-primary)', accent: '#c0392b', border: 'rgba(192, 57, 43, 0.25)',  iconBg: 'rgba(192, 57, 43, 0.08)' },
  gem:        { name: 'var(--text-primary)', accent: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)', iconBg: 'rgba(139, 92, 246, 0.08)' },
  gemRandom:  { name: 'var(--text-primary)', accent: '#7c5cbf', border: 'rgba(124, 92, 191, 0.25)', iconBg: 'rgba(124, 92, 191, 0.08)' },
  craft:      { name: 'var(--text-primary)', accent: '#a8893a', border: 'rgba(168, 137, 58, 0.25)', iconBg: 'rgba(168, 137, 58, 0.08)' },
  ability:    { name: 'var(--text-primary)', accent: '#27ae60', border: 'rgba(39, 174, 96, 0.25)',  iconBg: 'rgba(39, 174, 96, 0.08)' },
  chaosStone: { name: 'var(--text-primary)', accent: '#6a5acd', border: 'rgba(106, 90, 205, 0.25)', iconBg: 'rgba(106, 90, 205, 0.08)' },
  abidos:     { name: 'var(--text-primary)', accent: '#2980b9', border: 'rgba(41, 128, 185, 0.25)', iconBg: 'rgba(41, 128, 185, 0.08)' },
  refine:     { name: 'var(--text-primary)', accent: '#8b4513', border: 'rgba(139, 69, 19, 0.25)',  iconBg: 'rgba(139, 69, 19, 0.08)' },
  silling:    { name: 'var(--text-primary)', accent: '#7f8c8d', border: 'rgba(127, 140, 141, 0.25)',iconBg: 'rgba(127, 140, 141, 0.08)' },
};

// ─── 구성 요소 ───
// 유물 전투 각인서 12종 (items-to-track.ts 기반)
const ENGRAVING_COMPONENTS: { itemId: string; name: string; icon: string }[] = [
  { itemId: '65203905', name: '아드레날린',      icon: '/engraving.webp' },
  { itemId: '65200505', name: '원한',            icon: '/engraving.webp' },
  { itemId: '65203305', name: '돌격대장',        icon: '/engraving.webp' },
  { itemId: '65201005', name: '예리한 둔기',     icon: '/engraving.webp' },
  { itemId: '65203505', name: '질량 증가',       icon: '/engraving.webp' },
  { itemId: '65202805', name: '저주받은 인형',   icon: '/engraving.webp' },
  { itemId: '65203005', name: '기습의 대가',     icon: '/engraving.webp' },
  { itemId: '65203705', name: '타격의 대가',     icon: '/engraving.webp' },
  { itemId: '65203405', name: '각성',            icon: '/engraving.webp' },
  { itemId: '65204105', name: '전문의',          icon: '/engraving.webp' },
  { itemId: '65200605', name: '슈퍼차지',        icon: '/engraving.webp' },
  { itemId: '65201505', name: '결투의 대가',     icon: '/engraving.webp' },
];

// 영웅 젬 6종 (cathedral과 동일)
const GEM_COMPONENTS: { itemId: string; name: string; icon: string }[] = [
  { itemId: '67400003', name: '질서의 젬 : 안정',  icon: '/gem-order-stable.webp' },
  { itemId: '67400103', name: '질서의 젬 : 견고',  icon: '/gem-order-solid.webp' },
  { itemId: '67400203', name: '질서의 젬 : 불변',  icon: '/gem-order-immutable.webp' },
  { itemId: '67410303', name: '혼돈의 젬 : 침식',  icon: '/gem-chaos-erosion.webp' },
  { itemId: '67410403', name: '혼돈의 젬 : 왜곡',  icon: '/gem-chaos-distortion.webp' },
  { itemId: '67410503', name: '혼돈의 젬 : 붕괴',  icon: '/gem-chaos-collapse.webp' },
];

// 희귀 지옥 열쇠 Ⅲ = 1730 지옥 50층대(tier=5) 기댓값
const HELL_TICKET_TIER = 5;
const HELL_TICKET_LABEL = '50~59층';
const HELL_TICKET_BC_RATE = 13750; // 블루 크리스탈 기본값 (hell-reward 페이지와 동일)

// ─── 토큰 상점 데이터 ───
type ShopCost = { name: '토큰' | '골드'; amount: number };
type ShopLimit =
  | { kind: 'once' }                        // 원정대 1회 (영구)
  | { kind: 'weekly'; count: number }       // 원정대 주간 N회
  | { kind: 'unlimited' };                  // 없음

type ShopComponent = {
  icon: string;
  name: string;
  count: number;
  hasBg?: boolean;
  itemId?: string;        // latest.json 시세 조회용 (없으면 가격 표시 생략)
  bundleSize?: number;    // 거래소 번들 단위 (기본 1)
};

type ShopItem = {
  id: number;
  name: string;
  qty: number;                              // 카드에 표시되는 수량 (x표기)
  components?: ShopComponent[];             // 상자 구성품 (교환 비용 밑에 노출)
  selectOne?: boolean;                      // true면 components 중 하나만 선택 (라디오). false/미지정이면 전체 합산.
  requiredLevel: number | null;
  image: string;
  theme: keyof typeof SHOP_THEME_COLORS;
  hasBg: boolean;
  costs: ShopCost[];
  limit: ShopLimit | null;
};

const SHOP_ITEMS: ShopItem[] = [
  // 1. 유물 전투 각인서
  {
    id: 1, name: '유물 전투 각인서 선택 주머니', qty: 1,
    requiredLevel: 1730, image: '/engraving.webp', theme: 'engraving', hasBg: true,
    costs: [{ name: '토큰', amount: 100 }, { name: '골드', amount: 50000 }],
    limit: { kind: 'once' },
  },
  // 2. 희귀 지옥 열쇠 Ⅲ
  {
    id: 2, name: '희귀 지옥 열쇠 Ⅲ 상자', qty: 1,
    requiredLevel: 1730, image: '/celtic_key_3.webp', theme: 'hell', hasBg: true,
    costs: [{ name: '토큰', amount: 10 }, { name: '골드', amount: 15000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  // 3~5. 영웅 젬 선택 상자
  {
    id: 3, name: '영웅 젬 선택 상자', qty: 1,
    requiredLevel: 1720, image: '/gem-hero.webp', theme: 'gem', hasBg: false,
    costs: [{ name: '토큰', amount: 60 }],
    limit: { kind: 'once' },
  },
  {
    id: 4, name: '영웅 젬 선택 상자', qty: 1,
    requiredLevel: 1750, image: '/gem-hero.webp', theme: 'gem', hasBg: false,
    costs: [{ name: '토큰', amount: 60 }],
    limit: { kind: 'once' },
  },
  {
    id: 5, name: '영웅 젬 선택 상자', qty: 1,
    requiredLevel: 1770, image: '/gem-hero.webp', theme: 'gem', hasBg: false,
    costs: [{ name: '토큰', amount: 60 }],
    limit: { kind: 'once' },
  },
  // 6~7. 영웅 젬 상자 (랜덤)
  {
    id: 6, name: '영웅 젬 상자', qty: 1,
    requiredLevel: 1720, image: '/gem-hero.webp', theme: 'gemRandom', hasBg: false,
    costs: [{ name: '토큰', amount: 10 }, { name: '골드', amount: 10000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  {
    id: 7, name: '영웅 젬 상자', qty: 1,
    requiredLevel: 1750, image: '/gem-hero.webp', theme: 'gemRandom', hasBg: false,
    costs: [{ name: '토큰', amount: 10 }, { name: '골드', amount: 10000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  // 8. 야금술 선택 상자 (4단계 1개 또는 3단계 2개 중 택1)
  {
    id: 8, name: '야금술 선택 상자', qty: 1,
    selectOne: true,
    components: [
      { icon: '/master-metallurgy-4.webp', name: '장인의 야금술 : 4단계', count: 1, hasBg: true, itemId: '66112717' },
      { icon: '/master-metallurgy-3.webp', name: '장인의 야금술 : 3단계', count: 2, hasBg: true, itemId: '66112715' },
    ],
    requiredLevel: 1720, image: '/master-metallurgy-4.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '토큰', amount: 10 }],
    limit: { kind: 'weekly', count: 2 },
  },
  // 9. 재봉술 선택 상자 (4단계 1개 또는 3단계 2개 중 택1)
  {
    id: 9, name: '재봉술 선택 상자', qty: 1,
    selectOne: true,
    components: [
      { icon: '/master-tailoring-4.webp', name: '장인의 재봉술 : 4단계', count: 1, hasBg: true, itemId: '66112718' },
      { icon: '/master-tailoring-3.webp', name: '장인의 재봉술 : 3단계', count: 2, hasBg: true, itemId: '66112716' },
    ],
    requiredLevel: 1720, image: '/master-tailoring-4.webp', theme: 'craft', hasBg: true,
    costs: [{ name: '토큰', amount: 10 }],
    limit: { kind: 'weekly', count: 2 },
  },
  // 10. 어빌리티 스톤 키트
  {
    id: 10, name: '어빌리티 스톤 키트', qty: 1,
    requiredLevel: 1720, image: '/djqlfflxltmxhs.webp', theme: 'ability', hasBg: true,
    costs: [{ name: '토큰', amount: 3 }],
    limit: { kind: 'weekly', count: 10 },
  },
  // 11~12. 정령된 혼돈의 돌 상자
  {
    id: 11, name: '정령된 혼돈의 돌 상자 (무기)', qty: 1,
    components: [
      { icon: '/weapon-quality.webp', name: '정령된 혼돈의 돌 (무기)', count: 1, hasBg: true },
    ],
    requiredLevel: 1720, image: '/weapon-quality.webp', theme: 'chaosStone', hasBg: true,
    costs: [{ name: '토큰', amount: 2 }],
    limit: { kind: 'weekly', count: 10 },
  },
  {
    id: 12, name: '정령된 혼돈의 돌 상자 (방어구)', qty: 1,
    components: [
      { icon: '/armor-quality.webp', name: '정령된 혼돈의 돌 (방어구)', count: 3, hasBg: true },
    ],
    requiredLevel: 1720, image: '/armor-quality.webp', theme: 'chaosStone', hasBg: true,
    costs: [{ name: '토큰', amount: 2 }],
    limit: { kind: 'weekly', count: 10 },
  },
  // 13. 아비도스 융화재료 상자
  {
    id: 13, name: '아비도스 융화재료 상자', qty: 1,
    components: [
      { icon: '/abidos-fusion5.webp', name: '아비도스 융화 재료', count: 100, hasBg: true, itemId: '6861012' },
    ],
    requiredLevel: 1720, image: '/abidos-fusion5.webp', theme: 'abidos', hasBg: true,
    costs: [{ name: '토큰', amount: 20 }],
    limit: { kind: 'weekly', count: 1 },
  },
  // 14~16. 상급 아비도스 융화 재료 상자
  {
    id: 14, name: '상급 아비도스 융화 재료 상자', qty: 1,
    components: [
      { icon: '/top-abidos-fusion5.webp', name: '상급 아비도스 융화 재료', count: 50, hasBg: true, itemId: '6861013' },
    ],
    requiredLevel: 1730, image: '/top-abidos-fusion5.webp', theme: 'abidos', hasBg: true,
    costs: [{ name: '토큰', amount: 20 }],
    limit: { kind: 'weekly', count: 1 },
  },
  {
    id: 15, name: '상급 아비도스 융화 재료 상자', qty: 1,
    components: [
      { icon: '/top-abidos-fusion5.webp', name: '상급 아비도스 융화 재료', count: 50, hasBg: true, itemId: '6861013' },
    ],
    requiredLevel: 1750, image: '/top-abidos-fusion5.webp', theme: 'abidos', hasBg: true,
    costs: [{ name: '토큰', amount: 20 }],
    limit: { kind: 'weekly', count: 1 },
  },
  {
    id: 16, name: '상급 아비도스 융화 재료 상자', qty: 1,
    components: [
      { icon: '/top-abidos-fusion5.webp', name: '상급 아비도스 융화 재료', count: 50, hasBg: true, itemId: '6861013' },
    ],
    requiredLevel: 1770, image: '/top-abidos-fusion5.webp', theme: 'abidos', hasBg: true,
    costs: [{ name: '토큰', amount: 20 }],
    limit: { kind: 'weekly', count: 1 },
  },
  // 17. 운명의 파괴석/수호석 (기본)
  {
    id: 17, name: '운명의 파괴석/수호석', qty: 1,
    components: [
      { icon: '/destiny-destruction-stone.webp', name: '운명의 파괴석', count: 5000, hasBg: true, itemId: '66102006', bundleSize: 100 },
      { icon: '/destiny-guardian-stone.webp',   name: '운명의 수호석', count: 10000, hasBg: true, itemId: '66102106', bundleSize: 100 },
    ],
    requiredLevel: 1720, image: '/vkrhltjrtnghtjr.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '토큰', amount: 5 }, { name: '골드', amount: 2000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  // 18~20. 운명의 파괴석/수호석 결정
  {
    id: 18, name: '운명의 파괴석/수호석 결정', qty: 1,
    components: [
      { icon: '/destiny-destruction-stone2.webp', name: '운명의 파괴석 결정', count: 1000, hasBg: true, itemId: '66102007', bundleSize: 100 },
      { icon: '/destiny-guardian-stone2.webp',   name: '운명의 수호석 결정', count: 2000, hasBg: true, itemId: '66102107', bundleSize: 100 },
    ],
    requiredLevel: 1730, image: '/vkrhltngh.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '토큰', amount: 5 }, { name: '골드', amount: 2000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  {
    id: 19, name: '운명의 파괴석/수호석 결정', qty: 1,
    components: [
      { icon: '/destiny-destruction-stone2.webp', name: '운명의 파괴석 결정', count: 1000, hasBg: true, itemId: '66102007', bundleSize: 100 },
      { icon: '/destiny-guardian-stone2.webp',   name: '운명의 수호석 결정', count: 2000, hasBg: true, itemId: '66102107', bundleSize: 100 },
    ],
    requiredLevel: 1750, image: '/vkrhltngh.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '토큰', amount: 5 }, { name: '골드', amount: 2000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  {
    id: 20, name: '운명의 파괴석/수호석 결정', qty: 1,
    components: [
      { icon: '/destiny-destruction-stone2.webp', name: '운명의 파괴석 결정', count: 1000, hasBg: true, itemId: '66102007', bundleSize: 100 },
      { icon: '/destiny-guardian-stone2.webp',   name: '운명의 수호석 결정', count: 2000, hasBg: true, itemId: '66102107', bundleSize: 100 },
    ],
    requiredLevel: 1770, image: '/vkrhltngh.webp', theme: 'refine', hasBg: true,
    costs: [{ name: '토큰', amount: 5 }, { name: '골드', amount: 2000 }],
    limit: { kind: 'weekly', count: 1 },
  },
  // 21. 실링
  {
    id: 21, name: '실링', qty: 20000,
    requiredLevel: 1720, image: '/shilling.webp', theme: 'silling', hasBg: true,
    costs: [{ name: '토큰', amount: 2 }],
    limit: { kind: 'unlimited' },
  },
];

function formatLimit(l: ShopLimit | null, mode: 'short' | 'long'): string {
  if (!l) return '미정';
  if (l.kind === 'once')      return mode === 'short' ? '원정대 1회' : '원정대 1회';
  if (l.kind === 'unlimited') return mode === 'short' ? '무제한' : '제한 없음';
  return mode === 'short' ? `주간 ${l.count}회` : `원정대 주간 ${l.count}회`;
}

export default function ExtremePage() {
  // 난이도
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  // 상점
  const [selectedShopItem, setSelectedShopItem] = useState<number | null>(null);
  const selectedShopData = SHOP_ITEMS.find(i => i.id === selectedShopItem);

  // 시세 (latest.json)
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);

  // 선택 상자 내에서 유저가 고른 아이템 (shopId → itemId). 미선택 시 최고가 자동 선택.
  const [shopSelectItem, setShopSelectItem] = useState<Record<number, string>>({});

  // 구성 요소 표 펼치기 상태 (shopId → boolean)
  const [compsExpanded, setCompsExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const { fetchLatestPrices } = await import('@/lib/price-history-client');
        const latest = await fetchLatestPrices();
        setLatestPrices(latest);
      } catch (e) {
        console.error('[extreme] latest prices fetch failed', e);
      } finally {
        setPriceLoading(false);
      }
    })();
  }, []);

  // 구성 요소 중 최고가 아이템 반환 (선택 상자의 기본값)
  const getBestItemId = (comps: { itemId: string }[]): string => {
    let maxPrice = -1;
    let maxId = comps[0]?.itemId ?? '';
    for (const c of comps) {
      const p = latestPrices[c.itemId] || 0;
      if (p > maxPrice) { maxPrice = p; maxId = c.itemId; }
    }
    return maxId;
  };

  const getSelectedInBox = (shopId: number, comps: { itemId: string }[]): string =>
    shopSelectItem[shopId] || getBestItemId(comps);

  // 영웅 젬 상자(랜덤) 기댓값 = 6종 평균가
  const getGemRandomAverage = (): number => {
    if (priceLoading) return 0;
    const prices = GEM_COMPONENTS.map(g => latestPrices[g.itemId] || 0).filter(p => p > 0);
    if (prices.length === 0) return 0;
    return prices.reduce((s, p) => s + p, 0) / prices.length;
  };

  const eventEnd = new Date(EVENT_START);
  eventEnd.setDate(eventEnd.getDate() + TOTAL_WEEKS * 7 - 1);
  eventEnd.setHours(23, 59, 59);

  const selectedDiff = DIFFICULTIES.find(d => d.name === selectedDifficulty);

  // 보상 표 렌더링 (데스크톱 하단 + 모바일 카드별 인라인 양쪽에서 공통 사용)
  const renderRewardTables = (diff: Difficulty) => (
    <>
      <div className={styles.fcTableWrap}>
        <div className={styles.fcTableHeader}>최초 클리어 보상 · {diff.name}</div>
        <div className={`${styles.fcGrid} ${diff.name === '나이트메어' ? styles.fcGrid6 : styles.fcGrid4}`}>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>도약의 전설 카드 선택 팩 Ⅲ</span>
              <div className={styles.fcCellRow}>
                <Image src="/legendary-cardpack.webp" alt="전설 카드팩" width={40} height={40} />
                <span className={styles.fcCellValue}>x1</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>영웅 젬 선택 상자</span>
              <div className={styles.fcCellRow}>
                <Image src="/gem-hero.webp" alt="영웅 젬 선택 상자" width={40} height={40} />
                <span className={styles.fcCellValue}>x1</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>젬 가공 초기화권</span>
              <div className={styles.fcCellRow}>
                <Image src="/gem-reset-ticket.webp" alt="젬 가공 초기화권" width={40} height={40} />
                <span className={styles.fcCellValue}>x1</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>불과 얼음의 주화</span>
              <div className={styles.fcCellRow}>
                <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={40} height={40} />
                <span className={styles.fcCellValue}>x100</span>
              </div>
            </div>
          </div>
          {diff.name === '나이트메어' && (
            <>
              <div className={styles.fcGridCell}>
                <div className={styles.fcCell}>
                  <span className={styles.fcCellLabel}>전설 칭호</span>
                  <div className={styles.fcCellRow}>
                    <Image src="/extreme-fire.webp" alt="홍염의 군주" width={40} height={40} className={styles.titleIconFire} />
                    <span className={`${styles.fcCellValue} ${styles.titleMatchFire}`}>홍염의 군주</span>
                  </div>
                </div>
              </div>
              <div className={styles.fcGridCell}>
                <div className={styles.fcCell}>
                  <span className={styles.fcCellLabel}>전설 칭호</span>
                  <div className={styles.fcCellRow}>
                    <Image src="/extreme-ice.webp" alt="혹한의 군주" width={40} height={40} />
                    <span className={`${styles.fcCellValue} ${styles.titleMatchIce}`}>혹한의 군주</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.fcTableWrap}>
        <div className={styles.fcTableHeader}>기본 클리어 보상 · {diff.name}</div>
        <div className={`${styles.fcGrid} ${styles.fcGrid2}`}>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>클리어 골드</span>
              <div className={styles.fcCellRow}>
                <Image src="/gold.webp" alt="골드" width={28} height={28} />
                <span className={styles.fcCellValue}>{diff.gold.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className={styles.fcGridCell}>
            <div className={styles.fcCell}>
              <span className={styles.fcCellLabel}>불과 얼음의 주화</span>
              <div className={styles.fcCellRow}>
                <Image src="/xhzms.webp" alt="불과 얼음의 주화" width={36} height={36} />
                <span className={styles.fcCellValue}>x{diff.token}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Container fluid className="mt-3 mt-md-4" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <Row className="justify-content-center">
          <Col xl={12} lg={12} md={12}>

            {/* 타이틀 */}
            <div className="text-center mb-3">
              <h1 className={styles.pageTitle}>익스트림 <span className={styles.newBadge}>NEW</span></h1>
              <p className={styles.pageSubtitle}>
                {formatFullDate(EVENT_START)} ~ {formatFullDate(eventEnd)} | 총 {TOTAL_WEEKS}주
              </p>
            </div>

            {/* ═══════════════════════════════════════════
                섹션: 난이도별 보상
                ═══════════════════════════════════════════ */}
            <div className={styles.diffSection} style={{ maxWidth: '900px', margin: '0 auto 1.5rem' }}>
              <h2 className={styles.sectionTitle}>난이도별 보상</h2>
              <div className={styles.diffGrid}>
                {DIFFICULTIES.map((diff) => {
                  const colorClass = diff.name === '나이트메어' ? styles.diffNightmare
                    : diff.name === '하드' ? styles.diffHard
                    : styles.diffNormal;
                  const isActive = selectedDifficulty === diff.name;
                  return (
                    <div key={diff.name} className={styles.diffGroup}>
                      <button
                        type="button"
                        className={`${styles.diffCard} ${isActive ? styles.diffCardActive : ''}`}
                        onClick={() => setSelectedDifficulty(isActive ? null : diff.name)}
                        aria-pressed={isActive}
                      >
                        <Image
                          src="/dlrtmxmfla.webp"
                          alt={diff.name}
                          width={300}
                          height={225}
                          className={styles.diffImage}
                        />
                        <div className={styles.diffOverlay} />
                        <div className={`${styles.diffContent} ${colorClass}`}>
                          <div className={styles.diffNameRow}>
                            <span className={styles.diffName}>{diff.name}</span>
                            <span className={styles.diffLevel}>Lv. {diff.level}</span>
                          </div>
                          <div className={styles.diffGold}>{diff.gold.toLocaleString()}G</div>
                          <div className={styles.diffToken}>토큰 {diff.token}개</div>
                        </div>
                      </button>
                      {/* 모바일: 각 카드 바로 밑에 표 인라인 표시 */}
                      {isActive && (
                        <div className={styles.diffTablesInline}>
                          {renderRewardTables(diff)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 데스크톱: 카드 그리드 아래에 통합 표 1회 표시 */}
              {selectedDiff && (
                <div className={styles.diffTablesBottom}>
                  {renderRewardTables(selectedDiff)}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════
                섹션: 토큰 상점
                ═══════════════════════════════════════════ */}
            <div className={styles.diffSection}>
              <h2 className={styles.sectionTitle}>토큰 상점</h2>
              <div style={{ marginTop: '0.75rem' }}>
                <Card className={styles.shopCard}>
                  <Card.Header className={styles.shopCardHeader}>
                    <h3 className={styles.shopCardTitle}>불과 얼음의 주화 상점</h3>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className={styles.shopContainer}>
                      {/* 좌: 목록 */}
                      <div className={styles.shopList}>
                        <div className={styles.shopListHeader}>토큰 교환 목록</div>
                        {SHOP_ITEMS.map((item) => {
                          const tc = SHOP_THEME_COLORS[item.theme];
                          const isActive = selectedShopItem === item.id;
                          const tokenCost = item.costs.find(c => c.name === '토큰')?.amount || 0;
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
                                  {item.requiredLevel && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Lv.{item.requiredLevel}</span>
                                  )}
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
                                    {formatLimit(item.limit, 'short')}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.shopItemCostBadge}>
                                {tokenCost > 0 ? (
                                  <span className={styles.shopItemCostValue}>
                                    <Image src="/xhzms.webp" alt="토큰" width={14} height={14} />
                                    {tokenCost.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className={styles.shopItemFree}>{isFree ? '미정' : '—'}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 우: 상세 */}
                      <div className={styles.shopDetail}>
                        {selectedShopData ? (() => {
                          const tc = SHOP_THEME_COLORS[selectedShopData.theme];
                          const wide = selectedShopData.theme === 'engraving' || selectedShopData.theme === 'gem' || selectedShopData.theme === 'gemRandom';
                          return (
                            <div className={styles.shopDetailContent} style={wide ? { maxWidth: '560px' } : undefined}>
                              {/* 아이콘 + 이름 */}
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

                              {/* 레벨 + 제한 */}
                              <div className={styles.shopCompactInfo}>
                                {selectedShopData.requiredLevel && (
                                  <>
                                    <span className={styles.shopCompactItem} style={{ color: tc.accent }}>
                                      Lv.{selectedShopData.requiredLevel}
                                    </span>
                                    <span className={styles.shopCompactDivider}>·</span>
                                  </>
                                )}
                                <span
                                  className={styles.limitBadge}
                                  style={{
                                    color: tc.accent,
                                    background: `${tc.accent}18`,
                                    border: `1px solid ${tc.accent}40`,
                                  }}
                                >
                                  {formatLimit(selectedShopData.limit, 'long')}
                                </span>
                              </div>

                              {/* 교환 비용 */}
                              <div className={styles.shopDetailSection}>
                                <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>교환 비용</div>
                                <div className={styles.shopDetailCostList}>
                                  {selectedShopData.costs.length > 0 ? (
                                    selectedShopData.costs.map((cost, idx) => (
                                      <div key={idx} className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                        {cost.name === '토큰' && (
                                          <Image src="/xhzms.webp" alt="토큰" width={24} height={24} />
                                        )}
                                        {cost.name === '골드' && (
                                          <Image src="/gold.webp" alt="골드" width={24} height={24} />
                                        )}
                                        <span className={styles.costName}>{cost.name === '골드' ? '' : `${cost.name} `}</span>
                                        <span className={styles.costShortName}>{cost.name === '토큰' ? '토큰 ' : ''}</span>
                                        <span>{cost.amount.toLocaleString()}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className={styles.shopDetailCostItem} style={{ borderColor: tc.border }}>
                                      <span>비용 미정</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 구성품 (1개가 아닌 고정 구성 아이템) */}
                              {selectedShopData.components && selectedShopData.components.length > 0 && (() => {
                                const comps = selectedShopData.components;
                                const selectable = !!selectedShopData.selectOne;
                                const compValues = comps.map(c => {
                                  if (!c.itemId) return null;
                                  const bundlePrice = latestPrices[c.itemId] || 0;
                                  const bundleSize = c.bundleSize || 1;
                                  const unitPrice = bundlePrice / bundleSize;
                                  const totalValue = Math.round(unitPrice * c.count);
                                  return { unitPrice, totalValue };
                                });
                                const hasPricing = compValues.some(v => v !== null);

                                // 택1 박스: 최고 가치 옵션 자동 선택 (유저 선택 있으면 그걸 우선)
                                let selectedIdx = 0;
                                if (selectable) {
                                  const userPick = shopSelectItem[selectedShopData.id];
                                  const userPickIdx = userPick ? comps.findIndex(c => c.itemId === userPick) : -1;
                                  if (userPickIdx >= 0) {
                                    selectedIdx = userPickIdx;
                                  } else {
                                    let maxV = -1;
                                    comps.forEach((_, i) => {
                                      const v = compValues[i]?.totalValue ?? 0;
                                      if (v > maxV) { maxV = v; selectedIdx = i; }
                                    });
                                  }
                                }
                                const grandTotal = selectable
                                  ? (compValues[selectedIdx]?.totalValue ?? 0)
                                  : compValues.reduce((sum, v) => sum + (v?.totalValue ?? 0), 0);

                                return (
                                  <div className={styles.shopDetailSection} style={{ minHeight: 'auto' }}>
                                    <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>
                                      구성품{selectable ? ' (1개 선택)' : ''}
                                    </div>
                                    <div className={styles.componentList}>
                                      {comps.map((c, idx) => {
                                        const v = compValues[idx];
                                        const isSelected = !selectable || idx === selectedIdx;
                                        const onPick = selectable && c.itemId
                                          ? () => setShopSelectItem(prev => ({ ...prev, [selectedShopData.id]: c.itemId! }))
                                          : undefined;
                                        return (
                                          <div
                                            key={idx}
                                            className={styles.componentItem}
                                            style={{
                                              borderColor: tc.border,
                                              cursor: selectable ? 'pointer' : 'default',
                                              opacity: isSelected ? 1 : 0.45,
                                              ...(selectable && isSelected ? { borderColor: tc.accent, background: tc.iconBg } : {}),
                                            }}
                                            onClick={onPick}
                                          >
                                            {selectable && (
                                              <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{isSelected ? '✅' : '⬜'}</span>
                                            )}
                                            {c.hasBg ? (
                                              <div className={styles.componentIconFill}>
                                                <Image src={c.icon} alt={c.name} width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                              </div>
                                            ) : (
                                              <div className={styles.componentIcon} style={{ borderColor: tc.border, background: tc.iconBg }}>
                                                <Image src={c.icon} alt={c.name} width={28} height={28} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                              </div>
                                            )}
                                            <div className={styles.componentMain}>
                                              <span className={styles.componentName}>{c.name}</span>
                                              {v && (
                                                <span className={styles.componentUnit}>
                                                  {priceLoading ? '—' : `단가 ${v.unitPrice >= 1 ? v.unitPrice.toFixed(1) : v.unitPrice.toFixed(3)} G`}
                                                </span>
                                              )}
                                            </div>
                                            <div className={styles.componentRight}>
                                              <span className={styles.componentCount} style={{ color: tc.accent }}>× {c.count.toLocaleString()}</span>
                                              {v && (
                                                <span className={styles.componentTotal}>
                                                  <Image src="/gold.webp" alt="" width={12} height={12} />
                                                  {priceLoading ? '—' : v.totalValue.toLocaleString()}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {hasPricing && (selectable || comps.length > 1) && (
                                        <div className={styles.componentTotalRow} style={{ borderColor: tc.border }}>
                                          <span className={styles.componentTotalLabel}>{selectable ? '선택 옵션 가치' : '총 가치'}</span>
                                          <span className={styles.componentTotalValue} style={{ color: tc.accent }}>
                                            <Image src="/gold.webp" alt="" width={14} height={14} />
                                            {priceLoading ? '—' : grandTotal.toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* 구성 요소 (유물 각인서 / 영웅 젬 선택) */}
                              {(selectedShopData.theme === 'engraving' || selectedShopData.theme === 'gem') && (() => {
                                const rawComps = selectedShopData.theme === 'engraving' ? ENGRAVING_COMPONENTS : GEM_COMPONENTS;
                                // 가격 내림차순 정렬
                                const comps = [...rawComps].sort((a, b) => (latestPrices[b.itemId] || 0) - (latestPrices[a.itemId] || 0));
                                const selectedId = getSelectedInBox(selectedShopData.id, comps);
                                const selectedPrice = latestPrices[selectedId] || 0;
                                const totalValue = Math.round(selectedPrice * selectedShopData.qty);

                                // 각인서만 상위 5개/나머지 분리. 젬(6종)은 전부 표시.
                                const TOP_N = 5;
                                const useToggle = selectedShopData.theme === 'engraving' && comps.length > TOP_N;
                                const expanded = compsExpanded[selectedShopData.id] ?? false;
                                const topRows = useToggle ? comps.slice(0, TOP_N) : comps;
                                const restRows = useToggle ? comps.slice(TOP_N) : [];

                                const renderRow = (comp: typeof comps[number]) => {
                                  const isSelected = comp.itemId === selectedId;
                                  const price = latestPrices[comp.itemId] || 0;
                                  return (
                                    <tr
                                      key={comp.itemId}
                                      style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.5 }}
                                      onClick={() => setShopSelectItem(prev => ({ ...prev, [selectedShopData.id]: comp.itemId }))}
                                    >
                                      <td style={{ textAlign: 'center', fontSize: '1rem' }}>{isSelected ? '✅' : '⬜'}</td>
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
                                };

                                return (
                                  <div className={styles.shopDetailSection} style={{ minHeight: 'auto', maxWidth: '560px' }}>
                                    <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>
                                      구성 요소 (1개 선택)
                                    </div>
                                    <table className={styles.materialTable}>
                                      <thead>
                                        <tr>
                                          <th style={{ width: '32px' }}></th>
                                          <th>아이템 (가격 순)</th>
                                          <th style={{ textAlign: 'center', width: '30%' }}>시세</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {topRows.map(renderRow)}
                                        {useToggle && expanded && restRows.map(renderRow)}
                                      </tbody>
                                      <tfoot>
                                        {useToggle && (
                                          <tr
                                            className={styles.toggleRow}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setCompsExpanded(prev => ({ ...prev, [selectedShopData.id]: !expanded }))}
                                          >
                                            <td colSpan={3} style={{ textAlign: 'center', padding: '0.45rem', color: tc.accent, fontWeight: 700, fontSize: '0.85rem' }}>
                                              {expanded ? `▲ 나머지 ${restRows.length}개 접기` : `▼ 나머지 ${restRows.length}개 더 보기`}
                                            </td>
                                          </tr>
                                        )}
                                        <tr className={styles.subtotalRow}>
                                          <td colSpan={2}>선택 아이템 가치{selectedShopData.qty > 1 ? ` × ${selectedShopData.qty}` : ''}</td>
                                          <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <Image src="/gold.webp" alt="" width={14} height={14} />
                                              <span>{priceLoading ? '—' : totalValue.toLocaleString()}</span>
                                            </div>
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                );
                              })()}

                              {/* 영웅 젬 상자 (랜덤) — 6종 평균 기댓값 */}
                              {selectedShopData.theme === 'gemRandom' && (() => {
                                const avg = getGemRandomAverage();
                                const total = Math.round(avg * selectedShopData.qty);
                                return (
                                  <div className={styles.shopDetailSection} style={{ minHeight: 'auto', maxWidth: '560px' }}>
                                    <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>구성 요소 (영웅 6종 랜덤)</div>
                                    <table className={styles.materialTable}>
                                      <thead>
                                        <tr>
                                          <th>아이템</th>
                                          <th style={{ textAlign: 'center', width: '35%' }}>시세</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {GEM_COMPONENTS.map((comp) => {
                                          const price = latestPrices[comp.itemId] || 0;
                                          return (
                                            <tr key={comp.itemId}>
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
                                      <tfoot>
                                        <tr className={styles.subtotalRow}>
                                          <td>평균 기댓값{selectedShopData.qty > 1 ? ` × ${selectedShopData.qty}` : ''}</td>
                                          <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                              <Image src="/gold.webp" alt="" width={14} height={14} />
                                              <span>{priceLoading ? '—' : total.toLocaleString()}</span>
                                            </div>
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                );
                              })()}

                              {/* 지옥 열쇠 기댓값 */}
                              {selectedShopData.theme === 'hell' && (() => {
                                const perTicket = priceLoading ? 0 : calcTicketAverage('hell', HELL_TICKET_TIER, latestPrices, HELL_TICKET_BC_RATE, '1730');
                                const total = Math.round(perTicket * selectedShopData.qty);
                                return (
                                  <div className={styles.shopDetailSection} style={{ minHeight: 'auto' }}>
                                    <div className={styles.shopDetailSectionTitle} style={{ color: tc.name }}>
                                      예상 가치
                                    </div>
                                    <div className={styles.expectedValueCard}>
                                      <div className={styles.expectedValueRow}>
                                        <div className={styles.expectedValueLabel}>
                                          <Image src="/celtic_key_3.webp" alt="희귀 지옥 열쇠" width={28} height={28} style={{ borderRadius: '4px' }} />
                                          <span>1730 지옥 {HELL_TICKET_LABEL} 평균 기댓값</span>
                                        </div>
                                        <div className={styles.expectedValueAmount}>
                                          <Image src="/gold.webp" alt="골드" width={20} height={20} />
                                          <span>{priceLoading ? '—' : total.toLocaleString()}</span>
                                          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>G</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })() : (
                          <div className={styles.shopDetailEmpty}>목록에서 아이템을 선택하세요</div>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>

          </Col>
        </Row>
      </Container>
    </div>
  );
}
