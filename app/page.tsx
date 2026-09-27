import HomeClient from './HomeClient';
import PriceHistoryAnalysis from '@/components/home/PriceHistoryAnalysis';

/**
 * 홈 — 서버 컴포넌트 껍데기.
 * 화면 전체는 HomeClient 가 그리고, 맨 아래 과거 시세 분석만 서버에서 계산해 끼워 넣는다.
 * 위쪽 시세 카드·차트는 ssr:false 라 JS 를 실행하지 않는 크롤러에는 비어 보이므로,
 * 이 섹션이 홈의 시세 정보를 HTML 에 직접 담는 역할을 한다.
 */
export default function Home() {
  return <HomeClient historySection={<PriceHistoryAnalysis />} />;
}
