// Firestore에서 실제로 어떤 문서들이 저장되어 있는지 확인
const SITE_URL = 'http://localhost:3000';

async function checkFirestoreData() {
  console.log('==========================================================');
  console.log('Firestore dailyPrices 컬렉션 직접 조회 테스트');
  console.log('==========================================================\n');

  const itemId = '66102106'; // 수호석

  console.log(`아이템 ID: ${itemId} (수호석 결정)\n`);

  // API를 통해 조회 (내부적으로 Firestore 쿼리)
  const url = `${SITE_URL}/api/market/price-history/${itemId}?days=999&noCache=true`;
  console.log(`조회 URL: ${url}\n`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`총 조회된 데이터: ${data.count}개\n`);

    if (data.history.length > 0) {
      console.log('전체 데이터 (날짜별):');
      data.history.forEach((entry, idx) => {
        const date = new Date(entry.timestamp);
        console.log(`${idx + 1}. ${entry.date} - ${entry.price}G (timestamp: ${entry.timestamp})`);
      });

      console.log('\n최신 데이터:');
      const latest = data.history[0];
      console.log(`날짜: ${latest.date}`);
      console.log(`가격: ${latest.price}G`);
      console.log(`타임스탬프: ${latest.timestamp}`);

      // 12월 데이터 확인
      const decemberData = data.history.filter(entry => entry.date.startsWith('2025-12'));
      console.log(`\n12월 데이터: ${decemberData.length}개`);
      if (decemberData.length > 0) {
        decemberData.forEach(entry => {
          console.log(`  - ${entry.date}: ${entry.price}G`);
        });
      }

      // 11월 데이터 확인
      const novemberData = data.history.filter(entry => entry.date.startsWith('2025-11'));
      console.log(`\n11월 데이터: ${novemberData.length}개`);
      if (novemberData.length > 0) {
        novemberData.forEach(entry => {
          console.log(`  - ${entry.date}: ${entry.price}G`);
        });
      }

    } else {
      console.log('⚠️  데이터가 없습니다.');
    }

  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkFirestoreData();
