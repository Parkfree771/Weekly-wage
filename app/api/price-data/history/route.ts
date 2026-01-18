import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * history_all.json 반환
 * - CDN 캐시: 24시간 (클라이언트가 URL 쿼리로 캐시 키 관리)
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
    const file = bucket.file('history_all.json');
    const [contents] = await file.download();
    const historyData = JSON.parse(contents.toString());

    // CDN 24시간 캐시 (클라이언트가 URL 쿼리로 갱신 주기 제어)
    return NextResponse.json(historyData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });

  } catch (error) {
    console.error('[/api/price-data/history] 오류:', error);

    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}
