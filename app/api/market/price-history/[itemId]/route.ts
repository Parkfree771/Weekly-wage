import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getDailyPriceHistory } from '@/lib/firestore-admin';
import { Timestamp } from 'firebase-admin/firestore';

// 캐시된 가격 히스토리 조회 함수 (5분간 캐싱)
const getCachedPriceHistory = unstable_cache(
  async (itemId: string) => {
    console.log(`[Cache Miss] Fetching price history for itemId: ${itemId}`);
    const priceEntries = await getDailyPriceHistory(itemId, 30);

    // Timestamp를 ISO 문자열로 변환하고 date 필드 그대로 전달
    const history = priceEntries.map((entry) => {
      return {
        price: entry.price,
        timestamp: entry.timestamp.toDate().toISOString(),
        date: entry.date, // Firestore의 date 필드 그대로 사용 (YYYY-MM-DD)
      };
    });

    return {
      itemId,
      history,
      count: history.length,
    };
  },
  (itemId: string) => ['price-history', itemId], // itemId를 캐시 키에 포함
  {
    revalidate: 300, // 5분간 캐싱
    tags: ['price-history']
  }
);

export async function GET(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    console.log(`[API] Received request for itemId: ${itemId}`);

    if (!itemId) {
      console.log('[API] Missing itemId');
      return NextResponse.json(
        { message: 'itemId가 필요합니다.' },
        { status: 400 }
      );
    }

    // 캐시된 데이터 조회 (5분간 캐싱)
    const data = await getCachedPriceHistory(itemId);
    console.log(`[API] Returning ${data.history.length} history entries (from cache or fresh)`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] 가격 히스토리 조회 오류:', error);
    console.error('[API] Error stack:', error.stack);
    return NextResponse.json(
      {
        message: '가격 히스토리 조회 중 오류가 발생했습니다.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
