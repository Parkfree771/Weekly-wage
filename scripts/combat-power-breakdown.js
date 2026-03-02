const fs = require('fs');

// ══════════════════════════════════════════════════════════
// 전투력 역산 분석: 구아바밤바아 vs 처어단자아
// 공식: 전투력 = 순수기본공격력 × 0.0288 × Π(1 + 요소%)
// ══════════════════════════════════════════════════════════

const dataA = JSON.parse(fs.readFileSync('data/char_a_raw.json', 'utf8'));
const dataB = JSON.parse(fs.readFileSync('data/char_b_raw.json', 'utf8'));

// ─── 유틸리티 ───
function getStat(profile, type) {
  if (!profile?.Stats) return 0;
  const s = profile.Stats.find(s => s.Type === type);
  return s ? parseInt((s.Value || '0').replace(/,/g, ''), 10) : 0;
}

function getStatTooltip(profile, type) {
  if (!profile?.Stats) return [];
  const s = profile.Stats.find(s => s.Type === type);
  return s?.Tooltip || [];
}

function parseTooltip(item) {
  try { return JSON.parse(item.Tooltip); } catch { return null; }
}

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ').trim();
}

// ─── 기본 공격력 파싱 (API 툴팁에서 직접) ───
function parseBaseAttack(profile) {
  const tooltips = getStatTooltip(profile, '공격력');
  let baseAtk = 0, atkBonus = 0;
  for (const t of tooltips) {
    const plain = stripHtml(t);
    const baseM = plain.match(/기본 공격력은\s*([\d,]+)/);
    if (baseM) baseAtk = parseInt(baseM[1].replace(/,/g, ''), 10);
    const bonusM = plain.match(/공격력이\s*([\d,]+)\s*증가/);
    if (bonusM) atkBonus = parseInt(bonusM[1].replace(/,/g, ''), 10);
  }
  return { baseAtk, atkBonus, totalAtk: baseAtk + atkBonus };
}

// ─── 무기 파싱 ───
function parseWeapon(equip) {
  if (!equip) return null;
  const weapon = equip.find(e => e.Type === '무기');
  if (!weapon) return null;
  const tt = parseTooltip(weapon);
  if (!tt) return null;

  let quality = tt.Element_001?.value?.qualityValue || 0;
  const full = JSON.stringify(tt);
  const plain = stripHtml(full);

  let weaponAtk = 0, addDmg = 0;
  const wm = plain.match(/무기 공격력 \+?([\d,]+)/);
  if (wm) weaponAtk = parseInt(wm[1].replace(/,/g, ''), 10);
  const dm = plain.match(/추가 피해 \+?([\d.]+)%/);
  if (dm) addDmg = parseFloat(dm[1]);

  const enhM = (weapon.Name || '').match(/^\+(\d+)/);
  const enhance = enhM ? parseInt(enhM[1]) : 0;

  return { name: weapon.Name, quality, weaponAtk, addDmg, enhance, grade: weapon.Grade };
}

// ─── 방어구 힘 합산 ───
function parseArmorStr(equip) {
  if (!equip) return { total: 0, pieces: [] };
  const armorTypes = ['투구', '상의', '하의', '장갑', '어깨'];
  let total = 0;
  const pieces = [];
  for (const item of equip) {
    if (!armorTypes.includes(item.Type)) continue;
    const tt = parseTooltip(item);
    if (!tt) continue;
    const plain = stripHtml(JSON.stringify(tt));
    const m = plain.match(/힘 \+?([\d,]+)/);
    const str = m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
    total += str;
    pieces.push({ type: item.Type, str, name: item.Name });
  }
  return { total, pieces };
}

// ─── 장신구 힘/연마 파싱 ───
function parseAccessories(equip) {
  if (!equip) return [];
  const accTypes = ['목걸이', '귀걸이', '반지'];
  const result = [];
  for (const item of equip) {
    if (!accTypes.some(t => item.Type.includes(t))) continue;
    const tt = parseTooltip(item);
    if (!tt) continue;
    const plain = stripHtml(JSON.stringify(tt));
    const strM = plain.match(/힘 \+?([\d,]+)/);
    const str = strM ? parseInt(strM[1].replace(/,/g, ''), 10) : 0;
    // 연마 효과 파싱
    const grindings = [];
    const grindPatterns = [
      /적에게 주는 피해 \+?([\d.]+)%/g,
      /추가 피해 \+?([\d.]+)%/g,
      /공격력 \+?([\d.]+)%/g,
      /무기 공격력 \+?([\d.]+)%/g,
      /치명타 피해 \+?([\d.]+)%/g,
      /치명타 적중률 \+?([\d.]+)%/g,
    ];
    result.push({ type: item.Type, name: item.Name, str });
  }
  return result;
}

