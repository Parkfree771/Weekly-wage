// 선조 시스템 검증 스크립트
const {
  AncestorType,
  SuccessGrade,
  SUCCESS_EXP,
  SUCCESS_PROBABILITIES,
  ANCESTOR_PROBABILITY_1_20,
  ANCESTOR_PROBABILITY_21_40,
  ANCESTOR_PROBABILITY_21_40_ENHANCED,
  ANCESTOR_EFFECTS_1_20,
  ANCESTOR_EFFECTS_21_40,
  ANCESTOR_EFFECTS_21_40_ENHANCED,
  TURN_RATES,
  calculateBaseEXP,
  applyAncestorEffect,
  calculateAncestorAverageEXP,
  calculateTotalAverageEXP,
  calculateAverageTries,
  getAncestorName,
  getAncestorDescription,
  calculateFreeTurnProbability,
  calculateEnhancedFreeTurnProbability,
} = require('./lib/advancedRefiningAncestorSystem.ts');

const {
  T4_ADVANCED_TRIES_1_20,
  T4_ADVANCED_TRIES_21_40,
} = require('./lib/advancedRefiningData.ts');

console.log('='.repeat(80));
console.log('📊 상급 재련 선조 시스템 검증');
console.log('='.repeat(80));
console.log('');

// 1. 기본 확률 검증
console.log('1️⃣ 성공 등급별 확률 검증');
console.log('-'.repeat(80));

for (const [key, prob] of Object.entries(SUCCESS_PROBABILITIES)) {
  console.log(`\n${key}:`);
  console.log(`  성공: ${(prob.success * 100).toFixed(1)}%`);
  console.log(`  대성공: ${(prob.great * 100).toFixed(1)}%`);
  console.log(`  초대성공: ${(prob.super * 100).toFixed(1)}%`);
  console.log(`  합계: ${((prob.success + prob.great + prob.super) * 100).toFixed(1)}%`);

  const baseEXP = calculateBaseEXP(
    key.includes('breath'),
    key.includes('book') || key === 'both'
  );
  console.log(`  기본 EXP: ${baseEXP.toFixed(2)}`);
}

// 2. 선조 확률 검증
console.log('\n\n2️⃣ 선조 등장 확률 검증');
console.log('-'.repeat(80));

console.log('\n[1~20단계]');
let sum = 0;
for (const [type, prob] of Object.entries(ANCESTOR_PROBABILITY_1_20)) {
  if (prob > 0) {
    const name = type.charAt(0).toUpperCase() + type.slice(1);
    console.log(`  ${name}: ${(prob * 100).toFixed(2)}%`);
    sum += prob;
  }
}
console.log(`  합계: ${(sum * 100).toFixed(2)}%`);

console.log('\n[21~40단계 일반]');
sum = 0;
for (const [type, prob] of Object.entries(ANCESTOR_PROBABILITY_21_40)) {
  if (prob > 0) {
    const name = type.charAt(0).toUpperCase() + type.slice(1);
    console.log(`  ${name}: ${(prob * 100).toFixed(2)}%`);
    sum += prob;
  }
}
console.log(`  합계: ${(sum * 100).toFixed(2)}%`);

console.log('\n[21~40단계 나베르 강화 후]');
sum = 0;
for (const [type, prob] of Object.entries(ANCESTOR_PROBABILITY_21_40_ENHANCED)) {
  if (prob > 0) {
    const name = type.charAt(0).toUpperCase() + type.slice(1);
    console.log(`  ${name}: ${(prob * 100).toFixed(2)}%`);
    sum += prob;
  }
}
console.log(`  합계: ${(sum * 100).toFixed(2)}%`);

// 3. 무료턴 확률 검증
console.log('\n\n3️⃣ 무료턴 확률 검증');
console.log('-'.repeat(80));

const freeTurn1_20 = calculateFreeTurnProbability(1);
const freeTurn21_40 = calculateFreeTurnProbability(3);
const freeTurnEnhanced = calculateEnhancedFreeTurnProbability();

console.log(`1~20단계: ${(freeTurn1_20 * 100).toFixed(4)}%`);
console.log(`21~40단계: ${(freeTurn21_40 * 100).toFixed(4)}%`);
console.log(`21~40단계 (나베르 후): ${(freeTurnEnhanced * 100).toFixed(4)}%`);
console.log(`\n예상값: 4.0265%`);

