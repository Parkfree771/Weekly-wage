// Firestore 헬퍼 함수들
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

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
const TEMP_AUCTION_COLLECTION = 'tempAuction'; // 경매장 임시 수집 (사용 안 함, todayTemp 통합)

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
    await addDoc(collection(db, PRICE_HISTORY_COLLECTION), {
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
 * 특정 아이템의 가격 히스토리 조회
 */
export async function getPriceHistory(
  itemId: string,
  limitCount: number = 100
): Promise<PriceEntry[]> {
  try {
    const q = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('itemId', '==', itemId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const history: PriceEntry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        itemId: data.itemId,
        itemName: data.itemName,
        price: data.price,
        timestamp: data.timestamp,
      });
    });

    // 오래된 순서로 정렬 (차트용)
    return history.reverse();
  } catch (error) {
    console.error('가격 히스토리 조회 오류:', error);
    throw error;
  }
}

/**
 * 여러 아이템의 최신 가격 조회
 */
export async function getLatestPrices(itemIds: string[]): Promise<Map<string, number>> {
  const latestPrices = new Map<string, number>();

  for (const itemId of itemIds) {
    try {
      const q = query(
        collection(db, PRICE_HISTORY_COLLECTION),
        where('itemId', '==', itemId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        latestPrices.set(itemId, data.price);
      }
    } catch (error) {
      console.error(`아이템 ${itemId} 최신 가격 조회 오류:`, error);
    }
  }

  return latestPrices;
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
    const lostArkDate = getLostArkDate();
    const yesterday = new Date(lostArkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = formatDateKey(yesterday);

    const docRef = doc(db, DAILY_PRICE_COLLECTION, `${itemId}_${dateKey}`);

    // 이미 저장된 데이터가 있는지 확인
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, {
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
 * 당일 임시 가격 추가 (30분마다)
 */
export async function addTodayTempPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const lostArkDate = getLostArkDate();
    const dateKey = formatDateKey(lostArkDate);

    const docRef = doc(db, TODAY_TEMP_COLLECTION, `${itemId}_${dateKey}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const prices = [...data.prices, price];

      await setDoc(docRef, {
        itemId,
        itemName,
        prices,
        count: prices.length,
        lastUpdated: Timestamp.now(),
      });
    } else {
      await setDoc(docRef, {
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
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    // 전날 임시 데이터 가져오기
    const tempQuery = query(
      collection(db, TODAY_TEMP_COLLECTION),
      where('lastUpdated', '>=', Timestamp.fromDate(yesterday))
    );

    const snapshot = await getDocs(tempQuery);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.prices && data.prices.length > 0) {
        const avgPrice = data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length;

        const dailyDocRef = doc(db, DAILY_PRICE_COLLECTION, `${data.itemId}_${yesterdayKey}`);
        await setDoc(dailyDocRef, {
          itemId: data.itemId,
          itemName: data.itemName,
          price: avgPrice,
          date: yesterdayKey,
          timestamp: Timestamp.now(),
        });
      }
    }
  } catch (error) {
    console.error('전날 데이터 확정 오류:', error);
    throw error;
  }
}

/**
 * 경매장 임시 가격 추가 (하루 5회 수집용)
 */
export async function addTempAuctionPrice(
  itemId: string,
  price: number,
  itemName?: string
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split('T')[0];

    const docRef = doc(db, TEMP_AUCTION_COLLECTION, `${itemId}_${dateKey}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const prices = [...data.prices, price];

      await setDoc(docRef, {
        itemId,
        itemName,
        prices,
        count: prices.length,
        lastUpdated: Timestamp.now(),
      });

      // 5회 수집 완료시 평균 계산하여 일별 가격에 저장
      // TODO: saveDailyPrice 함수 구현 필요
      // if (prices.length >= 5) {
      //   const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      //   await saveDailyPrice(itemId, avgPrice, itemName);
      // }
    } else {
      await setDoc(docRef, {
        itemId,
        itemName,
        prices: [price],
        count: 1,
        lastUpdated: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('임시 경매장 가격 저장 오류:', error);
    throw error;
  }
}

/**
 * 일별 가격 히스토리 조회 (차트용) - JSON 기반
 * history_all.json (과거 데이터) + latest_prices.json (오늘 데이터) 결합
 *
 * @param itemId - 아이템 ID
 * @param days - 조회할 일수 (7, 30, 90, 999 등)
 * @returns PriceEntry[] - 날짜순 정렬된 가격 히스토리
 */
export async function getDailyPriceHistory(
  itemId: string,
  days: number = 30
): Promise<PriceEntry[]> {
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    const history: PriceEntry[] = [];

    // 1. history_all.json에서 과거 데이터 가져오기
    try {
      const historyUrl = `https://storage.googleapis.com/${bucketName}/history_all.json?t=${Date.now()}`;
      const historyResponse = await fetch(historyUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (historyResponse.ok) {
        const historyData: Record<string, Array<{date: string, price: number}>> = await historyResponse.json();

        if (historyData[itemId]) {
          historyData[itemId].forEach(entry => {
            const timestamp = Timestamp.fromDate(new Date(entry.date + 'T00:00:00'));
            history.push({
              itemId,
              price: entry.price,
              timestamp,
            });
          });
        }
      }
    } catch (error) {
      console.warn('[getDailyPriceHistory] history_all.json 로드 실패 (무시):', error);
      // history_all.json이 없어도 계속 진행 (오늘 데이터만 표시)
    }

    // 2. latest_prices.json에서 오늘 데이터 가져오기
    try {
      const latestUrl = `https://storage.googleapis.com/${bucketName}/latest_prices.json?t=${Date.now()}`;
      const latestResponse = await fetch(latestUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (latestResponse.ok) {
        const latestData: Record<string, number> = await latestResponse.json();

        if (latestData[itemId] !== undefined) {
          const lostArkDate = getLostArkDate();
          const todayKey = formatDateKey(lostArkDate);
          const todayTimestamp = Timestamp.fromDate(new Date(todayKey + 'T00:00:00'));

          // 오늘 날짜가 이미 history에 있는지 확인 (중복 방지)
          const todayExists = history.some(entry => {
            const entryDate = formatDateKey(entry.timestamp.toDate());
            return entryDate === todayKey;
          });

          if (!todayExists) {
            history.push({
              itemId,
              price: latestData[itemId],
              timestamp: todayTimestamp,
            });
          }
        }
      }
    } catch (error) {
      console.warn('[getDailyPriceHistory] latest_prices.json 로드 실패 (무시):', error);
    }

    // 3. 날짜순 정렬 (오래된 것부터)
    history.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

    // 4. days 파라미터에 맞춰 최근 N일 반환
    const filtered = days === 999 ? history : history.slice(-days);

    console.log(`[getDailyPriceHistory] ${itemId}: ${filtered.length}개 데이터 반환 (요청: ${days}일)`);

    return filtered;
  } catch (error) {
    console.error('[getDailyPriceHistory] 가격 히스토리 조회 오류:', error);
    throw error;
  }
}

/**
 * Firebase Storage에서 latest_prices.json 다운로드
 *
 * 캐시 버스팅: ?t=${Date.now()}를 URL에 추가하여 항상 최신 데이터 가져오기
 *
 * @returns { [itemId: string]: number } - 아이템 ID를 키로 하는 가격 객체
 */
export async function getPricesFromJson(): Promise<Record<string, number>> {
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    // 캐시 버스팅: 현재 시간을 쿼리 파라미터로 추가
    const timestamp = Date.now();
    const url = `https://storage.googleapis.com/${bucketName}/latest_prices.json?t=${timestamp}`;

    console.log(`[getPricesFromJson] Fetching: ${url}`);

    const response = await fetch(url, {
      cache: 'no-store', // 브라우저 캐시 비활성화
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const prices: Record<string, number> = await response.json();
    console.log(`[getPricesFromJson] ${Object.keys(prices).length}개 아이템 가격 로드 완료`);

    return prices;
  } catch (error) {
    console.error('[getPricesFromJson] JSON 다운로드 실패:', error);
    throw error;
  }
}

/**
 * 특정 아이템의 가격 조회 (JSON 기반)
 */
export async function getItemPriceFromJson(itemId: string): Promise<number | null> {
  try {
    const prices = await getPricesFromJson();
    return prices[itemId] ?? null;
  } catch (error) {
    console.error(`[getItemPriceFromJson] 아이템 ${itemId} 가격 조회 실패:`, error);
    return null;
  }
}

/**
 * 여러 아이템의 가격 조회 (JSON 기반)
 */
export async function getMultipleItemPricesFromJson(itemIds: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();

  try {
    const prices = await getPricesFromJson();

    itemIds.forEach(itemId => {
      const price = prices[itemId];
      if (price !== undefined) {
        priceMap.set(itemId, price);
      }
    });

    return priceMap;
  } catch (error) {
    console.error('[getMultipleItemPricesFromJson] 가격 조회 실패:', error);
    return priceMap; // 빈 Map 반환
  }
}
