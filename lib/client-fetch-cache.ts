// 클라이언트 GET 응답 메모리 캐시 (모듈 스코프 — SPA 라우팅 간 유지, 새로고침 시 소멸)
// 같은 필터로 되돌아오는 왕복 조작에서 API 재호출을 없앤다.
// CDN(s-maxage=300)과 같은 5분 TTL이라 서버보다 오래 묵은 데이터를 보여주지 않는다.

const cache = new Map<string, { data: any; ts: number }>();
const inflight = new Map<string, Promise<any>>();
// 무효화 세대. 무효화 이전에 출발한 요청이 무효화 이후에 도착해
// 낡은 응답을 캐시에 되쓰는 것을 막는다.
let generation = 0;

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 80;

export async function cachedGetJson(url: string, ttlMs: number = DEFAULT_TTL_MS): Promise<any> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;

  const pending = inflight.get(url);
  if (pending) return pending;

  const startedGen = generation;
  const p = fetch(url)
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (startedGen === generation) {
        cache.set(url, { data, ts: Date.now() });
        if (cache.size > MAX_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      }
      return data;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, p);
  return p;
}

/** 특정 URL 접두사의 캐시 무효화 — 데이터 변경(캐릭터 갱신 등) 직후 호출 */
export function invalidateCachedGet(urlPrefix: string): void {
  generation++;
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
  inflight.clear();
}