// ─── 팔찌 파싱 ───
function parseBracelet(equip) {
  if (!equip) return null;
  const bracelet = equip.find(e => e.Type === '팔찌');
  if (!bracelet) return null;
  const tt = parseTooltip(bracelet);
  if (!tt) return null;
  const plain = stripHtml(JSON.stringify(tt));
  const strM = plain.match(/힘 \+?([\d,]+)/);
  return {
    name: bracelet.Name,
    str: strM ? parseInt(strM[1].replace(/,/g, ''), 10) : 0,
    raw: plain.substring(0, 500),
  };
}

// ─── 각인 파싱 ───
function parseEngravings(eng) {
  const result = [];
  if (eng?.ArkPassiveEffects) {
    for (const e of eng.ArkPassiveEffects) {
      result.push({
        name: (e.Name || '').trim(),
        level: e.Level || 0,
        abilStone: e.AbilityStoneLevel || 0,
        grade: e.Grade,
        desc: stripHtml(e.Description || '').substring(0, 100),
      });
    }
  }
  return result;
}

// ─── 각인 전투력 계수 매트릭스 ───
const ENGRAVING_MATRIX = {
  '원한': [
    [18.00, 21.00, 21.75, 23.25, 24.00],
    [18.75, 21.75, 22.50, 24.00, 24.75],
    [19.50, 22.50, 23.25, 24.75, 25.50],
    [20.25, 23.25, 24.00, 25.50, 26.25],
    [21.00, 24.00, 24.75, 26.25, 27.00],
  ],
  '아드레날린': [
    [15.20, 18.08, 18.80, 20.18, 20.90],
    [16.25, 19.13, 19.85, 21.23, 21.95],
    [17.30, 20.18, 20.90, 22.28, 23.00],
    [18.35, 21.23, 21.95, 23.33, 24.05],
    [19.40, 22.28, 23.00, 24.38, 25.10],
  ],
  '돌격대장': [
    [16.00, 19.00, 19.76, 21.28, 22.00],
    [16.80, 19.80, 20.56, 22.08, 22.80],
    [17.60, 20.60, 21.36, 22.88, 23.60],
    [18.40, 21.40, 22.16, 23.68, 24.40],
    [19.20, 22.20, 22.96, 24.48, 25.20],
  ],
  '기습의 대가': [
    [15.30, 18.00, 18.70, 20.00, 20.70],
    [16.00, 18.70, 19.40, 20.70, 21.40],
    [16.70, 19.40, 20.10, 21.40, 22.10],
    [17.40, 20.10, 20.80, 22.10, 22.80],
    [18.10, 20.80, 21.50, 22.80, 23.50],
  ],
  '질량 증가': [
    [16.00, 19.00, 19.75, 21.25, 22.00],
    [16.75, 19.75, 20.50, 22.00, 22.75],
    [17.50, 20.50, 21.25, 22.75, 23.50],
    [18.25, 21.25, 22.00, 23.50, 24.25],
    [19.00, 22.00, 22.75, 24.25, 25.00],
  ],
};

// 유각 Level → matrix row: Lv.0=row0, Lv.1=row1, Lv.2=row2, Lv.3=row3
function getEngravingPercent(name, level, abilStone) {
  const matrix = ENGRAVING_MATRIX[name];
  if (!matrix) return null;
  const row = Math.min(level, 4); // Lv → row index (0-4)
  const col = Math.min(abilStone, 4);
  return matrix[row][col];
}

// ─── 보석 파싱 ───
const GEM_POWER = {
  3: { 1:0.48, 2:0.96, 3:1.44, 4:1.92, 5:2.40, 6:2.88, 7:3.36, 8:3.84, 9:4.80, 10:6.40 },
  4: { 1:1.28, 2:1.92, 3:2.56, 4:3.20, 5:3.84, 6:4.48, 7:5.12, 8:5.76, 9:6.40, 10:7.04 },
};

