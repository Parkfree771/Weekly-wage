'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from '@/app/hell-sim/hell-sim.module.css';
import { saveHellSimResult } from '@/lib/supabase';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 600;
const TOTAL_FLOORS = 100;
const FLOOR_HEIGHT = 120;
const BALL_RADIUS = 10;
const GRAVITY = 0.5;

const PLATFORM_WIDTH = 120;
const PLATFORM_HEIGHT = 12;

// 열쇠 타입 정의
const KEY_TYPES = {
  rare: { name: '희귀', chances: 5, color: '#3b82f6', gradient: ['#60a5fa', '#3b82f6', '#2563eb'] },
  epic: { name: '영웅', chances: 6, color: '#a855f7', gradient: ['#c084fc', '#a855f7', '#9333ea'] },
  legendary: { name: '전설', chances: 7, color: '#f97316', gradient: ['#fb923c', '#f97316', '#ea580c'] }
} as const;

// 상자 보상 목록
const BOX_REWARDS = [
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

type KeyType = keyof typeof KEY_TYPES;

// 히든층 보상 타입
type RewardType = 'box' | 'chance' | 'rocket' | 'pungyo';

// 히든층 보상 종류 (25% 확률씩)
const REWARD_TYPES: { type: RewardType; name: string }[] = [
  { type: 'box', name: '상자 +1' },
  { type: 'chance', name: '기회 +1' },
  { type: 'rocket', name: '로켓점프' },
  { type: 'pungyo', name: '풍요' },
];

// 히든층 체크 (11의 배수)
function isHiddenFloor(floor: number): boolean {
  return floor > 0 && floor % 11 === 0 && floor < 100;
}

// 랜덤 보상 선택
function getRandomReward(): { type: RewardType; name: string } {
  return REWARD_TYPES[Math.floor(Math.random() * REWARD_TYPES.length)];
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

// 불씨 생성
function createEmber(canvasWidth: number, worldHeight: number): Ember {
  const colors = ['#ff4500', '#ff6b35', '#ff8c00', '#ffa500', '#ffcc00', '#ff3300'];
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * worldHeight,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -Math.random() * 2 - 0.5,
    size: Math.random() * 4 + 2,
    life: Math.random() * 100 + 50,
    maxLife: 150,
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
  isTarget: boolean
) {
  const labelWidth = 100;
  const labelHeight = 32;
  const labelX = x + (width - labelWidth) / 2;
  const labelY = y + 55;

  // 라벨 배경
  ctx.fillStyle = isTarget ? 'rgba(251, 191, 36, 0.9)' : 'rgba(20, 20, 20, 0.9)';
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
  ctx.fill();

  // 라벨 테두리
  ctx.strokeStyle = isTarget ? '#fcd34d' : '#ff4500';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 라벨 텍스트
  ctx.fillStyle = isTarget ? '#78350f' : '#ff6b35';
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

export default function PinballTower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const ballRef = useRef<Ball | null>(null);
  const startFloorRef = useRef(0);
  const ballImageRef = useRef<HTMLImageElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const platformImageRef = useRef<HTMLImageElement | null>(null);
  const embersRef = useRef<Ember[]>([]);
  const timeRef = useRef(0);

  const [currentFloor, setCurrentFloor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameMsg, setGameMsg] = useState('열쇠를 선택하고 게임을 시작하세요!');
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
  const [bgLoaded, setBgLoaded] = useState(false);
  const [platformLoaded, setPlatformLoaded] = useState(false);

  const ceilingFloorRef = useRef(20);
  const cameraYRef = useRef(0);

  // 공 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.src = '/mococo.webp';
    img.onload = () => {
      ballImageRef.current = img;
      setImageLoaded(true);
    };
  }, []);

  // 배경 이미지 로드 (b1.png만)
  useEffect(() => {
    const img = new Image();
    img.src = '/b1.png';
    img.onload = () => {
      bgImageRef.current = img;
      setBgLoaded(true);
    };
  }, []);

  // 발판 이미지 로드 (b2.webp)
  useEffect(() => {
    const img = new Image();
    img.src = '/b2.webp';
    img.onload = () => {
      platformImageRef.current = img;
      setPlatformLoaded(true);
    };
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

  // 불씨 파티클 초기화
  useEffect(() => {
    const worldHeight = TOTAL_FLOORS * FLOOR_HEIGHT + 200;
    const embers: Ember[] = [];
    for (let i = 0; i < 60; i++) {
      embers.push(createEmber(CANVAS_WIDTH, worldHeight));
    }
    embersRef.current = embers;
  }, []);

  const GROUND_Y = TOTAL_FLOORS * FLOOR_HEIGHT;
  const CEILING_PADDING = 50;
  const SKY_HEIGHT = CANVAS_HEIGHT; // b1.png가 차지하는 높이 (맨 위 영역)

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

            // 히든층 체크 (11의 배수)
            let gotBonusBox = bonusBox;
            let gotPungyo = hasPungyo;
            let extraChance = 0;
            let currentHiddenReward: { floor: number; name: string; type: RewardType } | null = null;

            if (isHiddenFloor(targetFloor)) {
              const reward = getRandomReward();
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
                do {
                  reward = BOX_REWARDS[Math.floor(Math.random() * BOX_REWARDS.length)];
                } while (usedRewards.includes(reward));
                usedRewards.push(reward);

                // 풍요 확률: 히든 풍요면 첫번째 무조건, 모든 상자 10% 확률
                const isPungyo = (gotPungyo && i === 0) || Math.random() < 0.1;
                boxes.push({ reward, isPungyo });
              }
              setFinalBoxes(boxes);
              setGameEnded(true);

              // Supabase에 결과 저장
              if (selectedKey) {
                const allHiddenRewards = [...hiddenRewards];
                if (currentHiddenReward) {
                  allHiddenRewards.push(currentHiddenReward);
                }
                saveHellSimResult({
                  key_type: selectedKey,
                  final_floor: targetFloor,
                  hidden_rewards: allHiddenRewards.map(r => r.name),
                  box_rewards: boxes.map(b => b.reward),
                  pungyo_count: boxes.filter(b => b.isPungyo).length,
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
                do {
                  reward = BOX_REWARDS[Math.floor(Math.random() * BOX_REWARDS.length)];
                } while (usedRewards.includes(reward));
                usedRewards.push(reward);

                // 풍요 확률: 히든 풍요면 첫번째 무조건, 모든 상자 10% 확률
                const isPungyo = (gotPungyo && i === 0) || Math.random() < 0.1;
                boxes.push({ reward, isPungyo });
              }
              setFinalBoxes(boxes);

              // Supabase에 결과 저장
              if (selectedKey) {
                const allHiddenRewards = [...hiddenRewards];
                if (currentHiddenReward) {
                  allHiddenRewards.push(currentHiddenReward);
                }
                saveHellSimResult({
                  key_type: selectedKey,
                  final_floor: targetFloor,
                  hidden_rewards: allHiddenRewards.map(r => r.name),
                  box_rewards: boxes.map(b => b.reward),
                  pungyo_count: boxes.filter(b => b.isPungyo).length,
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
      const cameraSpeed = ballSpeed > 10 ? 0.3 : ballSpeed > 5 ? 0.2 : 0.15;
      cameraYRef.current += cameraDiff * cameraSpeed;
      cameraYRef.current = Math.max(0, Math.min(cameraYRef.current, GROUND_Y - CANVAS_HEIGHT + 100));
    }

    // 불씨 파티클 업데이트
    const worldHeight = TOTAL_FLOORS * FLOOR_HEIGHT + 200;
    embersRef.current.forEach((ember, index) => {
      ember.x += ember.vx;
      ember.y += ember.vy;
      ember.life--;

      // %.flickering
      ember.vx += (Math.random() - 0.5) * 0.3;

      if (ember.life <= 0 || ember.y < 0) {
        embersRef.current[index] = createEmber(CANVAS_WIDTH, worldHeight);
        embersRef.current[index].y = worldHeight - Math.random() * 200;
      }
    });

    // === 렌더링 ===
    const groundY = floorToY(TOTAL_FLOORS);

    // 1. 검정 배경으로 클리어
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. 지옥 그라데이션 (월드 좌표 기준 - 위쪽은 검정, 아래로 갈수록 붉은색)
    // 카메라 위치에 따라 그라데이션 시작점 조정
    const worldTop = cameraYRef.current;
    const gradStartY = Math.max(0, SKY_HEIGHT - worldTop); // 화면상 SKY_HEIGHT 위치

    if (gradStartY < CANVAS_HEIGHT) {
      const hellGrad = ctx.createLinearGradient(0, gradStartY, 0, CANVAS_HEIGHT);
      hellGrad.addColorStop(0, 'rgba(10, 10, 10, 1)'); // 순수 검정에서 시작
      hellGrad.addColorStop(0.3, 'rgba(15, 10, 8, 1)'); // 아주 살짝 붉은기
      hellGrad.addColorStop(0.6, 'rgba(25, 12, 8, 1)'); // 점점 붉어짐
      hellGrad.addColorStop(1, 'rgba(50, 15, 5, 1)'); // 붉은 검정
      ctx.fillStyle = hellGrad;
      ctx.fillRect(0, gradStartY, CANVAS_WIDTH, CANVAS_HEIGHT - gradStartY);
    }

    ctx.save();
    ctx.translate(0, -cameraYRef.current);

    // 3. b1.png 배경 이미지 (맨 위 영역에만)
    if (bgLoaded && bgImageRef.current) {
      // b1.png를 월드 좌표 0 ~ SKY_HEIGHT 영역에 그림
      ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_WIDTH, SKY_HEIGHT);

      // 이미지와 지옥 배경 사이 자연스러운 전환 (더 넓고 부드럽게)
      const transitionGrad = ctx.createLinearGradient(0, SKY_HEIGHT - 200, 0, SKY_HEIGHT + 100);
      transitionGrad.addColorStop(0, 'rgba(10, 10, 10, 0)');
      transitionGrad.addColorStop(0.3, 'rgba(10, 10, 10, 0.3)');
      transitionGrad.addColorStop(0.6, 'rgba(10, 10, 10, 0.7)');
      transitionGrad.addColorStop(1, 'rgba(10, 10, 10, 1)');
      ctx.fillStyle = transitionGrad;
      ctx.fillRect(0, SKY_HEIGHT - 200, CANVAS_WIDTH, 300);
    }

    // 4. 불씨 파티클 그리기
    embersRef.current.forEach(ember => {
      const screenY = ember.y - cameraYRef.current;
      if (screenY < -20 || screenY > CANVAS_HEIGHT + 20) return;

      const alpha = ember.life / ember.maxLife;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = ember.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.shadowColor = ember.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
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

        if (showPlatform && platformImageRef.current) {
          drawPlatform(ctx, platformX, platformY, PLATFORM_WIDTH, PLATFORM_HEIGHT, isTarget, platformImageRef.current);
          drawFloorLabel(ctx, platformX, platformY, PLATFORM_WIDTH, displayFloorNum, isTarget);
        }
      }
    }

    // 6. 용암 바닥 (100층)
    drawLava(ctx, 0, groundY, CANVAS_WIDTH, 100, timeRef.current);

    // 7. 공 그리기
    if (ball) {
      const imgSize = BALL_RADIUS * 10;

      // 공 궤적
      if (isPlaying && (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)) {
        ctx.globalAlpha = 0.3;
        for (let i = 1; i <= 3; i++) {
          const trailX = ball.x - ball.vx * i * 2;
          const trailY = ball.y - ball.vy * i * 2;
          if (ballImageRef.current) {
            ctx.drawImage(ballImageRef.current, trailX - imgSize / 2, trailY - imgSize / 2, imgSize * (1 - i * 0.15), imgSize * (1 - i * 0.15));
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

      // 공 이미지
      if (ballImageRef.current && imageLoaded) {
        ctx.shadowColor = '#ff4500';
        ctx.shadowBlur = 20;
        ctx.drawImage(ballImageRef.current, ball.x - imgSize / 2, ball.y - imgSize / 2, imgSize, imgSize);
        ctx.shadowBlur = 0;
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

    // 하단 용암 글로우
    const bottomGlow = ctx.createLinearGradient(0, CANVAS_HEIGHT - 80, 0, CANVAS_HEIGHT);
    bottomGlow.addColorStop(0, 'rgba(255, 69, 0, 0)');
    bottomGlow.addColorStop(1, 'rgba(255, 69, 0, 0.15)');
    ctx.fillStyle = bottomGlow;
    ctx.fillRect(0, CANVAS_HEIGHT - 80, CANVAS_WIDTH, 80);

    if (gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [isPlaying, remainingChances, floorToY, yToFloor, gameStarted, GROUND_Y, currentFloor, imageLoaded, bgLoaded, platformLoaded, bonusBox, hasPungyo, selectedKey, hiddenRewards]);

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

      // 시작 화면: b1.png
      if (bgLoaded && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }, [gameStarted, bgLoaded]);

  const selectKey = useCallback((keyType: KeyType) => {
    setSelectedKey(keyType);
    setRemainingChances(KEY_TYPES[keyType].chances);
    setCurrentFloor(0);
    setDisplayFloor(0);
    setLastMoved(0);
    setIsCleared(false);
    setGameStarted(false);
    ballRef.current = null;
    cameraYRef.current = 0;
    ceilingFloorRef.current = 20;
    startFloorRef.current = 0;
    setGameMsg(`${KEY_TYPES[keyType].name} 열쇠 선택! ${KEY_TYPES[keyType].chances}회 기회`);
  }, []);

  const dropBall = useCallback(() => {
    if (!selectedKey || remainingChances <= 0 || isCleared || isPlaying) return;

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
  }, [currentFloor, selectedKey, remainingChances, isCleared, isPlaying, floorToY]);

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
    setGameMsg('열쇠를 선택하고 게임을 시작하세요!');
    cameraYRef.current = 0;
    ceilingFloorRef.current = 20;
    startFloorRef.current = 0;
    setHiddenRewards([]);
    setBonusBox(false);
    setHasRocket(false);
    hasRocketRef.current = false;
    setHasPungyo(false);
    setFinalBoxes([]);
    setGameEnded(false);
  }, []);

  return (
    <div className={styles.gameLayout}>
      {/* 게임 캔버스 */}
      <div className={styles.gameArea}>
        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />

          {/* 클리어 오버레이 */}
          {isCleared && (
            <div className={styles.resultOverlay}>
              <div className={styles.resultIcon}></div>
              <div className={styles.resultTitle}>클리어!</div>
              <div className={styles.resultFloor}>100층</div>
              <div className={styles.resultProgress}>지옥의 끝에 도달했습니다</div>
            </div>
          )}
        </div>

        {/* 히든층 보상 표시 */}
        {hiddenRewards.length > 0 && (
          <div className={styles.rewardSection}>
            <div className={styles.rewardTitle}>특별 보상</div>
            <div className={styles.rewardList}>
              {hiddenRewards.map((reward, idx) => (
                <div key={idx} className={styles.rewardItem}>
                  <span className={styles.rewardFloor}>{reward.floor}층</span>
                  <span className={styles.rewardName}>{reward.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최종 상자 보상 */}
        {gameEnded && finalBoxes.length > 0 && (
          <div className={styles.finalRewardSection}>
            <div className={styles.finalRewardTitle}>획득 보상</div>
            <div className={styles.boxGrid}>
              {finalBoxes.map((box, idx) => (
                <div key={idx} className={`${styles.boxItem} ${box.isPungyo ? styles.boxPungyo : ''}`}>
                  <span className={styles.boxReward}>{box.reward}</span>
                  {box.isPungyo && <span className={styles.pungyoLabel}>풍요</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 컨트롤 패널 */}
      <div className={styles.controlPanel}>
        {/* 열쇠 선택 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}></span>
            <span className={styles.cardTitle}>열쇠 선택</span>
          </div>
          <div className={styles.keyGrid}>
            {(Object.keys(KEY_TYPES) as KeyType[]).map((keyType) => (
              <button
                key={keyType}
                className={`${styles.keyButton} ${selectedKey === keyType ? styles.keyButtonActive : ''}`}
                style={{
                  '--key-color': KEY_TYPES[keyType].color,
                  '--key-color-light': `${KEY_TYPES[keyType].color}20`,
                } as React.CSSProperties}
                onClick={() => selectKey(keyType)}
                disabled={gameStarted}
              >
                <span className={styles.keyName}>{KEY_TYPES[keyType].name}</span>
                <span className={styles.keyChances}>{KEY_TYPES[keyType].chances}회</span>
              </button>
            ))}
          </div>
        </div>

        {/* 게임 현황 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}></span>
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

        {/* 버튼 */}
        <button
          className={styles.launchButton}
          onClick={dropBall}
          disabled={!selectedKey || remainingChances <= 0 || isCleared || isPlaying}
        >
          {!selectedKey
            ? '열쇠를 선택하세요'
            : isCleared
              ? 'CLEAR!'
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
  );
}
