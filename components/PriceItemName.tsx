'use client';

// 시세 아이템 축약명 표시 — 악세서리는 이름 끝의 등급 글자("상중"/"상상")에 고유색을 입힌다.
// 원래 PriceDashboard 안에만 있던 로직인데 매수가 보드도 같은 표기를 써야 해서 여기로 뺐다.
// 두 곳이 같은 팔레트를 쓰지 않으면 같은 종목이 화면마다 다른 색으로 보인다.
import type { PriceItem } from '@/data/priceItems';

// 카테고리 차트 renderAccessoryItemName 과 동일 팔레트
export const GRADE_CHAR_COLORS: Record<string, string> = {
  '상': '#fbbf24',
  '중': '#a855f7',
  '하': '#3b82f6',
};

const isAccessory = (id: string) =>
  id.startsWith('auction_necklace') || id.startsWith('auction_ring') || id.startsWith('auction_earring');

export default function PriceItemName({ item }: { item: PriceItem }) {
  if (!isAccessory(item.id)) return <>{item.shortName}</>;

  const m = item.shortName.match(/^(.*?)([상중하]+)$/);
  if (!m) return <>{item.shortName}</>;

  return (
    <>
      {m[1]}
      {m[2].split('').map((ch, i) => (
        <span key={i} style={{ color: GRADE_CHAR_COLORS[ch], fontWeight: 800 }}>{ch}</span>
      ))}
    </>
  );
}
