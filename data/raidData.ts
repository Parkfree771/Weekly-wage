export type RaidReward = {
  name: string;
  id: string;
  quantity: number;
  bundleCount: number;
};

export type RaidGate = {
  gate: number;
  rewards: RaidReward[];
};

export type RaidInfo = {
  id: string;
  raidName: string;
  gates: RaidGate[];
};

export const RAID_DATA: { [key: string]: RaidInfo } = {
  jongmak_hard: {
    id: 'jongmak_hard',
    raidName: '종막 하드',
    gates: [
      {
        gate: 1,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 4400, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 2200, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 17500, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 70, bundleCount: 1 },
        ],
      },
      {
        gate: 2,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 7600, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 3800, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 29800, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 120, bundleCount: 1 },
        ],
      },
    ],
  },
  jongmak_normal: {
    id: 'jongmak_normal',
    raidName: '종막 노말',
    gates: [
      {
        gate: 1,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 3200, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 1600, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 12800, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 50, bundleCount: 1 },
        ],
      },
      {
        gate: 2,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 5600, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 2800, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 22400, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 90, bundleCount: 1 },
        ],
      },
    ],
  },
  '4mak_hard': {
    id: '4mak_hard',
    raidName: '4막 하드',
    gates: [
      {
        gate: 1,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 3600, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 1800, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 14400, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 60, bundleCount: 1 },
        ],
      },
      {
        gate: 2,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 6000, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 3000, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 24000, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 100, bundleCount: 1 },
        ],
      },
    ],
  },
  '4mak_normal': {
    id: '4mak_normal',
    raidName: '4막 노말',
    gates: [
      {
        gate: 1,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 2800, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 1400, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 11200, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 40, bundleCount: 1 },
        ],
      },
      {
        gate: 2,
        rewards: [
          { name: '운명의 수호석', id: '66102106', quantity: 4400, bundleCount: 100 },
          { name: '운명의 파괴석', id: '66102006', quantity: 2200, bundleCount: 100 },
          { name: '운명의 파편', id: '66130143', quantity: 17600, bundleCount: 3000 },
          { name: '운명의 돌파석', id: '66110225', quantity: 70, bundleCount: 1 },
        ],
      },
    ],
  },
};