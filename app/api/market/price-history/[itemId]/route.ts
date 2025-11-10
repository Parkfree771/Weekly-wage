import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getDailyPriceHistory } from '@/lib/firestore-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * 캐시를 무효화해야 하는 시간대인지 확인 (한국 시간 기준)
 * - 평소(월~일): 오전 06:00~06:59
 * - 수요일: 오전 10:00~10:59
 */
function shouldBypassCache(): boolean {
  const now = new Date();
  // 한국 시간(KST, UTC+9) 계산
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = now.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  const kstHour = kstDate.getUTCHours(); // KST 시간
  const kstDay = kstDate.getUTCDay(); // 0=일요일, 3=수요일

  // 수요일(3) 오전 10시~10시 59분
  if (kstDay === 3 && kstHour === 10) {
    console.log('[Cache Bypass] 수요일 오전 10시대 - 캐시 무시');
    return true;
  }

  // 평소 오전 6시~6시 59분
  if (kstHour === 6) {
    console.log('[Cache Bypass] 오전 6시대 - 캐시 무시');
    return true;
  }

  return false;
}

// 캐시된 가격 히스토리 조회 함수 (1시간 캐싱)
const getCachedPriceHistory = unstable_cache(
  async (itemId: string) => {
    console.log(`[Cache Miss] Fetching price history for itemId: ${itemId}`);
    const priceEntries = await getDailyPriceHistory(itemId, 30);

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
  },
  (itemId: string) => ['price-history', itemId], // itemId를 캐시 키에 포함
  {
    revalidate: 3600, // 1시간 캐싱 (cron job 주기와 동일)
    tags: ['price-history']
  }
);

// 캐시 우회용 직접 조회 함수
async function getDirectPriceHistory(itemId: string) {
  console.log(`[Direct Fetch] Fetching price history for itemId: ${itemId}`);
  const priceEntries = await getDailyPriceHistory(itemId, 30);

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

    console.log(`[API] Received request for itemId: ${itemId}, noCache: ${noCache}`);

    if (!itemId) {
      console.log('[API] Missing itemId');
      return NextResponse.json(
        { message: 'itemId가 필요합니다.' },
        { status: 400 }
      );
    }

    // noCache 파라미터가 있거나 특정 시간대에는 캐시 우회
    const bypassCache = noCache || shouldBypassCache();
    const data = bypassCache
      ? await getDirectPriceHistory(itemId)
      : await getCachedPriceHistory(itemId);

    console.log(`[API] Returning ${data.history.length} history entries (${bypassCache ? 'bypassed cache' : 'from cache or fresh'})`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] 가격 히스토리 조회 오류:', error);
    console.error('[API] Error stack:', error.stack);
    return NextResponse.json(
      {
        message: '가격 히스토리 조회 중 오류가 발생했습니다.',
        error: error.message
      },
      { status: 500 }
    );
  }
}
