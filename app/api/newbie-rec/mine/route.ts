import { NextResponse } from 'next/server';
import { verifyBearerUid } from '@/lib/firebase-admin';
import { getMyNewbieRecs } from '@/lib/newbie-server';

// 내가 추천한 직업 목록 (재진입 프리필). 개인 데이터라 캐시 안 함.
export async function GET(request: Request) {
  const uid = await verifyBearerUid(request);
  if (!uid) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const picks = await getMyNewbieRecs(uid);
    return new NextResponse(JSON.stringify({ picks }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ message: '불러오지 못했습니다.' }, { status: 500 });
  }
}
