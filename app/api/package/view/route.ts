import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// 조회수 중복 방지 쿠키: 최근 본 게시물 ID 목록.
// 쿠키는 로그인과 무관하므로 비로그인 방문자도 그대로 집계된다.
const COOKIE_NAME = 'pv';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24시간
const MAX_TRACKED = 60; // 쿠키 비대화 방지 (ID 20자 기준 약 1.2KB)
const SEP = '.';

// Firestore 자동 생성 ID(영숫자 20자)만 허용. 입력 검증 겸 쿠키 값 오염 방지.
const POST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// 크롤러/링크 프리뷰 봇은 쿠키를 유지하지 않아 쿠키 검사로 걸러지지 않는다.
// 주의: 'kakaotalk', 'naver' 같은 문자열은 인앱 브라우저(실제 사용자) UA에도 들어간다.
// 크롤러만 정확히 지목할 것 — 네이버는 Yeti, 다음은 Daumoa, 카카오 프리뷰는 kakaotalk-scrap.
const BOT_RE = new RegExp(
  [
    'bot', 'crawler', 'spider', 'slurp', // 일반
    'mediapartners-google', 'googleother', // 애드센스/구글 크롤러
    'yeti', 'daumoa', 'baiduspider', 'yandex', 'applebot', 'duckduckbot', // 검색엔진
    'facebookexternalhit', 'kakaotalk-scrap', 'skypeuripreview', 'embedly', 'whatsapp', // 링크 프리뷰
    'headless', 'curl', 'wget', 'python-requests', 'node-fetch', 'go-http-client', // 스크립트
  ].join('|'),
  'i',
);

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== 'string' || !POST_ID_RE.test(postId)) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    // 봇이거나 User-Agent가 없는 요청은 집계하지 않는다 (쓰기도 하지 않음)
    const ua = request.headers.get('user-agent') || '';
    if (!ua || BOT_RE.test(ua)) {
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
