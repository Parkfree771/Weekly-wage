import styles from './PeonBadge.module.css';

type Props = {
  /** 페온 가치 제거 중 — 배지를 흐리게 내려 "지금은 안 치고 있다"를 보여준다 */
  off?: boolean;
  /** 큰 배지 — 지옥 보상 카드처럼 그림 칸이 큰 곳용 */
  large?: boolean;
  /** 흐름 안 배치 — 그림 위 스티커가 아니라 글줄(골드 숫자 옆)에 나란히 선다 */
  inline?: boolean;
  className?: string;
};

/**
 * 페온 배지 — 값에 페온이 들어 있는 구성품(젬·페온·어빌리티스톤 키트·지옥/나락/큐브 티켓·가공 젬 상자)에 붙는다.
 * 어디에 붙일지는 부모가 정한다: 배지는 absolute 라 부모가 position: relative 여야 한다.
 */
export default function PeonBadge({ off = false, large = false, inline = false, className = '' }: Props) {
  return (
    <span
      className={`${styles.badge} ${off ? styles.badgeOff : ''} ${large ? styles.badgeLarge : ''} ${inline ? styles.badgeInline : ''} ${className}`}
      title={off ? '페온 가치 제거 중 — 이 구성품의 페온 몫은 0골드로 계산' : '페온 가치 포함'}
      aria-label={off ? '페온 가치 제거 중' : '페온 가치 포함'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src="/pheon.webp" alt="" className={styles.icon} />
    </span>
  );
}
