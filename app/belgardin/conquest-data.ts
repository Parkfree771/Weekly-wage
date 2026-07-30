// ─── 벨가르딘 정복전 이벤트 데이터 ───
// 6주간 진행되는 미션 이벤트. 미션 목록만 사전 공개되었고 보상은 "성장에 도움이 되는 재료"
// 라고만 안내되어 있어 rewards 는 전부 null(미정) 로 둔다. 공개되면 여기 값만 채우면 된다.
//
// 미션 이름·상세는 공개된 표기를 그대로 옮긴다(임의 축약 금지).
// 유일한 예외 두 가지:
//   1) 공통 미션의 "2관문 1회 / 누적 2회 / 누적 4회 클리어" 는 표에서 한 줄이지만
//      달성 단계가 셋이라 체크 단위로 세 개로 나눴다.
//   2) 나이트메어 전용 미션은 표에 짧은 이름이 없어 두 조건을 요약한 제목을 붙이고,
//      원문 4줄은 상세(detail)에 그대로 넣었다.
//
// 공통 미션은 난이도별로 따로 존재하지만 상위 난이도를 달성하면 하위 난이도 동일 미션도
// 자동 완료되므로, 체크리스트에서는 난이도를 나누지 않고 미션 하나로 묶어서 다룬다.

export const CONQUEST_WEEKS = 6;

export type ConquestReward = {
  name: string;
  amount: number;
  image?: string;
};

export type ConquestMission = {
  id: string;
  /** 목록에 보이는 이름 */
  name: string;
  /** 호버·? 버튼으로만 노출되는 상세. 원문 줄 단위 배열 */
  detail?: string[];
  /** 난이도 제한이 있는 미션에만 표기 */
  tag?: string;
  /** null = 보상 미공개 */
  rewards: ConquestReward[] | null;
};

export type ConquestSection = {
  key: string;
  title: string;
  note?: string;
  missions: ConquestMission[];
};

export const CONQUEST_SECTIONS: ConquestSection[] = [
  {
    key: 'common',
    title: '공통 정복 미션 (난이도별 달성)',
    note: '상위 난이도에서 미션을 완료하면 하위 난이도의 동일한 미션도 자동으로 완료됩니다.',
    missions: [
      { id: 'clear-1', name: '2관문 1회 클리어', rewards: null },
      { id: 'clear-2', name: '2관문 누적 2회 클리어', rewards: null },
      { id: 'clear-4', name: '2관문 누적 4회 클리어', rewards: null },
      {
        id: 'no-death-g1',
        name: '1관문에서 자신의 사망 없이 클리어',
        detail: ['※ 다른 공격대원의 사망 여부와 무관합니다.'],
        rewards: null,
      },
      {
        id: 'no-death-g2',
        name: '2관문에서 자신의 사망 없이 클리어',
        detail: ['※ 다른 공격대원의 사망 여부와 무관합니다.'],
        rewards: null,
      },
      {
        id: 'invincible',
        name: '무적의 공격대 달성',
        tag: '노말/하드',
        rewards: null,
      },
    ],
  },
  {
    key: 'nightmare',
    title: '나이트메어 전용 정복 미션',
    missions: [
      {
        id: 'nm-kraghma',
        name: "'페투스 안 크라그마' 잡기 횟수 제한 + 아무도 죽지 않고 2관문 클리어",
        tag: '나이트메어',
        detail: [
          '공격대 전체 기준',
          "1) '페투스 안 크라그마'의 잡기 공격에 잡힌 총 횟수가 일정 횟수를 초과하지 않고",
          '2) 아무도 죽지 않고 2관문 클리어',
          '※ 두 조건을 모두 충족한 상태로 2관문을 클리어해야 미션이 달성됩니다.',
        ],
        rewards: null,
      },
    ],
  },
  {
    key: 'bonus',
    title: '보너스 미션 (3종)',
    missions: [
      { id: 'bonus-headon', name: "업적 '정면충돌' 달성하기", rewards: null },
      { id: 'bonus-notpass', name: "업적 '넌 못 지나간다' 달성하기", rewards: null },
      { id: 'bonus-blood', name: "업적 '피가 부족해' 달성하기", rewards: null },
    ],
  },
];

// 나이트메어 명예 보상 — 칭호 이름은 미공개라 등급만 표기한다.
export const NIGHTMARE_HONOR_REWARD = {
  grades: ['유물', '전설'],
  titleName: null as string | null,
};

export const ALL_MISSIONS = CONQUEST_SECTIONS.flatMap((s) => s.missions);

export const CONQUEST_STORAGE_KEY = 'belgardin-conquest-v2';
