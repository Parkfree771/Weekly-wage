import { NextResponse } from 'next/server';

const STORAGE_BASE_URL = 'https://storage.googleapis.com/lostark-weekly-gold.firebasestorage.app';

/**
 * 가격 히스토리 데이터 API (history_all.json)
 * - 하루에 1번 (00시) 크론에서 갱신
 * - CDN 캐시: 1년 (태그로 무효화)
 * - 브라우저 캐시: 5분 (파일이 크므로)
 */
export async function GET() {
  try {
    const response = await fetch(`${STORAGE_BASE_URL}/history_all.json`, {
      next: {
        revalidate: 86400, // 24시간 (fallback)
        tags: ['price-history']
      }
    });

    if (!response.ok) {
      console.error('[Price History API] fetch failed:', response.status);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch history data' },
        { status: 502 }
      );
    }

    const history = await response.json();

    return NextResponse.json(
      { success: true, history },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=31536000, max-age=300',
          'Netlify-Cache-Tag': 'price-history',
          'CDN-Cache-Control': 'public, s-maxage=31536000',
          'Netlify-CDN-Cache-Control': 'public, s-maxage=31536000, durable'
        }
      }
    );
  } catch (error: any) {
    console.error('[Price History API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
