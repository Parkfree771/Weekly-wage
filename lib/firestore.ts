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
} from 'firebase/firestore';
import { db } from './firebase';

// 가격 데이터 타입
export type PriceEntry = {
  itemId: string;
  itemName?: string;
  price: number;
  timestamp: Timestamp;
};

// 가격 히스토리 컬렉션 이름
const PRICE_HISTORY_COLLECTION = 'priceHistory';

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
