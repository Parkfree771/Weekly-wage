import { NextResponse } from 'next/server';
import { getRankingStats } from '@/lib/character-cache';

// 아이템레벨 파라미터 파싱: 유한 양수만 유효, 그 외 undefined
function parseLevel(raw: string | null): number | undefined {
  if (raw === null || raw === '') return undefined;
  const v = parseFloat(raw);
  return isFinite(v) && v > 0 ? v : undefined;
}

// 필터 조합별 매칭 비율 통계. 정수 몇 개만 반환(egress ~0).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || undefined;
  const titleQuery = searchParams.get('title') || undefined;
  const ancientRaw = searchParams.get('ancient');
  const ancientCount =
    ancientRaw !== null && ancientRaw !== '' && /^[0-6]$/.test(ancientRaw)
      ? parseInt(ancientRaw, 10)
      : undefined;
  const specId = searchParams.get('spec') || undefined;
  const roleRaw = searchParams.get('role');
  const role = roleRaw === 'support' || roleRaw === 'dealer' ? roleRaw : undefined;
  let minItemLevel = parseLevel(searchParams.get('minLevel'));
  let maxItemLevel = parseLevel(searchParams.get('maxLevel'));
  if (minItemLevel !== undefined && maxItemLevel !== undefined && minItemLevel > maxItemLevel) {
    [minItemLevel, maxItemLevel] = [maxItemLevel, minItemLevel];
  }

  try {
    const stats = await getRankingStats({ className, titleQuery, ancientCount, specId, role, minItemLevel, maxItemLevel });
    const res = NextResponse.json(stats);
    // 랭킹 API와 동일: 필터 조합별 캐시키 분리 + 5분 엣지 캐시 → 같은 조합 반복 시 DB 안 침
    res.headers.set('Netlify-Vary', 'query');
    res.headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[stats-api] error:', err);
    return NextResponse.json({ message: '통계를 불러올 수 없습니다.' }, { status: 500 });
  }
}
