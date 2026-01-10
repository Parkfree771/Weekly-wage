import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getLostArkDate, formatDateKey } from '@/lib/firestore-admin';

/**
 * 재련 시뮬레이터용 재료 가격 가져오기
 * - 전전날(2일 전) 데이터 사용
 * - 00시 기준으로 날짜 변경
 * - 하루종일 같은 데이터 사용 (캐시 권장)
 */
export async function GET() {
  try {
    // 오늘 날짜 (00시 기준)
    const lostArkToday = getLostArkDate();

    // 전전날 날짜 계산 (2일 전)
    const targetDate = new Date(lostArkToday);
    targetDate.setDate(targetDate.getDate() - 2);
    const targetDateStr = formatDateKey(targetDate); // YYYY-MM-DD

    // 재련 시뮬레이터에서 필요한 재료 아이템 ID들
    const itemIds = [
      '66102106', // 수호석
      '66102006', // 파괴석
      '66110225', // 돌파석
      '6861012',  // 아비도스
      '66130143', // 운명파편
      '66111131', // 용암의 숨결
      '66111132', // 빙하의 숨결
      // 일반 재련 책 (무기)
      '66112543', // 야금술 : 업화 [11-14]
      '66112551', // 야금술 : 업화 [15-18]
      '66112553', // 야금술 : 업화 [19-20]
      // 일반 재련 책 (방어구)
      '66112546', // 재봉술 : 업화 [11-14]
      '66112552', // 재봉술 : 업화 [15-18]
      '66112554', // 재봉술 : 업화 [19-20]
      // 상급 재련 책 (무기)
      '66112711', // 장인의 야금술 1단계 (상급 1~10)
      '66112713', // 장인의 야금술 2단계 (상급 11~20)
      '66112715', // 장인의 야금술 3단계 (상급 21~30)
      '66112717', // 장인의 야금술 4단계 (상급 31~40)
      // 상급 재련 책 (방어구)
      '66112712', // 장인의 재봉술 1단계 (상급 1~10)
      '66112714', // 장인의 재봉술 2단계 (상급 11~20)
      '66112716', // 장인의 재봉술 3단계 (상급 21~30)
      '66112718', // 장인의 재봉술 4단계 (상급 31~40)
    ];

    const db = getAdminFirestore();
    const prices: Record<string, number> = {};

    // 각 아이템의 전전날 가격 데이터 조회
    const pricePromises = itemIds.map(async (itemId) => {
      const docRef = db.collection('dailyPrices').doc(`${itemId}_${targetDateStr}`);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        if (data && data.price !== undefined) {
          prices[itemId] = data.price;
        }
      }
    });

    await Promise.all(pricePromises);

    // 데이터가 없는 아이템이 있는지 체크
    const missingItems = itemIds.filter(id => !prices[id]);

    return NextResponse.json({
      success: true,
      targetDate: targetDateStr,
      prices,
      missingItems: missingItems.length > 0 ? missingItems : undefined,
      message: missingItems.length > 0
        ? `${targetDateStr} 날짜에 일부 아이템 가격 데이터가 없습니다.`
        : `${targetDateStr} 날짜의 가격 데이터를 성공적으로 가져왔습니다.`
    });

  } catch (error) {
    console.error('Error fetching refining prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch refining prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
