'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../contest.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { deleteWeapon, getWeapons, uploadWeapon } from '@/lib/contest-service';
import {
  fetchUserLikedWeapons,
  fetchWeaponLikeCounts,
  fetchWeaponViewCounts,
  toggleWeaponLikeSupa,
  tryIncrementWeaponView,
} from '@/lib/contest-supabase';
import type { ContestWeapon } from '@/types/contest';
import WeaponDetailModal from './WeaponDetailModal';

type SortBy = 'latest' | 'likes';

type Props = {
  illustrationSlug: string;
  illustrationImageSrc: string;
  onClose: () => void;
  onCountChange?: (delta: number) => void;
};

const MAX_INPUT_SIZE = 3 * 1024 * 1024; // 입력 3MB 제한 (대부분 PNG 1.5~2MB라 여유 충분)
const MAX_OUTPUT_SIZE = 1 * 1024 * 1024; // WebP 변환 후 1MB 초과면 차단 (무료 스토리지 보호)
const MAX_TITLE_LEN = 30;
const MAX_DIMENSION = 1920; // 긴 변 픽셀 상한 (비율 유지)
const SQUOOSH_URL = 'https://squoosh.app/';

/**
 * 브라우저 canvas로 WebP 변환 + 비율 유지 리사이즈.
 * 성공: { file: WebP File, width, height(변환 후) }
 * 실패: reject  → 호출자가 사용자에게 안내
 */
