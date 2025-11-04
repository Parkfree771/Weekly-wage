const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// 확인할 아이템 목록
const itemsToCheck = [
  { itemNo: '66112553', name: '야금술: 업화 [19-20]' },
  { itemNo: '66112551', name: '야금술: 업화 [15-18]' },
  { itemNo: '66112554', name: '재봉술: 업화 [19-20]' },
  { itemNo: '66112552', name: '재봉술: 업화 [15-18]' },
  { itemNo: '66112714', name: '장인의 재봉술: 2단계' },
  { itemNo: '66112712', name: '장인의 재봉술: 1단계' },
  { itemNo: '66112713', name: '장인의 야금술: 2단계' },
  { itemNo: '66112711', name: '장인의 야금술: 1단계' },
  { itemNo: '66111131', name: '용암의 숨결' },
  { itemNo: '66111132', name: '빙하의 숨결' },
  { itemNo: '66130143', name: '운명의 파편 주머니(대)' },
  { itemNo: '66130133', name: '명예의 파편 주머니(대)' },
  { itemNo: '66102006', name: '운명의 파괴석' },
  { itemNo: '66102106', name: '운명의 수호석' },
  { itemNo: '66110225', name: '운명의 돌파석' },
];

async function checkDatabaseData() {
  console.log('=== DB 데이터 확인 시작 ===\n');

  for (const item of itemsToCheck) {
    const itemId = `market_${item.itemNo}`;
    console.log(`\n📦 ${item.name} (${itemId}):`);

    try {
      // dailyPrices 컬렉션에서 해당 아이템의 모든 데이터 조회
      const snapshot = await db
        .collection('dailyPrices')
        .where('itemId', '==', itemId)
        .get();

      if (snapshot.empty) {
        console.log('  ❌ 데이터 없음');
        continue;
      }

      // 날짜별로 정렬
      const entries = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        entries.push({
          date: data.date,
          price: data.price,
          timestamp: data.timestamp.toDate().toISOString(),
        });
      });

      entries.sort((a, b) => a.date.localeCompare(b.date));

      console.log(`  ✅ 총 ${entries.length}개 데이터 발견`);
      console.log('  최근 5개 날짜:');
      entries.slice(-5).forEach((entry) => {
        console.log(`    - ${entry.date}: ${entry.price}골드`);
      });

      // 10월 20일 데이터 확인
      const oct20Data = entries.find((e) => e.date === '2025-10-20');
      if (oct20Data) {
        console.log(`  ⚠️  10월 20일 데이터 존재: ${oct20Data.price}골드`);
      }

      // 10월 22일 ~ 11월 3일 데이터 확인
      const recentData = entries.filter((e) => {
        return e.date >= '2025-10-22' && e.date <= '2025-11-03';
      });
      if (recentData.length > 0) {
        console.log(`  ✅ 10/22~11/3 데이터: ${recentData.length}개`);
      }
    } catch (error) {
      console.error(`  ❌ 오류: ${error.message}`);
    }
  }

  console.log('\n=== DB 데이터 확인 완료 ===');
  process.exit(0);
}

checkDatabaseData();
