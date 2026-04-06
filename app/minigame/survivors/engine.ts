import * as PIXI from 'pixi.js';
import {
  GameState, ElementType, ALL_ELEMENTS, CANVAS_W, CANVAS_H,
  WORLD_W, WORLD_H, PLAYER_SPEED, PLAYER_WIDTH, PLAYER_HEIGHT,
  INVINCIBLE_FRAMES, WAVE_DURATION, AUTO_ATTACK_INTERVAL,
  ELEMENT_ORB_DROP_CHANCE, WeaponEffectState,
} from './types';
import {
  createPlayer, createEnemyPool, createProjectilePool,
  createXPOrbPool, createElementOrbPool, updateEnemies, updateProjectiles,
  updateXPOrbs, updateElementOrbs, fireProjectile, spawnXPOrb, spawnRandomElementOrb,
} from './entities';
import { SpatialHash, checkProjectileEnemyCollisions, checkPlayerEnemyCollisions, checkWeaponEffectEnemyCollisions } from './collision';
import { createParticlePool, updateParticles, spawnExplosionParticles, spawnHitParticles, spawnLevelUpParticles } from './particles';
import { spawnWaveEnemies, getMaxEnemies } from './spawner';
import { getWeaponForElements, activateAllWeapons, updateWeaponEffects } from './weapons';
import {
  createGameGraphics, drawGround, drawPlayer, drawEnemies,
  drawProjectiles, drawXPOrbs, drawElementOrbs, drawParticles, drawWeaponEffects,
  updateCamera, applyCamera,
} from './renderer';
import {
  UIElements, createUI, updateUI,
  GameOverOverlay, createGameOverOverlay, showGameOver,
  DevPanel, createDevPanel,
} from './ui';
import { EffectManager } from './effects/EffectManager';

export class GameEngine {
  app: PIXI.Application;
  state!: GameState;
  keys: Set<string> = new Set();
  spatialHash: SpatialHash = new SpatialHash();
  destroyed = false;

  // Graphics references
  private worldContainer!: PIXI.Container;
  private uiContainer!: PIXI.Container;
  private groundGfx!: PIXI.Graphics;
  private playerGfx!: PIXI.Graphics;
  private enemyGfx: PIXI.Graphics[] = [];
  private projGfx: PIXI.Graphics[] = [];
  private orbGfx: PIXI.Graphics[] = [];
  private elementOrbGfx: PIXI.Graphics[] = [];
  private particleGfx: PIXI.Graphics[] = [];
  private effectGfx: PIXI.Graphics[] = [];
  private entityLayer!: PIXI.Container;
  private effectLayer!: PIXI.Container;
  private particleLayer!: PIXI.Container;

  private ui!: UIElements;
  private gameOverOverlay!: GameOverOverlay;
  private isDark = false;
  private devMode = true;
  private devPanel!: DevPanel;
  private _waterCooldown = 0;
  private _earthCooldown = 0;
  private _lightCooldown = 0;

  private effectManager!: EffectManager;

  // Mobile joystick
  private joystickActive = false;
  private joystickStartX = 0;
  private joystickStartY = 0;
  private joystickDX = 0;
  private joystickDY = 0;
  private joystickContainer!: PIXI.Container;
  private joystickBg!: PIXI.Graphics;
  private joystickKnob!: PIXI.Graphics;
  private isMobile = false;

  // Player facing
  private facingX = 1;
  private facingY = 0;

