// 유물 각인서 과거 30일 가격 데이터를 수집하는 스크립트
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const engravings = [
  { name: '아드레날린', id: '65203905' },
  { name: '원한', id: '65200505' },
  { name: '돌격대장', id: '65203305' },
  { name: '예리한 둔기', id: '65201005' },
  { name: '질량 증가', id: '65203505' },
  { name: '저주받은 인형', id: '65202805' },
  { name: '기습의 대가', id: '65203005' },
  { name: '타격의 대가', id: '65203705' },
  { name: '각성', id: '65203405' },
  { name: '전문의', id: '65204105' }
];

async function fetchEngravingHistory(itemId, itemName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'developer-lostark.game.onstove.com',
      path: `/markets/items/${itemId}`,
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.LOSTARK_API_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ itemId, itemName, data: json });
        } catch (e) {
          reject(new Error(`JSON 파싱 오류: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`API 요청 오류: ${e.message}`));
    });

    req.end();
  });
}

async function saveHistoricalData(itemId, itemName, stats) {
  const promises = [];

  for (const stat of stats) {
    if (stat.AvgPrice > 0 && stat.Date) {
      const promise = new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          itemId,
          itemName,
          price: stat.AvgPrice,
          date: stat.Date
        });

        const options = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/market/price-history/save',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = http.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve({ date: stat.Date, price: stat.AvgPrice });
            } else {
              reject(new Error(`저장 실패 (${res.statusCode}): ${data}`));
            }
          });
        });

        req.on('error', (e) => {
          reject(new Error(`저장 요청 오류: ${e.message}`));
        });

        req.write(postData);
        req.end();
      });

      promises.push(promise);

      // API 요청 사이 짧은 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return Promise.all(promises);
}

async function main() {
  console.log('=== 유물 각인서 과거 가격 데이터 수집 시작 ===\n');

  if (!process.env.LOSTARK_API_KEY) {
    console.error('오류: LOSTARK_API_KEY가 .env.local에 설정되지 않았습니다.');
    process.exit(1);
  }

  for (const item of engravings) {
    try {
      console.log(`\n[${item.name}] 데이터 조회 중...`);

      const result = await fetchEngravingHistory(item.id, item.name);

      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        console.log(`  ❌ 데이터 없음`);
        continue;
      }

      // 거래 가능한 버전 찾기
      let itemData = null;
      for (const variant of result.data) {
        if (variant.Stats && variant.Stats.length > 0 && variant.Stats[0].AvgPrice > 0) {
          itemData = variant;
          break;
        }
      }

      if (!itemData || !itemData.Stats) {
        console.log(`  ❌ 거래 가능한 버전 없음`);
        continue;
      }

      const stats = itemData.Stats;
      console.log(`  ✓ ${stats.length}일치 데이터 조회됨`);

      // Firestore에 저장
      console.log(`  💾 Firestore에 저장 중...`);
      const savedData = await saveHistoricalData(item.id, item.name, stats);

      console.log(`  ✅ ${savedData.length}일치 데이터 저장 완료`);

      // 최근 3개 데이터 출력
      const recent = savedData.slice(0, 3);
      recent.forEach(d => {
        console.log(`     ${d.date}: ${d.price.toLocaleString('ko-KR')} G`);
      });

    } catch (error) {
      console.error(`  ❌ 오류: ${error.message}`);
    }

    // 아이템 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n=== 수집 완료 ===');
}

main().catch(console.error);
