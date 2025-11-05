import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

// 특정 날짜의 데이터를 dailyPrices에서 삭제
export async function POST(request: Request) {
  try {
    const { itemId, date } = await request.json();

    if (!itemId || !date) {
      return NextResponse.json(
        { message: 'itemId와 date가 필요합니다.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // dailyPrices 문서 ID: itemId_날짜 (예: 67400203_2025-11-05)
    const docId = `${itemId}_${date}`;
    const docRef = db.collection('dailyPrices').doc(docId);

    // 문서 삭제
    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: '데이터 삭제 완료',
      deletedDoc: docId
    });

  } catch (error: any) {
    console.error('데이터 삭제 오류:', error);
    return NextResponse.json(
      { message: '데이터 삭제 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
