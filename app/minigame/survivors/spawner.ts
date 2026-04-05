import { GameState, EnemyType } from './types';
import { spawnEnemy } from './entities';

export function getMaxEnemies(wave: number): number {
  // 웨이브 1: 80, 웨이브 5: 200, 웨이브 10: 400+
  return Math.min(80 + wave * 30, 500);
}

function getSpawnInterval(wave: number): number {
  // 스폰 간격: 빠르게 (웨이브 올라갈수록 거의 매 프레임)
  return Math.max(3, 30 - wave * 3);
}

function getEnemyTypes(wave: number): EnemyType[] {
  if (wave <= 2) return ['normal'];
  if (wave <= 4) return ['normal', 'bike'];
  return ['normal', 'bike', 'truck'];
}

function pickEnemyType(wave: number): EnemyType {
  const types = getEnemyTypes(wave);
  if (types.length === 1) return 'normal';
  if (types.length === 2) {
    return Math.random() < 0.5 ? 'normal' : 'bike';
  }
  const r = Math.random();
  if (r < 0.4) return 'normal';
  if (r < 0.7) return 'bike';
  return 'truck';
}

export function spawnWaveEnemies(state: GameState) {
  const { wave, frameCount, player, enemies } = state;
  const interval = getSpawnInterval(wave);
  if (frameCount % interval !== 0) return;

  const activeCount = enemies.filter(e => e.active).length;
  const max = getMaxEnemies(wave);
  if (activeCount >= max) return;

  // 한 번에 여러 마리 스폰 (웨이브 올라갈수록 더 많이)
  const batchSize = Math.min(2 + Math.floor(wave / 2), 8);
  for (let i = 0; i < batchSize; i++) {
    if (enemies.filter(e => e.active).length >= max) break;
    const type = pickEnemyType(wave);
    spawnEnemy(enemies, type, player.x, player.y, state.cameraX, state.cameraY);
  }
}
