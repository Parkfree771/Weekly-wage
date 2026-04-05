export interface Vec2 {
  x: number;
  y: number;
}

export type ElementType = '빛' | '암흑' | '흙' | '불' | '물' | '전기';

export const ELEMENT_COLORS: Record<ElementType, string> = {
  '빛': '#fef08a',
  '암흑': '#7c3aed',
  '흙': '#a16207',
  '불': '#ef4444',
  '물': '#3b82f6',
  '전기': '#a78bfa',
};

export const ALL_ELEMENTS: ElementType[] = ['빛', '암흑', '흙', '불', '물', '전기'];

export type EnemyType = 'normal' | 'bike' | 'truck';

export interface EnemyConfig {
  type: EnemyType;
  speed: number;
  hp: number;
  color: number;
  xp: number;
  width: number;
  height: number;
  label: string;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: { type: 'normal', speed: 1.2, hp: 20, color: 0xD94A4A, xp: 10, width: 24, height: 16, label: '일반차' },
  bike: { type: 'bike', speed: 2.5, hp: 8, color: 0xD9884A, xp: 15, width: 16, height: 10, label: '바이크' },
  truck: { type: 'truck', speed: 0.8, hp: 60, color: 0x8B2252, xp: 30, width: 36, height: 22, label: '트럭' },
};

export type WeaponEffectType = 'projectile' | 'aura' | 'beam' | 'explosion' | 'lightning' | 'wave';

export interface WeaponDef {
  name: string;
  elements: string; // sorted joined key e.g. "불,빛,흙"
  effectType: WeaponEffectType;
  damage: number;
  color: number;
  interval: number; // frames between activations
  description: string;
  uniqueId?: string; // unique renderer key for S/SS tier weapons
}

export interface WeaponSlotState {
  elements: (ElementType | null)[]; // [null, null, null]
  weapon: WeaponDef | null; // set when 3 elements combined
  weaponTimer: number;
}

export interface ElementOrbState {
  x: number;
  y: number;
  element: ElementType;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  xp: number;
  level: number;
  xpToNext: number;
  invincibleFrames: number;
  weaponSlots: WeaponSlotState[];
  activeSlotIndex: number;
  kills: number;
  score: number;
  comboCount: number;
  comboTimer: number;
}

export interface EnemyState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: EnemyType;
  color: number;
  xp: number;
  width: number;
  height: number;
  active: boolean;
  angle: number;
}

export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  color: number;
  radius: number;
  active: boolean;
  lifetime: number;
  maxLifetime: number;
  pierce: number;
  elementType?: ElementType;        // 원소 타입 (렌더링 분기용)
  onHitEffect?: 'fire_splash';     // 적중 시 특수 효과
}

export interface XPOrbState {
  x: number;
  y: number;
  value: number;
  active: boolean;
}

export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  active: boolean;
}

export interface GameState {
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  xpOrbs: XPOrbState[];
  elementOrbs: ElementOrbState[];
  particles: ParticleState[];
  wave: number;
  waveTimer: number; // frames
  frameCount: number;
  autoAttackTimer: number;
  paused: boolean;
  gameOver: boolean;
  cameraX: number;
  cameraY: number;
  shakeX: number;
  shakeY: number;
  shakeFrames: number;
  waveAnnounceTimer: number;
  comboDisplayTimer: number;
  comboDisplayCount: number;
  weaponEffects: WeaponEffectState[];
  beamAngles: number[]; // per-slot beam angle
  levelUpTextTimer: number;
}

export interface WeaponEffectState {
  type: WeaponEffectType;
  uniqueId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: number;
  life: number;
  maxLife: number;
  active: boolean;
  angle: number;
  hitEnemies: Set<number>;
}

export const CANVAS_W = 720;
export const CANVAS_H = 720;
export const WORLD_W = 2000;
export const WORLD_H = 2000;
export const PICKUP_RANGE = 50;
export const ELEMENT_ORB_PICKUP_RANGE = 20;
export const INVINCIBLE_FRAMES = 60;
export const WAVE_DURATION = 30 * 60; // 30 seconds at 60fps
export const AUTO_ATTACK_INTERVAL = 30;
export const PLAYER_SPEED = 3;
export const PLAYER_WIDTH = 22;
export const PLAYER_HEIGHT = 14;
export const ELEMENT_ORB_DROP_CHANCE = 0.3;
export const ELEMENT_ORB_LIFETIME = 30 * 60; // 30 seconds at 60fps
