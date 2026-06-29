// 광고 설정 한 곳 모음.

// 미리보기 모드.
// true  = 실제 광고 대신 "여기에 광고 들어감" placeholder(자리/크기)만 표시.
// false = 실제 광고(<ins>) 동작. (단, 아래 슬롯 ID가 채워진 자리에만 렌더됨)
// 실제 전환 절차는 components/ads/README 주석 참고.
export const AD_PREVIEW = false;

// 애드센스 게시자 ID (app/layout.tsx 스크립트와 동일해야 함)
export const AD_CLIENT = 'ca-pub-6944494802169618';

// 모바일 본문 인-콘텐츠 광고(AdBanner) 사용 여부.
// false면 모바일은 하단 앵커만 노출. 되살리려면 true.
export const MOBILE_INCONTENT = false;

// 광고 단위 슬롯 ID (애드센스 > 광고 > 광고 단위에서 발급).
// 빈 문자열이면 실제 모드에서 그 자리는 렌더 안 함 → 깨진/빈 <ins> 방지.
export const AD_SLOTS = {
  mobileInContent: '8616653628', // 기존 슬롯 (모바일 인-콘텐츠)
  topBanner: '',                 // TODO: 디스플레이 가로 광고 단위 발급 후 입력
  sidebar: '',                   // TODO: 디스플레이 세로 광고 단위 발급 후 입력
};
