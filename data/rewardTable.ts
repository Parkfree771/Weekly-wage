// ─── 보상 데이터 단일 원본 테이블 (Single Source of Truth) ───
//
// 레이드 + 레이드 외 주간/일일 콘텐츠(균열·전선, 가디언 토벌, 카오스 게이트, 필드보스,
// 할의 모래시계) 수치를 전부 여기서 관리한다. 여기 값 하나를 바꾸면 파생 소비처 전부에 반영된다:
//   data/raids.ts(골드) · data/raidClearRewards.ts(클리어 재료) · data/raidRewards.ts(더보기 재료)
//   · CORE_PER_GATE(주간 레이드) · 벨가르딘/세르카/성당 페이지 STAGES
//   · lib/daily-content.ts · lib/weekly-rewards.ts · app/mypage
//
// RN 앱(loalogol-app)도 이 파일에서 생성한다 — `node tools/sync-app-data.mjs` 실행.
// 앱과 값이 어긋나면 달력 기록(appActivityLog) 정산이 웹·앱에서 달라지므로 반드시 같이 갱신할 것.
//
// 수치 검증: 2026-07-27 인게임 보상 화면 캡쳐 전수 대조 완료 (더보기 재료·비용 전면 교정).
// gold 는 총 클리어 골드(유통+귀속), boundGold 는 그중 귀속. more 는 더보기 시 "추가"로 받는 분량.
// 코어·고통의 가시·은총의 파편·승급 재료는 클리어와 더보기가 같은 수량.
// 벨가르딘 승급 재료(사령의 잔영·죽음의 손)는 2026-07-29 공식 수치 — 모든 난이도 동일하게
// 1관문 12개 / 2관문 18개, 더보기까지 하면 주 60개 (lib/wangapData.ts 의 승급 비용과 짝).
// 벨가르딘 전 수치는 2026-08-05 출시 당일 인게임 확인 값 (코어는 더보기도 클리어와 동일 수량).

export const MATERIAL_IDS = {
  // 기존 재료 (운명)
  FATE_GUARDIAN_STONE: 66102106, // 운명의 수호석 (Bundle: 100)
  FATE_DESTRUCTION_STONE: 66102006, // 운명의 파괴석 (Bundle: 100)
  FATE_FRAGMENT: 66130143, // 운명의 파편 주머니(대) (Bundle: 1) - 3000 파편
  FATE_BREAKTHROUGH_STONE: 66110225, // 운명의 돌파석 (Bundle: 1)
  ABIDOS_FUSION: 6861012, // 아비도스 융화 재료 (Bundle: 1)
  // 계승 재료 (1730+ 레이드)
  FATE_GUARDIAN_STONE_CRYSTAL: 66102107, // 운명의 수호석 결정 (Bundle: 100)
  FATE_DESTRUCTION_STONE_CRYSTAL: 66102007, // 운명의 파괴석 결정 (Bundle: 100)
  GREAT_FATE_BREAKTHROUGH_STONE: 66110226, // 위대한 운명의 돌파석 (Bundle: 1)
  ADVANCED_ABIDOS_FUSION: 6861013, // 상급 아비도스 융화 재료 (Bundle: 1)
  // 가격 없는 특수 재료 - ID 0은 가격 계산 제외
  CERKA_CORE: 0, // 코어 (거래 불가)
  PULSATING_THORN: 0, // 고통의 가시 (거래 불가)
  GRACE_FRAGMENT: 0, // 은총의 파편 (거래 불가)
  // 벨가르딘 고유 보상 — 완갑 승급(해방) 재료 (거래 불가라 가치 계산 제외)
  WRAITH_ECHO: 0, // 사령의 잔영 (노말 고유 보상)
  HAND_OF_DEATH: 0, // 죽음의 손 (하드·나메 고유 보상)
};

export const MATERIAL_NAMES = {
  FATE_GUARDIAN_STONE: '운명의 수호석',
  FATE_DESTRUCTION_STONE: '운명의 파괴석',
  FATE_FRAGMENT: '운명의 파편', // UI에서는 파편으로 표시
  FATE_BREAKTHROUGH_STONE: '운명의 돌파석',
  ABIDOS_FUSION: '아비도스 융화 재료',
  // 계승 재료
  FATE_GUARDIAN_STONE_CRYSTAL: '운명의 수호석 결정',
  FATE_DESTRUCTION_STONE_CRYSTAL: '운명의 파괴석 결정',
  GREAT_FATE_BREAKTHROUGH_STONE: '위대한 운명의 돌파석',
  ADVANCED_ABIDOS_FUSION: '상급 아비도스 융화 재료',
  // 특수 재료
  CERKA_CORE: '코어',
  PULSATING_THORN: '고통의 가시',
  GRACE_FRAGMENT: '은총의 파편',
  WRAITH_ECHO: '사령의 잔영',
  HAND_OF_DEATH: '죽음의 손',
};

// 묶음 단위 - 개당 가격 계산을 위한 나눗수
export const MATERIAL_BUNDLE_SIZES: { [key: number]: number } = {
  [MATERIAL_IDS.FATE_GUARDIAN_STONE]: 100, // 수호석 100개 묶음
  [MATERIAL_IDS.FATE_DESTRUCTION_STONE]: 100, // 파괴석 100개 묶음
  [MATERIAL_IDS.FATE_FRAGMENT]: 3000, // 파편 3000개 묶음
  [MATERIAL_IDS.FATE_BREAKTHROUGH_STONE]: 1, // 돌파석 1개 단위
  [MATERIAL_IDS.ABIDOS_FUSION]: 1, // 아비도스 1개 단위
  // 계승 재료
  [MATERIAL_IDS.FATE_GUARDIAN_STONE_CRYSTAL]: 100, // 수호석 결정 100개 묶음
  [MATERIAL_IDS.FATE_DESTRUCTION_STONE_CRYSTAL]: 100, // 파괴석 결정 100개 묶음
  [MATERIAL_IDS.GREAT_FATE_BREAKTHROUGH_STONE]: 1, // 위대한 돌파석 1개 단위
  [MATERIAL_IDS.ADVANCED_ABIDOS_FUSION]: 1, // 상급 아비도스 1개 단위
};

export type MaterialReward = {
  itemId: number;
  itemName: string;
  amount: number;
};

