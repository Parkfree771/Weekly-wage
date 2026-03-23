/**
 * RefiningStats용 정적 데이터 생성 스크립트
 * 계승 후 11~24 레벨, 풀숨/노숨, 각 20만 회
 * 결과: lib/refiningStatsData.ts
 */

const fs = require('fs');
const path = require('path');

const JANGIN_DIVIDER = 2.15;
const ITERATIONS = 1000000;

// ========== 데이터 테이블 ==========
const SUCCESSION_BASE_PROB = {
  11: 0.05, 12: 0.05,
  13: 0.04, 14: 0.04, 15: 0.04,
  16: 0.03, 17: 0.03, 18: 0.03,
  19: 0.015, 20: 0.015,
  21: 0.01, 22: 0.01,
  23: 0.005, 24: 0.005,
};

const SUCCESSION_BREATH_EFFECT = {
  0.05: { max: 20, per: 0.0025 },
  0.04: { max: 20, per: 0.002 },
  0.03: { max: 25, per: 0.0012 },
  0.015: { max: 25, per: 0.0006 },
  0.01: { max: 25, per: 0.0004 },
  0.005: { max: 50, per: 0.0002 },
};

// 계승 후 재료 비용 (key = nextLevel = from_level + 1)
const SUCC_ARMOR_COSTS = {
  12: { stone: 930, breakthrough: 11, abidos: 11, fragment: 9570, shilling: 13200, gold: 2450 },
  13: { stone: 1030, breakthrough: 12, abidos: 12, fragment: 10540, shilling: 13200, gold: 2700 },
  14: { stone: 1120, breakthrough: 13, abidos: 13, fragment: 11520, shilling: 13200, gold: 2950 },
  15: { stone: 1240, breakthrough: 14, abidos: 15, fragment: 12690, shilling: 13200, gold: 3250 },
  16: { stone: 1330, breakthrough: 15, abidos: 16, fragment: 13670, shilling: 13200, gold: 3500 },
  17: { stone: 1450, breakthrough: 17, abidos: 17, fragment: 14840, shilling: 15600, gold: 3800 },
  18: { stone: 1560, breakthrough: 18, abidos: 19, fragment: 16010, shilling: 15600, gold: 4100 },
  19: { stone: 1700, breakthrough: 20, abidos: 20, fragment: 17380, shilling: 15600, gold: 4450 },
  20: { stone: 1810, breakthrough: 21, abidos: 22, fragment: 18550, shilling: 21600, gold: 4750 },
  21: { stone: 1950, breakthrough: 23, abidos: 23, fragment: 19920, shilling: 21600, gold: 5100 },
  22: { stone: 2080, breakthrough: 24, abidos: 25, fragment: 21280, shilling: 28800, gold: 5450 },
  23: { stone: 2200, breakthrough: 26, abidos: 26, fragment: 22460, shilling: 28800, gold: 5750 },
  24: { stone: 2330, breakthrough: 27, abidos: 28, fragment: 23820, shilling: 36000, gold: 6100 },
  25: { stone: 2450, breakthrough: 29, abidos: 30, fragment: 25000, shilling: 36000, gold: 6400 },
};

const SUCC_WEAPON_COSTS = {
  12: { stone: 1700, breakthrough: 17, abidos: 18, fragment: 15890, shilling: 22000, gold: 4050 },
  13: { stone: 1890, breakthrough: 19, abidos: 21, fragment: 17660, shilling: 22000, gold: 4500 },
  14: { stone: 2080, breakthrough: 21, abidos: 23, fragment: 19420, shilling: 22000, gold: 4950 },
  15: { stone: 2270, breakthrough: 23, abidos: 25, fragment: 21190, shilling: 22000, gold: 5400 },
  16: { stone: 2460, breakthrough: 25, abidos: 27, fragment: 22960, shilling: 22000, gold: 5850 },
  17: { stone: 2690, breakthrough: 28, abidos: 29, fragment: 25120, shilling: 26000, gold: 6400 },
  18: { stone: 2900, breakthrough: 30, abidos: 32, fragment: 27080, shilling: 26000, gold: 6900 },
  19: { stone: 3110, breakthrough: 32, abidos: 34, fragment: 29040, shilling: 26000, gold: 7400 },
  20: { stone: 3340, breakthrough: 34, abidos: 37, fragment: 31200, shilling: 36000, gold: 7950 },
  21: { stone: 3570, breakthrough: 37, abidos: 39, fragment: 33360, shilling: 36000, gold: 8500 },
  22: { stone: 3800, breakthrough: 39, abidos: 42, fragment: 35520, shilling: 48000, gold: 9050 },
  23: { stone: 4030, breakthrough: 42, abidos: 44, fragment: 37680, shilling: 48000, gold: 9600 },
  24: { stone: 4260, breakthrough: 44, abidos: 47, fragment: 39840, shilling: 60000, gold: 10150 },
  25: { stone: 4500, breakthrough: 47, abidos: 50, fragment: 42000, shilling: 60000, gold: 10700 },
};

