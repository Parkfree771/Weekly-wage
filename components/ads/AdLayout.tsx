'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdPlaceholder from './AdPlaceholder';
import AdAnchorMobile from './AdAnchorMobile';
import AdUnit from './AdUnit';
import { AD_PREVIEW, AD_SLOTS } from './adConfig';
import AppSidebarPromo from '../AppSidebarPromo';
import { SITE_ZOOM_EVENT, getSiteZoom } from '../ZoomControl';

interface PageConfig {
  contentWidth: number;
  adTop: number;
  // 앱 프로모 세로 위치(adTop과 동일 단위 — body zoom 적용 전 논리 px, zoom 배율과 무관하게 유효).
  // 지정하면 오른쪽 광고 레일과 같은 칸에 공존(어깨를 맞춤). 생략하면 겹침 위험 방지를 위해
  // 실제 광고가 뜰 때는 프로모를 숨기는 기존 방식으로 동작.
  appPromoTop?: number;
}

// 각 페이지의 실제 콘텐츠 폭에 맞춤 (사이드 레일이 콘텐츠를 침범하지 않도록)
function getPageConfig(pathname: string): PageConfig {
  // adTop 212 = 코드 기반 계산값 — Container mt-md-3(16) + PriceDashboard "오늘의 시세"
  // 카드 줄(헤더~32 + 가로스크롤 카드 140+패딩8≈148) + mb-3(16) ≈ 212, 그 아래
  // "카테고리" 상자 상단과 나란히 맞춤. body zoom 적용 전 논리 px라 zoom 배율과 무관하게 유효.
  // appPromoTop 0 = 프로모를 레일 맨 꼭대기에 붙임 — 프로모 실제 높이(zoom 역보정 후 약 166px)가
  // 목표 지점(212*0.85≈180px)에 거의 맞닿을 만큼 커서 여유가 매우 빠듯함(약 14px). 조금이라도
  // 내려서 시작하면 최소 여백으로 강제 보정되며 왼쪽과 어긋나므로 0으로 최대한 당겨둠.
  if (pathname === '/') return { contentWidth: 1400, adTop: 212, appPromoTop: 0 };
  // adTop 200 = "검색창" 상자 상단과 나란히(직접 요청으로 기존 110에서 크게 내림).
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 200 };
  // adTop 409 = "완갑 강화" 박스(시뮬레이터 stageCol) 상단과 나란히(왼쪽 광고 기준).
  // appPromoTop 148 = 그 위 "장비 선택" 패널 상단과 나란히. 오른쪽 광고는 프로모 아래
  // 실측 간격(dockedAdMarginTop)으로 왼쪽 광고와 정확히 같은 높이에 맞춰짐.
  if (pathname === '/wangap') return { contentWidth: 1400, adTop: 409, appPromoTop: 148 };
  // contentWidth 1180 = 실제 레이드 카드 그리드 폭(RaidCalculator.module.css .cardGrid max-width).
  // 컨테이너 자체는 1800px지만 거의 텅 빈 바깥 여백이었고, 진짜 콘텐츠는 1180px에서 안 넘어감 —
  // 그래서 레일이 카드보다 한참 바깥에 떠 있었음. 실제 카드 폭 기준으로 확 좁혀 붙임.
  if (pathname === '/weekly-gold') return { contentWidth: 1180, adTop: 110 };
  // adTop 200 = "메인 카드"(아이템 선택+가격 입력) 상자 상단과 나란히(기존 110에서 크게 내림).
  if (pathname === '/life-master') return { contentWidth: 1200, adTop: 200 };
  // adTop 300 = 원정대 탭·주간 수급 요약을 지나 첫 번째 캐릭터 카드 상단과 나란히(기존 130에서 크게 내림).
  if (pathname === '/mypage') return { contentWidth: 1600, adTop: 300 };
  if (pathname === '/character') return { contentWidth: 1400, adTop: 90 };
  // adTop 230 = 세르카·익스트림과 동일 값으로 통일(175는 부족했음).
  if (pathname === '/cathedral') return { contentWidth: 1200, adTop: 230 };
  if (pathname === '/cerka') return { contentWidth: 1200, adTop: 230 };
  if (pathname === '/extreme') return { contentWidth: 1200, adTop: 230 };
  // 세르카와 동일 구성(요청).
  if (pathname === '/belgardin') return { contentWidth: 1200, adTop: 230 };
  if (pathname === '/bracelet') return { contentWidth: 900, adTop: 90 };
  // adTop 280 = 기존(90)보다 큰 폭으로 내려서 실제 계산기 상자 상단과 맞춤.
  if (pathname === '/hell-reward') return { contentWidth: 900, adTop: 280 };
  if (pathname.startsWith('/package/')) return { contentWidth: 1100, adTop: 80 };
  // adTop 290 = 갤러리 카드 첫 줄 상단(269) 기준에서 살짝 더 내림(왼쪽 광고 기준).
  // appPromoTop 8 = 레일 맨 위 가까이 — 오른쪽 광고가 왼쪽과 정확히 같은 높이가 되도록 실측 보정.
  if (pathname === '/package') return { contentWidth: 1400, adTop: 290, appPromoTop: 8 };
  // adTop 250 = "더보기 손익 계산" 헤더와 나란히(87은 한참 부족했음 — 코드 추정이 실제보다 많이 작았음).
  if (pathname === '/more-reward') return { contentWidth: 1100, adTop: 250 };
  return { contentWidth: 1400, adTop: 60 };
}