  constructor() {
    this.app = new PIXI.Application({
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: 0x2A2318,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
  }

  init(container: HTMLDivElement) {
    const canvas = this.app.view as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = '1';
    canvas.style.maxWidth = '720px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.borderRadius = '8px';
    container.appendChild(canvas);

    this.isMobile = 'ontouchstart' in window;
    this.isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    this.setupState();
    this.setupGraphics();
    this.setupInput();
    this.app.ticker.add(this.gameLoop);
  }

  private setupState() {
    this.state = {
      player: createPlayer(),
      enemies: createEnemyPool(500),
      projectiles: createProjectilePool(100),
      xpOrbs: createXPOrbPool(),
      elementOrbs: createElementOrbPool(),
      particles: createParticlePool(),
      wave: 1,
      waveTimer: WAVE_DURATION,
      frameCount: 0,
      autoAttackTimer: 0,
      paused: false,
      gameOver: false,
      cameraX: 0,
      cameraY: 0,
      shakeX: 0,
      shakeY: 0,
      shakeFrames: 0,
      waveAnnounceTimer: 90,
      comboDisplayTimer: 0,
      comboDisplayCount: 0,
      weaponEffects: [],
      beamAngles: [0, 0, 0],
      levelUpTextTimer: 0,
    };
  }

  private setupGraphics() {
    const { worldContainer, uiContainer, groundLayer, entityLayer, effectLayer, particleLayer } =
      createGameGraphics(this.app.stage);
    this.worldContainer = worldContainer;
    this.uiContainer = uiContainer;
    this.entityLayer = entityLayer;
    this.effectLayer = effectLayer;
    this.particleLayer = particleLayer;

    // Ground
    this.groundGfx = new PIXI.Graphics();
    drawGround(this.groundGfx, this.isDark);
    groundLayer.addChild(this.groundGfx);

    // Player
    this.playerGfx = new PIXI.Graphics();
    entityLayer.addChild(this.playerGfx);

    // UI
    this.ui = createUI(uiContainer);
    this.gameOverOverlay = createGameOverOverlay(uiContainer);

    // Mobile joystick
    if (this.isMobile) {
      this.setupJoystick();
    }

    // 이펙트 매니저
    this.effectManager = new EffectManager(effectLayer);

    // Dev panel
    if (this.devMode) {
      this.devPanel = createDevPanel(
        uiContainer,
        (element: ElementType) => this.addElementToSlot(element),
        () => this.devClearSlots(),
        () => this.devFillAll(),
      );
    }
  }

  private setupJoystick() {
    this.joystickContainer = new PIXI.Container();
    this.joystickContainer.visible = false;

    this.joystickBg = new PIXI.Graphics();
    this.joystickBg.beginFill(0xFFFFFF, 0.15);
    this.joystickBg.drawCircle(0, 0, 50);
    this.joystickBg.endFill();
    this.joystickBg.lineStyle(2, 0xFFFFFF, 0.3);
    this.joystickBg.drawCircle(0, 0, 50);

    this.joystickKnob = new PIXI.Graphics();
    this.joystickKnob.beginFill(0xFFFFFF, 0.4);
    this.joystickKnob.drawCircle(0, 0, 20);
    this.joystickKnob.endFill();

    this.joystickContainer.addChild(this.joystickBg, this.joystickKnob);
    this.uiContainer.addChild(this.joystickContainer);

    const canvas = this.app.view as HTMLCanvasElement;
    canvas.addEventListener('touchstart', (e) => {
      if (this.state.paused || this.state.gameOver) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((touch.clientY - rect.top) / rect.height) * CANVAS_H;
      // Only activate in bottom-left quadrant
      if (x < CANVAS_W * 0.5 && y > CANVAS_H * 0.4) {
        this.joystickActive = true;
        this.joystickStartX = x;
        this.joystickStartY = y;
        this.joystickContainer.visible = true;
        this.joystickContainer.x = x;
        this.joystickContainer.y = y;
        this.joystickKnob.x = 0;
        this.joystickKnob.y = 0;
        e.preventDefault();
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.joystickActive) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((touch.clientY - rect.top) / rect.height) * CANVAS_H;
      let dx = x - this.joystickStartX;
      let dy = y - this.joystickStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 50;
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }
      this.joystickDX = dx / maxDist;
      this.joystickDY = dy / maxDist;
      this.joystickKnob.x = dx;
      this.joystickKnob.y = dy;
      e.preventDefault();
    }, { passive: false });

    const endJoystick = () => {
      this.joystickActive = false;
      this.joystickDX = 0;
      this.joystickDY = 0;
      this.joystickContainer.visible = false;
    };
    canvas.addEventListener('touchend', endJoystick);
    canvas.addEventListener('touchcancel', endJoystick);
  }

  private setupInput() {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);

      // Weapon slot switching with 1, 2, 3
      if (key === '1') this.state.player.activeSlotIndex = 0;
      else if (key === '2') this.state.player.activeSlotIndex = 1;
      else if (key === '3') this.state.player.activeSlotIndex = 2;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Store for cleanup
    this._keyDown = onKeyDown;
    this._keyUp = onKeyUp;
  }

