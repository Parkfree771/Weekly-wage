/**
 * 아비도스 융화 재료 저장된 데이터 확인
 */

async function checkAbidosData() {
  const itemId = '6861012'; // 아비도스 융화 재료

  console.log('아비도스 융화 재료의 저장된 가격 데이터 확인 중...\n');

  try {
    const response = await fetch(`http://localhost:3002/api/market/price-history/${itemId}`);

    if (!response.ok) {
      console.error('❌ API 호출 실패:', response.status, response.statusText);
      return;
    }

    const result = await response.json();

    console.log(`=== ${result.itemId} - 총 ${result.count}개 데이터 ===\n`);
    console.log('날짜\t\t평균가');
    console.log('─'.repeat(40));

    // 최근 15일만 출력 (역순)
    const recentHistory = result.history.slice(-15).reverse();
    recentHistory.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      console.log(`${date}\t${entry.price}`);
    });

    console.log('\n=== 사용자 제공 데이터와 비교 ===');
    console.log('사용자가 제공한 데이터:');
    console.log('2025-10-25: 90.8');
    console.log('2025-10-24: 90.6');
    console.log('2025-10-23: 89.9');
    console.log('2025-10-22: 89.5');
    console.log('2025-10-21: 89.0');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

checkAbidosData();
