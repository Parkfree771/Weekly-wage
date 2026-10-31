'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdSenseUnit from './AdSenseUnit';
import { AD_PREVIEW, ADSENSE_SLOTS, AD_SIZES } from './adConfig';
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
  // adTop 300 = "카테고리" 상자 상단과 나란히 — Container mt-md-3(16) + 맨 위 시장 요약 띠(MarketHero)·간격.
  // 2026-10-30 실측(내비 하단 → 카테고리 상자 상단 255px ÷ body zoom 0.85 — 띠 min-height 268 + 위아래 간격). 예전 212 는 그 자리에
  // "오늘의 시세" 카드 줄이 있던 시절 값이다. 띠 높이를 바꾸면 이 값도 다시 잰다.
  // body zoom 적용 전 논리 px라 zoom 배율과 무관하게 유효.
  // 2026-10-27: 사이드 앱 프로모 제거로 도킹형(appPromoTop)을 빼고 adTop 으로 바로 세운다 —
  // 도킹형일 땐 광고가 프로모 높이(약 166px)+간격 아래로 밀려 카테고리보다 조금 낮았다.
  if (pathname === '/') return { contentWidth: 1400, adTop: 300 };
  // adTop 200 = "검색창" 상자 상단과 나란히(직접 요청으로 기존 110에서 크게 내림).
  // appPromoTop 0 = 도킹 모드로 전환 — 왼쪽 인기 페이지 박스·오른쪽 앱 프로모를 레일 위에 얹고
  // 광고는 그 아래로. (예전엔 튜닝값이 없어 광고가 뜨면 프로모를 아예 숨겼다)
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 200, appPromoTop: 0 };
  // adTop 409 = "완갑 강화" 박스(시뮬레이터 stageCol) 상단과 나란히(왼쪽 광고 기준).
  // appPromoTop 148 = 그 위 "장비 선택" 패널 상단과 나란히. 오른쪽 광고는 프로모 아래
  // 실측 간격(dockedAdMarginTop)으로 왼쪽 광고와 정확히 같은 높이에 맞춰짐.
  if (pathname === '/wangap') return { contentWidth: 1400, adTop: 409, appPromoTop: 148 };
  // contentWidth 1240 = 페이지 컨테이너 최대 폭. adTop 250 = 제목·검색창을 지나 첫 구역 상단 부근.
  if (pathname === '/raid-gold') return { contentWidth: 1240, adTop: 250 };
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
  // adTop 280 = 기존(90)보다 큰 폭으로 내려서 실제 계산기 상자 상단과 맞춤.
  if (pathname === '/hell-reward') return { contentWidth: 900, adTop: 280 };
  if (pathname.startsWith('/package/')) return { contentWidth: 1100, adTop: 80 };
  // adTop 290 = 갤러리 카드 첫 줄 상단(269) 기준에서 살짝 더 내림(왼쪽 광고 기준).
  // appPromoTop 8 = 레일 맨 위 가까이 — 오른쪽 광고가 왼쪽과 정확히 같은 높이가 되도록 실측 보정.
  if (pathname === '/package') return { contentWidth: 1400, adTop: 290, appPromoTop: 8 };
  // /engraving 은 자체 사이드바(유각 겹침 순위 + 정정 요청, 250px)를 본문 폭 안쪽 칸으로 들여
  // 쓴다(page.module.css 의 .results 2칸 그리드). 그래서 본문 덩어리 = .wrap 1406px 이 전부이고
  // 바깥으로 삐져나오는 게 없다 → main 이 1406 만 품으면 레일과 절대 안 겹친다.
  //   main = contentWidth + AD_EXTRA(456) − 레일 실점유((220+26)×2 = 492) = contentWidth − 36
  //   → contentWidth ≥ 1442. 여유 8px 을 얹어 1450.
  // 사이드바를 다시 본문 바깥 절대배치로 되돌리면 그만큼(250×2) 더 키워야 한다 — 레일 노출 기준이
  // innerWidth 1620px 에서 1824px 로 올라가고, 본문이 왼쪽으로 치우쳐 보인다. 되돌리지 말 것.
  // adTop 400 = 검색·필터·각인 칩 목록을 지나 결과 그리드(.results) 상단 — 페이지 자체 사이드바와 같은 높이.
  if (pathname === '/engraving') return { contentWidth: 1450, adTop: 400 };
  return { contentWidth: 1400, adTop: 60 };
}

