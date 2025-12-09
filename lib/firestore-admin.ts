// Firestore Admin 헬퍼 함수들 (서버 사이드 전용)
import { getAdminFirestore, getAdminStorage, Timestamp, FieldValue } from './firebase-admin';

// 가격 데이터 타입
export type PriceEntry = {
  itemId: string;
  itemName?: string;
  price: number;
  timestamp: Timestamp;
  date?: string; // YYYY-MM-DD 형식
};

// 임시 수집 데이터 타입 (경매장용)
export type TempPriceEntry = {
  itemId: string;
  prices: number[];
  count: number;
  lastUpdated: Timestamp;
};

// 가격 히스토리 컬렉션 이름
const PRICE_HISTORY_COLLECTION = 'priceHistory';
const DAILY_PRICE_COLLECTION = 'dailyPrices'; // 일별 평균가
const TODAY_TEMP_COLLECTION = 'todayTemp'; // 오늘 임시 수집 데이터

/**
 * 로스트아크 날짜 계산 (오전 6시 기준, 한국 시간)
 * 오전 6시 이전이면 전날, 오전 6시 이후면 당일
 * 예: 26일 오전 6시 ~ 27일 오전 6시까지가 26일
 */
export function getLostArkDate(date: Date = new Date()): Date {
  // 한국 시간(KST, UTC+9)으로 변환
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const kstTime = date.getTime() + kstOffset;
  const kstDate = new Date(kstTime);

  // 오전 6시 이전이면 전날
  if (kstDate.getUTCHours() < 6) {
    kstDate.setUTCDate(kstDate.getUTCDate() - 1);
  }

  // UTC 기준으로 시간을 00:00:00으로 설정 (KST 날짜 유지)
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
 * 새로운 가격 데이터 저장
 * @param customDate - 과거 데이터 저장용 (선택사항, 없으면 현재 시간)
 */
export async function savePriceData(
  itemId: string,
  price: number,
  itemName?: string,
  customDate?: Date
): Promise<void> {
  try {
    const db = getAdminFirestore();

    // customDate가 있으면 해당 날짜로 timestamp 설정, 없으면 현재 시간
    const timestamp = customDate ? Timestamp.fromDate(customDate) : Timestamp.now();

    // customDate가 있으면 dailyPrices에 직접 저장, 없으면 기존 방식
    if (customDate) {
      const dateKey = formatDateKey(customDate);
      const docRef = db.collection(DAILY_PRICE_COLLECTION).doc(`${itemId}_${dateKey}`);

      await docRef.set({
        itemId,
        itemName,
        price,
        date: dateKey,
        timestamp: Timestamp.now(), // 저장 시점의 실제 시간
      });
    } else {
      await db.collection(PRICE_HISTORY_COLLECTION).add({
        itemId,
        itemName,
        price,
        timestamp,
      });
    }
  } catch (error) {
    console.error('가격 저장 오류:', error);
    throw error;
  }
}

/**
 * 과거 특정 날짜의 평균가 저장 (거래소 Stats 배열용)
 * 기존 데이터가 있어도 최신 데이터로 덮어씌움
 */
export async function saveHistoricalPrice(
  itemId: string,
  price: number,
  dateStr: string, // YYYY-MM-DD 형식
  itemName?: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(DAILY_PRICE_COLLECTION).doc(`${itemId}_${dateStr}`);

    // 항상 최신 데이터로 업데이트 (덮어쓰기)
    await docRef.set({
      itemId,
      itemName,
      price,
      date: dateStr,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('과거 평균가 저장 오류:', error);
    throw error;
  }
}

/**
 * 거래소 오늘 평균가 저장 (계속 덮어쓰기)
 * 06시가 되면 API의 전날 평균가로 교체됨
 */
export async function updateMarketTodayPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const lostArkDate = getLostArkDate();
    const dateKey = formatDateKey(lostArkDate);

    const docRef = db.collection(TODAY_TEMP_COLLECTION).doc(`${itemId}_${dateKey}`);

    // 거래소는 평균가를 그대로 덮어쓰기 (배열 사용 안함)
    await docRef.set({
      itemId,
      itemName,
      prices: [price], // 단일 값으로 유지
      count: 1,
      lastUpdated: Timestamp.now(),
    });
  } catch (error) {
    console.error('거래소 오늘 평균가 저장 오류:', error);
    throw error;
  }
}

/**
 * 경매장 당일 임시 가격 추가 (1시간마다 누적)
 */