export type RaidTableGate = {
  gate: number;
  gold: number;      // 총 클리어 골드 (유통+귀속)
  boundGold: number; // 그중 귀속
  moreGold: number;  // 더보기 비용
  clear: MaterialReward[];
  more: MaterialReward[];
};

export type RaidTableEntry = {
  name: string;      // 소비처 공통 명칭 ('세르카 하드' 등)
  group: string;     // 레이드 그룹 ('세르카' 등)
  excelName: string; // 엑셀·앱 표기 레이드명 ('지평의 성당' 등)
  difficulty: string;// 엑셀·앱 표기 난이도 ('나이트메어' 등)
  level: number;
  image: string;
  moreDataIncomplete?: boolean; // 더보기 재련 재료 미공개 → raidRewards 파생 제외
  gates: RaidTableGate[];
};

type MatKey = keyof typeof MATERIAL_IDS;
const m = (key: MatKey, amount: number): MaterialReward => ({
  itemId: MATERIAL_IDS[key],
  itemName: MATERIAL_NAMES[key],
  amount,
});

export const RAID_TABLE: RaidTableEntry[] = [
  {
    name: '벨가르딘 나메', group: '벨가르딘', level: 1780, image: '/belgardin2.webp',
    excelName: '벨가르딘', difficulty: '나이트메어',
    gates: [
      { gate: 1, gold: 30000, boundGold: 0, moreGold: 9600,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 565), m('FATE_GUARDIAN_STONE_CRYSTAL', 1130),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 12550),
          m('HAND_OF_DEATH', 12), m('CERKA_CORE', 4),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1300), m('FATE_GUARDIAN_STONE_CRYSTAL', 2600),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 49), m('FATE_FRAGMENT', 26220),
          m('HAND_OF_DEATH', 12), m('CERKA_CORE', 4),
        ] },
      { gate: 2, gold: 45000, boundGold: 0, moreGold: 14400,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 690), m('FATE_GUARDIAN_STONE_CRYSTAL', 1380),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 18), m('FATE_FRAGMENT', 15180),
          m('HAND_OF_DEATH', 18), m('CERKA_CORE', 4),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1980), m('FATE_GUARDIAN_STONE_CRYSTAL', 3960),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 83), m('FATE_FRAGMENT', 44440),
          m('HAND_OF_DEATH', 18), m('CERKA_CORE', 4),
        ] },
    ],
  },
  {
    name: '벨가르딘 하드', group: '벨가르딘', level: 1770, image: '/belgardin2.webp',
    excelName: '벨가르딘', difficulty: '하드',
    gates: [
      { gate: 1, gold: 25000, boundGold: 0, moreGold: 8000,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 490), m('FATE_GUARDIAN_STONE_CRYSTAL', 980),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 10), m('FATE_FRAGMENT', 10920),
          m('HAND_OF_DEATH', 12), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1130), m('FATE_GUARDIAN_STONE_CRYSTAL', 2260),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 43), m('FATE_FRAGMENT', 22800),
          m('HAND_OF_DEATH', 12), m('CERKA_CORE', 3),
        ] },
      { gate: 2, gold: 37000, boundGold: 0, moreGold: 11840,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 600), m('FATE_GUARDIAN_STONE_CRYSTAL', 1200),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 15), m('FATE_FRAGMENT', 13200),
          m('HAND_OF_DEATH', 18), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1720), m('FATE_GUARDIAN_STONE_CRYSTAL', 3440),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 72), m('FATE_FRAGMENT', 38640),
          m('HAND_OF_DEATH', 18), m('CERKA_CORE', 3),
        ] },
    ],
  },
  {
    name: '벨가르딘 노말', group: '벨가르딘', level: 1750, image: '/belgardin2.webp',
    excelName: '벨가르딘', difficulty: '노말',
    gates: [
      { gate: 1, gold: 20000, boundGold: 0, moreGold: 6400,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 405), m('FATE_GUARDIAN_STONE_CRYSTAL', 810),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 8), m('FATE_FRAGMENT', 9100),
          m('WRAITH_ECHO', 12), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 860), m('FATE_GUARDIAN_STONE_CRYSTAL', 1720),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 36), m('FATE_FRAGMENT', 19000),
          m('WRAITH_ECHO', 12), m('CERKA_CORE', 3),
        ] },
      { gate: 2, gold: 30000, boundGold: 0, moreGold: 9600,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 500), m('FATE_GUARDIAN_STONE_CRYSTAL', 1000),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 11000),
          m('WRAITH_ECHO', 18), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1430), m('FATE_GUARDIAN_STONE_CRYSTAL', 2860),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 60), m('FATE_FRAGMENT', 32200),
          m('WRAITH_ECHO', 18), m('CERKA_CORE', 3),
        ] },
    ],
  },
  {
    name: '성당 3단계', group: '성당', level: 1750, image: '/wlvuddmltjdekd1.webp',
    excelName: '지평의 성당', difficulty: '3단계',
    gates: [
      { gate: 1, gold: 20000, boundGold: 20000, moreGold: 6400,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 405), m('FATE_GUARDIAN_STONE_CRYSTAL', 810),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 8), m('FATE_FRAGMENT', 9100),
          m('GRACE_FRAGMENT', 24), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 860), m('FATE_GUARDIAN_STONE_CRYSTAL', 1720),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 36), m('FATE_FRAGMENT', 19000),
          m('GRACE_FRAGMENT', 24), m('CERKA_CORE', 3),
        ] },
      { gate: 2, gold: 30000, boundGold: 30000, moreGold: 9600,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 500), m('FATE_GUARDIAN_STONE_CRYSTAL', 1000),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 11000),
          m('GRACE_FRAGMENT', 36), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1430), m('FATE_GUARDIAN_STONE_CRYSTAL', 2860),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 60), m('FATE_FRAGMENT', 32200),
          m('GRACE_FRAGMENT', 36), m('CERKA_CORE', 3),
        ] },
    ],
  },
  {
    name: '성당 2단계', group: '성당', level: 1720, image: '/wlvuddmltjdekd1.webp',
    excelName: '지평의 성당', difficulty: '2단계',
    gates: [
      { gate: 1, gold: 16000, boundGold: 16000, moreGold: 5120,
        clear: [
          m('FATE_DESTRUCTION_STONE', 980), m('FATE_GUARDIAN_STONE', 1960),
          m('FATE_BREAKTHROUGH_STONE', 11), m('FATE_FRAGMENT', 6800),
          m('GRACE_FRAGMENT', 12), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1680), m('FATE_GUARDIAN_STONE', 3360),
          m('FATE_BREAKTHROUGH_STONE', 53), m('FATE_FRAGMENT', 14250),
          m('GRACE_FRAGMENT', 12), m('CERKA_CORE', 2),
        ] },
      { gate: 2, gold: 24000, boundGold: 24000, moreGold: 7680,
        clear: [
          m('FATE_DESTRUCTION_STONE', 1150), m('FATE_GUARDIAN_STONE', 2300),
          m('FATE_BREAKTHROUGH_STONE', 16), m('FATE_FRAGMENT', 8600),
          m('GRACE_FRAGMENT', 18), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 2880), m('FATE_GUARDIAN_STONE', 5760),
          m('FATE_BREAKTHROUGH_STONE', 94), m('FATE_FRAGMENT', 24200),
          m('GRACE_FRAGMENT', 18), m('CERKA_CORE', 2),
        ] },
    ],
  },
  {
    name: '성당 1단계', group: '성당', level: 1700, image: '/wlvuddmltjdekd1.webp',
    excelName: '지평의 성당', difficulty: '1단계',
    gates: [
      { gate: 1, gold: 13500, boundGold: 13500, moreGold: 4320,
        clear: [
          m('FATE_DESTRUCTION_STONE', 820), m('FATE_GUARDIAN_STONE', 1640),
          m('FATE_BREAKTHROUGH_STONE', 9), m('FATE_FRAGMENT', 5400),
          m('GRACE_FRAGMENT', 4), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1400), m('FATE_GUARDIAN_STONE', 2800),
          m('FATE_BREAKTHROUGH_STONE', 44), m('FATE_FRAGMENT', 11880),
          m('GRACE_FRAGMENT', 4), m('CERKA_CORE', 2),
        ] },
      { gate: 2, gold: 16500, boundGold: 16500, moreGold: 5280,
        clear: [
          m('FATE_DESTRUCTION_STONE', 960), m('FATE_GUARDIAN_STONE', 1920),
          m('FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 6800),
          m('GRACE_FRAGMENT', 6), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 2400), m('FATE_GUARDIAN_STONE', 4800),
          m('FATE_BREAKTHROUGH_STONE', 78), m('FATE_FRAGMENT', 20160),
          m('GRACE_FRAGMENT', 6), m('CERKA_CORE', 2),
        ] },
    ],
  },
  {
    name: '세르카 나메', group: '세르카', level: 1740, image: '/cerka.webp',
    excelName: '세르카', difficulty: '나이트메어',
    gates: [
      { gate: 1, gold: 21000, boundGold: 0, moreGold: 6720,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 405), m('FATE_GUARDIAN_STONE_CRYSTAL', 810),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 8), m('FATE_FRAGMENT', 9100),
          m('PULSATING_THORN', 10), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 860), m('FATE_GUARDIAN_STONE_CRYSTAL', 1720),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 36), m('FATE_FRAGMENT', 19000),
          m('PULSATING_THORN', 10), m('CERKA_CORE', 3),
        ] },
      { gate: 2, gold: 33000, boundGold: 0, moreGold: 10560,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 500), m('FATE_GUARDIAN_STONE_CRYSTAL', 1000),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 11000),
          m('PULSATING_THORN', 15), m('CERKA_CORE', 3),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1430), m('FATE_GUARDIAN_STONE_CRYSTAL', 2860),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 60), m('FATE_FRAGMENT', 32200),
          m('PULSATING_THORN', 15), m('CERKA_CORE', 3),
        ] },
    ],
  },
  {
    name: '세르카 하드', group: '세르카', level: 1730, image: '/cerka.webp',
    excelName: '세르카', difficulty: '하드',
    gates: [
      { gate: 1, gold: 17500, boundGold: 0, moreGold: 5600,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 385), m('FATE_GUARDIAN_STONE_CRYSTAL', 770),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 7), m('FATE_FRAGMENT', 8300),
          m('PULSATING_THORN', 10), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 750), m('FATE_GUARDIAN_STONE_CRYSTAL', 1500),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 30), m('FATE_FRAGMENT', 17500),
          m('PULSATING_THORN', 10), m('CERKA_CORE', 2),
        ] },
      { gate: 2, gold: 26500, boundGold: 0, moreGold: 8480,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 475), m('FATE_GUARDIAN_STONE_CRYSTAL', 950),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 10), m('FATE_FRAGMENT', 10100),
          m('PULSATING_THORN', 15), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1130), m('FATE_GUARDIAN_STONE_CRYSTAL', 2260),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 45), m('FATE_FRAGMENT', 26820),
          m('PULSATING_THORN', 15), m('CERKA_CORE', 2),
        ] },
    ],
  },
  {
    name: '세르카 노말', group: '세르카', level: 1710, image: '/cerka.webp',
    excelName: '세르카', difficulty: '노말',
    gates: [
      { gate: 1, gold: 13000, boundGold: 6500, moreGold: 4160,
        clear: [
          m('FATE_DESTRUCTION_STONE', 880), m('FATE_GUARDIAN_STONE', 1760),
          m('FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 6200),
          m('PULSATING_THORN', 4), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1500), m('FATE_GUARDIAN_STONE', 3000),
          m('FATE_BREAKTHROUGH_STONE', 47), m('FATE_FRAGMENT', 12680),
          m('PULSATING_THORN', 4), m('CERKA_CORE', 2),
        ] },
      { gate: 2, gold: 19000, boundGold: 9500, moreGold: 6080,
        clear: [
          m('FATE_DESTRUCTION_STONE', 1100), m('FATE_GUARDIAN_STONE', 2200),
          m('FATE_BREAKTHROUGH_STONE', 15), m('FATE_FRAGMENT', 7900),
          m('PULSATING_THORN', 6), m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 2250), m('FATE_GUARDIAN_STONE', 4500),
          m('FATE_BREAKTHROUGH_STONE', 75), m('FATE_FRAGMENT', 18900),
          m('PULSATING_THORN', 6), m('CERKA_CORE', 2),
        ] },
    ],
  },
  {
    name: '종막 하드', group: '종막', level: 1730, image: '/abrelshud.webp',
    excelName: '종막', difficulty: '하드',
    gates: [
      { gate: 1, gold: 16000, boundGold: 0, moreGold: 5120,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 385), m('FATE_GUARDIAN_STONE_CRYSTAL', 770),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 7), m('FATE_FRAGMENT', 8300),
          m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 710), m('FATE_GUARDIAN_STONE_CRYSTAL', 1420),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 29), m('FATE_FRAGMENT', 16480),
          m('CERKA_CORE', 2),
        ] },
      { gate: 2, gold: 32000, boundGold: 0, moreGold: 10240,
        clear: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 475), m('FATE_GUARDIAN_STONE_CRYSTAL', 950),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 10), m('FATE_FRAGMENT', 10100),
          m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE_CRYSTAL', 1210), m('FATE_GUARDIAN_STONE_CRYSTAL', 2420),
          m('GREAT_FATE_BREAKTHROUGH_STONE', 46), m('FATE_FRAGMENT', 27250),
          m('CERKA_CORE', 2),
        ] },
    ],
  },
  {
    name: '종막 노말', group: '종막', level: 1710, image: '/abrelshud.webp',
    excelName: '종막', difficulty: '노말',
    gates: [
      { gate: 1, gold: 11000, boundGold: 5500, moreGold: 3520,
        clear: [
          m('FATE_DESTRUCTION_STONE', 880), m('FATE_GUARDIAN_STONE', 1760),
          m('FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 6200),
          m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1270), m('FATE_GUARDIAN_STONE', 2540),
          m('FATE_BREAKTHROUGH_STONE', 40), m('FATE_FRAGMENT', 10730),
          m('CERKA_CORE', 2),
        ] },
      { gate: 2, gold: 21000, boundGold: 10500, moreGold: 6720,
        clear: [
          m('FATE_DESTRUCTION_STONE', 1100), m('FATE_GUARDIAN_STONE', 2200),
          m('FATE_BREAKTHROUGH_STONE', 15), m('FATE_FRAGMENT', 7900),
          m('CERKA_CORE', 2),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 2230), m('FATE_GUARDIAN_STONE', 4460),
          m('FATE_BREAKTHROUGH_STONE', 73), m('FATE_FRAGMENT', 18740),
          m('CERKA_CORE', 2),
        ] },
    ],
  },
  {
    name: '4막 하드', group: '4막', level: 1720, image: '/illiakan.webp',
    excelName: '4막', difficulty: '하드',
    gates: [
      { gate: 1, gold: 13500, boundGold: 0, moreGold: 4320,
        clear: [
          m('FATE_DESTRUCTION_STONE', 980), m('FATE_GUARDIAN_STONE', 1960),
          m('FATE_BREAKTHROUGH_STONE', 11), m('FATE_FRAGMENT', 6800),
          m('CERKA_CORE', 1),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1520), m('FATE_GUARDIAN_STONE', 3040),
          m('FATE_BREAKTHROUGH_STONE', 48), m('FATE_FRAGMENT', 12830),
          m('CERKA_CORE', 1),
        ] },
      { gate: 2, gold: 24500, boundGold: 0, moreGold: 7840,
        clear: [
          m('FATE_DESTRUCTION_STONE', 1150), m('FATE_GUARDIAN_STONE', 2300),
          m('FATE_BREAKTHROUGH_STONE', 16), m('FATE_FRAGMENT', 8600),
          m('CERKA_CORE', 1),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 2620), m('FATE_GUARDIAN_STONE', 5240),
          m('FATE_BREAKTHROUGH_STONE', 86), m('FATE_FRAGMENT', 21960),
          m('CERKA_CORE', 1),
        ] },
    ],
  },
  {
    name: '4막 노말', group: '4막', level: 1700, image: '/illiakan.webp',
    excelName: '4막', difficulty: '노말',
    gates: [
      { gate: 1, gold: 10000, boundGold: 5000, moreGold: 3200,
        clear: [
          m('FATE_DESTRUCTION_STONE', 820), m('FATE_GUARDIAN_STONE', 1640),
          m('FATE_BREAKTHROUGH_STONE', 9), m('FATE_FRAGMENT', 5400),
          m('CERKA_CORE', 1),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1120), m('FATE_GUARDIAN_STONE', 2240),
          m('FATE_BREAKTHROUGH_STONE', 36), m('FATE_FRAGMENT', 9510),
          m('CERKA_CORE', 1),
        ] },
      { gate: 2, gold: 17000, boundGold: 8500, moreGold: 5440,
        clear: [
          m('FATE_DESTRUCTION_STONE', 960), m('FATE_GUARDIAN_STONE', 1920),
          m('FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 6800),
          m('CERKA_CORE', 1),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 2000), m('FATE_GUARDIAN_STONE', 4000),
          m('FATE_BREAKTHROUGH_STONE', 65), m('FATE_FRAGMENT', 16720),
          m('CERKA_CORE', 1),
        ] },
    ],
  },
  {
    name: '3막 하드', group: '3막', level: 1700, image: '/ivory-tower.webp',
    excelName: '3막', difficulty: '하드',
    gates: [
      { gate: 1, gold: 5000, boundGold: 2500, moreGold: 1650,
        clear: [
          m('FATE_DESTRUCTION_STONE', 440), m('FATE_GUARDIAN_STONE', 880),
          m('FATE_BREAKTHROUGH_STONE', 6), m('FATE_FRAGMENT', 3400),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 600), m('FATE_GUARDIAN_STONE', 1200),
          m('FATE_BREAKTHROUGH_STONE', 23), m('FATE_FRAGMENT', 5000),
        ] },
      { gate: 2, gold: 8000, boundGold: 4000, moreGold: 2640,
        clear: [
          m('FATE_DESTRUCTION_STONE', 520), m('FATE_GUARDIAN_STONE', 1040),
          m('FATE_BREAKTHROUGH_STONE', 6), m('FATE_FRAGMENT', 4000),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 830), m('FATE_GUARDIAN_STONE', 1660),
          m('FATE_BREAKTHROUGH_STONE', 27), m('FATE_FRAGMENT', 7200),
        ] },
      { gate: 3, gold: 14000, boundGold: 7000, moreGold: 4060,
        clear: [
          m('FATE_DESTRUCTION_STONE', 640), m('FATE_GUARDIAN_STONE', 1280),
          m('FATE_BREAKTHROUGH_STONE', 8), m('FATE_FRAGMENT', 5600),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1460), m('FATE_GUARDIAN_STONE', 2920),
          m('FATE_BREAKTHROUGH_STONE', 45), m('FATE_FRAGMENT', 11760),
        ] },
    ],
  },
  {
    name: '3막 노말', group: '3막', level: 1680, image: '/ivory-tower.webp',
    excelName: '3막', difficulty: '노말',
    gates: [
      { gate: 1, gold: 4000, boundGold: 2000, moreGold: 1300,
        clear: [
          m('FATE_DESTRUCTION_STONE', 320), m('FATE_GUARDIAN_STONE', 640),
          m('FATE_BREAKTHROUGH_STONE', 4), m('FATE_FRAGMENT', 2600),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 390), m('FATE_GUARDIAN_STONE', 780),
          m('FATE_BREAKTHROUGH_STONE', 12), m('FATE_FRAGMENT', 3680),
        ] },
      { gate: 2, gold: 7000, boundGold: 3500, moreGold: 2350,
        clear: [
          m('FATE_DESTRUCTION_STONE', 400), m('FATE_GUARDIAN_STONE', 800),
          m('FATE_BREAKTHROUGH_STONE', 4), m('FATE_FRAGMENT', 3000),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 530), m('FATE_GUARDIAN_STONE', 1060),
          m('FATE_BREAKTHROUGH_STONE', 15), m('FATE_FRAGMENT', 4750),
        ] },
      { gate: 3, gold: 10000, boundGold: 5000, moreGold: 3360,
        clear: [
          m('FATE_DESTRUCTION_STONE', 520), m('FATE_GUARDIAN_STONE', 1040),
          m('FATE_BREAKTHROUGH_STONE', 6), m('FATE_FRAGMENT', 4200),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 780), m('FATE_GUARDIAN_STONE', 1560),
          m('FATE_BREAKTHROUGH_STONE', 21), m('FATE_FRAGMENT', 6810),
        ] },
    ],
  },
  {
    name: '2막 하드', group: '2막', level: 1690, image: '/kazeros.webp',
    excelName: '2막', difficulty: '하드',
    gates: [
      { gate: 1, gold: 7500, boundGold: 3750, moreGold: 2400,
        clear: [
          m('FATE_DESTRUCTION_STONE', 640), m('FATE_GUARDIAN_STONE', 1280),
          m('FATE_BREAKTHROUGH_STONE', 7), m('FATE_FRAGMENT', 4600),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 720), m('FATE_GUARDIAN_STONE', 1440),
          m('FATE_BREAKTHROUGH_STONE', 30), m('FATE_FRAGMENT', 6000),
        ] },
      { gate: 2, gold: 15500, boundGold: 7750, moreGold: 5100,
        clear: [
          m('FATE_DESTRUCTION_STONE', 700), m('FATE_GUARDIAN_STONE', 1400),
          m('FATE_BREAKTHROUGH_STONE', 8), m('FATE_FRAGMENT', 6000),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 1320), m('FATE_GUARDIAN_STONE', 2640),
          m('FATE_BREAKTHROUGH_STONE', 50), m('FATE_FRAGMENT', 10590),
        ] },
    ],
  },
  {
    name: '2막 노말', group: '2막', level: 1670, image: '/kazeros.webp',
    excelName: '2막', difficulty: '노말',
    gates: [
      { gate: 1, gold: 5500, boundGold: 2750, moreGold: 1820,
        clear: [
          m('FATE_DESTRUCTION_STONE', 540), m('FATE_GUARDIAN_STONE', 1080),
          m('FATE_BREAKTHROUGH_STONE', 5), m('FATE_FRAGMENT', 4000),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 610), m('FATE_GUARDIAN_STONE', 1220),
          m('FATE_BREAKTHROUGH_STONE', 13), m('FATE_FRAGMENT', 5220),
        ] },
      { gate: 2, gold: 11000, boundGold: 5500, moreGold: 3720,
        clear: [
          m('FATE_DESTRUCTION_STONE', 640), m('FATE_GUARDIAN_STONE', 1280),
          m('FATE_BREAKTHROUGH_STONE', 6), m('FATE_FRAGMENT', 4600),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 810), m('FATE_GUARDIAN_STONE', 1620),
          m('FATE_BREAKTHROUGH_STONE', 21), m('FATE_FRAGMENT', 8060),
        ] },
    ],
  },
  {
    name: '1막 하드', group: '1막', level: 1680, image: '/aegir.webp',
    excelName: '1막', difficulty: '하드',
    gates: [
      { gate: 1, gold: 5500, boundGold: 2750, moreGold: 1820,
        clear: [
          m('FATE_DESTRUCTION_STONE', 580), m('FATE_GUARDIAN_STONE', 1160),
          m('FATE_BREAKTHROUGH_STONE', 6), m('FATE_FRAGMENT', 4200),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 610), m('FATE_GUARDIAN_STONE', 1220),
          m('FATE_BREAKTHROUGH_STONE', 18), m('FATE_FRAGMENT', 5280),
        ] },
      { gate: 2, gold: 12500, boundGold: 6250, moreGold: 4150,
        clear: [
          m('FATE_DESTRUCTION_STONE', 660), m('FATE_GUARDIAN_STONE', 1320),
          m('FATE_BREAKTHROUGH_STONE', 7), m('FATE_FRAGMENT', 5400),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 940), m('FATE_GUARDIAN_STONE', 1880),
          m('FATE_BREAKTHROUGH_STONE', 31), m('FATE_FRAGMENT', 8930),
        ] },
    ],
  },
  {
    name: '1막 노말', group: '1막', level: 1660, image: '/aegir.webp',
    excelName: '1막', difficulty: '노말',
    gates: [
      { gate: 1, gold: 3500, boundGold: 1750, moreGold: 750,
        clear: [
          m('FATE_DESTRUCTION_STONE', 480), m('FATE_GUARDIAN_STONE', 960),
          m('FATE_BREAKTHROUGH_STONE', 4), m('FATE_FRAGMENT', 3600),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 310), m('FATE_GUARDIAN_STONE', 620),
          m('FATE_BREAKTHROUGH_STONE', 8), m('FATE_FRAGMENT', 2800),
        ] },
      { gate: 2, gold: 8000, boundGold: 4000, moreGold: 1780,
        clear: [
          m('FATE_DESTRUCTION_STONE', 580), m('FATE_GUARDIAN_STONE', 1160),
          m('FATE_BREAKTHROUGH_STONE', 5), m('FATE_FRAGMENT', 4400),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 460), m('FATE_GUARDIAN_STONE', 920),
          m('FATE_BREAKTHROUGH_STONE', 15), m('FATE_FRAGMENT', 4480),
        ] },
    ],
  },
  {
    name: '서막', group: '서막', level: 1640, image: '/echidna.webp',
    excelName: '에키드나', difficulty: '하드',
    gates: [
      { gate: 1, gold: 2200, boundGold: 1100, moreGold: 720,
        clear: [
          m('FATE_DESTRUCTION_STONE', 200), m('FATE_GUARDIAN_STONE', 400),
          m('FATE_BREAKTHROUGH_STONE', 2), m('FATE_FRAGMENT', 2700),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 240), m('FATE_GUARDIAN_STONE', 480),
          m('FATE_BREAKTHROUGH_STONE', 7), m('FATE_FRAGMENT', 1620),
        ] },
      { gate: 2, gold: 5000, boundGold: 2500, moreGold: 1630,
        clear: [
          m('FATE_DESTRUCTION_STONE', 260), m('FATE_GUARDIAN_STONE', 520),
          m('FATE_BREAKTHROUGH_STONE', 3), m('FATE_FRAGMENT', 3800),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 460), m('FATE_GUARDIAN_STONE', 920),
          m('FATE_BREAKTHROUGH_STONE', 20), m('FATE_FRAGMENT', 2990),
        ] },
    ],
  },
  {
    name: '베히모스', group: '베히모스', level: 1640, image: '/behemoth.webp',
    excelName: '베히모스', difficulty: '-',
    gates: [
      { gate: 1, gold: 2200, boundGold: 1100, moreGold: 720,
        clear: [
          m('FATE_DESTRUCTION_STONE', 210), m('FATE_GUARDIAN_STONE', 420),
          m('FATE_BREAKTHROUGH_STONE', 2), m('FATE_FRAGMENT', 3000),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 240), m('FATE_GUARDIAN_STONE', 480),
          m('FATE_BREAKTHROUGH_STONE', 7), m('FATE_FRAGMENT', 1620),
        ] },
      { gate: 2, gold: 5000, boundGold: 2500, moreGold: 1630,
        clear: [
          m('FATE_DESTRUCTION_STONE', 270), m('FATE_GUARDIAN_STONE', 540),
          m('FATE_BREAKTHROUGH_STONE', 3), m('FATE_FRAGMENT', 4000),
        ],
        more: [
          m('FATE_DESTRUCTION_STONE', 460), m('FATE_GUARDIAN_STONE', 920),
          m('FATE_BREAKTHROUGH_STONE', 20), m('FATE_FRAGMENT', 2990),
        ] },
    ],
  },
];

