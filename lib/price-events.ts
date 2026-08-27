// 시세 차트의 특별 이벤트 점 — 차트(CompactPriceChart)와 이벤트 대비 카드(PriceEventCompare)의 공통 원본.
//
// 두 곳이 같은 점을 그리므로 목록이 갈라지면 안 된다. 여기 한 곳만 고친다.
// 새 이벤트를 추가할 때: date 는 YYYY-MM-DD(KST 기준 그 날의 차트 점), label 은 차트 점 옆에 붙는
// 짧은 이름이라 4~6자를 넘기면 점끼리 겹친다. 이름이 줄임말이면 fullLabel 에 온전한 이름을 적는다.

export type PriceEventInfo = {
  /** YYYY-MM-DD */
  date: string;
  /** 차트 점 라벨 — 짧게 */
  label: string;
  /** 줄임말일 때의 온전한 이름 (이벤트 대비 카드에서 쓴다). 없으면 label 그대로 */
  fullLabel?: string;
  /** 이벤트 고유색 (라이트 테마) — 카드의 배지·미니차트 강조에 쓴다 */
  color: string;
  /** 다크 테마용 밝기 보정색. 어두운 색(벨가르딘 등)은 다크 배경에서 묻히므로 반드시 따로 준다 */
  darkColor: string;
};

// 색은 이벤트 정체성 기준(레이드/방송)으로 하나씩 못 박는다.
// 상승·하락을 뜻하는 초록/빨강 계열은 피한다 — 변동률 색과 헷갈리면 안 된다.
export const PRICE_EVENTS: PriceEventInfo[] = [
  // 7주년 = 기념 → 앰버(금색)
  { date: '2025-11-07', label: '7주년 라방', color: '#d97706', darkColor: '#fbbf24' },
  // 로아온 윈터·썸머는 같은 방송 시리즈라 같은 색을 쓴다 (하늘색). 이름으로 계절이 구분된다.
  { date: '2025-12-07', label: '로아온 윈터', color: '#0284c7', darkColor: '#38bdf8' },
  // 세르카 → 마젠타
  { date: '2026-01-07', label: '세르카', color: '#db2777', darkColor: '#f472b6' },
  // 지평의 성당 → 베이지 (흰 배경에서 묻히지 않게 라이트는 한 톤 진한 탠)
  { date: '2026-03-18', label: '성당', fullLabel: '지평의 성당', color: '#a97c47', darkColor: '#d9c4a0' },
  // 익스트림 1막(홍염)·2막(혹한) → 밝은 보라 한 가족, 막끼리는 한 단계 차이
  { date: '2026-04-22', label: '익스 1막', color: '#9333ea', darkColor: '#c084fc' },
  { date: '2026-05-20', label: '익스 2막', color: '#a855f7', darkColor: '#d8b4fe' },
  { date: '2026-06-20', label: '로아온 썸머', color: '#0284c7', darkColor: '#38bdf8' },
  // 벨가르딘 → 어두운 보라 (다크에서는 묻히므로 두 단계 올린다)
  { date: '2026-08-05', label: '벨가르딘', color: '#5b21b6', darkColor: '#a78bfa' },
];

// 차트의 특별 이벤트 점 색상 — 카테고리 선 색·수요일 보색과 모두 구분되는 제3의 강조색.
// (차트는 점이 작고 여러 개가 한 선 위에 찍혀서, 이벤트마다 색을 달리하면 선을 읽기 어렵다.
//  그래서 차트는 카테고리당 한 색을 유지하고, 이벤트 고유색은 카드에서만 쓴다.)
export const SPECIAL_EVENT_DOT_COLOR_BY_CATEGORY: Record<string, string> = {
  '재련 재료': '#ec4899',      // 핑크 (선=파랑, 보색=주황)
  '젬': '#06b6d4',            // 사이언 (선=보라, 보색=골드)
  '재련 추가 재료': '#8b5cf6', // 바이올렛 (선=초록, 보색=로즈)
  '유물 각인서': '#a855f7',   // 퍼플 (선=빨강, 보색=청록)
  '악세': '#f43f5e',          // 로즈 (선=청록, 보색=주황)
  '팔찌': '#f43f5e',          // 로즈 (선=청록, 보색=주황 / 악세와 동일 정체성)
  '보석': '#f59e0b',          // 앰버 (선=핑크, 보색=청록)
};

export const SPECIAL_EVENT_DOT_FALLBACK = '#ec4899';

/** 카테고리 라벨 → 차트 특별 이벤트 점 색 */
export const getSpecialEventColor = (categoryLabel?: string): string =>
  (categoryLabel && SPECIAL_EVENT_DOT_COLOR_BY_CATEGORY[categoryLabel]) || SPECIAL_EVENT_DOT_FALLBACK;

/** 이벤트 대비 카드용 이름 — 줄임말이면 온전한 이름으로 */
export const getEventDisplayName = (e: PriceEventInfo): string => e.fullLabel || e.label;

/** 테마에 맞는 이벤트 색 */
export const getEventColor = (e: PriceEventInfo, isDark: boolean): string =>
  isDark ? e.darkColor : e.color;
