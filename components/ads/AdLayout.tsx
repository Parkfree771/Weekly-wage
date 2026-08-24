'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdPlaceholder from './AdPlaceholder';
import AdUnit from './AdUnit';
import AdFitUnit from './AdFitUnit';
import { AD_PREVIEW, AD_SLOTS, ADFIT_ENABLED, ADFIT_UNITS } from './adConfig';
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
  // appPromoTop 0 = 도킹 모드로 전환 — 왼쪽 인기 페이지 박스·오른쪽 앱 프로모를 레일 위에 얹고
  // 광고는 그 아래로. (예전엔 튜닝값이 없어 광고가 뜨면 프로모를 아예 숨겼다)
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 200, appPromoTop: 0 };
  // adTop 409 = "완갑 강화" 박스(시뮬레이터 stageCol) 상단과 나란히(왼쪽 광고 기준).
  // appPromoTop 148 = 그 위 "장비 선택" 패널 상단과 나란히. 오른쪽 광고는 프로모 아래
  // 실측 간격(dockedAdMarginTop)으로 왼쪽 광고와 정확히 같은 높이에 맞춰짐.
  if (pathname === '/wangap') return { contentWidth: 1400, adTop: 409, appPromoTop: 148 };
  // contentWidth 1180 = 실제 레이드 카드 그리드 폭(RaidCalculator.module.css .cardGrid max-width).
  // 컨테이너 자체는 1800px지만 거의 텅 빈 바깥 여백이었고, 진짜 콘텐츠는 1180px에서 안 넘어감 —
  // 그래서 레일이 카드보다 한참 바깥에 떠 있었음. 실제 카드 폭 기준으로 확 좁혀 붙임.
  // adTop 300 = 제목·검색창을 지나 레이드 카드 영역 상단 부근(직접 요청으로 기존 110에서 크게 내림).
  if (pathname === '/weekly-gold') return { contentWidth: 1180, adTop: 300 };
  // adTop 200 = "메인 카드"(아이템 선택+가격 입력) 상자 상단과 나란히(기존 110에서 크게 내림).
  if (pathname === '/life-master') return { contentWidth: 1200, adTop: 200 };
  // adTop 300 = 원정대 탭·주간 수급 요약을 지나 첫 번째 캐릭터 카드 상단과 나란히(기존 130에서 크게 내림).
  // appPromoTop 110 = 도킹형에서 광고 상단을 기존 adTop(300)에 그대로 유지시키는 값.
  // 도킹되면 광고 세로 위치는 adTop 이 아니라 appPromoTop + 프로모높이(≈166) + PROMO_AD_GAP(24)
  // 로 정해지므로 300 - 190 = 110. (광고가 위아래로 움직이면 이 값만 조정하면 된다)
  // 2026-08-24: 상단 728×90 배너 자리(패딩 16+12 + 슬롯 마진 19×2 + 배너 106 ≈ 172px)만큼 둘 다 내림.
  if (pathname === '/mypage') return { contentWidth: 1600, adTop: 472, appPromoTop: 282 };
  // adTop 230 = 세르카·익스트림과 동일 값으로 통일(175는 부족했음).
  if (pathname === '/cathedral') return { contentWidth: 1200, adTop: 230 };
  if (pathname === '/cerka') return { contentWidth: 1200, adTop: 230 };
  if (pathname === '/extreme') return { contentWidth: 1200, adTop: 230 };
  // 세르카와 동일 구성(요청).
  if (pathname === '/belgardin') return { contentWidth: 1200, adTop: 230 };
  if (pathname === '/bracelet') return { contentWidth: 900, adTop: 90 };
  // adTop 300 = 주간 레이드와 같은 구성(제목+검색창 다음 본문 상단) — 동일 값으로 통일.
  if (pathname === '/expedition-gold') return { contentWidth: 1180, adTop: 300 };
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

// 광고 슬롯 zoom 역보정 배율 — 애드센스는 광고 요소의 "실제 렌더링 픽셀 크기"로 규격(160×600)을
// 인식하므로, body zoom(0.85)에 그대로 맡기면 136×510처럼 줄어든 채 렌더돼 표준 규격 미달로
// 처리될 위험이 있음. 광고를 담는 컨테이너에 1/zoom을 곱해 실제 화면 px를 선언한 값 그대로 복원
// — 페이지 다른 요소보다 조금 커 보이지만 애드센스 입장에선 정확한 규격.
const AD_ZOOM_COMPENSATE = 1 / DESKTOP_ZOOM;

