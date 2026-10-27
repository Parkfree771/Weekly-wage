// 광고 설정 한 곳 모음.

// 미리보기 모드.
// true  = 실제 광고 대신 "여기에 광고 들어감" placeholder(자리/크기)만 표시. 배치 확인용.
// false = 실제 광고(<ins>) 동작. (단, 아래 슬롯 ID가 채워진 자리에만 렌더됨)
export const AD_PREVIEW = false;

// 모바일 뷰포트 초기 배율 — app/layout.tsx 의 viewport.initialScale 이 이 값을 쓴다.
// 페이지를 축소 렌더하므로 광고를 그대로 두면 300×250 이 240×200 으로 나가 규격 미달이 된다.
// (2026-07-28 애드핏 매체 심사 보류 사유가 정확히 이것) 광고 컨테이너에 역배율을 걸어 실제 화면 px 를 복원한다.
// 데스크톱이 body zoom 0.85 에 AD_ZOOM_COMPENSATE 를 거는 것과 같은 방식.
export const MOBILE_VIEWPORT_SCALE = 0.8;
export const MOBILE_AD_ZOOM_COMPENSATE = 1 / MOBILE_VIEWPORT_SCALE;

// 모바일 본문 인-콘텐츠 광고(AdBanner) 사용 여부.
// 모바일은 하단 앵커를 코드로 두지 않고 앱(AdMob BannerAdBar)과 같은 위치의 인-콘텐츠만 쓴다.
export const MOBILE_INCONTENT = true;

// ── 구글 애드센스 ──
export const ADSENSE_CLIENT = 'ca-pub-6944494802169618';

// 광고 단위 ID(data-ad-slot, 콘솔 > 광고 > 광고 단위별 > 디스플레이 광고에서 발급).
// 빈 슬롯은 렌더하지 않는다.
//
// 애드센스는 같은 단위를 한 페이지에 여러 번 넣어도 전부 채운다(애드핏과 다름).
// 자리 종류별로만 나누는 건 리포트에서 어느 종류가 버는지 구분하기 위해서다.
export const ADSENSE_SLOTS = {
  mobileInContent: '7066956784', // 모바일 본문 전 자리
  desktopHorizontal: '1926310741', // PC 가로 띠(목표 아래·결과 아래)
  desktopSquare: '7923200898', // PC 사각(패키지 상세 좌측·갤러리 카드 칸·갤러리 페이저 아래)
  rail: '6748226739', // PC 좌우 레일(좌우 공용)
};

// 자리별 광고 칸 크기 — 반응형 단위를 이 칸에 맞춰 띄운다(CSS 로 칸 크기를 정하는 방식).
// 칸보다 작은 소재가 오면 가운데 정렬되고, 칸을 넘는 소재는 오지 않는다.
// width 가 '100%' 인 자리는 부모 폭을 따른다(maxWidth 까지).
//
// 모바일 250: 구글 성과 상위 300×250 이 들어가는 높이. 320×100 소재도 같은 칸에서 경쟁한다.
// 레일은 따라오지 않는다 — 애드센스는 스크롤을 따라오는 광고를 화면에 하나만, 좌우 대칭 없이 허용한다.
export const AD_SIZES = {
  mobileInContent: { width: '100%', maxWidth: 336, height: 250 },
  desktopHorizontal: { width: '100%', maxWidth: 970, height: 90 },
  desktopGallerySquare: { width: 336, height: 280 },
  // 갤러리 카드 칸 — 폭은 칸을 꽉 채우고 높이는 280 고정, 칸 안에서 세로 가운데.
  // 높이까지 칸에 맞췄더니(100%) 소재가 칸보다 낮을 때 위에 붙고 아래가 크게 비었다.
  desktopGridCell: { width: '100%', height: 280 },
  desktopSideSquare: { width: 250, height: 250 },
  rail: { width: 160, height: 600 },
} as const;

export type AdSize = { width: number | string; maxWidth?: number; height: number | string; minHeight?: number };
