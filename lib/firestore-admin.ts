// Firestore Admin 헬퍼 함수들 (서버 사이드 전용)
import { getAdminFirestore, Timestamp, FieldValue } from './firebase-admin';

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
        // 아비도스 융화재료(6861012)만 소수점 첫째 자리까지, 나머지는 정수
        const roundedAvgPrice = data.itemId === '6861012'
          ? Math.round(avgPrice * 10) / 10
          : Math.round(avgPrice);

        const dailyDocRef = db.collection(DAILY_PRICE_COLLECTION).doc(`${data.itemId}_${yesterdayKey}`);
        batch.set(dailyDocRef, {
          itemId: data.itemId,
          itemName: data.itemName,
          price: roundedAvgPrice,
          date: yesterdayKey,
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
 * 확정된 전날 평균가 + 오늘의 누적 평균(임시)를 함께 반환
 * @param days - 조회할 일수 (기본 30일, 최대 365일 가능)
 */
export async function getDailyPriceHistory(
  itemId: string,
  days: number = 30
): Promise<PriceEntry[]> {
  try {
    const db = getAdminFirestore();
    const history: PriceEntry[] = [];

    // 1. 확정된 일별 평균가 조회 (인덱스 문제 방지를 위해 orderBy 제거)
    const dailySnapshot = await db.collection(DAILY_PRICE_COLLECTION)
      .where('itemId', '==', itemId)
      .get();

    dailySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // date 필드를 사용하여 정확한 날짜로 timestamp 생성
      const dateStr = data.date; // YYYY-MM-DD 형식
      // UTC 기준 00:00:00으로 timestamp 생성 (날짜 보존)
      const [year, month, day] = dateStr.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const timestamp = Timestamp.fromDate(utcDate);

      // 아비도스 융화재료(6861012)만 소수점 첫째 자리까지, 나머지는 정수
      const price = data.itemId === '6861012'
        ? Math.round(data.price * 10) / 10
        : Math.round(data.price);

      history.push({
        itemId: data.itemId,
        itemName: data.itemName,
        price: price,
        timestamp: timestamp,
        date: dateStr, // YYYY-MM-DD 형식 추가
      });
    });

    // 2. 오늘의 임시 데이터가 있으면 누적 평균 추가
    const lostArkDate = getLostArkDate();
    const todayKey = formatDateKey(lostArkDate);
    const todayDocRef = db.collection(TODAY_TEMP_COLLECTION).doc(`${itemId}_${todayKey}`);
    const todayDoc = await todayDocRef.get();

    if (todayDoc.exists) {
      const data = todayDoc.data();
      if (data && data.prices && data.prices.length > 0) {
        const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;
        // 아비도스 융화재료(6861012)만 소수점 첫째 자리까지, 나머지는 정수
        const roundedAvgPrice = data.itemId === '6861012'
          ? Math.round(avgPrice * 10) / 10
          : Math.round(avgPrice);
        // UTC 기준 00:00:00으로 timestamp 생성 (날짜 보존)
        const [year, month, day] = todayKey.split('-').map(Number);
        const todayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        const todayTimestamp = Timestamp.fromDate(todayUtc);

        history.push({
          itemId: data.itemId,
          itemName: data.itemName,
          price: roundedAvgPrice,
          timestamp: todayTimestamp,
          date: todayKey, // YYYY-MM-DD 형식 추가
        });
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