function convertToWebp(
  file: File,
  quality: number,
): Promise<{ file: File; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (!w || !h) {
          URL.revokeObjectURL(url);
          reject(new Error('이미지 크기를 읽을 수 없습니다.'));
          return;
        }
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('canvas 생성에 실패했습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error('WebP 변환에 실패했습니다.'));
              return;
            }
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'weapon';
            const newFile = new File([blob], `${baseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve({ file: newFile, width: w, height: h });
          },
          'image/webp',
          quality,
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 로드에 실패했습니다.'));
    };
    img.src = url;
  });
}

/**
 * 단계별 quality 낮춰가며 1MB 이하로 압축 시도.
 * 모두 실패 시 throw → 호출자가 Squoosh 링크 안내.
 */
async function compressForUpload(
  file: File,
): Promise<{ file: File; width: number; height: number }> {
  let last: { file: File; width: number; height: number } | null = null;
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const result = await convertToWebp(file, q);
    last = result;
    if (result.file.size <= MAX_OUTPUT_SIZE) return result;
  }
  const sizeMB = last
    ? (last.file.size / 1024 / 1024).toFixed(2)
    : '?';
  throw new Error(
    `압축해도 용량이 너무 큽니다 (${sizeMB}MB / 최대 1MB). 외부 도구에서 추가 압축 후 다시 올려주세요.`,
  );
}

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(diff / 3600000);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(diff / 86400000);
  if (day < 7) return `${day}일 전`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${dd}`;
}

export default function WeaponGalleryModal({
  illustrationSlug,
  illustrationImageSrc,
  onClose,
  onCountChange,
}: Props) {
  const { user, userProfile } = useAuth();
  const [weapons, setWeapons] = useState<ContestWeapon[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('latest');

  // 업로드 폼 상태
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 미리보기
  const [previewWeapon, setPreviewWeapon] = useState<ContestWeapon | null>(null);

  // ESC + scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewWeapon) setPreviewWeapon(null);
      else if (showUploadForm) cancelUpload();
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, previewWeapon, showUploadForm]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 무기 메타 + Supabase 카운트(좋아요/조회수) 통합 로딩
  useEffect(() => {
    (async () => {
      try {
        // 1) Firestore 에서 무기 메타 가져옴
        const list = await getWeapons(illustrationSlug);
        if (list.length === 0) {
          setWeapons([]);
          return;
        }
        const ids = list.map((w) => w.id);

        // 2) Supabase 에서 좋아요/조회수 카운트 일괄 조회
        const [likes, views] = await Promise.all([
          fetchWeaponLikeCounts(illustrationSlug, ids),
          fetchWeaponViewCounts(illustrationSlug, ids),
        ]);

        // 3) 머지 (Firestore 메타 + Supabase 카운트)
        const merged = list.map((w) => ({
          ...w,
          likeCount: likes[w.id] ?? 0,
          // viewCount 표시는 안 하지만 데이터엔 두기 (추후 필요 시)
        }));
        setWeapons(merged);
      } catch (err) {
        console.error('무기 목록 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [illustrationSlug]);

  // 사용자 무기 좋아요 상태 (Supabase)
  useEffect(() => {
    if (!user) {
      setLikedSet(new Set());
      return;
    }
    (async () => {
      try {
        const liked = await fetchUserLikedWeapons(user.uid, illustrationSlug);
        setLikedSet(liked);
      } catch (err) {
        console.error('좋아요 상태 로딩 실패:', err);
      }
    })();
  }, [user, illustrationSlug]);

  // 정렬
  const sortedWeapons = useMemo(() => {
    const list = [...weapons];
    if (sortBy === 'likes') {
      list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return list;
  }, [weapons, sortBy]);

  // 업로드 폼 처리
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 올릴 수 있습니다.');
      return;
    }
    if (file.size > MAX_INPUT_SIZE) {
      setUploadError(
        `원본 파일 크기는 ${MAX_INPUT_SIZE / 1024 / 1024}MB 이하만 가능합니다.`,
      );
      return;
    }
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const cancelUpload = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadTitle('');
    setUploadError(null);
    setShowUploadForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user) {
      setUploadError('업로드는 로그인 후 이용해주세요.');
      return;
    }
    if (!uploadFile) {
      setUploadError('이미지를 선택해주세요.');
      return;
    }
    const title = uploadTitle.trim();
    if (!title) {
      setUploadError('제목을 입력해주세요.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      // 1) 클라이언트 압축 (WebP, 비율 유지, 1MB 이하 단계 시도)
      let processed: { file: File; width: number; height: number };
      try {
        processed = await compressForUpload(uploadFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '이미지 압축에 실패했습니다.';
        setUploadError(msg);
        setUploading(false);
        return;
      }

      // 2) 안전망 — 변환 결과도 1MB 초과면 거부 (이론상 도달 안 함)
      if (processed.file.size > MAX_OUTPUT_SIZE) {
        setUploadError(
          '변환 후에도 용량이 너무 큽니다. 외부 도구로 압축 후 다시 시도해주세요.',
        );
        setUploading(false);
        return;
      }

      // 3) 업로드
      const authorName =
        userProfile?.nickname ||
        user.displayName ||
        (user.email ? user.email.split('@')[0] : '익명');
      const weapon = await uploadWeapon(
        illustrationSlug,
        processed.file,
        user.uid,
        authorName,
        title,
        processed.width,
        processed.height,
      );
      setWeapons((prev) => [weapon, ...prev]);
      onCountChange?.(1);
      cancelUpload();
    } catch (err) {
      console.error('업로드 실패:', err);
      setUploadError('업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  const handleLikeToggle = async (weapon: ContestWeapon) => {
    if (!user) {
      alert('좋아요는 로그인 후 가능합니다.');
      return;
    }
    const wasLiked = likedSet.has(weapon.id);

    // 옵티미스틱
    const delta = wasLiked ? -1 : 1;
    setWeapons((prev) =>
      prev.map((w) =>
        w.id === weapon.id ? { ...w, likeCount: Math.max(0, (w.likeCount || 0) + delta) } : w,
      ),
    );
    setPreviewWeapon((prev) =>
      prev && prev.id === weapon.id
        ? { ...prev, likeCount: Math.max(0, (prev.likeCount || 0) + delta) }
        : prev,
    );
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(weapon.id);
      else next.add(weapon.id);
      return next;
    });

    try {
      await toggleWeaponLikeSupa(
        weapon.id,
        illustrationSlug,
        user.uid,
        wasLiked,
      );
      // 성공 → 옵티미스틱 그대로 유지
    } catch (err) {
      // 롤백
      console.error('좋아요 실패:', err);
      const rollbackDelta = -delta;
      setWeapons((prev) =>
        prev.map((w) =>
          w.id === weapon.id
            ? { ...w, likeCount: Math.max(0, (w.likeCount || 0) + rollbackDelta) }
            : w,
        ),
      );
      setPreviewWeapon((prev) =>
        prev && prev.id === weapon.id
          ? { ...prev, likeCount: Math.max(0, (prev.likeCount || 0) + rollbackDelta) }
          : prev,
      );
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(weapon.id);
        else next.delete(weapon.id);
        return next;
      });
      alert('좋아요 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handlePreview = (weapon: ContestWeapon) => {
    setPreviewWeapon(weapon);
    // 조회수 +1 시도 (백그라운드, 결과 무시 — 1시간 dedup이라 자주 skip)
    tryIncrementWeaponView(weapon.id, user?.uid ?? null).catch((err) =>
      console.error('조회수 증가 실패:', err),
    );
  };

  const handleDelete = async (weapon: ContestWeapon) => {
    if (!user || weapon.uid !== user.uid) return;
    if (!confirm('내가 올린 무기 아바타를 삭제하시겠습니까?')) return;
    try {
      await deleteWeapon(illustrationSlug, weapon.id, weapon.storagePath);
      setWeapons((prev) => prev.filter((w) => w.id !== weapon.id));
      onCountChange?.(-1);
      if (previewWeapon?.id === weapon.id) setPreviewWeapon(null);
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const sortBtn = (key: SortBy, label: string) => (
    <button
      type="button"
      className={sortBy === key ? styles.sortBtnActive : styles.sortBtn}
      onClick={() => setSortBy(key)}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className={styles.modalCloseFloating}
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 1. 상단 아바타 hero */}
        <div className={styles.modalAvatarHero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={illustrationImageSrc} alt="" />
          <div className={styles.modalAvatarLabel}>
            <span className={styles.modalEyebrow}>WEAPON AVATAR</span>
            <span className={styles.modalTitle}>이 아바타에 어울리는 무기</span>
          </div>
        </div>

        {/* 2. 액션 바 (업로드 + 정렬) */}
        <div className={styles.modalActionBar}>
          <div className={styles.modalActionLeft}>
            {user ? (
              !showUploadForm && (
                <button
                  type="button"
                  className={styles.modalUploadBtn}
                  onClick={() => setShowUploadForm(true)}
                >
                  + 무기 아바타 올리기
                </button>
              )
            ) : (
              <span className={styles.modalLoginHint}>
                업로드는 로그인 후 가능합니다
              </span>
            )}
          </div>
          <div className={styles.sortToggle}>
            {sortBtn('latest', '최신순')}
            {sortBtn('likes', '좋아요순')}
          </div>
        </div>

        {/* 3. 업로드 폼 (인라인) */}
        {showUploadForm && (
          <div className={styles.uploadForm}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFilePick}
              style={{ display: 'none' }}
            />
            <div className={styles.uploadGrid}>
              <div
                className={styles.uploadDropZone}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadPreview} alt="미리보기" />
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <span style={{ fontSize: 32, fontWeight: 200, opacity: 0.6 }}>+</span>
                    <span>이미지 선택</span>
                    <span style={{ fontSize: 11, color: '#6b7390' }}>최대 6MB</span>
                  </div>
                )}
              </div>
              <div className={styles.uploadRight}>
                <input
                  type="text"
                  className={styles.uploadTitleInput}
                  placeholder="제목을 입력하세요 (예: 흑요 폴 액스)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  maxLength={MAX_TITLE_LEN}
                />
                <div className={styles.uploadHint}>
                  {uploadTitle.length} / {MAX_TITLE_LEN}자 · 업로드 시 자동으로 WebP로 압축됩니다
                </div>
                {uploadError && (
                  <div className={styles.uploadError}>
                    <span>{uploadError}</span>
                    <a
                      href={SQUOOSH_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.uploadErrorLink}
                    >
                      Squoosh에서 직접 압축 →
                    </a>
                  </div>
                )}
                <div className={styles.uploadButtons}>
                  <button
                    type="button"
                    className={styles.modalUploadBtn}
                    onClick={handleSubmit}
                    disabled={uploading || !uploadFile || !uploadTitle.trim()}
                  >
                    {uploading ? '업로드 중...' : '등록하기'}
                  </button>
                  <button
                    type="button"
                    className={styles.modalSecondaryBtn}
                    onClick={cancelUpload}
                    disabled={uploading}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. 갤러리 */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.modalEmpty}>불러오는 중...</div>
          ) : sortedWeapons.length === 0 ? (
            <div className={styles.modalEmpty}>
              아직 등록된 무기 아바타가 없습니다.
              <br />
              {user
                ? '첫 무기 아바타를 올려보세요!'
                : '로그인 후 첫 무기 아바타를 올려보세요!'}
            </div>
          ) : (
            <div className={styles.weaponGallery}>
              {sortedWeapons.map((w) => {
                const isMine = !!user && w.uid === user.uid;
                const isLiked = likedSet.has(w.id);
                return (
                  <div key={w.id} className={styles.weaponItem}>
                    <div
                      className={styles.weaponImageWrap}
                      onClick={() => handlePreview(w)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={w.imageUrl}
                        alt={w.title || `${w.authorName}의 무기 아바타`}
                        style={
                          w.width && w.height
                            ? { aspectRatio: `${w.width} / ${w.height}` }
                            : undefined
                        }
                        loading="lazy"
                      />
                      {isMine && (
                        <button
                          type="button"
                          className={styles.weaponDeleteBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(w);
                          }}
                          aria-label="삭제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className={styles.weaponInfo}>
                      {w.title && (
                        <div className={styles.weaponTitle}>{w.title}</div>
                      )}
                      <div className={styles.weaponMetaRow}>
                        <span className={styles.weaponAuthor2}>{w.authorName}</span>
                        <span className={styles.weaponDate2}>
                          {formatDate(w.createdAt)}
                        </span>
                      </div>
                      <div className={styles.weaponStatRow}>
                        <button
                          type="button"
                          className={`${styles.weaponLikeBtn} ${isLiked ? styles.weaponLikeBtnActive : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeToggle(w);
                          }}
                          aria-label={isLiked ? '좋아요 취소' : '좋아요'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>{w.likeCount || 0}</span>
                        </button>
                        <span className={styles.weaponView}>
                          댓글 {w.commentCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 무기 상세 모달 (이미지 + 메타 + 좋아요 + 댓글) */}
      {previewWeapon && (
        <WeaponDetailModal
          weapon={previewWeapon}
          illustrationSlug={illustrationSlug}
          isLiked={likedSet.has(previewWeapon.id)}
          isOwner={!!user && previewWeapon.uid === user.uid}
          onClose={() => setPreviewWeapon(null)}
          onLikeToggle={() => handleLikeToggle(previewWeapon)}
          onDelete={() => handleDelete(previewWeapon)}
          onCommentCountChange={(delta) => {
            setWeapons((prev) =>
              prev.map((w) =>
                w.id === previewWeapon.id
                  ? { ...w, commentCount: (w.commentCount || 0) + delta }
                  : w,
              ),
            );
            setPreviewWeapon((prev) =>
              prev
                ? { ...prev, commentCount: (prev.commentCount || 0) + delta }
                : prev,
            );
          }}
        />
      )}
    </div>
  );
}
