'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import styles from './minigame.module.css';

// --- 상수 ---
const W = 900, H = 400, GY = 310, GRAVITY = 0.6, JUMP = -13;
const INIT_SPD = 4, MAX_SPD = 15, SPD_INC = 0.0015;
const CHAR = 84, CHAR_X = 60;
const SPRITE_SRC = '/sprite2.webp';
const SPRITE_COLS = 5, SPRITE_ROWS = 2, SPRITE_FRAMES = 8;

// 아이템 이미지 경로
const ITEM_IMGS: Record<string, string> = {
  gold: '/gold.webp',
  'cerka-core': '/cerka-core2.webp',
};

// --- 타입 ---
type ObsKind = 0 | 1 | 2; // 0=tree, 1=monster1, 2=monster2
type ItemType = 'gold' | 'cerka-core';

interface Obs { x: number; w: number; h: number; kind: ObsKind; }
interface Item { x: number; y: number; type: ItemType; label: string; value: number; size: number; collected: boolean; }
interface FText { x: number; y: number; text: string; color: string; life: number; maxLife: number; }
interface Bld { x: number; w: number; h: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Pit { x: number; w: number; }

// --- 8bit 사운드 (Web Audio API) ---
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function sfxJump() {
  if (muteAll) return;
  const ctx = getAudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(280, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(560, ctx.currentTime + 0.08);
  g.gain.setValueAtTime(0.02, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.1);
}

const COIN_SOUNDS: { name: string; fn: ((ctx: AudioContext) => void) | null }[] = [
  { name: '음소거', fn: null },
  { name: '딩! (트라이앵글 2음)', fn: (ctx) => {
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'triangle';
    o1.frequency.setValueAtTime(1568, t); o2.frequency.setValueAtTime(2093, t + 0.04);
    g.gain.setValueAtTime(0.03, t); g.gain.linearRampToValueAtTime(0, t + 0.1);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(t); o1.stop(t + 0.05); o2.start(t + 0.04); o2.stop(t + 0.1);
  }},
  { name: '띵~ (사인 부드러운)', fn: (ctx) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1318, t); o.frequency.setValueAtTime(1760, t + 0.03);
    g.gain.setValueAtTime(0.035, t); g.gain.linearRampToValueAtTime(0, t + 0.09);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.09);
  }},
  { name: '삐릿 (스퀘어 상승)', fn: (ctx) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1760, t + 0.06);
    g.gain.setValueAtTime(0.02, t); g.gain.linearRampToValueAtTime(0, t + 0.08);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.08);
  }},
  { name: '찰랑 (트라이앵글 3음 화음)', fn: (ctx) => {
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, t); g.gain.linearRampToValueAtTime(0, t + 0.15);
    g.connect(ctx.destination);
    [1318, 1568, 2093].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(f, t + i * 0.03);
      o.connect(g); o.start(t + i * 0.03); o.stop(t + 0.15);
    });
  }},
  { name: '마리오코인 (스퀘어 B5→E6)', fn: (ctx) => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(987, t); o.frequency.setValueAtTime(1318, t + 0.07);
    g.gain.setValueAtTime(0.02, t); g.gain.setValueAtTime(0.02, t + 0.07);
    g.gain.linearRampToValueAtTime(0, t + 0.14);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.14);
  }},
];
let selectedCoinSound = 2;
let muteAll = false;

function sfxCoin() {
  if (muteAll) return;
  const sound = COIN_SOUNDS[selectedCoinSound];
  if (sound.fn) sound.fn(getAudioCtx());
}

function sfxClear() {
  if (muteAll) return;
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.04, t); g.gain.linearRampToValueAtTime(0, t + 0.5);
  g.connect(ctx.destination);
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f, t + i * 0.1);
    o.connect(g); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.15);
  });
}

function sfxDeath() {
  if (muteAll) return;
  const ctx = getAudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(350, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.35);
  g.gain.setValueAtTime(0.035, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.35);
}

// 아이템 풀
const ITEMS: { type: ItemType; label: string; value: number; wt: number }[] = [
  { type: 'gold', label: '+50', value: 50, wt: 35 },
  { type: 'gold', label: '+100', value: 100, wt: 25 },
  { type: 'gold', label: '+200', value: 200, wt: 15 },
  { type: 'cerka-core', label: '+500', value: 500, wt: 8 },
  { type: 'cerka-core', label: '+1000', value: 1000, wt: 3 },
];

