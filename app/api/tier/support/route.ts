import { NextResponse } from 'next/server';
import { verifyBearerUid } from '@/lib/firebase-admin';
import {
  saveSupportPicks,
  getMySupportPicks,
  invalidateTierStats,
} from '@/lib/tier-server';
import { CURRENT_SEASON } from '@/lib/tier-data';
import { purgeTierStatsCdn } from '@/lib/purge-cdn';

// 내가 선택한 서포터 목록 (재진입 시 프리필). 개인 데이터라 캐시 안 함.
export async function GET(request: Request) {
  const uid = await verifyBearerUid(request);
  if (!uid) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season') || CURRENT_SEASON.id;
  const voterClass = searchParams.get('voterClass');

  try {
    const supports = await getMySupportPicks(season, uid, voterClass);
    return new NextResponse(JSON.stringify({ supports }), {
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

// 서포터 선호 체크 저장 (로그인 필요). 누구나(딜러 main 포함) 중복 선택 가능.
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

  const { supports, season, voterClass } = body || {};
  if (!Array.isArray(supports)) {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  try {
    const s = season || CURRENT_SEASON.id;
    const count = await saveSupportPicks(
      s,
      uid,
      typeof voterClass === 'string' ? voterClass : null,
      supports as string[]
    );
    // 집계 캐시 즉시 무효화 (DB 스냅샷 + 해당 페이지 CDN 태그만)
    await invalidateTierStats(s);
    await purgeTierStatsCdn();
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || '저장에 실패했습니다.' },
      { status: 400 }
    );
  }
}
