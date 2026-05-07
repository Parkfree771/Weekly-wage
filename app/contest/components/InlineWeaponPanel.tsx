'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../contest.module.css';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteWeapon,
  fetchUserLikedWeapons,
  getWeaponsPage,
  toggleWeaponLike,
  uploadWeapon,
  WEAPONS_PAGE_SIZE,
  type SortBy,
  type WeaponsCursor,
} from '@/lib/contest-service';
import type { ContestWeapon } from '@/types/contest';
import WeaponCommentSection from './WeaponCommentSection';
import IllustrationLightbox from './IllustrationLightbox';


type Props = {
  illustrationSlug: string;
  onClose: () => void;
};

const MAX_INPUT_SIZE = 3 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 1 * 1024 * 1024;
const MAX_TITLE_LEN = 30;
const MAX_DIMENSION = 1920;
const SQUOOSH_URL = 'https://squoosh.app/';

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

export default function InlineWeaponPanel({
  illustrationSlug,
  onClose,
}: Props) {
  const { user, userProfile } = useAuth();
  const isAdmin = user?.email === 'dbfh1498@gmail.com';
  const [weapons, setWeapons] = useState<ContestWeapon[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('latest');

  // 페이지네이션 (페이지당 5개)
  // cursorStack: 페이지별 시작 cursor. 0번 = 페이지 1 (null), 1번 = 페이지 2 시작 cursor, ...
  const [cursorStack, setCursorStack] = useState<Array<WeaponsCursor | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [hasMore, setHasMore] = useState(false);
  const currentPage = pageIndex + 1; // 1-based 표시용

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 이미지 라이트박스 (이미지만 풀스크린)
  const [lightboxWeapon, setLightboxWeapon] = useState<ContestWeapon | null>(null);

  // 카드 별 댓글 펼침 (여러 개 동시 가능)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // 페이지 fetch (페이지 인덱스/정렬 변경 시마다)
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const cursor = cursorStack[pageIndex] ?? null;
        const { weapons: list, hasMore: more, lastCursor } = await getWeaponsPage(
          illustrationSlug,
          sortBy,
          cursor,
          WEAPONS_PAGE_SIZE,
        );
        setHasMore(more);

        // 다음 페이지 cursor 미리 stack 에 저장
        if (more && lastCursor) {
          setCursorStack((prev) => {
            if (prev[pageIndex + 1] !== undefined) return prev;
            const next = [...prev];
            next[pageIndex + 1] = lastCursor;
            return next;
          });
        }

        setWeapons(list);
      } catch (err) {
        console.error('무기 목록 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [illustrationSlug, pageIndex, sortBy]);

  // 사용자 무기 좋아요 상태 — 현재 페이지 무기 id 기반으로 조회
  useEffect(() => {
    if (!user || weapons.length === 0) {
      if (!user) setLikedSet(new Set());
      return;
    }
    (async () => {
      try {
        const ids = weapons.map((w) => w.id);
        const liked = await fetchUserLikedWeapons(user.uid, illustrationSlug, ids);
        setLikedSet(liked);
      } catch (err) {
        console.error('좋아요 상태 로딩 실패:', err);
      }
    })();
  }, [user, illustrationSlug, weapons]);

  // Firestore 가 sortBy 에 맞춰 정렬해서 가져오므로 그대로 사용
  const sortedWeapons = weapons;

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
      let processed: { file: File; width: number; height: number };
      try {
        processed = await compressForUpload(uploadFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '이미지 압축에 실패했습니다.';
        setUploadError(msg);
        setUploading(false);
        return;
      }
      if (processed.file.size > MAX_OUTPUT_SIZE) {
        setUploadError(
          '변환 후에도 용량이 너무 큽니다. 외부 도구로 압축 후 다시 시도해주세요.',
        );
        setUploading(false);
        return;
      }
      const authorName =
        userProfile?.nickname ||
        user.displayName ||
        (user.email ? user.email.split('@')[0] : '익명');
      let weapon: ContestWeapon;
      try {
        weapon = await uploadWeapon(
          illustrationSlug,
          processed.file,
          user.uid,
          authorName,
          title,
          processed.width,
          processed.height,
        );
      } catch (err) {
        // 갯수 제한 등 명시 에러는 메시지를 사용자에게 그대로
        const msg = err instanceof Error ? err.message : '업로드에 실패했습니다.';
        setUploadError(msg);
        setUploading(false);
        return;
      }
      // 업로드는 페이지 1 prepend 가 자연스러움 → 페이지 1 로 이동 + 옵티미스틱 추가
      if (pageIndex !== 0) {
        // 페이지 1로 이동하면 useEffect 가 다시 fetch (캐시 hit + prepend 반영)
        setPageIndex(0);
      } else {
        // 이미 페이지 1 → 옵티미스틱 추가, 5개 초과면 마지막 잘라냄
        setWeapons((prev) => {
          const next = [weapon, ...prev];
          return next.slice(0, WEAPONS_PAGE_SIZE);
        });
        // 6개 이상이 됐다는 건 다음 페이지가 생겼다는 뜻
        setHasMore((prev) => prev || true);
      }
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
    const delta = wasLiked ? -1 : 1;
    setWeapons((prev) =>
      prev.map((w) =>
        w.id === weapon.id ? { ...w, likeCount: Math.max(0, (w.likeCount || 0) + delta) } : w,
      ),
    );
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(weapon.id);
      else next.add(weapon.id);
      return next;
    });

    try {
      await toggleWeaponLike(illustrationSlug, weapon.id, user.uid, wasLiked);
    } catch (err) {
      console.error('좋아요 실패:', err);
      const rollbackDelta = -delta;
      setWeapons((prev) =>
        prev.map((w) =>
          w.id === weapon.id
            ? { ...w, likeCount: Math.max(0, (w.likeCount || 0) + rollbackDelta) }
            : w,
        ),
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

  const handleDelete = async (weapon: ContestWeapon) => {
    if (!user) return;
    const isMine = weapon.uid === user.uid;
    if (!isMine && !isAdmin) return;
    const message = isMine
      ? '내가 올린 무기 아바타를 삭제하시겠습니까?'
      : `[관리자] "${weapon.authorName}" 님이 올린 무기 아바타를 삭제하시겠습니까?`;
    if (!confirm(message)) return;
    try {
      await deleteWeapon(illustrationSlug, weapon.id, weapon.storagePath);
      // 페이지 cursor 들이 stale 됐을 수 있음 — 페이지 1로 돌아가면서 cursor stack 초기화
      setExpandedComments((prev) => {
        const next = new Set(prev);
        next.delete(weapon.id);
        return next;
      });
      if (lightboxWeapon?.id === weapon.id) setLightboxWeapon(null);
      setCursorStack([null]);
      if (pageIndex !== 0) {
        setPageIndex(0); // useEffect 가 재fetch
      } else {
        setWeapons((prev) => prev.filter((w) => w.id !== weapon.id));
      }
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const toggleComments = (weaponId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(weaponId)) next.delete(weaponId);
      else next.add(weaponId);
      return next;
    });
  };

  const handleCommentCountChange = (weaponId: string, delta: number) => {
    setWeapons((prev) =>
      prev.map((w) =>
        w.id === weaponId ? { ...w, commentCount: (w.commentCount || 0) + delta } : w,
      ),
    );
  };

  const sortBtn = (key: SortBy, label: string) => (
    <button
      type="button"
      className={sortBy === key ? styles.sortBtnActive : styles.sortBtn}
      onClick={() => {
        if (sortBy === key) return;
        setSortBy(key);
        setCursorStack([null]);
        setPageIndex(0);
      }}
    >
      {label}
    </button>
  );

  return (
    <section className={styles.inlinePanel} aria-label="무기 갤러리">
      {/* 상단 한 줄: [업로드 / 로그인 안내] [최신순·좋아요순] [X] */}
      <div className={styles.modalActionBar}>
        <div className={styles.modalActionLeft}>
          {!showUploadForm && (
            <button
              type="button"
              className={styles.modalUploadBtn}
              onClick={() => {
                if (!user) {
                  alert('업로드는 로그인 후 이용해주세요.');
                  return;
                }
                setShowUploadForm(true);
              }}
            >
              + 무기 아바타 올리기
            </button>
          )}
        </div>
        <div className={styles.modalActionRight}>
          <div className={styles.sortToggle}>
            {sortBtn('latest', '최신순')}
            {sortBtn('likes', '좋아요순')}
          </div>
          <button
            type="button"
            className={styles.inlineCloseBtn}
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 업로드 폼 */}
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
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={uploadPreview} alt="미리보기" />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <span style={{ fontSize: 32, fontWeight: 200, opacity: 0.6 }}>+</span>
                  <span>이미지 선택</span>
                  <span style={{ fontSize: 11, color: '#6b7390' }}>최대 3MB</span>
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

      {/* 무기 갤러리 */}
      <div className={styles.inlineGalleryBody}>
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
              const canDelete = isMine || isAdmin;
              const isLiked = likedSet.has(w.id);
              const isCommentsOpen = expandedComments.has(w.id);
              return (
                <div key={w.id} className={styles.weaponItem}>
                  <button
                    type="button"
                    className={styles.weaponImageWrap}
                    onClick={() => setLightboxWeapon(w)}
                    aria-label={`${w.title || w.authorName + '의 무기'} 크게 보기`}
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
                    {canDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        className={styles.weaponDeleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(w);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            handleDelete(w);
                          }
                        }}
                        aria-label={isMine ? '삭제' : '관리자 삭제'}
                        title={isMine ? '삭제' : '관리자 삭제'}
                      >
                        ✕
                      </span>
                    )}
                  </button>
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
                        onClick={() => handleLikeToggle(w)}
                        aria-label={isLiked ? '좋아요 취소' : '좋아요'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{w.likeCount || 0}</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.commentToggleBtn} ${isCommentsOpen ? styles.commentToggleBtnActive : ''}`}
                        onClick={() => toggleComments(w.id)}
                        aria-expanded={isCommentsOpen}
                      >
                        댓글 {w.commentCount || 0}
                        <span className={styles.weaponButtonChevron} aria-hidden>
                          {isCommentsOpen ? '▴' : '▾'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isCommentsOpen && (
                    <div className={styles.cardCommentsWrap}>
                      <WeaponCommentSection
                        illustrationSlug={illustrationSlug}
                        weaponId={w.id}
                        onCountChange={(delta) => handleCommentCountChange(w.id, delta)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 — 페이지 1 이상이거나 hasMore 면 표시 */}
        {!loading && (pageIndex > 0 || hasMore) && (
          <div className={styles.paginationBar}>
            <button
              type="button"
              className={styles.paginationBtn}
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              ← 이전
            </button>
            <span className={styles.paginationLabel}>{currentPage} 페이지</span>
            <button
              type="button"
              className={styles.paginationBtn}
              disabled={!hasMore}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              다음 →
            </button>
          </div>
        )}
      </div>

      {/* 이미지 라이트박스 (이미지만 풀스크린, 무기는 워터마크 X) */}
      {lightboxWeapon && (
        <IllustrationLightbox
          src={lightboxWeapon.imageUrl}
          alt={lightboxWeapon.title || `${lightboxWeapon.authorName}의 무기 아바타`}
          onClose={() => setLightboxWeapon(null)}
          showWatermark={false}
        />
      )}
    </section>
  );
}