// ========== 시뮬레이션 ==========
function simulate(baseProb, useBreath) {
  let jangin = 0;
  let currentProbBonus = 0;
  let tries = 0;

  const breath = SUCCESSION_BREATH_EFFECT[baseProb] || { max: 0, per: 0 };
  const breathProb = useBreath ? breath.max * breath.per : 0;

  while (true) {
    tries++;
    const currentProb = Math.min(baseProb + currentProbBonus, baseProb * 2);
    const finalProb = Math.min(currentProb + breathProb, 1);

    if (jangin >= 1 || Math.random() < finalProb) {
      return { tries, jangin: Math.min(jangin, 1) };
    }

    jangin = Math.min(jangin + finalProb / JANGIN_DIVIDER, 1);
    currentProbBonus = Math.min(currentProbBonus + baseProb * 0.1, baseProb);
  }
}

function runSimulation(level, useBreath) {
  const baseProb = SUCCESSION_BASE_PROB[level];
  const breath = SUCCESSION_BREATH_EFFECT[baseProb] || { max: 0, per: 0 };
  const breathMax = useBreath ? breath.max : 0;
  const nextLevel = level + 1;

  const attempts = [];
  const jangins = [];
  const hist = new Array(10).fill(0);

  for (let i = 0; i < ITERATIONS; i++) {
    const result = simulate(baseProb, useBreath);
    attempts.push(result.tries);

    const janginPct = result.jangin * 100;
    jangins.push(janginPct);

    const binIdx = janginPct >= 100 ? 9 : Math.min(Math.floor(janginPct / 10), 9);
    hist[binIdx]++;
  }

  // 정렬
  attempts.sort((a, b) => a - b);
  jangins.sort((a, b) => a - b);

  const medianAttempts = attempts[Math.floor(ITERATIONS / 2)];
  const avgAttempts = +(attempts.reduce((s, v) => s + v, 0) / ITERATIONS).toFixed(2);

  const janginAvg = +(jangins.reduce((s, v) => s + v, 0) / ITERATIONS).toFixed(2);
  const janginP25 = +jangins[Math.floor(ITERATIONS * 0.25)].toFixed(2);
  const janginP50 = +jangins[Math.floor(ITERATIONS * 0.50)].toFixed(2);
  const janginP75 = +jangins[Math.floor(ITERATIONS * 0.75)].toFixed(2);
  const janginMin = +jangins[0].toFixed(2);
  const janginMax = +jangins[ITERATIONS - 1].toFixed(2);

  // 재료 계산 (weapon)
  const wc = SUCC_WEAPON_COSTS[nextLevel];
  const ac = SUCC_ARMOR_COSTS[nextLevel];

  return {
    level,
    breathType: useBreath ? 'full' : 'none',
    totalCount: ITERATIONS,
    medianAttempts,
    avgAttempts,
    janginAvg,
    janginMin,
    janginMax,
    janginP25,
    janginP50,
    janginP75,
    histogram: hist,
    // Weapon median materials
    weapon: {
      medianStone: medianAttempts * wc.stone,
      medianBreakthrough: medianAttempts * wc.breakthrough,
      medianAbidos: medianAttempts * wc.abidos,
      medianFragment: medianAttempts * wc.fragment,
      medianGold: medianAttempts * wc.gold,
      medianShilling: medianAttempts * wc.shilling,
      medianBreath: medianAttempts * breathMax,
      avgStone: +(avgAttempts * wc.stone).toFixed(1),
      avgBreakthrough: +(avgAttempts * wc.breakthrough).toFixed(1),
      avgAbidos: +(avgAttempts * wc.abidos).toFixed(1),
      avgFragment: +(avgAttempts * wc.fragment).toFixed(1),
      avgGold: +(avgAttempts * wc.gold).toFixed(1),
      avgShilling: +(avgAttempts * wc.shilling).toFixed(1),
      avgBreath: +(avgAttempts * breathMax).toFixed(1),
    },
    // Armor median materials
    armor: {
      medianStone: medianAttempts * ac.stone,
      medianBreakthrough: medianAttempts * ac.breakthrough,
      medianAbidos: medianAttempts * ac.abidos,
      medianFragment: medianAttempts * ac.fragment,
      medianGold: medianAttempts * ac.gold,
      medianShilling: medianAttempts * ac.shilling,
      medianBreath: medianAttempts * breathMax,
      avgStone: +(avgAttempts * ac.stone).toFixed(1),
      avgBreakthrough: +(avgAttempts * ac.breakthrough).toFixed(1),
      avgAbidos: +(avgAttempts * ac.abidos).toFixed(1),
      avgFragment: +(avgAttempts * ac.fragment).toFixed(1),
      avgGold: +(avgAttempts * ac.gold).toFixed(1),
      avgShilling: +(avgAttempts * ac.shilling).toFixed(1),
      avgBreath: +(avgAttempts * breathMax).toFixed(1),
    },
  };
}

