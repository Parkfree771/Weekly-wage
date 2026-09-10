import { NextRequest, NextResponse } from 'next/server';
import { POST_ID_RE } from '@/lib/package-hit-guard';
import { readPackageStats } from '@/lib/package-stats';

// 갤러리 카드용 집계 일괄 조회 — GET /api/package/stats?ids=a,b,c
//
// 비용 설계:
// - ids 를 정렬해서 요청하므로 같은 갤러리 페이지 방문자는 URL 이 같다 → CDN 캐시(s-maxage)를
//   공유해 함수 호출·Neon 쿼리가 페이지당 STATS_TTL_S 에 1회로 줄어든다.
// - TTL 300초 = 사이트 캐시 표준(live-prices·ISR 페이지와 동일).
// - durable: 엣지 노드별이 아닌 전 세계 공유 캐시 — TTL 안에는 몇 명이 오든 함수 실행 1회.
// - 이 응답은 최대 5분 낡을 수 있다. 그래서 화면은 이 값을 그냥 덮어쓰지 않는다 —
//   ISR 이 내려준 값·내 표보다 낡으면(updatedAt 비교) 세션 캐시가 버린다. 숫자가 뒤로 가는 걸 막는 장치다.
// - 내가 방금 누른 표는 react/view 응답이 세션 캐시(package-stats-client)로 즉시 반영하므로
//   이 응답이 낡아도 화면 숫자가 되돌아가지 않는다.
// - 갤러리는 "보이는 6개" 가 아니라 **목록 전체 ID** 를 한 URL 로 물어본다(2026-09-10). 필터·정렬이
//   전체를 훑게 되면서 보이는 6개가 조합마다 달라져, 예전 방식이면 URL(=캐시 키)이 끝없이 갈렸다.
//   전체를 한 번에 물으면 모든 방문자·모든 조합이 캐시 하나를 공유한다 — 호출은 TTL 당 1회가 상한.
// - 한 번에 MAX_IDS 개까지. 그 이상은 잘라서 남용을 막는다 — 잘린 글도 숫자는 맞다(ISR 이 Neon
//   최신값을 이미 실어 보낸다). 글이 이 수를 넘어가면 여기와 갤러리의 STATS_MAX_IDS 를 같이 올린다.
// - 행이 없는 글은 응답에서 빠진다 — 클라이언트는 그 글의 기존 숫자를 그대로 둔다.
const MAX_IDS = 60;
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
