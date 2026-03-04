/**
 * 전투력 역산 검증 스크립트
 * 구아바밤바아의 API 데이터를 파싱하여 계산값 vs 실제값 비교
 *
 * 실행: npx tsx scripts/verify-combat-power.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCombatPowerData } from '../lib/combatPowerData';
import { calculateBreakdown } from '../lib/combatPowerSimulator';
import {
  ARK_GRID_EFFECT_PER_LEVEL,
  getCoreTableKey,
  getCoreOptionPower,
  CORE_OPTION_TABLE,
} from '../lib/combatPowerTables';

// 데이터 로드
const raw = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../data/guava_combat_raw.json'), 'utf8'
));

const data = parseCombatPowerData(raw);
if (!data) {
  console.error('파싱 실패');
  process.exit(1);
}

console.log('═══════════════════════════════════════');
console.log('전투력 역산 검증: 구아바밤바아');
console.log('═══════════════════════════════════════');
console.log(`실제 전투력: ${data.profile.combatPower}`);
console.log(`공격력: ${data.profile.attackPower}`);
console.log(`아이템 레벨: ${data.profile.itemLevel}`);
console.log('');

// ── breakdown 실행 ──
const breakdown = calculateBreakdown(data);

console.log('── 기여도 항목별 ──');
for (const item of breakdown.items) {
  console.log(`  ${item.category.padEnd(10)} ${item.label.padEnd(20)} ${item.contribution.toFixed(2).padStart(8)}%  ${item.currentValue}`);
}
console.log('');
console.log(`총 곱연산 배율: ×${breakdown.totalMultiplier.toFixed(4)}`);
console.log('');

// ── 절대값 역산 ──
// 공식: CP = 기본공격력 × 0.000288 × Π(1 + 요소%)
// 기본공격력은 API에서 직접 가져올 수 없으므로 equipment에서 파싱
// research에 적혀있는 char_a 기본공격력: 187,064

// 프로필 Tooltip에서 기본공격력 파싱 시도
let baseAtk = 0;
const atkStat = raw.profile?.Stats?.find((s: any) => s.Type === '공격력');
if (atkStat?.Tooltip) {
  // Tooltip이 배열/객체일 수 있음
  const tooltipStr = typeof atkStat.Tooltip === 'string'
    ? atkStat.Tooltip
    : JSON.stringify(atkStat.Tooltip);
  const cleaned = tooltipStr.replace(/<[^>]*>/g, '');
  const m = cleaned.match(/기본\s*공격력[은는]?\s*([\d,]+)/);
  if (m) {
    baseAtk = parseInt(m[1].replace(/,/g, ''), 10);
  }
}
// fallback: 연구 데이터 기준 (구아바밤바아 기본공격력 187,064)
if (baseAtk === 0) {
  baseAtk = 187064;
  console.log('(기본공격력 파싱 실패, 연구데이터 기준 187,064 사용)');
}

console.log('── 절대값 역산 ──');
console.log(`기본 공격력: ${baseAtk.toLocaleString()}`);
if (baseAtk > 0) {
  const baseCp = baseAtk * 0.000288;
  console.log(`기본 CP (기본공 × 0.000288): ${baseCp.toFixed(2)}`);
  const predictedCp = baseCp * breakdown.totalMultiplier;
  console.log(`예측 CP (기본CP × 배율): ${predictedCp.toFixed(2)}`);
  const actualCp = data.profile.combatPower;
  const error = ((predictedCp - actualCp) / actualCp) * 100;
  console.log(`실제 CP: ${actualCp.toFixed(2)}`);
  console.log(`오차: ${error.toFixed(3)}%`);
  console.log('');

  // 에스더/펫 미포함 상태에서 오차 분석
  console.log('── 에스더/펫 보정 시나리오 ──');
  // 에스더 2단계 8강 = 1.90%, 펫 상옵 = 0.77%
  const estherPet = (1 + 1.90/100) * (1 + 0.77/100);
  const correctedCp = predictedCp * estherPet;
  const correctedError = ((correctedCp - actualCp) / actualCp) * 100;
  console.log(`에2-8강(1.90%) + 펫상(0.77%) 추가: ${correctedCp.toFixed(2)} (오차 ${correctedError.toFixed(3)}%)`);
}
console.log('');

// ── 아크 그리드 상세 ──
console.log('── 아크 그리드 상세 ──');
if (data.arkGrid) {
  console.log('');
  console.log('  [젬 효과]');
  for (const eff of data.arkGrid.effects) {
    const perLevel = ARK_GRID_EFFECT_PER_LEVEL[eff.name] || 0;
    const contrib = eff.level * perLevel;
    const affectsCP = perLevel > 0 ? '✓' : '✗';
    console.log(`    ${affectsCP} ${eff.name.padEnd(10)} Lv.${String(eff.level).padStart(2)}  ${contrib.toFixed(2).padStart(6)}%  (${perLevel}/Lv)  ${eff.tooltip}`);
  }

  console.log('');
  console.log('  [코어 옵션]');
  let coreProduct = 1;
  for (const core of data.arkGrid.cores) {
    const { tableKey, category, coreName } = getCoreTableKey(core.name);
    const grade = (core.grade === '고대' ? '고대' : '유물') as '유물' | '고대';
    const coreContrib = getCoreOptionPower(tableKey, grade, core.point);
    coreProduct *= (1 + coreContrib / 100);

    const shortName = core.name.replace(/.*코어\s*:\s*/, '');
    console.log(`    ${shortName.padEnd(12)} ${core.coreType.padEnd(8)} ${grade} ${String(core.point).padStart(2)}P  → 테이블: ${tableKey.padEnd(20)} = ${coreContrib.toFixed(2)}%`);
  }
  console.log(`    코어 옵션 곱연산: Π = ${coreProduct.toFixed(6)} (+${((coreProduct - 1) * 100).toFixed(2)}%)`);
}

console.log('');
console.log('── 개별 카테고리 요약 ──');
const categories: Record<string, number> = {};
for (const item of breakdown.items) {
  const cat = item.category;
  if (!categories[cat]) categories[cat] = 0;
  // 곱연산이므로 합산이 아닌 곱
  categories[cat] = (1 + categories[cat] / 100) * (1 + item.contribution / 100) * 100 - 100;
}
for (const [cat, total] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(12)} +${total.toFixed(2)}%`);
}
