import { NextResponse } from 'next/server';
import { generateHistoryJson } from '@/lib/firestore-admin';

// history_all.json 전체 재생성 엔드포인트
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
    console.log('[regenerate-history] 전체 히스토리 재생성 시작...');
    await generateHistoryJson();
    console.log('[regenerate-history] 전체 히스토리 재생성 완료');

    return NextResponse.json({
      success: true,
      message: '전체 히스토리 재생성 완료',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[regenerate-history] 오류:', error);
    return NextResponse.json(
      {
        success: false,
        message: '히스토리 재생성 실패',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
