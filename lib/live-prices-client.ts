// 현재가(거래소 최저 매물가, /api/market/live-prices) 클라이언트 캐시 — 갤러리·상세가 공유한다.
// 모듈 스코프라 페이지를 오가도 유지된다: 갤러리에서 현재가를 켠 채 상세로 들어가면
// getActiveLivePrices() 로 그대로 켜진 상태가 복원된다. 끄고 켜기는 캐시 안에서만 오간다.
// 서버가 durable 캐시(600초)로 전 유저 공유라, 여기 쿨다운은 "무의미한 재요청"만 막는다.
//
// 서버 함수 1회 = 로아 API 최대 42회다. 그래서 여기서 막는 것:
//   · 쿨다운 안에는 요청하지 않는다 (서버 캐시가 신선한 동안 받아 봐야 같은 값)
//   · 이미 나가 있는 요청이 있으면 그 결과를 같이 기다린다 (연타·화면 왕복 중복 차단)
//   · 실패하면 60초 동안 다시 요청하지 않는다 (장애 중 클릭이 곧바로 함수 호출이 되지 않게)
//   · 수요일 점검(06:00~10:00 KST)엔 요청을 보내지 않는다 — 서버도 막지만 CDN 까지도 안 간다
import { isLostArkMaintenance } from '@/lib/lostark-maintenance';

// 라우트의 CDN s-maxage 와 같은 값이어야 한다 — 쿨다운이 더 짧으면
// 아직 신선한 캐시를 다시 받아 "눌렀는데 아무 변화 없음" 으로 보인다.
const LIVE_COOLDOWN_MS = 600_000;
// 실패 뒤 재시도 금지 시간 — 서버의 실패 응답 캐시(60초)와 같다
const LIVE_FAIL_BACKOFF_MS = 60_000;

export const LIVE_MAINTENANCE_MSG = '로아 서버 점검 중(수요일 06:00~10:00)이라 현재가를 가져올 수 없습니다. 평균가로 계산합니다.';
export const LIVE_FAIL_MSG = '거래소 현재가를 가져오지 못했습니다. 잠시 뒤 다시 시도해주세요.';

/** 사용자에게 보여줄 실패 이유 — 점검이면 점검, 그 외는 한 문장 */
export class LivePriceError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
  }
}
export function liveErrorMessage(err: unknown): string {
  return err instanceof LivePriceError ? err.userMessage : LIVE_FAIL_MSG;
}

let cachedLivePrices: Record<string, number> | null = null;
// 이 시각까지는 캐시가 신선하다 — "받은 순간 + 서버 캐시의 남은 수명" 으로 잰다.
// 서버 fetchedAt 을 그대로 폰·PC 시계와 비교하면 시계가 어긋난 기기에서 쿨다운이 통째로 사라진다.
let cachedFreshUntil = 0;
let lastFailAt = 0;
let inFlight: Promise<Record<string, number> | null> | null = null;
// 현재가 켜짐 여부 — 캐시가 있다고 켜진 게 아니다. 끄면(평균가로 돌아가면) 캐시는 남겨 두고 이 값만 내린다.
// 그래서 다시 켤 때 쿨다운 안이면 조회 없이 캐시로 바로 돌아온다. 갤러리 ↔ 상세 왕복에도 이 값을 따른다.
let liveOn = false;

/** 현재가가 켜져 있으면 그 캐시, 꺼져 있으면 null — 화면 첫 상태 복원용 */
export function getActiveLivePrices(): Record<string, number> | null {
  return liveOn ? cachedLivePrices : null;
}

export function setLiveOn(on: boolean): void {
  liveOn = on;
}

/**
 * 현재가 조회 — 쿨다운 안이면 조회 없이 캐시를 그대로 돌려준다.
 * 실패(장애·점검)면 LivePriceError 를 던진다 — 호출부는 userMessage 를 화면에 띄운다.
 */
export async function fetchLivePrices(): Promise<Record<string, number> | null> {
  const now = Date.now();
  if (cachedLivePrices && now < cachedFreshUntil) return cachedLivePrices;
  // 점검 시간엔 요청하지 않는다 (서버도 같은 판정으로 막지만, 여기서 끊으면 CDN 요청도 0)
  if (isLostArkMaintenance()) throw new LivePriceError(LIVE_MAINTENANCE_MSG);
  if (now - lastFailAt < LIVE_FAIL_BACKOFF_MS) {
    // 실패 직후엔 방금 만료된 캐시(신선 기한 + 60초 안)까지만 대신 쓴다 — 30분 전 값을 "현재가" 로 켜지 않게
    if (cachedLivePrices && now < cachedFreshUntil + LIVE_FAIL_BACKOFF_MS) return cachedLivePrices;
    throw new LivePriceError(LIVE_FAIL_MSG);
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/market/live-prices');
      if (!res.ok) throw new LivePriceError(LIVE_FAIL_MSG);
      const data = await res.json();
      if (data?.prices && Object.keys(data.prices).length > 0) {
        cachedLivePrices = data.prices;
        // 서버 캐시의 남은 수명만큼만 신선하다 — CDN 캐시를 받은 경우 그 나이를 뺀다.
        // 나이를 0~600초로 묶어 시계 오차가 쿨다운을 없애거나 늘리지 못하게 한다.
        const age = Math.min(LIVE_COOLDOWN_MS, Math.max(0, Date.now() - (Date.parse(data.fetchedAt) || Date.now())));
        cachedFreshUntil = Date.now() + Math.max(30_000, LIVE_COOLDOWN_MS - age);
        return cachedLivePrices;
      }
      // 서버가 "가져온 게 없다" 로 응답(점검·로아 API 장애) — 60초 캐시된 응답이라 재클릭은 CDN 에서 끝난다
      throw new LivePriceError(data?.maintenance ? LIVE_MAINTENANCE_MSG : LIVE_FAIL_MSG);
    } catch (err) {
      lastFailAt = Date.now();
      throw err instanceof LivePriceError ? err : new LivePriceError(LIVE_FAIL_MSG);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
