import * as PIXI from 'pixi.js';
import { GameState, ElementType, ELEMENT_COLORS, ALL_ELEMENTS, CANVAS_W, CANVAS_H } from './types';

export interface UIElements {
  hpBarBg: PIXI.Graphics;
  hpBarFill: PIXI.Graphics;
  hpText: PIXI.Text;
  xpBarBg: PIXI.Graphics;
  xpBarFill: PIXI.Graphics;
  scoreText: PIXI.Text;
  waveText: PIXI.Text;
  waveAnnounce: PIXI.Text;
  comboText: PIXI.Text;
  levelText: PIXI.Text;
  levelUpFlash: PIXI.Text;
  // Weapon slot UI
  weaponSlotContainer: PIXI.Container;
  slotBgs: PIXI.Graphics[];          // 3 slot background boxes
  subSlotGraphics: PIXI.Graphics[][]; // 3 slots x 3 sub-circles
  weaponNameTexts: PIXI.Text[];       // weapon name below each slot
  slotKeyTexts: PIXI.Text[];          // "1" "2" "3" key hints
}

const TEXT_STYLE = (size: number, fill: string = '#FFFFFF') => new PIXI.TextStyle({
  fontFamily: 'Arial, sans-serif',
  fontSize: size,
  fill,
  fontWeight: 'bold',
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowBlur: 2,
  dropShadowDistance: 1,
});

export function createUI(container: PIXI.Container): UIElements {
  // HP bar
  const hpBarBg = new PIXI.Graphics();
  hpBarBg.beginFill(0x333333);
  hpBarBg.drawRoundedRect(0, 0, 180, 16, 4);
  hpBarBg.endFill();
  hpBarBg.x = 10;
  hpBarBg.y = 10;

  const hpBarFill = new PIXI.Graphics();
  hpBarFill.x = 10;
  hpBarFill.y = 10;

  const hpText = new PIXI.Text('HP 100/100', TEXT_STYLE(11));
  hpText.x = 14;
  hpText.y = 10;

  // XP bar
  const xpBarBg = new PIXI.Graphics();
  xpBarBg.beginFill(0x333333);
  xpBarBg.drawRoundedRect(0, 0, 180, 8, 3);
  xpBarBg.endFill();
  xpBarBg.x = 10;
  xpBarBg.y = 30;

  const xpBarFill = new PIXI.Graphics();
  xpBarFill.x = 10;
  xpBarFill.y = 30;

  // Score / kills
  const scoreText = new PIXI.Text('', TEXT_STYLE(13));
  scoreText.anchor.set(1, 0);
  scoreText.x = CANVAS_W - 10;
  scoreText.y = 10;

  // Wave timer
  const waveText = new PIXI.Text('', TEXT_STYLE(14));
  waveText.anchor.set(0.5, 0);
  waveText.x = CANVAS_W / 2;
  waveText.y = 8;

  // Wave announce
  const waveAnnounce = new PIXI.Text('', TEXT_STYLE(36, '#FFD700'));
  waveAnnounce.anchor.set(0.5, 0.5);
  waveAnnounce.x = CANVAS_W / 2;
  waveAnnounce.y = CANVAS_H / 3;
  waveAnnounce.visible = false;

  // Combo
  const comboText = new PIXI.Text('', TEXT_STYLE(24, '#FF6600'));
  comboText.anchor.set(0.5, 0.5);
  comboText.x = CANVAS_W / 2;
  comboText.y = CANVAS_H / 2 - 60;
  comboText.visible = false;

  // Level
  const levelText = new PIXI.Text('Lv.1', TEXT_STYLE(12));
  levelText.x = 10;
  levelText.y = 42;

  // Level up flash text
  const levelUpFlash = new PIXI.Text('LEVEL UP!', TEXT_STYLE(32, '#FFD700'));
  levelUpFlash.anchor.set(0.5, 0.5);
  levelUpFlash.x = CANVAS_W / 2;
  levelUpFlash.y = CANVAS_H / 2 - 100;
  levelUpFlash.visible = false;

  // --- Weapon Slot UI (bottom center) ---
  const weaponSlotContainer = new PIXI.Container();
  const slotBgs: PIXI.Graphics[] = [];
  const subSlotGraphics: PIXI.Graphics[][] = [];
  const weaponNameTexts: PIXI.Text[] = [];
  const slotKeyTexts: PIXI.Text[] = [];

  const slotWidth = 90;
  const slotHeight = 50;
  const slotGap = 12;
  const totalWidth = slotWidth * 3 + slotGap * 2;
  const startX = (CANVAS_W - totalWidth) / 2;
  const startY = CANVAS_H - 70;

  for (let s = 0; s < 3; s++) {
    const sx = startX + s * (slotWidth + slotGap);

    // Slot background
    const bg = new PIXI.Graphics();
    bg.x = sx;
    bg.y = startY;
    slotBgs.push(bg);

    // Key hint text ("1", "2", "3")
    const keyText = new PIXI.Text(`${s + 1}`, TEXT_STYLE(10, '#888888'));
    keyText.anchor.set(0.5, 0);
    keyText.x = sx + slotWidth / 2;
    keyText.y = startY - 14;
    slotKeyTexts.push(keyText);

    // 3 sub-slot circles inside each slot
    const subGfx: PIXI.Graphics[] = [];
    for (let e = 0; e < 3; e++) {
      const g = new PIXI.Graphics();
      g.x = sx + 20 + e * 25;
      g.y = startY + 20;
      subGfx.push(g);
    }
    subSlotGraphics.push(subGfx);

    // Weapon name text below slot
    const nameText = new PIXI.Text('', TEXT_STYLE(9, '#AAAAAA'));
    nameText.anchor.set(0.5, 0);
    nameText.x = sx + slotWidth / 2;
    nameText.y = startY + slotHeight + 2;
    weaponNameTexts.push(nameText);
  }

  // Add all to container
  container.addChild(hpBarBg, hpBarFill, hpText, xpBarBg, xpBarFill);
  container.addChild(scoreText, waveText, waveAnnounce, comboText, levelText, levelUpFlash);
  container.addChild(weaponSlotContainer);
  for (const bg of slotBgs) weaponSlotContainer.addChild(bg);
  for (const kt of slotKeyTexts) weaponSlotContainer.addChild(kt);
  for (const subArr of subSlotGraphics) {
    for (const g of subArr) weaponSlotContainer.addChild(g);
  }
  for (const nt of weaponNameTexts) weaponSlotContainer.addChild(nt);

  return {
    hpBarBg, hpBarFill, hpText, xpBarBg, xpBarFill,
    scoreText, waveText, waveAnnounce, comboText,
    levelText, levelUpFlash,
    weaponSlotContainer, slotBgs, subSlotGraphics, weaponNameTexts, slotKeyTexts,
  };
}