function pickItem() {
  const total = ITEMS.reduce((s, d) => s + d.wt, 0);
  let r = Math.random() * total;
  for (const d of ITEMS) { r -= d.wt; if (r <= 0) return d; }
  return ITEMS[0];
}


// --- 아이템 색상 ---
function itemColor(type: ItemType): string {
  return type === 'cerka-core' ? '#8B5CF6' : '#F59E0B';
}

// =============================================
// 미니멀 프리미엄 테마
// =============================================
const TH = {
  light: {
    skyTop: '#87CEEB',
    skyBot: '#E8E4DA',
    mountain: '#C8BDB0',
    mountainShadow: '#B5A99A',
    ground: '#6AAF50',
    groundDark: '#5A9A42',
    dirt: '#8B6E4E',
    dirtDark: '#7A5F42',
    cloudMain: 'rgba(255,255,255,0.82)',
    cloudHighlight: 'rgba(255,255,255,0.95)',
    cloudShadow: 'rgba(200,210,220,0.45)',
    pitWall: '#5A4030',
    pitBottom: '#3A2A1E',
    shadow: 'rgba(0,0,0,0.10)',
    hudBg: 'rgba(255,255,255,0.85)',
    hudBorder: 'rgba(0,0,0,0.08)',
  },
  dark: {
    skyTop: '#0B1A2E',
    skyBot: '#1A2A3A',
    mountain: '#1E2E40',
    mountainShadow: '#162438',
    ground: '#1E4A20',
    groundDark: '#163816',
    dirt: '#1E1812',
    dirtDark: '#16120E',
    cloudMain: 'rgba(40,50,65,0.3)',
    cloudHighlight: 'rgba(55,65,80,0.35)',
    cloudShadow: 'rgba(15,20,30,0.25)',
    pitWall: '#0E0A06',
    pitBottom: '#060402',
    shadow: 'rgba(0,0,0,0.20)',
    hudBg: 'rgba(0,0,0,0.55)',
    hudBorder: 'rgba(255,255,255,0.08)',
  },
};

// --- 소프트 그림자 ---
function drawSoftShadow(ctx: CanvasRenderingContext2D, cx: number, gy: number, rx: number, ry: number, c: typeof TH.dark) {
  const grad = ctx.createRadialGradient(cx, gy + 2, 0, cx, gy + 2, rx);
  grad.addColorStop(0, c.shadow);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, gy + 2, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// --- 하늘 ---
function drawSky(ctx: CanvasRenderingContext2D, c: typeof TH.dark) {
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, c.skyTop);
  g.addColorStop(1, c.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GY);
}

