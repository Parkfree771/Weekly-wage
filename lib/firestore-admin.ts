// JSON 기반 가격 데이터 관리 (Firestore 제거)
// Firebase Storage의 JSON 파일만 사용
// 메모리 캐시 방식: 수집 중에는 메모리에 저장, 마지막에 한 번만 업로드

import { getAdminStorage } from './firebase-admin';

// 가격 데이터 타입
export type PriceEntry = {
  itemId: string;
  itemName?: string;
  price: number;
  timestamp: { seconds: number; nanoseconds: number };
  date?: string; // YYYY-MM-DD 형식
};

// latest_prices.json 구조
type LatestPricesJson = {
  [itemId: string]: number;
} & {
  _raw?: Record<string, number[]>;  // 경매장 아이템 누적 가격
  _meta?: {
    date: string;      // 현재 데이터 날짜 (YYYY-MM-DD)
    updatedAt: string; // 마지막 업데이트 시간 (ISO)
  };
};

// history_all.json 구조
type HistoryAllJson = Record<string, Array<{ date: string; price: number }>>;

// ============================================================
// 메모리 캐시 (크론 실행 중 사용)
// ============================================================
let latestPricesCache: LatestPricesJson | null = null;
let historyCache: HistoryAllJson | null = null;
let cacheLoaded = false;

/**
 * 날짜 계산 (오전 0시 기준, 한국 시간)
 */
export function getLostArkDate(date: Date = new Date()): Date {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = date.getTime() + kstOffset;
  const kstDate = new Date(kstTime);
  kstDate.setUTCHours(0, 0, 0, 0);
  return kstDate;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환 (한국 시간 기준)
 */
export function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Firebase Storage bucket 가져오기
 */
function getBucket() {
  const storage = getAdminStorage();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
  }
  return storage.bucket(bucketName);
}

/**
 * latest_prices.json 읽기 (캐시 사용)
 */
async function readLatestPrices(): Promise<LatestPricesJson> {
  // 캐시가 있으면 캐시 반환
  if (latestPricesCache !== null) {
    return latestPricesCache;
  }

  try {
    const bucket = getBucket();
    const file = bucket.file('latest_prices.json');
    const [contents] = await file.download();
    latestPricesCache = JSON.parse(contents.toString());
    cacheLoaded = true;
    console.log('[readLatestPrices] 파일 로드 완료');
    return latestPricesCache!;
  } catch (error: any) {
    if (error.code === 404) {
      console.log('[readLatestPrices] 파일 없음, 새로 생성');
      latestPricesCache = {};
      return latestPricesCache;
    }
    throw error;
  }
}

/**
 * latest_prices.json 저장 (캐시 → Storage)
 */
async function writeLatestPrices(data: LatestPricesJson): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file('latest_prices.json');

  const jsonContent = JSON.stringify(data, null, 2);

  await file.save(jsonContent, {
    metadata: {
      contentType: 'application/json',
      // Storage 직접 접근 시 캐시 방지 (API 라우트 + CDN 캐시키 시스템 사용)
      cacheControl: 'no-cache, no-store, must-revalidate',
    },
  });

  await file.makePublic();

  // 캐시 업데이트
  latestPricesCache = data;
}

/**
 * history_all.json 읽기 (캐시 사용)
 */
async function readHistoryAll(): Promise<HistoryAllJson> {
  // 캐시가 있으면 캐시 반환
  if (historyCache !== null) {
    return historyCache;
  }

  try {
    const bucket = getBucket();
    const file = bucket.file('history_all.json');
    const [contents] = await file.download();
    historyCache = JSON.parse(contents.toString());
    console.log('[readHistoryAll] 파일 로드 완료');
    return historyCache!;
  } catch (error: any) {
    if (error.code === 404) {
      console.log('[readHistoryAll] 파일 없음, 새로 생성');
      historyCache = {};
      return historyCache;
    }
    throw error;
  }
}

/**
 * history_all.json 저장 (캐시 → Storage)
 */
