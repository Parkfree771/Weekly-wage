import { NextResponse } from 'next/server';

const STORAGE_BASE_URL = 'https://storage.googleapis.com/lostark-weekly-gold.firebasestorage.app';

/**
 * 서버 측 가격 데이터 API
 * - 태그 기반 캐싱으로 크론 작업 완료 시 무효화
 * - history_all.json: 하루에 1번 (00:00 작업 후 무효화)
 * - latest_prices.json: 1시간에 1번 (10분 작업 후 무효화)
 */
export async function GET() {
  try {
    // 태그 기반 캐싱 (크론 작업에서 revalidateTag로 무효화)
    const [historyRes, latestRes] = await Promise.all([
      fetch(`${STORAGE_BASE_URL}/history_all.json`, {
        next: {
          revalidate: 86400,  // 24시간 (fallback, 실제로는 태그로 무효화)
          tags: ['price-history']
        }
      }),
      fetch(`${STORAGE_BASE_URL}/latest_prices.json`, {
        next: {
          revalidate: 3600,   // 1시간 (fallback, 실제로는 태그로 무효화)
          tags: ['price-latest']
        }
      })
    ]);

    if (!historyRes.ok) {
      console.error('[Price Data API] history_all.json fetch failed:', historyRes.status);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch history data' },
        { status: 502 }
      );
    }

    if (!latestRes.ok) {
      console.error('[Price Data API] latest_prices.json fetch failed:', latestRes.status);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch latest data' },
        { status: 502 }
      );
    }

    const history = await historyRes.json();
    const latest = await latestRes.json();

    // 캐시 헤더 설정
    // - Next.js Data Cache: 태그 기반 무효화 (크론 작업에서 revalidateTag)
    // - CDN 캐시: 1년 (크론 작업에서 revalidateTag로 무효화)
    // - 브라우저 캐시: 30초 (같은 탭에서 중복 요청 방지)
    // 주의: revalidateTag가 CDN도 무효화하는지 배포 후 확인 필요
    //       안 되면 s-maxage=60으로 롤백
    return NextResponse.json(
      { success: true, history, latest },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=31536000, max-age=30'
        }
      }
    );
  } catch (error: any) {
    console.error('[Price Data API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
