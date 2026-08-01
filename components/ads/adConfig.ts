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
  // 모바일 본문 320×100. 현재 미사용 — 본문 광고는 320×50 띠배너로 바꿔
  // ADFIT_INCONTENT_UNITS 로 옮겼다. 규격을 되돌릴 때를 위해 ID 는 남겨둔다.
  mobileInContent: { unit: 'DAN-bo9jwUZBhdAH4HWn', width: 320, height: 100 },
  mobileDrawer: { unit: 'DAN-5AUDzC6VzTXU6X8H', width: 320, height: 100 },    // 모바일 햄버거 드로어
  sidebarLeft: { unit: 'DAN-LhB3sf1lcaZ0pCFD', width: 160, height: 600 },     // PC 레일 좌
  sidebarRight: { unit: 'DAN-cf5UrXPfQYUZYdhv', width: 160, height: 600 },    // PC 레일 우
};

// 한 페이지에 인-콘텐츠 광고가 여러 번 들어가는 자리(패키지 갤러리: 카드 2개마다 1개)용.
// 노출 순서대로 앞에서부터 하나씩 꺼내 쓴다.
//
// 반드시 자리마다 다른 단위여야 한다. 같은 단위 ID 를 한 페이지에 여러 번 넣으면 애드핏이
// 첫 자리만 채우고 나머지 <ins> 는 display:none 으로 남긴다 — "두어 개만 나오고 그 뒤로는
// 안 나온다" 는 증상이 정확히 이것이다.
//
// 배열 길이 = 그 페이지에서 실제로 나갈 수 있는 광고 개수다. 단위가 모자라면 남는 자리는
// 아예 렌더하지 않는다(빈 박스가 생기는 것보다 낫다).
//
// 목표 구성: 320×50 띠배너 3개 (카드 2개 → 광고 → 3개 → 광고 → 3개 → 광고).
// 지금은 1개라 첫 자리만 나가고, 2·3번 자리는 렌더 자체를 건너뛴다(빈 박스 없음).
//
// width/height 는 "콘솔에 등록된 규격"을 그대로 적는 것이지 여기서 정하는 값이 아니다.
// 단위를 추가하면 아래 주석을 풀고 ID 를 채우기만 하면 된다.
//
// MOBILE_AD_ZOOM_COMPENSATE 역보정은 그대로 둘 것. 모바일 뷰포트가 0.8 로 축소 렌더돼서
// 빼면 320×50 이 화면에서 256×40 으로 나간다
// (2026-07-28 애드핏 심사 보류 사유가 정확히 이것 — 320×100 이 256×80 으로 나갔다).
export const ADFIT_INCONTENT_UNITS = [
  { unit: 'DAN-Dh2QTY00kZEzZjcQ', width: 320, height: 50 },
  { unit: 'DAN-gceZS4W9pO1EXNBI', width: 320, height: 50 },
  { unit: 'DAN-4kNsokjK16GLvNCx', width: 320, height: 50 },
];
