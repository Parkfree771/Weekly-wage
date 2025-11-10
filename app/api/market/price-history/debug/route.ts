import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

/**
 * 디버그용 API - DB에 실제 저장된 데이터 확인
 * GET /api/market/price-history/debug?itemId=67400003
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { message: 'itemId 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // 1. dailyPrices 컬렉션에서 해당 아이템의 모든 데이터 조회
    const dailySnapshot = await db.collection('dailyPrices')
      .where('itemId', '==', itemId)
      .get();

    const dailyPrices = dailySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString()
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // 2. todayTemp 컬렉션에서 오늘 데이터 확인
    const tempSnapshot = await db.collection('todayTemp').get();
    const todayTemp = tempSnapshot.docs
      .filter(doc => doc.id.startsWith(itemId))
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate().toISOString()
      }));

    // 3. 최근 30일 데이터만 추출
    const recent30Days = dailyPrices.slice(-30);

    return NextResponse.json({
      success: true,
      itemId,
      totalCount: dailyPrices.length,
      recent30Count: recent30Days.length,
      todayTempCount: todayTemp.length,
      allDates: dailyPrices.map((d: any) => d.date),
      recent30Days,
      todayTemp,
      oldest: dailyPrices.length > 0 ? dailyPrices[0].date : null,
      newest: dailyPrices.length > 0 ? dailyPrices[dailyPrices.length - 1].date : null
    });

  } catch (error: any) {
    console.error('디버그 API 오류:', error);
    return NextResponse.json(
      { message: '디버그 조회 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
