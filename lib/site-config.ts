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
  'https://loalogol.kr';

/** 도메인 마이그레이션 안내용 — 구도메인. 마이그레이션 끝나면 제거 가능. */
export const LEGACY_SITE_HOST = 'lostarkweeklygold.kr';
export const LEGACY_SITE_URL = `https://${LEGACY_SITE_HOST}`;

/** 새 도메인 (마이그레이션 후 NEXT_PUBLIC_SITE_URL 과 동일해질 값). */
export const NEW_SITE_HOST = 'loalogol.kr';
export const NEW_SITE_URL = `https://${NEW_SITE_HOST}`;

/**
 * 검색 색인에서 임시로 빼는 경로.
 *
 * - `/extreme` : 2026-09-23 출시 전까지 본문이 "COMING SOON" 뿐이다.
 *                애드센스가 "가치 없는 콘텐츠"로 잡는 대표적인 형태라 출시 전까지 뺀다.
 * - `/mypage`  : 로그인해야 자기 데이터가 보이는 개인화 페이지.
 *                봇에게는 데모 캐릭터만 렌더돼 "남의 대시보드"처럼 보인다.
 *
 * sitemap 과 각 페이지 metadata 가 전부 이 배열 하나를 본다 —
 * 되돌릴 때 여기서 경로만 빼면 두 신호가 어긋나지 않고 한 번에 원복된다.
 */
export const NOINDEX_PATHS: readonly string[] = ['/extreme', '/mypage'];

export const isNoindexed = (path: string): boolean => NOINDEX_PATHS.includes(path);

/**
 * 네비게이션에서 감출 경로. 색인 제외와는 별개다 —
 * noindex 는 크롤러만 막고, 이건 사람(애드센스 심사자)의 동선까지 끊는다.
 * `/mypage` 는 실제로 쓰는 기능이라 감추지 않는다 (noindex 로 충분).
 */
export const NAV_HIDDEN_PATHS: readonly string[] = ['/extreme'];

/**
 * 유저가 올린 패키지 글(/package/[postId])을 검색 색인에 넣을지.
 *
 * 지금은 `false` 다. 상세 페이지가 서버 렌더되긴 하지만 본문이 제목·가격·구성품 이름뿐이라
 * 실측 90~726자에 산문이 0자이고, 시세를 클라이언트에서 받아오는 구조라
 * 봇이 받는 HTML 에는 골드값이 전부 `0G` 로 남는다. 같은 템플릿의 얇은 페이지가 수십 개
 * 색인되면 사이트 전체가 "가치 없는 콘텐츠"로 평가되기 쉽다.
 *
 * 켜려면 먼저 두 가지가 필요하다:
 *   1) 시세·계산 결과를 서버에서 렌더 (0G 대신 실제 골드가 HTML 에 들어가야 한다)
 *   2) 글마다 고유한 설명 문단 (템플릿 표만으로는 서로 구별되지 않는다)
 *
 * 상시 판매인 아제나의 축복(/package/azena-blessing)은 코드로 짠 별도 페이지라
 * 이 플래그와 무관하게 항상 색인 대상이다.
 */
export const INDEX_USER_PACKAGE_POSTS = false;