// ─── 파생 헬퍼 ───

const coreOf = (e: RaidTableEntry) =>
  e.gates[0].clear.find(mat => mat.itemName === MATERIAL_NAMES.CERKA_CORE)?.amount ?? 0;

// 레이드별 관문당 코어 획득량 (더보기 안 할 때 기준) — 코어 주는 레이드만 포함
export const CORE_PER_GATE: Record<string, number> = Object.fromEntries(
  RAID_TABLE.filter(e => coreOf(e) > 0).map(e => [e.name, coreOf(e)])
);

// 코어를 주는 레이드 그룹 (테이블 순서 유지)
export const CORE_RAID_GROUPS: string[] = [...new Set(
  RAID_TABLE.filter(e => coreOf(e) > 0).map(e => e.group)
)];

// ─────────────────────────────────────────────────────────────────────────────
// 레이드 외 콘텐츠 (일일 숙제 · 주간 콘텐츠)
// ─────────────────────────────────────────────────────────────────────────────
//
// label 은 정식 명칭, short 는 좁은 칸에서 쓰는 축약 표기다.
// (마이페이지·달력은 short, 계산 로직·시뮬은 label 을 쓴다)

export type ContentMaterial = {
  image: string;
  label: string;
  short: string;
  amount: number;
};

export type ContentTier = {
  minLevel: number;
  label: string; // 예: '1750 균열'
  materials: ContentMaterial[];
};

