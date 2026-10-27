// 골드 가치 변화 — 시세 차트의 "원화로 보기" 토글이 쓰는 원본.
//
// 값은 100골드의 원화 가치(원). 사장님이 주기적으로 점을 추가한다 (정확한 값이 아니라 추세용).
// 점 사이는 직선 보간, 첫 점 이전·마지막 점 이후는 끝 값을 그대로 쓴다.
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


// ─── 원화 환산 ───
// 토글을 켜면 그 날 가격 × (그 날 100골드 가치 / 100) — "그때 돈으로 얼마였나" 를 원화로 보여준다.
// 골드 값어치가 떨어진 만큼 원화 선은 골드 선보다 더 가파르게 내려간다.

/** 그 날 가격(골드)을 원화로 */
export const goldToWonAt = (gold: number, date: string): number => gold * getGoldValueAt(date) / 100;

/** 히스토리 전체를 그 날의 원화 가치로 환산 */
export const convertHistoryToWon = <T extends { price: number; timestamp: string; date?: string }>(history: T[]): T[] =>
  history.map(entry => ({
    ...entry,
    price: goldToWonAt(entry.price, entry.date || entry.timestamp.slice(0, 10)),
  }));

/**
 * 원화 표기 — 자릿수 그대로("8,700원"). 싼 재료는 1원도 안 돼서 소수점을 남긴다
 * (10원 미만 1자리, 1원 미만 2자리).
 */
export const formatWon = (won: number): string => {
  const a = Math.abs(won);
  if (a >= 10) return `${Math.round(won).toLocaleString('ko-KR')}원`;
  if (a >= 1) return `${won.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원`;
  return `${won.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
};
