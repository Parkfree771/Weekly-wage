import HomeClient from './HomeClient';
import { loadHomePriceSnapshot } from '@/lib/home-price-snapshot';
import { TRACKED_ITEMS } from '@/lib/items-to-track';
import { loadOnSalePackages } from '@/lib/home-packages';

// ISR: 추적 종목 전체의 현재가·등락을 서버에서 계산해 HTML 에 싣는다 — 아이템 버튼과 시세 히트맵이 쓴다.
// 시세는 크론이 시간당 한 번 올리므로 시간으로 재생성하지 않고, 크론(collect-prices 의 :20 회차·heal)이
// 업로드 직후 revalidatePath('/') 로 다시 만들게 한다. 3600 은 크론이 멈췄을 때의 백스톱이다.
// (300초였을 땐 시세가 그대로인데도 5분마다 재생성돼 함수 호출만 늘었다 — 2026-10-10)
export const revalidate = 3600;

export default async function Home() {
  // 맨 위 띠의 판매 중 패키지 — 최근 글 10건만 읽는다(재생성 1회당 10건, 방문자 수와 무관)
  const [snapshot, packages] = await Promise.all([
    loadHomePriceSnapshot(TRACKED_ITEMS.map((i) => i.id)),
    loadOnSalePackages(),
  ]);
  return <HomeClient initialQuotes={snapshot?.prices} asOf={snapshot?.dateLabel} packages={packages} />;
}
