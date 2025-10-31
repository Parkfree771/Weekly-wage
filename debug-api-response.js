// API 응답 전체 구조 확인
require('dotenv').config({ path: '.env.local' });

async function debugApiResponse() {
  const itemId = '65200605'; // 슈퍼차지
  const apiKey = process.env.LOSTARK_API_KEY;

  console.log('🔍 슈퍼차지 API 응답 전체 구조 확인...\n');

  const response = await fetch(
    `https://developer-lostark.game.onstove.com/markets/items/${itemId}`,
    {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = await response.json();
  console.log('전체 응답:', JSON.stringify(data, null, 2));
}

debugApiResponse().catch(console.error);
