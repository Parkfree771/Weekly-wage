'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createPackageComment,
  getPackageComments,
  updatePackageComment,
  deletePackageComment,
} from '@/lib/package-service';
import type { PackageComment } from '@/types/package';
import styles from './CommentSection.module.css';

type Props = {
  postId: string;
  commentCount: number;
  onCommentCountChange: (delta: number) => void;
};

const MAX_LEN = 500;

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

function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  return new Date(ts).getTime();
}

export default function CommentSection({ postId, commentCount, onCommentCountChange }: Props) {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<PackageComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPackageComments(postId);
        setComments(data);
      } catch (err) {
        console.error('댓글 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  // 부모 댓글 + 자식 그룹핑 (1단 평탄화)
  const { parents, repliesByParent } = useMemo(() => {
    const parents: PackageComment[] = [];
    const repliesByParent = new Map<string, PackageComment[]>();
    for (const c of comments) {
      if (c.parentId) {
        const arr = repliesByParent.get(c.parentId) ?? [];
        arr.push(c);
        repliesByParent.set(c.parentId, arr);
      } else {
        parents.push(c);
      }
    }
    // 답글은 오래된 순
    for (const arr of repliesByParent.values()) {
      arr.sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
    }
    return { parents, repliesByParent };
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile?.nickname || !newComment.trim()) return;
    if (newComment.length > MAX_LEN) return;

    setSubmitting(true);
    try {
      const id = await createPackageComment(postId, {
        postId,
        authorUid: user.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: null,
        content: newComment.trim(),
        parentId: null,
      });
      setComments((prev) => [
        {
          id,
          postId,
          authorUid: user.uid,
          authorNickname: userProfile.nickname!,
          authorPhotoURL: null,
          content: newComment.trim(),
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...prev,
      ]);
      setNewComment('');
      onCommentCountChange(1);
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!user || !userProfile?.nickname || !replyContent.trim()) return;
    if (replyContent.length > MAX_LEN) return;

    setReplySubmitting(true);
    try {
      const id = await createPackageComment(postId, {
        postId,
        authorUid: user.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: null,
        content: replyContent.trim(),
        parentId,
      });
      setComments((prev) => [
        ...prev,
        {
          id,
          postId,
          authorUid: user.uid,
          authorNickname: userProfile.nickname!,
          authorPhotoURL: null,
          content: replyContent.trim(),
          parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      setReplyContent('');
      setReplyingTo(null);
      onCommentCountChange(1);
    } catch (err) {
      console.error('답글 작성 실패:', err);
      alert('답글 작성에 실패했습니다.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleEditSave = async (commentId: string) => {
    if (!editContent.trim() || editContent.length > MAX_LEN) return;
    try {
      await updatePackageComment(postId, commentId, editContent.trim());
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, content: editContent.trim(), updatedAt: new Date() } : c,
        ),
      );
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: string) => {
    const replies = repliesByParent.get(commentId) ?? [];
    const hasReplies = replies.length > 0;
    const msg = hasReplies
      ? `답글 ${replies.length}개도 함께 삭제됩니다. 삭제하시겠습니까?`
      : '댓글을 삭제하시겠습니까?';
    if (!confirm(msg)) return;

    try {
      // 답글 먼저 삭제 후 부모 삭제
      for (const r of replies) {
        await deletePackageComment(postId, r.id);
      }
      await deletePackageComment(postId, commentId);
      const idsToRemove = new Set([commentId, ...replies.map((r) => r.id)]);
      setComments((prev) => prev.filter((c) => !idsToRemove.has(c.id)));
      onCommentCountChange(-(replies.length + 1));
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('답글을 삭제하시겠습니까?')) return;
    try {
      await deletePackageComment(postId, replyId);
      setComments((prev) => prev.filter((c) => c.id !== replyId));
      onCommentCountChange(-1);
    } catch (err) {
      console.error('답글 삭제 실패:', err);
      alert('답글 삭제에 실패했습니다.');
    }
  };

  const renderCommentBody = (c: PackageComment, isReply: boolean) => {
    const isOwner = user && user.uid === c.authorUid;
    const isEditing = editingId === c.id;

    return (
      <>
        <div className={styles.cardHeader}>
          <div className={styles.authorSection}>
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>{c.authorNickname}</span>
              <span className={styles.timestamp}>
                {formatDate(c.createdAt)}
                {c.updatedAt && String(c.updatedAt) !== String(c.createdAt) && (
                  <span className={styles.edited}>(수정됨)</span>
                )}
              </span>
            </div>
          </div>
          {isOwner && !isEditing && (
            <div className={styles.actions}>
              <button
                className={styles.editBtn}
                onClick={() => {
                  setEditingId(c.id);
                  setEditContent(c.content);
                }}
              >
                수정
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => (isReply ? handleDeleteReply(c.id) : handleDelete(c.id))}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea
              className={styles.editTextarea}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={MAX_LEN}
            />
            <div className={styles.editActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setEditingId(null);
                  setEditContent('');
                }}
              >
                취소
              </button>
              <button
                className={styles.saveBtn}
                onClick={() => handleEditSave(c.id)}
                disabled={!editContent.trim() || editContent.length > MAX_LEN}
              >
                저장
              </button>
            </div>
          </>
        ) : (
          <div className={styles.content}>{c.content}</div>
        )}
      </>
    );
  };

  return (
    <section className={styles.commentSection}>
      <h2 className={styles.commentHeader}>
        댓글 <span className={styles.commentCount}>{commentCount}</span>
      </h2>

      {/* 작성 폼 */}
      {user && userProfile?.nickname ? (
        <form className={styles.commentForm} onSubmit={handleSubmit}>
          <textarea
            className={styles.commentTextarea}
            placeholder="댓글을 입력하세요"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={MAX_LEN}
          />
          <div className={styles.commentFormActions}>
            <span className={`${styles.charCount} ${newComment.length > MAX_LEN ? styles.charCountOver : ''}`}>
              {newComment.length} / {MAX_LEN}
            </span>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!newComment.trim() || newComment.length > MAX_LEN || submitting}
            >
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.loginPrompt}>
          댓글을 작성하려면 로그인이 필요합니다
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : parents.length === 0 ? (
        <div className={styles.empty}>댓글이 없습니다</div>
      ) : (
        <div className={styles.commentList}>
          {parents.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const isReplying = replyingTo === c.id;

            return (
              <div key={c.id} className={styles.commentCard}>
                {renderCommentBody(c, false)}

                {/* 답글 버튼 */}
                {!editingId && (
                  <div className={styles.replyToolbar}>
                    {user && userProfile?.nickname && (
                      <button
                        className={styles.replyBtn}
                        onClick={() => {
                          if (isReplying) {
                            setReplyingTo(null);
                            setReplyContent('');
                          } else {
                            setReplyingTo(c.id);
                            setReplyContent('');
                          }
                        }}
                      >
                        {isReplying ? '취소' : '답글'}
                      </button>
                    )}
                  </div>
                )}

                {/* 답글 작성 폼 */}
                {isReplying && (
                  <div className={styles.replyForm}>
                    <textarea
                      className={styles.replyTextarea}
                      placeholder="답글을 입력하세요"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      maxLength={MAX_LEN}
                    />
                    <div className={styles.commentFormActions}>
                      <span className={`${styles.charCount} ${replyContent.length > MAX_LEN ? styles.charCountOver : ''}`}>
                        {replyContent.length} / {MAX_LEN}
                      </span>
                      <button
                        className={styles.submitBtn}
                        onClick={() => handleReplySubmit(c.id)}
                        disabled={!replyContent.trim() || replyContent.length > MAX_LEN || replySubmitting}
                      >
                        {replySubmitting ? '작성 중...' : '답글 작성'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 답글 목록 */}
                {replies.length > 0 && (
                  <div className={styles.replyList}>
                    {replies.map((r) => (
                      <div key={r.id} className={styles.replyCard}>
                        {renderCommentBody(r, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
