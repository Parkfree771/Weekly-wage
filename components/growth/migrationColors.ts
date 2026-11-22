// 이관 미리보기 색 — 화면(GrowthMigration)과 기준 말풍선(MigrationInfo)이 같이 쓴다

// 장비 등급 — 게임 등급색 (고급 · 희귀 · 영웅 · 전설 · 유물 · 고대)
export const GRADE_COLORS = ['#4f9a2c', '#2f6fd6', '#8b3fd1', '#d08a00', '#d4551a', '#a88a4c'];
export const ESTHER_COLOR = '#138f95';
// 순위 색 — 1위가 가장 뜨거운 색, 아래로 갈수록 식는다 (주문서 등급 · 팔찌 티어 공통)
export const RANK_COLORS = ['#d4551a', '#d08a00', '#8b3fd1', '#2f6fd6', '#4f9a2c', '#6b7280'];
// 상 · 중 · 하 — 게임 툴팁 글자색
export const VALUE_COLORS: Record<string, string> = { 상: '#e8722a', 중: '#a046e0', 하: '#2f8fd6' };
// 팔찌 티어 — 같은 숫자 티어는 같은 색, '+' 는 그 티어 안의 윗칸
export const tierColor = (t: string) => RANK_COLORS[Number(t[0]) - 1];
