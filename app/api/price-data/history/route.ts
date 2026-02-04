import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * 한국 시간(KST) 기준 00시대인지 확인
 */
function isMidnightHourKST(): boolean {
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  return kstHour === 0;
}

/**
 * history_all.json 반환
 * - CDN 캐시: 00시~01시에는 10분, 그 외에는 24시간
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

    // 00:00~01:30에는 10분 캐시, 그 외에는 다음 00시까지만 캐시
    let cacheControl: string;
    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstMinute = now.getUTCMinutes();

    // 00:00~01:30 범위 체크 (크론 실행 + GitHub Actions 지연 대비)
    const isUpdateWindow =
      (kstHour === 0) ||
      (kstHour === 1 && kstMinute <= 30);

    if (isUpdateWindow) {
      // 00:00~01:30: 10분 캐시
      cacheControl = 'public, s-maxage=600, stale-while-revalidate=60';
    } else {
      // 그 외: 다음 00시까지 남은 시간만큼 캐시 (분 단위 계산)
      const minutesUntilMidnight = (23 - kstHour) * 60 + (60 - kstMinute);
      const secondsUntilMidnight = minutesUntilMidnight * 60;
      cacheControl = `public, s-maxage=${secondsUntilMidnight}, stale-while-revalidate=600`;
    }

    return NextResponse.json(historyData, {
      headers: {
        'Cache-Control': cacheControl,
        'Netlify-Vary': 'query=k',  // 쿼리 파라미터 k를 캐시 키에 포함
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
