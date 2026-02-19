// 패키지 효율 게시판 Firestore CRUD 서비스

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
  PackagePost,
  PackagePostCreateData,
  PackageComment,
  PackageListOptions,
} from '@/types/package';

const COLLECTION = 'packagePosts';

// ─── 생성 ───

/** 패키지 게시물 생성 → 생성된 문서 ID 반환 */
export async function createPackagePost(
  data: PackagePostCreateData,
): Promise<string> {
  const docData = {
    ...data,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), docData);
  return docRef.id;
}

// ─── 목록 조회 ───

/** 게시물 목록 (페이지네이션) */
export async function getPackagePosts(options: PackageListOptions): Promise<{
  posts: PackagePost[];
  lastDoc: DocumentSnapshot | null;
}> {
  const { sortBy, limit: pageSize, startAfterDoc } = options;

  const constraints: any[] = [];

  // 정렬
  constraints.push(orderBy(sortBy, 'desc'));

  // 페이지네이션
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  constraints.push(firestoreLimit(pageSize));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const posts: PackagePost[] = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as PackagePost[];

  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

  return { posts, lastDoc };
}

// ─── 단건 조회 ───

/** 게시물 단건 조회 */
export async function getPackagePost(
  postId: string,
): Promise<PackagePost | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, postId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as PackagePost;
}

// ─── 수정 ───

/** 게시물 수정 */
export async function updatePackagePost(
  postId: string,
  data: Partial<PackagePost>,
): Promise<void> {
  const { id, createdAt, ...updateData } = data as any;
  await updateDoc(doc(db, COLLECTION, postId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

// ─── 삭제 ───

/** 게시물 삭제 */
export async function deletePackagePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, postId));
}

// ─── 좋아요 ───

/** 좋아요 토글 → true(추가됨) / false(제거됨) 반환 */
export async function togglePackageLike(
  postId: string,
  uid: string,
): Promise<boolean> {
  const likeRef = doc(db, COLLECTION, postId, 'likes', uid);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, COLLECTION, postId), {
      likeCount: increment(-1),
    });
    return false;
  } else {
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
export async function checkPackageLike(
  postId: string,
  uid: string,
): Promise<boolean> {
  const likeRef = doc(db, COLLECTION, postId, 'likes', uid);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

// ─── 조회수 ───

/** 조회수 1 증가 */
export async function incrementPackageViewCount(postId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, postId), {
    viewCount: increment(1),
  });
}

// ─── 댓글 ───

/** 댓글 생성 → 생성된 문서 ID 반환 */
export async function createPackageComment(
  postId: string,
  data: Omit<PackageComment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const commentRef = await addDoc(
    collection(db, COLLECTION, postId, 'comments'),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  await updateDoc(doc(db, COLLECTION, postId), {
    commentCount: increment(1),
  });
  return commentRef.id;
}

/** 댓글 목록 조회 (최신순) */
export async function getPackageComments(
  postId: string,
): Promise<PackageComment[]> {
  const q = query(
    collection(db, COLLECTION, postId, 'comments'),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as PackageComment[];
}

/** 댓글 수정 (content만) */
export async function updatePackageComment(
  postId: string,
  commentId: string,
  content: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, postId, 'comments', commentId), {
    content,
    updatedAt: serverTimestamp(),
  });
}

/** 댓글 삭제 */
export async function deletePackageComment(
  postId: string,
  commentId: string,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, postId, 'comments', commentId));
  await updateDoc(doc(db, COLLECTION, postId), {
    commentCount: increment(-1),
  });
}
