'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdPlaceholder from './AdPlaceholder';
import AdAnchorMobile from './AdAnchorMobile';
import AdUnit from './AdUnit';
import { AD_PREVIEW, AD_SLOTS } from './adConfig';
import AppSidebarPromo from '../AppSidebarPromo';

interface PageConfig {
  contentWidth: number;
  adTop: number;
}

// 각 페이지의 실제 콘텐츠 폭에 맞춤 (사이드 레일이 콘텐츠를 침범하지 않도록)
function getPageConfig(pathname: string): PageConfig {
  if (pathname === '/refining') return { contentWidth: 1400, adTop: 110 };
  if (pathname === '/weekly-gold') return { contentWidth: 1800, adTop: 110 };
  if (pathname === '/life-master') return { contentWidth: 1200, adTop: 110 };
  if (pathname === '/mypage') return { contentWidth: 1600, adTop: 130 };
  if (pathname === '/character') return { contentWidth: 1400, adTop: 90 };
  if (pathname === '/cathedral') return { contentWidth: 1200, adTop: 90 };
  if (pathname === '/cerka') return { contentWidth: 1200, adTop: 90 };
  if (pathname === '/extreme') return { contentWidth: 1200, adTop: 90 };
  if (pathname === '/bracelet') return { contentWidth: 900, adTop: 90 };
  if (pathname === '/hell-reward') return { contentWidth: 900, adTop: 90 };
  if (pathname.startsWith('/package/')) return { contentWidth: 1100, adTop: 80 };
  if (pathname === '/package') return { contentWidth: 1400, adTop: 80 };
  return { contentWidth: 1400, adTop: 60 };
}

// 양쪽 사이드바: 220px * 2 + 갭 8px * 2 = 456px
const AD_EXTRA = 456;

// 데스크톱은 globals.css에서 body zoom 0.67 (≥1024px) → 실제 레이아웃 폭 = innerWidth / 0.67.
// 레일 노출 판정에 이 배율을 반영해야 함 (안 그러면 여유 있는데도 안 뜸).
const DESKTOP_ZOOM = 0.67;

// 사이드 광고를 붙일 페이지 (요청: 메인 + 재련 시뮬)
const RAIL_PAGES = new Set(['/', '/refining']);

// 앱 다운로드 사이드바 프로모를 붙일 페이지 (광고 레일과 별개, 여유 폭 있을 때만 오른쪽 한 칸)
const APP_PROMO_PAGES = new Set(['/', '/refining', '/package', '/mypage']);

// 앱 프로모 세로 위치 — 페이지별 adTop 무시하고 상단 네비(52px) 바로 아래 고정 간격으로 통일
const APP_PROMO_TOP = 66;

// 모바일 하단 앵커 높이(px). 하단에서 올라오는 UI(차트 바텀시트 등)를 이만큼 위로 올려 겹침 방지.
// CSS 변수 --mobile-anchor-h 로 노출 → 필요한 컴포넌트가 bottom 오프셋으로 사용.
const MOBILE_ANCHOR_H = 60;

export default function AdLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { contentWidth, adTop } = getPageConfig(pathname);
  const [isMobile, setIsMobile] = useState(false);
  const [railsWide, setRailsWide] = useState(false);
  const [promoLeft, setPromoLeft] = useState<number | null>(null);

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
      const w = window.innerWidth;
      setIsMobile(w < 768);
      // 데스크톱 body zoom(0.67) 반영 → 실제 레이아웃 폭 = w / zoom
      const zoom = w >= 1024 ? DESKTOP_ZOOM : 1;
      const effective = w / zoom;
      setRailsWide(effective >= needed);
      // 앱 프로모 고정 위치 — 콘텐츠 오른쪽 끝(실제 화면 px) 바로 옆에 붙임
      const contentRightReal = zoom * (effective + contentWidth) / 2;
      setPromoLeft(contentRightReal + 10);
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [contentWidth, railsDisabled]);

  // 광고 자리 노출 조건 (미리보기/실제 공통).
  // 실제 모드에선 해당 슬롯 ID가 있어야 자리를 차지(빈 자리 방지).
  const railsVisible =
    RAIL_PAGES.has(pathname) &&
    (AD_PREVIEW || !!AD_SLOTS.sidebar) && !railsDisabled && railsWide && !isMobile;
  // 앱 다운로드 프로모 — 광고 레일이 이미 그 자리를 쓰고 있지 않을 때만, 오른쪽 한 칸
  const appPromoVisible =
    APP_PROMO_PAGES.has(pathname) && !railsDisabled && !railsVisible && railsWide && !isMobile;
  const topBannerVisible = (AD_PREVIEW || !!AD_SLOTS.topBanner) && !noAds && !isMobile;
  // 실제 앵커는 애드센스 자동광고가 처리(수동 <ins> 없음) → 미리보기에서만 자리 표시
  const showAnchor = AD_PREVIEW && !noAds && isMobile;

  // 앵커가 떠 있는 동안만 --mobile-anchor-h 설정 → 하단에서 올라오는 UI가 앵커 위로 비켜남.
  useEffect(() => {
    document.body.style.setProperty('--mobile-anchor-h', showAnchor ? `${MOBILE_ANCHOR_H}px` : '0px');
    return () => { document.body.style.removeProperty('--mobile-anchor-h'); };
  }, [showAnchor]);

  // 사이드 레일 한 칸 내용 — 표준 세로 규격 160×600(와이드 스카이스크래퍼) 고정.
  // (미리보기=placeholder, 실제=AdUnit 고정 사이즈, key로 라우트마다 갱신)
  const renderRail = () =>
    AD_PREVIEW ? (
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

  const layoutStyle: React.CSSProperties =
    railsVisible ? { maxWidth: `${contentWidth + AD_EXTRA}px` } : {};

  return (
    <>
      <div className="content-shell" style={layoutStyle}>
        {railsVisible && (
          <aside className="side-rail side-rail-left" style={{ paddingTop: `${adTop}px` }}>
            <div className="side-rail-sticky">{renderRail()}</div>
          </aside>
        )}
        <main className="content-shell-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {topBannerVisible &&
            (AD_PREVIEW ? (
              <AdPlaceholder
                label="광고 영역 · 상단 배너"
                sub="데스크톱 · 반응형 가로 (예: 970×90)"
                style={{ maxWidth: '970px', height: '90px', minHeight: '90px', margin: '0 auto 16px' }}
              />
            ) : (
              <div style={{ maxWidth: '970px', margin: '0 auto 16px' }}>
                <AdUnit
                  key={pathname}
                  slot={AD_SLOTS.topBanner}
                  format="horizontal"
                  responsive
                  style={{ minHeight: '90px' }}
                />
              </div>
            ))}
          {children}
        </main>
        {railsVisible && (
          <aside className="side-rail side-rail-right" style={{ paddingTop: `${adTop}px` }}>
            <div className="side-rail-sticky">{renderRail()}</div>
          </aside>
        )}
      </div>
      {/* 앱 다운로드 프로모 — content-shell 밖에서 position:fixed로 떠 있음.
          content-shell/main의 폭·정렬을 절대 건드리지 않음 (레이아웃과 완전히 분리).
          상단 네비(52px) 바로 아래 고정 간격, 콘텐츠 오른쪽 바로 옆(promoLeft)에 붙임 */}
      {appPromoVisible && promoLeft != null && (
        <div className="app-promo-fixed-rail" style={{ left: `${promoLeft}px`, top: `${APP_PROMO_TOP}px` }}>
          <AppSidebarPromo />
        </div>
      )}
      {showAnchor && <AdAnchorMobile />}
    </>
  );
}
