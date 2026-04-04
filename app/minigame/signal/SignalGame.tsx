'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import {
  CANVAS_SIZE, CAR_COLORS, Direction, Axis, dirToAxis,
  Vehicle, Intersection, Particle, ShockRing, GameState, Road, SpawnPoint,
  VehicleKind, LevelConfig,
} from './types';
import { LEVELS } from './levels';
import {
  sfxSwitch, sfxPass, sfxCrash, sfxLevelUp, sfxGameOver,
  toggleMute,
} from './sound';

/* ── 유틸 ── */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeOutCubic(t: number) { return 1 - (1 - t) ** 3; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function randRange(a: number, b: number) { return a + Math.random() * (b - a); }
function randInt(a: number, b: number) { return Math.floor(randRange(a, b + 1)); }
function pickRandom<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const STOP_DIST = 60;
const STOP_OFFSET = 8;
const CAR_GAP = 28;
const LANE_OFFSET = 14;

/* ── CSS 변수에서 색상 읽기 ── */
function getCSSColor(varName: string, fallback: string): string {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || fallback;
}

function cssColorToHex(css: string): number {
  if (css.startsWith('#')) {
    return parseInt(css.replace('#', ''), 16);
  }
  if (css.startsWith('rgb')) {
    const m = css.match(/\d+/g);
    if (m && m.length >= 3) return (parseInt(m[0]) << 16) | (parseInt(m[1]) << 8) | parseInt(m[2]);
  }
  return 0x1c2233;
}

function isDarkMode(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

interface ThemeColors {
  bgMain: number;
  bgRoad: number;
  bgRoadEdge: number;
  bgIntersection: number;
  textPrimary: string;
  textMuted: string;
  primary: string;
  primaryHex: number;
  gridDotAlpha: number;
  centerLineAlpha: number;
  laneLineAlpha: number;
  laneLineColor: number;
  edgeLineColor: number;
  edgeLineAlpha: number;
}

function getThemeColors(): ThemeColors {
  const dark = isDarkMode();
  if (dark) {
    return {
      bgMain: 0x2A2318,        // 깊은 따뜻한 갈색
      bgRoad: 0x3E3528,        // 따뜻한 다크 어스
      bgRoadEdge: 0x3E3528,
      bgIntersection: 0x483F32, // 교차로 약간 밝게
      textPrimary: '#EAE0D2',
      textMuted: '#9A8E7A',
      primary: '#D4A55A',
      primaryHex: 0xD4A55A,
      gridDotAlpha: 0.06,
      centerLineAlpha: 0.5,
      laneLineAlpha: 0.3,
      laneLineColor: 0xD4C4AD,  // 크림 대시
      edgeLineColor: 0x5A4E3E,  // 따뜻한 경계
      edgeLineAlpha: 0.6,
    };
  }
  return {
    bgMain: 0xF5EDE0,          // 따뜻한 크림 페이퍼
    bgRoad: 0xD4C4AD,          // 모래색 도로
    bgRoadEdge: 0xD4C4AD,
    bgIntersection: 0xC9B89A,  // 교차로 약간 어둡게
    textPrimary: '#3D3225',
    textMuted: '#8A7D6B',
    primary: '#C08B4C',
    primaryHex: 0xC08B4C,
    gridDotAlpha: 0.08,
    centerLineAlpha: 0.6,
    laneLineAlpha: 0.35,
    laneLineColor: 0x8B7B65,   // 따뜻한 갈색 대시
    edgeLineColor: 0xB8A88E,   // 부드러운 경계
    edgeLineAlpha: 0.7,
  };
}

/* ══════════════════════════════════════════
   메인 컴포넌트
   ══════════════════════════════════════════ */
export default function SignalGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    // 테마 변경 감지
    const observer = new MutationObserver(() => {
      engine.onThemeChange();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      engine.destroy();
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      padding: '1rem',
    }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: CANVAS_SIZE,
          aspectRatio: '1',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════
   게임 엔진
   ══════════════════════════════════════════ */
class GameEngine {
  private app!: PIXI.Application;
  private container: HTMLElement;
  private theme!: ThemeColors;

  // 레이어
  private bgLayer!: PIXI.Container;
  private roadLayer!: PIXI.Container;
  private vehicleLayer!: PIXI.Container;
  private vfxLayer!: PIXI.Container;
  private uiLayer!: PIXI.Container;
  private menuLayer!: PIXI.Container;

  // 게임 상태
  private state: GameState = 'menu';
  private level = 1;
  private score = 0;
  private levelScore = 0;
  private lives = 3;
  private frame = 0;
  private spawnTimer = 0;
  private levelupTimer = 0;
  private hintTimer = 180;

  // 엔티티
  private vehicles: Vehicle[] = [];
  private intersections: Intersection[] = [];
  private roads: Road[] = [];
  private spawnPoints: SpawnPoint[] = [];
  private particles: Particle[] = [];
  private shockRings: ShockRing[] = [];
  private nextVehicleId = 0;

  // 화면 쉐이크
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;

  // UI refs
  private scoreText!: PIXI.Text;
  private levelText!: PIXI.Text;
  private heartTexts: PIXI.Text[] = [];
  private hintText!: PIXI.Text;
  private muteBtn!: PIXI.Text;
  private levelupText!: PIXI.Text;

  private lastColorIdx = -1;
  private destroyed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.theme = getThemeColors();
    this.init();
  }

  private async init() {
    this.app = new PIXI.Application({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: this.theme.bgMain,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    this.container.appendChild(this.app.view as HTMLCanvasElement);
    const canvas = this.app.view as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    this.bgLayer = new PIXI.Container();
    this.roadLayer = new PIXI.Container();
    this.vehicleLayer = new PIXI.Container();
    this.vfxLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    this.menuLayer = new PIXI.Container();

    this.app.stage.addChild(this.bgLayer, this.roadLayer, this.vehicleLayer,
      this.vfxLayer, this.uiLayer, this.menuLayer);

    this.drawBackground();
    this.createUI();
    this.showMenu();

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.app.ticker.add(() => this.update());
  }

  destroy() {
    this.destroyed = true;
    if (this.app) this.app.destroy(true, { children: true, texture: true });
  }

  onThemeChange() {
    this.theme = getThemeColors();
    this.app.renderer.background.color = this.theme.bgMain;
    this.bgLayer.removeChildren();
    this.drawBackground();
    if (this.state === 'playing' || this.state === 'levelup') {
      this.roadLayer.removeChildren();
      this.drawRoads();
    }
    // UI 색상 갱신
    this.scoreText.style.fill = this.theme.textPrimary;
    this.levelText.style.fill = this.theme.primary;
    if (this.state === 'menu') {
      this.showMenu();
    } else if (this.state === 'gameover') {
      this.showGameOver();
    }
  }

  /* ── 배경 ── */
  private drawBackground() {
    const g = new PIXI.Graphics();
    g.beginFill(this.theme.bgMain);
    g.drawRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    g.endFill();

    // 그리드 도트 (따뜻한 톤)
    const dotColor = isDarkMode() ? 0xD4C4AD : 0x8B7B65;
    g.beginFill(dotColor, this.theme.gridDotAlpha);
    for (let x = 0; x < CANVAS_SIZE; x += 30) {
      for (let y = 0; y < CANVAS_SIZE; y += 30) {
        g.drawCircle(x, y, 0.8);
      }
    }
    g.endFill();
    this.bgLayer.addChild(g);
  }

  /* ── UI ── */
  private createUI() {
    const ts = (size: number, color?: string) => new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: size,
      fontWeight: 'bold',
      fill: color || this.theme.textPrimary,
    });

    this.scoreText = new PIXI.Text('PASSED: 0', ts(16));
    this.scoreText.x = 16;
    this.scoreText.y = 16;
    this.uiLayer.addChild(this.scoreText);

    this.levelText = new PIXI.Text('LEVEL 1', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: this.theme.primary,
      letterSpacing: 3,
    }));
    this.levelText.anchor.set(0.5, 0);
    this.levelText.x = CANVAS_SIZE / 2;
    this.levelText.y = 16;
    this.uiLayer.addChild(this.levelText);

    for (let i = 0; i < 3; i++) {
      const h = new PIXI.Text('\u2764\uFE0F', ts(18));
      h.anchor.set(1, 0);
      h.x = CANVAS_SIZE - 16 - i * 28;
      h.y = 14;
      this.heartTexts.push(h);
      this.uiLayer.addChild(h);
    }

    this.hintText = new PIXI.Text('교차로를 탭하여 신호 전환', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 14,
      fill: this.theme.textMuted,
    }));
    this.hintText.anchor.set(0.5);
    this.hintText.x = CANVAS_SIZE / 2;
    this.hintText.y = CANVAS_SIZE - 40;
    this.hintText.alpha = 0;
    this.uiLayer.addChild(this.hintText);

    this.muteBtn = new PIXI.Text('\uD83D\uDD0A', ts(18));
    this.muteBtn.anchor.set(1, 0);
    this.muteBtn.x = CANVAS_SIZE - 16;
    this.muteBtn.y = 44;
    this.muteBtn.eventMode = 'static';
    this.muteBtn.cursor = 'pointer';
    this.muteBtn.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      const m = toggleMute();
      this.muteBtn.text = m ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    });
    this.uiLayer.addChild(this.muteBtn);

    this.levelupText = new PIXI.Text('', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 36,
      fontWeight: 'bold',
      fill: this.theme.primary,
    }));
    this.levelupText.anchor.set(0.5);
    this.levelupText.x = CANVAS_SIZE / 2;
    this.levelupText.y = CANVAS_SIZE / 2;
    this.levelupText.alpha = 0;
    this.vfxLayer.addChild(this.levelupText);

    this.uiLayer.visible = false;
  }

  /* ── 메뉴 ── */
  private showMenu() {
    this.state = 'menu';
    this.menuLayer.removeChildren();
    this.uiLayer.visible = false;

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dark = isDarkMode();
    const T = this.theme;

    // 배경에 부드러운 방사형 그라데이션 느낌 (동심원)
    const glow = new PIXI.Graphics();
    const glowColor = dark ? 0x483F32 : 0xE8DFD0;
    glow.beginFill(glowColor, 0.3);
    glow.drawCircle(cx, cy - 20, 220);
    glow.endFill();
    glow.beginFill(glowColor, 0.15);
    glow.drawCircle(cx, cy - 20, 320);
    glow.endFill();
    this.menuLayer.addChild(glow);

    // 신호등 아이콘 (크고 정교한 버전)
    const icon = this.drawSignalIcon();
    icon.x = cx;
    icon.y = cy - 130;
    this.menuLayer.addChild(icon);

    // 상단 장식선
    const deco = new PIXI.Graphics();
    const decoColor = dark ? 0x5A4E3E : 0xC4B8A4;
    deco.lineStyle(1, decoColor, 0.5);
    deco.moveTo(cx - 80, cy - 62); deco.lineTo(cx - 20, cy - 62);
    deco.moveTo(cx + 20, cy - 62); deco.lineTo(cx + 80, cy - 62);
    // 중앙 다이아몬드 장식
    deco.lineStyle(1, T.primaryHex, 0.6);
    deco.moveTo(cx, cy - 67); deco.lineTo(cx + 5, cy - 62);
    deco.lineTo(cx, cy - 57); deco.lineTo(cx - 5, cy - 62);
    deco.closePath();
    this.menuLayer.addChild(deco);

    // 타이틀
    const title = new PIXI.Text('SIGNAL', new PIXI.TextStyle({
      fontFamily: '"Georgia", "Times New Roman", serif',
      fontSize: 44,
      fontWeight: 'bold',
      fill: T.textPrimary,
      letterSpacing: 8,
    }));
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 38;
    this.menuLayer.addChild(title);

    // 서브타이틀
    const sub = new PIXI.Text('TRAFFIC  CONTROL', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: T.textMuted,
      letterSpacing: 6,
    }));
    sub.anchor.set(0.5);
    sub.x = cx;
    sub.y = cy - 4;
    this.menuLayer.addChild(sub);

    // 하단 장식선
    const deco2 = new PIXI.Graphics();
    deco2.lineStyle(1, decoColor, 0.4);
    deco2.moveTo(cx - 60, cy + 14); deco2.lineTo(cx + 60, cy + 14);
    this.menuLayer.addChild(deco2);

    // 레벨 선택 라벨
    const lvLabel = new PIXI.Text('SELECT  STAGE', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 10,
      fontWeight: '600',
      fill: T.textMuted,
      letterSpacing: 3,
    }));
    lvLabel.anchor.set(0.5);
    lvLabel.x = cx;
    lvLabel.y = cy + 32;
    this.menuLayer.addChild(lvLabel);

    // 레벨 버튼들 (1~5)
    const lvCount = LEVELS.length;
    const btnSize = 40;
    const btnGap = 10;
    const totalW = lvCount * btnSize + (lvCount - 1) * btnGap;
    const startX = cx - totalW / 2 + btnSize / 2;

    for (let i = 0; i < lvCount; i++) {
      const lvBtn = new PIXI.Graphics();
      lvBtn.beginFill(T.primaryHex, 0.12);
      lvBtn.drawRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 10);
      lvBtn.endFill();
      lvBtn.lineStyle(1.2, T.primaryHex, 0.35);
      lvBtn.drawRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 10);
      lvBtn.x = startX + i * (btnSize + btnGap);
      lvBtn.y = cy + 64;
      lvBtn.eventMode = 'static';
      lvBtn.cursor = 'pointer';

      const lvNum = new PIXI.Text(`${i + 1}`, new PIXI.TextStyle({
        fontFamily: '"Georgia", "Times New Roman", serif',
        fontSize: 18,
        fontWeight: 'bold',
        fill: T.primary,
      }));
      lvNum.anchor.set(0.5);
      lvBtn.addChild(lvNum);

      // 레벨 설명 (맵 형태)
      const desc = ['1·', '2─', '3∟', '4▦', '4▦²'][i] || '';
      const lvDesc = new PIXI.Text(desc, new PIXI.TextStyle({
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 7,
        fill: T.textMuted,
      }));
      lvDesc.anchor.set(0.5);
      lvDesc.y = 14;
      lvBtn.addChild(lvDesc);

      lvBtn.on('pointerdown', () => this.startGame(i + 1));
      this.menuLayer.addChild(lvBtn);
    }

    // 조작 설명 (미니멀하게)
    const infoStyle = new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 11,
      fill: T.textMuted,
      align: 'center',
      lineHeight: 20,
    });
    const infoText = new PIXI.Text(
      '교차로를 탭하여 신호를 전환하세요\n차량 충돌을 방지하고 안전하게 통과시키세요',
      infoStyle,
    );
    infoText.anchor.set(0.5);
    infoText.x = cx;
    infoText.y = cy + 128;
    this.menuLayer.addChild(infoText);

    // 하단 장식 도트
    const dots = new PIXI.Graphics();
    dots.beginFill(dark ? 0x5A4E3E : 0xC4B8A4, 0.4);
    dots.drawCircle(cx - 8, cy + 162, 1.5);
    dots.drawCircle(cx, cy + 162, 1.5);
    dots.drawCircle(cx + 8, cy + 162, 1.5);
    dots.endFill();
    this.menuLayer.addChild(dots);
  }

  private drawSignalIcon(): PIXI.Container {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    const dark = isDarkMode();
    const bodyColor = dark ? 0x3E3528 : 0x5C4F3D;
    const rimColor = dark ? 0x5A4E3E : 0x7A6D58;

    // 기둥
    g.beginFill(bodyColor);
    g.drawRect(-3, 28, 6, 24);
    g.endFill();
    // 기둥 받침대
    g.beginFill(bodyColor);
    g.drawRoundedRect(-12, 48, 24, 6, 3);
    g.endFill();

    // 본체 (둥근 직사각형)
    g.beginFill(bodyColor);
    g.drawRoundedRect(-18, -36, 36, 68, 8);
    g.endFill();
    // 테두리
    g.lineStyle(1.5, rimColor, 0.5);
    g.drawRoundedRect(-18, -36, 36, 68, 8);
    g.lineStyle(0);

    // 신호등 라이트 (안쪽 홈 + 빛)
    const lights: [number, number, number][] = [
      [0xE85D5D, -18, 0.95],  // 빨강
      [0xE8B84C, 0, 0.35],    // 노랑 (희미)
      [0x5AB87A, 18, 0.95],   // 초록
    ];
    for (const [color, oy, alpha] of lights) {
      // 홈 (어두운 원)
      g.beginFill(dark ? 0x1E1B18 : 0x3D3225, 0.5);
      g.drawCircle(0, -18 + oy, 10);
      g.endFill();
      // 빛
      g.beginFill(color, alpha);
      g.drawCircle(0, -18 + oy, 8);
      g.endFill();
    }

    c.addChild(g);
    return c;
  }

  /* ── 게임 오버 ── */
  private showGameOver() {
    this.state = 'gameover';
    sfxGameOver();
    this.menuLayer.removeChildren();
    this.uiLayer.visible = false;

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dark = isDarkMode();
    const T = this.theme;

    // 부드러운 배경 글로우
    const glow = new PIXI.Graphics();
    const glowColor = dark ? 0x483F32 : 0xE8DFD0;
    glow.beginFill(glowColor, 0.25);
    glow.drawCircle(cx, cy, 220);
    glow.endFill();
    this.menuLayer.addChild(glow);

    const go = new PIXI.Text('GAME OVER', new PIXI.TextStyle({
      fontFamily: '"Georgia", "Times New Roman", serif',
      fontSize: 32,
      fontWeight: 'bold',
      fill: T.textPrimary,
      letterSpacing: 6,
    }));
    go.anchor.set(0.5); go.x = cx; go.y = cy - 80;
    this.menuLayer.addChild(go);

    // 장식선
    const deco = new PIXI.Graphics();
    const decoColor = dark ? 0x5A4E3E : 0xC4B8A4;
    deco.lineStyle(1, decoColor, 0.4);
    deco.moveTo(cx - 60, cy - 48); deco.lineTo(cx + 60, cy - 48);
    this.menuLayer.addChild(deco);

    const label = new PIXI.Text('VEHICLES PASSED', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: T.textMuted,
      letterSpacing: 4,
    }));
    label.anchor.set(0.5); label.x = cx; label.y = cy - 28;
    this.menuLayer.addChild(label);

    const sc = new PIXI.Text(`${this.score}`, new PIXI.TextStyle({
      fontFamily: '"Georgia", "Times New Roman", serif',
      fontSize: 56,
      fontWeight: 'bold',
      fill: T.primary,
    }));
    sc.anchor.set(0.5); sc.x = cx; sc.y = cy + 24;
    this.menuLayer.addChild(sc);

    // RETRY 버튼
    const btn = new PIXI.Graphics();
    btn.beginFill(T.primaryHex, 0.15);
    btn.drawRoundedRect(-70, -22, 140, 44, 22);
    btn.endFill();
    btn.lineStyle(1.5, T.primaryHex, 0.5);
    btn.drawRoundedRect(-70, -22, 140, 44, 22);
    btn.x = cx; btn.y = cy + 100;
    btn.eventMode = 'static'; btn.cursor = 'pointer';
    const btnT = new PIXI.Text('RETRY', new PIXI.TextStyle({
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: T.primary,
      letterSpacing: 4,
    }));
    btnT.anchor.set(0.5); btn.addChild(btnT);
    btn.on('pointerdown', () => this.startGame());
    this.menuLayer.addChild(btn);
  }

  /* ── 게임 시작 ── */
  private startGame(startLevel = 1) {
    this.state = 'playing';
    this.level = startLevel;
    this.score = 0;
    this.levelScore = 0;
    this.lives = 3;
    this.frame = 0;
    this.spawnTimer = 0;
    this.hintTimer = 180;
    this.vehicles = [];
    this.particles = [];
    this.shockRings = [];
    this.shakeIntensity = 0;
    this.nextVehicleId = 0;
    this.lastColorIdx = -1;

    this.menuLayer.removeChildren();
    this.menuLayer.visible = false;
    this.uiLayer.visible = true;
    this.vehicleLayer.removeChildren();
    this.vfxLayer.removeChildren();
    this.vfxLayer.addChild(this.levelupText);

    this.updateUI();
    this.buildLevel();
  }

  /* ── 레벨 빌드 ── */
  private buildLevel() {
    const cfg = this.getLevelConfig();
    this.intersections = [];
    this.roads = [];
    this.spawnPoints = [];
    this.roadLayer.removeChildren();

    cfg.intersections.forEach((ic, i) => {
      const rw = ic.lanes === 2 ? 90 : 56;
      this.intersections.push({
        id: i, x: ic.x, y: ic.y,
        greenAxis: 'horizontal',
        glowPulse: 0,
        roadWidth: rw,
        lanes: ic.lanes,
      });
    });

    this.buildRoads(cfg);
    this.buildSpawnPoints();
    this.drawRoads();
  }

  private getLevelConfig(): LevelConfig {
    const idx = Math.min(this.level - 1, LEVELS.length - 1);
    const cfg = { ...LEVELS[idx] };
    if (this.level > 5) {
      cfg.spawnInterval = Math.max(30, 45 - (this.level - 5) * 3);
    }
    return cfg;
  }

  private buildRoads(cfg: LevelConfig) {
    for (const link of cfg.roads) {
      const a = this.intersections[link.from];
      const b = this.intersections[link.to];
      const ax: Axis = Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? 'horizontal' : 'vertical';
      const w = Math.max(a.roadWidth, b.roadWidth);
      this.roads.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, axis: ax, width: w, lanes: Math.max(a.lanes, b.lanes) });
    }

    for (const inter of this.intersections) {
      const w = inter.roadWidth;
      if (!this.hasRoadInDir(inter, 'north'))
        this.roads.push({ x1: inter.x, y1: 0, x2: inter.x, y2: inter.y, axis: 'vertical', width: w, lanes: inter.lanes });
      if (!this.hasRoadInDir(inter, 'south'))
        this.roads.push({ x1: inter.x, y1: inter.y, x2: inter.x, y2: CANVAS_SIZE, axis: 'vertical', width: w, lanes: inter.lanes });
      if (!this.hasRoadInDir(inter, 'west'))
        this.roads.push({ x1: 0, y1: inter.y, x2: inter.x, y2: inter.y, axis: 'horizontal', width: w, lanes: inter.lanes });
      if (!this.hasRoadInDir(inter, 'east'))
        this.roads.push({ x1: inter.x, y1: inter.y, x2: CANVAS_SIZE, y2: inter.y, axis: 'horizontal', width: w, lanes: inter.lanes });
    }
  }

  private hasRoadInDir(inter: Intersection, dir: Direction): boolean {
    for (const o of this.intersections) {
      if (o.id === inter.id) continue;
      if (dir === 'north' && o.y < inter.y && Math.abs(o.x - inter.x) < 10) return true;
      if (dir === 'south' && o.y > inter.y && Math.abs(o.x - inter.x) < 10) return true;
      if (dir === 'west' && o.x < inter.x && Math.abs(o.y - inter.y) < 10) return true;
      if (dir === 'east' && o.x > inter.x && Math.abs(o.y - inter.y) < 10) return true;
    }
    return false;
  }

  /* ── 스폰 포인트 ──
     각 교차로에서, 화면 가장자리에서 들어오는 방향만 스폰.
     차량은 우측통행: east(→)는 도로 아래쪽, west(←)는 도로 위쪽,
     south(↓)는 도로 왼쪽, north(↑)는 도로 오른쪽 */
  private buildSpawnPoints() {
    for (const inter of this.intersections) {
      const dirs: Direction[] = ['north', 'south', 'east', 'west'];
      for (const dir of dirs) {
        // 화면 가장자리에서 시작하는 스폰만
        const hasEdge = !this.hasRoadInDir(inter, this.oppositeDir(dir));

        for (let lane = 0; lane < inter.lanes; lane++) {
          // 2차선 우측통행: 방향별로 올바른 레인만 사용
          // lane 0 = 왼쪽/위쪽(-offset), lane 1 = 오른쪽/아래쪽(+offset)
          // south(↓), west(←) → lane 0 / north(↑), east(→) → lane 1
          if (inter.lanes === 2) {
            if ((dir === 'south' || dir === 'west') && lane !== 0) continue;
            if ((dir === 'north' || dir === 'east') && lane !== 1) continue;
          }

          let x: number, y: number;

          // 우측통행 오프셋 계산
          let rightOff: number;
          if (inter.lanes === 1) {
            // 1차선: 중앙선 기준 우측으로 약간 오프셋
            switch (dir) {
              case 'south': rightOff = -10; break; // ↓ = 왼쪽 차선
              case 'north': rightOff = 10; break;  // ↑ = 오른쪽 차선
              case 'east': rightOff = 10; break;   // → = 아래쪽 차선
              case 'west': rightOff = -10; break;  // ← = 위쪽 차선
            }
          } else {
            // 2차선: 해당 방향의 레인 오프셋
            rightOff = lane === 0 ? -LANE_OFFSET : LANE_OFFSET;
          }

          switch (dir) {
            case 'south': // 위에서 아래로 진입
              x = inter.x + rightOff;
              y = -40;
              break;
            case 'north': // 아래에서 위로 진입
              x = inter.x + rightOff;
              y = CANVAS_SIZE + 40;
              break;
            case 'east': // 왼쪽에서 오른쪽으로 진입
              x = -40;
              y = inter.y + rightOff;
              break;
            case 'west': // 오른쪽에서 왼쪽으로 진입
              x = CANVAS_SIZE + 40;
              y = inter.y + rightOff;
              break;
          }

          this.spawnPoints.push({
            x, y, dir, lane,
            intersectionId: inter.id,
            roadWidth: inter.roadWidth,
          });
        }
      }
    }
  }

  private oppositeDir(d: Direction): Direction {
    switch (d) {
      case 'north': return 'south';
      case 'south': return 'north';
      case 'east': return 'west';
      case 'west': return 'east';
    }
  }

  /* ── 도로 렌더링 ── */
  private drawRoads() {
    const g = new PIXI.Graphics();
    const T = this.theme;

    // 도로 본체
    for (const road of this.roads) {
      const w = road.width;
      if (road.axis === 'horizontal') {
        const minX = Math.min(road.x1, road.x2);
        const maxX = Math.max(road.x1, road.x2);
        g.beginFill(T.bgRoad);
        g.drawRect(minX, road.y1 - w / 2, maxX - minX, w);
        g.endFill();
        // 도로 경계선 (실선, 테마 색상)
        g.lineStyle(1.5, T.edgeLineColor, T.edgeLineAlpha);
        g.moveTo(minX, road.y1 - w / 2); g.lineTo(maxX, road.y1 - w / 2);
        g.moveTo(minX, road.y1 + w / 2); g.lineTo(maxX, road.y1 + w / 2);
        // 중앙 점선
        g.lineStyle(1.5, T.laneLineColor, T.centerLineAlpha);
        this.dashedLine(g, minX, road.y1, maxX, road.y1, 12, 10);
        // 2차선 구분 점선
        if (road.lanes === 2) {
          g.lineStyle(1, T.laneLineColor, T.laneLineAlpha);
          this.dashedLine(g, minX, road.y1 - LANE_OFFSET, maxX, road.y1 - LANE_OFFSET, 8, 12);
          this.dashedLine(g, minX, road.y1 + LANE_OFFSET, maxX, road.y1 + LANE_OFFSET, 8, 12);
        }
      } else {
        const minY = Math.min(road.y1, road.y2);
        const maxY = Math.max(road.y1, road.y2);
        g.beginFill(T.bgRoad);
        g.drawRect(road.x1 - w / 2, minY, w, maxY - minY);
        g.endFill();
        // 도로 경계선 (실선, 테마 색상)
        g.lineStyle(1.5, T.edgeLineColor, T.edgeLineAlpha);
        g.moveTo(road.x1 - w / 2, minY); g.lineTo(road.x1 - w / 2, maxY);
        g.moveTo(road.x1 + w / 2, minY); g.lineTo(road.x1 + w / 2, maxY);
        g.lineStyle(1.5, T.laneLineColor, T.centerLineAlpha);
        this.dashedLine(g, road.x1, minY, road.x1, maxY, 12, 10);
        if (road.lanes === 2) {
          g.lineStyle(1, T.laneLineColor, T.laneLineAlpha);
          this.dashedLine(g, road.x1 - LANE_OFFSET, minY, road.x1 - LANE_OFFSET, maxY, 8, 12);
          this.dashedLine(g, road.x1 + LANE_OFFSET, minY, road.x1 + LANE_OFFSET, maxY, 8, 12);
        }
      }
    }

    // 교차로 영역
    for (const inter of this.intersections) {
      const s = inter.roadWidth;
      g.beginFill(T.bgIntersection);
      g.drawRect(inter.x - s / 2, inter.y - s / 2, s, s);
      g.endFill();
    }

    g.lineStyle(0);
    this.roadLayer.addChild(g);
  }

  private dashedLine(g: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, dash: number, gap: number) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const nx = dx / len, ny = dy / len;
    let d = 0;
    while (d < len) {
      const end = Math.min(d + dash, len);
      g.moveTo(x1 + nx * d, y1 + ny * d);
      g.lineTo(x1 + nx * end, y1 + ny * end);
      d += dash + gap;
    }
  }

  /* ── 입력 ── */
  private onPointerDown(e: PointerEvent) {
    if (this.state !== 'playing') return;
    const canvas = this.app.view as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * CANVAS_SIZE;
    const py = (e.clientY - rect.top) / rect.height * CANVAS_SIZE;

    let closest: Intersection | null = null;
    let closestDist = Infinity;
    for (const inter of this.intersections) {
      const dist = Math.sqrt((px - inter.x) ** 2 + (py - inter.y) ** 2);
      const hitR = inter.roadWidth * 1.2;
      if (dist < hitR && dist < closestDist) {
        closest = inter;
        closestDist = dist;
      }
    }
    if (closest) {
      closest.greenAxis = closest.greenAxis === 'horizontal' ? 'vertical' : 'horizontal';
      closest.glowPulse = 1;
      sfxSwitch();
    }
  }

  /* ── 메인 루프 ── */
  private update() {
    if (this.destroyed) return;

    if (this.state === 'playing') {
      this.frame++;
      this.updateSpawning();
      this.updateVehicles();
      this.updateCollisions();
      this.updateVFX();
      this.updateShake();
      this.updateHint();
      this.checkLevelUp();
      this.renderVehicles();
      this.renderSignals();
      this.renderParticles();
      this.updateUI();
    } else if (this.state === 'levelup') {
      this.levelupTimer--;
      this.updateVehicles();
      this.renderVehicles();
      this.renderSignals();
      this.updateVFX();
      this.renderParticles();
      const t = 1 - this.levelupTimer / 120;
      this.levelupText.style.fontSize = lerp(36, 48, Math.min(t * 2, 1));
      this.levelupText.alpha = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) * 2);
      if (this.levelupTimer <= 0) {
        this.state = 'playing';
        this.levelupText.alpha = 0;
        this.buildLevel();
      }
    }
  }

  /* ── 차량 스폰 ── */
  private updateSpawning() {
    const cfg = this.getLevelConfig();
    this.spawnTimer++;
    if (this.spawnTimer >= cfg.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnVehicle(cfg);
    }
  }

  private spawnVehicle(cfg: LevelConfig) {
    if (this.spawnPoints.length === 0) return;
    const sp = pickRandom(this.spawnPoints);

    let kind: VehicleKind = 'car';
    if (cfg.hasAmbulance && Math.random() < 0.08) kind = 'ambulance';
    else if (cfg.hasTruck && Math.random() < 0.1) kind = 'truck';

    let colorIdx: number;
    do { colorIdx = randInt(0, CAR_COLORS.length - 1); } while (colorIdx === this.lastColorIdx);
    this.lastColorIdx = colorIdx;

    const baseSpeed = randRange(1.8, 2.5);
    const isTruck = kind === 'truck';

    const v: Vehicle = {
      id: this.nextVehicleId++,
      x: sp.x, y: sp.y,
      dir: sp.dir,
      lane: sp.lane,
      speed: baseSpeed * (isTruck ? 0.7 : 1),
      targetSpeed: baseSpeed * (isTruck ? 0.7 : 1),
      baseSpeed: baseSpeed * (isTruck ? 0.7 : 1),
      color: kind === 'ambulance' ? '#FF4444' : CAR_COLORS[colorIdx],
      kind,
      w: isTruck ? 54 : 34,
      h: isTruck ? 22 : 18,
      stopped: false,
      stopTimer: 0,
      dead: false,
      deadTimer: 0,
      opacity: 1,
      ambulanceTimer: kind === 'ambulance' ? 300 : 0,
      ambulanceFlash: false,
      startDelay: 0,
      passed: false,
    };

    // 겹침 방지
    const tooClose = this.vehicles.some(other =>
      !other.dead && other.dir === v.dir &&
      Math.abs(other.x - v.x) < 50 && Math.abs(other.y - v.y) < 50
    );
    if (tooClose) return;

    this.vehicles.push(v);
  }

  /* ── 차량 물리 ── */
  private updateVehicles() {
    for (const v of this.vehicles) {
      if (v.dead) {
        v.deadTimer++;
        v.opacity = Math.max(0, 1 - v.deadTimer / 90);
        continue;
      }

      // 구급차 타이머
      if (v.kind === 'ambulance') {
        v.ambulanceTimer--;
        v.ambulanceFlash = Math.floor(this.frame / 9) % 2 === 0;
        if (v.ambulanceTimer <= 0 && !v.passed) {
          this.loseLife();
          v.dead = true;
          continue;
        }
      }

      // 목표 교차로
      const targetInter = this.getTargetIntersection(v);
      const shouldStop = targetInter ? targetInter.greenAxis !== dirToAxis(v.dir) : false;
      const ahead = this.getVehicleAhead(v);

      if (shouldStop && !v.passed && targetInter) {
        // 정지선까지의 거리
        const stopPos = this.getStopPosition(v, targetInter);
        const dist = this.distTo(v, stopPos.x, stopPos.y);

        if (dist < STOP_DIST + 30) {
          // 감속
          const decelT = clamp(1 - dist / (STOP_DIST + 30), 0, 1);
          const targetSpd = 0;
          v.speed = lerp(v.speed, targetSpd, easeOutCubic(decelT) * 0.12);
          if (v.speed < 0.08) {
            v.speed = 0;
            v.stopped = true;
          }
        }
      } else {
        // 가속
        if (v.stopped) {
          v.stopped = false;
          v.startDelay = 0;
        }
        v.targetSpeed = v.baseSpeed;
        v.speed = lerp(v.speed, v.targetSpeed, 0.035);
      }

      // 앞차 추종
      if (ahead) {
        const dist = this.distBetween(v, ahead);
        const minDist = CAR_GAP + (v.w + ahead.w) / 2;
        if (dist < minDist + 10) {
          v.speed = Math.min(v.speed, ahead.speed * 0.95);
          if (dist < minDist) v.speed = Math.min(v.speed, ahead.speed * 0.5);
        }
      }

      // idle 흔들림
      if (v.stopped) {
        v.stopTimer += 1 / 60;
      } else {
        v.stopTimer = 0;
      }

      // 이동
      switch (v.dir) {
        case 'east': v.x += v.speed; break;
        case 'west': v.x -= v.speed; break;
        case 'south': v.y += v.speed; break;
        case 'north': v.y -= v.speed; break;
      }

      // 교차로 통과 체크
      if (!v.passed) {
        for (const inter of this.intersections) {
          if (Math.abs(v.x - inter.x) < 15 && Math.abs(v.y - inter.y) < 15) {
            v.passed = true;
            this.score++;
            this.levelScore++;
            sfxPass();
          }
        }
      }

      // 화면 밖 제거
      if (v.x < -100 || v.x > CANVAS_SIZE + 100 || v.y < -100 || v.y > CANVAS_SIZE + 100) {
        v.dead = true;
        v.opacity = 0;
      }
    }

    this.vehicles = this.vehicles.filter(v => v.opacity > 0.01);
  }

  private getTargetIntersection(v: Vehicle): Intersection | null {
    let closest: Intersection | null = null;
    let closestDist = Infinity;

    for (const inter of this.intersections) {
      let ahead = false;
      switch (v.dir) {
        case 'east': ahead = inter.x > v.x + 5; break;
        case 'west': ahead = inter.x < v.x - 5; break;
        case 'south': ahead = inter.y > v.y + 5; break;
        case 'north': ahead = inter.y < v.y - 5; break;
      }
      if (!ahead) continue;

      // 같은 도로 위인지 확인
      const axis = dirToAxis(v.dir);
      if (axis === 'horizontal') {
        if (Math.abs(inter.y - v.y) > inter.roadWidth / 2 + 5) continue;
      } else {
        if (Math.abs(inter.x - v.x) > inter.roadWidth / 2 + 5) continue;
      }

      const dist = this.distTo(v, inter.x, inter.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = inter;
      }
    }
    return closest;
  }

  private getStopPosition(v: Vehicle, inter: Intersection): { x: number; y: number } {
    const half = inter.roadWidth / 2 + STOP_OFFSET;
    switch (v.dir) {
      case 'east': return { x: inter.x - half, y: v.y };
      case 'west': return { x: inter.x + half, y: v.y };
      case 'south': return { x: v.x, y: inter.y - half };
      case 'north': return { x: v.x, y: inter.y + half };
    }
  }

  private distTo(v: Vehicle, px: number, py: number) {
    return Math.sqrt((v.x - px) ** 2 + (v.y - py) ** 2);
  }

  private distBetween(a: Vehicle, b: Vehicle) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private getVehicleAhead(v: Vehicle): Vehicle | null {
    let closest: Vehicle | null = null;
    let closestDist = Infinity;

    for (const o of this.vehicles) {
      if (o.id === v.id || o.dead || o.dir !== v.dir) continue;

      // 같은 도로 위에 있는지 확인
      const axis = dirToAxis(v.dir);
      if (axis === 'horizontal') {
        if (Math.abs(o.y - v.y) > 6) continue;
      } else {
        if (Math.abs(o.x - v.x) > 6) continue;
      }

      let ahead = false;
      switch (v.dir) {
        case 'east': ahead = o.x > v.x; break;
        case 'west': ahead = o.x < v.x; break;
        case 'south': ahead = o.y > v.y; break;
        case 'north': ahead = o.y < v.y; break;
      }
      if (!ahead) continue;

      const dist = this.distBetween(v, o);
      if (dist < closestDist) {
        closestDist = dist;
        closest = o;
      }
    }
    return closest;
  }

  /* ── 충돌 ── */
  private updateCollisions() {
    for (let i = 0; i < this.vehicles.length; i++) {
      const a = this.vehicles[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const b = this.vehicles[j];
        if (b.dead) continue;
        if (a.dir === b.dir) continue; // 같은 방향 무시
        // 반대 방향도 무시 (같은 축)
        if (dirToAxis(a.dir) === dirToAxis(b.dir)) continue;

        const aHW = (dirToAxis(a.dir) === 'horizontal' ? a.w : a.h) / 2;
        const aHH = (dirToAxis(a.dir) === 'horizontal' ? a.h : a.w) / 2;
        const bHW = (dirToAxis(b.dir) === 'horizontal' ? b.w : b.h) / 2;
        const bHH = (dirToAxis(b.dir) === 'horizontal' ? b.h : b.w) / 2;

        if (a.x - aHW < b.x + bHW && a.x + aHW > b.x - bHW &&
            a.y - aHH < b.y + bHH && a.y + aHH > b.y - bHH) {
          this.handleCollision(a, b);
        }
      }
    }
  }

  private handleCollision(a: Vehicle, b: Vehicle) {
    a.dead = true; b.dead = true;
    a.speed = 0; b.speed = 0;
    sfxCrash();

    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const colors = [a.color, b.color, '#FF8C42', '#FFFFFF'];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 / 14) * i + randRange(-0.3, 0.3);
      const spd = randRange(2, 5);
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 48, maxLife: 48,
        color: pickRandom(colors),
        size: randRange(2, 6),
      });
    }
    this.shockRings.push({ x: cx, y: cy, radius: 5, maxRadius: 60, life: 30, maxLife: 30 });
    this.shakeIntensity = 6;
    this.shakeDuration = 30;
    this.shakeTimer = 30;
    this.loseLife();
  }

  private loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives <= 0) {
      setTimeout(() => {
        if (this.state === 'playing') {
          this.showGameOver();
          this.menuLayer.visible = true;
        }
      }, 500);
    }
  }

  /* ── VFX ── */
  private updateVFX() {
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.96; p.vy *= 0.96;
      p.life--; p.size *= 0.98;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const sr of this.shockRings) {
      sr.life--;
      const t = 1 - sr.life / sr.maxLife;
      sr.radius = lerp(5, sr.maxRadius, easeOutCubic(t));
    }
    this.shockRings = this.shockRings.filter(sr => sr.life > 0);

    for (const inter of this.intersections) {
      if (inter.glowPulse > 0) inter.glowPulse = Math.max(0, inter.glowPulse - 0.025);
    }
  }

  private updateShake() {
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
      const t = this.shakeTimer / this.shakeDuration;
      const int = this.shakeIntensity * t;
      this.app.stage.x = (Math.random() - 0.5) * int * 2;
      this.app.stage.y = (Math.random() - 0.5) * int * 2;
    } else {
      this.app.stage.x = 0; this.app.stage.y = 0;
    }
  }

  private updateHint() {
    if (this.hintTimer > 0) {
      this.hintTimer--;
      if (this.hintTimer > 120) this.hintText.alpha = (180 - this.hintTimer) / 60;
      else if (this.hintTimer < 60) this.hintText.alpha = this.hintTimer / 60;
      else this.hintText.alpha = 1;
    }
  }

  private checkLevelUp() {
    const cfg = this.getLevelConfig();
    if (this.levelScore >= cfg.passToNext && cfg.passToNext !== Infinity) {
      this.level++;
      this.levelScore = 0;
      this.state = 'levelup';
      this.levelupTimer = 120;
      this.levelupText.text = `LEVEL ${this.level}`;
      this.levelupText.alpha = 1;
      sfxLevelUp();
      for (const v of this.vehicles) {
        if (!v.dead) { v.dead = true; v.deadTimer = 30; }
      }
    }
  }

  /* ── 렌더: 차량 ── */
  private renderVehicles() {
    this.vehicleLayer.removeChildren();

    for (const v of this.vehicles) {
      const c = new PIXI.Container();
      c.x = v.x; c.y = v.y;
      c.alpha = v.opacity;

      const isH = dirToAxis(v.dir) === 'horizontal';
      const dw = isH ? v.w : v.h;
      const dh = isH ? v.h : v.w;

      // idle 흔들림
      if (v.stopped && !v.dead) {
        const wobble = Math.sin(v.stopTimer * Math.PI) * 0.3;
        if (isH) c.x += wobble; else c.y += wobble;
      }

      // 그림자
      const shadow = new PIXI.Graphics();
      shadow.beginFill(0x3D3225, isDarkMode() ? 0.4 : 0.2);
      shadow.drawRoundedRect(-dw / 2 + 2, -dh / 2 + 3, dw, dh, 5);
      shadow.endFill();
      shadow.filters = [new PIXI.BlurFilter(4)];
      c.addChild(shadow);

      // 차체
      const body = new PIXI.Graphics();
      const baseColor = v.dead ? 0xFF6B6B : parseInt(v.color.replace('#', ''), 16);
      body.beginFill(baseColor);
      body.drawRoundedRect(-dw / 2, -dh / 2, dw, dh, 5);
      body.endFill();
      // 지붕
      body.beginFill(0x3D3225, 0.2);
      body.drawRoundedRect(-dw / 4, -dh / 3, dw / 2, dh / 1.5, 3);
      body.endFill();
      c.addChild(body);

      if (!v.dead) {
        const lights = new PIXI.Graphics();
        let fdx = 0, fdy = 0;
        switch (v.dir) { case 'east': fdx = 1; break; case 'west': fdx = -1; break; case 'south': fdy = 1; break; case 'north': fdy = -1; break; }

        // 전조등
        lights.beginFill(0xFFFFD2, 0.9);
        if (isH) {
          const hx = fdx * dw / 2;
          lights.drawRect(hx - (fdx > 0 ? 3 : 0), -dh / 2 + 2, 3, 4);
          lights.drawRect(hx - (fdx > 0 ? 3 : 0), dh / 2 - 6, 3, 4);
        } else {
          const hy = fdy * dh / 2;
          lights.drawRect(-dw / 2 + 2, hy - (fdy > 0 ? 3 : 0), 4, 3);
          lights.drawRect(dw / 2 - 6, hy - (fdy > 0 ? 3 : 0), 4, 3);
        }

        // 전조등 빔
        lights.beginFill(0xFFFFC8, isDarkMode() ? 0.06 : 0.03);
        if (isH) {
          const bx = fdx * dw / 2;
          lights.moveTo(bx, -dh / 2 + 4);
          lights.lineTo(bx + fdx * 35, -dh / 2 - 5);
          lights.lineTo(bx + fdx * 35, dh / 2 + 5);
          lights.lineTo(bx, dh / 2 - 4);
          lights.closePath();
        } else {
          const by = fdy * dh / 2;
          lights.moveTo(-dw / 2 + 4, by);
          lights.lineTo(-dw / 2 - 5, by + fdy * 35);
          lights.lineTo(dw / 2 + 5, by + fdy * 35);
          lights.lineTo(dw / 2 - 4, by);
          lights.closePath();
        }
        lights.endFill();

        // 미등
        const tailAlpha = v.stopped ? 0.9 : 0.5;
        lights.beginFill(0xFF5050, tailAlpha);
        if (isH) {
          const tx = -fdx * dw / 2;
          lights.drawRect(tx - (fdx < 0 ? 3 : 0), -dh / 2 + 2, 3, 4);
          lights.drawRect(tx - (fdx < 0 ? 3 : 0), dh / 2 - 6, 3, 4);
        } else {
          const ty = -fdy * dh / 2;
          lights.drawRect(-dw / 2 + 2, ty - (fdy < 0 ? 3 : 0), 4, 3);
          lights.drawRect(dw / 2 - 6, ty - (fdy < 0 ? 3 : 0), 4, 3);
        }
        lights.endFill();
        c.addChild(lights);

        // 구급차 플래시
        if (v.kind === 'ambulance') {
          const flash = new PIXI.Graphics();
          flash.beginFill(v.ambulanceFlash ? 0xFF0000 : 0x0066FF, 0.8);
          flash.drawCircle(0, -dh / 2 - 3, 3);
          flash.drawCircle(0, dh / 2 + 3, 3);
          flash.endFill();
          c.addChild(flash);
        }
      }

      this.vehicleLayer.addChild(c);
    }
  }

  /* ── 렌더: 신호등 (각 진입로 앞에 1개씩 = 교차로당 4개) ── */
  private renderSignals() {
    const tag = '__signals__';
    const existing = this.vfxLayer.children.find(c => c.name === tag);
    if (existing) this.vfxLayer.removeChild(existing);

    const g = new PIXI.Graphics();
    g.name = tag;
    const dark = isDarkMode();

    for (const inter of this.intersections) {
      const half = inter.roadWidth / 2;
      const offset = half + 12; // 교차로 가장자리에서 살짝 바깥

      // 4방향 신호: 각 진입로 도로 위에 점 형태
      // north에서 오는 차(↓) → 교차로 위쪽 도로에 신호
      // south에서 오는 차(↑) → 교차로 아래쪽 도로에 신호
      // west에서 오는 차(→) → 교차로 왼쪽 도로에 신호
      // east에서 오는 차(←) → 교차로 오른쪽 도로에 신호
      const signals: { x: number; y: number; axis: Axis }[] = [
        { x: inter.x, y: inter.y - offset, axis: 'vertical' },   // 위 (north→south 진입)
        { x: inter.x, y: inter.y + offset, axis: 'vertical' },   // 아래 (south→north 진입)
        { x: inter.x - offset, y: inter.y, axis: 'horizontal' }, // 왼쪽 (west→east 진입)
        { x: inter.x + offset, y: inter.y, axis: 'horizontal' }, // 오른쪽 (east→west 진입)
      ];

      for (const sig of signals) {
        const isGreen = inter.greenAxis === sig.axis;
        const color = isGreen ? 0x4ADE80 : 0xF87171;
        const radius = 5;

        // 신호 점
        g.beginFill(color, 1);
        g.drawCircle(sig.x, sig.y, radius);
        g.endFill();
      }
    }
    this.vfxLayer.addChild(g);
  }

  /* ── 렌더: 파티클 ── */
  private renderParticles() {
    const tag = '__particles__';
    const existing = this.vfxLayer.children.find(c => c.name === tag);
    if (existing) this.vfxLayer.removeChild(existing);

    const g = new PIXI.Graphics();
    g.name = tag;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const color = parseInt(p.color.replace('#', ''), 16);
      g.beginFill(color, alpha);
      g.drawRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      g.endFill();
    }

    for (const sr of this.shockRings) {
      const alpha = sr.life / sr.maxLife * 0.6;
      g.lineStyle(2, isDarkMode() ? 0xD4C4AD : 0x5C4F3D, alpha);
      g.drawCircle(sr.x, sr.y, sr.radius);
      g.lineStyle(0);
    }

    this.vfxLayer.addChild(g);
  }

  /* ── UI 업데이트 ── */
  private updateUI() {
    this.scoreText.text = `PASSED: ${this.score}`;
    this.levelText.text = `LEVEL ${this.level}`;
    for (let i = 0; i < 3; i++) {
      this.heartTexts[i].alpha = i < this.lives ? 1 : 0.2;
    }
  }
}
