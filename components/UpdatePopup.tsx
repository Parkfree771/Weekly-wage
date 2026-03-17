'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './UpdatePopup.module.css';

export default function UpdatePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  const handleClose = () => setShow(false);


  if (!show) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        {/* 배경 이미지 */}
        <div className={styles.imageWrapper}>
          <Image
            src="/wlvuddmltjdekd1.webp"
            alt="지평의 성당"
            fill
            className={styles.bgImage}
            priority
          />
          <div className={styles.imageOverlay} />
          <div className={styles.imageContent}>
            <div className={styles.updateBadge}>COMING SOON</div>
            <h2 className={styles.title}>지평의 성당</h2>
            <p className={styles.subtitle}>3월 18일 오전 10시 업데이트 예정</p>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className={styles.buttonArea}>
          <Link href="/weekly-gold" className={styles.navButton} onClick={handleClose}>
            <Image src="/gold.webp" alt="" width={24} height={24} />
            <div className={styles.navText}>
              <span className={styles.navTitle}>주간 골드 계산</span>
              <span className={styles.navDesc}>지평의 성당 보상, 더보기 효율 확인</span>
            </div>
          </Link>
          <Link href="/cathedral" className={styles.navButton} onClick={handleClose}>
            <Image src="/dmschddmlvkvus.webp" alt="" width={24} height={24} />
            <div className={styles.navText}>
              <span className={styles.navTitle}>지평의 성당 <span className={styles.newBadge}>BETA</span></span>
              <span className={styles.navDesc}>은총의 파편 교환 상점 확인</span>
            </div>
          </Link>
          <Link href="/mypage" className={styles.navButton} onClick={handleClose}>
            <Image src="/top-destiny-destruction-stone5.webp" alt="" width={24} height={24} />
            <div className={styles.navText}>
              <span className={styles.navTitle}>마이페이지</span>
              <span className={styles.navDesc}>1750 신규 일일 컨텐츠 수급량 확인</span>
            </div>
          </Link>
        </div>

        {/* 하단 닫기 */}
        <div className={styles.footer}>
          <button className={styles.closeBtn} onClick={handleClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
