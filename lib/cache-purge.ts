// 가격 데이터 CDN 캐시 퍼지 (Netlify 함수 런타임 전용)
// - 데이터가 "들어오는 순간" 해당 태그를 퍼지 → 다음 요청만 오리진을 타고 이후엔 CDN 히트.
// - @netlify/functions 의 purgeCache 는 함수 런타임에서 토큰 없이 동작.
// - 로컬/비-Netlify 환경에서는 조용히 무시 (응답 헤더의 TTL 백스톱이 신선도를 보장).

import { purgeCache } from '@netlify/functions';

// 가격 데이터 응답에 붙이는 캐시 태그 (price-data 라우트의 Netlify-Cache-Tag 와 일치해야 함)
export const PRICE_CACHE_TAG = {
  latest: 'price-latest',
  history: 'price-history',
} as const;

/**
 * 주어진 태그들을 퍼지. 빈 배열이면 no-op. 실패해도 throw 하지 않음.
 */
export async function purgePriceCache(tags: string[]): Promise<void> {
  const uniq = Array.from(new Set(tags.filter(Boolean)));
  if (uniq.length === 0) return;
  try {
    await purgeCache({ tags: uniq });
    console.log(`[purgePriceCache] 퍼지 완료: ${uniq.join(', ')}`);
  } catch (e: any) {
    // 로컬 dev, 토큰 미설정 등 → TTL 백스톱이 있으므로 치명적이지 않음
    console.warn(`[purgePriceCache] 퍼지 건너뜀/실패: ${e?.message || e}`);
  }
}
