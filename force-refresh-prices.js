/**
 * 가격 강제 갱신 스크립트
 * Firebase에 데이터는 있는데 사이트에 가격이 안 나올 때 사용
 *
 * 사용법:
 * 1. 전체 갱신: node force-refresh-prices.js
 * 2. 특정 아이템만: node force-refresh-prices.js 66102106 66102006
 */

require('dotenv').config({ path: '.env.local' });

// 전체 아이템 ID 목록
const ALL_ITEMS = {
  // 1. 재련 재료 (거래소)
  refine: [
    '6861012',   // 아비도스 융화 재료
    '6861011',   // 최상급 오레하 융화 재료
    '66130143',  // 운명의 파편 주머니(대)
    '66130133',  // 명예의 파편 주머니(대)
    '66102006',  // 운명의 파괴석
    '66102106',  // 운명의 수호석
    '66110225',  // 운명의 돌파석
  ],

  // 2. 재련 추가 재료 (거래소)
  refine_additional: [
    '66112553',  // 야금술 : 업화 [19-20] (무기)
    '66112551',  // 야금술 : 업화 [15-18] (무기)
    '66112543',  // 야금술 : 업화 [11-14] (무기)
    '66112554',  // 재봉술 : 업화 [19-20] (방어구)
    '66112552',  // 재봉술 : 업화 [15-18] (방어구)
    '66112546',  // 재봉술 : 업화 [11-14] (방어구)
    '66112714',  // 장인의 재봉술 : 2단계 (방어구)
    '66112712',  // 장인의 재봉술 : 1단계 (방어구)
    '66112713',  // 장인의 야금술 : 2단계 (무기)
    '66112711',  // 장인의 야금술 : 1단계 (무기)
    '66111131',  // 용암의 숨결
    '66111132',  // 빙하의 숨결
  ],

  // 3. 젬 (거래소)
  gem: [
    '67400003',  // 질서의 젬 : 안정
    '67400103',  // 질서의 젬 : 견고
    '67400203',  // 질서의 젬 : 불변
    '67410303',  // 혼돈의 젬 : 침식
    '67410403',  // 혼돈의 젬 : 왜곡
    '67410503',  // 혼돈의 젬 : 붕괴
  ],

  // 4. 유물 각인서 (거래소)
  engraving: [
    '65203905',  // 아드레날린
    '65200505',  // 원한
    '65203305',  // 돌격대장
    '65201005',  // 예리한 둔기
    '65203505',  // 질량 증가
    '65202805',  // 저주받은 인형
    '65203005',  // 기습의 대가
    '65203705',  // 타격의 대가
    '65203405',  // 각성
    '65204105',  // 전문의
    '65200605',  // 슈퍼차지
    '65201505',  // 결투의 대가
  ],
};

// 거래소 아이템 전체 (경매장 제외)
const MARKET_ITEMS = [
  ...ALL_ITEMS.refine,
  ...ALL_ITEMS.refine_additional,
  ...ALL_ITEMS.gem,
  ...ALL_ITEMS.engraving,
];

// 기본 주요 아이템 (빠른 체크용)
const QUICK_CHECK_ITEMS = [
  '66102006',  // 운명의 파괴석
  '66102106',  // 운명의 수호석
  '66130143',  // 운명의 파편
  '66112553',  // 야금술 19-20
  '66112554',  // 재봉술 19-20
  '66112713',  // 장인의 야금술 2단계
  '66112714',  // 장인의 재봉술 2단계
];

