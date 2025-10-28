import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * 캐시 무효화 API
 * POST /api/cache/revalidate
 */
export async function POST(request: Request) {
  try {
    // price-history 캐시 무효화
    revalidateTag('price-history');

    return NextResponse.json({
      success: true,
      message: '캐시가 무효화되었습니다. 새로고침하면 최신 데이터를 볼 수 있습니다.',
      revalidated: true,
      now: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: '캐시 무효화 중 오류가 발생했습니다.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
