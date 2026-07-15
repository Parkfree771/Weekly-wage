# 광고(AdSense) 구조

## 파일
- `adConfig.ts` — 토글(`AD_PREVIEW`)·게시자ID·슬롯ID 한 곳 모음.
- `AdPlaceholder.tsx` — "여기 광고 들어감" 미리보기 박스(자리/크기).
- `AdUnit.tsx` — 실제 광고 단위(`<ins class="adsbygoogle">`). push 1회, 중복 방지.
- `AdBanner.tsx` — 모바일 인-콘텐츠. 페이지 안에 직접 배치(이미 6개 페이지 사용 중).
- `AdAnchorMobile.tsx` — 모바일 하단 앵커 미리보기(실제 앵커는 자동광고가 처리).
- `AdLayout.tsx` — 데스크톱 상단 배너·사이드 레일을 레이아웃 레벨에서 배치.

## 광고 위치(기기별)
- 데스크톱: 상단 배너 + (재련 페이지·넓은 화면일 때만) 좌우 사이드 레일 (160×600 스카이스크래퍼)
  - 사이드 레일은 `RAIL_PAGES`(메인 `/`·재련 `/refining`·완갑 `/wangap`·패키지 `/package`)에서만. 좌우 양쪽, 스티키(스크롤 따라옴), 본문 옆 여백이라 본문을 안 가림.
  - 노출 판정은 데스크톱 body zoom(0.85)을 반영해 실제 레이아웃 폭으로 계산(`innerWidth / 0.85`).
  - 앱 다운로드 프로모(`APP_PROMO_PAGES`)는 오른쪽 레일과 같은 칸에 어깨를 맞춰 공존 가능 — `getPageConfig`에 `appPromoTop`이 지정된 페이지(`/wangap`, `/package`)만 해당, 나머지는 겹침 방지를 위해 광고가 뜨면 프로모를 숨김.
- 모바일: 하단 앵커(자동광고)가 기본. 본문 인-콘텐츠(AdBanner)는 전역 토글 `MOBILE_INCONTENT`로 OFF.
  - 메인의 차트 바텀시트(ItemSelector Offcanvas)처럼 하단에서 올라오는 UI는 앵커와 겹치므로,
    AdLayout이 앵커 노출 중 `--mobile-anchor-h`(=`MOBILE_ANCHOR_H`px)를 body에 설정하고,
    해당 UI가 `bottom: var(--mobile-anchor-h)`로 그만큼 위로 올라가 겹침을 피함.

## 페이지 이동 시 새 광고 (SPA 대응)
App Router라 레이아웃은 라우팅 시 안 죽음 → 레이아웃 광고(상단/사이드)는
`<AdUnit key={pathname} />`로 마운트해 경로가 바뀔 때마다 새 광고를 받음.
인-콘텐츠는 페이지 컴포넌트가 재마운트되며 자연 갱신(+ 안전하게 key도 부여).
**경로(pathname)만 key로 사용** — 쿼리스트링/타이머 새로고침은 정책 위반이라 금지.

## 실제 광고로 켜는 절차
1. 애드센스 > 광고 > 광고 단위에서 발급:
   - 상단 배너용 디스플레이(가로) 단위 → `AD_SLOTS.topBanner`
   - 사이드용 디스플레이(세로) 단위 → `AD_SLOTS.sidebar`
   - (모바일 인-콘텐츠는 기존 `8616653628` 사용 중)
2. 앵커: 애드센스 > 광고 > 사이트별 > 자동 광고에서 **앵커만 ON**, 본문내·비네트 OFF.
3. `adConfig.ts`에서 `AD_PREVIEW = false`로 변경.
   - 슬롯 ID가 빈 자리는 실제 모드에서 렌더되지 않음(빈/깨진 광고 방지).

## 최적화/정책 체크
- 스크립트는 `app/layout.tsx`에서 `lazyOnload`(본문 우선).
- 광고 자리 높이를 미리 예약 → 화면 밀림(CLS) 방지.
- 동시 노출 최소(데스크톱 배너1, 모바일 앵커+인콘텐츠1).
- 본인/지인 클릭, 클릭 유도 문구, 광고 자동 새로고침 금지.
