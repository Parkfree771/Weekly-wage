// 사용자 데이터 타입 정의
import { raids } from '@/data/raids';

// 주간 골드 기록
export type WeeklyGoldRecord = {
  weekStart: string;      // "2026-02-05" (수요일 시작)
  weekLabel: string;      // "2월 1주차"
  totalGold: number;      // 총 골드
  raidGold: number;       // 레이드 골드
  additionalGold: number; // 추가 골드
  characterCount: number; // 캐릭터 수
};

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
  lastWeeklyReset?: string;  // 마지막 주간 초기화 시간 (ISO string)
  // 주간 골드 기록 (차트용)
  weeklyGoldHistory?: WeeklyGoldRecord[];
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

// 이번 주 수요일 06:00 KST 시간 가져오기
export function getThisWeekWednesday6AM(): Date {
  const now = new Date();
  // KST 기준 현재 시간
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  // 현재 KST 요일 (0=일, 3=수)
  const kstDay = kstNow.getUTCDay();

  // 이번 주 수요일까지 남은 일수 계산
  let daysToWednesday = 3 - kstDay;
  if (daysToWednesday < 0) {
    // 이미 수요일이 지났으면 이번 주 수요일은 과거
    daysToWednesday += 7;
  }

  // 이번 주 수요일 00:00 KST
  const wednesday = new Date(kstNow);
  wednesday.setUTCDate(wednesday.getUTCDate() + daysToWednesday);
  wednesday.setUTCHours(6, 0, 0, 0); // 06:00 KST (UTC 기준으로 설정했으므로)

  // 만약 오늘이 수요일이고 06시 이전이면, 지난 수요일이 아니라 오늘 06시
  // 만약 오늘이 수요일이고 06시 이후면, 오늘 06시가 이번 주 초기화 시점
  if (kstDay === 3) {
    const kstHour = kstNow.getUTCHours();
    if (kstHour >= 6) {
      // 오늘 수요일 06시가 초기화 시점
      wednesday.setUTCDate(kstNow.getUTCDate());
    } else {
      // 아직 06시 전이면 지난주 수요일이 마지막 초기화
      wednesday.setUTCDate(kstNow.getUTCDate() - 7);
    }
  } else if (daysToWednesday > 0) {
    // 아직 수요일이 안 왔으면, 지난주 수요일이 마지막 초기화
    wednesday.setUTCDate(wednesday.getUTCDate() - 7);
  }

  // UTC 시간으로 변환 (KST - 9시간)
  return new Date(wednesday.getTime() - kstOffset);
}

// 주간 초기화가 필요한지 체크
export function needsWeeklyReset(lastResetTime: string | undefined): boolean {
  const lastWednesday6AM = getThisWeekWednesday6AM();

  if (!lastResetTime) {
    // 한 번도 초기화된 적 없으면 초기화 필요
    return true;
  }

  const lastReset = new Date(lastResetTime);
  // 마지막 초기화가 이번 주 수요일 06시 이전이면 초기화 필요
  return lastReset < lastWednesday6AM;
}

// 주 라벨 생성 (예: "2월 1주차")
export function getWeekLabel(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);

  const month = kstDate.getUTCMonth() + 1;
  const day = kstDate.getUTCDate();

  // 해당 월의 몇 번째 주인지 계산 (1일 기준)
  const weekOfMonth = Math.ceil(day / 7);

  return `${month}월 ${weekOfMonth}주차`;
}

// 현재 주의 시작일 (수요일) 가져오기
export function getCurrentWeekStart(): string {
  const wednesday = getThisWeekWednesday6AM();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(wednesday.getTime() + kstOffset);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// 총 골드 계산 (체크리스트 기반)
export function calculateTotalGoldFromChecklist(
  characters: Character[],
  weeklyChecklist: WeeklyChecklist
): { totalGold: number; raidGold: number; additionalGold: number } {
  let raidGold = 0;
  let additionalGold = 0;

  characters.forEach(char => {
    const state = weeklyChecklist[char.name];
    if (!state) return;

    Object.entries(state.raids).forEach(([raidName, gates]) => {
      const raid = raids.find(r => r.name === raidName);
      if (raid) {
        const buyMore = state.raidMoreGoldExclude?.[raidName] === true;

        gates.forEach((checked, i) => {
          if (checked && raid.gates[i]) {
            if (buyMore) {
              raidGold += raid.gates[i].gold - raid.gates[i].moreGold;
            } else {
              raidGold += raid.gates[i].gold;
            }
          }
        });
      }
    });

    additionalGold += state.additionalGold || 0;
  });

  return {
    totalGold: raidGold + additionalGold,
    raidGold,
    additionalGold
  };
}

// 주간 체크리스트 초기화 (레이드 체크, 추가 골드만 - 캐릭터 정보 유지)
export function resetWeeklyChecklist(
  weeklyChecklist: WeeklyChecklist,
  characters: Character[]
): WeeklyChecklist {
  const newChecklist: WeeklyChecklist = {};

  characters.forEach(char => {
    const existingState = weeklyChecklist[char.name];
    // 레이드 체크 상태만 초기화 (레이드 난이도 설정은 유지)
    const raidState: RaidCheckState = {};

    if (existingState?.raids) {
      // 기존에 설정된 레이드들의 체크만 false로
      Object.keys(existingState.raids).forEach(raidName => {
        const raid = raids.find(r => r.name === raidName);
        if (raid) {
          raidState[raidName] = new Array(raid.gates.length).fill(false);
        }
      });
    } else {
      // 레이드 설정이 없으면 새로 생성
      const availableRaids = getRaidsForLevel(char.itemLevel);
      availableRaids.forEach(raid => {
        raidState[raid.name] = new Array(raid.gates.length).fill(false);
      });
    }

    newChecklist[char.name] = {
      raids: raidState,
      additionalGold: 0,  // 추가 골드 초기화
      paradise: false,    // 낙원 초기화
      sandOfTime: false,  // 모래시계 초기화
      // 더보기 비용 설정은 유지
      raidMoreGoldExclude: existingState?.raidMoreGoldExclude || {},
    };
  });

  return newChecklist;
}