export async function addTodayTempPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const lostArkDate = getLostArkDate();
    const dateKey = formatDateKey(lostArkDate);

    const docRef = db.collection(TODAY_TEMP_COLLECTION).doc(`${itemId}_${dateKey}`);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      const prices = [...(data?.prices || []), price];

      await docRef.set({
        itemId,
        itemName,
        prices,
        count: prices.length,
        lastUpdated: Timestamp.now(),
      });
    } else {
      await docRef.set({
        itemId,
        itemName,
        prices: [price],
        count: 1,
        lastUpdated: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('당일 임시 가격 저장 오류:', error);
    throw error;
  }
}

/**
 * 오전 5시(경매장) 또는 6시(거래소)에 임시 데이터를 평균내서 확정
 * @param useToday - true면 당일 데이터 확정 (05시대), false면 전날 데이터 확정 (06시대)
 */
export async function finalizeYesterdayData(useToday: boolean = false): Promise<void> {
  try {
    const db = getAdminFirestore();

    // 로스트아크 기준 오늘 날짜
    const lostArkToday = getLostArkDate();

    // 확정할 날짜 계산
    let targetDate: Date;
    if (useToday) {
      // 05시대: 당일 데이터 확정 (06:10 ~ 05:10 수집한 데이터)
      targetDate = lostArkToday;
    } else {
      // 06시대 이후: 전날 데이터 확정
      targetDate = new Date(lostArkToday);
      targetDate.setDate(targetDate.getDate() - 1);
    }
    const targetKey = formatDateKey(targetDate);

    console.log(`[finalizeYesterdayData] ${useToday ? '당일' : '전날'} 데이터 확정 시작: ${targetKey}`);

    // 전날의 todayTemp 문서를 직접 조회 (문서명이 itemId_날짜 형식)
    const tempSnapshot = await db.collection(TODAY_TEMP_COLLECTION).get();

    const batch = db.batch();
    let count = 0;

    tempSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id; // 예: "auction_gem_fear_8_2025-10-23"

      // 문서 ID에서 날짜 추출
      const docDateMatch = docId.match(/_(\d{4}-\d{2}-\d{2})$/);
      if (!docDateMatch) return;

      const docDate = docDateMatch[1];

      // 대상 날짜와 일치하는 문서만 처리
      if (docDate === targetKey && data.prices && data.prices.length > 0) {
        const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;
        // 아비도스 융화재료(6861012)만 소수점 첫째 자리까지, 나머지는 정수
        const roundedAvgPrice = data.itemId === '6861012'
          ? Math.round(avgPrice * 10) / 10
          : Math.round(avgPrice);

        const dailyDocRef = db.collection(DAILY_PRICE_COLLECTION).doc(`${data.itemId}_${targetKey}`);
        batch.set(dailyDocRef, {
          itemId: data.itemId,
          itemName: data.itemName,
          price: roundedAvgPrice,
          date: targetKey,
          timestamp: Timestamp.now(),
        });

        console.log(`  확정: ${data.itemName} - ${data.prices.length}개 평균 = ${roundedAvgPrice}G`);
        count++;

        // 확정 후 todayTemp 문서 삭제 (선택사항)
        // batch.delete(doc.ref);
      }
    });

    await batch.commit();
    console.log(`[finalizeYesterdayData] 완료: ${count}개 아이템 데이터 확정`);
  } catch (error) {
    console.error('전날 데이터 확정 오류:', error);
    throw error;
  }
}

/**
 * 일별 가격 히스토리 조회 (차트용)
 * Firebase Storage의 JSON 파일에서 데이터 읽기 (Firestore 읽기 0회)
 * @param days - 조회할 일수 (기본 30일, 최대 365일 가능)
 */
