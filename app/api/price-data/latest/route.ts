import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * latest_prices.json 반환
 * - CDN 캐시: 10분 (클라이언트가 URL 쿼리로 캐시 키 관리)
 * - 서버리스라서 서버 메모리 캐시 없음
 */
export async function GET() {
  try {
    const storage = getAdminStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file('latest_prices.json');
    const [contents] = await file.download();
    const latestPrices = JSON.parse(contents.toString());

    // CDN 10분 캐시 (클라이언트가 URL 쿼리로 갱신 주기 제어)
    return NextResponse.json(latestPrices, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
        'Netlify-Vary': 'query=k',  // 쿼리 파라미터 k를 캐시 키에 포함
      },
    });

  } catch (error) {
    console.error('[/api/price-data/latest] 오류:', error);

    return NextResponse.json(
      { error: 'Failed to fetch latest prices' },
      { status: 500 }
    );
  }
}
