import styles from './PeonBadge.module.css';

type Props = {
  /** 페온 가치 제거 중 — 배지를 흐리게 내려 "지금은 안 치고 있다"를 보여준다 */
  off?: boolean;
  className?: string;
};

/**
 * 페온 배지 — 값에 페온이 들어 있는 구성품(젬·페온·어빌리티스톤 키트·지옥/나락/큐브 티켓·가공 젬 상자)에 붙는다.
 * 어디에 붙일지는 부모가 정한다: 배지는 absolute 라 부모가 position: relative 여야 한다.
 */
export default function PeonBadge({ off = false, className = '' }: Props) {
  return (
    <span
      className={`${styles.badge} ${off ? styles.badgeOff : ''} ${className}`}
      title={off ? '페온 가치 제거 중 — 이 구성품의 페온 몫은 0골드로 계산' : '페온 가치 포함'}
      aria-label={off ? '페온 가치 제거 중' : '페온 가치 포함'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src="/pheon.webp" alt="" className={styles.icon} />
    </span>
  );
}
