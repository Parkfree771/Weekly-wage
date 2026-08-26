import { NextRequest, NextResponse } from 'next/server';
import { POST_ID_RE } from '@/lib/package-hit-guard';
import { readPackageStats } from '@/lib/package-stats';

// 갤러리 카드용 집계 일괄 조회 — GET /api/package/stats?ids=a,b,c
//
// 비용 설계:
// - ids 를 정렬해서 요청하므로 같은 갤러리 페이지 방문자는 URL 이 같다 → CDN 캐시(s-maxage)를
//   공유해 함수 호출·Neon 쿼리가 페이지당 STATS_TTL_S 에 1회로 줄어든다.
// - 한 번에 MAX_IDS 개까지(갤러리 페이지 크기 6의 여유분). 그 이상은 잘라서 남용을 막는다.
// - 행이 없는 글은 응답에서 빠진다 — 클라이언트는 그 글의 기존 숫자를 그대로 둔다.
const MAX_IDS = 30;
const STATS_TTL_S = 20;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('ids') || '';
  const ids = [...new Set(raw.split(',').filter((id) => id && POST_ID_RE.test(id)))].slice(0, MAX_IDS);
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 });
  }
  try {
    const stats = await readPackageStats(ids);
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${STATS_TTL_S}, stale-while-revalidate=${STATS_TTL_S * 3}`,
      },
    });
  } catch (err) {
    console.error('집계 조회 실패:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
