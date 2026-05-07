// 콘테스트 좋아요/조회수 - Supabase 클라이언트 + 캐시 매니저
//
// 설계:
// - 좋아요: Firebase JWT 인증 후 본인 uid 로만 INSERT/DELETE
// - 조회수: 로그인이면 {uid}_{시간}, 비로그인이면 anon_{uuid}_{시간} 으로 1시간 dedup
// - 카운트는 Supabase 트리거로 자동 갱신, 클라이언트는 카운트 테이블만 read
// - sessionStorage 캐시 (5분) + 옵티미스틱 UI

import { createClient } from '@supabase/supabase-js';
import { auth as firebaseAuth } from './firebase-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 콘테스트 전용 Supabase 클라이언트.
 * accessToken 옵션으로 매 요청마다 Firebase ID Token 첨부 → Supabase RLS 가 검증.
 * 비로그인 시 null 반환하면 익명 권한으로 동작.
 */
export const contestSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: async () => {
    if (typeof window === 'undefined') return null;
    const user = firebaseAuth?.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.error('Firebase ID Token 가져오기 실패:', err);
      return null;
    }
  },
});

// ─────────────────────────────────────────────
// 익명 viewer 식별자 (조회수 dedup 용)
// ─────────────────────────────────────────────
const ANON_KEY = 'contestAnonViewerId';

function getAnonViewerId(): string {
  if (typeof window === 'undefined') return 'anon_ssr';
  let id = window.localStorage.getItem(ANON_KEY);
  if (!id) {
    id = `anon_${
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    }`;
    window.localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

/** 1시간 단위 viewer_key 생성 — 로그인이면 uid_, 비로그인이면 anon_uuid_ */
function buildViewerKey(uid: string | null): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const time = `${yyyy}-${mm}-${dd}-${hh}`;
  if (uid) return `${uid}_${time}`;
  return `${getAnonViewerId()}_${time}`;
}

// ─────────────────────────────────────────────
// sessionStorage 캐시 매니저 (TTL)
// ─────────────────────────────────────────────
type CacheEntry<T> = { data: T; expiresAt: number };

const TTL_5MIN = 5 * 60 * 1000;
const TTL_1HOUR = 60 * 60 * 1000;

function cacheGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T, ttl: number): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttl };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full or disabled
  }
}

function cacheDel(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

// 캐시 키 prefix
const K_ILLUST_COUNTS = 'csk:illust_counts';
const K_USER_ILLUST_LIKES = (uid: string) => `csk:user_illust_likes:${uid}`;
const K_WEAPON_COUNTS = (slug: string) => `csk:weapon_counts:${slug}`;
const K_USER_WEAPON_LIKES = (uid: string, slug: string) =>
  `csk:user_weapon_likes:${uid}:${slug}`;
const K_WEAPON_VIEW_COUNTS = (slug: string) => `csk:weapon_views:${slug}`;
const K_VIEWED_WEAPONS = 'csk:viewed_weapons'; // 클라이언트 1회 dedup (영구 in-session)

// ─────────────────────────────────────────────
// 일러스트 좋아요
// ─────────────────────────────────────────────

/** 모든 일러스트 좋아요 카운트 (12개) — sessionStorage 캐시 5분 */
export async function fetchIllustLikeCounts(
  forceRefresh = false,
): Promise<Record<string, number>> {
  if (!forceRefresh) {
    const cached = cacheGet<Record<string, number>>(K_ILLUST_COUNTS);
    if (cached) return cached;
  }
  const { data, error } = await contestSupabase
    .from('contest_illust_like_counts')
    .select('slug, like_count');
  if (error) {
    console.error('일러스트 좋아요 카운트 조회 실패:', error);
    return {};
  }
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.slug as string] = Number(row.like_count) || 0;
  }
  cacheSet(K_ILLUST_COUNTS, result, TTL_5MIN);
  return result;
}

