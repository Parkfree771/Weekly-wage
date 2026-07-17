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
  ownedAmount,
  onOwnedAmountChange,
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
  ownedAmount?: number;
  onOwnedAmountChange?: (value: number) => void;
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
    <div className={`${styles.materialAmount} ${amount === 0 ? styles.materialAmountZero : ''}`} style={{ color: amount === 0 ? undefined : color }}>
      {amount.toLocaleString()}
    </div>
    {cost !== undefined && (
      <div className={styles.materialCost}>
        <Image src="/gold.webp" alt="gold" width={10} height={10} style={{ marginRight: '2px' }} />
        {Math.round(isBound ? 0 : cost).toLocaleString()}
      </div>
    )}
    {showCheckbox && (
      <div className={styles.materialCardOwnedRow}>
        <span className={styles.materialCardOwnedLabel}>보유</span>
        <input
          type="text"
          inputMode="numeric"
          value={ownedAmount || ''}
          disabled={isBound}
          onChange={(e) => onOwnedAmountChange?.(Math.max(0, Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
          className={styles.materialCardOwnedInput}
          placeholder="0"
        />
      </div>
    )}
    {tooltip && <div className={styles.materialTooltip}>{tooltip}</div>}
    {footer}
  </div>
);

export default MaterialCard;
