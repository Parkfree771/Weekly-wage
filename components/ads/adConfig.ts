// 광고 설정 한 곳 모음.

// 미리보기 모드.
// true  = 실제 광고 대신 "여기에 광고 들어감" placeholder(자리/크기)만 표시. 배치 확인용.
// false = 실제 광고(<ins>) 동작. (단, 아래 슬롯/단위 ID가 채워진 자리에만 렌더됨)
//
// 애드핏은 승인 전에는 광고를 안 내려보내고 <ins> 가 display:none 으로 남으므로,
// 심사 중에 false 로 둬도 빈 박스가 생기지 않는다. 승인되는 즉시 자동으로 채워진다.
export const AD_PREVIEW = false;

// 애드센스 게시자 ID (app/layout.tsx 스크립트와 동일해야 함)
export const AD_CLIENT = 'ca-pub-6944494802169618';

// 모바일 뷰포트 초기 배율 — app/layout.tsx 의 viewport.initialScale 이 이 값을 쓴다.
// 페이지를 축소 렌더하므로 광고를 그대로 두면 320×100 이 256×80 으로 나가 규격 미달이 된다.
// (2026-07-28 애드핏 매체 심사 보류 사유) 광고 컨테이너에 역배율을 걸어 실제 화면 px 를 복원한다.
// 데스크톱이 body zoom 0.85 에 AD_ZOOM_COMPENSATE 를 거는 것과 같은 방식.
export const MOBILE_VIEWPORT_SCALE = 0.8;
export const MOBILE_AD_ZOOM_COMPENSATE = 1 / MOBILE_VIEWPORT_SCALE;

// 모바일 본문 인-콘텐츠 광고(AdBanner) 사용 여부.
// 모바일은 하단 앵커를 없애고 앱(AdMob BannerAdBar)과 같은 위치의 인-콘텐츠만 사용.
export const MOBILE_INCONTENT = true;

// 광고 단위 슬롯 ID (애드센스 > 광고 > 광고 단위에서 발급).
// 빈 문자열이면 실제 모드에서 그 자리는 렌더 안 함 → 깨진/빈 <ins> 방지.
export const AD_SLOTS = {
  mobileInContent: '8616653628', // 기존 슬롯 (모바일 인-콘텐츠)
  sidebar: '',                   // TODO: 디스플레이 세로 광고 단위 발급 후 입력
};

// ── 카카오 애드핏 ──
// 애드센스 승인이 반복 반려돼(2026-07-28 "가치가 별로 없는 콘텐츠") 애드핏을 먼저 붙인다.
// 애드센스 코드는 남겨둔다 — 나중에 색인·트래픽이 쌓인 뒤 재신청할 때 그대로 쓴다.
//
// true  = 애드핏 광고를 내보낸다 (애드핏 승인 후 켤 것)
// false = 애드핏 자리를 렌더하지 않는다
export const ADFIT_ENABLED = true;

// 애드핏 광고단위 ID (애드핏 > 광고단위에서 발급). 규격이 고정이라 크기도 같이 둔다.
// 빈 unit 은 렌더하지 않는다.
//
// 자리마다 단위를 따로 둔다. 규격이 같아도 합치면 (1) 같은 ID 가 한 페이지에 두 번
// 들어가고(애드핏은 1페이지 1단위가 원칙) (2) 리포트가 합산돼 어느 자리가 수익이
// 나는지 구분할 수 없다.
export const ADFIT_UNITS = {
  mobileInContent: { unit: 'DAN-bo9jwUZBhdAH4HWn', width: 320, height: 100 }, // 모바일 본문
  mobileDrawer: { unit: 'DAN-5AUDzC6VzTXU6X8H', width: 320, height: 100 },    // 모바일 햄버거 드로어
  sidebarLeft: { unit: 'DAN-LhB3sf1lcaZ0pCFD', width: 160, height: 600 },     // PC 레일 좌
  sidebarRight: { unit: 'DAN-cf5UrXPfQYUZYdhv', width: 160, height: 600 },    // PC 레일 우
};
