import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * todayTemp와 dailyPrices 컬렉션 비교
 * GET /api/debug/check-collections?itemId=67400003
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId') || '67400003'; // 기본값: 질서의 젬 안정

    const db = getAdminFirestore();

    // 1. dailyPrices 컬렉션 조회
    const dailySnapshot = await db.collection('dailyPrices')
      .where('itemId', '==', itemId)
      .get();

    const dailyDates = dailySnapshot.docs
      .map(doc => ({ date: doc.data().date, price: doc.data().price, id: doc.id }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. todayTemp 컬렉션 조회 (모든 문서 확인)
    const tempSnapshot = await db.collection('todayTemp').get();
    const tempDocs = tempSnapshot.docs
      .filter(doc => doc.id.startsWith(itemId))
      .map(doc => ({
        id: doc.id,
        date: doc.id.split('_').pop(), // 문서 ID에서 날짜 추출
        prices: doc.data().prices,
        count: doc.data().count,
        avgPrice: doc.data().prices ?
          (doc.data().prices.reduce((a: number, b: number) => a + b, 0) / doc.data().prices.length).toFixed(1) : 0
      }));

    // 3. 한국 시간 현재 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = now.getTime() + kstOffset;
    const kstDate = new Date(kstTime);
    const currentKSTHour = kstDate.getUTCHours();

    // 로스트아크 날짜 계산 (오전 6시 기준)
    let lostArkDate = new Date(kstDate);
    if (currentKSTHour < 6) {
      lostArkDate.setUTCDate(lostArkDate.getUTCDate() - 1);
    }
    const todayKey = `${lostArkDate.getUTCFullYear()}-${String(lostArkDate.getUTCMonth() + 1).padStart(2, '0')}-${String(lostArkDate.getUTCDate()).padStart(2, '0')}`;

    // 4. 최근 7일 날짜 생성 (예상되는 날짜들)
    const expectedDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(lostArkDate);
      date.setUTCDate(date.getUTCDate() - i);
      const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

      const inDaily = dailyDates.find(d => d.date === dateKey);
      const inTemp = tempDocs.find(d => d.date === dateKey);

      expectedDates.push({
        date: dateKey,
        inDailyPrices: !!inDaily,
        dailyPrice: inDaily?.price || null,
        inTodayTemp: !!inTemp,
        tempAvgPrice: inTemp?.avgPrice || null,
        tempCount: inTemp?.count || 0,
        status: inDaily ? '✅ 확정됨' : (inTemp ? '⚠️ todayTemp에만 존재' : '❌ 데이터 없음')
      });
    }

    return NextResponse.json({
      success: true,
      itemId,
      currentKST: kstDate.toISOString(),
      currentKSTHour,
      lostArkToday: todayKey,
      summary: {
        totalDailyPrices: dailyDates.length,
        totalTodayTemp: tempDocs.length,
        oldestDaily: dailyDates[0]?.date || null,
        newestDaily: dailyDates[dailyDates.length - 1]?.date || null
      },
      last7Days: expectedDates,
      allDailyDates: dailyDates.map(d => d.date),
      allTempDocs: tempDocs,
      diagnostic: {
        message: tempDocs.length > 0 && dailyDates.length === 0
          ? '⚠️ todayTemp에는 데이터가 있는데 dailyPrices로 확정이 안 되고 있습니다!'
          : tempDocs.length > 0
            ? `todayTemp에 ${tempDocs.length}개 대기 중 (정상)`
            : 'todayTemp 비어있음'
      }
    });

  } catch (error: any) {
    console.error('컬렉션 비교 오류:', error);
    return NextResponse.json(
      { success: false, message: '조회 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