const IMG = {
  destructionCrystal: '/top-destiny-destruction-stone5.webp',
  guardianCrystal: '/top-destiny-guardian-stone5.webp',
  greatBreakthrough: '/top-destiny-breakthrough-stone5.webp',
  destruction: '/destiny-destruction-stone5-v2.webp',
  guardian: '/destiny-guardian-stone5-v2.webp',
  breakthrough: '/destiny-breakthrough-stone5.webp',
  fragment: '/destiny-shard-bag-large5.webp',
  gem: '/1fpqrjqghk.webp',
  lava: '/breath-lava5.webp',
  glacier: '/breath-glacier5.webp',
  gold: '/gold.webp',
  blessing: '/cjstkd.webp',
  shilling: '/shilling.webp',
};

const mat = (image: string, label: string, short: string, amount: number): ContentMaterial =>
  ({ image, label, short, amount });

// ── 균열 / 전선 (카오스 던전) — 1회(휴게 미적용) 기준, 레벨 내림차순 ──
export const RIFT_TIERS: ContentTier[] = [
  // 1770: 2026-08-05 실측 평균. 파괴석 결정은 시트 평균(411.1)이 휴게 판 기록 오류로 낮게 잡혀
  // 휴게 없는 2판 실측(558, 수호석 증가율 +30%와도 일치)으로 보정했다. 실링은 시세 없음(0골드 환산).
  { minLevel: 1770, label: '1770 균열', materials: [
    mat(IMG.destructionCrystal, '파괴석 결정', '파괴석 결정', 558),
    mat(IMG.guardianCrystal, '수호석 결정', '수호석 결정', 1532),
    mat(IMG.greatBreakthrough, '위대한 돌파석', '위대한 돌파석', 23.8),
    mat(IMG.fragment, '운명의 파편', '파편', 60164.5),
    mat(IMG.shilling, '실링', '실링', 216124.3),
  ] },
  { minLevel: 1750, label: '1750 균열', materials: [
    mat(IMG.destructionCrystal, '파괴석 결정', '파괴석 결정', 438.8),
    mat(IMG.guardianCrystal, '수호석 결정', '수호석 결정', 1177.5),
    mat(IMG.greatBreakthrough, '위대한 돌파석', '위대한 돌파석', 18.8),
    mat(IMG.fragment, '운명의 파편', '파편', 54412.6),
  ] },
  { minLevel: 1730, label: '1730 균열', materials: [
    mat(IMG.destructionCrystal, '파괴석 결정', '파괴석 결정', 361.5),
    mat(IMG.guardianCrystal, '수호석 결정', '수호석 결정', 1092.2),
    mat(IMG.greatBreakthrough, '위대한 돌파석', '위대한 돌파석', 17.7),
    mat(IMG.fragment, '운명의 파편', '파편', 43801.2),
  ] },
  { minLevel: 1720, label: '1720 전선', materials: [
    mat(IMG.destruction, '파괴석', '파괴석', 745.8),
    mat(IMG.guardian, '수호석', '수호석', 2058.2),
    mat(IMG.breakthrough, '돌파석', '돌파석', 47),
    mat(IMG.fragment, '운명의 파편', '파편', 40311.9),
  ] },
  { minLevel: 1700, label: '1700 전선', materials: [
    mat(IMG.destruction, '파괴석', '파괴석', 593.9),
    mat(IMG.guardian, '수호석', '수호석', 1733.4),
    mat(IMG.breakthrough, '돌파석', '돌파석', 41.3),
    mat(IMG.fragment, '운명의 파편', '파편', 33557),
  ] },
  { minLevel: 1680, label: '1680 전선', materials: [
    mat(IMG.destruction, '파괴석', '파괴석', 416.7),
    mat(IMG.guardian, '수호석', '수호석', 1190.3),
    mat(IMG.breakthrough, '돌파석', '돌파석', 36.2),
    mat(IMG.fragment, '운명의 파편', '파편', 32445.4),
  ] },
];

