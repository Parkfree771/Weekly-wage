import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.trimStart().startsWith('#')) continue;
  process.env[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim();
}

const API_KEY = process.env.LOSTARK_API_KEY!;

const bracelets = [
  { name: '특화/치명', stat1: 16, stat2: 15 },
  { name: '치명/신속', stat1: 15, stat2: 18 },
  { name: '특화/신속', stat1: 16, stat2: 18 },
];

async function main() {
  for (const b of bracelets) {
    const body = {
      ItemName: '', CategoryCode: 200040, PageNo: 0,
      SortCondition: 'ASC', Sort: 'BUY_PRICE',
      ItemGrade: '고대', ItemTier: 4,
      EtcOptions: [
        { FirstOption: 2, SecondOption: b.stat1, MinValue: 100, MaxValue: null },
        { FirstOption: 2, SecondOption: b.stat2, MinValue: 100, MaxValue: null },
        { FirstOption: 4, SecondOption: 2, MinValue: 3, MaxValue: 3 },
      ]
    };
    const r = await fetch('https://developer-lostark.game.onstove.com/auctions/items', {
      method: 'POST',
      headers: { accept: 'application/json', authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    const items = d?.Items || [];
    const lowest = items[0]?.AuctionInfo?.BuyPrice || 0;
    console.log(`팔찌 ${b.name}: ${items.length}개 결과, 최저가 ${lowest.toLocaleString()}G`);
  }
}
main().catch(console.error);
