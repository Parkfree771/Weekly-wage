const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKey = envContent.match(/LOSTARK_API_KEY=(.+)/)?.[1]?.trim();

const base = 'https://developer-lostark.game.onstove.com';
const headers = { 'accept': 'application/json', 'authorization': 'Bearer ' + apiKey };

async function fetchChar(name) {
  const enc = encodeURIComponent(name);
  const armory = `${base}/armories/characters/${enc}`;
  const [profileRes, equipRes, engRes, gemRes, cardRes, arkpRes, gridRes] = await Promise.all([
    fetch(armory + '/profiles', { headers }),
    fetch(armory + '/equipment', { headers }),
    fetch(armory + '/engravings', { headers }),
    fetch(armory + '/gems', { headers }),
    fetch(armory + '/cards', { headers }),
    fetch(armory + '/arkpassive', { headers }),
    fetch(armory + '/arkgrid', { headers }),
  ]);
  return {
    profile: profileRes.ok ? await profileRes.json() : null,
    equipment: equipRes.ok ? await equipRes.json() : null,
    engravings: engRes.ok ? await engRes.json() : null,
    gems: gemRes.ok ? await gemRes.json() : null,
    cards: cardRes.ok ? await cardRes.json() : null,
    arkpassive: arkpRes.ok ? await arkpRes.json() : null,
    arkgrid: gridRes.ok ? await gridRes.json() : null,
  };
}

function getStat(profile, type) {
  if (!profile?.Stats) return 0;
  const s = profile.Stats.find(s => s.Type === type);
  return s ? parseInt((s.Value || '0').replace(/,/g, ''), 10) : 0;
}

function getStatName(profile) {
  // 힘/민첩/지능 중 어떤 걸 쓰는지
  if (!profile?.Stats) return null;
  for (const s of profile.Stats) {
    if (['힘', '민첩', '지능'].includes(s.Type)) {
      return { type: s.Type, value: parseInt((s.Value || '0').replace(/,/g, ''), 10) };
    }
  }
  return null;
}

function parseWeapon(equip) {
  if (!equip) return null;
  const weapon = equip.find(e => e.Type === '무기');
  if (!weapon) return null;
  let quality = 0, addDmg = 0, weaponAtk = 0, enhance = 0;
  const enhMatch = (weapon.Name || '').match(/^\+(\d+)/);
  if (enhMatch) enhance = parseInt(enhMatch[1]);
  try {
    const tt = JSON.parse(weapon.Tooltip);
    if (tt.Element_001?.value?.qualityValue !== undefined) quality = tt.Element_001.value.qualityValue;
    const full = JSON.stringify(tt).replace(/<[^>]*>/g, '');
    const dmg = full.match(/추가 피해 \+?([\d.]+)%/);
    if (dmg) addDmg = parseFloat(dmg[1]);
    const watk = full.match(/무기 공격력 \+?([\d,]+)/);
    if (watk) weaponAtk = parseInt(watk[1].replace(/,/g, ''), 10);
  } catch {}
  return { name: weapon.Name, grade: weapon.Grade, quality, addDmg, weaponAtk, enhance };
}

function parseGems(gems) {
  if (!gems?.Gems) return [];
  return gems.Gems.map(g => {
    const lvl = (g.Name || '').match(/(\d+)레벨/);
    let type = '멸화';
    if ((g.Name||'').includes('홍염')) type = '홍염';
    else if ((g.Name||'').includes('겁화')) type = '겁화';
    else if ((g.Name||'').includes('작열')) type = '작열';
    const tier = (type === '겁화' || type === '작열') ? 4 : 3;
    return { level: lvl ? parseInt(lvl[1]) : 0, type, tier };
  }).sort((a,b) => b.level - a.level);
}

function parseEngravings(eng) {
  const result = [];
  if (eng?.ArkPassiveEffects) {
    for (const e of eng.ArkPassiveEffects) {
      const name = (e.Name || '').replace(/\s*Lv\.\s*\d+/, '').trim();
      result.push({ name, level: e.Level || 0, abil: e.AbilityStoneLevel || 0, ark: true });
    }
  }
  if (eng?.Effects) {
    for (const e of eng.Effects) {
      const m = (e.Name || '').match(/(.+?)\s*Lv\.\s*(\d+)/);
      if (m) result.push({ name: m[1].trim(), level: parseInt(m[2]), abil: 0, ark: false });
    }
  }
  return result;
}

