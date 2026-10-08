// 시세 아카이브(public/data/history_archive.json) 파일 형식.
//
// v2(압축형): { v: 2, items: { [itemId]: { s: 시작일 'YYYY-MM-DD', p: [하루 한 칸 가격 | null] } } }
//   — 날짜는 시작일부터 하루씩 늘어나는 칸 번호로만 둔다. 예전 형식은 줄마다
//     {"date":"2025-10-12","price":…} 를 반복해서 716KB였는데 v2 는 159KB 다(파싱 부담 1/4.5).
//   — 빈 날짜는 null.
// v1(옛 형식): { [itemId]: [{ date, price }] } — 배포 직후 옛 파일을 받는 경우를 위해 계속 읽는다.
//
// 쓰는 쪽: scripts/rollover-price-history.mjs (같은 규칙을 그 안에 따로 구현).
// 앱(loalogol-app src/data/priceArchiveFormat.ts)도 같은 파일을 번들하므로 같이 고쳐야 한다.

export type HistoryData = Record<string, Array<{ date: string; price: number }>>;

type ArchiveV2 = { v: 2; items: Record<string, { s: string; p: Array<number | null> }> };

const DAY_MS = 86_400_000;

export function decodeArchive(data: unknown): HistoryData {
  if (!data || typeof data !== 'object') return {};
  const v2 = data as Partial<ArchiveV2>;
  if (v2.v !== 2 || !v2.items) return data as HistoryData;

  const out: HistoryData = {};
  for (const [id, { s, p }] of Object.entries(v2.items)) {
    const t0 = Date.parse(`${s}T00:00:00Z`);
    const arr: Array<{ date: string; price: number }> = [];
    for (let i = 0; i < p.length; i++) {
      const price = p[i];
      if (price === null || price === undefined) continue;
      arr.push({ date: new Date(t0 + i * DAY_MS).toISOString().slice(0, 10), price });
    }
    out[id] = arr;
  }
  return out;
}