// T4 보석 11개 기준 기본 공격력% 보너스
const GEM_T4_BASE_ATK = { 6: 4.95, 7: 6.60, 8: 8.80, 9: 11.00, 10: 13.20 };

function parseGems(gems) {
  if (!gems?.Gems) return [];
  return gems.Gems.map(g => {
    const lvlM = (g.Name || '').match(/(\d+)레벨/);
    const level = lvlM ? parseInt(lvlM[1]) : 0;
    // T4 = 광휘/겁화/작열, T3 = 멸화/홍염
    let tier = 4; // default to T4
    if ((g.Name||'').includes('멸화') || (g.Name||'').includes('홍염')) tier = 3;
    return { level, tier, name: g.Name };
  });
}

function calcGemPower(gems) {
  let totalPower = 0;
  const groups = {};
  for (const g of gems) {
    const key = `T${g.tier} Lv.${g.level}`;
    groups[key] = (groups[key] || 0) + 1;
    totalPower += (GEM_POWER[g.tier]?.[g.level] || 0);
  }
  return { totalPower, groups, count: gems.length };
}

// ─── 아크 패시브 ───
function parseArkPassive(ap) {
  if (!ap?.Points) return null;
  let evo = 0, enl = 0, leap = 0;
  for (const p of ap.Points) {
    if ((p.Name||'').includes('진화')) evo = p.Value || 0;
    else if ((p.Name||'').includes('깨달음')) enl = p.Value || 0;
    else if ((p.Name||'').includes('도약')) leap = p.Value || 0;
  }
  const percent = evo * 0.5 + enl * 0.7 + leap * 0.2;
  return { evolution: evo, enlightenment: enl, leap, percent };
}

// ─── 카드 ───
function parseCards(cards) {
  if (!cards?.Effects) return [];
  const result = [];
  for (const eff of cards.Effects) {
    const items = eff.Items || [];
    let setName = '', count = 0, awaken = 0;
    for (const item of items) {
      const sm = (item.Name||'').match(/(.+?)\s*(\d+)세트/);
      if (sm) { setName = sm[1].trim(); count = parseInt(sm[2]); }
      const am = (item.Name||'').match(/각성합계\s*(\d+)/);
      if (am) awaken = Math.max(awaken, parseInt(am[1]));
    }
    if (setName) result.push({ name: setName, count, awaken });
  }
  return result;
}

// 카드 전투력 계수
const CARD_POWER = {
  '세상을 구하는 빛': { 30: 15.0, 24: 11.0, 18: 7.0 },
  '날랜 뇌전의 숨결': { 30: 15.0, 24: 11.0, 18: 7.0 }, // 암구빛 계열 동일
  '남겨진 바람의 절벽': { 30: 15.0, 24: 11.0, 18: 7.0 },
  '카제로스의 군단장': { 30: 15.0, 24: 11.0, 18: 7.0 },
};

function getCardPower(cards) {
  let total = 0;
  for (const c of cards) {
    const set = CARD_POWER[c.name];
    if (set && set[c.awaken]) total += set[c.awaken];
    else if (set) {
      // 가장 가까운 하위 각성
      for (const [awk, val] of Object.entries(set).sort((a,b) => Number(b[0]) - Number(a[0]))) {
        if (c.awaken >= Number(awk)) { total += val; break; }
      }
    }
  }
  return total;
}

// ─── 아크 그리드 ───
function parseArkGrid(grid) {
  if (!grid) return null;
  const effects = (grid.Effects || []).map(e => {
    const tooltip = stripHtml(e.Tooltip || '');
    const pctM = tooltip.match(/([\d.]+)%/);
    return {
      name: e.Name || '',
      level: e.Level || 0,
      percent: pctM ? parseFloat(pctM[1]) : 0,
      tooltip: tooltip.substring(0, 100),
    };
  });
  return {
    slotCount: (grid.Slots || []).length,
    effects,
  };
}

// ══════════════════════════════════════════════════════════
// 메인 분석
// ══════════════════════════════════════════════════════════

