import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

// 특정 아이템들의 데이터를 dailyPrices와 todayTemp에서 삭제
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
    const deletedDocs = {
      dailyPrices: 0,
      todayTemp: 0
    };

    // dailyPrices 컬렉션에서 삭제
    const dailyPricesSnapshot = await db.collection('dailyPrices').get();
    const dailyBatch = db.batch();
    let dailyCount = 0;

    dailyPricesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (itemIds.includes(data.itemId)) {
        dailyBatch.delete(doc.ref);
        dailyCount++;
      }
    });

    if (dailyCount > 0) {
      await dailyBatch.commit();
      deletedDocs.dailyPrices = dailyCount;
    }

    // todayTemp 컬렉션에서 삭제
    const todayTempSnapshot = await db.collection('todayTemp').get();
    const tempBatch = db.batch();
    let tempCount = 0;

    todayTempSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (itemIds.includes(data.itemId)) {
        tempBatch.delete(doc.ref);
        tempCount++;
      }
    });

    if (tempCount > 0) {
      await tempBatch.commit();
      deletedDocs.todayTemp = tempCount;
    }

    return NextResponse.json({
      success: true,
      message: '데이터 삭제 완료',
      deletedDocs,
      itemIds
    });

  } catch (error: any) {
    console.error('데이터 삭제 오류:', error);
    return NextResponse.json(
      { message: '데이터 삭제 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