export function updateUI(ui: UIElements, state: GameState) {
  const { player, wave, waveTimer } = state;

  // HP bar
  ui.hpBarFill.clear();
  const hpRatio = player.hp / player.maxHp;
  const hpColor = hpRatio > 0.5 ? 0x44CC44 : hpRatio > 0.25 ? 0xCCCC44 : 0xCC4444;
  ui.hpBarFill.beginFill(hpColor);
  ui.hpBarFill.drawRoundedRect(0, 0, 180 * hpRatio, 16, 4);
  ui.hpBarFill.endFill();
  ui.hpText.text = `HP ${Math.ceil(player.hp)}/${player.maxHp}`;

  // XP bar
  ui.xpBarFill.clear();
  const xpRatio = player.xp / player.xpToNext;
  ui.xpBarFill.beginFill(0x7ED957);
  ui.xpBarFill.drawRoundedRect(0, 0, 180 * Math.min(xpRatio, 1), 8, 3);
  ui.xpBarFill.endFill();

  // Score
  const secs = Math.floor(state.frameCount / 60);
  const mins = Math.floor(secs / 60);
  const secStr = (secs % 60).toString().padStart(2, '0');
  ui.scoreText.text = `${player.kills} Kills | ${player.score} Pts | ${mins}:${secStr}`;

  // Wave timer
  const waveSeconds = Math.ceil(waveTimer / 60);
  ui.waveText.text = `Wave ${wave} | ${waveSeconds}s`;

  // Wave announce
  if (state.waveAnnounceTimer > 0) {
    ui.waveAnnounce.visible = true;
    ui.waveAnnounce.text = `WAVE ${wave}`;
    ui.waveAnnounce.alpha = Math.min(state.waveAnnounceTimer / 30, 1);
  } else {
    ui.waveAnnounce.visible = false;
  }

  // Combo
  if (state.comboDisplayTimer > 0 && state.comboDisplayCount >= 5) {
    ui.comboText.visible = true;
    ui.comboText.text = `x${state.comboDisplayCount} COMBO!`;
    ui.comboText.alpha = Math.min(state.comboDisplayTimer / 20, 1);
  } else {
    ui.comboText.visible = false;
  }

  // Level
  ui.levelText.text = `Lv.${player.level}`;

  // Level up flash
  if (state.levelUpTextTimer > 0) {
    ui.levelUpFlash.visible = true;
    ui.levelUpFlash.alpha = Math.min(state.levelUpTextTimer / 20, 1);
    ui.levelUpFlash.scale.set(1 + (60 - state.levelUpTextTimer) * 0.005);
  } else {
    ui.levelUpFlash.visible = false;
  }

  // --- Weapon Slots ---
  const slotWidth = 90;
  const slotHeight = 50;

  for (let s = 0; s < 3; s++) {
    const slot = player.weaponSlots[s];
    const isActive = s === player.activeSlotIndex;
    const bg = ui.slotBgs[s];

    // Draw slot background
    bg.clear();
    // Background fill
    bg.beginFill(0x111111, 0.7);
    bg.drawRoundedRect(0, 0, slotWidth, slotHeight, 6);
    bg.endFill();

    // Active slot border (gold) vs inactive (gray)
    if (isActive) {
      bg.lineStyle(2, 0xFFD700, 1);
    } else {
      bg.lineStyle(1, 0x555555, 0.6);
    }
    bg.drawRoundedRect(0, 0, slotWidth, slotHeight, 6);

    // If weapon is complete, show subtle colored tint
    if (slot.weapon) {
      bg.beginFill(slot.weapon.color, 0.1);
      bg.drawRoundedRect(0, 0, slotWidth, slotHeight, 6);
      bg.endFill();
    }

    // Sub-slot circles
    for (let e = 0; e < 3; e++) {
      const g = ui.subSlotGraphics[s][e];
      g.clear();
      const el = slot.elements[e];
      if (el) {
        const color = parseInt(ELEMENT_COLORS[el].replace('#', ''), 16);
        g.beginFill(color, 0.9);
        g.drawCircle(0, 0, 9);
        g.endFill();
        g.lineStyle(1, 0xFFFFFF, 0.5);
        g.drawCircle(0, 0, 9);
      } else if (slot.weapon) {
        // Completed weapon - show weapon color in slots
        g.beginFill(slot.weapon.color, 0.4);
        g.drawCircle(0, 0, 9);
        g.endFill();
      } else {
        // Empty slot - gray outline
        g.lineStyle(1.5, 0x666666, 0.5);
        g.drawCircle(0, 0, 9);
        g.beginFill(0x333333, 0.2);
        g.drawCircle(0, 0, 9);
        g.endFill();
      }
    }

    // Weapon name text
    if (slot.weapon) {
      ui.weaponNameTexts[s].text = slot.weapon.name;
    } else {
      const filledCount = slot.elements.filter(Boolean).length;
      ui.weaponNameTexts[s].text = filledCount > 0 ? `${filledCount}/3` : '';
    }

    // Key hint color
    ui.slotKeyTexts[s].style.fill = isActive ? '#FFD700' : '#888888';
  }
}