function analyzeChar(name, data) {
  const p = data.profile;
  const combatPower = parseFloat((p.CombatPower || '0').replace(/,/g, ''));
  const itemLevel = parseFloat((p.ItemAvgLevel || '0').replace(/,/g, ''));
  const charLevel = p.CharacterLevel;
  const className = p.CharacterClassName;

  const atkInfo = parseBaseAttack(p);
  const weapon = parseWeapon(data.equipment);
  const armorStr = parseArmorStr(data.equipment);
  const accessories = parseAccessories(data.equipment);
  const bracelet = parseBracelet(data.equipment);
  const engravings = parseEngravings(data.engravings);
  const gems = parseGems(data.gems);
  const gemInfo = calcGemPower(gems);
  const arkPassive = parseArkPassive(data.arkpassive);
  const cards = parseCards(data.cards);
  const arkGrid = parseArkGrid(data.arkgrid);

  const crit = getStat(p, '치명');
  const spec = getStat(p, '특화');
  const swift = getStat(p, '신속');
  const statSum = crit + spec + swift;

  // ─── 각 요소별 전투력 %  계산 ───
  const factors = {};

  // 1. 전투 레벨
  factors['전투레벨'] = charLevel >= 70 ? 29.45 : charLevel >= 65 ? 23.97 : charLevel >= 60 ? 18.56 : 8.95;

  // 2. 무기 품질 (추가 피해%)
  factors['무기품질(추피)'] = weapon ? weapon.addDmg : 0;

  // 3. 아크 패시브
  factors['아크패시브'] = arkPassive ? arkPassive.percent : 0;

  // 4. 전투 스탯
  factors['전투스탯'] = statSum * 0.03;

  // 5. 각인 (각각 독립 곱연산)
  const engFactors = {};
  for (const eng of engravings) {
    const pct = getEngravingPercent(eng.name, eng.level, eng.abilStone);
    if (pct !== null) {
      engFactors[`${eng.name} Lv.${eng.level} 어빌${eng.abilStone}`] = pct;
    } else {
      engFactors[`${eng.name} (미등록)`] = 0;
    }
  }

  // 6. 보석
  factors['보석'] = gemInfo.totalPower;

  // 7. 카드
  factors['카드'] = getCardPower(cards);

  // 8. 아크 그리드 효과 합산
  let gridTotal = 0;
  if (arkGrid) {
    for (const e of arkGrid.effects) {
      gridTotal += e.percent;
    }
  }
  factors['아크그리드'] = gridTotal;

  // ─── 총 곱연산 계산 ───
  let totalMultiplier = 1;
  for (const [k, v] of Object.entries(factors)) {
    totalMultiplier *= (1 + v / 100);
  }
  // 각인도 각각 곱연산
  for (const [k, v] of Object.entries(engFactors)) {
    totalMultiplier *= (1 + v / 100);
  }

  // 시작값
  const startValue = atkInfo.baseAtk * 0.0288;
  const estimatedPower = startValue * totalMultiplier;

  return {
    name, className, charLevel, itemLevel, combatPower,
    atkInfo, weapon, armorStr, bracelet, crit, spec, swift, statSum,
    engravings, engFactors, gems, gemInfo, arkPassive, cards, arkGrid,
    factors, totalMultiplier, startValue, estimatedPower,
  };
}

const A = analyzeChar('구아바밤바아', dataA);
const B = analyzeChar('처어단자아', dataB);

// ══════════════════════════════════════════════════════════
// 출력
// ══════════════════════════════════════════════════════════

function fmt(n, d=2) { return typeof n === 'number' ? n.toLocaleString(undefined, {maximumFractionDigits:d}) : n; }

console.log(`\n${'═'.repeat(70)}`);
console.log(`  전투력 역산 분석 비교`);
console.log(`${'═'.repeat(70)}`);

console.log(`\n┌─────────────────────────┬──────────────────┬──────────────────┐`);
console.log(`│                         │ ${A.name.padEnd(16)} │ ${B.name.padEnd(16)} │`);
console.log(`├─────────────────────────┼──────────────────┼──────────────────┤`);
console.log(`│ 직업                    │ ${A.className.padEnd(16)} │ ${B.className.padEnd(16)} │`);
console.log(`│ 전투레벨                │ ${String(A.charLevel).padEnd(16)} │ ${String(B.charLevel).padEnd(16)} │`);
console.log(`│ 아이템레벨              │ ${fmt(A.itemLevel).padEnd(16)} │ ${fmt(B.itemLevel).padEnd(16)} │`);
console.log(`│ ★ 전투력 (CombatPower)  │ ${fmt(A.combatPower).padEnd(16)} │ ${fmt(B.combatPower).padEnd(16)} │`);
console.log(`│ 공격력                  │ ${fmt(A.atkInfo.totalAtk,0).padEnd(16)} │ ${fmt(B.atkInfo.totalAtk,0).padEnd(16)} │`);
console.log(`│ └ 기본 공격력           │ ${fmt(A.atkInfo.baseAtk,0).padEnd(16)} │ ${fmt(B.atkInfo.baseAtk,0).padEnd(16)} │`);
console.log(`│ └ 공격력 증감           │ ${('+'+fmt(A.atkInfo.atkBonus,0)).padEnd(16)} │ ${('+'+fmt(B.atkInfo.atkBonus,0)).padEnd(16)} │`);
console.log(`└─────────────────────────┴──────────────────┴──────────────────┘`);

