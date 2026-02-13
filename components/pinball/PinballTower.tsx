'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import NextImage from 'next/image';
import styles from '@/app/hell-sim/hell-sim.module.css';
import { saveHellSimResult } from '@/lib/supabase';
import { fetchPriceData } from '@/lib/price-history-client';
import AdBanner from '@/components/ads/AdBanner';
import {
  HELL_BOX_REWARDS_DATA,
  NARAK_BOX_REWARDS_DATA,
  PRICE_ITEM_MAP,
  HERO_GEM_IDS,
  ENGRAVING_IDS,
  NON_TRACKED_ENGRAVING_SUM,
  TOTAL_ENGRAVINGS,
  NORMAL_REFINING_MATS,
  SPECIAL_REFINING_RATE,
  SPECIAL_REFINING_PER_ATTEMPT,
  RARE_GEM_PRICE,
  BRACELET_USEFUL_PROB,
  BRACELET_USEFUL_PRICE,
  BRACELET_PEON,
  parseRewardValue,
  parseDualValue,
  parseGemCount,
  getUnitPrice as getRewardUnitPrice,
  calcSpecialRefiningUnitCost,
  calcEngravingExpectedValue,
  getHeroGemMaxPrice,
  calcBoxRewardGold,
} from '@/lib/hell-reward-calc';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 600;
const TOTAL_FLOORS = 100;
const FLOOR_HEIGHT = 50;
const BALL_RADIUS = 10;
const GRAVITY = 0.7;

const PLATFORM_WIDTH = 120;
const PLATFORM_HEIGHT = 12;

// 게임 모드 타입
type GameMode = 'hell' | 'narak-odd' | 'narak-even';

// 열쇠 타입 정의
const KEY_TYPES = {
  rare: { name: '희귀', chances: 5, color: '#3b82f6', gradient: ['#60a5fa', '#3b82f6', '#2563eb'] },
  epic: { name: '영웅', chances: 6, color: '#a855f7', gradient: ['#c084fc', '#a855f7', '#9333ea'] },
  legendary: { name: '전설', chances: 7, color: '#f97316', gradient: ['#fb923c', '#f97316', '#ea580c'] }
} as const;

// 게임 모드별 열쇠 이미지 (1=전설, 2=영웅, 3=희귀)
const KEY_IMAGES: Record<GameMode, Record<KeyType, string>> = {
  'hell': {
    legendary: '/celtic_key_1.webp',
    epic: '/celtic_key_2.webp',
    rare: '/celtic_key_3.webp',
  },
  'narak-odd': {
    legendary: '/blue_key_1.webp',
    epic: '/blue_key_2.webp',
    rare: '/blue_key_3.webp',
  },
  'narak-even': {
    legendary: '/key_1.webp',
    epic: '/key_2.webp',
    rare: '/key_3.webp',
  },
};

// 게임 모드 정보
const GAME_MODES = {
  'hell': { name: '지옥', description: '100층까지 도달하세요' },
  'narak-odd': { name: '나락 (홀수)', description: '홀수층에만 착지해야 합니다' },
  'narak-even': { name: '나락 (짝수)', description: '짝수층에만 착지해야 합니다' }
} as const;

// 지옥 기본 보상 (단계별)
const HELL_BASE_REWARDS = [
  { 파편: 5200, 파괴석결정: 26, 수호석결정: 170, 돌파석: 4 },
  { 파편: 6500, 파괴석결정: 32, 수호석결정: 200, 돌파석: 5 },
  { 파편: 7700, 파괴석결정: 38, 수호석결정: 230, 돌파석: 6 },
  { 파편: 9000, 파괴석결정: 44, 수호석결정: 280, 돌파석: 7 },
  { 파편: 10000, 파괴석결정: 52, 수호석결정: 330, 돌파석: 8 },
  { 파편: 11500, 파괴석결정: 60, 수호석결정: 380, 돌파석: 9 },
  { 파편: 13000, 파괴석결정: 70, 수호석결정: 440, 돌파석: 10 },
  { 파편: 14000, 파괴석결정: 80, 수호석결정: 500, 돌파석: 11 },
  { 파편: 15500, 파괴석결정: 90, 수호석결정: 560, 돌파석: 12 },
  { 파편: 17000, 파괴석결정: 100, 수호석결정: 620, 돌파석: 13 },
  { 파편: 18000, 파괴석결정: 110, 수호석결정: 680, 돌파석: 15 },
];

// 지옥/나락 상자 보상 데이터는 @/lib/hell-reward-calc에서 import

// 보상 이미지 매핑
const REWARD_IMAGES: Record<string, string> = {
  // 지옥 상자 보상
  '파괴석/수호석': '/vkrhltngh.webp',
  '돌파석': '/top-destiny-breakthrough-stone5.webp',
  '융화재료': '/top-abidos-fusion5.webp',
  '재련 보조': '/breath-lava5.webp',
  '귀속골드': '/gold.webp',
  '어빌리티스톤 키트': '/djqlfflxltmxhs.webp',
  '팔찌': '/vkfwl.webp',
  '특수재련': '/xmrwo.webp',
  '천상 도전권': '/cjstkd.webp',
  '젬선택': '/duddndgmlrnl.webp', // 영웅+희귀 혼합 이미지
  '운명의 돌': '/dnsauddmlehf.webp',
  // 나락 상자 보상
  '재련보조': '/breath-lava5.webp',
  '귀속 각인서 랜덤': '/engraving.webp',
  '귀속 보석': '/gem-fear-8.webp',
};

// 단계별 젬 이미지 선택
// 지옥/나락 공통: 3,6,8,9,10 = 영웅만, 4,5,7 = 영웅+희귀, 0,1,2 = 희귀만
function getGemImageByTier(tier: number): string {
  const heroOnlyTiers = [3, 6, 8, 9, 10];
  const mixedTiers = [4, 5, 7];

  if (heroOnlyTiers.includes(tier)) {
    return '/gem-hero.webp'; // 영웅만
  } else if (mixedTiers.includes(tier)) {
    return '/duddndgmlrnl.webp'; // 영웅 + 희귀 섞임
  } else {
    return '/gem.webp'; // 희귀만 (0, 1, 2)
  }
}

// 보상 이미지 가져오기 (젬 종류는 단계에 따라 동적 선택)
function getRewardImage(rewardName: string, tier: number): string {
  if (rewardName === '젬선택' || rewardName === '귀속 보석') {
    return getGemImageByTier(tier);
  }
  return REWARD_IMAGES[rewardName] || '';
}

// 기본 보상 이미지 매핑
const BASE_REWARD_IMAGES: Record<string, string> = {
  '파편': '/destiny-shard-bag-large5.webp',
  '파괴석결정': '/top-destiny-destruction-stone5.webp',
  '수호석결정': '/top-destiny-guardian-stone5.webp',
  '돌파석': '/top-destiny-breakthrough-stone5.webp',
};

// 단계 계산 (층수 -> 단계)
function getTier(floor: number): number {
  return Math.min(10, Math.floor(floor / 10));
}

// 보상 수량 가져오기
function getRewardQuantity(rewardName: string, floor: number, mode: GameMode | null): string {
  const tier = getTier(floor);
  if (mode === 'narak-odd' || mode === 'narak-even') {
    return NARAK_BOX_REWARDS_DATA[rewardName]?.[tier] || '-';
  }
  return HELL_BOX_REWARDS_DATA[rewardName]?.[tier] || '-';
}

// 지옥 상자 보상 목록 (0~49층: 10개, 천상 도전권 제외)
const HELL_BOX_REWARDS_LOW = [
  '파괴석/수호석',
  '돌파석',
  '융화재료',
  '재련 보조',
  '귀속골드',
  '어빌리티스톤 키트',
  '팔찌',
  '특수재련',
  '젬선택',
  '운명의 돌'
];

// 지옥 상자 보상 목록 (50~100층: 11개, 천상 도전권 포함)
const HELL_BOX_REWARDS_HIGH = [
  '파괴석/수호석',
  '돌파석',
  '융화재료',
  '재련 보조',
  '귀속골드',
  '어빌리티스톤 키트',
  '팔찌',
  '특수재련',
  '천상 도전권',
  '젬선택',
  '운명의 돌'
];

// 나락 상자 보상 목록 (1~79층: 7개)
const NARAK_BOX_REWARDS_LOW = [
  '재련보조',
  '귀속골드',
  '어빌리티스톤 키트',
  '팔찌',
  '귀속 각인서 랜덤',
  '젬선택',
  '운명의 돌'
];

// 나락 상자 보상 목록 (80~100층: 8개, 귀속 보석 추가)
const NARAK_BOX_REWARDS_HIGH = [
  '재련보조',
  '귀속골드',
  '어빌리티스톤 키트',
  '팔찌',
  '귀속 각인서 랜덤',
  '귀속 보석',
  '젬선택',
  '운명의 돌'
];

// 게임 모드와 층수에 따른 보상 목록 반환
function getBoxRewards(mode: GameMode | null, floor: number = 0): string[] {
  if (mode === 'narak-odd' || mode === 'narak-even') {
    // 나락: 80층 이상이면 귀속 보석 포함 (8개), 미만이면 제외 (7개)
    return floor >= 80 ? NARAK_BOX_REWARDS_HIGH : NARAK_BOX_REWARDS_LOW;
  }
  // 지옥: 50층 이상이면 천상 도전권 포함 (11개), 미만이면 제외 (10개)
  return floor >= 50 ? HELL_BOX_REWARDS_HIGH : HELL_BOX_REWARDS_LOW;
}

type KeyType = keyof typeof KEY_TYPES;

// 히든층 보상 타입
type RewardType = 'box' | 'chance' | 'rocket' | 'pungyo' | 'life';

// 지옥 히든층 보상 종류 (25% 확률씩)
const HELL_REWARD_TYPES: { type: RewardType; name: string }[] = [
  { type: 'box', name: '상자 +1' },
  { type: 'chance', name: '기회 +1' },
  { type: 'rocket', name: '로켓점프' },
  { type: 'pungyo', name: '풍요' },
];

// 나락 히든층 보상 종류 (20% 확률씩)
const NARAK_REWARD_TYPES: { type: RewardType; name: string }[] = [
  { type: 'box', name: '상자 +1' },
  { type: 'chance', name: '기회 +1' },
  { type: 'rocket', name: '로켓점프' },
  { type: 'pungyo', name: '풍요' },
  { type: 'life', name: '목숨 +1' },
];

