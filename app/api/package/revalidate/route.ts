import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyBearerUid } from '@/lib/firebase-admin';

// 패키지 상세와 갤러리 1페이지는 ISR(5분)로 캐시된다. 등록·수정·삭제·판매종료·댓글 직후
// 이 라우트를 호출해 해당 글과 갤러리(/package)를 즉시 재생성시킨다.
//
// 로그인 토큰 필수. 호출 1건이 갤러리(최대 200건) + 상세(글 + 댓글 최대 200건) 재렌더라
// 익명으로 열어 두면 누구든 반복 호출로 Firestore 읽기를 수백 건씩 태울 수 있다.
// 클라이언트는 lib/revalidate-client.ts 로만 부른다.
const POST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: NextRequest) {
  if (!(await verifyBearerUid(request))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== 'string' || !POST_ID_RE.test(postId)) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    revalidatePath(`/package/${postId}`);
    // 새 글·제목 변경·삭제가 갤러리 목록에 바로 보이게
    revalidatePath('/package');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
