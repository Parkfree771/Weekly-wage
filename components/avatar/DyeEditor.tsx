'use client';

import { useState, useCallback } from 'react';
import type { DyePart, DyeInfo } from '@/types/avatar';
import styles from './DyeEditor.module.css';

type Props = {
  dyeInfo: DyeInfo;
  editable: boolean;          // true면 저장 가능 (본인 게시물)
  onSave?: (parts: DyePart[]) => void;
};

export default function DyeEditor({ dyeInfo, editable, onSave }: Props) {
  const [parts, setParts] = useState<DyePart[]>(
    () => JSON.parse(JSON.stringify(dyeInfo.parts)), // deep copy
  );
  const [isEditing, setIsEditing] = useState(false);
  const [originalParts] = useState<DyePart[]>(
    () => JSON.parse(JSON.stringify(dyeInfo.parts)),
  );

  const updatePart = useCallback((index: number, field: string, value: any) => {
    setParts((prev) => {
      const next = [...prev];
      const part = { ...next[index] };

      if (field === 'baseColor' || field === 'patternColor' || field === 'glossValue') {
        (part as any)[field] = value;
      } else if (field.startsWith('hsv.')) {
        const hsvKey = field.split('.')[1] as 'h' | 's' | 'v';
        part.patternHSV = { ...part.patternHSV, [hsvKey]: value };
      }

      next[index] = part;
      return next;
    });
  }, []);

  const handleReset = () => {
    setParts(JSON.parse(JSON.stringify(originalParts)));
  };

  const handleSave = () => {
    onSave?.(parts);
    setIsEditing(false);
  };

  const handleCopyHex = (part: DyePart) => {
    const text = `기본색: ${part.baseColor} | 광택: ${part.glossValue} | 패턴색: ${part.patternColor} | HSV: ${part.patternHSV.h.toFixed(2)}/${part.patternHSV.s.toFixed(2)}/${part.patternHSV.v.toFixed(2)}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={styles.editorWrap}>
      <div className={styles.editorHeader}>
        <h5 className={styles.editorTitle}>염색 편집기</h5>
        <div className={styles.editorActions}>
          {!isEditing ? (
            <button
              className={styles.editBtn}
              onClick={() => setIsEditing(true)}
            >
              색상 편집
            </button>
          ) : (
            <>
              <button className={styles.resetBtn} onClick={handleReset}>
                원본 되돌리기
              </button>
              {editable && (
                <button className={styles.saveBtn} onClick={handleSave}>
                  저장
                </button>
              )}
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  handleReset();
                  setIsEditing(false);
                }}
              >
                닫기
              </button>
            </>
          )}
        </div>
      </div>

      {parts.map((part, i) => (
        <div key={i} className={styles.dyePartSection}>
          <div className={styles.dyePartTitleRow}>
            <span className={styles.dyePartTitle}>{part.title}</span>
            <button
              className={styles.copyBtn}
              onClick={() => handleCopyHex(part)}
              title="염색 코드 복사"
            >
              복사
            </button>
          </div>

          {/* 기본색 */}
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>기본색</span>
            <div className={styles.colorControls}>
              <input
                type="color"
                className={styles.colorInput}
                value={part.baseColor}
                disabled={!isEditing}
                onChange={(e) => updatePart(i, 'baseColor', e.target.value)}
              />
              <input
                type="text"
                className={styles.hexInput}
                value={part.baseColor}
                disabled={!isEditing}
                onChange={(e) => updatePart(i, 'baseColor', e.target.value)}
                maxLength={7}
              />
            </div>
          </div>

          {/* 광택 */}
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>광택</span>
            <div className={styles.sliderWrap}>
              <input
                type="range"
                className={styles.slider}
                min={0}
                max={100}
                value={parseInt(part.glossValue) || 0}
                disabled={!isEditing}
                onChange={(e) => updatePart(i, 'glossValue', `${e.target.value}%`)}
              />
              <span className={styles.sliderValue}>{part.glossValue}</span>
            </div>
          </div>

          {/* 패턴색 */}
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>패턴색</span>
            <div className={styles.colorControls}>
              <input
                type="color"
                className={styles.colorInput}
                value={part.patternColor}
                disabled={!isEditing}
                onChange={(e) => updatePart(i, 'patternColor', e.target.value)}
              />
              <input
                type="text"
                className={styles.hexInput}
                value={part.patternColor}
                disabled={!isEditing}
                onChange={(e) => updatePart(i, 'patternColor', e.target.value)}
                maxLength={7}
              />
            </div>
          </div>

          {/* 패턴 아이콘 */}
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>패턴</span>
            {(part.patternIcon as any) ? (
              <img
                src={typeof part.patternIcon === 'object' && (part.patternIcon as any)?.iconPath ? (part.patternIcon as any).iconPath : (part.patternIcon as string)}
                alt="패턴"
                className={styles.patternIcon}
              />
            ) : (
              <span className={styles.noPattern}>패턴 없음</span>
            )}
          </div>

          {/* 패턴 HSV */}
          <div className={styles.hsvGroup}>
            <span className={styles.colorLabel}>패턴 HSV</span>
            {(['h', 's', 'v'] as const).map((key) => (
              <div key={key} className={styles.hsvRow}>
                <span className={styles.hsvLabel}>
                  {key === 'h' ? '색조(H)' : key === 's' ? '채도(S)' : '명도(V)'}
                </span>
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={1}
                  step={0.01}
                  value={part.patternHSV[key]}
                  disabled={!isEditing}
                  onChange={(e) =>
                    updatePart(i, `hsv.${key}`, parseFloat(e.target.value))
                  }
                />
                <span className={styles.sliderValue}>
                  {part.patternHSV[key].toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* 미리보기 */}
          <div className={styles.colorPreview}>
            <div
              className={styles.previewBase}
              style={{ backgroundColor: part.baseColor }}
            />
            <div
              className={styles.previewPattern}
              style={{ backgroundColor: part.patternColor, opacity: 0.4 }}
            />
            <div
              className={styles.previewGloss}
              style={{
                background: `linear-gradient(to bottom, rgba(255,255,255,${
                  parseInt(part.glossValue) / 200
                }), transparent)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