export async function getDailyPriceHistory(
  itemId: string,
  days: number = 30
): Promise<PriceEntry[]> {
  try {
    const storage = getAdminStorage();
    const history: PriceEntry[] = [];

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const bucket = storage.bucket(bucketName);

    // 1. history_all.json에서 과거 확정 데이터 조회
    try {
      const historyFile = bucket.file('history_all.json');
      const [historyContents] = await historyFile.download();
      const historyByItem: Record<string, Array<{date: string, price: number}>> = JSON.parse(historyContents.toString());

      // 해당 아이템의 히스토리 가져오기
      const itemHistory = historyByItem[itemId] || [];

      itemHistory.forEach((entry) => {
        const dateStr = entry.date; // YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const timestamp = Timestamp.fromDate(utcDate);

        history.push({
          itemId: itemId,
          price: entry.price,
          timestamp: timestamp,
          date: dateStr,
        });
      });

      console.log(`[getDailyPriceHistory] ${itemId}: history_all.json에서 ${itemHistory.length}개 과거 데이터 로드`);
    } catch (error: any) {
      if (error.code === 404) {
        console.log('[getDailyPriceHistory] history_all.json 파일이 없습니다.');
      } else {
        console.error('[getDailyPriceHistory] history_all.json 읽기 오류:', error);
      }
    }

    // 2. latest_prices.json에서 오늘 데이터 추가
    try {
      const latestFile = bucket.file('latest_prices.json');
      const [latestContents] = await latestFile.download();
      const latestPrices: Record<string, number> = JSON.parse(latestContents.toString());

      const todayPrice = latestPrices[itemId];
      if (todayPrice !== undefined) {
        const lostArkDate = getLostArkDate();
        const todayKey = formatDateKey(lostArkDate);

        const [year, month, day] = todayKey.split('-').map(Number);
        const todayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const todayTimestamp = Timestamp.fromDate(todayUtc);

        // 오늘 날짜가 history에 이미 있는지 확인 (중복 방지)
        const alreadyExists = history.some(entry => entry.date === todayKey);
        if (!alreadyExists) {
          history.push({
            itemId: itemId,
            price: todayPrice,
            timestamp: todayTimestamp,
            date: todayKey,
          });
          console.log(`[getDailyPriceHistory] ${itemId}: 오늘 데이터 추가 (${todayKey}: ${todayPrice}G)`);
        }
      }
    } catch (error: any) {
      if (error.code === 404) {
        console.log('[getDailyPriceHistory] latest_prices.json 파일이 없습니다.');
      } else {
        console.error('[getDailyPriceHistory] latest_prices.json 읽기 오류:', error);
      }
    }

    // 날짜순 정렬 (오래된 것부터)
    const sorted = history.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

    // 최근 days 개만 반환
    return sorted.slice(-days);
  } catch (error) {
    console.error('일별 가격 히스토리 조회 오류:', error);
    throw error;
  }
}

/**
 * todayTemp의 모든 가격 데이터를 JSON으로 생성하여 Firebase Storage에 업로드
 *
 * 동작 방식:
 * 1. todayTemp 컬렉션의 모든 문서 조회
 * 2. 경매장 아이템: prices 배열의 평균 계산
 * 3. 거래소 아이템: prices[0] 값 사용 (이미 평균값)
 * 4. { itemId: price, ... } 형태의 JSON 생성
 * 5. Firebase Storage의 latest_prices.json에 업로드 (Public 권한)
 */
export async function generateAndUploadPriceJson(): Promise<void> {
  try {
    const db = getAdminFirestore();
    const storage = getAdminStorage();

    console.log('[generateAndUploadPriceJson] 시작...');

    // 1. todayTemp 컬렉션에서 모든 가격 데이터 조회
    const snapshot = await db.collection('todayTemp').get();
    const prices: Record<string, number> = {};
    let itemCount = 0;

    // 2. 각 아이템의 평균 가격 계산
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const itemId = data.itemId;

      if (!itemId || !data.prices || !Array.isArray(data.prices) || data.prices.length === 0) {
        return; // 유효하지 않은 데이터는 건너뛰기
      }

      // 평균 계산
      const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;

      // 반올림 로직 (아비도스 융화재료는 소수점 첫째 자리까지)
      const roundedPrice = itemId === '6861012'
        ? Math.round(avgPrice * 10) / 10
        : Math.round(avgPrice);

      prices[itemId] = roundedPrice;
      itemCount++;
    });

    console.log(`[generateAndUploadPriceJson] ${itemCount}개 아이템 가격 계산 완료`);

    // 3. JSON 문자열 생성
    const jsonContent = JSON.stringify(prices, null, 2); // 가독성을 위해 pretty-print

    // 4. Firebase Storage에 업로드
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file('latest_prices.json');

    await file.save(jsonContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=60, must-revalidate', // 1분 캐싱
        metadata: {
          generatedAt: new Date().toISOString(),
          itemCount: String(itemCount),
        },
      },
    });

    // 5. 공개 URL 생성
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketName}/latest_prices.json`;
    console.log(`[generateAndUploadPriceJson] 업로드 완료: ${publicUrl}`);
    console.log(`[generateAndUploadPriceJson] 파일 크기: ${(jsonContent.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('[generateAndUploadPriceJson] JSON 생성/업로드 실패:', error);
    // 에러를 throw하지 않음 - 크론 작업 전체가 실패하지 않도록
    // 대신 로그만 남기고 계속 진행
  }
}

/**
 * 전체 히스토리 JSON 생성 (초기 마이그레이션용)
 *
 * dailyPrices 컬렉션의 모든 과거 확정 데이터를 history_all.json으로 생성
 * 한 번만 실행하면 됨 (또는 전체 재생성 필요할 때)
 */