console.log(`\n── 무기 ──`);
console.log(`  A: ${A.weapon.name} | 품질 ${A.weapon.quality} | 무기공격력 ${fmt(A.weapon.weaponAtk,0)} | 추피 ${A.weapon.addDmg}%`);
console.log(`  B: ${B.weapon.name} | 품질 ${B.weapon.quality} | 무기공격력 ${fmt(B.weapon.weaponAtk,0)} | 추피 ${B.weapon.addDmg}%`);
console.log(`  차이: 무기공격력 ${fmt(A.weapon.weaponAtk - B.weapon.weaponAtk,0)} (+${((A.weapon.weaponAtk/B.weapon.weaponAtk-1)*100).toFixed(1)}%)`);

console.log(`\n── 전투 스탯 ──`);
console.log(`  A: 치명 ${A.crit} + 특화 ${A.spec} + 신속 ${A.swift} = ${A.statSum} → +${fmt(A.factors['전투스탯'])}%`);
console.log(`  B: 치명 ${B.crit} + 특화 ${B.spec} + 신속 ${B.swift} = ${B.statSum} → +${fmt(B.factors['전투스탯'])}%`);

console.log(`\n── 각인 (각각 독립 곱연산) ──`);
console.log(`  ${'각인'.padEnd(35)} ${'A (%)'.padStart(8)} ${'B (%)'.padStart(8)} ${'차이'.padStart(8)}`);
const allEngNames = new Set([...Object.keys(A.engFactors), ...Object.keys(B.engFactors)]);
for (const key of allEngNames) {
  const va = A.engFactors[key] || 0;
  const vb = B.engFactors[key] || 0;
  const diff = va - vb;
  console.log(`  ${key.padEnd(35)} ${fmt(va).padStart(8)} ${fmt(vb).padStart(8)} ${(diff > 0 ? '+' : '') + fmt(diff).padStart(7)}`);
}

console.log(`\n── 보석 ──`);
console.log(`  A: ${Object.entries(A.gemInfo.groups).map(([k,v]) => `${k}×${v}`).join(', ')} → 총 +${fmt(A.gemInfo.totalPower)}%`);
console.log(`  B: ${Object.entries(B.gemInfo.groups).map(([k,v]) => `${k}×${v}`).join(', ')} → 총 +${fmt(B.gemInfo.totalPower)}%`);
console.log(`  차이: ${fmt(A.gemInfo.totalPower - B.gemInfo.totalPower)}%`);

console.log(`\n── 아크 패시브 ──`);
if (A.arkPassive && B.arkPassive) {
  console.log(`  A: 진화 ${A.arkPassive.evolution} | 깨달음 ${A.arkPassive.enlightenment} | 도약 ${A.arkPassive.leap} → +${fmt(A.arkPassive.percent)}%`);
  console.log(`  B: 진화 ${B.arkPassive.evolution} | 깨달음 ${B.arkPassive.enlightenment} | 도약 ${B.arkPassive.leap} → +${fmt(B.arkPassive.percent)}%`);
}

console.log(`\n── 카드 ──`);
const cardsA = parseCards(dataA.cards);
const cardsB = parseCards(dataB.cards);
console.log(`  A: ${cardsA.map(c => `${c.name} ${c.count}세트 ${c.awaken}각`).join(', ')} → +${fmt(A.factors['카드'])}%`);
console.log(`  B: ${cardsB.map(c => `${c.name} ${c.count}세트 ${c.awaken}각`).join(', ')} → +${fmt(B.factors['카드'])}%`);