// 4. 평균 시도 횟수 검증
console.log('\n\n4️⃣ 평균 시도 횟수 검증 (1~10 구간)');
console.log('-'.repeat(80));

const testCases = [
  { name: '아무것도 X / 아무것도 X', normalB: false, normalBk: false, bonusB: false, bonusBk: false, expected: 59.3 },
  { name: '아무것도 X / 숨결만', normalB: false, normalBk: false, bonusB: true, bonusBk: false, expected: 52.4 },
  { name: '아무것도 X / 책만', normalB: false, normalBk: false, bonusB: false, bonusBk: true, expected: 49.5 },
  { name: '아무것도 X / 숨결+책', normalB: false, normalBk: false, bonusB: true, bonusBk: true, expected: 44.6 },
  { name: '숨결만 / 아무것도 X', normalB: true, normalBk: false, bonusB: false, bonusBk: false, expected: 45.7 },
  { name: '숨결만 / 숨결만', normalB: true, normalBk: false, bonusB: true, bonusBk: false, expected: 41.5 },
  { name: '숨결+책 / 숨결+책', normalB: true, normalBk: true, bonusB: true, bonusBk: true, expected: 28.6 },
];

console.log('\n구간: 1~10단계');
for (const tc of testCases) {
  const calculated = calculateAverageTries(1, tc.normalB, tc.normalBk, tc.bonusB, tc.bonusBk);
  const diff = ((calculated - tc.expected) / tc.expected * 100).toFixed(1);
  console.log(`\n${tc.name}:`);
  console.log(`  계산값: ${calculated.toFixed(2)}회`);
  console.log(`  예상값: ${tc.expected}회`);
  console.log(`  차이: ${diff}%`);
}

// 5. 21~40단계 검증
console.log('\n\n5️⃣ 평균 시도 횟수 검증 (21~30 구간)');
console.log('-'.repeat(80));

const testCases21 = [
  { name: '아무것도 X / 아무것도 X', normalB: false, bonusB: false, expected: 54.8 },
  { name: '아무것도 X / 숨결만', normalB: false, bonusB: true, expected: 49.8 },
  { name: '숨결만 / 아무것도 X', normalB: true, bonusB: false, expected: 43.1 },
  { name: '숨결만 / 숨결만', normalB: true, bonusB: true, expected: 40.1 },
];

console.log('\n구간: 21~30단계 (책 사용 불가)');
for (const tc of testCases21) {
  const calculated = calculateAverageTries(3, tc.normalB, false, tc.bonusB, false);
  const diff = ((calculated - tc.expected) / tc.expected * 100).toFixed(1);
  console.log(`\n${tc.name}:`);
  console.log(`  계산값: ${calculated.toFixed(2)}회`);
  console.log(`  예상값: ${tc.expected}회`);
  console.log(`  차이: ${diff}%`);
}

// 6. 선조 효과 설명
console.log('\n\n6️⃣ 선조 효과 설명');
console.log('-'.repeat(80));

console.log('\n[1~20단계]');
for (const type of Object.values(AncestorType)) {
  const prob = ANCESTOR_PROBABILITY_1_20[type];
  if (prob > 0) {
    const name = getAncestorName(type);
    const desc = getAncestorDescription(type, 1, false);
    console.log(`  ${name} (${(prob * 100).toFixed(1)}%): ${desc}`);
  }
}

console.log('\n[21~40단계 일반]');
for (const type of Object.values(AncestorType)) {
  const prob = ANCESTOR_PROBABILITY_21_40[type];
  if (prob > 0) {
    const name = getAncestorName(type);
    const desc = getAncestorDescription(type, 3, false);
    console.log(`  ${name} (${(prob * 100).toFixed(1)}%): ${desc}`);
  }
}

console.log('\n[21~40단계 나베르 강화]');
for (const type of Object.values(AncestorType)) {
  const prob = ANCESTOR_PROBABILITY_21_40_ENHANCED[type];
  if (prob > 0) {
    const name = getAncestorName(type);
    const desc = getAncestorDescription(type, 3, true);
    console.log(`  ${name} (${(prob * 100).toFixed(2)}%): ${desc}`);
  }
}

console.log('\n\n' + '='.repeat(80));
console.log('✅ 검증 완료');
console.log('='.repeat(80));