// ── 가디언 토벌 — 1회 기준 ──
export const GUARDIAN_TIERS: ContentTier[] = [
  // 1770: 2026-08-05 휴게 기준 2레벨 보석 11개·실링 122,989 관측 → 1회 기준 ÷2 (보석은 1레벨 ×3 환산)
  { minLevel: 1770, label: '1770 가토', materials: [
    mat(IMG.gem, '1레벨 보석', '1레벨 보석', 16.5),
    mat(IMG.shilling, '실링', '실링', 61494.5),
  ] },
  { minLevel: 1750, label: '1750 가토', materials: [mat(IMG.gem, '1레벨 보석', '1레벨 보석', 11.8)] },
  { minLevel: 1730, label: '1730 가토', materials: [mat(IMG.gem, '1레벨 보석', '1레벨 보석', 10.5)] },
  { minLevel: 1720, label: '1720 가토', materials: [mat(IMG.gem, '1레벨 보석', '1레벨 보석', 6.4)] },
  { minLevel: 1700, label: '1700 가토', materials: [mat(IMG.gem, '1레벨 보석', '1레벨 보석', 5.3)] },
  { minLevel: 1680, label: '1680 가토', materials: [mat(IMG.gem, '1레벨 보석', '1레벨 보석', 5.2)] },
];

