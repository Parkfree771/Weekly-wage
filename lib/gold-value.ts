// 골드 가치 변화 반영 — 시세 차트의 "골드 가치 반영" 토글이 쓰는 원본.
//
// 값은 100골드의 원화 가치(원). 사장님이 주기적으로 점을 추가한다 (정확한 값이 아니라 추세용).
// 점 사이는 직선 보간, 첫 점 이전·마지막 점 이후는 끝 값을 그대로 쓴다.
// 토글을 켜면 과거 가격 × (그 날 가치 / 최신 가치) — 모든 가격을 "지금 골드" 기준으로 환산한다.
// 새 점을 추가할 때: date 는 YYYY-MM-DD, 날짜순으로 넣는다.

export type GoldValuePoint = {
  /** YYYY-MM-DD */
  date: string;
  /** 100골드당 원화 가치 */
  wonPer100: number;
};

export const GOLD_VALUE_POINTS: GoldValuePoint[] = [
  { date: '2025-08-01', wonPer100: 25 },
  { date: '2026-01-07', wonPer100: 25 },   // 세르카
  { date: '2026-03-18', wonPer100: 14 },
  { date: '2026-08-05', wonPer100: 10 },   // 벨가르딘
  { date: '2026-10-21', wonPer100: 5.5 },
];

const DAY_MS = 86400000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const POINTS = GOLD_VALUE_POINTS.map(p => ({ day: toDay(p.date), value: p.wonPer100 }));
const LATEST = POINTS[POINTS.length - 1].value;

/** 그 날의 100골드 가치 (직선 보간) */
export const getGoldValueAt = (date: string): number => {
  const day = toDay(date);
  if (day <= POINTS[0].day) return POINTS[0].value;
  for (let i = 1; i < POINTS.length; i++) {
    const b = POINTS[i];
    if (day <= b.day) {
      const a = POINTS[i - 1];
      return a.value + (b.value - a.value) * (day - a.day) / (b.day - a.day);
    }
  }
  return LATEST;
};

/** 그 날 가격을 지금 골드 가치 기준으로 바꾸는 배율 */
export const getGoldValueFactor = (date: string): number => getGoldValueAt(date) / LATEST;

/** 히스토리 전체를 지금 골드 가치 기준으로 환산 */
export const adjustHistoryForGoldValue = <T extends { price: number; timestamp: string; date?: string }>(history: T[]): T[] =>
  history.map(entry => ({
    ...entry,
    price: entry.price * getGoldValueFactor(entry.date || entry.timestamp.slice(0, 10)),
  }));
