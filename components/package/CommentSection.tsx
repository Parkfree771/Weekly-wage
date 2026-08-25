'use client';

import { memo, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import {
  createPackageComment,
  getPackageComments,
  updatePackageComment,
  deletePackageComment,
} from '@/lib/package-service';
import type { PackageComment } from '@/types/package';
import ReactionBar from '@/components/package/ReactionBar';
import styles from './CommentSection.module.css';

type Props = {
  postId: string;
  commentCount: number;
  onCommentCountChange: (delta: number) => void;
  /** 서버(ISR)가 같이 읽은 댓글. 있으면 Firestore 를 읽지 않는다 */
  initialComments?: PackageComment[] | null;
  likeCount: number;
  sosoCount: number;
};

const MAX_LEN = 500;
// 답글이 이 수를 넘으면 접어 두고 "답글 N개 보기" 로 편다
const REPLY_FOLD = 3;

// 모바일에서 키보드가 올라오면 입력칸이 가려지거나 화면 맨 위로 튄다 —
// 키보드 애니메이션이 끝난 뒤 입력칸을 화면 가운데에 둔다 (데스크톱은 스크롤이 거의 안 움직인다)
function keepInView(e: React.FocusEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget;
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
}

// 댓글 작성·삭제 뒤 ISR 사본을 바로 갱신 — 다음 방문자가 5분 기다리지 않게. 실패해도 화면은 이미 반영됨
function revalidateDetail(postId: string) {
  fetch('/api/package/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
    keepalive: true,
  }).catch(() => {});
}

// 아바타 — 사진이 없으니 닉네임 첫 글자. 닉네임으로 색을 정해 같은 사람은 늘 같은 색
const AVATAR_HUES = [14, 32, 200, 226, 262, 152];
function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

