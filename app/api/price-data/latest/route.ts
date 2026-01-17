import { NextResponse } from 'next/server';

const STORAGE_BASE_URL = 'https://storage.googleapis.com/lostark-weekly-gold.firebasestorage.app';

/**
 * 최신 가격 데이터 API (latest_prices.json)
 * - 1시간마다 크론에서 갱신
 * - CDN 캐시: 1년 (태그로 무효화)
 * - 브라우저 캐시: 30초
 */
export async function GET() {
  try {
    const response = await fetch(`${STORAGE_BASE_URL}/latest_prices.json`, {
      next: {
        revalidate: 3600, // 1시간 (fallback)
        tags: ['price-latest']
      }
    });

    if (!response.ok) {
      console.error('[Price Latest API] fetch failed:', response.status);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch latest data' },
        { status: 502 }
      );
    }

    const latest = await response.json();

    return NextResponse.json(
      { success: true, latest },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=31536000, max-age=30',
          'Netlify-Cache-Tag': 'price-latest',
          'CDN-Cache-Control': 'public, s-maxage=31536000',
          'Netlify-CDN-Cache-Control': 'public, s-maxage=31536000, durable'
        }
      }
    );
  } catch (error: any) {
    console.error('[Price Latest API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
