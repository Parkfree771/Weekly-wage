// 프로덕션 서버에 66112543, 66112546 아이템의 과거 14일치 데이터를 저장하는 스크립트
require('dotenv').config({ path: '.env.local' });

const ITEMS = [
  { id: '66112543', name: '야금술: 업화 [11-14]' },
  { id: '66112546', name: '재봉술: 업화 [11-14]' }
];

const PROD_URL = 'https://lostarkweeklygold.kr';

async function fetchAndSaveHistoricalData(itemId, itemName) {
  try {
    console.log(`\n${itemName} (${itemId}) 과거 데이터 가져오는 중...`);

    const apiKey = process.env.LOSTARK_API_KEY;
    if (!apiKey) {
      console.error('  ❌ LOSTARK_API_KEY가 설정되지 않았습니다.');
      return;
    }

    // 로스트아크 공식 API로 거래소 아이템 정보 가져오기
    const response = await fetch(
      `https://developer-lostark.game.onstove.com/markets/items/${itemId}`,
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`  ❌ API 오류: ${response.status}`);
      return;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('  ❌ 아이템 정보를 찾을 수 없습니다.');
      return;
    }

    // 거래 가능한 버전 찾기 (Stats 배열이 있는 것)
    let itemData = null;
    for (const variant of data) {
      if (variant.Stats && variant.Stats.length > 0) {
        itemData = variant;
        break;
      }
    }

    if (!itemData || !itemData.Stats || itemData.Stats.length === 0) {
      console.error('  ❌ Stats 데이터가 없습니다.');
      return;
    }

    console.log(`  ✅ Stats 배열 개수: ${itemData.Stats.length}개`);

    // Stats 배열에서 과거 데이터 추출 (Stats[0]은 오늘이므로 제외)
    const historicalData = [];
    for (let i = 1; i < itemData.Stats.length; i++) {
      const stat = itemData.Stats[i];
      if (stat.AvgPrice > 0 && stat.Date) {
        historicalData.push({
          date: stat.Date,
          price: stat.AvgPrice
        });
      }
    }

    if (historicalData.length === 0) {
      console.log('  ⚠️  과거 데이터가 없습니다.');
      return;
    }

    console.log(`  📅 날짜 범위: ${historicalData[historicalData.length - 1].date} ~ ${historicalData[0].date}`);
    console.log(`  💾 프로덕션 서버에 ${historicalData.length}일치 데이터 저장 중...`);

    // 프로덕션 서버의 Firebase에 저장
    const saveResponse = await fetch(`${PROD_URL}/api/market/save-external-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId,
        itemName,
        history: historicalData,
      }),
    });

    const result = await saveResponse.json();

    if (result.success) {
      console.log(`  ✅ ${result.savedCount}개 데이터 저장 완료`);
      if (result.errors && result.errors.length > 0) {
        console.log(`  ⚠️  ${result.errors.length}개 오류 발생:`);
        result.errors.forEach(err => console.log(`     - ${err}`));
      }
    } else {
      console.log(`  ❌ 저장 실패: ${result.error}`);
    }

  } catch (error) {
    console.error(`  ❌ 오류 발생:`, error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log(`프로덕션 서버 (${PROD_URL})에`);
  console.log('과거 14일치 데이터 저장 시작');
  console.log('='.repeat(60));

  for (const item of ITEMS) {
    await fetchAndSaveHistoricalData(item.id, item.name);
    // API rate limit 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('작업 완료!');
  console.log('='.repeat(60));
}

main().catch(console.error);
