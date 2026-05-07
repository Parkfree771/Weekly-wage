// 아바타 디자인 콘테스트 - Firestore CRUD (좋아요·메타·댓글 통합)
//
// 좋아요까지 Firestore 로 통합되어 좋아요순 정렬 + 페이지네이션이 자연스럽게 동작.
// - 일러스트 좋아요: contestIllustrations/{slug}.likeCount + likes/{uid} 마커
// - 무기 좋아요:    contestWeapons/{slug}/items/{wid}.likeCount + likes/{uid} 마커
// - 1계정 1표 보장: likes/{uid} 도큐는 본인만 create/delete (룰)
// - 정렬: latest = createdAt desc / likes = likeCount desc + createdAt desc(보조)
// - 페이지네이션: 페이지 1만 sessionStorage 캐시, 페이지 2+ 매번 fetch

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
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  Timestamp,
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

const ILLUSTRATIONS = 'contestIllustrations';
const WEAPONS = 'contestWeapons';
const WEAPON_STORAGE_PREFIX = 'contest-weapons';

/** 한 사용자가 한 일러스트에 올릴 수 있는 무기 아바타 최대 갯수 */
export const MAX_WEAPONS_PER_USER_PER_ILLUST = 5;

/** 갤러리 페이지당 무기 갯수 */
export const WEAPONS_PAGE_SIZE = 5;

export type SortBy = 'latest' | 'likes';

// ─────────────────────────────────────────────
// sessionStorage 캐시 헬퍼
// ─────────────────────────────────────────────
type CacheEntry<T> = { data: T; expiresAt: number };
const TTL_5MIN = 5 * 60 * 1000;

function cacheGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const e: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > e.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return e.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T, ttl: number = TTL_5MIN): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, expiresAt: Date.now() + ttl }),
    );
  } catch {}
}