// 양쪽 사이드바: 220px * 2 + 갭 8px * 2 = 456px
const AD_EXTRA = 456;

// 넓은 화면 레일 — 300×600 칸(역보정 후 body 좌표 약 353px)에 여백을 둔 380px.
// 380*2 + 8*2 = 776. 본문 폭 = contentWidth + EXTRA − (레일+26)*2 = contentWidth − 36 으로 좁은 레일과 같다 —
// 페이지별 contentWidth(직업 각인 1450 등)를 레일 폭마다 따로 맞출 필요가 없다.
// 기준 폭: 1400 + 776 = 2176(body 좌표) → 창 폭 약 1,850px 이상(1920 모니터)에서 넓은 레일, 그 아래는 160×600.
const RAIL_WIDE_W = 380;
const AD_EXTRA_WIDE = RAIL_WIDE_W * 2 + 16;

// 데스크톱은 globals.css에서 body zoom 0.85 (≥1024px) → 실제 레이아웃 폭 = innerWidth / 0.85.
// 레일 노출 판정에 이 배율을 반영해야 함 (안 그러면 여유 있는데도 안 뜸).
// 2026-07-15: body zoom을 0.67→0.85로 고정하면서 이 값도 같이 갱신.
const DESKTOP_ZOOM = 0.85;

// 광고 슬롯 zoom 역보정 배율 — 광고 네트워크는 광고 요소의 "실제 렌더링 픽셀 크기"로 규격(160×600)을
// 인식하므로, body zoom(0.85)에 그대로 맡기면 136×510처럼 줄어든 채 렌더돼 표준 규격 미달로
// 처리될 위험이 있음. 광고를 담는 컨테이너에 1/zoom을 곱해 실제 화면 px를 선언한 값 그대로 복원
// — 페이지 다른 요소보다 조금 커 보이지만 광고 쪽에선 정확한 규격.
const AD_ZOOM_COMPENSATE = 1 / DESKTOP_ZOOM;

// 데스크톱 광고는 사이드 레일이 전부 — 상단 배너·모바일 하단 앵커는 제거됨.
// 모바일은 앱(AdMob)과 동일한 본문 인-콘텐츠(AdBanner)만 사용, 앵커 광고 금지.
// 사이드 광고를 붙일 페이지 — 캐릭터 조회(자체 사이드바), 패키지 등록·수정(폼 화면, railsDisabled에서
// 별도 제외)만 빼고 대부분 페이지에 적용.
// 이 목록에 없는 페이지는 데스크톱에서 광고가 아예 없다.
// /engraving 은 자체 사이드바가 좌우 여백을 다 써서 빠져 있었다 — 2026-09-21 에 유각 겹침 순위를
// 정정 요청 위로 옮겨 오른쪽 한 칸으로 합치고, 레일은 그 바깥에 서도록 contentWidth 를 잡아 합류했다.
// /extreme 은 3막·종막 출시 전 "COMING SOON" 화면이라 빠져 있었다(제작 중 화면 광고 금지 정책) —
// 2026-09-18 GM노트로 난이도별 보상·칭호·제작소가 공개돼 본문을 채우면서 다시 넣었다.
const RAIL_PAGES = new Set([
  '/', '/refining', '/wangap', '/package',
  '/raid-gold', '/life-master', '/mypage',
  '/cathedral', '/cerka', '/belgardin', '/hell-reward',
  '/extreme', '/engraving',
]);
// 패키지 상세(/package/[postId])는 동적 라우트라 위 Set에 못 넣으므로 startsWith로 별도 포함
// (등록·수정은 railsDisabled가 이미 따로 걸러냄). 아제나의 축복(/package/azena-blessing)도 여기 걸린다.
// 2026-09-15 에 유저 글 상세를 "얇은 화면"으로 보고 잠깐 뺐다가 09-16 에 되돌렸다 — 구성품 가치 비중 등
// 계산 결과가 본문이라 얇은 화면이 아니다.
function isRailPage(pathname: string): boolean {
  return RAIL_PAGES.has(pathname) || pathname.startsWith('/package/');
}

