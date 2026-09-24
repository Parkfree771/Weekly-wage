import { NextResponse } from 'next/server';
import { getAdminFirestore, verifyBearerAdmin } from '@/lib/firebase-admin';
import { INQUIRY_LOG_COLLECTION as COLLECTION, readInquiryLog } from '@/lib/inquiry-log-server';
import { purgePriceCache } from '@/lib/cache-purge';
import { INQUIRY_LOG_CACHE_TAG, type InquiryLogInput } from '@/lib/inquiry-log';

// 문의 처리 내역 (공개 목록) — 읽기는 누구나, 쓰기는 관리자만.
// 읽기는 문의하기 모달을 열 때만 나간다. 관리자가 쓸 때만 바뀌는 데이터라 durable 30일 + 쓰기 시 태그 퍼지 → 쓰면 바로 보인다.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL_S = 30 * 24 * 60 * 60; // 30일 — 갱신은 TTL 이 아니라 쓰기 시 퍼지가 담당
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseInput(body: Record<string, unknown> | null): InquiryLogInput | string {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const input: InquiryLogInput = {
    page: str(body?.page, 40),
    requestedAt: str(body?.requestedAt, 10),
    resolvedAt: str(body?.resolvedAt, 10),
    request: str(body?.request, 300),
    reply: str(body?.reply, 600),
  };
  if (typeof body?.feedbackId === 'string' && body.feedbackId) input.feedbackId = body.feedbackId;
  if (!input.page || !input.request || !input.reply) return '페이지·요청·답변을 모두 적어주세요.';
  if (!DATE_RE.test(input.requestedAt) || !DATE_RE.test(input.resolvedAt)) return '날짜 형식이 잘못됐어요.';
  return input;
}

async function afterWrite() {
  await purgePriceCache([INQUIRY_LOG_CACHE_TAG]);
  return NextResponse.json({ ok: true, items: await readInquiryLog() });
}

// ─── 공개 목록 ───
export async function GET() {
  try {
    const items = await readInquiryLog();
    return NextResponse.json(
      { items },
      {
        headers: {
          'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${TTL_S}`,
          'Netlify-Cache-Tag': INQUIRY_LOG_CACHE_TAG,
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      },
    );
  } catch (err) {
    console.error('문의 처리 내역 조회 실패:', err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

// ─── 추가 (관리자) ───
export async function POST(req: Request) {
  if (!(await verifyBearerAdmin(req))) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }
  const input = parseInput(await req.json().catch(() => null));
  if (typeof input === 'string') return NextResponse.json({ message: input }, { status: 400 });
  await getAdminFirestore().collection(COLLECTION).add({ ...input, createdAt: Date.now() });
  return afterWrite();
}

// ─── 수정 (관리자) ───
export async function PATCH(req: Request) {
  if (!(await verifyBearerAdmin(req))) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });
  const input = parseInput(body);
  if (typeof input === 'string') return NextResponse.json({ message: input }, { status: 400 });
  await getAdminFirestore().collection(COLLECTION).doc(id).update({ ...input, updatedAt: Date.now() });
  return afterWrite();
}

// ─── 삭제 (관리자) ───
export async function DELETE(req: Request) {
  if (!(await verifyBearerAdmin(req))) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });
  await getAdminFirestore().collection(COLLECTION).doc(id).delete();
  return afterWrite();
}
