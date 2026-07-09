'use client';

import styles from './StoreBadges.module.css';

function AppleGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
      <path d="M16.365 1.43c0 1.14-.462 2.033-1.11 2.72-.7.744-1.85 1.32-2.79 1.24-.13-1.09.45-2.24 1.09-2.95.71-.8 1.96-1.4 2.81-1.01Zm4.14 16.53c-.55 1.26-.81 1.83-1.52 2.94-.99 1.55-2.39 3.48-4.12 3.5-1.53.02-1.93-.99-4.01-.98-2.08.01-2.52.99-4.05.97-1.73-.02-3.06-1.75-4.05-3.3C-.4 16.86-.66 12 1.05 9.4c1.16-1.78 2.99-2.82 4.71-2.82 1.75 0 2.85 1 4.3 1 1.4 0 2.26-1 4.3-1 1.53 0 3.15.83 4.3 2.27-3.78 2.07-3.17 7.46 1.6 8.68-.24.65-.5 1.3-.71 1.4Z" />
    </svg>
  );
}

function PlayGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={styles.icon}>
      <path d="M3.6 2.2c-.4.2-.6.6-.6 1v17.6c0 .4.2.8.6 1l9.9-9.8L3.6 2.2Z" fill="#00d9ff" />
      <path d="M16.8 8.3l-3.3-1.9-4.6 4.6 4.6 4.6 3.3-1.9c1.4-.8 1.4-2.6 0-3.4Z" fill="#ffd900" />
      <path d="M13.5 11 3.6 2.2c.2-.1.5-.2.7-.2.3 0 .6.1.8.2L18 8.5l-4.5 2.5Z" fill="#00f076" />
      <path d="M13.5 11l4.5 2.5-12.9 7.3c-.2.1-.5.2-.8.2-.2 0-.5-.1-.7-.2L13.5 11Z" fill="#ff3a44" />
    </svg>
  );
}

type BadgeProps = {
  href: string;
  compact?: boolean;
};

// 공식 배지 스타일 — 테마와 무관하게 항상 검정 배경(애플·구글 브랜드 가이드라인 기준).
// 항상 클릭 가능한 상태로 둔다 — 실제 배포는 스토어 심사 승인 후 URL을 채워 커밋·푸시하는 시점에 이뤄지므로
// 코드 안에 "심사 중" 임시 상태를 따로 두지 않는다.
export function AppleStoreBadge({ href, compact }: BadgeProps) {
  const cls = `${styles.badge} ${compact ? styles.badgeCompact : ''}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      <AppleGlyph size={compact ? 13 : 16} />
      {compact ? (
        <span className={styles.compactMain}>App Store</span>
      ) : (
        <span className={styles.textGroup}>
          <span className={styles.sub}>Download on the</span>
          <span className={styles.main}>App Store</span>
        </span>
      )}
    </a>
  );
}

export function GooglePlayBadge({ href, compact }: BadgeProps) {
  const cls = `${styles.badge} ${compact ? styles.badgeCompact : ''}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      <PlayGlyph size={compact ? 13 : 16} />
      {compact ? (
        <span className={styles.compactMain}>Google Play</span>
      ) : (
        <span className={styles.textGroup}>
          <span className={styles.sub}>GET IT ON</span>
          <span className={styles.main}>Google Play</span>
        </span>
      )}
    </a>
  );
}
