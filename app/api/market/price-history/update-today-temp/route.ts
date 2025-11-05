import { NextResponse } from 'next/server';
import { updateMarketTodayPrice } from '@/lib/firestore-admin';

export async function POST(request: Request) {
  try {
    const { itemId, itemName, price } = await request.json();

    if (!itemId || price === undefined) {
      return NextResponse.json(
        { message: 'itemId와 price가 필요합니다.' },
        { status: 400 }
      );
    }

    // todayTemp에 가격 저장 (거래소용 - 덮어쓰기)
    await updateMarketTodayPrice(itemId, Number(price), itemName);

    return NextResponse.json({
      success: true,
      message: 'todayTemp에 가격 데이터가 저장되었습니다.',
      data: {
        itemId,
        itemName,
        price: Number(price),
      },
    });
  } catch (error: any) {
    console.error('todayTemp 저장 오류:', error);
    return NextResponse.json(
      { message: 'todayTemp 저장 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