/** 사용자가 좋아요한 일러스트 slug 목록 — 캐시 5분 */
export async function fetchUserLikedIllusts(
  uid: string,
  forceRefresh = false,
): Promise<Set<string>> {
  const key = K_USER_ILLUST_LIKES(uid);
  if (!forceRefresh) {
    const cached = cacheGet<string[]>(key);
    if (cached) return new Set(cached);
  }
  const { data, error } = await contestSupabase
    .from('contest_illust_likes')
    .select('slug')
    .eq('uid', uid);
  if (error) {
    console.error('사용자 좋아요 조회 실패:', error);
    return new Set();
  }
  const slugs = (data ?? []).map((r) => r.slug as string);
  cacheSet(key, slugs, TTL_5MIN);
  return new Set(slugs);
}

/** 일러스트 좋아요 토글 → true(추가)/false(제거). 옵티미스틱은 호출자가. */
export async function toggleIllustLike(
  slug: string,
  uid: string,
  isCurrentlyLiked: boolean,
): Promise<boolean> {
  if (isCurrentlyLiked) {
    const { error } = await contestSupabase
      .from('contest_illust_likes')
      .delete()
      .eq('slug', slug)
      .eq('uid', uid);
    if (error) throw error;
    invalidateIllustCaches(uid);
    return false;
  } else {
    const { error } = await contestSupabase
      .from('contest_illust_likes')
      .insert({ slug, uid });
    if (error) {
      // 중복(이미 좋아요) → 정상 처리
      if ((error as any).code === '23505') {
        invalidateIllustCaches(uid);
        return true;
      }
      throw error;
    }
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

/** 특정 일러스트 슬러그의 무기들의 좋아요 카운트 (weapon_id → count) */
export async function fetchWeaponLikeCounts(
  slug: string,
  weaponIds: string[],
  forceRefresh = false,
): Promise<Record<string, number>> {
  if (weaponIds.length === 0) return {};
  const cacheKey = K_WEAPON_COUNTS(slug);
  if (!forceRefresh) {
    const cached = cacheGet<Record<string, number>>(cacheKey);
    if (cached) return cached;
  }
  const { data, error } = await contestSupabase
    .from('contest_weapon_like_counts')
    .select('weapon_id, like_count')
    .in('weapon_id', weaponIds);
  if (error) {
    console.error('무기 좋아요 카운트 조회 실패:', error);
    return {};
  }
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.weapon_id as string] = Number(row.like_count) || 0;
  }
  cacheSet(cacheKey, result, TTL_5MIN);
  return result;
}

/** 사용자가 좋아요한 무기 id 집합 (특정 슬러그 한정) */
export async function fetchUserLikedWeapons(
  uid: string,
  slug: string,
  forceRefresh = false,
): Promise<Set<string>> {
  const cacheKey = K_USER_WEAPON_LIKES(uid, slug);
  if (!forceRefresh) {
    const cached = cacheGet<string[]>(cacheKey);
    if (cached) return new Set(cached);
  }
  const { data, error } = await contestSupabase
    .from('contest_weapon_likes')
    .select('weapon_id')
    .eq('uid', uid)
    .eq('illust_slug', slug);
  if (error) {
    console.error('사용자 무기 좋아요 조회 실패:', error);
    return new Set();
  }
  const ids = (data ?? []).map((r) => r.weapon_id as string);
  cacheSet(cacheKey, ids, TTL_5MIN);
  return new Set(ids);
}