function parseArkPassive(ap) {
  if (!ap?.Points) return null;
  let evo = 0, enl = 0, leap = 0;
  for (const p of ap.Points) {
    if ((p.Name||'').includes('진화')) evo = p.Value || 0;
    else if ((p.Name||'').includes('깨달음')) enl = p.Value || 0;
    else if ((p.Name||'').includes('도약')) leap = p.Value || 0;
  }
  return { evolution: evo, enlightenment: enl, leap };
}

function parseArkGrid(grid) {
  if (!grid) return null;
  const effects = (grid.Effects || []).map(e => ({
    name: e.Name || '',
    level: e.Level || 0,
    tooltip: (e.Tooltip || '').replace(/<[^>]*>/g, '').trim(),
  }));
  return { coreCount: (grid.Slots || []).length, gemCount: (grid.Slots || []).reduce((s,sl) => s + (sl.Gems||[]).length, 0), effects };
}

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

const GEM_TABLE = {
  '3-1':0.48,'3-2':0.96,'3-3':1.44,'3-4':1.92,'3-5':2.40,
  '3-6':2.88,'3-7':3.36,'3-8':3.84,'3-9':4.80,'3-10':6.40,
  '4-1':1.28,'4-2':1.92,'4-3':2.56,'4-4':3.20,'4-5':3.84,
  '4-6':4.48,'4-7':5.12,'4-8':5.76,'4-9':6.40,'4-10':7.04,
};

function printChar(name, data) {
  const p = data.profile;
  const hmj = getStatName(p);
  const atk = getStat(p, '공격력');
  const crit = getStat(p, '치명'), spec = getStat(p, '특화'), swift = getStat(p, '신속');
  const weapon = parseWeapon(data.equipment);
  const gems = parseGems(data.gems);
  const engs = parseEngravings(data.engravings);
  const ap = parseArkPassive(data.arkpassive);
  const grid = parseArkGrid(data.arkgrid);
  const cards = parseCards(data.cards);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${name} (${p?.CharacterClassName})`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  전투레벨: ${p?.CharacterLevel}  |  아이템레벨: ${p?.ItemAvgLevel}`);
  console.log(`  ★ 공격력(전투력): ${atk?.toLocaleString()}`);
  if (hmj) console.log(`  ${hmj.type}: ${hmj.value?.toLocaleString()}`);

  console.log(`\n  ── 무기 ──`);
  if (weapon) {
    console.log(`  ${weapon.name} (${weapon.grade})`);
    console.log(`  품질: ${weapon.quality}  |  추가피해: ${weapon.addDmg}%  |  무기공격력: ${weapon.weaponAtk?.toLocaleString()}`);
    if (hmj && weapon.weaponAtk > 0) {
      const basePower = Math.sqrt(hmj.value * weapon.weaponAtk / 6);
      console.log(`  → 기본공격력 = sqrt(${hmj.value} × ${weapon.weaponAtk} / 6) = ${Math.round(basePower).toLocaleString()}`);
      console.log(`  → 기본공격력 × 0.0288 = ${Math.round(basePower * 0.0288).toLocaleString()} (전투력 시작값)`);
    }
  }

  console.log(`\n  ── 전투 스탯 ──`);
  console.log(`  치명 ${crit} + 특화 ${spec} + 신속 ${swift} = ${crit+spec+swift}`);
  console.log(`  → 전투력 +${((crit+spec+swift)*0.03).toFixed(2)}%`);

  console.log(`\n  ── 각인 ──`);
  for (const e of engs) {
    console.log(`  ${e.name} Lv.${e.level}${e.abil > 0 ? ` (어빌 ${e.abil})` : ''}${e.ark ? ' [아크]' : ''}`);
  }

  console.log(`\n  ── 보석 ──`);
  const gemGroups = {};
  let totalGemPower = 0;
  for (const g of gems) {
    const key = `T${g.tier} Lv.${g.level}`;
    gemGroups[key] = (gemGroups[key] || 0) + 1;
    totalGemPower += GEM_TABLE[`${g.tier}-${g.level}`] || 0;
  }
  for (const [k, v] of Object.entries(gemGroups)) console.log(`  ${k} × ${v}`);
  console.log(`  → 보석 총 전투력: +${totalGemPower.toFixed(2)}%`);

  console.log(`\n  ── 아크 패시브 ──`);
  if (ap) {
    const evoP = ap.evolution * 0.5, enlP = ap.enlightenment * 0.7, leapP = ap.leap * 0.2;
    console.log(`  진화 ${ap.evolution}pt (${evoP.toFixed(1)}%) | 깨달음 ${ap.enlightenment}pt (${enlP.toFixed(1)}%) | 도약 ${ap.leap}pt (${leapP.toFixed(1)}%)`);
    console.log(`  → 아크패시브 총: +${(evoP+enlP+leapP).toFixed(1)}%`);
  }

  console.log(`\n  ── 카드 ──`);
  for (const c of cards) console.log(`  ${c.name} ${c.count}세트${c.awaken > 0 ? ` (${c.awaken}각)` : ''}`);

  console.log(`\n  ── 아크 그리드 ──`);
  if (grid) {
    console.log(`  코어 ${grid.coreCount}개 / 젬 ${grid.gemCount}개`);
    for (const e of grid.effects) console.log(`  ${e.name} Lv.${e.level}: ${e.tooltip}`);
  }

  return { atk, hmj, weapon, crit, spec, swift, gems, engs, ap, grid, cards, totalGemPower };
}

