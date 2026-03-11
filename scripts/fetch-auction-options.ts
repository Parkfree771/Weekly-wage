import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.trimStart().startsWith('#')) continue;
  process.env[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim();
}

async function main() {
  const r = await fetch('https://developer-lostark.game.onstove.com/auctions/options', {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${process.env.LOSTARK_API_KEY}`
    }
  });
  console.log('Status:', r.status);
  const d = await r.json();

  // EtcOption 중 팔찌/부여효과 관련 찾기
  if (d.EtcOptions) {
    for (const opt of d.EtcOptions) {
      // 모든 FirstOption 출력
      console.log(`\n=== FirstOption ${opt.Value}: ${opt.Text} ===`);
      if (opt.EtcSubs) {
        for (const sub of opt.EtcSubs) {
          console.log(`  SecondOption ${sub.Value}: ${sub.Text}`);
        }
      }
    }
  }

  // 카테고리도 출력
  if (d.Categories) {
    console.log('\n=== Categories ===');
    for (const cat of d.Categories) {
      if (cat.Subs) {
        for (const sub of cat.Subs) {
          if (sub.Text?.includes('팔찌') || sub.Code === 200040) {
            console.log(`  ${sub.Code}: ${sub.Text}`);
          }
        }
      }
    }
  }
}

main().catch(console.error);
