// 차트 Y축 칸 폭 — 가장 긴 눈금 글자가 잘리지 않을 만큼만 잡는다(그만큼 그림 영역이 줄어든다).
//
// recharts 왼쪽 Y축은 눈금 글자를 칸 오른쪽 끝에서 tickSize(6)+tickMargin(2)=8px 안쪽에 오른쪽 정렬로 찍는다
// (tickLine 을 꺼도 같다). 그래서 칸 폭 = 글자 폭 + 8 + (커스텀 tick 의 dx 만큼) + 왼쪽 여유.
// 이걸 빼먹고 글자 폭 + 10 으로 잡았다가 긴 숫자가 왼쪽에서 잘렸다(2026-10-30 모바일 차트).
//
// 글자 폭은 캔버스 measureText 로 실제 서체(Outfit 숫자 · Noto Sans KR 한글)를 잰다.
// 서체가 아직 안 내려왔거나 캔버스가 없을 때(서버)를 대비해 글자 종류별 어림값과 비교해 큰 쪽을 쓴다.

const RECHARTS_TICK_OFFSET = 8;
const SAFETY = 4;

let ctx: CanvasRenderingContext2D | null | undefined;

function estimate(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    if (/[가-힣]/.test(ch)) w += fontSize;
    else if (/[,.]/.test(ch)) w += fontSize * 0.32;
    else w += fontSize * 0.64;
  }
  return w;
}

function measure(text: string, fontSize: number, fontWeight: number): number {
  if (ctx === undefined) {
    ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  }
  const guess = estimate(text, fontSize);
  if (!ctx) return guess;
  const css = getComputedStyle(document.body);
  const num = css.getPropertyValue('--font-num').trim();
  const kr = css.getPropertyValue('--font-kr').trim();
  ctx.font = `${fontWeight} ${fontSize}px ${[num, kr, 'sans-serif'].filter(Boolean).join(', ')}`;
  return Math.max(ctx.measureText(text).width, guess);
}

/** 눈금 글자들이 다 들어가는 Y축 칸 폭(px). dx 는 커스텀 tick 이 글자를 더 왼쪽으로 민 만큼(양수). */
export function yAxisWidth(labels: string[], fontSize: number, { fontWeight = 600, dx = 0, min = 24 } = {}): number {
  const widest = labels.reduce((m, t) => Math.max(m, measure(t, fontSize, fontWeight)), 0);
  return Math.max(min, Math.ceil(widest + RECHARTS_TICK_OFFSET + dx + SAFETY));
}
