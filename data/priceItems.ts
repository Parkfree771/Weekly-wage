// 시세 표시 아이템 단일 원본 — "오늘의 시세" 대시보드와 매수가 보드가 같은 목록을 쓴다.
// (원래 PriceDashboard.tsx 안에 있었는데, 다른 컴포넌트가 쓰려면 그 컴포넌트를 통째로
//  import 해야 해서 데이터만 여기로 뺐다. id 는 거래소 아이템 코드 / 경매장은 auction_ 접두.)
export type PriceItem = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
};

// 거래소 + 경매장 아이템 표시
export const PRICE_ITEMS: PriceItem[] = [
  // 계승 재련 재료
  { id: '66150010', name: '에스더의 기운', shortName: '에스더', icon: '/dptmej.webp' },
  { id: '66102007', name: '운명의 파괴석 결정', shortName: '파결', icon: '/destiny-destruction-stone2.webp?v=3' },
  { id: '66102107', name: '운명의 수호석 결정', shortName: '수결', icon: '/destiny-guardian-stone2.webp?v=3' },
  { id: '66110226', name: '위대한 운명의 돌파석', shortName: '위운돌', icon: '/destiny-breakthrough-stone2.webp?v=3' },
  { id: '6861013', name: '상급 아비도스 융화 재료', shortName: '상비도스', icon: '/top-abidos-fusion5.webp' },
  // 일반 재련 재료
  { id: '66102006', name: '운명의 파괴석', shortName: '파괴석', icon: '/destiny-destruction-stone5.webp' },
  { id: '66102106', name: '운명의 수호석', shortName: '수호석', icon: '/destiny-guardian-stone5.webp' },
  { id: '66110225', name: '운명의 돌파석', shortName: '돌파석', icon: '/destiny-breakthrough-stone5.webp' },
  { id: '6861012', name: '아비도스 융화 재료', shortName: '아비도스', icon: '/abidos-fusion5.webp?v=4' },
  { id: '66130143', name: '운명의 파편 주머니(대)', shortName: '운파', icon: '/destiny-shard-bag-large5.webp' },
  // 재련 추가 재료
  { id: '66111131', name: '용암의 숨결', shortName: '용숨', icon: '/breath-lava5.webp' },
  { id: '66111132', name: '빙하의 숨결', shortName: '빙숨', icon: '/breath-glacier5.webp' },
  // 유물 각인서 (거래소) - 전체
  { id: '65203905', name: '아드레날린', shortName: '아드', icon: '/engraving.webp' },
  { id: '65200505', name: '원한', shortName: '원한', icon: '/engraving.webp' },
  { id: '65203305', name: '돌격대장', shortName: '돌대', icon: '/engraving.webp' },
  { id: '65201005', name: '예리한 둔기', shortName: '예둔', icon: '/engraving.webp' },
  { id: '65203505', name: '질량 증가', shortName: '질증', icon: '/engraving.webp' },
  { id: '65202805', name: '저주받은 인형', shortName: '저받', icon: '/engraving.webp' },
  { id: '65203005', name: '기습의 대가', shortName: '기습', icon: '/engraving.webp' },
  { id: '65203705', name: '타격의 대가', shortName: '타대', icon: '/engraving.webp' },
  { id: '65203405', name: '각성', shortName: '각성', icon: '/engraving.webp' },
  { id: '65204105', name: '전문의', shortName: '전문의', icon: '/engraving.webp' },
  { id: '65200605', name: '슈퍼차지', shortName: '슈차', icon: '/engraving.webp' },
  { id: '65201505', name: '결투의 대가', shortName: '결대', icon: '/engraving.webp' },
  // 보석 (경매장)
  { id: 'auction_gem_fear_8', name: '8레벨 겁화의 보석', shortName: '8겁화', icon: '/gem-fear-8.webp' },
  { id: 'auction_gem_fear_9', name: '9레벨 겁화의 보석', shortName: '9겁화', icon: '/gem-fear-8.webp' },
  { id: 'auction_gem_fear_10', name: '10레벨 겁화의 보석', shortName: '10겁화', icon: '/gem-fear-10.webp' },
  { id: 'auction_gem_flame_10', name: '10레벨 작열의 보석', shortName: '10작열', icon: '/gem-flame-10.webp' },
  // 악세서리 - 딜러 (경매장)
  { id: 'auction_necklace_ancient_refine3', name: '고대 목걸이 적주피(상)/추피(중)', shortName: '목걸이 상중', icon: '/ancient-necklace.webp' },
  { id: 'auction_necklace_ancient_refine3_high', name: '고대 목걸이 적주피(상)/추피(상)', shortName: '목걸이 상상', icon: '/ancient-necklace.webp' },
  { id: 'auction_ring_ancient_refine3', name: '고대 반지 치피(상)/치적(중)', shortName: '반지 상중', icon: '/ancient-ring.webp' },
  { id: 'auction_ring_ancient_refine3_high', name: '고대 반지 치피(상)/치적(상)', shortName: '반지 상상', icon: '/ancient-ring.webp' },
  { id: 'auction_earring_ancient_refine3', name: '고대 귀걸이 공%(상)/무공%(중)', shortName: '귀걸이 상중', icon: '/ancient-earring.webp' },
  { id: 'auction_earring_ancient_refine3_high', name: '고대 귀걸이 공%(상)/무공%(상)', shortName: '귀걸이 상상', icon: '/ancient-earring.webp' },
  // 악세서리 - 서포터 (경매장)
  { id: 'auction_necklace_support_refine3', name: '고대 목걸이 낙인력(상)/게이지(중)', shortName: '서폿목 상중', icon: '/ancient-necklace.webp' },
  { id: 'auction_necklace_support_refine3_high', name: '고대 목걸이 낙인력(상)/게이지(상)', shortName: '서폿목 상상', icon: '/ancient-necklace.webp' },
  { id: 'auction_ring_support_refine3', name: '고대 반지 아피강(상)/아공강(중)', shortName: '서폿반 상중', icon: '/ancient-ring.webp' },
  { id: 'auction_ring_support_refine3_high', name: '고대 반지 아공강(상)/아피강(상)', shortName: '서폿반 상상', icon: '/ancient-ring.webp' },
  // 팔찌 (경매장)
  { id: 'auction_bracelet_spec_crit', name: '특화 100+ / 치명 100+', shortName: '특치', icon: '/vkfwl.webp' },
  { id: 'auction_bracelet_crit_swift', name: '치명 100+ / 신속 100+', shortName: '치신', icon: '/vkfwl.webp' },
  { id: 'auction_bracelet_spec_swift', name: '특화 100+ / 신속 100+', shortName: '특신', icon: '/vkfwl.webp' },
  // 재련 보조 재료 (야금술=무기 / 재봉술=방어구). 이름·아이콘은 lib/items-to-track.ts 원본과 동일
  { id: '66112555', name: '강화 야금술 : 업화 [19-20] (무기)', shortName: '강야 업19', icon: '/metallurgy-karma.webp' },
  { id: '66112556', name: '강화 재봉술 : 업화 [19-20] (방어구)', shortName: '강재 업19', icon: '/tailoring-karma.webp' },
  { id: '66112553', name: '야금술 : 업화 [19-20] (무기)', shortName: '야 업19', icon: '/metallurgy-karma.webp' },
  { id: '66112551', name: '야금술 : 업화 [15-18] (무기)', shortName: '야 업15', icon: '/metallurgy-karma.webp' },
  { id: '66112543', name: '야금술 : 업화 [11-14] (무기)', shortName: '야 업11', icon: '/metallurgy-karma.webp' },
  { id: '66112554', name: '재봉술 : 업화 [19-20] (방어구)', shortName: '재 업19', icon: '/tailoring-karma.webp' },
  { id: '66112552', name: '재봉술 : 업화 [15-18] (방어구)', shortName: '재 업15', icon: '/tailoring-karma.webp' },
  { id: '66112546', name: '재봉술 : 업화 [11-14] (방어구)', shortName: '재 업11', icon: '/tailoring-karma.webp' },
  { id: '66112562', name: '야금술 : 전율 [16-19] (무기)', shortName: '야 전16', icon: '/metallurgy-thrill.webp' },
  { id: '66112561', name: '야금술 : 전율 [12-15] (무기)', shortName: '야 전12', icon: '/metallurgy-thrill.webp' },
  { id: '66112565', name: '재봉술 : 전율 [16-19] (방어구)', shortName: '재 전16', icon: '/tailoring-thrill.webp' },
  { id: '66112564', name: '재봉술 : 전율 [12-15] (방어구)', shortName: '재 전12', icon: '/tailoring-thrill.webp' },
  { id: '66112717', name: '장인의 야금술 : 4단계 (무기)', shortName: '장야 4', icon: '/master-metallurgy-4.webp' },
  { id: '66112715', name: '장인의 야금술 : 3단계 (무기)', shortName: '장야 3', icon: '/master-metallurgy-3.webp' },
  { id: '66112713', name: '장인의 야금술 : 2단계 (무기)', shortName: '장야 2', icon: '/master-metallurgy-2.webp' },
  { id: '66112711', name: '장인의 야금술 : 1단계 (무기)', shortName: '장야 1', icon: '/master-metallurgy-1.webp' },
  { id: '66112718', name: '장인의 재봉술 : 4단계 (방어구)', shortName: '장재 4', icon: '/master-tailoring-4.webp' },
  { id: '66112716', name: '장인의 재봉술 : 3단계 (방어구)', shortName: '장재 3', icon: '/master-tailoring-3.webp' },
  { id: '66112714', name: '장인의 재봉술 : 2단계 (방어구)', shortName: '장재 2', icon: '/master-tailoring-2.webp' },
  { id: '66112712', name: '장인의 재봉술 : 1단계 (방어구)', shortName: '장재 1', icon: '/master-tailoring-1.webp' },
];

// 묶음 단위 — latest_prices.json 의 가격이 "이 수량" 기준이다.
// 예: 운명의 파괴석 결정 1,126.7G 는 100개 값이므로 개당은 11.267G.
// 개당으로 환산하지 않으면 손익이 100배·3000배로 튄다.
export const PRICE_BUNDLE_SIZE: Record<string, number> = {
  '66102006': 100,   // 운명의 파괴석
  '66102106': 100,   // 운명의 수호석
  '66102007': 100,   // 운명의 파괴석 결정
  '66102107': 100,   // 운명의 수호석 결정
  '66130143': 3000,  // 운명의 파편 주머니(대)
};

/** 그 종목의 묶음 크기 (없으면 1) */
export const bundleOf = (id: string) => PRICE_BUNDLE_SIZE[id] || 1;