// --- 먼 산 ---
function drawMountain(ctx: CanvasRenderingContext2D, b: Bld, c: typeof TH.dark) {
  const cx = b.x + b.w / 2;
  ctx.fillStyle = c.mountain;
  ctx.beginPath();
  ctx.moveTo(b.x - b.w * 0.15, GY);
  ctx.lineTo(cx, GY - b.h);
  ctx.lineTo(b.x + b.w * 1.15, GY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.mountainShadow;
  ctx.beginPath();
  ctx.moveTo(cx, GY - b.h);
  ctx.lineTo(b.x + b.w * 1.15, GY);
  ctx.lineTo(cx, GY);
  ctx.closePath();
  ctx.fill();
}

// --- 구름 (디테일 코드 렌더) ---
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, c: typeof TH.dark) {
  const s = size;
  ctx.save();

  // 바닥 그림자
  ctx.fillStyle = c.cloudShadow;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.22, s * 0.6, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // 메인 바디 (여러 원 조합 — 아래쪽 넓게)
  ctx.fillStyle = c.cloudMain;
  // 좌하단
  ctx.beginPath(); ctx.arc(x - s * 0.32, y + s * 0.06, s * 0.22, 0, Math.PI * 2); ctx.fill();
  // 우하단
  ctx.beginPath(); ctx.arc(x + s * 0.30, y + s * 0.04, s * 0.24, 0, Math.PI * 2); ctx.fill();
  // 중앙 하단 (가장 넓은 베이스)
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.08, s * 0.48, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  // 좌측 중간 봉우리
  ctx.beginPath(); ctx.arc(x - s * 0.22, y - s * 0.06, s * 0.24, 0, Math.PI * 2); ctx.fill();
  // 우측 중간 봉우리
  ctx.beginPath(); ctx.arc(x + s * 0.20, y - s * 0.04, s * 0.26, 0, Math.PI * 2); ctx.fill();
  // 중앙 상단 (가장 높은 봉우리)
  ctx.beginPath(); ctx.arc(x + s * 0.02, y - s * 0.18, s * 0.28, 0, Math.PI * 2); ctx.fill();
  // 좌측 작은 봉우리
  ctx.beginPath(); ctx.arc(x - s * 0.38, y + s * 0.02, s * 0.16, 0, Math.PI * 2); ctx.fill();
  // 우측 작은 봉우리
  ctx.beginPath(); ctx.arc(x + s * 0.38, y + s * 0.02, s * 0.14, 0, Math.PI * 2); ctx.fill();

  // 하이라이트 (상단 빛 부분)
  ctx.fillStyle = c.cloudHighlight;
  ctx.beginPath(); ctx.arc(x - s * 0.08, y - s * 0.24, s * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + s * 0.14, y - s * 0.18, s * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - s * 0.20, y - s * 0.12, s * 0.10, 0, Math.PI * 2); ctx.fill();

  // 하단 음영 (살짝 어두운 레이어)
  ctx.fillStyle = c.cloudShadow;
  ctx.beginPath();
  ctx.ellipse(x + s * 0.05, y + s * 0.14, s * 0.35, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// --- 지면 (구덩이 포함) ---
function drawGround(ctx: CanvasRenderingContext2D, c: typeof TH.dark, pits: Pit[]) {
  // 구덩이 내부
  for (const p of pits) {
    ctx.fillStyle = c.pitBottom;
    ctx.fillRect(p.x, GY - 2, p.w, H - GY + 2);
    ctx.fillStyle = c.pitWall;
    ctx.fillRect(p.x, GY - 2, 4, H - GY + 2);
    ctx.fillRect(p.x + p.w - 4, GY - 2, 4, H - GY + 2);
    ctx.fillStyle = c.dirt;
    ctx.fillRect(p.x, GY + 14, 4, 30);
    ctx.fillRect(p.x + p.w - 4, GY + 14, 4, 30);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, GY - 10, W, H - GY + 10);
  for (const p of pits) {
    ctx.rect(p.x + p.w, GY - 10, -p.w, H - GY + 10);
  }
  ctx.clip('evenodd');

  // 잔디
  ctx.fillStyle = c.ground;
  ctx.fillRect(0, GY - 2, W, 16);
  ctx.fillStyle = c.groundDark;
  ctx.fillRect(0, GY + 10, W, 4);
  // 흙
  ctx.fillStyle = c.dirt;
  ctx.fillRect(0, GY + 14, W, 30);
  ctx.fillStyle = c.dirtDark;
  ctx.fillRect(0, GY + 44, W, H - GY - 44);

  // 잔디 경계선
  ctx.strokeStyle = c.groundDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GY - 2);
  ctx.lineTo(W, GY - 2);
  ctx.stroke();

  ctx.restore();
}

// =============================================
// 장애물 (tree / monster1 / monster2 이미지)
// =============================================
const OBS_TREE_SRC = '/tree.webp';
const OBS_MONSTER1_SRC = '/monster1.webp';
const OBS_MONSTER2_SRC = '/monster2.webp';

// 이미지를 캔버스로 변환
function imgToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext('2d')!.drawImage(img, 0, 0);
  return cv;
}

// 장애물 이미지 그리기
function drawObsImage(ctx: CanvasRenderingContext2D, o: Obs, gy: number, c: typeof TH.dark,
  tree: HTMLCanvasElement | null, mon1: HTMLCanvasElement | null, mon2: HTMLCanvasElement | null) {
  const cx = o.x + o.w / 2;
  drawSoftShadow(ctx, cx, gy, o.w * 0.4, 5, c);
  const img = o.kind === 0 ? tree : o.kind === 1 ? mon1 : mon2;
  if (img) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, o.x, gy - o.h, o.w, o.h);
  }
}

