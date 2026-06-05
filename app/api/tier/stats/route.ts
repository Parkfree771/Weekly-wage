import { NextResponse } from 'next/server';
import { getTierStats } from '@/lib/tier-server';
import { CURRENT_SEASON } from '@/lib/tier-data';

// 통계 스냅샷 (30분 캐시). CDN에 s-maxage로 캐시되어 조회 폭주 시에도 DB 부담 최소.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season') || CURRENT_SEASON.id;
  try {
    const stats = await getTierStats(season);
    return new NextResponse(JSON.stringify(stats), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // 투표 시 태그 퍼지로 즉시 무효화. s-maxage는 퍼지 실패 대비 백스톱(최대 5분).
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Netlify-Cache-Tag': 'tier-stats',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { message: '통계를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