async function writeHistoryAll(data: HistoryAllJson): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file('history_all.json');

  const jsonContent = JSON.stringify(data, null, 2);

  await file.save(jsonContent, {
    metadata: {
      contentType: 'application/json',
      // Storage 직접 접근 시 캐시 방지 (API 라우트 + CDN 캐시키 시스템 사용)
      cacheControl: 'no-cache, no-store, must-revalidate',
    },
  });

  await file.makePublic();

  // 캐시 업데이트
  historyCache = data;
}

/**
 * 거래소 오늘 평균가 저장 (메모리 캐시에만 저장, 나중에 한 번에 업로드)
 * - API에서 받은 평균가를 그대로 저장
 */
export async function updateMarketTodayPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const todayKey = formatDateKey(getLostArkDate());
    const data = await readLatestPrices();

    // 날짜가 바뀌었는지 확인
    if (data._meta?.date && data._meta.date !== todayKey) {
      console.log(`[updateMarketTodayPrice] 날짜 변경 감지: ${data._meta.date} → ${todayKey}`);
    }

    // 가격 업데이트 (캐시에만)
    data[itemId] = price;

    // 메타 정보 업데이트
    data._meta = {
      date: todayKey,
      updatedAt: new Date().toISOString(),
    };

    // 캐시 업데이트 (저장은 나중에)
    latestPricesCache = data;

    console.log(`[Market] ${itemName || itemId} - 오늘 평균가: ${price}G`);
  } catch (error) {
    console.error('거래소 오늘 평균가 저장 오류:', error);
    throw error;
  }
}

/**
 * 경매장 당일 임시 가격 추가 (메모리 캐시에만 저장)
 * - _raw에 가격 배열로 저장
 * - 평균가도 함께 업데이트
 */
export async function addTodayTempPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const todayKey = formatDateKey(getLostArkDate());
    const data = await readLatestPrices();

    // _raw 초기화
    if (!data._raw) {
      data._raw = {};
    }

    // 날짜가 바뀌었으면 _raw 초기화 (00시 처리 후 첫 수집)
    if (data._meta?.date && data._meta.date !== todayKey) {
      console.log(`[addTodayTempPrice] 새 날짜 시작, _raw 초기화`);
      data._raw = {};
    }

    // 가격 배열에 추가
    if (!data._raw[itemId]) {
      data._raw[itemId] = [];
    }
    data._raw[itemId].push(price);

    // 평균가 계산 및 저장
    const prices = data._raw[itemId];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    data[itemId] = avgPrice;

    // 메타 정보 업데이트
    data._meta = {
      date: todayKey,
      updatedAt: new Date().toISOString(),
    };

    // 캐시 업데이트 (저장은 나중에)
    latestPricesCache = data;

    console.log(`[Auction] ${itemName || itemId} - 가격 추가: ${price}G (총 ${prices.length}개, 평균 ${avgPrice.toFixed(0)}G)`);
  } catch (error) {
    console.error('당일 임시 가격 저장 오류:', error);
    throw error;
  }
}

/**
 * 특정 날짜의 가격 추가 (00시 이중 역할용)
 * - 00:10에 수집한 가격을 전날 마지막 가격으로도 추가
 */
export async function addTodayTempPriceForDate(
  itemId: string,
  price: number,
  dateKey: string,
  itemName?: string
): Promise<void> {
  try {
    const data = await readLatestPrices();
    const currentDateKey = data._meta?.date;

    // 전날 데이터에 추가하는 경우 (00시 처리 전)
    if (currentDateKey === dateKey) {
      // _raw에 추가
      if (!data._raw) {
        data._raw = {};
      }
      if (!data._raw[itemId]) {
        data._raw[itemId] = [];
      }
      data._raw[itemId].push(price);

      // 평균가 업데이트
      const prices = data._raw[itemId];
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      data[itemId] = avgPrice;

      data._meta = {
        date: currentDateKey,
        updatedAt: new Date().toISOString(),
      };

      // 캐시 업데이트 (저장은 나중에)
      latestPricesCache = data;

      console.log(`[Auction] ${itemName || itemId} - 전날 마지막 가격 추가: ${price}G`);
    } else {
      console.log(`[addTodayTempPriceForDate] 날짜 불일치, 건너뜀: 현재=${currentDateKey}, 요청=${dateKey}`);
    }
  } catch (error) {
    console.error('특정 날짜 임시 가격 저장 오류:', error);
    throw error;
  }
}

