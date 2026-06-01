import { NextResponse } from 'next/server';
import { verifyBearerUid } from '@/lib/firebase-admin';
import { saveVotes } from '@/lib/tier-server';
import { CURRENT_SEASON } from '@/lib/tier-data';

// 투표 저장 (로그인 필요). 이번 시즌은 캐릭터 인증 없이 로그인만으로 가능.
export async function POST(request: Request) {
  const uid = await verifyBearerUid(request);
  if (!uid) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { voterClass, ratings, season } = body || {};
  if (typeof voterClass !== 'string' || typeof ratings !== 'object' || !ratings) {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  try {
    const count = await saveVotes(
      season || CURRENT_SEASON.id,
      uid,
      voterClass,
      ratings as Record<string, number>
    );
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || '저장에 실패했습니다.' },
      { status: 400 }
    );
  }
}
