'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app-download-config';
import { AppleStoreBadge, GooglePlayBadge } from '@/components/StoreBadges';
import { SITE_URL } from '@/lib/site-config';
import styles from './app.module.css';

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
  const [copied, setCopied] = useState(false);

  // 공유 — 모바일은 시스템 공유 시트, 그 외는 링크 복사
  const shareApp = async () => {
    const url = `${SITE_URL}/app`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '로아로골 앱', url });
        return;
      } catch {
        return; // 공유 시트 취소
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드 접근 불가 환경은 무시
    }
  };

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
            숙제 체크 · 골드 기록 · 실시간 시세 · 패키지 효율 · 재련 시뮬까지, 한 앱에서.
          </p>
          <div className={styles.storeRow}>
            <AppleStoreBadge href={APP_STORE_URL} />
            <GooglePlayBadge href={PLAY_STORE_URL} />
          </div>
          <button type="button" className={styles.shareBtn} onClick={shareApp}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
            {copied ? '링크 복사 완료' : '공유하기'}
          </button>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.qrBox}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" shapeRendering="crispEdges">
              <path fill="#ffffff" d="M0 0h27v27H0z" />
              <path stroke="#1a1f36" d="M1 1.5h7m2 0h2m1 0h4m2 0h7M1 2.5h1m5 0h1m1 0h1m1 0h2m3 0h1m2 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m3 0h3m2 0h1m2 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m2 0h2m1 0h1m1 0h1m3 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h1m6 0h2m1 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m2 0h4m2 0h1m2 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 8.5h3m1 0h2M1 9.5h1m1 0h1m1 0h1m1 0h1m2 0h3m1 0h4m3 0h1m2 0h1M1 10.5h1m1 0h2m5 0h1m6 0h3m5 0h1M4 11.5h1m1 0h2m1 0h1m1 0h4m3 0h1m2 0h1m1 0h3M1 12.5h1m3 0h1m6 0h4m1 0h1m1 0h1m1 0h1m2 0h1M1 13.5h1m5 0h5m2 0h1m1 0h4m2 0h1m1 0h2M2 14.5h1m2 0h1m3 0h1m2 0h1m1 0h1m2 0h3m2 0h1m2 0h1M1 15.5h1m2 0h1m1 0h2m2 0h2m7 0h2m2 0h3M2 16.5h1m1 0h2m4 0h3m1 0h1m2 0h1m3 0h1m2 0h1M1 17.5h1m1 0h2m2 0h2m4 0h2m2 0h6M9 18.5h2m1 0h2m2 0h2m3 0h2m1 0h2M1 19.5h7m3 0h3m2 0h2m1 0h1m1 0h2m1 0h2M1 20.5h1m5 0h1m2 0h2m1 0h2m2 0h1m3 0h2m1 0h2M1 21.5h1m1 0h3m1 0h1m1 0h1m1 0h2m2 0h1m1 0h6m1 0h2M1 22.5h1m1 0h3m1 0h1m3 0h2m4 0h1m2 0h4M1 23.5h1m1 0h3m1 0h1m1 0h3m2 0h1m1 0h1m4 0h1m3 0h1M1 24.5h1m5 0h1m2 0h3m3 0h2m1 0h1m1 0h2m1 0h1M1 25.5h7m1 0h1m1 0h1m1 0h1m2 0h2m1 0h2m3 0h2" />
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

    </div>
  );
}
