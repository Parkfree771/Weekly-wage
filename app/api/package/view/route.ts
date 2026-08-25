import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { POST_ID_RE, isBotRequest } from '@/lib/package-hit-guard';

// 조회수 중복 방지 쿠키: 최근 본 게시물 ID 목록.
// 쿠키는 로그인과 무관하므로 비로그인 방문자도 그대로 집계된다.
const COOKIE_NAME = 'pv';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24시간
const MAX_TRACKED = 60; // 쿠키 비대화 방지 (ID 20자 기준 약 1.2KB)
const SEP = '.';

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== 'string' || !POST_ID_RE.test(postId)) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    if (isBotRequest(request.headers.get('user-agent'))) {
      return NextResponse.json({ ok: true, counted: false });
    }

    // 24시간 내 같은 게시물을 이미 본 방문자면 쓰기를 건너뛴다
    const raw = request.cookies.get(COOKIE_NAME)?.value || '';
    const seen = raw ? raw.split(SEP).filter(Boolean) : [];
    if (seen.includes(postId)) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const db = getAdminFirestore();
    await db.collection('packagePosts').doc(postId).update({
      viewCount: FieldValue.increment(1),
    });

    const res = NextResponse.json({ ok: true, counted: true });
    res.cookies.set(COOKIE_NAME, [postId, ...seen].slice(0, MAX_TRACKED).join(SEP), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error('조회수 증가 실패:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