// 레일 위쪽에 앱 프로모 칸(도킹형)을 두던 페이지. 2026-10-27 사이드 앱 프로모는 없앴지만
// 이 페이지들의 광고 높이(appPromoTop + 프로모 높이 + 간격)는 그 칸 기준으로 맞춰져 있어,
// 프로모를 보이지 않는 자리 채움으로만 남긴다(아래 renderPromoSlot). 왼쪽 자리 채움 위에는
// /package 의 아제나 타일이 포털로 얹힌다.
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
  // 레일 단계 — none: 레일 없음 / narrow: 160×600 / wide: 300×600
  const [railTier, setRailTier] = useState<'none' | 'narrow' | 'wide'>('none');
  const railsWide = railTier !== 'none';
  const wideRail = railTier === 'wide';
  // body zoom(0.85)이 실제로 걸리는 폭(≥1024px)인지 — 광고 슬롯 zoom 역보정 적용 여부에 사용.
  // isMobile(<768px) 기준과 달라서 별도로 추적(768~1023px 구간엔 zoom이 아예 안 걸림).
  const [desktopZoomActive, setDesktopZoomActive] = useState(false);

  // 사이드 레일 비활성 — 등록/수정 폼 화면.
  const railsDisabled =
    pathname === '/package/register' || pathname.startsWith('/package/edit');

  useEffect(() => {
    // 콘텐츠 폭 + 레일이 들어갈 만큼 넓은 뷰포트에서만 레일 노출 (콘텐츠 침범 방지)
    const needed = contentWidth + AD_EXTRA; // 양쪽 레일까지 들어갈 폭 (body 좌표)
    const neededWide = contentWidth + AD_EXTRA_WIDE; // 300×600 레일까지 들어갈 폭
    const check = () => {
      // 사이트 보기 배율(html zoom) 반영 — 배율 Z만큼 레이아웃 뷰포트가 innerWidth/Z로 줄어들고,
      // 그 안에서 기존 body zoom(0.85) 좌표계가 그대로 동작하므로 w만 보정하면 이하 계산이 전부 유지됨
      const w = window.innerWidth / getSiteZoom();
      setIsMobile(w < 768);
      setDesktopZoomActive(w >= 1024);
      // 데스크톱 body zoom(0.85) 반영 → 실제 레이아웃 폭 = w / zoom
      const zoom = w >= 1024 ? DESKTOP_ZOOM : 1;
      const effective = w / zoom;
      setRailTier(effective >= neededWide ? 'wide' : effective >= needed ? 'narrow' : 'none');
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
    (AD_PREVIEW || !!ADSENSE_SLOTS.rail) &&
    !railsDisabled && railsWide && !isMobile;
  const rightRailAdVisible = railsVisible;
  // 도킹형 — 레일 위쪽에 (보이지 않는) 프로모 칸을 두고 그 아래 광고. appPromoTop 이 지정된 페이지만.
  const dockedPromo =
    APP_PROMO_PAGES.has(pathname) && railsVisible && promoTunedForRail;

  // 도킹형 레일에서 프로모 아래 광고까지의 간격(px).
  // 좌우가 같은 마크업이라 이 값이 양쪽에 똑같이 걸린다 → 실측 보정이 필요 없다.
  // 광고 세로 위치를 조정하고 싶으면 페이지별 appPromoTop(getPageConfig)을 움직이면 된다.
  const PROMO_AD_GAP = 24;

  // 사이드 레일 한 칸 내용 — 넓은 화면은 300×600(하프페이지), 그 아래는 160×600(와이드 스카이스크래퍼).
  // key로 라우트·크기마다 갱신. 실제 화면 px가 규격 그대로 나오도록 zoom 역보정 래퍼로 감쌈(위 AD_ZOOM_COMPENSATE 참고).
  // 애드센스는 같은 단위를 좌우에 함께 넣어도 둘 다 채운다.
  const renderRail = (side: 'left' | 'right') => {
    const size = wideRail ? AD_SIZES.railWide : AD_SIZES.rail;
    const ad = (
      <AdSenseUnit
        key={`${pathname}-${size.width}`}
        slot={ADSENSE_SLOTS.rail}
        size={size}
        label={`사이드 ${side === 'left' ? '좌' : '우'}${wideRail ? ' (300×600)' : ''}`}
      />
    );
    if (!desktopZoomActive) return ad;
    return (
      <div style={{ width: `${size.width}px`, height: `${size.height}px`, margin: '0 auto', zoom: AD_ZOOM_COMPENSATE }}>
        {ad}
      </div>
    );
  };

  const layoutStyle: React.CSSProperties =
    railsVisible ? { maxWidth: `${contentWidth + (wideRail ? AD_EXTRA_WIDE : AD_EXTRA)}px` } : {};
  // 넓은 레일은 칸 폭도 넓힌다(기본 220px 은 globals.css .side-rail)
  const railWidthStyle: React.CSSProperties = wideRail ? { width: `${RAIL_WIDE_W}px` } : {};

  // 도킹형 프로모 칸 — 좌우 모두 보이지 않는 자리 채움이다(사이드 앱 프로모는 2026-10-27 제거).
  // 좌우가 같은 높이라 광고가 양쪽에서 같은 높이에 선다. 왼쪽에는 페이지가 포털로
  // 자기 위젯을 얹을 수 있게 절대 배치 슬롯(LEFT_RAIL_SLOT_ID)을 겹쳐 둔다 — 크기는 그대로,
  // visibility 만 다시 켜서 자식만 보이게 한다. (현재 /package 의 아제나 타일이 쓴다)
  const renderPromoSlot = (side: 'left' | 'right') => (
    <div
      style={{ marginTop: `${appPromoTop}px`, visibility: 'hidden', position: 'relative' }}
      aria-hidden
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
  // 레일은 스크롤을 따라오지 않는다(.side-rail-sticky 미사용) — 애드센스는 따라오는 광고를
  // 화면에 하나만, 좌우 대칭 없이 허용한다. 양쪽 레일을 sticky 로 되돌리지 말 것.
  const renderDockedRail = (side: 'left' | 'right') => (
    <div>
      {renderPromoSlot(side)}
      <div style={{ marginTop: `${PROMO_AD_GAP}px` }}>{renderRail(side)}</div>
    </div>
  );

  return (
    <>
      <div className="content-shell" style={layoutStyle}>
        {railsVisible && (
          <aside
            className="side-rail side-rail-left"
            style={{ ...railWidthStyle, paddingTop: dockedPromo ? undefined : `${adTop}px` }}
          >
            {dockedPromo ? renderDockedRail('left') : <div>{renderRail('left')}</div>}
          </aside>
        )}
        <main className="content-shell-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {children}
        </main>
        {railsVisible && (
          <aside
            className="side-rail side-rail-right"
            style={{ ...railWidthStyle, paddingTop: dockedPromo ? undefined : `${adTop}px` }}
          >
            {dockedPromo ? (
              renderDockedRail('right')
            ) : (
              rightRailAdVisible && <div>{renderRail('right')}</div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
