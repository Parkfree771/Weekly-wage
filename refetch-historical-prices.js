/**
 * 과거 30일 가격 데이터를 소수점으로 다시 가져오는 스크립트
 *
 * 사용법: node refetch-historical-prices.js
 *
 * 이 스크립트는 collect-prices API의 오전 6시 로직을 수동으로 실행합니다.
 */

async function refetchHistoricalPrices() {
  const url = 'http://localhost:3002/api/cron/collect-prices';

  console.log('과거 가격 데이터를 소수점으로 다시 가져옵니다...');
  console.log('(이 작업은 dailyPrices의 기존 데이터를 덮어씁니다)\n');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ 성공:', result.message);
      console.log('타임스탬프:', result.timestamp);
      console.log();

      if (result.results && result.results.length > 0) {
        console.log('=== 수집된 데이터 ===');
        result.results.forEach(item => {
          if (item.dataType === 'market_historical_prices') {
            console.log(`📊 ${item.itemName}: ${item.count}개의 과거 가격 저장됨`);
          } else if (item.dataType === 'market_current_price') {
            console.log(`💰 ${item.itemName}: 현재가 ${item.price}G`);
          } else if (item.dataType === 'auction_current_price') {
            console.log(`🔨 ${item.itemName}: 경매 최저가 ${item.price}G`);
          }
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  오류 발생:');
        result.errors.forEach(error => {
          console.log(`  - ${error.itemName || error.itemId}: ${error.error}`);
        });
      }

      console.log('\n✅ 완료! 이제 소수점이 포함된 과거 데이터가 저장되었습니다.');
      console.log('브라우저에서 차트를 새로고침하면 90.6, 89.9 같은 소수점 가격이 표시됩니다.');

    } else {
      console.error('❌ 오류:', result.message || result.error);
    }
  } catch (error) {
    console.error('❌ 요청 실패:', error.message);
    console.log('\n서버가 실행 중인지 확인하세요: npm run dev');
  }
}

refetchHistoricalPrices();
