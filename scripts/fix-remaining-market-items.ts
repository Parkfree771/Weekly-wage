/**
 * 나머지 거래소 아이템들의 14일치 가격 데이터 수정 스크립트
 * - 재련 추가 재료 (16개) - 이미 수정됨
 * - 젬 (6개)
 * - 유물 각인서 (12개)
 *
 * 계승 재련 재료와 재련 재료는 이미 수정됨 -> 건너뜀
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// 이미 수정된 아이템 ID들 (건너뛰기)
const ALREADY_FIXED_IDS = [
  // 계승 재련 재료
  '6861013', '66102007', '66102107', '66110226',
  // 재련 재료
  '6861012', '6861011', '66130143', '66130133', '66102006', '66102106', '66110225'
];

// 수정할 모든 거래소 아이템들
const ITEMS_TO_FIX = [
  // 재련 추가 재료 (16개)
  { id: '66112553', name: '야금술 : 업화 [19-20] (무기)' },
  { id: '66112551', name: '야금술 : 업화 [15-18] (무기)' },
  { id: '66112543', name: '야금술 : 업화 [11-14] (무기)' },
  { id: '66112554', name: '재봉술 : 업화 [19-20] (방어구)' },
  { id: '66112552', name: '재봉술 : 업화 [15-18] (방어구)' },
  { id: '66112546', name: '재봉술 : 업화 [11-14] (방어구)' },
  { id: '66112718', name: '장인의 재봉술 : 4단계 (방어구)' },
  { id: '66112716', name: '장인의 재봉술 : 3단계 (방어구)' },
  { id: '66112714', name: '장인의 재봉술 : 2단계 (방어구)' },
  { id: '66112712', name: '장인의 재봉술 : 1단계 (방어구)' },
  { id: '66112717', name: '장인의 야금술 : 4단계 (무기)' },
  { id: '66112715', name: '장인의 야금술 : 3단계 (무기)' },
  { id: '66112713', name: '장인의 야금술 : 2단계 (무기)' },
  { id: '66112711', name: '장인의 야금술 : 1단계 (무기)' },
  { id: '66111131', name: '용암의 숨결' },
  { id: '66111132', name: '빙하의 숨결' },

  // 젬 (6개)
  { id: '67400003', name: '질서의 젬 : 안정' },
  { id: '67400103', name: '질서의 젬 : 견고' },
  { id: '67400203', name: '질서의 젬 : 불변' },
  { id: '67410303', name: '혼돈의 젬 : 침식' },
  { id: '67410403', name: '혼돈의 젬 : 왜곡' },
  { id: '67410503', name: '혼돈의 젬 : 붕괴' },

  // 유물 각인서 (12개)
  { id: '65203905', name: '아드레날린' },
  { id: '65200505', name: '원한' },
  { id: '65203305', name: '돌격대장' },
  { id: '65201005', name: '예리한 둔기' },
  { id: '65203505', name: '질량 증가' },
  { id: '65202805', name: '저주받은 인형' },
  { id: '65203005', name: '기습의 대가' },
  { id: '65203705', name: '타격의 대가' },
  { id: '65203405', name: '각성' },
  { id: '65204105', name: '전문의' },
  { id: '65200605', name: '슈퍼차지' },
  { id: '65201505', name: '결투의 대가' },
];

const API_KEY = process.env.LOSTARK_API_KEY!;
const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET!;

// Firebase Admin 초기화
function initFirebase() {
  if (admin.apps.length === 0) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: BUCKET_NAME,
    });
  }
  return admin.storage().bucket();
}

// Lostark API에서 14일치 데이터 가져오기
async function fetchItemHistory(itemId: string): Promise<{ date: string; price: number }[]> {
  const response = await fetch(
    `https://developer-lostark.game.onstove.com/markets/items/${itemId}`,
    {
      headers: {
        'accept': 'application/json',
        'authorization': `bearer ${API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch item ${itemId}: ${response.status}`);
    return [];
  }

  const data = await response.json();

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log(`No data for item ${itemId}`);
    return [];
  }

  // 거래 가능한 버전 찾기 (크론과 동일한 로직)
  let itemData = null;
  for (const variant of data) {
    if (variant.Stats && variant.Stats.length > 0 && variant.Stats[0].AvgPrice > 0) {
      itemData = variant;
      break;
    }
  }

  if (!itemData) {
    console.log(`No tradable variant for item ${itemId}`);
    return [];
  }

  if (!itemData.Stats || !Array.isArray(itemData.Stats)) {
    console.log(`No stats for item ${itemId}`);
    return [];
  }

  // Stats 배열에서 날짜별 가격 추출
  const priceHistory: { date: string; price: number }[] = [];

  for (const stat of itemData.Stats) {
    if (stat.Date && stat.AvgPrice !== undefined && stat.AvgPrice > 0) {
      // 날짜 형식 변환: "2026-01-05" 형태로
      const date = stat.Date.split('T')[0];
      const avgPrice = stat.AvgPrice;

      // 1000G 미만은 소수점 1자리, 이상은 정수가 아니라
      // API에서 주는 그대로 저장 (소수점 1자리까지)
      const roundedPrice = Math.round(avgPrice * 10) / 10;

      priceHistory.push({ date, price: roundedPrice });
    }
  }

  return priceHistory;
}

// 딜레이 함수
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 히스토리 데이터 타입
type HistoryEntry = { date: string; price: number };
type HistoryData = Record<string, HistoryEntry[]>;

async function main() {
  console.log('Firebase 초기화 중...');
  const bucket = initFirebase();

  // 1. 현재 history.json 다운로드
  console.log('history_all.json 다운로드 중...');
  const historyFile = bucket.file('history_all.json');
  const [historyBuffer] = await historyFile.download();
  const historyData: HistoryData = JSON.parse(historyBuffer.toString('utf-8'));

  console.log(`현재 history 아이템 수: ${Object.keys(historyData).length}`);

  // 2. 각 아이템별로 API 호출 및 데이터 업데이트
  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of ITEMS_TO_FIX) {
    console.log(`\n처리 중: ${item.name} (${item.id})`);

    try {
      const apiHistory = await fetchItemHistory(item.id);

      if (apiHistory.length === 0) {
        console.log(`  ⚠️ API에서 데이터 없음, 건너뜀`);
        skippedCount++;
        continue;
      }

      // history 데이터 업데이트 (배열 구조)
      if (!historyData[item.id]) {
        historyData[item.id] = [];
      }

      const existingArray = historyData[item.id];
      let updatedDates = 0;

      for (const { date, price } of apiHistory) {
        // 기존 배열에서 해당 날짜 찾기
        const existingIndex = existingArray.findIndex(e => e.date === date);

        if (existingIndex >= 0) {
          // 기존 데이터 업데이트
          const oldPrice = existingArray[existingIndex].price;
          if (oldPrice !== price) {
            existingArray[existingIndex].price = price;
            updatedDates++;
            console.log(`  ${date}: ${oldPrice} → ${price}`);
          }
        } else {
          // 새 데이터 추가
          existingArray.push({ date, price });
          updatedDates++;
          console.log(`  ${date}: (신규) → ${price}`);
        }
      }

      // 날짜 순으로 정렬
      existingArray.sort((a, b) => a.date.localeCompare(b.date));

      if (updatedDates > 0) {
        console.log(`  ✅ ${updatedDates}일치 데이터 수정됨`);
        fixedCount++;
      } else {
        console.log(`  ℹ️ 변경 없음`);
      }

      // API 레이트 리밋 방지
      await delay(100);

    } catch (error) {
      console.error(`  ❌ 에러:`, error);
      errorCount++;
    }
  }

  // 3. 수정된 history.json 업로드
  console.log('\n\nhistory_all.json 업로드 중...');
  await historyFile.save(JSON.stringify(historyData), {
    contentType: 'application/json',
    metadata: {
      cacheControl: 'no-cache',
    },
  });

  console.log('\n=== 완료 ===');
  console.log(`수정된 아이템: ${fixedCount}`);
  console.log(`건너뛴 아이템: ${skippedCount}`);
  console.log(`에러 발생: ${errorCount}`);
}

main().catch(console.error);
