'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Form } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import {
  getInquiryPost,
  getInquiryComments,
  createInquiryComment,
  deleteInquiryComment,
  deleteInquiryPost,
  isAdmin,
  ADMIN_EMAIL,
} from '@/lib/inquiry-service';
import type { InquiryPost, InquiryComment } from '@/types/inquiry';
import styles from './InquiryBoard.module.css';

type Props = {
  postId: string | null;
  onClose: () => void;
  onDeleted: () => void;
};

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

export default function InquiryDetailModal({ postId, onClose, onDeleted }: Props) {
  const { user } = useAuth();
  const { userProfile } = useAuth();
  const [post, setPost] = useState<InquiryPost | null>(null);
  const [comments, setComments] = useState<InquiryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userEmail = user?.email || null;
  const admin = isAdmin(userEmail);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    (async () => {
      try {
        const [p, c] = await Promise.all([
          getInquiryPost(postId),
          getInquiryComments(postId),
        ]);
        setPost(p);
        setComments(c);
      } catch (err) {
        console.error('게시물 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  if (!postId) return null;

  const canComment = post && (!post.isPrivate || admin || post.authorEmail === userEmail);
  const canDelete = post && (admin || post.authorUid === user?.uid);

  const handleAddComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const id = await createInquiryComment(post.id, {
        postId: post.id,
        authorUid: user.uid,
        authorNickname: userProfile?.nickname || user.displayName || '익명',
        authorEmail: user.email || '',
        content: newComment.trim(),
      });
      setComments((prev) => [
        ...prev,
        {
          id,
          postId: post.id,
          authorUid: user.uid,
          authorNickname: userProfile?.nickname || user.displayName || '익명',
          authorEmail: user.email || '',
          content: newComment.trim(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      setNewComment('');
    } catch (err) {
      console.error('댓글 작성 실패:', err);
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteInquiryComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !confirm('게시물을 삭제하시겠습니까?')) return;
    try {
      await deleteInquiryPost(post.id);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('게시물 삭제 실패:', err);
    }
  };

  return (
    <Modal show={!!postId} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '1rem', fontWeight: 600 }}>
          {loading ? '로딩 중...' : post?.title || '게시물'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
        ) : !post ? (
          <p className="text-center text-muted">게시물을 찾을 수 없습니다.</p>
        ) : (
          <>
            {/* 글 정보 */}
            <div className={styles.detailMeta}>
              <span className={styles.detailAuthor}>
                {post.authorNickname}
                {post.authorEmail === ADMIN_EMAIL && (
                  <span className={styles.adminBadge}>관리자</span>
                )}
              </span>
              <span className={styles.detailDate}>{formatDate(post.createdAt)}</span>
              {post.isPrivate && <span className={styles.privateBadge}>비밀글</span>}
            </div>

            {/* 글 내용 */}
            <div className={styles.detailContent}>
              {post.content.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '0.25rem 0' }}>{line || '\u00A0'}</p>
              ))}
            </div>

            {canDelete && (
              <div className="text-end mt-2">
                <Button variant="outline-danger" size="sm" onClick={handleDeletePost}>
                  삭제
                </Button>
              </div>
            )}

            {/* 댓글 */}
            <div className={styles.commentArea}>
              <div className={styles.commentHeader}>댓글 {comments.length}</div>
              {comments.length === 0 ? (
                <p className={styles.commentEmpty}>아직 댓글이 없습니다.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={styles.commentItem}>
                    <div className={styles.commentItemHeader}>
                      <span className={styles.commentAuthor}>
                        {c.authorNickname}
                        {c.authorEmail === ADMIN_EMAIL && (
                          <span className={styles.adminBadge}>관리자</span>
                        )}
                      </span>
                      <div className={styles.commentActions}>
                        <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
                        {(admin || c.authorUid === user?.uid) && (
                          <button
                            className={styles.commentDeleteBtn}
                            onClick={() => handleDeleteComment(c.id)}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={styles.commentText}>{c.content}</p>
                  </div>
                ))
              )}

              {/* 댓글 입력 */}
              {user && canComment ? (
                <div className={styles.commentForm}>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요"
                    maxLength={500}
                    disabled={submitting}
                    className={styles.commentInput}
                  />
                  <div className={styles.commentFormFooter}>
                    <span className={styles.commentCharCount}>{newComment.length}/500</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddComment}
                      disabled={submitting || !newComment.trim()}
                    >
                      {submitting ? <Spinner animation="border" size="sm" /> : '등록'}
                    </Button>
                  </div>
                </div>
              ) : !user ? (
                <p className={styles.commentEmpty}>댓글을 작성하려면 로그인이 필요합니다.</p>
              ) : null}
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
