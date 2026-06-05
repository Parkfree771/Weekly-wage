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
  // ⚠️ 구형(legacy) 단일 버킷 — "현재 하루"라는 암묵적 의미. 하위호환 읽기에서만 사용하고
  //    normalizeRawByDate()가 _rawByDate 로 흡수한 뒤 제거한다. 신규 코드는 _rawByDate 만 쓴다.
  _raw?: Record<string, number[]>;
  // 신규: 경매장 아이템 누적 가격을 "날짜별"로 분리 보관 → 날짜 변경 시점의 오염/유실 방지
  // 구조: { 'YYYY-MM-DD': { [itemId]: number[] } }
  // 즉시 지우지 않고 finalize(history 확정) 후 N일 지난 버킷만 prune 한다.
  _rawByDate?: Record<string, Record<string, number[]>>;
  _meta?: {
    date: string;              // 현재 데이터 날짜 (YYYY-MM-DD)
    updatedAt: string;         // 마지막 업데이트 시간 (ISO)
    lastRolloverDate?: string; // 마지막으로 history 커밋 완료된 롤오버 날짜 (전날 키)
                               // ※ history 저장 성공 후에만 영구화되므로 "그 날짜 데이터가 history에 있다"는 신뢰 가능한 표식
  };
};

// _rawByDate 에서 finalize 후 보존할 일수 (이 일수보다 오래되고 history에 확정된 버킷만 prune)
const RAW_RETENTION_DAYS = 3;

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
 * YYYY-MM-DD 키에서 N일 뺀 키 반환 (UTC 기준 단순 계산)
 */
function dateKeyMinusDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return formatDateKey(dt);
}

/**
 * 구형 _raw(단일 버킷)를 _rawByDate(날짜별 버킷)로 흡수하고 _raw를 제거한다.
 * - 멱등: 여러 번 호출해도 안전. _rawByDate를 단일 진실로 만든다.
 * - 구형 _raw는 "현재 데이터 날짜"(_meta.date) 버킷에 속한 것으로 본다.
 * - 같은 itemId가 이미 _rawByDate에 있으면 덮어쓰지 않는다(이미 마이그레이션됨).
 */
function normalizeRawByDate(data: LatestPricesJson): void {
  if (!data._rawByDate) data._rawByDate = {};

  if (data._raw && Object.keys(data._raw).length > 0) {
    const bucketKey = data._meta?.date || formatDateKey(getLostArkDate());
    const bucket = data._rawByDate[bucketKey] || (data._rawByDate[bucketKey] = {});
    for (const [itemId, prices] of Object.entries(data._raw)) {
      if (!Array.isArray(prices) || prices.length === 0) continue;
      // 이미 같은 날짜 버킷에 데이터가 있으면(=이미 흡수됨) 건드리지 않음
      if (!bucket[itemId] || bucket[itemId].length === 0) {
        bucket[itemId] = [...prices];
      }
    }
  }

  // 구형 _raw 제거 — 이후로는 _rawByDate만 사용
  if (data._raw) delete data._raw;
}

/**
 * history에 확정됐고 RAW_RETENTION_DAYS 보다 오래된 _rawByDate 버킷을 제거.
 * - finalize가 과거 버킷을 history에 멱등 커밋하므로, 보존기간이 지난 버킷은 이미 확정 상태.
 * - 안전상 history에 실제로 존재하는 버킷만 삭제(없으면 보존하여 다음 heal이 처리).
 */
