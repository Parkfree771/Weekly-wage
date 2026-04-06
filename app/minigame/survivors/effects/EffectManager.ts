import * as PIXI from 'pixi.js';
import { WaterEffect } from './WaterEffect';

/**
 * 이펙트 매니저 — 모든 속성 이펙트의 중앙 관리
 */
export class EffectManager {
  private effectLayer: PIXI.Container;
  private waterEffect: WaterEffect | null = null;

  constructor(effectLayer: PIXI.Container) {
    this.effectLayer = effectLayer;
  }

  startWater(x: number, y: number, radius: number) {
    if (!this.waterEffect) {
      this.waterEffect = new WaterEffect(this.effectLayer);
    }
    if (!this.waterEffect.active) {
      this.waterEffect.start(x, y, radius);
    }
  }

  updateWaterPosition(x: number, y: number) {
    if (this.waterEffect?.active) {
      this.waterEffect.setPosition(x, y);
    }
  }

  stopWater() {
    this.waterEffect?.stop();
  }

  update(dt: number) {
    if (this.waterEffect?.active) {
      this.waterEffect.update(dt);
    }
  }

  destroy() {
    this.waterEffect?.destroy();
    this.waterEffect = null;
  }
}
