'use client';

// 이번 주 예상 골드 — 유통/귀속 비율 바. 레벨 개념 없이 항상 꽉 찬 바를 두 색으로 나눈다.
//   왼쪽(골드색) = 유통 골드 / 오른쪽(자홍) = 귀속 골드
// 더보기 비용을 귀속에서 우선 차감하는 계산 특성상 유통이 음수가 될 수 있어, 폭 계산은 0으로 클램프한다.
import NextImage from 'next/image';
import styles from './LevelBar.module.css';

type Props = {
  free: number;
  bound: number;
  className?: string;
  /** 지정하면 바 전체가 버튼이 된다 (골드 기록 차트 열기) */
  onClick?: () => void;
  /** 버튼일 때 열림 상태 — aria-expanded 용 */
  expanded?: boolean;
  /** 아이콘·합계를 바 위로 올린 납작 배치 */
  compact?: boolean;
};

export default function GoldSplitBar({ free, bound, className, onClick, expanded, compact }: Props) {
  const f = Math.max(0, free);
  const b = Math.max(0, bound);
  const sum = f + b;
  const freePct = sum > 0 ? (f / sum) * 100 : 0;
  const boundPct = sum > 0 ? (b / sum) * 100 : 0;

  // 조각이 너무 좁으면 숫자가 안 들어가므로 그 조각의 숫자는 감춘다
  const showFree = freePct >= 22;
  const showBound = boundPct >= 22;

  const body = (
    <>
      <div className={styles.track}>
        {sum === 0 ? (
          <div className={styles.emptyBar}>기록 없음</div>
        ) : (
          <div className={styles.splitRow}>
            <div className={`${styles.splitSeg} ${styles.segFree}`} style={{ width: `${freePct}%` }}>
              {showFree && <span className={styles.barTxt}>{free.toLocaleString()}</span>}
            </div>
            <div className={`${styles.splitSeg} ${styles.segBound}`} style={{ width: `${boundPct}%` }}>
              {showBound && <span className={styles.barTxt}>{bound.toLocaleString()}</span>}
            </div>
          </div>
        )}
      </div>

      {/* 합계 — 바 오른쪽에 동전 + 총합. 바는 "비율", 여기는 "얼마" 를 맡는다 */}
      <div className={styles.goldTotal}>
        <NextImage src="/gold.webp" alt="" width={18} height={18} style={{ borderRadius: '4px' }} />
        <span className={styles.goldTotalNum}>{(free + bound).toLocaleString()}</span>
      </div>
    </>
  );

  const title = `이번 주 예상 — 유통 ${free.toLocaleString()}G · 귀속 ${bound.toLocaleString()}G`;
  const cls = `${styles.row} ${compact ? styles.compact : ''} ${className || ''}`;
  if (!onClick) return <div className={cls} title={title}>{body}</div>;

  return (
    <button
      type="button"
      className={`${cls} ${styles.rowButton}`}
      onClick={onClick}
      aria-expanded={expanded}
      title={`${title} — 눌러서 골드 기록 차트 보기`}
    >
      {body}
    </button>
  );
}
