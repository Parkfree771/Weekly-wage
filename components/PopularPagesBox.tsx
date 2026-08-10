'use client';

// "인기 페이지" 바로가기 카드 — 순위 배지 + 불꽃 로티.
// 모바일 드로어(햄버거 메뉴)의 인기 섹션에서 쓴다.
// (데스크톱 왼쪽 레일에도 잠깐 있었지만 상단 네비 불꽃 배지로 대체되어 빠졌다)

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FireLottie from './FireLottie';
import styles from './PopularPagesBox.module.css';

const POPULAR_PAGES = [
  { href: '/package', label: '패키지 효율' },
  { href: '/refining', label: '재련 시뮬레이터' },
  { href: '/wangap', label: '완갑 재련 시뮬' },
  // /mypage 는 force-dynamic — 프리페치가 페이지뷰마다 서버리스 함수를 깨우므로 끔 (네비와 동일)
  { href: '/mypage', label: '숙제 체크', noPrefetch: true },
];

export default function PopularPagesBox({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className={styles.card} aria-label="인기 페이지 바로가기">
      <div className={styles.title}>
        <FireLottie size={20} className={styles.titleIcon} />
        인기 페이지
      </div>
      {POPULAR_PAGES.map((p, i) => {
        const active = pathname === p.href || pathname.startsWith(`${p.href}/`);
        return (
          <Link
            key={p.href}
            href={p.href}
            prefetch={p.noPrefetch ? false : undefined}
            className={`${styles.link} ${active ? styles.linkActive : ''}`}
            onClick={onNavigate}
          >
            <span className={`${styles.rank} ${i === 0 ? styles.rankTop : ''}`}>{i + 1}</span>
            <span className={styles.label}>{p.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
