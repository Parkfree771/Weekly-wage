// 단계별 선조 시스템 검증
const {
  calculateAverageTries,
} = require('./lib/advancedRefiningAncestorSystem.ts');

const {
  T4_ADVANCED_TRIES_1_20,
  T4_ADVANCED_TRIES_21_40,
} = require('./lib/advancedRefiningData.ts');

console.log('='.repeat(80));
console.log('📊 단계별 평균 시도 횟수 검증');
console.log('='.repeat(80));
console.log('');

// 1~10단계 (stage = 1)
console.log('1️⃣ 1~10단계 검증 (stage = 1)');
console.log('-'.repeat(80));

const tests_1_10 = [
  { key: 'none_none', normalB: false, normalBk: false, bonusB: false, bonusBk: false },
  { key: 'none_breath', normalB: false, normalBk: false, bonusB: true, bonusBk: false },
  { key: 'none_book', normalB: false, normalBk: false, bonusB: false, bonusBk: true },
  { key: 'none_both', normalB: false, normalBk: false, bonusB: true, bonusBk: true },
  { key: 'breath_none', normalB: true, normalBk: false, bonusB: false, bonusBk: false },
  { key: 'breath_breath', normalB: true, normalBk: false, bonusB: true, bonusBk: false },
  { key: 'both_both', normalB: true, normalBk: true, bonusB: true, bonusBk: true },
];

for (const t of tests_1_10) {
  const calc = calculateAverageTries(1, t.normalB, t.normalBk, t.bonusB, t.bonusBk);
  const expected = T4_ADVANCED_TRIES_1_20[t.key];
  const diff = ((calc - expected) / expected * 100);
  console.log(`\n${t.key}:`);
  console.log(`  계산값: ${calc.toFixed(2)}회`);
  console.log(`  예상값: ${expected}회`);
  console.log(`  차이: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`);
}

// 11~20단계 (stage = 2)
console.log('\n\n2️⃣ 11~20단계 검증 (stage = 2)');
console.log('-'.repeat(80));

for (const t of tests_1_10) {
  const calc = calculateAverageTries(2, t.normalB, t.normalBk, t.bonusB, t.bonusBk);
  const expected = T4_ADVANCED_TRIES_1_20[t.key];
  const diff = ((calc - expected) / expected * 100);
  console.log(`\n${t.key}:`);
  console.log(`  계산값: ${calc.toFixed(2)}회`);
  console.log(`  예상값: ${expected}회`);
  console.log(`  차이: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`);
}

// 21~30단계 (stage = 3)
console.log('\n\n3️⃣ 21~30단계 검증 (stage = 3)');
console.log('-'.repeat(80));

const tests_21_40 = [
  { key: 'none_none', normalB: false, bonusB: false },
  { key: 'none_breath', normalB: false, bonusB: true },
  { key: 'breath_none', normalB: true, bonusB: false },
  { key: 'breath_breath', normalB: true, bonusB: true },
];

for (const t of tests_21_40) {
  const calc = calculateAverageTries(3, t.normalB, false, t.bonusB, false);
  const expected = T4_ADVANCED_TRIES_21_40[t.key];
  const diff = ((calc - expected) / expected * 100);
  console.log(`\n${t.key}:`);
  console.log(`  계산값: ${calc.toFixed(2)}회`);
  console.log(`  예상값: ${expected}회`);
  console.log(`  차이: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`);
}

// 31~40단계 (stage = 4)
console.log('\n\n4️⃣ 31~40단계 검증 (stage = 4)');
console.log('-'.repeat(80));

for (const t of tests_21_40) {
  const calc = calculateAverageTries(4, t.normalB, false, t.bonusB, false);
  const expected = T4_ADVANCED_TRIES_21_40[t.key];
  const diff = ((calc - expected) / expected * 100);
  console.log(`\n${t.key}:`);
  console.log(`  계산값: ${calc.toFixed(2)}회`);
  console.log(`  예상값: ${expected}회`);
  console.log(`  차이: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`);
}

console.log('\n\n' + '='.repeat(80));
console.log('📋 일반턴/선조턴 분리 사용 검증');
console.log('='.repeat(80));
console.log('');

console.log('케이스 1: 일반턴 재료 X, 선조턴만 숨결+책 (1~10단계)');
console.log('-'.repeat(80));
const case1 = calculateAverageTries(1, false, false, true, true);
const expect1 = T4_ADVANCED_TRIES_1_20['none_both'];
console.log(`계산값: ${case1.toFixed(2)}회`);
console.log(`예상값: ${expect1}회`);
console.log(`차이: ${((case1 - expect1) / expect1 * 100).toFixed(2)}%`);

console.log('\n케이스 2: 일반턴 숨결만, 선조턴 숨결+책 (1~10단계)');
console.log('-'.repeat(80));
const case2 = calculateAverageTries(1, true, false, true, true);
const normalEXP_breath = 19; // 숨결만
const bonusEXP_both = 37.90; // 선조턴 평균 (숨결+책 사용 시는 더 높음)
// 정확한 예상값은 없지만 논리적으로 작동하는지 확인
console.log(`계산값: ${case2.toFixed(2)}회`);
console.log(`일반턴 EXP (숨결만): ~19 EXP`);
console.log(`선조턴 EXP (숨결+책): 더 높음`);
console.log(`→ 논리적으로 'breath_breath'보다 낮고 'both_both'보다 높아야 함`);

console.log('\n케이스 3: 일반턴 재료 X, 선조턴만 숨결 (21~30단계)');
console.log('-'.repeat(80));
const case3 = calculateAverageTries(3, false, false, true, false);
const expect3 = T4_ADVANCED_TRIES_21_40['none_breath'];
console.log(`계산값: ${case3.toFixed(2)}회`);
console.log(`예상값: ${expect3}회`);
console.log(`차이: ${((case3 - expect3) / expect3 * 100).toFixed(2)}%`);

console.log('\n\n' + '='.repeat(80));
console.log('✅ 검증 완료');
console.log('='.repeat(80));
