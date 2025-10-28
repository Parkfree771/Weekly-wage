import { NextResponse } from 'next/server';
import { saveHistoricalPrice } from '@/lib/firestore-admin';

export async function POST(request: Request) {
  try {
    const { itemId, itemName, price, date } = await request.json();

    if (!itemId || price === undefined) {
      return NextResponse.json(
        { message: 'itemId와 price가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { message: 'date가 필요합니다 (YYYY-MM-DD 형식).' },
        { status: 400 }
      );
    }

    // Firestore에 과거 가격 저장
    await saveHistoricalPrice(itemId, Number(price), date, itemName);

    return NextResponse.json({
      success: true,
      message: '가격 데이터가 저장되었습니다.',
      data: {
        itemId,
        itemName,
        price: Number(price),
        date,
      },
    });
  } catch (error: any) {
    console.error('가격 저장 오류:', error);
    return NextResponse.json(
      { message: '가격 저장 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
