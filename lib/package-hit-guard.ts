// 패키지 게시판 집계 API(조회수·반응) 공통 입력 검증.
// 두 라우트가 같은 기준으로 봇을 거르고 같은 ID 형식만 받도록 한 곳에 둔다.

// Firestore 자동 생성 ID(영숫자 20자)만 허용. 입력 검증 겸 쿠키 값 오염 방지.
// 쿠키 구분자('.' ':')가 ID 에 못 들어오는 것도 이 정규식이 보장한다.
export const POST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// 크롤러/링크 프리뷰 봇은 쿠키를 유지하지 않아 쿠키 검사로 걸러지지 않는다.
// 주의: 'kakaotalk', 'naver' 같은 문자열은 인앱 브라우저(실제 사용자) UA에도 들어간다.
// 크롤러만 정확히 지목할 것 — 네이버는 Yeti, 다음은 Daumoa, 카카오 프리뷰는 kakaotalk-scrap.
const BOT_RE = new RegExp(
  [
    'bot', 'crawler', 'spider', 'slurp', // 일반
    'mediapartners-google', 'googleother', // 애드센스/구글 크롤러
    'yeti', 'daumoa', 'baiduspider', 'yandex', 'applebot', 'duckduckbot', // 검색엔진
    'facebookexternalhit', 'kakaotalk-scrap', 'skypeuripreview', 'embedly', 'whatsapp', // 링크 프리뷰
    'headless', 'curl', 'wget', 'python-requests', 'node-fetch', 'go-http-client', // 스크립트
  ].join('|'),
  'i',
);

/** 봇이거나 User-Agent 가 없는 요청 — 집계하지 않는다 (쓰기도 하지 않음) */
export function isBotRequest(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}
