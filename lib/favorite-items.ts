// 시세 차트 즐겨찾기 — 사용자가 고른 아이템 목록(브라우저 저장, 계정과 무관).
//
// 처음(저장된 목록 없음)에는 DEFAULT_FAVORITE_IDS 로 시작한다.
// 단, 예전 홈 "오늘의 시세"에서 목록을 직접 바꿔 둔 사람은 그 목록을 옮겨 온다 — 오늘의 시세를 뺄 때(2026-10-30)
// 사라졌던 사용자 설정을 즐겨찾기로 되살리는 셈이다. 손대지 않은 옛 기본 목록이면 새 기본값을 쓴다.
// 추적하지 않는 아이디는 버린다.

import { DASHBOARD_DEFAULT_ITEM_IDS } from '@/data/priceItems';
import { findItemById } from '@/lib/items-to-track';

const FAVORITES_KEY = 'favoriteItems';
const LEGACY_DASHBOARD_KEY = 'priceDashboardConfig';

// 처음 들어온 사람의 즐겨찾기 (2026-10-30 확정)
export const DEFAULT_FAVORITE_IDS: string[] = [
  '66102007',                               // 운명의 파괴석 결정
  '6861013',                                // 상급 아비도스 융화 재료
  'auction_gem_fear_10',                    // 10레벨 겁화의 보석
  '65201005',                               // 예리한 둔기 (유물 각인서)
  'auction_necklace_ancient_refine3_high',  // 고대 목걸이 상상
];

const onlyTracked = (ids: unknown[]): string[] =>
  [...new Set(ids.filter((v): v is string => typeof v === 'string' && !!findItemById(v)))];

const sameList = (a: unknown[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? onlyTracked(parsed) : [];
    }
    // 처음 — 예전 오늘의 시세를 직접 바꿔 둔 목록이면 옮겨 오고, 아니면 새 기본값
    let initial: unknown[] = DEFAULT_FAVORITE_IDS;
    const legacy = localStorage.getItem(LEGACY_DASHBOARD_KEY);
    if (legacy) {
      const sel = JSON.parse(legacy)?.selectedItems;
      if (Array.isArray(sel) && sel.length > 0 && !sameList(sel, DASHBOARD_DEFAULT_ITEM_IDS)) initial = sel;
    }
    const ids = onlyTracked(initial);
    saveFavorites(ids);
    return ids;
  } catch {
    return onlyTracked(DEFAULT_FAVORITE_IDS);
  }
}

export function saveFavorites(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등) — 이번 방문 동안만 유지된다
  }
}
