// 아바타 디자인 콘테스트 - Firestore CRUD (무기 메타·댓글 전용)
//
// 좋아요/조회수는 lib/contest-supabase.ts 로 이전됨.
// 여기에는 무기 이미지(Storage)·메타·댓글만 남김.

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase-client';
import type {
  ContestWeapon,
  ContestWeaponComment,
  ContestWeaponCommentCreateData,
} from '@/types/contest';

const WEAPONS = 'contestWeapons';
const WEAPON_STORAGE_PREFIX = 'contest-weapons';

// ─────────────────────────────────────────────
// 무기 메타 (Storage 업로드 + Firestore 저장)
// ─────────────────────────────────────────────

/** 무기 등록 갯수 (부모 도큐 count 필드) */
export async function getWeaponCount(slug: string): Promise<number> {
  const snap = await getDoc(doc(db, WEAPONS, slug));
  if (!snap.exists()) return 0;
  const data = snap.data() as { count?: number };
  return data.count ?? 0;
}

export async function getWeaponCounts(
  slugs: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  await Promise.all(
    slugs.map(async (slug) => {
      result[slug] = await getWeaponCount(slug);
    }),
  );
  return result;
}

/** 무기 목록 (최신순) */
export async function getWeapons(slug: string): Promise<ContestWeapon[]> {
  const q = query(
    collection(db, WEAPONS, slug, 'items'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ContestWeapon[];
}

/**
 * 무기 이미지 업로드 + Firestore 메타 저장.
 * width/height 는 호출자가 클라이언트에서 측정해서 전달 (자연 비율 보존).
 * likeCount/viewCount 는 Supabase 에서 관리하므로 Firestore 도큐에는 저장하지 않음.
 */
export async function uploadWeapon(
  slug: string,
  file: File,
  uid: string,
  authorName: string,
  title: string,
  width: number,
  height: number,
): Promise<ContestWeapon> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'png';
  const filename = `${uid}_${Date.now()}.${safeExt}`;
  const path = `${WEAPON_STORAGE_PREFIX}/${slug}/${filename}`;
  const ref = storageRef(storage, path);

  const snapshot = await uploadBytes(ref, file, {
    contentType: file.type || `image/${safeExt}`,
  });
  const imageUrl = await getDownloadURL(snapshot.ref);

  const parentRef = doc(db, WEAPONS, slug);
  const parentSnap = await getDoc(parentRef);
  if (!parentSnap.exists()) {
    await setDoc(parentRef, { count: 0, createdAt: serverTimestamp() });
  }

  const docRef = await addDoc(collection(db, WEAPONS, slug, 'items'), {
    illustrationSlug: slug,
    uid,
    authorName,
    title,
    imageUrl,
    storagePath: path,
    width,
    height,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  await updateDoc(parentRef, { count: increment(1) });

  return {
    id: docRef.id,
    illustrationSlug: slug,
    uid,
    authorName,
    title,
    imageUrl,
    storagePath: path,
    width,
    height,
    likeCount: 0,
    commentCount: 0,
    createdAt: { toDate: () => new Date() } as any,
  };
}

/** 무기 삭제 (Storage + Firestore) — 본인만 호출 */
export async function deleteWeapon(
  slug: string,
  weaponId: string,
  storagePath: string,
): Promise<void> {
  await deleteDoc(doc(db, WEAPONS, slug, 'items', weaponId));
  await updateDoc(doc(db, WEAPONS, slug), { count: increment(-1) });

  try {
    await deleteObject(storageRef(storage, storagePath));
  } catch (err) {
    console.warn('weapon storage delete failed:', err);
  }
}

// ─────────────────────────────────────────────
// 무기 댓글
// ─────────────────────────────────────────────

export async function getWeaponComments(
  slug: string,
  weaponId: string,
): Promise<ContestWeaponComment[]> {
  const q = query(
    collection(db, WEAPONS, slug, 'items', weaponId, 'comments'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ContestWeaponComment[];
}

export async function createWeaponComment(
  data: ContestWeaponCommentCreateData,
): Promise<string> {
  const itemRef = doc(db, WEAPONS, data.illustrationSlug, 'items', data.weaponId);
  const ref = await addDoc(
    collection(db, WEAPONS, data.illustrationSlug, 'items', data.weaponId, 'comments'),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );
  await updateDoc(itemRef, { commentCount: increment(1) });
  return ref.id;
}

export async function updateWeaponComment(
  slug: string,
  weaponId: string,
  commentId: string,
  content: string,
): Promise<void> {
  await updateDoc(
    doc(db, WEAPONS, slug, 'items', weaponId, 'comments', commentId),
    { content, updatedAt: serverTimestamp() },
  );
}

export async function deleteWeaponComment(
  slug: string,
  weaponId: string,
  commentId: string,
): Promise<void> {
  await deleteDoc(
    doc(db, WEAPONS, slug, 'items', weaponId, 'comments', commentId),
  );
  await updateDoc(doc(db, WEAPONS, slug, 'items', weaponId), {
    commentCount: increment(-1),
  });
}