export async function generateHistoryJson(): Promise<void> {
  try {
    const db = getAdminFirestore();
    const storage = getAdminStorage();

    console.log('[generateHistoryJson] 전체 히스토리 생성 시작...');

    // dailyPrices 컬렉션에서 모든 데이터 조회
    const snapshot = await db.collection('dailyPrices').get();

    // 아이템별로 그룹화: { itemId: [{date, price}, ...] }
    const historyByItem: Record<string, Array<{date: string, price: number}>> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const itemId = data.itemId;
      const date = data.date; // YYYY-MM-DD
      const price = data.price;

      if (!itemId || !date || price === undefined) {
        return; // 유효하지 않은 데이터 건너뛰기
      }

      if (!historyByItem[itemId]) {
        historyByItem[itemId] = [];
      }

      historyByItem[itemId].push({ date, price });
    });

    // 각 아이템의 히스토리를 날짜순 정렬
    Object.keys(historyByItem).forEach(itemId => {
      historyByItem[itemId].sort((a, b) => a.date.localeCompare(b.date));
    });

    console.log(`[generateHistoryJson] ${Object.keys(historyByItem).length}개 아이템 히스토리 생성 완료`);

    // JSON 문자열 생성
    const jsonContent = JSON.stringify(historyByItem, null, 2);

    // Firebase Storage에 업로드
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file('history_all.json');

    await file.save(jsonContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600, must-revalidate', // 1시간 캐싱
        metadata: {
          generatedAt: new Date().toISOString(),
          itemCount: String(Object.keys(historyByItem).length),
        },
      },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketName}/history_all.json`;
    console.log(`[generateHistoryJson] 업로드 완료: ${publicUrl}`);
    console.log(`[generateHistoryJson] 파일 크기: ${(jsonContent.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('[generateHistoryJson] 히스토리 JSON 생성 실패:', error);
    throw error;
  }
}

/**
 * 어제 확정 데이터를 history_all.json에 추가
 *
 * 매일 06시 (또는 수요일 10시)에 실행
 * 1. 현재 history_all.json 다운로드
 * 2. 어제 확정된 dailyPrices 데이터 추가
 * 3. 다시 업로드
 */
export async function appendYesterdayToHistory(): Promise<void> {
  try {
    const db = getAdminFirestore();
    const storage = getAdminStorage();

    console.log('[appendYesterdayToHistory] 어제 데이터 추가 시작...');

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file('history_all.json');

    // 1. 기존 history_all.json 다운로드
    let historyByItem: Record<string, Array<{date: string, price: number}>> = {};

    try {
      const [contents] = await file.download();
      historyByItem = JSON.parse(contents.toString());
      console.log(`[appendYesterdayToHistory] 기존 히스토리 로드 완료: ${Object.keys(historyByItem).length}개 아이템`);
    } catch (error: any) {
      if (error.code === 404) {
        console.log('[appendYesterdayToHistory] history_all.json 없음. 새로 생성합니다.');
        historyByItem = {};
      } else {
        throw error;
      }
    }

    // 2. 어제 날짜 계산
    const lostArkToday = getLostArkDate();
    const yesterday = new Date(lostArkToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    console.log(`[appendYesterdayToHistory] 어제 날짜: ${yesterdayKey}`);

    // 3. dailyPrices에서 어제 데이터 조회
    const snapshot = await db.collection('dailyPrices')
      .where('date', '==', yesterdayKey)
      .get();

    let addedCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const itemId = data.itemId;
      const price = data.price;

      if (!itemId || price === undefined) {
        return;
      }

      // 해당 아이템 히스토리가 없으면 생성
      if (!historyByItem[itemId]) {
        historyByItem[itemId] = [];
      }

      // 이미 같은 날짜 데이터가 있는지 확인 (중복 방지)
      const exists = historyByItem[itemId].some(entry => entry.date === yesterdayKey);
      if (!exists) {
        historyByItem[itemId].push({ date: yesterdayKey, price });
        addedCount++;
      }
    });

    // 4. 각 아이템 히스토리 날짜순 정렬
    Object.keys(historyByItem).forEach(itemId => {
      historyByItem[itemId].sort((a, b) => a.date.localeCompare(b.date));
    });

    console.log(`[appendYesterdayToHistory] ${addedCount}개 아이템 데이터 추가 완료`);

    // 5. JSON 업로드
    const jsonContent = JSON.stringify(historyByItem, null, 2);

    await file.save(jsonContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=3600, must-revalidate',
        metadata: {
          updatedAt: new Date().toISOString(),
          lastAppendedDate: yesterdayKey,
          itemCount: String(Object.keys(historyByItem).length),
        },
      },
    });

    await file.makePublic();

    console.log(`[appendYesterdayToHistory] 업로드 완료`);
    console.log(`[appendYesterdayToHistory] 파일 크기: ${(jsonContent.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('[appendYesterdayToHistory] 어제 데이터 추가 실패:', error);
    // 에러를 throw하지 않음 - 크론 작업 전체가 실패하지 않도록
  }
}
