// 클라이언트에서 Next.js API를 통해 가격 히스토리 조회
// URL 쿼리 파라미터로 CDN 캐시 제어
// 아카이브(정적) + 최근(API) 병합 구조

type PriceEntry = {
  price: number;
  timestamp: string;
  date: string;
};

type HistoryData = Record<string, Array<{ date: string; price: number }>>;
type LatestPrices = Record<string, number>;

// 아카이브 캐시 (정적 파일, 한 번 로드하면 영구 유지)
let cachedArchive: HistoryData | null = null;
let pendingArchive: Promise<HistoryData> | null = null;

// API 데이터 캐시 (최근 데이터, 캐시 키로 갱신 관리)
let cachedHistory: HistoryData | null = null;
let cachedLatest: LatestPrices | null = null;
let lastHistoryCacheKey = '';
let lastLatestCacheKey = '';

// 진행 중인 요청 추적 (동시 호출 방지)
let pendingRequest: Promise<{ history: HistoryData; latest: LatestPrices }> | null = null;

/**
 * 타임아웃이 있는 fetch (기본 15초)
 */
function fetchWithTimeout(url: string, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

/**
 * 한국 시간(KST) 정보 가져오기
 */
function getKSTInfo(): { date: string; hour: number; minute: number } {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = now.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    hour: kstDate.getUTCHours(),
    minute: kstDate.getUTCMinutes()
  };
}

/**
 * 한국 시간(KST) 기준 00시~01시인지 확인
 */
function isMidnightHour(): boolean {
  return getKSTInfo().hour === 0;
}

/**
 * latest.json 캐시 키 생성
 * - 하루 종일 10분 단위
 */
function getLatestCacheKey(): string {
  const { date, hour, minute } = getKSTInfo();
  const slot = Math.floor(minute / 10) * 10; // 0, 10, 20, 30, 40, 50
  return `${date}-${String(hour).padStart(2, '0')}-${String(slot).padStart(2, '0')}`;
}

/**
 * history.json 캐시 키 생성
 * - 00:00~01:30: 10분 단위 (크론 실행 + GitHub Actions 지연 대비)
 * - 그 외: 하루 종일 같은 키 (날짜만)
 */
function getHistoryCacheKey(): string {
  const { date, hour, minute } = getKSTInfo();

  // 00:00~01:30 범위 체크
  const isUpdateWindow =
    (hour === 0) ||
    (hour === 1 && minute <= 30);

  if (isUpdateWindow) {
    // 00:00~01:30: 10분 단위
    const slot = Math.floor(minute / 10) * 10;
    return `${date}-${String(hour).padStart(2, '0')}-${String(slot).padStart(2, '0')}`;
  } else {
    // 그 외: 날짜만 (하루 종일 캐시)
    return date;
  }
}

/**
 * 날짜 계산 (오전 0시 기준, 한국 시간)
 */
function getLostArkDate(): string {
  return getKSTInfo().date;
}

/**
 * 정적 아카이브 로드 (한 번만, 이후 메모리 캐시)
 * public/data/history_archive.json → 빌드 시점에 고정된 과거 데이터
 */
async function loadArchive(): Promise<HistoryData> {
  if (cachedArchive) return cachedArchive;
  if (pendingArchive) return pendingArchive;

  pendingArchive = fetchWithTimeout('/data/history_archive.json', 30000)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch archive');
      return res.json();
    })
    .then((data: HistoryData) => {
      cachedArchive = data;
      return data;
    })
    .catch(err => {
      console.error('Archive load failed:', err);
      return {} as HistoryData;
    })
    .finally(() => {
      pendingArchive = null;
    });

  return pendingArchive;
}

/**
 * 아카이브 + API 최근 데이터를 병합
 * 같은 날짜가 겹치면 API(최근) 데이터 우선
 */
function mergeHistory(archive: HistoryData, recent: HistoryData): HistoryData {
  const merged: HistoryData = {};
  const allItemIds = new Set([...Object.keys(archive), ...Object.keys(recent)]);

  for (const itemId of allItemIds) {
    const archiveEntries = archive[itemId] || [];
    const recentEntries = recent[itemId] || [];

    // 최근 데이터의 날짜 Set (중복 제거용)
    const recentDates = new Set(recentEntries.map(e => e.date));

    // 아카이브에서 겹치지 않는 것 + 최근 데이터 전부
    merged[itemId] = [
      ...archiveEntries.filter(e => !recentDates.has(e.date)),
      ...recentEntries
    ];
  }

  return merged;
}

