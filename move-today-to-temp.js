// 11월 5일 데이터를 dailyPrices에서 todayTemp로 이동
// 질서의 젬: 불변(67400203), 혼돈의 젬: 붕괴(67410503)

// .env.local 파일 로드
require('dotenv').config({ path: '.env.local' });

const itemsToMove = [
  { id: '67400203', name: '질서의 젬 : 불변', price: 33333.5 },
  { id: '67410503', name: '혼돈의 젬 : 붕괴', price: 23043.4 }
];

async function moveTodayDataToTemp() {
  console.log('🚀 11월 5일 데이터를 todayTemp로 이동 시작...\n');

  for (const item of itemsToMove) {
    try {
      console.log(`📊 [${item.name}] 처리 중...`);

      // 1. dailyPrices에서 11월 5일 데이터 삭제
      console.log(`   🗑️  dailyPrices에서 11월 5일 데이터 삭제 중...`);
      const deleteResponse = await fetch('http://localhost:3001/api/market/price-history/delete-by-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          date: '2025-11-05'
        }),
      });

      if (!deleteResponse.ok) {
        console.error(`   ❌ 삭제 실패:`, await deleteResponse.text());
      } else {
        console.log(`   ✅ dailyPrices에서 삭제 완료`);
      }

      // 2. todayTemp에 데이터 저장
      console.log(`   💾 todayTemp에 저장 중...`);
      const saveResponse = await fetch('http://localhost:3001/api/market/price-history/update-today-temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          date: '2025-11-05'
        }),
      });

      if (!saveResponse.ok) {
        console.error(`   ❌ todayTemp 저장 실패:`, await saveResponse.text());
      } else {
        console.log(`   ✅ todayTemp에 저장 완료: ${item.price.toLocaleString()}G`);
      }

      console.log(`✅ [${item.name}] 완료\n`);

    } catch (error) {
      console.error(`❌ [${item.name}] 처리 실패:`, error.message);
    }

    // 다음 아이템 처리 전 딜레이
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('🎉 11월 5일 데이터 이동 완료!');
}

// 스크립트 실행
moveTodayDataToTemp().catch(error => {
  console.error('💥 치명적 오류:', error);
  process.exit(1);
});
