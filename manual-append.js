// appendYesterdayToHistory를 직접 실행하고 로그 확인
const { appendYesterdayToHistory } = require('./lib/firestore-admin.ts');

console.log('=== appendYesterdayToHistory 수동 실행 ===\n');

appendYesterdayToHistory()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 오류:', err);
    process.exit(1);
  });
