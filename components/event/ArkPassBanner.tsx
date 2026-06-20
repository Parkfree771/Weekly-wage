'use client';

import Link from 'next/link';
import styles from './ArkPassBanner.module.css';

/**
 * 아크패스 「창공의 안내자」 세로 사이드 배너 (AdSidebar 레일 안에서 렌더).
 * 로아온 종료 후 사이드 레일을 아크패스 효율 바로가기로 교체.
 * - 배너 전체가 /arkpass 링크
 * - 이미지 위 오버레이 없이 원본 그대로, 아래 푸터에 시즌명 + CTA
 */
export default function ArkPassBanner() {
  return (
    <Link className={styles.card} href="/arkpass" aria-label="아크패스 효율 계산 바로가기">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.img}
        src="/arkpass-avatar.webp"
        alt="아크패스 창공의 안내자"
        loading="lazy"
        decoding="async"
      />

      <div className={styles.footer}>
        <div className={styles.tag}>아크패스 시즌</div>
        <div className={styles.title}>창공의 안내자</div>
        <div className={styles.cta}>
          효율 계산 바로가기
          <span className={styles.arrow} aria-hidden>→</span>
        </div>
      </div>
    </Link>
  );
}
