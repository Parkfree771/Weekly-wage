// 단계별 선조 시스템 검증 (독립 실행 버전)

// 성공 등급별 경험치
const SUCCESS_EXP = {
  success: 10,
  great: 20,
  super: 40,
};

// 숨결/책 조합별 성공 확률
const SUCCESS_PROBABILITIES = {
  none: { success: 0.80, great: 0.15, super: 0.05 },
  breath: { success: 0.50, great: 0.30, super: 0.20 },
  book: { success: 0.30, great: 0.45, super: 0.25 },
  both: { success: 0.00, great: 0.60, super: 0.40 },
};

// 1~20단계 선조 확률
const ANCESTOR_PROB_1_20 = {
  galatour: 0.15,   // 갈라투르 15%
  gelar: 0.35,      // 겔라르 35%
  kuhumbar: 0.15,   // 쿠훔바르 15%
  temer: 0.35,      // 테메르 35% (수정됨)
};

// 21~40단계 선조 확률
const ANCESTOR_PROB_21_40 = {
  galatour: 0.125,  // 12.5%
  gelar: 0.25,      // 25%
  kuhumbar: 0.125,  // 12.5%
  temer: 0.25,      // 25%
  naber: 0.125,     // 12.5%
  eber: 0.125,      // 12.5%
};

// 나베르 강화 후 확률
const ANCESTOR_PROB_ENHANCED = {
  galatour: 0.1429,  // 14.29%
  gelar: 0.2857,     // 28.57%
  kuhumbar: 0.1429,  // 14.29%
  temer: 0.2857,     // 28.57%
  naber: 0,          // 0%
  eber: 0.1429,      // 14.29%
};

// 선조 효과 (1~20)
const ANCESTOR_EFFECTS_1_20 = {
  galatour: { type: 'multiply', value: 5 },
  gelar: { type: 'multiply', value: 3 },
  kuhumbar: { type: 'add', value: 30 },
  temer: { type: 'add', value: 10, free: true },
};

// 선조 효과 (21~40)
const ANCESTOR_EFFECTS_21_40 = {
  galatour: { type: 'multiply', value: 5 },
  gelar: { type: 'multiply', value: 3 },
  kuhumbar: { type: 'add', value: 30 },
  temer: { type: 'add', value: 10, free: true },
  naber: { type: 'enhance', value: 0 },
  eber: { type: 'instant', value: 100 },
};

// 선조 효과 (강화)
const ANCESTOR_EFFECTS_ENHANCED = {
  galatour: { type: 'multiply', value: 7 },
  gelar: { type: 'multiply', value: 5 },
  kuhumbar: { type: 'add', value: 80 },
  temer: { type: 'add', value: 30, free: true },
  eber: { type: 'instant', value: 200 },
};

// 턴 비율
const TURN_RATES = {
  normal: 0.83894,
  bonus: 0.16106,
};

// 기본 EXP 계산
function calculateBaseEXP(useBreath, useBook) {
  let key = 'none';
  if (useBreath && useBook) key = 'both';
  else if (useBreath) key = 'breath';
  else if (useBook) key = 'book';

  const prob = SUCCESS_PROBABILITIES[key];
  return (
    SUCCESS_EXP.success * prob.success +
    SUCCESS_EXP.great * prob.great +
    SUCCESS_EXP.super * prob.super
  );
}

// 선조 효과 적용
function applyAncestorEffect(baseEXP, effect) {
  if (effect.type === 'multiply') return baseEXP * effect.value;
  if (effect.type === 'add') return baseEXP + effect.value;
  if (effect.type === 'instant') return effect.value;
  return baseEXP;
}

// 선조턴 평균 EXP 계산
function calculateAncestorEXP(stage, useBreath, useBook, isEnhanced = false) {
  const baseEXP = calculateBaseEXP(useBreath, useBook);

  let probs, effects;
  if (stage <= 2) {
    probs = ANCESTOR_PROB_1_20;
    effects = ANCESTOR_EFFECTS_1_20;
  } else {
    probs = isEnhanced ? ANCESTOR_PROB_ENHANCED : ANCESTOR_PROB_21_40;
    effects = isEnhanced ? ANCESTOR_EFFECTS_ENHANCED : ANCESTOR_EFFECTS_21_40;
  }

  let totalEXP = 0;
  for (const [ancestor, prob] of Object.entries(probs)) {
    const effect = effects[ancestor];
    if (effect) {
      const exp = applyAncestorEffect(baseEXP, effect);
      totalEXP += exp * prob;
    }
  }

  return totalEXP;
}

