'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { Container, Navbar as BSNavbar, Nav, Offcanvas } from 'react-bootstrap';
import LoginButton from './auth/LoginButton';

const FEEDBACK_URL = 'https://forms.gle/n9XKQJmheLhZcSf69';
const SURVEY_URL = 'https://forms.gle/4dBKrh3kSFtazmxH7';

type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  colorClass: string; // 드롭다운 트리거 색상
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: '골드 계산',
    colorClass: 'nav-weekly',
    items: [
      { href: '/weekly-gold', label: '주간 계산' },
      { href: '/spec', label: '스펙업 계산' },
      { href: '/life-master', label: '생활 계산' },
      { href: '/package', label: '패키지 계산' },
      { href: '/hell-reward', label: '지옥 보상 계산' },
    ],
  },
  {
    label: '시뮬레이터',
    colorClass: 'nav-refining',
    items: [
      { href: '/refining', label: '재련 시뮬' },
      { href: '/hell-sim', label: '지옥 시뮬' },
      { href: '/bracelet', label: '팔찌 시뮬' },
    ],
  },
];

const NAV_STANDALONE: NavItem[] = [
  { href: '/cathedral', label: '지평의 성당', badge: 'beta' },
  { href: '/minigame', label: '랏폿을 기다리며' },
  { href: '/mypage', label: '마이페이지' },
];

// 모바일 오프캔버스용 전체 목록
const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/weekly-gold', label: '주간 계산' },
  { href: '/spec', label: '스펙업 계산' },
  { href: '/life-master', label: '생활 계산' },
  { href: '/package', label: '패키지 계산' },
  { href: '/hell-reward', label: '지옥 보상 계산' },
  { href: '/refining', label: '재련 시뮬' },
  { href: '/hell-sim', label: '지옥 시뮬' },
  { href: '/bracelet', label: '팔찌 시뮬' },
  { href: '/cathedral', label: '지평의 성당', badge: 'beta' },
  { href: '/minigame', label: '랏폿을 기다리며' },
  { href: '/mypage', label: '마이페이지' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => setShowOffcanvas(false);
  const handleShow = () => setShowOffcanvas(true);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href));
  };

  const getNavClass = (href: string) => {
    const pageClass = href === '/refining' ? 'nav-refining' :
                      href === '/spec' ? 'nav-combat' :
                      href === '/life-master' ? 'nav-life' :
                      href === '/hell-sim' ? 'nav-hell' :
                      href === '/hell-reward' ? 'nav-hell' :
                      href === '/bracelet' ? 'nav-bracelet' :
                      href === '/package' ? 'nav-package' :
                      href === '/cathedral' ? 'nav-weekly' :
                      href === '/minigame' ? 'nav-minigame' :
                      href === '/mypage' ? 'nav-mypage' : 'nav-weekly';
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
      <Container fluid style={{ maxWidth: '1400px' }}>
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
            {/* 드롭다운 그룹 */}
            {NAV_GROUPS.map((group) => (
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
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: '4px', opacity: 0.6 }}>
                    <path d="M2 4L5 7L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {openDropdown === group.label && (
                  <div className="nav-dropdown-menu">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-dropdown-item ${getNavClass(item.href)}`}
                        onClick={() => setOpenDropdown(null)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* 독립 메뉴 */}
            {NAV_STANDALONE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`navbar-nav-link ${getNavClass(item.href)}`}
              >
                {item.label}
                {item.badge && <span className="nav-badge-new">{item.badge}</span>}
              </Link>
            ))}
          </Nav>
        </div>

        {/* 모바일 버튼들 */}
        <div className="d-flex align-items-center gap-2 d-lg-none">
          <Link
            href="/"
            className="navbar-theme-toggle"
            style={{ textDecoration: 'none' }}
            aria-label="홈으로 이동"
          >
            <Image
              src="/home.webp"
              alt="홈"
              width={20}
              height={20}
              style={{ borderRadius: '4px' }}
            />
          </Link>
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
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-theme-toggle"
            aria-label="건의함"
          >
            <Image src="/icon-lightbulb.svg" alt="건의함" width={22} height={22} />
          </a>
          <a
            href={SURVEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-theme-toggle"
            aria-label="설문조사"
          >
            <Image src="/icon-assignment.svg" alt="설문조사" width={22} height={22} />
          </a>
          <Link
            href="/"
            className="navbar-theme-toggle"
            style={{ textDecoration: 'none' }}
            aria-label="홈으로 이동"
          >
            <Image
              src="/home.webp"
              alt="홈"
              width={22}
              height={22}
              style={{ borderRadius: '4px' }}
            />
          </Link>
          <button
            className="navbar-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <Image
              src={theme === 'light' ? '/icon-moon.svg' : '/icon-sun.svg'}
              alt={theme === 'light' ? 'Dark mode' : 'Light mode'}
              width={22}
              height={22}
            />
          </button>
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
            <Nav className="flex-column gap-2">
              {/* 골드 계산 그룹 */}
              <div className="navbar-offcanvas-group-label">골드 계산</div>
              {NAV_GROUPS[0].items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`navbar-offcanvas-link ${getNavClass(item.href)}`}
                  onClick={handleClose}
                >
                  {item.label}
                </Link>
              ))}

              {/* 시뮬레이터 그룹 */}
              <div className="navbar-offcanvas-group-label" style={{ marginTop: '8px' }}>시뮬레이터</div>
              {NAV_GROUPS[1].items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`navbar-offcanvas-link ${getNavClass(item.href)}`}
                  onClick={handleClose}
                >
                  {item.label}
                </Link>
              ))}

              {/* 기타 메뉴 */}
              <hr className="my-2" style={{ borderColor: 'var(--border-color)' }} />
              {NAV_STANDALONE.filter(item => item.href !== '/minigame').map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`navbar-offcanvas-link ${getNavClass(item.href)}`}
                  onClick={handleClose}
                >
                  {item.label}
                  {item.badge && <span className="nav-badge-new">{item.badge}</span>}
                </Link>
              ))}
            </Nav>
            <hr className="my-2" style={{ borderColor: 'var(--border-color)' }} />
            <Nav className="flex-column gap-2">
              <a
                href={FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-offcanvas-link nav-weekly"
                onClick={handleClose}
              >
                <Image src="/icon-lightbulb.svg" alt="" width={16} height={16} style={{ marginRight: '6px' }} />
                건의함
              </a>
              <a
                href={SURVEY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-offcanvas-link nav-weekly"
                onClick={handleClose}
              >
                <Image src="/icon-assignment.svg" alt="" width={16} height={16} style={{ marginRight: '6px' }} />
                설문조사
              </a>
            </Nav>
            <hr className="my-3" />
            <div className="d-flex justify-content-center">
              <LoginButton />
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </BSNavbar>
  );
}