/**
 * 아카이브(정적) + history_all.json(API) + latest_prices.json(API) 조회
 * - 아카이브: 정적 파일, 한 번 로드 후 영구 캐시
 * - history: URL 쿼리 파라미터(k)로 CDN 캐시 제어
 * - 동시 호출 시 중복 요청 방지
 */
export async function fetchPriceData(): Promise<{ history: HistoryData; latest: LatestPrices }> {
  const historyCacheKey = getHistoryCacheKey();
  const latestCacheKey = getLatestCacheKey();

  // 캐시 키가 같으면 클라이언트 메모리 캐시 사용 (병합 완료된 상태)
  const historyValid = cachedHistory && lastHistoryCacheKey === historyCacheKey;
  const latestValid = cachedLatest && lastLatestCacheKey === latestCacheKey;

  if (historyValid && latestValid) {
    return { history: cachedHistory!, latest: cachedLatest! };
  }

  // 이미 진행 중인 요청이 있으면 그 결과를 기다림 (동시 호출 방지)
  if (pendingRequest) {
    return pendingRequest;
  }

  // 새 요청 시작
  pendingRequest = (async () => {
    try {
      const needHistory = !historyValid;
      const needLatest = !latestValid;

      // 아카이브 + API 요청을 병렬로 실행
      const promises: Promise<any>[] = [];
      let promiseMap: string[] = [];

      // 아카이브는 항상 로드 시도 (캐시되어 있으면 즉시 반환)
      if (needHistory) {
        promises.push(loadArchive());
        promiseMap.push('archive');

        promises.push(fetchWithTimeout(`/api/price-data/history?k=${historyCacheKey}`).then(res => {
          if (!res.ok) throw new Error('Failed to fetch history');
          return res.json();
        }));
        promiseMap.push('history');
      }

      if (needLatest) {
        promises.push(fetchWithTimeout(`/api/price-data/latest?k=${latestCacheKey}`).then(res => {
          if (!res.ok) throw new Error('Failed to fetch latest');
          return res.json();
        }));
        promiseMap.push('latest');
      }

      const results = await Promise.all(promises);

      if (needHistory) {
        const archiveIdx = promiseMap.indexOf('archive');
        const historyIdx = promiseMap.indexOf('history');
        const archive = results[archiveIdx] as HistoryData;
        const recent = results[historyIdx] as HistoryData;

        // 아카이브 + 최근 데이터 병합
        cachedHistory = mergeHistory(archive, recent);
        lastHistoryCacheKey = historyCacheKey;
      }

      if (needLatest) {
        const latestIdx = promiseMap.indexOf('latest');
        cachedLatest = results[latestIdx] as LatestPrices;
        lastLatestCacheKey = latestCacheKey;
      }

      return { history: cachedHistory!, latest: cachedLatest! };
    } catch (error) {
      console.error('Error fetching price data:', error);

      // 에러 시 캐시가 있으면 반환
      if (cachedHistory && cachedLatest) {
        console.warn('Using cached data due to fetch error');
        return { history: cachedHistory, latest: cachedLatest };
      }

      throw error;
    } finally {
      pendingRequest = null;
    }
  })();

  return pendingRequest;
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
 * latest_prices.json만 조회 (history 불필요한 페이지용)
 * - 이미 캐시가 있으면 캐시 사용
 * - 없으면 latest만 fetch
 */
export async function fetchLatestPrices(): Promise<LatestPrices> {
  const latestCacheKey = getLatestCacheKey();

  if (cachedLatest && lastLatestCacheKey === latestCacheKey) {
    return cachedLatest;
  }

  const res = await fetchWithTimeout(`/api/price-data/latest?k=${latestCacheKey}`);
  if (!res.ok) throw new Error('Failed to fetch latest prices');
  cachedLatest = await res.json();
  lastLatestCacheKey = latestCacheKey;
  return cachedLatest!;
}

/**
 * 캐시 강제 초기화 (필요시)
 */
export function clearPriceCache(): void {
  cachedHistory = null;
  cachedLatest = null;
  lastHistoryCacheKey = '';
  lastLatestCacheKey = '';
}
