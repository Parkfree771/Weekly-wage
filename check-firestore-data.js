// Firestore에 실제로 저장된 최근 데이터 확인
const SITE_URL = 'https://lostarkweeklygold.kr';

async function checkRecentData(itemId, itemName) {
  try {
    const url = `${SITE_URL}/api/market/price-history/${itemId}?days=30&noCache=true`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ ${itemName}: HTTP ${response.status}`);
      return;
    }

    const data = await response.json();

    if (data.history.length === 0) {
      console.log(`⚠️  ${itemName}: 데이터 없음`);
      return;
    }

    console.log(`\n📊 ${itemName} (${itemId})`);
    console.log(`   총 데이터: ${data.count}개`);
    console.log(`   최근 10개 데이터:`);

    // 최근 10개만 표시
    const recentData = data.history.slice(0, 10);
    recentData.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. ${entry.date} - ${entry.price}G (${entry.timestamp})`);
    });

  } catch (error) {
    console.error(`❌ ${itemName}: ${error.message}`);
  }
}

async function checkTodayDate() {
  console.log('=== 현재 날짜 확인 ===\n');

  const now = new Date();
  const utc = now.toISOString();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();

  console.log(`UTC: ${utc}`);
  console.log(`KST: ${kst}`);
  console.log(`로컬: ${now.toString()}\n`);
}

async function main() {
  console.log('==========================================================');
  console.log('Firestore 최근 데이터 확인 (12월 3-6일 데이터 확인)');
  console.log('==========================================================\n');

  await checkTodayDate();

  console.log('=== 주요 아이템 최근 데이터 확인 ===');

  await checkRecentData('66102106', '수호석 결정');
  await checkRecentData('66102006', '파괴석 결정');
  await checkRecentData('66130143', '운명의 파편');
  await checkRecentData('66112551', '10레벨 멸화의 보석');

  console.log('\n==========================================================');
  console.log('확인 완료');
  console.log('==========================================================');
}

main().catch(console.error);
