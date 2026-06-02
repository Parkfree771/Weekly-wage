import { NextResponse } from 'next/server';
import { listRanking } from '@/lib/character-cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || undefined;
  const titleQuery = searchParams.get('title') || undefined;
  const sortBy = searchParams.get('sort') === 'item_level' ? 'item_level' : 'combat_power';
  const sortDir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const ancientRaw = searchParams.get('ancient');
  const ancientCount =
    ancientRaw !== null && ancientRaw !== '' && /^[0-6]$/.test(ancientRaw)
      ? parseInt(ancientRaw, 10)
      : undefined;
  const specId = searchParams.get('spec') || undefined;

  try {
    const entries = await listRanking({ className, titleQuery, ancientCount, specId, sortBy, sortDir, limit, offset });
    // CDN 캐시 미적용: Netlify 엣지가 offset/필터 쿼리로 캐시키를 구분하지 않아(Netlify-Vary)
    // 모든 페이지가 1~30위로 캐시 적중 → 페이지네이션이 깨짐. 캐시는 끄고 매 요청 신선 조회.
    return NextResponse.json({ entries });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[ranking-api] error:', err);
    return NextResponse.json({ message: '랭킹을 불러올 수 없습니다.' }, { status: 500 });
  }
}