async function main() {
  console.log('캐릭터 데이터 로딩중...');
  const [dataA, dataB] = await Promise.all([
    fetchChar('구아바밤바아'),
    fetchChar('처어단자아'),
  ]);

  const infoA = printChar('구아바밤바아', dataA);
  const infoB = printChar('처어단자아', dataB);

  // 비교
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  ▶ 비교 분석');
  console.log(`${'═'.repeat(60)}`);
  console.log(`\n  공격력 차이: ${(infoA.atk - infoB.atk).toLocaleString()} (${((infoA.atk/infoB.atk - 1)*100).toFixed(2)}%)`);

  if (infoA.hmj && infoB.hmj) {
    console.log(`  ${infoA.hmj.type} 차이: ${(infoA.hmj.value - infoB.hmj.value).toLocaleString()}`);
  }
  if (infoA.weapon && infoB.weapon) {
    console.log(`  무기공격력 차이: ${(infoA.weapon.weaponAtk - infoB.weapon.weaponAtk).toLocaleString()}`);
    console.log(`  무기품질 차이: ${infoA.weapon.quality} vs ${infoB.weapon.quality} (추가피해 ${infoA.weapon.addDmg}% vs ${infoB.weapon.addDmg}%)`);
  }
  console.log(`  전투스탯합 차이: ${(infoA.crit+infoA.spec+infoA.swift) - (infoB.crit+infoB.spec+infoB.swift)}`);
  console.log(`  보석 전투력 차이: ${(infoA.totalGemPower - infoB.totalGemPower).toFixed(2)}%`);
  if (infoA.ap && infoB.ap) {
    const apA = infoA.ap.evolution*0.5 + infoA.ap.enlightenment*0.7 + infoA.ap.leap*0.2;
    const apB = infoB.ap.evolution*0.5 + infoB.ap.enlightenment*0.7 + infoB.ap.leap*0.2;
    console.log(`  아크패시브 차이: ${(apA-apB).toFixed(1)}%`);
  }

  // 기본 공격력 역산 체크
  if (infoA.hmj && infoA.weapon && infoB.hmj && infoB.weapon) {
    console.log(`\n  ── 기본 공격력 역산 체크 ──`);
    const baseA = Math.sqrt(infoA.hmj.value * infoA.weapon.weaponAtk / 6);
    const baseB = Math.sqrt(infoB.hmj.value * infoB.weapon.weaponAtk / 6);
    const startA = baseA * 0.0288;
    const startB = baseB * 0.0288;
    console.log(`  A 기본공격력: ${Math.round(baseA).toLocaleString()} → 시작값: ${Math.round(startA).toLocaleString()}`);
    console.log(`  B 기본공격력: ${Math.round(baseB).toLocaleString()} → 시작값: ${Math.round(startB).toLocaleString()}`);
    console.log(`  A/B 기본공격력 비율: ${(baseA/baseB).toFixed(4)}`);
    console.log(`  A/B 실제 전투력 비율: ${(infoA.atk/infoB.atk).toFixed(4)}`);
  }

  // raw data 저장
  fs.writeFileSync('data/char_a_raw.json', JSON.stringify(dataA, null, 2));
  fs.writeFileSync('data/char_b_raw.json', JSON.stringify(dataB, null, 2));
  console.log('\n  Raw data saved to data/char_a_raw.json, data/char_b_raw.json');
}

main().catch(e => console.error(e));
