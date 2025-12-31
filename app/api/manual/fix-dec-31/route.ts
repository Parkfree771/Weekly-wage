import { NextResponse } from 'next/server';
import { getAdminFirestore, getAdminStorage, Timestamp } from '@/lib/firebase-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';

const TARGET_DATE = '2025-12-31';

/**
 * 12월 31일 데이터 복구 API
 *
 * latest_prices.json에서 데이터를 가져와서:
 * 1. dailyPrices에 저장 (확정 데이터)
 * 2. todayTemp에도 저장 (다음 시간부터 누적 평균 가능하게)
 *
 * 브라우저에서 접속: http://localhost:3000/api/manual/fix-dec-31
 */
export async function GET(request: Request) {
  const db = getAdminFirestore();
  const storage = getAdminStorage();

  console.log(`\n=== 12월 31일 데이터 복구 시작 ===\n`);

  const results: any[] = [];
  const errors: any[] = [];

  try {
    // ========================================
    // 1. latest_prices.json 다운로드
    // ========================================
    console.log('[1] latest_prices.json 다운로드 중...');

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file('latest_prices.json');

    const [contents] = await file.download();
    const latestPrices: Record<string, number> = JSON.parse(contents.toString());

    console.log(`[1] latest_prices.json 로드 완료: ${Object.keys(latestPrices).length}개 아이템`);

    // ========================================
    // 2. dailyPrices에 저장 + todayTemp 초기화
    // ========================================
    console.log('[2] dailyPrices 및 todayTemp 저장 중...');

    const batch1 = db.batch();
    const batch2 = db.batch();
    let savedCount = 0;

    for (const item of TRACKED_ITEMS) {
      const price = latestPrices[item.id];

      if (price === undefined || price === null) {
        errors.push({ itemId: item.id, itemName: item.name, error: 'JSON에 데이터 없음' });
        continue;
      }

      // 2-1. dailyPrices에 저장 (확정 데이터)
      const dailyDocRef = db.collection('dailyPrices').doc(`${item.id}_${TARGET_DATE}`);
      batch1.set(dailyDocRef, {
        itemId: item.id,
        itemName: item.name,
        price: price,
        date: TARGET_DATE,
        timestamp: Timestamp.now(),
      });

      // 2-2. todayTemp에도 저장 (다음 시간부터 누적 평균 가능하게)
      const tempDocRef = db.collection('todayTemp').doc(`${item.id}_${TARGET_DATE}`);

      if (item.type === 'market') {
        // 거래소: 평균값 단일로 저장
        batch2.set(tempDocRef, {
          itemId: item.id,
          itemName: item.name,
          prices: [price],
          count: 1,
          lastUpdated: Timestamp.now(),
        });
      } else {
        // 경매장: 배열로 저장 (누적 평균용)
        batch2.set(tempDocRef, {
          itemId: item.id,
          itemName: item.name,
          prices: [price],
          count: 1,
          lastUpdated: Timestamp.now(),
        });
      }

      results.push({
        itemId: item.id,
        itemName: item.name,
        type: item.type,
        price: price
      });

      savedCount++;
      console.log(`  ✓ ${item.name}: ${price}G`);
    }

    // Batch commit
    await batch1.commit();
    await batch2.commit();

    console.log(`\n[2] 저장 완료: ${savedCount}개 아이템`);

    // ========================================
    // 결과 요약
    // ========================================
    console.log(`\n=== 완료 ===`);
    console.log(`총: ${savedCount}개`);

    if (errors.length > 0) {
      console.log(`\n⚠ 오류 발생: ${errors.length}개`);
      errors.forEach(err => {
        console.log(`  - ${err.itemName || err.itemId}: ${err.error}`);
      });
    }

    return NextResponse.json({
      success: true,
      message: `12월 31일 데이터 복구 완료`,
      summary: {
        total: savedCount,
        errors: errors.length,
        date: TARGET_DATE
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[오류]', error);
    return NextResponse.json(
      {
        success: false,
        message: '12월 31일 데이터 복구 실패',
        error: error.message
      },
      { status: 500 }
    );
  }
}
