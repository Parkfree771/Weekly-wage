import HomeClient from './HomeClient';
import { loadHomePriceSnapshot } from '@/lib/home-price-snapshot';
import { DASHBOARD_DEFAULT_ITEM_IDS } from '@/data/priceItems';

// ISR: "오늘의 시세" 기본 목록을 서버에서 계산해 HTML 에 싣는다.
// 시세는 크론이 시간당 한 번 올리므로 시간으로 재생성하지 않고, 크론(collect-prices 의 :20 회차·heal)이
// 업로드 직후 revalidatePath('/') 로 다시 만들게 한다. 3600 은 크론이 멈췄을 때의 백스톱이다.
// (300초였을 땐 시세가 그대로인데도 5분마다 재생성돼 함수 호출만 늘었다 — 2026-10-10)
export const revalidate = 3600;

export default async function Home() {
  const snapshot = await loadHomePriceSnapshot(DASHBOARD_DEFAULT_ITEM_IDS);
  return <HomeClient initialPrices={snapshot?.prices} initialDate={snapshot?.dateLabel} />;
}