// 데스크톱 광고는 사이드 레일이 전부 — 상단 배너·모바일 하단 앵커는 제거됨.
// 모바일은 앱(AdMob)과 동일한 본문 인-콘텐츠(AdBanner)만 사용, 애드센스 자동광고(앵커 포함) 금지.
// 사이드 광고를 붙일 페이지 — 캐릭터 조회(자체 사이드바), 패키지 등록·수정(폼 화면, railsDisabled에서
// 별도 제외), 직업 각인(전용 사이드바)만 빼고 대부분 페이지에 적용.
// 이 목록에 없는 페이지는 데스크톱에서 광고가 아예 없다.
const RAIL_PAGES = new Set([
  '/', '/refining', '/wangap', '/package',
  '/weekly-gold', '/life-master', '/mypage', '/more-reward',
  '/cathedral', '/cerka', '/extreme', '/belgardin', '/bracelet', '/hell-reward',
  '/expedition-gold',
]);
// 패키지 상세(/package/[postId])는 동적 라우트라 위 Set에 못 넣으므로 startsWith로 별도 포함
// (등록·수정은 railsDisabled가 이미 따로 걸러냄).
function isRailPage(pathname: string): boolean {
  return RAIL_PAGES.has(pathname) || pathname.startsWith('/package/');
}

// 앱 다운로드 사이드바 프로모를 붙일 페이지 — 광고 레일이 있는 페이지도 포함되며,
// appPromoTop이 지정된 페이지는 같은 레일 칸 위쪽에 어깨를 맞춰 공존한다(아래 promoLeft 계산 참고)
// /mypage는 제목 아래 가로 배너로 앱을 노출했었으나 그 배너를 제거해서(2026-08-22) 여기로 합류.
const APP_PROMO_PAGES = new Set(['/', '/refining', '/wangap', '/package', '/mypage']);

// 앱 프로모 세로 위치 기본값 — 상단 네비(52px) 바로 아래 고정 간격. 페이지별로 다른 콘텐츠 블록에
// 어깨를 맞춰야 하면 getPageConfig에서 appPromoTop으로 오버라이드(예: /wangap, /package)
const APP_PROMO_TOP = 66;

