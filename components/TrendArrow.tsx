// 시세 등락 화살표.
//
// 색을 currentColor 로 두어 부모의 color(--price-up / --price-down)를 그대로 따른다.
// 예전에는 /up.png(빨강 상승) · /down.png(파랑 하락) 을 썼는데 색이 그림에 구워져 있어
// "상승 초록 / 하락 빨강" 으로 규칙을 바꿔도 화살표만 옛 색으로 남았다.
export default function TrendArrow({ up, size = 16 }: { up: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {up ? (
        <>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </>
      ) : (
        <>
          <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
          <polyline points="16 17 22 17 22 11" />
        </>
      )}
    </svg>
  );
}
