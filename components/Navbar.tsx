'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { Container, Navbar as BSNavbar, Nav, Offcanvas } from 'react-bootstrap';
import LoginButton from './auth/LoginButton';

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/weekly-gold', label: '주간 계산' },
  { href: '/refining', label: '재련 계산' },
  { href: '/life-master', label: '생활 계산' },
  { href: '/mypage', label: '마이페이지' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  const handleClose = () => setShowOffcanvas(false);
  const handleShow = () => setShowOffcanvas(true);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const getNavClass = (href: string) => {
    const pageClass = href === '/refining' ? 'nav-refining' :
                      href === '/life-master' ? 'nav-life' :
                      href === '/mypage' ? 'nav-mypage' : 'nav-weekly';
    const activeClass = isActive(href) ? 'active' : '';
    return `${pageClass} ${activeClass}`.trim();
  };

  return (
    <BSNavbar
      expand="md"
      className="main-navbar"
      fixed="top"
    >
      <Container fluid style={{ maxWidth: '1400px' }}>
        {/* 로고 + 데스크톱 메뉴 (왼쪽 정렬) */}
        <div className="d-flex align-items-center">
          <Link href="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
            <Image
              src="/icon.png"
              alt="로골로골"
              width={32}
              height={32}
              style={{ borderRadius: '6px' }}
            />
            <span className="navbar-brand-text">로골로골</span>
          </Link>

          {/* 데스크톱 메뉴 - 로고 바로 옆 */}
          <Nav className="d-none d-md-flex align-items-center gap-2 ms-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`navbar-nav-link ${getNavClass(item.href)}`}
              >
                {item.label}
              </Link>
            ))}
          </Nav>
        </div>

        {/* 모바일 버튼들 */}
        <div className="d-flex align-items-center gap-2 d-md-none">
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
        <div className="d-none d-md-flex align-items-center gap-2">
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
                  alt="로골로골"
                  width={28}
                  height={28}
                  style={{ borderRadius: '6px' }}
                />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>로골로골</span>
              </div>
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="navbar-offcanvas-body">
            <Nav className="flex-column gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`navbar-offcanvas-link ${getNavClass(item.href)}`}
                  onClick={handleClose}
                >
                  {item.label}
                </Link>
              ))}
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
