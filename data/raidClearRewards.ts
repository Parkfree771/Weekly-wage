import { RAID_TABLE } from './rewardTable';
import { RaidReward } from './raidRewards';

/**
 * 레이드 기본 클리어 보상 (더보기와 무관하게 항상 획득하는 재료)
 * 수치 원본은 data/rewardTable.ts (단일 원본 테이블) — 수정은 거기서만 한다.
 */
export const raidClearRewards: RaidReward[] = RAID_TABLE.flatMap((entry) =>
  entry.gates.map((g) => ({
    raidName: entry.name,
    gate: g.gate,
    materials: g.clear,
  }))
);
