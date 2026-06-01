import { NextResponse } from 'next/server';
import { verifyBearerUid } from '@/lib/firebase-admin';
import { getMyVotes } from '@/lib/tier-server';
import { CURRENT_SEASON } from '@/lib/tier-data';

// 내가 특정 직업으로 매긴 기존 평가 (재진입 시 프리필). 개인 데이터라 캐시 안 함.
export async function GET(request: Request) {
  const uid = await verifyBearerUid(request);
  if (!uid) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const voterClass = searchParams.get('voterClass');
  const season = searchParams.get('season') || CURRENT_SEASON.id;
  if (!voterClass) {
    return NextResponse.json({ message: 'voterClass가 필요합니다.' }, { status: 400 });
  }

  try {
    const votes = await getMyVotes(season, uid, voterClass);
    return new NextResponse(JSON.stringify({ votes }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { message: '불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
