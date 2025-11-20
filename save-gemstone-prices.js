// 66112543, 66112546 아이템의 가격 히스토리를 외부 API에서 가져와 저장하는 스크립트

const ITEMS = [
  { id: '66112543', name: '야금술: 업화 [11-14]' },
  { id: '66112546', name: '재봉술: 업화 [11-14]' }
];

async function fetchAndSaveHistory(itemId, itemName) {
  try {
    console.log(`\n${itemName} (${itemId}) 데이터 가져오는 중...`);

    // 외부 API에서 가격 히스토리 가져오기
    const response = await fetch(`https://lostarkweeklygold.kr/api/market/price-history/${itemId}?noCache=true`);
    const data = await response.json();

    if (!data.history || data.history.length === 0) {
      console.log(`  ⚠️  ${itemName}의 가격 데이터가 없습니다.`);
      return;
    }

    console.log(`  ✅ ${data.history.length}일치 데이터를 찾았습니다.`);
    console.log(`  📅 날짜 범위: ${data.history[0].date} ~ ${data.history[data.history.length - 1].date}`);

    // Firebase에 저장
    console.log(`  💾 Firebase에 저장 중...`);
    const saveResponse = await fetch('http://localhost:3000/api/market/save-external-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId,
        itemName,
        history: data.history,
      }),
    });

    const result = await saveResponse.json();

    if (result.success) {
      console.log(`  ✅ ${result.savedCount}개 데이터 저장 완료`);
      if (result.errors && result.errors.length > 0) {
        console.log(`  ⚠️  ${result.errors.length}개 오류 발생:`);
        result.errors.forEach(err => console.log(`     - ${err}`));
      }
    } else {
      console.log(`  ❌ 저장 실패: ${result.error}`);
    }

  } catch (error) {
    console.error(`  ❌ 오류 발생:`, error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('거래소 아이템 가격 히스토리 저장 시작');
  console.log('='.repeat(60));

  for (const item of ITEMS) {
    await fetchAndSaveHistory(item.id, item.name);
  }

  console.log('\n' + '='.repeat(60));
  console.log('작업 완료!');
  console.log('='.repeat(60));
}

main().catch(console.error);
