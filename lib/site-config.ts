/**
 * 사이트 도메인 단일 source.
 *
 * 도메인 변경 시 Netlify 환경변수 NEXT_PUBLIC_SITE_URL 만 갱신하면
 * sitemap / robots / metadata / JSON-LD / OG / canonical 전부 자동 반영됨.
 *
 * 기본값은 현재 운영 도메인. 개발/프리뷰에서도 정상 동작.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://lostarkweeklygold.kr';

/** 도메인 마이그레이션 안내용 — 구도메인. 마이그레이션 끝나면 제거 가능. */
export const LEGACY_SITE_HOST = 'lostarkweeklygold.kr';
export const LEGACY_SITE_URL = `https://${LEGACY_SITE_HOST}`;

/** 새 도메인 (마이그레이션 후 NEXT_PUBLIC_SITE_URL 과 동일해질 값). */
export const NEW_SITE_HOST = 'loalogol.kr';
export const NEW_SITE_URL = `https://${NEW_SITE_HOST}`;