  private _keyDown!: (e: KeyboardEvent) => void;
  private _keyUp!: (e: KeyboardEvent) => void;

  private gameLoop = () => {
    if (this.destroyed) return;
    if (this.state.gameOver) return;
    if (this.state.paused) {
      this.render();
      return;
    }

    this.state.frameCount++;
    this.updatePlayer();
    this.updateWave();
    spawnWaveEnemies(this.state);
    updateEnemies(this.state.enemies, this.state.player.x, this.state.player.y);
    this.autoAttack();
    activateAllWeapons(this.state);
    updateWeaponEffects(this.state);
    this.effectManager.update(1);
    // 물 속성이 슬롯에 있으면 이펙트 상시 활성 + 위치 추적
    this.updateElementEffects();
    updateProjectiles(this.state.projectiles);
    // DEV: XP 오브/원소 오브 업데이트 제거
    // updateXPOrbs(this.state.xpOrbs, this.state.player);
    // this.handleElementOrbPickup();
    updateParticles(this.state.particles);
    this.handleCollisions();
    // DEV: 레벨업 제거
    // this.checkLevelUp();
    this.updateCombo();
    this.updateLevelUpText();
    updateCamera(this.state);
    this.render();
  };

  private updatePlayer() {
    const { player } = this.state;
    let dx = 0, dy = 0;

    // Keyboard
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    // Mobile joystick
    if (this.joystickActive) {
      dx += this.joystickDX;
      dy += this.joystickDY;
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      player.x += dx * player.speed;
      player.y += dy * player.speed;
      this.facingX = dx;
      this.facingY = dy;
    }

    // Clamp to world
    player.x = Math.max(PLAYER_WIDTH, Math.min(WORLD_W - PLAYER_WIDTH, player.x));
    player.y = Math.max(PLAYER_HEIGHT, Math.min(WORLD_H - PLAYER_HEIGHT, player.y));

    if (player.invincibleFrames > 0) player.invincibleFrames--;
    if (player.comboTimer > 0) {
      player.comboTimer--;
      if (player.comboTimer <= 0) player.comboCount = 0;
    }
  }