function pruneRawByDate(data: LatestPricesJson, history: HistoryAllJson, todayKey: string): void {
  if (!data._rawByDate) return;
  const cutoff = dateKeyMinusDays(todayKey, RAW_RETENTION_DAYS);
  for (const dateKey of Object.keys(data._rawByDate)) {
    if (dateKey >= cutoff) continue; // 보존기간 내 → 유지
    const bucket = data._rawByDate[dateKey];
    const allCommitted = Object.keys(bucket).every(itemId =>
      (history[itemId] || []).some(e => e.date === dateKey)
    );
    if (allCommitted) {
      delete data._rawByDate[dateKey];
      console.log(`[pruneRawByDate] ${dateKey} 버킷 제거 (history 확정 + ${RAW_RETENTION_DAYS}일 경과)`);
    }
  }
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

    // 구형 _raw 흡수 + _rawByDate 보장 (멱등)
    normalizeRawByDate(data);

    // 항상 "오늘" 버킷에 push → 날짜가 바뀌어도 어제 버킷과 절대 섞이지 않음.
    // (00시 finalize가 드롭/지연돼도 어제 버킷은 그대로 보존, 오늘 건 오늘 버킷으로만 적재)
    const bucket = data._rawByDate![todayKey] || (data._rawByDate![todayKey] = {});
    if (!bucket[itemId]) bucket[itemId] = [];
    bucket[itemId].push(price);

    // 평균가 계산 및 저장 (오늘 버킷 기준)
    const prices = bucket[itemId];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    data[itemId] = avgPrice;

    // 메타 정보 업데이트 (lastRolloverDate 보존)
    data._meta = {
      ...(data._meta || {}),
      date: todayKey,
      updatedAt: new Date().toISOString(),
    };

    // 캐시 업데이트 (저장은 나중에)
    latestPricesCache = data;

    console.log(`[Auction] ${itemName || itemId} - 가격 추가: ${price}G (총 ${prices.length}개, 평균 ${avgPrice.toFixed(0)}G) [${todayKey}]`);
  } catch (error) {
    console.error('당일 임시 가격 저장 오류:', error);
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
 * 경매장 롤오버 (타이밍 독립 · 멱등)
 * - _rawByDate 에서 "오늘보다 과거"인 모든 버킷을 history에 확정(없는 날짜만 추가).
 * - 00시에 안 돌아도, 02·03시 등 아무 때나 호출되면 밀린 과거 버킷을 그때 메운다.
 * - 확정 후 보존기간 지난 버킷을 prune.
 * - 반환: 이번 호출에서 새로 확정한 (아이템×일) 건수
 *
 * @param includeToday - true면 오늘 버킷도 확정(관리자 강제용). 기본 false.
 */
export async function rolloverAuctionDays(includeToday: boolean = false): Promise<number> {
  const todayKey = formatDateKey(getLostArkDate());

  const latestData = await readLatestPrices();
  normalizeRawByDate(latestData);

  const history = await readHistoryAll();
  const byDate = latestData._rawByDate!;

  let committed = 0;
  let lastFinalizedDate: string | undefined;

  // 날짜 오름차순으로 처리
  for (const dateKey of Object.keys(byDate).sort()) {
    // 오늘 버킷은 기본적으로 진행 중이므로 건너뜀 (includeToday면 포함)
    if (dateKey > todayKey) continue;
    if (dateKey === todayKey && !includeToday) continue;

    const bucket = byDate[dateKey];
    for (const [itemId, prices] of Object.entries(bucket)) {
      if (!prices || prices.length === 0) continue;
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      if (!history[itemId]) history[itemId] = [];
      const exists = history[itemId].some(e => e.date === dateKey);
      if (!exists) {
        history[itemId].push({ date: dateKey, price: avgPrice });
        history[itemId].sort((a, b) => a.date.localeCompare(b.date));
        console.log(`  [rollover] 확정: ${itemId} ${dateKey} - ${prices.length}개 평균 = ${avgPrice.toFixed(0)}G`);
        committed++;
      }
    }
    if (dateKey < todayKey) lastFinalizedDate = dateKey;
  }

  // 캐시 반영 (저장은 generateAndUploadPriceJson에서 history 먼저 → latest 순)
  historyCache = history;

  // 메타: 날짜를 오늘로 진행 + 마지막 확정 과거날짜 표식 (history 커밋 성공 후에만 영구화됨)
  latestData._meta = {
    ...(latestData._meta || {}),
    date: todayKey,
    updatedAt: new Date().toISOString(),
    ...(lastFinalizedDate ? { lastRolloverDate: lastFinalizedDate } : {}),
  };

  // 확정된 과거 버킷 중 보존기간 지난 것 정리
  pruneRawByDate(latestData, history, todayKey);

  latestPricesCache = latestData;

  console.log(`[rolloverAuctionDays] 완료: ${committed}건 확정 (today=${todayKey}, includeToday=${includeToday})`);
  return committed;
}

/**
 * (하위호환) append-history 수동 엔드포인트에서 사용 — 새 멱등 롤오버에 위임.
 * 기존엔 _raw 초기화 + 날짜 진행만 했으나, 이제 롤오버가 finalize까지 멱등 수행.
 */
export async function appendYesterdayToHistory(): Promise<void> {
  try {
    await rolloverAuctionDays(false);
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

    // ⚠️ 저장 순서 중요: history_all.json을 먼저 커밋한 뒤에 latest_prices.json을 쓴다.
    // 롤오버(rolloverAuctionDays)가 _rawByDate 과거 버킷을 history에 확정한 뒤 prune(삭제)하는데,
    // latest를 먼저 쓰면 "prune(버킷 삭제)만 영구화되고 history(확정분)는 함수 강제종료로 유실"되어
    // 경매장 과거 평균이 비가역적으로 사라진다.
    // history를 먼저 쓰면, 중간에 잘려도 prune이 영구화되지 않아 다음 실행이 안전하게 재시도한다.
    // (history 저장이 실패하면 아래 latest 저장은 실행되지 않음 → _rawByDate 버킷 보존)

    // 1) history_all.json 먼저 저장 (변경된 경우에만)
    if (historyCache !== null) {
      await writeHistoryAll(historyCache);
      console.log(`[generateAndUploadPriceJson] history_all.json 저장 완료`);
    }

    // 2) history 커밋 성공 후에만 latest_prices.json(=_raw 리셋본) 저장
    if (latestPricesCache !== null) {
      await writeLatestPrices(latestPricesCache);

      const itemCount = Object.keys(latestPricesCache).filter(k => !k.startsWith('_')).length;
      const byDate = latestPricesCache._rawByDate || {};
      const rawDays = Object.keys(byDate).length;
      const rawTodayCount = Object.keys(byDate[latestPricesCache._meta?.date || ''] || {}).length;

      console.log(`[generateAndUploadPriceJson] latest_prices.json 저장 완료: ${itemCount}개 아이템, _rawByDate ${rawDays}일치(오늘 ${rawTodayCount}개 아이템)`);
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
 * history_all.json 스냅샷 읽기 (heal/진단용 읽기 전용)
 * - 누락 날짜 판별 등에 사용. 반환값을 수정하면 캐시도 바뀌니 읽기 전용으로만 사용할 것.
 */
export async function readHistorySnapshot(): Promise<HistoryAllJson> {
  return readHistoryAll();
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

