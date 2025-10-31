// 과거 가격 데이터 수집 스크립트
// 슈퍼차지(65200605), 결투의 대가(65201505)의 Stats 배열 데이터를 DB에 저장

// .env.local 파일 로드
require('dotenv').config({ path: '.env.local' });

const itemsToCollect = [
  { id: '65200605', name: '슈퍼차지' },
  { id: '65201505', name: '결투의 대가' }
];

async function collectHistoricalPrices() {
  const apiKey = process.env.LOSTARK_API_KEY;

  if (!apiKey) {
    console.error('❌ LOSTARK_API_KEY 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('🚀 과거 가격 데이터 수집 시작...\n');

  for (const item of itemsToCollect) {
    try {
      console.log(`📊 [${item.name}] 데이터 수집 중...`);

      // 1. 로스트아크 API에서 아이템 정보 가져오기
      const response = await fetch(
        `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ [${item.name}] API 오류: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error(`❌ [${item.name}] 아이템 정보를 찾을 수 없습니다.`);
        continue;
      }

      // 거래 불가능 버전 찾기 (실제 거래 데이터가 있음)
      let itemData = null;
      for (const variant of data) {
        if (variant.TradeRemainCount === 0 && variant.Stats && variant.Stats.length > 0) {
          // TradeRemainCount가 0인 것을 우선 선택
          const hasValidData = variant.Stats.some(stat => stat.AvgPrice > 0);
          if (hasValidData) {
            itemData = variant;
            break;
          }
        }
      }

      // 유효한 데이터를 찾지 못한 경우 첫 번째 Stats가 있는 항목 사용
      if (!itemData) {
        for (const variant of data) {
          if (variant.Stats && variant.Stats.length > 0) {
            itemData = variant;
            break;
          }
        }
      }

      if (!itemData || !itemData.Stats || itemData.Stats.length === 0) {
        console.error(`❌ [${item.name}] Stats 데이터가 없습니다.`);
        continue;
      }

      console.log(`✅ [${item.name}] Stats 배열 ${itemData.Stats.length}개 발견`);
      console.log(`   전체 Stats:`, JSON.stringify(itemData.Stats, null, 2));

      // 2. Stats 배열의 모든 데이터를 서버에 저장
      let savedCount = 0;
      let skippedCount = 0;
      for (const stat of itemData.Stats) {
        if (stat.AvgPrice > 0 && stat.Date) {
          try {
            const saveResponse = await fetch('http://localhost:3000/api/market/price-history/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                itemId: item.id,
                itemName: item.name,
                price: stat.AvgPrice,
                date: stat.Date, // YYYY-MM-DD 형식
              }),
            });

            if (!saveResponse.ok) {
              const errorData = await saveResponse.json();
              console.error(`   ⚠️  [${stat.Date}] 저장 실패:`, errorData.message);
            } else {
              savedCount++;
              console.log(`   💾 [${stat.Date}] 저장 완료: ${stat.AvgPrice.toLocaleString()}G`);
            }

            // API 요청 사이 딜레이 (rate limit 방지)
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (saveError) {
            console.error(`   ❌ [${stat.Date}] 저장 중 오류:`, saveError.message);
          }
        }
      }

      console.log(`✅ [${item.name}] 총 ${savedCount}개 데이터 저장 완료\n`);

    } catch (error) {
      console.error(`❌ [${item.name}] 수집 실패:`, error.message);
    }

    // 다음 아이템 수집 전 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('🎉 과거 가격 데이터 수집 완료!');
}

// 스크립트 실행
collectHistoricalPrices().catch(error => {
  console.error('💥 치명적 오류:', error);
  process.exit(1);
});
