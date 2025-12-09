const fs = require('fs');

// 확인할 아이템 목록
const allItems = [
  // 재련 재료 (refine)
  '6861012', '6861011', '66130143', '66130133', '66102006', '66102106', '66110225',
  // 재련 추가 재료 (refine_additional)
  '66112553', '66112551', '66112543', '66112554', '66112552', '66112546',
  '66112714', '66112712', '66112713', '66112711', '66111131', '66111132',
  // 젬 (gem)
  '67400003', '67400103', '67400203', '67410303', '67410403', '67410503',
  // 유물 각인서 (engraving)
  '65203905', '65200505', '65203305', '65201005', '65203505', '65202805',
  '65203005', '65203705', '65203405', '65204105', '65200605', '65201505',
  // 악세서리 (accessory)
  'auction_necklace_ancient_refine3', 'auction_ring_ancient_refine3',
  'auction_earring_ancient_refine3', 'auction_necklace_ancient_refine3_high',
  'auction_ring_ancient_refine3_high', 'auction_earring_ancient_refine3_high',
  'auction_necklace_support_refine3', 'auction_necklace_support_refine3_high',
  'auction_ring_support_refine3', 'auction_ring_support_refine3_high',
  // 보석 (jewel)
  'auction_gem_fear_8', 'auction_gem_fear_9', 'auction_gem_fear_10', 'auction_gem_flame_10'
];

console.log('=== 전체 아이템 목록 확인 ===\n');
console.log(`총 ${allItems.length}개 아이템\n`);

// 1. history_all.json 확인
console.log('\n=== 1. history_all.json 확인 ===');
const history = JSON.parse(fs.readFileSync('history_temp.json', 'utf8'));

const missingInHistory = [];
const missingDec8InHistory = [];

allItems.forEach(itemId => {
  if (!history[itemId]) {
    missingInHistory.push(itemId);
  } else {
    const hasDec8 = history[itemId].some(entry => entry.date === '2025-12-08');
    if (!hasDec8) {
      missingDec8InHistory.push(itemId);
    }
  }
});

console.log(`\n히스토리에 아예 없는 아이템: ${missingInHistory.length}개`);
if (missingInHistory.length > 0) {
  console.log(missingInHistory.join(', '));
}

console.log(`\n12월 8일 데이터 없는 아이템: ${missingDec8InHistory.length}개`);
if (missingDec8InHistory.length > 0) {
  missingDec8InHistory.forEach(itemId => {
    const dates = history[itemId].map(e => e.date);
    const lastDate = dates[dates.length - 1];
    console.log(`  ${itemId}: 마지막 날짜 = ${lastDate}`);
  });
}

// 2. latest_prices.json 확인
console.log('\n\n=== 2. latest_prices.json 확인 ===');
const latest = JSON.parse(fs.readFileSync('latest_temp.json', 'utf8'));

const missingInLatest = [];

allItems.forEach(itemId => {
  if (latest[itemId] === undefined) {
    missingInLatest.push(itemId);
  }
});

console.log(`\n오늘 데이터 없는 아이템: ${missingInLatest.length}개`);
if (missingInLatest.length > 0) {
  console.log(missingInLatest.join(', '));
}

console.log(`\n오늘 데이터 있는 아이템: ${allItems.length - missingInLatest.length}개`);

// 3. 요약
console.log('\n\n=== 요약 ===');
console.log(`총 아이템: ${allItems.length}개`);
console.log(`히스토리 파일에 없음: ${missingInHistory.length}개`);
console.log(`12월 8일 누락: ${missingDec8InHistory.length}개`);
console.log(`오늘 데이터 누락: ${missingInLatest.length}개`);

if (missingInHistory.length === 0 && missingDec8InHistory.length === 0 && missingInLatest.length === 0) {
  console.log('\n✅ 모든 아이템 데이터 정상!');
} else {
  console.log('\n❌ 데이터 누락 발견!');
}
