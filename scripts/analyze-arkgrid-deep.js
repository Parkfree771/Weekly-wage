const fs = require('fs');

const a = JSON.parse(fs.readFileSync('data/char_a_raw.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('data/char_b_raw.json', 'utf8'));

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ').trim();
}

function deepAnalyzeGrid(name, grid) {
  if (!grid) return;
  console.log('\n' + '='.repeat(70));
  console.log('  ' + name + ' 아크 그리드 심층 분석');
  console.log('='.repeat(70));

  const slots = grid.Slots || [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    console.log('\n--- 코어 #' + (i + 1) + ' ---');
    console.log('  Name: ' + slot.Name);
    console.log('  Grade: ' + slot.Grade);
    console.log('  Point: ' + JSON.stringify(slot.Point));
    console.log('  Index: ' + slot.Index);

    // 코어 tooltip 상세 파싱
    if (slot.Tooltip) {
      try {
        const tt = JSON.parse(slot.Tooltip);
        // 각 Element 출력
        for (const [key, elem] of Object.entries(tt)) {
          if (!elem) continue;
          const type = elem.type;
          let val = '';
          if (typeof elem.value === 'string') {
            val = stripHtml(elem.value);
          } else if (typeof elem.value === 'object' && elem.value !== null) {
            // ItemPartBox 등 중첩 구조
            const subVals = [];
            for (const [sk, sv] of Object.entries(elem.value)) {
              if (typeof sv === 'string') subVals.push(stripHtml(sv));
            }
            val = subVals.join(' | ');
          }
          if (val && val.length > 0) {
            console.log('  [' + key + '] (' + type + '): ' + val.substring(0, 200));
          }
        }
      } catch (e) {
        console.log('  parse error: ' + e.message);
      }
    }

    // 젬 상세
    const gems = slot.Gems || [];
    for (let j = 0; j < gems.length; j++) {
      const gem = gems[j];
      console.log('  젬[' + j + '] Grade: ' + gem.Grade + ', IsActive: ' + gem.IsActive + ', Index: ' + gem.Index);
      if (gem.Tooltip) {
        try {
          const gt = JSON.parse(gem.Tooltip);
          for (const [key, elem] of Object.entries(gt)) {
            if (!elem) continue;
            let val = '';
            if (typeof elem.value === 'string') {
              val = stripHtml(elem.value);
            } else if (typeof elem.value === 'object' && elem.value !== null) {
              const subVals = [];
              for (const [sk, sv] of Object.entries(elem.value)) {
                if (typeof sv === 'string') subVals.push(stripHtml(sv));
              }
              val = subVals.join(' | ');
            }
            if (val && val.length > 0) {
              console.log('    [' + key + '] (' + elem.type + '): ' + val.substring(0, 200));
            }
          }
        } catch {}
      }
    }
  }

  // 최종 Effects
  console.log('\n=== Effects (최종 합산 효과) ===');
  for (const e of (grid.Effects || [])) {
    console.log('  ' + e.Name + ' Lv.' + e.Level);
    console.log('    Tooltip: ' + stripHtml(e.Tooltip || ''));
  }
}

// 구아바밤바아 첫 2개 코어만 상세 (너무 길어지지 않게)
console.log('===== 구아바밤바아 코어 #1, #2 상세 =====');
const gridA = JSON.parse(JSON.stringify(a.arkgrid));
gridA.Slots = gridA.Slots.slice(0, 2);
deepAnalyzeGrid('구아바밤바아 (코어 1-2)', gridA);

// 처어단자아 코어 #4 (혼돈의 달 전설 - 젬 없음)
console.log('\n\n===== 처어단자아 코어 #4 (젬 없는 코어) =====');
const gridB4 = JSON.parse(JSON.stringify(b.arkgrid));
gridB4.Slots = gridB4.Slots.slice(3, 4);
deepAnalyzeGrid('처어단자아 (코어 4)', gridB4);

// 각 코어별 Point 값 비교
console.log('\n\n===== 코어별 Point 비교 =====');
console.log('구아바밤바아:');
for (const s of a.arkgrid.Slots) {
  console.log('  ' + s.Name + ' (' + s.Grade + '): Point=' + JSON.stringify(s.Point) + ', 젬 ' + (s.Gems || []).length + '개');
}
console.log('처어단자아:');
for (const s of b.arkgrid.Slots) {
  console.log('  ' + s.Name + ' (' + s.Grade + '): Point=' + JSON.stringify(s.Point) + ', 젬 ' + (s.Gems || []).length + '개');
}

// 전체 Effects Level 합계
console.log('\n===== 효과 Level 합계 =====');
function sumEffects(grid) {
  let total = 0;
  for (const e of (grid.Effects || [])) total += e.Level;
  return total;
}
console.log('A 총 효과 Level: ' + sumEffects(a.arkgrid));
console.log('B 총 효과 Level: ' + sumEffects(b.arkgrid));

// 코어 Point 합계
function sumPoints(grid) {
  let total = 0;
  for (const s of (grid.Slots || [])) total += (s.Point || 0);
  return total;
}
console.log('A 총 Point: ' + sumPoints(a.arkgrid));
console.log('B 총 Point: ' + sumPoints(b.arkgrid));

// 젬 등급별 카운트
function countGems(grid) {
  const counts = {};
  for (const s of (grid.Slots || [])) {
    for (const g of (s.Gems || [])) {
      const grade = g.Grade || '?';
      counts[grade] = (counts[grade] || 0) + 1;
    }
  }
  return counts;
}
console.log('A 젬: ' + JSON.stringify(countGems(a.arkgrid)));
console.log('B 젬: ' + JSON.stringify(countGems(b.arkgrid)));
