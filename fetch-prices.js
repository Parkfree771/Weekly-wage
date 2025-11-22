// 더보기 손익 계산 가격 가져오기 및 캐시 초기화 스크립트

const MATERIAL_IDS = {
  FATE_GUARDIAN_STONE: 66102106, // 운명의 수호석
  FATE_DESTRUCTION_STONE: 66102006, // 운명의 파괴석
  FATE_FRAGMENT: 66130143, // 운명의 파편 주머니(대)
  FATE_BREAKTHROUGH_STONE: 66110225, // 운명의 돌파석
};

const API_URL = 'http://localhost:3000/api/market/yesterday-avg-price';

async function fetchPrice(itemId, materialName) {
  try {
    console.log(`\n🔍 Fetching price for ${materialName} (ID: ${itemId})...`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemId }),
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch ${materialName}: ${response.status}`);
      return { itemId, materialName, price: 0, error: 'API 요청 실패' };
    }

    const data = await response.json();

    if (data.price > 0) {
      console.log(`✅ ${materialName}: ${data.price.toLocaleString()}골드`);
      console.log(`   번들가: ${data.bundlePrice?.toLocaleString() || 'N/A'}, 번들수량: ${data.bundleCount || 1}`);
    } else {
      console.log(`⚠️  ${materialName}: 가격 0 (데이터 없음)`);
    }

    return {
      itemId,
      materialName,
      price: data.price,
      bundlePrice: data.bundlePrice,
      bundleCount: data.bundleCount,
    };
  } catch (error) {
    console.error(`❌ Error fetching ${materialName}:`, error.message);
    return { itemId, materialName, price: 0, error: error.message };
  }
}

async function fetchAllPrices() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯 더보기 손익 계산 - 가격 정보 가져오기');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📡 API: ${API_URL}`);
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  const results = [];

  // 각 재료의 가격을 순차적으로 가져오기
  for (const [key, itemId] of Object.entries(MATERIAL_IDS)) {
    const materialName = key.replace(/_/g, ' ');
    const result = await fetchPrice(itemId, materialName);
    results.push(result);

    // API 요청 간격 (Rate Limiting 방지)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 결과 요약
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 가격 정보 요약');
  console.log('═══════════════════════════════════════════════════════');

  const validPrices = results.filter(r => r.price > 0);
  const invalidPrices = results.filter(r => r.price === 0);

  console.log(`\n✅ 성공: ${validPrices.length}개`);
  validPrices.forEach(r => {
    console.log(`   - ${r.materialName}: ${r.price.toLocaleString()}골드`);
  });

  if (invalidPrices.length > 0) {
    console.log(`\n⚠️  실패 (가격 0): ${invalidPrices.length}개`);
    invalidPrices.forEach(r => {
      console.log(`   - ${r.materialName}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('💾 캐시 초기화 방법');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n브라우저에서 https://lostarkweeklygold.kr/weekly-gold 페이지를 열고');
  console.log('개발자 도구 콘솔(F12)에서 다음 명령어를 실행하세요:\n');
  console.log('  localStorage.removeItem("seeMorePrices");');
  console.log('  location.reload();\n');
  console.log('또는 전체 캐시 삭제:');
  console.log('  localStorage.clear();');
  console.log('  location.reload();\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log(`⏰ 완료 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // 성공 여부 반환
  return validPrices.length === results.length;
}

// 스크립트 실행
fetchAllPrices()
  .then(success => {
    if (success) {
      console.log('✅ 모든 가격을 성공적으로 가져왔습니다!');
      process.exit(0);
    } else {
      console.log('⚠️  일부 가격을 가져오지 못했습니다. 로스트아크 API 상태를 확인해주세요.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  });
