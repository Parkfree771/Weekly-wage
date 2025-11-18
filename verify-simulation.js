// 재련 시뮬레이션 검증 스크립트
// 사용자가 제시한 규칙대로 작동하는지 확인

const JANGIN_ACCUMULATE_DIVIDER = 2.15;

// 기본 확률
const BASE_PROBABILITY = {
  11: 0.10, 12: 0.10,
  13: 0.05, 14: 0.05,
  15: 0.04, 16: 0.04,
  17: 0.03, 18: 0.03, 19: 0.03,
  20: 0.015, 21: 0.015,
  22: 0.01, 23: 0.01,
  24: 0.005, 25: 0.005,
};

// 숨결 효과 테이블
const BREATH_EFFECT_TABLE = {
  0.10: { max: 20, per: 0.005 },   // 10% -> 1개당 0.5%
  0.05: { max: 20, per: 0.0025 },  // 5%  -> 1개당 0.25%
  0.04: { max: 20, per: 0.002 },   // 4%  -> 1개당 0.2%
  0.03: { max: 20, per: 0.0015 },  // 3%  -> 1개당 0.15%
  0.015: { max: 25, per: 0.0006 }, // 1.5% -> 1개당 0.06%
  0.01: { max: 25, per: 0.0004 },  // 1%  -> 1개당 0.04%
  0.005: { max: 50, per: 0.0002 }, // 0.5% -> 1개당 0.02%
};

// 책 효과 (절대값 추가 - 기본 확률과 동일한 값을 더함!)
const BOOK_EFFECT = {
  11: 0.10, 12: 0.10,  // 10% 구간: +10%
  13: 0.05, 14: 0.05,  // 5% 구간: +5%
  15: 0.04, 16: 0.04,  // 4% 구간: +4%
  17: 0.03, 18: 0.03,  // 3% 구간: +3%
  19: 0.03,            // 3% 구간: +3%
  20: 0.015,           // 1.5% 구간: +1.5%
  21: 0,               // 책 효과 없음
  22: 0, 23: 0,        // 책 효과 없음
  24: 0, 25: 0,        // 책 효과 없음
};

/**
 * 단일 시도 시뮬레이션
 * @returns {number} 성공까지 걸린 시도 횟수
 */
function simulateSingleTry(level, useBreath, useBook) {
  const baseProb = BASE_PROBABILITY[level];
  let currentProb = baseProb; // 실패 누적으로 증가하는 기본 확률
  let jangin = 0; // 장인의 기운
  let tries = 0;

  // 숨결 효과 계산
  let breathProb = 0;
  if (useBreath) {
    const breathEffect = BREATH_EFFECT_TABLE[baseProb];
    if (breathEffect) {
      breathProb = breathEffect.max * breathEffect.per;
    }
  }

  // 책 효과 계산 (절대값 추가 - 숨결과 동일한 방식!)
  const bookProb = useBook ? (BOOK_EFFECT[level] || 0) : 0;

  while (true) {
    tries++;

    // 장인의 기운 100% 도달 시 무조건 성공
    if (jangin >= 1) {
      return tries;
    }

    // 최종 확률 계산
    // finalProb = currentProb + breathProb + bookProb
    let finalProb = currentProb + breathProb + bookProb;
    finalProb = Math.min(finalProb, 1); // 최대 100%

    // 성공 판정
    if (Math.random() < finalProb) {
      return tries;
    }

    // 실패 시 처리
    // 1. 장인의 기운 증가 - 최종 확률(finalProb)을 기준으로!
    jangin += finalProb / JANGIN_ACCUMULATE_DIVIDER;

    // 2. 기본 확률 증가 - baseProb의 10%씩, 최대 2배까지
    currentProb = Math.min(currentProb + baseProb * 0.1, baseProb * 2);
  }
}

/**
 * N번 시뮬레이션 실행하여 평균 계산
 */
function runSimulation(level, useBreath, useBook, iterations = 10000) {
  let totalTries = 0;
  for (let i = 0; i < iterations; i++) {
    totalTries += simulateSingleTry(level, useBreath, useBook);
  }
  return totalTries / iterations;
}

