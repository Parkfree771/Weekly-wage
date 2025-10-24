import { NextResponse } from 'next/server';
import { getPriceHistory } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';

export async function GET(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;

    if (!itemId) {
      return NextResponse.json(
        { message: 'itemId가 필요합니다.' },
        { status: 400 }
      );
    }

    // Firestore에서 가격 히스토리 조회
    const priceEntries = await getPriceHistory(itemId, 100);

    // Timestamp를 ISO 문자열로 변환
    const history = priceEntries.map((entry) => ({
      price: entry.price,
      timestamp: entry.timestamp instanceof Timestamp
        ? entry.timestamp.toDate().toISOString()
        : entry.timestamp,
    }));

    return NextResponse.json({
      itemId,
      history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('가격 히스토리 조회 오류:', error);
    return NextResponse.json(
      { message: '가격 히스토리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
