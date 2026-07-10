// 아이템 등급 → 색상. characterData.ts에서 분리 —
// 클라이언트 컴포넌트가 이 색상 하나 때문에 characterData(+characterTables ~120KB)
// 전체를 번들에 끌어들이지 않도록 경량 모듈로 둔다.
export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    '에스더': '#3dd2cc',
    '고대': '#d97706',
    '유물': '#9333ea',
    '영웅': '#3b82f6',
    '희귀': '#10b981',
    '전설': '#f59e0b',
  };
  return colors[grade] || '#6b7280';
}