function cacheDel(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

// 캐시 키
const K_ILLUST_COUNTS = 'csk:illust_counts';
const K_USER_ILLUST_LIKES = (uid: string) => `csk:user_illust_likes:${uid}`;
const K_USER_WEAPON_LIKES = (uid: string, slug: string) =>
  `csk:user_weapon_likes:${uid}:${slug}`;
const K_WEAPONS_PAGE1 = (slug: string, sortBy: SortBy) =>
  `csk:weapons:${slug}:${sortBy}`;

// ─────────────────────────────────────────────
// 일러스트 좋아요
// ─────────────────────────────────────────────

/** 모든 일러스트 좋아요 카운트 — 12 read (캐시 5분) */
export async function fetchIllustLikeCounts(
  forceRefresh = false,
): Promise<Record<string, number>> {
  if (!forceRefresh) {
    const cached = cacheGet<Record<string, number>>(K_ILLUST_COUNTS);
    if (cached) return cached;
  }
  const snap = await getDocs(collection(db, ILLUSTRATIONS));
  const result: Record<string, number> = {};
  for (const d of snap.docs) {
    const data = d.data() as { likeCount?: number };
    result[d.id] = data.likeCount ?? 0;
  }
  cacheSet(K_ILLUST_COUNTS, result);
  return result;
}

/** 본인이 좋아요한 일러스트 slug 목록 — slugs.length read (캐시 5분) */
export async function fetchUserLikedIllusts(
  uid: string,
  slugs: string[],
  forceRefresh = false,
): Promise<Set<string>> {
  const key = K_USER_ILLUST_LIKES(uid);
  if (!forceRefresh) {
    const cached = cacheGet<string[]>(key);
    if (cached) return new Set(cached);
  }
  const reads = await Promise.all(
    slugs.map((slug) =>
      getDoc(doc(db, ILLUSTRATIONS, slug, 'likes', uid)).catch(() => null),
    ),
  );
  const liked = new Set<string>();
  reads.forEach((snap, i) => {
    if (snap && snap.exists()) liked.add(slugs[i]);
  });
  cacheSet(key, Array.from(liked));
  return liked;
}

/** 일러스트 좋아요 토글 — likes/{uid} create/delete + parent.likeCount increment */
export async function toggleIllustLike(
  slug: string,
  uid: string,
  isCurrentlyLiked: boolean,
): Promise<boolean> {
  const likeDoc = doc(db, ILLUSTRATIONS, slug, 'likes', uid);
  const parentDoc = doc(db, ILLUSTRATIONS, slug);

  if (isCurrentlyLiked) {
    await deleteDoc(likeDoc);
    await setDoc(parentDoc, { likeCount: increment(-1) }, { merge: true });
    invalidateIllustCaches(uid);
    return false;
  } else {
    await setDoc(likeDoc, { createdAt: serverTimestamp() });
    await setDoc(parentDoc, { likeCount: increment(1) }, { merge: true });
    invalidateIllustCaches(uid);
    return true;
  }
}

function invalidateIllustCaches(uid: string) {
  cacheDel(K_ILLUST_COUNTS);
  cacheDel(K_USER_ILLUST_LIKES(uid));
}

// ─────────────────────────────────────────────
// 무기 좋아요
// ─────────────────────────────────────────────

/** 본인이 좋아요한 무기 id 집합 — weaponIds.length read (캐시 5분) */
export async function fetchUserLikedWeapons(
  uid: string,
  slug: string,
  weaponIds: string[],
  forceRefresh = false,
): Promise<Set<string>> {
  if (weaponIds.length === 0) return new Set();
  const key = K_USER_WEAPON_LIKES(uid, slug);
  if (!forceRefresh) {
    const cached = cacheGet<string[]>(key);
    if (cached) {
      // 캐시된 id 가 현재 페이지 weaponIds 의 부분집합인지만 검증
      return new Set(cached.filter((id) => weaponIds.includes(id)));
    }
  }
  const reads = await Promise.all(
    weaponIds.map((wid) =>
      getDoc(doc(db, WEAPONS, slug, 'items', wid, 'likes', uid)).catch(() => null),
    ),
  );
  const liked: string[] = [];
  reads.forEach((snap, i) => {
    if (snap && snap.exists()) liked.push(weaponIds[i]);
  });
  cacheSet(key, liked);
  return new Set(liked);
}

/** 무기 좋아요 토글 — likes/{uid} create/delete + 무기 도큐 likeCount increment */
export async function toggleWeaponLike(
  slug: string,
  weaponId: string,
  uid: string,
  isCurrentlyLiked: boolean,
): Promise<boolean> {
  const likeDoc = doc(db, WEAPONS, slug, 'items', weaponId, 'likes', uid);
  const weaponDoc = doc(db, WEAPONS, slug, 'items', weaponId);

  if (isCurrentlyLiked) {
    await deleteDoc(likeDoc);
    await updateDoc(weaponDoc, { likeCount: increment(-1) });
    invalidateWeaponLikeCaches(uid, slug);
    return false;
  } else {
    await setDoc(likeDoc, { createdAt: serverTimestamp() });
    await updateDoc(weaponDoc, { likeCount: increment(1) });
    invalidateWeaponLikeCaches(uid, slug);
    return true;
  }
}

function invalidateWeaponLikeCaches(uid: string, slug: string) {
  cacheDel(K_USER_WEAPON_LIKES(uid, slug));
  // 무기 페이지 1 캐시 — likeCount 변화 반영 위해 무력화 (양쪽 정렬)
  cacheDel(K_WEAPONS_PAGE1(slug, 'latest'));
  cacheDel(K_WEAPONS_PAGE1(slug, 'likes'));
}

// ─────────────────────────────────────────────
// 무기 페이지 캐시 + 메타
// ─────────────────────────────────────────────
type CachedWeapon = Omit<ContestWeapon, 'createdAt'> & { createdAt: number };

type WeaponsPageCache = {
  weapons: CachedWeapon[];
  lastUpdated: number;
  hasMore: boolean;
  /** 페이지 1 마지막 무기의 cursor 값들 */
  lastCreatedAtMs: number | null;
  lastLikeCount: number | null;
  pageSize: number;
};

function readPageCache(slug: string, sortBy: SortBy): WeaponsPageCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(K_WEAPONS_PAGE1(slug, sortBy));
    if (!raw) return null;
    return JSON.parse(raw) as WeaponsPageCache;
  } catch {
    return null;
  }
}

function writePageCache(
  slug: string,
  sortBy: SortBy,
  weapons: ContestWeapon[],
  lastUpdated: number,
  hasMore: boolean,
  lastCreatedAtMs: number | null,
  lastLikeCount: number | null,
  pageSize: number,
) {
  if (typeof window === 'undefined') return;
  try {
    const serializable: CachedWeapon[] = weapons.map((w) => ({
      ...w,
      createdAt: weaponCreatedAtToMs(w.createdAt),
    }));
    sessionStorage.setItem(
      K_WEAPONS_PAGE1(slug, sortBy),
      JSON.stringify({
        weapons: serializable,
        lastUpdated,
        hasMore,
        lastCreatedAtMs,
        lastLikeCount,
        pageSize,
      }),
    );
  } catch {}
}