// --- 아이템 그리기 ---
function drawItem(ctx: CanvasRenderingContext2D, item: Item, t: number, imgCache: Map<string, HTMLImageElement>) {
  if (item.collected) return;
  const bobY = item.y + Math.sin(t * 0.004 + item.x * 0.01) * 5;
  const s = item.size;
  const cx = item.x + s / 2, cy = bobY + s / 2;

  ctx.save();
  // 이미지만 그리기
  const img = imgCache.get(item.type);
  if (img?.complete) {
    ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  }

  // 라벨
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = `+${item.value}`;
  const m = ctx.measureText(label);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const pw = m.width + 6, ph = 13;
  ctx.beginPath(); ctx.roundRect(cx - pw / 2, cy + s / 2 + 2, pw, ph, 3); ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.fillText(label, cx, cy + s / 2 + 8.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// 배경 산 생성
function genMountains(): Bld[] {
  const b: Bld[] = [];
  let x = 0;
  while (x < W + 400) {
    const mw = 140 + Math.random() * 160;
    b.push({ x, w: mw, h: 80 + Math.random() * 100 });
    x += mw * 0.6 + Math.random() * 30;
  }
  return b;
}

// === 컴포넌트 ===
export default function MiniGamePage() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over' | 'clear'>('idle');
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coinSound, setCoinSound] = useState(2);
  const [muted, setMuted] = useState(false);
  const isDarkRef = useRef(theme === 'dark');
  useEffect(() => { isDarkRef.current = theme === 'dark'; }, [theme]);
  useEffect(() => { selectedCoinSound = coinSound; }, [coinSound]);
  useEffect(() => { muteAll = muted; }, [muted]);

  const g = useRef({
    charY: GY - CHAR, vel: 0, jumping: false, doubleJumped: false,
    speed: INIT_SPD, obs: [] as Obs[], items: [] as Item[],
    texts: [] as FText[], blds: genMountains(),
    particles: [] as Particle[], pits: [] as Pit[],
    fi: 0, ft: 0, score: 0, base: 0, gOff: 0,
    running: false, last: 0, spawnT: 0, itemT: 0, pitT: 0,
  });
  const spriteCanvas = useRef<HTMLCanvasElement | null>(null);
  const spriteReady = useRef(false);
  const itemImgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const treeCanvas = useRef<HTMLCanvasElement | null>(null);
  const monster1Canvas = useRef<HTMLCanvasElement | null>(null);
  const monster2Canvas = useRef<HTMLCanvasElement | null>(null);
  // 원본 이미지 가로/세로 비율 (w/h)
  const treeRatio = useRef(1);
  const mon1Ratio = useRef(1);
  const mon2Ratio = useRef(1);
  const obsReady = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    // 스프라이트 로딩
    const img = new window.Image();
    img.src = SPRITE_SRC;
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext('2d')!.drawImage(img, 0, 0);
      spriteCanvas.current = cv;
      spriteReady.current = true;
    };
    // 장애물 이미지 로딩
    let loadedCount = 0;
    const checkObsReady = () => { loadedCount++; if (loadedCount >= 3) obsReady.current = true; };
    const treeImg = new window.Image();
    treeImg.src = OBS_TREE_SRC;
    treeImg.onload = () => { treeCanvas.current = imgToCanvas(treeImg); treeRatio.current = treeImg.naturalWidth / treeImg.naturalHeight; checkObsReady(); };
    const mon1Img = new window.Image();
    mon1Img.src = OBS_MONSTER1_SRC;
    mon1Img.onload = () => { monster1Canvas.current = imgToCanvas(mon1Img); mon1Ratio.current = mon1Img.naturalWidth / mon1Img.naturalHeight; checkObsReady(); };
    const mon2Img = new window.Image();
    mon2Img.src = OBS_MONSTER2_SRC;
    mon2Img.onload = () => { monster2Canvas.current = imgToCanvas(mon2Img); mon2Ratio.current = mon2Img.naturalWidth / mon2Img.naturalHeight; checkObsReady(); };
    // 아이템 이미지 프리로드
    Object.entries(ITEM_IMGS).forEach(([key, src]) => {
      const i = new window.Image();
      i.src = src;
      itemImgCache.current.set(key, i);
    });
  }, []);

  const spawnObs = useCallback(() => {
    const kindRoll = Math.random();
    const kind: ObsKind = kindRoll < 0.5 ? 0 : kindRoll < 0.75 ? 1 : 2;
    const hard = g.current.score >= 2_500_000;
    let h: number;

    if (kind === 0) {
      const sizeRoll = Math.random();
      h = sizeRoll < 0.3 ? 50 + Math.random() * 15 : sizeRoll < 0.75 ? 70 + Math.random() * 20 : 90 + Math.random() * 20;
    } else if (kind === 1) {
      h = 55 + Math.random() * 25;
    } else {
      h = 65 + Math.random() * 25;
    }
    // 250만 이상: 장애물 1.4배
    if (hard) h *= 1.4;
    const ratio = kind === 0 ? treeRatio.current : kind === 1 ? mon1Ratio.current : mon2Ratio.current;
    const w = h * ratio;
    g.current.obs.push({ x: W + 20, w, h, kind });
  }, []);

  const spawnItem = useCallback(() => {
    const s = g.current;
    const size = 28;
    const count = 15 + Math.floor(Math.random() * 10);
    const gap = 26 + Math.random() * 6;
    const heights = [
      GY - size - 4,           // 바닥
      GY - size - 30,          // 바닥 살짝 위
      GY - size - 60,          // 중간 아래
      GY - CHAR - 10,          // 점프 낮은
      GY - CHAR - 40,          // 점프 중간
      GY - CHAR - 70,          // 점프 꼭대기
      GY - CHAR - 100,         // 더블점프 낮은
      GY - CHAR - 130,         // 더블점프 높은
    ];
    const numLanes = 2 + Math.floor(Math.random() * 3); // 2~4개 레인
    const shuffled = [...heights].sort(() => Math.random() - 0.5);
    const lanes = shuffled.slice(0, numLanes);

    for (const ly of lanes) {
      for (let i = 0; i < count; i++) {
        const ix = W + 20 + i * gap;
        const isCerka = i === count - 1 && Math.random() < 0.1;
        const d = isCerka ? { type: 'cerka-core' as ItemType, label: '+500', value: 500 } : pickItem();
        s.items.push({ x: ix, y: ly, type: d.type, label: d.label, value: d.value, size, collected: false });
      }
    }
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      g.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.8) * 3,
        life: 400 + Math.random() * 400,
        color, size: 2 + Math.random() * 3,
      });
    }
  }, []);

  const loop = useCallback((ts: number) => {
    const s = g.current;
    if (!s.running) return;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const dt = ts - s.last; s.last = ts;
    const c = isDarkRef.current ? TH.dark : TH.light;

    // === UPDATE ===
    s.speed = Math.min(MAX_SPD, s.speed + SPD_INC * (dt / 16));

    if (s.jumping) {
      s.vel += GRAVITY; s.charY += s.vel;
      if (s.charY >= GY - CHAR) { s.charY = GY - CHAR; s.jumping = false; s.doubleJumped = false; s.vel = 0; }
    }

    // 땅에 있을 때만 달리기 애니메이션 (점프/공중이면 프레임 고정)
    if (!s.jumping && s.vel === 0) {
      s.ft += dt;
      if (s.ft >= 100) { s.ft = 0; s.fi = (s.fi + 1) % SPRITE_FRAMES; }
    }

    // 스폰
    s.spawnT += dt;
    if (s.spawnT > Math.max(900, 2200 - s.speed * 80) + Math.random() * 1000) { s.spawnT = 0; spawnObs(); }
    s.itemT += dt;
    const itemCD = 300 + Math.random() * 500;
    if (s.itemT > itemCD) { s.itemT = 0; spawnItem(); }
    // 구덩이 스폰 (250만 이상, 자주 나오지 않게)
    s.pitT += dt;
    if (s.score >= 2_500_000 && s.pitT > 4000 + Math.random() * 4000) {
      s.pitT = 0;
      const pw = 60 + Math.random() * 50;
      s.pits.push({ x: W + 20, w: pw });
    }

    // 이동
    s.obs.forEach(o => { o.x -= s.speed; });
    s.obs = s.obs.filter(o => o.x + o.w > -50);
    s.items.forEach(it => { it.x -= s.speed; });
    s.items = s.items.filter(it => !it.collected && it.x + it.size > -50);
    s.pits.forEach(p => { p.x -= s.speed; });
    s.pits = s.pits.filter(p => p.x + p.w > -50);
    s.gOff = (s.gOff + s.speed) % 40;
    s.score = Math.round(s.base);

    s.texts.forEach(t => { t.y -= 0.8; t.life -= dt; });
    s.texts = s.texts.filter(t => t.life > 0);

    s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= dt; });
    s.particles = s.particles.filter(p => p.life > 0);

    // 충돌: 장애물 (넉넉한 판정)
    const aL = CHAR_X + 22, aR = CHAR_X + CHAR - 22, aT = s.charY + 20, aB = s.charY + CHAR - 4;
    let dead = false;
    for (const o of s.obs) {
      if (aR > o.x + 10 && aL < o.x + o.w - 10 && aB > GY - o.h + 10 && aT < GY) {
        dead = true; break;
      }
    }

    // 충돌: 구덩이
    if (!dead && !s.jumping) {
      const footL = CHAR_X + 18, footR = CHAR_X + CHAR - 18;
      for (const p of s.pits) {
        if (footL > p.x + 4 && footR < p.x + p.w - 4) {
          dead = true; break;
        }
      }
    }

    // 500만 골드 클리어
    if (!dead && s.score >= 5_000_000) {
      s.running = false; setGameState('clear');
      setDisplayScore(s.score);
      sfxClear();
      spawnParticles(CHAR_X + CHAR / 2, s.charY + CHAR / 2, '#F59E0B', 30);
      spawnParticles(CHAR_X + CHAR / 2, s.charY + CHAR / 2, '#FFF', 20);
      const saved = parseInt(localStorage.getItem('minigame_gold_high') || '0', 10);
      if (s.score > saved) { setHighScore(s.score); localStorage.setItem('minigame_gold_high', String(s.score)); }
    }

    if (dead) {
      s.running = false; setGameState('over');
      setDisplayScore(s.score);
      sfxDeath();
      spawnParticles(CHAR_X + CHAR / 2, s.charY + CHAR / 2, '#DC2626', 20);
      const saved = parseInt(localStorage.getItem('minigame_gold_high') || '0', 10);
      if (s.score > saved) { setHighScore(s.score); localStorage.setItem('minigame_gold_high', String(s.score)); }
    }

    // 충돌: 아이템 (장애물 겹침 제외 + 넓은 수집 범위)
    for (const it of s.items) {
      if (it.collected) continue;
      const behindObs = s.obs.some(o =>
        it.x + it.size > o.x && it.x < o.x + o.w &&
        it.y + it.size > GY - o.h && it.y < GY
      );
      if (behindObs) continue;
      const dx = (it.x + it.size / 2) - (CHAR_X + CHAR / 2);
      const dy = (it.y + it.size / 2) - (s.charY + CHAR / 2);
      if (Math.sqrt(dx * dx + dy * dy) < (CHAR / 2 + it.size / 2) * 0.85) {
        it.collected = true;
        s.base += it.value; s.score = Math.round(s.base);
        sfxCoin();
        const col = itemColor(it.type);
        s.texts.push({ x: it.x, y: it.y - 10, text: `+${it.value}`, color: col, life: 600, maxLife: 600 });
        spawnParticles(it.x + it.size / 2, it.y + it.size / 2, col, 8);
        spawnParticles(it.x + it.size / 2, it.y + it.size / 2, '#FFF', 4);
      }
    }
    setDisplayScore(s.score);

    // === RENDER ===
    drawSky(ctx, c);

    // 구름
    drawCloud(ctx, ((200 - s.gOff * 0.03) % (W + 100) + W + 100) % (W + 100) - 50, 50, 38, c);
    drawCloud(ctx, ((520 - s.gOff * 0.04) % (W + 120) + W + 120) % (W + 120) - 60, 35, 48, c);
    drawCloud(ctx, ((780 - s.gOff * 0.02) % (W + 80) + W + 80) % (W + 80) - 40, 70, 30, c);

    // 먼 산
    s.blds.forEach(b => {
      b.x -= s.speed * 0.1;
      if (b.x + b.w * 1.3 < 0) { const mw = 140 + Math.random() * 160; b.x = W + Math.random() * 200; b.h = 80 + Math.random() * 100; b.w = mw; }
      drawMountain(ctx, b, c);
    });

    // 지면
    drawGround(ctx, c, s.pits);

    // 장애물
    s.obs.forEach(o => {
      if (obsReady.current) {
        drawObsImage(ctx, o, GY, c, treeCanvas.current, monster1Canvas.current, monster2Canvas.current);
      }
    });

    // 아이템
    // 아이템 (장애물과 겹치면 숨김)
    s.items.forEach(it => {
      if (it.collected) return;
      const overlaps = s.obs.some(o =>
        it.x + it.size > o.x && it.x < o.x + o.w &&
        it.y + it.size > GY - o.h && it.y < GY
      );
      if (!overlaps) drawItem(ctx, it, ts, itemImgCache.current);
    });

    // 파티클
    s.particles.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 300);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 캐릭터 그림자
    drawSoftShadow(ctx, CHAR_X + CHAR / 2 + 3, GY, CHAR * 0.35, 5, c);

    // 캐릭터
    const sc2 = spriteCanvas.current;
    if (sc2 && spriteReady.current) {
      const fw = Math.floor(sc2.width / SPRITE_COLS);
      const fh = Math.floor(sc2.height / SPRITE_ROWS);
      const col = s.fi % SPRITE_COLS, row = Math.floor(s.fi / SPRITE_COLS);
      // 1px 안쪽 크롭으로 인접 프레임 픽셀 간섭 방지
      const margin = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sc2, col * fw + margin, row * fh + margin, fw - margin * 2, fh - margin * 2, CHAR_X, s.charY, CHAR, CHAR);
    }

    // 플로팅 텍스트
    s.texts.forEach(ft => {
      const a = Math.min(1, ft.life / 600);
      const scale = ft.life > ft.maxLife * 0.7 ? 1 + (ft.life / ft.maxLife - 0.7) * 1.5 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `bold ${Math.round(16 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x + 18, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x + 18, ft.y);
      ctx.restore();
    });

    // HUD
    ctx.save();
    const hudH = 32, hudY2 = 8;

    // 좌측 박스
    const lW = 80;
    ctx.fillStyle = c.hudBg;
    ctx.beginPath(); ctx.roundRect(10, hudY2, lW, hudH, 6); ctx.fill();
    ctx.strokeStyle = c.hudBorder; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(10, hudY2, lW, hudH, 6); ctx.stroke();

    const ly = hudY2 + 22;
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = isDarkRef.current ? '#10B981' : '#047857';
    ctx.fillText(`SPD ${s.speed.toFixed(1)}`, 18, ly);

    // 우측 박스 — 골드
    const goldText = `${s.score.toLocaleString()}`;
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    const tw = ctx.measureText(goldText).width;
    const boxW = tw + 44;
    ctx.fillStyle = c.hudBg;
    ctx.beginPath(); ctx.roundRect(W - boxW - 10, hudY2, boxW, hudH, 6); ctx.fill();
    ctx.strokeStyle = c.hudBorder; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W - boxW - 10, hudY2, boxW, hudH, 6); ctx.stroke();
    const goldImg = itemImgCache.current.get('gold');
    if (goldImg?.complete) {
      ctx.drawImage(goldImg, W - boxW - 2, hudY2 + 4, 24, 24);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(goldText, W - 18, hudY2 + 23);
    ctx.restore();

    if (s.running) raf.current = requestAnimationFrame(loop);
  }, [spawnObs, spawnItem, spawnParticles]);

  const start = useCallback(() => {
    const s = g.current;
    s.charY = GY - CHAR; s.vel = 0; s.jumping = false; s.doubleJumped = false; s.speed = INIT_SPD;
    s.obs = []; s.items = []; s.texts = []; s.particles = []; s.pits = [];
    s.blds = genMountains();
    s.fi = 0; s.ft = 0; s.score = 0; s.base = 0; s.gOff = 0;
    s.running = true; s.last = performance.now();
    s.spawnT = 0; s.itemT = 0; s.pitT = 0;
    const saved = parseInt(localStorage.getItem('minigame_gold_high') || '0', 10);
    setHighScore(saved);
    setDisplayScore(0); setGameState('playing');
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const jump = useCallback(() => {
    const s = g.current;
    if (!s.jumping) { s.jumping = true; s.vel = JUMP; s.doubleJumped = false; sfxJump(); }
    else if (!s.doubleJumped) { s.doubleJumped = true; s.vel = JUMP; sfxJump(); }
  }, []);

  const act = useCallback(() => {
    if (gameState === 'idle' || gameState === 'over' || gameState === 'clear') start();
    else if (gameState === 'playing') jump();
  }, [gameState, start, jump]);

  // 키보드: Space/ArrowUp = 점프
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); act(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [act, gameState]);

  useEffect(() => () => { cancelAnimationFrame(raf.current); g.current.running = false; }, []);

  useEffect(() => {
    const cv = canvasRef.current, ct = containerRef.current;
    if (!cv || !ct) return;
    const r = () => { const sc = Math.min(1, ct.clientWidth / W); cv.style.width = `${W * sc}px`; cv.style.height = `${H * sc}px`; };
    r(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r);
  }, []);

  // 터치: 점프 (발사는 자동)
  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState === 'idle' || gameState === 'over' || gameState === 'clear') { start(); return; }
    if (gameState === 'playing') jump();
  }, [gameState, start, jump]);

  // idle 화면
  useEffect(() => {
    if (gameState !== 'idle') return;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const c = isDarkRef.current ? TH.dark : TH.light;

    drawSky(ctx, c);
    drawCloud(ctx, 150, 50, 38, c);
    drawCloud(ctx, 480, 35, 48, c);
    drawCloud(ctx, 750, 70, 30, c);

    g.current.blds.forEach(b => drawMountain(ctx, b, c));
    drawGround(ctx, c, []);

    const drawChar = () => {
      const sc2 = spriteCanvas.current;
      if (sc2) {
        drawSoftShadow(ctx, CHAR_X + CHAR / 2 + 3, GY, CHAR * 0.35, 5, c);
        const fw = Math.floor(sc2.width / SPRITE_COLS);
        const fh = Math.floor(sc2.height / SPRITE_ROWS);
        const margin = 1;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sc2, margin, margin, fw - margin * 2, fh - margin * 2, CHAR_X, GY - CHAR, CHAR, CHAR);
      }
    };
    if (spriteReady.current) drawChar();
    else {
      const check = setInterval(() => {
        if (spriteReady.current) { clearInterval(check); drawChar(); }
      }, 100);
      return () => clearInterval(check);
    }
  }, [gameState, theme]);

  if (isMobile) {
    return (
      <div className={styles.wrapper} style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h1 className={styles.title}>랏폿을 기다리며</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
          PC에서만 플레이할 수 있습니다.
        </p>
        <Link href="/" className={styles.footerLink} style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>랏폿을 기다리며</h1>
        </div>
        <p className={styles.subtitle}>골드를 모아 최고 기록을 세워보세요!</p>
      </div>

      <div ref={containerRef} className={styles.canvasWrap}
        onClick={act} onTouchStart={handleTouch}>
        <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />

        {gameState === 'idle' && (
          <div className={styles.overlayIdle}>
            <p className={styles.idleText}>SPACE / 탭 / 클릭으로 시작</p>
            <p className={styles.idleSub}>골드를 모아라!</p>
          </div>
        )}

        {gameState === 'clear' && (
          <div className={styles.overlayOver}>
            <p className={`${styles.overTitle}`} style={{ color: '#F59E0B' }}>CLEAR!</p>
            <p className={styles.overLabel}>500만 골드 달성!</p>
            <p className={`${styles.overScore} ${styles.scoreGold}`}>
              {displayScore.toLocaleString()} <img src="/gold.webp" alt="gold" width={28} height={28} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
            </p>
            {displayScore >= highScore && displayScore > 0 && (
              <p className={styles.newRecord}>NEW HIGH SCORE!</p>
            )}
            <p className={styles.overHint}>다시 하려면 SPACE / 탭 / 클릭</p>
          </div>
        )}

        {gameState === 'over' && (
          <div className={styles.overlayOver}>
            <p className={styles.overTitle}>GAME OVER</p>
            <p className={styles.overLabel}>획득 골드</p>
            <p className={`${styles.overScore} ${styles.scoreGold}`}>
              {displayScore.toLocaleString()} <img src="/gold.webp" alt="gold" width={28} height={28} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
            </p>
            {displayScore >= highScore && displayScore > 0 && (
              <p className={styles.newRecord}>NEW HIGH SCORE!</p>
            )}
            <p className={styles.overHint}>다시 하려면 SPACE / 탭 / 클릭</p>
          </div>
        )}
      </div>

      {/* 점수 카드 */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreCardInner}>
          <div>
            <p className={styles.scoreLabel}>내 골드</p>
            <p className={`${styles.scoreValue} ${styles.scoreGold}`}>
              <img src="/gold.webp" alt="" width={22} height={22} style={{ verticalAlign: 'middle', marginRight: 4 }} />{displayScore.toLocaleString()}
            </p>
          </div>
          <div className={styles.divider} />
          <div>
            <p className={styles.highLabel}>최고 기록</p>
            <p className={styles.highValue}>{highScore.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 사운드 설정 */}
      <div style={{ marginTop: '1rem', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            코인 사운드 선택
          </p>
          <button
            onClick={() => setMuted(m => !m)}
            style={{
              padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: muted ? 'rgba(239,68,68,0.12)' : 'var(--card-bg, var(--bg-secondary))',
              color: muted ? '#EF4444' : 'var(--text-muted)',
            }}>
            {muted ? '음소거 ON' : '음소거 OFF'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
          {COIN_SOUNDS.slice(1).map((s, i) => (
            <button key={i + 1}
              onClick={() => { if (s.fn) s.fn(getAudioCtx()); setCoinSound(i + 1); }}
              style={{
                padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
                border: coinSound === i + 1 ? '2px solid #F59E0B' : '2px solid var(--border-color)',
                background: coinSound === i + 1 ? 'rgba(245,158,11,0.12)' : 'var(--card-bg, var(--bg-secondary))',
                color: coinSound === i + 1 ? '#F59E0B' : 'var(--text-primary)',
              }}>
              {`${i + 1}. ${s.name}`}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <Link href="/" className={styles.footerLink}>
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
