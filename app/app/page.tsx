'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app-download-config';
import { AppleStoreBadge, GooglePlayBadge } from '@/components/StoreBadges';
import styles from './app.module.css';

type Feature = {
  name: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    name: '재련 강화 시뮬레이션',
    desc: '실제 확률로 미리 강화하고 비용까지 계산',
    href: '/refining',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M4 20L20 4M14 4h6v6" /></svg>
    ),
  },
  {
    name: '패키지 효율 계산',
    desc: '패키지를 골드 가치로 환산해 비교',
    href: '/package',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5-9 5-9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></svg>
    ),
  },
  {
    name: '주간 레이드 체크리스트',
    desc: '원정대 숙제를 캐릭터별로 관리',
    href: '/weekly-gold',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
    ),
  },
  {
    name: '골드 수익 기록',
    desc: '원정대가 번 골드를 주·월·년 그래프로',
    href: '/mypage',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M4 20V10M12 20V4M20 20v-7" /></svg>
    ),
  },
  {
    name: '숙제 완료 달력',
    desc: '날짜별 완료 기록을 한눈에',
    href: '/weekly-gold',
    icon: (
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
    ),
  },
  {
    name: '장비·악세·각인 조회',
    desc: '캐릭터 세팅 전체를 한 화면에서',
    href: '/character',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /></svg>
    ),
  },
  {
    name: '캐릭터 검색',
    desc: '아이템 레벨·전투력·아크 그리드까지',
    href: '/character',
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" /></svg>
    ),
  },
  {
    name: '아이템 시세 차트',
    desc: '평균가·최저가·최고가까지 표시',
    href: '/',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
    ),
  },
];

const SCREENSHOTS = [
  { file: 'shot-01-refining.png', alt: '재련 강화 시뮬레이션 화면' },
  { file: 'shot-02-package.png', alt: '패키지 효율 계산 화면' },
  { file: 'shot-03-weekly.png', alt: '주간 레이드 체크리스트 화면' },
  { file: 'shot-04-income.png', alt: '골드 수익 기록 화면' },
  { file: 'shot-05-calendar.png', alt: '숙제 완료 달력 화면' },
  { file: 'shot-06-equipment.png', alt: '장비·악세·각인 조회 화면' },
  { file: 'shot-07-character.png', alt: '캐릭터 검색 화면' },
  { file: 'shot-08-price.png', alt: '아이템 시세 차트 화면' },
];


export default function AppDownloadPage() {
  const shotStripRef = useRef<HTMLDivElement>(null);

  // 마우스 휠(세로 스크롤)을 스크린샷 스트립의 가로 스크롤로 변환 — 데스크톱 마우스는 기본적으로 가로 스크롤 입력이 없음
  useEffect(() => {
    const el = shotStripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className={styles.page}>
      {/* 히어로 */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroIconRow}>
            <Image src="/icon.png" alt="로아로골 앱 아이콘" width={56} height={56} className={styles.heroIcon} />
            <div>
              <div className={styles.heroName}>로아로골</div>
              <div className={styles.heroTagline}>로스트아크 시세 · 재련 시뮬 · 숙제 관리</div>
            </div>
          </div>
          <h1 className={styles.heroTitle}>
            <strong>J들은</strong><br />이런 거 좋아함
          </h1>
          <p className={styles.heroDesc}>
            숙제 체크, 골드 기록, 실시간 시세까지 자동으로 착착 정리됩니다.
            정리는 앱이 할 테니, 플레이는 당신이 하세요.
          </p>
          <div className={styles.storeRow}>
            <AppleStoreBadge href={APP_STORE_URL} />
            <GooglePlayBadge href={PLAY_STORE_URL} />
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.qrBox}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" shapeRendering="crispEdges">
              <path fill="#ffffff" d="M0 0h27v27H0z" />
              <path stroke="#1a1f36" d="M1 1.5h7m2 0h5m2 0h1m1 0h7M1 2.5h1m5 0h1m3 0h1m2 0h1m1 0h1m2 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h3m3 0h1m1 0h1m1 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h2m1 0h4m3 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h1m5 0h1m3 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m1 0h2m2 0h2m1 0h1m2 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h5m2 0h2M1 9.5h1m1 0h5m3 0h1m2 0h1m4 0h5M2 10.5h1m7 0h1m1 0h3m2 0h1m2 0h1m3 0h1M1 11.5h4m2 0h3m1 0h1m1 0h6m3 0h1m1 0h2M1 12.5h1m2 0h1m1 0h1m1 0h1m2 0h3m1 0h1m1 0h2m1 0h2m3 0h1M1 13.5h1m1 0h1m3 0h1m2 0h2m1 0h3m2 0h2m1 0h1m1 0h3M1 14.5h1m2 0h1m1 0h1m4 0h1m5 0h1m2 0h1m1 0h1m1 0h1M1 15.5h1m5 0h2m1 0h1m1 0h2m2 0h2m1 0h4m1 0h2M1 16.5h1m6 0h2m2 0h1m2 0h1m1 0h5m3 0h1M1 17.5h1m1 0h1m1 0h1m1 0h3m1 0h2m1 0h8m1 0h1M9 18.5h3m1 0h1m1 0h3m3 0h2M1 19.5h7m2 0h1m6 0h1m1 0h1m1 0h1m1 0h3M1 20.5h1m5 0h1m1 0h1m1 0h1m1 0h1m3 0h1m3 0h2m1 0h1M1 21.5h1m1 0h3m1 0h1m1 0h3m1 0h9m1 0h3M1 22.5h1m1 0h3m1 0h1m1 0h3m3 0h1m1 0h3m1 0h5M1 23.5h1m1 0h3m1 0h1m1 0h1m1 0h3m3 0h1m4 0h2m1 0h1M1 24.5h1m5 0h1m2 0h3m3 0h3m1 0h3m2 0h1M1 25.5h7m1 0h2m1 0h2m5 0h7" />
            </svg>
          </div>
          <span className={styles.qrLabel}>QR 스캔으로 바로 열기</span>
        </div>
      </section>

      {/* 스크린샷 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>앱 미리보기</h2>
        <div className={styles.shotStrip} ref={shotStripRef}>
          {SCREENSHOTS.map((s) => (
            <div key={s.file} className={styles.shotCard}>
              <Image src={`/app-preview/${s.file}`} alt={s.alt} width={480} height={1040} sizes="190px" />
            </div>
          ))}
        </div>
      </section>

      {/* 기능 목록 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>주요 기능</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <Link key={f.name} href={f.href} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <div>
                <div className={styles.featureName}>{f.name}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 하단 CTA */}
      <section className={styles.footerCta}>
        <div className={styles.footerCtaTitle}>지금 받고, 숙제는 앱에게 맡기세요</div>
        <div className={styles.storeRow}>
          <AppleStoreBadge href={APP_STORE_URL} />
          <GooglePlayBadge href={PLAY_STORE_URL} />
        </div>
      </section>
    </div>
  );
}
