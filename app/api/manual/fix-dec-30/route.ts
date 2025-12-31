import { NextResponse } from 'next/server';
import { getAdminFirestore, Timestamp } from '@/lib/firebase-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';

const TARGET_DATE = '2025-12-30';

/**
 * 12월 30일 데이터 수동 확정 API
 *
 * 수요일 06시 점검으로 전날 데이터 확정 로직이 실행 안 돼서
 * 12월 30일 dailyPrices가 비어있는 문제 해결
 *
 * 브라우저에서 접속: http://localhost:3000/api/manual/fix-dec-30
 */
export async function GET(request: Request) {
  const db = getAdminFirestore();
  const apiKey = process.env.LOSTARK_API_KEY;

  console.log(`\n=== 12월 30일 데이터 수동 확정 시작 ===\n`);

  const results: any[] = [];
  const errors: any[] = [];

  // ========================================
  // 1. 경매장 아이템: todayTemp에서 평균 계산
  // ========================================
  console.log(`[1] 경매장 아이템 처리 중...`);

  try {
    const tempSnapshot = await db.collection('todayTemp').get();
    const batch = db.batch();
    let auctionCount = 0;

    tempSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;

      // 문서 ID에서 날짜 추출
      const docDateMatch = docId.match(/_(\d{4}-\d{2}-\d{2})$/);
      if (!docDateMatch) return;

      const docDate = docDateMatch[1];

      // 2024-12-30 데이터만 처리
      if (docDate === TARGET_DATE && data.prices && data.prices.length > 0) {
        const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;

        // 아비도스 융화재료(6861012)만 소수점 첫째 자리까지, 나머지는 정수
        const roundedAvgPrice = data.itemId === '6861012'
          ? Math.round(avgPrice * 10) / 10
          : Math.round(avgPrice);

        const dailyDocRef = db.collection('dailyPrices').doc(`${data.itemId}_${TARGET_DATE}`);
        batch.set(dailyDocRef, {
          itemId: data.itemId,
          itemName: data.itemName,
          price: roundedAvgPrice,
          date: TARGET_DATE,
          timestamp: Timestamp.now(),
        });

        console.log(`  ✓ ${data.itemName}: ${data.prices.length}개 평균 = ${roundedAvgPrice}G`);
        results.push({
          type: 'auction',
          itemId: data.itemId,
          itemName: data.itemName,
          price: roundedAvgPrice,
          dataCount: data.prices.length
        });
        auctionCount++;
      }
    });

    await batch.commit();
    console.log(`\n[1] 경매장 아이템 완료: ${auctionCount}개\n`);
  } catch (error: any) {
    console.error('[1] 경매장 처리 오류:', error);
    errors.push({ section: '경매장', error: error.message });
  }

  // ========================================
  // 2. 거래소 아이템: API Stats[1]에서 가져오기
  // ========================================
  console.log(`[2] 거래소 아이템 처리 중...`);

  if (!apiKey) {
    errors.push({ section: '거래소', error: 'LOSTARK_API_KEY가 설정되지 않음' });
  } else {
    const marketItems = TRACKED_ITEMS.filter(item => item.type === 'market');

    for (const item of marketItems) {
      try {
        console.log(`  API 호출: ${item.name} (${item.id})...`);

        const response = await fetch(
          `https://developer-lostark.game.onstove.com/markets/items/${item.id}`,
          {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (!response.ok) {
          errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: `API 오류: ${response.status}` });
          continue;
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
          errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: '아이템 정보 없음' });
          continue;
        }

        // 거래 가능한 버전 찾기
        let itemData = null;
        for (const variant of data) {
          if (variant.Stats && variant.Stats.length > 0 && variant.Stats[0].AvgPrice > 0) {
            itemData = variant;
            break;
          }
        }

        if (!itemData) {
          errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: '거래 가능한 버전 없음' });
          continue;
        }

        // Stats[1] = 어제 데이터
        if (itemData.Stats && itemData.Stats.length > 1) {
          const yesterdayStat = itemData.Stats[1];
          const yesterdayPrice = yesterdayStat.AvgPrice || 0;
          const yesterdayDate = yesterdayStat.Date;

          console.log(`  Stats[1]: Date=${yesterdayDate}, Price=${yesterdayPrice}G`);

          if (yesterdayPrice > 0 && yesterdayDate) {
            // API 날짜가 2024-12-30인지 확인
            if (yesterdayDate === TARGET_DATE) {
              const docRef = db.collection('dailyPrices').doc(`${item.id}_${TARGET_DATE}`);
              await docRef.set({
                itemId: item.id,
                itemName: item.name,
                price: yesterdayPrice,
                date: TARGET_DATE,
                timestamp: Timestamp.now(),
              });

              console.log(`  ✓ ${item.name}: ${yesterdayPrice}G (날짜: ${yesterdayDate})`);
              results.push({
                type: 'market',
                itemId: item.id,
                itemName: item.name,
                price: yesterdayPrice,
                apiDate: yesterdayDate
              });
            } else {
              console.log(`  ⚠ ${item.name}: API 날짜가 ${TARGET_DATE}가 아닙니다 (${yesterdayDate})`);
              errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: `API 날짜 불일치: ${yesterdayDate}` });
            }
          } else {
            errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: '어제 평균가 없음' });
          }
        } else {
          errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: 'Stats[1] 없음' });
        }

        // API 요청 사이 딜레이 (rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error: any) {
        console.error(`  ❌ ${item.name} 오류:`, error.message);
        errors.push({ type: 'market', itemId: item.id, itemName: item.name, error: error.message });
      }
    }
  }

  console.log(`\n=== 완료 ===`);

  const auctionCount = results.filter(r => r.type === 'auction').length;
  const marketCount = results.filter(r => r.type === 'market').length;

  console.log(`경매장: ${auctionCount}개`);
  console.log(`거래소: ${marketCount}개`);
  console.log(`총: ${results.length}개`);

  if (errors.length > 0) {
    console.log(`\n⚠ 오류 발생: ${errors.length}개`);
  }

  return NextResponse.json({
    success: true,
    message: `12월 30일 데이터 확정 완료`,
    summary: {
      total: results.length,
      auction: auctionCount,
      market: marketCount,
      errors: errors.length
    },
    results,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString()
  });
}