// 전체 평균 EXP 계산
function calculateTotalEXP(stage, normalB, normalBk, bonusB, bonusBk) {
  const normalEXP = calculateBaseEXP(normalB, normalBk);
  const bonusEXP = calculateAncestorEXP(stage, bonusB, bonusBk, false);

  return normalEXP * TURN_RATES.normal + bonusEXP * TURN_RATES.bonus;
}

// 평균 시도 횟수
function calculateTries(stage, normalB, normalBk, bonusB, bonusBk) {
  const avgEXP = calculateTotalEXP(stage, normalB, normalBk, bonusB, bonusBk);
  return 1000 / avgEXP;
}

// 실제 데이터
const T4_ADVANCED_TRIES_1_20 = {
  'none_none': 59.3,
  'none_breath': 52.4,
  'none_book': 49.5,
  'none_both': 44.6,
  'breath_none': 45.7,
  'breath_breath': 41.5,
  'both_both': 28.6,
};

const T4_ADVANCED_TRIES_21_40 = {
  'none_none': 54.8,
  'none_breath': 49.8,
  'breath_none': 43.1,
  'breath_breath': 40.1,
};

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
  const calc = calculateTries(1, t.normalB, t.normalBk, t.bonusB, t.bonusBk);
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
  const calc = calculateTries(2, t.normalB, t.normalBk, t.bonusB, t.bonusBk);
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
  const calc = calculateTries(3, t.normalB, false, t.bonusB, false);
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
  const calc = calculateTries(4, t.normalB, false, t.bonusB, false);
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
const case1 = calculateTries(1, false, false, true, true);
const expect1 = T4_ADVANCED_TRIES_1_20['none_both'];
console.log(`계산값: ${case1.toFixed(2)}회`);
console.log(`예상값: ${expect1}회`);
console.log(`차이: ${((case1 - expect1) / expect1 * 100).toFixed(2)}%`);
console.log(`✅ 일반턴과 선조턴에 각각 다른 재료 설정 가능!`);

console.log('\n케이스 2: 일반턴 숨결만, 선조턴 아무것도 X (1~10단계)');
console.log('-'.repeat(80));
const case2 = calculateTries(1, true, false, false, false);
const expect2 = T4_ADVANCED_TRIES_1_20['breath_none'];
console.log(`계산값: ${case2.toFixed(2)}회`);
console.log(`예상값: ${expect2}회`);
console.log(`차이: ${((case2 - expect2) / expect2 * 100).toFixed(2)}%`);
console.log(`✅ 일반턴에만 재료 사용, 선조턴에는 사용 안 함도 가능!`);

console.log('\n케이스 3: 일반턴 재료 X, 선조턴만 숨결 (21~30단계)');
console.log('-'.repeat(80));
const case3 = calculateTries(3, false, false, true, false);
const expect3 = T4_ADVANCED_TRIES_21_40['none_breath'];
console.log(`계산값: ${case3.toFixed(2)}회`);
console.log(`예상값: ${expect3}회`);
console.log(`차이: ${((case3 - expect3) / expect3 * 100).toFixed(2)}%`);
console.log(`✅ 21단계 이상에서도 일반턴/선조턴 분리 사용 가능!`);

console.log('\n\n' + '='.repeat(80));
console.log('📊 EXP 상세 분석');
console.log('='.repeat(80));
console.log('');

console.log('1~10단계:');
console.log(`  일반턴 EXP (아무것도 X): ${calculateBaseEXP(false, false).toFixed(2)}`);
console.log(`  일반턴 EXP (숨결만): ${calculateBaseEXP(true, false).toFixed(2)}`);
console.log(`  일반턴 EXP (숨결+책): ${calculateBaseEXP(true, true).toFixed(2)}`);
console.log(`  선조턴 평균 EXP (아무것도 X): ${calculateAncestorEXP(1, false, false).toFixed(2)}`);
console.log(`  선조턴 평균 EXP (숨결만): ${calculateAncestorEXP(1, true, false).toFixed(2)}`);
console.log(`  선조턴 평균 EXP (숨결+책): ${calculateAncestorEXP(1, true, true).toFixed(2)}`);

console.log('\n21~30단계:');
console.log(`  일반턴 EXP (아무것도 X): ${calculateBaseEXP(false, false).toFixed(2)}`);
console.log(`  일반턴 EXP (숨결만): ${calculateBaseEXP(true, false).toFixed(2)}`);
console.log(`  선조턴 평균 EXP (아무것도 X): ${calculateAncestorEXP(3, false, false).toFixed(2)}`);
console.log(`  선조턴 평균 EXP (숨결만): ${calculateAncestorEXP(3, true, false).toFixed(2)}`);

console.log('\n\n' + '='.repeat(80));
console.log('✅ 검증 완료');
console.log('='.repeat(80));
