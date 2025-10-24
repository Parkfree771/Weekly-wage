import { NextResponse } from 'next/server';
import { getDailyPriceHistory } from '@/lib/firestore-admin';
import { Timestamp } from 'firebase-admin/firestore';

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

    // Firestore에서 일별 가격 히스토리 조회 (최근 30일)
    // 확정된 전날 평균가들 + 오늘의 누적 평균
    console.log('[API] Calling getDailyPriceHistory...');
    const priceEntries = await getDailyPriceHistory(itemId, 30);
    console.log(`[API] Got ${priceEntries.length} price entries`);

    // Timestamp를 ISO 문자열로 변환
    const history = priceEntries.map((entry) => ({
      price: entry.price,
      timestamp: entry.timestamp.toDate().toISOString(),
    }));

    console.log(`[API] Returning ${history.length} history entries`);
    return NextResponse.json({
      itemId,
      history,
      count: history.length,
    });
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
