import { formatWon } from '@/lib/gold-value';

// 원화 금액 표시 — 숫자 서체(.font-numeric·차트 mono)에는 한글 글리프가 없어서
// "원" 이 시스템 고정폭 한글 서체로 떨어져 혼자 튀었다. 단위만 본문 한글 서체로 그린다.
export default function WonPrice({ value }: { value: number }) {
  const text = formatWon(value);
  return (
    <>
      {text.slice(0, -1)}
      <span style={{ fontFamily: "var(--font-mono), 'Noto Sans KR', system-ui, sans-serif", marginLeft: '1px' }}>원</span>
    </>
  );
}
