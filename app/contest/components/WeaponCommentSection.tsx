'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../contest.module.css';
import { useAuth } from '@/contexts/AuthContext';
import {
  createWeaponComment,
  deleteWeaponComment,
  getWeaponComments,
  updateWeaponComment,
} from '@/lib/contest-service';
import type { ContestWeaponComment } from '@/types/contest';

type Props = {
  illustrationSlug: string;
  weaponId: string;
  onCountChange?: (delta: number) => void;
};

const MAX_LEN = 300;

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

export default function WeaponCommentSection({
  illustrationSlug,
  weaponId,
  onCountChange,
}: Props) {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<ContestWeaponComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const data = await getWeaponComments(illustrationSlug, weaponId);
        setComments(data);
      } catch (err) {
        console.error('무기 댓글 로딩 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [illustrationSlug, weaponId]);

  const { parents, repliesByParent } = useMemo(() => {
    const parents: ContestWeaponComment[] = [];
    const repliesByParent = new Map<string, ContestWeaponComment[]>();
    for (const c of comments) {
      if (c.parentId) {
        const arr = repliesByParent.get(c.parentId) ?? [];
        arr.push(c);
        repliesByParent.set(c.parentId, arr);
      } else {
        parents.push(c);
      }
    }
    repliesByParent.forEach((arr) =>
      arr.sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt)),
    );
    return { parents, repliesByParent };
  }, [comments]);

  const authorName =
    userProfile?.nickname ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : '익명');

  const submit = async (parentId: string | null, body: string) => {
    if (!user) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_LEN) {
      alert(`댓글은 ${MAX_LEN}자 이내로 작성해주세요.`);
      return;
    }
    try {
      const id = await createWeaponComment({
        weaponId,
        illustrationSlug,
        uid: user.uid,
        authorName,
        content: trimmed,
        parentId,
      });
      const optimistic: ContestWeaponComment = {
        id,
        weaponId,
        illustrationSlug,
        uid: user.uid,
        authorName,
        content: trimmed,
        parentId,
        createdAt: { toDate: () => new Date() } as any,
        updatedAt: { toDate: () => new Date() } as any,
      };
      setComments((prev) => [optimistic, ...prev]);
      onCountChange?.(1);
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);
    await submit(null, content);
    setContent('');
    setSubmitting(false);
  };

  const handleReply = async (parentId: string) => {
    if (!user) return;
    await submit(parentId, replyContent);
    setReplyContent('');
    setReplyingTo(null);
  };

  const startEdit = (c: ContestWeaponComment) => {
    setEditingId(c.id);
    setEditContent(c.content);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };
  const saveEdit = async (commentId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    try {
      await updateWeaponComment(illustrationSlug, weaponId, commentId, trimmed);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: trimmed } : c)),
      );
      cancelEdit();
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정에 실패했습니다.');
    }
  };
  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteWeaponComment(illustrationSlug, weaponId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCountChange?.(-1);
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const renderComment = (c: ContestWeaponComment, isReply = false) => {
    const isMine = !!user && c.uid === user.uid;
    const isEditing = editingId === c.id;
    return (
      <div
        key={c.id}
        className={`${styles.commentItem} ${isReply ? styles.commentReply : ''}`}
      >
        <div className={styles.commentHeader}>
          <span className={styles.commentAuthor}>{c.authorName}</span>
          <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
        </div>
        {isEditing ? (
          <>
            <textarea
              className={styles.commentTextarea}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={MAX_LEN}
            />
            <div className={styles.commentActions}>
              <button
                type="button"
                className={styles.commentActionBtn}
                onClick={() => saveEdit(c.id)}
              >
                저장
              </button>
              <button
                type="button"
                className={styles.commentActionBtn}
                onClick={cancelEdit}
              >
                취소
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.commentContent}>{c.content}</div>
            <div className={styles.commentActions}>
              {!isReply && user && (
                <button
                  type="button"
                  className={styles.commentActionBtn}
                  onClick={() =>
                    setReplyingTo(replyingTo === c.id ? null : c.id)
                  }
                >
                  {replyingTo === c.id ? '답글 닫기' : '답글'}
                </button>
              )}
              {isMine && (
                <>
                  <button
                    type="button"
                    className={styles.commentActionBtn}
                    onClick={() => startEdit(c)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className={`${styles.commentActionBtn} ${styles.commentActionDanger}`}
                    onClick={() => handleDelete(c.id)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
            {replyingTo === c.id && (
              <div style={{ marginTop: 12 }}>
                <textarea
                  className={styles.commentTextarea}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="답글을 작성하세요"
                  maxLength={MAX_LEN}
                />
                <div className={styles.commentToolbar}>
                  <span className={styles.commentLength}>
                    {replyContent.length} / {MAX_LEN}
                  </span>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={() => handleReply(c.id)}
                    disabled={!replyContent.trim()}
                  >
                    답글 등록
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.detailCommentBox}>
      {user ? (
        <form onSubmit={handleSubmit} className={styles.commentForm}>
          <textarea
            className={styles.commentTextarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="이 무기 아바타에 대한 의견을 남겨주세요"
            maxLength={MAX_LEN}
          />
          <div className={styles.commentToolbar}>
            <span className={styles.commentLength}>
              {content.length} / {MAX_LEN}
            </span>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!content.trim() || submitting}
            >
              {submitting ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.signInPrompt}>
          댓글은 로그인 후 이용할 수 있습니다.
        </div>
      )}

      {loading ? (
        <div className={styles.commentEmpty}>댓글을 불러오는 중...</div>
      ) : parents.length === 0 ? (
        <div className={styles.commentEmpty}>첫 댓글을 남겨보세요.</div>
      ) : (
        <div className={styles.commentList}>
          {parents.map((p) => (
            <div key={p.id}>
              {renderComment(p)}
              {(repliesByParent.get(p.id) ?? []).map((r) =>
                renderComment(r, true),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
