import { Character, WeeklyGoldRecord } from '@/types/user';
import type { DailyContentState } from '@/types/user';

// 데모 캐릭터 데이터 (구아바밤바아 + 전문가디언)
export const DEMO_CHARACTERS: Character[] = [
  {
    name: '구아바밤바아',
    server: '카제로스',
    class: '워로드',
    itemLevel: 1769,
    combatLevel: 70,
    imageUrl: 'https://img.lostark.co.kr/armory/9/97D4A07925BD7DA2DE6275BDFA389835856261111A22ED418EFF4AAA5DA3CD8B.jpg',
    lastUpdated: new Date().toISOString(),
  },
  {
    name: '전문가디언',
    server: '카제로스',
    class: '소울이터',
    itemLevel: 1716,
    combatLevel: 70,
    imageUrl: 'https://img.lostark.co.kr/armory/6/75AE419B3BF4F28B5AF70BFE416B3E02BC92F05B86582D19C95B5E7BD700AD1D.jpg',
    lastUpdated: new Date().toISOString(),
  },
];

// 데모 주간 체크리스트 (일부 레이드 체크된 상태)
export const DEMO_WEEKLY_CHECKLIST: Record<string, any> = {
  '구아바밤바아': {
    raids: {
      '성당 3단계': [true, true],
      '세르카 나메': [true, true],
      '종막 하드': [true, true],
    },
    additionalGold: 0,
    sandOfTime: true,
    sandOfTimeLevel: 3,
    paradise: false,
    chaosDungeon: { checks: [1, 1, 0, 0, 0, 0, 0] } as DailyContentState,
    guardianRaid: { checks: [1, 0, 0, 0, 0, 0, 0] } as DailyContentState,
    raidGoldReceive: {
      '성당 3단계': true,
      '세르카 나메': true,
      '종막 하드': true,
    },
    raidMoreGoldExclude: {
      '성당 3단계': true,
      '세르카 나메': true,
      '종막 하드': true,
    },
  },
  '전문가디언': {
    raids: {
      '세르카 노말': [true, true],
      '종막 노말': [true, true],
      '4막 노말': [true, false],
    },
    additionalGold: 0,
    sandOfTime: false,
    sandOfTimeLevel: 0,
    paradise: false,
    chaosDungeon: { checks: [1, 0, 0, 0, 0, 0, 0] } as DailyContentState,
    guardianRaid: { checks: [0, 0, 0, 0, 0, 0, 0] } as DailyContentState,
    raidGoldReceive: {
      '세르카 노말': true,
      '종막 노말': true,
      '4막 노말': true,
    },
    raidMoreGoldExclude: {},
  },
};

// 데모 골드 히스토리 (최근 4주)
export const DEMO_GOLD_HISTORY: WeeklyGoldRecord[] = [
  {
    weekStart: '2026-03-04',
    weekLabel: '3월 1주차',
    totalGold: 185000,
    raidGold: 185000,
    additionalGold: 0,
    commonGold: 5000,
    characterCount: 2,
  },
  {
    weekStart: '2026-03-11',
    weekLabel: '3월 2주차',
    totalGold: 192000,
    raidGold: 192000,
    additionalGold: 0,
    commonGold: 5000,
    characterCount: 2,
  },
  {
    weekStart: '2026-03-18',
    weekLabel: '3월 3주차',
    totalGold: 188000,
    raidGold: 188000,
    additionalGold: 0,
    commonGold: 5000,
    characterCount: 2,
  },
];

// 데모 공통 컨텐츠 상태
export const DEMO_COMMON_CONTENT = {
  date: new Date().toISOString().slice(0, 10),
  checks: {} as Record<string, boolean>,
};

// 데모 대표 캐릭터
export const DEMO_MAIN_CHARACTER = '구아바밤바아';
