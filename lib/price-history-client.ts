// 클라이언트에서 Firebase Storage의 JSON 파일을 직접 다운로드하여 가격 히스토리 조회

const STORAGE_BASE_URL = 'https://storage.googleapis.com/lostark-weekly-gold.firebasestorage.app';

type PriceEntry = {
  price: number;
  timestamp: string;
  date: string;
};

type HistoryData = Record<string, Array<{ date: string; price: number }>>;
type LatestPrices = Record<string, number>;

// 캐시 (메모리)
let cachedHistory: HistoryData | null = null;
let cachedLatest: LatestPrices | null = null;
let lastFetchTime = 0;

const CACHE_DURATION = 5 * 60 * 1000; // 5분

/**
 * 로스트아크 날짜 계산 (오전 6시 기준, 한국 시간)
 */
function getLostArkDate(date: Date = new Date()): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = date.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  // 오전 6시 이전이면 전날
  if (kstDate.getUTCHours() < 6) {
    kstDate.setUTCDate(kstDate.getUTCDate() - 1);
  }

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * history_all.json과 latest_prices.json 다운로드 (캐싱)
 */
export async function fetchPriceData(): Promise<{ history: HistoryData; latest: LatestPrices }> {
  const now = Date.now();

  // 캐시가 유효하면 반환
  if (cachedHistory && cachedLatest && now - lastFetchTime < CACHE_DURATION) {
    return { history: cachedHistory, latest: cachedLatest };
  }

  try {
    // 두 파일 병렬 다운로드
    const [historyRes, latestRes] = await Promise.all([
      fetch(`${STORAGE_BASE_URL}/history_all.json?t=${now}`),
      fetch(`${STORAGE_BASE_URL}/latest_prices.json?t=${now}`)
    ]);

    if (!historyRes.ok || !latestRes.ok) {
      throw new Error('Failed to fetch price data from storage');
    }

    const history: HistoryData = await historyRes.json();
    const latest: LatestPrices = await latestRes.json();

    // 캐시 저장
    cachedHistory = history;
    cachedLatest = latest;
    lastFetchTime = now;

    return { history, latest };
  } catch (error) {
    console.error('Error fetching price data:', error);

    // 에러 시 캐시가 있으면 반환
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

  // history_all.json 데이터 변환
  itemHistory.forEach((entry) => {
    const [year, month, day] = entry.date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    result.push({
      price: entry.price,
      timestamp: utcDate.toISOString(),
      date: entry.date,
    });
  });

  // 오늘 날짜 추가 (latest_prices.json)
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

    // history_all.json 데이터 변환
    itemHistory.forEach((entry) => {
      const [year, month, day] = entry.date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      entries.push({
        price: entry.price,
        timestamp: utcDate.toISOString(),
        date: entry.date,
      });
    });

    // 오늘 날짜 추가 (latest_prices.json)
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