// 히든층 체크 (게임 모드별)
// 지옥: 11, 22, 33, 44, 55, 66, 77, 88, 99
// 홀수 나락: 11, 33, 55, 77, 99
// 짝수 나락: 22, 44, 66, 88
function isHiddenFloor(floor: number, mode: GameMode | null): boolean {
  if (floor <= 0 || floor >= 100 || floor % 11 !== 0) return false;

  if (mode === 'narak-odd') {
    // 홀수 나락: 11의 배수 중 홀수만
    return floor % 2 === 1;
  } else if (mode === 'narak-even') {
    // 짝수 나락: 11의 배수 중 짝수만
    return floor % 2 === 0;
  }
  // 지옥: 모든 11의 배수
  return true;
}

// 랜덤 보상 선택 (게임 모드별)
function getRandomReward(mode: GameMode | null): { type: RewardType; name: string } {
  const rewards = (mode === 'narak-odd' || mode === 'narak-even')
    ? NARAK_REWARD_TYPES
    : HELL_REWARD_TYPES;
  return rewards[Math.floor(Math.random() * rewards.length)];
}

interface HiddenReward {
  floor: number;
  name: string;
  type: RewardType;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: 'ready' | 'falling' | 'rising' | 'stopped';
  targetFloor: number;
  physicalFloor: number;
  targetX: number;
  targetY: number;
  progressFloors: number;
  currentGravity: number;
  hasPassedTarget: boolean;
}

// 불씨 파티클
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

// 불씨/눈꽃 생성 (깊이에 따라 밀도 증가)
function createEmber(canvasWidth: number, worldHeight: number, isIceTheme: boolean = false, forceY?: number): Ember {
  const fireColors = ['#ff4500', '#ff6b35', '#ff8c00', '#ffa500', '#ffcc00', '#ff3300', '#ff5722', '#ff7043'];
  const iceColors = ['#4fc3f7', '#29b6f6', '#81d4fa', '#b3e5fc', '#e1f5fe', '#ffffff', '#80deea', '#4dd0e1', '#e0f7fa', '#b2ebf2'];
  const colors = isIceTheme ? iceColors : fireColors;

  let y: number;
  if (forceY !== undefined) {
    y = forceY;
  } else if (isIceTheme) {
    // 눈: 전체 영역에 균일하게 분포 (위에서 아래로 떨어지므로)
    y = Math.random() * worldHeight;
  } else {
    // 불: 아래쪽에 더 많이 분포 (제곱 분포)
    const rand = Math.random();
    y = rand * rand * worldHeight;
  }

  // 깊이에 따라 크기 증가 (아래쪽일수록 더 큼)
  const depthRatio = y / worldHeight;
  const baseSize = Math.random() * 4 + 2;
  const depthBonus = depthRatio * 5;

  // 눈은 좌우로 더 많이 흔들리고, 천천히 떨어짐
  const vx = isIceTheme
    ? (Math.random() - 0.5) * 3  // 눈: 좌우 흔들림 더 크게
    : (Math.random() - 0.5) * 2;

  const vy = isIceTheme
    ? Math.random() * 1.5 + 0.8  // 눈: 천천히 떨어짐 (0.8~2.3)
    : -Math.random() * 2.5 - 0.8; // 불: 위로 올라감

  return {
    x: Math.random() * canvasWidth,
    y: y,
    vx: vx,
    vy: vy,
    size: baseSize + depthBonus,
    life: Math.random() * 150 + 80, // 수명 늘림
    maxLife: 230,
    color: colors[Math.floor(Math.random() * colors.length)]
  };
}

// 발판 그리기 (이미지)
function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isTarget: boolean,
  platformImg: HTMLImageElement | null
) {
  if (!platformImg) return;

  // 발판 이미지 크기 (크게)
  const imgWidth = width + 80;
  const imgHeight = height + 150;
  const imgX = x - 40;
  const imgY = y - 70;

  ctx.drawImage(platformImg, imgX, imgY, imgWidth, imgHeight);
}

// 층수 라벨 그리기
function drawFloorLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  floorNum: number,
  isTarget: boolean,
  isIceTheme: boolean = false
) {
  const labelWidth = 100;
  const labelHeight = 32;
  const labelX = x + (width - labelWidth) / 2;
  const labelY = y + 70; // 55 -> 70으로 내림

  // 라벨 배경 (테마에 따라 다름)
  if (isIceTheme) {
    ctx.fillStyle = isTarget ? 'rgba(79, 195, 247, 0.9)' : 'rgba(20, 20, 30, 0.9)';
  } else {
    ctx.fillStyle = isTarget ? 'rgba(251, 191, 36, 0.9)' : 'rgba(20, 20, 20, 0.9)';
  }
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
  ctx.fill();

  // 라벨 테두리
  if (isIceTheme) {
    ctx.strokeStyle = isTarget ? '#81d4fa' : '#4fc3f7';
  } else {
    ctx.strokeStyle = isTarget ? '#fcd34d' : '#ff4500';
  }
  ctx.lineWidth = 2;
  ctx.stroke();

  // 라벨 텍스트
  if (isIceTheme) {
    ctx.fillStyle = isTarget ? '#01579b' : '#81d4fa';
  } else {
    ctx.fillStyle = isTarget ? '#78350f' : '#ff6b35';
  }
  ctx.font = 'bold 16px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${floorNum}층`, labelX + labelWidth / 2, labelY + 22);
}

// 용암 그리기
function drawLava(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number) {
  // 용암 베이스 그라데이션
  const lavaGrad = ctx.createLinearGradient(x, y, x, y + height);
  lavaGrad.addColorStop(0, '#ff4500');
  lavaGrad.addColorStop(0.3, '#ff2200');
  lavaGrad.addColorStop(0.6, '#cc0000');
  lavaGrad.addColorStop(1, '#660000');
  ctx.fillStyle = lavaGrad;
  ctx.fillRect(x, y, width, height);

  // 용암 파동 (여러 레이어)
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.moveTo(x, y + 10 + layer * 8);

    for (let wx = 0; wx <= width; wx += 10) {
      const waveY = y + 10 + layer * 8 +
        Math.sin((wx + time * (2 - layer * 0.5)) * 0.03) * (8 - layer * 2) +
        Math.sin((wx + time * (1.5 - layer * 0.3)) * 0.05) * (5 - layer);
      ctx.lineTo(x + wx, waveY);
    }

    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();

    const alpha = 0.4 - layer * 0.1;
    ctx.fillStyle = `rgba(255, ${100 + layer * 50}, 0, ${alpha})`;
    ctx.fill();
  }

  // 용암 버블
  const bubbleCount = 8;
  for (let i = 0; i < bubbleCount; i++) {
    const bubbleX = x + ((i * 47 + time * 0.5) % width);
    const bubblePhase = (time * 0.05 + i * 1.3) % (Math.PI * 2);
    const bubbleY = y + 15 + Math.sin(bubblePhase) * 10;
    const bubbleSize = 3 + Math.sin(bubblePhase * 2) * 2;

    if (bubbleSize > 1) {
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 50, ${0.6 + Math.sin(bubblePhase) * 0.3})`;
      ctx.fill();
    }
  }

  // 용암 표면 글로우
  const glowGrad = ctx.createLinearGradient(x, y - 20, x, y + 30);
  glowGrad.addColorStop(0, 'rgba(255, 69, 0, 0)');
  glowGrad.addColorStop(0.5, 'rgba(255, 69, 0, 0.3)');
  glowGrad.addColorStop(1, 'rgba(255, 69, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x, y - 20, width, 50);
}

// 얼음 바닥 그리기 (나락 홀수용)
function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number) {
  // 얼음 베이스 그라데이션
  const iceGrad = ctx.createLinearGradient(x, y, x, y + height);
  iceGrad.addColorStop(0, '#4fc3f7');
  iceGrad.addColorStop(0.3, '#29b6f6');
  iceGrad.addColorStop(0.6, '#0288d1');
  iceGrad.addColorStop(1, '#01579b');
  ctx.fillStyle = iceGrad;
  ctx.fillRect(x, y, width, height);

  // 얼음 파동 (여러 레이어)
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.moveTo(x, y + 10 + layer * 8);

    for (let wx = 0; wx <= width; wx += 10) {
      const waveY = y + 10 + layer * 8 +
        Math.sin((wx + time * (1.5 - layer * 0.3)) * 0.025) * (6 - layer * 1.5) +
        Math.sin((wx + time * (1 - layer * 0.2)) * 0.04) * (4 - layer * 0.8);
      ctx.lineTo(x + wx, waveY);
    }

    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();

    const alpha = 0.35 - layer * 0.08;
    ctx.fillStyle = `rgba(150, ${200 + layer * 20}, 255, ${alpha})`;
    ctx.fill();
  }

  // 얼음 결정 반짝임
  const sparkleCount = 10;
  for (let i = 0; i < sparkleCount; i++) {
    const sparkleX = x + ((i * 37 + time * 0.3) % width);
    const sparklePhase = (time * 0.04 + i * 1.1) % (Math.PI * 2);
    const sparkleY = y + 12 + Math.sin(sparklePhase) * 8;
    const sparkleSize = 2 + Math.sin(sparklePhase * 2) * 1.5;

    if (sparkleSize > 1) {
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(sparklePhase) * 0.4})`;
      ctx.fill();
    }
  }

  // 얼음 표면 글로우
  const glowGrad = ctx.createLinearGradient(x, y - 20, x, y + 30);
  glowGrad.addColorStop(0, 'rgba(100, 200, 255, 0)');
  glowGrad.addColorStop(0.5, 'rgba(100, 200, 255, 0.25)');
  glowGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x, y - 20, width, 50);
}