// 실제 데이터 (refiningSimulationData.ts에서)
const ACTUAL_DATA = {
  case1: { // 기본 (숨결 X, 책 X)
    11: 6.65, 12: 6.67, 13: 11.39, 14: 11.46, 15: 13.72, 16: 13.78,
    17: 17.48, 18: 17.40, 19: 17.54, 20: 32.31, 21: 32.26, 22: 47.40,
    23: 47.06, 24: 91.08, 25: 91.65,
  },
  case2: { // 숨결 O, 책 X
    11: 4.19, 12: 4.13, 13: 7.56, 14: 7.53, 15: 9.06, 16: 9.03,
    17: 11.53, 18: 11.68, 19: 11.63, 20: 21.60, 21: 21.60, 22: 31.34,
    23: 31.38, 24: 45.70, 25: 45.38,
  },
  case3: { // 숨결 O, 책 O
    11: 3.01, 12: 3.05, 13: 5.59, 14: 5.60, 15: 6.70, 16: 6.74,
    17: 8.67, 18: 8.65, 19: 8.76, 20: 16.21, 21: 21.67, 22: 31.60,
    23: 31.75, 24: 45.87, 25: 45.84,
  },
  case4: { // 숨결 X, 책 O
    11: 4.16, 12: 4.19, 13: 7.53, 14: 7.45, 15: 9.07, 16: 9.07,
    17: 11.64, 18: 11.62, 19: 11.59, 20: 21.72, 21: 32.24, 22: 46.89,
    23: 47.37, 24: 91.22, 25: 90.79,
  }
};

console.log('='.repeat(80));
console.log('📊 재련 시뮬레이션 규칙 검증');
console.log('='.repeat(80));
console.log('');

console.log('✅ 적용된 규칙:');
console.log('  1. 실패 시 기본 확률 증가:');
console.log('     currentProb = Math.min(currentProb + baseProb * 0.1, baseProb * 2)');
console.log('     → baseProb 기준으로 10%씩 증가, 최대 2배까지');
console.log('');
console.log('  2. 장인의 기운 증가 (핵심!):');
console.log('     finalProb = currentProb + breathProb + bookProb');
console.log('     jangin += finalProb / 2.15');
console.log('     → 최종 확률(숨결+책 포함)을 기준으로 계산!');
console.log('');
console.log('  3. 숨결 효과: 테이블 기반 절대값 증가');
console.log('     예: 10% 구간 20개 = +10%');
console.log('');
console.log('  4. 책 효과: 절대값 추가 (기본 확률과 동일!)');
console.log('     예: 10% 구간 → +10%, 5% 구간 → +5%');
console.log('');
console.log('  5. 최종 성공 확률:');
console.log('     Math.min(currentProb + breathProb + bookProb + jangin, 1)');
console.log('');

// 테스트할 레벨들
const testLevels = [11, 13, 15, 17, 20, 22, 24];

console.log('='.repeat(80));
console.log('🧪 시뮬레이션 결과 비교 (10,000회 반복)');
console.log('='.repeat(80));
console.log('');

