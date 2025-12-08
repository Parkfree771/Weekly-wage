import { NextResponse } from 'next/server';
import { generateHistoryJson } from '@/lib/firestore-admin';

/**
 * 초기 마이그레이션: Firestore dailyPrices → history_all.json
 *
 * 이 API는 한 번만 실행하면 됩니다.
 * 실행 방법: 브라우저에서 /api/migrate-history 접속
 *
 * 주의: 프로덕션에서는 인증 필수!
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
    console.log('[Migrate History] 초기 마이그레이션 시작...');

    // Firestore의 모든 dailyPrices 데이터를 history_all.json으로 변환
    await generateHistoryJson();

    console.log('[Migrate History] 마이그레이션 완료!');

    return NextResponse.json({
      success: true,
      message: '히스토리 JSON 생성 완료',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Migrate History] 마이그레이션 실패:', error);

    return NextResponse.json({
      success: false,
      message: '마이그레이션 실패',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
