import { NextResponse } from 'next/server';
import { getDailyPriceHistory } from '@/lib/firestore-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * 캐시를 무효화해야 하는 시간대인지 확인 (한국 시간 기준)
 * - 매일: 오전 00:00~00:59 (날짜 변경 시점)
 */
function shouldBypassCache(): boolean {
  const now = new Date();
  // 한국 시간(KST, UTC+9) 계산
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = now.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  const kstHour = kstDate.getUTCHours(); // KST 시간

  // 00시대 (날짜 변경 시점)
  if (kstHour === 0) {
    console.log('[Cache Bypass] 오전 0시대 - 캐시 무시');
    return true;
  }

  return false;
}

/**
 * 시간대별 Cache-Control 헤더 반환
 * - 날짜 변경 시간대 (00시): 5분 캐시 (빠른 갱신)
 * - 평상시: 1시간 캐시 (API 부하 최소화)
 */
function getCacheControlHeader(): string {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = now.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  const kstHour = kstDate.getUTCHours();

  // 1. 날짜 변경 시간대 (00:00~00:59)
  //    → 5분 캐시 - 새 데이터 빠르게 반영
  if (kstHour === 0) {
    return 'public, max-age=300, s-maxage=300, stale-while-revalidate=60';
  }

  // 2. 평상시 (나머지 시간)
  //    → 1시간 캐시 - 과부하 방지
  return 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600';
}

// 캐시된 가격 히스토리 조회 함수 (데이터 있는 경우만)
async function getCachedPriceHistory(itemId: string, days: number) {
  console.log(`[Cache Miss] Fetching price history for itemId: ${itemId}, days: ${days}`);
  const priceEntries = await getDailyPriceHistory(itemId, days);

  // Timestamp를 ISO 문자열로 변환하고 date 필드 그대로 전달
  const history = priceEntries.map((entry) => {
    return {
      price: entry.price,
      timestamp: entry.timestamp.toDate().toISOString(),
      date: entry.date, // Firestore의 date 필드 그대로 사용 (YYYY-MM-DD)
    };
  });

  return {
    itemId,
    history,
    count: history.length,
    cachedAt: new Date().toISOString(),
  };
}

// 빈 결과 캐시 (짧은 시간만 유지)
async function getCachedEmptyResult(itemId: string, days: number) {
  console.log(`[Empty Cache Miss] Checking for itemId: ${itemId}, days: ${days}`);
  const priceEntries = await getDailyPriceHistory(itemId, days);

  const history = priceEntries.map((entry) => {
    return {
      price: entry.price,
      timestamp: entry.timestamp.toDate().toISOString(),
      date: entry.date,
    };
  });

  return {
    itemId,
    history,
    count: history.length,
    cachedAt: new Date().toISOString(),
  };
}

// 캐시 우회용 직접 조회 함수
async function getDirectPriceHistory(itemId: string, days: number) {
  console.log(`[Direct Fetch] Fetching price history for itemId: ${itemId}, days: ${days}`);
  const priceEntries = await getDailyPriceHistory(itemId, days);

  // Timestamp를 ISO 문자열로 변환하고 date 필드 그대로 전달
  const history = priceEntries.map((entry) => {
    return {
      price: entry.price,
      timestamp: entry.timestamp.toDate().toISOString(),
      date: entry.date, // Firestore의 date 필드 그대로 사용 (YYYY-MM-DD)
    };
  });

  return {
    itemId,
    history,
    count: history.length,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const url = new URL(request.url);
    const noCache = url.searchParams.get('noCache') === 'true';

    // days 파라미터 추가 (기본값 30일, 최대 999일)
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? Math.min(parseInt(daysParam, 10), 999) : 30;

    console.log(`[API] Received request for itemId: ${itemId}, noCache: ${noCache}, days: ${days}`);

    if (!itemId) {
      console.log('[API] Missing itemId');
      return NextResponse.json(
        { message: 'itemId가 필요합니다.' },
        { status: 400 }
      );
    }

    // noCache 파라미터가 있거나 특정 시간대에는 캐시 우회
    const bypassCache = noCache || shouldBypassCache();

    let data;

    if (bypassCache) {
      // 캐시 우회: 직접 조회
      data = await getDirectPriceHistory(itemId, days);
    } else {
      // 일반 캐시 시도
      data = await getCachedPriceHistory(itemId, days);

      // 데이터가 비어있으면 짧은 캐시(3분) 사용
      if (data.history.length === 0) {
        console.log(`[API] Empty result, using short-term cache for itemId: ${itemId}`);
        data = await getCachedEmptyResult(itemId, days);
      }
    }

    console.log(`[API] Returning ${data.history.length} history entries (${bypassCache ? 'bypassed cache' : 'from cache'})`);

    if (data.history.length === 0) {
      console.warn(`[API] No price data found for itemId: ${itemId} - Check if GitHub Actions is collecting this item`);
    }

    // Cache-Control 헤더 결정
    let cacheControl: string;

    if (noCache) {
      // GitHub Actions 캐시 예열용: 짧은 캐시 (5분)
      // 시간대와 무관하게 항상 5분 캐시 적용
      cacheControl = 'public, max-age=300, s-maxage=300, stale-while-revalidate=60';
      console.log('[API] noCache=true - 5분 캐시 적용 (캐시 예열용)');
    } else {
      // 일반 사용자: 시간대별 캐시 전략
      cacheControl = getCacheControlHeader();
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
      }
    });
  } catch (error: any) {
    console.error('[API] 가격 히스토리 조회 오류:', error);
    console.error('[API] Error stack:', error.stack);
    return NextResponse.json(
      {
        message: '가격 히스토리 조회 중 오류가 발생했습니다.',
        error: error.message
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store', // 에러는 캐시 안함
        }
      }
    );
  }
}
