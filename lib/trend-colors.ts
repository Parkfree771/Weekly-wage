// 시세 등락 색 — 상승 초록 / 하락 빨강.
//
// 보통은 CSS 변수 var(--price-up) · var(--price-down) 를 쓴다(globals.css).
// 다만 SVG 프레젠테이션 속성(fill·stroke)에는 var() 치환이 먹지 않아서,
// recharts 커스텀 렌더처럼 속성으로 색을 넘겨야 하는 곳만 이 리터럴을 쓴다.
// globals.css 의 --color-success / --color-danger 와 값이 같아야 한다.
export const TREND_UP = { light: '#16a34a', dark: '#4ade80' };
export const TREND_DOWN = { light: '#ef4444', dark: '#f87171' };

export const trendColor = (up: boolean, dark: boolean) =>
  up ? (dark ? TREND_UP.dark : TREND_UP.light) : (dark ? TREND_DOWN.dark : TREND_DOWN.light);
