// 완갑 실제 시뮬(WangapSimulator) · 평균 시뮬(WangapAverageCalculator) 공용
// 재료 목록 / 비용 행 / 보조재료 최적화 상태 타입·헬퍼

import { WANGAP_PROMOTION_MATERIALS, type WangapOptMatKey } from '../../lib/wangapData';

export type OptMatKey = WangapOptMatKey;

export const OPT_MATERIAL_LIST: Array<{ key: OptMatKey; label: string; icon: string }> = [
  { key: '파괴석결정', label: '파괴석 결정', icon: '/top-destiny-destruction-stone5.webp' },
  { key: '수호석결정', label: '수호석 결정', icon: '/top-destiny-guardian-stone5.webp' },
  { key: '위대한돌파석', label: '위대한 돌파석', icon: '/top-destiny-breakthrough-stone5.webp' },
  { key: '상급아비도스', label: '상급 아비도스', icon: '/top-abidos-fusion5.webp' },
  { key: '운명파편', label: '운명의 파편', icon: '/destiny-shard-bag-large5.webp' },
  { key: '용암', label: '용암의 숨결', icon: '/breath-lava5.webp' },
  { key: '빙하', label: '빙하의 숨결', icon: '/breath-glacier5.webp' },
];

export type OptMaterials = Record<OptMatKey, { bound: boolean; owned: number }>;
export type OptDraft = Record<OptMatKey, { bound: boolean; owned: string }>;

export const createOptMaterials = (bound: boolean): OptMaterials =>
  Object.fromEntries(OPT_MATERIAL_LIST.map(m => [m.key, { bound, owned: 0 }])) as OptMaterials;

export const createOptDraft = (materials: OptMaterials): OptDraft =>
  Object.fromEntries(OPT_MATERIAL_LIST.map(m => {
    const s = materials[m.key];
    return [m.key, { bound: s.bound, owned: s.owned > 0 ? String(s.owned) : '' }];
  })) as OptDraft;

export const remainingFromMaterials = (materials: OptMaterials): Record<OptMatKey, number> =>
  Object.fromEntries(OPT_MATERIAL_LIST.map(m => [m.key, materials[m.key].owned])) as Record<OptMatKey, number>;

export const createZeroCounts = (): Record<OptMatKey, number> =>
  Object.fromEntries(OPT_MATERIAL_LIST.map(m => [m.key, 0])) as Record<OptMatKey, number>;

// 시세가 있는 재료 키 (골드 환산 대상 — 최적화 대상과 동일한 7종)
export const PRICED_COST_KEYS = OPT_MATERIAL_LIST.map(m => m.key);

// 누적/예상 비용의 전체 키 (시세 7종 + 실링·골드 + 승급 재료 2종)
export type WangapCostKey = OptMatKey | '실링' | '골드' | '승급재료유물' | '승급재료고대';
export type WangapCostTotals = Record<WangapCostKey, number>;

export const createZeroCost = (): WangapCostTotals => ({
  파괴석결정: 0, 수호석결정: 0, 위대한돌파석: 0, 상급아비도스: 0,
  운명파편: 0, 실링: 0, 골드: 0, 용암: 0, 빙하: 0, 승급재료유물: 0, 승급재료고대: 0,
});

// 비용 표시 행: 시세 있는 7종(OPT_MATERIAL_LIST 재사용) + 시세 없는 3종
export const COST_ROWS: Array<{ key: WangapCostKey; label: string; icon: string; priced: boolean }> = [
  ...OPT_MATERIAL_LIST.map(m => ({ key: m.key as WangapCostKey, label: m.label, icon: m.icon, priced: true })),
  { key: '승급재료유물', label: WANGAP_PROMOTION_MATERIALS.유물.name, icon: WANGAP_PROMOTION_MATERIALS.유물.icon, priced: false },
  { key: '승급재료고대', label: WANGAP_PROMOTION_MATERIALS.고대.name, icon: WANGAP_PROMOTION_MATERIALS.고대.icon, priced: false },
  { key: '실링', label: '실링', icon: '/shilling.webp', priced: false },
];