/**
 * 과거 특정 날짜의 평균가 저장 (거래소 Stats[1] 용)
 * - history_all.json에 직접 추가 (캐시 사용)
 */
export async function saveHistoricalPrice(
  itemId: string,
  price: number,
  dateStr: string,
  itemName?: string
): Promise<void> {
  try {
    const history = await readHistoryAll();

    // 해당 아이템 히스토리 초기화
    if (!history[itemId]) {
      history[itemId] = [];
    }

    // 이미 같은 날짜 데이터가 있으면 업데이트
    const existingIndex = history[itemId].findIndex(entry => entry.date === dateStr);
    if (existingIndex >= 0) {
      history[itemId][existingIndex].price = price;
      console.log(`[History] ${itemName || itemId} - 기존 데이터 업데이트: ${dateStr} = ${price}G`);
    } else {
      history[itemId].push({ date: dateStr, price });
      console.log(`[History] ${itemName || itemId} - 새 데이터 추가: ${dateStr} = ${price}G`);
    }

    // 날짜순 정렬
    history[itemId].sort((a, b) => a.date.localeCompare(b.date));

    // 캐시 업데이트 (저장은 나중에)
    historyCache = history;
  } catch (error) {
    console.error('과거 평균가 저장 오류:', error);
    throw error;
  }
}

/**
 * 00시에 전날 경매장 데이터를 평균내서 history에 추가
 * @param useToday - true면 당일 데이터 확정, false면 전날 데이터 확정
 */
export async function finalizeYesterdayData(useToday: boolean = false): Promise<void> {
  try {
    const lostArkToday = getLostArkDate();

    // 확정할 날짜 계산
    let targetDate: Date;
    if (useToday) {
      targetDate = lostArkToday;
    } else {
      targetDate = new Date(lostArkToday);
      targetDate.setDate(targetDate.getDate() - 1);
    }
    const targetKey = formatDateKey(targetDate);

    console.log(`[finalizeYesterdayData] ${useToday ? '당일' : '전날'} 데이터 확정 시작: ${targetKey}`);

    const latestData = await readLatestPrices();
    const history = await readHistoryAll();

    // _raw에서 경매장 아이템 평균 계산 후 history에 추가
    const raw = latestData._raw || {};
    let count = 0;

    for (const [itemId, prices] of Object.entries(raw)) {
      if (prices && prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // history에 추가
        if (!history[itemId]) {
          history[itemId] = [];
        }

        // 중복 확인
        const exists = history[itemId].some(entry => entry.date === targetKey);
        if (!exists) {
          history[itemId].push({ date: targetKey, price: avgPrice });
          history[itemId].sort((a, b) => a.date.localeCompare(b.date));
          console.log(`  확정: ${itemId} - ${prices.length}개 평균 = ${avgPrice.toFixed(0)}G`);
          count++;
        }
      }
    }

    // 캐시 업데이트
    historyCache = history;

    console.log(`[finalizeYesterdayData] 완료: ${count}개 경매장 아이템 데이터 확정`);
  } catch (error) {
    console.error('전날 데이터 확정 오류:', error);
    throw error;
  }
}

/**
 * 어제 확정 데이터를 history_all.json에 추가 + _raw 초기화
 * 매일 00시에 실행
 */
