import { NextResponse } from 'next/server';
import { saveHistoricalPrice } from '@/lib/firestore-admin';

/**
 * 외부 API에서 가져온 가격 히스토리를 history_all.json에 저장
 * 66112543, 66112546 아이템의 거래소 데이터 저장용
 */
export async function POST(request: Request) {
  try {
    const { itemId, itemName, history } = await request.json();

    if (!itemId || !history || !Array.isArray(history)) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다. (itemId, history)' },
        { status: 400 }
      );
    }

    let savedCount = 0;
    const errors: string[] = [];

    // 각 날짜별 데이터 저장
    for (const entry of history) {
      try {
        const { date, price } = entry;

        if (!date || price === undefined) {
          errors.push(`잘못된 데이터 형식: ${JSON.stringify(entry)}`);
          continue;
        }

        await saveHistoricalPrice(itemId, price, date, itemName);
        savedCount++;
      } catch (error) {
        errors.push(`${entry.date} 저장 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      itemId,
      itemName,
      savedCount,
      totalCount: history.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('외부 가격 히스토리 저장 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '외부 가격 히스토리 저장에 실패했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
