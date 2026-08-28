'use client';

// 재료 카드 컴포넌트 — 재련 평균 시뮬(RefiningCalculator)과 완갑 평균 시뮬이 공용.
// 스타일은 RefiningCalculator.module.css를 그대로 사용해 두 계산기의 UI를 동일하게 유지한다.

import { Form } from 'react-bootstrap';
import Image from 'next/image';
import styles from './RefiningCalculator.module.css';

const MaterialCard = ({
  icon,
  name,
  amount,
  color = 'var(--brand-primary)',
  cost,
  isBound,
  onBoundChange,
  showCheckbox,
  style: customStyle,
  // New props for additional materials
  showEnableToggle,
  isEnabled,
  onToggleEnabled,
  renderToggle,
  footer,
  tooltip,
  reserveCostSpace,
  saved,
  owned,
  onOwnedChange,
}: {
  icon: string;
  name: string;
  amount: number;
  color?: string;
  cost?: number;
  isBound?: boolean;
  onBoundChange?: (name: string, isBound: boolean) => void;
  showCheckbox?: boolean;
  style?: React.CSSProperties;
  showEnableToggle?: boolean;
  isEnabled?: boolean;
  onToggleEnabled?: () => void;
  renderToggle?: React.ReactNode;
  footer?: React.ReactNode;
  tooltip?: React.ReactNode;
  /** 골드 환산이 없는 재료(실링 등)도 같은 줄의 다른 카드와 내부 높이를 맞추려면 true */
  reserveCostSpace?: boolean;
  /** 특수 재련으로 아낀 수량 — 주면 수량 아래에 "원래값 → −절약" 줄이 붙는다 */
  saved?: number;
  /** 보유 개수 — onOwnedChange와 함께 주면 "보유" 입력칸이 붙는다.
      비용(cost)은 호출부가 부족분(필요량−보유) 기준으로 계산해 넘긴다 */
  owned?: number;
  onOwnedChange?: (value: number) => void;
}) => (
  <div
    className={`${styles.materialCard} ${showEnableToggle && !isEnabled ? styles.materialCardDisabled : ''} ${showEnableToggle && isEnabled && !isBound ? styles.materialCardEnabled : ''} ${isBound ? styles.materialCardBound : ''}`}
    style={{
      '--hover-color': color,
      ...customStyle,
    } as React.CSSProperties}
  >
    {showEnableToggle && (renderToggle ?? (
       <Form.Check
        type="switch"
        id={`enable-switch-${name}`}
        checked={isEnabled}
        onChange={onToggleEnabled}
        className={`${styles.materialCardEnableSwitch} refining-checkbox`}
        onClick={(e) => e.stopPropagation()}
      />
    ))}
    {showCheckbox && (
      <div className={styles.materialCardBoundToggle} onClick={() => onBoundChange?.(name, !isBound)}>
        <svg
          viewBox="0 0 24 24"
          className={`${styles.materialCardBoundCheckMark} ${isBound ? styles.materialCardBoundCheckMarkActive : ''}`}
        >
          <polyline points="4 12 10 18 20 6" />
        </svg>
        <span className={`${styles.materialCardBoundLabel} ${isBound ? styles.materialCardBoundLabelActive : ''}`}>
          귀속
        </span>
      </div>
    )}
    <div className={styles.materialIcon}>
      {icon.startsWith('/') ? (
        <Image
          src={icon}
          alt={name}
          fill
          sizes="40px"
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{icon}</span>
      )}
    </div>
    <div className={styles.materialName}>
      {name}
    </div>
    {/* 특재 절약이 있으면 "원래값(취소선) → 실제 소모" 한 줄로, 없으면 수량만 */}
    <div
      className={`${styles.materialAmount} ${amount === 0 ? styles.materialAmountZero : ''} ${saved ? styles.materialAmountSaved : ''}`}
      style={{ color: amount === 0 ? undefined : color }}
      title={saved ? `특수 재련 적용: 원래 ${(amount + saved).toLocaleString()}개 → ${amount.toLocaleString()}개 (${saved.toLocaleString()}개 절약)` : undefined}
    >
      {saved ? (
        <>
          <span className={styles.materialAmountBefore}>{(amount + saved).toLocaleString()}</span>
          <span className={styles.materialAmountArrow} aria-hidden="true">→</span>
        </>
      ) : null}
      <span>{amount.toLocaleString()}</span>
    </div>
    {saved !== undefined && saved > 0 && (
      <div className={styles.materialSaved}>
        <Image src="/special-refine-stone.webp" alt="특수 재련" width={12} height={12} className={styles.materialSavedIcon} />
        <span className={styles.materialSavedDelta}>{saved.toLocaleString()}개 절약</span>
      </div>
    )}
    {onOwnedChange && (
      <div className={styles.materialOwnedRow} onClick={(e) => e.stopPropagation()}>
        <span className={styles.materialOwnedLabel}>보유</span>
        <input
          type="text"
          inputMode="numeric"
          className={styles.materialOwnedInput}
          // 값 길이만큼만 차지 — 카드 한 줄을 통째로 먹지 않는다
          style={{ width: `${Math.max(3.5, (owned ? owned.toLocaleString().length : 1) + 1)}ch` }}
          value={owned ? owned.toLocaleString() : ''}
          placeholder="0"
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
            onOwnedChange(Number.isFinite(n) ? Math.min(n, 99_999_999) : 0);
          }}
          aria-label={`${name} 보유 개수`}
        />
      </div>
    )}
    {cost !== undefined ? (
      <div className={styles.materialCost}>
        <Image src="/gold.webp" alt="gold" width={10} height={10} style={{ marginRight: '2px' }} />
        {Math.round(isBound ? 0 : cost).toLocaleString()}
      </div>
    ) : reserveCostSpace ? (
      // 골드 환산이 없는 재료 — 빈 자리만 차지시켜 같은 줄 카드와 내부 정렬을 맞춘다
      <div className={styles.materialCost} aria-hidden="true" style={{ visibility: 'hidden' }}>
        <Image src="/gold.webp" alt="" width={10} height={10} style={{ marginRight: '2px' }} />
        0
      </div>
    ) : null}
    {tooltip && <div className={styles.materialTooltip}>{tooltip}</div>}
    {/* footer(성장 토글·숨결 컨트롤 등)는 카드 하단에 고정 — 같은 줄의 다른 카드와 내용 라인이 맞는다 */}
    {footer && <div className={styles.materialCardFooter}>{footer}</div>}
  </div>
);

export default MaterialCard;
