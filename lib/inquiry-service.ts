// 문의 게시판 Firestore CRUD 서비스

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase-client';
import type {
  InquiryPost,
  InquiryPostCreateData,
  InquiryComment,
  InquiryListResult,
} from '@/types/inquiry';

const COLLECTION = 'inquiryPosts';

// ─── 관리자 ───

export const ADMIN_EMAIL = 'dbfh1498@gmail.com';

export function isAdmin(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

// ─── 게시물 생성 ───

export async function createInquiryPost(
  data: InquiryPostCreateData,
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── 게시물 목록 (페이지네이션) ───

export async function getInquiryPosts(
  page: number,
  pageSize: number,
  userEmail: string | null,
): Promise<InquiryListResult> {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);

  const allPosts: InquiryPost[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as InquiryPost[];

  // 비공개 글 필터링: 관리자/작성자가 아니면 제목·내용 숨김
  const admin = isAdmin(userEmail);
  const filtered = allPosts.map((post) => {
    if (post.isPrivate && !admin && post.authorEmail !== userEmail) {
      return { ...post, title: '비공개 글입니다', content: '', _redacted: true } as any;
    }
    return post;
  });

  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  const posts = filtered.slice(start, start + pageSize);

  return { posts, totalCount };
}

// ─── 게시물 단건 조회 ───

export async function getInquiryPost(
  postId: string,
): Promise<InquiryPost | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, postId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as InquiryPost;
}

// ─── 게시물 수정 ───

export async function updateInquiryPost(
  postId: string,
  data: { title: string; content: string; isPrivate: boolean },
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, postId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── 게시물 삭제 ───

export async function deleteInquiryPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, postId));
}

// ─── 댓글 생성 ───

export async function createInquiryComment(
  postId: string,
  data: Omit<InquiryComment, 'id' | 'createdAt' | 'updatedAt'>,
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

// ─── 댓글 목록 (오래된순) ───

export async function getInquiryComments(
  postId: string,
): Promise<InquiryComment[]> {
  const q = query(
    collection(db, COLLECTION, postId, 'comments'),
    orderBy('createdAt', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as InquiryComment[];
}

// ─── 댓글 삭제 ───

export async function deleteInquiryComment(
  postId: string,
  commentId: string,
): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, postId, 'comments', commentId));
  await updateDoc(doc(db, COLLECTION, postId), {
    commentCount: increment(-1),
  });
}