// 양쪽 사이드바: 220px * 2 + 갭 8px * 2 = 456px
const AD_EXTRA = 456;

// 데스크톱은 globals.css에서 body zoom 0.85 (≥1024px) → 실제 레이아웃 폭 = innerWidth / 0.85.
// 레일 노출 판정에 이 배율을 반영해야 함 (안 그러면 여유 있는데도 안 뜸).
// 2026-07-15: body zoom을 0.67→0.85로 고정하면서 이 값도 같이 갱신.
const DESKTOP_ZOOM = 0.85;

// 광고 슬롯 zoom 역보정 배율 — 애드센스는 광고 요소의 "실제 렌더링 픽셀 크기"로 규격(160×600,
// 970×90 등)을 인식하므로, body zoom(0.85)에 그대로 맡기면 136×510처럼 줄어든 채 렌더돼
// 표준 규격 미달로 처리될 위험이 있음. 광고를 담는 컨테이너에 1/zoom을 곱해 실제 화면 px를
// 선언한 값 그대로 복원 — 페이지 다른 요소보다 조금 커 보이지만 애드센스 입장에선 정확한 규격.
const AD_ZOOM_COMPENSATE = 1 / DESKTOP_ZOOM;

// 사이드 광고를 붙일 페이지 — 캐릭터 조회(자체 사이드바), 패키지 등록·수정(폼 화면, railsDisabled에서
// 별도 제외), 직업 각인(전용 사이드바)만 빼고 대부분 페이지에 적용.
const RAIL_PAGES = new Set([
  '/', '/refining', '/wangap', '/package',
  '/weekly-gold', '/life-master', '/mypage', '/more-reward',
  '/cathedral', '/cerka', '/extreme', '/belgardin', '/bracelet', '/hell-reward',
]);
// 패키지 상세(/package/[postId])는 동적 라우트라 위 Set에 못 넣으므로 startsWith로 별도 포함
// (등록·수정은 railsDisabled가 이미 따로 걸러냄).
function isRailPage(pathname: string): boolean {
  return RAIL_PAGES.has(pathname) || pathname.startsWith('/package/');
}

// 앱 다운로드 사이드바 프로모를 붙일 페이지 — 광고 레일이 있는 페이지도 포함되며,
// appPromoTop이 지정된 페이지는 같은 레일 칸 위쪽에 어깨를 맞춰 공존한다(아래 promoLeft 계산 참고)
const APP_PROMO_PAGES = new Set(['/', '/refining', '/wangap', '/package', '/mypage']);

// 앱 프로모 세로 위치 기본값 — 상단 네비(52px) 바로 아래 고정 간격. 페이지별로 다른 콘텐츠 블록에
// 어깨를 맞춰야 하면 getPageConfig에서 appPromoTop으로 오버라이드(예: /wangap, /package)
const APP_PROMO_TOP = 66;