export async function appendYesterdayToHistory(): Promise<void> {
  try {
    console.log('[appendYesterdayToHistory] 시작...');

    const lostArkToday = getLostArkDate();
    const todayKey = formatDateKey(lostArkToday);

    // 전날 날짜
    const yesterday = new Date(lostArkToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    console.log(`[appendYesterdayToHistory] 어제: ${yesterdayKey}, 오늘: ${todayKey}`);

    const latestData = await readLatestPrices();

    // 현재 데이터가 어제 날짜인지 확인
    if (latestData._meta?.date !== yesterdayKey) {
      console.log(`[appendYesterdayToHistory] 이미 처리됨 또는 날짜 불일치: ${latestData._meta?.date}`);
      return;
    }

    // _raw 초기화 및 날짜 변경
    latestData._raw = {};
    latestData._meta = {
      date: todayKey,
      updatedAt: new Date().toISOString(),
    };

    // 캐시 업데이트
    latestPricesCache = latestData;

    console.log(`[appendYesterdayToHistory] 완료: _raw 초기화, 날짜 변경 ${yesterdayKey} → ${todayKey}`);
  } catch (error) {
    console.error('[appendYesterdayToHistory] 실패:', error);
  }
}

/**
 * 캐시된 데이터를 Firebase Storage에 저장 (크론 완료 후 호출)
 * 이 함수가 실제로 JSON 파일을 업로드함
 */
export async function generateAndUploadPriceJson(): Promise<void> {
  try {
    console.log('[generateAndUploadPriceJson] 캐시 데이터 저장 시작...');

    // latest_prices.json 저장
    if (latestPricesCache !== null) {
      await writeLatestPrices(latestPricesCache);

      const itemCount = Object.keys(latestPricesCache).filter(k => !k.startsWith('_')).length;
      const rawCount = Object.keys(latestPricesCache._raw || {}).length;

      console.log(`[generateAndUploadPriceJson] latest_prices.json 저장 완료: ${itemCount}개 아이템, ${rawCount}개 경매장 _raw`);
    }

    // history_all.json 저장 (변경된 경우에만)
    if (historyCache !== null) {
      await writeHistoryAll(historyCache);
      console.log(`[generateAndUploadPriceJson] history_all.json 저장 완료`);
    }

    // 캐시 초기화 (다음 크론을 위해)
    latestPricesCache = null;
    historyCache = null;
    cacheLoaded = false;

    console.log('[generateAndUploadPriceJson] 완료!');
  } catch (error) {
    console.error('[generateAndUploadPriceJson] 저장 실패:', error);
    throw error;
  }
}

/**
 * 일별 가격 히스토리 조회 (차트용)
 * - history_all.json + latest_prices.json 조합
 */
export async function getDailyPriceHistory(
  itemId: string,
  days: number = 30
): Promise<PriceEntry[]> {
  try {
    const history: PriceEntry[] = [];

    // 1. history_all.json에서 과거 데이터
    const historyData = await readHistoryAll();
    const itemHistory = historyData[itemId] || [];

    itemHistory.forEach((entry) => {
      const [year, month, day] = entry.date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      history.push({
        itemId: itemId,
        price: entry.price,
        timestamp: { seconds: Math.floor(utcDate.getTime() / 1000), nanoseconds: 0 },
        date: entry.date,
      });
    });

    // 2. latest_prices.json에서 오늘 데이터
    const latestData = await readLatestPrices();
    const todayPrice = latestData[itemId];
    const todayKey = latestData._meta?.date || formatDateKey(getLostArkDate());

    if (todayPrice !== undefined) {
      const alreadyExists = history.some(entry => entry.date === todayKey);
      if (!alreadyExists) {
        const [year, month, day] = todayKey.split('-').map(Number);
        const todayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        history.push({
          itemId: itemId,
          price: todayPrice,
          timestamp: { seconds: Math.floor(todayUtc.getTime() / 1000), nanoseconds: 0 },
          date: todayKey,
        });
      }
    }

    // 날짜순 정렬
    const sorted = history.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

    // 최근 days개만 반환
    return sorted.slice(-days);
  } catch (error) {
    console.error('일별 가격 히스토리 조회 오류:', error);
    throw error;
  }
}

/**
 * 전체 히스토리 JSON 생성 (마이그레이션용, 일반적으로 사용 안함)
 */
export async function generateHistoryJson(): Promise<void> {
  console.log('[generateHistoryJson] 이 함수는 더 이상 Firestore를 사용하지 않습니다.');
  console.log('[generateHistoryJson] 기존 history_all.json을 유지합니다.');
}

// ============================================================
// 하위 호환성을 위한 더미 함수들 (사용되지 않음)
// ============================================================

/**
 * @deprecated Firestore 제거됨. saveHistoricalPrice 사용
 */
export async function savePriceData(
  itemId: string,
  price: number,
  itemName?: string,
  customDate?: Date
): Promise<void> {
  if (!customDate) {
    console.warn('[savePriceData] customDate가 필요합니다.');
    return;
  }
  const dateKey = formatDateKey(customDate);
  await saveHistoricalPrice(itemId, price, dateKey, itemName);
}
