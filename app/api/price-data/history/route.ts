import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * history_all.json 반환
 * - CDN: durable 캐시 + price-history 태그. 데이터 변경 시 태그 퍼지로 즉시 갱신.
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

    // 이벤트 구동 캐시: history 가 바뀔 때(00시 롤오버/거래소 어제확정/heal/복구) price-history 태그를 퍼지.
    // 시간대별 동적 TTL은 제거 — 신선도는 퍼지가 담당하고, s-maxage 는 퍼지 누락 시 백스톱(1시간).
    return NextResponse.json(historyData, {
      headers: {
        'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600, stale-while-revalidate=600',
        'Netlify-Cache-Tag': 'price-history',
        'Cache-Control': 'public, max-age=0, must-revalidate', // 브라우저는 매번 CDN에 재검증
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