/** 왼쪽 레일 프로모 자리에 페이지가 포털로 위젯을 얹을 때 쓰는 타깃 id (도킹 모드에서만 존재) */
export const LEFT_RAIL_SLOT_ID = 'left-rail-promo-slot';

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
  const shellRef = useRef<HTMLDivElement>(null);
  const dockedPromoRef = useRef<HTMLDivElement>(null);

  // 사이드 레일 비활성 — 등록/수정 폼 화면.
  const railsDisabled =
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
    (AD_PREVIEW || !!AD_SLOTS.sidebar || (ADFIT_ENABLED && !!ADFIT_UNITS.sidebarLeft.unit)) &&
    !railsDisabled && railsWide && !isMobile;
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

  // 도킹형 레일에서 프로모 아래 광고까지의 간격(px).
  // 좌우가 같은 마크업이라 이 값이 양쪽에 똑같이 걸린다 → 실측 보정이 필요 없다.
  // 광고 세로 위치를 조정하고 싶으면 페이지별 appPromoTop(getPageConfig)을 움직이면 된다.
  const PROMO_AD_GAP = 24;

  // 사이드 레일 한 칸 내용 — 표준 세로 규격 160×600(와이드 스카이스크래퍼) 고정.
  // (미리보기=placeholder, 실제=AdUnit 고정 사이즈, key로 라우트마다 갱신)
  // 실제 화면 px가 160×600 그대로 나오도록 zoom 역보정 래퍼로 감쌈(위 AD_ZOOM_COMPENSATE 참고).
  // side: 좌·우가 같은 페이지에 동시에 뜨므로 애드핏 단위를 반드시 따로 쓴다.
  const renderRail = (side: 'left' | 'right') => {
    const adfitUnit = side === 'left' ? ADFIT_UNITS.sidebarLeft : ADFIT_UNITS.sidebarRight;
    const ad = AD_PREVIEW ? (
      <AdPlaceholder
        label={`광고 · 사이드 ${side === 'left' ? '좌' : '우'}`}
        sub={
          ADFIT_ENABLED && adfitUnit.unit
            ? `애드핏 ${adfitUnit.width}×${adfitUnit.height}\n${adfitUnit.unit}`
            : '160 × 600 (스카이스크래퍼)'
        }
        style={{ width: '160px', height: '600px', minHeight: '600px', margin: '0 auto', whiteSpace: 'pre-line' }}
      />
    ) : ADFIT_ENABLED && adfitUnit.unit ? (
      // 애드핏 우선 — 애드센스 미승인 상태라 켜져 있어도 채워지지 않는다.
      // 애드핏 레일 단위도 160×600 이라 레일 폭을 그대로 쓴다.
      <AdFitUnit
        key={pathname}
        unit={adfitUnit.unit}
        width={adfitUnit.width}
        height={adfitUnit.height}
        style={{ margin: '0 auto' }}
      />
    ) : AD_SLOTS.sidebar ? (
      <AdUnit
        key={pathname}
        slot={AD_SLOTS.sidebar}
        width={160}
        height={600}
        style={{ margin: '0 auto' }}
      />
    ) : null;
    if (!ad) return null;
    if (!desktopZoomActive) return ad;
    return (
      <div style={{ width: '160px', height: '600px', margin: '0 auto', zoom: AD_ZOOM_COMPENSATE }}>
        {ad}
      </div>
    );
  };

  const layoutStyle: React.CSSProperties =
    railsVisible ? { maxWidth: `${contentWidth + AD_EXTRA}px` } : {};

  // 도킹형 프로모 칸. 오른쪽은 실제 프로모, 왼쪽은 같은 높이의 보이지 않는 복제본이다.
  // (인기 페이지 박스를 잠깐 뒀었지만 상단 네비 불꽃 배지로 대체되어 원래 방식으로 복귀)
  //
  // 예전엔 왼쪽 sticky top 을 52+adTop 으로 따로 잡아 정지 상태 높이만 맞췄는데,
  // 오른쪽은 기본값(top:56)이라 스크롤하면 오른쪽이 먼저 붙고 왼쪽은 한참 뒤에 붙어 어긋났다.
  // 좌우를 "같은 구조 · 같은 sticky 기준점"으로 만들면 보정 없이 항상 같이 움직인다.
  // 왼쪽은 오른쪽 프로모와 같은 높이를 잡기 위한 숨김 복제본. 그 위에 페이지가 포털로
  // 자기 위젯을 얹을 수 있게 절대 배치 슬롯(LEFT_RAIL_SLOT_ID)을 겹쳐 둔다 — 크기는 그대로,
  // visibility 만 다시 켜서 자식만 보이게 한다. (현재 /package 의 아제나 타일이 쓴다)
  const renderPromoSlot = (side: 'left' | 'right') => (
    <div
      ref={side === 'right' ? dockedPromoRef : undefined}
      style={{
        marginTop: `${appPromoTop}px`,
        ...(side === 'left' ? { visibility: 'hidden' as const, position: 'relative' as const } : null),
      }}
      aria-hidden={side === 'left' || undefined}
    >
      {desktopZoomActive ? (
        <div style={{ width: '160px', margin: '0 auto', zoom: AD_ZOOM_COMPENSATE }}>
          <AppSidebarPromo />
        </div>
      ) : (
        <AppSidebarPromo />
      )}
      {side === 'left' && (
        <div
          id={LEFT_RAIL_SLOT_ID}
          aria-hidden={false}
          style={{ position: 'absolute', inset: 0, visibility: 'visible' }}
        />
      )}
    </div>
  );

  // 도킹형 레일 한 칸 — 좌우가 완전히 같은 마크업이라 위치 보정이 필요 없다.
  const renderDockedRail = (side: 'left' | 'right') => (
    <div className="side-rail-sticky">
      {renderPromoSlot(side)}
      <div style={{ marginTop: `${PROMO_AD_GAP}px` }}>{renderRail(side)}</div>
    </div>
  );

  return (
    <>
      <div className="content-shell" style={layoutStyle} ref={shellRef}>
        {railsVisible && (
          <aside
            className="side-rail side-rail-left"
            style={{ paddingTop: dockedPromo ? undefined : `${adTop}px` }}
          >
            {dockedPromo ? renderDockedRail('left') : <div className="side-rail-sticky">{renderRail('left')}</div>}
          </aside>
        )}
        <main className="content-shell-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </main>
        {railsVisible && (
          <aside
            className="side-rail side-rail-right"
            style={{ paddingTop: dockedPromo ? undefined : `${adTop}px` }}
          >
            {dockedPromo ? (
              // 도킹형 — 프로모+광고를 같은 sticky 박스에 쌓음. 왼쪽도 같은 구조라 좌우가 한 몸으로 움직인다.
              renderDockedRail('right')
            ) : (
              rightRailAdVisible && <div className="side-rail-sticky">{renderRail('right')}</div>
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
    </>
  );
}
