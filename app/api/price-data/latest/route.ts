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
    const rawData = JSON.parse(contents.toString());

    // _meta와 _raw 필드 제외하고 가격 데이터만 반환
    // 컴포넌트들이 Object.entries()로 순회하므로 순수 가격 데이터만 제공
    const latestPrices: Record<string, number> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (!key.startsWith('_') && typeof value === 'number') {
        latestPrices[key] = value;
      }
    }

    // 이벤트 구동 캐시: 가격이 들어올 때(크론/heal/복구) price-latest 태그를 퍼지 → 즉시 갱신.
    // 평소엔 durable 캐시가 100% 히트로 오리진 보호. s-maxage 는 퍼지를 놓쳤을 때의 백스톱(1시간).
    return NextResponse.json(latestPrices, {
      headers: {
        'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600, stale-while-revalidate=600',
        'Netlify-Cache-Tag': 'price-latest',
        'Cache-Control': 'public, max-age=0, must-revalidate', // 브라우저는 매번 CDN에 재검증
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
