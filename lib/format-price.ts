// 시세 칸용 짧은 골드 표기 — "오늘의 시세" 카드와 차트 위 아이템 버튼이 같은 표기를 쓴다.
// 10만 이상은 "만" 단위(100만 넘으면 정수), 1만대는 소수 둘째 자리, 100 이상은 정수, 그 아래는 소수 한 자리.
export function formatShortPrice(price: number): string {
  if (price >= 100000) {
    const man = price / 10000;
    return man >= 100 ? `${Math.round(man)}만` : `${man.toFixed(1)}만`;
  }
  if (price >= 10000) {
    const man = price / 10000;
    return `${man.toFixed(2)}만`;
  }
  if (price >= 100) {
    return Math.round(price).toLocaleString('ko-KR');
  }
  return price.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// 아이콘 88px 사본 경로 — 원본(256px) 옆에 `이름-88.webp` 로 둔다. 사본이 없으면 onError 에서 원본으로 되돌린다.
export const smallIcon = (icon: string) => icon.replace(/\.webp(\?|$)/, '-88.webp$1');