export default function PinballTower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const ballRef = useRef<Ball | null>(null);
  const startFloorRef = useRef(0);
  const ballImageRef = useRef<HTMLImageElement | null>(null);
  const ballImageCacheRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const platformImageRef = useRef<HTMLImageElement | null>(null);
  const platformIceImageRef = useRef<HTMLImageElement | null>(null);
  const embersRef = useRef<Ember[]>([]);
  const timeRef = useRef(0);

  const [currentFloor, setCurrentFloor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameMsg, setGameMsg] = useState('게임 모드와 열쇠를 선택하세요!');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [remainingChances, setRemainingChances] = useState(0);
  const [isCleared, setIsCleared] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [displayFloor, setDisplayFloor] = useState(0);
  const [lastMoved, setLastMoved] = useState(0);
  const [spinningNumber, setSpinningNumber] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hiddenRewards, setHiddenRewards] = useState<HiddenReward[]>([]);
  const [bonusBox, setBonusBox] = useState(false);
  const [hasRocket, setHasRocket] = useState(false);
  const hasRocketRef = useRef(false);
  const [hasPungyo, setHasPungyo] = useState(false);
  const [finalBoxes, setFinalBoxes] = useState<{ reward: string; isPungyo: boolean }[]>([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [selectedRewardIdx, setSelectedRewardIdx] = useState<number | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [platformLoaded, setPlatformLoaded] = useState(false);

  // 게임 모드 관련 상태
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [canRevive, setCanRevive] = useState(false); // 부활 가능 여부
  const [isDead, setIsDead] = useState(false); // 사망 상태 (부활 대기)
  const [isPermaDead, setIsPermaDead] = useState(false); // 완전 사망 (보상 없음)
  const [usedRevive, setUsedRevive] = useState(false); // 부활 사용 여부
  const [deathFloor, setDeathFloor] = useState<number | null>(null); // 첫 사망 층

  const ceilingFloorRef = useRef(20);
  const cameraYRef = useRef(0);

  // 공 이미지 로드 및 캐싱 (고화질 축소)
  useEffect(() => {
    const img = new Image();
    img.src = '/mococo.webp';
    img.onload = () => {
      ballImageRef.current = img;

      // 고화질 캐싱: 200x200 크기로 미리 렌더링 (2x 해상도)
      const cacheSize = 200;
      const cacheCanvas = document.createElement('canvas');
      cacheCanvas.width = cacheSize;
      cacheCanvas.height = cacheSize;
      const cacheCtx = cacheCanvas.getContext('2d');
      if (cacheCtx) {
        cacheCtx.imageSmoothingEnabled = true;
        cacheCtx.imageSmoothingQuality = 'high';
        cacheCtx.drawImage(img, 0, 0, cacheSize, cacheSize);
        ballImageCacheRef.current = cacheCanvas;
      }

      setImageLoaded(true);
    };
  }, []);

  // 배경 이미지 로드 (b1.webp만)
  useEffect(() => {
    const img = new Image();
    img.src = '/b1.webp';
    img.onload = () => {
      bgImageRef.current = img;
      setBgLoaded(true);
    };
  }, []);

  // 발판 이미지 로드 (b2.webp: 용암, b3.png: 얼음)
  useEffect(() => {
    // 용암 발판 (지옥, 나락 짝수)
    const img = new Image();
    img.src = '/b2.webp';
    img.onload = () => {
      platformImageRef.current = img;
      setPlatformLoaded(true);
    };

    // 얼음 발판 (나락 홀수)
    const iceImg = new Image();
    iceImg.src = '/b3.webp';
    iceImg.onload = () => {
      platformIceImageRef.current = iceImg;
    };
  }, []);

  // 보상 이미지 미리 로드
  useEffect(() => {
    const preloadImages = [...Object.values(REWARD_IMAGES), ...Object.values(BASE_REWARD_IMAGES)];
    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // 이번 이동 룰렛 효과
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setSpinningNumber(Math.floor(Math.random() * 20) + 1);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // 불씨/눈꽃 파티클 초기화 (게임 모드에 따라 재생성, 깊이별 밀도 증가)
  useEffect(() => {
    const worldHeight = TOTAL_FLOORS * FLOOR_HEIGHT + 200;
    const isIceTheme = gameMode === 'narak-odd';
    const embers: Ember[] = [];
    // 파티클 개수 대폭 증가 (250개)
    for (let i = 0; i < 250; i++) {
      embers.push(createEmber(CANVAS_WIDTH, worldHeight, isIceTheme));
    }
    embersRef.current = embers;
  }, [gameMode]);

  const GROUND_Y = TOTAL_FLOORS * FLOOR_HEIGHT;
  const CEILING_PADDING = 50;
  const SKY_HEIGHT = CANVAS_HEIGHT; // b1.webp가 차지하는 높이 (맨 위 영역)

  const floorToY = useCallback((floor: number) => {
    return CEILING_PADDING + floor * FLOOR_HEIGHT;
  }, []);

  const yToFloor = useCallback((y: number) => {
    return Math.max(0, Math.min(TOTAL_FLOORS, Math.floor((y - CEILING_PADDING) / FLOOR_HEIGHT)));
  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ball = ballRef.current;
    timeRef.current += 16;

    // 물리 업데이트
    if (ball && isPlaying) {
      const gravity = ball.phase === 'rising' ? ball.currentGravity : GRAVITY;
      ball.vy += gravity;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx *= -0.8;
      } else if (ball.x > CANVAS_WIDTH - BALL_RADIUS) {
        ball.x = CANVAS_WIDTH - BALL_RADIUS;
        ball.vx *= -0.8;
      }

      if (ball.phase === 'falling') {
        const groundY = floorToY(TOTAL_FLOORS);
        if (ball.y >= groundY - BALL_RADIUS) {
          ball.y = groundY - BALL_RADIUS;

          const dropStartFloor = startFloorRef.current;
          // 로켓점프: 16~20 확정, 아니면 1~20 랜덤
          let progressFloors: number;
          if (hasRocketRef.current) {
            progressFloors = 16 + Math.floor(Math.random() * 5); // 16~20
            hasRocketRef.current = false;
            setHasRocket(false);
          } else {
            progressFloors = 1 + Math.floor(Math.random() * 20);
          }
          const targetFloor = Math.min(dropStartFloor + progressFloors, TOTAL_FLOORS);
          const actualProgress = targetFloor - dropStartFloor;
          const physicalFloor = targetFloor;

          ball.targetFloor = targetFloor;
          ball.physicalFloor = physicalFloor;
          ball.progressFloors = actualProgress;

          if (targetFloor >= TOTAL_FLOORS) {
            ball.targetX = ball.x;
            ball.targetY = groundY - BALL_RADIUS;
            ball.vx = 0;
            ball.vy = 0;
            ball.currentGravity = GRAVITY;
            ball.phase = 'stopped';

            setCurrentFloor(TOTAL_FLOORS);
            setDisplayFloor(TOTAL_FLOORS);
            setLastMoved(actualProgress);
            setIsPlaying(false);
            setIsCleared(true);
            setGameMsg('축하합니다! 지하 100층 도달!');

            // 게임 종료 - 최종 상자 생성
            const totalBoxes = bonusBox ? 4 : 3;
            const boxes: { reward: string; isPungyo: boolean }[] = [];
            const usedRewards: string[] = [];

            for (let i = 0; i < totalBoxes; i++) {
              let reward: string;
              const rewardList = getBoxRewards(gameMode, TOTAL_FLOORS);
              do {
                reward = rewardList[Math.floor(Math.random() * rewardList.length)];
              } while (usedRewards.includes(reward));
              usedRewards.push(reward);

              const isPungyo = (hasPungyo && i === 0) || Math.random() < 0.1;
              boxes.push({ reward, isPungyo });
            }
            setFinalBoxes(boxes);
            setGameEnded(true);

            // Supabase에 결과 저장
            if (selectedKey && gameMode) {
              saveHellSimResult({
                game_mode: gameMode,
                key_type: selectedKey,
                final_floor: TOTAL_FLOORS,
                hidden_rewards: hiddenRewards.map(r => r.name),
                box_rewards: boxes.map(b => b.reward),
                pungyo_count: boxes.filter(b => b.isPungyo).length,
                result_type: 'clear',
                used_revive: usedRevive,
                death_floor: deathFloor || undefined,
              });
            }
            return;
          }

          const centerX = CANVAS_WIDTH / 2;
          let targetX: number;

          if (ball.x > centerX) {
            targetX = 70 + Math.random() * 50;
          } else {
            targetX = CANVAS_WIDTH - 70 - Math.random() * 50;
          }
          ball.targetX = targetX;

          const x0 = ball.x;
          const y0 = groundY - BALL_RADIUS;
          const x1 = targetX;
          const ballImgHalf = 35;
          const y1 = floorToY(physicalFloor) - PLATFORM_HEIGHT - ballImgHalf;
          ball.targetY = y1;

          const riseHeight = Math.max(1, y0 - y1);
          const fallHeight = TOTAL_FLOORS - dropStartFloor;
          const energyFactor = Math.max(0.25, Math.sqrt(fallHeight / TOTAL_FLOORS));
          const bounceGravity = GRAVITY * energyFactor;
          const overshootFactor = 1.015;
          const vy0 = -Math.sqrt(2 * bounceGravity * riseHeight) * overshootFactor;
          const flightTime = Math.abs(vy0 / bounceGravity);
          const vx0 = (x1 - x0) / flightTime;

          ball.vx = vx0;
          ball.vy = vy0;
          ball.currentGravity = bounceGravity;
          ball.hasPassedTarget = false;
          ball.phase = 'rising';
        }
      } else if (ball.phase === 'rising') {
        const targetFloor = ball.targetFloor;
        const targetY = ball.targetY;

        if (targetFloor > 0 && targetFloor <= TOTAL_FLOORS) {
          if (ball.y <= targetY) {
            ball.hasPassedTarget = true;
          }

          const isDescending = ball.vy > 0;
          const isAtTarget = ball.y >= targetY - 10 && ball.y <= targetY + 40;

          const condition1 = ball.hasPassedTarget && isDescending && isAtTarget;
          const condition2 = ball.hasPassedTarget && isDescending && ball.y > targetY + 20;
          const condition3 = ball.hasPassedTarget && isDescending && ball.y > targetY + 100;

          if (condition1 || condition2 || condition3) {
            ball.y = targetY;
            ball.x = ball.targetX;
            ball.vy = 0;
            ball.vx = 0;
            ball.phase = 'stopped';

            const gained = ball.progressFloors;

            setCurrentFloor(targetFloor);
            setDisplayFloor(targetFloor);
            setLastMoved(gained);
            setIsPlaying(false);

            // 나락 모드: 홀수/짝수 체크
            if (gameMode === 'narak-odd' || gameMode === 'narak-even') {
              const isOddFloor = targetFloor % 2 === 1;
              const shouldDie = (gameMode === 'narak-odd' && !isOddFloor) ||
                               (gameMode === 'narak-even' && isOddFloor);

              if (shouldDie && targetFloor < TOTAL_FLOORS) {
                // 사망 처리
                if (canRevive) {
                  // 부활 가능 - 첫 사망 층 기록
                  setIsDead(true);
                  setCanRevive(false);
                  setDeathFloor(targetFloor);
                  setGameMsg(`${targetFloor}층 (${isOddFloor ? '홀수' : '짝수'})에 착지! 부활 가능!`);
                  return; // 부활 대기 상태로 전환
                } else {
                  // 완전 사망 - 보상 없음
                  setIsPermaDead(true);
                  setGameEnded(true);
                  setGameMsg(`사망! ${targetFloor}층 (${isOddFloor ? '홀수' : '짝수'})에 착지하여 실패!`);
                  // 완전 사망 결과 저장
                  if (selectedKey && gameMode) {
                    saveHellSimResult({
                      game_mode: gameMode,
                      key_type: selectedKey,
                      final_floor: targetFloor,
                      hidden_rewards: hiddenRewards.map(r => r.name),
                      box_rewards: [],
                      pungyo_count: 0,
                      result_type: 'death',
                      used_revive: usedRevive,
                      death_floor: deathFloor || targetFloor,
                    });
                  }
                  return;
                }
              }
            }

            // 히든층 체크 (11의 배수)
            let gotBonusBox = bonusBox;
            let gotPungyo = hasPungyo;
            let extraChance = 0;
            let currentHiddenReward: { floor: number; name: string; type: RewardType } | null = null;

            if (isHiddenFloor(targetFloor, gameMode)) {
              const reward = getRandomReward(gameMode);
              currentHiddenReward = { floor: targetFloor, name: reward.name, type: reward.type };
              setHiddenRewards(prev => [...prev, currentHiddenReward!]);

              if (reward.type === 'box') {
                gotBonusBox = true;
                setBonusBox(true);
              } else if (reward.type === 'chance') {
                extraChance = 1;
              } else if (reward.type === 'rocket') {
                setHasRocket(true);
                hasRocketRef.current = true;
              } else if (reward.type === 'pungyo') {
                gotPungyo = true;
                setHasPungyo(true);
              } else if (reward.type === 'life') {
                // 나락 전용: 부활 +1
                setCanRevive(true);
              }
            }

            // 기회 +1 적용
            const newRemainingChances = remainingChances + extraChance;
            if (extraChance > 0) {
              setRemainingChances(newRemainingChances);
            }

            if (targetFloor >= TOTAL_FLOORS) {
              setIsCleared(true);
              setGameMsg('축하합니다! 지하 100층 도달!');
              // 게임 종료 - 최종 상자 생성
              const totalBoxes = gotBonusBox ? 4 : 3;
              const boxes: { reward: string; isPungyo: boolean }[] = [];
              const usedRewards: string[] = [];

              for (let i = 0; i < totalBoxes; i++) {
                let reward: string;
                const rewardList = getBoxRewards(gameMode, targetFloor);
                do {
                  reward = rewardList[Math.floor(Math.random() * rewardList.length)];
                } while (usedRewards.includes(reward));
                usedRewards.push(reward);

                // 풍요 확률: 히든 풍요면 첫번째 무조건, 모든 상자 10% 확률
                const isPungyo = (gotPungyo && i === 0) || Math.random() < 0.1;
                boxes.push({ reward, isPungyo });
              }
              setFinalBoxes(boxes);
              setGameEnded(true);

              // Supabase에 결과 저장
              if (selectedKey && gameMode) {
                const allHiddenRewards = [...hiddenRewards];
                if (currentHiddenReward) {
                  allHiddenRewards.push(currentHiddenReward);
                }
                saveHellSimResult({
                  game_mode: gameMode,
                  key_type: selectedKey,
                  final_floor: targetFloor,
                  hidden_rewards: allHiddenRewards.map(r => r.name),
                  box_rewards: boxes.map(b => b.reward),
                  pungyo_count: boxes.filter(b => b.isPungyo).length,
                  result_type: 'clear',
                  used_revive: usedRevive,
                  death_floor: deathFloor || undefined,
                });
              }
            } else if (newRemainingChances > 0) {
              setGameMsg(`지하 ${targetFloor}층 도착! 남은 기회: ${newRemainingChances}회`);
            } else {
              setGameMsg(`게임 종료! 최종: 지하 ${targetFloor}층`);
              // 게임 종료 - 최종 상자 생성
              const totalBoxes = gotBonusBox ? 4 : 3;
              const boxes: { reward: string; isPungyo: boolean }[] = [];
              const usedRewards: string[] = [];

              for (let i = 0; i < totalBoxes; i++) {
                let reward: string;
                const rewardList = getBoxRewards(gameMode, targetFloor);
                do {
                  reward = rewardList[Math.floor(Math.random() * rewardList.length)];
                } while (usedRewards.includes(reward));
                usedRewards.push(reward);

                // 풍요 확률: 히든 풍요면 첫번째 무조건, 모든 상자 10% 확률
                const isPungyo = (gotPungyo && i === 0) || Math.random() < 0.1;
                boxes.push({ reward, isPungyo });
              }
              setFinalBoxes(boxes);

              // Supabase에 결과 저장
              if (selectedKey && gameMode) {
                const allHiddenRewards = [...hiddenRewards];
                if (currentHiddenReward) {
                  allHiddenRewards.push(currentHiddenReward);
                }
                saveHellSimResult({
                  game_mode: gameMode,
                  key_type: selectedKey,
                  final_floor: targetFloor,
                  hidden_rewards: allHiddenRewards.map(r => r.name),
                  box_rewards: boxes.map(b => b.reward),
                  pungyo_count: boxes.filter(b => b.isPungyo).length,
                  // 기회 소진으로 인한 일반 종료 (나락에서 사망 없이 끝난 경우 포함)
                  used_revive: usedRevive,
                  death_floor: deathFloor || undefined,
                });
              }
              setGameEnded(true);
            }
          }
        }
      }

      if (ball.phase === 'falling') {
        const floorFromY = yToFloor(ball.y);
        setDisplayFloor(Math.min(floorFromY, TOTAL_FLOORS));
      } else if (ball.phase === 'rising') {
        const floorFromY = yToFloor(ball.y);
        setDisplayFloor(Math.min(floorFromY, TOTAL_FLOORS));
      }
    }

    // 카메라 업데이트
    if (ball) {
      const targetCameraY = ball.y - CANVAS_HEIGHT / 2;
      const cameraDiff = targetCameraY - cameraYRef.current;
      const ballSpeed = Math.abs(ball.vy);
      const cameraSpeed = ballSpeed > 15 ? 0.45 : ballSpeed > 8 ? 0.35 : 0.25;
      cameraYRef.current += cameraDiff * cameraSpeed;
      cameraYRef.current = Math.max(0, Math.min(cameraYRef.current, GROUND_Y - CANVAS_HEIGHT + 100));
    }

    // 불씨/눈꽃 파티클 업데이트
    const particleWorldHeight = TOTAL_FLOORS * FLOOR_HEIGHT + 200;
    const isIceThemeParticle = gameMode === 'narak-odd';
    embersRef.current.forEach((ember, index) => {
      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.life--;

      // 흔들림 효과 (눈은 더 부드럽게)
      if (isIceThemeParticle) {
        ember.vx += (Math.random() - 0.5) * 0.2;
        // 눈이 좌우로 너무 벗어나지 않도록
        if (ember.vx > 2) ember.vx = 2;
        if (ember.vx < -2) ember.vx = -2;
      } else {
        ember.vx += (Math.random() - 0.5) * 0.3;
      }

      // x 범위 체크 (화면 밖으로 나가면 반대편에서 나타남)
      if (ember.x < -10) ember.x = CANVAS_WIDTH + 10;
      if (ember.x > CANVAS_WIDTH + 10) ember.x = -10;

      // 리셋 조건
      const shouldReset = isIceThemeParticle
        ? (ember.life <= 0 || ember.y > particleWorldHeight + 50)
        : (ember.life <= 0 || ember.y < -50);

      if (shouldReset) {
        if (isIceThemeParticle) {
          // 눈꽃: 현재 카메라 위치 기준 위쪽에서 시작
          const cameraTop = Math.max(0, cameraYRef.current - 100);
          const startY = cameraTop + Math.random() * 50;
          embersRef.current[index] = createEmber(CANVAS_WIDTH, particleWorldHeight, isIceThemeParticle, startY);
        } else {
          // 불씨: 현재 카메라 위치 기준 아래쪽에서 시작
          const cameraBottom = Math.min(particleWorldHeight, cameraYRef.current + CANVAS_HEIGHT + 100);
          const startY = cameraBottom - Math.random() * 50;
          embersRef.current[index] = createEmber(CANVAS_WIDTH, particleWorldHeight, isIceThemeParticle, startY);
        }
      }
    });

    // === 렌더링 ===
    const groundY = floorToY(TOTAL_FLOORS);

    // 1. 검정 배경으로 클리어
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. 배경 그라데이션 (게임 모드에 따라 다름)
    // 카메라 위치에 따라 그라데이션 시작점 조정
    const worldTop = cameraYRef.current;
    const gradStartY = Math.max(0, SKY_HEIGHT - worldTop); // 화면상 SKY_HEIGHT 위치
    const isIceTheme = gameMode === 'narak-odd';

    if (gradStartY < CANVAS_HEIGHT) {
      const bgGrad = ctx.createLinearGradient(0, gradStartY, 0, CANVAS_HEIGHT);
      if (isIceTheme) {
        // 나락 홀수: 얼음/파란색 테마
        bgGrad.addColorStop(0, 'rgba(10, 15, 25, 1)'); // 어두운 파랑에서 시작
        bgGrad.addColorStop(0.3, 'rgba(8, 20, 35, 1)'); // 점점 파래짐
        bgGrad.addColorStop(0.6, 'rgba(5, 25, 45, 1)'); // 더 파래짐
        bgGrad.addColorStop(1, 'rgba(5, 35, 60, 1)'); // 진한 파랑
      } else {
        // 지옥, 나락 짝수: 용암/붉은색 테마
        bgGrad.addColorStop(0, 'rgba(10, 10, 10, 1)'); // 순수 검정에서 시작
        bgGrad.addColorStop(0.3, 'rgba(15, 10, 8, 1)'); // 아주 살짝 붉은기
        bgGrad.addColorStop(0.6, 'rgba(25, 12, 8, 1)'); // 점점 붉어짐
        bgGrad.addColorStop(1, 'rgba(50, 15, 5, 1)'); // 붉은 검정
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, gradStartY, CANVAS_WIDTH, CANVAS_HEIGHT - gradStartY);
    }

    ctx.save();
    ctx.translate(0, -cameraYRef.current);

    // 3. b1.webp 배경 이미지 (맨 위 영역에만)
    if (bgLoaded && bgImageRef.current) {
      // b1.webp를 월드 좌표 0 ~ SKY_HEIGHT 영역에 그림
      ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_WIDTH, SKY_HEIGHT);

      // 이미지와 배경 사이 자연스러운 전환 (테마별 색상)
      const transitionGrad = ctx.createLinearGradient(0, SKY_HEIGHT - 200, 0, SKY_HEIGHT + 100);
      if (isIceTheme) {
        // 얼음 테마: 어두운 파란색으로 전환
        transitionGrad.addColorStop(0, 'rgba(10, 15, 25, 0)');
        transitionGrad.addColorStop(0.3, 'rgba(10, 15, 25, 0.3)');
        transitionGrad.addColorStop(0.6, 'rgba(10, 15, 25, 0.7)');
        transitionGrad.addColorStop(1, 'rgba(10, 15, 25, 1)');
      } else {
        // 용암 테마: 어두운 검정으로 전환
        transitionGrad.addColorStop(0, 'rgba(10, 10, 10, 0)');
        transitionGrad.addColorStop(0.3, 'rgba(10, 10, 10, 0.3)');
        transitionGrad.addColorStop(0.6, 'rgba(10, 10, 10, 0.7)');
        transitionGrad.addColorStop(1, 'rgba(10, 10, 10, 1)');
      }
      ctx.fillStyle = transitionGrad;
      ctx.fillRect(0, SKY_HEIGHT - 200, CANVAS_WIDTH, 300);
    }

    // 4. 불씨/눈꽃 파티클 그리기 (깊이에 따라 투명도 증가)
    const emberWorldHeight = TOTAL_FLOORS * FLOOR_HEIGHT + 200;
    embersRef.current.forEach(ember => {
      const screenY = ember.y - cameraYRef.current;
      if (screenY < -30 || screenY > CANVAS_HEIGHT + 30) return;

      const lifeAlpha = ember.life / ember.maxLife;
      const depthRatio = ember.y / emberWorldHeight;
      const depthAlpha = 0.4 + depthRatio * 0.6;
      const finalAlpha = lifeAlpha * depthAlpha;
      const size = ember.size * lifeAlpha;

      // 글로우 효과 (shadowBlur 대신 큰 반투명 원으로 대체 - 성능 개선)
      ctx.globalAlpha = finalAlpha * 0.3;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = ember.color;
      ctx.fill();

      // 코어
      ctx.globalAlpha = finalAlpha;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 5. 층 표시 및 플랫폼
    for (let i = 0; i <= TOTAL_FLOORS; i++) {
      const y = floorToY(i);
      const screenY = y - cameraYRef.current;

      if (screenY < -50 || screenY > CANVAS_HEIGHT + 50) continue;

      if (i < TOTAL_FLOORS) {
        const platformY = y - PLATFORM_HEIGHT;
        const isCurrentFloor = i === currentFloor;
        const isTargetFloor = ball && ball.targetFloor === i;

        let showPlatform = false;
        let isTarget = false;
        let platformX = CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2;
        let displayFloorNum = i;

        if (!ball || !isPlaying) {
          if (isCurrentFloor) {
            showPlatform = true;
            if (ball && ball.targetX) {
              platformX = ball.targetX - PLATFORM_WIDTH / 2;
            }
            displayFloorNum = currentFloor;
          }
        } else if (ball.phase === 'falling') {
          showPlatform = false;
        } else if (ball.phase === 'rising') {
          if (isTargetFloor) {
            showPlatform = true;
            isTarget = true;
            platformX = ball.targetX - PLATFORM_WIDTH / 2;
            displayFloorNum = ball.targetFloor;
          }
        }

        platformX = Math.max(5, Math.min(platformX, CANVAS_WIDTH - PLATFORM_WIDTH - 5));

        // 게임 모드에 따라 발판 이미지 선택
        const currentPlatformImg = isIceTheme && platformIceImageRef.current
          ? platformIceImageRef.current
          : platformImageRef.current;

        if (showPlatform && currentPlatformImg) {
          drawPlatform(ctx, platformX, platformY, PLATFORM_WIDTH, PLATFORM_HEIGHT, isTarget, currentPlatformImg);
          drawFloorLabel(ctx, platformX, platformY, PLATFORM_WIDTH, displayFloorNum, isTarget, isIceTheme);
        }
      }
    }

    // 6. 바닥 (100층) - 게임 모드에 따라 용암/얼음
    if (isIceTheme) {
      drawIce(ctx, 0, groundY, CANVAS_WIDTH, 100, timeRef.current);
    } else {
      drawLava(ctx, 0, groundY, CANVAS_WIDTH, 100, timeRef.current);
    }

    // 7. 공 그리기
    if (ball) {
      const imgSize = BALL_RADIUS * 10;

      // 캐시된 이미지 사용 (고화질)
      const ballImg = ballImageCacheRef.current || ballImageRef.current;

      // 공 궤적 (공과 동일한 오프셋 적용)
      const trailYOffset = -8;
      if (isPlaying && (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalAlpha = 0.3;
        for (let i = 1; i <= 3; i++) {
          const trailX = ball.x - ball.vx * i * 2;
          const trailY = ball.y - ball.vy * i * 2;
          if (ballImg) {
            const trailSize = imgSize * (1 - i * 0.15);
            ctx.drawImage(ballImg, trailX - trailSize / 2, trailY - trailSize / 2 + trailYOffset, trailSize, trailSize);
          }
        }
        ctx.globalAlpha = 1;
      }

      // 공 그림자
      const shadowY = Math.min(groundY - 2, ball.y + 40);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(ball.x, shadowY, imgSize * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 공 이미지 (캐시된 고화질 이미지 사용, 살짝 위로)
      const ballYOffset = -8; // 공을 8px 위로
      if (ballImg && imageLoaded) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(ballImg, ball.x - imgSize / 2, ball.y - imgSize / 2 + ballYOffset, imgSize, imgSize);
      } else {
        const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, BALL_RADIUS);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#ffd700');
        gradient.addColorStop(1, '#ff4500');
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#ff4500';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();

    // 상단 비네트 (어두운 느낌)
    const topVignette = ctx.createLinearGradient(0, 0, 0, 60);
    topVignette.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    topVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, CANVAS_WIDTH, 60);

    // 하단 글로우 (게임 모드에 따라 다름)
    const bottomGlow = ctx.createLinearGradient(0, CANVAS_HEIGHT - 80, 0, CANVAS_HEIGHT);
    if (isIceTheme) {
      bottomGlow.addColorStop(0, 'rgba(100, 200, 255, 0)');
      bottomGlow.addColorStop(1, 'rgba(100, 200, 255, 0.15)');
    } else {
      bottomGlow.addColorStop(0, 'rgba(255, 69, 0, 0)');
      bottomGlow.addColorStop(1, 'rgba(255, 69, 0, 0.15)');
    }
    ctx.fillStyle = bottomGlow;
    ctx.fillRect(0, CANVAS_HEIGHT - 80, CANVAS_WIDTH, 80);

    if (gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [isPlaying, remainingChances, floorToY, yToFloor, gameStarted, GROUND_Y, currentFloor, imageLoaded, bgLoaded, platformLoaded, bonusBox, hasPungyo, selectedKey, hiddenRewards, gameMode, canRevive, usedRevive, deathFloor]);

  useEffect(() => {
    if (gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameLoop]);

  // 초기 캔버스
  useEffect(() => {
    if (!gameStarted) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 시작 화면: b1.webp
      if (bgLoaded && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }, [gameStarted, bgLoaded]);

  const selectGameMode = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setSelectedKey(null);
    setRemainingChances(0);
    setCurrentFloor(0);
    setDisplayFloor(0);
    setLastMoved(0);
    setIsCleared(false);
    setGameStarted(false);
    setIsDead(false);
    setIsPermaDead(false);
    setCanRevive(mode !== 'hell'); // 나락 모드면 부활 1회 가능
    setUsedRevive(false);
    setDeathFloor(null);
    ballRef.current = null;
    cameraYRef.current = 0;
    setGameMsg(`${GAME_MODES[mode].name} 모드 선택! 열쇠를 선택하세요.`);
  }, []);

  const selectKey = useCallback((keyType: KeyType) => {
    if (!gameMode) return;
    setSelectedKey(keyType);
    setRemainingChances(KEY_TYPES[keyType].chances);
    setCurrentFloor(0);
    setDisplayFloor(0);
    setLastMoved(0);
    setIsCleared(false);
    setGameStarted(false);
    setIsDead(false);
    setIsPermaDead(false);
    setCanRevive(gameMode !== 'hell'); // 나락 모드면 부활 1회 가능
    setUsedRevive(false);
    setDeathFloor(null);
    ballRef.current = null;
    cameraYRef.current = 0;
    ceilingFloorRef.current = 20;
    startFloorRef.current = 0;
    setGameMsg(`${KEY_TYPES[keyType].name} 열쇠 선택! ${KEY_TYPES[keyType].chances}회 기회`);
  }, [gameMode]);

  const dropBall = useCallback(() => {
    if (!selectedKey || !gameMode || remainingChances <= 0 || isCleared || isPlaying || isDead || isPermaDead || gameEnded) return;

    startFloorRef.current = currentFloor;
    const newCeiling = Math.min(currentFloor + 20, TOTAL_FLOORS);
    ceilingFloorRef.current = newCeiling;

    const startPhysicalFloor = currentFloor;
    const platformX = ballRef.current?.targetX || CANVAS_WIDTH / 2;
    const ballImgHalf = 35;
    const startY = floorToY(startPhysicalFloor) - PLATFORM_HEIGHT - ballImgHalf;

    const pushDirection = Math.random() > 0.5 ? 1 : -1;
    const pushSpeed = 3 + Math.random() * 2;

    ballRef.current = {
      x: platformX,
      y: startY,
      vx: pushDirection * pushSpeed,
      vy: 0,
      phase: 'falling',
      targetFloor: currentFloor,
      physicalFloor: startPhysicalFloor,
      targetX: platformX,
      targetY: startY,
      progressFloors: 0,
      currentGravity: GRAVITY,
      hasPassedTarget: false
    };

    setRemainingChances(prev => prev - 1);
    setIsPlaying(true);
    setGameStarted(true);
    setGameMsg(`DROP! 지하 100층 바닥으로 떨어지는 중...`);
    cameraYRef.current = Math.max(0, startY - CANVAS_HEIGHT / 2);
  }, [currentFloor, selectedKey, gameMode, remainingChances, isCleared, isPlaying, isDead, isPermaDead, gameEnded, floorToY]);

  // 부활 함수 (나락 모드)
  const revive = useCallback(() => {
    if (!isDead || !gameMode) return;
    setIsDead(false);
    setUsedRevive(true);
    if (remainingChances > 0) {
      setGameMsg(`부활! 지하 ${currentFloor}층에서 계속합니다. 남은 기회: ${remainingChances}회`);
    } else {
      setGameMsg(`부활! 지하 ${currentFloor}층. 기회 소진 - 중단하고 보상을 받으세요.`);
    }
  }, [isDead, gameMode, currentFloor, remainingChances]);

  // 중단하고 보상받기 (나락 모드)
  const stopAndGetReward = useCallback(() => {
    if (!gameMode || gameMode === 'hell') return;
    if (isPlaying) return;

    // 현재 층 기준으로 보상 생성
    const totalBoxes = bonusBox ? 4 : 3;
    const boxes: { reward: string; isPungyo: boolean }[] = [];
    const usedRewards: string[] = [];

    for (let i = 0; i < totalBoxes; i++) {
      let reward: string;
      const rewardList = getBoxRewards(gameMode, currentFloor);
      do {
        reward = rewardList[Math.floor(Math.random() * rewardList.length)];
      } while (usedRewards.includes(reward));
      usedRewards.push(reward);

      const isPungyo = (hasPungyo && i === 0) || Math.random() < 0.1;
      boxes.push({ reward, isPungyo });
    }
    setFinalBoxes(boxes);
    setGameEnded(true);
    setIsDead(false);
    setGameMsg(`중단! 최종: 지하 ${currentFloor}층`);

    // Supabase에 결과 저장
    if (selectedKey && gameMode) {
      saveHellSimResult({
        game_mode: gameMode,
        key_type: selectedKey,
        final_floor: currentFloor,
        hidden_rewards: hiddenRewards.map(r => r.name),
        box_rewards: boxes.map(b => b.reward),
        pungyo_count: boxes.filter(b => b.isPungyo).length,
        result_type: 'stop',
        used_revive: usedRevive,
        death_floor: deathFloor || undefined,
        remaining_chances: remainingChances,
      });
    }
  }, [gameMode, isPlaying, bonusBox, hasPungyo, currentFloor, selectedKey, hiddenRewards, usedRevive, deathFloor, remainingChances]);

  const resetGame = useCallback(() => {
    ballRef.current = null;
    setCurrentFloor(0);
    setDisplayFloor(0);
    setLastMoved(0);
    setIsPlaying(false);
    setSelectedKey(null);
    setRemainingChances(0);
    setIsCleared(false);
    setGameStarted(false);
    setGameMode(null);
    setGameMsg('게임 모드와 열쇠를 선택하세요!');
    cameraYRef.current = 0;
    ceilingFloorRef.current = 20;
    startFloorRef.current = 0;
    setHiddenRewards([]);
    setBonusBox(false);
    setHasRocket(false);
    hasRocketRef.current = false;
    setHasPungyo(false);
    setFinalBoxes([]);
    setSelectedRewardIdx(null);
    setGameEnded(false);
    setIsDead(false);
    setIsPermaDead(false);
    setCanRevive(false);
    setUsedRevive(false);
    setDeathFloor(null);
  }, []);

  return (
    <div className={styles.gameLayout}>
      {/* 메인: 왼쪽(캔버스) + 오른쪽(컨트롤) */}
      <div className={styles.mainRow}>
        {/* 왼쪽: 캔버스 */}
        <div className={styles.gameColumn}>
          <div className={`${styles.canvasWrapper} ${gameMode === 'narak-odd' ? styles.canvasWrapperIce : ''}`}>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className={styles.canvas}
            />

            {/* 게임 모드 선택 오버레이 (게임 모드가 선택되지 않았을 때) */}
            {!gameMode && !gameStarted && (
              <div className={styles.selectionOverlay}>
                <div className={styles.selectionTitle}>게임 모드 선택</div>
                <div className={styles.selectionGrid}>
                  {(Object.keys(GAME_MODES) as GameMode[]).map((mode) => {
                    const modeIcon = mode === 'hell' ? '/celtic_key_5.webp' : mode === 'narak-odd' ? '/blue_key_5.webp' : '/key_5.webp';
                    return (
                      <button
                        key={mode}
                        className={`${styles.selectionButton} ${mode === 'narak-odd' ? styles.selectionButtonIce : ''}`}
                        onClick={() => selectGameMode(mode)}
                      >
                        <div className={styles.selectionButtonIcon}>
                          <NextImage
                            src={modeIcon}
                            alt={GAME_MODES[mode].name}
                            width={40}
                            height={40}
                            className={styles.selectionButtonIconImg}
                          />
                        </div>
                        <div className={styles.selectionButtonContent}>
                          <span className={styles.selectionButtonName}>{GAME_MODES[mode].name}</span>
                          <span className={styles.selectionButtonDesc}>{GAME_MODES[mode].description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 열쇠 선택 오버레이 (게임 모드 선택됨 & 열쇠 미선택) */}
            {gameMode && !selectedKey && !gameStarted && (
              <div className={`${styles.selectionOverlay} ${gameMode === 'narak-odd' ? styles.selectionOverlayIce : ''}`}>
                <div className={styles.selectionTitle}>열쇠 선택</div>
                <div className={styles.selectionSubtitle}>{GAME_MODES[gameMode].name} 모드</div>
                <div className={styles.keySelectionGrid}>
                  {(Object.keys(KEY_TYPES) as KeyType[]).map((keyType) => (
                    <button
                      key={keyType}
                      className={styles.keySelectionButton}
                      onClick={() => selectKey(keyType)}
                    >
                      <NextImage
                        src={KEY_IMAGES[gameMode][keyType]}
                        alt={KEY_TYPES[keyType].name}
                        width={80}
                        height={80}
                        className={styles.keySelectionImage}
                        priority
                      />
                      <span className={styles.keySelectionName}>{KEY_TYPES[keyType].name}</span>
                      <span className={styles.keySelectionChances}>{KEY_TYPES[keyType].chances}회</span>
                    </button>
                  ))}
                </div>
                <button className={styles.backButton} onClick={() => setGameMode(null)}>
                  ← 모드 다시 선택
                </button>
              </div>
            )}

            {/* 나락 모드: 중단 버튼 (왼쪽 상단) */}
            {gameMode && gameMode !== 'hell' && gameStarted && !gameEnded && !isPlaying && !isDead && currentFloor > 0 && (
              <button className={styles.stopButton} onClick={stopAndGetReward}>
                중단하고 보상받기
              </button>
            )}

            {/* 나락 모드: 부활 기회 표시 (오른쪽 상단) */}
            {gameMode && gameMode !== 'hell' && gameStarted && !gameEnded && (
              <div className={`${styles.reviveDisplay} ${gameMode === 'narak-odd' ? styles.reviveDisplayIce : ''}`}>
                <span className={styles.reviveLabel}>부활</span>
                <span className={styles.reviveCount}>x{canRevive ? 1 : 0}</span>
              </div>
            )}

            {/* 클리어 오버레이 */}
            {isCleared && (
              <div className={`${styles.resultOverlay} ${gameMode === 'narak-odd' ? styles.resultOverlayIce : ''}`}>
                <div className={styles.resultIcon}></div>
                <div className={styles.resultTitle}>클리어!</div>
                <div className={styles.resultFloor}>100층</div>
                <div className={styles.resultProgress}>{gameMode === 'hell' ? '지옥' : '나락'}의 끝에 도달했습니다</div>
              </div>
            )}

            {/* 나락 사망 오버레이 (부활 필수) */}
            {isDead && (
              <div className={`${styles.deathOverlay} ${gameMode === 'narak-odd' ? styles.deathOverlayIce : ''}`}>
                <div className={styles.deathTitle}>사망!</div>
                <div className={styles.deathFloor}>{currentFloor}층</div>
                <div className={styles.deathReason}>
                  {gameMode === 'narak-odd' ? '짝수층' : '홀수층'}에 착지했습니다
                </div>
                <button className={styles.reviveButton} onClick={revive}>
                  부활하기 (1회)
                </button>
                <div className={styles.reviveHint}>부활 후 중단 가능</div>
              </div>
            )}

            {/* 나락 완전 사망 오버레이 (보상 없음) */}
            {isPermaDead && (
              <div className={`${styles.permaDeathOverlay} ${gameMode === 'narak-odd' ? styles.permaDeathOverlayIce : ''}`}>
                <div className={styles.deathTitle}>실패!</div>
                <div className={styles.deathFloor}>{currentFloor}층</div>
                <div className={styles.deathReason}>
                  부활 후 다시 {gameMode === 'narak-odd' ? '짝수층' : '홀수층'}에 착지!
                </div>
                <div className={styles.noReward}>보상 없음</div>
              </div>
            )}
          </div>

        </div>

        {/* 오른쪽: 컨트롤 패널 */}
        <div className={styles.controlPanel}>
          {/* 현재 선택 상태 표시 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>선택 현황</span>
            </div>
            <div className={styles.selectionStatus}>
              <div className={styles.selectionStatusItem}>
                <span className={styles.selectionStatusLabel}>모드</span>
                <span className={styles.selectionStatusValue}>
                  {gameMode ? GAME_MODES[gameMode].name : '-'}
                </span>
              </div>
              <div className={styles.selectionStatusItem}>
                <span className={styles.selectionStatusLabel}>열쇠</span>
                <span className={styles.selectionStatusValue}>
                  {selectedKey && gameMode ? (
                    <NextImage
                      src={KEY_IMAGES[gameMode][selectedKey]}
                      alt={KEY_TYPES[selectedKey].name}
                      width={32}
                      height={32}
                      className={styles.selectionStatusKeyImg}
                    />
                  ) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 게임 현황 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>게임 현황</span>
            </div>
            <div className={styles.statusGrid}>
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>현재 위치</div>
                <div className={`${styles.statusValue} ${styles.statusValueHighlight}`}>
                  {currentFloor === 0 ? '지상' : `${currentFloor}층`}
                </div>
              </div>
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>남은 기회</div>
                <div className={styles.statusValue}>
                  <span className={styles.chanceNumber}>{remainingChances}</span>
                  <span className={styles.chanceUnit}>회</span>
                </div>
              </div>
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>이번 이동</div>
                <div className={`${styles.statusValue} ${isPlaying ? styles.animatePulse : ''} ${lastMoved > 0 && !isPlaying ? styles.statusValueProfit : ''}`}>
                  {isPlaying ? `-${spinningNumber}층` : lastMoved > 0 ? `-${lastMoved}층` : '-'}
                </div>
              </div>
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>히든층</div>
                <div className={styles.statusValue}>
                  <span className={styles.hiddenCount}>{hiddenRewards.length}</span>
                  <span className={styles.chanceUnit}>회</span>
                </div>
              </div>
            </div>
          </div>

          {/* 히든층 보상 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>히든 보상</span>
            </div>
            <div className={styles.hiddenRewardContent}>
              {hiddenRewards.length > 0 ? (
                hiddenRewards.map((reward, idx) => (
                  <div key={idx} className={styles.hiddenRewardItem}>
                    <span className={styles.hiddenRewardFloor}>{reward.floor}층</span>
                    <span className={styles.hiddenRewardName}>{reward.name}</span>
                  </div>
                ))
              ) : (
                <div className={styles.hiddenRewardEmpty}>-</div>
              )}
            </div>
          </div>


          {/* 버튼 */}
          <button
            className={styles.launchButton}
            onClick={dropBall}
            disabled={!selectedKey || !gameMode || remainingChances <= 0 || isCleared || isPlaying || isDead || isPermaDead || gameEnded}
          >
            {!gameMode
              ? '모드 선택'
              : !selectedKey
                ? '열쇠 선택'
                : isCleared
                  ? 'CLEAR!'
                  : isPermaDead
                    ? '실패!'
                    : isDead
                      ? '부활 대기중'
                      : gameEnded
                        ? '게임 종료'
                        : remainingChances <= 0
                          ? '기회 소진'
                          : isPlaying
                            ? '떨어지는 중...'
                            : 'DROP!'}
          </button>

          <button className={styles.resetButton} onClick={resetGame}>
            처음부터 다시하기
          </button>
        </div>
      </div>

      {/* 최종 상자 보상 - 전체 너비 */}
      {gameEnded && finalBoxes.length > 0 && (
        <div className={styles.rewardFullWidth}>
          <div className={styles.rewardHeader}>
            <span className={styles.rewardHeaderTitle}>획득 보상</span>
            <span className={styles.rewardHeaderTier}>단계 {getTier(currentFloor)}</span>
          </div>

          {/* 상자 보상 그리드 */}
          <div className={styles.rewardBoxGrid}>
            {finalBoxes.map((box, idx) => {
              const rewardImg = getRewardImage(box.reward, getTier(currentFloor));
              return (
                <div
                  key={idx}
                  className={`${styles.rewardCard} ${box.isPungyo ? styles.rewardCardPungyo : ''} ${selectedRewardIdx === idx ? styles.rewardCardActive : ''}`}
                  onClick={() => setSelectedRewardIdx(selectedRewardIdx === idx ? null : idx)}
                >
                  <div className={styles.rewardCardImgWrap}>
                    {rewardImg && (
                      <NextImage
                        src={rewardImg}
                        alt={box.reward}
                        width={100}
                        height={100}
                        className={styles.rewardCardImg}
                      />
                    )}
                    {box.isPungyo && <span className={styles.rewardCardPungyoBadge}>풍요</span>}
                  </div>
                  <div className={styles.rewardCardName}>{box.reward}</div>
                  <div className={styles.rewardCardQty}>
                    {getRewardQuantity(box.reward, currentFloor, gameMode)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 지옥 모드: 기본 보상 표시 */}
          {gameMode === 'hell' && (
            <div className={styles.baseRewardFullSection}>
              <div className={styles.baseRewardFullTitle}>기본 보상</div>
              <div className={styles.baseRewardFullGrid}>
                <div className={styles.baseRewardFullItem}>
                  <NextImage
                    src={BASE_REWARD_IMAGES['파편']}
                    alt="운명의 파편"
                    width={64}
                    height={64}
                    className={styles.baseRewardFullImg}
                  />
                  <div className={styles.baseRewardFullText}>
                    <span className={styles.baseRewardFullLabel}>운명의 파편</span>
                    <span className={styles.baseRewardFullValue}>{HELL_BASE_REWARDS[getTier(currentFloor)].파편.toLocaleString()}</span>
                  </div>
                </div>
                <div className={styles.baseRewardFullItem}>
                  <NextImage
                    src={BASE_REWARD_IMAGES['파괴석결정']}
                    alt="파괴석 결정"
                    width={64}
                    height={64}
                    className={styles.baseRewardFullImg}
                  />
                  <div className={styles.baseRewardFullText}>
                    <span className={styles.baseRewardFullLabel}>파괴석 결정</span>
                    <span className={styles.baseRewardFullValue}>{HELL_BASE_REWARDS[getTier(currentFloor)].파괴석결정}</span>
                  </div>
                </div>
                <div className={styles.baseRewardFullItem}>
                  <NextImage
                    src={BASE_REWARD_IMAGES['수호석결정']}
                    alt="수호석 결정"
                    width={64}
                    height={64}
                    className={styles.baseRewardFullImg}
                  />
                  <div className={styles.baseRewardFullText}>
                    <span className={styles.baseRewardFullLabel}>수호석 결정</span>
                    <span className={styles.baseRewardFullValue}>{HELL_BASE_REWARDS[getTier(currentFloor)].수호석결정}</span>
                  </div>
                </div>
                <div className={styles.baseRewardFullItem}>
                  <NextImage
                    src={BASE_REWARD_IMAGES['돌파석']}
                    alt="위대한 돌파석"
                    width={64}
                    height={64}
                    className={styles.baseRewardFullImg}
                  />
                  <div className={styles.baseRewardFullText}>
                    <span className={styles.baseRewardFullLabel}>위대한 돌파석</span>
                    <span className={styles.baseRewardFullValue}>{HELL_BASE_REWARDS[getTier(currentFloor)].돌파석}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 모바일 광고 - 보상 테이블 위 */}
      <div className="d-block d-lg-none my-3">
        <AdBanner slot="8616653628" />
      </div>

      {/* 전체 보상 테이블 - 항상 표시 */}
      <RewardTable />
    </div>
  );
}

// 전체 보상 테이블 컴포넌트
// (상수/함수는 @/lib/hell-reward-calc에서 import)

// 기본 보상 시세 매핑
const PRICE_BASE_MAP: Record<string, { id: string; bundle: number; fallbackId?: string; fallbackBundle?: number }> = {
  '파편': { id: '66130143', bundle: 3000 },
  '파괴석결정': { id: '66102007', bundle: 100, fallbackId: '66102006', fallbackBundle: 100 },
  '수호석결정': { id: '66102107', bundle: 100, fallbackId: '66102106', fallbackBundle: 100 },
  '돌파석': { id: '66110226', bundle: 1, fallbackId: '66110225', fallbackBundle: 1 },
};

// 표시명 매핑
const DISPLAY_NAMES: Record<string, string> = {
  '융화재료': '상비도스',
};

function getDisplayName(key: string): string {
  return DISPLAY_NAMES[key] || key;
}

function getBaseDisplayName(name: string): string {
  if (name === '파편') return '운명의 파편';
  if (name === '파괴석결정') return '파괴석 결정';
  if (name === '수호석결정') return '수호석 결정';
  if (name === '돌파석') return '위대한 운명의 돌파석';
  return name;
}

// 기본 보상 골드 가치 계산
function calcBaseRewardGold(
  rewardName: string,
  tier: number,
  prices: Record<string, number>
): number {
  const mapping = PRICE_BASE_MAP[rewardName];
  if (!mapping) return 0;

  const baseReward = HELL_BASE_REWARDS[tier];
  const qty = baseReward[rewardName as keyof typeof baseReward] as number;
  if (!qty) return 0;

  const unitPrice = getRewardUnitPrice(mapping.id, mapping.bundle, prices, mapping.fallbackId, mapping.fallbackBundle);
  return Math.floor(qty * unitPrice);
}

function RewardTable() {
  const [tableMode, setTableMode] = useState<'hell' | 'narak'>('hell');
  const [selectedTier, setSelectedTier] = useState<number>(6);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(8500);

  useEffect(() => {
    fetchPriceData()
      .then(({ latest }) => setPrices(latest))
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  const peonGoldValue = 8.5 * (exchangeRate / 100);
  const specialRefiningCost = calcSpecialRefiningUnitCost(prices);
  // 골드:로크 비율 (100골드 당 로크)
  const wonPer100Gold = exchangeRate > 0 ? Math.round(275000 / exchangeRate) : 0;

  const TIER_LABELS = ['0~9', '10~19', '20~29', '30~39', '40~49', '50~59', '60~69', '70~79', '80~89', '90~99', '100'];

  const HELL_REWARDS = [
    '파괴석/수호석', '돌파석', '융화재료', '재련 보조', '귀속골드',
    '어빌리티스톤 키트', '팔찌', '특수재련', '천상 도전권', '젬선택', '운명의 돌'
  ];
  const NARAK_REWARDS = [
    '재련보조', '귀속골드', '어빌리티스톤 키트', '팔찌',
    '귀속 각인서 랜덤', '귀속 보석', '젬선택', '운명의 돌'
  ];

  const rewards = tableMode === 'hell' ? HELL_REWARDS : NARAK_REWARDS;
  const rewardData = tableMode === 'hell' ? HELL_BOX_REWARDS_DATA : NARAK_BOX_REWARDS_DATA;
  const hasPrices = Object.keys(prices).length > 0;

  // 보상별 골드 가치 계산 & 정렬
  const sortedRewards = rewards
    .map((name) => {
      const rawVal = rewardData[name]?.[selectedTier];
      const available = !!rawVal && rawVal !== '-';
      const goldValue = available && hasPrices
        ? calcBoxRewardGold(name, selectedTier, prices, tableMode, peonGoldValue, specialRefiningCost)
        : null;
      return { name, rawVal: rawVal || '-', available, goldValue: goldValue ?? 0 };
    })
    .sort((a, b) => {
      if (!a.available && !b.available) return 0;
      if (!a.available) return 1;
      if (!b.available) return -1;
      return b.goldValue - a.goldValue;
    });

  const avgGold = (() => {
    const available = sortedRewards.filter(r => r.available && r.goldValue !== null);
    if (available.length === 0) return 0;
    return Math.floor(available.reduce((s, r) => s + r.goldValue, 0) / available.length);
  })();

  // 단가 소수점 표시 (정수면 정수, 소수면 1자리)
  function fmtPrice(v: number): string {
    return v % 1 === 0 ? v.toLocaleString() : v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  const peonDetail = `1페온 = 블크 8.5개, 블크100 = ${exchangeRate.toLocaleString()}G → ${fmtPrice(peonGoldValue)}G/페온`;

  // 상세 설명 생성
  function getRewardDetail(name: string, rawVal: string): string {
    if (name === '귀속골드') return '귀속 골드 직접 지급';
    if (name === '운명의 돌') return `${rawVal}개 × 900G/개 (고정가)`;
    if (name === '천상 도전권') return `${rawVal}개 × 3,000G/개 (고정가)`;
    if (name === '어빌리티스톤 키트') {
      const perItem = Math.floor(9 * peonGoldValue);
      return `${rawVal}개 × 9페온 × ${fmtPrice(peonGoldValue)}G/페온 = ${rawVal}개 × ${perItem.toLocaleString()}G | ${peonDetail}`;
    }
    if (name === '특수재련') {
      const medianAttempts = Math.ceil(Math.log(0.5) / Math.log(1 - SPECIAL_REFINING_RATE));
      const totalItems = medianAttempts * SPECIAL_REFINING_PER_ATTEMPT;
      return `${rawVal}개 × ${specialRefiningCost.toLocaleString()}G/개 | 산출: 일반재련(세르카 20→21) ÷ ${totalItems.toLocaleString()}개(중앙값 ${medianAttempts}회 × ${SPECIAL_REFINING_PER_ATTEMPT}개, 확률 ${(SPECIAL_REFINING_RATE * 100).toFixed(1)}%)`;
    }
    if (name === '팔찌') {
      const match = rawVal.match(/x\s*(\d+)/);
      if (!match) return rawVal;
      const qty = parseInt(match[1]);
      const peonGold = BRACELET_PEON * peonGoldValue;
      const perBracelet = BRACELET_USEFUL_PRICE + peonGold;
      const total = Math.floor(qty * BRACELET_USEFUL_PROB * perBracelet);
      return `${qty}개 × 유효확률 ${(BRACELET_USEFUL_PROB * 100).toFixed(2)}% × (${BRACELET_USEFUL_PRICE.toLocaleString()}G + ${BRACELET_PEON}페온 × ${fmtPrice(peonGoldValue)}G = ${fmtPrice(perBracelet)}G) = ${total.toLocaleString()}G | ${peonDetail}`;
    }
    if (name === '젬선택') {
      const { hero, rare } = parseGemCount(rawVal);
      const parts: string[] = [];
      if (hero > 0) parts.push(`영웅 ${hero}개 × ${getHeroGemMaxPrice(prices).toLocaleString()}G(시세)`);
      if (rare > 0) parts.push(`희귀 ${rare}개 × ${RARE_GEM_PRICE.toLocaleString()}G(고정가)`);
      return parts.join(' + ') || rawVal;
    }
    if (name === '귀속 각인서 랜덤') return `${rawVal}개 × ${calcEngravingExpectedValue(prices).toLocaleString()}G/개 (추적 ${ENGRAVING_IDS.length}종 + 비추적 ${TOTAL_ENGRAVINGS - ENGRAVING_IDS.length}종, 총 ${TOTAL_ENGRAVINGS}종 평균)`;
    if (name === '귀속 보석') {
      const gemPrice = Math.round(prices['auction_gem_fear_8'] || 0);
      return `${rawVal}개 × ${gemPrice.toLocaleString()}G/개 (8레벨 겁화 보석 시세)`;
    }
    if (name === '파괴석/수호석') {
      const [v1, v2] = parseDualValue(rawVal);
      const mapping = PRICE_ITEM_MAP[name];
      const raw1 = (prices[mapping.id] || 0);
      const raw2 = mapping.id2 ? (prices[mapping.id2] || 0) : 0;
      const unit1 = raw1 / mapping.bundle;
      const unit2 = mapping.id2 && mapping.bundle2 ? raw2 / mapping.bundle2 : 0;
      return `파괴석 ${v1.toLocaleString()}개 × ${fmtPrice(unit1)}G(${fmtPrice(raw1)}G/${mapping.bundle}개) + 수호석 ${v2.toLocaleString()}개 × ${fmtPrice(unit2)}G(${fmtPrice(raw2)}G/${mapping.bundle2}개)`;
    }
    if (name === '재련 보조' || name === '재련보조') {
      const [v1, v2] = parseDualValue(rawVal);
      const mapping = PRICE_ITEM_MAP[name];
      const unit1 = (prices[mapping.id] || 0) / mapping.bundle;
      const unit2 = mapping.id2 && mapping.bundle2 ? (prices[mapping.id2] || 0) / mapping.bundle2 : 0;
      return `용암의 숨결 ${v1.toLocaleString()}개 × ${fmtPrice(unit1)}G + 빙하의 숨결 ${v2.toLocaleString()}개 × ${fmtPrice(unit2)}G`;
    }
    if (name === '돌파석') {
      const mapping = PRICE_ITEM_MAP[name];
      const unitPrice = (prices[mapping.id] || 0) / mapping.bundle;
      return `${rawVal}개 × ${fmtPrice(unitPrice)}G/개 (시세)`;
    }
    if (name === '융화재료') {
      const mapping = PRICE_ITEM_MAP[name];
      const unitPrice = (prices[mapping.id] || 0) / mapping.bundle;
      return `${rawVal}개 × ${fmtPrice(unitPrice)}G/개 (시세)`;
    }
    return rawVal;
  }

  return (
    <div className={styles.rewardTableSection}>
      {/* 모드 선택 */}
      <div className={styles.rewardTableHeader}>
        <div className={styles.modeSwitchTrack}>
          <button
            className={`${styles.modeSwitchBtn} ${tableMode === 'hell' ? styles.modeSwitchBtnActive : ''}`}
            onClick={() => { setTableMode('hell'); setExpandedReward(null); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/celtic_key_5.webp" alt="" className={styles.modeSwitchIcon} />
            <span>지옥</span>
          </button>
          <button
            className={`${styles.modeSwitchBtn} ${tableMode === 'narak' ? styles.modeSwitchBtnActive : ''}`}
            onClick={() => { setTableMode('narak'); setExpandedReward(null); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/key_5.webp" alt="" className={styles.modeSwitchIcon} />
            <span>나락</span>
          </button>
        </div>
      </div>

      <div className={styles.rwBody}>
        {/* 단계 선택 */}
        <div className={styles.tierSelector}>
          <div className={styles.tierTrack}>
            {TIER_LABELS.map((label, idx) => (
              <button
                key={idx}
                className={`${styles.tierChip} ${selectedTier === idx ? styles.tierChipActive : ''}`}
                onClick={() => { setSelectedTier(idx); setExpandedReward(null); }}
              >
                <span className={styles.tierChipNum}>{idx}</span>
                <span className={styles.tierChipRange}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 환율 입력 */}
        <div className={styles.exchangeRateRow}>
          <div className={styles.exchangeRateCard}>
            <div className={styles.exchangeRatioRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/royal.webp" alt="" className={styles.exchangeRateIcon} />
              <span className={styles.exchangeRateFixed}>2750</span>
              <span className={styles.exchangeRateSeparator}>=</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/blue.webp" alt="" className={styles.exchangeRateIcon} />
              <span className={styles.exchangeRateFixed}>100</span>
              <span className={styles.exchangeRateSeparator}>=</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gold.webp" alt="" className={styles.exchangeRateIcon} />
              <input
                type="number"
                className={styles.exchangeRateInput}
                value={exchangeRate || ''}
                onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                placeholder="8500"
                min={0}
              />
            </div>
            <div className={styles.exchangeRatioRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gold.webp" alt="" className={styles.exchangeRateIcon} />
              <span className={styles.exchangeRateFixed}>100</span>
              <span className={styles.exchangeRateSeparator}>=</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/royal.webp" alt="" className={styles.exchangeRateIcon} />
              <input
                type="number"
                className={styles.exchangeRateInput}
                value={wonPer100Gold || ''}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setExchangeRate(v > 0 ? Math.round(275000 / v) : 0);
                }}
                placeholder="32"
                min={0}
              />
            </div>
            <div className={styles.exchangeRateResult}>
              페온 1개 = {Math.floor(peonGoldValue).toLocaleString()}골드
            </div>
          </div>
        </div>

        {/* 평균 골드 배너 */}
        {hasPrices && !priceLoading && (
          <div className={styles.avgBanner}>
            <div className={styles.avgBannerGlow} />
            <NextImage src="/gold.webp" alt="골드" width={36} height={36} className={styles.avgBannerIcon} />
            <div className={styles.avgBannerText}>
              <span className={styles.avgBannerLabel}>단계 {selectedTier} 평균 기댓값</span>
              <span className={styles.avgBannerValue}>{avgGold.toLocaleString()} G</span>
            </div>
            <div className={styles.avgBannerCount}>
              {sortedRewards.filter(r => r.available).length}종
            </div>
          </div>
        )}

        {/* 보상 카드 목록 */}
        {priceLoading ? (
          <div className={styles.rwLoading}>시세 불러오는 중...</div>
        ) : !hasPrices ? (
          <div className={styles.rwLoading}>시세 데이터를 불러올 수 없습니다</div>
        ) : (
          <div className={styles.rwCardList}>
            {sortedRewards.map((reward, idx) => {
              const isExpanded = expandedReward === reward.name;
              const rewardImg = getRewardImage(reward.name, selectedTier);
              const rank = reward.available ? idx + 1 : null;
              return (
                <div
                  key={reward.name}
                  className={`${styles.rwCard} ${!reward.available ? styles.rwCardDisabled : ''} ${isExpanded ? styles.rwCardExpanded : ''}`}
                >
                  <div
                    className={styles.rwCardMain}
                    onClick={() => reward.available && setExpandedReward(isExpanded ? null : reward.name)}
                  >
                    {/* 순위 뱃지 */}
                    {rank && rank <= 3 && (
                      <span className={`${styles.rwRankBadge} ${rank === 1 ? styles.rwRank1 : rank === 2 ? styles.rwRank2 : styles.rwRank3}`}>
                        {rank}
                      </span>
                    )}

                    {/* 이미지 */}
                    <div className={styles.rwCardImgWrap}>
                      {rewardImg ? (
                        <NextImage src={rewardImg} alt={reward.name} width={56} height={56} className={styles.rwCardImg} />
                      ) : (
                        <div className={styles.rwCardImgPlaceholder} />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className={styles.rwCardInfo}>
                      <span className={styles.rwCardName}>{getDisplayName(reward.name)}</span>
                      <span className={styles.rwCardQty}>{reward.rawVal}</span>
                    </div>

                    {/* 골드 가치 */}
                    <div className={styles.rwCardGold}>
                      {reward.available ? (
                        <>
                          <NextImage src="/gold.webp" alt="" width={18} height={18} />
                          <span>{reward.goldValue.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className={styles.rwCardUnavailable}>-</span>
                      )}
                    </div>

                    {/* 펼침 아이콘 */}
                    {reward.available && (
                      <span className={`${styles.rwExpandIcon} ${isExpanded ? styles.rwExpandIconOpen : ''}`}>
                        &#9662;
                      </span>
                    )}
                  </div>

                  {/* 상세 패널 */}
                  {isExpanded && (
                    <div className={styles.rwDetail}>
                      <div className={styles.rwDetailRow}>
                        <span className={styles.rwDetailLabel}>수량</span>
                        <span className={styles.rwDetailValue}>{reward.rawVal}</span>
                      </div>
                      <div className={styles.rwDetailRow}>
                        <span className={styles.rwDetailLabel}>산출</span>
                        <span className={styles.rwDetailValue}>{getRewardDetail(reward.name, reward.rawVal)}</span>
                      </div>
                      <div className={styles.rwDetailRow}>
                        <span className={styles.rwDetailLabel}>골드 가치</span>
                        <span className={styles.rwDetailGold}>{reward.goldValue.toLocaleString()} G</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
