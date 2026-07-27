// 더보기 보상 재료 — 수치 원본은 data/rewardTable.ts (단일 원본 테이블).
// 재료 상수(MATERIAL_*)도 rewardTable 에 살고, 기존 소비처 호환을 위해 여기서 재수출한다.
// 벨가르딘처럼 더보기 재련 재료가 미공개인 레이드(moreDataIncomplete)는 목록에서 제외 —
// 더보기 효율 페이지가 '보상 미정'으로 표시하는 근거가 된다.
import { RAID_TABLE } from './rewardTable';

export {
  MATERIAL_IDS,
  MATERIAL_NAMES,
  MATERIAL_BUNDLE_SIZES,
  type MaterialReward,
} from './rewardTable';

export type RaidReward = {
  raidName: string;
  gate: number;
  materials: import('./rewardTable').MaterialReward[];
};

export const raidRewards: RaidReward[] = RAID_TABLE
  .filter((entry) => !entry.moreDataIncomplete)
  .flatMap((entry) =>
    entry.gates.map((g) => ({
      raidName: entry.name,
      gate: g.gate,
      materials: g.more,
    }))
  );