/** 무기 좋아요 토글 */
export async function toggleWeaponLikeSupa(
  weaponId: string,
  illustSlug: string,
  uid: string,
  isCurrentlyLiked: boolean,
): Promise<boolean> {
  if (isCurrentlyLiked) {
    const { error } = await contestSupabase
      .from('contest_weapon_likes')
      .delete()
      .eq('weapon_id', weaponId)
      .eq('uid', uid);
    if (error) throw error;
    invalidateWeaponCaches(uid, illustSlug);
    return false;
  } else {
    const { error } = await contestSupabase
      .from('contest_weapon_likes')
      .insert({ weapon_id: weaponId, illust_slug: illustSlug, uid });
    if (error) {
      if ((error as any).code === '23505') {
        invalidateWeaponCaches(uid, illustSlug);
        return true;
      }
      throw error;
    }
    invalidateWeaponCaches(uid, illustSlug);
    return true;
  }
}

function invalidateWeaponCaches(uid: string, slug: string) {
  cacheDel(K_WEAPON_COUNTS(slug));
  cacheDel(K_USER_WEAPON_LIKES(uid, slug));
}

// ─────────────────────────────────────────────
// 무기 조회수
// ─────────────────────────────────────────────

/** 특정 일러스트의 무기들의 조회수 카운트 */
export async function fetchWeaponViewCounts(
  slug: string,
  weaponIds: string[],
  forceRefresh = false,
): Promise<Record<string, number>> {
  if (weaponIds.length === 0) return {};
  const cacheKey = K_WEAPON_VIEW_COUNTS(slug);
  if (!forceRefresh) {
    const cached = cacheGet<Record<string, number>>(cacheKey);
    if (cached) return cached;
  }
  const { data, error } = await contestSupabase
    .from('contest_weapon_view_counts')
    .select('weapon_id, view_count')
    .in('weapon_id', weaponIds);
  if (error) {
    console.error('무기 조회수 조회 실패:', error);
    return {};
  }
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.weapon_id as string] = Number(row.view_count) || 0;
  }
  cacheSet(cacheKey, result, TTL_5MIN);
  return result;
}

/**
 * 무기 조회수 +1 시도.
 * - 클라이언트 1회 dedup (sessionStorage viewedSet) — 같은 세션 동일 무기 1번
 * - 서버 1시간 dedup (viewer_key PRIMARY KEY 충돌 시 INSERT 무시)
 * 둘 다 통과한 경우만 카운트 증가.
 *
 * 반환: 실제 카운트 증가가 일어났는지 (옵티미스틱 UI 보조용)
 */
export async function tryIncrementWeaponView(
  weaponId: string,
  uid: string | null,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. 클라이언트 dedup
  const viewedRaw = sessionStorage.getItem(K_VIEWED_WEAPONS);
  const viewed: string[] = viewedRaw ? JSON.parse(viewedRaw) : [];
  if (viewed.includes(weaponId)) return false;

  // 2. 서버 INSERT (PK 충돌 = 1시간 내 본 적 있음 → 무시)
  const viewerKey = buildViewerKey(uid);
  const { error } = await contestSupabase
    .from('contest_weapon_views')
    .insert({ weapon_id: weaponId, viewer_key: viewerKey });

  // 클라이언트 dedup 마킹 (충돌이든 성공이든 같은 세션에서 다시 안 함)
  viewed.push(weaponId);
  try {
    sessionStorage.setItem(K_VIEWED_WEAPONS, JSON.stringify(viewed));
  } catch {}

  if (error) {
    // 23505 = unique_violation = 1시간 내 이미 카운트됨, 정상
    if ((error as any).code === '23505') return false;
    console.error('무기 조회수 INSERT 실패:', error);
    return false;
  }
  // 캐시는 다음 갱신 사이클에 자연 반영, 옵티미스틱은 호출자가
  return true;
}

// ─────────────────────────────────────────────
// 캐시 강제 무효화 (visibilitychange 등에서 사용)
// ─────────────────────────────────────────────
export function invalidateAllContestCaches(uid?: string | null): void {
  cacheDel(K_ILLUST_COUNTS);
  if (uid) cacheDel(K_USER_ILLUST_LIKES(uid));
  // 무기 카운트는 슬러그별이라 일괄 무효화 어려움 → 모달 재진입 시 자연 갱신
}
