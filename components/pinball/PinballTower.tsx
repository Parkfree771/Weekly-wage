'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from '@/app/hell-sim/hell-sim.module.css';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 600;
const TOTAL_FLOORS = 100;
const FLOOR_HEIGHT = 120; // 층당 픽셀 높이 (훨씬 넓게)
const BALL_RADIUS = 10;
const GRAVITY = 0.5; // 중력 가속도

// 플랫폼 설정
const PLATFORM_WIDTH = 120; // 플랫폼 너비 (넓게)
const PLATFORM_LEFT = 20; // 플랫폼 왼쪽 위치
const PLATFORM_HEIGHT = 12; // 플랫폼 두께

// 열쇠 타입 정의
const KEY_TYPES = {
  rare: { name: '희귀', chances: 4, color: '#3b82f6' },
  epic: { name: '영웅', chances: 6, color: '#a855f7' },
  legendary: { name: '전설', chances: 7, color: '#f97316' },
  relic: { name: '유물', chances: 9, color: '#ef4444' }
} as const;

type KeyType = keyof typeof KEY_TYPES;

interface Ball {
  x: number;
  y: number;
  vx: number; // 수평 속도
  vy: number; // 수직 속도
  phase: 'ready' | 'falling' | 'rising' | 'stopped';
  targetFloor: number; // 게임상 목표 층
  physicalFloor: number; // 물리적 착지 위치
  targetX: number; // 착지할 X 위치 (플랫폼 중심)
  targetY: number; // 착지할 Y 위치
  progressFloors: number; // 이번에 진행한 층수
  currentGravity: number; // 이번 바운스의 중력 (에너지에 비례)
  hasPassedTarget: boolean; // 목표를 지나쳤는지 (오버슈팅 체크)
}

