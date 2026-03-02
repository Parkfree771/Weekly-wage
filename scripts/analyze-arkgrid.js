const fs = require('fs');

const a = JSON.parse(fs.readFileSync('data/char_a_raw.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('data/char_b_raw.json', 'utf8'));

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ').trim();
}

function analyzeGrid(name, grid) {
  if (!grid) { console.log(name + ': No grid data'); return; }
  console.log('\n' + '='.repeat(70));
  console.log('  ' + name + ' 아크 그리드 상세');
  console.log('='.repeat(70));

  const slots = grid.Slots || [];
  console.log('  총 슬롯(코어) 수: ' + slots.length);

  // 슬롯별 분석
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const gems = slot.Gems || [];
    const effects = slot.Effects || [];

    console.log('\n  --- 코어 #' + (i + 1) + ' ---');

    // 코어 tooltip 파싱
    if (slot.Tooltip) {
      try {
        const tt = JSON.parse(slot.Tooltip);
        const plain = stripHtml(JSON.stringify(tt));
        // 코어 이름/등급
        const nameM = plain.match(/([가-힣]+의\s*[가-힣]+)\s/);
        const gradeM = plain.match(/(일반|고급|희귀|영웅|전설|유물|고대)\s*아크/i);
        // 코어 효과
        const effectPatterns = [
          /추가 피해\s*\+?([\d.]+)%/,
          /적에게 주는 피해\s*\+?([\d.]+)%/,
          /공격력\s*\+?([\d.]+)%/,
          /보스 피해\s*\+?([\d.]+)%/,
          /아군 피해 강화\s*\+?([\d.]+)%/,
          /아군 공격 강화\s*\+?([\d.]+)%/,
          /낙인력\s*\+?([\d.]+)%/,
          /치명타 적중률\s*\+?([\d.]+)%/,
          /치명타 피해\s*\+?([\d.]+)%/,
        ];
        let coreEffects = [];
        for (const pat of effectPatterns) {
          const m = plain.match(pat);
          if (m) coreEffects.push(pat.source.replace(/\\s\*\\+\?\(\[\\d\.\]\+\)%/, '') + ': +' + m[1] + '%');
        }

        // 코어 기본정보 출력
        const nameStr = nameM ? nameM[1] : '?';
        const gradeStr = gradeM ? gradeM[1] : '?';
        console.log('  이름: ' + nameStr + ' (' + gradeStr + ')');

        // 질서/혼돈 수치
        const orderM = plain.match(/질서\s*([\d,]+)/);
        const chaosM = plain.match(/혼돈\s*([\d,]+)/);
        if (orderM) console.log('  질서: ' + orderM[1]);
        if (chaosM) console.log('  혼돈: ' + chaosM[1]);

        // 코어 활성 효과
        if (coreEffects.length > 0) {
          console.log('  코어 효과: ' + coreEffects.join(', '));
        }

        // 더 상세한 정보를 위해 전체 출력 (처음 500자)
        console.log('  [raw]: ' + plain.substring(0, 400));
      } catch (e) {
        console.log('  tooltip parse error: ' + e.message);
      }
    }

    // 젬 정보
    if (gems.length > 0) {
      console.log('  젬 (' + gems.length + '개):');
      for (let j = 0; j < gems.length; j++) {
        const gem = gems[j];
        let gemInfo = '    [' + (j + 1) + '] ';
        if (gem.Tooltip) {
          try {
            const gt = JSON.parse(gem.Tooltip);
            const gplain = stripHtml(JSON.stringify(gt));

            // 젬 이름
            const gnameM = gplain.match(/([가-힣]+의\s*[가-힣]+)/);
            // 질서/혼돈/의지력
            const gorderM = gplain.match(/질서\s*([\d,]+)/);
            const gchaosM = gplain.match(/혼돈\s*([\d,]+)/);
            const gwillM = gplain.match(/의지력\s*([\d,]+)/);
            // 등급
            const ggradeM = gplain.match(/(일반|고급|희귀|영웅|전설|유물|고대)/);

            gemInfo += (gnameM ? gnameM[1] : '?');
            gemInfo += ' (' + (ggradeM ? ggradeM[1] : '?') + ')';
            if (gorderM) gemInfo += ' 질서:' + gorderM[1];
            if (gchaosM) gemInfo += ' 혼돈:' + gchaosM[1];
            if (gwillM) gemInfo += ' 의지력:' + gwillM[1];
          } catch { gemInfo += 'parse error'; }
        }
        console.log(gemInfo);
      }
    }
  }

  // 전체 효과 합계
  console.log('\n  === 그리드 효과 합계 ===');
  const effects = grid.Effects || [];
  let totalPercent = 0;
  for (const e of effects) {
    const tooltip = stripHtml(e.Tooltip || '');
    const pctM = tooltip.match(/([\d.]+)%/);
    const pct = pctM ? parseFloat(pctM[1]) : 0;
    totalPercent += pct;
    console.log('  ' + (e.Name || '?') + ' Lv.' + (e.Level || 0) + ': ' + tooltip + ' (' + pct + '%)');
  }
  console.log('  --- 전체 합계: +' + totalPercent.toFixed(2) + '% ---');
}

analyzeGrid('구아바밤바아', a.arkgrid);
analyzeGrid('처어단자아', b.arkgrid);

// 추가: 슬롯 구조 확인 (첫 번째 슬롯만 전체 JSON)
console.log('\n\n=== 구아바밤바아 첫번째 슬롯 전체 구조 ===');
const firstSlot = a.arkgrid?.Slots?.[0];
if (firstSlot) {
  // Tooltip은 너무 길어서 키만 표시
  const keys = Object.keys(firstSlot);
  console.log('슬롯 키: ' + JSON.stringify(keys));

  // Gems 구조
  if (firstSlot.Gems && firstSlot.Gems[0]) {
    console.log('첫번째 젬 키: ' + JSON.stringify(Object.keys(firstSlot.Gems[0])));
  }

  // Effects 구조
  if (firstSlot.Effects && firstSlot.Effects[0]) {
    console.log('첫번째 효과 키: ' + JSON.stringify(Object.keys(firstSlot.Effects[0])));
    console.log('첫번째 효과: ' + JSON.stringify(firstSlot.Effects[0]));
  }
}
