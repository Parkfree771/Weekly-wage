// 실시간 최저가(/api/market/live-prices) 클라이언트 캐시 — 갤러리·상세가 공유한다.
// 모듈 스코프라 페이지를 오가도 유지된다: 갤러리에서 최저가를 켠 채 상세로 들어가면
// getCachedLivePrices() 로 그대로 켜진 상태가 복원된다.
// 서버가 durable 캐시(300초)로 전 유저 공유라, 여기 쿨다운은 "무의미한 재요청"만 막는다.

// 라우트의 CDN s-maxage 와 같은 값이어야 한다 — 쿨다운이 더 짧으면
// 아직 신선한 캐시를 다시 받아 "눌렀는데 아무 변화 없음" 으로 보인다.
const LIVE_COOLDOWN_MS = 300_000;

let cachedLivePrices: Record<string, number> | null = null;
let cachedLiveAt = 0; // ms — 서버 수집 시각(fetchedAt) 기준

/** 마지막으로 받아 둔 최저가 — 아직 한 번도 안 받았으면 null. 켜짐 상태 복원용 */
export function getCachedLivePrices(): Record<string, number> | null {
  return cachedLivePrices;
}

/** 최저가 조회 — 쿨다운 안이면 조회 없이 캐시를 그대로 돌려준다 */
export async function fetchLivePrices(): Promise<Record<string, number> | null> {
  if (cachedLivePrices && Date.now() - cachedLiveAt < LIVE_COOLDOWN_MS) {
    return cachedLivePrices;
  }
  const res = await fetch('/api/market/live-prices');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data?.prices && Object.keys(data.prices).length > 0) {
    cachedLivePrices = data.prices;
    // 쿨다운은 서버 수집 시각 기준 — CDN 캐시를 받은 경우 남은 TTL 만큼만 기다리게 된다
    cachedLiveAt = Date.parse(data.fetchedAt) || Date.now();
  }
  return cachedLivePrices;
}
