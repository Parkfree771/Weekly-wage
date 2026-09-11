'use client';

import styles from '@/app/package/package.module.css';

type Props = {
  active: boolean;
  onChange: (next: boolean) => void;
  className?: string;
};

/**
 * 페온 가치 제거 — 컨트롤 바/상세 헤더의 "계산 기준" 버튼.
 * 최저가 버튼과 같은 성격(이 화면 전체의 계산 기준)이라 같은 껍데기(.liveBtn)를 그대로 입는다.
 * 값은 뷰어 설정(useNoPeon)이라 갤러리·상세·지옥 보상 계산기가 한 값을 같이 본다 —
 * 여기서 끄면 구성품의 젬·페온 키트뿐 아니라 지옥/나락/큐브 티켓 안의 페온 몫까지 0골드가 된다.
 */
export default function PeonBasisButton({ active, onChange, className = '' }: Props) {
  return (
    <button
      type="button"
      className={`${styles.liveBtn} ${styles.peonBtn} ${active ? styles.peonBtnOn : ''} ${className}`}
      onClick={() => onChange(!active)}
      aria-pressed={active}
      aria-label={active ? '페온 가치 제거 중 — 누르면 다시 포함' : '페온 가치 제거'}
    >
      <span className={styles.peonIconWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src="/pheon.webp" alt="" className={styles.peonIcon} />
      </span>
      <span className={styles.peonLabel}>페온 제거</span>
      <i className={styles.liveDot} />
      <span className={styles.basisTip} aria-hidden="true">
        <strong className={styles.basisTipHead}>
          {active ? '페온 가치 제거 중' : '페온 가치 포함 중'}
        </strong>
        {active
          ? '젬·티켓·어빌리티스톤 키트의 페온 몫을 0골드로 계산 중입니다. 누르면 다시 포함합니다.'
          : '누르면 젬·티켓·어빌리티스톤 키트의 페온 몫을 0골드로 칩니다.'}
      </span>
    </button>
  );
}