export default function PinballTower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const ballRef = useRef<Ball | null>(null);
  const startFloorRef = useRef(0); // 현재 드롭 시작 층 (물리 계산용)
  const ballImageRef = useRef<HTMLImageElement | null>(null); // 공 이미지

  const [currentFloor, setCurrentFloor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameMsg, setGameMsg] = useState('열쇠를 선택하고 게임을 시작하세요!');
  const [selectedKey, setSelectedKey] = useState<KeyType | null>(null);
  const [remainingChances, setRemainingChances] = useState(0);
  const [isCleared, setIsCleared] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [displayFloor, setDisplayFloor] = useState(0);
  const [lastMoved, setLastMoved] = useState(0); // 마지막 이동 층수
  const [imageLoaded, setImageLoaded] = useState(false);

  // 천장 위치 (현재층 + 20층 이상 못 올라감)
  const ceilingFloorRef = useRef(20);

  // 카메라 오프셋
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

  // 지하 구조: 0층이 위, 100층이 아래 (바닥)
  // Y좌표: 작을수록 위(0층 방향), 클수록 아래(100층 방향)
  const GROUND_Y = TOTAL_FLOORS * FLOOR_HEIGHT; // 바닥 Y좌표 (100층 위치)
  const CEILING_PADDING = 50; // 화면 상단 여백

  // 층을 Y 좌표로 변환 (0층이 위, 100층이 아래)
  const floorToY = useCallback((floor: number) => {
    return CEILING_PADDING + floor * FLOOR_HEIGHT;
  }, []);

  // Y 좌표를 층으로 변환
  const yToFloor = useCallback((y: number) => {
    return Math.max(0, Math.min(TOTAL_FLOORS, Math.floor((y - CEILING_PADDING) / FLOOR_HEIGHT)));
  }, []);

  // 게임 루프
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ball = ballRef.current;

    // 물리 업데이트
    if (ball && isPlaying) {
      // 중력 적용 (바운스 시 에너지에 따른 중력 사용)
      const gravity = ball.phase === 'rising' ? ball.currentGravity : GRAVITY;
      ball.vy += gravity;

      // 위치 업데이트
      ball.x += ball.vx;
      ball.y += ball.vy;

      // 벽 충돌 (좌우)
      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx *= -0.8;
      } else if (ball.x > CANVAS_WIDTH - BALL_RADIUS) {
        ball.x = CANVAS_WIDTH - BALL_RADIUS;
        ball.vx *= -0.8;
      }

      if (ball.phase === 'falling') {
        // 바닥(100층) 충돌 체크
        const groundY = floorToY(TOTAL_FLOORS);
        if (ball.y >= groundY - BALL_RADIUS) {
          ball.y = groundY - BALL_RADIUS;

          // 목표 층 결정 (항상 1~20층 진행! 불변!)
          const dropStartFloor = startFloorRef.current;

          // 항상 1~20 (절대 변하지 않음!)
          const progressFloors = 1 + Math.floor(Math.random() * 20);

          // 100층 넘으면 100층으로 제한 (90층에서 15 나오면 → 100층 도달!)
          const targetFloor = Math.min(dropStartFloor + progressFloors, TOTAL_FLOORS);

          // 실제 진행량 (표시용)
          const actualProgress = targetFloor - dropStartFloor;

          // 물리적 착지 위치 = 게임 층 (동일!)
          const physicalFloor = targetFloor;

          // 튕기는 높이 = 100 - 도착층 (도착층이 높을수록 적게 튕김)
          const bounceHeight = TOTAL_FLOORS - targetFloor;

          ball.targetFloor = targetFloor;
          ball.physicalFloor = physicalFloor;
          ball.progressFloors = actualProgress; // 실제 진행량 저장

          console.log(`Drop: ${dropStartFloor}층 → ${targetFloor}층 (굴림:${progressFloors}, 실제:+${actualProgress}), 튕김높이=${bounceHeight}`);

          // 100층 도달 (클리어) - 바닥에서 바로 종료
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

          // 착지 위치 결정 (포물선)
          const centerX = CANVAS_WIDTH / 2;
          let targetX: number;

          if (ball.x > centerX) {
            targetX = 70 + Math.random() * 50;
          } else {
            targetX = CANVAS_WIDTH - 70 - Math.random() * 50;
          }
          ball.targetX = targetX;

          // 시작점 (바닥)
          const x0 = ball.x;
          const y0 = groundY - BALL_RADIUS;

          // 목표점 (목표 층 위치) - 공이 이 높이에서 최고점(속도=0)에 도달
          const x1 = targetX;
          const y1 = floorToY(physicalFloor) - PLATFORM_HEIGHT - BALL_RADIUS;
          ball.targetY = y1;

          // 올라가야 할 높이
          const riseHeight = Math.max(1, y0 - y1); // 최소 1픽셀

          // 떨어진 높이에 비례한 에너지
          // 높은 곳에서 떨어졌으면 에너지 많음 → 빠르게
          // 낮은 곳에서 떨어졌으면 에너지 적음 → 느리게
          const fallHeight = TOTAL_FLOORS - dropStartFloor;
          const energyFactor = Math.max(0.25, Math.sqrt(fallHeight / TOTAL_FLOORS));

          // 이번 바운스의 중력 (에너지에 비례)
          // 에너지가 적으면 중력도 약함 → 느리게 움직이지만 같은 높이까지 도달
          const bounceGravity = GRAVITY * energyFactor;

          // 초기 속도 계산 - 목표보다 살짝 더 올라가도록 (오버슈팅)
          // v² = 2gh → v = sqrt(2gh)
          // 1.03배 속도로 목표보다 약간 위로 올라갔다가 내려옴
          const overshootFactor = 1.015;
          const vy0 = -Math.sqrt(2 * bounceGravity * riseHeight) * overshootFactor;

          // 비행 시간 = 최고점까지 가는 시간
          // v = v0 + gt = 0 → t = -v0/g
          const flightTime = Math.abs(vy0 / bounceGravity);

          // 수평 속도
          const vx0 = (x1 - x0) / flightTime;

          ball.vx = vx0;
          ball.vy = vy0;
          ball.currentGravity = bounceGravity;
          ball.hasPassedTarget = false; // 오버슈팅 플래그 초기화
          ball.phase = 'rising';

          console.log(`바운스: ${dropStartFloor}층→${targetFloor}층, 목표Y=${y1.toFixed(0)}, 초기속도=${vy0.toFixed(1)}`);
        }
      } else if (ball.phase === 'rising') {
        // 목표 플랫폼 착지 체크
        const targetFloor = ball.targetFloor;
        const targetY = ball.targetY;

        if (targetFloor > 0 && targetFloor <= TOTAL_FLOORS) {
          // 오버슈팅 체크: 공이 목표보다 위로 올라갔는지 기록
          if (ball.y <= targetY) {
            ball.hasPassedTarget = true;
          }

          const isDescending = ball.vy > 0; // 내려가는 중
          const isAtTarget = ball.y >= targetY - 10 && ball.y <= targetY + 40; // 목표 높이 근처

          // 메인 조건: 오버슈팅 후 내려오면서 목표에 착지
          const condition1 = ball.hasPassedTarget && isDescending && isAtTarget;
          // 조건 2: 오버슈팅 후 목표를 지나침
          const condition2 = ball.hasPassedTarget && isDescending && ball.y > targetY + 20;
          // 안전장치: 오버슈팅 했고 너무 많이 내려감
          const condition3 = ball.hasPassedTarget && isDescending && ball.y > targetY + 100;

          if (condition1 || condition2 || condition3) {
            // 착지!
            ball.y = targetY;
            ball.x = ball.targetX;
            ball.vy = 0;
            ball.vx = 0;
            ball.phase = 'stopped';

            const dropStartFloor = startFloorRef.current;
            const gained = ball.progressFloors;

            console.log(`착지: ${dropStartFloor}층 → ${targetFloor}층 (+${gained}층)`);

            setCurrentFloor(targetFloor);
            setDisplayFloor(targetFloor);
            setLastMoved(gained);
            setIsPlaying(false);

            if (targetFloor >= TOTAL_FLOORS) {
              setIsCleared(true);
              setGameMsg('축하합니다! 지하 100층 도달!');
            } else if (remainingChances > 0) {
              setGameMsg(`지하 ${targetFloor}층 도착! 남은 기회: ${remainingChances}회`);
            } else {
              setGameMsg(`게임 종료! 최종: 지하 ${targetFloor}층`);
            }
          }
        }
      }

      // 현재 층 표시 - Y 좌표 기반으로 실시간 표시
      if (ball.phase === 'falling') {
        // 떨어지는 중: 시작층 → 100층 방향
        const floorFromY = yToFloor(ball.y);
        setDisplayFloor(Math.min(floorFromY, TOTAL_FLOORS));
      } else if (ball.phase === 'rising') {
        // 올라가는 중: 100층 → 목표층 방향
        // Y좌표가 작을수록 높은 층(숫자가 작은 층)
        const floorFromY = yToFloor(ball.y);
        // 100층에서 시작해서 목표층까지 올라가므로, 실제 위치 기반으로 표시
        setDisplayFloor(Math.min(floorFromY, TOTAL_FLOORS));
      }
    }

    // 카메라 업데이트 - 공을 따라감
    if (ball) {
      const targetCameraY = ball.y - CANVAS_HEIGHT / 2;
      const cameraDiff = targetCameraY - cameraYRef.current;

      // 공이 빠르게 움직이면 카메라도 빠르게, 느리면 부드럽게
      const ballSpeed = Math.abs(ball.vy);
      const cameraSpeed = ballSpeed > 10 ? 0.3 : ballSpeed > 5 ? 0.2 : 0.15;

      cameraYRef.current += cameraDiff * cameraSpeed;
      cameraYRef.current = Math.max(0, Math.min(cameraYRef.current, GROUND_Y - CANVAS_HEIGHT + 100));
    }

    // 렌더링
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // 배경
    ctx.fillStyle = isDark ? '#1a1a2e' : '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(0, -cameraYRef.current);

    // 층 표시 및 플랫폼
    for (let i = 0; i <= TOTAL_FLOORS; i++) {
      const y = floorToY(i);
      const screenY = y - cameraYRef.current;

      if (screenY < -50 || screenY > CANVAS_HEIGHT + 50) continue;

      // 플랫폼 그리기 - 게임 층 = 물리 층
      if (i < TOTAL_FLOORS) {
        const platformY = y - PLATFORM_HEIGHT;
        // 현재 게임 층 (= 물리 층)
        const isCurrentFloor = i === currentFloor;
        const isTargetFloor = ball && ball.targetFloor === i;

        // 플랫폼 표시 조건 및 위치 결정
        let showPlatform = false;
        let isTarget = false;
        let platformX = CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2;
        let displayFloorNum = i; // 표시할 층 번호

        if (!ball || !isPlaying) {
          // 정지 상태 - 현재 게임 층에 플랫폼
          if (isCurrentFloor) {
            showPlatform = true;
            if (ball && ball.targetX) {
              platformX = ball.targetX - PLATFORM_WIDTH / 2;
            }
            displayFloorNum = currentFloor;
          }
        } else if (ball.phase === 'falling') {
          // 떨어지는 중 - 플랫폼 숨김
          showPlatform = false;
        } else if (ball.phase === 'rising') {
          // 상승 중 - 목표 층에 플랫폼
          if (isTargetFloor) {
            showPlatform = true;
            isTarget = true;
            platformX = ball.targetX - PLATFORM_WIDTH / 2;
            displayFloorNum = ball.targetFloor;
          }
        }

        platformX = Math.max(5, Math.min(platformX, CANVAS_WIDTH - PLATFORM_WIDTH - 5));

        if (showPlatform) {
          const pH = PLATFORM_HEIGHT + 6;
          const pW = PLATFORM_WIDTH;

          // 플랫폼 그림자
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.roundRect(platformX + 4, platformY + 4, pW, pH, 8);
          ctx.fill();

          // 플랫폼 그라데이션
          const platGrad = ctx.createLinearGradient(platformX, platformY, platformX, platformY + pH);
          if (isTarget) {
            platGrad.addColorStop(0, '#fcd34d');
            platGrad.addColorStop(0.3, '#f97316');
            platGrad.addColorStop(1, '#c2410c');
          } else {
            platGrad.addColorStop(0, '#86efac');
            platGrad.addColorStop(0.3, '#22c55e');
            platGrad.addColorStop(1, '#15803d');
          }
          ctx.fillStyle = platGrad;
          ctx.beginPath();
          ctx.roundRect(platformX, platformY, pW, pH, 8);
          ctx.fill();

          // 상단 하이라이트
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.roundRect(platformX + 4, platformY + 2, pW - 8, 5, 3);
          ctx.fill();

          // 장식 라인
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(platformX + 15, platformY + pH / 2);
          ctx.lineTo(platformX + pW - 15, platformY + pH / 2);
          ctx.stroke();

          // 테두리
          ctx.strokeStyle = isTarget ? 'rgba(234,88,12,0.8)' : 'rgba(21,128,61,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(platformX, platformY, pW, pH, 8);
          ctx.stroke();

          // 층 번호
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(`지하 ${displayFloorNum}층`, platformX + pW / 2, platformY - 10);
          ctx.shadowBlur = 0;
        }
      }

      // 층 번호 (10층마다 표시)
      if (i % 10 === 0 && i > 0) {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`지하 ${i}층`, CANVAS_WIDTH - 10, y - PLATFORM_HEIGHT / 2 + 5);
      }

    }

    // 바닥 (100층) - 스프링 바닥
    const groundY = floorToY(TOTAL_FLOORS);

    // 바닥 그라데이션
    const groundGradient = ctx.createLinearGradient(0, groundY, 0, groundY + 40);
    groundGradient.addColorStop(0, isDark ? '#f97316' : '#fb923c');
    groundGradient.addColorStop(1, isDark ? '#7c2d12' : '#9a3412');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 40);

    // 스프링 패턴
    ctx.strokeStyle = isDark ? '#fdba74' : '#fed7aa';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const sx = 30 + i * 40;
      ctx.beginPath();
      ctx.moveTo(sx, groundY + 5);
      ctx.quadraticCurveTo(sx + 10, groundY + 15, sx, groundY + 25);
      ctx.quadraticCurveTo(sx - 10, groundY + 35, sx, groundY + 40);
      ctx.stroke();
    }

    // 목표 층 표시 (상승 중에만)
    if (isPlaying && ball && ball.phase === 'rising' && ball.targetFloor > 0) {
      const targetY = floorToY(ball.targetFloor) - PLATFORM_HEIGHT / 2;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(PLATFORM_LEFT + PLATFORM_WIDTH + 5, targetY);
      ctx.lineTo(CANVAS_WIDTH - 20, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`→ 지하 ${ball.targetFloor}층`, CANVAS_WIDTH - 8, targetY + 5);
    }

    // 공 그리기
    if (ball) {
      const imgSize = BALL_RADIUS * 4; // 이미지 크기 (더 크게)

      // 공 궤적 (이동 중일 때)
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
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(ball.x, shadowY, imgSize * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 공 이미지 또는 대체 원
      if (ballImageRef.current && imageLoaded) {
        // 글로우 효과
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 20;
        ctx.drawImage(ballImageRef.current, ball.x - imgSize / 2, ball.y - imgSize / 2, imgSize, imgSize);
        ctx.shadowBlur = 0;
      } else {
        // 이미지 로딩 전 대체 원
        const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, BALL_RADIUS);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#ffd700');
        gradient.addColorStop(1, '#f97316');
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();

    // HUD - 현재 속도 표시 (디버그용, 나중에 제거 가능)
    if (ball && isPlaying) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      // ctx.fillText(`속도: ${ball.vy.toFixed(2)}`, 10, 20);
    }

    // 게임이 시작되면 계속 렌더링
    if (gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [isPlaying, remainingChances, floorToY, yToFloor, gameStarted, GROUND_Y, currentFloor, imageLoaded]);

  // 게임 렌더링 시작
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

  // 초기 캔버스 그리기
  useEffect(() => {
    if (!gameStarted) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? '#1a1a2e' : '#f0f0f0';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 미리보기 플랫폼
      ctx.fillStyle = isDark ? '#4a5568' : '#718096';
      ctx.fillRect(PLATFORM_LEFT, CANVAS_HEIGHT / 2 - 50, PLATFORM_WIDTH, PLATFORM_HEIGHT);

      // 미리보기 공
      const previewGradient = ctx.createRadialGradient(
        PLATFORM_LEFT + PLATFORM_WIDTH / 2 - 2, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS - 2, 0,
        PLATFORM_LEFT + PLATFORM_WIDTH / 2, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS, BALL_RADIUS
      );
      previewGradient.addColorStop(0, '#fff');
      previewGradient.addColorStop(0.3, '#ffd700');
      previewGradient.addColorStop(1, '#f97316');
      ctx.fillStyle = previewGradient;
      ctx.beginPath();
      ctx.arc(PLATFORM_LEFT + PLATFORM_WIDTH / 2, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS - 5, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // 화살표 (오른쪽으로)
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(PLATFORM_LEFT + PLATFORM_WIDTH / 2 + BALL_RADIUS + 5, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS - 5);
      ctx.lineTo(PLATFORM_LEFT + PLATFORM_WIDTH / 2 + BALL_RADIUS + 30, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS - 5);
      ctx.lineTo(PLATFORM_LEFT + PLATFORM_WIDTH / 2 + BALL_RADIUS + 20, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS - 12);
      ctx.moveTo(PLATFORM_LEFT + PLATFORM_WIDTH / 2 + BALL_RADIUS + 30, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS - 5);
      ctx.lineTo(PLATFORM_LEFT + PLATFORM_WIDTH / 2 + BALL_RADIUS + 20, CANVAS_HEIGHT / 2 - 50 - BALL_RADIUS + 2);
      ctx.stroke();

      // 안내 텍스트
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('공을 오른쪽으로 밀어', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
      ctx.fillText('바닥에서 튕겨 플랫폼에 착지!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
    }
  }, [gameStarted]);

  // 열쇠 선택
  const selectKey = useCallback((keyType: KeyType) => {
    setSelectedKey(keyType);
    setRemainingChances(KEY_TYPES[keyType].chances);
    setCurrentFloor(0);
    setDisplayFloor(0);
    setLastMoved(0);
    setIsCleared(false);
    setGameStarted(false);
    ballRef.current = null;
    // 0층(지상)에서 시작하므로 카메라도 맨 위
    cameraYRef.current = 0;
    ceilingFloorRef.current = 20;
    startFloorRef.current = 0;
    setGameMsg(`${KEY_TYPES[keyType].name} 열쇠 선택! ${KEY_TYPES[keyType].chances}회 기회`);
  }, []);

  // 공 떨어뜨리기
  const dropBall = useCallback(() => {
    if (!selectedKey || remainingChances <= 0 || isCleared || isPlaying) return;

    // 시작 층 저장 (게임 층 = 물리 층)
    startFloorRef.current = currentFloor;

    // 천장 설정: 현재 층 + 20 (최대 도달 가능)
    const newCeiling = Math.min(currentFloor + 20, TOTAL_FLOORS);
    ceilingFloorRef.current = newCeiling;

    // 공 시작 위치 = 현재 게임 층 (0층이면 0층에서 시작!)
    const startPhysicalFloor = currentFloor;
    const platformX = ballRef.current?.targetX || CANVAS_WIDTH / 2;
    const startY = floorToY(startPhysicalFloor) - PLATFORM_HEIGHT - BALL_RADIUS;

    // 랜덤하게 왼쪽 또는 오른쪽으로 밀기
    const pushDirection = Math.random() > 0.5 ? 1 : -1;
    const pushSpeed = 3 + Math.random() * 2;

    // 공 생성 - 플랫폼에서 밀어서 떨어뜨림
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

    // 카메라 초기화 - 시작 층 위치에 맞춤
    cameraYRef.current = Math.max(0, startY - CANVAS_HEIGHT / 2);
  }, [currentFloor, selectedKey, remainingChances, isCleared, isPlaying, floorToY]);

  // 리셋
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

          {/* 현재 층 표시 */}
          <div className={styles.currentFloorDisplay}>
            지하 <span className={styles.currentFloorNumber}>{displayFloor}</span>층
          </div>

          {/* 클리어 오버레이 */}
          {isCleared && (
            <div className={styles.resultOverlay}>
              <div className={styles.resultTitle}>🎉 클리어!</div>
              <div className={styles.resultFloor}>B100</div>
              <div className={styles.resultProgress}>축하합니다!</div>
            </div>
          )}
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className={styles.controlPanel}>
        {/* 열쇠 선택 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>열쇠 선택</div>
          <div className={styles.keyGrid}>
            {(Object.keys(KEY_TYPES) as KeyType[]).map((keyType) => (
              <button
                key={keyType}
                className={`${styles.keyButton} ${selectedKey === keyType ? styles.keyButtonActive : ''}`}
                style={{
                  borderColor: selectedKey === keyType ? KEY_TYPES[keyType].color : undefined,
                  backgroundColor: selectedKey === keyType ? `${KEY_TYPES[keyType].color}20` : undefined
                }}
                onClick={() => selectKey(keyType)}
                disabled={gameStarted}
              >
                <span className={styles.keyName} style={{ color: KEY_TYPES[keyType].color }}>
                  {KEY_TYPES[keyType].name}
                </span>
                <span className={styles.keyChances}>{KEY_TYPES[keyType].chances}회</span>
              </button>
            ))}
          </div>
        </div>

        {/* 상태 표시 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>게임 현황</div>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>현재 위치</div>
              <div className={`${styles.statusValue} ${styles.statusValueHighlight}`}>
                {currentFloor === 0 ? '지상' : `지하 ${currentFloor}층`}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>남은 기회</div>
              <div className={styles.statusValue}>{remainingChances}회</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>이번 이동</div>
              <div className={`${styles.statusValue}`} style={{ color: lastMoved > 0 ? '#22c55e' : undefined }}>
                {lastMoved > 0 ? `+${lastMoved}층` : '-'}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>목표</div>
              <div className={styles.statusValue} style={{ fontSize: '1.2rem' }}>지하 100층</div>
            </div>
          </div>
        </div>

        {/* 메시지 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>메시지</div>
          <div className={`${styles.messageBox} ${isPlaying ? styles.animatePulse : ''}`}>
            {gameMsg}
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
              ? '🎉 CLEAR!'
              : remainingChances <= 0
                ? '기회 소진'
                : isPlaying
                  ? '떨어지는 중...'
                  : 'DROP!'}
        </button>

        <button className={styles.resetButton} onClick={resetGame}>
          처음부터 다시하기
        </button>

        {/* 설명 */}
        <div className={styles.infoText}>
          * 현재 층에서 지하 100층 바닥으로 떨어집니다<br />
          * 높은 곳에서 떨어질수록 세게 튕깁니다!<br />
          * 매번 +1~20층 진행, 100층 가까울수록 클리어 확률↑
        </div>
      </div>
    </div>
  );
}
