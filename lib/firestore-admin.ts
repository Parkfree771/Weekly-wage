// Firestore Admin 헬퍼 함수들 (서버 사이드 전용)
import { getAdminFirestore, Timestamp, FieldValue } from './firebase-admin';

// 가격 데이터 타입
export type PriceEntry = {
  itemId: string;
  itemName?: string;
  price: number;
  timestamp: Timestamp;
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
 * 로스트아크 날짜 계산 (오전 6시 기준)
 * 오전 6시 이전이면 전날, 오전 6시 이후면 당일
 */
export function getLostArkDate(date: Date = new Date()): Date {
  const result = new Date(date);
  if (result.getHours() < 6) {
    // 오전 6시 이전이면 전날
    result.setDate(result.getDate() - 1);
  }
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 새로운 가격 데이터 저장
 */
export async function savePriceData(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection(PRICE_HISTORY_COLLECTION).add({
      itemId,
      itemName,
      price,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('가격 저장 오류:', error);
    throw error;
  }
}

/**
 * 전날 평균가 저장 (거래소 YDayAvgPrice용)
 */
export async function saveYesterdayPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    // 로스트아크 기준 오늘 날짜를 구한 후, 전날 날짜 계산
    const today = getLostArkDate(); // 오늘 (24일 6시 이후면 24일)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1); // 전날 (23일)
    const dateKey = formatDateKey(yesterday);

    const docRef = db.collection(DAILY_PRICE_COLLECTION).doc(`${itemId}_${dateKey}`);

    // 이미 저장된 데이터가 있는지 확인
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      await docRef.set({
        itemId,
        itemName,
        price,
        date: dateKey,
        timestamp: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('전날 평균가 저장 오류:', error);
    throw error;
  }
}

/**
 * 과거 특정 날짜의 평균가 저장 (거래소 Stats 배열용)
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

    // 이미 저장된 데이터가 있는지 확인
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      await docRef.set({
        itemId,
        itemName,
        price,
        date: dateStr,
        timestamp: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('과거 평균가 저장 오류:', error);
    throw error;
  }
}

/**
 * 당일 임시 가격 추가 (30분마다)
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
 * 오전 6시에 전날 임시 데이터를 평균내서 확정
 */
export async function finalizeYesterdayData(): Promise<void> {
  try {
    const db = getAdminFirestore();

    // 로스트아크 기준 오늘 날짜
    const lostArkToday = getLostArkDate();

    // 로스트아크 기준 전날 날짜 계산
    const yesterday = new Date(lostArkToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    console.log(`[finalizeYesterdayData] 전날 데이터 확정 시작: ${yesterdayKey}`);

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

      // 전날 날짜와 일치하는 문서만 처리
      if (docDate === yesterdayKey && data.prices && data.prices.length > 0) {
        const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;

        const dailyDocRef = db.collection(DAILY_PRICE_COLLECTION).doc(`${data.itemId}_${yesterdayKey}`);
        batch.set(dailyDocRef, {
          itemId: data.itemId,
          itemName: data.itemName,
          price: Math.round(avgPrice),
          date: yesterdayKey,
          timestamp: Timestamp.now(),
        });

        console.log(`  확정: ${data.itemName} - ${data.prices.length}개 평균 = ${Math.round(avgPrice)}G`);
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
 * 확정된 전날 평균가 + 오늘의 누적 평균(임시)를 함께 반환
 */
export async function getDailyPriceHistory(
  itemId: string,
  days: number = 30
): Promise<PriceEntry[]> {
  try {
    const db = getAdminFirestore();
    const history: PriceEntry[] = [];

    console.log(`[getDailyPriceHistory] Fetching history for itemId: ${itemId}`);

    // 1. 확정된 일별 평균가 조회 (인덱스 문제 방지를 위해 orderBy 제거)
    const dailySnapshot = await db.collection(DAILY_PRICE_COLLECTION)
      .where('itemId', '==', itemId)
      .get();

    console.log(`[getDailyPriceHistory] Found ${dailySnapshot.docs.length} daily price records`);

    dailySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // date 필드를 사용하여 정확한 날짜로 timestamp 생성 (UTC 기준)
      const dateStr = data.date; // YYYY-MM-DD 형식
      const timestamp = Timestamp.fromDate(new Date(dateStr + 'T00:00:00Z'));

      history.push({
        itemId: data.itemId,
        itemName: data.itemName,
        price: Math.round(data.price),
        timestamp: timestamp,
      });
    });

    // 2. 오늘의 임시 데이터가 있으면 누적 평균 추가
    const lostArkDate = getLostArkDate();
    const todayKey = formatDateKey(lostArkDate);
    const todayDocRef = db.collection(TODAY_TEMP_COLLECTION).doc(`${itemId}_${todayKey}`);
    const todayDoc = await todayDocRef.get();

    if (todayDoc.exists) {
      const data = todayDoc.data();
      console.log(`[getDailyPriceHistory] Found today's temp data:`, data);
      if (data && data.prices && data.prices.length > 0) {
        const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;
        const todayTimestamp = Timestamp.fromDate(lostArkDate);

        history.push({
          itemId: data.itemId,
          itemName: data.itemName,
          price: Math.round(avgPrice),
          timestamp: todayTimestamp,
        });
      }
    } else {
      console.log(`[getDailyPriceHistory] No today's temp data found for ${itemId}_${todayKey}`);
    }

    // 날짜순 정렬 (오래된 것부터)
    const sorted = history.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

    // 최근 days 개만 반환
    const result = sorted.slice(-days);
    console.log(`[getDailyPriceHistory] Returning ${result.length} entries`);

    return result;
  } catch (error) {
    console.error('일별 가격 히스토리 조회 오류:', error);
    throw error;
  }
}
