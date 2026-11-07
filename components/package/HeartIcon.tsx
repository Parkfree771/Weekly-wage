// 착장 좋아요 하트 — 이모지 대신 단색 SVG(매트). 색은 부모 color(currentColor)를 따른다.
// filled=false 면 테두리만(아직 안 누름), true 면 채움(누름).
export default function HeartIcon({ filled = true, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <path
        d="M12 20.3s-7.6-4.6-9.3-9.4C1.6 7.6 3.7 4.4 7 4.4c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.3 0 5.4 3.2 4.3 6.5-1.7 4.8-9.3 9.4-9.3 9.4Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
