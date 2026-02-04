import { NextResponse } from 'next/server';
import { saveHistoricalPrice, generateAndUploadPriceJson } from '@/lib/firestore-admin';
import { TRACKED_ITEMS } from '@/lib/items-to-track';

/**
 * 누락된 거래소 가격 히스토리 수습용 API
 * Stats[1] (어제 확정 평균가)을 history_all.json에 저장
 *
 * 사용법: GET /api/admin/fix-missing-history?date=2025-02-04
 * - date 파라미터가 없으면 Stats[1]의 Date 그대로 사용
 * - date 파라미터가 있으면 해당 날짜로 강제 저장
 */
export async function GET(request: Request) {
  // 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: '인증되지 않은 요청입니다.' },
      { status: 401 }
    );
  }

  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  // 쿼리 파라미터
  const { searchParams } = new URL(request.url);
  const forceDateParam = searchParams.get('date'); // 강제 날짜 지정 (예: 2025-02-04)

  const results: any[] = [];
  const errors: any[] = [];

  // 거래소 아이템만 필터링
  const marketItems = TRACKED_ITEMS.filter(item => item.type === 'market');

  console.log(`[fix-missing-history] 거래소 아이템 ${marketItems.length}개 처리 시작...`);
  if (forceDateParam) {
    console.log(`[fix-missing-history] 강제 날짜 지정: ${forceDateParam}`);
  }

  for (const item of marketItems) {
    try {
      console.log(`[Market] Fetching ${item.name} (${item.id})...`);

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
        errors.push({ itemId: item.id, itemName: item.name, error: `API 오류: ${response.status}` });
        continue;
      }

      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        errors.push({ itemId: item.id, itemName: item.name, error: '아이템 정보를 찾을 수 없음' });
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
        errors.push({ itemId: item.id, itemName: item.name, error: '거래 가능한 아이템 버전 없음' });
        continue;
      }

      // Stats[1]은 어제(또는 전날) 확정 데이터
      if (itemData.Stats && itemData.Stats.length > 1) {
        const yesterdayStat = itemData.Stats[1];
        const yesterdayPrice = yesterdayStat.AvgPrice || 0;
        const apiDate = yesterdayStat.Date; // API에서 제공하는 날짜

        // 저장할 날짜 결정 (강제 지정 또는 API 날짜)
        const targetDate = forceDateParam || apiDate;

        if (yesterdayPrice > 0 && targetDate) {
          await saveHistoricalPrice(item.id, yesterdayPrice, targetDate, item.name);
          console.log(`[Market] ${item.name} - Stats[1] 저장: ${targetDate} = ${yesterdayPrice}G (API Date: ${apiDate})`);

          results.push({
            itemId: item.id,
            itemName: item.name,
            date: targetDate,
            apiDate: apiDate,
            price: yesterdayPrice,
          });
        } else {
          errors.push({
            itemId: item.id,
            itemName: item.name,
            error: `유효한 데이터 없음 (price: ${yesterdayPrice}, date: ${targetDate})`
          });
        }
      } else {
        errors.push({ itemId: item.id, itemName: item.name, error: 'Stats[1] 데이터 없음' });
      }

      // API 요청 사이에 딜레이 (rate limit 방지)
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error: any) {
      console.error(`아이템 ${item.id} 처리 오류:`, error.message);
      errors.push({ itemId: item.id, itemName: item.name, error: error.message });
    }
  }

  // JSON 파일 업로드
  try {
    console.log('[fix-missing-history] JSON 파일 업로드 시작...');
    await generateAndUploadPriceJson();
    console.log('[fix-missing-history] JSON 파일 업로드 완료');
  } catch (error: any) {
    console.error('[fix-missing-history] JSON 업로드 실패:', error);
    errors.push({ message: 'JSON 업로드 실패', error: error.message });
  }

  return NextResponse.json({
    success: true,
    message: `수습 완료: ${results.length}개 성공, ${errors.length}개 실패`,
    forceDateUsed: forceDateParam || null,
    timestamp: new Date().toISOString(),
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
