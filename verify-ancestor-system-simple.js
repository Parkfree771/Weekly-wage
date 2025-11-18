// 선조 시스템 검증 스크립트 (간단 버전)

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
  temer: 0.35,      // 테메르 35%
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
  galatour: { type: 'multiply', value: 5 },      // EXP ×5
  gelar: { type: 'multiply', value: 3 },         // EXP ×3
  kuhumbar: { type: 'add', value: 30 },          // +30
  temer: { type: 'add', value: 10, free: true }, // +10 + 무료
};

// 선조 효과 (21~40)
const ANCESTOR_EFFECTS_21_40 = {
  galatour: { type: 'multiply', value: 5 },      // EXP ×5
  gelar: { type: 'multiply', value: 3 },         // EXP ×3
  kuhumbar: { type: 'add', value: 30 },          // +30
  temer: { type: 'add', value: 10, free: true }, // +10 + 무료
  naber: { type: 'enhance', value: 0 },          // 다음 강화
  eber: { type: 'instant', value: 100 },         // +100 즉시
};

// 선조 효과 (강화)
const ANCESTOR_EFFECTS_ENHANCED = {
  galatour: { type: 'multiply', value: 7 },      // EXP ×7
  gelar: { type: 'multiply', value: 5 },         // EXP ×5
  kuhumbar: { type: 'add', value: 80 },          // +80
  temer: { type: 'add', value: 30, free: true }, // +30 + 무료
  eber: { type: 'instant', value: 200 },         // +200 즉시
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

// 검증 시작
console.log('='.repeat(80));
console.log('📊 상급 재련 선조 시스템 검증');
console.log('='.repeat(80));
console.log('');

// 1. 기본 EXP 확인
console.log('1️⃣ 기본 EXP 계산');
console.log('-'.repeat(80));
console.log(`아무것도 X: ${calculateBaseEXP(false, false).toFixed(2)} EXP`);
console.log(`숨결만: ${calculateBaseEXP(true, false).toFixed(2)} EXP`);
console.log(`책만: ${calculateBaseEXP(false, true).toFixed(2)} EXP`);
console.log(`숨결+책: ${calculateBaseEXP(true, true).toFixed(2)} EXP`);

// 2. 선조 확률 검증
console.log('\n\n2️⃣ 선조 확률 검증');
console.log('-'.repeat(80));

console.log('\n[1~20단계]');
let sum = 0;
for (const [name, prob] of Object.entries(ANCESTOR_PROB_1_20)) {
  console.log(`  ${name}: ${(prob * 100).toFixed(2)}%`);
  sum += prob;
}
console.log(`  합계: ${(sum * 100).toFixed(2)}%`);

console.log('\n[21~40단계]');
sum = 0;
for (const [name, prob] of Object.entries(ANCESTOR_PROB_21_40)) {
  console.log(`  ${name}: ${(prob * 100).toFixed(2)}%`);
  sum += prob;
}
console.log(`  합계: ${(sum * 100).toFixed(2)}%`);

console.log('\n[나베르 강화 후]');
sum = 0;
for (const [name, prob] of Object.entries(ANCESTOR_PROB_ENHANCED)) {
  if (prob > 0) {
    console.log(`  ${name}: ${(prob * 100).toFixed(2)}%`);
    sum += prob;
  }
}
console.log(`  합계: ${(sum * 100).toFixed(2)}%`);

// 3. 평균 시도 횟수 검증
console.log('\n\n3️⃣ 평균 시도 횟수 검증 (1~10 구간)');
console.log('-'.repeat(80));

const tests = [
  { name: '아무것도 X / 아무것도 X', n: [0,0], b: [0,0], exp: 59.3 },
  { name: '아무것도 X / 숨결만', n: [0,0], b: [1,0], exp: 52.4 },
  { name: '아무것도 X / 책만', n: [0,0], b: [0,1], exp: 49.5 },
  { name: '아무것도 X / 숨결+책', n: [0,0], b: [1,1], exp: 44.6 },
  { name: '숨결만 / 숨결만', n: [1,0], b: [1,0], exp: 41.5 },
  { name: '숨결+책 / 숨결+책', n: [1,1], b: [1,1], exp: 28.6 },
];

for (const t of tests) {
  const calc = calculateTries(1, t.n[0], t.n[1], t.b[0], t.b[1]);
  const diff = ((calc - t.exp) / t.exp * 100);
  console.log(`\n${t.name}:`);
  console.log(`  계산: ${calc.toFixed(2)}회`);
  console.log(`  예상: ${t.exp}회`);
  console.log(`  차이: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`);
}

// 4. 선조 EXP 계산 검증
console.log('\n\n4️⃣ 선조턴 평균 EXP 검증');
console.log('-'.repeat(80));

const baseEXP = calculateBaseEXP(false, false); // 13 EXP
console.log(`\n기본 EXP (아무것도 X): ${baseEXP.toFixed(2)}`);

console.log('\n[1~20 선조별 EXP]');
for (const [name, effect] of Object.entries(ANCESTOR_EFFECTS_1_20)) {
  const exp = applyAncestorEffect(baseEXP, effect);
  const prob = ANCESTOR_PROB_1_20[name];
  console.log(`  ${name}: ${exp.toFixed(2)} EXP (${(prob * 100).toFixed(1)}%)`);
}

const ancestorAvg1_20 = calculateAncestorEXP(1, false, false, false);
console.log(`\n선조턴 평균 EXP: ${ancestorAvg1_20.toFixed(2)}`);

console.log('\n[21~40 선조별 EXP]');
for (const [name, effect] of Object.entries(ANCESTOR_EFFECTS_21_40)) {
  const exp = applyAncestorEffect(baseEXP, effect);
  const prob = ANCESTOR_PROB_21_40[name];
  console.log(`  ${name}: ${exp.toFixed(2)} EXP (${(prob * 100).toFixed(1)}%)`);
}

const ancestorAvg21_40 = calculateAncestorEXP(3, false, false, false);
console.log(`\n선조턴 평균 EXP: ${ancestorAvg21_40.toFixed(2)}`);

// 5. 무료턴 확률
console.log('\n\n5️⃣ 무료턴 확률');
console.log('-'.repeat(80));

const free1_20 = TURN_RATES.bonus * ANCESTOR_PROB_1_20.temer;
const free21_40 = TURN_RATES.bonus * ANCESTOR_PROB_21_40.temer;
const freeEnhanced = TURN_RATES.bonus * ANCESTOR_PROB_ENHANCED.temer;

console.log(`1~20단계: ${(free1_20 * 100).toFixed(4)}%`);
console.log(`21~40단계: ${(free21_40 * 100).toFixed(4)}%`);
console.log(`나베르 강화 후: ${(freeEnhanced * 100).toFixed(4)}%`);
console.log(`\n예상값: 4.0265%`);

console.log('\n\n' + '='.repeat(80));
console.log('✅ 검증 완료');
console.log('='.repeat(80));