function weaponCreatedAtToMs(ts: any): number {
  if (!ts) return Date.now();
  if (typeof ts === 'number') return ts;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  return Date.now();
}

function fromCachedWeapons(list: CachedWeapon[]): ContestWeapon[] {
  return list as unknown as ContestWeapon[];
}

/** 부모 도큐 updatedAt 1 read — 캐시 invalidation 메타 */
async function getWeaponsLastUpdated(slug: string): Promise<number> {
  const snap = await getDoc(doc(db, WEAPONS, slug));
  if (!snap.exists()) return 0;
  const data = snap.data() as { updatedAt?: any };
  if (!data.updatedAt?.toDate) return 0;
  return data.updatedAt.toDate().getTime();
}

async function touchUpdatedAt(slug: string): Promise<void> {
  await setDoc(
    doc(db, WEAPONS, slug),
    { updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ─────────────────────────────────────────────
// 무기 페이지 fetch
// ─────────────────────────────────────────────

export type WeaponsCursor = {
  createdAtMs: number;
  likeCount: number;
};

async function fetchWeaponsRawPage(
  slug: string,
  sortBy: SortBy,
  cursor: WeaponsCursor | null,
  pageSize: number,
): Promise<{ weapons: ContestWeapon[]; hasMore: boolean }> {
  const col = collection(db, WEAPONS, slug, 'items');

  let q;
  if (sortBy === 'latest') {
    q = cursor == null
      ? query(col, orderBy('createdAt', 'desc'), fbLimit(pageSize + 1))
      : query(
          col,
          orderBy('createdAt', 'desc'),
          startAfter(Timestamp.fromMillis(cursor.createdAtMs)),
          fbLimit(pageSize + 1),
        );
  } else {
    // likes: likeCount desc + createdAt desc(보조)
    q = cursor == null
      ? query(
          col,
          orderBy('likeCount', 'desc'),
          orderBy('createdAt', 'desc'),
          fbLimit(pageSize + 1),
        )
      : query(
          col,
          orderBy('likeCount', 'desc'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor.likeCount, Timestamp.fromMillis(cursor.createdAtMs)),
          fbLimit(pageSize + 1),
        );
  }

  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ContestWeapon[];
  const hasMore = docs.length > pageSize;
  return { weapons: hasMore ? docs.slice(0, pageSize) : docs, hasMore };
}

/**
 * 무기 페이지 — 페이지 1 만 sessionStorage 캐시.
 * sortBy 별로 캐시 키 분리.
 */
export async function getWeaponsPage(
  slug: string,
  sortBy: SortBy,
  cursor: WeaponsCursor | null = null,
  pageSize: number = WEAPONS_PAGE_SIZE,
): Promise<{
  weapons: ContestWeapon[];
  hasMore: boolean;
  lastCursor: WeaponsCursor | null;
}> {
  // 페이지 1 → 캐시 우선
  if (cursor == null) {
    const metaUpdatedAt = await getWeaponsLastUpdated(slug);
    const cached = readPageCache(slug, sortBy);
    if (
      cached &&
      cached.lastUpdated >= metaUpdatedAt &&
      cached.pageSize === pageSize
    ) {
      const lastCursor: WeaponsCursor | null =
        cached.hasMore && cached.lastCreatedAtMs != null
          ? {
              createdAtMs: cached.lastCreatedAtMs,
              likeCount: cached.lastLikeCount ?? 0,
            }
          : null;
      return {
        weapons: fromCachedWeapons(cached.weapons),
        hasMore: cached.hasMore,
        lastCursor,
      };
    }
    const { weapons, hasMore } = await fetchWeaponsRawPage(
      slug,
      sortBy,
      null,
      pageSize,
    );
    const last = weapons[weapons.length - 1];
    const lastCreatedAtMs = last ? weaponCreatedAtToMs(last.createdAt) : null;
    const lastLikeCount = last ? last.likeCount ?? 0 : null;
    writePageCache(
      slug,
      sortBy,
      weapons,
      metaUpdatedAt,
      hasMore,
      lastCreatedAtMs,
      lastLikeCount,
      pageSize,
    );
    const lastCursor: WeaponsCursor | null =
      hasMore && lastCreatedAtMs != null
        ? { createdAtMs: lastCreatedAtMs, likeCount: lastLikeCount ?? 0 }
        : null;
    return { weapons, hasMore, lastCursor };
  }

  // 페이지 2+ → 캐시 X
  const { weapons, hasMore } = await fetchWeaponsRawPage(
    slug,
    sortBy,
    cursor,
    pageSize,
  );
  const last = weapons[weapons.length - 1];
  const lastCreatedAtMs = last ? weaponCreatedAtToMs(last.createdAt) : null;
  const lastLikeCount = last ? last.likeCount ?? 0 : null;
  const lastCursor: WeaponsCursor | null =
    hasMore && lastCreatedAtMs != null
      ? { createdAtMs: lastCreatedAtMs, likeCount: lastLikeCount ?? 0 }
      : null;
  return { weapons, hasMore, lastCursor };
}

// ─────────────────────────────────────────────
// 무기 메타 (Storage 업로드 + Firestore 저장)
// ─────────────────────────────────────────────

async function countUserWeaponsInIllust(slug: string, uid: string): Promise<number> {
  const q = query(collection(db, WEAPONS, slug, 'items'), where('uid', '==', uid));
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * 무기 이미지 업로드 + Firestore 메타 저장.
 * - 한 사용자가 한 일러스트에 MAX_WEAPONS_PER_USER_PER_ILLUST 개까지만
 * - Storage Cache-Control 1년 immutable
 * - 부모 도큐 updatedAt 갱신 (캐시 invalidation)
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
  const existingCount = await countUserWeaponsInIllust(slug, uid);
  if (existingCount >= MAX_WEAPONS_PER_USER_PER_ILLUST) {
    throw new Error(
      `이 일러스트에는 최대 ${MAX_WEAPONS_PER_USER_PER_ILLUST}개의 무기 아바타까지만 등록할 수 있어요.`,
    );
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'png';
  const filename = `${uid}_${Date.now()}.${safeExt}`;
  const path = `${WEAPON_STORAGE_PREFIX}/${slug}/${filename}`;
  const ref = storageRef(storage, path);

  const snapshot = await uploadBytes(ref, file, {
    contentType: file.type || `image/${safeExt}`,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  const imageUrl = await getDownloadURL(snapshot.ref);

  const docRef = await addDoc(collection(db, WEAPONS, slug, 'items'), {
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
    createdAt: serverTimestamp(),
  });

  await touchUpdatedAt(slug);

  // 캐시 무력화 — 다음 진입 시 재fetch
  cacheDel(K_WEAPONS_PAGE1(slug, 'latest'));
  cacheDel(K_WEAPONS_PAGE1(slug, 'likes'));

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

export async function deleteWeapon(
  slug: string,
  weaponId: string,
  storagePath: string,
): Promise<void> {
  await deleteDoc(doc(db, WEAPONS, slug, 'items', weaponId));
  await touchUpdatedAt(slug);

  cacheDel(K_WEAPONS_PAGE1(slug, 'latest'));
  cacheDel(K_WEAPONS_PAGE1(slug, 'likes'));

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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ContestWeaponComment[];
}

export async function createWeaponComment(
  data: ContestWeaponCommentCreateData,
): Promise<string> {
  const itemRef = doc(db, WEAPONS, data.illustrationSlug, 'items', data.weaponId);
  const ref = await addDoc(
    collection(db, WEAPONS, data.illustrationSlug, 'items', data.weaponId, 'comments'),
    { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
  );
  await updateDoc(itemRef, { commentCount: increment(1) });
  // 페이지 1 캐시의 commentCount 동기화는 무력화 (다음 fetch 시 새로)
  cacheDel(K_WEAPONS_PAGE1(data.illustrationSlug, 'latest'));
  cacheDel(K_WEAPONS_PAGE1(data.illustrationSlug, 'likes'));
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
  await deleteDoc(doc(db, WEAPONS, slug, 'items', weaponId, 'comments', commentId));
  await updateDoc(doc(db, WEAPONS, slug, 'items', weaponId), {
    commentCount: increment(-1),
  });
  cacheDel(K_WEAPONS_PAGE1(slug, 'latest'));
  cacheDel(K_WEAPONS_PAGE1(slug, 'likes'));
}

// ─────────────────────────────────────────────
// 외부에서 호출하는 visibility-change 갱신용
// ─────────────────────────────────────────────
export function invalidateAllContestCaches(uid?: string | null): void {
  cacheDel(K_ILLUST_COUNTS);
  if (uid) cacheDel(K_USER_ILLUST_LIKES(uid));
}
