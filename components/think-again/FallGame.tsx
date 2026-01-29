'use client';

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

// 게임 설정
const CONFIG = {
  CANVAS_WIDTH: 300,
  CANVAS_HEIGHT: 500,
  FPS: 60,

  // 구름 설정
  CLOUD_COUNT: 6,
  CLOUD_MIN_GAP: 60,
  CLOUD_MAX_GAP: 120,

  // 낙하 속도 (구름이 올라가는 속도)
  SPEED_SAFE: 3,      // 0~9층: 느림
  SPEED_STUMBLE: 7,   // 10~14층: 중간
  SPEED_CRASH: 12,    // 15~20층: 빠름

  // 낙하 시간 (프레임)
  DURATION_SAFE: 60,     // 1초
  DURATION_STUMBLE: 120, // 2초
  DURATION_CRASH: 200,   // 3.3초

  // 졸라맨 위치
  STICKMAN_X: 150,
  STICKMAN_Y: 200,
};

// 구름 클래스
class Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;

  constructor(canvasHeight: number) {
    this.width = 60 + Math.random() * 40;
    this.height = 20 + Math.random() * 15;
    this.x = Math.random() * (CONFIG.CANVAS_WIDTH - this.width);
    this.y = canvasHeight + Math.random() * 200;
    this.speed = 0;
    this.opacity = 0.3 + Math.random() * 0.4;
  }

  update(speed: number) {
    this.y -= speed;
    // 화면 위로 나가면 아래에서 재생성
    if (this.y + this.height < 0) {
      this.y = CONFIG.CANVAS_HEIGHT + Math.random() * 100;
      this.x = Math.random() * (CONFIG.CANVAS_WIDTH - this.width);
      this.width = 60 + Math.random() * 40;
      this.opacity = 0.3 + Math.random() * 0.4;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#ffffff';

    // 구름 모양 (둥근 뭉게구름)
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx - this.width * 0.3, cy, this.width / 3, this.height / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + this.width * 0.3, cy, this.width / 3, this.height / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// 졸라맨 상태
type StickmanState = 'idle' | 'falling' | 'safe' | 'stumble' | 'crash';

// 졸라맨 클래스
class Stickman {
  x: number;
  y: number;
  state: StickmanState;
  animFrame: number;

  // 관절 각도
  leftArmAngle: number;
  rightArmAngle: number;
  leftLegAngle: number;
  rightLegAngle: number;
  bodyRotation: number;

  // 착지 애니메이션용
  landingFrame: number;
  squashY: number;

  constructor() {
    this.x = CONFIG.STICKMAN_X;
    this.y = CONFIG.STICKMAN_Y;
    this.state = 'idle';
    this.animFrame = 0;
    this.leftArmAngle = 0;
    this.rightArmAngle = 0;
    this.leftLegAngle = 0;
    this.rightLegAngle = 0;
    this.bodyRotation = 0;
    this.landingFrame = 0;
    this.squashY = 1;
  }

  update() {
    this.animFrame++;

    if (this.state === 'idle') {
      // 대기: 살짝 흔들림
      this.leftArmAngle = Math.sin(this.animFrame * 0.05) * 0.1;
      this.rightArmAngle = -Math.sin(this.animFrame * 0.05) * 0.1;
    }
    else if (this.state === 'falling') {
      // 낙하: 팔다리 버둥버둥
      this.leftArmAngle = Math.sin(this.animFrame * 0.3) * 1.2;
      this.rightArmAngle = -Math.sin(this.animFrame * 0.3 + 1) * 1.2;
      this.leftLegAngle = Math.sin(this.animFrame * 0.25) * 0.6;
      this.rightLegAngle = -Math.sin(this.animFrame * 0.25 + 0.5) * 0.6;
      this.bodyRotation = Math.sin(this.animFrame * 0.1) * 0.15;
    }
    else if (this.state === 'safe') {
      // 안전 착지
      this.landingFrame++;
      if (this.landingFrame < 10) {
        this.squashY = 0.7 + (this.landingFrame / 10) * 0.3;
      } else {
        this.squashY = 1;
      }
      this.leftArmAngle = -0.3;
      this.rightArmAngle = 0.3;
      this.leftLegAngle = 0.2;
      this.rightLegAngle = -0.2;
      this.bodyRotation = 0;
    }
    else if (this.state === 'stumble') {
      // 철푸덕
      this.landingFrame++;
      if (this.landingFrame < 15) {
        this.bodyRotation = (this.landingFrame / 15) * (Math.PI / 2);
        this.squashY = 1 - (this.landingFrame / 15) * 0.3;
      } else {
        this.bodyRotation = Math.PI / 2;
        this.squashY = 0.7;
      }
      this.leftArmAngle = -1;
      this.rightArmAngle = 1.5;
    }
    else if (this.state === 'crash') {
      // 크래시 (분해)
      this.landingFrame++;
      if (this.landingFrame < 20) {
        this.bodyRotation += 0.3;
        this.squashY = 1 - (this.landingFrame / 20) * 0.5;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bodyRotation);
    ctx.scale(1, this.squashY);

    const headRadius = 18;
    const bodyLength = 45;
    const armLength = 30;
    const legLength = 40;

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 몸통
    ctx.beginPath();
    ctx.moveTo(0, headRadius);
    ctx.lineTo(0, headRadius + bodyLength);
    ctx.stroke();

    // 왼팔
    ctx.save();
    ctx.translate(0, headRadius + 8);
    ctx.rotate(this.leftArmAngle - Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-armLength, 0);
    ctx.stroke();
    ctx.restore();

    // 오른팔
    ctx.save();
    ctx.translate(0, headRadius + 8);
    ctx.rotate(this.rightArmAngle + Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength, 0);
    ctx.stroke();
    ctx.restore();

    // 왼다리
    ctx.save();
    ctx.translate(0, headRadius + bodyLength);
    ctx.rotate(this.leftLegAngle + Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, legLength);
    ctx.stroke();
    ctx.restore();

    // 오른다리
    ctx.save();
    ctx.translate(0, headRadius + bodyLength);
    ctx.rotate(this.rightLegAngle - Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, legLength);
    ctx.stroke();
    ctx.restore();

    // 머리
    ctx.beginPath();
    ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a5f';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 눈
    ctx.fillStyle = '#ffffff';
    if (this.state === 'crash' && this.landingFrame > 10) {
      // X_X 눈
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -4); ctx.lineTo(-2, 2);
      ctx.moveTo(-2, -4); ctx.lineTo(-8, 2);
      ctx.moveTo(2, -4); ctx.lineTo(8, 2);
      ctx.moveTo(8, -4); ctx.lineTo(2, 2);
      ctx.stroke();
    } else if (this.state === 'falling') {
      // 놀란 눈 (크게)
      ctx.beginPath();
      ctx.arc(-5, -2, 4, 0, Math.PI * 2);
      ctx.arc(5, -2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 보통 눈
      ctx.beginPath();
      ctx.arc(-5, -2, 3, 0, Math.PI * 2);
      ctx.arc(5, -2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 입
    ctx.lineWidth = 2;
    if (this.state === 'falling') {
      // 으아악 입
      ctx.beginPath();
      ctx.ellipse(0, 8, 6, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.stroke();
    } else if (this.state === 'crash') {
      // 혼란 입
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.bezierCurveTo(-3, 12, 3, 5, 5, 9);
      ctx.stroke();
    } else if (this.state === 'stumble') {
      // 으엑 입
      ctx.beginPath();
      ctx.arc(0, 8, 4, 0, Math.PI);
      ctx.stroke();
    } else {
      // 보통 입
      ctx.beginPath();
      ctx.arc(0, 6, 4, 0, Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  setState(state: StickmanState) {
    this.state = state;
    this.landingFrame = 0;
    this.squashY = 1;
    if (state === 'idle') {
      this.bodyRotation = 0;
      this.leftArmAngle = 0;
      this.rightArmAngle = 0;
      this.leftLegAngle = 0;
      this.rightLegAngle = 0;
    }
  }
}

export interface FallGameHandle {
  startFall: (floors: number) => void;
  reset: () => void;
}

interface FallGameProps {
  onFallComplete: () => void;
  fallAmount: number;
}

const FallGame = forwardRef<FallGameHandle, FallGameProps>(({ onFallComplete, fallAmount }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const stickmanRef = useRef<Stickman>(new Stickman());
  const cloudsRef = useRef<Cloud[]>([]);
  const gameStateRef = useRef<'idle' | 'falling' | 'landing' | 'done'>('idle');
  const fallFrameRef = useRef(0);
  const speedRef = useRef(0);
  const durationRef = useRef(0);

  // 구름 초기화
  useEffect(() => {
    cloudsRef.current = [];
    for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) {
      const cloud = new Cloud(CONFIG.CANVAS_HEIGHT);
      cloud.y = (CONFIG.CANVAS_HEIGHT / CONFIG.CLOUD_COUNT) * i + Math.random() * 50;
      cloudsRef.current.push(cloud);
    }
  }, []);

  // 게임 루프
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 배경
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0c1929');
    gradient.addColorStop(0.5, '#1e3a5f');
    gradient.addColorStop(1, '#2d5a87');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    const stickman = stickmanRef.current;
    const gameState = gameStateRef.current;

    // 구름 업데이트 & 그리기
    let cloudSpeed = 0;
    if (gameState === 'falling') {
      cloudSpeed = speedRef.current;
      fallFrameRef.current++;

      // 낙하 완료 체크
      if (fallFrameRef.current >= durationRef.current) {
        gameStateRef.current = 'landing';

        // 착지 상태 결정
        if (fallAmount <= 9) {
          stickman.setState('safe');
        } else if (fallAmount <= 14) {
          stickman.setState('stumble');
        } else {
          stickman.setState('crash');
        }
      }
    } else if (gameState === 'idle') {
      cloudSpeed = 0.5; // 대기 중 느린 구름
    }

    cloudsRef.current.forEach(cloud => {
      cloud.update(cloudSpeed);
      cloud.draw(ctx);
    });

    // 졸라맨 업데이트 & 그리기
    stickman.update();
    stickman.draw(ctx);

    // 낙하 중 텍스트
    if (gameState === 'falling' && fallAmount >= 15) {
      ctx.save();
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#ff6b6b';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      const yOffset = Math.sin(fallFrameRef.current * 0.2) * 5;
      ctx.fillText('으아아악!', CONFIG.CANVAS_WIDTH / 2, 80 + yOffset);
      ctx.restore();
    } else if (gameState === 'falling' && fallAmount >= 10) {
      ctx.save();
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#ffd93d';
      ctx.textAlign = 'center';
      ctx.fillText('어어억!', CONFIG.CANVAS_WIDTH / 2, 80);
      ctx.restore();
    }

    // 착지 이펙트
    if (gameState === 'landing') {
      const landFrame = stickman.landingFrame;

      if (stickman.state === 'safe' && landFrame < 20) {
        // 먼지 이펙트
        ctx.save();
        ctx.globalAlpha = 1 - landFrame / 20;
        ctx.fillStyle = '#a0a0a0';
        for (let i = 0; i < 5; i++) {
          const dx = (Math.random() - 0.5) * 60;
          const dy = -Math.random() * 20;
          ctx.beginPath();
          ctx.arc(stickman.x + dx, stickman.y + 100 + dy, 5 + Math.random() * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (stickman.state === 'stumble' && landFrame > 15 && landFrame < 40) {
        // 별 이펙트
        ctx.save();
        ctx.font = '20px Arial';
        ctx.fillText('💫', stickman.x - 30, stickman.y - 20);
        ctx.fillText('⭐', stickman.x + 20, stickman.y - 30);
        ctx.restore();
      }

      if (stickman.state === 'crash' && landFrame > 10 && landFrame < 50) {
        // 폭발 이펙트
        ctx.save();
        ctx.font = `${30 + landFrame}px Arial`;
        ctx.globalAlpha = 1 - (landFrame - 10) / 40;
        ctx.fillText('💥', stickman.x - 25, stickman.y + 20);
        ctx.restore();
      }

      // 착지 애니메이션 완료
      const completeDuration = stickman.state === 'crash' ? 80 : stickman.state === 'stumble' ? 50 : 30;
      if (landFrame > completeDuration) {
        gameStateRef.current = 'done';
        onFallComplete();
      }
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [fallAmount, onFallComplete]);

  // 게임 루프 시작
  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  // 외부에서 호출 가능한 메서드
  useImperativeHandle(ref, () => ({
    startFall: (floors: number) => {
      // 속도와 지속시간 설정
      if (floors <= 9) {
        speedRef.current = CONFIG.SPEED_SAFE;
        durationRef.current = CONFIG.DURATION_SAFE;
      } else if (floors <= 14) {
        speedRef.current = CONFIG.SPEED_STUMBLE;
        durationRef.current = CONFIG.DURATION_STUMBLE;
      } else {
        speedRef.current = CONFIG.SPEED_CRASH;
        durationRef.current = CONFIG.DURATION_CRASH;
      }

      fallFrameRef.current = 0;
      gameStateRef.current = 'falling';
      stickmanRef.current.setState('falling');
    },
    reset: () => {
      gameStateRef.current = 'idle';
      stickmanRef.current.setState('idle');
      fallFrameRef.current = 0;
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      width={CONFIG.CANVAS_WIDTH}
      height={CONFIG.CANVAS_HEIGHT}
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    />
  );
});

FallGame.displayName = 'FallGame';

export default FallGame;
