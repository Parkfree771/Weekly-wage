import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';

/**
 * 잘못된 날짜 데이터 삭제 API
 * 사용법: GET /api/admin/delete-wrong-date?date=2025-02-04
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: '인증되지 않은 요청입니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const wrongDate = searchParams.get('date');

  if (!wrongDate) {
    return NextResponse.json({ error: 'date 파라미터가 필요합니다.' }, { status: 400 });
  }

  try {
    const storage = getAdminStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수 없음');

    const bucket = storage.bucket(bucketName);

    // history_all.json 읽기
    const historyFile = bucket.file('history_all.json');
    const [contents] = await historyFile.download();
    const historyData = JSON.parse(contents.toString());

    // 잘못된 날짜 데이터 삭제
    let deletedCount = 0;
    const deletedItems: string[] = [];

    for (const [itemId, entries] of Object.entries(historyData) as [string, any[]][]) {
      const originalLength = entries.length;
      historyData[itemId] = entries.filter((entry: any) => entry.date !== wrongDate);

      if (historyData[itemId].length < originalLength) {
        deletedCount++;
        deletedItems.push(itemId);
      }
    }

    // 저장
    await historyFile.save(JSON.stringify(historyData, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate',
      },
    });
    await historyFile.makePublic();

    console.log(`[delete-wrong-date] ${wrongDate} 데이터 ${deletedCount}개 삭제 완료`);

    return NextResponse.json({
      success: true,
      deletedDate: wrongDate,
      deletedCount,
      deletedItems,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
