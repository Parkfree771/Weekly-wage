// 아바타 글의 유저 착장 — packagePosts/{postId}/avatarLooks (Firestore 클라이언트).
// 목록은 상세 서버 페이지(ISR)가 읽어 넘긴다. 여기는 쓰기·삭제와, 서버가 못 읽었을 때의 예비 조회만.
// firestore SDK 가 무거우므로 호출부에서 await import 로 불러 쓴다.

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  increment,
  writeBatch,
  query,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase-firestore';
import type { AvatarLook } from '@/types/package';

const SUB = 'avatarLooks';
/** 한 글에서 읽는 착장 상한 — 서버 페이지와 같은 값 */
export const AVATAR_LOOKS_LIMIT = 300;

export async function createAvatarLook(
  postId: string,
  data: Omit<AvatarLook, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'packagePosts', postId, SUB), {
    ...data,
    // 좋아요순 정렬(orderBy likeCount)에 빠지지 않게 0 으로 시작한다 — 필드가 없는 문서는 정렬 쿼리에서 빠진다
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteAvatarLook(postId: string, lookId: string): Promise<void> {
  await deleteDoc(doc(db, 'packagePosts', postId, SUB, lookId));
}

export async function getAvatarLooks(postId: string): Promise<AvatarLook[]> {
  const snap = await getDocs(
    query(collection(db, 'packagePosts', postId, SUB), orderBy('createdAt', 'desc'), firestoreLimit(AVATAR_LOOKS_LIMIT)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt as { toDate?: () => Date } | null;
    return {
      ...(data as Omit<AvatarLook, 'id'>),
      id: d.id,
      createdAt: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : null,
    };
  });
}

// ─── 착장 좋아요 (로그인 1인 1표) ───
// likes/{uid} 문서 + 착장 likeCount ±1 을 한 번에 쓴다. firestore.rules 가 둘이 짝으로만 바뀌게 막는다.

function likeRef(postId: string, lookId: string, uid: string) {
  return doc(db, 'packagePosts', postId, SUB, lookId, 'likes', uid);
}

export async function hasLikedLook(postId: string, lookId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(likeRef(postId, lookId, uid));
  return snap.exists();
}

/** 좋아요 켜기/끄기 — 바뀐 뒤 상태(true=좋아요 중)를 돌려준다 */
export async function setLookLike(postId: string, lookId: string, uid: string, like: boolean): Promise<boolean> {
  const batch = writeBatch(db);
  const lookRef = doc(db, 'packagePosts', postId, SUB, lookId);
  if (like) {
    batch.set(likeRef(postId, lookId, uid), { createdAt: serverTimestamp() });
    batch.update(lookRef, { likeCount: increment(1) });
  } else {
    batch.delete(likeRef(postId, lookId, uid));
    batch.update(lookRef, { likeCount: increment(-1) });
  }
  await batch.commit();
  return like;
}
