import { NextResponse } from 'next/server';
import { getAdminFirestore, Timestamp } from '@/lib/firebase-admin';
import { getLostArkDate, formatDateKey } from '@/lib/firestore-admin';

/**
 * 과거 todayTemp 데이터를 정리하는 API
 * - 어제 이전 데이터를 dailyPrices로 확정
 * - todayTemp에서 확정된 데이터 삭제
 */
export async function POST(request: Request) {
  try {
    const db = getAdminFirestore();

    // 로스트아크 기준 오늘 날짜
    const lostArkToday = getLostArkDate();
    const todayKey = formatDateKey(lostArkToday);

    console.log(`[cleanup] 오늘 날짜: ${todayKey}`);

    // todayTemp 컬렉션의 모든 문서 조회
    const tempSnapshot = await db.collection('todayTemp').get();

    const batch = db.batch();
    let finalizedCount = 0;
    let deletedCount = 0;

    tempSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id; // 예: "auction_gem_fear_8_2025-10-25"

      // 문서 ID에서 날짜 추출
      const docDateMatch = docId.match(/_(\d{4}-\d{2}-\d{2})$/);
      if (!docDateMatch) return;

      const docDate = docDateMatch[1];

      // 오늘 데이터가 아닌 경우만 처리 (과거 데이터)
      if (docDate < todayKey) {
        console.log(`[cleanup] 처리 중: ${docId} (${docDate})`);

        // 1. prices 배열이 있으면 평균내서 dailyPrices에 저장
        if (data.prices && data.prices.length > 0) {
          const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;

          // 아비도스 융화재료(6861012)만 소수점 첫째 자리까지, 나머지는 정수
          const roundedAvgPrice = data.itemId === '6861012'
            ? Math.round(avgPrice * 10) / 10
            : Math.round(avgPrice);

          const dailyDocRef = db.collection('dailyPrices').doc(`${data.itemId}_${docDate}`);

          // 이미 존재하는 경우 덮어쓰지 않음
          batch.set(dailyDocRef, {
            itemId: data.itemId,
            itemName: data.itemName,
            price: roundedAvgPrice,
            date: docDate,
            timestamp: Timestamp.now(),
          }, { merge: true }); // merge: true로 기존 데이터가 있으면 유지

          console.log(`  ✓ 확정: ${data.itemName} (${docDate}) - ${data.prices.length}개 평균 = ${roundedAvgPrice}G`);
          finalizedCount++;
        }

        // 2. todayTemp에서 삭제
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: '과거 데이터 정리 완료',
      todayKey,
      finalizedCount,
      deletedCount,
    });
  } catch (error: any) {
    console.error('[cleanup] 오류:', error);
    return NextResponse.json(
      {
        success: false,
        message: '데이터 정리 중 오류가 발생했습니다.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