// ── 카오스 게이트 / 필드보스 — 원정대 공통(1캐릭만), 1회 기준 + 주간 발생 요일 ──
export type EventTierKey = '1730' | '1750';

export type EventContent = {
  key: string;
  name: string;
  shortName: string;
  image: string;
  color: string;
  perWeek: number;  // 주간 발생 횟수
  days: number[];   // 발생 요일 (0=일 ~ 6=토)
  gold: Record<EventTierKey, number>;      // 회당 귀속 골드
  byTier: Record<EventTierKey, ContentMaterial[]>;
};

// 순서는 마이페이지·앱 카드 노출 순서다 (필드보스 → 카오스 게이트)
export const EVENT_CONTENTS: EventContent[] = [
  {
    key: 'boss', name: '필드보스', shortName: '필보', image: '/field-boss.webp',
    color: '#b91c1c', perWeek: 3, days: [2, 5, 0],
    gold: { '1730': 0, '1750': 0 },
    byTier: {
      '1730': [
        mat(IMG.destructionCrystal, '파괴석 결정', '파결', 486.3),
        mat(IMG.guardianCrystal, '수호석 결정', '수결', 1484.4),
        mat(IMG.greatBreakthrough, '위대한 돌파석', '위돌', 41.1),
        mat(IMG.lava, '용숨', '용숨', 3),
        mat(IMG.glacier, '빙숨', '빙숨', 3),
        mat(IMG.gem, '1레벨 보석', '보석', 21),
        mat(IMG.blessing, '천상 입장권', '천상',0.5),
      ],
      '1750': [
        mat(IMG.destructionCrystal, '파괴석 결정', '파결', 699.3),
        mat(IMG.guardianCrystal, '수호석 결정', '수결', 2077.3),
        mat(IMG.greatBreakthrough, '위대한 돌파석', '위돌', 51),
        mat(IMG.lava, '용숨', '용숨', 3),
        mat(IMG.glacier, '빙숨', '빙숨', 3),
        mat(IMG.gem, '1레벨 보석', '보석', 21),
        mat(IMG.blessing, '천상 입장권', '천상',0.5),
      ],
    },
  },
  {
    key: 'gate', name: '카오스 게이트', shortName: '카게', image: '/chaos-gate.webp',
    color: '#6b21a8', perWeek: 4, days: [1, 4, 6, 0],
    gold: { '1730': 3500, '1750': 5000 },
    byTier: {
      '1730': [
        mat(IMG.lava, '용숨', '용숨', 6),
        mat(IMG.glacier, '빙숨', '빙숨', 6),
        mat(IMG.gold, '귀속골드', '귀속골드', 3500),
        mat(IMG.fragment, '운명의 파편', '운파', 12000),
        mat(IMG.gem, '1레벨 보석', '보석', 6),
      ],
      '1750': [
        mat(IMG.lava, '용숨', '용숨', 7),
        mat(IMG.glacier, '빙숨', '빙숨', 7),
        mat(IMG.gold, '귀속골드', '귀속골드', 5000),
        mat(IMG.fragment, '운명의 파편', '운파', 13500),
        mat(IMG.gem, '1레벨 보석', '보석', 7),
      ],
    },
  },
];

