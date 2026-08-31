import { NextRequest, NextResponse } from 'next/server';
import { POST_ID_RE } from '@/lib/package-hit-guard';
import { readPackageStats } from '@/lib/package-stats';

// 갤러리 카드용 집계 일괄 조회 — GET /api/package/stats?ids=a,b,c
//
// 비용 설계:
// - ids 를 정렬해서 요청하므로 같은 갤러리 페이지 방문자는 URL 이 같다 → CDN 캐시(s-maxage)를
//   공유해 함수 호출·Neon 쿼리가 페이지당 STATS_TTL_S 에 1회로 줄어든다.
// - TTL 300초 = 사이트 캐시 표준(live-prices·갤러리 ISR 과 동일). 20초였을 때는 트래픽 밀도상
//   방문마다 캐시 미스라 사실상 페이지뷰당 함수 호출이었다(docs/DATA-AND-CACHE.md).
// - durable: 엣지 노드별이 아닌 전 세계 공유 캐시 — TTL 안에는 몇 명이 오든 함수 실행 1회.
// - 내가 방금 누른 표는 react/view 응답이 세션 캐시(package-stats-client)로 즉시 반영하므로
//   이 응답이 낡아도 화면 숫자가 되돌아가지 않는다.
// - 한 번에 MAX_IDS 개까지(갤러리 페이지 크기 6의 여유분). 그 이상은 잘라서 남용을 막는다.
// - 행이 없는 글은 응답에서 빠진다 — 클라이언트는 그 글의 기존 숫자를 그대로 둔다.
const MAX_IDS = 30;
const STATS_TTL_S = 300;

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
        'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${STATS_TTL_S}, stale-while-revalidate=${STATS_TTL_S * 3}`,
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (err) {
    console.error('집계 조회 실패:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