// ─── Dev Panel ───
export interface DevPanel {
  container: PIXI.Container;
}

export function createDevPanel(
  parent: PIXI.Container,
  onElementClick: (element: ElementType) => void,
  onClear: () => void,
  onFillAll: () => void,
): DevPanel {
  const container = new PIXI.Container();

  // Panel background
  const panelW = 110;
  const btnH = 26;
  const gap = 4;
  const elements: ElementType[] = ALL_ELEMENTS;
  const totalBtns = elements.length + 2; // elements + CLEAR + FILL ALL
  const panelH = totalBtns * (btnH + gap) + gap + 24; // +24 for title

  const bg = new PIXI.Graphics();
  bg.beginFill(0x000000, 0.55);
  bg.drawRoundedRect(0, 0, panelW, panelH, 6);
  bg.endFill();
  container.addChild(bg);

  // Title
  const title = new PIXI.Text('DEV', new PIXI.TextStyle({
    fontFamily: 'Arial, sans-serif',
    fontSize: 11,
    fill: '#AAAAAA',
    fontWeight: 'bold',
  }));
  title.x = panelW / 2;
  title.y = 6;
  title.anchor.set(0.5, 0);
  container.addChild(title);

  let yOff = 22;

  // Element buttons
  for (const el of elements) {
    const color = parseInt(ELEMENT_COLORS[el].replace('#', ''), 16);
    const btn = new PIXI.Graphics();
    btn.beginFill(color, 0.7);
    btn.drawRoundedRect(0, 0, panelW - 12, btnH, 4);
    btn.endFill();
    btn.x = 6;
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => onElementClick(el));
    container.addChild(btn);

    const label = new PIXI.Text(el, new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#FFFFFF',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 2,
      dropShadowDistance: 1,
    }));
    label.anchor.set(0.5, 0.5);
    label.x = 6 + (panelW - 12) / 2;
    label.y = yOff + btnH / 2;
    container.addChild(label);

    yOff += btnH + gap;
  }

  // CLEAR button
  {
    const btn = new PIXI.Graphics();
    btn.beginFill(0x555555, 0.8);
    btn.drawRoundedRect(0, 0, panelW - 12, btnH, 4);
    btn.endFill();
    btn.x = 6;
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onClear);
    container.addChild(btn);
    const label = new PIXI.Text('초기화', new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif', fontSize: 12, fill: '#FFFFFF', fontWeight: 'bold',
      dropShadow: true, dropShadowColor: '#000000', dropShadowBlur: 2, dropShadowDistance: 1,
    }));
    label.anchor.set(0.5, 0.5);
    label.x = 6 + (panelW - 12) / 2;
    label.y = yOff + btnH / 2;
    container.addChild(label);
    yOff += btnH + gap;
  }

  // FILL ALL button
  {
    const btn = new PIXI.Graphics();
    btn.beginFill(0x4A90D9, 0.8);
    btn.drawRoundedRect(0, 0, panelW - 12, btnH, 4);
    btn.endFill();
    btn.x = 6;
    btn.y = yOff;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onFillAll);
    container.addChild(btn);
    const label = new PIXI.Text('FILL ALL', new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif', fontSize: 12, fill: '#FFFFFF', fontWeight: 'bold',
      dropShadow: true, dropShadowColor: '#000000', dropShadowBlur: 2, dropShadowDistance: 1,
    }));
    label.anchor.set(0.5, 0.5);
    label.x = 6 + (panelW - 12) / 2;
    label.y = yOff + btnH / 2;
    container.addChild(label);
  }

  // Position at top-right
  container.x = CANVAS_W - panelW - 8;
  container.y = 35;

  parent.addChild(container);
  return { container };
}