console.log(`\n── 아크 그리드 ──`);
if (A.arkGrid) {
  console.log(`  A:`);
  for (const e of A.arkGrid.effects) console.log(`    ${e.name} Lv.${e.level}: +${fmt(e.percent)}%`);
  console.log(`    총합: +${fmt(A.factors['아크그리드'])}%`);
}
if (B.arkGrid) {
  console.log(`  B:`);
  for (const e of B.arkGrid.effects) console.log(`    ${e.name} Lv.${e.level}: +${fmt(e.percent)}%`);
  console.log(`    총합: +${fmt(B.factors['아크그리드'])}%`);
}

// ══════════════════════════════════════════════════════════
// 전투력 역산 계산
// ══════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(70)}`);
console.log(`  전투력 역산 계산`);
console.log(`${'═'.repeat(70)}`);

console.log(`\n── 기본공격력 × 0.0288 (시작값) ──`);
console.log(`  A: ${fmt(A.atkInfo.baseAtk,0)} × 0.0288 = ${fmt(A.startValue)}`);
console.log(`  B: ${fmt(B.atkInfo.baseAtk,0)} × 0.0288 = ${fmt(B.startValue)}`);

console.log(`\n── 요소별 배율 ──`);
console.log(`  ${'요소'.padEnd(20)} ${'A (%)'.padStart(8)} ${'A 배율'.padStart(8)} ${'B (%)'.padStart(8)} ${'B 배율'.padStart(8)}`);
for (const key of Object.keys(A.factors)) {
  const va = A.factors[key] || 0;
  const vb = B.factors[key] || 0;
  console.log(`  ${key.padEnd(20)} ${fmt(va).padStart(8)} ${fmt(1+va/100,4).padStart(8)} ${fmt(vb).padStart(8)} ${fmt(1+vb/100,4).padStart(8)}`);
}
// 각인
for (const key of allEngNames) {
  const va = A.engFactors[key] || 0;
  const vb = B.engFactors[key] || 0;
  const shortKey = key.substring(0, 20);
  console.log(`  ${shortKey.padEnd(20)} ${fmt(va).padStart(8)} ${fmt(1+va/100,4).padStart(8)} ${fmt(vb).padStart(8)} ${fmt(1+vb/100,4).padStart(8)}`);
}

console.log(`\n── 총 곱연산 배율 ──`);
console.log(`  A 총배율: ${fmt(A.totalMultiplier, 4)}`);
console.log(`  B 총배율: ${fmt(B.totalMultiplier, 4)}`);
console.log(`  A/B 배율 비: ${fmt(A.totalMultiplier / B.totalMultiplier, 4)}`);

console.log(`\n── 예상 전투력 vs 실제 전투력 ──`);
console.log(`  A 예상: ${fmt(A.startValue)} × ${fmt(A.totalMultiplier,4)} = ${fmt(A.estimatedPower)}`);
console.log(`  A 실제: ${fmt(A.combatPower)}`);
console.log(`  A 오차: ${fmt(A.estimatedPower - A.combatPower)} (${((A.estimatedPower/A.combatPower-1)*100).toFixed(2)}%)`);
console.log(`  B 예상: ${fmt(B.startValue)} × ${fmt(B.totalMultiplier,4)} = ${fmt(B.estimatedPower)}`);
console.log(`  B 실제: ${fmt(B.combatPower)}`);
console.log(`  B 오차: ${fmt(B.estimatedPower - B.combatPower)} (${((B.estimatedPower/B.combatPower-1)*100).toFixed(2)}%)`);

// ── 비율 분석 ──
console.log(`\n── 비율 분석 ──`);
const actualRatio = A.combatPower / B.combatPower;
const baseRatio = A.atkInfo.baseAtk / B.atkInfo.baseAtk;
const multiplierRatio = A.totalMultiplier / B.totalMultiplier;
console.log(`  실제 전투력 비 (A/B): ${fmt(actualRatio, 4)}`);
console.log(`  기본공격력 비 (A/B): ${fmt(baseRatio, 4)}`);
console.log(`  배율 비 (A/B): ${fmt(multiplierRatio, 4)}`);
console.log(`  기본공격력비 × 배율비: ${fmt(baseRatio * multiplierRatio, 4)}`);
console.log(`  기본공격력비 × 배율비 vs 실제: ${((baseRatio * multiplierRatio / actualRatio - 1) * 100).toFixed(2)}% 오차`);

