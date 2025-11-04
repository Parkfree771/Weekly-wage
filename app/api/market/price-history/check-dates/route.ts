import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

// 특정 아이템의 모든 날짜 데이터 확인
export async function POST(request: Request) {
  try {
    const { itemIds } = await request.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { message: 'itemIds 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const results: any = {};

    // dailyPrices에서 각 아이템의 모든 문서 조회
    for (const itemId of itemIds) {
      const snapshot = await db.collection('dailyPrices')
        .where('itemId', '==', itemId)
        .get();

      results[itemId] = snapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date,
        price: doc.data().price
      })).sort((a, b) => a.date.localeCompare(b.date));
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('데이터 확인 오류:', error);
    return NextResponse.json(
      { message: '데이터 확인 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
