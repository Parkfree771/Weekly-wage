// 데이터 강제 수집 스크립트 - GitHub Actions 대신 직접 cron API 호출
const SITE_URL = 'https://lostarkweeklygold.kr';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function collectPrices(category) {
  console.log(`\n=== ${category} 카테고리 데이터 수집 시작 ===`);

  try {
    const url = `${SITE_URL}/api/cron/collect-prices?category=${category}`;
    console.log(`요청 URL: ${url}\n`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ 성공: ${data.message}`);
      console.log(`타임스탬프: ${data.timestamp}`);

      if (data.results && data.results.length > 0) {
        console.log(`\n수집된 아이템 (${data.results.length}개):`);
        data.results.forEach((item, idx) => {
          if (item.itemName) {
            const priceInfo = item.price ? `${item.price}G` : 'N/A';
            const dateInfo = item.date ? `[${item.date}]` : '';
            console.log(`  ${idx + 1}. ${item.itemName} ${dateInfo}: ${priceInfo} (${item.dataType || item.type})`);
          }
        });
      }

      if (data.errors && data.errors.length > 0) {
        console.log(`\n⚠️  오류 발생 (${data.errors.length}개):`);
        data.errors.forEach((err, idx) => {
          console.log(`  ${idx + 1}. ${err.itemName || err.itemId || 'Unknown'}: ${err.error || err.message}`);
        });
      }
    } else {
      console.log(`❌ 실패: ${data.message}`);
      if (data.skipped) {
        console.log(`건너뜀 사유: ${data.reason}`);
      }
    }

    return data;
  } catch (error) {
    console.error(`❌ 요청 실패: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('==========================================================');
  console.log('로스트아크 위클리골드 데이터 강제 수집 스크립트');
  console.log('==========================================================');

  const startTime = Date.now();

  // 1. 거래소 - 재련 재료 + 젬
  const result1 = await collectPrices('refine,gem');
  await sleep(3000);

  // 2. 거래소 - 재련 추가 재료 + 각인서
  const result2 = await collectPrices('refine_additional,engraving');
  await sleep(3000);

  // 3. 경매장 - 악세 + 보석
  const result3 = await collectPrices('accessory,jewel');
  await sleep(3000);

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n==========================================================');
  console.log(`완료! (소요 시간: ${elapsedTime}초)`);
  console.log('==========================================================');

  // 결과 요약
  const allSuccess = result1?.success && result2?.success && result3?.success;
  if (allSuccess) {
    console.log('\n✅ 모든 카테고리 수집 성공!');
    console.log('\n다음 단계:');
    console.log('1. node clear-cache.js 실행하여 캐시 갱신');
    console.log('2. 사이트에서 데이터 확인');
  } else {
    console.log('\n⚠️  일부 카테고리 수집 실패. 위 로그를 확인하세요.');
  }
}

main().catch(console.error);
