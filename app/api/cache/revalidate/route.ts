import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * 캐시 무효화 API
 * - revalidateTag: Next.js 서버 캐시 무효화
 * - Netlify API: CDN 캐시 태그 기반 무효화
 *
 * 사용법:
 * - POST /api/cache/revalidate?type=latest  → price-latest만 무효화
 * - POST /api/cache/revalidate?type=history → price-history만 무효화
 * - POST /api/cache/revalidate              → 둘 다 무효화
 */

async function purgeNetlifyCDN(): Promise<{ success: boolean; message: string }> {
  const apiToken = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!apiToken || !siteId) {
    console.warn('[CDN Purge] NETLIFY_API_TOKEN 또는 NETLIFY_SITE_ID가 설정되지 않음');
    return { success: false, message: 'Netlify 환경변수 미설정' };
  }

  try {
    // 전체 사이트 캐시 퍼지 (cache_tags 없이 호출)
    const response = await fetch('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: siteId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CDN Purge] Netlify API 오류:', response.status, errorText);
      return { success: false, message: `API 오류: ${response.status}` };
    }

    console.log('[CDN Purge] Netlify CDN 전체 캐시 무효화 성공');
    return { success: true, message: '전체 캐시 무효화 완료' };
  } catch (error: any) {
    console.error('[CDN Purge] 요청 실패:', error.message);
    return { success: false, message: error.message };
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const revalidatedTags: string[] = [];
    const cdnTags: string[] = [];

    // 1. Next.js 서버 캐시 무효화
    if (!type || type === 'latest') {
      revalidateTag('price-latest', 'max');
      revalidatedTags.push('price-latest');
      cdnTags.push('price-latest');
    }

    if (!type || type === 'history') {
      revalidateTag('price-history', 'max');
      revalidatedTags.push('price-history');
      cdnTags.push('price-history');
    }

    console.log(`[Cache Revalidate] Next.js 캐시 무효화: ${revalidatedTags.join(', ')}`);

    // 2. Netlify CDN 전체 캐시 무효화
    const cdnResult = await purgeNetlifyCDN();

    return NextResponse.json({
      success: true,
      message: '캐시가 무효화되었습니다.',
      revalidated: revalidatedTags,
      cdn: cdnResult,
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
