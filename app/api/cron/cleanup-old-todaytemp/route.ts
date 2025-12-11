import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getLostArkDate, formatDateKey } from '@/lib/firestore-admin';

/**
 * todayTemp 컬렉션의 오래된 데이터를 삭제하는 API
 *
 * 로스트아크 기준 당일 데이터만 남기고 나머지 삭제
 */
export async function GET(request: Request) {
  // 프로덕션에서만 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: '인증되지 않은 요청입니다.' },
      { status: 401 }
    );
  }

  try {
    const db = getAdminFirestore();

    // 기준 날짜: 2025-12-08 (이 날짜 포함 이전 데이터 삭제)
    const cutoffDate = '2025-12-08';

    console.log(`[Cleanup] ${cutoffDate} 이전 데이터를 삭제합니다...`);

    // todayTemp 컬렉션의 모든 문서 조회
    const snapshot = await db.collection('todayTemp').get();

    const batch = db.batch();
    let deleteCount = 0;
    let keepCount = 0;

    snapshot.docs.forEach((doc) => {
      const docId = doc.id; // 예: "6861012_2025-12-10" 또는 "auction_gem_fear_8_2025-10-23"

      // 문서 ID에서 날짜 추출
      const dateMatch = docId.match(/_(\d{4}-\d{2}-\d{2})$/);

      if (!dateMatch) {
        console.log(`[Cleanup] 날짜 형식 불일치로 건너뜀: ${docId}`);
        return;
      }

      const docDate = dateMatch[1];

      // cutoffDate 이하인 문서는 삭제 (문자열 비교로 가능)
      if (docDate <= cutoffDate) {
        batch.delete(doc.ref);
        deleteCount++;
        console.log(`[Cleanup] 삭제 예정: ${docId} (날짜: ${docDate})`);
      } else {
        keepCount++;
      }
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`[Cleanup] 완료: ${deleteCount}개 삭제, ${keepCount}개 유지`);
    } else {
      console.log(`[Cleanup] 삭제할 문서 없음. ${keepCount}개 유지`);
    }

    return NextResponse.json({
      success: true,
      message: `todayTemp 정리 완료`,
      cutoffDate: cutoffDate,
      deleted: deleteCount,
      kept: keepCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Cleanup] todayTemp 정리 실패:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'todayTemp 정리 실패',
        error: error.message
      },
      { status: 500 }
    );
  }
}
