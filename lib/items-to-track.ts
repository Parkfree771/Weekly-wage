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
export type ItemCategory = 'refine_succession' | 'refine' | 'refine_additional' | 'gem' | 'engraving' | 'accessory' | 'jewel';

// 재련 추가 재료 서브카테고리 타입
export type RefineAdditionalSubCategory = 'weapon' | 'armor';

// 계승 재련 재료 → 일반 재련 재료 매핑 (5:1 교환 비율)
// 아비도스 제외
export const SUCCESSION_TO_NORMAL_MATERIAL_MAP: Record<string, { normalId: string; ratio: number; normalIcon: string }> = {
  '66102007': { normalId: '66102006', ratio: 5, normalIcon: '/destiny-destruction-stone.webp' },  // 파괴석 결정 → 파괴석
  '66102107': { normalId: '66102106', ratio: 5, normalIcon: '/destiny-guardian-stone.webp' },    // 수호석 결정 → 수호석
  '66110226': { normalId: '66110225', ratio: 5, normalIcon: '/destiny-breakthrough-stone.webp' } // 위대한 돌파석 → 돌파석
};

// 계승 재련 재료 데이터 시작일 (2025-01-07, 세르카 업데이트)
export const SUCCESSION_MATERIAL_START_DATE = '2025-01-07';

// 서브카테고리 정보
export const REFINE_ADDITIONAL_SUBCATEGORIES: Record<RefineAdditionalSubCategory, { label: string; ids: string[] }> = {
  weapon: {
    label: '무기 보조 재료',
    // 야금술 아이템들 + 용암의 숨결
    ids: ['66111131', '66112553', '66112551', '66112543', '66112717', '66112715', '66112713', '66112711']
  },
  armor: {
    label: '방어구 보조 재료',
    // 재봉술 아이템들 + 빙하의 숨결
    ids: ['66111132', '66112554', '66112552', '66112546', '66112718', '66112716', '66112714', '66112712']
  }
};

