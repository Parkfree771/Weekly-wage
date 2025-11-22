// 로스트아크 API 응답 확인 스크립트
require('dotenv').config({ path: '.env.local' });

const itemId = 66102106; // 운명의 수호석

async function checkAPIResponse() {
  const apiKey = process.env.LOSTARK_API_KEY;

  if (!apiKey) {
    console.error('❌ LOSTARK_API_KEY가 설정되지 않았습니다.');
    return;
  }

  try {
    console.log('🔍 로스트아크 API 응답 확인...\n');

    const response = await fetch(`https://developer-lostark.game.onstove.com/markets/items/${itemId}`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ API 요청 실패: ${response.status}`);
      return;
    }

    const data = await response.json();

    if (data && Array.isArray(data) && data.length > 0) {
      const item = data[0];

      console.log('📦 아이템 정보:');
      console.log(`   이름: ${item.Name}`);
      console.log(`   번들 수량: ${item.BundleCount}`);
      console.log('\n💰 가격 정보:');
      console.log(`   CurrentMinPrice (현재 최저가): ${item.CurrentMinPrice}`);
      console.log(`   RecentPrice (최근 거래가): ${item.RecentPrice}`);
      console.log(`   YDayAvgPrice (어제 평균가): ${item.YDayAvgPrice}`);
      console.log('\n📊 전체 응답:');
      console.log(JSON.stringify(item, null, 2));
    } else {
      console.log('⚠️  데이터가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkAPIResponse();
