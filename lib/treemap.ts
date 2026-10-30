// 스쿼리파이드 트리맵(Bruls·Huizing·van Wijk) — 값 비례 넓이로 사각형을 나누되 칸이 최대한 정사각형에 가깝게.
// 홈 시세 히트맵(MarketHeatmap)이 카테고리 → 종목 두 단계로 쓴다. 외부 라이브러리 없이 이 정도면 충분하다.

export type Rect = { x: number; y: number; w: number; h: number };

// 한 줄(row)에 놓았을 때 가장 길쭉한 칸의 가로세로비 — 작을수록 정사각형에 가깝다
function worst(areas: number[], side: number): number {
  const sum = areas.reduce((a, b) => a + b, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const s2 = side * side;
  return Math.max((s2 * max) / (sum * sum), (sum * sum) / (s2 * min));
}

/**
 * values 를 rect 안에 넓이 비례로 배치한다. 반환 순서는 values 순서와 같다.
 * values 는 큰 것부터 정렬해 넘겨야 결과가 고르다(호출부 책임).
 */
export function squarify(values: number[], rect: Rect): Rect[] {
  const n = values.length;
  const out: Rect[] = new Array(n);
  const total = values.reduce((a, b) => a + b, 0);
  if (n === 0 || total <= 0 || rect.w <= 0 || rect.h <= 0) {
    for (let i = 0; i < n; i++) out[i] = { x: rect.x, y: rect.y, w: 0, h: 0 };
    return out;
  }
  const scale = (rect.w * rect.h) / total;
  const areas = values.map((v) => v * scale);

  let r = { ...rect };
  let i = 0;
  while (i < n) {
    const side = Math.min(r.w, r.h);
    let row = [areas[i]];
    let best = worst(row, side);
    while (i + row.length < n) {
      const next = [...row, areas[i + row.length]];
      const score = worst(next, side);
      if (score > best) break;
      row = next;
      best = score;
    }
    const rowArea = row.reduce((a, b) => a + b, 0);
    if (r.w >= r.h) {
      // 왼쪽에 세로 한 줄
      const cw = rowArea / r.h;
      let y = r.y;
      row.forEach((a, k) => { const h = a / cw; out[i + k] = { x: r.x, y, w: cw, h }; y += h; });
      r = { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h };
    } else {
      // 위에 가로 한 줄
      const rh = rowArea / r.w;
      let x = r.x;
      row.forEach((a, k) => { const w = a / rh; out[i + k] = { x, y: r.y, w, h: rh }; x += w; });
      r = { x: r.x, y: r.y + rh, w: r.w, h: r.h - rh };
    }
    i += row.length;
  }
  return out;
}
