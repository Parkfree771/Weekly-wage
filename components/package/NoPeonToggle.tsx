import styles from './NoPeonToggle.module.css';

type Props = {
  active: boolean;
  onChange: (next: boolean) => void;
  /** 작은 자리(갤러리 카드 환율 상자)용 */
  compact?: boolean;
  className?: string;
};

/**
 * 페온 가치 제거 토글 — 누르면 페온을 0골드로 친다.
 * 젬의 페온 몫, 티켓 안의 팔찌·젬 페온, 페온·어빌리티스톤 키트가 한꺼번에 빠진다.
 * 설정은 뷰어 것이라(useNoPeon) 갤러리 카드·상세·수정 폼 어디서 눌러도 같이 바뀐다.
 */
export default function NoPeonToggle({ active, onChange, compact = false, className = '' }: Props) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${active ? styles.btnActive : ''} ${compact ? styles.btnCompact : ''} ${className}`}
      onClick={(e) => { e.stopPropagation(); onChange(!active); }}
      aria-pressed={active}
      title={active
        ? '페온 가치 제거 중 — 젬·티켓·어빌리티스톤 키트의 페온 몫을 0골드로 계산 (누르면 다시 포함)'
        : '페온 가치 제거 — 젬·티켓·어빌리티스톤 키트의 페온 몫을 0골드로 계산'}
    >
      <span className={styles.iconWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src="/pheon.webp" alt="" className={styles.icon} />
      </span>
      <span className={styles.label}>{active ? '페온 제거 중' : '페온 제거'}</span>
    </button>
  );
}
