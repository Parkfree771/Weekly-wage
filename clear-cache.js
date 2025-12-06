// 캐시 강제 무효화 및 데이터 갱신 스크립트
const SITE_URL = 'https://lostarkweeklygold.kr';

// 추적 중인 주요 아이템 ID
const TRACKED_ITEMS = [
  // 재련 재료
  '66102106', '66102006', '66110225', '6861012', '66130143',
  '66111131', '66111132',

  // 젬
  '67400003', '67400004', '67400005', '67400006',
  '67400007', '67400008',

  // 각인서
  '66112543', '66112551', '66112553',
  '66112546', '66112552', '66112554',
  '66112711', '66112713', '66112712', '66112714',

  // 보석 (경매장)
  'auction_jewel_fear_8', 'auction_jewel_fear_9', 'auction_jewel_fear_10',
  'auction_jewel_nightmare_8', 'auction_jewel_nightmare_9', 'auction_jewel_nightmare_10',

  // 악세사리 (경매장)
  'auction_accessory_목걸이', 'auction_accessory_귀걸이',
  'auction_accessory_반지', 'auction_accessory_팔찌',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function revalidateCache() {
  console.log('=== 1단계: 캐시 무효화 (revalidateTag) ===\n');

  try {
    const response = await fetch(`${SITE_URL}/api/cache/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ 캐시 무효화 성공:', data);
    console.log('');
  } catch (error) {
    console.error('❌ 캐시 무효화 실패:', error.message);
    console.log('');
  }
}

async function warmupPriceHistory() {
  console.log('=== 2단계: 가격 히스토리 캐시 예열 (noCache=true) ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const itemId of TRACKED_ITEMS) {
    try {
      const url = `${SITE_URL}/api/market/price-history/${itemId}?days=999&noCache=true`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const latestDate = data.history.length > 0 ? data.history[0].date : 'N/A';
        console.log(`✅ ${itemId.padEnd(30)} - ${data.count}개 데이터, 최신: ${latestDate}`);
        successCount++;
      } else {
        console.log(`❌ ${itemId.padEnd(30)} - HTTP ${response.status}`);
        failCount++;
      }

      // API 과부하 방지
      await sleep(500);
    } catch (error) {
      console.log(`❌ ${itemId.padEnd(30)} - ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n총 ${TRACKED_ITEMS.length}개 아이템: 성공 ${successCount}, 실패 ${failCount}\n`);
}

async function verifyLatestData() {
  console.log('=== 3단계: 최신 데이터 확인 (일반 캐시 사용) ===\n');

  // 주요 아이템 몇 개만 체크
  const sampleItems = [
    '66102106', // 수호석
    '66102006', // 파괴석
    '66130143', // 운명파편
    '67400006', // 10레벨 멸화
  ];

  for (const itemId of sampleItems) {
    try {
      const url = `${SITE_URL}/api/market/price-history/${itemId}?days=30`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const latestEntry = data.history[0];

        if (latestEntry) {
          console.log(`${itemId}: 최신 데이터 ${latestEntry.date} - ${latestEntry.price}G`);
        } else {
          console.log(`${itemId}: 데이터 없음`);
        }
      }

      await sleep(300);
    } catch (error) {
      console.log(`${itemId}: 확인 실패 - ${error.message}`);
    }
  }

  console.log('');
}

async function main() {
  console.log('==========================================================');
  console.log('로스트아크 위클리골드 캐시 강제 갱신 스크립트');
  console.log('==========================================================\n');

  const startTime = Date.now();

  // 1. 캐시 무효화
  await revalidateCache();
  await sleep(2000);

  // 2. 캐시 예열 (noCache=true로 강제 갱신)
  await warmupPriceHistory();
  await sleep(2000);

  // 3. 검증
  await verifyLatestData();

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('==========================================================');
  console.log(`완료! (소요 시간: ${elapsedTime}초)`);
  console.log('==========================================================');
}

main().catch(console.error);
