export type MaterialReward = {
  itemId: number;
  itemName: string;
  amount: number;
};

export type RaidReward = {
  raidName: string;
  gate: number;
  materials: MaterialReward[];
};

// 실제 Lost Ark API에서 확인된 item IDs
export const MATERIAL_IDS = {
  FATE_GUARDIAN_STONE: 66102106, // 운명의 수호석 (Bundle: 100)
  FATE_DESTRUCTION_STONE: 66102006, // 운명의 파괴석 (Bundle: 100)
  FATE_FRAGMENT: 66130143, // 운명의 파편 주머니(대) (Bundle: 1) - 3000 파편
  FATE_BREAKTHROUGH_STONE: 66110225, // 운명의 돌파석 (Bundle: 1)
};

export const MATERIAL_NAMES = {
  FATE_GUARDIAN_STONE: '운명의 수호석',
  FATE_DESTRUCTION_STONE: '운명의 파괴석',
  FATE_FRAGMENT: '운명의 파편', // UI에서는 파편으로 표시
  FATE_BREAKTHROUGH_STONE: '운명의 돌파석',
};

// 묶음 단위 - 개당 가격 계산을 위한 나눗수
export const MATERIAL_BUNDLE_SIZES = {
  [MATERIAL_IDS.FATE_GUARDIAN_STONE]: 100, // 수호석 100개 묶음
  [MATERIAL_IDS.FATE_DESTRUCTION_STONE]: 100, // 파괴석 100개 묶음
  [MATERIAL_IDS.FATE_FRAGMENT]: 3000, // 파편 3000개 묶음
  [MATERIAL_IDS.FATE_BREAKTHROUGH_STONE]: 1, // 돌파석 1개 단위
};

export const raidRewards: RaidReward[] = [
  // 종막 하드
  {
    raidName: '종막 하드',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 4400 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 2200 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 17500 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 70 },
    ]
  },
  {
    raidName: '종막 하드',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 7600 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 3800 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 29800 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 120 },
    ]
  },
  // 종막 노말
  {
    raidName: '종막 노말',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 3220 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 1610 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 13650 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 50 },
    ]
  },
  {
    raidName: '종막 노말',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 5520 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 2760 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 23200 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 90 },
    ]
  },
  // 4막 하드
  {
    raidName: '4막 하드',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 3360 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 1680 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 14250 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 53 },
    ]
  },
  {
    raidName: '4막 하드',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 5760 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 2880 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 24200 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 94 },
    ]
  },
  // 4막 노말
  {
    raidName: '4막 노말',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 2800 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 1400 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 11880 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 44 },
    ]
  },
  {
    raidName: '4막 노말',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 4800 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 2400 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 20160 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 78 },
    ]
  },
  // 3막 하드
  {
    raidName: '3막 하드',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1660 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 830 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 7000 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 31 },
    ]
  },
  {
    raidName: '3막 하드',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 2280 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 1140 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 9900 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 36 },
    ]
  },
  {
    raidName: '3막 하드',
    gate: 3,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 4160 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 2080 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 16800 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 64 },
    ]
  },
  // 3막 노말
  {
    raidName: '3막 노말',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1000 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 500 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 4800 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 18 },
    ]
  },
  {
    raidName: '3막 노말',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1240 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 620 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 5600 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 20 },
    ]
  },
  {
    raidName: '3막 노말',
    gate: 3,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1680 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 840 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 7400 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 26 },
    ]
  },
  // 2막 하드
  {
    raidName: '2막 하드',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1900 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 850 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 8000 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 32 },
    ]
  },
  {
    raidName: '2막 하드',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 2800 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 1400 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 14000 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 48 },
    ]
  },
  // 2막 노말
  {
    raidName: '2막 노말',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1380 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 690 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 5980 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 16 },
    ]
  },
  {
    raidName: '2막 노말',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1820 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 910 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 9070 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 26 },
    ]
  },
  // 1막 하드
  {
    raidName: '1막 하드',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1520 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 760 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 6670 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 25 },
    ]
  },
  {
    raidName: '1막 하드',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 2060 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 1030 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 9820 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 34 },
    ]
  },
  // 1막 노말
  {
    raidName: '1막 노말',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 840 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 420 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 3790 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 10 },
    ]
  },
  {
    raidName: '1막 노말',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 1220 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 610 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 6020 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 19 },
    ]
  },
  // 베히모스
  {
    raidName: '베히모스',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 600 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 300 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 2050 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 8 },
    ]
  },
  {
    raidName: '베히모스',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 940 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 470 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 3120 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 11 },
    ]
  },
  // 서막 (에키드나 하드)
  {
    raidName: '서막',
    gate: 1,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 600 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 300 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 2050 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 8 },
    ]
  },
  {
    raidName: '서막',
    gate: 2,
    materials: [
      { itemId: MATERIAL_IDS.FATE_GUARDIAN_STONE, itemName: MATERIAL_NAMES.FATE_GUARDIAN_STONE, amount: 940 },
      { itemId: MATERIAL_IDS.FATE_DESTRUCTION_STONE, itemName: MATERIAL_NAMES.FATE_DESTRUCTION_STONE, amount: 470 },
      { itemId: MATERIAL_IDS.FATE_FRAGMENT, itemName: MATERIAL_NAMES.FATE_FRAGMENT, amount: 3120 },
      { itemId: MATERIAL_IDS.FATE_BREAKTHROUGH_STONE, itemName: MATERIAL_NAMES.FATE_BREAKTHROUGH_STONE, amount: 11 },
    ]
  },
];