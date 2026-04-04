/* ── SIGNAL 게임 타입 정의 ── */

export const CANVAS_SIZE = 720;

// 차량 색상 팔레트 (8색 - 따뜻한 베이지 배경에 어울리는 톤)
export const CAR_COLORS = [
  '#6B92C4', '#D4726A', '#E8B84C', '#8E72B8',
  '#5BAA8E', '#D07848', '#5EA8B8', '#B07AAC',
] as const;

// 방향
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Axis = 'horizontal' | 'vertical';

export function dirToAxis(d: Direction): Axis {
  return d === 'east' || d === 'west' ? 'horizontal' : 'vertical';
}

export function dirToAngle(d: Direction): number {
  switch (d) {
    case 'east': return 0;
    case 'south': return Math.PI / 2;
    case 'west': return Math.PI;
    case 'north': return -Math.PI / 2;
  }
}

// 차량 타입
export type VehicleKind = 'car' | 'ambulance' | 'truck';

export interface Vehicle {
  id: number;
  x: number;
  y: number;
  dir: Direction;
  lane: number;           // 0 또는 1 (2차선)
  speed: number;
  targetSpeed: number;
  baseSpeed: number;
  color: string;
  kind: VehicleKind;
  w: number;
  h: number;
  stopped: boolean;
  stopTimer: number;      // idle 흔들림용
  dead: boolean;
  deadTimer: number;
  opacity: number;
  // 구급차 전용
  ambulanceTimer: number;
  ambulanceFlash: boolean;
  // 출발 딜레이
  startDelay: number;
  passed: boolean;        // 교차로 통과 카운트 여부
}

// 교차로
export interface Intersection {
  id: number;
  x: number;              // 교차로 중심 x
  y: number;              // 교차로 중심 y
  greenAxis: Axis;        // 현재 초록불 축
  glowPulse: number;      // 글로우 애니메이션 (0~1)
  roadWidth: number;      // 도로 폭 (56 or 90)
  lanes: number;          // 1 or 2
}

// 파티클
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// 충격파 링
export interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

// 게임 상태
export type GameState = 'menu' | 'playing' | 'levelup' | 'gameover';

// 도로 세그먼트
export interface Road {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  axis: Axis;
  width: number;
  lanes: number;
}

// 레벨 설정
export interface LevelConfig {
  level: number;
  intersections: { x: number; y: number; lanes: number }[];
  roads: { from: number; to: number }[];  // 교차로 인덱스 연결
  spawnInterval: number;
  hasAmbulance: boolean;
  hasTruck: boolean;
  passToNext: number;    // 다음 레벨까지 통과 수
}

// 스폰 포인트
export interface SpawnPoint {
  x: number;
  y: number;
  dir: Direction;
  lane: number;
  intersectionId: number;
  roadWidth: number;
}