// ========== 전 레벨 실행 ==========
console.log(`Generating stats data (${ITERATIONS.toLocaleString()} iterations per case)...`);

const allResults = [];

for (let level = 11; level <= 24; level++) {
  for (const useBreath of [true, false]) {
    const label = `Level ${level} ${useBreath ? 'full' : 'none'}`;
    process.stdout.write(`  ${label}...`);
    const result = runSimulation(level, useBreath);
    allResults.push(result);
    console.log(` median=${result.medianAttempts}, avg=${result.avgAttempts}`);
  }
}

// ========== TypeScript 파일 생성 ==========
let ts = `// 이 파일은 scripts/generate-stats-data.js로 자동 생성됨
// Monte Carlo ${ITERATIONS.toLocaleString()}회 시뮬레이션 기반 (계승 후, 풀숨/노숨)

export type BreathFilterType = 'full' | 'none';

export interface StatsData {
  totalCount: number;
  medianAttempts: number;
  avgAttempts: number;
  janginAvg: number;
  janginMin: number;
  janginMax: number;
  janginP25: number;
  janginP50: number;
  janginP75: number;
  histogram: number[]; // 10 bins: 0-10%, 10-20%, ..., 90-100%
  weapon: MaterialStats;
  armor: MaterialStats;
}

export interface MaterialStats {
  medianStone: number;
  medianBreakthrough: number;
  medianAbidos: number;
  medianFragment: number;
  medianGold: number;
  medianShilling: number;
  medianBreath: number;
  avgStone: number;
  avgBreakthrough: number;
  avgAbidos: number;
  avgFragment: number;
  avgGold: number;
  avgShilling: number;
  avgBreath: number;
}

// key: \`\${from_level}_\${breathType}\`
const STATS_DATA: Record<string, StatsData> = {\n`;

for (const r of allResults) {
  const key = `${r.level}_${r.breathType}`;
  ts += `  '${key}': {\n`;
  ts += `    totalCount: ${r.totalCount},\n`;
  ts += `    medianAttempts: ${r.medianAttempts},\n`;
  ts += `    avgAttempts: ${r.avgAttempts},\n`;
  ts += `    janginAvg: ${r.janginAvg},\n`;
  ts += `    janginMin: ${r.janginMin},\n`;
  ts += `    janginMax: ${r.janginMax},\n`;
  ts += `    janginP25: ${r.janginP25},\n`;
  ts += `    janginP50: ${r.janginP50},\n`;
  ts += `    janginP75: ${r.janginP75},\n`;
  ts += `    histogram: [${r.histogram.join(', ')}],\n`;
  ts += `    weapon: {\n`;
  for (const [k, v] of Object.entries(r.weapon)) {
    ts += `      ${k}: ${v},\n`;
  }
  ts += `    },\n`;
  ts += `    armor: {\n`;
  for (const [k, v] of Object.entries(r.armor)) {
    ts += `      ${k}: ${v},\n`;
  }
  ts += `    },\n`;
  ts += `  },\n`;
}

ts += `};\n\n`;

ts += `export function getStatsData(fromLevel: number, breathType: BreathFilterType): StatsData | null {
  return STATS_DATA[\`\${fromLevel}_\${breathType}\`] || null;
}

export function getStatsDataForRange(
  fromLevel: number,
  toLevel: number,
  breathType: BreathFilterType
): StatsData[] {
  const results: StatsData[] = [];
  for (let level = fromLevel; level < toLevel; level++) {
    const data = getStatsData(level, breathType);
    if (data) results.push(data);
  }
  return results;
}
`;

const outPath = path.join(__dirname, '..', 'lib', 'refiningStatsData.ts');
fs.writeFileSync(outPath, ts, 'utf-8');
console.log(`\nGenerated: ${outPath}`);
console.log(`Total entries: ${allResults.length}`);
