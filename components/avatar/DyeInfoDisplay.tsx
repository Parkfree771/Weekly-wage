'use client';

import { useState, useCallback } from 'react';
import type { DyeInfo, DyePart } from '@/types/avatar';
import styles from './DyeInfoDisplay.module.css';

type Props = {
  dyeInfo: DyeInfo;
};

/** 클립보드 복사 + 피드백 */
function useCopyFeedback() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback((key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }, []);

  return { copiedKey, copy };
}

/** # 제거하여 복사값 생성 */
function stripHash(hex: string): string {
  return hex.replace(/^#/, '');
}

/** patternIcon이 객체(구 Firestore 데이터)일 수도 있고 문자열(신규)일 수도 있음 */
function getPatternIconUrl(patternIcon: any): string | null {
  if (!patternIcon) return null;
  if (typeof patternIcon === 'string') return patternIcon;
  if (typeof patternIcon === 'object' && patternIcon.iconPath) return patternIcon.iconPath;
  return null;
}

/** 컬러 카드 (기본색 or 패턴색) */
function ColorCard({
  label,
  color,
  copyKey,
  copiedKey,
  onCopy,
  children,
}: {
  label: string;
  color: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  children?: React.ReactNode;
}) {
  const isCopied = copiedKey === copyKey;

  return (
    <div className={styles.colorCard}>
      <span className={styles.colorCardLabel}>{label}</span>
      <div
        className={styles.colorSwatchLarge}
        style={{ backgroundColor: color }}
      />
      <button
        className={`${styles.hexCopyBtn} ${isCopied ? styles.hexCopied : ''}`}
        onClick={() => onCopy(copyKey, stripHash(color))}
        title="클릭하여 복사"
      >
        <span className={styles.hexCode}>{color}</span>
        <span className={styles.copyIcon}>{isCopied ? '✓' : '⧉'}</span>
      </button>
      {children}
    </div>
  );
}

function DyePartRow({ part, partIndex }: { part: DyePart; partIndex: number }) {
  const { copiedKey, copy } = useCopyFeedback();

  return (
    <div className={styles.dyePartRow}>
      <div className={styles.dyePartHeader}>
        <div className={styles.dyePartTitle}>{part.title}</div>
      </div>

      <div className={styles.colorCardsRow}>
        {/* 기본색 */}
        <ColorCard
          label="기본색"
          color={part.baseColor}
          copyKey={`base-${partIndex}`}
          copiedKey={copiedKey}
          onCopy={copy}
        >
          <div className={styles.subInfo}>
            <span className={styles.subLabel}>광택</span>
            <span className={styles.subValue}>{part.glossValue}</span>
          </div>
        </ColorCard>

        {/* 패턴색 */}
        <ColorCard
          label="패턴색"
          color={part.patternColor}
          copyKey={`pattern-${partIndex}`}
          copiedKey={copiedKey}
          onCopy={copy}
        >
          {getPatternIconUrl(part.patternIcon) && (
            <div className={styles.subInfo}>
              <span className={styles.subLabel}>패턴</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPatternIconUrl(part.patternIcon)!}
                alt="패턴"
                className={styles.patternIcon}
              />
            </div>
          )}
        </ColorCard>
      </div>

    </div>
  );
}

export default function DyeInfoDisplay({ dyeInfo }: Props) {
  return (
    <div className={styles.dyeInfoWrap}>
      {dyeInfo.parts.map((part, i) => (
        <DyePartRow key={i} part={part} partIndex={i} />
      ))}
    </div>
  );
}
