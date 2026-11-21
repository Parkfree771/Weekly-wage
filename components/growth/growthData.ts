// 성장 시뮬 (연마 · 재련 · 마력 주입) — 데이터
// 출처: 2026-11-20 On-Air 방송 화면(docs/season3-onair-2026-11-20/img/06~08)과 방송 자막(같은 폴더 transcript.txt)
// [확정] = 방송에서 나온 값 / [예시] = 공식 수치 미공개라 임시로 넣은 값 (공개되면 이 파일만 교체)

import { SUCCESSION_BASE_PROBABILITY, JANGIN_ACCUMULATE_DIVIDER } from '@/lib/refiningData';

// 재련 재료 3종은 사이트에 있던 깨끗한 원본(webp), 나머지는 방송 캡쳐에서 잘라낸 것(png)
// 사이트가 png·webp 를 1년 고정 캐시(immutable)로 내보내서, 같은 이름으로 그림을 바꾸면 브라우저가 옛 그림을 계속 쓴다.
// 그림을 교체할 때마다 이 숫자를 올린다.
const ICON_VER = 4;
export const ICON = (name: string) => `/growth/${name}${name.startsWith("stone_") ? ".webp" : ".png"}?v=${ICON_VER}`;

// ---------- 공통 슬롯 ----------
export interface SlotDef {
  key: string;
  label: string;      // 슬롯 이름 (투구)
  itemName: string;   // 장비 이름 (운명의 투구)
  icon: string;
  group: string;      // 왼쪽 목록 묶음 제목
}

export const EQUIP_SLOTS: SlotDef[] = [
  { key: 'weapon', label: '무기', itemName: '운명의 한손검', icon: 'weapon', group: '무기' },
  { key: 'wangap', label: '완갑', itemName: '운명의 완갑', icon: 'wangap', group: '무기' },
  { key: 'helmet', label: '투구', itemName: '운명의 투구', icon: 'helmet', group: '방어구' },
  { key: 'shoulder', label: '견갑', itemName: '운명의 견갑', icon: 'shoulder', group: '방어구' },
  { key: 'chest', label: '상의', itemName: '운명의 상의', icon: 'chest', group: '방어구' },
  { key: 'belt', label: '허리띠', itemName: '운명의 허리띠', icon: 'belt', group: '방어구' },
  { key: 'pants', label: '하의', itemName: '운명의 하의', icon: 'pants', group: '방어구' },
  { key: 'gloves', label: '장갑', itemName: '운명의 장갑', icon: 'gloves', group: '방어구' },
];

export const ACC_SLOTS: SlotDef[] = [
  { key: 'necklace', label: '목걸이', itemName: '운명의 목걸이', icon: 'necklace', group: '장신구' },
  { key: 'earring1', label: '귀걸이', itemName: '운명의 귀걸이', icon: 'earring', group: '장신구' },
  { key: 'earring2', label: '귀걸이', itemName: '운명의 귀걸이', icon: 'earring', group: '장신구' },
  { key: 'ring1', label: '반지', itemName: '운명의 반지', icon: 'ring', group: '장신구' },
  { key: 'ring2', label: '반지', itemName: '운명의 반지', icon: 'ring', group: '장신구' },
];

export const INFUSE_SLOTS: SlotDef[] = [
  { key: 'relic', label: '성물 슬롯', itemName: '성물 슬롯', icon: 'relic', group: '보구' },
  { key: 'seal', label: '인장 슬롯', itemName: '인장 슬롯', icon: 'seal', group: '보구' },
  { key: 'necklace', label: '목걸이 슬롯', itemName: '목걸이 슬롯', icon: 'necklace', group: '장신구' },
  { key: 'earring1', label: '귀걸이 슬롯', itemName: '귀걸이 슬롯', icon: 'earring', group: '장신구' },
  { key: 'earring2', label: '귀걸이 슬롯', itemName: '귀걸이 슬롯', icon: 'earring', group: '장신구' },
  { key: 'ring1', label: '반지 슬롯', itemName: '반지 슬롯', icon: 'ring', group: '장신구' },
  { key: 'ring2', label: '반지 슬롯', itemName: '반지 슬롯', icon: 'ring', group: '장신구' },
  { key: 'bracelet', label: '팔찌 슬롯', itemName: '팔찌 슬롯', icon: 'bracelet', group: '장신구' },
];

// ---------- 연마 ----------
// [확정] 등급 고급~고대, 연마 0~5회, 회당 +5. 이관표(img/10)와 화면 예시(고대 4→5단계 1820→1825)가 이 식으로 맞는다.
export const GRADES = ['고급', '희귀', '영웅', '전설', '유물', '고대'] as const;
export const GRADE_COLORS = ['#7fb0ff', '#58a6ff', '#c07cff', '#ffb43a', '#ff7a3d', '#e6d3a3'];
export const MAX_POLISH = 5;
export const itemLevelOf = (grade: number, polish: number) => 1675 + grade * 25 + polish * 5;

// [예시] 화면의 4→5단계 값(연마 10,000골드, 재료 장비 1개)을 전 단계에 그대로 씀
export const POLISH_GOLD = 10000;
export const POLISH_MAT_COUNT = 1;
// [예시] 효과 변환: 재료 1개 + 500골드 (화면 값)
export const CONVERT_GOLD = 500;
export const CONVERT_MAT_COUNT = 1;
// [확정] 번뜩임이 뜬 줄은 그때부터 옵션 수치가 항상 최고값만 나온다 (방송 0:56)
// [예시] 번뜩임이 뜰 확률 — 방송에서는 "상당히 낮은 확률"이라고만 함
export const FLASH_CHANCE = 0.05;