// 추적할 아이템 목록
export const TRACKED_ITEMS: TrackedItem[] = [
  // === 0. 계승 재련 재료 ===
  {
    id: '6861013',
    name: '상급 아비도스 융화 재료',
    type: 'market',
    icon: '/abidos-fusion2.webp?v=3',
    iconBorderColor: '#c2410c' // 세르카 주황
  },
  {
    id: '66102007',
    name: '운명의 파괴석 결정',
    type: 'market',
    icon: '/destiny-destruction-stone2.webp?v=3',
    iconBorderColor: '#c2410c' // 세르카 주황
  },
  {
    id: '66102107',
    name: '운명의 수호석 결정',
    type: 'market',
    icon: '/destiny-guardian-stone2.webp?v=3',
    iconBorderColor: '#c2410c' // 세르카 주황
  },
  {
    id: '66110226',
    name: '위대한 운명의 돌파석',
    type: 'market',
    icon: '/destiny-breakthrough-stone2.webp?v=3',
    iconBorderColor: '#c2410c' // 세르카 주황
  },

  // === 1. 재련 재료 ===
  {
    id: '6861012',
    name: '아비도스 융화 재료',
    type: 'market',
    icon: '/abidos-fusion.webp?v=3',
    iconBorderColor: '#6366f1' // 인디고
  },
  {
    id: '6861011',
    name: '최상급 오레하 융화 재료',
    type: 'market',
    icon: '/oreha-fusion-superior.webp',
    iconBorderColor: '#6366f1' // 인디고
  },
  {
    id: '66130143',
    name: '운명의 파편 주머니(대)',
    type: 'market',
    icon: '/destiny-shard-bag-large.webp',
    iconBorderColor: '#6366f1' // 인디고
  },
  {
    id: '66130133',
    name: '명예의 파편 주머니(대)',
    type: 'market',
    icon: '/honor-shard-bag-large.webp',
    iconBorderColor: '#6366f1' // 인디고
  },
  {
    id: '66102006',
    name: '운명의 파괴석',
    type: 'market',
    icon: '/destiny-destruction-stone.webp',
    iconBorderColor: '#6366f1' // 인디고
  },
  {
    id: '66102106',
    name: '운명의 수호석',
    type: 'market',
    icon: '/destiny-guardian-stone.webp',
    iconBorderColor: '#6366f1' // 인디고
  },
  {
    id: '66110225',
    name: '운명의 돌파석',
    type: 'market',
    icon: '/destiny-breakthrough-stone.webp',
    iconBorderColor: '#6366f1' // 인디고
  },

  // === 2. 재련 추가 재료 ===
  {
    id: '66112553',
    name: '야금술 : 업화 [19-20] (무기)',
    type: 'market',
    icon: '/metallurgy-karma.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112551',
    name: '야금술 : 업화 [15-18] (무기)',
    type: 'market',
    icon: '/metallurgy-karma.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112543',
    name: '야금술 : 업화 [11-14] (무기)',
    type: 'market',
    icon: '/metallurgy-karma.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112554',
    name: '재봉술 : 업화 [19-20] (방어구)',
    type: 'market',
    icon: '/tailoring-karma.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112552',
    name: '재봉술 : 업화 [15-18] (방어구)',
    type: 'market',
    icon: '/tailoring-karma.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112546',
    name: '재봉술 : 업화 [11-14] (방어구)',
    type: 'market',
    icon: '/tailoring-karma.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112718',
    name: '장인의 재봉술 : 4단계 (방어구)',
    type: 'market',
    icon: '/master-tailoring-4.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112716',
    name: '장인의 재봉술 : 3단계 (방어구)',
    type: 'market',
    icon: '/master-tailoring-3.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112714',
    name: '장인의 재봉술 : 2단계 (방어구)',
    type: 'market',
    icon: '/master-tailoring-2.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112712',
    name: '장인의 재봉술 : 1단계 (방어구)',
    type: 'market',
    icon: '/master-tailoring-1.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112717',
    name: '장인의 야금술 : 4단계 (무기)',
    type: 'market',
    icon: '/master-metallurgy-4.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112715',
    name: '장인의 야금술 : 3단계 (무기)',
    type: 'market',
    icon: '/master-metallurgy-3.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112713',
    name: '장인의 야금술 : 2단계 (무기)',
    type: 'market',
    icon: '/master-metallurgy-2.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66112711',
    name: '장인의 야금술 : 1단계 (무기)',
    type: 'market',
    icon: '/master-metallurgy-1.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66111131',
    name: '용암의 숨결',
    type: 'market',
    icon: '/breath-lava.webp',
    iconBorderColor: '#059669'
  },
  {
    id: '66111132',
    name: '빙하의 숨결',
    type: 'market',
    icon: '/breath-glacier.webp',
    iconBorderColor: '#059669'
  },

  // === 3. 젬 ===
  {
    id: '67400003',
    name: '질서의 젬 : 안정',
    type: 'market',
    icon: '/gem-order-stable.webp?v=3',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67400103',
    name: '질서의 젬 : 견고',
    type: 'market',
    icon: '/gem-order-solid.webp?v=3',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67400203',
    name: '질서의 젬 : 불변',
    type: 'market',
    icon: '/gem-order-immutable.webp?v=3',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67410303',
    name: '혼돈의 젬 : 침식',
    type: 'market',
    icon: '/gem-chaos-erosion.webp?v=3',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67410403',
    name: '혼돈의 젬 : 왜곡',
    type: 'market',
    icon: '/gem-chaos-distortion.webp?v=3',
    iconBorderColor: '#4B0082' // 보라색
  },
  {
    id: '67410503',
    name: '혼돈의 젬 : 붕괴',
    type: 'market',
    icon: '/gem-chaos-collapse.webp?v=3',
    iconBorderColor: '#4B0082' // 보라색
  },

  // === 4. 유물 각인서 (거래소) ===
  {
    id: '65203905',
    name: '아드레날린',
    displayName: '유물 각인서: 아드레날린',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35' // 주황색
  },
  {
    id: '65200505',
    name: '원한',
    displayName: '유물 각인서: 원한',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203305',
    name: '돌격대장',
    displayName: '유물 각인서: 돌격대장',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65201005',
    name: '예리한 둔기',
    displayName: '유물 각인서: 예리한 둔기',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203505',
    name: '질량 증가',
    displayName: '유물 각인서: 질량 증가',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65202805',
    name: '저주받은 인형',
    displayName: '유물 각인서: 저주받은 인형',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203005',
    name: '기습의 대가',
    displayName: '유물 각인서: 기습의 대가',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203705',
    name: '타격의 대가',
    displayName: '유물 각인서: 타격의 대가',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65203405',
    name: '각성',
    displayName: '유물 각인서: 각성',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65204105',
    name: '전문의',
    displayName: '유물 각인서: 전문의',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65200605',
    name: '슈퍼차지',
    displayName: '유물 각인서: 슈퍼차지',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },
  {
    id: '65201505',
    name: '결투의 대가',
    displayName: '유물 각인서: 결투의 대가',
    type: 'market',
    icon: '/engraving.webp',
    iconBorderColor: '#ff6b35'
  },

  // === 5. 악세 (경매장) ===
  // 목걸이 (중/상 조합)
  {
    id: 'auction_necklace_ancient_refine3',
    name: '고대 목걸이 적주피(상), 추피(중)',
    displayName: '적에게 주는 피해 증가 2.0% (상)\n추가 피해 1.6% (중)\n품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200010, // 목걸이
    icon: '/ancient-necklace.webp',
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
    icon: '/ancient-ring.webp',
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
    icon: '/ancient-earring.webp',
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
    icon: '/ancient-necklace.webp',
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
    icon: '/ancient-ring.webp',
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
    icon: '/ancient-earring.webp',
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
    displayName: '낙인력 8.0% (상)\n아덴 획득량 증가 3.6% (중)\n품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200010, // 목걸이
    icon: '/ancient-necklace.webp',
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
    displayName: '낙인력 8.0% (상)\n아덴 획득량 증가 6.0% (상)\n품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200010, // 목걸이
    icon: '/ancient-necklace.webp',
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
    name: '고대 반지 아피강(상), 아공강(중)',
    displayName: '아군 피해량 강화 효과 7.5% (상)\n아군 공격력 강화 효과 3.0% (중)\n품질 70 이상, 3단계 연마',
    type: 'auction',
    searchName: '',
    categoryCode: 200030, // 반지
    icon: '/ancient-ring.webp',
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
    icon: '/ancient-ring.webp',
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

  // === 6. 보석 (경매장) ===
  {
    id: 'auction_gem_fear_8',
    name: '8레벨 겁화의 보석',
    type: 'auction',
    searchName: '8레벨 겁화의 보석',
    categoryCode: 210000, // 보석 카테고리
    icon: '/gem-fear-8.webp',
    iconBorderColor: '#9333ea', // 보라색
    filters: {
      ItemTier: 4
    }
  },
  {
    id: 'auction_gem_fear_9',
    name: '9레벨 겁화의 보석',
    type: 'auction',
    searchName: '9레벨 겁화의 보석',
    categoryCode: 210000, // 보석 카테고리
    icon: '/gem-fear-8.webp', // 8레벨과 동일한 이미지
    iconBorderColor: '#9333ea', // 보라색
    filters: {
      ItemTier: 4
    }
  },
  {
    id: 'auction_gem_fear_10',
    name: '10레벨 겁화의 보석',
    type: 'auction',
    searchName: '10레벨 겁화의 보석',
    categoryCode: 210000,
    icon: '/gem-fear-10.webp',
    iconBorderColor: '#9333ea', // 보라색
    filters: {
      ItemTier: 4
    }
  },
  {
    id: 'auction_gem_flame_10',
    name: '10레벨 작열의 보석',
    type: 'auction',
    searchName: '10레벨 작열의 보석',
    categoryCode: 210000,
    icon: '/gem-flame-10.webp',
    iconBorderColor: '#dc2626', // 빨간색
    filters: {
      ItemTier: 4
    }
  }
];

// 재련 추가 재료 서브카테고리별 아이템 필터 함수
export function getItemsBySubCategory(subCategory: RefineAdditionalSubCategory): TrackedItem[] {
  const ids = REFINE_ADDITIONAL_SUBCATEGORIES[subCategory]?.ids || [];
  const itemsById = TRACKED_ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<string, TrackedItem>);

  return ids.map(id => itemsById[id]).filter((item): item is TrackedItem => !!item);
}

