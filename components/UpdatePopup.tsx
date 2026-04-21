'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './UpdatePopup.module.css';

const POPUP_KEY = 'extreme_popup_dismissed_until';

export default function UpdatePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(POPUP_KEY);
    if (dismissed && Date.now() < Number(dismissed)) return;
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => setShow(false);

  const handleDismiss3Days = () => {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem(POPUP_KEY, String(Date.now() + threeDays));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        {/* 배경 이미지 */}
        <div className={styles.imageWrapper}>
          <Image
            src="/dlrtmxmfla.webp"
            alt="익스트림 레이드"
            fill
            sizes="420px"
            className={styles.bgImage}
            loading="lazy"
          />
          <div className={styles.imageOverlay} />
          <div className={styles.imageContent}>
            <div className={styles.updateBadge}>NEW</div>
            <h2 className={styles.title}>익스트림 레이드</h2>
            <p className={styles.subtitle}>4/22 수요일 오전 10시 오픈</p>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className={styles.previewArea}>
          <div className={styles.featureList}>
            <Link href="/title-stats" className={styles.featureItem} onClick={handleClose}>
              <div className={styles.featureText}>
                <strong>명예의 전당 · 전투력 통계</strong>
                <span>칭호 획득자 실시간 통계 · 선봉 10공대 랭킹</span>
              </div>
              <div className={styles.featureIcons}>
                <Image src="/extreme-fire.webp" alt="홍염의 군주" width={34} height={34} />
                <Image src="/extreme-ice.webp" alt="혹한의 군주" width={34} height={34} />
              </div>
            </Link>
            <Link href="/extreme" className={styles.featureItem} onClick={handleClose}>
              <div className={styles.featureText}>
                <strong>익스트림 레이드 보상 정리</strong>
                <span>난이도별 골드·토큰·최초 클리어 보상</span>
              </div>
              <div className={styles.featureIcons}>
                <Image src="/gold.webp" alt="골드" width={18} height={18} />
                <Image src="/legendary-cardpack.webp" alt="전설카드" width={22} height={22} />
                <Image src="/xhzms.webp" alt="토큰" width={22} height={22} />
              </div>
            </Link>
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className={styles.footer}>
          <button className={styles.dismissBtn} onClick={handleDismiss3Days}>
            3일간 다시 보지 않기
          </button>
          <button className={styles.closeBtn} onClick={handleClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
