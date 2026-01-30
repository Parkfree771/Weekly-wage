// 사용자 데이터 타입 정의
import { raids } from '@/data/raids';

// 캐릭터 정보
export type Character = {
  name: string;
  server: string;
  class: string;
  itemLevel: number;
  combatLevel?: number;
  imageUrl: string;
  lastUpdated: string;
};

// 레이드 체크 상태
export type RaidCheckState = {
  [raidName: string]: boolean[];  // 관문별 체크 상태
};

// 레이드별 더보기 비용 제외 설정
export type RaidMoreGoldExclude = {
  [raidName: string]: boolean;  // true = 더보기 비용 제외, false = 더보기 비용 포함
};

// 캐릭터별 주간 체크리스트
export type CharacterWeeklyState = {
  raids: RaidCheckState;
  additionalGold: number;  // 추가 골드 수익
  paradise?: boolean;      // 낙원
  sandOfTime?: boolean;    // 할의 모래시계
  excludeMoreGold?: boolean; // 전체 더보기 비용 골드 제외 (기본 true) - deprecated
  raidMoreGoldExclude?: RaidMoreGoldExclude; // 레이드별 더보기 비용 제외 설정
};

// 전체 주간 체크리스트
export type WeeklyChecklist = {
  [characterName: string]: CharacterWeeklyState;
};

// 동의 항목
export type ConsentItem = {
  agreed: boolean;
  agreedAt: any;  // Firestore Timestamp
};

// 동의 내역
export type UserConsents = {
  privacyPolicy: ConsentItem;      // 개인정보 처리방침
  emailCollection: ConsentItem;    // 이메일 수집
  profileCollection: ConsentItem;  // 프로필(사진) 수집
  characterData: ConsentItem;      // 캐릭터 데이터 수집
};

// 사용자 프로필
export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // 동의 내역
  consents?: UserConsents;
  // 로스트아크 계정 정보
  mainCharacter?: string;  // 대표 캐릭터 이름
  characters: Character[];  // 선택된 캐릭터 (최대 6개)
  allCharacters?: Character[];  // 전체 원정대 캐릭터 목록
  // 주간 체크리스트
  weeklyChecklist: WeeklyChecklist;
  // UI 설정
  uiSettings?: {
    priceOrder?: string[];
    chartItems?: string[];
    theme?: 'light' | 'dark';
  };
  // 메타 정보
  createdAt?: any;
  lastLoginAt?: any;
};

// 레이드 그룹 이미지 매핑
export const raidGroupImages: { [key: string]: string } = {
  '세르카': '/cerka2.webp',
  '종막': '/abrelshud.webp',
  '4막': '/illiakan.webp',
  '3막': '/ivory-tower.webp',
  '2막': '/kazeros.webp',
  '1막': '/aegir.webp',
  '서막': '/echidna.webp',
  '베히모스': '/behemoth.webp'
};

// 레이드 그룹명 추출
export function getRaidGroupName(raidName: string): string {
  return raidName.split(' ')[0];
}

// 캐릭터 레벨에 맞는 레이드 필터링
export function getRaidsForLevel(itemLevel: number) {
  return raids.filter(raid => itemLevel >= raid.level);
}

// 캐릭터 레벨에 맞는 상위 3개 레이드 그룹 선택 (그룹당 가장 높은 난이도)
export function getTop3RaidGroups(itemLevel: number) {
  const availableRaids = getRaidsForLevel(itemLevel)
    .sort((a, b) => b.level - a.level); // 레벨 높은 순 정렬

  const selectedGroups: string[] = [];
  const selectedRaids: typeof raids = [];

  for (const raid of availableRaids) {
    const groupName = getRaidGroupName(raid.name);

    // 이미 선택된 그룹이면 건너뛰기
    if (selectedGroups.includes(groupName)) {
      continue;
    }

    // 최대 3개 그룹까지만
    if (selectedGroups.length >= 3) {
      break;
    }

    selectedGroups.push(groupName);
    selectedRaids.push(raid);
  }

  return selectedRaids;
}

// 특정 그룹의 모든 레이드 가져오기 (난이도 선택용)
export function getRaidsInGroup(groupName: string, itemLevel: number) {
  return raids
    .filter(raid => getRaidGroupName(raid.name) === groupName && itemLevel >= raid.level)
    .sort((a, b) => b.level - a.level);
}

// 빈 주간 체크리스트 생성
export function createEmptyWeeklyState(itemLevel: number): CharacterWeeklyState {
  const availableRaids = getRaidsForLevel(itemLevel);
  const raidState: RaidCheckState = {};

  availableRaids.forEach(raid => {
    raidState[raid.name] = new Array(raid.gates.length).fill(false);
  });

  return {
    raids: raidState,
    additionalGold: 0,
  };
}