for (const level of testLevels) {
  console.log(`\n📌 레벨 +${level} (기본 확률: ${(BASE_PROBABILITY[level] * 100).toFixed(1)}%)`);
  console.log('-'.repeat(80));

  // Case 1: 기본
  const sim1 = runSimulation(level, false, false);
  const actual1 = ACTUAL_DATA.case1[level];
  const diff1 = ((sim1 - actual1) / actual1 * 100).toFixed(1);
  console.log(`  케이스 1 (기본):`);
  console.log(`    시뮬레이션: ${sim1.toFixed(2)}회`);
  console.log(`    실제 데이터: ${actual1}회`);
  console.log(`    차이: ${diff1}%`);

  // Case 2: 숨결만
  const sim2 = runSimulation(level, true, false);
  const actual2 = ACTUAL_DATA.case2[level];
  const diff2 = ((sim2 - actual2) / actual2 * 100).toFixed(1);
  console.log(`  케이스 2 (숨결):`);
  console.log(`    시뮬레이션: ${sim2.toFixed(2)}회`);
  console.log(`    실제 데이터: ${actual2}회`);
  console.log(`    차이: ${diff2}%`);

  // Case 3: 숨결 + 책
  if (level <= 20) {
    const sim3 = runSimulation(level, true, true);
    const actual3 = ACTUAL_DATA.case3[level];
    const diff3 = ((sim3 - actual3) / actual3 * 100).toFixed(1);
    console.log(`  케이스 3 (숨결+책):`);
    console.log(`    시뮬레이션: ${sim3.toFixed(2)}회`);
    console.log(`    실제 데이터: ${actual3}회`);
    console.log(`    차이: ${diff3}%`);
  } else {
    console.log(`  케이스 3 (숨결+책): 책 사용 불가 (21+)`);
  }

  // Case 4: 책만
  if (level <= 20) {
    const sim4 = runSimulation(level, false, true);
    const actual4 = ACTUAL_DATA.case4[level];
    const diff4 = ((sim4 - actual4) / actual4 * 100).toFixed(1);
    console.log(`  케이스 4 (책만):`);
    console.log(`    시뮬레이션: ${sim4.toFixed(2)}회`);
    console.log(`    실제 데이터: ${actual4}회`);
    console.log(`    차이: ${diff4}%`);
  } else {
    console.log(`  케이스 4 (책만): 책 사용 불가 (21+)`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('📋 상세 확률 계산 예시 (+11 레벨, 기본 10%)');
console.log('='.repeat(80));
console.log('');

const level = 11;
const baseProb = 0.10;
console.log('케이스 1: 기본 (숨결 X, 책 X)');
console.log('-'.repeat(80));
let currentProb = baseProb;
let jangin = 0;
for (let i = 1; i <= 10; i++) {
  const finalProb = Math.min(currentProb + jangin, 1);
  console.log(`  시도 ${i}: 확률 ${(finalProb * 100).toFixed(2)}% (기본: ${(currentProb * 100).toFixed(2)}%, 장인: ${(jangin * 100).toFixed(2)}%)`);

  // 실패 가정
  jangin += currentProb / JANGIN_ACCUMULATE_DIVIDER; // ✅ currentProb 사용! (최종 확률)
  currentProb = Math.min(currentProb + baseProb * 0.1, baseProb * 2);
}

console.log('\n케이스 2: 숨결 20개 (숨결 O, 책 X)');
console.log('-'.repeat(80));
const breathProb = 20 * 0.005; // 10%
currentProb = baseProb;
jangin = 0;
for (let i = 1; i <= 10; i++) {
  const totalProb = currentProb + breathProb; // 숨결 포함한 확률
  const finalProb = Math.min(totalProb + jangin, 1); // 장인까지 더한 최종 확률
  console.log(`  시도 ${i}: 확률 ${(finalProb * 100).toFixed(2)}% (기본: ${(currentProb * 100).toFixed(2)}%, 숨결: ${(breathProb * 100).toFixed(2)}%, 장인: ${(jangin * 100).toFixed(2)}%)`);

  // 실패 가정
  jangin += totalProb / JANGIN_ACCUMULATE_DIVIDER; // ✅ totalProb 사용! (최종 확률)
  currentProb = Math.min(currentProb + baseProb * 0.1, baseProb * 2);
}

console.log('\n' + '='.repeat(80));
console.log('🎯 사용자 예시 검증: 기본 10%, 숨결+책으로 최종 30%');
console.log('='.repeat(80));
console.log('');

// 사용자가 제시한 예시
currentProb = 0.10; // 기본 10%
jangin = 0;
const exampleBreath = 0.10; // 숨결로 +10%
const exampleBook = 0.10;   // 책으로 +10% (절대값!)

console.log('초기 설정:');
console.log(`  기본 확률: ${(baseProb * 100).toFixed(1)}%`);
console.log(`  숨결 효과: +${(exampleBreath * 100).toFixed(1)}%`);
console.log(`  책 효과: +${(exampleBook * 100).toFixed(1)}% (절대값 추가!)`);
console.log('');

for (let i = 1; i <= 3; i++) {
  const totalProb = currentProb + exampleBreath + exampleBook;
  const finalProb = Math.min(totalProb + jangin, 1);

  console.log(`시도 ${i}:`);
  console.log(`  기본 확률: ${(currentProb * 100).toFixed(2)}%`);
  console.log(`  + 숨결: +${(exampleBreath * 100).toFixed(2)}%`);
  console.log(`  + 책: +${(exampleBook * 100).toFixed(2)}%`);
  console.log(`  = 합계: ${(totalProb * 100).toFixed(2)}%`);
  console.log(`  + 장인의 기운: ${(jangin * 100).toFixed(2)}%`);
  console.log(`  = 최종 확률: ${(finalProb * 100).toFixed(2)}%`);

  // 실패 가정
  const janginIncrease = totalProb / JANGIN_ACCUMULATE_DIVIDER;
  console.log(`  → 실패 시 장인 증가: +${(janginIncrease * 100).toFixed(2)}%`);

  jangin += janginIncrease;
  currentProb = Math.min(currentProb + baseProb * 0.1, baseProb * 2);

  console.log(`  → 다음 기본 확률: ${(currentProb * 100).toFixed(2)}%`);
  console.log(`  → 누적 장인의 기운: ${(jangin * 100).toFixed(2)}%`);
  console.log('');
}

console.log('='.repeat(80));
console.log('✅ 검증 완료');
console.log('='.repeat(80));