// 모바일 하단 앵커 높이(px). 하단에서 올라오는 UI(차트 바텀시트 등)를 이만큼 위로 올려 겹침 방지.
// CSS 변수 --mobile-anchor-h 로 노출 → 필요한 컴포넌트가 bottom 오프셋으로 사용.
const MOBILE_ANCHOR_H = 60;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageConfig = getPageConfig(pathname);
  const { contentWidth, adTop, appPromoTop = APP_PROMO_TOP } = pageConfig;
  // 세로 위치(appPromoTop)를 이 페이지 전용으로 명시해둔 경우에만 광고 레일과 같은 칸에 공존시킴
  // (겹치지 않게 미리 확인해둔 페이지라는 뜻). 지정이 없으면 겹침 위험이 있으니 예전처럼 배타적으로 동작.
  const promoTunedForRail = pageConfig.appPromoTop !== undefined;
  const [isMobile, setIsMobile] = useState(false);
  const [railsWide, setRailsWide] = useState(false);
  const [promoLeft, setPromoLeft] = useState<number | null>(null);
  // body zoom(0.85)이 실제로 걸리는 폭(≥1024px)인지 — 광고 슬롯 zoom 역보정 적용 여부에 사용.
  // isMobile(<768px) 기준과 달라서 별도로 추적(768~1023px 구간엔 zoom이 아예 안 걸림).
  const [desktopZoomActive, setDesktopZoomActive] = useState(false);
  // 도킹형 오른쪽 광고를 왼쪽 광고와 정확히 같은 높이로 맞추기 위한 실측값(추정 아님).
  const [dockedAdMarginTop, setDockedAdMarginTop] = useState<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const leftAdRef = useRef<HTMLDivElement>(null);
  const dockedPromoRef = useRef<HTMLDivElement>(null);

  // 사이드 레일만 비활성 — 자체 사이드바가 있어 좌우 레일과 충돌하는 페이지.
  // (상단 배너·앵커는 가로/하단이라 충돌 안 하므로 여기서 막지 않음)
  // - /character: 오른쪽에 필터 통계 사이드바를 자체 배치
  const railsDisabled =
    pathname === '/character' ||
    pathname === '/package/register' || pathname.startsWith('/package/edit');

  // 광고 전부 비활성 — 등록·수정 같은 작업/폼 화면 (상단 배너·앵커 포함)
  const noAds =
    pathname === '/package/register' || pathname.startsWith('/package/edit');

  useEffect(() => {
    // 콘텐츠 폭 + 레일이 들어갈 만큼 넓은 뷰포트에서만 레일 노출 (콘텐츠 침범 방지)
    const needed = contentWidth + AD_EXTRA; // 양쪽 레일까지 들어갈 폭 (body 좌표)
    const check = () => {
      // 사이트 보기 배율(html zoom) 반영 — 배율 Z만큼 레이아웃 뷰포트가 innerWidth/Z로 줄어들고,
      // 그 안에서 기존 body zoom(0.85) 좌표계가 그대로 동작하므로 w만 보정하면 이하 계산이 전부 유지됨
      const w = window.innerWidth / getSiteZoom();
      setIsMobile(w < 768);
      setDesktopZoomActive(w >= 1024);
      // 데스크톱 body zoom(0.85) 반영 → 실제 레이아웃 폭 = w / zoom
      const zoom = w >= 1024 ? DESKTOP_ZOOM : 1;
      const effective = w / zoom;
      setRailsWide(effective >= needed);
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener(SITE_ZOOM_EVENT, check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener(SITE_ZOOM_EVENT, check);
    };
  }, [contentWidth]);

  // 광고 자리 노출 조건 (미리보기/실제 공통).
  // 실제 모드에선 해당 슬롯 ID가 있어야 자리를 차지(빈 자리 방지).
  const railsVisible =
    isRailPage(pathname) &&
    (AD_PREVIEW || !!AD_SLOTS.sidebar) && !railsDisabled && railsWide && !isMobile;
  // 메인도 이제 양쪽 레일에 광고 — 오른쪽은 앱 프로모와 도킹(아래 dockedPromo)되어 나란히 공존
  const rightRailAdVisible = railsVisible;
  // 앱 다운로드 프로모 — 오른쪽에 실제 광고가 뜨는 페이지는 promoTunedForRail(=appPromoTop 지정)일 때만
  // 공존. 지정이 없으면 겹칠 수 있으니 예전처럼 숨김.
  const showPromo =
    APP_PROMO_PAGES.has(pathname) && !railsDisabled && railsWide && !isMobile &&
    (!rightRailAdVisible || promoTunedForRail);
  // 도킹형 — 오른쪽 광고 레일과 같은 sticky 박스 안에 나란히 넣어 스크롤 시 완전히 같이 움직임
  // (fixed와 sticky가 따로 놀던 문제 해결). 광고가 실제로 뜨는 페이지에서만 의미가 있음.
  const dockedPromo = showPromo && rightRailAdVisible && promoTunedForRail;
  // 플로팅형 — 레일이 없거나(메인 오른쪽은 스페이서) 도킹 대상이 아닐 때, 기존처럼 fixed로 띄움.
  const floatingPromo = showPromo && !dockedPromo;
  const topBannerVisible =
    (AD_PREVIEW || !!AD_SLOTS.topBanner) && !noAds && !isMobile && pathname !== '/';
  // 실제 앵커는 애드센스 자동광고가 처리(수동 <ins> 없음) → 미리보기에서만 자리 표시
  const showAnchor = AD_PREVIEW && !noAds && isMobile;

  // 앱 프로모 가로 위치 (플로팅형 전용) — zoom 배율로 역산하지 않고 실측(getBoundingClientRect)으로
  // 계산 오차를 없앰. 오른쪽에 레일(스페이서 포함)이 있으면 그 칸에 맞춤, 없으면 콘텐츠 오른쪽 끝에 붙임.
  // 도킹형은 aside 내부 일반 flow로 렌더되므로 이 계산이 필요 없음.
  useEffect(() => {
    if (!floatingPromo) {
      setPromoLeft(null);
      return;
    }
    const measure = () => {
      const shell = shellRef.current;
      if (!shell) return;
      const rail = shell.querySelector('.side-rail-right');
      if (rail) {
        // 애드센스 광고(160px, zoom 역보정으로 실제 화면에서도 160px)가 레일 안에서 가운데 정렬되는
        // 것과 똑같이 맞춤. 레일 자체도 body zoom을 받으므로 선언폭(220) 대신 실측 폭을 사용.
        const railRect = rail.getBoundingClientRect();
        setPromoLeft(railRect.left + (railRect.width - 160) / 2);
        return;
      }
      const main = shell.querySelector('.content-shell-main');
      if (!main) return;
      setPromoLeft(main.getBoundingClientRect().right + 10);
    };
    measure();
    const raf = requestAnimationFrame(measure); // 레일 마운트 직후 레이아웃 안정화 후 한 번 더 측정
    window.addEventListener('resize', measure);
    window.addEventListener(SITE_ZOOM_EVENT, measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener(SITE_ZOOM_EVENT, measure);
    };
  }, [floatingPromo, railsVisible]);

  // 도킹형 오른쪽 광고 세로 위치 — 왼쪽 광고와 "정확히 같은 높이"로 맞추기 위해 추정치 대신
  // 실제 렌더된 왼쪽 광고 top / 오른쪽 프로모 bottom을 실측(getBoundingClientRect)해서 간격을 역산.
  // zoom 배율이 뭐든(0.85든 다른 값이든) 항상 정확 — px 계산을 직접 하지 않음.
  useEffect(() => {
    if (!dockedPromo) {
      setDockedAdMarginTop(null);
      return;
    }
    // 프로모가 목표 위치를 넘어서 겹칠 뻔한 극단적 상황에서만 쓰이는 최소 여백(px).
    // 너무 크면 여유가 빠듯한 페이지(메인 등)에서 실측 간격 대신 이 값이 강제 적용돼
    // 왼쪽과 어긋나 버리므로 작게 유지 — "정확히 같은 높이"가 최우선.
    const MIN_GAP = 2;
    const measure = () => {
      const leftAd = leftAdRef.current;
      const promo = dockedPromoRef.current;
      if (!leftAd || !promo) return;
      const targetTop = leftAd.getBoundingClientRect().top;
      const promoBottom = promo.getBoundingClientRect().bottom;
      setDockedAdMarginTop(Math.max(targetTop - promoBottom, MIN_GAP));
    };
    measure();
    const raf = requestAnimationFrame(measure); // 레일·프로모 마운트 직후 레이아웃 안정화 후 한 번 더
    window.addEventListener('resize', measure);
    window.addEventListener(SITE_ZOOM_EVENT, measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener(SITE_ZOOM_EVENT, measure);
    };
  }, [dockedPromo, railsVisible]);

  // 앵커가 떠 있는 동안만 --mobile-anchor-h 설정 → 하단에서 올라오는 UI가 앵커 위로 비켜남.
  useEffect(() => {
    document.body.style.setProperty('--mobile-anchor-h', showAnchor ? `${MOBILE_ANCHOR_H}px` : '0px');
    return () => { document.body.style.removeProperty('--mobile-anchor-h'); };
  }, [showAnchor]);

  // 사이드 레일 한 칸 내용 — 표준 세로 규격 160×600(와이드 스카이스크래퍼) 고정.
  // (미리보기=placeholder, 실제=AdUnit 고정 사이즈, key로 라우트마다 갱신)
  // 실제 화면 px가 160×600 그대로 나오도록 zoom 역보정 래퍼로 감쌈(위 AD_ZOOM_COMPENSATE 참고).
  const renderRail = () => {
    const ad = AD_PREVIEW ? (
      <AdPlaceholder
        label="광고 영역 · 사이드"
        sub="160 × 600 (스카이스크래퍼)"
        style={{ width: '160px', height: '600px', minHeight: '600px', margin: '0 auto' }}
      />
    ) : (
      <AdUnit
        key={pathname}
        slot={AD_SLOTS.sidebar}
        width={160}
        height={600}
        style={{ margin: '0 auto' }}
      />
    );
    if (!desktopZoomActive) return ad;
    return (
      <div style={{ width: '160px', height: '600px', margin: '0 auto', zoom: AD_ZOOM_COMPENSATE }}>
        {ad}
      </div>
    );
  };

  const layoutStyle: React.CSSProperties =
    railsVisible ? { maxWidth: `${contentWidth + AD_EXTRA}px` } : {};

  return (
    <>
      <div className="content-shell" style={layoutStyle} ref={shellRef}>
        {railsVisible && (
          <aside className="side-rail side-rail-left" style={{ paddingTop: `${adTop}px` }}>
            <div className="side-rail-sticky" ref={leftAdRef}>{renderRail()}</div>
          </aside>
        )}
        <main className="content-shell-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {topBannerVisible && (
            <div
              style={{
                maxWidth: '970px',
                margin: '0 auto 16px',
                // 상단 배너도 zoom 역보정 — 970px 선언폭이 실제로도 970px로 렌더되도록
                ...(desktopZoomActive ? { zoom: AD_ZOOM_COMPENSATE } : {}),
              }}
            >
              {AD_PREVIEW ? (
                <AdPlaceholder
                  label="광고 영역 · 상단 배너"
                  sub="데스크톱 · 반응형 가로 (예: 970×90)"
                  style={{ maxWidth: '970px', height: '90px', minHeight: '90px' }}
                />
              ) : (
                <AdUnit
                  key={pathname}
                  slot={AD_SLOTS.topBanner}
                  format="horizontal"
                  responsive
                  style={{ minHeight: '90px' }}
                />
              )}
            </div>
          )}
          {children}
        </main>
        {railsVisible && (
          <aside
            className="side-rail side-rail-right"
            style={{ paddingTop: dockedPromo ? undefined : `${adTop}px` }}
          >
            {dockedPromo ? (
              // 도킹형 — 프로모+광고를 같은 sticky 박스 안에 위아래로 쌓음 → 스크롤 시 완전히 한 몸으로 움직임.
              // 프로모는 appPromoTop 지점에서 시작, 광고는 왼쪽 광고와 정확히 같은 높이가 되도록
              // 실측 간격(dockedAdMarginTop)만큼 아래에 이어짐(측정 전엔 24px 기본값으로 깜빡임 방지).
              <div className="side-rail-sticky">
                <div ref={dockedPromoRef} style={{ marginTop: `${appPromoTop}px` }}>
                  {desktopZoomActive ? (
                    <div style={{ width: '160px', margin: '0 auto', zoom: AD_ZOOM_COMPENSATE }}>
                      <AppSidebarPromo />
                    </div>
                  ) : (
                    <AppSidebarPromo />
                  )}
                </div>
                <div style={{ marginTop: `${dockedAdMarginTop ?? 24}px` }}>{renderRail()}</div>
              </div>
            ) : (
              rightRailAdVisible && <div className="side-rail-sticky">{renderRail()}</div>
            )}
          </aside>
        )}
      </div>
      {/* 앱 다운로드 프로모 (플로팅형) — content-shell 밖에서 position:fixed로 떠 있음.
          content-shell/main의 폭·정렬을 절대 건드리지 않음 (레이아웃과 완전히 분리).
          오른쪽 레일이 있으면 그 레일과 같은 칸(promoLeft가 레일 폭 안에서 가운데 정렬),
          없으면 콘텐츠 오른쪽 끝에 붙임. 세로 위치는 appPromoTop. */}
      {floatingPromo && promoLeft != null && (
        <div className="app-promo-fixed-rail" style={{ left: `${promoLeft}px`, top: `${appPromoTop}px` }}>
          <AppSidebarPromo />
        </div>
      )}
      {showAnchor && <AdAnchorMobile />}
    </>
  );
}
