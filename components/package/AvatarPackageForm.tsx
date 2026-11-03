'use client';

// 아바타 패키지 등록/수정 폼.
// 효율 계산이 없는 글이라 구성품·환율 입력이 없다 — 이름·가격(원)·캡쳐 이미지·판매 기간만 받는다.
// 이미지는 브라우저에서 WebP 로 줄여 Firebase Storage 에 바로 올린다(lib/avatar-image).

import { useEffect, useRef, useState } from 'react';
import type { PackagePost, PackageEventTheme, StoredImage } from '@/types/package';
import { fromSaleStartDateValue, fromSaleEndDateValue, toDateOnlyValue } from '@/lib/package-sale';
import { MAX_SOURCE_BYTES } from '@/lib/avatar-image';
import styles from '@/app/package/package.module.css';
import av from './Avatar.module.css';

export type AvatarFormInitial = {
  title: string;
  price: number;
  image: StoredImage | null;
  isNewRelease: boolean;
  eventTheme: PackageEventTheme | null;
  saleStartInput: string;
  saleEndInput: string;
  saleClosed: boolean;
};

export type AvatarFormSubmitData = {
  title: string;
  price: number;
  /** 새로 고른 파일 — 없으면 기존 이미지 유지 */
  newImageFile: File | null;
  isNewRelease: boolean;
  eventTheme: PackageEventTheme | null;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  saleClosed: boolean;
};

export function postToAvatarFormInitial(post: PackagePost): AvatarFormInitial {
  return {
    title: post.title,
    price: post.royalCrystalPrice || 0,
    image: post.avatarImage ?? null,
    isNewRelease: !!post.isNewRelease,
    eventTheme: post.eventTheme ?? null,
    saleStartInput: toDateOnlyValue(post.saleStartAt),
    saleEndInput: toDateOnlyValue(post.saleEndAt),
    saleClosed: !!post.saleClosed,
  };
}

type Props = {
  mode: 'register' | 'edit';
  initial?: AvatarFormInitial;
  onSubmit: (data: AvatarFormSubmitData) => Promise<void>;
};

