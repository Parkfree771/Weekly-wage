'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { getInquiryPosts, isAdmin } from '@/lib/inquiry-service';
import type { InquiryPost } from '@/types/inquiry';
import InquiryWriteModal from './InquiryWriteModal';
import InquiryDetailModal from './InquiryDetailModal';
import styles from './InquiryBoard.module.css';

const PAGE_SIZE = 7;

function formatShortDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${m}.${dd}`;
}

export default function InquiryBoard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<InquiryPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showWrite, setShowWrite] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const userEmail = user?.email || null;
  const admin = isAdmin(userEmail);

  const loadPosts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await getInquiryPosts(p, PAGE_SIZE, userEmail);
      setPosts(result.posts);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('게시물 로딩 실패:', err);
    }
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    loadPosts(page);
  }, [page, loadPosts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handlePostClick = (post: InquiryPost) => {
    // 비공개 글 접근 차단
    if ((post as any)._redacted) {
      alert('비공개 글은 작성자와 관리자만 볼 수 있습니다.');
      return;
    }
    setDetailPostId(post.id);
  };

  const handleWriteClick = () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    setShowWrite(true);
  };

  return (
    <>
      <Card className="h-100" style={{ overflow: 'hidden' }}>
        <Card.Header
          className="py-2"
          style={{
            backgroundColor: 'var(--card-header-bg)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
            문의하기
          </h3>
          <button className={styles.writeBtn} onClick={handleWriteClick}>
            글쓰기
          </button>
        </Card.Header>
        <Card.Body className="p-0" style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className={styles.loadingArea}>
              <Spinner animation="border" size="sm" />
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyArea}>
              아직 문의가 없습니다.
            </div>
          ) : (
            <div className={styles.postList}>
              {posts.map((post) => {
                const redacted = (post as any)._redacted;
                return (
                  <div
                    key={post.id}
                    className={`${styles.postRow} ${redacted ? styles.postRowRedacted : ''}`}
                    onClick={() => handlePostClick(post)}
                  >
                    <span className={redacted ? styles.postTitleRedacted : styles.postTitle}>
                      {post.title}
                      {post.commentCount > 0 && (
                        <span className={styles.commentBadge}>&nbsp;[{post.commentCount}]</span>
                      )}
                    </span>
                    <span className={styles.postAuthor}>
                      {!redacted && (!post.isPrivate || admin) ? post.authorNickname : ''}
                    </span>
                    <span className={styles.postDate}>{formatShortDate(post.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <InquiryWriteModal
        show={showWrite}
        onClose={() => setShowWrite(false)}
        onCreated={() => { setPage(1); loadPosts(1); }}
      />

      <InquiryDetailModal
        postId={detailPostId}
        onClose={() => setDetailPostId(null)}
        onDeleted={() => loadPosts(page)}
      />
    </>
  );
}
