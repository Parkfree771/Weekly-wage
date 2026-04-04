/* ── SIGNAL 레벨 설정 ── */

import { LevelConfig, CANVAS_SIZE } from './types';

const C = CANVAS_SIZE / 2; // 360

export const LEVELS: LevelConfig[] = [
  // 레벨 1: 교차로 1개 (중앙), 1차선 — 튜토리얼
  {
    level: 1,
    intersections: [{ x: C, y: C, lanes: 1 }],
    roads: [],
    spawnInterval: 90,
    hasAmbulance: false,
    hasTruck: false,
    passToNext: 15,
  },
  // 레벨 2: 교차로 2개 (좌우), 1차선
  {
    level: 2,
    intersections: [
      { x: 260, y: C, lanes: 1 },
      { x: 460, y: C, lanes: 1 },
    ],
    roads: [{ from: 0, to: 1 }],
    spawnInterval: 75,
    hasAmbulance: false,
    hasTruck: false,
    passToNext: 25,
  },
  // 레벨 3: 교차로 3개 (L자 배치), 1차선
  {
    level: 3,
    intersections: [
      { x: 240, y: 240, lanes: 1 },
      { x: 240, y: 480, lanes: 1 },
      { x: 480, y: 480, lanes: 1 },
    ],
    roads: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
    spawnInterval: 65,
    hasAmbulance: false,
    hasTruck: false,
    passToNext: 35,
  },
  // 레벨 4: 교차로 4개 (2×2 격자), 1차선
  {
    level: 4,
    intersections: [
      { x: 240, y: 240, lanes: 1 },
      { x: 480, y: 240, lanes: 1 },
      { x: 240, y: 480, lanes: 1 },
      { x: 480, y: 480, lanes: 1 },
    ],
    roads: [
      { from: 0, to: 1 },
      { from: 2, to: 3 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
    ],
    spawnInterval: 55,
    hasAmbulance: true,
    hasTruck: false,
    passToNext: 50,
  },
  // 레벨 5: 교차로 4개 (2×2 격자), 전부 2차선
  {
    level: 5,
    intersections: [
      { x: 240, y: 240, lanes: 2 },
      { x: 480, y: 240, lanes: 2 },
      { x: 240, y: 480, lanes: 2 },
      { x: 480, y: 480, lanes: 2 },
    ],
    roads: [
      { from: 0, to: 1 },
      { from: 2, to: 3 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
    ],
    spawnInterval: 45,
    hasAmbulance: true,
    hasTruck: true,
    passToNext: Infinity,
  },
];
