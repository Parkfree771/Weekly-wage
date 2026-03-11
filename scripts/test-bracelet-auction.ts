/**
 * 팔찌 경매장 가격 조회 테스트 스크립트
 * 조건: 고대 팔찌, 티어4, 특화 100+, 치명 100+, 부여효과 3개
 *
 * 실행: npx tsx scripts/test-bracelet-auction.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// .env.local 수동 파싱
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.trimStart().startsWith('#')) continue;
  const key = line.substring(0, eqIdx).trim();
  const val = line.substring(eqIdx + 1).trim();
  if (key) process.env[key] = val;
}

const API_KEY = process.env.LOSTARK_API_KEY;
if (!API_KEY) {
  console.error('LOSTARK_API_KEY not found in .env.local');
  process.exit(1);
}

async function searchBracelet() {
  const requestBody = {
    ItemName: '',
    CategoryCode: 200040, // 장신구 - 팔찌
    PageNo: 0,
    SortCondition: 'ASC',
    Sort: 'BUY_PRICE',
    ItemGrade: '고대',
    ItemTier: 4,
    // 전투특성 필터: 특화 100+, 치명 100+
    // FirstOption 2 = 전투특성, SecondOption: 치명=15, 특화=16, 신속=17
    // 부여효과 수량 3: FirstOption 6 = 팔찌 특수 옵션 수량
    EtcOptions: [
      {
        FirstOption: 2, // 전투특성
        SecondOption: 16, // 특화
        MinValue: 100,
        MaxValue: null
      },
      {
        FirstOption: 2, // 전투특성
        SecondOption: 15, // 치명
        MinValue: 100,
        MaxValue: null
      },
      {
        FirstOption: 4, // 팔찌 옵션 수량
        SecondOption: 2, // 부여 효과 수량
        MinValue: 3,
        MaxValue: 3
      }
    ]
  };

  console.log('=== 팔찌 경매장 검색 ===');
  console.log('조건: 고대, T4, 특화100+, 치명100+, 부여효과 3개');
  console.log('Request:', JSON.stringify(requestBody, null, 2));
  console.log('');

  const response = await fetch(
    'https://developer-lostark.game.onstove.com/auctions/items',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    console.error(`API 오류: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  const data = await response.json();
  const items = data?.Items || [];

  console.log(`총 ${items.length}개 결과\n`);

  if (items.length === 0) {
    console.log('결과가 없습니다. 옵션 코드를 확인해주세요.');
    // 옵션 코드 확인을 위해 필터 없이 재검색
    console.log('\n--- 필터 없이 고대 팔찌 검색 ---');
    const simpleBody = {
      ItemName: '',
      CategoryCode: 200040,
      PageNo: 0,
      SortCondition: 'ASC',
      Sort: 'BUY_PRICE',
      ItemGrade: '고대',
      ItemTier: 4
    };
    const res2 = await fetch(
      'https://developer-lostark.game.onstove.com/auctions/items',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simpleBody)
      }
    );
    if (res2.ok) {
      const d2 = await res2.json();
      const items2 = d2?.Items || [];
      console.log(`필터 없이 ${items2.length}개 결과`);
      if (items2.length > 0) {
        console.log('\n첫 번째 아이템 전체 구조:');
        console.log(JSON.stringify(items2[0], null, 2));
      }
    }
    return;
  }

  // 상위 5개 출력
  for (let i = 0; i < Math.min(5, items.length); i++) {
    const item = items[i];
    const auction = item.AuctionInfo;
    console.log(`--- #${i + 1} ---`);
    console.log(`이름: ${item.Name}`);
    console.log(`즉시구매: ${auction.BuyPrice?.toLocaleString()}G`);
    console.log(`입찰가: ${auction.BidStartPrice?.toLocaleString()}G`);
    console.log(`옵션:`, JSON.stringify(item.Options, null, 2));
    console.log('');
  }

  // 최저가 요약
  const lowest = items[0];
  console.log(`\n=== 최저 즉구가: ${lowest.AuctionInfo.BuyPrice?.toLocaleString()}G ===`);
}

searchBracelet().catch(console.error);
