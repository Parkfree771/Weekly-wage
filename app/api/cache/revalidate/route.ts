import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * 캐시 무효화 API
 * POST /api/cache/revalidate
 *
 * Query params:
 * - type=latest  → price-latest 태그 무효화 (latest_prices.json)
 * - type=history → price-history 태그 무효화 (history_all.json)
 * - type 없음    → 둘 다 무효화
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const revalidated: string[] = [];

    if (!type || type === 'latest') {
      revalidateTag('price-latest', 'max');
      revalidated.push('price-latest');
    }

    if (!type || type === 'history') {
      revalidateTag('price-history', 'max');
      revalidated.push('price-history');
    }

    console.log(`[Cache Revalidate] 무효화된 태그: ${revalidated.join(', ')}`);

    return NextResponse.json({
      success: true,
      message: '캐시가 무효화되었습니다.',
      revalidated,
      now: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cache Revalidate] 오류:', error);
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

// GET도 지원 (편의성)
export async function GET(request: Request) {
  return POST(request);
}
