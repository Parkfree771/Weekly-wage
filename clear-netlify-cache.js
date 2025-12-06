// 네트리파이 배포 사이트 캐시 클리어 스크립트
const SITE_URL = 'https://lostarkweeklygold.kr';

// 추적 중인 주요 아이템 ID (배포 사이트용)
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
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clearNetlifyCache() {
  console.log('=== 네트리파이 배포 사이트 캐시 클리어 ===\n');

  console.log('방법 1: 네트리파이 대시보드에서 수동 클리어');
  console.log('  1. https://app.netlify.com/ 접속');
  console.log('  2. 사이트 선택');
  console.log('  3. "Deploys" 탭 → "Trigger deploy" → "Clear cache and deploy"\n');

  console.log('방법 2: 아래 스크립트로 자동 캐시 클리어 (noCache=true 사용)\n');
}

async function revalidateProductionCache() {
  console.log('=== 1단계: 프로덕션 캐시 무효화 API 호출 ===\n');

  try {
    const response = await fetch(`${SITE_URL}/api/cache/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ Next.js 캐시 무효화 성공:', data);
    console.log('');
  } catch (error) {
    console.error('❌ 캐시 무효화 실패:', error.message);
    console.log('');
  }
}

async function warmupProductionCache() {
  console.log('=== 2단계: 프로덕션 캐시 예열 (noCache=true로 강제 갱신) ===\n');

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const itemId of TRACKED_ITEMS) {
    try {
      // noCache=true로 Next.js 캐시를 우회하고 Firestore에서 최신 데이터 가져오기
      const url = `${SITE_URL}/api/market/price-history/${itemId}?days=999&noCache=true`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const latestDate = data.history.length > 0 ? data.history[0].date : 'N/A';
        const latestPrice = data.history.length > 0 ? data.history[0].price : 'N/A';

        console.log(`✅ ${itemId.padEnd(30)} - ${data.count}개, 최신: ${latestDate} (${latestPrice}G)`);
        results.push({ itemId, count: data.count, latestDate, latestPrice });
        successCount++;
      } else {
        console.log(`❌ ${itemId.padEnd(30)} - HTTP ${response.status}`);
        failCount++;
      }

      // 네트리파이 Functions 과부하 방지 (조금 더 긴 대기)
      await sleep(800);
    } catch (error) {
      console.log(`❌ ${itemId.padEnd(30)} - ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n총 ${TRACKED_ITEMS.length}개 아이템: 성공 ${successCount}, 실패 ${failCount}\n`);
  return results;
}

async function verifyCacheCleared() {
  console.log('=== 3단계: 일반 캐시로 최신 데이터 확인 ===\n');

  const sampleItems = [
    { id: '66102106', name: '수호석' },
    { id: '66102006', name: '파괴석' },
    { id: '66130143', name: '운명파편' },
    { id: '66112551', name: '10레벨 멸화' },
  ];

  console.log('일반 사용자 관점에서 데이터 확인 (캐시 사용):\n');

  for (const item of sampleItems) {
    try {
      const url = `${SITE_URL}/api/market/price-history/${item.id}?days=30`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const latestEntry = data.history[0];

        if (latestEntry) {
          console.log(`${item.name.padEnd(10)}: ${latestEntry.date} - ${latestEntry.price}G`);
        } else {
          console.log(`${item.name.padEnd(10)}: 데이터 없음`);
        }
      }

      await sleep(500);
    } catch (error) {
      console.log(`${item.name.padEnd(10)}: 확인 실패 - ${error.message}`);
    }
  }

  console.log('');
}

async function main() {
  console.log('==========================================================');
  console.log('네트리파이 배포 사이트 캐시 강제 클리어');
  console.log('대상: https://lostarkweeklygold.kr');
  console.log('==========================================================\n');

  await clearNetlifyCache();
  await sleep(2000);

  const startTime = Date.now();

  // 1. Next.js 캐시 무효화
  await revalidateProductionCache();
  await sleep(3000);

  // 2. 모든 아이템 캐시 예열 (강제 갱신)
  const results = await warmupProductionCache();
  await sleep(3000);

  // 3. 일반 캐시로 확인
  await verifyCacheCleared();

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('==========================================================');
  console.log(`완료! (소요 시간: ${elapsedTime}초)`);
  console.log('==========================================================\n');

  console.log('다음 단계:');
  console.log('1. 브라우저에서 Ctrl+Shift+R (강력 새로고침)');
  console.log('2. 사이트에서 차트 데이터 확인');
  console.log('3. 여전히 오래된 데이터가 보이면:');
  console.log('   - 네트리파이 대시보드에서 "Clear cache and deploy" 실행');
  console.log('   - 또는 이 스크립트를 다시 실행\n');
}

main().catch(console.error);
