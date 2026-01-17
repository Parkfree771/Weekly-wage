// 클라이언트에서 서버 API를 통해 가격 데이터 조회
// 서버에서 5분 캐싱하므로 Firebase Storage 다운로드 횟수 최소화

type PriceEntry = {
  price: number;
  timestamp: string;
  date: string;
};

type HistoryData = Record<string, Array<{ date: string; price: number }>>;
type LatestPrices = Record<string, number>;

// 클라이언트 메모리 캐시 (같은 탭 내 중복 요청 방지)
let cachedHistory: HistoryData | null = null;
let cachedLatest: LatestPrices | null = null;
let lastFetchTime = 0;

// 클라이언트 캐시: 30초 (서버가 5분 캐시하므로 짧게 유지)
const CLIENT_CACHE_DURATION = 30 * 1000;

/**
 * 날짜 계산 (오전 0시 기준, 한국 시간)
 */
function getLostArkDate(date: Date = new Date()): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = date.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 서버 API를 통해 가격 데이터 조회 (서버에서 5분 캐싱)
 * - 서버: Firebase Storage JSON 5분 캐싱
 * - 클라이언트: 30초 메모리 캐싱 (중복 요청 방지)
 */
export async function fetchPriceData(): Promise<{ history: HistoryData; latest: LatestPrices }> {
  const now = Date.now();

  // 클라이언트 캐시 확인 (30초)
  if (cachedHistory && cachedLatest && now - lastFetchTime < CLIENT_CACHE_DURATION) {
    return { history: cachedHistory, latest: cachedLatest };
  }

  try {
    // 서버 API 호출 (서버에서 5분 캐싱됨)
    const response = await fetch('/api/price-data');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch price data');
    }

    const history: HistoryData = data.history;
    const latest: LatestPrices = data.latest;

    // 클라이언트 캐시 저장
    cachedHistory = history;
    cachedLatest = latest;
    lastFetchTime = now;

    return { history, latest };
  } catch (error) {
    console.error('Error fetching price data:', error);

    // 에러 시 캐시가 있으면 반환 (stale data)
    if (cachedHistory && cachedLatest) {
      console.warn('Using cached data due to fetch error');
      return { history: cachedHistory, latest: cachedLatest };
    }

    throw error;
  }
}

/**
 * 특정 아이템의 가격 히스토리 조회
 * @param itemId 아이템 ID
 * @param days 조회할 일수 (기본 30일)
 */
export async function getItemPriceHistory(itemId: string, days: number = 30): Promise<PriceEntry[]> {
  const { history, latest } = await fetchPriceData();

  const itemHistory = history[itemId] || [];
  const result: PriceEntry[] = [];

  // history 데이터 변환
  itemHistory.forEach((entry) => {
    const [year, month, day] = entry.date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    result.push({
      price: entry.price,
      timestamp: utcDate.toISOString(),
      date: entry.date,
    });
  });

  // 오늘 날짜 추가 (latest_prices)
  const todayKey = getLostArkDate();
  const todayPrice = latest[itemId];

  if (todayPrice !== undefined) {
    const alreadyExists = result.some(entry => entry.date === todayKey);
    if (!alreadyExists) {
      const [year, month, day] = todayKey.split('-').map(Number);
      const todayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      result.push({
        price: todayPrice,
        timestamp: todayUtc.toISOString(),
        date: todayKey,
      });
    }
  }

  // 날짜순 정렬 (오래된 것부터)
  result.sort((a, b) => a.date.localeCompare(b.date));

  // 최근 days개만 반환
  return result.slice(-days);
}

/**
 * 여러 아이템의 가격 히스토리를 한 번에 조회
 */
export async function getMultipleItemPriceHistory(
  itemIds: string[],
  days: number = 30
): Promise<Record<string, PriceEntry[]>> {
  const { history, latest } = await fetchPriceData();
  const todayKey = getLostArkDate();
  const result: Record<string, PriceEntry[]> = {};

  for (const itemId of itemIds) {
    const itemHistory = history[itemId] || [];
    const entries: PriceEntry[] = [];

    // history 데이터 변환
    itemHistory.forEach((entry) => {
      const [year, month, day] = entry.date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      entries.push({
        price: entry.price,
        timestamp: utcDate.toISOString(),
        date: entry.date,
      });
    });

    // 오늘 날짜 추가 (latest_prices)
    const todayPrice = latest[itemId];
    if (todayPrice !== undefined) {
      const alreadyExists = entries.some(entry => entry.date === todayKey);
      if (!alreadyExists) {
        const [year, month, day] = todayKey.split('-').map(Number);
        const todayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        entries.push({
          price: todayPrice,
          timestamp: todayUtc.toISOString(),
          date: todayKey,
        });
      }
    }

    // 날짜순 정렬 후 최근 days개만 저장
    entries.sort((a, b) => a.date.localeCompare(b.date));
    result[itemId] = entries.slice(-days);
  }

  return result;
}

/**
 * 캐시 강제 초기화 (필요시)
 */
export function clearPriceCache(): void {
  cachedHistory = null;
  cachedLatest = null;
  lastFetchTime = 0;
}
