import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAdminFirestore, verifyBearerAdmin } from '@/lib/firebase-admin';

// firebase-admin SDK는 Node 런타임 필요
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLLECTION = 'pageFeedback';
const RATE_COLLECTION = 'feedbackRate';
const COOLDOWN_MS = 5 * 60 * 1000; // 5분에 한 번
const MIN_LEN = 2;
const MAX_LEN = 500;

/** Netlify/프록시 헤더에서 클라이언트 IP 추출 */
function getClientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-nf-client-connection-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

/** IP 원본은 저장하지 않고 솔트 해시만 보관 (쿨다운 식별용) */
function hashIp(ip: string): string {
  const salt = process.env.FEEDBACK_IP_SALT || 'loalogol-feedback-v1';
  return createHash('sha256').update(salt + '|' + ip).digest('hex').slice(0, 32);
}

// ─── 의견 전송 (익명, 로그인 불필요) ───
export async function POST(req: Request) {
  let body: { message?: unknown; page?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '';

  if (message.length < MIN_LEN) {
    return NextResponse.json({ message: '내용을 입력해 주세요.' }, { status: 400 });
  }
  if (message.length > MAX_LEN) {
    return NextResponse.json(
      { message: `최대 ${MAX_LEN}자까지 보낼 수 있어요.` },
      { status: 400 },
    );
  }

  const ipHash = hashIp(getClientIp(req));
  const db = getAdminFirestore();
  const now = Date.now();

  // 쿨다운 체크 (ipHash 단일 문서 — 복합 인덱스 불필요)
  const rateRef = db.collection(RATE_COLLECTION).doc(ipHash);
  const rateSnap = await rateRef.get();
  if (rateSnap.exists) {
    const at = (rateSnap.data()?.at as number) ?? 0;
    const remain = COOLDOWN_MS - (now - at);
    if (remain > 0) {
      return NextResponse.json(
        { message: '잠시 후 다시 보내주세요.', retryAfterSec: Math.ceil(remain / 1000) },
        { status: 429 },
      );
    }
  }

  await db.collection(COLLECTION).add({
    message,
    page: page || '(unknown)',
    ipHash,
    createdAt: now,
    read: false,
  });
  await rateRef.set({ at: now });

  return NextResponse.json({ ok: true });
}

// ─── 의견 목록 조회 (관리자 전용) ───
export async function GET(req: Request) {
  if (!(await verifyBearerAdmin(req))) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }
  const db = getAdminFirestore();
  const snap = await db
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(300)
    .get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ items });
}

// ─── 의견 처리상태/메모 수정 (관리자 전용) ───
export async function PATCH(req: Request) {
  if (!(await verifyBearerAdmin(req))) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }

  let body: { id?: unknown; processed?: unknown; memo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.processed === 'boolean') update.processed = body.processed;
  if (typeof body.memo === 'string') update.memo = body.memo.slice(0, 1000);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: '변경할 내용이 없습니다.' }, { status: 400 });
  }

  await getAdminFirestore().collection(COLLECTION).doc(id).update(update);
  return NextResponse.json({ ok: true });
}

// ─── 의견 삭제 (관리자 전용) ───
export async function DELETE(req: Request) {
  if (!(await verifyBearerAdmin(req))) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });
  }
  await getAdminFirestore().collection(COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}
