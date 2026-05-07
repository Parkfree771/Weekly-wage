'use client';

import styles from '../contest.module.css';

/**
 * 시네마틱 배경 레이어 — fixed 풀스크린.
 * 베이스 우주 → 오로라 블롭(blur+screen) → 별 필드 → 보케 라이트 →
 * 필름 그레인 노이즈(SVG) → 비네트.
 */
export default function AuroraBackground() {
  return (
    <div className={styles.auroraWrap} aria-hidden="true">
      {/* 1. 베이스 우주 그라데이션 (fixed 깔린 검은 보라/시안) */}
      <div className={styles.cosmosBase} />

      {/* 2. 오로라 블롭들 - 천천히 떠다니며 색감 만든다 */}
      <div className={`${styles.auroraBlob} ${styles.auroraBlob1}`} />
      <div className={`${styles.auroraBlob} ${styles.auroraBlob2}`} />
      <div className={`${styles.auroraBlob} ${styles.auroraBlob3}`} />
      <div className={`${styles.auroraBlob} ${styles.auroraBlob4}`} />
      <div className={`${styles.auroraBlob} ${styles.auroraBlob5}`} />

      {/* 3. 별 필드 - 다중 radial gradient + 트윙클 */}
      <div className={styles.starsLayer1} />
      <div className={styles.starsLayer2} />
      <div className={styles.starsLayer3} />

      {/* 4. 큰 보케 라이트 (정적, 블러 큼) */}
      <div className={`${styles.bokeh} ${styles.bokehGold}`} />
      <div className={`${styles.bokeh} ${styles.bokehPink}`} />
      <div className={`${styles.bokeh} ${styles.bokehCyan}`} />

      {/* 5. 필름 그레인 노이즈 (SVG fractal) */}
      <svg className={styles.noiseSvg} aria-hidden="true">
        <filter id="contestGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#contestGrain)" />
      </svg>

      {/* 6. 비네트 - 가장자리 어둠 */}
      <div className={styles.vignette} />
    </div>
  );
}