// 카테고리별 아이템 필터 함수
export function getItemsByCategory(category: ItemCategory): TrackedItem[] {
  const categoryMap: Record<ItemCategory, string[]> = {
    refine_succession: ['66102007', '66102107', '66110226', '6861013'],
    refine: ['6861012', '6861011', '66130143', '66130133', '66102006', '66102106', '66110225'],
    refine_additional: ['66112553', '66112551', '66112543', '66112554', '66112552', '66112546', '66112718', '66112716', '66112714', '66112712', '66112717', '66112715', '66112713', '66112711', '66111131', '66111132'],
    gem: ['67400003', '67400103', '67400203', '67410303', '67410403', '67410503'],
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

// 아이템 ID로 아이템과 카테고리 찾기
export function findItemById(itemId: string): { item: TrackedItem; category: ItemCategory; subCategory?: RefineAdditionalSubCategory } | null {
  const categoryMap: Record<ItemCategory, string[]> = {
    refine_succession: ['66102007', '66102107', '66110226', '6861013'],
    refine: ['6861012', '6861011', '66130143', '66130133', '66102006', '66102106', '66110225'],
    refine_additional: ['66112553', '66112551', '66112543', '66112554', '66112552', '66112546', '66112718', '66112716', '66112714', '66112712', '66112717', '66112715', '66112713', '66112711', '66111131', '66111132'],
    gem: ['67400003', '67400103', '67400203', '67410303', '67410403', '67410503'],
    engraving: ['65203905', '65200505', '65203305', '65201005', '65203505', '65202805', '65203005', '65203705', '65203405', '65204105', '65200605', '65201505'],
    accessory: ['auction_necklace_ancient_refine3', 'auction_ring_ancient_refine3', 'auction_earring_ancient_refine3', 'auction_necklace_ancient_refine3_high', 'auction_ring_ancient_refine3_high', 'auction_earring_ancient_refine3_high', 'auction_necklace_support_refine3', 'auction_necklace_support_refine3_high', 'auction_ring_support_refine3', 'auction_ring_support_refine3_high'],
    jewel: ['auction_gem_fear_8', 'auction_gem_fear_9', 'auction_gem_fear_10', 'auction_gem_flame_10']
  };

  const item = TRACKED_ITEMS.find(i => i.id === itemId);
  if (!item) return null;

  for (const [category, ids] of Object.entries(categoryMap)) {
    if (ids.includes(itemId)) {
      // 재련 추가 재료인 경우 서브카테고리도 찾기
      if (category === 'refine_additional') {
        for (const [subCat, subInfo] of Object.entries(REFINE_ADDITIONAL_SUBCATEGORIES)) {
          if (subInfo.ids.includes(itemId)) {
            return { item, category: category as ItemCategory, subCategory: subCat as RefineAdditionalSubCategory };
          }
        }
      }
      return { item, category: category as ItemCategory };
    }
  }

  return null;
}