async function refreshPrice(itemId) {
  try {
    console.log(`[${itemId}] 가격 갱신 시작...`);

    const response = await fetch(`https://developer-lostark.game.onstove.com/markets/items/${itemId}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.LOSTARK_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`[${itemId}] ❌ API 호출 실패: ${response.status}`);
      return { itemId, success: false, error: `API 오류: ${response.status}` };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error(`[${itemId}] ❌ 데이터 없음`);
      return { itemId, success: false, error: '데이터 없음' };
    }

    const itemData = data[0];
    let price = 0;
    let priceSource = '';

    // 가격 우선순위 확인
    if (itemData.YDayAvgPrice && itemData.YDayAvgPrice > 0) {
      price = itemData.YDayAvgPrice;
      priceSource = '전날 평균가';
    } else if (itemData.Stats && itemData.Stats.length > 0 && itemData.Stats[0].AvgPrice > 0) {
      price = itemData.Stats[0].AvgPrice;
      priceSource = '통계 평균가';
    } else if (itemData.CurrentMinPrice && itemData.CurrentMinPrice > 0) {
      price = itemData.CurrentMinPrice;
      priceSource = '현재 최저가';
    }

    if (price === 0) {
      console.error(`[${itemId}] ❌ 유효한 가격 없음`);
      return { itemId, success: false, error: '유효한 가격 없음' };
    }

    console.log(`[${itemId}] ✅ ${itemData.Name}: ${price.toLocaleString()}골드 (${priceSource})`);

    return {
      itemId,
      success: true,
      name: itemData.Name,
      price: price,
      priceSource: priceSource,
    };
  } catch (error) {
    console.error(`[${itemId}] ❌ 오류:`, error.message);
    return { itemId, success: false, error: error.message };
  }
}

async function main() {
  console.log('=================================================');
  console.log('🔄 가격 강제 갱신 시작');
  console.log('=================================================\n');

  // 명령줄 인자로 특정 아이템 ID가 주어졌는지 확인
  const args = process.argv.slice(2);
  let itemsToRefresh;

  if (args.length > 0) {
    if (args[0] === '--all') {
      // 전체 아이템 갱신
      itemsToRefresh = MARKET_ITEMS;
      console.log('📦 모드: 전체 아이템 갱신 (거래소 아이템 전체)');
    } else if (args[0] === '--quick') {
      // 주요 아이템만 빠른 체크
      itemsToRefresh = QUICK_CHECK_ITEMS;
      console.log('📦 모드: 빠른 체크 (주요 아이템만)');
    } else if (args[0] === '--refine') {
      // 재련 재료만
      itemsToRefresh = ALL_ITEMS.refine;
      console.log('📦 모드: 재련 재료만');
    } else if (args[0] === '--gem') {
      // 젬만
      itemsToRefresh = ALL_ITEMS.gem;
      console.log('📦 모드: 젬만');
    } else if (args[0] === '--engraving') {
      // 각인서만
      itemsToRefresh = ALL_ITEMS.engraving;
      console.log('📦 모드: 각인서만');
    } else {
      // 특정 아이템 ID들
      itemsToRefresh = args;
      console.log('📦 모드: 특정 아이템 갱신');
    }
  } else {
    // 기본값: 빠른 체크
    itemsToRefresh = QUICK_CHECK_ITEMS;
    console.log('📦 모드: 기본 (주요 아이템만)');
    console.log('💡 Tip: --all 옵션으로 전체 갱신 가능');
  }

  console.log(`📦 총 ${itemsToRefresh.length}개 아이템 갱신 예정\n`);

  const results = [];

  for (let i = 0; i < itemsToRefresh.length; i++) {
    const itemId = itemsToRefresh[i];
    const result = await refreshPrice(itemId);
    results.push(result);

    // API Rate Limit 고려하여 대기 (마지막 아이템 제외)
    if (i < itemsToRefresh.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 결과 요약
  console.log('\n=================================================');
  console.log('📊 갱신 결과 요약');
  console.log('=================================================');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);

  if (failCount > 0) {
    console.log('\n실패한 아이템:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.itemId}: ${r.error}`);
    });
  }

  console.log('\n=================================================');
  console.log('✨ 갱신 완료!');
  console.log('=================================================');
  console.log('\n💡 Tip: 브라우저 캐시도 삭제해보세요 (Ctrl+Shift+R)');
}

// API 키 확인
if (!process.env.LOSTARK_API_KEY) {
  console.error('❌ LOSTARK_API_KEY가 .env.local 파일에 없습니다!');
  process.exit(1);
}

main().catch(console.error);