// ── 할의 모래시계 — 주 1회, 보상강화 0(기본)~5 ──
// 인게임 확인: 모든 티어에서 값 = 0단계값 × (단계+1). 1730·1750은 2026-07-27 전 단계 대조,
// 1770은 2026-08-05 5단계 관측값(3레벨 보석 42·위돌 90·용숨 84·빙숨 84)을 ÷6 역산해 채웠다.
// 보석은 지급 등급이 달라(1730=2레벨, 1750·1770=3레벨) 1레벨 환산 배수를 따로 둔다.
// 모래시계는 1770 티어가 따로 있어 필보·카게의 EventTierKey 와 키를 분리한다.
export type SandRow = { gems: number; stones: number; lavaBreath: number; glacierBreath: number };
export type SandTierKey = EventTierKey | '1770';

export const SAND_TABLE: Record<SandTierKey, SandRow[]> = {
  '1770': [
    { gems: 7, stones: 15, lavaBreath: 14, glacierBreath: 14 },
    { gems: 14, stones: 30, lavaBreath: 28, glacierBreath: 28 },
    { gems: 21, stones: 45, lavaBreath: 42, glacierBreath: 42 },
    { gems: 28, stones: 60, lavaBreath: 56, glacierBreath: 56 },
    { gems: 35, stones: 75, lavaBreath: 70, glacierBreath: 70 },
    { gems: 42, stones: 90, lavaBreath: 84, glacierBreath: 84 },
  ],
  '1750': [
    { gems: 6, stones: 12, lavaBreath: 12, glacierBreath: 12 },
    { gems: 12, stones: 24, lavaBreath: 24, glacierBreath: 24 },
    { gems: 18, stones: 36, lavaBreath: 36, glacierBreath: 36 },
    { gems: 24, stones: 48, lavaBreath: 48, glacierBreath: 48 },
    { gems: 30, stones: 60, lavaBreath: 60, glacierBreath: 60 },
    { gems: 36, stones: 72, lavaBreath: 72, glacierBreath: 72 },
  ],
  '1730': [
    { gems: 15, stones: 10, lavaBreath: 10, glacierBreath: 10 },
    { gems: 30, stones: 20, lavaBreath: 20, glacierBreath: 20 },
    { gems: 45, stones: 30, lavaBreath: 30, glacierBreath: 30 },
    { gems: 60, stones: 40, lavaBreath: 40, glacierBreath: 40 },
    { gems: 75, stones: 50, lavaBreath: 50, glacierBreath: 50 },
    { gems: 90, stones: 60, lavaBreath: 60, glacierBreath: 60 },
  ],
};

