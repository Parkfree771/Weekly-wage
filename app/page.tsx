import HomeClient from './HomeClient';
import { loadHomePriceSnapshot } from '@/lib/home-price-snapshot';
import { DASHBOARD_DEFAULT_ITEM_IDS } from '@/data/priceItems';

// ISR: "오늘의 시세" 기본 목록을 서버에서 계산해 HTML 에 싣는다 (사이트 표준 300초).
// 시세 파일 읽기는 방문자당이 아니라 재생성 때만 돈다.
export const revalidate = 300;

export default async function Home() {
  const snapshot = await loadHomePriceSnapshot(DASHBOARD_DEFAULT_ITEM_IDS);
  return <HomeClient initialPrices={snapshot?.prices} initialDate={snapshot?.dateLabel} />;
}
