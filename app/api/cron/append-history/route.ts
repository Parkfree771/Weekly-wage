import { NextResponse } from 'next/server';
import { appendYesterdayToHistory } from '@/lib/firestore-admin';

// 수동으로 history_all.json에 어제 데이터 추가하는 엔드포인트
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
    console.log('[append-history] 히스토리 업데이트 시작...');
    await appendYesterdayToHistory();
    console.log('[append-history] 히스토리 업데이트 완료');

    return NextResponse.json({
      success: true,
      message: '히스토리 업데이트 완료',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[append-history] 오류:', error);
    return NextResponse.json(
      {
        success: false,
        message: '히스토리 업데이트 실패',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
