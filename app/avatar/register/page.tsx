'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { createAvatarPost } from '@/lib/avatar-service';
import { uploadTransparentAvatar } from '@/lib/storage-service';
import { refineBackgroundRemoval } from '@/lib/background-utils';
import NicknameModal from '@/components/auth/NicknameModal';
import AvatarItemList from '@/components/avatar/AvatarItemList';
import type { AvatarSearchResult, AvatarPostCreateData } from '@/types/avatar';
import { BACKGROUND_PRESETS, getBackgroundStyle } from '@/types/avatar';
import styles from '../avatar.module.css';

export default function AvatarRegisterPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AvatarSearchResult | null>(null);
  const [error, setError] = useState('');

  // 등록 폼
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 배경 제거
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgRemoveProgress, setBgRemoveProgress] = useState('');
  const [transparentBlobUrl, setTransparentBlobUrl] = useState<string | null>(null);
  const transparentBlobRef = useRef<Blob | null>(null);
  const [backgroundId, setBackgroundId] = useState('default');
  const searchGenRef = useRef(0);

  // 캐릭터 검색
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setSearching(true);
    setError('');
    setSearchResult(null);
    // 배경 상태 초기화 + 진행 중인 배경 제거 무효화
    searchGenRef.current += 1;
    setBgRemoved(false);
    setBgRemoving(false);
    setBgRemoveProgress('');
    setTransparentBlobUrl(null);
    transparentBlobRef.current = null;
    setBackgroundId('default');

    try {
      const res = await fetch(
        `/api/lostark/avatars?characterName=${encodeURIComponent(searchName.trim())}`,
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || '캐릭터를 찾을 수 없습니다.');
      }

      const data: AvatarSearchResult = await res.json();

      if (!data.avatarItems || data.avatarItems.length === 0) {
        throw new Error('장착된 아바타가 없습니다.');
      }

      setSearchResult(data);
      if (!title) {
        setTitle('');
      }
    } catch (err: any) {
      setError(err.message || '검색에 실패했습니다.');
    } finally {
      setSearching(false);
    }
  };

  // AI 배경 제거
  const handleRemoveBackground = async () => {
    if (!searchResult?.characterImageUrl) return;

    const gen = searchGenRef.current;
    setBgRemoving(true);
    setBgRemoveProgress('AI 모델 로딩 중... (첫 사용 시 약 30초 소요)');
    setError('');

    try {
      const { removeBackground } = await import('@imgly/background-removal');

      if (searchGenRef.current !== gen) return;
      setBgRemoveProgress('이미지 다운로드 중...');

      // 프록시를 통해 이미지 가져오기 (CORS 우회)
      const proxyUrl = `/api/lostark/image-proxy?url=${encodeURIComponent(searchResult.characterImageUrl)}`;
      const imgRes = await fetch(proxyUrl);
      if (!imgRes.ok) throw new Error('이미지를 가져올 수 없습니다.');
      const imgBlob = await imgRes.blob();

      if (searchGenRef.current !== gen) return;
      setBgRemoveProgress('배경 제거 중... (약 5~10초)');

      const aiResultBlob = await removeBackground(imgBlob, {
        progress: (key: string, current: number, total: number) => {
          if (key === 'compute:inference' && searchGenRef.current === gen) {
            const pct = Math.round((current / total) * 100);
            setBgRemoveProgress(`배경 제거 중... ${pct}%`);
          }
        },
      });

      if (searchGenRef.current !== gen) return;

      // 하이브리드 후처리: AI가 지운 이펙트 복원
      setBgRemoveProgress('이펙트 보정 중...');
      const resultBlob = await refineBackgroundRemoval(imgBlob, aiResultBlob);

      if (searchGenRef.current !== gen) return;

      // 결과를 Object URL로 변환하여 미리보기
      const objectUrl = URL.createObjectURL(resultBlob);
      setTransparentBlobUrl(objectUrl);
      transparentBlobRef.current = resultBlob;
      setBgRemoved(true);
      setBgRemoveProgress('');
    } catch (err: any) {
      if (searchGenRef.current !== gen) return;
      console.error('배경 제거 실패:', err);
      setError('배경 제거에 실패했습니다. 다시 시도해주세요.');
      setBgRemoveProgress('');
    } finally {
      if (searchGenRef.current === gen) {
        setBgRemoving(false);
      }
    }
  };

  // 배경 제거 초기화
  const handleResetBackground = () => {
    if (transparentBlobUrl) URL.revokeObjectURL(transparentBlobUrl);
    setTransparentBlobUrl(null);
    transparentBlobRef.current = null;
    setBgRemoved(false);
    setBackgroundId('default');
  };

  // 등록
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchResult || !user || !userProfile) return;
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let transparentImageUrl: string | undefined;

      // 투명 이미지가 있으면 Firebase Storage에 업로드
      if (bgRemoved && transparentBlobRef.current) {
        transparentImageUrl = await uploadTransparentAvatar(
          transparentBlobRef.current,
          user.uid,
        );
      }

      const postData: AvatarPostCreateData = {
        authorUid: user.uid,
        authorName: userProfile.nickname || '익명',
        authorPhotoURL: userProfile.photoURL || null,
        characterName: searchResult.characterName,
        characterClass: searchResult.characterClass,
        characterLevel: searchResult.characterLevel,
        serverName: searchResult.serverName,
        characterImageUrl: searchResult.characterImageUrl,
        ...(bgRemoved && { backgroundId }),
        ...(transparentImageUrl && { transparentImageUrl }),
        title: title.trim(),
        description: description.trim(),
        avatarItems: searchResult.avatarItems,
      };

      const postId = await createAvatarPost(postData);
      router.push(`/avatar/${postId}`);
    } catch (err: any) {
      console.error('등록 실패:', err);
      setError('등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  // 현재 보여줄 이미지 URL (투명 처리됐으면 투명 이미지, 아니면 원본)
  const displayImageUrl = transparentBlobUrl || searchResult?.characterImageUrl || '';
  // 배경 스타일 (투명 이미지가 있을 때만 커스텀 배경)
  const imageWrapStyle = bgRemoved
    ? getBackgroundStyle(backgroundId)
    : { background: '#2a2035' };

  // 비로그인
  if (!user) {
    return (
      <Container fluid style={{ maxWidth: '1400px' }}>
        <div className={styles.registerWrapper}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>아바타 등록</h1>
          </div>
          <div className={styles.loginNotice}>
            <p className={styles.loginNoticeText}>
              아바타를 등록하려면 로그인이 필요합니다.
            </p>
            <p className={styles.loginNoticeText} style={{ fontSize: '0.85rem' }}>
              상단의 로그인 버튼을 눌러 Google 계정으로 로그인해주세요.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ maxWidth: '1400px' }}>
      <div className={styles.registerWrapper}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>아바타 등록</h1>
          <p className={styles.pageSubtitle}>
            캐릭터를 검색하여 아바타 염색 정보를 공유하세요
          </p>
        </div>

        {/* Step 1: 캐릭터 검색 */}
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            type="text"
            className={styles.searchInput}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="캐릭터명 입력"
            disabled={searching}
          />
          <button
            type="submit"
            className={styles.searchButton}
            disabled={searching || !searchName.trim()}
          >
            {searching ? '검색 중...' : '검색'}
          </button>
        </form>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', lineHeight: 1.6, textAlign: 'center' }}>
          아바타가 갱신되지 않나요? 인게임에서 아바타 전부 해제 → 영지 이동 → 다시 착용 → 영지 밖으로 이동 후 검색해보세요.
        </p>

        {error && !searchResult && <p className={styles.errorMsg}>{error}</p>}
        {searchResult && error && <p className={styles.errorMsg}>{error}</p>}

        {/* Step 2: 사이드바 + 콘텐츠 레이아웃 */}
        {searchResult && (
          <div className={styles.registerLayout}>
            {/* 왼쪽 사이드바 (sticky) */}
            <aside className={styles.registerSidebar}>
              <div className={styles.sidebarCard}>
                <h2 className={styles.previewCharName}>
                  {searchResult.characterName}
                </h2>
                <div
                  className={styles.previewImageWrap}
                  style={imageWrapStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bgRemoved && transparentBlobUrl ? transparentBlobUrl : searchResult.characterImageUrl}
                    alt={searchResult.characterName}
                    className={styles.previewCharImage}
                  />
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

                    {/* 배경 선택 */}
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
              {/* 아바타 목록 */}
              <AvatarItemList items={searchResult.avatarItems} />

              {/* 등록 폼 */}
              <form className={styles.registerForm} onSubmit={handleSubmit}>
                {error && <p className={styles.errorMsg}>{error}</p>}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="title">
                    제목 *
                  </label>
                  <input
                    id="title"
                    type="text"
                    className={styles.formInput}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 메탈 베어 + 낼롬 조합 염색"
                    maxLength={50}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="desc">
                    설명 (선택)
                  </label>
                  <textarea
                    id="desc"
                    className={styles.formTextarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="이 아바타 조합에 대한 설명이나 코멘트를 남겨보세요"
                    maxLength={300}
                    rows={3}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="submit"
                    className={styles.registerButton}
                    disabled={submitting || !title.trim()}
                  >
                    {submitting ? (bgRemoved ? '이미지 업로드 및 등록 중...' : '등록 중...') : '등록하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 닉네임 미설정 시 모달 */}
      {userProfile && !userProfile.nickname && <NicknameModal />}
    </Container>
  );
}
