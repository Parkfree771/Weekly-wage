// 추적할 아이템 목록

export type ItemType = 'market' | 'auction';

export type TrackedItem = {
  id: string; // 거래소는 itemId, 경매장은 고유 식별자
  name: string; // 표시 이름
  type: ItemType; // market(거래소) 또는 auction(경매장)
  displayName?: string; // 차트 상단에 표시될 상세 이름
  searchName?: string; // 경매장 검색용 이름
  categoryCode?: number; // 경매장 카테고리 코드
  icon?: string; // 아이템 아이콘 이미지 경로
  iconBorderColor?: string; // 아이콘 테두리 색상
  // 경매장 고급 필터 옵션
  filters?: {
    ItemGrade?: string; // 아이템 등급 (고대, 유물 등)
    ItemTier?: number; // 아이템 티어
    ItemGradeQuality?: number; // 품질 (0~100)
    ItemLevelMin?: number; // 최소 아이템 레벨
    ItemLevelMax?: number; // 최대 아이템 레벨
    ItemUpgradeLevel?: number; // 연마 단계 (1~3)
    // 연마 효과 필터 (EtcOptions)
    EtcOptions?: Array<{
      FirstOption: number; // 7 = 연마 효과 (성장효과)
      SecondOption: number; // 41 = 추가 피해, 42 = 적 피해증가 등
      MinValue: number; // 실제값 * 100 (1.6% = 160, 2.0% = 200)
      MaxValue: number | null;
    }>;
  };
};

// 추적할 아이템 목록 (차트에 표시될 6개 아이템)
export const TRACKED_ITEMS: TrackedItem[] = [
  // 1번째 줄 - 거래소 아이템 3개
  {
    id: '67400003',
    name: '질서의 젬 : 안정',
    type: 'market',
    icon: '/gem-order-stable.png',
    iconBorderColor: '#d4af37' // 골드
  },
  {
    id: '67400103',
    name: '질서의 젬 : 견고',
    type: 'market',
    icon: '/gem-order-solid.png',
    iconBorderColor: '#d4af37' // 골드
  },
  {
    id: '6861012',
    name: '아비도스 융화 재료',
    type: 'market',
    icon: '/abidos-fusion.png',
    iconBorderColor: '#ff8c00' // 오렌지
  },

  // 2번째 줄 - 경매장 아이템 3개 (보석)
  {
    id: 'auction_gem_fear_8',
    name: '8레벨 겁화의 보석',
    type: 'auction',
    searchName: '8레벨 겁화',
    categoryCode: 210000, // 보석 카테고리
    icon: '/gem-fear-8.png',
    iconBorderColor: '#9333ea' // 보라색
  },
  {
    id: 'auction_gem_fear_10',
    name: '10레벨 겁화의 보석',
    type: 'auction',
    searchName: '10레벨 겁화',
    categoryCode: 210000,
    icon: '/gem-fear-10.png',
    iconBorderColor: '#9333ea' // 보라색
  },
  {
    id: 'auction_gem_flame_10',
    name: '10레벨 작열의 보석',
    type: 'auction',
    searchName: '10레벨 작열',
    categoryCode: 210000,
    icon: '/gem-flame-10.png',
    iconBorderColor: '#dc2626' // 빨간색
  },

  // 3번째 줄 - 경매장 장신구: 목걸이 (연마 필터)
  {
    id: 'auction_necklace_ancient_refine3',
    name: '고대 목걸이 적주피(상), 추피(중)',
    displayName: '고대 목걸이 [적에게 주는 피해 증가 2.0% (상), 추가 피해 1.6% (중)] 품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200010, // 목걸이
    icon: '/ancient-necklace.png',
    iconBorderColor: '#06b6d4', // 청록색 (목걸이)
    filters: {
      ItemGrade: '고대',
      ItemTier: 4,
      ItemGradeQuality: 70,
      ItemUpgradeLevel: 3,
      EtcOptions: [
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 41, // 추가 피해
          MinValue: 160, // 1.6% * 100
          MaxValue: 260 // 2.6% * 100
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 42, // 적에게 주는 피해 증가
          MinValue: 200, // 2.0% * 100
          MaxValue: 200 // 정확히 2.0%
        }
      ]
    }
  },

  // 4번째 줄 - 경매장 장신구: 반지 (연마 필터)
  {
    id: 'auction_ring_ancient_refine3',
    name: '고대 반지 치피(상), 치적(중)',
    displayName: '고대 반지 [치명타 피해 4.0% (상), 치명타 적중률 0.95% (중)] 품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200030, // 반지
    icon: '/ancient-ring.png',
    iconBorderColor: '#3b82f6', // 파란색 (반지)
    filters: {
      ItemGrade: '고대',
      ItemTier: 4,
      ItemGradeQuality: 70,
      ItemUpgradeLevel: 3,
      EtcOptions: [
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 50, // 치명타 피해
          MinValue: 400, // 4.0% * 100
          MaxValue: 400 // 정확히 4.0%
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 49, // 치명타 적중률
          MinValue: 95, // 0.95% * 100
          MaxValue: 155 // 1.55% * 100 (범위)
        }
      ]
    }
  },

  // 5번째 줄 - 경매장 장신구: 귀걸이 (연마 필터)
  {
    id: 'auction_earring_ancient_refine3',
    name: '고대 귀걸이 공%(상), 무공%(중)',
    displayName: '고대 귀걸이 [공격력 % 1.55% (상), 무기 공격력 % 1.80% (중)] 품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200020, // 귀걸이
    icon: '/ancient-earring.png',
    iconBorderColor: '#10b981', // 에메랄드 (귀걸이)
    filters: {
      ItemGrade: '고대',
      ItemTier: 4,
      ItemGradeQuality: 70,
      ItemUpgradeLevel: 3,
      EtcOptions: [
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 45, // 공격력 %
          MinValue: 155, // 1.55% * 100
          MaxValue: 155 // 정확히 1.55%
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 46, // 무기 공격력 %
          MinValue: 180, // 1.80% * 100
          MaxValue: 300 // 3.0% * 100 (범위)
        }
      ]
    }
  }
];