export interface GameOverOverlay {
  container: PIXI.Container;
}

export function createGameOverOverlay(parent: PIXI.Container): GameOverOverlay {
  const container = new PIXI.Container();
  container.visible = false;
  parent.addChild(container);
  return { container };
}

export function showGameOver(
  overlay: GameOverOverlay,
  state: GameState,
  onRestart: () => void
) {
  // Clear old children
  overlay.container.removeChildren();

  const bg = new PIXI.Graphics();
  bg.beginFill(0x000000, 0.8);
  bg.drawRect(0, 0, CANVAS_W, CANVAS_H);
  bg.endFill();

  const gameOverText = new PIXI.Text('GAME OVER', TEXT_STYLE(40, '#FF4444'));
  gameOverText.anchor.set(0.5, 0.5);
  gameOverText.x = CANVAS_W / 2;
  gameOverText.y = CANVAS_H / 2 - 100;

  const secs = Math.floor(state.frameCount / 60);
  const mins = Math.floor(secs / 60);
  const secStr = (secs % 60).toString().padStart(2, '0');

  // Count active weapons
  const weaponCount = state.player.weaponSlots.filter(s => s.weapon !== null).length;
  const weaponNames = state.player.weaponSlots
    .filter(s => s.weapon !== null)
    .map(s => s.weapon!.name)
    .join(', ');

  const statsText = new PIXI.Text(
    `킬 수: ${state.player.kills}\n점수: ${state.player.score}\nWave: ${state.wave}\n시간: ${mins}:${secStr}\n무기: ${weaponCount > 0 ? weaponNames : '없음'}`,
    TEXT_STYLE(18)
  );
  statsText.anchor.set(0.5, 0.5);
  statsText.x = CANVAS_W / 2;
  statsText.y = CANVAS_H / 2 + 10;

  const btnBg = new PIXI.Graphics();
  btnBg.beginFill(0x4A90D9);
  btnBg.drawRoundedRect(0, 0, 180, 50, 10);
  btnBg.endFill();
  btnBg.x = CANVAS_W / 2 - 90;
  btnBg.y = CANVAS_H / 2 + 100;
  btnBg.eventMode = 'static';
  btnBg.cursor = 'pointer';
  btnBg.on('pointerdown', onRestart);

  const btnText = new PIXI.Text('다시 시작', TEXT_STYLE(20));
  btnText.anchor.set(0.5, 0.5);
  btnText.x = CANVAS_W / 2;
  btnText.y = CANVAS_H / 2 + 125;

  overlay.container.addChild(bg, gameOverText, statsText, btnBg, btnText);
  overlay.container.visible = true;
}
