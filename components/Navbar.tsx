'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { Container, Navbar as BSNavbar, Nav, Offcanvas } from 'react-bootstrap';
import LoginButton from './auth/LoginButton';
import ZoomControl from './ZoomControl';
import InquiryButton from './InquiryButton';
import AppSidebarPromo from './AppSidebarPromo';
import PopularPagesBox from './PopularPagesBox';
import FireLottie from './FireLottie';

type NavItem = {
  href: string;
  label: string;
  badge?: string;
  badgeClass?: string; // 전용 배지 스타일 (미지정 시 badge 텍스트 기준 기본 스타일)
  popular?: boolean;   // 인기 페이지 — 라벨 옆에 불꽃 로티 표시 (호버 시 "인기 페이지" 툴팁)
};

type NavGroup = {
  label: string;
  items: NavItem[];
  colorClass: string; // 드롭다운 트리거 색상
  href?: string;      // 있으면 드롭다운 대신 직접 링크로 렌더
  badge?: string;     // 직접 링크용 배지
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: '골드 계산',
    colorClass: 'nav-weekly',
    items: [
      { href: '/life-master', label: '생활 제작' },
      { href: '/package', label: '패키지 효율', popular: true },
      { href: '/more-reward', label: '더보기 효율 & 레이드 보상 정리' },
      { href: '/hell-reward', label: '지옥 보상' },
    ],
  },
  {
    label: '숙제 계산',
    colorClass: 'nav-hell',
    items: [
      { href: '/weekly-gold', label: '주간 레이드' },
      { href: '/cathedral', label: '지평의 성당' },
      { href: '/cerka', label: '세르카' },
      { href: '/extreme', label: '익스트림' },
      { href: '/belgardin', label: '벨가르딘' },
    ],
  },
  {
    label: '시뮬',
    colorClass: 'nav-refining',
    items: [
      { href: '/refining', label: '재련 시뮬', popular: true },
      { href: '/wangap', label: '완갑 시뮬', popular: true },
      { href: '/bracelet', label: '팔찌 시뮬' },
      { href: '/expedition-gold', label: '원정대 수급 골드 시뮬' },
    ],
  },
  {
    label: '조회',
    colorClass: 'nav-character',
    items: [
      { href: '/character', label: '캐릭터 조회' },
      { href: '/engraving', label: '직업별 각인' },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    setShowOffcanvas(false);
    setOpenMobileGroup(null);
  };
  const handleShow = () => setShowOffcanvas(true);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href));
  };

  // 그룹 내 첫 배지 항목을 그룹 헤더에도 노출 (텍스트·전용 스타일 그대로)
  const getGroupBadge = (group: NavGroup) => {
    return group.items.find(item => item.badge);
  };

  // 항목 전용 스타일(badgeClass) 우선, 없으면 BETA 전용 / 기본(NEW 등) 스타일
  const badgeClass = (badge: string, custom?: string) =>
    custom ?? (badge === 'BETA' ? 'nav-badge-beta' : 'nav-badge-new');

  const getNavClass = (href: string) => {
    const pageClass = href === '/refining' ? 'nav-refining' :
                      href === '/wangap' ? 'nav-refining' :
                      href === '/expedition-gold' ? 'nav-refining' :
                      href === '/life-master' ? 'nav-life' :
                      href === '/hell-reward' ? 'nav-hell' :
                      href === '/bracelet' ? 'nav-bracelet' :
                      href === '/package' ? 'nav-package' :
                      href === '/cathedral' ? 'nav-weekly' :
                      href === '/cerka' ? 'nav-weekly' :
                      href === '/extreme' ? 'nav-extreme' :
                      href === '/character' ? 'nav-character' :
                      href === '/engraving' ? 'nav-character' : 'nav-weekly';
    const activeClass = isActive(href) ? 'active' : '';
    return `${pageClass} ${activeClass}`.trim();
  };

  // 드롭다운 열기/닫기 (호버)
  const handleDropdownEnter = (label: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setOpenDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-dropdown-wrapper')) {
        setOpenDropdown(null);
      }
      if (!target.closest('.settings-dropdown-wrapper')) {
        setShowSettings(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <BSNavbar
      expand="lg"
      className="main-navbar"
      fixed="top"
    >
      <Container fluid style={{ maxWidth: '1400px', padding: '0 12px' }}>
        {/* 로고 + 데스크톱 메뉴 */}
        <div className="d-flex align-items-center">
          <Link href="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
            <Image
              src="/icon.png"
              alt="로아로골"
              width={32}
              height={32}
              style={{ borderRadius: '6px' }}
            />
            <span className="navbar-brand-text">로아로골</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <Nav className="d-none d-lg-flex align-items-center gap-2 ms-4">
            {/* 드롭다운 그룹 + 직접 링크(href 있는 그룹) */}
            {NAV_GROUPS.map((group) => (
              group.href ? (
                <Link
                  key={group.label}
                  href={group.href}
                  className={`navbar-nav-link ${group.colorClass} ${isActive(group.href) ? 'active' : ''}`}
                >
                  {group.label}
                  {group.badge && <span className={badgeClass(group.badge)}>{group.badge}</span>}
                </Link>
              ) : (
              <div
                key={group.label}
                className="nav-dropdown-wrapper"
                onMouseEnter={() => handleDropdownEnter(group.label)}
                onMouseLeave={handleDropdownLeave}
                style={{ position: 'relative' }}
              >
                <button
                  className={`navbar-nav-link ${group.colorClass} ${isGroupActive(group) ? 'active' : ''}`}
                  onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                  style={{ cursor: 'pointer' }}
                >
                  {group.label}
                  {(() => { const b = getGroupBadge(group); return b?.badge ? <span className={badgeClass(b.badge, b.badgeClass)}>{b.badge}</span> : null; })()}
                  {/* 그룹 안에 인기 페이지가 있으면 헤더에도 불꽃 — 펼치기 전에도 보이게 */}
                  {group.items.some((i) => i.popular) && (
                    <FireLottie size={15} title="인기 페이지" className="ms-1" />
                  )}
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: '4px', opacity: 0.6 }}>
                    <path d="M2 4L5 7L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div
                  className="nav-dropdown-menu"
                  style={{ display: openDropdown === group.label ? 'block' : 'none' }}
                >
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-dropdown-item ${getNavClass(item.href)}`}
                      onClick={() => setOpenDropdown(null)}
                    >
                      {item.label}
                      {item.badge && <span className={badgeClass(item.badge, item.badgeClass)}>{item.badge}</span>}
                      {item.popular && <FireLottie size={14} title="인기 페이지" className="ms-1" />}
                    </Link>
                  ))}
                </div>
              </div>
              )
            ))}
          </Nav>
        </div>

        {/* 모바일 버튼들 — 문의하기·홈은 메뉴(계정 섹션)·로고와 중복이라 제거, 다크모드만 유지 */}
        <div className="d-flex align-items-center gap-2 d-lg-none">
          <button
            className="navbar-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <Image
              src={theme === 'light' ? '/icon-moon.svg' : '/icon-sun.svg'}
              alt={theme === 'light' ? 'Dark mode' : 'Light mode'}
              width={20}
              height={20}
            />
          </button>
          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={handleShow}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        {/* 데스크톱 테마 토글 + 홈버튼 + 로그인 */}
        <div className="d-none d-lg-flex align-items-center gap-2">
          <Link
            href="/app"
            className="navbar-feedback-btn navbar-app-btn"
          >
            앱 다운로드
          </Link>
          {/* prefetch 끔: /mypage 는 force-dynamic 이라 프리페치 응답이 CDN 에 안 얹힌다.
              네비는 모든 페이지에 뜨므로 켜두면 페이지뷰마다 서버리스 함수가 한 번씩 깨어난다. */}
          <Link
            href="/mypage"
            className="navbar-feedback-btn navbar-app-btn"
            prefetch={false}
          >
            숙제 체크
            <FireLottie size={14} title="인기 페이지" className="ms-1" />
          </Link>
          <div
            className="nav-dropdown-wrapper settings-dropdown-wrapper"
            style={{ position: 'relative' }}
          >
            <button
              type="button"
              className="navbar-theme-toggle"
              onClick={() => setShowSettings(v => !v)}
              aria-label="설정"
              aria-expanded={showSettings}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
                <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
              </svg>
            </button>

            <div
              className="nav-dropdown-menu settings-dropdown-menu"
              style={{ display: showSettings ? 'flex' : 'none' }}
            >
              <InquiryButton className="nav-dropdown-item settings-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" />
                  <path d="M3 7l9 6l9 -6" />
                </svg>
                <span>문의하기</span>
              </InquiryButton>

              <Link
                href="/"
                className="nav-dropdown-item settings-menu-item"
                onClick={() => setShowSettings(false)}
              >
                <Image src="/home.webp" alt="" width={18} height={18} style={{ borderRadius: '4px' }} />
                <span>홈</span>
              </Link>

              <Link
                href="/guide"
                className="nav-dropdown-item settings-menu-item"
                onClick={() => setShowSettings(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                  <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                  <path d="M3 6l0 13" />
                  <path d="M12 6l0 13" />
                  <path d="M21 6l0 13" />
                </svg>
                <span>가이드</span>
              </Link>

              <button
                type="button"
                className="nav-dropdown-item settings-menu-item"
                onClick={toggleTheme}
              >
                <Image
                  src={theme === 'light' ? '/icon-moon.svg' : '/icon-sun.svg'}
                  alt=""
                  width={18}
                  height={18}
                />
                <span>{theme === 'light' ? '다크모드' : '라이트모드'}</span>
              </button>

              <div className="settings-menu-divider" />

              <div className="settings-menu-zoom-row">
                <ZoomControl withLabel />
              </div>
            </div>
          </div>

          <LoginButton />
        </div>

        {/* 모바일 Offcanvas 메뉴 */}
        <Offcanvas
          show={showOffcanvas}
          onHide={handleClose}
          placement="end"
          className="navbar-offcanvas"
        >
          <Offcanvas.Header closeButton className="navbar-offcanvas-header">
            <Offcanvas.Title>
              <div className="d-flex align-items-center gap-2">
                <Image
                  src="/icon.png"
                  alt="로아로골"
                  width={28}
                  height={28}
                  style={{ borderRadius: '6px' }}
                />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>로아로골</span>
              </div>
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="navbar-offcanvas-body">
            {/* ── 메뉴 ── */}
            <div className="navbar-offcanvas-group-label">메뉴</div>
            <Nav className="flex-column gap-2">
              {NAV_GROUPS.map((group) => (
                group.href ? (
                  <Link
                    key={group.label}
                    href={group.href}
                    className={`navbar-offcanvas-link ${group.colorClass} ${isActive(group.href) ? 'active' : ''}`}
                    onClick={handleClose}
                  >
                    {group.label}
                    {group.badge && <span className={badgeClass(group.badge)}>{group.badge}</span>}
                  </Link>
                ) : (
                <div key={group.label} className="navbar-offcanvas-group">
                  <button
                    type="button"
                    className={`navbar-offcanvas-trigger ${isGroupActive(group) ? 'active' : ''}`}
                    onClick={() =>
                      setOpenMobileGroup(
                        openMobileGroup === group.label ? null : group.label,
                      )
                    }
                    aria-expanded={openMobileGroup === group.label}
                  >
                    <span className="navbar-offcanvas-trigger-label">
                      {group.label}
                      {(() => { const b = getGroupBadge(group); return b?.badge ? <span className={badgeClass(b.badge, b.badgeClass)}>{b.badge}</span> : null; })()}
                    </span>
                    <svg
                      className={`navbar-offcanvas-chevron ${openMobileGroup === group.label ? 'open' : ''}`}
                      width="14"
                      height="14"
                      viewBox="0 0 10 10"
                      aria-hidden
                    >
                      <path
                        d="M2 4L5 7L8 4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {openMobileGroup === group.label && (
                    <div className="navbar-offcanvas-submenu">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`navbar-offcanvas-link navbar-offcanvas-subitem ${getNavClass(item.href)}`}
                          onClick={handleClose}
                        >
                          {item.label}
                          {item.badge && <span className={badgeClass(item.badge, item.badgeClass)}>{item.badge}</span>}
                          {item.popular && <FireLottie size={15} title="인기 페이지" className="ms-1" />}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                )
              ))}
            </Nav>
            {/* ── 인기 페이지 — 순위 배지 + 불꽃 카드 (링크를 누르면 드로어를 닫는다) ── */}
            <div className="navbar-offcanvas-section">
              <PopularPagesBox onNavigate={handleClose} />
            </div>

            {/* ── 숙제 체크·문의하기 + Google/Apple 로그인 — 2×2 같은 크기 버튼 ── */}
            <div className="navbar-offcanvas-section">
              <div className="d-flex gap-2">
                {/* 위 데스크톱 버튼과 같은 이유로 prefetch 끔 (오프캔버스가 열리면 링크가 보여 프리페치가 돈다) */}
                <Link
                  href="/mypage"
                  className="navbar-feedback-btn navbar-app-btn flex-fill text-center py-2"
                  onClick={handleClose}
                  prefetch={false}
                >
                  숙제 체크
                </Link>
                <InquiryButton className="navbar-feedback-btn navbar-app-btn flex-fill text-center py-2">
                  문의하기
                </InquiryButton>
              </div>
              {/* 비로그인 시 Google/Apple 반반 분할 — 위 숙제 체크·문의하기 줄과 같은 한 줄 채움 */}
              <div className="d-flex justify-content-center mt-2">
                <LoginButton variant="split" />
              </div>
            </div>

            {/* ── 로아로골 앱 — 데스크톱 사이드바 프로모와 동일 디자인 (구글/iOS 배지) ── */}
            <div className="navbar-offcanvas-section">
              <AppSidebarPromo />
            </div>

            {/* 드로어 광고 제거(2026-07-28) — 드로어 가용 폭이 248px(280 - Body 패딩 32)인데
                애드핏 최소 규격이 320px 이라 잘린다. 넣으려면 드로어를 352px 로 넓혀야 해서
                메뉴 UX 를 광고에 맞추는 꼴이 되고, 메뉴를 연 사용자만 보는 저노출 자리라 뺐다. */}
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </BSNavbar>
  );
}
