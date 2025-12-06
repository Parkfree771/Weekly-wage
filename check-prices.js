/**
 * 가격 확인 스크립트 (갱신하지 않고 현재 상태만 체크)
 * Firebase에 저장된 가격과 API의 현재 가격을 비교
 *
 * 사용법: node check-prices.js
 */

require('dotenv').config({ path: '.env.local' });

const QUICK_CHECK_ITEMS = [
  { id: '66102006', name: '운명의 파괴석' },
  { id: '66102106', name: '운명의 수호석' },
  { id: '66130143', name: '운명의 파편' },
  { id: '66112553', name: '야금술 19-20' },
  { id: '66112554', name: '재봉술 19-20' },
  { id: '66112713', name: '장인의 야금술 2단계' },
  { id: '66112714', name: '장인의 재봉술 2단계' },
];

async function checkPrice(itemId) {
  try {
    const response = await fetch(`https://developer-lostark.game.onstove.com/markets/items/${itemId}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.LOSTARK_API_KEY}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: `API 오류: ${response.status}` };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { success: false, error: '데이터 없음' };
    }

    const itemData = data[0];

    return {
      success: true,
      name: itemData.Name,
      currentMinPrice: itemData.CurrentMinPrice || 0,
      yDayAvgPrice: itemData.YDayAvgPrice || 0,
      avgPrice: itemData.Stats?.[0]?.AvgPrice || 0,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=================================================');
  console.log('🔍 주요 아이템 가격 체크 (갱신하지 않음)');
  console.log('=================================================\n');

  for (let i = 0; i < QUICK_CHECK_ITEMS.length; i++) {
    const item = QUICK_CHECK_ITEMS[i];
    console.log(`[${i + 1}/${QUICK_CHECK_ITEMS.length}] ${item.name} (${item.id})`);

    const result = await checkPrice(item.id);

    if (result.success) {
      console.log(`  ├─ 아이템명: ${result.name}`);
      console.log(`  ├─ 전날 평균가: ${result.yDayAvgPrice.toLocaleString()}골드`);
      console.log(`  ├─ 통계 평균가: ${result.avgPrice.toLocaleString()}골드`);
      console.log(`  └─ 현재 최저가: ${result.currentMinPrice.toLocaleString()}골드`);
    } else {
      console.log(`  └─ ❌ ${result.error}`);
    }
    console.log('');

    // API Rate Limit 고려
    if (i < QUICK_CHECK_ITEMS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('=================================================');
  console.log('✅ 체크 완료!');
  console.log('=================================================');
  console.log('\n💡 가격을 갱신하려면: node force-refresh-prices.js');
}

if (!process.env.LOSTARK_API_KEY) {
  console.error('❌ LOSTARK_API_KEY가 .env.local 파일에 없습니다!');
  process.exit(1);
}

main().catch(console.error);
