// 티어 통계 CDN 캐시(태그: tier-stats)만 퍼지. best-effort.
// 동적 import + try/catch 로 감싸 로컬/비-Netlify 환경에서 모듈 로딩이나
// 실행이 실패해도 호출부(투표 저장)에 영향을 주지 않게 한다.
export async function purgeTierStatsCdn(): Promise<void> {
  try {
    const { purgeCache } = await import('@netlify/functions');
    await purgeCache({ tags: ['tier-stats'] });
  } catch {
    /* 로컬/비-Netlify: 무시 — DB 스냅샷 캐시는 이미 무효화됨 */
  }
}

// 뉴비 추천 랭킹 CDN 캐시(태그: newbie-rec)만 퍼지. best-effort.
export async function purgeNewbieRecCdn(): Promise<void> {
  try {
    const { purgeCache } = await import('@netlify/functions');
    await purgeCache({ tags: ['newbie-rec'] });
  } catch {
    /* 로컬/비-Netlify: 무시 */
  }
}

// 캐릭터별 CDN 캐시 태그. 한글 캐릭터명은 태그로 못 쓰므로 base64url 인코딩.
// 캐시 응답과 퍼지가 같은 태그를 계산하도록 반드시 이 함수만 사용할 것.
export function characterCdnTag(characterName: string): string {
  return `char-${Buffer.from(characterName.trim()).toString('base64url')}`;
}

// 특정 캐릭터의 상세 API CDN 캐시 퍼지 (refresh=1 시 호출). best-effort.
export async function purgeCharacterCdn(characterName: string): Promise<void> {
  try {
    const { purgeCache } = await import('@netlify/functions');
    await purgeCache({ tags: [characterCdnTag(characterName)] });
  } catch {
    /* 로컬/비-Netlify: 무시 */
  }
}