// ── 역산: 실제 전투력에서 필요한 시작값 역산 ──
console.log(`\n── 역산: 실제 전투력 ÷ 총배율 = 필요 시작값 ──`);
const neededStartA = A.combatPower / A.totalMultiplier;
const neededStartB = B.combatPower / B.totalMultiplier;
console.log(`  A: ${fmt(A.combatPower)} ÷ ${fmt(A.totalMultiplier,4)} = ${fmt(neededStartA)}`);
console.log(`  B: ${fmt(B.combatPower)} ÷ ${fmt(B.totalMultiplier,4)} = ${fmt(neededStartB)}`);
console.log(`  필요 시작값 ÷ 0.0288 = 순수기본공격력:`);
console.log(`  A: ${fmt(neededStartA / 0.0288, 0)} (API 기본공격력: ${fmt(A.atkInfo.baseAtk,0)})`);
console.log(`  B: ${fmt(neededStartB / 0.0288, 0)} (API 기본공격력: ${fmt(B.atkInfo.baseAtk,0)})`);

// ── 오차 분석: 어떤 요소가 빠졌는지 ──
console.log(`\n── 오차 분석 ──`);
const missingA = A.combatPower / A.startValue; // 실제 총배율
const missingB = B.combatPower / B.startValue;
console.log(`  A 실제 총배율: ${fmt(A.combatPower)} / ${fmt(A.startValue)} = ${fmt(missingA, 4)}`);
console.log(`  A 계산 총배율: ${fmt(A.totalMultiplier, 4)}`);
console.log(`  A 누락 배율: ${fmt(missingA / A.totalMultiplier, 4)} (= ${((missingA / A.totalMultiplier - 1) * 100).toFixed(2)}%)`);
console.log(`  B 실제 총배율: ${fmt(B.combatPower)} / ${fmt(B.startValue)} = ${fmt(missingB, 4)}`);
console.log(`  B 계산 총배율: ${fmt(B.totalMultiplier, 4)}`);
console.log(`  B 누락 배율: ${fmt(missingB / B.totalMultiplier, 4)} (= ${((missingB / B.totalMultiplier - 1) * 100).toFixed(2)}%)`);

console.log(`\n${'═'.repeat(70)}`);
console.log(`  요소별 전투력 기여도 (차이 분석)`);
console.log(`${'═'.repeat(70)}`);

// 각 요소가 두 캐릭터 간 전투력 차이에 얼마나 기여하는지
const allFactorKeys = Object.keys(A.factors);
console.log(`\n  ${'요소'.padEnd(20)} ${'A/B 배율비'.padStart(12)} ${'기여도'.padStart(10)}`);
for (const key of allFactorKeys) {
  const fA = 1 + (A.factors[key] || 0) / 100;
  const fB = 1 + (B.factors[key] || 0) / 100;
  const ratio = fA / fB;
  console.log(`  ${key.padEnd(20)} ${fmt(ratio,4).padStart(12)} ${((ratio-1)*100).toFixed(2).padStart(9)}%`);
}
for (const key of allEngNames) {
  const fA = 1 + (A.engFactors[key] || 0) / 100;
  const fB = 1 + (B.engFactors[key] || 0) / 100;
  const ratio = fA / fB;
  const shortKey = key.substring(0, 20);
  console.log(`  ${shortKey.padEnd(20)} ${fmt(ratio,4).padStart(12)} ${((ratio-1)*100).toFixed(2).padStart(9)}%`);
}
console.log(`  ${'─'.repeat(45)}`);
console.log(`  ${'총 배율비'.padEnd(20)} ${fmt(multiplierRatio,4).padStart(12)} ${((multiplierRatio-1)*100).toFixed(2).padStart(9)}%`);
console.log(`  ${'기본공격력비'.padEnd(20)} ${fmt(baseRatio,4).padStart(12)} ${((baseRatio-1)*100).toFixed(2).padStart(9)}%`);
console.log(`  ${'─'.repeat(45)}`);
console.log(`  ${'추정 전투력비'.padEnd(20)} ${fmt(baseRatio*multiplierRatio,4).padStart(12)} ${((baseRatio*multiplierRatio-1)*100).toFixed(2).padStart(9)}%`);
console.log(`  ${'실제 전투력비'.padEnd(20)} ${fmt(actualRatio,4).padStart(12)} ${((actualRatio-1)*100).toFixed(2).padStart(9)}%`);
