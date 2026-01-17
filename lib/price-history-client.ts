// 클라이언트에서 서버 API를 통해 가격 데이터 조회
// - latest: 1시간마다 갱신 (price-latest 태그)
// - history: 24시간마다 갱신 (price-history 태그)

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
let lastHistoryFetchTime = 0;
let lastLatestFetchTime = 0;

// 클라이언트 캐시 시간
const HISTORY_CACHE_DURATION = 5 * 60 * 1000; // 5분 (history는 잘 안 바뀌므로)
const LATEST_CACHE_DURATION = 30 * 1000;      // 30초 (latest는 자주 갱신)

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
 * 히스토리 데이터 조회 (24시간 캐시)
 */
async function fetchHistoryData(): Promise<HistoryData> {
  const now = Date.now();

  // 클라이언트 캐시 확인
  if (cachedHistory && now - lastHistoryFetchTime < HISTORY_CACHE_DURATION) {
    return cachedHistory;
  }

  try {
    const response = await fetch('/api/price-data/history');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch history data');
    }

    cachedHistory = data.history;
    lastHistoryFetchTime = now;

    return data.history;
  } catch (error) {
    console.error('Error fetching history data:', error);

    if (cachedHistory) {
      console.warn('Using cached history data due to fetch error');
      return cachedHistory;
    }

    throw error;
  }
}

/**
 * 최신 가격 데이터 조회 (1시간 캐시)
 */
async function fetchLatestData(): Promise<LatestPrices> {
  const now = Date.now();

  // 클라이언트 캐시 확인
  if (cachedLatest && now - lastLatestFetchTime < LATEST_CACHE_DURATION) {
    return cachedLatest;
  }

  try {
    const response = await fetch('/api/price-data/latest');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch latest data');
    }

    cachedLatest = data.latest;
    lastLatestFetchTime = now;

    return data.latest;
  } catch (error) {
    console.error('Error fetching latest data:', error);

    if (cachedLatest) {
      console.warn('Using cached latest data due to fetch error');
      return cachedLatest;
    }

    throw error;
  }
}

/**
 * 서버 API를 통해 가격 데이터 조회 (history + latest 병렬 호출)
 */
export async function fetchPriceData(): Promise<{ history: HistoryData; latest: LatestPrices }> {
  const [history, latest] = await Promise.all([
    fetchHistoryData(),
    fetchLatestData()
  ]);

  return { history, latest };
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
  lastHistoryFetchTime = 0;
  lastLatestFetchTime = 0;
}
