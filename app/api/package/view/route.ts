import { NextRequest, NextResponse } from 'next/server';
import { POST_ID_RE, isBotRequest } from '@/lib/package-hit-guard';
import { bumpPackageStats } from '@/lib/package-stats';

// 조회수 — Neon package_stats. 응답에 그 글의 최신 집계(조회·따봉·흠)를 실어 보내므로
// 상세 페이지는 이 요청 하나로 ISR 스냅샷 숫자를 최신값으로 덮어쓴다(추가 조회 없음).
//
// 조회수 중복 방지 쿠키: 최근 본 게시물 "ID:본시각" 목록.
// 쿠키는 로그인과 무관하므로 비로그인 방문자도 그대로 집계된다.
//
// 항목별 타임스탬프인 이유: 쿠키를 응답마다 통째로 재설정하면 maxAge(24h)가 계속 연장된다 —
// 매일 오는 방문자는 어제 본 글의 "24시간"이 영원히 안 끝나 재조회가 다시는 카운트되지 않았다.
// 그래서 항목마다 본 시각을 붙여 24시간 지난 항목만 개별 만료시킨다.
// (타임스탬프 없는 구버전 항목은 "방금 본 것"으로 간주 — 배포 직후 중복 카운트 방지)
const COOKIE_NAME = 'pv';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24시간
const MAX_TRACKED = 60; // 쿠키 비대화 방지 (ID 20자 + 시각 기준 약 1.7KB)
const SEP = '.';
const TS_SEP = ':'; // POST_ID_RE 가 ID 에 ':' 를 허용하지 않아 안전한 구분자
const SEEN_WINDOW_MS = COOKIE_MAX_AGE * 1000;

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== 'string' || !POST_ID_RE.test(postId)) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    if (isBotRequest(request.headers.get('user-agent'))) {
      return NextResponse.json({ ok: true, counted: false });
    }

    // 24시간 내 같은 게시물을 이미 본 방문자면 쓰기를 건너뛴다(최신값만 읽어 준다)
    const now = Date.now();
    const raw = request.cookies.get(COOKIE_NAME)?.value || '';
    // 항목: "id:분단위시각(base36)". 24시간 지난 항목은 여기서 걸러져 다시 카운트된다.
    const seen = new Map<string, number>();
    for (const part of raw.split(SEP)) {
      if (!part) continue;
      const [id, tsRaw] = part.split(TS_SEP);
      if (!id || !POST_ID_RE.test(id)) continue;
      const tsMin = tsRaw ? parseInt(tsRaw, 36) : NaN;
      const ts = Number.isFinite(tsMin) ? tsMin * 60_000 : now; // 구버전(시각 없음) = 방금 본 것
      if (now - ts < SEEN_WINDOW_MS) seen.set(id, ts);
    }
    const counted = !seen.has(postId);
    const stats = await bumpPackageStats(postId, counted ? { view: 1 } : {});
    seen.set(postId, seen.get(postId) ?? now);

    const cookieValue = [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TRACKED)
      .map(([id, ts]) => `${id}${TS_SEP}${Math.floor(ts / 60_000).toString(36)}`)
      .join(SEP);
    const res = NextResponse.json({ ok: true, counted, stats });
    res.cookies.set(COOKIE_NAME, cookieValue, {
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