// 원정대를 등록한 사람은 대표 캐릭터 그림(로아 API CharacterImage), 아니면 닉네임 첫 글자.
// 그림은 세로 초상이라 얼굴이 있는 위쪽을 동그라미에 맞춰 자른다.
function Avatar({ name, photo, small }: { name: string; photo?: string | null; small?: boolean }) {
  const cls = `${styles.avatar} ${small ? styles.avatarSmall : ''}`;
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" className={`${cls} ${styles.avatarImg}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    );
  }
  return (
    <span className={cls} style={{ '--avatar-hue': avatarHue(name) } as React.CSSProperties} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

/** 내 대표 캐릭터 그림 — 댓글에 저장해 두면 읽는 쪽은 추가 조회 없이 그대로 쓴다 */
function mainCharacterImage(profile: { mainCharacter?: string; characters?: { name: string; imageUrl: string }[] } | null): string | null {
  const chars = profile?.characters ?? [];
  const main = chars.find((c) => c.name === profile?.mainCharacter) ?? chars[0];
  return main?.imageUrl || null;
}

function formatDate(ts: unknown): string {
  if (!ts) return '';
  const d = tsToDate(ts);
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

function tsToDate(ts: unknown): Date {
  const t = ts as { toDate?: () => Date } | Date | string | number;
  if (t instanceof Date) return t;
  if (t && typeof (t as { toDate?: () => Date }).toDate === 'function') return (t as { toDate: () => Date }).toDate();
  return new Date(t as string | number);
}
function tsToMs(ts: unknown): number {
  return ts ? tsToDate(ts).getTime() : 0;
}

// memo: 부모(상세)의 환율 타이핑·가챠 애니메이션 등 무관한 리렌더마다
// 댓글 트리(최대 200개) JSX 를 다시 만드는 것을 막는다 — 콜백 prop 은 부모가 useCallback 으로 고정
function CommentSection({ postId, commentCount, onCommentCountChange, initialComments = null, likeCount, sosoCount }: Props) {
  const { user, userProfile, signInWithGoogle } = useAuth();
  const canWrite = !!(user && userProfile?.nickname);
  const [comments, setComments] = useState<PackageComment[]>(initialComments ?? []);
  const [loading, setLoading] = useState(!initialComments);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 서버가 넘겨준 댓글이 있으면 그대로 — Firestore 읽기 0 (글이 바뀌면 prop 도 같이 바뀐다)
    if (initialComments) {
      setComments(initialComments);
      setLoading(false);
      return;
    }
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
  }, [postId, initialComments]);

  // 부모 댓글 + 자식 그룹핑 (1단 평탄화). 부모·답글 모두 오래된 순 — 처음 쓴 댓글이 맨 위, 새 댓글은 입력칸 바로 위
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
    parents.sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
    for (const arr of repliesByParent.values()) {
      arr.sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt));
    }
    return { parents, repliesByParent };
  }, [comments]);

  const myPhoto = mainCharacterImage(userProfile);
  const makeLocal = (id: string, content: string, parentId: string | null): PackageComment => ({
    id,
    postId,
    authorUid: user!.uid,
    authorNickname: userProfile!.nickname!,
    authorPhotoURL: myPhoto,
    content,
    parentId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !newComment.trim() || newComment.length > MAX_LEN) return;
    setSubmitting(true);
    try {
      const content = newComment.trim();
      const id = await createPackageComment(postId, {
        postId, authorUid: user!.uid, authorNickname: userProfile!.nickname!, authorPhotoURL: myPhoto, content, parentId: null,
      });
      setComments((prev) => [...prev, makeLocal(id, content, null)]);
      setNewComment('');
      onCommentCountChange(1);
      revalidateDetail(postId);
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!canWrite || !replyContent.trim() || replyContent.length > MAX_LEN) return;
    setReplySubmitting(true);
    try {
      const content = replyContent.trim();
      const id = await createPackageComment(postId, {
        postId, authorUid: user!.uid, authorNickname: userProfile!.nickname!, authorPhotoURL: myPhoto, content, parentId,
      });
      setComments((prev) => [...prev, makeLocal(id, content, parentId)]);
      setReplyContent('');
      setReplyingTo(null);
      setExpanded((prev) => new Set(prev).add(parentId)); // 방금 단 답글이 접혀서 안 보이지 않게
      onCommentCountChange(1);
      revalidateDetail(postId);
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
        prev.map((c) => (c.id === commentId ? { ...c, content: editContent.trim(), updatedAt: new Date() } : c)),
      );
      setEditingId(null);
      setEditContent('');
      revalidateDetail(postId);
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId: string) => {
    const replies = repliesByParent.get(commentId) ?? [];
    const msg = replies.length > 0
      ? `답글 ${replies.length}개도 함께 삭제됩니다. 삭제하시겠습니까?`
      : '댓글을 삭제하시겠습니까?';
    if (!confirm(msg)) return;
    try {
      // 답글 먼저 삭제 후 부모 삭제
      for (const r of replies) await deletePackageComment(postId, r.id);
      await deletePackageComment(postId, commentId);
      const idsToRemove = new Set([commentId, ...replies.map((r) => r.id)]);
      setComments((prev) => prev.filter((c) => !idsToRemove.has(c.id)));
      onCommentCountChange(-(replies.length + 1));
      revalidateDetail(postId);
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
      revalidateDetail(postId);
    } catch (err) {
      console.error('답글 삭제 실패:', err);
      alert('답글 삭제에 실패했습니다.');
    }
  };

  // 답글 열기 — 답글에 답글을 달면 같은 스레드(부모) 아래로 가고, 누구에게 하는 말인지 @닉네임 을 앞에 붙인다
  const openReply = (parentId: string, mention?: string) => {
    setEditingId(null);
    setReplyingTo(parentId);
    setReplyContent(mention ? `@${mention} ` : '');
    setExpanded((prev) => new Set(prev).add(parentId));
    setTimeout(() => replyInputRef.current?.focus(), 0);
  };
  const closeReply = () => { setReplyingTo(null); setReplyContent(''); };

  // 한 댓글(부모/답글 공용): 아바타 · 이름·시간 · 본문 · 작은 액션 줄
  const renderComment = (c: PackageComment, parentId: string | null) => {
    const isReply = parentId !== null;
    const isOwner = !!user && (user.uid === c.authorUid || isAdmin(user.email));
    const isEditing = editingId === c.id;
    const edited = c.updatedAt && String(c.updatedAt) !== String(c.createdAt);

    return (
      <div className={`${styles.comment} ${isReply ? styles.commentReply : ''}`}>
        <Avatar name={c.authorNickname} photo={c.authorPhotoURL} small={isReply} />
        <div className={styles.commentBody}>
          <div className={styles.meta}>
            <span className={styles.authorName}>{c.authorNickname}</span>
            <span className={styles.timestamp}>{formatDate(c.createdAt)}</span>
            {edited && <span className={styles.edited}>수정됨</span>}
          </div>

          {isEditing ? (
            <div className={styles.editBox}>
              <textarea
                className={styles.editTextarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onFocus={keepInView}
                maxLength={MAX_LEN}
                autoFocus
              />
              <div className={styles.editActions}>
                <button type="button" className={styles.ghostBtn} onClick={() => { setEditingId(null); setEditContent(''); }}>
                  취소
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => handleEditSave(c.id)}
                  disabled={!editContent.trim() || editContent.length > MAX_LEN}
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.content}>{c.content}</p>
          )}

          {!isEditing && (
            <div className={styles.actionRow}>
              {canWrite && (
                <button
                  type="button"
                  className={styles.textBtn}
                  onClick={() => openReply(isReply ? parentId! : c.id, isReply ? c.authorNickname : undefined)}
                >
                  답글
                </button>
              )}
              {isOwner && (
                <>
                  <button type="button" className={styles.textBtn} onClick={() => { closeReply(); setEditingId(c.id); setEditContent(c.content); }}>
                    수정
                  </button>
                  <button
                    type="button"
                    className={`${styles.textBtn} ${styles.textBtnDanger}`}
                    onClick={() => (isReply ? handleDeleteReply(c.id) : handleDelete(c.id))}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReplyForm = (parentId: string) => (
    <div className={styles.replyForm}>
      {userProfile?.nickname && <Avatar name={userProfile.nickname} photo={myPhoto} small />}
      <div className={styles.replyFormBody}>
        <textarea
          ref={replyInputRef}
          className={styles.replyTextarea}
          placeholder="답글을 입력하세요"
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          onFocus={keepInView}
          onKeyDown={(e) => { if (e.key === 'Escape') closeReply(); }}
          maxLength={MAX_LEN}
          rows={2}
        />
        <div className={styles.formActions}>
          <span className={`${styles.charCount} ${replyContent.length > MAX_LEN ? styles.charCountOver : ''}`}>
            {replyContent.length}/{MAX_LEN}
          </span>
          <button type="button" className={styles.ghostBtn} onClick={closeReply}>취소</button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => handleReplySubmit(parentId)}
            disabled={!replyContent.trim() || replyContent.length > MAX_LEN || replySubmitting}
          >
            {replySubmitting ? '작성 중…' : '답글 달기'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section className={styles.commentSection}>
      {/* 머리 띠: 댓글 수 왼쪽, 따봉·흠(이모지만) 오른쪽 — 한 상자로 묶어 댓글 영역의 시작을 알린다 */}
      <div className={styles.headerRow}>
        <h2 className={styles.commentHeader}>
          댓글 <span className={styles.commentCount}>{commentCount}</span>
        </h2>
        <ReactionBar postId={postId} likeCount={likeCount} sosoCount={sosoCount} size={28} className={styles.headerReactions} />
      </div>

      {/* 댓글 목록 — 스레드: 부모 아래 답글이 세로 줄로 이어진다 */}
      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : parents.length > 0 && (
        <div className={styles.commentList}>
          {parents.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const isOpen = expanded.has(c.id);
            const folded = !isOpen && replies.length > REPLY_FOLD;
            const shown = folded ? replies.slice(0, REPLY_FOLD) : replies;
            const isReplying = replyingTo === c.id;

            return (
              <div key={c.id} className={styles.thread}>
                {renderComment(c, null)}

                {(replies.length > 0 || isReplying) && (
                  <div className={styles.replies}>
                    {shown.map((r) => (
                      <div key={r.id}>{renderComment(r, c.id)}</div>
                    ))}
                    {folded && (
                      <button
                        type="button"
                        className={styles.moreBtn}
                        onClick={() => setExpanded((prev) => new Set(prev).add(c.id))}
                      >
                        답글 {replies.length - REPLY_FOLD}개 더 보기
                      </button>
                    )}
                    {isReplying && renderReplyForm(c.id)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 작성 폼 — 댓글을 다 내려온 자리(채팅창처럼) */}
      {canWrite ? (
        <form className={styles.commentForm} onSubmit={handleSubmit}>
          <Avatar name={userProfile!.nickname!} photo={myPhoto} />
          <div className={styles.replyFormBody}>
            <textarea
              className={styles.commentTextarea}
              placeholder="댓글을 입력하세요"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onFocus={keepInView}
              maxLength={MAX_LEN}
              rows={2}
            />
            <div className={styles.formActions}>
              <span className={`${styles.charCount} ${newComment.length > MAX_LEN ? styles.charCountOver : ''}`}>
                {newComment.length}/{MAX_LEN}
              </span>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={!newComment.trim() || newComment.length > MAX_LEN || submitting}
              >
                {submitting ? '작성 중…' : '댓글 작성'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className={styles.loginPrompt}>
          <span>댓글은 로그인 후 남길 수 있어요. 따봉·흠은 로그인 없이도 됩니다.</span>
          <button type="button" className={styles.primaryBtn} onClick={() => signInWithGoogle().catch(() => {})}>
            Google 로그인
          </button>
        </div>
      )}
    </section>
  );
}

export default memo(CommentSection);
