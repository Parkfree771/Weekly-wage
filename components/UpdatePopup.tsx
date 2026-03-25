'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './UpdatePopup.module.css';

export default function UpdatePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('popup_dismissed_until');
    if (dismissed && Date.now() < Number(dismissed)) return;
    // LCP/CLS 방지: 메인 콘텐츠 렌더링 후 팝업 표시
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => setShow(false);

  const handleDismissWeek = () => {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('popup_dismissed_until', String(Date.now() + oneWeek));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        {/* 배경 이미지 */}
        <div className={styles.imageWrapper}>
          <Image
            src="/wlvuddmltjdekd2.webp"
            alt="지평의 성당"
            fill
            sizes="400px"
            className={styles.bgImage}
            loading="lazy"
          />
          <div className={styles.imageOverlay} />
          <div className={styles.imageContent}>
            <div className={styles.updateBadge}>NEW</div>
            <h2 className={styles.title}>주간 교환 달력</h2>
            <p className={styles.subtitle}>은총의 파편, 언제 뭘 교환할 수 있을까?</p>
          </div>
        </div>

        {/* 주차 타임라인 */}
        <div className={styles.previewArea}>
          <div className={styles.timeline}>
            {[1, 2, 3].map(w => (
              <div key={w} className={styles.tlDot}>
                <div className={styles.tlDotCircle} />
                <span className={styles.tlDotLabel}>{w}주</span>
              </div>
            ))}
            <div className={styles.tlDotDots}>⋯</div>
            <div className={`${styles.tlDot} ${styles.tlDotHighlight}`}>
              <div className={styles.tlDotCircleGold} />
              <span className={styles.tlDotLabel}>4주</span>
            </div>
          </div>
          <div className={styles.previewHero}>
            <div className={styles.previewHeroIcon}>
              <Image src="/rheozhdj.webp" alt="고대 코어" width={52} height={52} unoptimized />
            </div>
            <div className={styles.previewHeroInfo}>
              <span className={styles.previewHeroName}>
                <span className={styles.gradeAncient}>고대</span> 코어 랜덤 상자
              </span>
              <span className={styles.previewHeroCost}>
                <Image src="/dmschddmlvkvus.webp" alt="" width={16} height={16} unoptimized />
                <strong>400</strong>개 필요
              </span>
            </div>
            <span className={styles.previewHeroWeek}>4주차~</span>
          </div>
          <p className={styles.previewDesc}>
            레벨·더보기별 주차 계산 + 교환 체크 기능
          </p>
          <Link href="/cathedral" className={styles.ctaLink} onClick={handleClose}>
            교환 달력 확인하기 →
          </Link>
        </div>

        {/* 하단 닫기 */}
        <div className={styles.footer}>
          <button className={styles.dismissBtn} onClick={handleDismissWeek}>
            일주일동안 보지 않기
          </button>
          <button className={styles.closeBtn} onClick={handleClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
