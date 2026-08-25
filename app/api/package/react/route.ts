import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { POST_ID_RE, isBotRequest } from '@/lib/package-hit-guard';

// 갤러리 카드 반응(따봉·흠) — 비로그인 포함 누구나 1글 1표.
//
// 비용 설계:
// - 읽기 0: "내가 뭘 눌렀는지"는 DB 가 아니라 httpOnly 쿠키가 기억한다. 카운트는 글 문서의
//   likeCount/sosoCount 필드라 갤러리가 글을 읽을 때 같이 따라온다(별도 조회 없음).
// - 쓰기 최대 1회/요청: 쿠키의 이전 표와 요청한 표를 비교해 달라진 만큼만 increment 한다.
//   같은 표를 다시 보내면(새로고침·중복 클릭) 아무것도 쓰지 않는다.
// - 클라이언트는 연타를 디바운스해 최종 상태만 보내므로 "따봉→취소→따봉"도 요청 1회다.
//
// 쿠키를 지우면 다시 투표할 수 있다 — 조회수와 같은 수준의 방어이고, 조작돼도 손해가 없는 지표라 충분하다.
const COOKIE_NAME = 'rx';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년 — 표는 오래 기억해야 재투표가 안 된다
const MAX_TRACKED = 100; // 최근 표 100개 (ID 20자 + 표시 2자 기준 약 2.3KB). 넘치면 오래된 표부터 잊는다
const SEP = '.';
const KV = ':';

type Reaction = 'like' | 'soso';
const FIELD: Record<Reaction, string> = { like: 'likeCount', soso: 'sosoCount' };
// 쿠키 안에서는 한 글자로 줄인다
const CODE: Record<Reaction, string> = { like: 'l', soso: 's' };
const DECODE: Record<string, Reaction> = { l: 'like', s: 'soso' };

function parseCookie(raw: string): [string, Reaction][] {
  if (!raw) return [];
  const out: [string, Reaction][] = [];
  for (const entry of raw.split(SEP)) {
    const i = entry.indexOf(KV);
    if (i <= 0) continue;
    const id = entry.slice(0, i);
    const r = DECODE[entry.slice(i + 1)];
    if (r && POST_ID_RE.test(id)) out.push([id, r]);
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const postId = body?.postId;
    const reaction = body?.reaction; // 'like' | 'soso' | null(취소)
    if (!postId || typeof postId !== 'string' || !POST_ID_RE.test(postId)) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }
    if (reaction !== null && reaction !== 'like' && reaction !== 'soso') {
      return NextResponse.json({ error: 'reaction invalid' }, { status: 400 });
    }
    const next = reaction as Reaction | null;

    if (isBotRequest(request.headers.get('user-agent'))) {
      return NextResponse.json({ ok: true, prev: null, next: null, changed: false });
    }

    const entries = parseCookie(request.cookies.get(COOKIE_NAME)?.value || '');
    const prev = entries.find(([id]) => id === postId)?.[1] ?? null;

    // 이미 같은 표 — 쓰기 없음. 클라이언트는 prev/next 로 자기 화면 숫자를 맞춘다.
    if (prev === next) {
      return NextResponse.json({ ok: true, prev, next, changed: false });
    }

    const update: Record<string, FieldValue> = {};
    if (prev) update[FIELD[prev]] = FieldValue.increment(-1);
    if (next) update[FIELD[next]] = FieldValue.increment(1);

    const db = getAdminFirestore();
    await db.collection('packagePosts').doc(postId).update(update);

    // 이 글의 표를 맨 앞에 새로 쓰고(취소면 지우고) 나머지는 순서 유지
    const rest = entries.filter(([id]) => id !== postId);
    const kept = (next ? [[postId, next] as [string, Reaction], ...rest] : rest).slice(0, MAX_TRACKED);

    const res = NextResponse.json({ ok: true, prev, next, changed: true });
    res.cookies.set(COOKIE_NAME, kept.map(([id, r]) => `${id}${KV}${CODE[r]}`).join(SEP), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error('반응 저장 실패:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
