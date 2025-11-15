import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';

/**
 * 모든 추적 아이템의 Firebase 데이터 상태 확인
 * GET /api/debug/all-items-status
 */
export async function GET() {
  try {
    const db = getAdminFirestore();
    const results = [];

    for (const item of TRACKED_ITEMS) {
      // 경매장 아이템은 스킵 (ID가 auction_로 시작)
      if (item.id.startsWith('auction_')) {
        results.push({
          id: item.id,
          name: item.name,
          type: item.type,
          status: 'auction',
          dataCount: 'N/A',
          latestDate: 'N/A',
          oldestDate: 'N/A',
          message: '경매장 아이템 (별도 수집)'
        });
        continue;
      }

      try {
        // dailyPrices에서 해당 아이템 조회
        const snapshot = await db.collection('dailyPrices')
          .where('itemId', '==', item.id)
          .get();

        const dates = snapshot.docs.map(doc => doc.data().date).sort();

        if (snapshot.empty) {
          results.push({
            id: item.id,
            name: item.name,
            type: item.type,
            status: 'missing',
            dataCount: 0,
            latestDate: null,
            oldestDate: null,
            message: '⚠️ Firebase에 데이터 없음'
          });
        } else {
          results.push({
            id: item.id,
            name: item.name,
            type: item.type,
            status: 'ok',
            dataCount: snapshot.size,
            latestDate: dates[dates.length - 1],
            oldestDate: dates[0],
            message: '✅ 정상'
          });
        }
      } catch (err: any) {
        results.push({
          id: item.id,
          name: item.name,
          type: item.type,
          status: 'error',
          dataCount: 0,
          latestDate: null,
          oldestDate: null,
          message: `❌ 오류: ${err.message}`
        });
      }
    }

    // 통계
    const totalItems = TRACKED_ITEMS.length;
    const marketItems = results.filter(r => r.type === 'market');
    const auctionItems = results.filter(r => r.type === 'auction');
    const missingItems = results.filter(r => r.status === 'missing');
    const errorItems = results.filter(r => r.status === 'error');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalItems,
        marketItems: marketItems.length,
        auctionItems: auctionItems.length,
        missing: missingItems.length,
        errors: errorItems.length,
        ok: results.filter(r => r.status === 'ok').length
      },
      missingItems: missingItems.map(r => ({ id: r.id, name: r.name })),
      errorItems: errorItems.map(r => ({ id: r.id, name: r.name, message: r.message })),
      allItems: results
    });

  } catch (error: any) {
    console.error('전체 아이템 상태 확인 오류:', error);
    return NextResponse.json(
      { success: false, message: '상태 확인 중 오류가 발생했습니다.', error: error.message },
      { status: 500 }
    );
  }
}
