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
    const res = NextResponse.json({ entries });
    // Netlify-Vary: query → 쿼리 문자열(offset·필터·정렬)별로 캐시 키 분리.
    // 이게 없으면 모든 페이지가 한 캐시로 뭉개져 1~30위만 반복됨(페이지네이션 깨짐).
    res.headers.set('Netlify-Vary', 'query');
    // 같은 페이지 반복 요청은 5분 엣지 캐시 적중 → DB·함수 호출 절감. 만료 후 SWR로 지연 0.
    res.headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[ranking-api] error:', err);
    return NextResponse.json({ message: '랭킹을 불러올 수 없습니다.' }, { status: 500 });
  }
}
