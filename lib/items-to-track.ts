// 추적할 아이템 목록

export type ItemType = 'market' | 'auction';

export type TrackedItem = {
  id: string; // 거래소는 itemId, 경매장은 고유 식별자
  name: string; // 표시 이름
  type: ItemType; // market(거래소) 또는 auction(경매장)
  searchName?: string; // 경매장 검색용 이름
  categoryCode?: number; // 경매장 카테고리 코드
};

// 추적할 아이템 목록 (차트에 표시될 6개 아이템)
export const TRACKED_ITEMS: TrackedItem[] = [
  // 1번째 줄 - 거래소 아이템 3개
  {
    id: '67400003',
    name: '질서의 젬 : 안정',
    type: 'market'
  },
  {
    id: '67400103',
    name: '질서의 젬 : 견고',
    type: 'market'
  },
  {
    id: '6861012',
    name: '아비도스 융화 재료',
    type: 'market'
  },

  // 2번째 줄 - 경매장 아이템 3개 (보석)
  {
    id: 'auction_gem_fear_8',
    name: '8레벨 겁화의 보석',
    type: 'auction',
    searchName: '8레벨 겁화',
    categoryCode: 210000 // 보석 카테고리
  },
  {
    id: 'auction_gem_fear_10',
    name: '10레벨 겁화의 보석',
    type: 'auction',
    searchName: '10레벨 겁화',
    categoryCode: 210000
  },
  {
    id: 'auction_gem_flame_10',
    name: '10레벨 작열의 보석',
    type: 'auction',
    searchName: '10레벨 작열',
    categoryCode: 210000
  }
];
