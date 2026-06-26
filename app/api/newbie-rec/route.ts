import { NextResponse } from 'next/server';
import { verifyBearerUid } from '@/lib/firebase-admin';
import {
  getNewbieCounts,
  getNewbieVoterTotal,
  saveNewbieRecs,
} from '@/lib/newbie-server';
import { TIER_CLASSES } from '@/lib/tier-data';

const META = new Map(TIER_CLASSES.map((c) => [c.id, c]));
const TOP_N = 10;

// 추천 랭킹 (공개). 직업 메타(이름/아이콘/직업군)와 합쳐 top10 반환.
export async function GET() {
  try {
    const [counts, total] = await Promise.all([
      getNewbieCounts(),
      getNewbieVoterTotal(),
    ]);
    const ranking = counts
      .map((r) => {
        const m = META.get(r.id);
        return m
          ? { id: r.id, name: m.name, icon: m.icon, group: m.group, count: r.count }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, TOP_N);

    return new NextResponse(JSON.stringify({ ranking, total }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch {
    return NextResponse.json({ message: '불러오지 못했습니다.' }, { status: 500 });
  }
}

// 추천 저장 (로그인 필요). body: { classIds: string[] }
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

  const { classIds } = body || {};
  if (!Array.isArray(classIds)) {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  try {
    const count = await saveNewbieRecs(uid, classIds as string[]);
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || '저장에 실패했습니다.' },
      { status: 400 }
    );
  }
}