  /** 매 프레임: 슬롯에 있는 원소에 따라 이펙트 활성/위치 갱신 */
  private updateElementEffects() {
    const { player } = this.state;
    const px = player.x;
    const py = player.y;

    // 슬롯에서 현재 활성 원소 수집
    let hasWater = false;
    for (const slot of player.weaponSlots) {
      if (slot.weapon) continue;
      for (const el of slot.elements) {
        if (el === '물') hasWater = true;
      }
    }

    // 물 이펙트
    if (hasWater) {
      const waterRadius = 120;
      this.effectManager.startWater(px, py, waterRadius);
      this.effectManager.updateWaterPosition(px, py);

      // 넉백 + 데미지 (매 프레임 범위 내 적 밀어냄)
      const { enemies, particles } = this.state;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active) continue;
        const dx = e.x - px;
        const dy = e.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < waterRadius && dist > 1) {
          // 넉백: 바깥 방향으로 밀어냄
          const pushStrength = 2.5 * (1 - dist / waterRadius); // 중심에 가까울수록 강함
          e.x += (dx / dist) * pushStrength;
          e.y += (dy / dist) * pushStrength;

          // 지속 데미지 (30프레임마다 = 0.5초)
          if (this.state.frameCount % 30 === 0) {
            e.hp -= 8;
            spawnHitParticles(particles, e.x, e.y, 0x2563eb);
            if (e.hp <= 0) this.killEnemy(i);
          }
        }
      }
    } else {
      this.effectManager.stopWater();
    }
  }

  private updateWave() {
    this.state.waveTimer--;
    if (this.state.waveAnnounceTimer > 0) this.state.waveAnnounceTimer--;

    if (this.state.waveTimer <= 0) {
      this.state.wave++;
      this.state.waveTimer = WAVE_DURATION;
      this.state.waveAnnounceTimer = 90;
    }
  }

  private autoAttack() {
    const { player, enemies, projectiles } = this.state;

    this.state.autoAttackTimer++;
    if (this.state.autoAttackTimer < AUTO_ATTACK_INTERVAL) return;
    this.state.autoAttackTimer = 0;

    // 슬롯에 채워진 원소들 수집 (완성된 무기 슬롯 제외, 진행 중인 슬롯만)
    const filledElements: ElementType[] = [];
    for (const slot of player.weaponSlots) {
      if (slot.weapon) continue; // 완성된 슬롯은 무기 시스템이 처리
      for (const el of slot.elements) {
        if (el) filledElements.push(el);
      }
    }

    // 가장 가까운 적 찾기
    const findNearest = () => {
      let idx = -1, dist = Infinity;
      for (let i = 0; i < enemies.length; i++) {
        if (!enemies[i].active) continue;
        const dx = enemies[i].x - player.x;
        const dy = enemies[i].y - player.y;
        const d = dx * dx + dy * dy;
        if (d < dist) { dist = d; idx = i; }
      }
      return { idx, dist };
    };

    const range = 400;
    const { idx: nearestIdx, dist: nearestDist } = findNearest();

    // 원소가 없으면 기본 백색 투사체
    if (filledElements.length === 0) {
      if (nearestIdx >= 0 && nearestDist <= range * range) {
        const e = enemies[nearestIdx];
        fireProjectile(projectiles, player.x, player.y, e.x, e.y, 10, 0xFFFFFF, 5, 4);
      }
      return;
    }

    // 원소별 공격 패턴
    const elColorMap: Record<string, number> = {
      '빛': 0xfef08a, '암흑': 0x7c3aed, '흙': 0xa16207,
      '불': 0xef4444, '물': 0x3b82f6, '전기': 0xa78bfa,
    };

    for (const el of filledElements) {
      const color = elColorMap[el] || 0xFFFFFF;

      switch (el) {
        case '물': {
          // 물: updateElementEffects()에서 매 프레임 처리. 여기서는 아무것도 안 함.
          break;
        }
        case '흙': {
          // 흙: 쿨타임 4회 호출 (30*4=120프레임 = 2초)
          if (!this._earthCooldown) this._earthCooldown = 0;
          this._earthCooldown++;
          if (this._earthCooldown < 4) break;
          this._earthCooldown = 0;

          this.spawnAutoEffect({
            type: 'explosion',
            uniqueId: 'auto_earth',
            x: player.x, y: player.y,
            vx: 0, vy: 0,
            radius: 95,
            damage: 16,
            color: 0xa16207,
            life: 60,
            maxLife: 60,
            active: true,
            angle: 0,
            hitEnemies: new Set(),
          });
          break;
        }
        case '전기': {
          // 전기: 체인 라이트닝 — 플레이어→적1→적2→적3 전이
          if (nearestIdx >= 0 && nearestDist <= range * range) {
            // 가까운 적 최대 4체 찾기
            const chainTargets: number[] = [];
            const used = new Set<number>();
            let curX = player.x, curY = player.y;
            const chainRange = 150; // 전이 거리

            for (let chain = 0; chain < 4; chain++) {
              let bestIdx = -1, bestDist = Infinity;
              for (let ei = 0; ei < enemies.length; ei++) {
                if (!enemies[ei].active || used.has(ei)) continue;
                const dx = enemies[ei].x - curX;
                const dy = enemies[ei].y - curY;
                const d = dx * dx + dy * dy;
                const maxD = chain === 0 ? range * range : chainRange * chainRange;
                if (d < bestDist && d <= maxD) {
                  bestDist = d; bestIdx = ei;
                }
              }
              if (bestIdx < 0) break;
              chainTargets.push(bestIdx);
              used.add(bestIdx);
              curX = enemies[bestIdx].x;
              curY = enemies[bestIdx].y;
            }

            if (chainTargets.length > 0) {
              // 각 체인 구간마다 번개 이펙트 생성
              let fromX = player.x, fromY = player.y;
              for (let ci = 0; ci < chainTargets.length; ci++) {
                const target = enemies[chainTargets[ci]];
                // 데미지 (전이될수록 감소)
                const dmg = Math.max(5, 14 - ci * 3);
                target.hp -= dmg;
                spawnHitParticles(this.state.particles, target.x, target.y, 0xa78bfa);
                if (target.hp <= 0) this.killEnemy(chainTargets[ci]);

                // 번개 이펙트: from → target
                this.spawnAutoEffect({
                  type: 'lightning',
                  uniqueId: 'auto_electric',
                  x: fromX, y: fromY,
                  vx: target.x, vy: target.y, // vx/vy에 도착점 저장
                  radius: 15,
                  damage: 0, // 데미지는 위에서 직접 처리
                  color: 0xa78bfa,
                  life: 12,
                  maxLife: 12,
                  active: true,
                  angle: ci, // 체인 순서
                  hitEnemies: new Set(),
                });

                fromX = target.x;
                fromY = target.y;
              }
            }
          }
          break;
        }
        case '불': {
          // 불: 화염 투사체 — 맞으면 파편 분산
          if (nearestIdx >= 0 && nearestDist <= range * range) {
            const e = enemies[nearestIdx];
            const ok = fireProjectile(projectiles, player.x, player.y, e.x, e.y, 18, 0xef4444, 5, 5);
            if (ok) {
              for (let pi = projectiles.length - 1; pi >= 0; pi--) {
                if (projectiles[pi].active && projectiles[pi].color === 0xef4444 && !projectiles[pi].elementType) {
                  projectiles[pi].elementType = '불';
                  projectiles[pi].onHitEffect = 'fire_splash';
                  break;
                }
              }
            }
          }
          break;
        }
        case '빛': {
          // 빛: 차징 → 두꺼운 광선 발사 (쿨타임 4회 호출 = 30*4=120프레임 = 2초)
          if (!this._lightCooldown) this._lightCooldown = 0;
          this._lightCooldown++;
          if (this._lightCooldown < 4) break;
          this._lightCooldown = 0;

          {
            // 방향: 플레이어가 보고 있는 방향
            const angle = Math.atan2(this.facingY, this.facingX);
            const beamLen = 2000;

            this.spawnAutoEffect({
              type: 'beam',
              uniqueId: 'auto_light',
              x: player.x, y: player.y,
              vx: Math.cos(angle), vy: Math.sin(angle),
              radius: beamLen,
              damage: 0,
              color: 0xfef08a,
              life: 80,
              maxLife: 80,
              active: true,
              angle,
              hitEnemies: new Set(),
            });

            // 직선 판정 (발사 시점에 경로 위 적 데미지)
            const beamWidth = 20;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            for (let ei = 0; ei < enemies.length; ei++) {
              const en = enemies[ei];
              if (!en.active) continue;
              const dx = en.x - player.x;
              const dy = en.y - player.y;
              const proj = dx * dirX + dy * dirY;
              if (proj < 0 || proj > beamLen) continue;
              const perpDist = Math.abs(dx * (-dirY) + dy * dirX);
              if (perpDist < beamWidth) {
                en.hp -= 25;
                spawnHitParticles(this.state.particles, en.x, en.y, 0xfef08a);
                if (en.hp <= 0) this.killEnemy(ei);
              }
            }
          }
          break;
        }
        default: {
          // 암흑: 일반 투사체
          if (nearestIdx >= 0 && nearestDist <= range * range) {
            const e = enemies[nearestIdx];
            fireProjectile(projectiles, player.x, player.y, e.x, e.y, 14, color, 6, 5);
          }
          break;
        }
      }
    }
  }

  private spawnAutoEffect(effect: WeaponEffectState) {
    const effects = this.state.weaponEffects;
    for (let i = 0; i < effects.length; i++) {
      if (!effects[i].active) {
        effects[i] = effect;
        return;
      }
    }
    if (effects.length < 200) {
      effects.push(effect);
    }
  }

  private handleElementOrbPickup() {
    const { player, elementOrbs } = this.state;
    const pickedElement = updateElementOrbs(elementOrbs, player);

    if (pickedElement) {
      this.addElementToSlot(pickedElement);
    }
  }

  private addElementToSlot(element: ElementType) {
    const { player } = this.state;

    // Try active slot first
    const trySlot = (index: number): boolean => {
      const slot = player.weaponSlots[index];
      if (slot.weapon !== null) return false; // already completed
      for (let i = 0; i < 3; i++) {
        if (slot.elements[i] === null) {
          slot.elements[i] = element;
          // Check if all 3 sub-slots are now filled
          if (slot.elements.every(e => e !== null)) {
            const weapon = getWeaponForElements(slot.elements);
            slot.weapon = weapon;
            slot.weaponTimer = 0;
          }
          return true;
        }
      }
      return false;
    };

    // Try active slot first, then others
    if (trySlot(player.activeSlotIndex)) return;
    for (let i = 0; i < 3; i++) {
      if (i === player.activeSlotIndex) continue;
      if (trySlot(i)) return;
    }
  }

  private devClearSlots() {
    for (const slot of this.state.player.weaponSlots) {
      slot.elements = [null, null, null];
      slot.weapon = null;
      slot.weaponTimer = 0;
    }
    // Clear active weapon effects
    for (const eff of this.state.weaponEffects) {
      eff.active = false;
    }
  }

  private devFillAll() {
    for (let s = 0; s < 3; s++) {
      const slot = this.state.player.weaponSlots[s];
      if (slot.weapon) continue; // already complete
      for (let e = 0; e < 3; e++) {
        if (slot.elements[e] === null) {
          slot.elements[e] = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
        }
      }
      if (slot.elements.every(el => el !== null)) {
        const weapon = getWeaponForElements(slot.elements);
        slot.weapon = weapon;
        slot.weaponTimer = 0;
      }
    }
  }

  private handleCollisions() {
    const { enemies, projectiles, player, particles, xpOrbs, weaponEffects } = this.state;

    // Build spatial hash for enemies
    this.spatialHash.clear();
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].active) {
        this.spatialHash.insert(i, enemies[i].x, enemies[i].y, enemies[i].width, enemies[i].height);
      }
    }

    // Projectile-enemy collisions
    const projHits = checkProjectileEnemyCollisions(projectiles, enemies, this.spatialHash);
    for (const { pi, ei } of projHits) {
      const p = projectiles[pi];
      const e = enemies[ei];
      e.hp -= p.damage;
      spawnHitParticles(particles, e.x, e.y, p.color || 0xFFFFFF);

      // 불 투사체: 파편 분산 — 주변 적에게 약한 데미지
      if (p.onHitEffect === 'fire_splash') {
        // 파편 이펙트
        this.spawnAutoEffect({
          type: 'explosion',
          uniqueId: 'auto_fire_splash',
          x: e.x, y: e.y,
          vx: 0, vy: 0,
          radius: 55,
          damage: 6, // 파편 데미지 (본체 18보다 약함)
          color: 0xef4444,
          life: 40,
          maxLife: 40,
          active: true,
          angle: 0,
          hitEnemies: new Set([ei]), // 이미 맞은 적 제외
        });
      }

      if (p.pierce > 0) {
        p.pierce--;
      } else {
        p.active = false;
      }

      if (e.hp <= 0) {
        this.killEnemy(ei);
      }
    }

    // Weapon effect-enemy collisions
    const wHits = checkWeaponEffectEnemyCollisions(weaponEffects, enemies, this.spatialHash);
    for (const { wi, ei } of wHits) {
      const w = weaponEffects[wi];
      const e = enemies[ei];
      e.hp -= w.damage;
      w.hitEnemies.add(ei);
      spawnHitParticles(particles, e.x, e.y, w.color);

      if (e.hp <= 0) {
        this.killEnemy(ei);
      }
    }

    // Player-enemy collisions (DEV: 무적 — 피격 무시)
    // const playerHits = checkPlayerEnemyCollisions(player, enemies, this.spatialHash);
    // if (playerHits.length > 0) {
    //   player.hp -= 10;
    //   player.invincibleFrames = INVINCIBLE_FRAMES;
    //   this.state.shakeFrames = 8;
    //   if (player.hp <= 0) {
    //     player.hp = 0;
    //     this.state.gameOver = true;
    //     showGameOver(this.gameOverOverlay, this.state, () => this.restart());
    //   }
    // }
  }

  private killEnemy(ei: number) {
    const e = this.state.enemies[ei];
    if (!e.active) return;

    spawnExplosionParticles(this.state.particles, e.x, e.y, e.color, 10);

    // DEV: XP 오브, 원소 오브 드랍 제거
    // spawnXPOrb(this.state.xpOrbs, e.x, e.y, e.xp);
    // if (Math.random() < ELEMENT_ORB_DROP_CHANCE) {
    //   spawnRandomElementOrb(this.state.elementOrbs, e.x, e.y);
    // }

    e.active = false;

    this.state.player.kills++;
    this.state.player.score += e.xp;
    this.state.player.comboCount++;
    this.state.player.comboTimer = 90; // 1.5 seconds

    if (this.state.player.comboCount >= 5) {
      this.state.comboDisplayCount = this.state.player.comboCount;
      this.state.comboDisplayTimer = 60;
    }
  }

  private updateCombo() {
    if (this.state.comboDisplayTimer > 0) this.state.comboDisplayTimer--;
  }

  private updateLevelUpText() {
    if (this.state.levelUpTextTimer > 0) this.state.levelUpTextTimer--;
  }

  private checkLevelUp() {
    const { player } = this.state;
    if (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level++;
      player.xpToNext = 20 + player.level * 15;

      spawnLevelUpParticles(this.state.particles, player.x, player.y);

      // Simple stat boosts - no pause, no element selection
      player.maxHp += 5;
      player.speed += 0.1;
      // Heal 20% of max HP
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.2);

      // Show brief "LEVEL UP!" text
      this.state.levelUpTextTimer = 60; // 1 second
    }
  }

  private render() {
    drawPlayer(this.playerGfx, this.state);
    this.playerGfx.rotation = Math.atan2(this.facingY, this.facingX);

    drawEnemies(this.entityLayer, this.state, this.enemyGfx);
    drawProjectiles(this.effectLayer, this.state, this.projGfx);
    // DEV: 오브 렌더링 제거
    // drawXPOrbs(this.entityLayer, this.state, this.orbGfx);
    // drawElementOrbs(this.entityLayer, this.state, this.elementOrbGfx);
    drawParticles(this.particleLayer, this.state, this.particleGfx);
    drawWeaponEffects(this.effectLayer, this.state, this.effectGfx);
    applyCamera(this.worldContainer, this.state);
    updateUI(this.ui, this.state);
  }

  restart() {
    // Clean up all graphics
    this.enemyGfx.forEach(g => { g.destroy(); });
    this.projGfx.forEach(g => { g.destroy(); });
    this.orbGfx.forEach(g => { g.destroy(); });
    this.elementOrbGfx.forEach(g => { g.destroy(); });
    this.particleGfx.forEach(g => { g.destroy(); });
    this.effectGfx.forEach(g => { g.destroy(); });
    this.enemyGfx = [];
    this.projGfx = [];
    this.orbGfx = [];
    this.elementOrbGfx = [];
    this.particleGfx = [];
    this.effectGfx = [];

    this.gameOverOverlay.container.visible = false;

    this.setupState();
  }

  destroy() {
    this.destroyed = true;
    this.effectManager?.destroy();
    window.removeEventListener('keydown', this._keyDown);
    window.removeEventListener('keyup', this._keyUp);
    this.app.ticker.remove(this.gameLoop);
    this.app.destroy(true, { children: true, texture: true });
  }
}
