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

// 카테고리 타입
export type ItemCategory = 'fusion' | 'gem' | 'engraving' | 'accessory' | 'jewel';

// 추적할 아이템 목록
export const TRACKED_ITEMS: TrackedItem[] = [
  // === 1. 융화재료 ===
  {
    id: '6861012',
    name: '아비도스 융화 재료',
    type: 'market',
    icon: '/abidos-fusion.png',
    iconBorderColor: '#D97706' // 오렌지
  },
  {
    id: '6861011',
    name: '최상급 오레하 융화 재료',
    type: 'market',
    icon: '/oreha-fusion-superior.png',
    iconBorderColor: '#D97706' // 오렌지
  },

  // === 2. 젬 ===
  {
    id: '67400003',
    name: '질서의 젬 : 안정',
    type: 'market',
    icon: '/gem-order-stable.png',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67400103',
    name: '질서의 젬 : 견고',
    type: 'market',
    icon: '/gem-order-solid.png',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67410303',
    name: '혼돈의 젬 : 침식',
    type: 'market',
    icon: '/gem-chaos-erosion.png',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67410403',
    name: '혼돈의 젬 : 왜곡',
    type: 'market',
    icon: '/gem-chaos-distortion.png',
    iconBorderColor: '#4B0082' // 보라색
  },

  // === 3. 유물 각인서 (거래소) ===
  {
    id: '65203905',
    name: '아드레날린',
    displayName: '유물 각인서: 아드레날린',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35' // 주황색
  },
  {
    id: '65200505',
    name: '원한',
    displayName: '유물 각인서: 원한',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203305',
    name: '돌격대장',
    displayName: '유물 각인서: 돌격대장',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65201005',
    name: '예리한 둔기',
    displayName: '유물 각인서: 예리한 둔기',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203505',
    name: '질량 증가',
    displayName: '유물 각인서: 질량 증가',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65202805',
    name: '저주받은 인형',
    displayName: '유물 각인서: 저주받은 인형',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203005',
    name: '기습의 대가',
    displayName: '유물 각인서: 기습의 대가',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203705',
    name: '타격의 대가',
    displayName: '유물 각인서: 타격의 대가',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203405',
    name: '각성',
    displayName: '유물 각인서: 각성',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65204105',
    name: '전문의',
    displayName: '유물 각인서: 전문의',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65200605',
    name: '슈퍼차지',
    displayName: '유물 각인서: 슈퍼차지',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65201505',
    name: '결투의 대가',
    displayName: '유물 각인서: 결투의 대가',
    type: 'market',
    icon: '/engraving.png',
    iconBorderColor: '#ff6b35'
  },

  // === 4. 악세 (경매장) ===
  // 목걸이 (중/상 조합)
  {
    id: 'auction_necklace_ancient_refine3',
    name: '고대 목걸이 적주피(상), 추피(중)',
    displayName: '적에게 주는 피해 증가 2.0% (상)\n추가 피해 1.6% (중)\n품질 70 이상, 3단계 연마',
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
    displayName: '치명타 피해 4.0% (상)\n치명타 적중률 0.95% (중)\n품질 70 이상, 3단계 연마',
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
    displayName: '공격력 % 1.55% (상)\n무기 공격력 % 1.80% (중)\n품질 70 이상, 3단계 연마',
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
  },

  // 6번째 줄 - 경매장 장신구: 목걸이 (상/상 조합)
  {
    id: 'auction_necklace_ancient_refine3_high',
    name: '고대 목걸이 적주피(상), 추피(상)',
    displayName: '적에게 주는 피해 증가 2.0% (상)\n추가 피해 2.6% (상)\n품질 70 이상, 3단계 연마',
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
          MinValue: 260, // 2.6% * 100
          MaxValue: 260 // 정확히 2.6%
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

  // 7번째 줄 - 경매장 장신구: 반지 (상/상 조합)
  {
    id: 'auction_ring_ancient_refine3_high',
    name: '고대 반지 치피(상), 치적(상)',
    displayName: '치명타 피해 4.0% (상)\n치명타 적중률 1.55% (상)\n품질 70 이상, 3단계 연마',
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
          MinValue: 155, // 1.55% * 100
          MaxValue: 155 // 정확히 1.55%
        }
      ]
    }
  },

  // 귀걸이 (상/상 조합)
  {
    id: 'auction_earring_ancient_refine3_high',
    name: '고대 귀걸이 공%(상), 무공%(상)',
    displayName: '공격력 % 1.55% (상)\n무기 공격력 % 3.0% (상)\n품질 70 이상, 3단계 연마',
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
          MinValue: 300, // 3.0% * 100
          MaxValue: 300 // 정확히 3.0%
        }
      ]
    }
  },

  // 서포터 목걸이 (상/중 조합)
  {
    id: 'auction_necklace_support_refine3',
    name: '고대 목걸이 낙인력(상), 게이지(중)',
    displayName: '낙인력 8.0% (상)\n세레나데/신앙/조화 게이지 획득량 증가 3.6% (중)\n품질 70 이상, 3단계 연마',
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
          SecondOption: 44, // 낙인력
          MinValue: 800, // 800
          MaxValue: 800 // 정확히 800
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 43, // 세레나데, 신앙, 조화 게이지 획득량 증가
          MinValue: 360, // 360
          MaxValue: 600 // 600까지 (중)
        }
      ]
    }
  },

  // 서포터 목걸이 (상/상 조합)
  {
    id: 'auction_necklace_support_refine3_high',
    name: '고대 목걸이 낙인력(상), 게이지(상)',
    displayName: '낙인력 8.0% (상)\n세레나데/신앙/조화 게이지 획득량 증가 6.0% (상)\n품질 70 이상, 3단계 연마',
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
          SecondOption: 44, // 낙인력
          MinValue: 800, // 800
          MaxValue: 800 // 정확히 800
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 43, // 세레나데, 신앙, 조화 게이지 획득량 증가
          MinValue: 600, // 600
          MaxValue: 600 // 정확히 600
        }
      ]
    }
  },

  // 서포터 반지 (상/중 조합)
  {
    id: 'auction_ring_support_refine3',
    name: '고대 반지 아공강(상), 아피강(중)',
    displayName: '아군 공격력 강화 효과 3.0% (상)\n아군 피해량 강화 효과 7.5% (중)\n품질 70 이상, 3단계 연마',
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
          SecondOption: 51, // 아군 공격력 강화 효과
          MinValue: 300, // 300
          MaxValue: 300 // 정확히 300
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 52, // 아군 피해량 강화 효과
          MinValue: 750, // 750
          MaxValue: 750 // 정확히 750
        }
      ]
    }
  },

  // 서포터 반지 (상/상 조합)
  {
    id: 'auction_ring_support_refine3_high',
    name: '고대 반지 아공강(상), 아피강(상)',
    displayName: '아군 공격력 강화 효과 5.0% (상)\n아군 피해량 강화 효과 7.5% (상)\n품질 70 이상, 3단계 연마',
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
          SecondOption: 51, // 아군 공격력 강화 효과
          MinValue: 500, // 500
          MaxValue: 500 // 정확히 500
        },
        {
          FirstOption: 7, // 연마 효과
          SecondOption: 52, // 아군 피해량 강화 효과
          MinValue: 750, // 750
          MaxValue: 750 // 정확히 750
        }
      ]
    }
  },

  // === 5. 보석 (경매장) ===
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
    id: 'auction_gem_fear_9',
    name: '9레벨 겁화의 보석',
    type: 'auction',
    searchName: '9레벨 겁화',
    categoryCode: 210000, // 보석 카테고리
    icon: '/gem-fear-8.png', // 8레벨과 동일한 이미지
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
  }
];

// 카테고리별 아이템 필터 함수
export function getItemsByCategory(category: ItemCategory): TrackedItem[] {
  const categoryMap: Record<ItemCategory, string[]> = {
    fusion: ['6861012', '6861011'],
    gem: ['67400003', '67400103', '67410303', '67410403'],
    engraving: ['65203905', '65200505', '65203305', '65201005', '65203505', '65202805', '65203005', '65203705', '65203405', '65204105', '65200605', '65201505'],
    accessory: ['auction_necklace_ancient_refine3', 'auction_ring_ancient_refine3', 'auction_earring_ancient_refine3', 'auction_necklace_ancient_refine3_high', 'auction_ring_ancient_refine3_high', 'auction_earring_ancient_refine3_high', 'auction_necklace_support_refine3', 'auction_necklace_support_refine3_high', 'auction_ring_support_refine3', 'auction_ring_support_refine3_high'],
    jewel: ['auction_gem_fear_8', 'auction_gem_fear_9', 'auction_gem_fear_10', 'auction_gem_flame_10']
  };

  const ids = categoryMap[category] || [];
  const itemsById = TRACKED_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<string, TrackedItem>);

  return ids.map(id => itemsById[id]).filter((item): item is TrackedItem => !!item);
}
