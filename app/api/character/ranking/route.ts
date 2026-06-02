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
    // 랭킹 목록은 5분간 CDN 엣지 캐시 (DB·함수 호출 절감).
    // 만료 후에도 stale 즉시 응답 + 백그라운드 갱신(SWR) → 조회 지연/실패 없음.
    // 브라우저는 자체 캐시 안 함(max-age=0)이라 항상 엣지에 재검증.
    // 갱신하기로 인한 즉시 무효화는 하지 않음 → 랭킹 반영은 최대 5분 지연(상세 조회·DB 쓰기는 즉시).
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    res.headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[ranking-api] error:', err);
    return NextResponse.json({ message: '랭킹을 불러올 수 없습니다.' }, { status: 500 });
  }
}
