// 아바타 갤러리 Firestore CRUD 서비스

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  where,
  increment,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase-client';
import type {
  AvatarPost,
  AvatarPostCreateData,
  AvatarListOptions,
} from '@/types/avatar';

const COLLECTION = 'avatarPosts';

// ─── 생성 ───

/** 아바타 게시물 생성 → 생성된 문서 ID 반환 */
export async function createAvatarPost(
  data: AvatarPostCreateData,
): Promise<string> {
  const docData = {
    ...data,
    viewCount: 0,
    likeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), docData);
  return docRef.id;
}

// ─── 목록 조회 ───

/** 게시물 목록 (페이지네이션) */
export async function getAvatarPosts(options: AvatarListOptions): Promise<{
  posts: AvatarPost[];
  lastDoc: DocumentSnapshot | null;
}> {
  const { sortBy, filterClass, limit: pageSize, startAfterDoc } = options;

  const constraints: any[] = [];

  // 클래스 필터
  if (filterClass) {
    constraints.push(where('characterClass', '==', filterClass));
  }

  // 정렬
  constraints.push(orderBy(sortBy, 'desc'));

  // 페이지네이션
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  constraints.push(firestoreLimit(pageSize));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const posts: AvatarPost[] = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as AvatarPost[];

  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

  return { posts, lastDoc };
}

// ─── 단건 조회 ───

/** 게시물 단건 조회 */
export async function getAvatarPost(
  postId: string,
): Promise<AvatarPost | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, postId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as AvatarPost;
}

// ─── 수정 ───

/** 게시물 수정 (제목, 설명, 염색 편집 결과 등) */
export async function updateAvatarPost(
  postId: string,
  data: Partial<AvatarPost>,
): Promise<void> {
  const { id, createdAt, ...updateData } = data as any;
  await updateDoc(doc(db, COLLECTION, postId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

// ─── 삭제 ───

/** 게시물 삭제 */
export async function deleteAvatarPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, postId));
}

// ─── 좋아요 ───

/** 좋아요 토글 → true(추가됨) / false(제거됨) 반환 */
export async function toggleAvatarLike(
  postId: string,
  uid: string,
): Promise<boolean> {
  const likeRef = doc(db, COLLECTION, postId, 'likes', uid);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    // 좋아요 취소
    await deleteDoc(likeRef);
    await updateDoc(doc(db, COLLECTION, postId), {
      likeCount: increment(-1),
    });
    return false;
  } else {
    // 좋아요 추가
    await setDoc(likeRef, {
      uid,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, COLLECTION, postId), {
      likeCount: increment(1),
    });
    return true;
  }
}

/** 사용자가 해당 게시물을 좋아요했는지 확인 */
export async function checkAvatarLike(
  postId: string,
  uid: string,
): Promise<boolean> {
  const likeRef = doc(db, COLLECTION, postId, 'likes', uid);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

// ─── 조회수 ───

/** 조회수 1 증가 */
export async function incrementViewCount(postId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, postId), {
    viewCount: increment(1),
  });
}

// ─── 내 게시물 ───

/** 내 게시물 목록 */
export async function getMyAvatarPosts(uid: string): Promise<AvatarPost[]> {
  const q = query(
    collection(db, COLLECTION),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as AvatarPost[];
}
