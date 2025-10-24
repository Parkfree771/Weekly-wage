import { NextResponse } from 'next/server';
import axios from 'axios';
import { savePriceData } from '@/lib/firestore';

// 수집할 아이템 목록
const ITEMS_TO_COLLECT = [
  { id: '6861012', name: '아비도스 융화 재료' },
  // 필요한 다른 아이템들을 여기에 추가
];

// 자동 가격 수집 엔드포인트 (GitHub Actions 또는 외부 Cron 서비스용)
export async function GET(request: Request) {
  // 프로덕션에서만 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: '인증되지 않은 요청입니다.' },
      { status: 401 }
    );
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const results = [];
  const errors = [];

  // 각 아이템의 가격 수집
  for (const item of ITEMS_TO_COLLECT) {
    try {
      // 로스트아크 API에서 현재 가격 가져오기
      const response = await axios.get(
        `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        errors.push({ itemId: item.id, error: '아이템 정보를 찾을 수 없음' });
        continue;
      }

      const itemData = response.data[0];
      let currentPrice = 0;

      // 가격 우선순위: 전날 평균가 > 통계 평균가 > 현재 최저가
      if (itemData.YDayAvgPrice && itemData.YDayAvgPrice > 0) {
        currentPrice = itemData.YDayAvgPrice;
      } else if (itemData.Stats && itemData.Stats.length > 0 && itemData.Stats[0].AvgPrice > 0) {
        currentPrice = itemData.Stats[0].AvgPrice;
      } else if (itemData.CurrentMinPrice && itemData.CurrentMinPrice > 0) {
        currentPrice = itemData.CurrentMinPrice;
      }

      if (currentPrice === 0) {
        errors.push({ itemId: item.id, error: '유효한 가격 정보 없음' });
        continue;
      }

      // Firestore에 저장
      await savePriceData(item.id, currentPrice, item.name);

      results.push({
        itemId: item.id,
        itemName: item.name,
        price: currentPrice,
        timestamp: new Date().toISOString(),
      });

      // API 요청 사이에 짧은 딜레이 (rate limit 방지)
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error: any) {
      console.error(`아이템 ${item.id} 수집 오류:`, error.message);
      errors.push({ itemId: item.id, error: error.message });
    }
  }

  return NextResponse.json({
    success: true,
    message: `가격 수집 완료: ${results.length}개 성공, ${errors.length}개 실패`,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
