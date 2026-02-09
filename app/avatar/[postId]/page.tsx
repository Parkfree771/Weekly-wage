'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvatarPost,
  incrementViewCount,
  toggleAvatarLike,
  checkAvatarLike,
  deleteAvatarPost,
} from '@/lib/avatar-service';
import AvatarItemList from '@/components/avatar/AvatarItemList';
import type { AvatarPost } from '@/types/avatar';
import { getBackgroundStyle, getGradeColor } from '@/types/avatar';
import styles from '../avatar.module.css';

/** 날짜 포맷 */
function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function AvatarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { user } = useAuth();

  const [post, setPost] = useState<AvatarPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const isOwner = user && post && user.uid === post.authorUid;

  // 게시물 로딩
  const viewCounted = useRef(false);

  useEffect(() => {
    if (!postId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getAvatarPost(postId);
        if (data) {
          setPost(data);
          setLikeCount(data.likeCount || 0);
          // 조회수 증가 (StrictMode 중복 방지)
          if (!viewCounted.current) {
            viewCounted.current = true;
            incrementViewCount(postId).catch(() => {});
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

  // 좋아요 상태 확인
  useEffect(() => {
    if (!user || !postId) return;
    checkAvatarLike(postId, user.uid).then(setLiked).catch(() => {});
  }, [user, postId]);

  // 좋아요 토글
  const handleLike = async () => {
    if (!user || !postId) return;
    try {
      const nowLiked = await toggleAvatarLike(postId, user.uid);
      setLiked(nowLiked);
      setLikeCount((prev) => prev + (nowLiked ? 1 : -1));
    } catch (err) {
      console.error('좋아요 실패:', err);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteAvatarPost(postId);
      router.push('/avatar');
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };


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

  return (
    <Container fluid style={{ maxWidth: '1400px' }}>
      <div className={styles.detailWrapper}>
        <Link href="/avatar" className={styles.backLink}>
          &#8592; 갤러리로 돌아가기
        </Link>

        <div className={styles.detailLayout}>
          {/* 좌측: 캐릭터 비주얼 */}
          <div className={styles.characterHeader}>
            <div
              className={styles.detailImageWrap}
              style={post.transparentImageUrl
                ? getBackgroundStyle(post.backgroundId)
                : { background: '#2a2035' }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.transparentImageUrl || post.characterImageUrl}
                alt={post.characterName}
                className={styles.detailCharImage}
              />
            </div>
            {/* 장착 아바타 아이콘 (3열 그리드, 머리→상의→하의 순) */}
            <div className={styles.equippedGrid}>
              {[...post.avatarItems]
                .filter(item => !item.isInner && item.icon)
                .sort((a, b) => {
                  const order: Record<string, number> = { '머리 아바타': 0, '상의 아바타': 1, '하의 아바타': 2 };
                  return (order[a.type] ?? 99) - (order[b.type] ?? 99);
                })
                .map((item, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={item.icon}
                    alt={item.type}
                    className={styles.equippedIcon}
                    style={{ borderColor: getGradeColor(item.grade) }}
                    title={item.name.replace(/\s*\(귀속\)/, '')}
                  />
                ))}
            </div>

            {/* 좋아요 · 조회수 | 수정 · 삭제 */}
            <div className={styles.detailStats}>
              <div className={styles.detailStatsLeft}>
                <button
                  className={`${styles.detailLike} ${liked ? styles.detailLiked : ''}`}
                  onClick={handleLike}
                  disabled={!user}
                  title={user ? '좋아요' : '로그인 후 이용 가능'}
                >
                  {liked ? '\u2764' : '\u2661'} {likeCount}
                </button>
                <span className={styles.viewCount}>{'\uD83D\uDC41'} {post.viewCount || 0}</span>
              </div>
              {isOwner && (
                <div className={styles.detailStatsRight}>
                  <Link href={`/avatar/edit/${postId}`} className={styles.editLink}>
                    수정
                  </Link>
                  <button className={styles.deleteBtn} onClick={handleDelete}>
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 우측: 아바타 & 염색 상세 */}
          <div className={styles.detailContent}>
            <AvatarItemList items={post.avatarItems} />
          </div>
        </div>
      </div>
    </Container>
  );
}