// 모래시계 보석 1레벨 환산 배수 (1730=2레벨 ×3, 1750·1770=3레벨 ×9)
export const SAND_GEM_TO_LV1: Record<SandTierKey, number> = { '1730': 3, '1750': 9, '1770': 9 };

// 거래소에 상장되지 않아 시세 추적이 안 되는 재화의 고정 단가.
// 시세가 붙는 재화는 PriceContext 에서 실시간으로 가져오고, 여기 있는 것만 고정값을 쓴다.
export const FIXED_PRICES: Record<string, number> = {
  '천상 입장권': 3000,
};

// ── 가디언 토벌 주간 로테이션 ──
export const GUARDIAN_ROTATION = [
  { name: '쿤겔라니움', element: '뇌구', image: '/znsrpf.webp' },
  { name: '하누마탄', element: '무속성', image: '/gksn.webp' },
  { name: '데스칼루다', element: '수구', image: '/eptm.webp' },
  { name: '이그렉시온', element: '화구', image: '/dlrm.webp' },
  { name: '벨가누스', element: '세구', image: '/qpfrk.webp' },
  { name: '아카테스', element: '암구', image: '/dkzk.webp' },
  { name: '엘버하스틱', element: '수구', image: '/dpfqj.webp' },
];

export const GUARDIAN_FIXED = [
  { minLevel: 1720, name: '크라티오스', element: '뇌구', image: '/zmfk.webp' },
  { minLevel: 1700, name: '드렉탈라스', element: '화구', image: '/emfpr.webp' },
  { minLevel: 1680, name: '스콜라키아', element: '토구', image: '/tmzhf.webp' },
  { minLevel: 1640, name: '아게오로스', element: '세구', image: '/dkrp.webp' },
];

// 기준주(수) = 쿤겔라니움(인덱스 0)
export const GUARDIAN_REF_WEEK = '2026-06-24';

// ── 레이드 그룹 카드 이미지 ──
export const RAID_CARD_IMAGES: Record<string, string> = {
  '벨가르딘': '/belgardin2.webp',
  '지평의 성당': '/wlvuddmltjdekd1.webp',
  '성당': '/wlvuddmltjdekd1.webp',
  '세르카': '/cerka2.webp',
  '종막': '/abrelshud.webp',
  '4막': '/illiakan.webp',
  '3막': '/ivory-tower.webp',
  '2막': '/kazeros.webp',
  '1막': '/aegir.webp',
  '서막': '/echidna.webp',
  '베히모스': '/behemoth.webp',
};

// ── 공통 헬퍼 ──

// 선택 레벨에 맞는 티어 (가장 높은 minLevel ≤ level). 하한 미만이면 null.
export function findTier(tiers: ContentTier[], level: number): ContentTier | null {
  return tiers.find(t => level >= t.minLevel) ?? null;
}

export const eventTierOf = (level: number): EventTierKey => (level >= 1750 ? '1750' : '1730');

// 모래시계 전용 티어 (1770 티어가 있음 — 필보·카게는 1750 이 최고 티어라 eventTierOf 를 쓴다)
export const sandTierOf = (level: number): SandTierKey => (level >= 1770 ? '1770' : eventTierOf(level));

// 모래시계 1회 보상 (보석은 1레벨 환산). 단계는 0~5.
export function getSandMaterials(tier: SandTierKey, enhance: number): ContentMaterial[] {
  const row = SAND_TABLE[tier][Math.max(0, Math.min(5, enhance))];
  return [
    mat(IMG.gem, '1레벨 보석', '보석', row.gems * SAND_GEM_TO_LV1[tier]),
    mat(IMG.greatBreakthrough, '위대한 돌파석', '위돌', row.stones),
    mat(IMG.lava, '용숨', '용숨', row.lavaBreath),
    mat(IMG.glacier, '빙숨', '빙숨', row.glacierBreath),
  ];
}