export default function AvatarPackageForm({ mode, initial, onSubmit }: Props) {
  const isEdit = mode === 'edit';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [price, setPrice] = useState<number>(initial?.price ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image?.url ?? null);
  const [isNewRelease, setIsNewRelease] = useState(initial?.isNewRelease ?? false);
  const [eventTheme, setEventTheme] = useState<PackageEventTheme | null>(initial?.eventTheme ?? null);
  const [saleStartInput, setSaleStartInput] = useState(initial?.saleStartInput ?? '');
  const [saleEndInput, setSaleEndInput] = useState(initial?.saleEndInput ?? '');
  const [saleClosed, setSaleClosed] = useState(initial?.saleClosed ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 고른 파일 미리보기 — 바꾸거나 떠날 때 object URL 을 풀어 준다
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErrors((p) => ({ ...p, image: '이미지 파일만 올릴 수 있습니다.' })); return; }
    if (f.size > MAX_SOURCE_BYTES) { setErrors((p) => ({ ...p, image: '이미지가 너무 큽니다 (20MB 이하).' })); return; }
    setFile(f);
    setErrors((p) => { const n = { ...p }; delete n.image; return n; });
  };

  // 캡쳐를 바로 붙여넣기(Ctrl+V) — 게임에서 찍고 곧장 붙이는 흐름
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const f = item.getAsFile();
      if (f) { e.preventDefault(); pickFile(f); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = '패키지 이름을 입력해주세요.';
    if (price <= 0) next.price = '가격을 입력해주세요.';
    if (!file && !initial?.image) next.image = '캡쳐 이미지를 올려주세요.';
    const saleStartAt = fromSaleStartDateValue(saleStartInput);
    const saleEndAt = fromSaleEndDateValue(saleEndInput);
    if (saleStartAt && saleEndAt && saleEndAt.getTime() <= saleStartAt.getTime()) {
      next.salePeriod = '판매 종료일은 시작일보다 뒤여야 합니다.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: title.trim(),
        price,
        newImageFile: file,
        isNewRelease,
        eventTheme,
        saleStartAt,
        saleEndAt,
        saleClosed,
      });
    } catch (err) {
      console.error(isEdit ? '수정 실패:' : '등록 실패:', err);
      setError(err instanceof Error && err.message ? err.message : '저장에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={av.formWrap}>
      <div className={av.formGrid}>
        {/* 왼쪽: 캡쳐 */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>캡쳐 이미지 *</h2>
          <button
            type="button"
            className={`${av.dropZone} ${errors.image ? av.dropZoneError : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="미리보기" className={av.dropPreview} />
            ) : (
              <span className={av.dropHint}>
                눌러서 이미지 선택
                <small>끌어다 놓기 · Ctrl+V 붙여넣기도 됩니다</small>
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          {preview && (
            <p className={av.formNote}>
              {file ? '저장할 때 WebP 로 줄여서 올립니다.' : '이미지를 바꾸려면 위를 누르세요.'}
            </p>
          )}
          {errors.image && <p className={styles.fieldErrorMsg}>{errors.image}</p>}
        </div>

        {/* 오른쪽: 정보 */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>패키지 정보</h2>
          <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
            <label className={styles.formLabel} htmlFor="av-title">패키지 이름 *</label>
            <input
              id="av-title"
              type="text"
              className={`${styles.formInput} ${errors.title ? styles.formInputError : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026 겨울 아바타 패키지"
              maxLength={50}
            />
            {errors.title && <p className={styles.fieldErrorMsg}>{errors.title}</p>}
          </div>
          <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
            <label className={styles.formLabel} htmlFor="av-price">가격 *</label>
            <div className={styles.priceInputWrap}>
              <input
                id="av-price"
                type="number"
                className={`${styles.formInput} ${errors.price ? styles.formInputError : ''}`}
                value={price || ''}
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                placeholder="예: 33000"
                min={0}
                inputMode="numeric"
              />
              <span className={styles.priceUnit}>원</span>
            </div>
            {errors.price && <p className={styles.fieldErrorMsg}>{errors.price}</p>}
          </div>
          <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
            <label className={styles.formLabel}>판매 기간 (선택)</label>
            <div className={styles.salePeriodGrid}>
              <span className={styles.salePeriodKey}>시작 (오전 10시)</span>
              <input type="date" className={styles.salePeriodInput} value={saleStartInput}
                onChange={(e) => setSaleStartInput(e.target.value)} aria-label="판매 시작일 (오전 10시 시작)" />
              <span className={styles.salePeriodKey}>종료 (오전 6시)</span>
              <input type="date" className={styles.salePeriodInput} value={saleEndInput}
                onChange={(e) => setSaleEndInput(e.target.value)} aria-label="판매 종료일 (오전 6시 종료)" />
            </div>
            {isEdit && (
              <label className={styles.saleClosedToggle}>
                <input type="checkbox" checked={saleClosed} onChange={(e) => setSaleClosed(e.target.checked)} />
                판매 종료 처리 (기간과 무관하게 즉시 종료로 표시)
              </label>
            )}
            {errors.salePeriod && <p className={styles.fieldErrorMsg}>{errors.salePeriod}</p>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={isNewRelease} onChange={(e) => setIsNewRelease(e.target.checked)} />
              신규 출시 패키지 (갤러리에 30일간 NEW 배지)
            </label>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={eventTheme === 'chuseok'}
                onChange={(e) => setEventTheme(e.target.checked ? 'chuseok' : null)} />
              추석 패키지 (갤러리 카드에 추석 색동 테마)
            </label>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}
          <button type="submit" className={styles.registerButton} style={{ width: '100%', marginTop: '1rem' }} disabled={submitting}>
            {submitting ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정 완료' : '등록하기')}
          </button>
        </div>
      </div>
    </form>
  );
}
