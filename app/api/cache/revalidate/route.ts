import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { purgeCache } from '@netlify/functions';

/**
 * 캐시 무효화 API
 * - revalidateTag: Next.js 캐시 무효화
 * - purgeCache: Netlify CDN 캐시 무효화
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const revalidated: string[] = [];

    // Next.js 캐시 무효화
    if (!type || type === 'latest') {
      revalidateTag('price-latest', 'max');
      revalidated.push('price-latest');
    }

    if (!type || type === 'history') {
      revalidateTag('price-history', 'max');
      revalidated.push('price-history');
    }

    // Netlify CDN 캐시 무효화
    try {
      await purgeCache({
        tags: revalidated
      });
      console.log(`[Cache Revalidate] Netlify CDN 캐시 무효화 완료: ${revalidated.join(', ')}`);
    } catch (cdnError: any) {
      console.error('[Cache Revalidate] Netlify CDN 무효화 실패:', cdnError.message);
      // CDN 무효화 실패해도 계속 진행
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
