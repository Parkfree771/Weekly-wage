'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarPost, updateAvatarPost } from '@/lib/avatar-service';
import { uploadTransparentAvatar } from '@/lib/storage-service';
import { refineBackgroundRemoval } from '@/lib/background-utils';
import AvatarItemList from '@/components/avatar/AvatarItemList';
import type { AvatarPost } from '@/types/avatar';
import { BACKGROUND_PRESETS, getBackgroundStyle } from '@/types/avatar';
import styles from '../../avatar.module.css';

export default function AvatarEditPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user } = useAuth();

  const [post, setPost] = useState<AvatarPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundId, setBackgroundId] = useState('default');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 배경 제거
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgRemoveProgress, setBgRemoveProgress] = useState('');
  const [transparentBlobUrl, setTransparentBlobUrl] = useState<string | null>(null);
  const transparentBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!postId) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAvatarPost(postId);
        if (data) {
          setPost(data);
          setTitle(data.title);
          setDescription(data.description || '');
          setBackgroundId(data.backgroundId || 'default');
          // 이미 투명 이미지가 있으면 배경 제거 상태로 설정
          if (data.transparentImageUrl) {
            setBgRemoved(true);
          }
        }
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);

  // AI 배경 제거
  const handleRemoveBackground = async () => {
    if (!post?.characterImageUrl) return;

    setBgRemoving(true);
    setBgRemoveProgress('AI 모델 로딩 중... (첫 사용 시 약 30초 소요)');
    setError('');

    try {
      const { removeBackground } = await import('@imgly/background-removal');

      setBgRemoveProgress('이미지 다운로드 중...');
      const proxyUrl = `/api/lostark/image-proxy?url=${encodeURIComponent(post.characterImageUrl)}`;
      const imgRes = await fetch(proxyUrl);
      if (!imgRes.ok) throw new Error('이미지를 가져올 수 없습니다.');
      const imgBlob = await imgRes.blob();

      setBgRemoveProgress('배경 제거 중... (약 5~10초)');

      const aiResultBlob = await removeBackground(imgBlob, {
        progress: (key: string, current: number, total: number) => {
          if (key === 'compute:inference') {
            const pct = Math.round((current / total) * 100);
            setBgRemoveProgress(`배경 제거 중... ${pct}%`);
          }
        },
      });

      // 하이브리드 후처리: AI가 지운 이펙트 복원
      setBgRemoveProgress('이펙트 보정 중...');
      const resultBlob = await refineBackgroundRemoval(imgBlob, aiResultBlob);

      const objectUrl = URL.createObjectURL(resultBlob);
      setTransparentBlobUrl(objectUrl);
      transparentBlobRef.current = resultBlob;
      setBgRemoved(true);
      setBgRemoveProgress('');
    } catch (err: any) {
      console.error('배경 제거 실패:', err);
      setError('배경 제거에 실패했습니다. 다시 시도해주세요.');
      setBgRemoveProgress('');
    } finally {
      setBgRemoving(false);
    }
  };

  // 배경 초기화
  const handleResetBackground = () => {
    if (transparentBlobUrl) URL.revokeObjectURL(transparentBlobUrl);
    setTransparentBlobUrl(null);
    transparentBlobRef.current = null;
    setBgRemoved(false);
    setBackgroundId('default');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !user || user.uid !== post.authorUid) return;
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let transparentImageUrl: string | undefined = post.transparentImageUrl;

      // 새로 배경 제거한 경우 업로드
      if (bgRemoved && transparentBlobRef.current) {
        transparentImageUrl = await uploadTransparentAvatar(
          transparentBlobRef.current,
          user.uid,
        );
      }

      // 배경 제거를 리셋한 경우
      if (!bgRemoved) {
        transparentImageUrl = undefined;
      }

      await updateAvatarPost(postId, {
        title: title.trim(),
        description: description.trim(),
        backgroundId: bgRemoved ? backgroundId : undefined,
        transparentImageUrl: bgRemoved ? transparentImageUrl : undefined,
      });
      router.push(`/avatar/${postId}`);
    } catch (err: any) {
      console.error('수정 실패:', err);
      setError('수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 표시할 이미지 결정
  const displayImageUrl = transparentBlobUrl
    || (bgRemoved && post?.transparentImageUrl)
    || post?.characterImageUrl
    || '';
  const imageWrapStyle = bgRemoved
    ? getBackgroundStyle(backgroundId)
    : { background: '#2a2035' };

  if (loading) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.detailWrapper} style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <Spinner animation="border" style={{ color: '#ec4899' }} />
        </div>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.detailWrapper}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>게시물을 찾을 수 없습니다</p>
            <Link href="/avatar" className={styles.backLink}>
              &#8592; 갤러리로 돌아가기
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  if (user?.uid !== post.authorUid) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.detailWrapper}>
          <div className={styles.loginNotice}>
            <p className={styles.loginNoticeText}>본인의 게시물만 수정할 수 있습니다.</p>
            <Link href={`/avatar/${postId}`} className={styles.backLink}>
              &#8592; 게시물로 돌아가기
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1400px' }}>
      <div className={styles.registerWrapper}>
        <Link href={`/avatar/${postId}`} className={styles.backLink}>
          &#8592; 게시물로 돌아가기
        </Link>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>게시물 수정</h1>
        </div>

        <div className={styles.registerLayout}>
          {/* 왼쪽 사이드바 (sticky) */}
          <aside className={styles.registerSidebar}>
            <div className={styles.sidebarCard}>
              <h2 className={styles.previewCharName}>{post.characterName}</h2>
              <div className={styles.previewImageWrap} style={imageWrapStyle}>
                {displayImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={bgRemoved && (transparentBlobUrl || post.transparentImageUrl) ? (transparentBlobUrl || post.transparentImageUrl!) : post.characterImageUrl}
                    alt={post.characterName}
                    className={styles.previewCharImage}
                  />
                )}
              </div>
            </div>

            {/* 배경 제거 & 선택 */}
            <div className={styles.bgRemoveSection}>
              {!bgRemoved ? (
                <>
                  <button
                    type="button"
                    className={styles.bgRemoveBtn}
                    onClick={handleRemoveBackground}
                    disabled={bgRemoving}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {bgRemoving ? '처리 중...' : '✨ AI 배경 제거'}
                  </button>
                  {bgRemoveProgress && (
                    <p className={styles.bgRemoveProgress}>{bgRemoveProgress}</p>
                  )}
                  {!bgRemoving && (
                    <p className={styles.bgRemoveProgress}>
                      배경을 제거하면 원하는 배경을 설정할 수 있습니다
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                      ✓ 배경 제거됨
                    </span>
                    <button
                      type="button"
                      className={styles.bgResetBtn}
                      onClick={handleResetBackground}
                    >
                      되돌리기
                    </button>
                  </div>
                  <div className={styles.bgSelectorWrap}>
                    <label className={styles.formLabel}>배경 선택</label>
                    <div className={styles.bgSelector}>
                      {BACKGROUND_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`${styles.bgOption} ${backgroundId === preset.id ? styles.bgOptionActive : ''}`}
                          onClick={() => setBackgroundId(preset.id)}
                          title={preset.label}
                        >
                          <div
                            className={styles.bgOptionPreview}
                            style={preset.previewStyle}
                          />
                          <span className={styles.bgOptionLabel}>{preset.label}</span>
                        </button>
                      ))}
                      {/* 커스텀 컬러 */}
                      <label
                        className={`${styles.bgOption} ${backgroundId.startsWith('#') && !BACKGROUND_PRESETS.find(p => p.id === backgroundId) ? styles.bgOptionActive : ''}`}
                        title="직접 선택"
                      >
                        <div className={styles.bgOptionPreview} style={{ position: 'relative', overflow: 'hidden' }}>
                          <input
                            type="color"
                            className={styles.colorPickerInput}
                            value={backgroundId.startsWith('#') && !BACKGROUND_PRESETS.find(p => p.id === backgroundId) ? backgroundId : '#4a90d9'}
                            onChange={(e) => setBackgroundId(e.target.value)}
                          />
                        </div>
                        <span className={styles.bgOptionLabel}>직접 선택</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* 오른쪽 콘텐츠 */}
          <div className={styles.registerContent}>
            <AvatarItemList items={post.avatarItems} />

            {/* 수정 폼 */}
            <form className={styles.registerForm} onSubmit={handleSubmit}>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="title">제목 *</label>
              <input
                id="title"
                type="text"
                className={styles.formInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="desc">설명 (선택)</label>
              <textarea
                id="desc"
                className={styles.formTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
              />
            </div>
            <div style={{ textAlign: 'center', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                href={`/avatar/${postId}`}
                className={styles.editLink}
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
              >
                취소
              </Link>
              <button
                type="submit"
                className={styles.registerButton}
                disabled={submitting || !title.trim()}
              >
                {submitting ? '수정 중...' : '수정하기'}
              </button>
            </div>
            </form>
          </div>
        </div>
      </div>
    </Container>
  );
}