export interface PolishOptionDef { name: string; min: number; max: number; pct?: boolean; }
// [예시] 옵션 풀 — 화면에 나온 4종 + 전투 특성
export const POLISH_OPTION_POOL: PolishOptionDef[] = [
  { name: '힘 / 민첩 / 지능', min: 4000, max: 20000 },
  { name: '최대 생명력', min: 100, max: 800 },
  { name: '극대화', min: 15, max: 120 },
  { name: '무력화 피해', min: 0.05, max: 0.5, pct: true },
  { name: '치명', min: 15, max: 120 },
  { name: '특화', min: 15, max: 120 },
  { name: '신속', min: 15, max: 120 },
];
// 화면 예시 그대로의 첫 옵션 4줄
export const POLISH_DEFAULT_OPTIONS = [
  { name: '힘 / 민첩 / 지능', value: 15600 },
  { name: '최대 생명력', value: 500 },
  { name: '극대화', value: 75 },
  { name: '무력화 피해', value: 0.33 },
  { name: '치명', value: 60 },
];

// ---------- 슬롯 재련 ----------
// [확정] 실패 마일리지를 없애고 처음부터 가득 찬 상태로 시작한다 (방송 1:02)
//        "25강은 지금 0.5%에서 시작해 10번 실패하면 1%까지 오르는데, 이제는 처음부터 1%"
//        → 성공률 = 현재 계승 후 기본 확률 × 2, 실패해도 더 오르지 않는다. 장인의 기운은 그대로 있다.
// [주의] 방송 화면(img/07)의 11→12단계는 5.00%로 찍혀 있어 이 규칙(10%)과 다르다. 화면은 개발 중 빌드라
//        말로 밝힌 규칙을 따랐다. 공식 확률표가 나오면 REFINE_PROB 를 그 값으로 바꿀 것.
export const REFINE_MIN = 11;
export const REFINE_MAX = 25;
export const refineBaseProb = (stage: number) => (SUCCESSION_BASE_PROBABILITY[stage] ?? 0) * 2;
export { JANGIN_ACCUMULATE_DIVIDER };
// [예시] 1회 비용 — 화면 값(재료 118 / 7, 실링 22,567, 골드 1,565)을 전 단계에 씀
export const REFINE_COST = { blue: 118, orange: 7, silver: 22567, gold: 1565 };
// [예시] 보조 재료(위대한 바늘) 20개 사용 시 기본 확률만큼 추가
export const NEEDLE_COUNT = 20;
export const NEEDLE_BONUS_RATE = 1;

// ---------- 마력 주입 ----------
// [확정] 위상 1~7, 포화도 게이지 10000, 옵션 3줄, 변성 시도 3회
export const MAX_PHASE = 7;
export const SATURATION_MAX = 10000;
export const INFUSE_LINES = 3;
export const TRANSMUTE_TRIES = 3;
// [예시] 비용 — 화면 값(주입 재료 10개 + 3,000골드, 변성 제어기 1개 + 750골드)
export const INFUSE_GOLD = 3000;
export const INFUSE_MAT_COUNT = 10;
export const TRANSMUTE_GOLD = 750;
export const TRANSMUTE_MAT_COUNT = 1;
// [예시] 주입 1회당 포화도 증가 범위
export const SATURATION_GAIN: [number, number] = [150, 450];
// [확정] 가끔 게이지를 다 채우지 않아도 다음 위상으로 넘어간다 (방송 1:06) / [예시] 그 확률
export const PHASE_LUCKY_CHANCE = 0.02;
// [예시] 위상 1단계당 저장 옵션 수치 +10%
export const PHASE_BONUS = 0.1;

export const OPTION_GRADES = ['하급', '중급', '상급', '최상급'] as const;
export const OPTION_GRADE_COLORS = ['#7ddc6a', '#4aa8ff', '#c46bff', '#ff6a3d'];
// [예시] 등급별 출현 확률
export const OPTION_GRADE_WEIGHTS = [0.45, 0.32, 0.18, 0.05];
// [예시] 등급별 전투력 기여
export const OPTION_GRADE_POWER = [6, 14, 26, 42];

export interface InfuseOptionDef { name: string; values: [number, number, number, number]; pct?: boolean; }
// 화면 예시: 최대 마나 +25(최상급), 스킬 위력 +0.24%(중급), 기본 공격력 +1850(상급). 나머지 등급 값은 [예시]
export const INFUSE_OPTION_POOL: InfuseOptionDef[] = [
  { name: '최대 마나', values: [6, 12, 18, 25] },
  { name: '스킬 위력', values: [0.08, 0.24, 0.4, 0.56], pct: true },
  { name: '기본 공격력', values: [600, 1200, 1850, 2600] },
  { name: '무기 공격력', values: [300, 600, 950, 1350] },
  { name: '최대 생명력', values: [1000, 2000, 3200, 4500] },
  { name: '공격력', values: [0.1, 0.2, 0.35, 0.5], pct: true },
];

// 시작 상태 — 전 칸 제 1위상 · 포화도 0 (전투력 기본값만 칸마다 다른 예시)
export const INFUSE_START: Record<string, { phase: number; saturation: number; basePower: number }> = {
  relic: { phase: 1, saturation: 0, basePower: 7571.04 },
  seal: { phase: 1, saturation: 0, basePower: 7480.2 },
  necklace: { phase: 1, saturation: 0, basePower: 7322.6 },
  earring1: { phase: 1, saturation: 0, basePower: 7210.15 },
  earring2: { phase: 1, saturation: 0, basePower: 7105.4 },
  ring1: { phase: 1, saturation: 0, basePower: 7198.3 },
  ring2: { phase: 1, saturation: 0, basePower: 7090.75 },
  bracelet: { phase: 1, saturation: 0, basePower: 7655.9 },
};
